'use strict';
// Workload presets, NOT claims about a model's measured quality or VRAM needs.
// Parameter count, family, quantization and inference-server features are separate.
const PROFILES=Object.freeze({
  compact:Object.freeze({id:'compact',name:'Compact · start here for 7B-class models',contextChars:8000,replyTokens:160,historyTurns:4}),
  balanced:Object.freeze({id:'balanced',name:'Balanced · starting point for 12B-class models',contextChars:14000,replyTokens:240,historyTurns:8}),
  expanded:Object.freeze({id:'expanded',name:'Expanded · starting point for 27B-class models',contextChars:22000,replyTokens:320,historyTurns:12})
});
const DEFAULTS=Object.freeze({enabled:false,baseUrl:'http://127.0.0.1:1234/v1',model:'',profile:'compact',format:'plain-json',roles:'system-user',timeoutMs:600000});
const SETTINGS=new Set([...Object.keys(DEFAULTS),'contextChars','replyTokens']);
function integer(value,min,max,name){if(!Number.isInteger(value)||value<min||value>max)throw new Error(`${name} must be a whole number from ${min} to ${max}.`);return value;}
// -1 is an explicit server-specific no-token-cap request, not an unlimited wait.
function replyTokenLimit(value){return value===-1?-1:integer(value,64,768,'Reply token limit');}
function normalize(raw={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('AI settings must be an object.');
  for(const k of Object.keys(raw))if(!SETTINGS.has(k))throw new Error(`Unsupported AI setting: ${k}.`);
  const c={...DEFAULTS,...raw};
  if(typeof c.enabled!=='boolean')throw new Error('AI enabled must be true or false.');
  if(!Object.hasOwn(PROFILES,c.profile))throw new Error('Select a supported workload profile.');
  const p=PROFILES[c.profile];
  if(typeof c.model!=='string'||c.model.length>240||/[\r\n\x00]/.test(c.model))throw new Error('Use the exact local model identifier.');
  c.model=c.model.trim();
  if(c.enabled&&!c.model)throw new Error('Choose a model before enabling local AI.');
  if(typeof c.baseUrl!=='string')throw new Error('Use a local API address.');
  let u;try{u=new URL(c.baseUrl);}catch{throw new Error('Use a valid local API address.');}
  if(!['http:','https:'].includes(u.protocol)||!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.username||u.password||u.search||u.hash)throw new Error('This preview only connects to a loopback local server. Cloud and LAN endpoints are disabled.');
  if(!['','/','/v1','/v1/'].includes(u.pathname))throw new Error('Use the API base address ending in /v1, not a chat or model route.');
  c.baseUrl=u.origin+'/v1';
  if(!['plain-json','json-schema'].includes(c.format))throw new Error('Select plain JSON or explicitly supported JSON Schema output.');
  if(!['system-user','single-user'].includes(c.roles))throw new Error('Select system/user or single-user prompt roles.');
  c.timeoutMs=integer(c.timeoutMs,3000,600000,'Timeout');
  c.contextChars=integer(c.contextChars??p.contextChars,4000,32000,'Context character budget');
  c.replyTokens=replyTokenLimit(c.replyTokens===undefined?p.replyTokens:c.replyTokens);
  return c;
}
function manifest(){return {profiles:Object.values(PROFILES),defaults:{...DEFAULTS},
  note:'7B/12B/27B are workload starting points, not compatibility certifications. Use the exact model ID reported by your local server. Qwen, Gemma and other instruction models share this adapter; no model is downloaded or switched automatically. Context limits here are characters, not tokenizer-measured tokens.'};}
module.exports={PROFILES,DEFAULTS,normalize,manifest,replyTokenLimit};
