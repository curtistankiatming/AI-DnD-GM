'use strict';
// Endless progression: renown ranks and capped boons after level 10.
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine');
const P=require('../src/progression');
const D=require('../src/director');
const I=require('../src/improvise');
const {ENEMIES}=require('../src/content');
const draft=require('./fixtures/director-draft');

const clone=x=>JSON.parse(JSON.stringify(x));
const CAP=P.XP_NEXT[9];
function hero(xp=CAP,{town=false}={}){
  const s=E.createNewGame({name:'Rhea',classId:'fighter'});
  s.player.level=10;s.player.xp=xp;
  if(town){s.world.completed.bell={day:1,quality:'force'};s.story.nodeId='town-briarwatch';s.world.townId='briarwatch';}
  return E.normalizeIncomingState(s);
}
const act=(s,action)=>E.resolveAction(s,action,()=>0.999);

test('ranks come from XP after level 10, one every RANK_XP',()=>{
  assert.equal(P.renownRank(hero(CAP).player),0);
  assert.equal(P.renownRank(hero(CAP+P.RANK_XP-1).player),0);
  assert.equal(P.renownRank(hero(CAP+P.RANK_XP).player),1);
  assert.equal(P.renownRank(hero(CAP+50*P.RANK_XP).player),50,'Ranks never run out.');
  const below=E.createNewGame({classId:'fighter'});below.player.xp=CAP*3;
  assert.equal(P.renownRank(below.player),0,'Only a level-10 hero earns renown.');
});

test('earning a rank announces it and offers a boon; XP is no longer wasted',()=>{
  const s=hero(CAP+P.RANK_XP-10,{town:true});
  const events=[];E.awardXp(s,20,events,'Test');
  assert.ok(events.some(e=>/renown rank 1/.test(e.text)));
  assert.equal(E.buildView(s).progression.renown.pending,1);
});

test('boons apply through the normal stat paths and respect their caps',()=>{
  let s=hero(CAP+3*P.RANK_XP);
  const hp=s.player.maxHp;
  let out=act(s,{type:'choose-boon',boonId:'vigor'});assert.equal(out.result.ok,true,out.result.error);s=out.state;
  assert.equal(s.player.maxHp,hp+6);
  out=act(s,{type:'choose-boon',boonId:'warding'});s=out.state;assert.equal(out.result.ok,true);
  assert.equal(act(s,{type:'choose-boon',boonId:'warding'}).result.ok,false,'Warding caps at 1.');
  s=act(s,{type:'choose-boon',boonId:'precision'}).state;
  assert.equal(P.stats(s.player).attack,1);assert.equal(P.stats(s.player).ac,1);
  assert.equal(P.pendingBoons(s.player),0);
  assert.match(act(s,{type:'choose-boon',boonId:'might'}).result.error,/No renown boon/);
  assert.equal(act(s,{type:'choose-boon',boonId:'flight'}).result.ok,false);
});

test('edited saves cannot claim more boons than ranks or caps allow',()=>{
  const s=hero(CAP+2*P.RANK_XP);s.player.progression.boons={warding:5,precision:9,might:1};
  const n=E.normalizeIncomingState(clone(s));
  const total=Object.values(n.player.progression.boons).reduce((a,b)=>a+b,0);
  assert.ok(total<=2);assert.ok((n.player.progression.boons.warding||0)<=1);
  for(const m of n.party)assert.equal(P.renownRank(m),0,'Companions never earn renown.');
});

test('AI adventures past level 10 scale with renown, capped, and reward a share of a rank',()=>{
  assert.deepEqual(D.rewards(10),{xp:1200,gold:220});
  let s=hero(CAP+4*P.RANK_XP,{town:true});
  const out=act(s,{type:'director-commission',draft:draft()});assert.equal(out.result.ok,true,out.result.error);
  const q=out.state.director.quests[out.result.questId];
  assert.equal(q.level,10);assert.equal(q.power,12);assert.equal(q.xp,1200);assert.equal(q.gold,20+12*20);
  assert.equal(ENEMIES[q.foe].maxHp,22+12*6,'Enemies use the challenge level.');
  assert.equal(act(out.state,{type:'depart',questId:q.id}).result.ok,true,'A level-10 hero can depart.');
  const t=clone(out.state);t.director.quests[q.id].power=99;
  assert.equal(E.normalizeIncomingState(t).director.quests[q.id].power,10+P.RENOWN_POWER_CAP);
  const legend=act(hero(CAP+100*P.RANK_XP,{town:true}),{type:'director-commission',draft:draft()});
  assert.equal(legend.state.director.quests[legend.result.questId].power,10+P.RENOWN_POWER_CAP,'Challenge stops growing at the cap.');
});

test('improvised XP keeps flowing past level 10',()=>{
  assert.equal(I.xpFor(10,'moderate'),Math.round(P.RANK_XP*0.05/5)*5);
});
