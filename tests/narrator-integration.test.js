'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), http=require('node:http');
const {createNewGame,buildView}=require('../src/engine');
test('optional narrator adapter handles compatible replies and falls back without changing game facts',{timeout:15000},async(t)=>{
  let mode='ok',requests=[];
  const server=http.createServer((req,res)=>{let raw='';req.on('data',b=>raw+=b);req.on('end',()=>{requests.push({path:req.url,body:JSON.parse(raw)});if(mode==='error'){res.writeHead(503);res.end('offline');}else{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:'Rain settles on the ward-bell. Your companions wait beside you.'}}]}));}});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const env={...process.env};process.env.AI_NARRATOR='on';process.env.LM_STUDIO_BASE_URL=`http://127.0.0.1:${server.address().port}/v1`;process.env.AI_MODEL='local-mock';delete process.env.OPENAI_API_KEY;
  delete require.cache[require.resolve('../src/narrator')];const N=require('../src/narrator');t.after(()=>{for(const key of Object.keys(process.env))if(!(key in env))delete process.env[key];Object.assign(process.env,env);delete require.cache[require.resolve('../src/narrator')];});
  const s=createNewGame({classId:'wizard'}),v=buildView(s);const before=JSON.stringify({player:s.player,party:s.party,story:s.story,world:s.world});
  const good=await N.narrate(s,v,{type:'opening'},[]);assert.equal(good.source,'ai');assert.match(good.text,/Rain settles/);assert.equal(requests[0].path,'/v1/chat/completions');assert.equal(requests[0].body.model,'local-mock');
  assert.equal(JSON.stringify({player:s.player,party:s.party,story:s.story,world:s.world}),before);
  mode='error';const fallback=await N.narrate(s,v,{type:'opening'},[]);assert.equal(fallback.source,'deterministic-fallback');assert.ok(fallback.text.length>0);assert.equal(JSON.stringify({player:s.player,party:s.party,story:s.story,world:s.world}),before);
  const count=requests.length;await N.narrate(s,v,{type:'buy'},[]);assert.equal(requests.length,count,'Transactions must not call a model.');
});
