'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine');
const P = require('../src/progression');
const { makeSandbox } = require('../src/public-preview');

for (const level of [1,5,10]) for (const remaining of ['full','partial','empty']) {
  test(`short rest, level ${level}, ${remaining}: recover Orin without refilling long-rest abilities`, () => {
    let s=makeSandbox({level});
    const orin=s.party.find(a=>a.id==='orin'), maren=s.party.find(a=>a.id==='maren');
    const max=P.companionResources('orin',level).secondWind;
    orin.resources.secondWind=remaining==='full'?max:remaining==='partial'?Math.max(0,max-1):0;
    maren.resources.healingWords=0; maren.resources.guidingBolt=0;
    const out=E.resolveAction(s,{type:'short-rest'},()=>0.5);
    assert.equal(out.result.ok,true);
    assert.equal(out.state.party[0].resources.secondWind,max);
    assert.deepEqual(out.state.party[1].resources,{healingWords:0,guidingBolt:0});
    assert.equal(out.state.player.xp,s.player.xp);
  });
  test(`long rest, level ${level}, ${remaining}: all declared capacities recovered`,()=>{
    let s=makeSandbox({level});
    for(const a of s.party) for(const k of Object.keys(a.resources)) a.resources[k]=remaining==='full'?a.resources[k]:0;
    const out=E.resolveAction(s,{type:'town-service',serviceId:'civic-rest'},()=>0.5);
    assert.equal(out.result.ok,true,JSON.stringify(out.result));
    for(const a of out.state.party)assert.deepEqual(a.resources,P.companionResources(a.id,level));
  });
}
test('normalization preserves spent companion uses and clamps invalid capacities',()=>{
  let s=makeSandbox({level:10});s.party[0].resources.secondWind=1;s.party[1].resources.healingWords=0;
  for(let i=0;i<5;i++)s=E.normalizeIncomingState(s);
  assert.equal(s.party[0].resources.secondWind,1);assert.equal(s.party[1].resources.healingWords,0);
  s.party[0].resources.secondWind=999; s.party[1].resources.healingWords=-5;
  s=E.normalizeIncomingState(s);
  assert.equal(s.party[0].resources.secondWind,3);assert.equal(s.party[1].resources.healingWords,0);
});
