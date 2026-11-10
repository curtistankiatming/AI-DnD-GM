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
ITEMS['thornward-cloak'].purpose='Equip for +1 AC and advantage on your first Survival check after each long rest. This charge is shown on the character sheet.';
ITEMS['smoke-bomb'].value=18;
ITEMS['holy-water'].value=15;
const newItems = require('./data/region-items.json');
for(const item of newItems)ITEMS[item.id]=item;
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
  item.purpose=`${base.purpose} Fine quality: ${effect} This is the maximum forge tier in this campaign.`;
  ITEMS[item.id]=item;
}
const TOWNS=require('./data/towns.json');
const MERCHANTS=require('./data/merchants.json');
const RECIPES=require('./data/recipes.json');
const PERSONAL=require('./data/personal.json');

// Each expedition has its own evidence, approaches, moral stakes and aftermath.
// Numerical rewards are objective-based: social and combat solutions pay the same XP.
// "aftermath" is the post-advancement mission, so the level-10 reward is not a dead end.
const QUESTS=require('./data/quests.json');

function choice(id,label,rest={}){return {id,label,description:rest.description||'',once:true,...rest};}
function clue(id,name,text){CLUES[id]={id,name,text};}
function installQuest(q){
  // Challenge drives DCs and enemy strength (src/xp.js): accuracy sets AC,
  // attacks and DCs; power sets health and damage. Renown and the chosen
  // difficulty tier of an AI adventure add to them.
  const {accuracy:A,power:L}=XP.challenge(q);
  const prefix=`q-${q.id}`;
  const evidence=`${q.id}-evidence`;
  clue(evidence,`${q.name}: established lead`,q.clue);
  const preparation=`prepared:${q.id}`;
  const approach=`approach:${q.id}`;
  const investigate={skill:q.investigate.skill,alternateSkills:q.investigate.alt,dc:11+Math.floor(A/2),tools:q.investigate.tools};
  const routeCheck={skill:q.route.skill,alternateSkills:q.route.alt,dc:12+Math.floor(A/2),tools:q.route.tools};
  STORY_NODES[`${prefix}-start`]={id:`${prefix}-start`,act:`Expedition • Level ${q.level}`,title:q.name,location:q.region,objective:q.brief,opening:q.opening,safeRest:true,questId:q.id,phase:'start',choices:[
    choice('investigate',q.investigate.label,{check:investigate,description:'Establish what is happening before committing. Failure still reveals a useful lead.',success:{text:q.investigate.success,clues:[evidence],setFlags:{[preparation]:true}},failure:{text:q.investigate.failure,clues:[evidence],setFlags:{[`partial:${q.id}`]:true}}}),
    choice('advance',q.route.label,{nextNode:`${prefix}-approach`,description:'Proceed toward the crisis. Preparation remains optional.'})
  ]};
  STORY_NODES[`${prefix}-approach`]={id:`${prefix}-approach`,act:`Expedition • Level ${q.level}`,title:'The approach',location:q.region,objective:q.route.label,opening:'The route ahead offers a careful approach or a direct crossing. Choose how to handle the obstacle; supplies and trained skills can change the risk.',safeRest:false,questId:q.id,phase:'approach',choices:[
    choice('careful',q.route.label,{check:routeCheck,description:`${q.route.tools?.length?'The listed equipment can grant advantage. ':''}A failed approach causes injury (and poison only where described), but does not block the story.`,success:{text:q.route.success,setFlags:{[approach]:true},nextNode:`${prefix}-crisis`},failure:{text:q.route.failure,partyDamage:q.id==='trial'?'0':`${1+Math.floor(L/5)}d4`,poison:q.route.poison,nextNode:`${prefix}-crisis`}}),
    choice('direct','Take the obvious route and keep the party together',{description:'No check. Arrive openly without an approach advantage.',result:{text:'The party arrives together by the direct route. You have surrendered surprise, not the opportunity to decide what happens next.',nextNode:`${prefix}-crisis`}})
  ]};
  STORY_NODES[`${prefix}-crisis`]={id:`${prefix}-crisis`,act:`Expedition • Level ${q.level}`,title:'The deciding moment',location:q.region,objective:q.objective.name,opening:q.crisis,safeRest:false,questId:q.id,phase:'crisis',choices:[
    choice('resolve',q.peaceful.label,{requires:{cluesAll:[evidence]},check:{skill:q.peaceful.skill,alternateSkills:q.peaceful.alt,dc:14+Math.floor(A/2)},description:'Try a complete noncombat resolution. Established preparation lowers the DC; failure starts the objective encounter.',success:{text:q.peaceful.success,setFlags:{[`method:${q.id}`]:'peace'},nextNode:`${prefix}-after`},failure:{text:q.peaceful.failure,combat:`quest:${q.id}`}}),
    choice('objective',`Protect the party while you ${q.objective.label.toLowerCase()}`,{description:q.objective.description,result:{text:'Your companions take their positions. The objective, its difficulty and its consequences are visible during the encounter.',combat:`quest:${q.id}`}}),
    choice('confront','Confront the threat directly',{description:'Start the same encounter without committing to a method. You may attack, pursue the objective, or retreat.',combat:`quest:${q.id}`})
  ]};
  STORY_NODES[`${prefix}-after`]={id:`${prefix}-after`,act:'Consequences',title:'What you leave behind',location:q.region,objective:'Choose what follows your intervention, then return to town.',opening:q.after,safeRest:true,questId:q.id,phase:'after',choices:q.decisions.map(d=>choice(d.id,d.label,{description:'This decision is permanent. The objective reward is the same for every approach.',result:{text:d.text,setFlags:{[d.flag]:true},completeQuest:q.id,reputation:d.rep,nextNode:`town-${q.nextTown||q.town}`}}))};
  const level=L;
  const type=q.enemyTheme;
  const f=XP.foeStats({accuracy:A,power:L});
  ENEMIES[q.foe]={id:q.foe,name:q.foeName,maxHp:f.main.maxHp,ac:f.main.ac,level,abilities:{str:14,dex:12,con:14,int:13,wis:13,cha:14},attack:{name:type==='wild'?'Briar Lash':type==='undead'?'Remembered Toll':'Ward Strike',bonus:f.main.attackBonus,damage:f.main.damage,damageType:type==='undead'?'necrotic':type==='storm'?'lightning':'slashing'},aiRole:level>=8?'boss':'leader',tags:type==='undead'?['undead']:[],resistances:type==='undead'?['slashing','piercing','bludgeoning']:[],xp:0};
  const minion=`${q.foe}-retainer`;
  ENEMIES[minion]={id:minion,name:type==='undead'?'Bound Record Keeper':type==='wild'?'Ashbound Reedling':'Bound Retainer',maxHp:f.retainer.maxHp,ac:f.retainer.ac,level,abilities:{str:12,dex:12,con:12,int:9,wis:11,cha:9},attack:{name:'Guarding Strike',bonus:f.retainer.attackBonus,damage:f.retainer.damage,damageType:'bludgeoning'},aiRole:'soldier',tags:type==='undead'?['undead']:[],xp:0};
  ENCOUNTERS[`quest:${q.id}`]={id:`quest:${q.id}`,name:q.name,enemies:[q.foe,minion,minion],storyScale:0.82,standardScale:1,grittyScale:1.18,xp:0,loot:[],intro:q.crisis,questId:q.id,objective:q.objective,victoryNode:`${prefix}-after`,defeatNode:'defeat'};
}
for(const q of Object.values(QUESTS))installQuest(q);
for(const town of Object.values(TOWNS))STORY_NODES[`town-${town.id}`]={id:`town-${town.id}`,act:'Downtime & preparation',title:town.name,location:town.subtitle,objective:'Recover, develop the party, choose an expedition and prepare for known threats.',opening:town.description,safeRest:true,townId:town.id,choices:[]};

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
module.exports={TOWNS,MERCHANTS,RECIPES,PERSONAL,QUESTS,UPGRADE_BASES,installQuest};
