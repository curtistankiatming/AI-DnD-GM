'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine'),Chat=require('../src/chat-runtime'),P=require('../src/model-profiles'),J=require('../src/journal');
const cfg=P.normalize({enabled:true,model:'synthetic-only',replyTokens:-1});
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const snapshot=s=>JSON.stringify(stable({player:s.player,party:s.party,world:s.world,story:s.story,road:s.chat.road,combat:s.combat,turn:s.turnCount}));
const fresh=()=>E.createNewGame({classId:'fighter'});
function step(s,id){const out=E.resolveAction(s,{type:'road',optionId:id},()=>.999);assert.equal(out.result.ok,true);return out.state;}
function provider(reply,capture=()=>{}){return {config:async()=>cfg,complete:async req=>{capture(req);return {text:JSON.stringify(reply),model:'synthetic-only'};}};}
for(const mode of ['question','dialogue'])for(const kind of ['question','dialogue','clarify'])test(mode+' mode preserves text and records returned '+kind+' without executing',async()=>{
  const s=fresh(),before=snapshot(s),text='An unverified synthetic reply, not a confirmed fact.';
  const out=await Chat.resolveChat(s,{mode,text:mode==='question'?'What can you tell me about the surroundings?':'I greet the people nearby.'},provider({kind,optionId:'',reply:text}));
  const effective=kind==='clarify'?kind:mode;
  assert.equal(out.result.kind,effective);assert.equal(out.narration.text,text);
  assert.deepEqual(out.result.responseType,{requested:mode,returned:kind,effective,adjusted:kind!==effective});
  assert.equal(snapshot(out.state),before);assert.ok(!out.state.chat.pending);
  assert.equal(Chat.decode(JSON.stringify({kind,optionId:'',reply:text})).kind,kind,'raw decoder must not relabel model results');
  assert.doesNotMatch(JSON.stringify(J.forPrompt(out.state,2000)),/unverified synthetic reply/);
});
for(const mode of ['question','dialogue'])for(const value of [
  {kind:'action',optionId:'choice:inspect-rope',reply:''},
  {kind:'dialogue',optionId:'choice:inspect-rope',reply:'Proceed.'},
  {kind:'question',optionId:'',reply:'Granted',gold:999}
])test(mode+' rejects action/invalid envelope without read-only relabelling: '+JSON.stringify(value),async()=>{
  const s=fresh(),before=snapshot(s);const out=await Chat.resolveChat(s,{mode,text:'Tell me what is nearby.'},provider(value));
  assert.equal(out.result.ok,false);assert.ok(!out.state.chat.pending);assert.equal(snapshot(out.state),before);
});
test('planner instructions distinguish selected question/dialogue modes from action and clarification',()=>{
  assert.match(Chat.SYSTEM,/mode=question/);assert.match(Chat.SYSTEM,/mode=dialogue/);
  assert.match(Chat.SYSTEM,/kind=clarify/);assert.match(Chat.SYSTEM,/multiple attempted actions/i);
  assert.match(Chat.SYSTEM,/party.*trade reputation/i);
  for(const mode of ['question','dialogue','action']){
    const c=JSON.parse(Chat.context(fresh(),cfg,'Some original player wording.',mode));
    assert.equal(c.mode,mode);assert.equal(c.playerInput,'Some original player wording.');
  }
});
test('clear and ambiguous ledger probes preserve wording; simulated replies are not model-quality evidence',async()=>{
  let s=E.resolveAction(fresh(),{type:'courier',optionId:'start'}).state;
  for(const [input,kind,optionId]of [
    ['I examine the toll ledger for discrepancies.','action','courier:ledger'],
    ['I examine the records or question the official; I have not decided which.','clarify','']
  ]){
    let sent;const before=snapshot(s);
    const out=await Chat.resolveChat(s,{text:input},provider({kind,optionId,reply:kind==='clarify'?'Which one step first?':''},r=>sent=r));
    assert.equal(JSON.parse(sent.prompt).playerInput,input);assert.equal(snapshot(out.state),before);
    if(kind==='action')assert.equal(out.state.chat.pending?.optionId,optionId);else assert.ok(!out.state.chat.pending);
  }
});
for(const trade of [0,19,20])test('delivery separates party reputation, capped delta, trust and uncollected gift: '+trade,async()=>{
  let s=step(fresh(),'start');for(const id of ['promise','repair','depart','ferry'])s=step(s,id);
  s.world.reputation.trade=trade;const before=E.normalizeIncomingState(s);
  const proposal=await Chat.resolveChat(before,{text:'road:deliver'});
  let req;const out=await Chat.resolveChat(proposal.state,{confirm:true},{config:async()=>cfg,complete:async r=>{req=r;return {text:'The supplies are delivered.',model:'synthetic-only'};}},()=>.999);
  const p=JSON.parse(req.prompt),change=Math.min(20,trade+1)-trade;
  assert.deepEqual(p.ownership.partyTradeReputation,{owner:'player party',before:trade,after:Math.min(20,trade+1),change});
  assert.equal(p.ownership.tamsinTrust.owner,'Tamsin');assert.equal(p.ownership.tamsinTrust.toward,'player party');
  assert.equal(p.ownership.tamsinTrust.before,before.chat.road.trust);
  assert.equal(p.ownership.tamsinTrust.after,out.state.chat.road.trust);
  assert.equal(p.ownership.herbGift,'offered-not-collected');
  assert.equal(out.state.chat.road.cacheClaimed,false);
  assert.equal(out.state.player.xp,before.player.xp+120);assert.equal(out.state.player.gold,before.player.gold+25);
  assert.match(out.result.canonical,/Your party’s trade reputation/);
  if(trade===20){assert.match(out.result.canonical,/unchanged/);assert.doesNotMatch(out.result.canonical,/reputation rises by 1/);}
  assert.match(req.system,/offered.*collected/i);
  assert.ok(req.system.length+req.prompt.length<=cfg.contextChars);
});
test('no-trust delivery and already-collected gift are not offered a second time',async()=>{
  let s=step(fresh(),'start');for(const id of ['decline','crew-repair','depart','raft'])s=step(s,id);
  let req;const prov={config:async()=>cfg,complete:async r=>{req=r;return {text:'The result stands.',model:'synthetic-only'};}};
  let pending=await Chat.resolveChat(s,{text:'road:deliver'}),out=await Chat.resolveChat(pending.state,{confirm:true},prov);
  assert.equal(JSON.parse(req.prompt).ownership.herbGift,'not-offered');
  assert.equal(JSON.parse(req.prompt).ownership.partyTradeReputation.change,0);
  s=step(fresh(),'start');for(const id of ['promise','crew-repair','depart','raft','deliver'])s=step(s,id);
  pending=await Chat.resolveChat(s,{text:'road:cache'});out=await Chat.resolveChat(pending.state,{confirm:true},prov);
  assert.equal(JSON.parse(req.prompt).ownership.herbGift,'collected');
  assert.equal(JSON.parse(req.prompt).ownership.partyTradeReputation.change,0);
  const again=await Chat.resolveChat(out.state,{confirm:true},prov);assert.equal(again.result.ok,false);
});
test('failure after confirmed action keeps canonical state and never retries a roll',async()=>{
  let s=step(fresh(),'start'),rolls=0,calls=0;
  const proposed=await Chat.resolveChat(s,{text:'I fix the wagon without paying.'});
  const out=await Chat.resolveChat(proposed.state,{confirm:true},{config:async()=>cfg,complete:async()=>{calls++;throw Error('Local AI request cancelled.');}},()=>{rolls++;return 0;});
  assert.equal(out.result.ok,true);assert.equal(out.state.chat.road.delay,1);assert.equal(out.events.filter(e=>e.type==='roll').length,1);assert.ok(rolls>=1&&rolls<=2);assert.equal(calls,1);
  const before=snapshot(out.state);const retry=await Chat.resolveChat(out.state,{confirm:true});
  assert.equal(retry.result.ok,false);assert.equal(snapshot(retry.state),before);
});
