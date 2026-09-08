"use strict";
const { ITEMS, COMPANIONS, STORY_NODES, CLASSES }=require('./content');
const { TOWNS, MERCHANTS, RECIPES, PERSONAL, QUESTS }=require('./expansion');
const P=require('./progression');
const G=require('./equipment');
const { deepClone, abilityModifier, proficiencyBonus, rollD20, actorSkillBonus, rollFormula }=require('./rules');
const TOWN_ACTIONS=new Set(['buy','sell','upgrade','craft','store','retrieve','town-service','rumor','travel-town','depart','return-town','resume','bargain','merchant-favor','barter','personal','resolve-personal','recruit','practice','choose-reward','specialize']);
function init(state){
  const w=state.world ||= {};
  w.day=Number.isInteger(w.day)&&w.day>0?w.day:1;
  w.cycle=Number.isInteger(w.cycle)&&w.cycle>=0?w.cycle:0;
  w.townId=TOWNS[w.townId]?w.townId:'briarwatch';
  w.completed ||= {};w.progress ||= {};w.stock ||= {};w.meetings ||= {};w.personal ||= {};w.rumors ||= {};w.favors ||= {};w.servicesUsed ||= {};
  w.reputation={wardens:0,trade:0,wilds:0,...w.reputation};
  w.unlockedTowns=Array.from(new Set(['briarwatch',...(w.unlockedTowns||[]).filter(x=>TOWNS[x])]));
  w.storage=G.inventory(w.storage||[]);
  w.onExpedition=Boolean(w.onExpedition);w.activeQuest=w.activeQuest||null;
  w.setbacks=Number(w.setbacks||0);
  for(const id of w.unlockedTowns)ensureStock(state,id);
  for(const member of state.party){G.initCompanion(state,member);P.levelCompanion(member,state.player.level);G.derive(member);}
  P.ensure(state.player);
  G.normalizeEquipment(state);
  return w;
}
function town(state){const id=STORY_NODES[state.story.nodeId]?.townId;return !state.combat?.active&&TOWNS[id]?TOWNS[id]:null;}
function maxStock(id){const item=ITEMS[id];if(item.category==='consumable')return 5;if(item.category==='material')return 4;if(item.charges)return 3;return 2;}
function ensureStock(state,id){const w=state.world;w.stock[id] ||= {};for(const itemId of TOWNS[id].stock)if(w.stock[id][itemId]===undefined)w.stock[id][itemId]=maxStock(itemId);return w.stock[id];}
function activeMerchant(state){
  const q=state.world?.activeQuest;const node=STORY_NODES[state.story.nodeId];
  if(!state.world?.onExpedition||state.combat?.active||node?.phase!=='start')return null;
  const meeting=state.world.meetings[q];return meeting?.merchantId?{...MERCHANTS[meeting.merchantId],meeting}:null;
}
function market(state,kind='town'){
  if(kind==='merchant'){const m=activeMerchant(state);return m?{id:m.id,stock:m.meeting.stock,discount:m.meeting.discount||0,merchant:true}:null;}
  const t=town(state);return t?{id:t.id,stock:ensureStock(state,t.id),discount:0,merchant:false}:null;
}
function price(state,id,kind='town'){
  const m=market(state,kind);const value=ITEMS[id]?.value||0;
  const rep=m&&!m.merchant?Math.min(0.1,Math.max(0,state.world.reputation[TOWNS[m.id].faction]||0)*0.005):0;
  const caravan=m?.id==='caravan'&&state.world.favors.caravan?0.05:0;
  const discount=Math.min(0.15,(m?.discount||0)+rep+caravan);
  return Math.max(1,Math.ceil(value*(m?.merchant?1.12:1)*(1-discount)));
}
function sellPrice(id){return Math.max(1,Math.floor((ITEMS[id]?.value||0)*0.3));}
function emit(events,text,type='world',tone='neutral'){events.push({type,tone,text});return {ok:true,kind:type,outcomeText:text};}
function fail(events,text){events.push({type:'warning',tone:'warning',text});return {ok:false,error:text};}
function charge(state,gold,events){if(!Number.isInteger(gold)||gold<0||state.player.gold<gold){fail(events,'Not enough gold. No items or resources were changed.');return false;}state.player.gold-=gold;return true;}
function reputation(state,changes){for(const [id,amount]of Object.entries(changes||{}))if(id in state.world.reputation)state.world.reputation[id]=Math.max(-10,Math.min(20,state.world.reputation[id]+Number(amount||0)));}
function refreshStock(state){for(const id of state.world.unlockedTowns){const stock=ensureStock(state,id);for(const itemId of TOWNS[id].stock)stock[itemId]=maxStock(itemId);}}
function completed(state,id){return Boolean(state.world.completed[id]);}
function unlocked(state,q){return Boolean(completed(state,q.unlock)&&state.player.level>=q.level&&state.world.unlockedTowns.includes(q.town)&&(!q.requiresAdvancement||P.ensure(state.player).specialization));}
function rewardPersonal(state,id,events){
  for(const member of state.party){const def=PERSONAL[member.id];if(!def||def.quest!==id)continue;const record=state.world.personal[member.id] ||= {};record.goalMet=true;if(record.started&&!record.rewarded)emit(events,`${member.name}'s personal quest can now be resolved in town: ${def.name}.`,'party','good');}
}
function completeQuest(state,id,events,api){
  if(completed(state,id))return false;
  const q=QUESTS[id];if(id!=='bell'&&!q)return false;
  const progress=state.world.progress[id]||{};
  if(q?.requiresAdvancement&&!P.ensure(state.player).specialization)return false;
  const quality=progress.setback?'costly':state.story.flags[`method:${id}`]==='peace'?'peaceful':state.story.flags[`method:${id}`]==='objective'?'objective':'force';
  const xp=id==='bell'?300:q.xp;
  const gold=id==='bell'?60:Math.floor(q.gold*(progress.setback?0.8:1));
  state.world.completed[id]={day:state.world.day,quality,method:state.story.flags[`method:${id}`]||'force',xp,gold};
  state.player.gold+=gold;
  state.world.cycle+=1;state.world.day+=1;
  state.world.activeQuest=null;state.world.onExpedition=false;state.world.resumeNode=null;state.world.pendingBattle=null;
  if(id==='bell'){
    reputation(state,{wardens:state.story.flags.spiritFreed?3:2});
    if(state.story.flags.tovinFrightened)reputation(state,{wardens:-1});
  }
  if(q?.nextTown&&!state.world.unlockedTowns.includes(q.nextTown))state.world.unlockedTowns.push(q.nextTown);
  const destination=q?.nextTown||q?.town||'briarwatch';state.world.townId=destination;
  refreshStock(state);
  api.awardXp(state,xp,events,`${q?.name||'The Bell Beneath Briarwatch'} resolved`);
  emit(events,`Objective reward: ${gold} gold. ${quality==='costly'?'The costly outcome reduced payment, not experience. ':''}Town stock refreshed after new progress, not after opening a menu.`,'reward','good');
  if(q&&id!=='trial'){api.addItem(state,'herb-bundle',2,events);if(q.level>=4)api.addItem(state,'ward-fragment',1,events);}
  rewardPersonal(state,id,events);
  return true;
}
function longRest(state,premium,events){
  const key=`inn:${state.world.cycle}`;
  const cost=premium?10+state.player.level:0;
  if(premium&&state.world.servicesUsed[key])return fail(events,'The inn’s expedition benefit has already been claimed this progress cycle. Free recovery remains available.');
  if(!charge(state,cost,events))return {ok:false,error:'Not enough gold.'};
  for(const a of G.actors(state)){
    a.hp=a.maxHp;a.deathSaves={successes:0,failures:0,stable:false};
    a.conditions=(a.conditions||[]).filter(c=>['poisoned','blessed','poisonWard','coating'].includes(c.id));
    if(premium)a.temporaryHp=4+state.player.level;
    else a.temporaryHp=0;
    a.used ||= {};a.used.cloakReady=true;
    if(a.id==='player'){a.resources=P.resources(CLASSES[a.classId],a.level,a);a.hitDice.current=a.level;}
    else a.resources=P.companionResources(a.id,a.level);
  }
  state.world.day+=1;
  if(premium){state.world.servicesUsed[key]=true;state.player.inspiration=Math.min(3,state.player.inspiration+1);}
  return emit(events,premium?`The inn restores the party and grants ${4+state.player.level} temporary HP each, plus one Inspiration (maximum 3). Cost ${cost} gold; one paid benefit per completed expedition.`:'Civic lodging restores HP, hit dice and class resources without cost. Poison requires treatment; existing protective coatings remain. No XP or stock refresh is granted.','rest','good');
}
function recover(state,events,api){
  const trial=state.world.activeQuest==='trial';
  const cost=trial?0:Math.floor(state.player.gold*0.25);
  state.player.gold-=cost;state.world.day+=1;state.world.setbacks+=1;
  for(const a of G.actors(state)){a.hp=Math.max(1,Math.ceil(a.maxHp*0.4));a.temporaryHp=0;a.deathSaves={successes:0,failures:0,stable:false};a.conditions=[];}
  state.combat=null;state.world.onExpedition=false;
  if(state.world.failedEncounter)state.world.pendingBattle=state.world.failedEncounter;
  if(state.world.activeQuest){const p=state.world.progress[state.world.activeQuest] ||= {};p.failures=(p.failures||0)+1;p.setback=true;}
  api.enterNode(state,`town-${state.world.townId}`,events);
  return emit(events,`The party returns to ${TOWNS[state.world.townId].name}. Rescue cost ${cost} gold; no XP or equipment lost. Recover, then resume the interrupted encounter from the expedition board.`,'rest','warning');
}
function depart(state,id,rng,events,api){
  const t=town(state);if(!t)return fail(events,'Depart from a town or resume at a safe hub.');
  if(id==='bell'){
    if(completed(state,'bell'))return fail(events,'The bell chapter is already complete.');
    state.world.onExpedition=true;state.world.activeQuest='bell';
    api.enterNode(state,state.world.resumeNode||'briarwatch-square',events);return emit(events,'Return to the bell investigation. Your earlier discoveries and decisions remain.');
  }
  const q=QUESTS[id];
  if(!q||!unlocked(state,q)||completed(state,id))return fail(events,'That expedition is not currently available. Complete the prior contract and meet its level requirement.');
  if(t.id!==q.town)return fail(events,`Travel to ${TOWNS[q.town].name} to depart for this expedition.`);
  if(state.world.activeQuest&&state.world.activeQuest!==id)return fail(events,'Finish or resume the current expedition before starting another.');
  state.world.activeQuest=id;state.world.townId=q.town;state.world.onExpedition=true;state.world.day+=1;
  state.world.progress[id] ||= {};
  if(!(id in state.world.meetings)){
    let merchantId=null;
    if(id==='road')merchantId='caravan';else if(id!=='trial'&&rng()<0.7)merchantId=['caravan','specialist','relic'][Math.min(2,Math.floor(rng()*3))];
    const stock={};if(merchantId)for(const itemId of MERCHANTS[merchantId].stock)stock[itemId]=ITEMS[itemId].slot?1:3;
    state.world.meetings[id]={merchantId,stock,bargained:false,discount:0,bartered:false};
  }
  api.enterNode(state,state.world.progress[id].node||`q-${id}-start`,events);
  return emit(events,`The party departs for ${q.name}. Returning to town will preserve resolved checks, merchant stock and consequences.`);
}
function handle(state,action,rng,events,api){
  if(!TOWN_ACTIONS.has(action.type))return null;
  const w=state.world;
  if(action.type==='choose-reward'){
    const before=deepClone(state.player.resources);const result=P.applyChoice(state.player,Number(action.level),String(action.optionId||''));
    if(!result.ok)return fail(events,result.error);
    const defaults=P.resources(CLASSES[state.player.classId],state.player.level,state.player);
    for(const [id,r]of Object.entries(defaults))r.current=Math.min(r.max,(before[id]?.current??r.max)+Math.max(0,r.max-(before[id]?.max??r.max)));
    state.player.resources=defaults;G.derive(state.player);
    return emit(events,`Level ${action.level} reward chosen: ${result.name}. The character sheet and available actions now reflect it.`,'level','good');
  }
  if(action.type==='specialize'){
    const spec=(P.SPECIALIZATIONS[state.player.classId]||[]).find(s=>s.id===action.specializationId);
    if(state.player.level<10||!completed(state,'trial')||P.ensure(state.player).specialization||!spec)return fail(events,'Complete the level-10 trial and choose an available specialization. This choice is permanent.');
    P.ensure(state.player).specialization=spec.id;
    state.player.resources.advancement={current:2,max:2,name:'Advancement',refresh:'long'};
    return emit(events,`${state.player.name} advances to ${spec.name}. ${spec.description}`,'level','good');
  }
  if(action.type==='return-town'){
    if(town(state))return fail(events,'You are already in a town.');
    if(STORY_NODES[state.story.nodeId]?.defeat)return fail(events,'Resolve the rescue choice first.');
    w.resumeNode=state.story.nodeId;
    const q=STORY_NODES[state.story.nodeId]?.questId;if(q){w.activeQuest=q;(w.progress[q]||={}).node=state.story.nodeId;}
    else if(!completed(state,'bell'))w.activeQuest='bell';
    w.onExpedition=false;w.day+=1;
    api.enterNode(state,`town-${w.townId}`,events);
    return emit(events,'The party returns to a safe hub. Resolved checks cannot be rerolled and merchants do not replenish from travel.');
  }
  if(action.type==='depart')return depart(state,action.questId,rng,events,api);
  if(action.type==='resume'){
    if(!town(state))return fail(events,'Resume an expedition from a town.');
    if(w.pendingBattle){const id=w.pendingBattle;w.pendingBattle=null;w.onExpedition=true;return api.startCombat(state,id,rng,events)?emit(events,'The party returns to the interrupted encounter. Earlier preparation and setbacks are preserved.'):fail(events,'The interrupted encounter is unavailable.');}
    if(w.activeQuest==='bell'&&w.resumeNode){w.onExpedition=true;api.enterNode(state,w.resumeNode,events);return emit(events,'The bell investigation resumes where you left it.');}
    return depart(state,w.activeQuest,rng,events,api);
  }
  if(action.type==='travel-town'){
    if(!town(state)||!w.unlockedTowns.includes(action.townId)||!TOWNS[action.townId])return fail(events,'Travel is only available between discovered towns while out of combat.');
    if(town(state).id===action.townId)return fail(events,'You are already there.');
    w.day+=1;w.townId=action.townId;w.onExpedition=false;api.enterNode(state,`town-${action.townId}`,events);return emit(events,`The party travels to ${TOWNS[action.townId].name}. Stock and progress are preserved.`);
  }
  if(action.type==='buy'){
    const m=market(state,action.market);const id=String(action.itemId||'');const qty=action.quantity??1;
    if(!m||!ITEMS[id]||!Number.isInteger(qty)||qty<1||qty>20||!(id in m.stock))return fail(events,'Choose a stocked item and a whole quantity from 1 to 20.');
    if(m.stock[id]<qty)return fail(events,'The merchant does not have that many. No gold was spent.');
    const cost=price(state,id,action.market)*qty;if(!charge(state,cost,events))return {ok:false,error:'Not enough gold.'};
    m.stock[id]-=qty;G.addTo(state.player.inventory,id,qty);
    return emit(events,`Bought ${qty} × ${ITEMS[id].name} for ${cost} gold. ${ITEMS[id].purpose}`,'item','good');
  }
  if(action.type==='sell'){
    if(!market(state,action.market))return fail(events,'Sell items at an available town shop or traveling merchant.');
    const id=String(action.itemId||''),item=ITEMS[id],qty=action.quantity??1;
    if(!item||item.category==='quest'||!Number.isInteger(qty)||qty<1||qty>20||G.available(state,id)<qty)return fail(events,'Only unequipped, non-quest copies can be sold.');
    const entry=state.player.inventory.find(x=>x.itemId===id);
    if(item.charges&&entry.charges!==item.charges)return fail(events,'A partially used kit cannot be sold. Finish that kit first; unused supplies remain yours.');
    const value=sellPrice(id)*qty;G.removeLoose(state,id,qty);state.player.gold+=value;
    return emit(events,`Sold ${qty} × ${item.name} for ${value} gold. Buyback is not offered; the shop’s stock is independent.`,'item');
  }
  if(action.type==='bargain'){
    const m=activeMerchant(state);if(!m)return fail(events,'There is no traveling merchant here.');
    if(m.meeting.bargained)return fail(events,'You have already negotiated with this merchant at this meeting.');
    m.meeting.bargained=true;const bonus=actorSkillBonus(state.player,'persuasion');const roll=rollD20(rng).natural;const ok=roll+bonus>=13;
    if(ok)m.meeting.discount=0.1;
    return emit(events,`Bargaining: d20 ${roll} + ${bonus} vs DC 13. ${ok?'A 10% discount is recorded for this meeting.':'The merchant holds the price. Stock and your money are unchanged.'}`,'roll',ok?'good':'neutral');
  }
  if(action.type==='merchant-favor'){
    const m=activeMerchant(state);if(!m||m.id!=='caravan'||w.favors.caravan)return fail(events,'That caravan favor is not available.');
    for(const a of G.actors(state))a.hp=Math.max(1,a.hp-2);
    w.day+=1;w.favors.caravan=true;reputation(state,{trade:1});
    return emit(events,'You escort Pella’s wagon across the exposed road (2 HP per party member and one day). Pella records a permanent 5% caravan discount. No XP can be farmed from this favor.','party','good');
  }
  if(action.type==='barter'){
    const m=activeMerchant(state);if(!m||m.id!=='relic'||m.meeting.bartered)return fail(events,'No relic exchange is currently available.');
    if(G.available(state,'ward-fragment')<1||state.player.gold<30)return fail(events,'The exchange requires one loose ward fragment and 30 gold. Nothing changed.');
    G.removeLoose(state,'ward-fragment',1);state.player.gold-=30;G.addTo(state.player.inventory,'wayfarer-boots',1);m.meeting.bartered=true;
    return emit(events,'Edda exchanges the fragment and 30 gold for Wayfarer’s Boots. This exchange cannot be repeated at this meeting.','item','good');
  }
  // The remaining services require a real settlement, not a remotely opened menu.
  const t=town(state);if(!t)return fail(events,'That service is available in a town, not on an expedition.');
  if(action.type==='town-service'){
    if(action.serviceId==='civic-rest')return longRest(state,false,events);
    if(action.serviceId==='inn')return longRest(state,true,events);
    if(action.serviceId==='treatment'){
      const afflicted=G.actors(state).filter(a=>a.conditions.some(c=>['poisoned','bleeding','frightened','deafened'].includes(c.id)));
      if(!afflicted.length)return fail(events,'No party member needs this treatment. No gold was spent.');
      const cost=8+state.player.level;if(!charge(state,cost,events))return {ok:false,error:'Not enough gold.'};
      for(const a of afflicted)a.conditions=a.conditions.filter(c=>!['poisoned','bleeding','frightened','deafened'].includes(c.id));
      return emit(events,`The shrine treats ${afflicted.map(a=>a.name).join(', ')} for ${cost} gold, clearing persistent harmful conditions.`,'heal','good');
    }
    if(action.serviceId==='blessing'){
      const a=G.actor(state,action.targetId||'player');if(!a)return fail(events,'Select a party member.');
      if(a.conditions.some(c=>c.id==='blessed'))return fail(events,`${a.name} already has an unused blessing.`);
      if(!charge(state,12,events))return {ok:false,error:'Not enough gold.'};
      a.conditions.push({id:'blessed',name:'Shrine blessing: +1d4 on next saving throw',uses:1});
      return emit(events,`${a.name} receives a blessing for 12 gold. The next saving throw gains 1d4, then the blessing is consumed.`,'condition','good');
    }
    return fail(events,'That service is not offered.');
  }
  if(action.type==='rumor'){
    const q=QUESTS[action.questId];if(!q||!completed(state,q.unlock))return fail(events,'There is no established lead for that expedition yet.');
    if(w.rumors[q.id])return fail(events,'That briefing is already recorded in your journal.');
    if(!charge(state,5,events))return {ok:false,error:'Not enough gold.'};w.rumors[q.id]=true;
    return emit(events,`Briefing: ${q.threat} This information also gives +1 to that expedition’s combat-objective checks.`,'clue','good');
  }
  if(action.type==='upgrade'){
    const id=String(action.itemId||''),item=ITEMS[id],up=ITEMS[`${id}-fine`];const owner=action.actorId?G.actor(state,action.actorId):null;
    if(!item||!up||item.upgradeTier)return fail(events,'Only basic weapons, armor, shields and foci have one fine-quality upgrade.');
    const ownerEquipped=owner&&Object.values(owner.equipment||{}).includes(id);
    if(!ownerEquipped&&G.available(state,id)<1)return fail(events,'Choose the equipped owner or an unequipped copy to upgrade.');
    const cost=45+Math.floor(item.value/2);
    if(!charge(state,cost,events))return {ok:false,error:'Not enough gold.'};
    if(ownerEquipped)owner.equipment[item.slot]=null;
    G.removeLoose(state,id,1);G.addTo(state.player.inventory,up.id,1);
    if(ownerEquipped){owner.equipment[item.slot]=up.id;G.derive(owner);}
    return emit(events,`The smith upgrades ${item.name} to ${up.name} for ${cost} gold. ${up.purpose}`,'equipment','good');
  }
  if(action.type==='craft'){
    const recipe=RECIPES.find(r=>r.id===action.recipeId);if(!recipe)return fail(events,'Choose an available recipe.');
    if(recipe.ingredients.some(i=>G.available(state,i.itemId)<i.quantity)||state.player.gold<recipe.gold)return fail(events,'Missing ingredients or gold. Nothing has been consumed.');
    for(const i of recipe.ingredients)G.removeLoose(state,i.itemId,i.quantity);state.player.gold-=recipe.gold;G.addTo(state.player.inventory,recipe.itemId,1);
    return emit(events,`Workshop completed: ${recipe.description}`,'item','good');
  }
  if(action.type==='store'||action.type==='retrieve'){
    const id=String(action.itemId||''),item=ITEMS[id];if(!item||item.category==='quest')return fail(events,'Quest evidence stays with the party; store ordinary gear and supplies.');
    const store=action.type==='store';const from=store?state.player.inventory:w.storage,to=store?w.storage:state.player.inventory;
    const e=from.find(x=>x.itemId===id);if(!e||(store&&G.available(state,id)<1))return fail(events,'No loose copy is available to move.');
    const charges=e.charges;e.quantity-=1;if(e.quantity<=0)from.splice(from.indexOf(e),1);else if(item.charges)e.charges=item.charges;
    G.addTo(to,id,1,charges);
    return emit(events,`${store?'Stored':'Retrieved'} one ${item.name}. Charges are preserved; town storage is shared across discovered settlements.`,'item');
  }
  if(action.type==='recruit'){
    if(state.party.some(m=>m.id==='nessa')||state.player.level<3)return fail(events,'No recruit is currently available.');
    api.recruitCompanion(state,'nessa',events);const n=state.party.find(m=>m.id==='nessa');G.initCompanion(state,n);P.levelCompanion(n,state.player.level);
    return emit(events,'Nessa Reed joins through the roadwardens’ guild. She brings her equipment and shares the party’s level; no recruitment fee is required.','party','good');
  }
  if(action.type==='personal'){
    const a=state.party.find(m=>m.id===action.companionId),def=PERSONAL[action.companionId];if(!a||!def)return fail(events,'That companion is not present.');
    const r=w.personal[a.id] ||= {};if(r.started)return fail(events,'That personal request is already recorded.');
    r.started=true;r.goalMet=Boolean(w.completed[def.quest]);a.bond=Math.min(5,a.bond+1);
    return emit(events,`${def.prompt} ${r.goalMet?'The adventure is already resolved; discuss what it meant to complete this personal quest.':def.goal}`,'dialogue');
  }
  if(action.type==='resolve-personal'){
    const a=state.party.find(m=>m.id===action.companionId),r=w.personal[action.companionId],def=PERSONAL[action.companionId];
    if(!a||!r?.started||!completed(state,def.quest)||r.rewarded||!['watchful','decisive'].includes(action.choice))return fail(events,'That companion reflection is not available.');
    r.rewarded=true;r.style=action.choice;a.personalStyle=action.choice;a.bond=Math.min(5,a.bond+2);G.derive(a);
    return emit(events,`${a.name} resolves ${def.name}. ${action.choice==='watchful'?'Watchful: +1 AC.':'Decisive: +1 attack bonus and spell save DC.'} ${def.reward}`,'party','good');
  }
  if(action.type==='practice'){
    if(w.practiceSnapshot)return fail(events,'A practice session is already active.');
    w.practiceSnapshot={player:deepClone(state.player),party:deepClone(state.party),nodeId:state.story.nodeId};
    api.startCombat(state,'practice',rng,events);
    return emit(events,'The guild starts a supervised practice fight. Actual class abilities work here; health, resources and inventory will be restored on leaving, with no rewards.','combat');
  }
  return fail(events,'That action is unavailable.');
}
function previewItem(state,id,qty,kind){const item=ITEMS[id];return {id,name:item.name,purpose:item.purpose,category:item.category,stock:qty,price:price(state,id,kind),comparisons:item.slot?G.actors(state).map(a=>G.comparison(state,id,a.id)):[]};}
function view(state){
  const w=state.world,t=town(state),m=activeMerchant(state);
  const ready=Object.values(QUESTS).filter(q=>completed(state,q.unlock)&&!completed(state,q.id));
  const services=t?[
    {id:'civic-rest',name:'Civic lodging',cost:0,description:'Full HP and resources; persistent poison needs treatment. No stock refresh or XP.'},
    {id:'inn',name:'Inn: expedition lodging',cost:10+state.player.level,description:`Full recovery, ${4+state.player.level} temporary HP each and +1 Inspiration. Once per progress cycle.`,disabled:Boolean(w.servicesUsed[`inn:${w.cycle}`])},
    {id:'treatment',name:'Shrine: treat conditions',cost:8+state.player.level,description:'Clear poison, bleeding, fear and deafness for the party.',disabled:!G.actors(state).some(a=>a.conditions.some(c=>['poisoned','bleeding','frightened','deafened'].includes(c.id)))},
    {id:'blessing',name:'Shrine: bless the hero',cost:12,description:'+1d4 to the hero’s next saving throw, then consumed.',disabled:state.player.conditions.some(c=>c.id==='blessed')}
  ]:[];
  const eq=state.player.inventory.filter(e=>ITEMS[e.itemId].slot).flatMap(e=>{
    const item=ITEMS[e.itemId],up=ITEMS[`${item.id}-fine`];if(!up)return [];
    const owners=G.actors(state).filter(a=>Object.values(a.equipment).includes(item.id));
    const opts=owners.map(a=>({actorId:a.id,owner:a.name}));if(G.available(state,item.id))opts.push({actorId:null,owner:'Shared inventory'});
    return opts.map(o=>({itemId:item.id,name:item.name,newName:up.name,...o,cost:45+Math.floor(item.value/2),purpose:up.purpose}));
  });
  const questCards=ready.map(q=>({id:q.id,name:q.name,level:q.level,town:q.town,townName:TOWNS[q.town].name,brief:q.brief,reward:{xp:q.xp,gold:q.gold},available:unlocked(state,q)&&!state.combat?.active,knownThreat:w.rumors[q.id]?q.threat:null,briefed:Boolean(w.rumors[q.id]),inProgress:w.activeQuest===q.id,returning:Boolean(w.progress[q.id]?.node),canDepart:Boolean(t&&t.id===q.town&&unlocked(state,q)&&(!w.activeQuest||w.activeQuest===q.id))}));
  const prep=questCards.map(q=>{
    const original=QUESTS[q.id];const tools=original.route.tools||[];
    const warnings=[];
    for(const a of G.actors(state))if(a.hp<a.maxHp*0.65)warnings.push(`${a.name} is below 65% health.`);
    if(!state.player.inventory.some(e=>['healing-potion','greater-healing'].includes(e.itemId)))warnings.push('No healing potions are carried; companions and class abilities may provide alternatives.');
    if(q.knownThreat&&tools.length&&!tools.some(id=>state.player.inventory.some(e=>e.itemId===id)))warnings.push('You do not have the tools mentioned in the briefing. Other routes remain available.');
    if(q.knownThreat&&original.route.poison&&!state.player.inventory.some(e=>e.itemId==='antitoxin'))warnings.push('Poison was reported. You have no Antitoxin; treatment remains available in town.');
    return {questId:q.id,warnings,knownThreat:q.knownThreat};
  });
  return {day:w.day,cycle:w.cycle,town:t?{...t,rumor:undefined}:null,townId:w.townId,onExpedition:w.onExpedition,activeQuest:w.activeQuest,pendingBattle:w.pendingBattle||null,canReturn:!t&&!state.combat?.active&&!STORY_NODES[state.story.nodeId]?.defeat,
    towns:w.unlockedTowns.map(id=>({id,name:TOWNS[id].name,current:t?.id===id})),
    reputation:w.reputation,services,
    shop:t?Object.entries(ensureStock(state,t.id)).map(([id,qty])=>previewItem(state,id,qty,'town')):[],
    merchant:m?{id:m.id,name:m.name,role:m.role,personality:m.personality,offer:m.offer,bargained:m.meeting.bargained,bartered:m.meeting.bartered,favorDone:Boolean(w.favors.caravan),stock:Object.entries(m.meeting.stock).map(([id,qty])=>previewItem(state,id,qty,'merchant'))}:null,
    upgrades:t?eq:[],recipes:t?RECIPES.map(r=>({...r,ready:r.ingredients.every(i=>G.available(state,i.itemId)>=i.quantity)&&state.player.gold>=r.gold})):[],
    storage:w.storage.map(e=>({...e,name:ITEMS[e.itemId].name,purpose:ITEMS[e.itemId].purpose})),
    sellable:state.player.inventory.filter(e=>ITEMS[e.itemId].category!=='quest'&&G.available(state,e.itemId)>0).map(e=>({...e,name:ITEMS[e.itemId].name,loose:G.available(state,e.itemId),sellPrice:sellPrice(e.itemId),partial:Boolean(ITEMS[e.itemId].charges&&e.charges!==ITEMS[e.itemId].charges)})),
    quests:questCards,preparation:prep,
    completed:Object.entries(w.completed).map(([id,v])=>({id,name:QUESTS[id]?.name||'The Bell Beneath Briarwatch',...v})),
    bellComplete:completed(state,'bell'),campaignComplete:completed(state,'aftermath'),regionalCrisisResolved:completed(state,'beacon'),
    canRecruit:state.player.level>=3&&!state.party.some(m=>m.id==='nessa'),
    personal:state.party.map(a=>{const def=PERSONAL[a.id],r=w.personal[a.id]||{};return {companionId:a.id,name:def.name,prompt:def.prompt,goal:def.goal,reward:def.reward,...r,goalMet:completed(state,def.quest),canResolve:Boolean(r.started&&!r.rewarded&&completed(state,def.quest))};}),
    setbacks:w.setbacks,
    recap:completed(state,'beacon')?(state.story.flags.ending_distributed?'The towns retain independent wards; the party keeps the roads between them open.':'A public charter limits the network’s authority and names its accountable keepers.'):'Your completed expeditions and community choices will determine the network’s future.'
  };
}
module.exports={init,town,activeMerchant,handle,view,completeQuest,reputation,recover,longRest,price,unlocked,TOWN_ACTIONS};
