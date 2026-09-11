'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const Profiles=require('../src/model-profiles');
const {createLocalAI}=require('../src/local-ai');
const {SCHEMA}=require('../src/chat-runtime');
const json=x=>new Response(JSON.stringify(x),{headers:{'Content-Type':'application/json'}});
const reply=(content='A finished answer.',finish_reason='stop')=>json({choices:[{finish_reason,message:{content}}]});
async function setup(t,fetchImpl,config={}){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-provider-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const configPath=path.join(dir,'.local-ai.json'),ai=createLocalAI({configPath,fetchImpl});
  if(config!==null)await ai.save({enabled:true,model:'test-model',...config});
  return {dir,configPath,ai};
}

test('local AI starts disabled with no model and a ten-minute wait budget',()=>{
  const c=Profiles.normalize();assert.equal(c.enabled,false);assert.equal(c.model,'');assert.equal(c.timeoutMs,600000);assert.equal(c.profile,'compact');
});
for(const address of ['https://example.invalid/v1','http://192.168.1.4:1234/v1','file:///tmp/server','http://user:token@localhost:1234/v1','http://localhost:1234/v1?token=abc','http://localhost:1234/v1/chat/completions']){
  test(`configuration refuses a nonlocal or non-base address: ${address}`,()=>assert.throws(()=>Profiles.normalize({baseUrl:address})));
}
for(const [baseUrl,expected]of [['http://localhost:1234','http://localhost:1234/v1'],['http://127.0.0.1:1234/v1/','http://127.0.0.1:1234/v1'],['http://[::1]:1234/v1','http://[::1]:1234/v1']])test(`normalizes ${baseUrl} without choosing a model`,()=>{
  const c=Profiles.normalize({baseUrl});assert.equal(c.baseUrl,expected);assert.equal(c.model,'');
});
test('profiles and overrides are bounded without claiming a model capability',()=>{
  for(const raw of [{enabled:true},{timeoutMs:600001},{timeoutMs:2999},{replyTokens:10000},{contextChars:NaN},{format:'auto'},{roles:'tool'},{profile:'unknown'},{apiKey:'secret'}])assert.throws(()=>Profiles.normalize(raw));
  assert.equal(Profiles.normalize({profile:'expanded',contextChars:9000,replyTokens:96}).replyTokens,96);
  assert.match(Profiles.manifest().note,/not compatibility certifications/);
});
for(const [model,profile]of [
  ['qwen3.8-27b-uncensored-hauhaucs-aggressive-mtp','expanded'],
  ['gemma4-12b-qat-uncensored-hauhaucs-balanced@q4_k_m','balanced'],
  ['example-instruct-7b','compact']]){
  test(`${profile} sends the explicitly selected ${model} with its own workload only`,async t=>{
    const calls=[];const {ai}=await setup(t,async(url,opt)=>{calls.push({url,opt});return reply();},{model,profile});
    const result=await ai.complete({system:'Rules.',prompt:'Hello',schema:SCHEMA,purpose:'plan'});
    assert.equal(calls.length,1);const body=JSON.parse(calls[0].opt.body);
    assert.equal(body.model,model);assert.equal(body.max_tokens,Profiles.PROFILES[profile].replyTokens);
    assert.equal(body.stream,false);assert.equal(body.temperature,0.1);assert.equal(body.response_format,undefined);
    assert.equal(calls[0].url,'http://127.0.0.1:1234/v1/chat/completions');assert.equal(calls[0].opt.redirect,'error');
    assert.equal(result.model,model);
  });
}
test('single-user and explicit JSON Schema are opt-in independent settings',async t=>{
  let body;const {ai}=await setup(t,async(_,opt)=>{body=JSON.parse(opt.body);return reply();},{roles:'single-user',format:'json-schema'});
  await ai.complete({system:'Rules.',prompt:'Facts.',schema:SCHEMA});assert.deepEqual(body.messages,[{role:'user',content:'Rules.\n\nFacts.'}]);
  assert.deepEqual(body.response_format.json_schema.schema,SCHEMA);
});
test('listing model IDs does not select, load or generate with any model',async t=>{
  const calls=[];const {ai}=await setup(t,async(url,opt)=>{calls.push({url,opt});return json({data:[{id:'a'},{id:'b@q4'},null,{}]});},null);
  const models=await ai.models();assert.deepEqual(models,['a','b@q4']);assert.equal(calls.length,1);assert.equal(calls[0].opt.method,'GET');
  const c=await ai.config();assert.equal(c.enabled,false);assert.equal(c.model,'');assert.equal(calls[0].url.endsWith('/models'),true);
});
test('settings persist outside campaign files; unknown or corrupt settings fail honestly',async t=>{
  const {ai,configPath}=await setup(t,async()=>reply(),{profile:'balanced'});
  const other=createLocalAI({configPath});assert.equal((await other.config()).profile,'balanced');
  assert.doesNotMatch(await fs.readFile(configPath,'utf8'),/secret|token|apiKey/);
  await fs.writeFile(configPath,'broken');await assert.rejects(other.config(),/could not be read/);
  await ai.save({enabled:false});assert.equal((await other.config()).enabled,false);
});
test('oversized context stops before inference and never silently slices required facts',async t=>{
  let calls=0;const {ai}=await setup(t,async()=>{calls++;return reply();},{contextChars:4000});
  await assert.rejects(ai.complete({system:'R',prompt:'x'.repeat(4000)}),/context budget/);assert.equal(calls,0);
});
test('disabled generation cannot call the server',async t=>{
  let calls=0;const {ai}=await setup(t,async()=>{calls++;return reply();},null);
  await assert.rejects(ai.complete({system:'R',prompt:'Hi'}),/off/);assert.equal(calls,0);
});
for(const [name,response,match]of [
  ['HTTP error',()=>new Response('private server data',{status:503}),/HTTP 503/],
  ['malformed envelope',()=>new Response('{'),/invalid JSON/],
  ['truncated answer',()=>reply('{"kind":','length'),/output limit/],
  ['reasoning-only response',()=>json({choices:[{finish_reason:'stop',message:{reasoning_content:'hidden thinking',content:''}}]}),/finished text answer/],
  ['empty content',()=>reply(null),/finished text answer/],
  ['oversized response',()=>reply('x'.repeat(140000)),/size limit/]
])test(`${name} produces one failure, no automatic retries or model fallback`,async t=>{
  let calls=0;const {ai}=await setup(t,async()=>{calls++;return response();});
  await assert.rejects(ai.complete({system:'Rules',prompt:'Hello'}),match);assert.equal(calls,1);assert.equal(ai.status().busy,false);
});
test('disconnect errors do not disclose raw server data or tokens',async t=>{
  const {ai}=await setup(t,async()=>{throw new Error('socket private token abc');});
  try{await ai.complete({system:'R',prompt:'Hi'});assert.fail();}catch(e){assert.doesNotMatch(e.message,/private token/);assert.match(e.message,/No cloud fallback/);}
});
test('a busy local model rejects overlapping generation and settings changes; cancel aborts it',async t=>{
  let begin;const started=new Promise(r=>begin=r);let calls=0;
  const {ai}=await setup(t,async(_,opts)=>{calls++;begin();return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(new Error('abort')),{once:true}));});
  const pending=ai.complete({system:'R',prompt:'Hello'});await started;
  await assert.rejects(ai.complete({system:'R',prompt:'Again'}),/busy/);await assert.rejects(ai.save({enabled:false}),/active AI request/);
  assert.equal(ai.cancel(),true);await assert.rejects(pending,/cancelled/);assert.equal(calls,1);assert.equal(ai.cancel(),false);
});
test('a timed out request stops without retry after its configured wait',{timeout:6000},async t=>{
  let calls=0;const {ai}=await setup(t,async(_,opts)=>{calls++;return new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(new Error('abort')),{once:true}));},{timeoutMs:3000});
  const start=Date.now();await assert.rejects(ai.complete({system:'R',prompt:'Hi'}),/configured wait limit/);
  assert.ok(Date.now()-start>=2800);assert.equal(calls,1);assert.equal(ai.status().busy,false);
});
