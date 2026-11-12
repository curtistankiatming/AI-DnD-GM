'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const E=require('../src/engine');
const D=require('../src/director');
const Chat=require('../src/chat-runtime');
const {QUESTS}=require('../src/expansion');
const {createLocalAI}=require('../src/local-ai');
const {createClaudeProvider}=require('../src/claude-ai');
const draft=require('./fixtures/director-draft');
const XP=require('../src/xp');
const {ENCOUNTERS,ENEMIES}=require('../src/content');

const high=()=>0.999;
const clone=x=>JSON.parse(JSON.stringify(x));
// A party back in Briarwatch after the opening chapter. These tests cover full
// AI adventures, which are written once the books are finished, so the save is
// marked as past the written story; tests/book.test.js covers side quests.
function inTown(level=1,{book=false}={}){
  const s=E.createNewGame({name:'Rhea',classId:'fighter'});
  s.world.completed.bell={day:1,quality:'force',method:'force',xp:300,gold:60};
  if(!book)s.story.flags['books:finished']=true;
  s.story.nodeId='town-briarwatch';s.world.townId='briarwatch';
  if(level>1){s.player.level=level;s.player.xp=1100;}
  return E.normalizeIncomingState(s);
}
const act=(s,action,rng=high)=>E.resolveAction(s,action,rng);
const commission=(s,d=draft())=>act(s,{type:'director-commission',draft:d});

test('the schema is strict and complete for structured output',()=>{
  const walk=o=>{if(o.type==='object'){assert.equal(o.additionalProperties,false);assert.deepEqual([...o.required].sort(),Object.keys(o.properties).sort());Object.values(o.properties).forEach(walk);}if(o.type==='array')walk(o.items);};
  walk(D.SCHEMA);
  assert.doesNotMatch(JSON.stringify(D.SCHEMA),/"(xp|gold|dc|level|hp)"/,'Claude is never asked for numbers.');
});

test('the engine sets every number; the draft only supplies story and skill choices',()=>{
  const out=commission(inTown(2));
  assert.equal(out.result.ok,true,out.result.error);
  const q=out.state.director.quests[out.result.questId];
  assert.match(q.id,/^ai-1-[a-z0-9]{7}$/);
  assert.equal(q.level,2);assert.deepEqual({xp:q.xp,gold:q.gold},D.rewards(2));
  assert.deepEqual(q.route.alt,['survival'],'Unknown skills are dropped.');
  assert.deepEqual(q.route.tools,['lantern'],'Only real tools are kept.');
  assert.equal(q.nextTown,'briarwatch','A locked town cannot be opened early.');
  assert.deepEqual(q.decisions.map(d=>d.rep),[{wardens:2,trade:1},{trade:2}]);
  assert.equal(out.state.director.arc,draft().arc);
  const card=out.view.world.quests.find(c=>c.id===q.id);
  assert.equal(card.generated,true);assert.equal(card.canDepart,true);
  assert.equal(out.view.world.director.canCommission,false,'One open director adventure at a time.');
});

test('invalid drafts change nothing',()=>{
  const s=inTown();
  for(const bad of [null,[],{...draft(),name:''},{...draft(),investigate:{...draft().investigate,skill:'hacking'}},{...draft(),decisions:[draft().decisions[0]]}]){
    const out=commission(clone(s),bad);
    assert.equal(out.result.ok,false);assert.deepEqual(out.state.director.quests,{});
  }
});

test('the director only works from a town after the opening chapter, outside combat',()=>{
  const start=E.createNewGame({classId:'fighter'});
  assert.match(commission(start).result.error,/bell investigation/);
  const s=inTown();s.world.completed.bell=undefined;delete s.world.completed.bell;
  assert.equal(commission(s).result.ok,false);
  const away=inTown();away.story.nodeId='forest-edge';
  assert.match(commission(E.normalizeIncomingState(away)).result.error,/from a town/);
});

test('a generated adventure plays start to finish through the normal engine',()=>{
  let s=commission(inTown(2)).state;const id=Object.keys(s.director.quests)[0];const q=s.director.quests[id];
  const xp=s.player.xp,gold=s.player.gold,rep={...s.world.reputation};
  s=act(s,{type:'depart',questId:id}).state;assert.equal(s.story.nodeId,`q-${id}-start`);
  s=clone(s);// Survives a save/reload mid-adventure.
  s=act(s,{type:'story-choice',choiceId:'investigate'}).state;assert.ok(s.story.clues.includes(`${id}-evidence`));
  s=act(s,{type:'story-choice',choiceId:'advance'}).state;assert.equal(s.story.nodeId,`q-${id}-approach`);
  s=act(s,{type:'story-choice',choiceId:'careful'}).state;assert.equal(s.story.nodeId,`q-${id}-crisis`);
  s=act(s,{type:'story-choice',choiceId:'resolve'}).state;assert.equal(s.story.nodeId,`q-${id}-after`);
  const done=act(clone(s),{type:'story-choice',choiceId:'d1'});s=done.state;
  assert.equal(done.result.ok,true);assert.equal(s.story.nodeId,'town-briarwatch');
  assert.equal(s.world.completed[id].quality,'peaceful');
  // A peaceful resolution pays the quest and the same battle XP as winning the fight.
  const battle=XP.battleXp(2,ENCOUNTERS[`quest:${id}`].enemies.map(e=>ENEMIES[e]),q.tier);
  assert.ok(battle.xp>0);assert.ok(done.events.some(e=>/without a fight/.test(e.text)));
  assert.equal(s.player.xp-xp,q.xp+battle.xp);assert.equal(s.player.gold-gold,q.gold);
  assert.equal(s.world.reputation.wardens-rep.wardens,2);assert.equal(s.world.reputation.trade-rep.trade,1);
  assert.ok(s.journal.facts.some(f=>f.id===`decision:${id}:d1`));
  assert.ok(s.journal.completed.some(c=>c.title==='The Salt Choir'));
  assert.equal(done.view.world.director.canCommission,true,'A finished adventure frees the board for the next one.');
});

test('a fight-side resolution starts the generated encounter with engine-built enemies',()=>{
  let s=commission(inTown(3)).state;const id=Object.keys(s.director.quests)[0];
  s=act(s,{type:'depart',questId:id}).state;
  s=act(s,{type:'story-choice',choiceId:'advance'}).state;
  s=act(s,{type:'story-choice',choiceId:'direct'}).state;
  const out=act(s,{type:'story-choice',choiceId:'confront'});
  assert.equal(out.state.combat.active,true);
  const foe=out.state.combat.actors.find(e=>e.name==='The Drowned Cantor');
  assert.ok(foe);assert.ok(foe.maxHp<=22+3*6+1,'Foe strength comes from the level formula.');
  assert.equal(out.state.combat.objective.questId,id);
});

test('edited saves are re-bounded on load and other saves never see the adventure',()=>{
  const s=commission(inTown(2)).state;const id=Object.keys(s.director.quests)[0];
  const t=clone(s);Object.assign(t.director.quests[id],{xp:999999,gold:999999,level:10});
  t.director.quests[id].decisions[0].rep={wardens:50};
  const n=E.normalizeIncomingState(t).director.quests[id];
  assert.deepEqual({xp:n.xp,gold:n.gold},D.rewards(10),'Rewards are recomputed from the stored level.');
  assert.deepEqual(n.decisions[0].rep,{wardens:2});
  const bad=clone(s);bad.director.quests.evil={...bad.director.quests[id],id:'evil'};
  assert.equal(E.normalizeIncomingState(bad).director.quests.evil,undefined,'Ids must be director ids.');
  const other=inTown(2);
  assert.equal(E.buildView(other).world.quests.some(q=>q.generated),false);
  assert.equal(QUESTS[id],undefined,'Generated adventures never enter the authored catalog.');
});

test('a new game already has its director record, so a save and reload is unchanged',()=>{
  const s=E.createNewGame({classId:'fighter'});assert.deepEqual(s.director,{version:1,count:0,arc:'',quests:{}});
  assert.deepEqual(E.normalizeIncomingState(clone(s)).director,s.director);
});

test('an unstarted adventure can be dismissed; a started one cannot',()=>{
  let s=commission(inTown()).state;const id=Object.keys(s.director.quests)[0];
  const gone=act(clone(s),{type:'director-dismiss',questId:id});
  assert.equal(gone.result.ok,true);assert.deepEqual(gone.state.director.quests,{});
  s=act(s,{type:'depart',questId:id}).state;
  assert.equal(act(s,{type:'director-dismiss',questId:id}).result.ok,false);
});

test('the prompt carries the story so far and the player wish, not secrets',()=>{
  const s=commission(inTown()).state;
  const p=JSON.parse(D.prompt(s,{hint:'a rival from my past',journal:'J',instructions:'No spiders.'}));
  assert.equal(p.request,'a rival from my past');assert.equal(p.preferences,'No spiders.');
  assert.equal(p.arc,draft().arc);assert.ok(p.completedAdventures.some(c=>c.name==='The Bell Beneath Briarwatch'));
  assert.equal(p.hero.name,'Rhea');
});

async function claudeService(t,replies,provider='claude'){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-director-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const calls=[];let i=0;
  const client={beta:{messages:{create:async body=>{calls.push(body);const text=replies[Math.min(i++,replies.length-1)];return {model:'claude-opus-5-5',stop_reason:'end_turn',content:[{type:'text',text}]};}}}};
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),claude:createClaudeProvider({clientFactory:()=>client})});
  await ai.save(provider==='claude'?{enabled:true,provider:'claude'}:{enabled:true,provider:'local',model:'m'});
  return {ai,calls};
}

test('/adventure asks Claude (fake client) once and puts the bounded adventure on the board',async t=>{
  const {ai,calls}=await claudeService(t,[JSON.stringify(draft())]);
  const out=await Chat.resolveChat(inTown(),{mode:'action',text:'/adventure something with salt'},ai,high);
  assert.equal(out.result.ok,true,out.result.error);assert.equal(out.narration.source,'ai-director');
  assert.equal(calls.length,1);assert.equal(calls[0].output_config.format.schema,D.SCHEMA);
  assert.equal(calls[0].output_config.effort,'medium');assert.equal(calls[0].system[0].text,D.SYSTEM);
  assert.match(calls[0].messages[0].content,/something with salt/);
  assert.equal(Object.keys(out.state.director.quests).length,1);
  const again=await Chat.resolveChat(out.state,{mode:'action',text:'/adventure'},ai,high);
  assert.equal(again.result.ok,false);assert.equal(calls.length,1,'No paid call when the board is full.');
});

test('/adventure refuses without Claude and on unreadable output',async t=>{
  const local=await claudeService(t,['{}'],'local');
  const off=await Chat.resolveChat(inTown(),{mode:'action',text:'/adventure'},local.ai,high);
  assert.equal(off.result.ok,false);assert.match(off.narration.text,/Claude AI game master/);
  const {ai}=await claudeService(t,['not json']);
  const bad=await Chat.resolveChat(inTown(),{mode:'action',text:'/adventure'},ai,high);
  assert.equal(bad.result.ok,false);assert.deepEqual(bad.state.director.quests,{});
});
