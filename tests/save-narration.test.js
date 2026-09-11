'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine'),Chat=require('../src/chat-runtime'),N=require('../src/narrator');
const {createClient,makeSandbox}=require('../src/public-preview');
const copy=x=>JSON.parse(JSON.stringify(x));
function storage(){const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
const mechanics=s=>copy(Object.fromEntries(['player','party','story','world','combat','chat','turnCount','logs'].map(k=>[k,s[k]])));
async function courier(){let s=E.createNewGame();s=(await Chat.resolveChat(s,{text:'/instructions A hopeful mystery.'})).state;s=(await Chat.resolveChat(s,{text:'/scenario'})).state;s=(await Chat.resolveChat(s,{text:'courier:aid'})).state;return (await Chat.resolveChat(s,{confirm:true})).state;}
async function call(c,route,body){const res=await c.request(route,body?{method:'POST',body:JSON.stringify(body)}:{});assert.equal(res.ok,true);return res.json();}

test('export/import preserves the exact final presentation and all campaign mechanics',async()=>{
  const c=createClient(storage()),s=await courier(),before=mechanics(s),out=c.importText(c.exportText(s));
  assert.equal(out.narration.text,s.lastNarration);assert.equal(out.narration.source,'save');assert.deepEqual(mechanics(out.state),before);assert.deepEqual(out.events,[]);
});
test('named loading and repeated loading are non-actions, not new rewards',async()=>{
  const c=createClient(storage()),s=await courier();await call(c,'/api/session/save',{state:s,slot:'courier-finished'});
  for(let n=0;n<3;n++){const out=await call(c,'/api/session/load?slot=courier-finished');assert.equal(out.narration.text,s.lastNarration);assert.deepEqual(mechanics(out.state),mechanics(s));}
});
test('normal autosave retains final narration while a separate sandbox is used',async()=>{
  const c=createClient(storage());let out=await call(c,'/api/session/new',{classId:'fighter'});
  for(const request of [{text:'/scenario'},{text:'courier:aid'},{confirm:true}])out=await call(c,'/api/chat',{state:out.state,request});
  const before=copy(out);await call(c,'/api/test/start',{classId:'wizard',level:10,questId:'trial'});
  const normal=await call(c,'/api/session/load?slot=autosave');assert.equal(normal.narration.text,before.narration.text);assert.deepEqual(mechanics(normal.state),mechanics(before.state));
  const sandbox=await call(c,'/api/session/load?slot=sandbox-autosave');assert.match(sandbox.narration.text,/SANDBOX/);assert.equal(sandbox.state.player.level,10);
});
test('saved AI prose is labelled saved, not as a fresh live model answer',async()=>{
  const s=await courier(),c=createClient(storage());s.lastNarration='The ferry drifts free.\nThe party waits on the pier.';
  const out=c.importText(c.exportText(s));assert.equal(out.narration.text,s.lastNarration);assert.equal(out.narration.source,'save');assert.equal(out.narration.model,null);
});
test('pending confirmation stays pending on load without resolving an action',async()=>{
  let s=(await Chat.resolveChat(E.createNewGame(),{text:'/scenario'})).state;s=(await Chat.resolveChat(s,{text:'courier:aid'})).state;
  const c=createClient(storage()),out=c.importText(c.exportText(s));assert.match(out.narration.text,/Confirm below/);assert.equal(out.state.player.xp,0);assert.equal(out.state.chat.courier.resolved,false);assert.deepEqual(out.state.chat.pending,s.chat.pending);
});
test('missing narration uses a labelled current courier recap instead of stale village text',async()=>{
  const s=await courier(),c=createClient(storage());delete s.lastNarration;s.story.lastOutcome={text:'STALE_VILLAGE_OPENING'};
  const out=c.importText(c.exportText(s));assert.equal(out.narration.source,'save-recap');assert.match(out.narration.text,/Saved-game recap:.*courier side story is resolved/i);assert.match(out.narration.text,/courier leaves safely/i);assert.doesNotMatch(out.narration.text,/STALE_VILLAGE/);assert.equal(out.state.player.xp,40);
});
test('old compatible saves without chat or narration get a current objective recap',()=>{
  const s=makeSandbox({level:5});delete s.chat;delete s.lastNarration;const c=createClient(storage()),out=c.importText(c.exportText(s));
  assert.equal(out.narration.source,'save-recap');assert.match(out.narration.text,/level 5/);assert.match(out.narration.text,/Current objective:/);assert.equal(out.state.chat.instructions,'');
});
test('restored combat recap reports current opponents and never applies an attack',()=>{
  const s=E.resolveAction(E.createNewGame({classId:'wizard'}),{type:'practice'},()=>0.99).state;delete s.lastNarration;
  const before=mechanics(s),c=createClient(storage()),out=c.importText(c.exportText(s));assert.match(out.narration.text,/Combat round 1/);assert.match(out.narration.text,/Guild Training Echo/);assert.deepEqual(mechanics(out.state),before);
});
test('malformed import does not replace an existing named save',async()=>{
  const c=createClient(storage()),s=await courier();await call(c,'/api/session/save',{state:s,slot:'safe'});assert.throws(()=>c.importText('{'));
  const out=await call(c,'/api/session/load?slot=safe');assert.equal(out.narration.text,s.lastNarration);assert.deepEqual(mechanics(out.state),mechanics(s));
});
test('presentation helper does not mutate state or require a model',async()=>{
  const s=await courier(),before=copy(s);assert.equal(N.savedNarration(s,E.buildView(s)).text,s.lastNarration);assert.deepEqual(s,before);
});
