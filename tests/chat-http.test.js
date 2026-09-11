'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),net=require('node:net');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('local HTTP chat connects only to an explicitly selected mock; instructions and outcomes survive saves',{timeout:15000},async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-chat-http-'));
  const calls=[];let error=false;
  const model=http.createServer((req,res)=>{let data='';req.on('data',d=>data+=d);req.on('end',()=>{
    if(req.url==='/v1/models'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({data:[{id:'test-7b'},{id:'test-12b'},{id:'test-27b'}]}));}
    const body=JSON.parse(data);calls.push(body);res.setHeader('Content-Type','application/json');
    if(error){res.statusCode=503;return res.end('{}');}
    const input=JSON.parse(body.messages.at(-1).content);
    const content=input.mode?JSON.stringify(input.mode==='question'?{kind:'question',optionId:'',reply:'The visible training echo faces you; consult the listed resources.'}:{kind:'action',optionId:'courier:aid',reply:''}):'The courier leaves the ferry safely. The official notes the corrected toll.';
    res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content}}]}));
  });});await new Promise(r=>model.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${await port()}`;
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:new URL(base).port,SAVE_DIR:path.join(dir,'saves'),AI_CONFIG_PATH:path.join(dir,'settings.json'),AI_NARRATOR:'off',LOCAL_AI_TOKEN:''},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
  t.after(async()=>{if(child.exitCode===null){child.kill();await new Promise(r=>{child.once('exit',r);setTimeout(()=>{if(child.exitCode===null)child.kill('SIGKILL');},1000).unref();});}await new Promise(r=>model.close(r));await fs.rm(dir,{recursive:true,force:true});});
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,40));}assert.ok(ready,output);
  let id=0;
  const post=async(route,body)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(body)});return {status:r.status,payload:await r.json()};};
  const chat=(state,request)=>post('/api/chat',{state,request:{requestId:`http_turn_${++id}`, ...request}});
  const settings=await (await fetch(base+'/api/ai/settings')).json();assert.equal(settings.config.enabled,false);assert.equal(settings.profiles.length,3);
  const config={enabled:true,baseUrl:`http://127.0.0.1:${model.address().port}/v1`,model:'test-12b',profile:'balanced'};
  assert.equal((await post('/api/ai/settings',{config})).status,200);
  const listed=await post('/api/ai/models',{});assert.deepEqual(listed.payload.models,['test-7b','test-12b','test-27b']);assert.equal(calls.length,0);
  let state=(await post('/api/session/new',{classId:'fighter'})).payload.state;
  state=(await chat(state,{text:'/instructions Prefer diplomatic resolutions.'})).payload.state;
  assert.equal(calls.length,0,'Changing preferences must not call a model');
  state=(await chat(state,{text:'/scenario'})).payload.state;const before=state.player.xp;
  const proposal=await chat(state,{text:'I ask the official to settle this.'});assert.equal(proposal.status,200);state=proposal.payload.state;
  assert.equal(state.player.xp,before);assert.equal(state.chat.pending.optionId,'courier:aid');assert.equal(calls[0].model,'test-12b');
  assert.match(calls[0].messages.at(-1).content,/Prefer diplomatic resolutions/);
  const request={requestId:'http_confirm_repeat',confirm:true};const a=await post('/api/chat',{state,request});const b=await post('/api/chat',{state,request});
  assert.equal(a.status,200);assert.deepEqual(b,a);state=a.payload.state;assert.equal(state.player.xp,before+40);assert.equal(calls.length,2);
  assert.equal(a.payload.narration.source,'ai-chat');
  assert.equal((await post('/api/session/save',{slot:'chat-save',state})).status,200);
  const loaded=await (await fetch(base+'/api/session/load?slot=chat-save')).json();assert.deepEqual(loaded.state.chat,state.chat);assert.equal(loaded.state.player.xp,state.player.xp);assert.equal(loaded.narration.text,state.lastNarration);assert.equal(loaded.narration.source,'save');
  assert.doesNotMatch(JSON.stringify(loaded.state),/test-12b|settings.json|Bearer/);
  // Real game HTTP -> bounded local transport -> mock model, with combat context.
  let wizard=(await post('/api/session/new',{classId:'wizard'})).payload.state;
  wizard=(await post('/api/action',{state:wizard,action:{type:'practice'}})).payload.state;
  const oldXp=wizard.player.xp,oldResources=JSON.stringify(wizard.player.resources);
  const question=await chat(wizard,{mode:'question',text:'Who is fighting us and what spells remain?'});
  assert.equal(question.status,200);
  const facts=JSON.parse(calls.at(-1).messages.at(-1).content);
  assert.ok(facts.combat.actors.some(a=>a.name==='Guild Training Echo'));
  assert.deepEqual(facts.hero.resources,wizard.player.resources);
  assert.equal(question.payload.state.player.xp,oldXp);
  assert.equal(JSON.stringify(question.payload.state.player.resources),oldResources);
  error=true;const failed=await chat(state,{mode:'dialogue',text:'Thank you.'});assert.equal(failed.status,422);assert.match(failed.payload.narration.text,/HTTP 503/);assert.equal(failed.payload.state.player.xp,state.player.xp);
  const unavailable=await post('/api/ai/settings',{config:{...config,baseUrl:'https://other.invalid/v1'}});assert.equal(unavailable.status,400);
  assert.equal((await (await fetch(base+'/api/ai/settings')).json()).config.model,'test-12b');
  assert.equal((await fetch(base+'/api/health')).status,200);
});
