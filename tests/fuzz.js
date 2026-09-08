'use strict';
// Bounded diagnostic stress test. Fixtures may start at high levels; these are
// deliberately NOT reported as natural campaign progression.
const fs=require('node:fs'), assert=require('node:assert/strict');
const E=require('../src/engine'),G=require('../src/equipment'),P=require('../src/progression');
const {ITEMS,CLASSES}=require('../src/content');const {createSeededRng}=require('../src/rules');
function invariant(s){
 assert.ok(Number.isInteger(s.player.gold)&&s.player.gold>=0);assert.ok(Number.isInteger(s.player.xp)&&s.player.xp>=0);
 for(const a of [s.player,...s.party,...(s.combat?.actors||[])]){assert.ok(Number.isFinite(a.hp)&&Number.isFinite(a.maxHp)&&a.hp>=0&&a.hp<=a.maxHp);assert.ok(Number.isFinite(a.ac)&&a.ac>0);for(const r of Object.values(a.resources||{}))if(typeof r==='object'){assert.ok(Number.isFinite(r.current)&&r.current>=0&&r.current<=r.max);}}
 for(const i of s.player.inventory){assert.ok(Number.isInteger(i.quantity)&&i.quantity>0);assert.ok(G.allocated(s,i.itemId)<=i.quantity);if(ITEMS[i.itemId].charges)assert.ok(i.charges>0&&i.charges<=ITEMS[i.itemId].charges);}
 for(const stocks of Object.values(s.world.stock))for(const n of Object.values(stocks))assert.ok(Number.isInteger(n)&&n>=0);
}
function immutable(s){return JSON.stringify({gold:s.player.gold,xp:s.player.xp,inventory:s.player.inventory,stock:s.world.stock,storage:s.world.storage,node:s.story.nodeId});}
const rounds=Number(process.env.FUZZ_CASES||240),steps=Number(process.env.FUZZ_STEPS||60),out={fixtures:0,actions:0,accepted:0,rejected:0,reloads:0,failures:[],seed:19429};const rng=createSeededRng(out.seed),pick=a=>a[Math.floor(rng()*a.length)];
for(let run=0;run<rounds;run++){
 const cls=Object.keys(CLASSES)[run%6],level=[1,5,10][Math.floor(run/6)%3];let s=E.createNewGame({classId:cls,difficulty:pick(['story','standard','gritty'])});
 if(level>1)E.awardXp(s,P.XP_NEXT[level-1],[],'diagnostic fixture');s.player.gold=400;
 if(level===10){s.player.progression.specialization=pick(P.SPECIALIZATIONS[cls]).id;s.player.resources=P.resources(CLASSES[cls],level,s.player);}
 if(run%2)E.startCombat(s,'practice',rng,[]);s=E.normalizeIncomingState(s);out.fixtures++;
 for(let step=0;step<steps;step++){
  const v=E.buildView(s),pool=[{type:'missing-action'},{type:'buy',itemId:'healing-potion',quantity:-1},{type:'use-item',itemId:'healing-potion',targetId:'missing'}];
  if(v.combat){for(const a of v.combat.actions.filter(a=>!a.disabled)){if((a.targets||[]).length){for(const target of a.targets)pool.push({type:'combat',actionId:a.id,targetId:target.id});}else pool.push({type:'combat',actionId:a.id});}}
  else{
   for(const c of v.scene.choices.filter(c=>!c.locked&&!c.completed))pool.push({type:'story-choice',choiceId:c.id});
   if(v.world.town){for(const offer of v.world.shop.filter(x=>x.stock>0&&x.price<=s.player.gold))pool.push({type:'buy',itemId:offer.id,quantity:1});for(const u of v.world.upgrades)pool.push({type:'upgrade',itemId:u.itemId,actorId:u.actorId});pool.push({type:'practice'},{type:'town-service',serviceId:'civic-rest'});}
   for(const i of v.inventory){if(i.available>0)pool.push({type:'equip',itemId:i.id,actorId:pick(['player',...s.party.map(a=>a.id)])},{type:'store',itemId:i.id},{type:'sell',itemId:i.id,quantity:1});if(i.usable)pool.push({type:'use-item',itemId:i.id,targetId:'player'});}
   for(const r of v.progression.pending)for(const o of r.options)pool.push({type:'choose-reward',level:r.level,optionId:o.id});
  }
  const a=pick(pool),before=immutable(s);
  try{const r=E.resolveAction(s,a,rng);s=r.state;out.actions++;if(r.result.ok)out.accepted++;else{out.rejected++;assert.equal(immutable(s),before,'Rejected action changed protected facts');}invariant(s);if(step%11===0){s=E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));out.reloads++;invariant(s);}}
  catch(e){out.failures.push({fixture:run,step,classId:cls,level,action:a,error:e.stack});break;}
 }
}
console.log(JSON.stringify(out,null,2));if(process.env.FUZZ_OUTPUT)fs.writeFileSync(process.env.FUZZ_OUTPUT,JSON.stringify(out,null,2));if(out.failures.length)process.exitCode=1;
