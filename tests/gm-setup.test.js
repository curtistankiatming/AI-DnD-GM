'use strict';
// Game master setup: saving a pasted Claude key and testing the connection.
// No real API calls: the unit tests inject a fake client and the HTTP test points
// the server at a loopback stand-in. Every file is written to an OS temp folder.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');
const {createClaudeProvider,saveKey,validKey}=require('../src/claude-ai');
const {createLocalAI}=require('../src/local-ai');
const root=path.join(__dirname,'..');
const KEY='sk-ant-test-'+'a'.repeat(40);
async function temp(t){const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-gm-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));return dir;}

test('a pasted key is checked before anything is written',async t=>{
  const file=path.join(await temp(t),'.env');
  for(const bad of [undefined,'',42,'hello','sk-ant-short','sk-ant-'+'a'.repeat(30)+' b','sk-ant-'+'a'.repeat(30)+'\nOTHER=1','sk-ant-'+'a'.repeat(30)+'"'])
    await assert.rejects(saveKey(file,bad),/does not look like a Claude API key/);
  await assert.rejects(fs.access(file));
  assert.equal(validKey(KEY),true);
});
test('the key file keeps other lines, replaces an older key and is private',async t=>{
  const file=path.join(await temp(t),'.env');
  await fs.writeFile(file,'# my notes\nOTHER=1\nANTHROPIC_API_KEY=\nexport ANTHROPIC_API_KEY=old\n\n');
  assert.equal(await saveKey(file,'  '+KEY+'\n'),KEY);
  assert.equal(await fs.readFile(file,'utf8'),`# my notes\nOTHER=1\nANTHROPIC_API_KEY=${KEY}\n`);
  if(process.platform!=='win32')assert.equal((await fs.stat(file)).mode&0o077,0);
  await saveKey(file,KEY+'b');
  assert.equal((await fs.readFile(file,'utf8')).split('ANTHROPIC_API_KEY=').length-1,1);
  await assert.rejects(fs.access(file+'.tmp'));
});
test('the connection test asks one tiny question and never needs the AI to be turned on',async t=>{
  const dir=await temp(t),calls=[];
  const claude=createClaudeProvider({clientFactory:()=>({beta:{messages:{create:async body=>{calls.push(body);return {model:'claude-opus-5-5',stop_reason:'end_turn',content:[{type:'text',text:'READY'}]};}}}})});
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),claude});
  const out=await ai.test({provider:'claude',enabled:false,effort:'high'});
  assert.equal(out.ok,true);assert.equal(out.model,'claude-opus-5-5');
  assert.equal(calls.length,1);assert.equal(calls[0].max_tokens,1024);assert.equal(calls[0].output_config.effort,'low');
  assert.equal((await ai.config()).enabled,false,'testing does not change saved settings');
  const failing=createLocalAI({configPath:path.join(dir,'ai2.json'),claude:createClaudeProvider({env:{}})});
  await assert.rejects(failing.test({provider:'claude'}),/ANTHROPIC_API_KEY/);
});

test('HTTP: paste a key, test the connection, and the key never comes back',async t=>{
  const dir=await temp(t),envFile=path.join(dir,'.env'),seen=[];
  const model=http.createServer((req,res)=>{let raw='';req.on('data',d=>raw+=d);req.on('end',()=>{
    const sent=req.headers['x-api-key']||String(req.headers.authorization||'').replace(/^Bearer /,'');
    seen.push({key:sent,body:JSON.parse(raw||'{}')});
    if(sent!==KEY){res.writeHead(401,{'content-type':'application/json'});res.end(JSON.stringify({type:'error',error:{type:'authentication_error',message:'invalid x-api-key'}}));return;}
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({id:'msg_test',type:'message',role:'assistant',model:'claude-opus-5-5',content:[{type:'text',text:'READY'}],stop_reason:'end_turn',usage:{input_tokens:1,output_tokens:1}}));});});
  await new Promise(r=>model.listen(0,'127.0.0.1',r));
  const probe=http.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
  const base=`http://127.0.0.1:${port}`;
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),SAVE_DIR:path.join(dir,'saves'),AI_CONFIG_PATH:path.join(dir,'settings.json'),ENV_FILE_PATH:envFile,ANTHROPIC_API_KEY:'',ANTHROPIC_BASE_URL:`http://127.0.0.1:${model.address().port}`,AI_NARRATOR:'off',LOCAL_AI_TOKEN:''},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  t.after(async()=>{if(child.exitCode===null){child.kill();await new Promise(r=>{child.once('exit',r);setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');},1000).unref();});}await new Promise(r=>model.close(r));});
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,40));}assert.ok(ready,output);
  const post=async(route,body,headers={})=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...headers},body:JSON.stringify(body)});return {status:r.status,text:await r.text()};};
  const settings=async()=>(await (await fetch(base+'/api/ai/settings')).json());
  assert.equal((await settings()).claudeKeyConfigured,false);

  const untested=await post('/api/ai/test',{config:{provider:'claude'}});
  assert.equal(untested.status,400);assert.match(untested.text,/ANTHROPIC_API_KEY/);assert.equal(seen.length,0,'no request without a key');

  const bad=await post('/api/ai/key',{key:'not a key'});assert.equal(bad.status,400);await assert.rejects(fs.access(envFile));
  const cross=await post('/api/ai/key',{key:KEY},{Origin:'http://evil.example'});assert.equal(cross.status,403);await assert.rejects(fs.access(envFile));

  const saved=await post('/api/ai/key',{key:KEY});
  assert.equal(saved.status,200);assert.deepEqual(JSON.parse(saved.text),{claudeKeyConfigured:true});
  assert.equal(await fs.readFile(envFile,'utf8'),`ANTHROPIC_API_KEY=${KEY}\n`);
  const after=await settings();assert.equal(after.claudeKeyConfigured,true);assert.equal(after.config.enabled,false);
  assert.doesNotMatch(JSON.stringify(after),/sk-ant-/);

  const tested=await post('/api/ai/test',{config:{provider:'claude'}});
  assert.equal(tested.status,200,tested.text);assert.equal(JSON.parse(tested.text).ok,true);assert.doesNotMatch(tested.text,/sk-ant-/);
  assert.equal(seen.length,1);assert.equal(seen[0].key,KEY);assert.equal(seen[0].body.max_tokens,1024);
  assert.equal((await settings()).config.enabled,false,'a test alone does not turn the AI on');
  await assert.rejects(fs.access(path.join(dir,'settings.json')),'no settings file is written by a key or a test');
  assert.doesNotMatch(output,/sk-ant-/,'the key is not logged');
});
