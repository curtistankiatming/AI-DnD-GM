'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const U=require('../public/adventure-view');
for (const key of ['action','dialogue','question']) test('explicit message mode '+key,()=>{
 assert.equal(U.mode(key).id,key);assert.ok(U.mode(key).help);assert.equal(U.mode(key).readOnly,key!=='action');
});
for(const value of ['instructions','bogus',null,'__proto__','constructor'])test('unknown mode never enables instruction replacement: '+value,()=>assert.equal(U.mode(value).id,'action'));
for(const key of ['adventure','party','journal','prepare','settings'])test('known section '+key,()=>assert.equal(U.section(key),key));
test('legacy navigation aliases stay navigable, unknown goes to Adventure',()=>{assert.equal(U.section('inventory'),'party');assert.equal(U.section('saves'),'settings');assert.equal(U.section('constructor'),'adventure');});
for(const [key,index]of [['ArrowRight',1],['ArrowLeft',4],['Home',0],['End',4]])test('keyboard destination '+key,()=>assert.equal(U.nextIndex(key,0,5),index));
test('non-navigation key does not activate a tab',()=>assert.equal(U.nextIndex('Enter',2,5),null));
test('single tab wraps to itself',()=>assert.equal(U.nextIndex('ArrowLeft',0,1),0));
test('journal filters cover each existing group without rewriting records',()=>{
 for(const g of ['leads','promises','rumors','relationships','facts','completed','notes'])assert.equal(U.showGroup('all',g),true);
 assert.equal(U.showGroup('evidence','rumors'),true);assert.equal(U.showGroup('evidence','facts'),true);
 assert.equal(U.showGroup('people','relationships'),true);assert.equal(U.showGroup('notes','facts'),false);
 assert.equal(U.showGroup('bogus','facts'),true);
});
test('a repeated latest guide message is hidden only in presentation, not modified',()=>{
 const rows=[{role:'player',text:'Try it.'},{role:'guide',text:'It fails.'}];const before=JSON.stringify(rows);
 assert.equal(U.duplicateLast(rows,'It fails.'),1);assert.equal(JSON.stringify(rows),before);
 assert.equal(U.duplicateLast(rows,'Other'),-1);assert.equal(U.duplicateLast([{role:'player',text:'It fails.'}],'It fails.'),-1);
});
test('empty history safely has no duplicate',()=>assert.equal(U.duplicateLast([],''),-1));
test('scroll following is restricted to readers near the end',()=>{
 assert.equal(U.nearEnd({scrollHeight:1000,clientHeight:500,scrollTop:480}),true);
 assert.equal(U.nearEnd({scrollHeight:1000,clientHeight:500,scrollTop:50}),false);
});
for(const x of ['normal','large','larger'])test('reading size '+x,()=>assert.equal(U.readingSize(x),x));
for(const x of ['1000px','__proto__',null])test('unsafe reading size has a bounded default '+x,()=>assert.equal(U.readingSize(x),'normal'));
test('public summary does not invent a companion turn or change state',()=>{
 const v={player:{name:'A',hp:3,maxHp:10,level:2},party:[{name:'O',hp:0,maxHp:8}]};const before=JSON.stringify(v);
 assert.equal(U.partySummary(v),'A · Level 2 · HP 3/10 | O · HP 0/8');assert.equal(JSON.stringify(v),before);
});
