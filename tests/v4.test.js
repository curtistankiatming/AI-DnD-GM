'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine'),G=require('../src/equipment'),P=require('../src/progression'),W=require('../src/world');
const {ITEMS,CLASSES,CAMPAIGN}=require('../src/content');
const {QUESTS,TOWNS,MERCHANTS}=require('../src/expansion');
const {createSeededRng,deepClone,actorAbilityBonus}=require('../src/rules');
const {buildNarratorPrompt,deterministicFallback}=require('../src/narrator');
const high=()=>.999999,low=()=>0;
function hero(cls='fighter',level=1){const s=E.createNewGame({name:'Diagnostic',classId:cls});if(level>1)E.awardXp(s,P.XP_NEXT[level-1],[],'diagnostic fixture only');return s;}
function act(s,a,rng=high){const r=E.resolveAction(s,a,rng);assert.equal(r.result.ok,true,r.result.error);return r.state;}
function gold(s,n=1000){s.player.gold=n;return s;}
function ready(id='road',cls='fighter'){const q=QUESTS[id],s=gold(hero(cls,q.level));s.world.completed[q.unlock]={xp:0,gold:0};s.world.unlockedTowns=Object.keys(TOWNS);s.world.townId=q.town;s.story.nodeId=`town-${q.town}`;if(q.requiresAdvancement){s.player.progression.specialization=P.SPECIALIZATIONS[cls][0].id;s.player.resources=P.resources(CLASSES[cls],10,s.player);}W.init(s);return s;}
function battle(cls='fighter',level=5,id='practice'){
 const s=hero(cls,level);E.startCombat(s,id,createSeededRng(222),[]);
 const player=s.combat.actors.find(a=>a.id==='player');s.combat.actors=[player,...s.combat.actors.filter(a=>a!==player)];s.combat.turnIndex=0;s.combat.awaitingPlayer=true;player.actionUsed=false;player.bonusUsed=false;
 for(const a of s.combat.actors.filter(a=>a.team==='enemy')){a.hp=200;a.maxHp=200;a.ac=10;}
 return s;
}
function hitPoints(s){return [s.player,...s.party].map(a=>[a.hp,a.maxHp]);}
function kitUses(s){return (s.player.inventory.find(i=>i.itemId==='healers-kit')||{quantity:0,charges:0});}

test('V4 catalog provides three real towns and ten authored regional expeditions',()=>{assert.equal(Object.keys(TOWNS).length,3);assert.equal(Object.keys(QUESTS).length,10);assert.equal(P.MAX_LEVEL,10);for(const q of Object.values(QUESTS)){assert.ok(q.opening&&q.crisis&&q.objective.target>0&&q.decisions.length);}});
test('town buy/sell conserves stock and gold; selling assigned equipment is rejected',()=>{
 let s=gold(hero(),100);const original=s.world.stock.briarwatch['healing-potion'];s=act(s,{type:'buy',itemId:'healing-potion',quantity:2});assert.equal(s.player.gold,70);assert.equal(s.world.stock.briarwatch['healing-potion'],original-2);
 s=act(s,{type:'sell',itemId:'healing-potion',quantity:1});assert.equal(s.player.gold,74);const r=E.resolveAction(s,{type:'sell',itemId:'iron-longsword',quantity:1});assert.equal(r.result.ok,false);assert.equal(r.state.player.gold,74);
});
test('invalid quantities and insufficient funds never consume stock or currency',()=>{
 const s=gold(hero(),2);for(const quantity of [-1,0,1.5,NaN,Infinity,'2',21]){const r=E.resolveAction(s,{type:'buy',itemId:'healing-potion',quantity});assert.equal(r.result.ok,false);assert.equal(r.state.player.gold,2);assert.deepEqual(r.state.world.stock,s.world.stock);}
 assert.equal(E.resolveAction(s,{type:'buy',itemId:'healing-potion',quantity:1}).result.ok,false);
});
test('stock does not reroll on rest, menu openings or save normalization',()=>{
 let s=gold(hero());s=act(s,{type:'buy',itemId:'healing-potion',quantity:2});const stock=deepClone(s.world.stock),xp=s.player.xp;
 for(let i=0;i<4;i++)s=act(E.normalizeIncomingState(s),{type:'town-service',serviceId:'civic-rest'});
 assert.deepEqual(s.world.stock,stock);assert.equal(s.player.xp,xp);
});
test('spare gear has an explicit owner and cannot equip the same copy twice',()=>{
 let s=hero();E.addItem(s,'sentinel-charm');s=act(s,{type:'equip',itemId:'sentinel-charm',actorId:'orin'});assert.equal(G.available(s,'sentinel-charm'),0);
 assert.equal(E.resolveAction(s,{type:'equip',itemId:'sentinel-charm',actorId:'player'}).result.ok,false);
 s=act(s,{type:'unequip',slot:'accessory',actorId:'orin'});s=act(s,{type:'equip',itemId:'sentinel-charm',actorId:'player'});assert.equal(s.player.saveBonuses.con,1);
});
test('comparison matches the resulting armor and attack statistics',()=>{
 let s=hero();E.addItem(s,'greatsword');const cmp=G.comparison(s,'greatsword');s=act(s,{type:'equip',itemId:'greatsword'});assert.equal(s.player.ac,cmp.acAfter);assert.equal(E.playerAttackProfile(s.player).damageFormula,cmp.damageAfter);assert.equal(s.player.equipment.offHand,null);
});
test('smith upgrades the selected owner once without consuming another member’s gear',()=>{
 let s=gold(hero());const playerArmor=s.player.equipment.armor;const old=s.party[0].ac;
 s=act(s,{type:'upgrade',itemId:'chain-shirt',actorId:'orin'});assert.equal(s.party[0].equipment.armor,'chain-shirt-fine');assert.equal(s.party[0].ac,old+1);assert.equal(s.player.equipment.armor,playerArmor);
 const r=E.resolveAction(s,{type:'upgrade',itemId:'chain-shirt-fine',actorId:'orin'});assert.equal(r.result.ok,false);assert.equal(r.state.player.gold,s.player.gold);
});
test('crafting validates every ingredient before atomically consuming them',()=>{
 let s=gold(hero());E.addItem(s,'herb-bundle',1);const fail=E.resolveAction(s,{type:'craft',recipeId:'brew'});assert.equal(fail.result.ok,false);assert.equal(fail.state.player.gold,s.player.gold);assert.equal(G.available(fail.state,'herb-bundle'),1);
 E.addItem(s,'herb-bundle',1);s=act(s,{type:'craft',recipeId:'brew'});assert.equal(s.player.gold,992);assert.equal(G.available(s,'herb-bundle'),0);assert.equal(G.available(s,'greater-healing'),1);
});
test('healer kit retains all three advertised charges across actions and reloads',()=>{
 let s=hero();E.addItem(s,'healers-kit',1);for(let n=2;n>=0;n--){s.player.hp=1;s=act(s,{type:'use-item',itemId:'healers-kit',targetId:'player'});s=E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));assert.equal(kitUses(s).charges,n||0);}assert.equal(E.hasItem(s,'healers-kit'),false);
});
test('partial kits preserve total uses when moved to storage and back',()=>{
 let s=hero();E.addItem(s,'healers-kit',2);s.player.hp=1;s=act(s,{type:'use-item',itemId:'healers-kit',targetId:'player'});assert.deepEqual(kitUses(s),{itemId:'healers-kit',quantity:2,charges:2});
 s=act(s,{type:'store',itemId:'healers-kit'});assert.equal(kitUses(s).charges,3);assert.equal(s.world.storage.find(i=>i.itemId==='healers-kit').charges,2);
 s=act(s,{type:'retrieve',itemId:'healers-kit'});assert.deepEqual(kitUses(s),{itemId:'healers-kit',quantity:2,charges:2});assert.equal(E.resolveAction(s,{type:'sell',itemId:'healers-kit'}).result.ok,false);
});
test('invalid potion target does not consume the potion',()=>{
 const s=hero();const r=E.resolveAction(s,{type:'use-item',itemId:'healing-potion',targetId:'missing'});assert.equal(r.result.ok,false);assert.deepEqual(r.state.player.inventory,s.player.inventory);
});
test('freeform purchase executes a shop transaction rather than unrelated travel',()=>{
 const s=gold(hero(),100);const r=E.resolveAction(s,{type:'freeform',text:'I buy two healing potions from the village apothecary using my gold.'});assert.equal(r.result.ok,true);assert.equal(r.state.story.nodeId,'briarwatch-square');assert.equal(r.state.player.gold,70);
});
test('freeform purchase away from a shop honestly fails and does not change the scene',()=>{
 let s=gold(hero());s=act(s,{type:'story-choice',choiceId:'leave-village'});const xp=s.player.xp;const r=E.resolveAction(s,{type:'freeform',text:'buy 2 healing potions'});assert.equal(r.result.ok,false);assert.equal(r.state.story.nodeId,s.story.nodeId);assert.equal(r.state.player.xp,xp);
});
test('fuzzy story interpretation requires explicit confirmation before dice or movement',()=>{
 let s=hero();const r=E.resolveAction(s,{type:'freeform',text:'please inspect the severed bell rope'});assert.equal(r.result.kind,'clarification');assert.ok(r.state.pendingIntent);assert.equal(r.events.some(e=>e.type==='roll'),false);assert.equal(r.state.player.xp,s.player.xp);
 s=act(r.state,{type:'confirm-intent'});assert.ok(s.story.completedChoices['briarwatch-square'].includes('inspect-rope'));
});
test('unsupported speech neither invents consequences nor repeats a prior success as narration',()=>{
 const s=hero();s.story.lastOutcome={text:'You earned a crown.'};const r=E.resolveAction(s,{type:'freeform',text:'construct a space elevator'});assert.equal(r.result.ok,false);const text=deterministicFallback(r.state,r.view,{type:'freeform',text:'construct a space elevator'},r.events);assert.doesNotMatch(text,/earned a crown/);
});
test('Inspiration is not consumed when companion Help already grants advantage',()=>{
 let s=hero();s=act(s,{type:'prepare-inspiration'});const r=E.resolveAction(s,{type:'story-choice',choiceId:'question-reeve'},high);assert.equal(r.state.player.inspiration,s.player.inspiration);
});
test('blessings and save gear apply once, then the blessing expires',()=>{
 let s=gold(hero());E.addItem(s,'sentinel-charm');s=act(s,{type:'equip',itemId:'sentinel-charm'});s=act(s,{type:'town-service',serviceId:'blessing'});const base=actorAbilityBonus(s.player,'con',true),events=[];
 const result=E.savingThrow(s,s.player,'con',99,()=>.5,events);assert.equal(result.bonus,base);assert.equal(result.total,11+base+3);assert.equal(s.player.conditions.some(c=>c.id==='blessed'),false);
});
test('antitoxin preparation is actually consumed by a poison saving throw',()=>{
 let s=hero();E.addItem(s,'antitoxin');s=act(s,{type:'use-item',itemId:'antitoxin',targetId:'orin'});const a=s.party[0],res=E.savingThrow(s,a,'con',13,low,[],'poison');assert.equal(res.d20.mode,'advantage');assert.equal(a.conditions.some(c=>c.id==='poisonWard'),false);
});
test('holy water lowers real site DCs and cannot be wasted repeatedly there',()=>{
 let s=hero('wizard');s.story.nodeId='old-shrine'; // actual node checked below
 const nodes=require('../src/content').STORY_NODES;s.story.nodeId=Object.keys(nodes).find(id=>id.includes('shrine')&&nodes[id].choices.some(c=>c.id==='read-altar'));
 assert.ok(s.story.nodeId);E.addItem(s,'holy-water',2);const before=E.buildView(s).scene.choices.find(c=>c.id==='read-altar').check.dc;
 s=act(s,{type:'use-item',itemId:'holy-water'});const after=E.buildView(s).scene.choices.find(c=>c.id==='read-altar').check.dc;assert.equal(after,before-2);assert.equal(E.resolveAction(s,{type:'use-item',itemId:'holy-water'}).result.ok,false);
});
test('level gains add actual abilities and companions share the earned level',()=>{
 let s=hero('wizard');assert.equal(E.buildView(s).progression.techniques.some(a=>a.id==='arcane-snare'),false);
 E.awardXp(s,300,[]);assert.equal(s.player.level,2);assert.ok(E.buildView(s).progression.techniques.some(a=>a.id==='arcane-snare'));assert.ok(s.party.every(a=>a.level===2));
 E.awardXp(s,3000,[]);assert.equal(s.player.level,4);assert.ok(s.party.every(a=>a.level===4&&a.maxHp>25));
});
test('talent and ability choices are consequential, pending, and not repeatable',()=>{
 let s=hero('fighter',4);const ac=s.player.ac,hp=s.player.maxHp;s=act(s,{type:'choose-reward',level:3,optionId:'bulwark'});assert.equal(s.player.ac,ac+1);assert.equal(s.player.maxHp,hp+4);
 const repeat=E.resolveAction(s,{type:'choose-reward',level:3,optionId:'precise'});assert.equal(repeat.result.ok,false);
 s=act(s,{type:'choose-reward',level:4,optionId:'ability:con'});assert.equal(s.player.abilities.con,16);assert.equal(s.player.maxHp,hp+4+4);
});
test('level cap is genuine and future advancement milestones are not falsely available',()=>{
 const s=hero();E.awardXp(s,1000000,[]);assert.equal(s.player.level,10);assert.equal(E.buildView(s).progression.specializationOptions.length,0);assert.deepEqual(P.ADVANCEMENTS.map(x=>x.level),[10,30,70]);assert.ok(P.ADVANCEMENTS.slice(1).every(x=>x.status==='Future expansion'));
});
test('specialization requires a trial, gives its resource, and cannot be changed silently',()=>{
 let s=hero('fighter',10);assert.equal(E.resolveAction(s,{type:'specialize',specializationId:'guardian'}).result.ok,false);s.world.completed.trial={};s=act(s,{type:'specialize',specializationId:'guardian'});assert.equal(s.player.resources.advancement.current,2);assert.ok(P.classActions(s.player).some(a=>a.id==='spec:guardian'));assert.equal(E.resolveAction(s,{type:'specialize',specializationId:'duelist'}).result.ok,false);
});
test('paid inn, free recovery and treatment have distinct real benefits',()=>{
 let s=gold(hero('fighter',3));s.player.hp=1;s.player.conditions.push({id:'poisoned',name:'Poisoned'});s=act(s,{type:'town-service',serviceId:'inn'});assert.equal(s.player.hp,s.player.maxHp);assert.equal(s.player.temporaryHp,7);assert.ok(s.player.conditions.some(c=>c.id==='poisoned'));assert.equal(s.player.gold,987);
 assert.equal(E.resolveAction(s,{type:'town-service',serviceId:'inn'}).result.ok,false);s=act(s,{type:'town-service',serviceId:'treatment'});assert.equal(s.player.conditions.length,0);s=act(s,{type:'town-service',serviceId:'civic-rest'});assert.equal(s.player.temporaryHp,0);
});
test('merchant appearance and stock persist across travel and save normalization',()=>{
 let s=ready();s=act(s,{type:'depart',questId:'road'},createSeededRng(9));assert.equal(E.buildView(s).world.merchant.id,'caravan');s=act(s,{type:'buy',market:'merchant',itemId:'healing-potion'});const meeting=deepClone(s.world.meetings.road);
 s=act(s,{type:'return-town'});s=act(E.normalizeIncomingState(s),{type:'resume'});assert.deepEqual(s.world.meetings.road,meeting);assert.ok(E.buildView(s).world.merchant);
});
test('merchant bargaining and favors are bounded and prices cannot support an arbitrage loop',()=>{
 let s=ready();s=act(s,{type:'depart',questId:'road'});const goldBefore=s.player.gold;s=act(s,{type:'bargain'});assert.equal(s.player.gold,goldBefore);const price=E.buildView(s).world.merchant.stock[0].price;
 assert.equal(E.resolveAction(s,{type:'bargain'}).result.ok,false);s=act(s,{type:'merchant-favor'});assert.equal(E.resolveAction(s,{type:'merchant-favor'}).result.ok,false);assert.ok(E.buildView(s).world.merchant.stock[0].price<=price);
 for(const item of E.buildView(s).world.merchant.stock)assert.ok(item.price>Math.floor(ITEMS[item.id].value*.3));
});
test('relic barter validates materials and permits only one exchange per meeting',()=>{
 let s=ready('bridge');s.world.meetings.bridge={merchantId:'relic',stock:{},bargained:false,bartered:false,discount:0};s=act(s,{type:'depart',questId:'bridge'});let fail=E.resolveAction(s,{type:'barter'});assert.equal(fail.result.ok,false);E.addItem(s,'ward-fragment');s=act(s,{type:'barter'});assert.equal(G.available(s,'wayfarer-boots'),1);assert.equal(s.world.meetings.bridge.bartered,true);assert.equal(E.resolveAction(s,{type:'barter'}).result.ok,false);
});
test('unknown expedition threats and hidden options are not exposed by the view',()=>{
 const s=ready('marsh'),v=E.buildView(s);assert.equal(v.world.quests.find(q=>q.id==='marsh').knownThreat,null);assert.ok(!v.scene.choices.some(c=>c.locked));
 let t=act(s,{type:'rumor',questId:'marsh'});assert.match(E.buildView(t).world.quests[0].knownThreat,/poison/i);
});
test('resolution XP is equal for peaceful and combat routes and rewards cannot be duplicated',()=>{
 let a=ready(),b=deepClone(a);for(const [s,method]of [[a,'peace'],[b,'objective']]){s.story.nodeId='q-road-after';s.world.activeQuest='road';s.story.flags['method:road']=method;}
 a=act(a,{type:'story-choice',choiceId:QUESTS.road.decisions[0].id});b=act(b,{type:'story-choice',choiceId:QUESTS.road.decisions[0].id});assert.equal(a.player.xp,b.player.xp);const xp=a.player.xp,g=a.player.gold;
 a.story.nodeId='q-road-after';const again=E.resolveAction(a,{type:'story-choice',choiceId:QUESTS.road.decisions[1].id});assert.equal(again.state.player.xp,xp);assert.equal(again.state.player.gold,g);
});
test('companion personal reward changes actual statistics and enables the combination',()=>{
 let s=hero('fighter',7);s=act(s,{type:'personal',companionId:'orin'});s.world.completed.bridge={};const ac=s.party[0].ac;s=act(s,{type:'resolve-personal',companionId:'orin',choice:'watchful'});assert.equal(s.party[0].ac,ac+1);E.startCombat(s,'quest:signal',createSeededRng(11),[]);assert.ok(E.buildView(s).combat.actions.some(a=>a.id==='combo:orin'));
});
test('support and aggressive companions make mechanically distinct decisions',()=>{
 const base=battle();for(const a of base.combat.actors)a.conditions=[];const scenarios={};for(const tactic of ['support','aggressive']){let s=deepClone(base);s=act(s,{type:'set-tactic',companionId:'maren',tactic});const r=E.resolveAction(s,{type:'combat',actionId:'end-turn'},createSeededRng(2222));scenarios[tactic]=r.events.map(e=>e.text).join('\n');}
 assert.match(scenarios.support,/supplies a d6/);assert.match(scenarios.aggressive,/Guiding Bolt/);assert.notEqual(scenarios.support,scenarios.aggressive);
});
test('companion orders have a visible effect and one-per-round limit',()=>{
 let s=battle();const target=s.combat.actors.find(a=>a.team==='enemy').id;s=act(s,{type:'combat',actionId:'order:focus',targetId:target});assert.equal(s.combat.order.targetId,target);assert.equal(E.resolveAction(s,{type:'combat',actionId:'order:protect',targetId:'player'}).result.ok,false);
});
test('taunts and guards expire at the owner’s next turn rather than lasting forever',()=>{
 let s=battle();for(const a of s.combat.actors)a.conditions=[];const player=s.combat.actors[0];player.conditions.push({id:'taunting',name:'Holding',expiresRound:2});s.combat.round=1;const r=E.resolveAction(s,{type:'combat',actionId:'end-turn'},createSeededRng(32));assert.equal(r.state.combat.actors.find(a=>a.id==='player').conditions.some(c=>c.id==='taunting'),false);
});
test('Arcane Snare spends a technique and a target cannot be permanently stun-locked by it',()=>{
 let s=battle('wizard');const target=s.combat.actors.find(a=>a.team==='enemy').id;s=act(s,{type:'combat',actionId:'arcane-snare',targetId:target});assert.ok(s.combat.actors.find(a=>a.id===target).conditions.some(c=>c.id==='stunned'));const remaining=s.player.resources.technique.current;s.combat.actors[0].actionUsed=false;
 const repeat=E.resolveAction(s,{type:'combat',actionId:'arcane-snare',targetId:target});assert.equal(repeat.result.ok,false);assert.equal(repeat.state.player.resources.technique.current,remaining);
});
test('an objective uses real rolls and completion ends combat without killing everyone',()=>{
 let s=battle('fighter',5,'quest:bridge');s.combat.objective.progress=2;const r=E.resolveAction(s,{type:'combat',actionId:'objective'},high);assert.equal(r.result.ok,true);assert.equal(r.state.combat,null);assert.equal(r.state.story.nodeId,'q-bridge-after');assert.equal(r.state.story.flags['method:bridge'],'objective');
});
test('missing an objective deadline records a consequence, not free automatic victory',()=>{
 let s=battle('fighter',5,'quest:bridge');s.combat.round=10;const r=E.resolveAction(s,{type:'combat',actionId:'order:cover'},high);assert.equal(r.result.ok,true);assert.ok(r.state.combat.active);assert.equal(r.state.combat.objective.failed,true);assert.equal(r.state.player.xp,s.player.xp);
});
test('retreat preserves XP and gear, charges rescue, and exposes a route to resume',()=>{
 let s=gold(battle('fighter',5,'quest:bridge'));s.world.activeQuest='bridge';s.world.progress.bridge={};const xp=s.player.xp,inv=deepClone(s.player.inventory);s=act(s,{type:'combat',actionId:'retreat'});assert.equal(s.combat,null);assert.equal(s.player.gold,750);assert.equal(s.player.xp,xp);assert.deepEqual(s.player.inventory,inv);assert.equal(s.world.pendingBattle,'quest:bridge');s=act(s,{type:'town-service',serviceId:'civic-rest'});s=act(s,{type:'resume'});assert.equal(s.combat.encounterId,'quest:bridge');
});
test('practice restores the exact pre-practice inventory, HP and resources without rewards',()=>{
 let s=hero('wizard',5);s.player.hp=12;const before=deepClone(s.player),party=deepClone(s.party);s=act(s,{type:'practice'},createSeededRng(20));s=act(s,{type:'combat',actionId:'retreat'});assert.equal(s.player.hp,before.hp);assert.deepEqual(s.player.resources,before.resources);assert.deepEqual(s.player.inventory,before.inventory);assert.equal(s.player.xp,before.xp);assert.deepEqual(hitPoints(s),[[before.hp,before.maxHp],...party.map(a=>[a.hp,a.maxHp])]);
});
test('save normalization preserves mid-combat objective, orders, shop stock and companion equipment',()=>{
 let s=ready();s=act(s,{type:'depart',questId:'road'});s=act(s,{type:'story-choice',choiceId:'advance'});s=act(s,{type:'story-choice',choiceId:'direct'});s=act(s,{type:'story-choice',choiceId:'objective'},createSeededRng(3));s=act(s,{type:'combat',actionId:'order:cover'});s=act(s,{type:'combat',actionId:'objective'});
 const loaded=E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));assert.deepEqual(loaded.combat.objective,s.combat.objective);assert.deepEqual(loaded.combat.order,s.combat.order);assert.deepEqual(loaded.world.stock,s.world.stock);assert.deepEqual(loaded.party.map(a=>a.equipment),s.party.map(a=>a.equipment));
});
test('optional AI receives no hidden continuity facts or internal consequence flags',()=>{
 const s=hero();s.story.flags['secret-test-flag']=true;const prompt=buildNarratorPrompt(s,E.buildView(s),{type:'opening'},[]);assert.doesNotMatch(prompt,/secret-test-flag/);for(const fact of CAMPAIGN.narratorFacts||[])assert.ok(!prompt.includes(fact));
});
test('every class specialization resolves without undefined functions or NaN statistics',()=>{
 for(const cls of Object.keys(CLASSES))for(const spec of P.SPECIALIZATIONS[cls]){
   let s=battle(cls,10);s.player.progression.specialization=spec.id;s.player.resources=P.resources(CLASSES[cls],10,s.player);s.combat.actors[0].resources=deepClone(s.player.resources);s.combat.actors[0].progression=deepClone(s.player.progression);
   const target=spec.target==='enemy'?s.combat.actors.find(a=>a.team==='enemy').id:spec.target==='ally'?'companion:orin':'player';const r=E.resolveAction(s,{type:'combat',actionId:`spec:${spec.id}`,targetId:target},high);assert.equal(r.result.ok,true,`${cls}/${spec.id}: ${r.result.error}`);assert.equal(r.state.player.resources.advancement.current,1);assert.ok(r.view.combat.actors.every(a=>Number.isFinite(a.hp)&&Number.isFinite(a.ac)));
 }
});
test('post-advancement contract requires specialization and exists beyond the trial',()=>{
 let s=ready('aftermath');s.player.progression.specialization=null;assert.equal(E.buildView(s).world.quests.find(q=>q.id==='aftermath').available,false);s.player.progression.specialization='guardian';assert.equal(E.buildView(s).world.quests.find(q=>q.id==='aftermath').available,true);
});


test('support-oriented class refinements have real effects instead of enemy-only no-ops',()=>{
  for(const cls of ['fighter','cleric','bard']){
    let s=battle(cls,5);s.player.progression.choices['5']='control';
    const id=P.TECHNIQUES[cls].id;
    s=act(s,{type:'combat',actionId:id,targetId:'companion:orin'});
    const orin=s.combat.actors.find(a=>a.id==='companion:orin');
    if(cls==='fighter')assert.equal(orin.conditions.find(c=>c.id==='intercept').exposes,true);
    else if(cls==='cleric')assert.ok(orin.conditions.some(c=>c.id==='packReady'));
    else assert.ok(s.combat.actors.filter(a=>a.team==='party'&&a.hp>0).every(a=>a.conditions.some(c=>c.id==='packReady')));
    assert.match(P.options(s.player,5).find(o=>o.id==='control').description,cls==='fighter'?/Interception/:cls==='cleric'?/Sanctuary/:/every conscious/);
  }
});

test('ability rewards display the actual modifier and respect the cap of twenty',()=>{
  let s=hero('fighter',4);const o=P.options(s.player,4).find(o=>o.id==='ability:con');assert.match(o.description,/14 → 16/);assert.match(o.description,/4 maximum HP/);
  s.player.abilities.str=19;s=act(s,{type:'choose-reward',level:4,optionId:'ability:str'});assert.equal(s.player.abilities.str,20);
});

test('a Story Engine V3 save retains its identity and discoveries while receiving V4 systems',()=>{
  const s=E.createNewGame({name:'V3 traveler',classId:'rogue'});s.schemaVersion=3;delete s.world;delete s.player.progression;for(const a of s.party)delete a.equipment;
  s.story.flags.foundClue=true;s.story.clues=['black-wax'];s.player.gold=137;
  const loaded=E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));assert.equal(loaded.schemaVersion,4);assert.equal(loaded.player.name,'V3 traveler');assert.equal(loaded.player.gold,137);assert.equal(loaded.story.flags.foundClue,true);assert.ok(loaded.world.stock.briarwatch);assert.ok(loaded.party.every(a=>a.equipment.mainHand));
});
