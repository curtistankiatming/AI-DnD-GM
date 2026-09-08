"use strict";

// A custom d20 campaign progression, not the official 5e XP/spell progression.
// Later advancement tiers are data contracts, not pretend playable content.
const { CLASSES, COMPANIONS, ITEMS, SKILLS } = require('./content');
const { abilityModifier, proficiencyBonus, deepClone } = require('./rules');
const MAX_LEVEL = 10;
const XP_NEXT = {1:300,2:1100,3:2300,4:3900,5:5900,6:8400,7:11400,8:14900,9:18900};
const REWARDS = {
  1:'Your base class, signature actions, starting gear and exploration skills.',
  2:'A new class technique and 2 Technique uses per short rest.',
  3:'Choose a talent: accuracy, protection or field expertise.',
  4:'Choose +2 to an ability score (maximum 20), immediately improving its modifier.',
  5:'A signature refinement choice; stronger class attacks and 3 Technique uses.',
  6:'Fieldcraft training: choose a skill and gain +2 with expedition tools.',
  7:'Party combinations, unlocked by companion personal quests; 4 Technique uses.',
  8:'Choose a second talent or improve an ability.',
  9:'Mastered technique: +2 on objective checks and one more Technique use.',
  10:'Complete the advancement trial and select a defining specialization.'
};
const TALENTS = {
  precise:{id:'precise',name:'Measured Strikes',description:'+1 weapon and spell attack bonus. Does not increase save DCs.'},
  bulwark:{id:'bulwark',name:'Stalwart',description:'+1 AC and 4 maximum HP. Works with any armor.'},
  explorer:{id:'explorer',name:'Field Expert',description:'+2 Investigation, Survival and Perception. Helps story and objective checks.'},
  resilient:{id:'resilient',name:'Steady Nerves',description:'+1 to all saving throws and 4 maximum HP.'},
  medic:{id:'medic',name:'Practical Medic',description:'+3 to healing you perform with spells, techniques and consumables.'}
};
const REFINEMENTS = {
  force:{id:'force',name:'Force',description:'+2 damage to successful attacks and damage spells.'},
  control:{id:'control',name:'Control',description:'Your new class technique also leaves its enemy target Exposed: the next attack against it has advantage.'},
  economy:{id:'economy',name:'Endurance',description:'+1 Technique use per short rest, and +1 to objective checks.'}
};
const TECHNIQUES = {
  fighter:{id:'intercept',name:'Interception Stance',kind:'intercept',cost:'bonus',target:'ally',description:'Until your next turn, reduce the next damaging enemy hit on this ally by 4 + half your level. Once triggered, counterstrike for your proficiency bonus.'},
  rogue:{id:'dirty-trick',name:'Dirty Trick',kind:'weaponControl',cost:'action',target:'enemy',description:'Make a weapon attack; on a hit, the enemy has disadvantage on its next attack. Sneak Attack still applies.'},
  wizard:{id:'arcane-snare',name:'Arcane Snare',kind:'snare',cost:'action',target:'enemy',ability:'int',description:'Intelligence spell attack for 2d6 force damage (3d6 at level 5). On hit, the target loses its next action; a target can only be snared once per combat.'},
  cleric:{id:'sanctuary',name:'Sanctuary',kind:'sanctuary',cost:'bonus',target:'ally',description:'Heal 1d6 + Wisdom + half your level and grant +2 AC until your next turn.'},
  ranger:{id:'pinning-shot',name:'Pinning Shot',kind:'weaponControl',cost:'action',target:'enemy',description:'Make a weapon attack; on hit, pin the target, imposing disadvantage on its next attack. Hunter’s Mark applies.'},
  bard:{id:'rallying-verse',name:'Rallying Verse',kind:'rally',cost:'action',target:'none',description:'Every conscious party member gains 3 + your Charisma modifier temporary HP, and the next party attack gains advantage.'}
};
const SPECIALIZATIONS = {
  fighter:[
    {id:'guardian',name:'Guardian',kind:'bastion',cost:'bonus',target:'none',description:'Aegis Line: all allies gain 8 temporary HP and an interception ward for one round. Two uses per long rest.'},
    {id:'duelist',name:'Duelist',kind:'precisionBurst',cost:'action',target:'enemy',description:'Measured Assault: make two weapon attacks against one target with advantage. Two uses per long rest.'}
  ],
  rogue:[
    {id:'shadow',name:'Shadow Agent',kind:'shadow',cost:'bonus',target:'self',description:'Vanish: gain Hidden and 8 temporary HP; your next weapon hit deals 2d6 extra damage. Two uses per long rest.'},
    {id:'saboteur',name:'Saboteur',kind:'sabotage',cost:'action',target:'enemy',description:'Disable: deal 3d6 force damage and stun an enemy for one action; or make two points of objective progress without a roll. Two uses per long rest.'}
  ],
  wizard:[
    {id:'evoker',name:'Evoker',kind:'nova',cost:'action',target:'none',description:'Focused Nova: all enemies make Dexterity saves against 4d6 fire damage, half on a save. Two uses per long rest.'},
    {id:'chronist',name:'Chronist',kind:'timeWard',cost:'bonus',target:'ally',description:'Borrowed Moment: restore 10 HP, grant +2 AC for one round, and recover one Technique use. Two uses per long rest.'}
  ],
  cleric:[
    {id:'lifewarden',name:'Lifewarden',kind:'massHeal',cost:'action',target:'none',description:'Circle of Renewal: heal all party members for 2d6 + Wisdom, reviving unconscious allies and curing poison. Two uses per long rest.'},
    {id:'exorcist',name:'Exorcist',kind:'banish',cost:'action',target:'enemy',description:'Sever the Binding: automatic 4d6 radiant damage (6d6 against undead) and remove all resistances from the target. Two uses per long rest.'}
  ],
  ranger:[
    {id:'beastwarden',name:'Wild Warden',kind:'pack',cost:'bonus',target:'none',description:'Pack Instinct: all allies gain advantage on their next attack and 6 temporary HP. Two uses per long rest.'},
    {id:'deadeye',name:'Deadeye',kind:'precisionBurst',cost:'action',target:'enemy',description:'Twin Arrows: make two weapon attacks with advantage against one target; Hunter’s Mark applies. Two uses per long rest.'}
  ],
  bard:[
    {id:'lorekeeper',name:'Lorekeeper',kind:'sabotage',cost:'action',target:'enemy',description:'Unravel: automatic 3d6 psychic damage and stun one action; or advance an objective twice without a roll. Two uses per long rest.'},
    {id:'battlecantor',name:'Battle Cantor',kind:'massHeal',cost:'action',target:'none',description:'Defiant Chorus: heal all party members for 2d6 + Charisma, reviving unconscious allies and curing poison. Two uses per long rest.'}
  ]
};
const ADVANCEMENTS = [
  {level:10,name:'First advancement',status:'Playable',requirement:'Resolve the regional crisis, reach level 10, then complete the Oath of the Road trial.'},
  {level:30,name:'Second advancement',status:'Future expansion',requirement:'Advanced path: new resource interactions and combinations. No level-30 campaign ships in V4.'},
  {level:70,name:'Third advancement',status:'Future expansion',requirement:'Legendary identity: faction-scale consequences and party leadership. No level-70 campaign ships in V4.'}
];
function ensure(player){
  player.progression ||= { choices:{}, talents:[], specialization:null };
  player.progression.choices ||= {};
  player.progression.talents ||= [];
  return player.progression;
}
function talents(player){return ensure(player).talents;}
function hasTalent(player,id){return talents(player).includes(id);}
function stats(player){
  const p=ensure(player);
  return {
    ac:hasTalent(player,'bulwark')?1:0,
    hp:(hasTalent(player,'bulwark')?4:0)+(hasTalent(player,'resilient')?4:0),
    attack:hasTalent(player,'precise')?1:0,
    save:hasTalent(player,'resilient')?1:0,
    healing:hasTalent(player,'medic')?3:0,
    damage:p.choices['5']==='force'?2:0,
    objective:(player.level>=9?2:0)+(p.choices['5']==='economy'?1:0),
    tool:player.level>=6?2:0
  };
}
function resources(classDef,level=1,player=null){
  const result={};
  for(const [id,def] of Object.entries(classDef.resources||{})){
    let max=Number(def.max||0);
    if(id==='spellSlots1') max+=Math.floor(level/2);
    if(id==='huntersMark') max+=Math.floor(level/3);
    if(id==='bardicInspiration') max+=Math.floor(level/4);
    result[id]={name:def.name,current:max,max,refresh:def.refresh||'long'};
  }
  if(level>=2){const max=2+Math.floor((level-2)/3)+(level>=9?1:0)+(player&&ensure(player).choices['5']==='economy'?1:0);result.technique={name:'Technique',current:max,max,refresh:'short'};}
  if(player&&ensure(player).specialization) result.advancement={name:'Advancement',current:2,max:2,refresh:'long'};
  return result;
}
function maxHp(player){
  const cls=CLASSES[player.classId]||CLASSES.fighter;
  const con=abilityModifier(player.abilities.con);
  return cls.hitDie+con+(player.level-1)*Math.max(1,Math.floor(cls.hitDie/2)+1+con)+stats(player).hp;
}
function abilityOptions(player){
  return ['str','dex','con','int','wis','cha'].filter(id=>player.abilities[id]<20).map(id=>{
    const before=player.abilities[id],after=Math.min(20,before+2);
    const bonusBefore=abilityModifier(before),bonusAfter=abilityModifier(after);
    return {id:`ability:${id}`,name:`+${after-before} ${id.toUpperCase()}`,description:`${id.toUpperCase()} ${before} → ${after}; modifier ${bonusBefore>=0?'+':''}${bonusBefore} → ${bonusAfter>=0?'+':''}${bonusAfter}.${id==='con'?` Also gain ${(bonusAfter-bonusBefore)*player.level} maximum HP, including earlier levels.`:' Related skills and attacks update immediately.'}`};
  });
}
function options(player,level){
  if(level===3||level===8){
    const opts=Object.values(TALENTS).filter(x=>!hasTalent(player,x.id)).map(x=>({...x}));
    return level===8?[...opts,...abilityOptions(player)]:opts;
  }
  if(level===4) return abilityOptions(player);
  if(level===5) return Object.values(REFINEMENTS).map(r=>{
    if(r.id!=='control')return {...r};
    const descriptions={fighter:'Your Interception Stance exposes the attacker when it counterstrikes: the next attack against that enemy has advantage.',cleric:'Sanctuary also gives its recipient advantage on their next attack.',bard:'Rallying Verse gives every conscious ally advantage on their next attack, instead of only one shared advantage.'};
    return {...r,description:descriptions[player.classId]||r.description};
  });
  if(level===6) return Object.values(SKILLS).map(s=>({id:`skill:${s.id}`,name:s.name,description:player.skills.includes(s.id)?`Train expertise in ${s.name} (double proficiency).`:`Become proficient in ${s.name}.`})).filter(x=>!player.expertise.includes(x.id.slice(6)));
  return [];
}
function applyChoice(player,level,id){
  const p=ensure(player);
  level=Number(level);
  if(![3,4,5,6,8].includes(level)||player.level<level||p.choices[level]) return {ok:false,error:'That level reward is not pending.'};
  const opt=options(player,level).find(o=>o.id===id);
  if(!opt)return {ok:false,error:'Choose one of the offered rewards.'};
  const before=maxHp(player);
  if(id.startsWith('ability:')) player.abilities[id.slice(8)]=Math.min(20,player.abilities[id.slice(8)]+2);
  else if(id.startsWith('skill:')){const skill=id.slice(6);if(player.skills.includes(skill))player.expertise.push(skill);else player.skills.push(skill);}
  else if(TALENTS[id])p.talents.push(id);
  p.choices[level]=id;
  player.maxHp=maxHp(player);player.hp=Math.min(player.maxHp,player.hp+Math.max(0,player.maxHp-before));
  return {ok:true,name:opt.name};
}
function classActions(player){
  const cls=CLASSES[player.classId];
  const result=deepClone(cls.actions||[]);
  if(player.level>=5) for(const a of result){
    if(a.id==='fire-bolt'){a.damage='2d10';a.description='Ranged spell attack: 2d10 fire damage. Free cantrip; improved at level 5.';}
    if(a.id==='sacred-flame'){a.damage='2d8';a.description='Dexterity save against 2d8 radiant damage. Free cantrip; improved at level 5.';}
    if(a.id==='vicious-mockery'){a.damage='2d6';a.description='Wisdom save against 2d6 psychic damage and disadvantage on the next attack. Free cantrip; improved at level 5.';}
    if(a.id==='healing-word'){a.formula='2d4+mod';a.description='Bonus action: heal 2d4 + casting modifier. Costs one spell slot.';}
    if(a.id==='magic-missile'){a.damage='4d4+4';a.description='Automatically hit for 4d4 + 4 force damage; one spell slot.';}
    if(a.id==='sleep'){a.formula='9d8';a.description='Sleep: roll 9d8 HP pool; affects weakest non-undead first. One spell slot.';}
    if(a.id==='field-dressing'){a.formula='2d6+level';a.description='Action: heal 2d6 + level HP. Once per combat.';}
  }
  if(player.level>=2)result.push({...TECHNIQUES[player.classId],resource:'technique',minLevel:2});
  const spec=(SPECIALIZATIONS[player.classId]||[]).find(s=>s.id===ensure(player).specialization);
  if(spec) result.push({...spec,id:`spec:${spec.id}`,resource:'advancement',ability:cls.primaryAbility});
  return result;
}
function companionResources(id,level){
  if(id==='orin')return {secondWind:1+Math.floor(level/5)};
  if(id==='maren')return {healingWords:2+Math.floor(level/3),guidingBolt:1+Math.floor(level/5)};
  return {trickShot:1+Math.floor(level/4)};
}
function levelCompanion(member,level){
  const base=COMPANIONS[member.id];
  const oldMax=member.maxHp;
  const oldLevel=member.level||1;
  member.level=level;
  member.maxHp=base.maxHp+(level-1)*(member.id==='orin'?7:6);
  member.hp=Math.min(member.maxHp,member.hp+Math.max(0,member.maxHp-oldMax));
  member.baseMaxHp=member.maxHp;
  if(level>oldLevel)member.resources=companionResources(member.id,level);
}
function view(player,world){
  const p=ensure(player);
  const previous=player.level===1?0:XP_NEXT[player.level-1];
  const next=XP_NEXT[player.level]||null;
  return {
    maxLevel:MAX_LEVEL,previousXp:previous,nextXp:next,bankedXp:next?0:Math.max(0,player.xp-XP_NEXT[9]),
    nextReward:next?REWARDS[player.level+1]:'Available level cap reached. Continue the trial, party quests, shops, and practice arena; later chapters are not included.',
    pending:[3,4,5,6,8].filter(l=>player.level>=l&&!p.choices[l]).map(level=>({level,description:REWARDS[level],options:options(player,level)})),
    rewards:Object.entries(REWARDS).map(([level,description])=>({level:Number(level),description,reached:player.level>=Number(level),choice:p.choices[level]||null})),
    techniques:classActions(player),talents:p.talents.map(id=>TALENTS[id]),
    specialization:p.specialization,advancements:ADVANCEMENTS,
    specializationOptions:player.level>=10&&world?.completed?.trial&&!p.specialization?SPECIALIZATIONS[player.classId]:[],
    trialComplete:Boolean(world?.completed?.trial)
  };
}
module.exports={MAX_LEVEL,XP_NEXT,REWARDS,TALENTS,REFINEMENTS,TECHNIQUES,SPECIALIZATIONS,ADVANCEMENTS,ensure,stats,resources,maxHp,options,applyChoice,classActions,companionResources,levelCompanion,view};
