"use strict";
const { ITEMS, COMPANIONS, STORY_NODES, CLASSES, ENCOUNTERS, ENEMIES }=require('./content');
const { TOWNS, MERCHANTS, RECIPES, PERSONAL, QUESTS, SIDE_JOBS, townPage }=require('./expansion');
const Away=require('./away');
const P=require('./progression');
const Director=require('./director');
const Book=require('./book');
const Recap=require('./recap');
const XP=require('./xp');
const G=require('./equipment');
const Gear=require('./gear');
const { deepClone, abilityModifier, proficiencyBonus, rollD20, actorSkillBonus, rollFormula }=require('./rules');
const TOWN_ACTIONS=new Set(['choose-boon','buy','sell','upgrade','craft','store','retrieve','town-service','rumor','travel-town','depart','return-town','resume','bargain','merchant-favor','barter','personal','resolve-personal','recruit','practice','choose-reward','specialize','side-job','bounty']);
function init(state){
  const w=state.world ||= {};
  w.day=Number.isInteger(w.day)&&w.day>0?w.day:1;
  w.cycle=Number.isInteger(w.cycle)&&w.cycle>=0?w.cycle:0;
  w.townId=TOWNS[w.townId]?w.townId:'briarwatch';
  w.completed ||= {};w.progress ||= {};w.stock ||= {};w.meetings ||= {};w.personal ||= {};w.rumors ||= {};w.favors ||= {};w.servicesUsed ||= {};
  w.reputation={...Object.fromEntries(Director.FACTIONS.map(id=>[id,0])),...w.reputation};
  if(w.completed?.trial&&state.player)P.ensure(state.player).mastery=true;
  w.unlockedTowns=Array.from(new Set(['briarwatch',...(w.unlockedTowns||[]).filter(x=>TOWNS[x])]));
  w.storage=G.inventory(w.storage||[]);
  w.onExpedition=Boolean(w.onExpedition);w.activeQuest=w.activeQuest||null;
  w.setbacks=Number(w.setbacks||0);
  w.jobs=w.jobs&&typeof w.jobs==='object'?w.jobs:{};w.jobProgress=w.jobProgress&&typeof w.jobProgress==='object'?w.jobProgress:{};
  Away.ensure(state);
  for(const id of w.unlockedTowns)ensureStock(state,id);
  for(const member of state.party){G.initCompanion(state,member);P.levelCompanion(member,state.player.level);G.derive(member);}
  P.ensure(state.player);
  G.normalizeEquipment(state);
  return w;
}
// A town that only a later book's chapters reach (Saltwick, Vell) is shown
// and reachable only while one of them is playable (src/book.js townOpen).
const townOpen=Book.townOpen;
// The nodes of a written scene (scene-<id>-<node>) whose choices set flags.
const sceneDecides=(nodeId)=>{const n=STORY_NODES[nodeId];if(!n?.scene)return false;const scene=String(nodeId).startsWith('scene-')&&Object.values(STORY_NODES).filter(x=>x.scene===n.scene);return Boolean(scene&&scene.some(x=>(x.choices||[]).some(c=>c.result?.setFlags&&Object.keys(c.result.setFlags).length)));};
function town(state){const id=STORY_NODES[state.story.nodeId]?.townId;return !state.combat?.active&&TOWNS[id]?TOWNS[id]:null;}
// A town a story choice has emptied ("emptied" in towns.json: Book Three's Vell
// after the evacuation) has no shop, forge, workshop, inn, shrine, side jobs,
// bounty board, recruits or practice: only a place to sleep, the written
// chapters and the road out.
function emptied(state,id){return Boolean(townPage(state,id)?.emptied);}
// A town as this save sees it now: its page for a flag that is set ("pages"
// and "emptied" in towns.json, src/expansion.js townPage), or as written.
const asNow=(state,t)=>{const page=t&&townPage(state,t.id);if(!page)return t;
  return {...t,subtitle:page.subtitle||t.subtitle,description:page.description||t.description,...(Array.isArray(page.services)?{services:[...page.services]}:{}),...(page.emptied?{stock:[],emptied:true}:{})};};
function maxStock(id){const item=ITEMS[id];if(item.category==='consumable')return 5;if(item.category==='material')return 4;if(item.charges)return 3;return 2;}
// What a town sells now: its stock, plus each stockByLevel list (towns.json)
// once the hero has reached that level. Those lists are a later book's gear
// (Book Three's for levels 20 to 40, Book Four's for 41 to 70), so each opens
// only once this save has begun the book it belongs to (Book.gearOpen, which
// keeps Book Three's rule for a save that cannot read Book Four).
// A later book's own town ("book" in towns.json: Book Four's Lantry and Orme)
// sells its level stock where it is. While that town is closed to this save
// (its chapters not playable here: the part not out, the book hidden or
// unpaid), or the save's gear does not wait for that book (Book.ownsGear
// false: an AI story that will never begin it), the town it is reached from
// ("from": Highpass) sells that stock too, so a hero who levels on past the
// written story still finds every tier. Warm gear ("warm": true) is the
// Wold's own and is never sold anywhere else: it names the Wold, and the
// first Wold chapter's fight is meant to be cold.
const standIns=(state,id)=>Object.values(TOWNS).filter(x=>x.from===id&&x.book&&(!Book.ownsGear(state,x.book)||!Book.townOpen(state,x.id)));
const levelStock=(state,town,level,keep=()=>true)=>Object.entries(town.stockByLevel||{}).filter(([at])=>level>=Number(at)&&Book.gearOpen(state,Number(at))).flatMap(([,ids])=>ids.filter(keep));
function townStock(state,id){const t=TOWNS[id],level=Number(state.player?.level)||1;
  const byLevel=[...levelStock(state,t,level),...standIns(state,id).flatMap(x=>levelStock(state,x,level,i=>!ITEMS[i]?.warm))];
  return [...new Set([...t.stock,...byLevel])];}
// A town's shop: what it sells now (townStock). An entry it no longer sells
// (stand-in stock once the save can reach the Wold, or an item a town has
// stopped selling) is dropped, so a shop never keeps stale gear.
function ensureStock(state,id){const w=state.world,now=townStock(state,id),stock=(w.stock[id] ||= {});
  const sold=new Set(now);for(const itemId of Object.keys(stock))if(!sold.has(itemId))delete stock[itemId];
  for(const itemId of now)if(stock[itemId]===undefined)stock[itemId]=maxStock(itemId);return stock;}
function activeMerchant(state){
  const q=state.world?.activeQuest;const node=STORY_NODES[state.story.nodeId];
  if(!state.world?.onExpedition||state.combat?.active||node?.phase!=='start')return null;
  const meeting=state.world.meetings[q];return meeting?.merchantId?{...MERCHANTS[meeting.merchantId],meeting}:null;
}
function market(state,kind='town'){
  if(kind==='merchant'){const m=activeMerchant(state);return m?{id:m.id,stock:m.meeting.stock,discount:m.meeting.discount||0,merchant:true}:null;}
  const t=town(state);return t&&!emptied(state,t.id)?{id:t.id,stock:ensureStock(state,t.id),discount:0,merchant:false}:null;
}
function price(state,id,kind='town'){
  const m=market(state,kind);const value=ITEMS[id]?.value||0;
  const rep=m&&!m.merchant?Math.min(0.1,Math.max(0,state.world.reputation[TOWNS[m.id].faction]||0)*0.005):0;
  const caravan=m?.id==='caravan'&&state.world.favors.caravan?0.05:0;
  const discount=Math.min(0.15,(m?.discount||0)+rep+caravan);
  return Math.max(1,Math.ceil(value*(m?.merchant?1.12:1)*(1-discount)));
}
function sellPrice(id){return Math.max(1,Math.floor((ITEMS[id]?.value||0)*0.3));}
// Setting out shows where the party arrives (the node's opening), not a rules note.
function arrive(state,events,note){events.push({type:'world',tone:'neutral',text:note});return {ok:true,kind:'story',outcomeText:state.story.lastOutcome?.text||note};}
function emit(events,text,type='world',tone='neutral'){events.push({type,tone,text});return {ok:true,kind:type,outcomeText:text};}
function fail(events,text){events.push({type:'warning',tone:'warning',text});return {ok:false,error:text};}
function charge(state,gold,events){if(!Number.isInteger(gold)||gold<0||state.player.gold<gold){fail(events,'Not enough gold. No items or resources were changed.');return false;}state.player.gold-=gold;return true;}
function reputation(state,changes){for(const [id,amount]of Object.entries(changes||{}))if(id in state.world.reputation)state.world.reputation[id]=Math.max(-10,Math.min(20,state.world.reputation[id]+Number(amount||0)));}
function refreshStock(state){for(const id of state.world.unlockedTowns){const stock=ensureStock(state,id);for(const itemId of townStock(state,id))stock[itemId]=maxStock(itemId);}}
function completed(state,id){return Boolean(state.world.completed[id]);}
// A written chapter may be started below its level (up to XP.UNDER_FREE +
// XP.UNDER_MAX under; more than UNDER_FREE under makes it harder). AI
// adventures, job trials, the level-10 Oath of the Road and any other chapter
// that pays no XP keep their exact level: they are checkpoints, not stories to
// fall behind on.
function minLevel(q){return QUESTS[q.id]&&!q.generated&&!q.trial&&!q.requiresAdvancement&&Number(q.xp)>0?Math.max(1,q.level-XP.UNDER_FREE-XP.UNDER_MAX):q.level;}
// A chapter may need a job first ("requiresJob": 2, 3 or 4; Book Four's first
// chapter needs the 3rd job, which its trial at level 40 gives).
function hasJob(state,n){const p=P.ensure(state.player);return n<=1?true:n===2?Boolean(p.specialization):n===3?Boolean(p.thirdJob):Boolean(p.thirdJob&&p.fourthJob);}
const jobReady=(state,q)=>!q?.requiresJob||hasJob(state,Number(q.requiresJob));
// What the board says a chapter needs. A trial is offered only from its
// level, so a hero below it is told to reach that level too.
const JOB_NAMES={2:'Choose your 2nd job branch first.',3:'Pass your 3rd job trial first.',4:'Pass your 4th job trial first.'};
const JOB_TRIAL_LEVELS={3:P.THIRD_JOB_LEVEL,4:P.FOURTH_JOB_LEVEL};
function jobNeeded(state,q){
  if(jobReady(state,q))return null;
  const n=Number(q.requiresJob),at=JOB_TRIAL_LEVELS[n];
  if(at&&(Number(state.player.level)||1)<at)return `Reach level ${at} and pass your ${n===3?'3rd':'4th'} job trial first.`;
  return JOB_NAMES[n]||'Advance your job first.';
}
function unlocked(state,q){return Boolean(Book.playable(state,q.id)&&completed(state,q.unlock)&&state.player.level>=minLevel(q)&&state.world.unlockedTowns.includes(q.town)&&(!q.requiresAdvancement||P.ensure(state.player).mastery)&&jobReady(state,q));}
function rewardPersonal(state,id,events){
  for(const member of state.party){const def=PERSONAL[member.id];if(!def||def.quest!==id)continue;const record=state.world.personal[member.id] ||= {};record.goalMet=true;if(record.started&&!record.rewarded)emit(events,`${member.name}'s personal quest can now be resolved in town: ${def.name}.`,'party','good');}
}
// The battle of an AI-written adventure pays by the engine's rating of it.
// Resolving the crisis peacefully overcomes the same threat and pays the same,
// so peaceful and combat solutions stay equal. Paid once per adventure.
function awardBattleXp(state,id,events,api,peaceful=false){
  const q=Director.quest(state,id);const enc=ENCOUNTERS[`quest:${id}`];
  if(!q?.generated||!enc||state.story.flags[`battleXp:${id}`])return 0;
  const {rating,xp:full}=XP.battleXp(state.player.level,enc.enemies.map(e=>ENEMIES[e]).filter(Boolean),q.tier,q.level);
  // AI-written XP never takes the hero past the written chapter (src/book.js).
  const xp=Book.capXp(state,full);
  state.story.flags[`battleXp:${id}`]=true;
  if(xp<full)emit(events,'Battle XP is capped: you are at the level this chapter of the story is written for. Finishing the chapter raises the limit.','reward');
  if(xp)api.awardXp(state,xp,events,peaceful?`Overcame the threat without a fight (${rating})`:`Won a ${rating} battle`);
  return xp;
}
// A written chapter's fight pays its share as soon as it is won (src/xp.js
// chapterBattle): on top of the chapter's own XP in Books One and Two (where
// resolving the crisis peacefully pays the same share at the chapter's end),
// out of it in Books Three and Four. The flag keeps the share paid. Paid once.
function awardChapterBattleXp(state,id,events,api,scale=1,peaceful=false){
  const q=Director.quest(state,id);if(!QUESTS[id]||q?.generated||state.story.flags[`battleXp:${id}`])return 0;
  const {base,extra}=XP.chapterBattle(q,scale);if(!base)return 0;
  state.story.flags[`battleXp:${id}`]=base;
  api.awardXp(state,base+extra,events,peaceful?'Overcame the threat without a fight':extra?'Won the fight, made harder by an earlier choice':'Won the fight');
  return base+extra;
}
// What a written chapter has already paid for its fight (0 for an AI adventure).
const battlePaid=(state,q)=>!q?.generated&&typeof state.story.flags[`battleXp:${q?.id}`]==='number'?state.story.flags[`battleXp:${q.id}`]:0;
// Nessa joins from the guild bench. New games ask in the nessa-offer scene instead (her second and
// last chance after the rescue in mist-hollow); this button only serves saves from before that scene.
function nessaArrives(state,events,api){
  api.recruitCompanion(state,'nessa',events);const n=state.party.find(m=>m.id==='nessa');G.initCompanion(state,n);P.levelCompanion(n,state.player.level);
  return emit(events,'A young scout is sitting on the roadwardens’ bench with her pack already on and one boot up on the table. Nessa Reed. Nessa: Guild says you’re short a pair of eyes. I’ve been a day behind you all week, and you stop to talk to everyone, so somebody ought to be— the trees. Somebody ought to watch the trees. Orin: We manage. Nessa: You manage slowly. Maren: She can come. Nessa: I wasn’t asking. She brings her own gear, and she is every bit as road-worn as the rest of you.','party','good');
}
function completeQuest(state,id,events,api){
  if(completed(state,id))return false;
  const q=Director.quest(state,id);if(id!=='bell'&&!q)return false;
  const progress=state.world.progress[id]||{};
  if(q?.requiresAdvancement&&!P.ensure(state.player).mastery)return false;
  if(!jobReady(state,q))return false;
  const quality=progress.setback?'costly':state.story.flags[`method:${id}`]==='peace'?'peaceful':state.story.flags[`method:${id}`]==='objective'?'objective':'force';
  const xp=id==='bell'?300:q.xp;
  const gold=id==='bell'?60:Math.floor(q.gold*(progress.setback?0.8:1));
  state.world.completed[id]={day:state.world.day,quality,method:state.story.flags[`method:${id}`]||'force',xp,gold,...(q?.generated?{name:q.name}:{})};
  state.player.gold+=gold;
  state.world.cycle+=1;state.world.day+=1;
  state.world.activeQuest=null;state.world.onExpedition=false;state.world.resumeNode=null;state.world.pendingBattle=null;
  if(id==='bell'){
    reputation(state,{wardens:state.story.flags.spiritFreed?3:2});
    if(state.story.flags.tovinFrightened)reputation(state,{wardens:-1});
  }
  if(q?.trial==='third'||q?.trial==='fourth'&&P.ensure(state.player).thirdJob){const p=P.ensure(state.player),b=P.branchOf(state.player),fourth=q.trial==='fourth';p[fourth?'fourthJob':'thirdJob']=true;
    const r=P.resources(CLASSES[state.player.classId],state.player.level,state.player);state.player.resources.advancement=r.advancement;if(r.ultimate)state.player.resources.ultimate=r.ultimate;state.player.maxHp=P.maxHp(state.player);
    const first=(b?.[fourth?'fourthSkills':'thirdSkills']||[])[0];if(b)emit(events,`${state.player.name} passes the trial and takes the ${fourth?'4th':'3rd'} job: ${b[q.trial]}.${first?` New skill: ${first.name}. ${first.description}`:''} One more Advancement use per long rest.${fourth?` The ultimate arrives at level ${P.MAX_LEVEL}.`:''}`,'level','good');}
  if(id==='trial'){const m=P.JOBS[state.player.classId]?.mastery;P.ensure(state.player).mastery=true;if(m)emit(events,`The Oath of the Road is sworn. ${state.player.name} learns the class mastery skill ${m.name}: ${m.description}`,'level','good');}
  if(q?.nextTown&&!state.world.unlockedTowns.includes(q.nextTown))state.world.unlockedTowns.push(q.nextTown);
  const destination=q?.nextTown||q?.town||'briarwatch';state.world.townId=destination;
  refreshStock(state);
  if(state.story.flags[`method:${id}`]==='peace')awardBattleXp(state,id,events,api,true);
  // A written chapter resolved without its fight still earns the fight's share (src/xp.js chapterBattle).
  const onTop=QUESTS[id]&&!q?.generated&&XP.chapterBattle(q).onTop;
  if(onTop&&state.story.flags[`method:${id}`]==='peace')awardChapterBattleXp(state,id,events,api,1,true);
  const early=battlePaid(state,q),gain=q?.generated?Book.capXp(state,xp):onTop?xp:Math.max(0,xp-early);state.world.completed[id].xp=gain+early;
  if(gain<xp)emit(events,'Quest XP is capped: you are at the level this chapter of the story is written for. Finishing the chapter raises the limit.','reward');
  if(gain)api.awardXp(state,gain,events,`${q?.name||'The Bell Beneath Briarwatch'} resolved${early&&!onTop?' (the rest of the chapter\'s XP)':''}`);
  levelFloor(state,q,events,api);
  // A chapter's own reward item, or a templated one from an AI adventure (src/gear.js).
  Gear.award(state,`quest:${id}`,events);Gear.forgeReward(state,q,events);
  Book.finished(state);
  emit(events,`${gold?`Objective reward: ${gold} gold. `:''}${gold&&quality==='costly'?'The pay is lower for how costly it was; the XP is not. ':''}The shops have new stock.`,'reward','good');
  if(q&&id!=='trial'){api.addItem(state,'herb-bundle',2,events);if(q.level>=4)api.addItem(state,'ward-fragment',1,events);}
  rewardPersonal(state,id,events);
  // A written chapter settles each companion's approval for it (src/away.js).
  if(QUESTS[id]&&!q.generated)Away.chapterDone(state,id);
  return true;
}
// A written chapter's "levelFloor" tops a hero who is behind up to the start of
// that level once its own XP is paid (Book Three's last chapter to 40, Book
// Four's part ends to 50, 60 and 70). It only ever raises XP, and every level
// on the way is gained in order, each with its own level-up.
function levelFloor(state,q,events,api){
  const floor=Math.min(P.MAX_LEVEL,Math.floor(Number(q?.levelFloor)||0));
  if(!QUESTS[q?.id]||q.generated||floor<=1)return 0;
  const need=(P.XP_NEXT[floor-1]||0)-(Number(state.player.xp)||0);
  if(need<=0)return 0;
  api.awardXp(state,need,events,`${q.name}: the story carries you to level ${floor}`);
  return need;
}
// Side jobs (src/data/side-jobs.json): offered in their town while their
// chapter window is open. A job pays about 12% of a level, never past the
// level the next chapter will take the hero to (Book.capJobXp). With chapters
// paying about 70% of a level, jobs are one way to catch up.
const JOB_SHARE=0.12;
// A job whose window runs into a book this save cannot play (not released, or
// a paid book on a free hosted account) is never offered.
const jobInBooks=(state,job)=>[job.from,job.until].filter(Boolean).every(id=>Book.playable(state,id));
function jobOpen(state,job){return Boolean(job&&jobInBooks(state,job)&&!emptied(state,job.town)&&completed(state,job.from)&&!(job.until&&completed(state,job.until))&&!state.world.jobs[job.id]);}
// From Book Three a chapter pays exactly one level, so a job pays mostly gold
// and about 130 XP (docs/book-three/DESIGN.md, "Side jobs and camp scenes").
const BOOK_THREE_JOB_XP=130;
const jobBook=job=>Math.max(1,...[job.from,job.until].filter(Boolean).map(id=>Number(QUESTS[id]?.book)||1));
function jobXp(job){const L=Math.max(2,job.level);const share=Math.round(JOB_SHARE*((P.XP_NEXT[L]||0)-(P.XP_NEXT[L-1]||0)));return jobBook(job)>=3?Math.min(BOOK_THREE_JOB_XP,share):share;}
function completeJob(state,id,events,api,reward){
  const job=SIDE_JOBS[id],w=state.world;if(!job||w.jobs[id])return false;
  const gold=Math.max(0,Number.isFinite(reward)?reward:job.gold||0);
  w.jobs[id]={day:w.day,gold};delete w.jobProgress[id];w.day+=1;
  state.story.flags[`job:${id}`]=true;
  if(gold)state.player.gold+=gold;
  // Whatever XP the story leaves to spare is shared out over the jobs still to
  // come, so every job pays some and the first ones taken do not use it all.
  const left=Object.values(SIDE_JOBS).filter(j=>!w.jobs[j.id]&&jobInBooks(state,j)&&!(j.until&&completed(state,j.until))).length+1;
  const full=jobXp(job),xp=Math.min(full,Math.floor(Book.jobRoom(state)/left));
  if(xp)api.awardXp(state,xp,events,`Side job: ${job.name}`);
  emit(events,`Side job done: ${job.name}.${gold?` Paid ${gold} gold.`:''}${xp<full?' XP is capped: the written chapters still to come will level you, so the job pays its gold and only a little XP.':''}`,'reward','good');
  return true;
}
function longRest(state,premium,events){
  const key=`inn:${state.world.cycle}`;
  const cost=premium?10+state.player.level:0;
  if(premium&&state.world.servicesUsed[key])return fail(events,'You have already had the inn’s paid stay since your last expedition. The free lodging is still open.');
  if(!charge(state,cost,events))return {ok:false,error:'Not enough gold.'};
  restore(state,premium);
  state.world.day+=1;
  if(premium){state.world.servicesUsed[key]=true;state.player.inspiration=Math.min(3,state.player.inspiration+1);}
  return emit(events,premium?`The inn restores the party and grants ${4+P.accuracyLevel(state.player.level)} temporary HP each, plus one Inspiration (maximum 3). Cost ${cost} gold; one paid benefit per completed expedition.`:'A free night at the town lodging restores HP, hit dice and class abilities. Poison still needs the shrine.','rest','good');
}
// A long rest's recovery: HP, hit dice and class resources (the inn adds temporary HP).
function restore(state,premium=false){
  for(const a of G.actors(state)){
    a.hp=a.maxHp;a.deathSaves={successes:0,failures:0,stable:false};
    a.conditions=(a.conditions||[]).filter(c=>['poisoned','blessed','poisonWard','coating'].includes(c.id));
    if(premium)a.temporaryHp=4+P.accuracyLevel(state.player.level);
    else a.temporaryHp=0;
    a.used ||= {};
    if(a.id==='player'){a.resources=P.resources(CLASSES[a.classId],a.level,a);a.hitDice.current=P.hitDiceMax(a.level);}
    else P.refreshCompanion(a,'long');
  }
  Gear.refreshStory(state);
}
// Straight-on chapters (a chapter with "continues": Book Three's stair, 17 to
// 19): the decision goes on into the next chapter's opening, not to a town.
// The chapter's end is a safe ledge, so the party rests there first. Below
// the stair there is no town page and no side job, and a defeat wakes the
// party at the last ledge (the previous chapter's end), not in a town.
const continued=q=>{const prev=QUESTS[q?.unlock];return prev&&prev.continues&&!q.sideJob?prev:null;};
// The ledge before a chapter that follows a straight-on one.
// A straight-on chapter's card: how many chapters run on with no town, and
// where the run comes out (a town, or the end of the book).
function straightNote(q){
  let n=1,last=q;
  for(let next;last.continues&&(next=Object.values(QUESTS).find(x=>x.unlock===last.id&&!x.sideJob&&(Number(x.book)||1)===(Number(q.book)||1)));last=next)n++;
  const bookEnds=!Object.values(QUESTS).some(x=>x.unlock===last.id&&!x.sideJob&&(Number(x.book)||1)===(Number(q.book)||1));
  const run=n>2?`this chapter and the next ${n-1} run`:n===2?'this chapter and the next run':'this chapter runs';
  const until=bookEnds?'the end of the book':TOWNS[last.nextTown||last.town]?.name||'the next town';
  return `Straight on: ${run} on with no town, shop or side job until ${until}. The party rests between chapters, but buy potions and gear before you set out.`;
}
// The XP a hero still needs to reach a level (a chapter or trial's minimum),
// so a locked card can say how far off it is, not only the next level.
const xpToLevel=(state,level)=>Math.max(0,(P.XP_NEXT[level-1]||0)-(Number(state.player.xp)||0));
// A chapter in the Wold's white (docs/book-four/DESIGN.md): its deciding fight
// starts with everyone who wears no warm gear Slowed (src/combat.js whiteCold).
// The card says so before setting out, and who is not wrapped up.
function whiteNote(state){
  const cold=[...(Gear.warmItem(state.player)?[]:['you']),...state.party.filter(m=>!Gear.warmItem(m)).map(m=>m.name)];
  const list=cold.length>1?`${cold.slice(0,-1).join(', ')} and ${cold.at(-1)}`:cold[0];
  return cold.length?`The white: in this chapter's deciding fight, anyone without warm gear is Slowed for the first round (2 less armour). Not wrapped up: ${list}. ${Gear.warmReachable(state)?'Warm Wold-made wool is sold in Lantry and Orme.':'Warm Wold-made wool is sold in Lantry and Orme, and neither is on your road yet: you can buy it once this chapter reaches Lantry.'}`
    :'The white: everyone in the party wears warm gear, so the cold will not slow anyone.';
}
const ledgeOf=state=>{const q=QUESTS[state.world.activeQuest];const prev=continued(q);return prev&&completed(state,prev.id)&&!completed(state,q.id)&&STORY_NODES[`q-${prev.id}-ledge`]?`q-${prev.id}-ledge`:null;};
// Whether the party is below the stair now: in a chapter after a straight-on
// one, on a ledge, or between two such chapters.
function below(state){
  const w=state.world||{};
  return Boolean(w.goingOn||STORY_NODES[state.story?.nodeId]?.ledge||(!town(state)&&ledgeOf(state)));
}
// The node to enter after straight-on chapter `from` is done: a companion's
// scene first, if one is due (src/away.js), then the next chapter's opening.
// Null when no next chapter can be played here; the party goes to town.
function goOn(state,from,events){
  const w=state.world;
  const next=Book.chapters(state).find(q=>q.unlock===from&&!completed(state,q.id));
  if(!next||!STORY_NODES[`q-${next.id}-start`]){delete w.goingOn;return null;}
  const away=Away.pending(state,events);
  if(away&&STORY_NODES[away]){w.goingOn=from;return away;}
  delete w.goingOn;
  restore(state,false);
  w.activeQuest=next.id;w.townId=next.town;w.onExpedition=true;w.day+=1;
  w.progress[next.id] ||= {};
  w.meetings[next.id] ||= {merchantId:null,stock:{},bargained:false,discount:0,bartered:false};
  emit(events,`The party rests at the end of ${QUESTS[from].name} and goes straight on. HP, hit dice and class resources are restored.`,'rest','good');
  return `q-${next.id}-start`;
}
// The ledge's one choice: rest, then go back down to the interrupted chapter.
function backDown(state,rng,events,api){
  restore(state,false);
  emit(events,'The party rests on the ledge. HP, hit dice and class resources are restored.','rest','good');
  const w=state.world,id=w.activeQuest;
  if(w.pendingBattle)return resumeBattle(state,rng,events,api);
  w.onExpedition=true;
  api.enterNode(state,w.progress?.[id]?.node&&STORY_NODES[w.progress[id].node]?w.progress[id].node:`q-${id}-start`,events);
  return {ok:true};
}
// A trial is supervised: the level 10 Echo Court trial and every job trial
// (3rd job at 40, the legendary trial at 70) cost no gold when the party falls.
// (Codex playtest, 25 November 2026: the Ruinmaker Trial charged 9,200 gold.)
function inTrial(state){const id=state.world?.activeQuest;return id==='trial'||Boolean(id&&Director.quest(state,id)?.trial);}
// What the defeat screen says: the bell's own words only when the bell is the
// fight that was lost, otherwise the expedition's name, and rescue first.
function defeatScene(state){
  const id=state.world?.activeQuest,q=id?Director.quest(state,id):null,ledge=Boolean(ledgeOf(state));
  if(id==='bell')return {objective:'Accept rescue, recover in town, then go back to the bell. Nothing but some gold is lost.'};
  const back=ledge?'Wake on the last safe ledge, rest there, then go back to the interrupted fight.':'Accept rescue, recover in town, then go back to the interrupted fight.';
  if(inTrial(state))return {title:'The trial is halted',location:q?.region||null,objective:`${back} A trial costs no gold.`,opening:`The party falls in ${q?.name||'the trial'}. The judges call a halt before anyone is past help. The trial is not over; it waits for you to come back to it.`};
  if(q)return {title:'The party falls',location:q.region||null,objective:`${back} Nothing but some gold is lost.`,opening:`The party falls short in ${q.name}. What brought you there has not gone away, and it is still yours to finish.`};
  return {title:'The party falls',location:null,objective:`${back} Nothing but some gold is lost.`,opening:'The party falls. Nothing is lost that cannot be won back.'};
}
function recover(state,events,api){
  const trial=inTrial(state);
  const cost=trial?0:Math.floor(state.player.gold*0.25);
  state.player.gold-=cost;state.world.day+=1;state.world.setbacks+=1;
  for(const a of G.actors(state)){a.hp=Math.max(1,Math.ceil(a.maxHp*0.4));a.temporaryHp=0;a.deathSaves={successes:0,failures:0,stable:false};a.conditions=[];}
  state.combat=null;state.world.onExpedition=false;
  if(state.world.failedEncounter)state.world.pendingBattle=state.world.failedEncounter;
  if(state.world.activeQuest){const p=state.world.progress[state.world.activeQuest] ||= {};p.failures=(p.failures||0)+1;p.setback=true;}
  const ledge=ledgeOf(state);
  if(ledge){api.enterNode(state,ledge,events);return emit(events,`The party falls back to the last safe ledge. ${cost?`${cost} gold was lost in the dark; `:''}no XP or equipment lost. Rest there, then go back down to the interrupted encounter.`,'rest','warning');}
  api.enterNode(state,`town-${state.world.townId}`,events);
  return emit(events,`The party returns to ${TOWNS[state.world.townId].name}. Rescue cost ${cost} gold; no XP or equipment lost. Recover, then resume the interrupted encounter from the expedition board.`,'rest','warning');
}
function resumeBattle(state,rng,events,api){
  const battle=state.world.pendingBattle;state.world.pendingBattle=null;
  // Go back to the scene the fight belongs to, so the screen shows where it is.
  const at=state.world.progress?.[state.world.activeQuest]?.node;if(at&&STORY_NODES[at]&&!STORY_NODES[at].townId)api.enterNode(state,at,events);
  state.world.onExpedition=true;return api.startCombat(state,battle,rng,events)?emit(events,'The party returns to the interrupted encounter. Earlier preparation and setbacks are preserved.'):fail(events,'The interrupted encounter is unavailable.');}
function depart(state,id,rng,events,api){
  const t=town(state);if(!t)return fail(events,'Depart from a town or resume at a safe hub.');
  // Continuing the expedition a rescue interrupted restarts its fight; entering
  // the node alone would leave only resolved choices and no way forward.
  if(state.world.activeQuest===id&&state.world.pendingBattle)return resumeBattle(state,rng,events,api);
  if(id==='bell'){
    if(completed(state,'bell'))return fail(events,'The bell chapter is already complete.');
    state.world.onExpedition=true;state.world.activeQuest='bell';
    api.enterNode(state,state.world.resumeNode||'briarwatch-square',events);return arrive(state,events,'You return to the bell investigation.');
  }
  const q=Director.quest(state,id);
  if(q&&!completed(state,id)&&jobNeeded(state,q)&&Book.playable(state,id)&&completed(state,q.unlock))return fail(events,`${q.name} is not open yet. ${jobNeeded(state,q)}`);
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
  return arrive(state,events,`The party sets out for ${q.name}.`);
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
  if(action.type==='choose-boon'){
    const result=P.chooseBoon(state.player,String(action.boonId||''));
    if(!result.ok)return fail(events,result.error);
    G.derive(state.player);
    return emit(events,`Renown boon chosen: ${result.name}. ${result.description}`,'level','good');
  }
  if(action.type==='specialize'){
    const spec=(P.SPECIALIZATIONS[state.player.classId]||[]).find(s=>s.id===action.specializationId);
    if(state.player.level<P.SECOND_JOB_LEVEL||!completed(state,'trial')||P.ensure(state.player).specialization||!spec)return fail(events,`Reach level ${P.SECOND_JOB_LEVEL} after the Oath of the Road trial, then choose one of your class's branches. This choice is permanent.`);
    P.ensure(state.player).specialization=spec.id;
    state.player.resources.advancement=P.resources(CLASSES[state.player.classId],state.player.level,state.player).advancement;
    state.player.maxHp=P.maxHp(state.player);
    return emit(events,`${state.player.name} takes the 2nd job: ${spec.name}. ${spec.description}`,'level','good');
  }
  if(action.type==='return-town'){
    if(town(state))return fail(events,'You are already in a town.');
    if(STORY_NODES[state.story.nodeId]?.defeat)return fail(events,'Resolve the rescue choice first.');
    if(below(state))return fail(events,'There is no town below the stair. The only way out is on, through the chapter.');
    // A scene whose choices decide the story (a flag, such as the end of a
    // part) is played through; leaving would skip it for good.
    if(sceneDecides(state.story.nodeId))return fail(events,'This scene decides something. Play it through to the end.');
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
    if(w.pendingBattle)return resumeBattle(state,rng,events,api);
    if(w.activeQuest==='bell'&&w.resumeNode){w.onExpedition=true;api.enterNode(state,w.resumeNode,events);return emit(events,'The bell investigation resumes where you left it.');}
    return depart(state,w.activeQuest,rng,events,api);
  }
  if(action.type==='travel-town'){
    if(!town(state)||!w.unlockedTowns.includes(action.townId)||!TOWNS[action.townId]||!townOpen(state,action.townId))return fail(events,'Travel is only available between discovered towns while out of combat.');
    if(town(state).id===action.townId)return fail(events,'You are already there.');
    w.day+=1;w.townId=action.townId;w.onExpedition=false;api.enterNode(state,`town-${action.townId}`,events);return emit(events,`The party travels to ${TOWNS[action.townId].name}. Stock and progress are preserved.`);
  }
  if(action.type==='buy'){
    const m=market(state,action.market);const id=String(action.itemId||'');const qty=action.quantity??1;
    if(!m||!ITEMS[id]||!Number.isInteger(qty)||qty<1||qty>20||!(id in m.stock))return fail(events,'Choose a stocked item and a whole quantity from 1 to 20.');
    if(m.stock[id]<qty)return fail(events,'The merchant does not have that many. No gold was spent.');
    const cost=price(state,id,action.market)*qty;if(!charge(state,cost,events))return {ok:false,error:'Not enough gold.'};
    m.stock[id]-=qty;G.addTo(state.player.inventory,id,qty);
    return emit(events,`Bought ${qty} × ${ITEMS[id].name} for ${cost} gold. ${Gear.purpose(ITEMS[id])}`,'item','good');
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
  if(action.type==='side-job'){
    const job=SIDE_JOBS[String(action.jobId||'')];
    if(!job||!jobOpen(state,job))return fail(events,w.jobs[action.jobId]?'That job is already done.':'That job is not on offer now.');
    if(t.id!==job.town)return fail(events,`Travel to ${TOWNS[job.town].name} to take this job.`);
    const node=w.jobProgress[job.id]&&STORY_NODES[w.jobProgress[job.id]]?w.jobProgress[job.id]:`job-${job.id}-${job.start}`;
    api.enterNode(state,node,events);
    return arrive(state,events,`Side job: ${job.name}.`);
  }
  const empty=emptied(state,t.id);
  if(empty&&['upgrade','craft','recruit','practice','bounty'].includes(action.type))return fail(events,`There is nobody left in ${t.name} to do that.`);
  if(action.type==='town-service'){
    if(action.serviceId==='civic-rest')return longRest(state,false,events);
    if(empty)return fail(events,`There is nobody left in ${t.name} to offer that.`);
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
    const q=Director.quest(state,action.questId);if(!q||!completed(state,q.unlock))return fail(events,'There is no established lead for that expedition yet.');
    if(w.rumors[q.id])return fail(events,'That briefing is already recorded in your journal.');
    if(!charge(state,5,events))return {ok:false,error:'Not enough gold.'};w.rumors[q.id]=true;
    return emit(events,`Briefing: ${q.threat} This information also gives +1 to that expedition’s combat-objective checks.`,'clue','good');
  }
  if(action.type==='upgrade'){
    const id=String(action.itemId||''),item=ITEMS[id],up=ITEMS[`${id}-fine`];const owner=action.actorId?G.actor(state,action.actorId):null;
    if(!item||!up||item.upgradeTier)return fail(events,'This item has no smith upgrade, or it is already upgraded.');
    const ownerEquipped=owner&&Object.values(owner.equipment||{}).includes(id);
    if(!ownerEquipped&&G.available(state,id)<1)return fail(events,'Choose the equipped owner or an unequipped copy to upgrade.');
    const cost=Gear.upgradeCost(item);
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
    if(state.party.some(m=>m.id==='nessa')||w.away?.nessa||state.player.level<3||state.story.flags['nessa:offer'])return fail(events,'No recruit is currently available.');
    return nessaArrives(state,events,api);
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
    if(api?.awardXp)api.awardXp(state,XP.missionXp(state.player.level),events,`Mission complete: ${def.name}`);
    // A personal resolution may be told differently once the story has moved on (resolutionIf: [{flag, text}]).
    const told=(def.resolutionIf||[]).find(r=>state.story.flags[r.flag])?.text||def.resolution;
    return emit(events,`${told?`${told} `:''}${a.name} resolves ${def.name}. ${action.choice==='watchful'?'Watchful: +1 AC.':'Decisive: +1 attack bonus and spell save DC.'} ${def.reward}`,'party','good');
  }
  if(action.type==='bounty'){
    if(!town(state))return fail(events,'Take a bounty from a town.');
    const r=require('./bounty').start(state,rng,events,api);
    return r.ok?r:fail(events,r.error);
  }
  if(action.type==='practice'){
    if(w.practiceSnapshot)return fail(events,'A practice session is already active.');
    w.practiceSnapshot={player:deepClone(state.player),party:deepClone(state.party),nodeId:state.story.nodeId};
    api.startCombat(state,'practice',rng,events);
    return emit(events,'The guild starts a supervised practice fight. Actual class abilities work here; health, resources and inventory will be restored on leaving, with no rewards.','combat');
  }
  return fail(events,'That action is unavailable.');
}
function previewItem(state,id,qty,kind){const item=ITEMS[id];return {id,name:item.name,level:item.requires?.level||1,purpose:Gear.purpose(item),set:Gear.setCard(item,state.player),rarity:item.rarity||'Common',requires:Gear.requirementText(item)||null,category:item.category,stock:qty,price:price(state,id,kind),comparisons:item.slot?G.actors(state).map(a=>G.comparison(state,id,a.id)):[]};}
function view(state){
  const w=state.world,t=town(state),m=activeMerchant(state);
  // A written chapter in a book this save cannot open (unreleased, or paid) is not on the board.
  const ready=[...Object.values(QUESTS),...Director.list(state)].filter(q=>Book.playable(state,q.id)&&completed(state,q.unlock)&&!completed(state,q.id));
  const empty=Boolean(t&&emptied(state,t.id));
  const services=t?[
    {id:'civic-rest',name:'Civic lodging',cost:0,description:'Full HP and class abilities. Poison still needs the shrine.'},
    {id:'inn',name:'Inn: expedition lodging',cost:10+state.player.level,description:`Full recovery, ${4+state.player.level} temporary HP each and +1 Inspiration. Once after each expedition.`,disabled:Boolean(w.servicesUsed[`inn:${w.cycle}`])},
    {id:'treatment',name:'Shrine: treat conditions',cost:8+state.player.level,description:'Clear poison, bleeding, fear and deafness for the party.',disabled:!G.actors(state).some(a=>a.conditions.some(c=>['poisoned','bleeding','frightened','deafened'].includes(c.id)))},
    {id:'blessing',name:'Shrine: bless the hero',cost:12,description:'+1d4 to the hero’s next saving throw, then consumed.',disabled:state.player.conditions.some(c=>c.id==='blessed')}
  ].filter(x=>!empty||x.id==='civic-rest'):[];
  const eq=state.player.inventory.filter(e=>ITEMS[e.itemId].slot).flatMap(e=>{
    const item=ITEMS[e.itemId],up=ITEMS[`${item.id}-fine`];if(!up)return [];
    const owners=G.actors(state).filter(a=>Object.values(a.equipment).includes(item.id));
    const opts=owners.map(a=>({actorId:a.id,owner:a.name}));if(G.available(state,item.id))opts.push({actorId:null,owner:'Shared inventory'});
    return opts.map(o=>({itemId:item.id,name:item.name,newName:up.name,masterwork:Boolean(up.masterwork),...o,cost:Gear.upgradeCost(item),purpose:up.purpose}));
  });
  const questCards=ready.map(q=>({id:q.id,generated:Boolean(q.generated),...(q.continues&&!continued(q)?{straightOn:true,straightOnNote:straightNote(q)}:{}),...(q.white&&!completed(state,q.id)?{white:whiteNote(state)}:{}),name:q.name,level:q.level,...(q.generated?{tier:XP.tier(q.tier).id,tierName:XP.tier(q.tier).name,tiers:q.trial?[]:Object.values(XP.TIERS).map(t=>({id:t.id,name:t.name,description:t.description})),canChangeTier:!q.trial&&!(w.activeQuest===q.id||w.progress[q.id]?.node),...(q.trial?{trial:q.trial,trialLabel:Director.TRIALS[q.trial].label,trialTier:XP.tier(Director.TRIALS[q.trial].tier).name}:{})}:{}),town:q.town,townName:TOWNS[q.town].name,brief:q.brief,reward:{xp:q.xp,gold:q.gold},underBy:XP.underBy(state.player.level,q.level),underSteps:XP.underSteps(state.player.level,q.level),underChecks:XP.underChecks(state.player.level,q.level),minLevel:minLevel(q),...(state.player.level<minLevel(q)?{xpToGo:xpToLevel(state,minLevel(q))}:{}),...(jobNeeded(state,q)?{needs:jobNeeded(state,q)}:{}),available:unlocked(state,q)&&!state.combat?.active,knownThreat:w.rumors[q.id]?q.threat:null,briefed:Boolean(w.rumors[q.id]),inProgress:w.activeQuest===q.id,returning:Boolean(w.progress[q.id]?.node),canDepart:Boolean(t&&t.id===q.town&&unlocked(state,q)&&(!w.activeQuest||w.activeQuest===q.id))}));
  const prep=questCards.map(q=>{
    const original=Director.quest(state,q.id);const tools=original.route.tools||[];
    const warnings=[];
    // One line for everyone hurt, not one per person (browser playtest, 25 November 2026).
    const hurt=G.actors(state).filter(a=>a.hp<a.maxHp*0.65).map(a=>a.name);
    if(hurt.length)warnings.push(`${hurt.length>1?hurt.slice(0,-1).join(', ')+' and '+hurt.at(-1)+' are':hurt[0]+' is'} below 65% health.`);
    if(!state.player.inventory.some(e=>['healing-potion','greater-healing'].includes(e.itemId)))warnings.push('No healing potions are carried; companions and class abilities may provide alternatives.');
    if(q.knownThreat&&tools.length&&!tools.some(id=>state.player.inventory.some(e=>e.itemId===id)))warnings.push('You do not have the tools mentioned in the briefing. Other routes remain available.');
    if(q.knownThreat&&original.route.poison&&!state.player.inventory.some(e=>e.itemId==='antitoxin'))warnings.push('Poison was reported. You have no Antitoxin; treatment remains available in town.');
    return {questId:q.id,warnings,knownThreat:q.knownThreat};
  });
  return {day:w.day,cycle:w.cycle,town:t?{...asNow(state,t),rumor:undefined}:null,townId:w.townId,onExpedition:w.onExpedition,activeQuest:w.activeQuest,pendingBattle:w.pendingBattle||null,canReturn:!t&&!state.combat?.active&&!below(state)&&!STORY_NODES[state.story.nodeId]?.defeat&&!sceneDecides(state.story.nodeId),
    towns:w.unlockedTowns.filter(id=>townOpen(state,id)).map(id=>({id,name:TOWNS[id].name,current:t?.id===id})),
    reputation:Director.shownReputation(state),services,
    shop:t&&!empty?Object.entries(ensureStock(state,t.id)).map(([id,qty])=>previewItem(state,id,qty,'town')):[],
    merchant:m?{id:m.id,name:m.name,role:m.role,personality:m.personality,offer:m.offer,bargained:m.meeting.bargained,bartered:m.meeting.bartered,favorDone:Boolean(w.favors.caravan),stock:Object.entries(m.meeting.stock).map(([id,qty])=>previewItem(state,id,qty,'merchant'))}:null,
    upgrades:t&&!empty?eq:[],recipes:t&&!empty?RECIPES.map(r=>({...r,ready:r.ingredients.every(i=>G.available(state,i.itemId)>=i.quantity)&&state.player.gold>=r.gold})):[],
    storage:w.storage.map(e=>({...e,name:ITEMS[e.itemId].name,purpose:Gear.purpose(ITEMS[e.itemId])})),
    sellable:state.player.inventory.filter(e=>ITEMS[e.itemId].category!=='quest'&&G.available(state,e.itemId)>0).map(e=>({...e,name:ITEMS[e.itemId].name,loose:G.available(state,e.itemId),sellPrice:sellPrice(e.itemId),partial:Boolean(ITEMS[e.itemId].charges&&e.charges!==ITEMS[e.itemId].charges)})),
    quests:questCards,preparation:prep,director:Director.view(state),bounty:t&&!empty?require('./bounty').view(state):null,
    sideJobs:Object.values(SIDE_JOBS).filter(j=>jobOpen(state,j)).map(j=>({id:j.id,name:j.name,brief:j.brief,giver:j.giver,town:j.town,townName:TOWNS[j.town].name,level:j.level,reward:{gold:j.gold,xp:jobXp(j)},started:Boolean(w.jobProgress[j.id]),canStart:Boolean(t&&t.id===j.town&&!state.combat?.active)})),
    jobsDone:Object.keys(w.jobs).filter(id=>SIDE_JOBS[id]).map(id=>({id,name:SIDE_JOBS[id].name})),
    away:Away.view(state),
    completed:Object.entries(w.completed).map(([id,v])=>({id,...v,name:Director.quest(state,id)?.name||v.name||'The Bell Beneath Briarwatch'})),
    bellComplete:completed(state,'bell'),campaignComplete:completed(state,'aftermath'),booksComplete:!Book.locked(state)&&!Book.writing(state)&&Book.chapters(state).every(q=>completed(state,q.id)),book:(()=>{const c=Book.chapter(state);return c&&c.id!=='bell'?{title:c.book,n:c.n,chapter:c.name,level:c.level,...(c.waiting?{waiting:true}:{}),...(c.locked?{locked:true,note:c.brief}:{})}:null;})(),bookRecap:Recap.recap(state),paidBook:(()=>{const b=Book.lockedBook(state);return b&&!Book.locked(state)?{n:b.n,title:b.title,...(Book.aiStory(state)?{closed:true}:{})}:null;})(),regionalCrisisResolved:completed(state,'beacon'),
    canRecruit:!empty&&state.player.level>=3&&!state.party.some(m=>m.id==='nessa')&&!w.away?.nessa&&!state.story.flags['nessa:offer'],canPractice:Boolean(t&&!empty),
    personal:state.party.map(a=>{const def=PERSONAL[a.id],r=w.personal[a.id]||{};return {companionId:a.id,name:def.name,prompt:def.prompt,goal:def.goal,reward:def.reward,...r,goalMet:completed(state,def.quest),canResolve:Boolean(r.started&&!r.rewarded&&completed(state,def.quest))};}),
    setbacks:w.setbacks,
    recap:completed(state,'beacon')?(state.story.flags.ending_distributed?'The towns retain independent wards; the party keeps the roads between them open.':'A public charter limits the network’s authority and names its accountable keepers.'):'Your completed expeditions and community choices will determine the network’s future.'
  };
}
// Whether a retreat or defeat now wakes the party on a ledge, not in a town.
const atLedge=state=>Boolean(ledgeOf(state));
module.exports={atLedge,inTrial,defeatScene,below,goOn,backDown,restore,init,town,townOpen,townStock,emptied,activeMerchant,handle,view,completeQuest,completeJob,jobOpen,jobXp,awardBattleXp,awardChapterBattleXp,battlePaid,reputation,recover,longRest,price,unlocked,TOWN_ACTIONS};
