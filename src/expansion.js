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
ITEMS['thornward-cloak'].purpose='Equip for +1 AC.';
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
  item.value=base.value+50;
  // A Fine item is at least Uncommon and never rarer-looking than its base: Fine Field Plate stays Rare.
  const R=['Common','Uncommon','Rare','Epic','Legendary'];item.rarity=R[Math.max(1,R.indexOf(base.rarity))];
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
// Gold sink (items review, 21 November 2026): the smith can also refine each
// of these once. An Epic or Legendary item becomes a Masterwork one step rarer,
// for twice the item's price (Gear.upgradeCost), so late gold has a use.
// The refined copy is never in a shop or given as a reward, so it drops its exclusive tag.
{
  const R=['Common','Uncommon','Rare','Epic','Legendary'];
  for(const base of require('./data/gear.json')){
    // Uncommon and Rare special items have no upgrade: a cheap refine of early
    // gear would outclass the next towns' items.
    if(!base.slot||['Uncommon','Rare'].includes(base.rarity))continue;
    const master=R.indexOf(base.rarity)>=3;
    const item=deepClone(base);delete item.exclusive;
    Object.assign(item,{id:`${base.id}-fine`,name:`${master?'Masterwork':'Fine'} ${base.name}`,baseId:base.id,upgradeTier:1,masterwork:master||undefined,
      rarity:R[Math.min(R.length-1,Math.max(1,R.indexOf(base.rarity)+(master?1:0)))],value:master?base.value*3:base.value+50});
    if(!master)delete item.masterwork;
    let effect;
    // A Common item gets the usual Fine +1 to hit and damage; a Masterwork refine adds one number only.
    if(item.weapon&&!master){item.attackBonus=(item.attackBonus||0)+1;item.damageBonus=(item.damageBonus||0)+1;effect='+1 to hit and damage.';}
    else if(item.weapon){item.damageBonus=(item.damageBonus||0)+1;effect='+1 damage.';}
    else if(item.armor){item.armor={...item.armor,base:item.armor.base+1};effect='+1 base AC.';}
    else if(item.category==='shield'){item.acBonus=(item.acBonus||0)+1;effect='+1 AC.';}
    else if(item.category==='focus'){item.spellDcBonus=(item.spellDcBonus||0)+1;effect='+1 spell save DC.';}
    else{item.stats={...(item.stats||{}),dealt:Math.round(((item.stats?.dealt||0)+0.05)*100)/100};effect='5% more damage dealt.';}
    item.purpose=`${base.purpose} ${master?'Masterwork':'Fine'} quality: ${effect} This is the maximum forge tier in this campaign.`;
    ITEMS[item.id]=item;
  }
}
const TOWNS=require('./data/towns.json');
const MERCHANTS=require('./data/merchants.json');
const RECIPES=require('./data/recipes.json');
const PERSONAL=require('./data/personal.json');

// Each expedition has its own evidence, approaches, moral stakes and aftermath.
// Numerical rewards are objective-based: social and combat solutions pay the same XP.
// "aftermath" is the post-advancement mission, so the level-10 reward is not a dead end.
const QUESTS=require('./data/quests.json');
// Later stretches of the story are written in folders of their own, each with
// quests.json, scenes.json and side-jobs.json, and merged here after the main
// tables in story order: Book Three, Part Two (chapters 11 to 20), then Book
// Four. They are merged into the same objects, so anything that reads the JSON
// tables after this module sees one set. "_" keys are notes. Each require is
// written out in full so the browser build (scripts/build-public.js) bundles it.
const LATER=[
  {quests:require('./data/book-three-part-two/quests.json'),scenes:require('./data/book-three-part-two/scenes.json'),jobs:require('./data/book-three-part-two/side-jobs.json')},
  {quests:require('./data/book-four/quests.json'),scenes:require('./data/book-four/scenes.json'),jobs:require('./data/book-four/side-jobs.json')}
];
function mergeTable(into,from,what){for(const [id,v]of Object.entries(from)){if(id.startsWith('_'))continue;if(Object.prototype.hasOwnProperty.call(into,id))throw new Error(`${what} ${id} is written twice`);into[id]=v;}return into;}
const mergeLater=(into,key,what)=>{for(const dir of LATER)mergeTable(into,dir[key],what);return into;};
mergeLater(QUESTS,'quests','Chapter');
// Books One and Two pay a share of each chapter's level (src/xp.js
// CHAPTER_SHARE), so side content matters there. A chapter written to pay
// nothing (the trial, an aftermath) still pays nothing. Book Three on keeps
// one level per chapter, so it ends at the 3rd job at level 40.
for(const q of Object.values(QUESTS))if(Number(q.xp)>0&&!q.sideJob&&(Number(q.book)||1)<=2)q.xp=XP.chapterXp(q.level);

// Written lines: {"say": companion id or name, "text"} or {"narrate"}, with an
// optional "when" that the engine checks as the line is told (see liveLines in
// src/engine.js). Lines spoken by a companion who is not in the party are
// skipped there too.
// A line may also be a group, {"oneOf": [lines]}: the first line in it that
// applies is told, and no other (an optional "when" on the group is checked
// first). A line's "setFlag" (a flag name, or {flag: value}) is set when the
// line is told (playLines), so later lines can read it; a group's setFlag is
// set when any line in it is told.
// Never gate a line on the negation of its own setFlag (notFlag or noneFlag on
// the flag it sets): once playLines has set it, the engine's view and the
// narrator run liveLines over the same lines again, and the line would vanish
// from what they show.
const speakerName=id=>{const c=C.COMPANIONS[id];return c?c.name.replace(/^Sister /,'').split(' ')[0]:String(id);};
const storyLine=l=>l.oneOf?{oneOf:l.oneOf.map(storyLine),...(l.when?{when:l.when}:{}),...(l.setFlag?{setFlag:l.setFlag}:{})}:({...(l.narrate?{narration:l.narrate}:{speaker:speakerName(l.say),speakerId:C.COMPANIONS[l.say]?l.say:null,text:l.text}),...(l.when?{when:l.when}:{}),...(l.setFlag?{setFlag:l.setFlag}:{})});
// The written text keeps every line, every alternative of a group included.
const everyLine=lines=>lines.flatMap(l=>l.oneOf?everyLine(l.oneOf):[l]);
function dialogueText(lines){return everyLine(lines).map(l=>l.narration||`${l.speaker}: ${l.text}`).join('\n');}
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
  // roller / notRoller are settled when a check's result is told (outcomeForRoller);
  // anywhere else the hero is the one acting.
  if (w.roller !== undefined && w.roller !== 'hero') return false;
  if (w.notRoller === 'hero') return false;
  return true;
}
// Who rolled a check (21 November 2026): the best-suited party member may
// roll for the hero, so a check's written result can name them. In a check's
// success or failure text, "{You}", "{you}", "{your}" and "{Your}" become the
// roller ("You", or "Orin", "Orin's"); "{they}", "{them}", "{their}" (and
// capitalised) their pronouns ("you" for the hero); and "{a|b}" picks a for the
// hero and b for a companion, where "@" in b is the companion's name. A line's
// "when" may also hold roller ("hero", "companion" or a companion id) or
// notRoller; these are settled here, when the result is told, so they never
// need the roll again later.
const PRONOUNS={he:['he','him','his'],she:['she','her','her'],they:['they','them','their']};
function rollerWords(actor){
  if(!actor||actor.id==='player')return {name:'you',possessive:'your',p:['you','you','your'],hero:true};
  const c=C.COMPANIONS[actor.id],name=speakerName(actor.id),key=String(c?.pronouns||'they').split('/')[0];
  return {name,possessive:`${name}'s`,p:PRONOUNS[key]||PRONOUNS.they,hero:false};
}
const cap=t=>t?t[0].toUpperCase()+t.slice(1):t;
function forRoller(text,actor){
  if(typeof text!=='string'||!text.includes('{'))return text;
  const w=rollerWords(actor),who=w.hero?'you':w.name;
  const map={You:cap(who),you:who,your:w.hero?'your':w.possessive,Your:w.hero?'Your':w.possessive,they:w.p[0],They:cap(w.p[0]),them:w.p[1],Them:cap(w.p[1]),their:w.p[2],Their:cap(w.p[2])};
  return text.replace(/\{([^{}|]*)\|([^{}]*)\}/g,(m,a,b)=>w.hero?a:b.replace(/@/g,w.name)).replace(/\{(You|you|your|Your|they|They|them|Them|their|Their)\}/g,(m,k)=>map[k]);
}
function rollerFits(w,actor){
  const id=actor?.id||'player',is=v=>v==='hero'?id==='player':v==='companion'?id!=='player':id===v;
  if(w.roller!==undefined&&!is(w.roller))return false;
  if(w.notRoller!==undefined&&is(w.notRoller))return false;
  return true;
}
// A check's outcome as told for whoever rolled it.
function outcomeForRoller(outcome,actor){
  if(!outcome)return outcome;
  const out={...outcome};
  if(Array.isArray(outcome.dialogue)){
    // Lines inside a oneOf are told for the roller too (step 9).
    const tell=lines=>lines.filter(l=>!l.when||rollerFits(l.when,actor)).map(l=>{
      const {roller,notRoller,...rest}=l.when||{};const line={...l,...(l.narration!==undefined?{narration:forRoller(l.narration,actor)}:{}),...(l.text!==undefined?{text:forRoller(l.text,actor)}:{}),...(Array.isArray(l.oneOf)?{oneOf:tell(l.oneOf)}:{})};
      if(l.when){if(Object.keys(rest).length)line.when=rest;else delete line.when;}
      return line;});
    out.dialogue=tell(outcome.dialogue);
    if(outcome.text!==undefined)out.text=dialogueText(out.dialogue);
  }else if(typeof outcome.text==='string')out.text=forRoller(outcome.text,actor);
  return out;
}
// The line a written line or group tells now, or null.
function pickLine(state, line) {
  if (!line.oneOf) return lineApplies(state, line) ? line : null;
  if (line.when && !lineApplies(state, { when: line.when })) return null;
  for (const alt of line.oneOf) { const picked = pickLine(state, alt); if (picked) return picked; }
  return null;
}
const lineFlags = (set) => typeof set === 'string' ? { [set]: true } : set && typeof set === 'object' ? set : {};
// Lines are read in order, so a line's setFlag counts for the lines after it.
// liveLines only looks (on a copy of the flags); playLines, used where the
// lines are told, sets them on the save.
function liveLines(state, lines, play = false) {
  if (!Array.isArray(lines)) return lines;
  const flags = play ? (state.story.flags ||= {}) : { ...(state.story.flags || {}) };
  const seen = play ? state : { ...state, story: { ...state.story, flags } };
  const out = [];
  for (const line of lines) {
    const picked = pickLine(seen, line);
    if (!picked) continue;
    const { when, setFlag, ...told } = picked;
    for (const set of [line.oneOf && line.setFlag, setFlag]) if (set) Object.assign(flags, lineFlags(set));
    out.push(told);
  }
  return out;
}
const playLines = (state, lines) => liveLines(state, lines, true);
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
  // hero: true on a check means the hero always rolls it (their own trial, their own oath).
  const own=c=>c.hero?{hero:true}:{};
  const investigate={skill:q.investigate.skill,alternateSkills:q.investigate.alt,dc:11+D,tools:q.investigate.tools,...own(q.investigate)};
  const routeCheck={skill:q.route.skill,alternateSkills:q.route.alt,dc:12+D,tools:q.route.tools,...own(q.route)};
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
  // A peaceful way may be easier after an earlier choice ("easierWith": a
  // story flag and the reason shown): the DC drops by 2 while it is set.
  // "harderWith" is the same, and raises the DC by 2.
  STORY_NODES[`${prefix}-crisis`]={id:`${prefix}-crisis`,act:`Expedition • Level ${q.level}`,title:'The deciding moment',location:q.region,objective:q.objective.name,...toldOpening(q.crisis),safeRest:false,questId:q.id,phase:'crisis',choices:[
    choice('resolve',q.peaceful.label,{...(q.peaceful.labelNoLead?{labelNoLead:q.peaceful.labelNoLead}:{}),check:{skill:q.peaceful.skill,alternateSkills:q.peaceful.alt,dc:14+D,lead:evidence,...own(q.peaceful),...(q.peaceful.easierWith?{easierWith:q.peaceful.easierWith}:{}),...(q.peaceful.harderWith?{harderWith:q.peaceful.harderWith}:{})},description:'Try a complete noncombat resolution. Established preparation lowers the DC; without any lead it is harder; failure starts the objective encounter.',success:{...told(q.peaceful.success),setFlags:{[`method:${q.id}`]:'peace'},nextNode:`${prefix}-after`},failure:{...told(q.peaceful.failure),combat:`quest:${q.id}`}}),
    // Extra written resolutions for this crisis ("crisisChoices"): lines, flags
    // and approval, then on to the chapter's ending, like a peaceful success.
    ...(q.crisisChoices||[]).map(c=>choice(c.id,c.label,{description:c.description||'',...(c.requires?{requires:c.requires}:{}),result:{lines:c.lines,setFlags:{[`method:${q.id}`]:'peace',...(c.setFlags||{})},...(c.approval?{approval:c.approval}:{}),nextNode:`${prefix}-after`}})),
    choice('objective',`Protect the party while you ${q.objective.label.toLowerCase()}`,{description:q.objective.description,result:{text:'Your companions take their positions. The objective, its difficulty and its consequences are visible during the encounter.',combat:`quest:${q.id}`}}),
    choice('confront','Confront the threat directly',{description:'Start the same encounter without committing to a method. You may attack, pursue the objective, or retreat.',combat:`quest:${q.id}`})
  ]};
  STORY_NODES[`${prefix}-after`]={id:`${prefix}-after`,act:'Consequences',title:'What you leave behind',location:q.region,objective:q.continues?'Choose what follows your intervention, then go on.':'Choose what follows your intervention, then return to town.',...toldOpening(q.after),safeRest:true,questId:q.id,phase:'after',choices:q.decisions.map(d=>choice(d.id,d.label,{description:d.description||'This decision is permanent. The objective reward is the same for every approach.',...(d.requires?{requires:d.requires}:{}),result:{...told(d.text),setFlags:{[d.flag]:true,...(d.setFlags||{})},completeQuest:q.id,reputation:d.rep,...(d.flagsIf?{flagsIf:d.flagsIf}:{}),...(d.gold?{gold:d.gold}:{}),...(d.approval?{approval:d.approval}:{}),...(q.continues?{goOn:q.id}:{}),nextNode:`town-${q.nextTown||q.town}`}}))};
  // A straight-on chapter ("continues": true, Book Three's stair) goes from
  // its decision to the next chapter's opening (src/world.js goOn), and its
  // end is the safe ledge a defeat in the next chapter wakes on: "ledge" is
  // what is told there, and its one choice rests and goes back down.
  if(q.continues)STORY_NODES[`${prefix}-ledge`]={id:`${prefix}-ledge`,act:'The last ledge',title:q.ledgeTitle||'The last ledge',location:q.region,objective:`${q.ledgeLabel||'Rest, then go back down'}.`,lines:q.ledge||[{narrate:'You wake where the last part of the way ended, with the dark below you.'}],safeRest:true,sideStory:true,ledge:q.id,
    choices:[choice('down',q.ledgeLabel||'Rest, then go back down',{once:false,description:'A long rest on the ledge, then back to the encounter that beat you. Nothing earlier is undone.',result:{backDown:true}}),
      // A safety valve (systems review, 22 November 2026): after three defeats
      // in the same chapter the party may climb back up to town to level, shop
      // or change gear. The chapter stays in progress and resumes from the board.
      // "ledgeBackLabel" and "climbText" word it for a ledge that is not on a
      // stair (Book Four's mountain column and casting floor).
      choice('climb',q.ledgeBackLabel||'Climb back up to town',{once:false,requires:{failuresAtLeast:3},description:q.climbText||'The long way back to the last town. The chapter waits where you left it; depart again to go back to the same encounter.',result:{climbUp:true}})]};
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
// structured dialogue; choices change approval and flags (setFlags, and
// flagsIf for flags that depend on the moment, like a companion's bond). A scene whose cast is
// not all in the party is skipped (engine enterNode follows skipTo).
// A scene may also follow another scene ("after" names that scene): it plays
// straight after it, as the second choice of a chapter runs before its camp.
const SCENES=mergeLater(require('./data/scenes.json'),'scenes','Scene');
const sceneNode=(scene,key)=>`scene-${scene.id}-${key}`;
const chapterOf=scene=>{for(let s=scene,i=0;s&&i<10;s=SCENES[s.after],i++)if(QUESTS[s.after])return QUESTS[s.after];return null;};
function installScene(scene){
  const q=chapterOf(scene);if(!q)throw new Error(`Scene ${scene.id} follows unknown expedition ${scene.after}`);
  const next=Object.values(SCENES).find(s=>s&&s.nodes&&s.after===scene.id);
  const home=next?sceneNode(next,next.start):`town-${q.nextTown||q.town}`,nodeId=key=>sceneNode(scene,key);
  for(const [key,raw]of Object.entries(scene.nodes)){
    const base=raw.sameAs?scene.nodes[raw.sameAs]:raw;
    // The node that names the 3rd job ("framesTrial") ends with the scene's
    // trialFraming lines, the same ones the trial opens with (trialFraming below).
    const dialogue=[...base.lines,...(base.framesTrial&&scene.trialFraming?scene.trialFraming.lines:[])].map(storyLine);
    STORY_NODES[nodeId(key)]={id:nodeId(key),act:base.act||scene.act,title:base.title,location:base.location||scene.location,objective:base.objective,opening:dialogueText(dialogue),dialogue,safeRest:false,sideStory:true,scene:scene.id,cast:scene.cast,skipTo:home,
      choices:(raw.choices||[]).map(c=>choice(c.id,c.label,{...(c.requires?{requires:c.requires}:{}),result:{...(c.lines?{dialogue:c.lines.map(storyLine)}:{}),...(c.approval?{approval:c.approval}:{}),...(c.setFlags?{setFlags:c.setFlags}:{}),...(c.flagsIf?{flagsIf:c.flagsIf}:{}),nextNode:c.next?nodeId(c.next):home}}))};
  }
  if(QUESTS[scene.after])for(const c of STORY_NODES[`q-${q.id}-after`].choices)c.result.nextNode=nodeId(scene.start);
}
for(const scene of Object.values(SCENES))if(scene&&scene.nodes)installScene(scene);
// The job trials are framed the way the Second Oath framed the 2nd job: a
// scene's "trialFraming" ({flag, lines, trial}) is what the hero carries into
// the trial it names ("third", the default, or "fourth"), read from the save
// once that flag is set (Book Three's epilogue, b3_done, frames the 3rd job;
// Book Four's, b4_done, the 4th). A trial is never framed with another
// trial's lines. Plain text, the same offline and with the AI game master;
// '' otherwise.
const framesKind=f=>f?.trial==='fourth'?'fourth':'third';
function trialFraming(state,kind='third'){
  for(const scene of Object.values(SCENES)){
    const f=scene?.trialFraming;
    if(!f||framesKind(f)!==kind||!state?.story?.flags?.[f.flag])continue;
    const text=dialogueText(liveLines(state,f.lines.map(storyLine)));
    if(text)return text;
  }
  return '';
}
// Side jobs (src/data/side-jobs.json): short optional stories taken from a
// town. Each node is a story node; a choice either moves on ("next") or
// finishes the job, which pays it (src/world.js completeJob) and goes back to
// the job's town. Checks use a DC by the job's level. A choice that costs gold
// needs that much in the purse.
const SIDE_JOBS=Object.fromEntries(Object.entries(mergeLater(require('./data/side-jobs.json'),'jobs','Side job')).filter(([,j])=>j&&j.nodes));
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
// Special monsters' hunts, on their chapters' opening scenes (src/special.js).
require('./special').install({QUESTS,STORY_NODES,ENCOUNTERS,ENEMIES,choice});
// Any written story node or choice outcome may use "lines" (the same format as
// scenes) instead of plain text. They compile to structured dialogue plus the
// same text, so offline narration, saves and the AI narrator are unchanged.
for(const node of Object.values(STORY_NODES)){
  if(Array.isArray(node.lines)){node.dialogue=node.lines.map(storyLine);node.opening=dialogueText(node.dialogue);}
  for(const c of node.choices||[])for(const key of ['success','failure','result']){const o=c[key];if(o&&Array.isArray(o.lines)){o.dialogue=o.lines.map(storyLine);o.text=dialogueText(o.dialogue);}}
}
// Town pages that follow a flag: "pages" in towns.json is a list of
// {flag, subtitle, description, services}. Once a page's flag is set the town
// is told as that page when the party arrives, and shows that page's subtitle
// and, if the page lists them, its services; the first page in the list whose
// flag is set wins. "emptied" ({flag, subtitle, description}, Book Three's
// Vell after the evacuation) is the page of a town a story choice has
// emptied: it comes before the others, and src/world.js closes its shops,
// services, side jobs and boards.
const townPages=town=>[...(town?.emptied?[{...town.emptied,services:['storage'],emptied:true}]:[]),...(Array.isArray(town?.pages)?town.pages:[])];
// The page a town shows this save now, or null for its usual page.
const townPage=(state,id)=>{const f=state?.story?.flags||{};return townPages(TOWNS[id]).find(p=>p.flag&&f[p.flag])||null;};
for(const town of Object.values(TOWNS)){
  const pages=townPages(town),flags=pages.map(p=>p.flag);
  STORY_NODES[`town-${town.id}`]={id:`town-${town.id}`,act:'Downtime & preparation',title:town.name,location:town.subtitle,objective:'Recover, develop the party, choose an expedition and prepare for known threats.',opening:town.description,safeRest:true,townId:town.id,choices:[],
    ...(pages.length?{locationPages:pages.map(p=>({flag:p.flag,location:p.subtitle||town.subtitle})),dialogue:[{narration:town.description,when:{noneFlag:flags}},...pages.map((p,i)=>({narration:p.description||town.description,when:{flag:p.flag,...(i?{noneFlag:flags.slice(0,i)}:{})}}))]}:{})};
}
// Where a node is, as this save sees it (a town node's pages).
const nodeLocation=(state,node)=>{const f=state?.story?.flags||{};return node?.locationPages?.find(p=>f[p.flag])?.location||node?.location;};

// Continue the original story rather than reset the party or fake a level grant.
STORY_NODES.ending.ending=false;
STORY_NODES.ending.act='Chapter I • Consequences';
STORY_NODES.ending.objective='Report to Briarwatch and open the roads beyond the bell.';
STORY_NODES.ending.opening='The immediate threat beneath Briarwatch has ended. The village waits for your account; what you chose will follow the party onto the wider roads.';
STORY_NODES.ending.choices=[choice('report-bell','Report to the town and prepare for the next adventure',{result:{text:'Aveline pays the agreed contract and introduces you to the road wardens. The party keeps its experience, equipment and relationships.',completeQuest:'bell',nextNode:'town-briarwatch'}})];
STORY_NODES['briarwatch-square'].townId='briarwatch';
STORY_NODES['tovin-infirmary'].townId='briarwatch';
STORY_NODES.defeat.choices=[choice('recover','Accept rescue and return to a safe town',{once:false,description:'Lose up to a quarter of your gold, never equipment or XP. The interrupted encounter can be retried. A trial costs no gold.',result:{text:'The survivors and local wardens retrieve the party. The setback remains in the journal; the road is not over.',recover:true}})];
// Old ambiguous descriptions and effects: route-specific truth only.
const v=C.STORY_NODES['bell-vault'];
const expose=v.choices.find(c=>c.id==='expose-sable');
expose.success.combat=undefined;expose.success.nextNode='ending';
expose.success.text='The ledger makes Sable’s lie impossible to sustain. His followers cut the binding, disarm him and surrender him to your party. Evidence wins what a blade need not.';
expose.success.setFlags.spiritFreed=true;
// A practice battle gives the actual new specialization a safe place to operate.
ENEMIES['training-echo']={id:'training-echo',name:'Guild Training Echo',maxHp:160,ac:15,level:10,abilities:{str:14,dex:12,con:14,int:12,wis:12,cha:12},attack:{name:'Blunted Echo',bonus:5,damage:'1d6+2',damageType:'bludgeoning'},aiRole:'soldier',xp:0};
ENCOUNTERS.practice={id:'practice',name:'The Echo Court — practice',enemies:['training-echo'],storyScale:1,standardScale:1,grittyScale:1,xp:0,loot:[],intro:'A supervised practice echo rises. No gold, XP or loot is awarded. Your health, resources and supplies are restored exactly after practice.',victoryNode:'town-highpass',defeatNode:'town-highpass',practice:true};
// Where the hero and each companion stand after the written story's choices
// (src/data/standing.json): told to the AI game master and shown in the Journal.
const STANDING=require('./data/standing.json').entries;
function standing(state,who){return STANDING.filter(e=>e.who===who&&lineApplies(state,{when:e.when})).map(e=>e.text);}
module.exports={trialFraming,townPage,townPages,standing,TOWNS,MERCHANTS,RECIPES,PERSONAL,QUESTS,SCENES,SIDE_JOBS,UPGRADE_BASES,installQuest,storyLine,dialogueText,liveLines,playLines,lineApplies,nodeLocation,outcomeForRoller,forRoller};
