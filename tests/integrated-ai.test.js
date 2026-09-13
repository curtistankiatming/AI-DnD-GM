'use strict';
// Real loopback game HTTP and disk saves; the model service is synthetic.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),http=require('node:http'),net=require('node:net');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const n=s.address().port;await new Promise(r=>s.close(r));return n;}
const mechanics=s=>({player:s.player,party:s.party,world:s.world,story:s.story,road:s.chat.road,combat:s.combat,turn:s.turnCount});
test('integrated uncapped chat, cancellation, one-time delivery and real server restart',{timeout:30000},async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-integrated-ai-'));
  const calls=[];let policy='normal',arrived=null,child=null;
  const model=http.createServer((req,res)=>{let raw='';req.on('data',d=>raw+=d);req.on('end',()=>{
    res.setHeader('Content-Type','application/json');
    if(req.url==='/v1/models')return res.end(JSON.stringify({data:[{id:'synthetic-only'}]}));
    if(req.url!=='/v1/chat/completions'){res.statusCode=404;return res.end('{}');}
    let body;try{body=JSON.parse(raw);}catch{res.statusCode=400;return res.end('{}');}calls.push(body);
    if(policy==='wait'){arrived?.();return;}
    const p=JSON.parse(body.messages.at(-1).content);
    const content=p.mode?JSON.stringify(policy==='action'?{kind:'action',optionId:'road:repair',reply:''}:{kind:p.mode==='question'?'dialogue':'question',optionId:'',reply:'Synthetic read-only reply.'}):'Synthetic consequence: '+p.result;
    res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content}}]}));
  });});await new Promise(r=>model.listen(0,'127.0.0.1',r));
  let base='';
  async function stop(){const p=child;if(!p||p.exitCode!==null||p.signalCode!==null)return;
    await new Promise(resolve=>{p.once('exit',resolve);p.kill();const timer=setTimeout(()=>p.kill('SIGKILL'),1000);timer.unref();p.once('exit',()=>clearTimeout(timer));});}
  t.after(async()=>{await stop();model.closeAllConnections();await new Promise(r=>model.close(r));await fs.rm(dir,{recursive:true,force:true});});
  async function start(){base=`http://127.0.0.1:${await freePort()}`;
    child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:new URL(base).port,SAVE_DIR:path.join(dir,'saves'),AI_CONFIG_PATH:path.join(dir,'settings.json'),AI_NARRATOR:'off',LOCAL_AI_TOKEN:''},stdio:['ignore','pipe','pipe']});
    let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>log+=d);
    for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,40));}throw Error(log||'Test server did not start');}
  await start();let serial=0;
  const post=async(route,data)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(data)});return {status:r.status,payload:await r.json()};};
  const chat=(state,request)=>post('/api/chat',{state,request:{requestId:'integrated_'+(++serial),...request}});
  const config={enabled:true,model:'synthetic-only',baseUrl:`http://127.0.0.1:${model.address().port}/v1`,replyTokens:-1,timeoutMs:600000};
  assert.equal((await post('/api/ai/settings',{config})).status,200);
  let state=(await post('/api/session/new',{classId:'fighter'})).payload.state;
  for(const mode of ['question','dialogue']){
    const before=mechanics(state),out=await chat(state,{mode,text:'Describe the surroundings.'});
    assert.equal(out.status,200);assert.equal(out.payload.result.kind,mode);assert.equal(out.payload.result.responseType.adjusted,true);
    assert.deepEqual(mechanics(out.payload.state),before);assert.ok(!out.payload.state.chat.pending);state=out.payload.state;
  }
  policy='action';let rejected=await chat(state,{mode:'question',text:'Describe the surroundings.'});assert.equal(rejected.status,422);assert.deepEqual(mechanics(rejected.payload.state),mechanics(state));policy='normal';
  state=(await chat(state,{text:'/instructions Hopeful, concise; leave decisions to me.'})).payload.state;
  state=(await chat(state,{text:'/journey'})).payload.state;
  const count=calls.length;
  for(const text of ['I do not repair the wagon.','I repair the wagon and then depart immediately.']){
    const out=await chat(state,{text});assert.ok(!out.payload.state.chat.pending);assert.deepEqual(mechanics(out.payload.state),mechanics(state));state=out.payload.state;
  }
  let offer=await chat(state,{text:'I offer my labor to fix the wagon in exchange for help, not a payment.'});assert.equal(offer.payload.state.chat.pending.optionId,'road:repair');assert.equal(calls.length,count);
  const cancelled=await chat(offer.payload.state,{cancel:true});assert.deepEqual(mechanics(cancelled.payload.state),mechanics(state));assert.ok(!cancelled.payload.state.chat.pending);
  async function choose(id){const p=await chat(state,{text:'road:'+id});assert.ok(p.payload.state.chat.pending,id);const done=await chat(p.payload.state,{confirm:true});assert.equal(done.status,200);state=done.payload.state;return done;}
  await choose('promise');await choose('crew-repair');await choose('depart');await choose('raft');
  const oldGold=state.player.gold,oldXp=state.player.xp;
  const delivery=await chat(state,{text:'road:deliver'}),input=delivery.payload.state;
  policy='wait';const waiting=new Promise(r=>arrived=r),request={requestId:'integrated_delivery_once',confirm:true};
  const active=post('/api/chat',{state:input,request});await waiting;
  assert.equal((await post('/api/ai/cancel',{})).status,200);
  const done=await active;assert.equal(done.status,200);state=done.payload.state;
  assert.equal(state.player.gold,oldGold+15);assert.equal(state.player.xp,oldXp+120);assert.equal(state.chat.road.promise,'kept');assert.equal(state.chat.road.cacheClaimed,false);
  assert.match(done.payload.narration.text,/already committed/);assert.match(done.payload.result.canonical,/Your party’s trade reputation/);
  const callCount=calls.length;assert.deepEqual(await post('/api/chat',{state:input,request}),done);assert.equal(calls.length,callCount,'same request ID must not retry narration or delivery');
  assert.equal((await post('/api/session/save',{slot:'integrated-save',state})).status,200);
  await stop();policy='normal';await start();
  const stored=(await (await fetch(base+'/api/ai/settings')).json()).config;assert.equal(stored.replyTokens,-1);assert.equal(stored.model,'synthetic-only');assert.equal(stored.timeoutMs,600000);
  const loaded=await (await fetch(base+'/api/session/load?slot=integrated-save')).json();assert.deepEqual(mechanics(loaded.state),mechanics(state));assert.equal(loaded.state.chat.instructions,state.chat.instructions);assert.equal(loaded.narration.source,'save');assert.equal(calls.length,callCount);
  state=loaded.state;const repeat=await chat(state,{confirm:true});assert.equal(repeat.status,422);assert.deepEqual(mechanics(repeat.payload.state),mechanics(state));
  await choose('cache');assert.equal(state.chat.road.cacheClaimed,true);assert.equal(state.player.xp,oldXp+120);assert.equal(state.player.gold,oldGold+15);
  const after=mechanics(state);const again=await chat(state,{text:'road:cache'});assert.ok(!again.payload.state.chat.pending);assert.deepEqual(mechanics(again.payload.state),after);
  assert.ok(calls.length>3);for(const c of calls){assert.equal(c.max_tokens,-1);assert.equal(c.model,'synthetic-only');assert.equal(c.stream,false);}
  const consequence=JSON.parse(calls.find(c=>JSON.parse(c.messages.at(-1).content).ownership?.herbGift==='offered-not-collected').messages.at(-1).content);
  assert.equal(consequence.ownership.partyTradeReputation.owner,'player party');assert.equal(consequence.ownership.tamsinTrust.owner,'Tamsin');
  assert.doesNotMatch(JSON.stringify(state),/synthetic-only|settings.json|Bearer/);
});
