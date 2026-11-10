"use strict";

// A custom d20 campaign progression, not the official 5e XP/spell progression.
// Later advancement tiers are data contracts, not pretend playable content.
const { CLASSES, COMPANIONS, ITEMS, SKILLS } = require('./content');
const { abilityModifier, proficiencyBonus, deepClone } = require('./rules');
const JOBS = require('./data/jobs.json').classes;
// Levels 1-100. Levels 1-10 keep the authored campaign's table; after that
// each level needs 250 XP more than the one before. Rewards are paid as a share
// of the current level's band (see src/xp.js), so the number of adventures per
// level stays about the same all the way up.
const MAX_LEVEL = 100;
const XP_NEXT = {1:300,2:1100,3:2300,4:3900,5:5900,6:8400,7:11400,8:14900,9:18900};
const levelBand = level => level < 10 ? XP_NEXT[level] - (XP_NEXT[level - 1] || 0) : 4000 + 250 * (level - 9);
for (let l = 10; l < MAX_LEVEL; l++) XP_NEXT[l] = XP_NEXT[l - 1] + levelBand(l);
// Growth past level 20 is deliberately gentle (bounded accuracy): proficiency
// stops at +6, AC, attack and DCs stop at their level-20 values, and health and
// damage keep growing slowly on both sides. Power past 20 comes from job skills.
const BOUNDED_LEVEL = 20;
const accuracyLevel = level => Math.min(BOUNDED_LEVEL, Math.max(1, Math.floor(Number(level) || 1)));
// Level used for enemy health and damage: full speed to 20, then a quarter.
const powerLevel = level => { const l = Math.max(1, Number(level) || 1); return l <= BOUNDED_LEVEL ? Math.floor(l) : BOUNDED_LEVEL + Math.floor((l - BOUNDED_LEVEL) / 4); };
// Player damage and healing growth past 20: +1 for every 10 levels.
const lateGrowth = level => Math.max(0, Math.floor(((Number(level) || 1) - BOUNDED_LEVEL) / 10));
const hitDiceMax = level => accuracyLevel(level);
// Endless progression after the final level: every RANK_XP earns a renown rank and one
// boon. Each boon has a stack cap so ranks never break the d20 maths; once every
// boon is full, ranks still record the legend. AI-directed adventures scale
// their enemies and DCs with renown up to RENOWN_POWER_CAP extra levels.
const RANK_XP = levelBand(MAX_LEVEL);
const RENOWN_POWER_CAP = 6;
const BOONS = Object.freeze({
  vigor:{id:'vigor',name:'Vigor',description:'+6 maximum HP.',cap:5},
  precision:{id:'precision',name:'Precision',description:'+1 to attack rolls.',cap:2},
  warding:{id:'warding',name:'Warding',description:'+1 Armor Class.',cap:1},
  resolve:{id:'resolve',name:'Resolve',description:'+1 to saving throws.',cap:2},
  might:{id:'might',name:'Might',description:'+1 damage on your attacks and spells.',cap:3},
  mending:{id:'mending',name:'Mending',description:'+2 to healing you give.',cap:3},
  purpose:{id:'purpose',name:'Purpose',description:'+1 to combat-objective checks.',cap:2}
});
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
  10:'Complete the Oath of the Road trial to learn your class mastery skill.',
  13:'A new class skill (passive).',
  16:'A new class skill.',
  20:'2nd job: choose one of three branches for your class and learn its first skill.',
  25:'A new 2nd job skill (passive).',
  30:'A new 2nd job skill and one more Advancement use.',
  35:'A new 2nd job skill (passive).'
};
const LATE_REWARD='More health, a little more damage and healing, and stronger enemies to match.';
const rewardText=level=>REWARDS[level]||(level===MAX_LEVEL?`The final level. ${LATE_REWARD} Renown ranks begin after this.`:level===40?`${LATE_REWARD} The 3rd job arrives in a later update.`:level===70?`${LATE_REWARD} The 4th job arrives in a later update.`:LATE_REWARD);
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
  {level:10,name:'Class mastery',status:'Playable',requirement:'Resolve the regional crisis, reach level 10, then complete the Oath of the Road trial to learn your class mastery skill.'},
  {level:20,name:'2nd job',status:'Playable',requirement:'Reach level 20 after the Oath of the Road trial, then choose one of three branches for your class.'},
  {level:40,name:'3rd job',status:'Coming in a later update',requirement:'Your branch\u2019s third job, unlocked by a trial.'},
  {level:70,name:'4th job',status:'Coming in a later update',requirement:'Your branch\u2019s final job; its last skill is learnt at level 100.'}
];
// The 2nd job's first skill: today's specializations for the original two
// branches, the level-20 job skill for the new third branch.
for(const [cls,def] of Object.entries(JOBS)){
  const list=SPECIALIZATIONS[cls]||(SPECIALIZATIONS[cls]=[]);
  for(const b of def.branches){
    if(list.some(x=>x.id===b.id))continue;
    const first=b.skills.find(x=>x.level===20);
    list.push({...first,id:b.id,name:b.name,description:`${first.name}: ${first.description}`,skillName:first.name});
  }
}
const SECOND_JOB_LEVEL=20;
const branchOf=player=>(JOBS[player.classId]?.branches||[]).find(b=>b.id===ensure(player).specialization)||null;
// Formulas in job skills scale with the hero's power level ({p}, {p/N}).
function jobFormula(formula,level){
  const p=powerLevel(level);
  return String(formula).replace(/\{p(?:\/(\d+))?\}/g,(_,n)=>String(n?Math.max(1,Math.floor(p/Number(n))):p));
}
// Every job skill the hero has learnt, in order. A hero who picked a
// specialization before it moved to level 20 keeps it.
function learntSkills(player){
  const job=JOBS[player.classId];if(!job)return [];
  const p=ensure(player),out=[];
  if(p.mastery&&player.level>=10)out.push({...job.mastery,source:'1st job'});
  for(const s of job.firstJob)if(player.level>=s.level)out.push({...s,source:'1st job'});
  const b=branchOf(player);
  if(b)for(const s of b.skills)if(s.level===SECOND_JOB_LEVEL||player.level>=s.level)out.push({...s,source:b.name});
  return out;
}
const passiveTotals=player=>learntSkills(player).filter(s=>s.passive).reduce((t,s)=>{for(const [k,v] of Object.entries(s.passive))t[k]=(t[k]||0)+v;return t;},{});
// Flat bonuses stack from talents, job passives and boons, so each total has
// a ceiling; real power comes from new skills, not +1s.
const BONUS_CAPS=Object.freeze({attack:4,ac:4,save:4});
function jobView(player){
  const job=JOBS[player.classId];if(!job)return null;
  const b=branchOf(player),p=ensure(player);
  const title=b?(player.level>=70?b.fourth:player.level>=40?b.third:b.name):CLASSES[player.classId]?.name;
  const describe=s=>({level:s.level,id:s.legacy||s.id,name:s.legacy?(SPECIALIZATIONS[player.classId]||[]).find(x=>x.id===s.legacy)?.description.split(':')[0]||b?.name:s.name,description:s.legacy?(SPECIALIZATIONS[player.classId]||[]).find(x=>x.id===s.legacy)?.description:s.description,passive:Boolean(s.passive)});
  const learnt=new Set(learntSkills(player).map(s=>s.id||s.legacy));
  const row=(s,source)=>({...describe(s),source,learnt:learnt.has(s.id||s.legacy)});
  const skills=[row(job.mastery,'1st job'),...job.firstJob.map(s=>row(s,'1st job')),...(b?b.skills.map(s=>row(s,b.name)):[])];
  // The whole tree, for the job screen: every branch with its skills, even
  // before one is chosen, and the 3rd and 4th jobs that follow each branch.
  const options=branchOptions(player);
  const branches=options.map(o=>({id:o.id,name:o.name,style:o.style,third:o.third,fourth:o.fourth,chosen:b?.id===o.id,closed:Boolean(b)&&b.id!==o.id,
    skills:o.skills.map((s,i)=>({...s,id:job.branches.find(x=>x.id===o.id).skills[i].id||o.id,learnt:b?.id===o.id&&(s.level===SECOND_JOB_LEVEL||player.level>=s.level)}))}));
  const next=skills.find(s=>!s.learnt&&!(s.level===10&&player.level>=10));
  const ahead=b?null:{level:SECOND_JOB_LEVEL,name:'Choose your 2nd job branch'};
  const nextSkill=(player.level<SECOND_JOB_LEVEL&&next)?next:(ahead||next||null);
  return {title,tier:b?(player.level>=70?4:player.level>=40?3:2):1,className:CLASSES[player.classId]?.name,branch:b?{id:b.id,name:b.name,third:b.third,fourth:b.fourth,style:b.style}:null,mastery:Boolean(p.mastery),
    skills,branches,nextSkill:nextSkill?{level:nextSkill.level,name:nextSkill.name}:null,
    tiers:[{tier:1,name:'1st job',levels:'1 to 19'},{tier:2,name:'2nd job',levels:'20 to 39'},{tier:3,name:'3rd job',levels:'40 to 69',later:true},{tier:4,name:'4th job',levels:'70 to 100',later:true}]};
}

function ensure(player){
  player.progression ||= { choices:{}, talents:[], specialization:null };
  player.progression.choices ||= {};
  player.progression.talents ||= [];
  player.progression.boons=normalizeBoons(player);
  return player.progression;
}
// Ranks come from XP, so they cannot be edited separately; chosen boons are
// clamped to each cap and to the number of ranks earned.
function renownRank(player){
  if((player.level||1)<MAX_LEVEL)return 0;
  return Math.max(0,Math.floor(((Number(player.xp)||0)-XP_NEXT[MAX_LEVEL-1])/RANK_XP));
}
function normalizeBoons(player){
  const raw=player.progression.boons&&typeof player.progression.boons==='object'?player.progression.boons:{};
  let left=renownRank(player);const out={};
  for(const b of Object.values(BOONS)){
    const n=Math.min(b.cap,left,Math.max(0,Math.floor(Number(raw[b.id])||0)));
    if(n){out[b.id]=n;left-=n;}
  }
  return out;
}
const boon=(player,id)=>player.progression?.boons?.[id]||0;
function pendingBoons(player){
  const p=ensure(player);
  const used=Object.values(p.boons).reduce((a,n)=>a+n,0);
  const open=Object.values(BOONS).some(b=>(p.boons[b.id]||0)<b.cap);
  return open?Math.max(0,renownRank(player)-used):0;
}
function chooseBoon(player,id){
  const b=BOONS[id];
  if(!b)return {ok:false,error:'Choose one of the offered boons.'};
  if(!pendingBoons(player))return {ok:false,error:'No renown boon is waiting. Earn the next renown rank first.'};
  const p=ensure(player);
  if((p.boons[id]||0)>=b.cap)return {ok:false,error:`${b.name} is already at its maximum of ${b.cap}.`};
  const before=maxHp(player);
  p.boons[id]=(p.boons[id]||0)+1;
  player.maxHp=maxHp(player);player.hp=Math.min(player.maxHp,player.hp+Math.max(0,player.maxHp-before));
  return {ok:true,name:b.name,description:b.description};
}
// Extra levels of challenge for AI-directed adventures at this renown.
const renownPower=player=>Math.min(RENOWN_POWER_CAP,Math.floor(renownRank(player)/2));
function renownView(player){
  const rank=renownRank(player),p=ensure(player);
  if((player.level||1)<MAX_LEVEL)return null;
  const into=Math.max(0,Number(player.xp)-XP_NEXT[MAX_LEVEL-1]-rank*RANK_XP);
  return {rank,rankXp:RANK_XP,xpIntoRank:into,xpToNext:RANK_XP-into,pending:pendingBoons(player),power:renownPower(player),
    boons:Object.values(BOONS).map(b=>({...b,stacks:p.boons[b.id]||0,available:(p.boons[b.id]||0)<b.cap}))};
}
function talents(player){return ensure(player).talents;}
function hasTalent(player,id){return talents(player).includes(id);}
function stats(player){
  const p=ensure(player),j=passiveTotals(player);
  const out={
    ac:(hasTalent(player,'bulwark')?1:0)+boon(player,'warding'),
    hp:(hasTalent(player,'bulwark')?4:0)+(hasTalent(player,'resilient')?4:0)+6*boon(player,'vigor'),
    attack:(hasTalent(player,'precise')?1:0)+boon(player,'precision'),
    save:(hasTalent(player,'resilient')?1:0)+boon(player,'resolve'),
    healing:(hasTalent(player,'medic')?3:0)+2*boon(player,'mending')+lateGrowth(player.level),
    damage:(p.choices['5']==='force'?2:0)+boon(player,'might')+lateGrowth(player.level),
    objective:(player.level>=9?2:0)+(p.choices['5']==='economy'?1:0)+boon(player,'purpose'),
    tool:player.level>=6?2:0
  };
  for(const k of ['ac','hp','attack','save','healing','damage','objective'])out[k]+=j[k]||0;
  for(const [k,cap] of Object.entries(BONUS_CAPS))out[k]=Math.min(cap,out[k]);
  return out;
}
function resources(classDef,level=1,player=null){
  const result={};level=accuracyLevel(level);
  for(const [id,def] of Object.entries(classDef.resources||{})){
    let max=Number(def.max||0);
    if(id==='spellSlots1') max+=Math.floor(level/2);
    if(id==='huntersMark') max+=Math.floor(level/3);
    if(id==='bardicInspiration') max+=Math.floor(level/4);
    result[id]={name:def.name,current:max,max,refresh:def.refresh||'long'};
  }
  if(level>=2){const max=2+(level>=5?1:0)+(level>=7?1:0)+(level>=9?1:0)+(player&&ensure(player).choices['5']==='economy'?1:0);result.technique={name:'Technique',current:max,max,refresh:'short'};}
  if(player&&ensure(player).specialization){const max=2+(player.level>=30?1:0);result.advancement={name:'Advancement',current:max,max,refresh:'long'};}
  return result;
}
function maxHp(player){
  const cls=CLASSES[player.classId]||CLASSES.fighter;
  const con=abilityModifier(player.abilities.con);
  const full=Math.min(player.level,BOUNDED_LEVEL),late=Math.max(0,player.level-BOUNDED_LEVEL);
  return cls.hitDie+con+(full-1)*Math.max(1,Math.floor(cls.hitDie/2)+1+con)+late*2+stats(player).hp;
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
  for(const s of learntSkills(player))if(s.kind==='job'&&s.level!==SECOND_JOB_LEVEL)result.push({...s,id:`job:${s.id}`,ability:cls.primaryAbility,source:s.source});
  return result;
}
function companionResources(id,level){
  level=accuracyLevel(level);
  if(id==='orin')return {secondWind:1+Math.floor(level/5)};
  if(id==='maren')return {healingWords:2+Math.floor(level/3),guidingBolt:1+Math.floor(level/5)};
  return {trickShot:1+Math.floor(level/4)};
}
// One resource policy for loading, level changes and both rest types.
// The save format keeps plain numeric remaining uses for compatibility.
function refreshCompanion(member, rest = 'none') {
  const caps = companionResources(member.id, member.level || 1);
  const previous = member.resources || {};
  member.resources = {};
  for (const [id, maximum] of Object.entries(caps)) {
    const current = previous[id];
    const refresh = rest === 'long' || (rest === 'short' && id === 'secondWind');
    member.resources[id] = refresh ? maximum : Number.isFinite(current)
      ? Math.min(maximum, Math.max(0, Math.floor(current))) : 0;
  }
  return member.resources;
}
function levelCompanion(member,level){
  const base=COMPANIONS[member.id];
  const oldMax=member.maxHp;
  const oldLevel=member.level||1;
  member.level=level;
  member.maxHp=base.maxHp+(Math.min(level,BOUNDED_LEVEL)-1)*(member.id==='orin'?7:6)+Math.max(0,level-BOUNDED_LEVEL)*2;
  member.hp=Math.min(member.maxHp,member.hp+Math.max(0,member.maxHp-oldMax));
  member.baseMaxHp=member.maxHp;
  refreshCompanion(member, level > oldLevel ? 'long' : 'none');
}
const capital=t=>t.charAt(0).toUpperCase()+t.slice(1);
function branchOptions(player){
  return (JOBS[player.classId]?.branches||[]).map(b=>{const spec=(SPECIALIZATIONS[player.classId]||[]).find(x=>x.id===b.id);
    return {...spec,id:b.id,name:b.name,style:b.style,third:b.third,fourth:b.fourth,description:`${b.style} ${spec.description}`,
      skills:b.skills.map(s=>s.legacy?{level:s.level,name:spec.description.split(':')[0],description:capital(spec.description.split(': ').slice(1).join(': '))}:{level:s.level,name:s.name,description:s.description,passive:Boolean(s.passive)})};});
}
function view(player,world){
  const p=ensure(player);
  const previous=player.level===1?0:XP_NEXT[player.level-1];
  const next=XP_NEXT[player.level]||null;
  return {
    maxLevel:MAX_LEVEL,previousXp:previous,nextXp:next,bankedXp:0,
    nextReward:next?rewardText(player.level+1):`Renown rank ${renownRank(player)+1}: one more boon. Every ${RANK_XP} XP after level ${MAX_LEVEL} earns a rank.`,
    renown:renownView(player),
    pending:[3,4,5,6,8].filter(l=>player.level>=l&&!p.choices[l]).map(level=>({level,description:REWARDS[level],options:options(player,level)})),
    rewards:[...Object.entries(REWARDS).map(([level,description])=>({level:Number(level),description,reached:player.level>=Number(level),choice:p.choices[level]||null})),
      {level:11,through:MAX_LEVEL,description:`Levels 11 to ${MAX_LEVEL}: ${LATE_REWARD}`,reached:player.level>=11,choice:null}],
    techniques:classActions(player),talents:p.talents.map(id=>TALENTS[id]),
    specialization:p.specialization,advancements:ADVANCEMENTS,
    specializationOptions:player.level>=SECOND_JOB_LEVEL&&world?.completed?.trial&&!p.specialization?branchOptions(player):[],
    job:jobView(player),
    trialComplete:Boolean(world?.completed?.trial)
  };
}
module.exports={JOBS,SECOND_JOB_LEVEL,BONUS_CAPS,passiveTotals,jobFormula,learntSkills,jobView,branchOptions,MAX_LEVEL,XP_NEXT,BOUNDED_LEVEL,levelBand,accuracyLevel,powerLevel,lateGrowth,hitDiceMax,rewardText,RANK_XP,RENOWN_POWER_CAP,BOONS,renownRank,renownPower,pendingBoons,chooseBoon,renownView,REWARDS,TALENTS,REFINEMENTS,TECHNIQUES,SPECIALIZATIONS,ADVANCEMENTS,ensure,stats,resources,maxHp,options,applyChoice,classActions,companionResources,levelCompanion,refreshCompanion,view};
