'use strict';
// Story arcs beyond the books (AI storyteller step 3): the engine paces each
// arc of Chronicle.ARC_LENGTH chapters; Claude names it and writes the chapters.
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine');
const C=require('../src/chronicle');
const D=require('../src/director');
const draft=require('./fixtures/director-draft');

const high=()=>0.999;
const clone=x=>JSON.parse(JSON.stringify(x));
const act=(s,action,rng=high)=>E.resolveAction(s,action,rng);
function hero({book=false}={}){
  const s=E.createNewGame({name:'Rhea',classId:'fighter'});
  s.world.completed.bell={day:1,quality:'force',method:'force',xp:300,gold:60};
  s.story.nodeId='town-briarwatch';s.world.townId='briarwatch';
  if(!book)s.story.flags['books:finished']=true;
  return E.normalizeIncomingState(s);
}
const chapter=(name,arc={})=>({...draft(),name,storyArc:{title:'The Drowned Debt',premise:'Who paid to flood the salt pans, and why?',nextHook:`After ${name}, a letter arrives.`,...arc}});
function commission(s,d){const out=act(s,{type:'director-commission',draft:d});assert.equal(out.result.ok,true,out.result.error);return out;}
function play(s,d){
  const made=commission(s,d);const id=made.result.questId;s=made.state;
  for(const step of [{type:'depart',questId:id},{type:'story-choice',choiceId:'investigate'},{type:'story-choice',choiceId:'advance'},{type:'story-choice',choiceId:'careful'},{type:'story-choice',choiceId:'resolve'},{type:'story-choice',choiceId:'d1'}])s=act(s,step).state;
  assert.ok(s.world.completed[id]);
  return {s,id,q:made.state.director.quests[id]};
}

test('beyond the books the first adventure opens an arc that Claude names',()=>{
  const s=hero();
  const p=JSON.parse(D.prompt(s));
  assert.deepEqual({status:p.storyArc.status,chapter:p.storyArc.chapter,of:p.storyArc.of,beat:p.storyArc.beat},{status:'new',chapter:1,of:C.ARC_LENGTH,beat:'opening'});
  assert.match(p.storyArc.guidance,/Open a new story arc/);
  const out=commission(s,chapter('The Salt Choir'));
  const q=out.state.director.quests[out.result.questId];
  assert.deepEqual({id:q.storyArc.id,title:q.storyArc.title,chapter:q.storyArc.chapter,of:q.storyArc.of,beat:q.storyArc.beat},{id:'arc-1',title:'The Drowned Debt',chapter:1,of:C.ARC_LENGTH,beat:'opening'});
  assert.match(out.result.outcomeText,/Story arc: The Drowned Debt, part 1 of 4/);
  assert.match(D.SYSTEM,/story arc/);assert.ok(D.SCHEMA.required.includes('storyArc'));
});

test('an arc runs opening, rising, turn and finale, then closes and a new one begins',()=>{
  let s=hero();const beats=[];
  for(let i=1;i<=C.ARC_LENGTH;i++){
    beats.push(JSON.parse(D.prompt(s)).storyArc.beat);
    s=play(s,chapter(`Chapter ${i}`,i>1?{title:'A New Name',premise:'Ignored'}:{})).s;
  }
  assert.deepEqual(beats,['opening','rising','turn','finale']);
  const c=s.chronicle;
  assert.equal(c.arc,null,'The finished arc is closed.');
  assert.equal(c.arcs.length,1);
  assert.equal(c.arcs[0].title,'The Drowned Debt','Claude cannot rename an arc after its first chapter.');
  assert.deepEqual(c.arcs[0].chapters,[1,2,3,4]);
  assert.match(c.arcs[0].ending,new RegExp(draft().decisions[0].label));
  assert.deepEqual(c.chapters.map(ch=>[ch.arc,ch.part,ch.parts]),[1,2,3,4].map(n=>['The Drowned Debt',n,4]));
  const next=JSON.parse(D.prompt(s)).storyArc;
  assert.equal(next.status,'new');assert.equal(next.beat,'opening');
  assert.equal(JSON.parse(D.prompt(s)).chronicle.finishedArcs[0].title,'The Drowned Debt');
  const second=commission(s,chapter('A Fresh Start',{title:'The Second Bell'}));
  assert.equal(second.state.director.quests[second.result.questId].storyArc.id,'arc-2');
});

test('a continuing arc tells Claude the story so far and the last hook',()=>{
  const {s}=play(hero(),chapter('The Salt Choir'));
  const p=JSON.parse(D.prompt(s)).storyArc;
  assert.equal(p.status,'continuing');assert.equal(p.chapter,2);assert.equal(p.title,'The Drowned Debt');
  assert.equal(p.lastHook,'After The Salt Choir, a letter arrives.');
  assert.deepEqual(p.chaptersSoFar.map(c=>c.title),['The Salt Choir']);
});

test('a dismissed first chapter lets the next draft rename the arc; later chapters cannot',()=>{
  const first=commission(hero(),chapter('Dropped',{title:'First Try'}));
  const gone=act(first.state,{type:'director-dismiss',questId:first.result.questId});
  const again=commission(gone.state,chapter('Kept',{title:'Second Try'}));
  assert.equal(again.state.director.quests[again.result.questId].storyArc.title,'Second Try');
  assert.equal(again.state.chronicle.arc.id,'arc-1','Still the first arc.');
});

test('side quests during the books and job trials are not arc chapters',()=>{
  const s=hero({book:true});
  assert.equal(JSON.parse(D.prompt(s)).storyArc,undefined);
  const out=commission(s,chapter('A Small Favour'));
  assert.equal(out.state.director.quests[out.result.questId].storyArc,undefined);
  assert.equal(out.state.chronicle.arc,null);
  const trial=D.bound({...hero(),trial:'third',arcTag:{id:'arc-1',title:'T',chapter:1,of:4}},chapter('A Trial'));
  assert.equal(trial.ok,true);assert.equal(trial.quest.storyArc,undefined,'A job trial stands on its own.');
});

test('the Journal shows the arc in progress and each finished arc',()=>{
  let {s}=play(hero(),chapter('The Salt Choir'));
  let j=E.buildView(s).journal;
  const lead=j.leads.find(l=>/^Story arc:/.test(l.title));
  assert.equal(lead.title,'Story arc: The Drowned Debt');assert.equal(lead.status,'part 2 of 4 next');
  assert.match(lead.text,/Next: After The Salt Choir/);
  assert.match(j.chronicle.find(c=>c.id==='chronicle:1').source,/^The Drowned Debt, part 1 of 4\./);
  for(let i=2;i<=C.ARC_LENGTH;i++)s=play(s,chapter(`Chapter ${i}`)).s;
  j=E.buildView(s).journal;
  const done=j.chronicle.find(c=>c.id==='arc-done:1');
  assert.equal(done.title,'Story arc 1: The Drowned Debt');assert.equal(done.status,'arc complete');
  assert.match(done.text,/How it ended/);
  assert.doesNotMatch(done.text,/\.\.$/,'An ending that already ends a sentence gets no second full stop.');
  assert.equal(j.leads.some(l=>/^Story arc:/.test(l.title)),false);
});

test('arcs survive a reload, and edited arcs and tags are re-checked',()=>{
  const {s}=play(hero(),chapter('The Salt Choir'));
  const r=E.normalizeIncomingState(clone(s));
  assert.deepEqual(r.chronicle.arc,s.chronicle.arc);
  const t=clone(s);t.chronicle.arc.done=99;t.chronicle.arc.length=4;
  assert.equal(E.normalizeIncomingState(t).chronicle.arc,null,'An impossible arc is dropped.');
  const open=commission(s,chapter('Part Two'));const id=open.result.questId;
  const u=clone(open.state);Object.assign(u.director.quests[id].storyArc,{beat:'finale',chapter:9,of:4});
  const tag=E.normalizeIncomingState(u).director.quests[id].storyArc;
  assert.deepEqual({chapter:tag.chapter,of:tag.of,beat:tag.beat},{chapter:4,of:4,beat:'finale'},'The beat always follows the chapter number.');
  const bad=clone(open.state);bad.director.quests[id].storyArc={id:'evil',title:'x'};
  assert.equal(E.normalizeIncomingState(bad).director.quests[id].storyArc,undefined);
});
