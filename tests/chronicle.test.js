'use strict';
// The chronicle: the hero's own story, recorded chapter by chapter (src/chronicle.js).
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
const story=(extra={})=>({...draft(),
  cast:[{name:'Mother Halloran',role:'Keeper of the drowned shrine',wants:'the names of the dead spoken aloud',status:'alive',attitude:'neutral'},
    {name:'Guildmaster Pell',role:'Head of the salt guild',wants:'the flood kept quiet',status:'alive',attitude:'hostile'}],
  places:[{name:'The Salt Pans',note:'Flooded saltworks east of Ashford.'}],
  threadsOpened:['Someone paid the guild to flood the pans.'],threadsClosed:[],...extra});
// Commission an AI adventure from this draft, play it peacefully and choose decision d1.
function play(s,d=story(),choice='d1'){
  const made=act(s,{type:'director-commission',draft:d});assert.equal(made.result.ok,true,made.result.error);
  const id=made.result.questId;s=made.state;
  for(const step of [{type:'depart',questId:id},{type:'story-choice',choiceId:'investigate'},{type:'story-choice',choiceId:'advance'},{type:'story-choice',choiceId:'careful'},{type:'story-choice',choiceId:'resolve'},{type:'story-choice',choiceId:choice}])s=act(s,step).state;
  assert.ok(s.world.completed[id],'The adventure is complete.');
  return {s,id};
}

test('a new game has an empty chronicle that survives a save and reload',()=>{
  const s=E.createNewGame({classId:'fighter'});
  assert.deepEqual(s.chronicle,{version:1,count:0,earlier:'',chapters:[],cast:[],places:[],threads:[],arc:null,arcs:[],arcCount:0});
  assert.deepEqual(E.normalizeIncomingState(clone(s)).chronicle,s.chronicle);
  assert.equal(C.forPrompt(s),null,'Nothing to tell the AI yet.');
});

test('a finished AI adventure becomes a chapter with the choice, people, places and threads',()=>{
  const {s,id}=play(hero());
  const c=s.chronicle;
  assert.equal(c.count,1);assert.equal(c.chapters.length,1);
  const ch=c.chapters[0];
  assert.equal(ch.id,id);assert.equal(ch.n,1);assert.equal(ch.title,'The Salt Choir');assert.equal(ch.kind,'adventure');
  assert.equal(ch.outcome,'resolved without a fight');
  assert.equal(ch.choice,draft().decisions[0].label);assert.equal(ch.consequence,draft().decisions[0].text);
  assert.deepEqual(c.cast.map(p=>[p.name,p.attitude,p.first]),[['Mother Halloran','neutral',1],['Guildmaster Pell','hostile',1]]);
  assert.deepEqual(c.places.map(p=>p.name),['The Salt Pans']);
  assert.deepEqual(c.threads.map(t=>[t.text,t.status]),[['Someone paid the guild to flood the pans.','open']]);
  // Replaying the completion path never records the chapter twice.
  assert.equal(C.record(s,D.quest(s,id)),null);assert.equal(s.chronicle.chapters.length,1);
});

test('the Journal shows the story so far, the people met and open threads',()=>{
  const {s}=play(hero());
  const j=E.buildView(s).journal;
  assert.equal(j.chronicle.length,1);
  assert.match(j.chronicle[0].title,/^Chapter 1: The Salt Choir$/);assert.equal(j.chronicle[0].status,'adventure');
  assert.match(j.chronicle[0].text,/You chose: Name the guild/);
  const pell=j.relationships.find(r=>r.title==='Guildmaster Pell');
  assert.equal(pell.status,'hostile');assert.match(pell.text,/salt guild/);
  assert.ok(j.leads.some(l=>l.title==='Open thread'&&/paid the guild/.test(l.text)));
});

test('a later adventure brings people back, changes their fate and closes threads',()=>{
  let {s}=play(hero());
  s=play(s,story({name:'The Guildmaster\'s Ledger',
    cast:[{name:'guildmaster pell',role:'Disgraced former guildmaster',wants:'revenge',status:'dead',attitude:'hostile'}],
    places:[{name:'The Salt Pans',note:'Drained and quiet now.'}],
    threadsOpened:['Pell\'s ledger names a buyer in Highpass.'],threadsClosed:['Someone paid the guild to flood the pans.']})).s;
  const c=s.chronicle;
  assert.equal(c.chapters.length,2);assert.equal(c.chapters[1].n,2);
  const pell=c.cast.filter(p=>p.name.toLowerCase()==='guildmaster pell');
  assert.equal(pell.length,1,'Same person, matched by name.');
  assert.equal(pell[0].status,'dead');assert.equal(pell[0].first,1);assert.equal(pell[0].last,2);
  assert.equal(c.places.length,1);assert.equal(c.places[0].note,'Drained and quiet now.');
  assert.deepEqual(c.threads.map(t=>[t.text,t.status]),[['Someone paid the guild to flood the pans.','closed'],['Pell\'s ledger names a buyer in Highpass.','open']]);
  assert.equal(E.buildView(s).journal.relationships.find(r=>r.title==='Guildmaster Pell').status,'dead');
});

test('the AI reads the chronicle before writing the next adventure',()=>{
  const {s}=play(hero());
  const p=JSON.parse(D.prompt(s));
  assert.equal(p.chronicle.latestChapters[0].title,'The Salt Choir');
  assert.equal(p.chronicle.latestChapters[0].choice,draft().decisions[0].label);
  assert.ok(p.chronicle.cast.some(c=>c.name==='Guildmaster Pell'&&c.attitude==='hostile'));
  assert.deepEqual(p.chronicle.openThreads,['Someone paid the guild to flood the pans.']);
  assert.match(D.SYSTEM,/chronicle/);
  for(const field of ['cast','places','threadsOpened','threadsClosed'])assert.ok(D.SCHEMA.required.includes(field));
});

test('side quests during the books are chapters too',()=>{
  const {s}=play(hero({book:true}));
  assert.equal(s.chronicle.chapters[0].kind,'side quest');
});

test('old chapters are condensed, never dropped',()=>{
  const s=E.createNewGame({classId:'fighter'});
  s.chronicle.chapters=Array.from({length:C.MAX_CHAPTERS},(_,i)=>({id:`ai-${i+1}-aaaaaaa`,n:i+1,title:`Chapter title ${i+1}`,kind:'adventure',day:i+1,level:12,choice:`Choice ${i+1}`}));
  s.chronicle.count=C.MAX_CHAPTERS;
  const t=E.normalizeIncomingState(clone(s));
  t.world.completed['ai-99-bbbbbbb']={day:50,quality:'force'};
  const ch=C.record(t,{id:'ai-99-bbbbbbb',generated:true,name:'One More',level:12,decisions:[]});
  assert.equal(ch.n,C.MAX_CHAPTERS+1);
  assert.equal(t.chronicle.chapters.length,C.MAX_CHAPTERS);
  assert.equal(t.chronicle.chapters[0].n,2);
  assert.match(t.chronicle.earlier,/^Chapter 1, Chapter title 1: Choice 1\.$/);
  assert.equal(E.normalizeIncomingState(clone(t)).chronicle.earlier,t.chronicle.earlier);
});

test('an edited chronicle is cleaned on load',()=>{
  const s=E.createNewGame({classId:'fighter'});
  s.chronicle={chapters:[{id:'ai-1-aaaaaaa',n:1,title:'X'.repeat(500),kind:'legend',level:999},{nope:true}],
    cast:[{name:'Ada',status:'immortal',attitude:'worshipful',role:'R'.repeat(900)},{name:'ada'},{name:''}],
    threads:['ok then',{text:'closed one',status:'closed'},42],earlier:7};
  const c=E.normalizeIncomingState(clone(s)).chronicle;
  assert.equal(c.chapters.length,1);assert.equal(c.chapters[0].title.length,80);assert.equal(c.chapters[0].kind,'adventure');assert.equal(c.chapters[0].level,100);
  assert.deepEqual(c.cast.map(p=>[p.name,p.status,p.attitude,p.role.length]),[['Ada','alive','neutral',160]]);
  assert.deepEqual(c.threads.map(t=>t.status),['closed','open']);
  assert.equal(c.earlier,'');
});

test('saves from before the chronicle are rebuilt from their stored AI adventures',()=>{
  const {s,id}=play(hero());
  const old=clone(s);delete old.chronicle;
  const c=E.normalizeIncomingState(old).chronicle;
  assert.equal(c.chapters.length,1);assert.equal(c.chapters[0].id,id);assert.equal(c.chapters[0].choice,draft().decisions[0].label);
  assert.ok(c.cast.some(p=>p.name==='Guildmaster Pell'));
});
