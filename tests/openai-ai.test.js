'use strict';
// The OpenAI provider. No real API calls: unit tests inject a fake fetch and the
// HTTP test points the server at a loopback stand-in through OPENAI_BASE_URL.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');
const Profiles=require('../src/model-profiles');
const {GAME_ONLY}=require('../src/claude-ai');
const OpenAI=require('../src/openai-ai');
const {createLocalAI}=require('../src/local-ai');
const {SCHEMA,CLAUDE_SCHEMA,resolveChat}=require('../src/chat-runtime');
const Director=require('../src/director');
const Hosted=require('../src/hosted');
const E=require('../src/engine');
const root=path.join(__dirname,'..');
const KEY='sk-proj-test'+'a'.repeat(40);
const ENV={OPENAI_API_KEY:KEY};

function fakeFetch(reply,status=200){
  const calls=[];
  const impl=async(url,init)=>{calls.push({url,init,body:init.body?JSON.parse(init.body):null});
    const out=typeof reply==='function'?reply(calls.at(-1)):reply;
    return {ok:status>=200&&status<300,status,text:async()=>typeof out==='string'?out:JSON.stringify(out)};};
  return {calls,impl};
}
const chat=(content,extra={})=>({model:'gpt-6.2-sol',choices:[{finish_reason:'stop',message:{role:'assistant',content,...extra}}],usage:{prompt_tokens:10,completion_tokens:5}});
async function temp(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-openai-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}
async function service(t,fetcher,settings={},env=ENV){
  const dir=await temp(t),configPath=path.join(dir,'ai.json');
  const ai=createLocalAI({configPath,openai:OpenAI.createOpenAIProvider({fetchImpl:fetcher.impl,env})});
  await ai.save({enabled:true,provider:'openai',...settings});
  return {ai,configPath};
}

test('OpenAI settings get the cloud profile and need no local model',()=>{
  const c=Profiles.normalize({enabled:true,provider:'openai'});
  assert.equal(c.openaiModel,'gpt-6.2-sol');assert.equal(c.effort,'low');
  assert.equal(c.contextChars,Profiles.OPENAI_PROFILE.contextChars);assert.equal(c.replyTokens,Profiles.OPENAI_PROFILE.replyTokens);
  assert.equal(Profiles.isCloud(c),true);assert.equal(Profiles.isCloud({provider:'local'}),false);
  assert.equal(Profiles.normalize({provider:'openai',openaiModel:'gpt-6-luna'}).openaiModel,'gpt-6-luna');
  for(const raw of [{provider:'openai',openaiModel:'claude-opus-5-5'},{provider:'openai',openaiModel:'gpt 5'},{provider:'openai',apiKey:KEY},{provider:'openai',openaiKey:KEY},{provider:'gemini'}])assert.throws(()=>Profiles.normalize(raw));
  assert.ok(Profiles.manifest().providers.includes('openai'));
});
test('the OpenAI key only comes from the environment and is checked before saving',async t=>{
  assert.equal(OpenAI.apiKey({}),null);assert.equal(OpenAI.apiKey({GAME_OPENAI_API_KEY:' g '}),'g');assert.equal(OpenAI.apiKey({OPENAI_API_KEY:'k',GAME_OPENAI_API_KEY:'g'}),'k');
  assert.equal(OpenAI.validKey(KEY),true);assert.equal(OpenAI.validKey('sk-'+'b'.repeat(48)),true);
  for(const bad of ['sk-ant-'+'a'.repeat(40),'hello','sk-short','sk-'+'a'.repeat(30)+' b','sk-'+'a'.repeat(30)+'\nX=1'])assert.equal(OpenAI.validKey(bad),false,bad);
  const file=path.join(await temp(t),'.env');
  await fs.writeFile(file,'ANTHROPIC_API_KEY=sk-ant-keep\nOPENAI_API_KEY=old\n');
  await assert.rejects(OpenAI.saveKey(file,'sk-ant-'+'a'.repeat(40)),/does not look like an OpenAI API key/);
  assert.equal(await OpenAI.saveKey(file,' '+KEY+' '),KEY);
  assert.equal(await fs.readFile(file,'utf8'),`ANTHROPIC_API_KEY=sk-ant-keep\nOPENAI_API_KEY=${KEY}\n`,'the Claude key is kept');
  if(process.platform!=='win32')assert.equal((await fs.stat(file)).mode&0o077,0);
});
test('a missing OpenAI key fails clearly before any request',async t=>{
  const f=fakeFetch(chat('x'));const {ai}=await service(t,f,{},{});
  await assert.rejects(ai.complete({system:'s',prompt:'p'}),/OPENAI_API_KEY/);assert.equal(f.calls.length,0);
  assert.equal(ai.status().openaiKeyConfigured,false);assert.equal(await ai.narrationEnabled(),false);
});
test('proposals use strict structured output, the game-only rule and reasoning effort',async t=>{
  const f=fakeFetch(chat('{"kind":"clarify","optionId":"","reply":"Which door?"}'));
  const {ai,configPath}=await service(t,f,{effort:'medium'});
  const out=await ai.complete({system:'Rules.',prompt:'Facts.',schema:SCHEMA,purpose:'plan'});
  assert.equal(out.text,'{"kind":"clarify","optionId":"","reply":"Which door?"}');assert.equal(out.model,'gpt-6.2-sol');
  const {url,init,body}=f.calls[0];
  assert.equal(url,'https://api.openai.com/v1/chat/completions');assert.equal(init.method,'POST');assert.equal(init.headers.Authorization,'Bearer '+KEY);assert.ok(init.signal);
  assert.equal(body.model,'gpt-6.2-sol');assert.equal(body.max_completion_tokens,16000);assert.equal(body.reasoning_effort,'medium');
  assert.equal(body.temperature,undefined);assert.equal(body.max_tokens,undefined);
  assert.deepEqual(body.messages,[{role:'system',content:'Rules.\n\n'+GAME_ONLY},{role:'user',content:'Facts.'}]);
  assert.deepEqual(body.response_format,{type:'json_schema',json_schema:{name:'game_reply',strict:true,schema:SCHEMA}});
  assert.doesNotMatch(await fs.readFile(configPath,'utf8'),/sk-|apiKey/);
});
test('every schema the game sends is ready for OpenAI strict mode',()=>{
  const s=E.createNewGame({classId:'rogue'});
  for(const schema of [SCHEMA,CLAUDE_SCHEMA,Director.schema(s)])assert.equal(OpenAI.strictReady(schema),true);
  assert.equal(OpenAI.strictReady({type:'object',properties:{a:{type:'string'}},required:[]}),false);
});
test('a director call gets at least medium effort; replies send no format',async t=>{
  const f=fakeFetch(chat('{}'));const {ai}=await service(t,f);
  await ai.complete({system:'s',prompt:'p',purpose:'director',schema:{type:'object',additionalProperties:false,properties:{},required:[]}});
  assert.equal(f.calls[0].body.reasoning_effort,'medium');
  await ai.complete({system:'s',prompt:'p'});
  assert.equal(f.calls[1].body.reasoning_effort,'low');assert.equal(f.calls[1].body.response_format,undefined);
});
for(const [label,reply,status,pattern]of [
  ['refusal',chat(null,{refusal:'I cannot help with that.'}),200,/declined/],
  ['truncated',{choices:[{finish_reason:'length',message:{content:'half'}}]},200,/output limit/],
  ['filtered',{choices:[{finish_reason:'content_filter',message:{content:''}}]},200,/filtered/],
  ['empty',chat('  '),200,/did not return/],
  ['bad key',{error:{message:'Incorrect API key'}},401,/did not accept/],
  ['rate limited',{error:{message:'quota'}},429,/rate limiting/],
  ['unknown model',{error:{message:'model'}},404,/not found/],
  ['not JSON','<html>',200,/not valid JSON/]])test(`OpenAI ${label} replies apply nothing`,async t=>{
  const {ai}=await service(t,fakeFetch(reply,status));await assert.rejects(ai.complete({system:'s',prompt:'p'}),pattern);
  assert.equal(ai.status().busy,false);
});
test('cancelling an OpenAI request aborts it and frees the service',async t=>{
  let seen;const f={impl:(_u,init)=>{seen=init.signal;return new Promise((_r,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));}};
  const {ai}=await service(t,f);const pending=ai.complete({system:'s',prompt:'p'});
  await new Promise(r=>setImmediate(r));
  await assert.rejects(ai.complete({system:'s',prompt:'again'}),/busy/);
  assert.equal(ai.cancel(),true);await assert.rejects(pending,/cancelled/);assert.equal(seen.aborted,true);assert.equal(ai.status().busy,false);
});
test('the model list comes from the key, keeping only text models',async t=>{
  const f=fakeFetch({data:[{id:'gpt-6.2-sol'},{id:'gpt-6-luna'},{id:'text-embedding-3-large'},{id:'gpt-6-realtime'},{id:'dall-e-3'},{id:'o9-mini'}]});
  const {ai}=await service(t,f);
  assert.deepEqual(await ai.models(),['gpt-6-luna','gpt-6.2-sol','o9-mini']);
  assert.equal(f.calls[0].url,'https://api.openai.com/v1/models');assert.equal(f.calls[0].init.method,'GET');
  const none=fakeFetch({});const {ai:noKey}=await service(t,none,{},{});
  assert.deepEqual(await noKey.models(),Profiles.OPENAI_MODELS,'without a key the suggestions are listed and nothing is sent');assert.equal(none.calls.length,0);
});
test('OPENAI_BASE_URL is checked',()=>{
  assert.equal(OpenAI.baseUrl({}),'https://api.openai.com/v1');
  assert.equal(OpenAI.baseUrl({OPENAI_BASE_URL:'http://127.0.0.1:9/v1/'}),'http://127.0.0.1:9/v1');
  for(const bad of ['nonsense','ftp://x/v1','https://u:p@x/v1','https://x/v1?k=1'])assert.throws(()=>OpenAI.baseUrl({OPENAI_BASE_URL:bad}));
});
test('OpenAI gets the full game master: improvised actions still need confirmation',async t=>{
  const state=E.createNewGame({classId:'rogue'});
  const target=E.buildView(state).scene.choices.find(c=>!c.completed&&!c.locked);
  const f=fakeFetch(chat(JSON.stringify({kind:'action',optionId:'choice:'+target.id,reply:'',improvise:{intent:'',skill:'',difficulty:'trivial',successText:'',failText:'',reward:'none',risk:'none',remembered:false}})));
  const {ai}=await service(t,f);
  const facts=p=>JSON.stringify([p.hp,p.xp,p.gold,p.inventory,p.conditions]);const before=facts(state.player);
  const proposed=await resolveChat(state,{mode:'action',text:'I look into '+target.label.toLowerCase()},ai);
  assert.equal(proposed.result.kind,'clarification');assert.equal(proposed.state.chat.pending.optionId,'choice:'+target.id);
  assert.equal(facts(proposed.state.player),before,'Nothing changes until the player confirms.');
  const sent=f.calls[0].body;
  assert.deepEqual(sent.response_format.json_schema.schema,CLAUDE_SCHEMA,'the cloud contract, with improvised actions');
  assert.match(sent.messages[1].content,/"book"/,'the book facts are sent');
});
test('OpenAI narration runs only when narration is switched on',async t=>{
  const N=require('../src/narrator');const f=fakeFetch(chat('Lantern light pools on wet stone.'));
  const {ai}=await service(t,f);const s=E.createNewGame({classId:'cleric'});
  assert.equal((await N.narrate(s,E.buildView(s),{type:'opening'},[],null,ai)).source,'deterministic');assert.equal(f.calls.length,0);
  await ai.save({enabled:true,provider:'openai',narration:true});
  const out=await N.narrate(s,E.buildView(s),{type:'opening'},[],null,ai);
  assert.equal(out.source,'ai');assert.equal(out.model,'gpt-6.2-sol');assert.match(out.text,/Lantern light/);
});
test('a hosted game does not run on OpenAI, so the owner key and allowances stay Claude-only',async t=>{
  const f=fakeFetch(chat('x'));const {ai}=await service(t,f,{narration:true});
  const h=Hosted.settings({HOSTED:'1',HOSTED_SECRET:'s'.repeat(40)});
  const usage=Hosted.createUsage(h);
  const view=Hosted.provider(ai,{id:'acct-1',plan:'paid'},usage,h);
  await assert.rejects(view.complete({system:'s',prompt:'p'}),/runs its AI game master on Claude/);
  assert.equal(await view.narrationEnabled(),false);assert.equal(f.calls.length,0);
  assert.equal(usage.report({id:'acct-1',plan:'paid'}).used,0,'a refused call spends no allowance');
});

test('HTTP: save an OpenAI key, test it, and the key never comes back',async t=>{
  const dir=await temp(t),envFile=path.join(dir,'.env'),seen=[];
  const model=http.createServer((req,res)=>{let raw='';req.on('data',d=>raw+=d);req.on('end',()=>{
    const sent=String(req.headers.authorization||'').replace(/^Bearer /,'');seen.push({url:req.url,key:sent,body:JSON.parse(raw||'{}')});
    if(sent!==KEY){res.writeHead(401,{'content-type':'application/json'});res.end(JSON.stringify({error:{message:'bad key'}}));return;}
    res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify(chat('READY')));});});
  await new Promise(r=>model.listen(0,'127.0.0.1',r));
  const probe=http.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),SAVE_DIR:path.join(dir,'saves'),AI_CONFIG_PATH:path.join(dir,'settings.json'),ENV_FILE_PATH:envFile,OPENAI_API_KEY:'',GAME_OPENAI_API_KEY:'',OPENAI_BASE_URL:`http://127.0.0.1:${model.address().port}/v1`,AI_NARRATOR:'off',HOSTED:''},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  t.after(async()=>{if(child.exitCode===null){child.kill();await new Promise(r=>{child.once('exit',r);setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');},1000).unref();});}await new Promise(r=>model.close(r));});
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,40));}assert.ok(ready,output);
  const post=async(route,body,headers={})=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...headers},body:JSON.stringify(body)});return {status:r.status,text:await r.text()};};
  const settings=async()=>(await (await fetch(base+'/api/ai/settings')).json());
  assert.equal((await settings()).openaiKeyConfigured,false);
  const untested=await post('/api/ai/test',{config:{provider:'openai'}});
  assert.equal(untested.status,400);assert.match(untested.text,/OPENAI_API_KEY/);assert.equal(seen.length,0);
  const wrongBox=await post('/api/ai/key',{provider:'openai',key:'sk-ant-'+'a'.repeat(40)});assert.equal(wrongBox.status,400);await assert.rejects(fs.access(envFile));
  const saved=await post('/api/ai/key',{provider:'openai',key:KEY});
  assert.equal(saved.status,200);assert.deepEqual(JSON.parse(saved.text),{openaiKeyConfigured:true});
  assert.equal(await fs.readFile(envFile,'utf8'),`OPENAI_API_KEY=${KEY}\n`);
  const after=await settings();assert.equal(after.openaiKeyConfigured,true);assert.doesNotMatch(JSON.stringify(after),/sk-proj/);
  const tested=await post('/api/ai/test',{config:{provider:'openai',openaiModel:'gpt-6-luna'}});
  assert.equal(tested.status,200,tested.text);assert.equal(JSON.parse(tested.text).ok,true);assert.doesNotMatch(tested.text,/sk-proj/);
  assert.equal(seen.at(-1).url,'/v1/chat/completions');assert.equal(seen.at(-1).body.model,'gpt-6-luna');assert.equal(seen.at(-1).body.max_completion_tokens,1024);
  const on=await post('/api/ai/settings',{config:{enabled:true,provider:'openai',openaiModel:'gpt-6-luna'}});
  assert.equal(on.status,200,on.text);assert.equal(JSON.parse(on.text).config.provider,'openai');
});
