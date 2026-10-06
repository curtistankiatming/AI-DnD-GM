'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../public/management-view');
const E=require('../src/engine');
const fresh=()=>E.buildView(E.createNewGame({classId:'fighter'}));
for(const category of ['weapon','armor','shield','focus','accessory'])test('equipment category '+category,()=>assert.equal(M.category({category}),'equipment'));
for(const [category,want]of [['consumable','consumables'],['tool','tools'],['material','materials'],['quest','quest'],['unknown','other']])test('inventory category '+category,()=>assert.equal(M.category({category}),want));
test('actor sheet projects all four slots for hero and each companion, without mutation',()=>{
 const v=fresh(),before=JSON.stringify(v);for(const a of M.members(v)){const slots=M.slots(v,a.id);assert.deepEqual(slots.map(s=>s.slot),['mainHand','offHand','armor','accessory']);}
 assert.equal(M.slots(v,'maren')[0].item.id,'ash-wand');assert.equal(JSON.stringify(v),before);assert.equal(M.slots(v,'unknown').length,0);
});
test('ownership covers all copies, never assumes hero owns companion gear',()=>{
 const v=fresh();assert.deepEqual(M.owners(v,'steel-shield').map(o=>o.actorId),['player','orin','maren']);
 assert.equal(M.owners(v,'war-mace')[0].actorId,'orin');assert.deepEqual(M.owners(v,'silk-rope'),[]);
});
test('search/category/owned filter only project visible records and preserve order/state',()=>{
 const v=fresh(),before=JSON.stringify(v);assert.equal(M.filter(v,'maren','equipment',false).length,3);
 assert.equal(M.filter(v,'','tools',false)[0].id,'silk-rope');assert.ok(M.filter(v,'','equipment',true).every(i=>i.available>0));
 assert.equal(M.filter(v,'does-not-exist','all',false).length,0);assert.equal(JSON.stringify(v),before);
});
test('purpose labels distinguish passive tools, partial consumables and quest objects',()=>{
 assert.match(M.usage({category:'tool'}),/Passive tool/);assert.match(M.usage({category:'quest'}),/Quest/);
 assert.match(M.usage({category:'consumable',canUseStory:true,charges:2}),/2 uses/);assert.match(M.usage({category:'material'}),/Material/);
});
test('comparison copies engine values, describes focus bonuses, never guesses damage averages',()=>{
 const c={acBefore:14,acAfter:16,damageBefore:'1d6+2',damageAfter:'1d8+2',spellDcBefore:0,spellDcAfter:1};
 const rows=M.comparison(c);assert.equal(rows.find(r=>r.label==='Armor Class').change,2);
 assert.equal(rows.find(r=>r.label==='Weapon damage').change,null);assert.equal(rows.find(r=>r.label==='Spell DC bonus').after,1);
 assert.equal(rows.find(r=>r.label==='Weapon hit bonus').before,null);
});
test('readiness uses current public health, resources and pending choices without invented readiness score',()=>{
 const v=fresh();v.player.hp=2;v.party[0].conditions=[{name:'Poisoned'}];v.player.resources.secondWind.current=0;
 v.progression.pending=[{level:3}];v.world.preparation=[{questId:'known',warnings:['Bring your known rope.']}];
 const before=JSON.stringify(v),r=M.readiness(v);assert.ok(r.some(s=>/HP 2\/12/.test(s)));assert.ok(r.some(s=>/Poisoned/.test(s)));
 assert.ok(r.some(s=>/Second Wind: 0\/1/.test(s)));assert.ok(r.some(s=>/1 development/.test(s)));assert.ok(r.some(s=>/known rope/.test(s)));
 assert.equal(JSON.stringify(v),before);
});
for(const [id,group]of [['weapon-attack','attacks'],['item:healing-potion','items'],['order:focus','party'],['combo:maren','party'],['objective','objectives'],['end-turn','turn'],['retreat','turn'],['second-wind','abilities']])test('existing combat action group '+id,()=>assert.equal(M.actionGroup(id),group));
test('contribution uses only explicit mechanics attribution, not prose or a damaged recipient',()=>{
 const m={name:'Orin Stoneward'};assert.equal(M.contribution(m,[{type:'story',text:'Orin Stoneward wins instantly.'}]),null);
 assert.equal(M.contribution(m,[{type:'damage',text:'Orin Stoneward takes 3 damage.'}]),null);
 const text='Orin Stoneward grants Aster +2 AC and draws enemy attention.';
 assert.equal(M.contribution(m,[{type:'party',text}]),text);assert.equal(M.contribution(m,[{type:'roll',text:'Orin Stoneward attacks Goblin.'}]),'Orin Stoneward attacks Goblin.');
});
test('public display policies tolerate missing data and reject prototype category lookups',()=>{
 assert.deepEqual(M.members({}),[]);assert.deepEqual(M.slots({},'player'),[]);assert.equal(M.category({category:'__proto__'}),'other');
 assert.deepEqual(M.filter({},'', 'all',false),[]);assert.deepEqual(M.comparison({}).map(r=>r.change),[null,null,null,null,null]);
});
