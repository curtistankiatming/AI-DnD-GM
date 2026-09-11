'use strict';
const crypto=require('node:crypto');
const {resolveChat}=require('./chat-runtime');
// Bounded retry cache for this single-player local process, not multiplayer
// authority or anti-cheat. The client never retries a failed generation by itself.
function createCoordinator(provider, {rng=Math.random,now=Date.now,limit=64,ttl=1200000}={}){
  const cache=new Map();
  async function run(state,request){
    if(typeof request?.requestId!=='string'||! /^[a-zA-Z0-9_-]{8,100}$/.test(request.requestId))throw new Error('A chat request needs a unique request identifier.');
    const signature=crypto.createHash('sha256').update(JSON.stringify({state,request})).digest('hex');
    const key=String(state?.createdAt||'')+':'+request.requestId;
    for(const [id,entry]of cache)if(entry.done&&entry.expires<now())cache.delete(id);
    const prior=cache.get(key);
    if(prior){if(prior.signature!==signature)throw new Error('This request identifier was already used for a different turn. No action was repeated.');return structuredClone(await prior.promise);}
    if(cache.size>=limit){const done=[...cache].find(([,x])=>x.done);if(done)cache.delete(done[0]);else throw new Error('Too many pending chat requests.');}
    const entry={signature,done:false,expires:now()+ttl};
    entry.promise=resolveChat(state,request,provider,rng).finally(()=>{entry.done=true;entry.expires=now()+ttl;});
    cache.set(key,entry);return structuredClone(await entry.promise);
  }
  return {run};
}
module.exports={createCoordinator};
