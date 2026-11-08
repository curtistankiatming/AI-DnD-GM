'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const Profiles=require('../src/model-profiles');
const {createClaudeProvider,apiKey}=require('../src/claude-ai');
const {createLocalAI}=require('../src/local-ai');
const {SCHEMA,resolveChat}=require('../src/chat-runtime');
const E=require('../src/engine');

// No real API calls: every test injects a fake Anthropic client.
function fakeClient(reply){
  const calls=[];
  return {calls,factory:()=>({beta:{messages:{create:async(body,opts)=>{calls.push({body,opts});return typeof reply==='function'?reply(body):reply;}}}})};
}
const message=(text,extra={})=>({model:'claude-opus-5-5',stop_reason:'end_turn',content:[{type:'text',text}],usage:{input_tokens:10,output_tokens:5},...extra});
async function service(t,client,settings={}){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-claude-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const configPath=path.join(dir,'ai.json');
  const ai=createLocalAI({configPath,claude:createClaudeProvider({clientFactory:client.factory})});
  await ai.save({enabled:true,provider:'claude',...settings});
  return {ai,configPath};
}

test('Claude settings default to Opus 5.5 at low effort and need no local model',()=>{
  const c=Profiles.normalize({enabled:true,provider:'claude'});
  assert.equal(c.claudeModel,'claude-opus-5-5');assert.equal(c.effort,'low');assert.equal(c.contextChars,Profiles.CLAUDE_PROFILE.contextChars);
  assert.equal(Profiles.profileFor(c).id,'claude');
  for(const raw of [{provider:'openai'},{provider:'claude',claudeModel:'gpt-5'},{provider:'claude',effort:'max'},{provider:'claude',apiKey:'sk-ant-secret'}])assert.throws(()=>Profiles.normalize(raw));
});
test('the API key only comes from the environment',()=>{
  assert.equal(apiKey({}),null);assert.equal(apiKey({ANTHROPIC_API_KEY:'  '}),null);assert.equal(apiKey({ANTHROPIC_API_KEY:'k'}),'k');
  assert.equal(createClaudeProvider({env:{}}).configured(),false);
});
test('a missing key fails clearly before any request',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-claude-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),claude:createClaudeProvider({env:{}})});
  await ai.save({enabled:true,provider:'claude'});
  await assert.rejects(ai.complete({system:'s',prompt:'p'}),/ANTHROPIC_API_KEY/);
  assert.equal(ai.status().claudeKeyConfigured,false);assert.equal(await ai.narrationEnabled(),false);
});
test('proposals use structured output, prompt caching and server-side fallbacks',async t=>{
  const client=fakeClient(message('{"kind":"clarify","optionId":"","reply":"Which door?"}'));
  const {ai,configPath}=await service(t,client,{effort:'medium'});
  const out=await ai.complete({system:'Rules.',prompt:'Facts.',schema:SCHEMA,purpose:'plan'});
  assert.equal(out.text,'{"kind":"clarify","optionId":"","reply":"Which door?"}');assert.equal(out.model,'claude-opus-5-5');
  const {body,opts}=client.calls[0];
  assert.equal(body.model,'claude-opus-5-5');assert.deepEqual(body.output_config,{effort:'medium',format:{type:'json_schema',schema:SCHEMA}});
  assert.deepEqual(body.system,[{type:'text',text:'Rules.',cache_control:{type:'ephemeral'}}]);
  assert.deepEqual(body.messages,[{role:'user',content:'Facts.'}]);
  assert.equal(body.fallbacks,'default');assert.deepEqual(body.betas,['server-side-fallback-2026-07-01']);
  assert.equal(body.temperature,undefined,'Sampling parameters are not sent to current Claude models.');
  assert.ok(opts.signal);assert.equal(opts.timeout,600000);
  assert.doesNotMatch(await fs.readFile(configPath,'utf8'),/sk-ant|apiKey/);
});
test('replies without a schema send no output format',async t=>{
  const client=fakeClient(message('The rain eases.'));const {ai}=await service(t,client);
  await ai.complete({system:'s',prompt:'p'});assert.deepEqual(client.calls[0].body.output_config,{effort:'low'});
});
for(const [label,reply,pattern]of [
  ['refusal',message('',{stop_reason:'refusal',content:[]}),/declined/],
  ['truncated',message('half',{stop_reason:'max_tokens'}),/output limit/],
  ['empty',message('  '),/did not return/]])test(`Claude ${label} replies apply nothing`,async t=>{
  const {ai}=await service(t,fakeClient(reply));await assert.rejects(ai.complete({system:'s',prompt:'p'}),pattern);
  assert.equal(ai.status().busy,false);
});
test('cancelling a Claude request aborts it and frees the service',async t=>{
  let seen;const client={factory:()=>({beta:{messages:{create:(_b,opts)=>{seen=opts.signal;return new Promise((_r,reject)=>opts.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}}}})};
  const {ai}=await service(t,client);const pending=ai.complete({system:'s',prompt:'p'});
  await new Promise(r=>setImmediate(r));
  await assert.rejects(ai.complete({system:'s',prompt:'again'}),/busy/);
  assert.equal(ai.cancel(),true);await assert.rejects(pending,/cancelled/);assert.equal(seen.aborted,true);assert.equal(ai.status().busy,false);
});
test('Claude lists its supported models without a network call',async t=>{
  const client=fakeClient(message('x'));const {ai}=await service(t,client);
  assert.deepEqual(await ai.models(),Profiles.CLAUDE_MODELS);assert.equal(client.calls.length,0);
});
test('a free-form action through Claude still needs confirmation before rules apply',async t=>{
  const state=E.createNewGame({classId:'rogue'});
  const target=E.buildView(state).scene.choices.find(c=>!c.completed&&!c.locked);
  const client=fakeClient(message(JSON.stringify({kind:'action',optionId:'choice:'+target.id,reply:''})));
  const {ai}=await service(t,client);
  const facts=p=>JSON.stringify([p.hp,p.xp,p.gold,p.inventory,p.conditions]);const before=facts(state.player);
  const proposed=await resolveChat(state,{mode:'action',text:'I look into '+target.label.toLowerCase()},ai);
  assert.equal(proposed.result.kind,'clarification');assert.equal(proposed.state.chat.pending.optionId,'choice:'+target.id);
  assert.equal(facts(proposed.state.player),before,'Nothing changes until the player confirms.');
  assert.ok(client.calls[0].body.messages[0].content.length>1000,'Claude receives the full game context.');
});
test('Claude narration runs only when narration is switched on',async t=>{
  const N=require('../src/narrator');const client=fakeClient(message('Lantern light pools on wet stone.'));
  const {ai}=await service(t,client);const s=E.createNewGame({classId:'cleric'});
  assert.equal((await N.narrate(s,E.buildView(s),{type:'opening'},[],null,ai)).source,'deterministic');assert.equal(client.calls.length,0);
  await ai.save({enabled:true,provider:'claude',narration:true});
  const out=await N.narrate(s,E.buildView(s),{type:'opening'},[],null,ai);
  assert.equal(out.source,'ai');assert.equal(out.model,'claude-opus-5-5');assert.match(out.text,/Lantern light/);
});
