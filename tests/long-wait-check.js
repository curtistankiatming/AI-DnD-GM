'use strict';
// Opt-in REAL-DURATION acceptance probe, not part of the fast unit suite.
// Four independent local HTTP stubs, no actual models or real save files.
// Run: LONG_WAIT_OUTPUT=/path/result.json node tests/long-wait-check.js
const http=require('node:http'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createLocalAI}=require('../src/local-ai');
const DELAY=335000, DEADLINE=600000;
async function probe(kind){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-wall-clock-'));
  const timers=[]; let requests=0;
  const server=http.createServer((req,res)=>{
    requests++; req.resume();
    const answer=JSON.stringify({choices:[{finish_reason:'stop',message:{content:'The courier is safe. No new reward is granted.'}}]});
    if(kind==='deadline'){
      res.writeHead(200,{'Content-Type':'application/json'});res.write(' ');
      timers.push(setInterval(()=>res.write(' '),10000)); // Progress must NOT extend the deadline.
    }else if(kind==='body'){
      res.writeHead(200,{'Content-Type':'application/json'});res.write(answer.slice(0,20));
      timers.push(setTimeout(()=>res.end(answer.slice(20)),DELAY));
    }else timers.push(setTimeout(()=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(answer);},DELAY));
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const baseUrl=`http://127.0.0.1:${server.address().port}/v1`;
  const ai=createLocalAI({configPath:path.join(dir,'ai.json')});
  await ai.save({enabled:true,baseUrl,model:'local-fixture-only',timeoutMs:DEADLINE});
  const result={kind,configuredTimeoutMs:DEADLINE,responseDelayMs:kind==='deadline'?null:DELAY,startedAt:new Date().toISOString()};
  const start=performance.now();
  try{
    if(kind==='legacy'){
      // Narration now shares the AI service, so this checks the same deadline through narrate().
      await ai.save({enabled:true,baseUrl,model:'local-fixture-only',timeoutMs:DEADLINE,narration:true});
      const N=require('../src/narrator'),E=require('../src/engine');
      const state=E.createNewGame();
      const output=await N.narrate(state,E.buildView(state),{type:'opening'},[],null,ai);if(output.source!=='ai')throw new Error(output.error||'Narration fallback');result.completed=true;
    }else{await ai.complete({system:'Describe only the facts.',prompt:'A courier was released.'});result.completed=true;}
  }catch(error){result.completed=false;result.error=error.message;}
  finally{
    result.elapsedMs=Math.round(performance.now()-start);result.requests=requests;
    for(const t of timers){clearTimeout(t);clearInterval(t);}
    server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
    await fs.rm(dir,{recursive:true,force:true});
  }
  result.passed=requests===1 && (kind==='deadline'
    ? !result.completed && /configured wait limit/.test(result.error) && result.elapsedMs>=DEADLINE-500 && result.elapsedMs<DEADLINE+15000
    : result.completed && result.elapsedMs>=DELAY-500 && result.elapsedMs<DEADLINE);
  console.log(JSON.stringify(result));return result;
}
(async()=>{
  console.log('Real-clock local fixtures: two 335-second replies, legacy 335-second reply, and one 600-second absolute timeout.');
  const results=await Promise.all(['headers','body','legacy','deadline'].map(probe));
  const report={node:process.version,platform:process.platform,completedAt:new Date().toISOString(),realModelCalls:0,results,passed:results.every(x=>x.passed)};
  const output=process.env.LONG_WAIT_OUTPUT||path.join(os.tmpdir(),'briarwatch-long-wait-result.json');
  await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
  if(!report.passed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
