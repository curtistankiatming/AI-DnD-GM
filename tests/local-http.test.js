'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {localResponse,MAX_REPLY_BYTES}=require('../src/local-http');
const {createLocalAI}=require('../src/local-ai');
async function fixture(t,handler){
  const server=http.createServer(handler);
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
  return {server,url:`http://127.0.0.1:${server.address().port}/v1/chat/completions`};
}
const options=()=>({method:'POST',body:'{}',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(1500)});
function answer(res,text='A finished response.'){res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:text}}]}));}
async function provider(t,url){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-http-client-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const ai=createLocalAI({configPath:path.join(dir,'ai.json')});
  await ai.save({enabled:true,baseUrl:url.replace('/chat/completions',''),model:'test-only',timeoutMs:3000});return ai;
}

test('real transport decodes chunked UTF-8 without splitting a character',async t=>{
  const text='The ferryman says: résumé — 水。';
  const bytes=Buffer.from(JSON.stringify({answer:text}));
  const {url}=await fixture(t,(req,res)=>{req.resume();for(const byte of bytes)res.write(Buffer.from([byte]));res.end();});
  const result=await localResponse(url,options());assert.deepEqual(await result.json(),{answer:text});
});
test('same transport supports model listing without any generation request',async t=>{
  const paths=[];const {url}=await fixture(t,(req,res)=>{paths.push(req.url);res.end(JSON.stringify({data:[{id:'my-installed-model'}]}));});
  const ai=await provider(t,url);assert.deepEqual(await ai.models(),['my-installed-model']);assert.deepEqual(paths,['/v1/models']);
});
test('no redirect is followed, including a second loopback fixture',async t=>{
  let targetCalls=0;
  const target=await fixture(t,(req,res)=>{targetCalls++;res.end('{}');});
  const origin=await fixture(t,(req,res)=>{res.writeHead(302,{Location:target.url});res.end();});
  await assert.rejects(localResponse(origin.url,options()),/redirect refused/);assert.equal(targetCalls,0);
});
test('HTTP failures report the status, not a private response body',async t=>{
  let calls=0;const {url}=await fixture(t,(req,res)=>{calls++;res.writeHead(503);res.end('private-server-detail');});
  const ai=await provider(t,url);await assert.rejects(ai.complete({system:'rules',prompt:'facts'}),e=>/HTTP 503/.test(e.message)&&!e.message.includes('private-server-detail'));assert.equal(calls,1);
});
for(const declared of [true,false])test(`byte limit applies to ${declared?'declared':'chunked'} bodies`,async t=>{
  const {url}=await fixture(t,(req,res)=>{req.resume();if(declared)res.setHeader('Content-Length',MAX_REPLY_BYTES+1);res.end('x'.repeat(MAX_REPLY_BYTES+1));});
  await assert.rejects(localResponse(url,options()),/size limit/);
});
test('body byte limit is enforced even when UTF-8 character count is smaller',async t=>{
  const {url}=await fixture(t,(req,res)=>{req.resume();res.end('水'.repeat(45000));});
  await assert.rejects(localResponse(url,options()),/size limit/);
});
test('incomplete body is rejected rather than accepted as finished JSON',async t=>{
  const {url}=await fixture(t,(req,res)=>{req.resume();res.writeHead(200,{'Content-Length':100});res.write('{}');setImmediate(()=>res.destroy());});
  await assert.rejects(localResponse(url,options()),/disconnected|connection failed/);
});
for(const mode of ['before-headers','during-body'])test(`cancel ${mode} releases the real local request and busy slot`,async t=>{
  let started,closed;const accepted=new Promise(r=>started=r),ended=new Promise(r=>closed=r);let calls=0;
  const {url}=await fixture(t,(req,res)=>{calls++;req.resume();if(mode==='during-body'){res.writeHead(200);res.write(' ');}res.on('close',closed);started();});
  const ai=await provider(t,url),pending=ai.complete({system:'R',prompt:'Q'});await accepted;
  assert.equal(ai.status().busy,true);assert.equal(ai.cancel(),true);await assert.rejects(pending,/cancelled/);
  await Promise.race([ended,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(new Error('Socket was not closed')),1000);timer.unref();})]);
  assert.equal(ai.status().busy,false);assert.equal(calls,1);
});
test('progressing body does not reset the configured overall deadline',{timeout:5000},async t=>{
  let interval,calls=0;
  const {url}=await fixture(t,(req,res)=>{calls++;req.resume();res.write(' ');interval=setInterval(()=>res.write(' '),30);res.on('close',()=>clearInterval(interval));});
  t.after(()=>clearInterval(interval));const ai=await provider(t,url),start=performance.now();
  await assert.rejects(ai.complete({system:'R',prompt:'Q'}),/configured wait limit/);
  assert.ok(performance.now()-start>=2850);assert.equal(calls,1);assert.equal(ai.status().busy,false);
});
test('pre-cancelled requests do not contact even the local fixture',async t=>{
  let calls=0;const {url}=await fixture(t,(req,res)=>{calls++;res.end('{}');});
  const c=new AbortController();c.abort();await assert.rejects(localResponse(url,{...options(),signal:c.signal}),/aborted/);assert.equal(calls,0);
});
test('transport refuses an unbounded request before connecting',async t=>{
  let calls=0;const {url}=await fixture(t,(req,res)=>{calls++;res.end('{}');});await assert.rejects(localResponse(url),/bounded request signal/);assert.equal(calls,0);
});
test('a completed request removes its abort listener and permits another request',async t=>{
  let calls=0;const {url}=await fixture(t,(req,res)=>{calls++;req.resume();answer(res);});const ai=await provider(t,url);
  await ai.complete({system:'R',prompt:'one'});assert.equal(ai.cancel(),false);
  await ai.complete({system:'R',prompt:'two'});assert.equal(calls,2);
});
test('localhost stays on the local fixture without a cloud fallback',async t=>{
  const {url}=await fixture(t,(req,res)=>{req.resume();answer(res);});const ai=await provider(t,url.replace('127.0.0.1','localhost'));
  assert.equal((await ai.complete({system:'R',prompt:'Q'})).text,'A finished response.');
});
