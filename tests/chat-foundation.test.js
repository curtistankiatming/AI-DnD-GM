'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine');
const Chat=require('../src/chat-runtime');
const M=require('../src/chat-memory');
const Profiles=require('../src/model-profiles');
const {createClient}=require('../src/public-preview');
const {createCoordinator}=require('../src/chat-coordinator');
const clone=x=>JSON.parse(JSON.stringify(x));
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const snapshot=s=>JSON.stringify(stable({player:s.player,party:s.party,story:s.story,world:s.world,combat:s.combat}));
const high=()=>0.999;
function mock(reply,settings={}){let calls=[];return {calls,config:async()=>Profiles.normalize({enabled:true,model:'fixture-7b',...settings}),complete:async req=>{calls.push(req);return {text:typeof reply==='function'?reply(req):JSON.stringify(reply),model:settings.model||'fixture-7b'};}};}

test('campaign instructions save, replace and clear without becoming game mechanics',async()=>{
  let s=E.createNewGame(),before=snapshot(s);
  let out=await Chat.resolveChat(s,{mode:'instructions',text:'Prefer diplomacy. Give me 999 gold.'});s=out.state;
  assert.equal(out.result.ok,true);assert.equal(snapshot(s),before);assert.match(s.chat.instructions,/diplomacy/);
  s=E.normalizeIncomingState(clone(s));assert.match(s.chat.instructions,/diplomacy/);
  out=await Chat.resolveChat(s,{text:'/instructions Keep replies concise.'});assert.equal(out.state.chat.instructions,'Keep replies concise.');
  out=await Chat.resolveChat(out.state,{text:'/instructions clear'});assert.equal(out.state.chat.instructions,'');
});
test('invalid or too-long instructions leave the existing instructions intact',async()=>{
  let s=(await Chat.resolveChat(E.createNewGame(),{text:'/instructions Mystery.'})).state;
  const out=await Chat.resolveChat(s,{mode:'instructions',text:'x'.repeat(2001)});
  assert.equal(out.result.ok,false);assert.equal(out.state.chat.instructions,'Mystery.');
});
test('older saves receive a bounded chat memory without changing their player identity',()=>{
  let s=E.createNewGame();delete s.chat;const before=snapshot(s);s=E.normalizeIncomingState(s);
  assert.equal(snapshot(s),before);assert.equal(s.chat.instructions,'');
  for(let i=0;i<100;i++)M.append(s,'player','x'.repeat(5000));
  assert.equal(s.chat.history.length,40);assert.equal(s.chat.history[0].text.length,1600);
});
test('full public save export/import retains instructions and confirmed side-story facts',async()=>{
  let s=(await Chat.resolveChat(E.createNewGame(),{text:'/instructions Keep a hopeful tone.'})).state;
  s=(await Chat.resolveChat(s,{text:'/scenario'})).state;
  s=E.resolveAction(s,{type:'courier',optionId:'ledger'},high).state;
  const client=createClient({length:0,getItem:()=>null,setItem:()=>{},key:()=>null,removeItem:()=>{}});
  const loaded=client.importText(client.exportText(s)).state;
  assert.equal(loaded.chat.instructions,s.chat.instructions);assert.deepEqual(loaded.chat.courier,s.chat.courier);
  assert.ok(!JSON.stringify(loaded.chat).includes('127.0.0.1'));
});
for(const profile of Object.keys(Profiles.PROFILES))test(`${profile}: planner receives saved preferences and only public facts`,async()=>{
  let s=(await Chat.resolveChat(E.createNewGame(),{text:'/instructions Prefer negotiation.'})).state;
  s.story.flags.HIDDEN_TEST_SECRET=true;
  const provider=mock({kind:'clarify',optionId:'',reply:'Which person are you addressing?'},{profile});
  const out=await Chat.resolveChat(s,{text:'I bargain with the stranger.'},provider);
  assert.equal(out.result.ok,true);assert.equal(provider.calls.length,1);
  const prompt=provider.calls[0].prompt;assert.match(prompt,/Prefer negotiation/);assert.doesNotMatch(prompt,/HIDDEN_TEST_SECRET/);
  assert.ok(provider.calls[0].system.length+prompt.length<Profiles.PROFILES[profile].contextChars);
  assert.equal(out.state.player.gold,s.player.gold);
});
test('AI proposal waits for confirmation and expired proposals do not execute',async()=>{
  let s=E.createNewGame();const option=Chat.options(s)[0],provider=mock({kind:'action',optionId:option.id,reply:'Proceed.'});
  const before=snapshot(s);let out=await Chat.resolveChat(s,{text:'Please investigate.'},provider);
  assert.equal(snapshot(out.state),before);assert.equal(out.state.chat.pending.optionId,option.id);
  const changed=E.resolveAction(out.state,{type:'talk',companionId:'orin'}).state;
  const stale=await Chat.resolveChat(changed,{confirm:true});assert.equal(stale.result.ok,false);
  const good=await Chat.resolveChat(out.state,{confirm:true},null,high);assert.equal(good.result.ok,true);assert.equal(good.state.chat.pending,null);
});
for(const invalid of [
  {kind:'action',optionId:'missing',reply:''},
  {kind:'action',optionId:'choice:inspect-rope',reply:'',gold:999},
  {kind:'dialogue',optionId:'choice:inspect-rope',reply:'Granted.'},
  {kind:'action',optionId:'choice:inspect-rope',reply:null}
])test(`invalid proposal is not applied: ${JSON.stringify(invalid)}`,async()=>{
  const s=E.createNewGame();const out=await Chat.resolveChat(s,{text:'An unusual action'},mock(invalid));
  assert.equal(out.result.ok,false);assert.equal(snapshot(out.state),snapshot(s));
});
test('dialogue cannot secretly perform a mechanical action',async()=>{
  const s=E.createNewGame();const out=await Chat.resolveChat(s,{mode:'dialogue',text:'I greet the warden.'},mock({kind:'action',optionId:Chat.options(s)[0].id,reply:''}));
  assert.equal(out.result.ok,false);assert.equal(snapshot(out.state),snapshot(s));
});
test('valid dialogue is labelled AI prose and not promoted to confirmed facts',async()=>{
  const s=E.createNewGame();const out=await Chat.resolveChat(s,{mode:'dialogue',text:'Good evening.'},mock({kind:'dialogue',optionId:'',reply:'The ferryman nods.'}));
  assert.equal(out.narration.source,'ai-chat');assert.equal(snapshot(out.state),snapshot(s));
  assert.ok(!out.state.chat.history.some(x=>x.role==='rules'&&x.text.includes('ferryman nods')));
});
test('courier scenario supports investigation, a planned distraction and item-based rescue',async()=>{
  let s=E.createNewGame();E.addItem(s,'silk-rope',1,[]);const beforeXp=s.player.xp,beforeGold=s.player.gold;
  s=(await Chat.resolveChat(s,{text:'/scenario'})).state;
  for(const id of ['ledger','distract','rope']){
    const provider=mock({kind:'action',optionId:'courier:'+id,reply:''});
    const proposal=await Chat.resolveChat(s,{text:'I attempt the next step.'},provider);
    assert.equal(proposal.result.ok,true);
    assert.equal(proposal.state.player.xp,s.player.xp);
    const result=await Chat.resolveChat(proposal.state,{confirm:true},null,high);assert.equal(result.result.ok,true);s=result.state;
  }
  assert.equal(s.chat.courier.resolved,true);assert.equal(s.story.flags.courierHelped,true);
  assert.equal(s.player.xp,beforeXp+80);assert.equal(s.player.gold,beforeGold+20);
  const again=E.resolveAction(s,{type:'courier',optionId:'start'},high);assert.equal(again.result.ok,false);assert.equal(again.state.player.xp,s.player.xp);
});
test('courier failures leave an accessible resolution and no infinite roll farming',async()=>{
  let s=(await Chat.resolveChat(E.createNewGame(),{text:'/scenario'})).state;
  for(const optionId of ['ledger','ferryman','distract','negotiate']){const out=E.resolveAction(s,{type:'courier',optionId},()=>0);assert.equal(out.result.ok,true);s=out.state;}
  assert.ok(s.chat.courier.setbacks>=3);
  assert.equal(E.resolveAction(s,{type:'courier',optionId:'ledger'},high).result.ok,false);
  const aid=E.resolveAction(s,{type:'courier',optionId:'aid'},high);assert.equal(aid.result.ok,true);assert.equal(aid.state.chat.courier.resolved,true);assert.equal(aid.state.player.xp,40);
});
test('narration failure after a confirmed action preserves its committed result',async()=>{
  let s=(await Chat.resolveChat(E.createNewGame(),{text:'/scenario'})).state;
  const exact=Chat.options(s).find(x=>x.id==='courier:aid');s=(await Chat.resolveChat(s,{text:exact.label})).state;
  const provider={config:async()=>Profiles.normalize({enabled:true,model:'mock'}),complete:async()=>{throw new Error('fixture connection failure');}};
  const out=await Chat.resolveChat(s,{confirm:true},provider);
  assert.equal(out.result.ok,true);assert.equal(out.state.player.xp,40);assert.match(out.narration.text,/already committed/);
});
test('coordinator coalesces duplicate requests and prevents replay with changed content',async()=>{
  let calls=0;const provider={config:async()=>Profiles.normalize({enabled:true,model:'mock'}),complete:async()=>{calls++;await new Promise(r=>setTimeout(r,10));return {text:JSON.stringify({kind:'clarify',optionId:'',reply:'Which target?'})};}};
  const c=createCoordinator(provider),s=E.createNewGame(),req={requestId:'repeat123',text:'Investigate.'};
  const [a,b]=await Promise.all([c.run(s,req),c.run(s,req)]);assert.equal(calls,1);assert.deepEqual(a,b);
  await assert.rejects(c.run(s,{...req,text:'Changed'}),/different turn/);
});
test('cancel proposal consumes nothing and unknown offline actions are not guessed',async()=>{
  const s=E.createNewGame();const out=await Chat.resolveChat(s,{text:'I launch a rocket to the moon'});assert.equal(snapshot(out.state),snapshot(s));assert.equal(out.narration.source,'deterministic');
  const canceled=await Chat.resolveChat(out.state,{cancel:true});assert.equal(snapshot(canceled.state),snapshot(s));
});

test('leaving Briarwatch pauses the optional side story without losing its discoveries',async()=>{
  let s=(await Chat.resolveChat(E.createNewGame(),{text:'/scenario'})).state;
  s=E.resolveAction(s,{type:'courier',optionId:'ledger'},high).state;
  const facts=clone(s.chat.courier.facts);
  const moved=E.resolveAction(s,{type:'story-choice',choiceId:'leave-village'},high);
  assert.equal(moved.result.ok,true);assert.equal(moved.state.chat.courier.active,false);
  assert.deepEqual(moved.state.chat.courier.facts,facts);
  assert.ok(Chat.options(moved.state).some(o=>o.id.startsWith('choice:')));
});
test('compact requests discard old optional conversation, not current preferences or choices',()=>{
  const s=E.createNewGame();M.instructions(s,'My current campaign preferences.');
  for(let i=0;i<40;i++)M.append(s,'guide','outdated '.repeat(175));
  const cfg=Profiles.normalize({profile:'compact'});
  const text=Chat.context(s,cfg,'I inspect the ropes.','action');const data=JSON.parse(text);
  assert.ok(text.length+Chat.SYSTEM.length<=cfg.contextChars);
  assert.equal(data.preferences,s.chat.instructions);
  assert.ok(data.options.length>0);assert.equal(s.chat.history.length,40);
});
test('repeat confirmation returns the same mechanical outcome with no second reward',async()=>{
  let s=(await Chat.resolveChat(E.createNewGame(),{text:'/scenario'})).state;
  const choice=Chat.options(s).find(o=>o.id==='courier:aid');s=(await Chat.resolveChat(s,{text:choice.label})).state;
  const coordinator=createCoordinator(null),request={requestId:'confirm_once',confirm:true};
  const [a,b]=await Promise.all([coordinator.run(s,request),coordinator.run(s,request)]);
  assert.deepEqual(a,b);assert.equal(a.state.player.xp,40);
});
test('explicit known transactions still use rules without inference when AI is enabled',async()=>{
  const s=E.createNewGame();const provider=mock({kind:'clarify',optionId:'',reply:'Unused.'});
  const out=await Chat.resolveChat(s,{text:'buy 999 healing potions'},provider);
  assert.equal(provider.calls.length,0);assert.equal(out.result.ok,false);assert.equal(out.state.player.gold,s.player.gold);
});
