'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine');
const Chat = require('../src/chat-runtime');
const Road = require('../src/road-story');
const api = { hasItem: E.hasItem, checkPlan: E.checkPlan };
const OFFER = 'I offer my labor to fix the wagon in exchange for help, not a payment.';
function start() {
  const out = E.resolveAction(E.createNewGame({classId:'fighter'}), {type:'road',optionId:'start'});
  assert.equal(out.result.ok, true);
  return out.state;
}
const mechanics = s => JSON.stringify({player:s.player,party:s.party,world:s.world,story:s.story,
  combat:s.combat,road:s.chat.road,turn:s.turnCount});
test('affirmative labor offer: declining payment does not decline the repair', async () => {
  const state = start(), before = mechanics(state);
  let calls = 0, rolls = 0;
  const provider = { config:async()=>({enabled:true}),
    complete:async()=>{calls++;throw Error('No model allowed');} };
  const out = await Chat.resolveChat(state, {mode:'action',text:OFFER}, provider, ()=>{rolls++;return 0.999;});
  assert.equal(out.state.chat.pending?.optionId, 'road:repair');
  assert.equal(mechanics(out.state), before);
  assert.equal(calls, 0);
  assert.equal(rolls, 0);
});
test('actual repair refusal still asks instead of proposing or changing mechanics', async () => {
  const state=start(),before=mechanics(state);
  const out=await Chat.resolveChat(state,{mode:'action',text:'I do not repair the wagon.'});
  assert.ok(!out.state.chat.pending);
  assert.equal(mechanics(out.state),before);
  assert.ok(Road.infer('I do not repair the wagon.',state,api).clarify);
});

// Alternative wording, not copied from the shared model-evaluation answers.
const accepted = [
  'I offer my labour to mend the wheel in exchange for help, not a payment.',
  'I offer to repair the merchant’s wagon instead of paying full price.',
  'I will fix the damaged axle, not with gold.',
  'Repair the wagon, not by paying.',
  'Please mend the wheel rather than pay gold.',
  'I’ll try to repair this wagon without paying.',
  'I repair Tamsin’s wagon in exchange for help at the crossing, not money.',
  'I offer my help to fix the broken wheel without spending gold.',
  'I attempt to mend the axle instead of a payment.',
  'I repair the wagon, no payment.',
  '  I OFFER MY WORK TO FIX THE WAGON, NOT A PAYMENT.  ',
  'I\toffer my labor to fix the wagon in exchange for help not a payment.'
];
for (const text of accepted) test('payment-only contrast proposes one uncommitted repair: '+text, async () => {
  const state=start(),before=mechanics(state);
  let calls=0,rolls=0;
  const provider={config:async()=>({enabled:true}),complete:async()=>{calls++;throw Error('Unwanted inference');}};
  assert.deepEqual(Road.infer(text,state,api),{optionId:'road:repair'});
  const out=await Chat.resolveChat(state,{mode:'action',text},provider,()=>{rolls++;return .999;});
  assert.equal(out.state.chat.pending?.optionId,'road:repair');
  assert.equal(mechanics(out.state),before);
  assert.equal(calls,0);assert.equal(rolls,0);
});
const uncertain = [
  'I do not repair the wagon, not a payment.',
  'I will not fix the wagon instead of paying.',
  'I won’t fix the wagon.',
  'I don’t repair the wheel.',
  'I would not mend the axle without paying.',
  'I refuse to repair the wagon.',
  'I decline to fix the wagon, not with gold.',
  'Do not repair the wagon.',
  "Don't repair the wagon, not a payment.",
  'I cannot repair the wagon without payment.',
  'I do not want to repair the wagon.',
  'I might repair the wagon without paying.',
  'If I repair the wagon, not a payment.',
  'I repair the wagon only if Tamsin agrees, not a payment.',
  'I repair the wagon unless she objects, not a payment.',
  'Could I repair the wagon without paying?',
  'I repair the wagon without paying?',
  "I said 'I repair the wagon, not a payment.'",
  'Tamsin says I repair the wagon, not a payment.',
  'I repair the wagon and then depart immediately.',
  'I repair the wagon instead of paying and then steal the medicine.',
  'I repair the wagon, not a payment; depart immediately.',
  'I repair the wagon, not a payment. I depart immediately.',
  'I repair the wagon, not a payment\nDepart immediately.',
  'I repair the wagon or pay a wheelwright.',
  'I pay a wheelwright instead of repair the wagon.',
  'I fix the wagon, not the wheel.',
  'I repair the wagon without Tamsin’s permission.'
];
for (const text of uncertain) test('refusal/conditional/compound stays uncommitted: '+text, async () => {
  const state=start(),before=mechanics(state);
  let calls=0,rolls=0;
  const provider={config:async()=>({enabled:true}),complete:async()=>{calls++;throw Error('Unwanted inference');}};
  assert.ok(Road.infer(text,state,api)?.clarify);
  const out=await Chat.resolveChat(state,{mode:'action',text},provider,()=>{rolls++;return .999;});
  assert.ok(!out.state.chat.pending);
  assert.equal(mechanics(out.state),before);
  assert.equal(calls,0);assert.equal(rolls,0);
});
for(const rng of [()=>0,()=>.999]) test('confirm preserves the canonical repair outcome, costs and one-attempt rule: '+rng(),async()=>{
  const state=start(),before=mechanics(state);
  const proposed=await Chat.resolveChat(state,{text:OFFER});
  assert.equal(mechanics(proposed.state),before);
  const done=await Chat.resolveChat(proposed.state,{confirm:true},null,rng);
  const expected=E.resolveAction(state,{type:'road',optionId:'repair'},rng);
  assert.equal(done.result.ok,true);
  assert.equal(mechanics(done.state),mechanics(expected.state));
  assert.equal(done.state.player.gold,state.player.gold);
  assert.equal(done.state.story.nodeId,state.story.nodeId);
  assert.equal(done.state.player.xp,state.player.xp);
  const replay=await Chat.resolveChat(done.state,{confirm:true});
  assert.equal(replay.result.ok,false);assert.equal(mechanics(replay.state),mechanics(done.state));
  const again=await Chat.resolveChat(done.state,{text:OFFER});
  assert.ok(!again.state.chat.pending);assert.equal(mechanics(again.state),mechanics(done.state));
});
test('cancelling an unpaid repair or replacing it with a refusal does not roll or spend',async()=>{
  const state=start(),before=mechanics(state);
  const proposed=await Chat.resolveChat(state,{text:OFFER});
  const cancel=await Chat.resolveChat(proposed.state,{cancel:true});
  assert.ok(!cancel.state.chat.pending);assert.equal(mechanics(cancel.state),before);
  const refused=await Chat.resolveChat(proposed.state,{text:'I do not repair the wagon.'});
  assert.ok(!refused.state.chat.pending);assert.equal(mechanics(refused.state),before);
  const noAction=await Chat.resolveChat(refused.state,{confirm:true});
  assert.equal(noAction.result.ok,false);assert.equal(mechanics(noAction.state),before);
});
test('pending unpaid repair survives save normalization without executing and still needs confirmation',async()=>{
  const state=start(),before=mechanics(state);
  const proposed=await Chat.resolveChat(state,{text:OFFER});
  const loaded=E.normalizeIncomingState(JSON.parse(JSON.stringify(proposed.state)));
  assert.equal(loaded.chat.pending.optionId,'road:repair');assert.equal(mechanics(loaded),before);
  const done=await Chat.resolveChat(loaded,{confirm:true},null,()=>.999);
  assert.equal(done.state.chat.road.wagon,'repaired');assert.equal(done.state.player.gold,state.player.gold);
});
test('a stale repair offer cannot move scenes or revive an already attempted repair',async()=>{
  const state=start();
  const proposed=await Chat.resolveChat(state,{text:OFFER});
  const paid=E.resolveAction(proposed.state,{type:'road',optionId:'pay-repair'});
  assert.equal(paid.result.ok,true);
  const next=E.resolveAction(paid.state,{type:'road',optionId:'depart'}).state;
  const before=mechanics(next);
  const stale=await Chat.resolveChat(next,{confirm:true});
  assert.equal(stale.result.ok,false);assert.equal(mechanics(stale.state),before);
  const invalid=await Chat.resolveChat(next,{text:OFFER});
  assert.ok(!invalid.state.chat.pending);assert.equal(mechanics(invalid.state),before);
});
test('Question and Dialogue modes do not create a repair proposal from an affirmative offer',async()=>{
  for(const mode of ['question','dialogue']){
    const state=start(),before=mechanics(state);
    const out=await Chat.resolveChat(state,{mode,text:OFFER});
    assert.ok(!out.state.chat.pending);assert.equal(mechanics(out.state),before);
  }
});
test('all classes retain the same legal repair outcome as the explicit button',async()=>{
  for(const classId of Object.keys(require('../src/content').CLASSES)){
    const state=E.resolveAction(E.createNewGame({classId}),{type:'road',optionId:'start'}).state;
    const proposed=await Chat.resolveChat(state,{text:OFFER});
    assert.equal(proposed.state.chat.pending?.optionId,'road:repair',classId);
    const done=await Chat.resolveChat(proposed.state,{confirm:true},null,()=>.999);
    const expected=E.resolveAction(state,{type:'road',optionId:'repair'},()=>.999);
    assert.equal(mechanics(done.state),mechanics(expected.state),classId);
  }
});
test('non-repair ferry wording retains its existing inference path',async()=>{
  let state=start();
  for(const id of ['crew-repair','depart'])state=E.resolveAction(state,{type:'road',optionId:id}).state;
  const before=mechanics(state);
  const out=await Chat.resolveChat(state,{text:'I negotiate ferry passage without paying.'});
  assert.equal(out.state.chat.pending?.optionId,'road:ferry');
  assert.equal(mechanics(out.state),before);
});
