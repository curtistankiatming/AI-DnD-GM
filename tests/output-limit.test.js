'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const P=require('../src/model-profiles'),{createLocalAI}=require('../src/local-ai');
const E=require('../src/engine');
async function fixture(t,handler){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-output-'));
  const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});});
  return {configPath:path.join(dir,'config.json'),baseUrl:`http://127.0.0.1:${server.address().port}/v1`};
}
function legacy(raw){
  const keys=['AI_NARRATOR','AI_MODEL','LM_STUDIO_BASE_URL','AI_REPLY_TOKENS','AI_TIMEOUT_MS'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{AI_NARRATOR:'on',AI_MODEL:'test-local',LM_STUDIO_BASE_URL:'http://127.0.0.1:1234/v1',AI_TIMEOUT_MS:'600000'});
  if(raw===undefined)delete process.env.AI_REPLY_TOKENS;else process.env.AI_REPLY_TOKENS=raw;
  delete require.cache[require.resolve('../src/narrator')];
  const N=require('../src/narrator');
  return {N,restore(){for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}delete require.cache[require.resolve('../src/narrator')];}};
}
test('uncapped output is explicit and does not change defaults or input/wait budgets',()=>{
  for(const [profile,limit]of [['compact',160],['balanced',240],['expanded',320]]){
    const capped=P.normalize({profile});assert.equal(capped.replyTokens,limit);
    const un=P.normalize({profile,replyTokens:-1});assert.equal(un.replyTokens,-1);
    assert.equal(un.timeoutMs,600000);assert.equal(un.contextChars,capped.contextChars);assert.equal(un.enabled,false);
  }
});
for(const value of [-2,0,1,63,769,null,true,'-1',1.5])test('invalid output limit rejected: '+JSON.stringify(value),()=>{
  assert.throws(()=>P.normalize({replyTokens:value}));
});
test('uncapped settings round-trip and actual local HTTP requests retain exact model and temperature',async t=>{
  const requests=[];
  const f=await fixture(t,(req,res)=>{let raw='';req.on('data',d=>raw+=d);req.on('end',()=>{
    const body=JSON.parse(raw);requests.push(body);res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'A finished answer.',reasoning_content:'Internal synthetic reasoning.'}}]}));
  });});
  let ai=createLocalAI(f);await ai.save({enabled:true,model:'exact-27b',baseUrl:f.baseUrl,replyTokens:-1});
  ai=createLocalAI(f);assert.equal((await ai.config()).replyTokens,-1);
  for(const purpose of ['plan','reply'])assert.equal((await ai.complete({system:'s',prompt:'p',purpose})).text,'A finished answer.');
  assert.deepEqual(requests.map(r=>[r.max_tokens,r.model,r.temperature]),[[-1,'exact-27b',.1],[-1,'exact-27b',.5]]);
  await assert.rejects(ai.save({enabled:true,model:'bad',baseUrl:f.baseUrl,replyTokens:-2}));
  assert.equal((await ai.config()).model,'exact-27b');
  await ai.save({enabled:true,model:'exact-27b',baseUrl:f.baseUrl,replyTokens:240});
  await ai.complete({system:'s',prompt:'p'});assert.equal(requests.at(-1).max_tokens,240);
});
for(const kind of ['length','reasoning-only','oversized'])test('uncapped still rejects '+kind+' without retry',async t=>{
  let calls=0;
  const f=await fixture(t,(req,res)=>{req.resume();req.on('end',()=>{calls++;res.setHeader('Content-Type','application/json');
    res.end(JSON.stringify({choices:[{finish_reason:kind==='length'?'length':'stop',message:{content:kind==='reasoning-only'?'':kind==='oversized'?'x'.repeat(140000):'Partial',reasoning_content:'test'}}]}));
  });});const ai=createLocalAI(f);await ai.save({enabled:true,model:'test',baseUrl:f.baseUrl,replyTokens:-1});
  await assert.rejects(ai.complete({system:'s',prompt:'p'}),kind==='length'?/output limit/:kind==='oversized'?/size limit/:/finished text/);
  assert.equal(calls,1);assert.equal(ai.status().busy,false);
});
for(const phase of ['headers','body'])test('uncapped cancellation during '+phase+' preserves single-flight behaviour',async t=>{
  let seen;const arrived=new Promise(r=>seen=r);let calls=0;
  const f=await fixture(t,(req,res)=>{req.resume();req.on('end',()=>{calls++;if(phase==='body'){res.writeHead(200,{'Content-Type':'application/json'});res.write('{');}seen();});});
  const ai=createLocalAI(f);await ai.save({enabled:true,model:'test',baseUrl:f.baseUrl,replyTokens:-1});
  const pending=ai.complete({system:'s',prompt:'p'});const rejected=assert.rejects(pending,/cancelled/);await arrived;
  await assert.rejects(ai.complete({system:'s',prompt:'p'}),/busy/);assert.equal(ai.cancel(),true);await rejected;
  assert.equal(calls,1);assert.equal(ai.status().busy,false);
});
test('uncapped output keeps the configured elapsed-time deadline',{timeout:6000},async t=>{
  let calls=0;const f=await fixture(t,(req,res)=>{calls++;req.resume();});
  const ai=createLocalAI(f);await ai.save({enabled:true,model:'test',baseUrl:f.baseUrl,replyTokens:-1,timeoutMs:3000});
  const start=Date.now();await assert.rejects(ai.complete({system:'s',prompt:'p'}),/wait limit/);
  assert.ok(Date.now()-start>=2900);assert.equal(calls,1);assert.equal(ai.status().busy,false);
});
for(const [raw,expected]of [[undefined,260],['-1',-1],['240',240]])test('legacy narrator uses its explicit output setting: '+raw,async()=>{
  const {N,restore}=legacy(raw);try{
    const s=E.createNewGame({classId:'fighter'});let body;
    const out=await N.narrate(s,E.buildView(s),{type:'opening'},[],null,async(_u,o)=>{body=JSON.parse(o.body);return {ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'The party waits.'}}]})};});
    assert.equal(out.source,'ai');assert.equal(body.max_tokens,expected);
  }finally{restore();}
});
for(const raw of ['-2','0','oops','','1.5'])test('invalid explicit legacy output does not contact a model: '+JSON.stringify(raw),async()=>{
  const {N,restore}=legacy(raw);try{
    let calls=0;const s=E.createNewGame({classId:'fighter'});
    const out=await N.narrate(s,E.buildView(s),{type:'opening'},[],null,async()=>{calls++;return {ok:true,json:async()=>({choices:[{message:{content:'Wrong'}}]})};});
    assert.equal(calls,0);assert.equal(out.source,'deterministic-fallback');assert.match(out.error,/AI_REPLY_TOKENS/);
  }finally{restore();}
});
test('legacy narrator rejects truncated final text instead of displaying partial output',async()=>{
  const {N,restore}=legacy('-1');try{
    const s=E.createNewGame({classId:'fighter'}),before=JSON.stringify(s.player);let calls=0;
    const out=await N.narrate(s,E.buildView(s),{type:'opening'},[],null,async()=>{calls++;return {ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'Unfinished claims'}}]})};});
    assert.equal(out.source,'deterministic-fallback');assert.equal(calls,1);assert.equal(JSON.stringify(s.player),before);assert.doesNotMatch(out.text,/Unfinished claims/);
  }finally{restore();}
});
