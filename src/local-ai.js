'use strict';
// Server-side only. Never included in the browser download. No cloud provider or
// automatic retry. A single in-flight request avoids stacking work on slow models.
const fs=require('node:fs/promises');
const path=require('node:path');
const Profiles=require('./model-profiles');
const {localResponse}=require('./local-http');
function createLocalAI({configPath=path.join(__dirname,'../.local-ai.json'),fetchImpl=localResponse}={}){
  let active=null;
  async function config(){try{return Profiles.normalize(JSON.parse(await fs.readFile(configPath,'utf8')));}catch(e){if(e.code==='ENOENT')return Profiles.normalize();throw new Error('Local AI settings could not be read. Save new settings or restore the settings file.');}}
  async function save(raw){
    if(active)throw new Error('Wait for or cancel the active AI request before changing models.');
    const c=Profiles.normalize(raw);await fs.mkdir(path.dirname(configPath),{recursive:true});
    const temp=configPath+'.tmp';try{await fs.writeFile(temp,JSON.stringify(c,null,2)+'\n');await fs.rename(temp,configPath);}finally{await fs.unlink(temp).catch(()=>{});}
    return c;
  }
  function cancel(){if(!active)return false;active.cancelled=true;active.controller.abort();return true;}
  async function jsonRequest(c,suffix,body,timeout){
    if(active)throw new Error('Local model is busy. Wait for its current reply instead of starting another request.');
    const ticket={controller:new AbortController(),cancelled:false};active=ticket;
    const timer=setTimeout(()=>ticket.controller.abort(),timeout);
    try{
      // Redirects are deliberately not followed to another (possibly paid) host.
      const res=await fetchImpl(c.baseUrl+suffix,{method:body?'POST':'GET',redirect:'error',signal:ticket.controller.signal,
        headers:{'Content-Type':'application/json',...(process.env.LOCAL_AI_TOKEN?{Authorization:`Bearer ${process.env.LOCAL_AI_TOKEN}`}:{})},
        ...(body?{body:JSON.stringify(body)}:{})});
      if(!res.ok)throw new Error(`Local model returned HTTP ${res.status}. Check the selected model and output format; no retry or fallback model was used.`);
      const reader=res.body?.getReader();let raw='';
      if(reader){const decoder=new TextDecoder();let total=0;for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>131072){await reader.cancel();throw new Error('Local model reply exceeded the size limit.');}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
      else raw=await res.text();
      if(ticket.controller.signal.aborted)throw new Error('aborted');
      if(raw.length>131072)throw new Error('Local model reply exceeded the size limit.');
      try{return JSON.parse(raw);}catch{throw new Error('Local server returned invalid JSON. No game action was applied.');}
    }catch(e){
      if(ticket.controller.signal.aborted)throw new Error(ticket.cancelled?'Local AI request cancelled. No automatic retry was made.':'Local AI reached its configured wait limit. No automatic retry or cloud fallback was used.');
      if(e.message.startsWith('Local '))throw e;
      throw new Error('Could not complete the local model connection. Check that Bionic or your compatible local server is running. No cloud fallback was used.');
    }finally{clearTimeout(timer);if(active===ticket)active=null;}
  }
  async function models(raw){const c=Profiles.normalize(raw||await config());const out=await jsonRequest(c,'/models',null,10000);
    if(!Array.isArray(out.data))throw new Error('Local model list was not in the expected format.');
    return out.data.filter(x=>typeof x?.id==='string').slice(0,100).map(x=>x.id.slice(0,240));}
  async function complete({system,prompt,schema=null,purpose='reply'}){
    const c=await config();if(!c.enabled)throw new Error('Local AI is off. Enable a selected model in AI settings to use it.');
    if(typeof system!=='string'||typeof prompt!=='string'||system.length+prompt.length>c.contextChars)throw new Error('The turn exceeds the selected context budget. No facts were silently truncated; choose a larger budget or shorten the instructions.');
    const body={model:c.model,stream:false,temperature:purpose==='plan'?0.1:0.5,max_tokens:c.replyTokens,
      messages:c.roles==='single-user'?[{role:'user',content:system+'\n\n'+prompt}]:[{role:'system',content:system},{role:'user',content:prompt}]};
    if(schema&&c.format==='json-schema')body.response_format={type:'json_schema',json_schema:{name:'game_proposal',strict:true,schema}};
    const started=Date.now();const out=await jsonRequest(c,'/chat/completions',body,c.timeoutMs);
    const choice=out.choices?.[0],text=choice?.message?.content;
    if(choice?.finish_reason==='length')throw new Error('The model reached its output limit before finishing. Increase the reply limit or choose a different profile; no automatic retry was made.');
    if(typeof text!=='string'||!text.trim())throw new Error('The model did not return a finished text answer. Reasoning-only output is not treated as a reply.');
    return {text:text.trim(),model:c.model,elapsedMs:Date.now()-started};
  }
  return {config,save,models,complete,cancel,status:()=>({busy:Boolean(active)}),manifest:Profiles.manifest};
}
module.exports={createLocalAI};
