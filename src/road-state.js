'use strict';
// Save schema for the optional connected adventure. Model prose is never read here.
const PHASES=['wagon','crossing','infirmary','complete'];
const ACTIONS=['rumor','inspect','promise','decline','repair','pay-repair','crew-repair','depart','scout','rope','ferry','raft','open-parcel','care','deliver','return','cache'];
function normalize(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const pick=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
  return {version:1,phase:pick(raw.phase,PHASES,'wagon'),active:Boolean(raw.active),
    returnNode:pick(raw.returnNode,['briarwatch-square','town-briarwatch'],'briarwatch-square'),
    attempted:Array.isArray(raw.attempted)?[...new Set(raw.attempted.filter(x=>ACTIONS.includes(x)))]:[],
    rumorHeard:Boolean(raw.rumorHeard),axleKnown:Boolean(raw.axleKnown),riverKnown:Boolean(raw.riverKnown),
    wagon:pick(raw.wagon,['blocked','repaired','hired','crew'],'blocked'),
    crossing:pick(raw.crossing,['blocked','rope','ferry','raft'],'blocked'),
    promise:pick(raw.promise,['none','active','declined','kept','broken'],'none'),
    care:pick(raw.care,['none','aided','setback'],'none'),
    delay:Math.max(0,Math.min(8,Math.floor(Number(raw.delay)||0))),
    trust:Math.max(-2,Math.min(3,Math.floor(Number(raw.trust)||0))),
    quality:pick(raw.quality,['pending','timely','delayed'],'pending'),
    rewardClaimed:Boolean(raw.rewardClaimed),cacheClaimed:Boolean(raw.cacheClaimed),
    history:Array.isArray(raw.history)?raw.history.filter(x=>typeof x==='string').slice(-24).map(x=>x.slice(0,500)):[]};
}
module.exports={normalize,PHASES,ACTIONS};
