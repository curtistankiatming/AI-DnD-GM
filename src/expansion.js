"use strict";

// Regional expansion. The authored tables (towns, merchants, recipes, companion
// quests, expeditions and new items) live in src/data/*.json; this module adds
// them to the base content and builds expedition scenes from each quest.
const C = require('./content');
const { ITEMS, STORY_NODES, ENEMIES, ENCOUNTERS, CLUES, CAMPAIGN } = C;
const { deepClone } = require('./rules');
const XP = require('./xp');

Object.assign(CAMPAIGN,{
  title:'Briarwatch: Roads Beyond the Bell',
  subtitle:'A story-first d20 journey • towns, companions and the first advancement',
  levelRange:'1–100',
  premise:'A silenced ward-bell draws your party to Briarwatch. What you uncover will lead beyond the forest, through trading towns and fractured alliances, to the source of a region-wide collapse of the wards.'
});
// Correct descriptions before adding more systems. Charges are per physical kit.
ITEMS['healing-potion'].value=15;
ITEMS.antitoxin.value=12;
ITEMS.antitoxin.purpose='Action: cure Poisoned, or prepare advantage on the next poison saving throw. The protection is consumed by that save, not by unrelated saves.';
ITEMS['healers-kit'].value=12;
ITEMS['healers-kit'].purpose='Three uses per kit. Outside combat each use heals 1d6+2 HP. In combat it only stabilizes an unconscious, unstable ally (0 HP); it does not revive them.';
ITEMS['thornward-cloak'].story={skill:'survival'};
ITEMS['thornward-cloak'].purpose='Equip for +1 AC. Its charge is shown on the character sheet.';
ITEMS['smoke-bomb'].value=18;
ITEMS['holy-water'].value=15;
const newItems = require('./data/region-items.json');
for(const item of newItems)ITEMS[item.id]=item;
// The heaviest gear needs the strength to use it (21 November 2026). Set
// before the forge upgrades below, so the Fine versions need it too.
ITEMS['field-plate'].requires={abilities:{str:13}};
ITEMS['field-plate'].purpose='Base AC 17, no Dexterity bonus. Heavy and conspicuous: −2 Stealth.';
ITEMS.greatsword.requires={abilities:{str:13}};
// One capped quality upgrade per equipment item. Deterministic variants avoid
// untracked ad-hoc modifiers and make saves comparable and auditable.
const UPGRADE_BASES=Object.values(ITEMS).filter(i=>['weapon','armor','shield','focus'].includes(i.category));
for(const base of UPGRADE_BASES){
  const item=deepClone(base);item.id=`${base.id}-fine`;item.name=`Fine ${base.name}`;item.baseId=base.id;item.upgradeTier=1;
  item.value=base.value+50;item.rarity='Uncommon';
  let effect='';
  if(item.weapon){item.attackBonus=(item.attackBonus||0)+1;item.damageBonus=(item.damageBonus||0)+1;effect='+1 to hit and damage.';}
  if(item.armor){item.armor.base+=1;effect='+1 base AC.';}
  if(item.category==='shield'){item.acBonus=(item.acBonus||0)+1;effect='+1 AC.';}
  if(item.category==='focus'){item.spellAttackBonus=(item.spellAttackBonus||0)+1;effect='+1 spell attack bonus.';}
  item.purpose=`${base.purpose} Fine quality: ${effect} The smith cannot improve it further.`;
  ITEMS[item.id]=item;
}
// Items with requirements, special stats, skills and story abilities
// (src/gear.js). They have no forge upgrade: they are already special.
for(const item of require('./data/gear.json'))ITEMS[item.id]=item;
const TOWNS=require('./data/towns.json');
const MERCHANTS=require('./data/merchants.json');
const RECIPES=require('./data/recipes.json');
const PERSONAL=require('./data/personal.json');

// Each expedition has its own evidence, approaches, moral stakes and aftermath.
// Numerical rewards are objective-based: social and combat solutions pay the same XP.
// "aftermath" is the post-advancement mission, so the level-10 reward is not a dead end.
const QUESTS=require('./data/quests.json');
// Books One and Two pay a share of each chapter's level (src/xp.js
// CHAPTER_SHARE), so side content matters there. A chapter written to pay
// nothing (the trial, an aftermath) still pays nothing. Book Three on keeps
// one level per chapter, so it ends at the 3rd job at level 40.
for(const q of Object.values(QUESTS))if(Number(q.xp)>0&&!q.sideJob&&(Number(q.book)||1)<=2)q.xp=XP.chapterXp(q.level);

// Written lines: {"say": companion id or name, "text"} or {"narrate"}, with an
// optional "when" that the engine checks as the line is told (see liveLines in
// src/engine.js). Lines spoken by a companion who is not in the party are
// skipped there too.
const speakerName=id=>{const c=C.COMPANIONS[id];return c?c.name.replace(/^Sister /,'').split(' ')[0]:String(id);};
const storyLine=l=>({...(l.narrate?{narration:l.narrate}:{speaker:speakerName(l.say),speakerId:C.COMPANIONS[l.say]?l.say:null,text:l.text}),...(l.when?{when:l.when}:{})});
function dialogueText(lines){return lines.map(l=>l.narration||`${l.speaker}: ${l.text}`).join('\n');}
// A written line is told only when it applies now: its speaker is in the
// party, and its optional "when" holds (flag / is, notFlag, anyFlag, noneFlag,
// party, absent, class, spec, bondAtLeast, bondBelow, item, notItem, clue,
// notClue, access, notAccess). The written text keeps every line; this picks the ones for this save.
function lineApplies(state, line) {
  const inParty = (id) => state.party.some((member) => member.id === id);
  if (line.speakerId && !inParty(line.speakerId)) return false;
  const w = line.when;
  if (!w) return true;
  const f = state.story.flags || {};
  if (w.flag !== undefined && !(w.is !== undefined ? f[w.flag] === w.is : Boolean(f[w.flag]))) return false;
  if (w.notFlag && f[w.notFlag]) return false;
  if (Array.isArray(w.anyFlag) && !w.anyFlag.some((flag) => f[flag])) return false;
  if (Array.isArray(w.noneFlag) && w.noneFlag.some((flag) => f[flag])) return false;
  if (w.party && !inParty(w.party)) return false;
  if (w.absent && inParty(w.absent)) return false;
  if (w.class && state.player.classId !== w.class) return false;
  // spec: the hero's 2nd job branch ("none" before one is chosen).
  if (w.spec !== undefined && (state.player.progression?.specialization || 'none') !== w.spec) return false;
  // bondAtLeast / bondBelow: {companion id: bond}, how far a companion trusts the hero.
  const bond = (id) => Number(state.party.find((member) => member.id === id)?.bond) || 0;
  if (w.bondAtLeast && Object.entries(w.bondAtLeast).some(([id, n]) => !inParty(id) || bond(id) < n)) return false;
  if (w.bondBelow && Object.entries(w.bondBelow).some(([id, n]) => !inParty(id) || bond(id) >= n)) return false;
  const carried = (id) => (state.player.inventory || []).some((entry) => entry.itemId === id);
  if (w.item && !carried(w.item)) return false;
  if (w.notItem && carried(w.notItem)) return false;
  // clue / notClue: whether the hero found a lead (a clue id), so a scene never credits work they skipped.
  const found = (id) => (state.story.clues || []).includes(id);
  if (w.clue && !found(w.clue)) return false;
  if (w.notClue && found(w.notClue)) return false;
  // access / notAccess: whether this session may play book N (paid books on
  // the hosted game). Required here, not at the top: book.js requires this file.
  if (w.access !== undefined && !require('./book').reads(state, w.access)) return false;
  if (w.notAccess !== undefined && require('./book').reads(state, w.notAccess)) return false;
  return true;
}
function liveLines(state, lines) {
  return Array.isArray(lines) ? lines.filter((line) => lineApplies(state, line)).map(({ when, ...line }) => line) : lines;
}
// A written quest field is plain text or a list of lines.
const told=v=>Array.isArray(v)?{lines:v}:{text:v};
const toldOpening=v=>Array.isArray(v)?{lines:v}:{opening:v};
const plain=v=>Array.isArray(v)?dialogueText(v.map(storyLine)):v;

function choice(id,label,rest={}){return {id,label,description:rest.description||'',once:true,...rest};}
function clue(id,name,text){CLUES[id]={id,name,text};}
function installQuest(q){
  // Challenge drives DCs and enemy strength (src/xp.js): accuracy sets AC,
  // attacks and DCs; power sets health and damage. Renown and the chosen
  // difficulty tier of an AI adventure add to them.
  const challenge=XP.challenge(q),{accuracy:A,power:L}=challenge;
  const prefix=`q-${q.id}`;
  const evidence=`${q.id}-evidence`;
  clue(evidence,`${q.name}: established lead`,q.clue);
  const preparation=`prepared:${q.id}`;
  const approach=`approach:${q.id}`;
  // The best-suited party member rolls each check (21 November 2026), so the
  // chapters to level 10, where Help is almost always on hand, are 2 harder
  // to keep the average odds near 60-70% (docs/BALANCE-2026-11-21-CHECKS.md).
  const D=Math.floor(A/2)+(q.level<=10?2:0);
  const investigate={skill:q.investigate.skill,alternateSkills:q.investigate.alt,dc:11+D,tools:q.investigate.tools};
  const routeCheck={skill:q.route.skill,alternateSkills:q.route.alt,dc:12+D,tools:q.route.tools};
  STORY_NODES[`${prefix}-start`]={id:`${prefix}-start`,act:`Expedition • Level ${q.level}`,title:q.name,location:q.region,objective:q.brief,...toldOpening(q.opening),safeRest:true,questId:q.id,phase:'start',choices:[
    choice('investigate',q.investigate.label,{check:investigate,description:'Establish what is happening before committing. Failure still reveals a useful lead.',success:{...told(q.investigate.success),clues:[evidence],setFlags:{[preparation]:true}},failure:{...told(q.investigate.failure),clues:[evidence],setFlags:{[`partial:${q.id}`]:true}}}),
    // Optional conversations before setting out ("talks"): lines only, no
    // rolls or rewards; they may change approval or set a flag later lines read.
    ...(q.talks||[]).map(t=>choice(`talk-${t.id}`,t.label,{description:t.description||'A conversation. It costs nothing and changes nothing but what people think and know.',...(t.requires?{requires:t.requires}:{}),result:{lines:t.lines,...(t.approval?{approval:t.approval}:{}),...(t.setFlags?{setFlags:t.setFlags}:{})}})),
    choice('advance',q.route.label,{nextNode:`${prefix}-approach`,description:'Proceed toward the crisis. Preparation remains optional.'})
  ]};
  STORY_NODES[`${prefix}-approach`]={id:`${prefix}-approach`,act:`Expedition • Level ${q.level}`,title:'The approach',location:q.region,objective:q.route.label,...toldOpening(q.approach||'The route ahead offers a careful approach or a direct crossing. Choose how to handle the obstacle; supplies and trained skills can change the risk.'),safeRest:false,questId:q.id,phase:'approach',choices:[
    choice('careful',q.route.label,{check:routeCheck,description:q.route.safe?'A social approach. Failure costs no health, but you arrive without the approach advantage.':`${q.route.tools?.length?'The listed equipment can grant advantage. ':''}A failed approach causes injury (and poison only where described), but does not block the story.`,success:{...told(q.route.success),setFlags:{[approach]:true},nextNode:`${prefix}-crisis`},failure:{...told(q.route.failure),partyDamage:q.id==='trial'||q.route.safe?'0':`${1+Math.floor(L/5)}d4`,poison:q.route.safe?undefined:q.route.poison,nextNode:`${prefix}-crisis`}}),
    // "direct" may give a chapter its own words for the no-roll approach.
    choice('direct',q.direct?.label||'Take the obvious route and keep the party together',{description:'No check. Arrive openly without an approach advantage.',result:{text:q.direct?.text||'The party arrives together by the direct route. You have surrendered surprise, not the opportunity to decide what happens next.',nextNode:`${prefix}-crisis`}})
  ]};
  STORY_NODES[`${prefix}-crisis`]={id:`${prefix}-crisis`,act:`Expedition • Level ${q.level}`,title:'The deciding moment',location:q.region,objective:q.objective.name,...toldOpening(q.crisis),safeRest:false,questId:q.id,phase:'crisis',choices:[
    choice('resolve',q.peaceful.label,{...(q.peaceful.labelNoLead?{labelNoLead:q.peaceful.labelNoLead}:{}),check:{skill:q.peaceful.skill,alternateSkills:q.peaceful.alt,dc:14+D,lead:evidence},description:'Try a complete noncombat resolution. Established preparation lowers the DC; without any lead it is harder; failure starts the objective encounter.',success:{...told(q.peaceful.success),setFlags:{[`method:${q.id}`]:'peace'},nextNode:`${prefix}-after`},failure:{...told(q.peaceful.failure),combat:`quest:${q.id}`}}),
    // Extra written resolutions for this crisis ("crisisChoices"): lines, flags
    // and approval, then on to the chapter's ending, like a peaceful success.
    ...(q.crisisChoices||[]).map(c=>choice(c.id,c.label,{description:c.description||'',...(c.requires?{requires:c.requires}:{}),result:{lines:c.lines,setFlags:{[`method:${q.id}`]:'peace',...(c.setFlags||{})},...(c.approval?{approval:c.approval}:{}),nextNode:`${prefix}-after`}})),
    choice('objective',`Protect the party while you ${q.objective.label.toLowerCase()}`,{description:q.objective.description,result:{text:'Your companions take their positions. The objective, its difficulty and its consequences are visible during the encounter.',combat:`quest:${q.id}`}}),
    choice('confront','Confront the threat directly',{description:'Start the same encounter without committing to a method. You may attack, pursue the objective, or retreat.',combat:`quest:${q.id}`})
  ]};
  STORY_NODES[`${prefix}-after`]={id:`${prefix}-after`,act:'Consequences',title:'What you leave behind',location:q.region,objective:'Choose what follows your intervention, then return to town.',...toldOpening(q.after),safeRest:true,questId:q.id,phase:'after',choices:q.decisions.map(d=>choice(d.id,d.label,{description:d.description||'This decision is permanent. The objective reward is the same for every approach.',...(d.requires?{requires:d.requires}:{}),result:{...told(d.text),setFlags:{[d.flag]:true,...(d.setFlags||{})},completeQuest:q.id,reputation:d.rep,...(d.flagsIf?{flagsIf:d.flagsIf}:{}),...(d.gold?{gold:d.gold}:{}),...(d.approval?{approval:d.approval}:{}),nextNode:`town-${q.nextTown||q.town}`}}))};
  const level=L;
  const type=q.enemyTheme;
  const f=XP.foeStats(challenge);
  ENEMIES[q.foe]={id:q.foe,name:q.foeName,maxHp:f.main.maxHp,ac:f.main.ac,level,abilities:{str:14,dex:12,con:14,int:13,wis:13,cha:14},attack:{name:q.attackName||(type==='wild'?'Briar Lash':type==='undead'?'Remembered Toll':'Ward Strike'),bonus:f.main.attackBonus,damage:f.main.damage,damageType:type==='undead'?'necrotic':type==='storm'?'lightning':'slashing'},aiRole:level>=8?'boss':'leader',tags:type==='undead'?['undead']:[],resistances:type==='undead'?['slashing','piercing','bludgeoning']:[],xp:0};
  const minion=`${q.foe}-retainer`;
  ENEMIES[minion]={id:minion,name:q.retainerName||(type==='undead'?'Bound Record Keeper':type==='wild'?'Ashbound Reedling':'Bound Retainer'),maxHp:f.retainer.maxHp,ac:f.retainer.ac,level,abilities:{str:12,dex:12,con:12,int:9,wis:11,cha:9},attack:{name:'Guarding Strike',bonus:f.retainer.attackBonus,damage:f.retainer.damage,damageType:'bludgeoning'},aiRole:'soldier',tags:type==='undead'?['undead']:[],xp:0};
  // "flagScale" ({story flag: multiplier}) makes a chapter's fight harder or
  // easier when an earlier choice was made (src/combat.js flagScale).
  ENCOUNTERS[`quest:${q.id}`]={id:`quest:${q.id}`,name:q.name,enemies:[q.foe,minion,minion],storyScale:0.82,standardScale:1,grittyScale:1.18,xp:0,loot:[],...(q.flagScale?{flagScale:q.flagScale}:{}),intro:plain(q.crisis),...(Array.isArray(q.crisis)?{introLines:q.crisis.map(storyLine)}:{}),questId:q.id,objective:q.objective,victoryNode:`${prefix}-after`,defeatNode:'defeat'};
}
for(const q of Object.values(QUESTS))installQuest(q);
// Conversation scenes (src/data/scenes.json): companions talk with each other
// after an expedition. Each beat is a story node whose lines are kept as
// structured dialogue; choices change approval only. A scene whose cast is
// not all in the party is skipped (engine enterNode follows skipTo).
// A scene may also follow another scene ("after" names that scene): it plays
// straight after it, as the second choice of a chapter runs before its camp.
const SCENES=require('./data/scenes.json');
const sceneNode=(scene,key)=>`scene-${scene.id}-${key}`;
const chapterOf=scene=>{for(let s=scene,i=0;s&&i<10;s=SCENES[s.after],i++)if(QUESTS[s.after])return QUESTS[s.after];return null;};
function installScene(scene){
  const q=chapterOf(scene);if(!q)throw new Error(`Scene ${scene.id} follows unknown expedition ${scene.after}`);
  const next=Object.values(SCENES).find(s=>s&&s.nodes&&s.after===scene.id);
  const home=next?sceneNode(next,next.start):`town-${q.nextTown||q.town}`,nodeId=key=>sceneNode(scene,key);
  for(const [key,raw]of Object.entries(scene.nodes)){
    const base=raw.sameAs?scene.nodes[raw.sameAs]:raw;
    const dialogue=base.lines.map(storyLine);
    STORY_NODES[nodeId(key)]={id:nodeId(key),act:scene.act,title:base.title,location:scene.location,objective:base.objective,opening:dialogueText(dialogue),dialogue,safeRest:false,sideStory:true,scene:scene.id,cast:scene.cast,skipTo:home,
      choices:(raw.choices||[]).map(c=>choice(c.id,c.label,{...(c.requires?{requires:c.requires}:{}),result:{...(c.lines?{dialogue:c.lines.map(storyLine)}:{}),...(c.approval?{approval:c.approval}:{}),...(c.setFlags?{setFlags:c.setFlags}:{}),nextNode:c.next?nodeId(c.next):home}}))};
  }
  if(QUESTS[scene.after])for(const c of STORY_NODES[`q-${q.id}-after`].choices)c.result.nextNode=nodeId(scene.start);
}
for(const scene of Object.values(SCENES))if(scene&&scene.nodes)installScene(scene);
// Side jobs (src/data/side-jobs.json): short optional stories taken from a
// town. Each node is a story node; a choice either moves on ("next") or
// finishes the job, which pays it (src/world.js completeJob) and goes back to
// the job's town. Checks use a DC by the job's level. A choice that costs gold
// needs that much in the purse.
const SIDE_JOBS=Object.fromEntries(Object.entries(require('./data/side-jobs.json')).filter(([,j])=>j&&j.nodes));
function installJob(job){
  const town=TOWNS[job.town];if(!town)throw new Error(`Side job ${job.id} is in unknown town ${job.town}`);
  for(const id of [job.from,job.until])if(id&&!QUESTS[id])throw new Error(`Side job ${job.id} names unknown chapter ${id}`);
  const nodeId=key=>`job-${job.id}-${key}`;
  const dc=10+Math.floor(XP.challenge({level:job.level}).accuracy/2);
  const ends=o=>({lines:o.lines,...(o.approval?{approval:o.approval}:{}),...(o.setFlags?{setFlags:o.setFlags}:{}),...(Number.isFinite(o.gold)?{gold:o.gold}:{}),
    ...(o.next?{nextNode:nodeId(o.next)}:{completeJob:job.id,...(Number.isFinite(o.reward)?{jobReward:o.reward}:{}),nextNode:`town-${job.town}`})});
  for(const [key,raw]of Object.entries(job.nodes)){
    STORY_NODES[nodeId(key)]={id:nodeId(key),act:`Side job • ${town.name}`,title:raw.title,location:town.name,objective:job.brief,lines:raw.lines,safeRest:true,sideStory:true,sideJob:job.id,
      choices:raw.choices.map(c=>{
        const cost=!c.check&&Number.isFinite(c.gold)&&c.gold<0?-c.gold:0;
        const requires=cost||c.requires?{...(c.requires||{}),...(cost?{gold:cost}:{})}:null;
        const base={description:c.description||'',once:false,...(requires?{requires}:{})};
        return c.check?choice(c.id,c.label,{...base,check:{skill:c.check.skill,alternateSkills:c.check.alt||[],dc},success:ends(c.success),failure:ends(c.failure)}):choice(c.id,c.label,{...base,result:ends(c)});
      })};
    if(!STORY_NODES[nodeId(job.start)])throw new Error(`Side job ${job.id} has no start node ${job.start}`);
  }
}
for(const job of Object.values(SIDE_JOBS))installJob(job);
// Any written story node or choice outcome may use "lines" (the same format as
// scenes) instead of plain text. They compile to structured dialogue plus the
// same text, so offline narration, saves and the AI narrator are unchanged.
for(const node of Object.values(STORY_NODES)){
  if(Array.isArray(node.lines)){node.dialogue=node.lines.map(storyLine);node.opening=dialogueText(node.dialogue);}
  for(const c of node.choices||[])for(const key of ['success','failure','result']){const o=c[key];if(o&&Array.isArray(o.lines)){o.dialogue=o.lines.map(storyLine);o.text=dialogueText(o.dialogue);}}
}
// A town a story choice has emptied ("emptied": {flag, subtitle, description},
// Book Three's Vell after the evacuation) is told as it is now when the party
// arrives; src/world.js closes its shops, services, side jobs and boards.
for(const town of Object.values(TOWNS)){
  const gone=town.emptied;
  STORY_NODES[`town-${town.id}`]={id:`town-${town.id}`,act:'Downtime & preparation',title:town.name,location:town.subtitle,objective:'Recover, develop the party, choose an expedition and prepare for known threats.',opening:town.description,safeRest:true,townId:town.id,choices:[],
    ...(gone?{locationIf:{flag:gone.flag,location:gone.subtitle},dialogue:[{narration:town.description,when:{notFlag:gone.flag}},{narration:gone.description,when:{flag:gone.flag}}]}:{})};
}
// Where a node is, as this save sees it (a town node's "locationIf").
const nodeLocation=(state,node)=>node?.locationIf&&state?.story?.flags?.[node.locationIf.flag]?node.locationIf.location:node?.location;

// Continue the original story rather than reset the party or fake a level grant.
STORY_NODES.ending.ending=false;
STORY_NODES.ending.act='Chapter I • Consequences';
STORY_NODES.ending.objective='Report to Briarwatch and open the roads beyond the bell.';
STORY_NODES.ending.opening='The immediate threat beneath Briarwatch has ended. The village waits for your account; what you chose will follow the party onto the wider roads.';
STORY_NODES.ending.choices=[choice('report-bell','Report to the town and prepare for the next adventure',{result:{text:'Aveline pays the agreed contract and introduces you to the road wardens. The party keeps its experience, equipment and relationships.',completeQuest:'bell',nextNode:'town-briarwatch'}})];
STORY_NODES['briarwatch-square'].townId='briarwatch';
STORY_NODES['tovin-infirmary'].townId='briarwatch';
STORY_NODES.defeat.choices=[choice('recover','Accept rescue and return to a safe town',{once:false,description:'Lose up to a quarter of your gold, never equipment or XP. The interrupted encounter can be retried. The supervised trial has no gold penalty.',result:{text:'The survivors and local wardens retrieve the party. The setback remains in the journal; the road is not over.',recover:true}})];
// Old ambiguous descriptions and effects: route-specific truth only.
const v=C.STORY_NODES['bell-vault'];
const expose=v.choices.find(c=>c.id==='expose-sable');
expose.success.combat=undefined;expose.success.nextNode='ending';
expose.success.text='The ledger makes Sable’s lie impossible to sustain. His followers cut the binding, disarm him and surrender him to your party. Evidence wins what a blade need not.';
expose.success.setFlags.spiritFreed=true;
// A practice battle gives the actual new specialization a safe place to operate.
ENEMIES['training-echo']={id:'training-echo',name:'Guild Training Echo',maxHp:160,ac:15,level:10,abilities:{str:14,dex:12,con:14,int:12,wis:12,cha:12},attack:{name:'Blunted Echo',bonus:5,damage:'1d6+2',damageType:'bludgeoning'},aiRole:'soldier',xp:0};
ENCOUNTERS.practice={id:'practice',name:'The Echo Court — practice',enemies:['training-echo'],storyScale:1,standardScale:1,grittyScale:1,xp:0,loot:[],intro:'A supervised practice echo rises. No gold, XP or loot is awarded. Your health, resources and supplies are restored exactly after practice.',victoryNode:'town-highpass',defeatNode:'town-highpass',practice:true};
module.exports={TOWNS,MERCHANTS,RECIPES,PERSONAL,QUESTS,SCENES,SIDE_JOBS,UPGRADE_BASES,installQuest,storyLine,dialogueText,liveLines,lineApplies,nodeLocation};
