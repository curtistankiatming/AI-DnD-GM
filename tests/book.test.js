'use strict';
// The written story comes first: what the AI game master may do while a book
// is running, and what changes once the books are finished (src/book.js).
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const E=require('../src/engine');
const B=require('../src/book');
const D=require('../src/director');
const I=require('../src/improvise');
const P=require('../src/progression');
const XP=require('../src/xp');
const Chat=require('../src/chat-runtime');
const Journal=require('../src/journal');
const {QUESTS}=require('../src/expansion');
const {ENCOUNTERS,ENEMIES}=require('../src/content');
const {createLocalAI}=require('../src/local-ai');
const {createClaudeProvider}=require('../src/claude-ai');
const draft=require('./fixtures/director-draft');

const high=()=>0.999;
const clone=x=>JSON.parse(JSON.stringify(x));
const act=(s,action,rng=high)=>E.resolveAction(s,action,rng);
const improv={intent:'arm-wrestle the blacksmith for a story',skill:'athletics',ability:'',difficulty:'hard',success:'You win, barely.',failure:'You lose, loudly.',reward:'xp',risk:'none'};
// A hero in Briarwatch with the given written chapters done.
function hero({level=1,xp=level>1?P.XP_NEXT[level-1]:0,done=['bell']}={}){
  const s=E.createNewGame({name:'Rhea',classId:'fighter'});
  s.player.level=level;s.player.xp=xp;
  for(const id of done)s.world.completed[id]={day:1,quality:'force',method:'force'};
  if(done.includes('bell')){s.story.nodeId='town-briarwatch';s.world.townId='briarwatch';}
  return E.normalizeIncomingState(s);
}

test('the chapter follows the written story, and the books end after the last one',()=>{
  const start=E.createNewGame({classId:'fighter'});
  assert.equal(B.running(start),true);assert.equal(B.chapter(start).id,'bell');assert.equal(B.levelCap(start),1);
  assert.equal(B.chapter(hero()).id,'road');assert.equal(B.levelCap(hero()),QUESTS.road.level);
  assert.equal(B.chapter(hero({done:['bell','road']})).id,'marsh');
  const all=hero({level:10,done:['bell',...Object.keys(QUESTS)]});
  assert.equal(B.running(all),false);assert.equal(B.chapter(all),null);assert.equal(B.xpRoom(all),Infinity);
  assert.equal(all.story.flags[B.FINISHED],true,'The save is marked as the hero\'s own story.');
});

test('a finished save stays the hero\'s own story when more books are written later',()=>{
  const s=hero({level:10,done:['bell',...Object.keys(QUESTS)]});
  delete s.world.completed.aftermath;// As if a new written chapter appeared.
  assert.equal(B.running(s),false);
  assert.equal(B.running(E.normalizeIncomingState(clone(s))),false);
});

test('a hero already above the last written chapter is on their own story',()=>{
  const lastLevel=Math.max(...Object.values(QUESTS).map(q=>q.level));
  assert.equal(B.running(hero({level:lastLevel+1})),false);
  assert.equal(B.running(hero({level:lastLevel})),true);
});

test('improvised XP can bring the hero up to the chapter, never past it',()=>{
  let s=E.createNewGame({classId:'fighter'});// The bell: written for level 1.
  s.player.xp=P.XP_NEXT[1]-5;
  const plan=E.previewImprovised(s,improv);
  assert.equal(plan.ok,true);assert.equal(plan.proposal.reward,'xp');assert.equal(plan.effects.reward,'4 XP');
  s=act(s,{type:'improvise',proposal:improv}).state;
  assert.equal(s.player.xp,P.XP_NEXT[1]-1);assert.equal(s.player.level,1,'Never levels past the chapter.');
  const capped=E.previewImprovised(Object.assign(E.createNewGame({classId:'fighter'}),{}),improv);
  assert.equal(capped.proposal.reward,'xp','Below the cap, XP is offered as usual.');
  const full=E.createNewGame({classId:'fighter'});full.player.xp=P.XP_NEXT[1]-1;
  const none=E.previewImprovised(full,improv);
  assert.equal(none.proposal.reward,'insight');assert.ok(none.notes.some(n=>/chapter of the story/.test(n)));
});

test('while a book runs, the AI writes a small side quest that pays like a mission',()=>{
  const out=act(hero({level:2,xp:P.XP_NEXT[1]}),{type:'director-commission',draft:draft()});
  assert.equal(out.result.ok,true,out.result.error);
  const q=out.state.director.quests[out.result.questId];
  assert.equal(q.side,true);
  assert.deepEqual({xp:q.xp,gold:q.gold},D.rewards(2,2,'normal',null,true));
  assert.ok(q.xp<D.rewards(2).xp,'Smaller than a full adventure.');
  assert.match(out.result.outcomeText,/side quest/);
  assert.equal(out.view.world.director.sideQuests,true);
  assert.equal(out.view.world.director.open[0].side,true);
  // The side flag survives a reload and a change of difficulty.
  const t=clone(out.state);t.director.quests[q.id].side=false;t.director.quests[q.id].xp=999999;
  assert.equal(E.normalizeIncomingState(clone(out.state)).director.quests[q.id].side,true);
  const hard=act(out.state,{type:'adventure-tier',questId:q.id,tier:'hard'});
  assert.equal(hard.state.director.quests[q.id].side,true);
  assert.equal(hard.state.director.quests[q.id].xp,D.rewards(2,2,'hard',null,true).xp);
});

test('after the books, the AI writes full adventures again',()=>{
  const s=hero({level:10,done:['bell',...Object.keys(QUESTS)]});
  s.story.nodeId='town-highpass';s.world.townId='highpass';
  const out=act(s,{type:'director-commission',draft:draft()});
  assert.equal(out.result.ok,true,out.result.error);
  const q=out.state.director.quests[out.result.questId];
  assert.equal(q.side,undefined);assert.deepEqual({xp:q.xp,gold:q.gold},D.rewards(10));
  assert.match(out.result.outcomeText,/New adventure/);
});

function playSideQuest(s){
  const made=act(s,{type:'director-commission',draft:draft()});s=made.state;const id=made.result.questId;
  s=act(s,{type:'depart',questId:id}).state;
  s=act(s,{type:'story-choice',choiceId:'investigate'}).state;
  s=act(s,{type:'story-choice',choiceId:'advance'}).state;
  s=act(s,{type:'story-choice',choiceId:'careful'}).state;
  s=act(s,{type:'story-choice',choiceId:'resolve'}).state;
  const done=act(s,{type:'story-choice',choiceId:'d1'});
  return {id,q:made.state.director.quests[id],done};
}

test('a side quest helps an under-levelled hero catch up, but stops at the chapter',()=>{
  // Road done, so the chapter is Fenmere (level 3); the hero is still level 2.
  const s=hero({level:2,xp:P.XP_NEXT[2]-50,done:['bell','road']});
  assert.equal(B.levelCap(s),QUESTS.marsh.level);assert.equal(B.behind(s),true);
  const caught=playSideQuest(s).done;
  assert.equal(caught.result.ok,true,caught.result.error);
  assert.equal(caught.state.player.level,QUESTS.marsh.level,'Caught up to the chapter.');
  assert.equal(caught.events.some(e=>/capped/.test(e.text)),false);
  // Nearly at the next level: the same quest stops one XP short of it.
  const near=hero({level:3,xp:P.XP_NEXT[3]-50,done:['bell','road']});
  const {id,done}=playSideQuest(near);
  assert.equal(done.state.player.level,QUESTS.marsh.level,'Never past the chapter.');
  assert.equal(done.state.player.xp,P.XP_NEXT[QUESTS.marsh.level]-1);
  assert.ok(done.state.world.completed[id].xp<D.rewards(3,3,'normal',null,true).xp,'The record shows what was actually paid.');
  assert.ok(done.events.some(e=>/capped/.test(e.text)));
});

test('a hero already at the chapter\'s level gets gold and story from a side quest, no XP',()=>{
  const s=hero({level:2,xp:P.XP_NEXT[2]-1});
  const made=act(s,{type:'director-commission',draft:draft()});
  assert.match(made.result.outcomeText,/pays no XP/);
  const {done}=playSideQuest(s);
  assert.equal(done.state.player.xp,P.XP_NEXT[2]-1);assert.equal(done.state.player.level,2);
  assert.ok(done.state.player.gold>s.player.gold);
});

test('steering climbs a ladder as the detour in one scene grows, and resets on a written choice',()=>{
  assert.deepEqual([0,3,4,5,6,7,8,20].map(B.steerLevel),[0,0,1,1,2,2,3,3]);
  const s=E.createNewGame({classId:'fighter'}),chat={};
  assert.equal(B.facts(s,chat).steering,B.STEERING[0]);
  for(let i=0;i<8;i++)B.countDetour(chat,s.story.nodeId);
  const f=B.facts(s,chat);
  assert.equal(f.running,true);assert.equal(f.detourTurnsThisScene,8);assert.equal(f.steering,B.STEERING[3]);
  assert.equal(B.detour(chat,'another-scene'),0,'A new scene starts fresh.');
  assert.deepEqual(B.normalizeDetour({node:'x',turns:999}),{node:'x',turns:50});
  assert.equal(B.normalizeDetour('junk'),null);
  const after=hero({level:10,done:['bell',...Object.keys(QUESTS)]});
  assert.equal(B.facts(after).running,false);
});

test('the director is told about the book',()=>{
  const p=JSON.parse(D.prompt(hero()));
  assert.equal(p.book.running,true);assert.equal(p.book.chapter,QUESTS.road.name);
  assert.match(D.SYSTEM,/SMALL side quest/);
});

test('what people will remember becomes a journal fact, success or not',()=>{
  const spit={intent:'spit on the bartender',skill:'',ability:'',difficulty:'trivial',success:'The bartender wipes his cheek slowly. Nobody serves you tonight.',failure:'',reward:'none',risk:'none',remembered:true};
  assert.equal(I.validate(spit).proposal.remembered,true);
  assert.equal(I.validate({...spit,remembered:'yes'}).proposal.remembered,false);
  const out=act(E.createNewGame({classId:'fighter'}),{type:'improvise',proposal:spit});
  assert.equal(out.result.ok,true,out.result.error);
  const reloaded=E.normalizeIncomingState(clone(out.state));
  assert.ok(I.journalFacts(reloaded).some(f=>/bartender/.test(f.title)&&/remember/.test(f.source)));
  assert.match(JSON.stringify(Journal.forPrompt(reloaded,4000)),/wipes his cheek/);
  assert.ok(I.PROPOSAL_SCHEMA.required.includes('remembered'));
});

async function claudeService(t,replies){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-book-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const calls=[];let i=0;
  const client={beta:{messages:{create:async body=>{calls.push(body);const text=replies[Math.min(i++,replies.length-1)];return {model:'claude-opus-5-5',stop_reason:'end_turn',content:[{type:'text',text}]};}}}};
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),claude:createClaudeProvider({clientFactory:()=>client})});
  await ai.save({enabled:true,provider:'claude'});
  return {ai,calls};
}
const blank={intent:'',skill:'',ability:'',difficulty:'trivial',success:'',failure:'',reward:'none',risk:'none',remembered:false};

test('chat (fake Claude) sees the book and counts talking turns as a detour',async t=>{
  const reply=JSON.stringify({kind:'dialogue',optionId:'',reply:'"Mind your manners," says the smith.',improvise:blank});
  const {ai,calls}=await claudeService(t,[reply]);
  let s=E.createNewGame({classId:'fighter'});
  for(let i=0;i<3;i++)s=(await Chat.resolveChat(s,{mode:'dialogue',text:'Tell me about your goat.'},ai,high)).state;
  assert.equal(s.chat.detour.turns,3);
  const ctx=JSON.parse(calls.at(-1).messages[0].content);
  assert.equal(ctx.book.running,true);assert.equal(ctx.book.chapter,'The Bell Beneath Briarwatch');assert.equal(ctx.book.detourTurnsThisScene,2);
  assert.match(calls[0].system[0].text,/book\.steering/);
  assert.equal(E.normalizeIncomingState(clone(s)).chat.detour.turns,3,'The count survives a reload.');
  // Questions are not a detour.
  s=(await Chat.resolveChat(s,{mode:'question',text:'What is the goat called?'},ai,high)).state;
  assert.equal(s.chat.detour.turns,3);
});

test('battle XP from an AI quest is capped the same way',()=>{
  const s=hero({level:2,xp:P.XP_NEXT[2]-1});
  const made=act(s,{type:'director-commission',draft:draft()});const id=made.result.questId;
  const state=made.state,events=[];
  const W=require('../src/world');
  assert.ok(XP.battleXp(2,ENCOUNTERS[`quest:${id}`].enemies.map(e=>ENEMIES[e])).xp>0);
  W.awardBattleXp(state,id,events,{awardXp:E.awardXp});
  assert.equal(state.player.xp,P.XP_NEXT[2]-1);
  assert.ok(events.some(e=>/capped/.test(e.text)));
});
