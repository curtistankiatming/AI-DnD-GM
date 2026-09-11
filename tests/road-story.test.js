'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine'),Road=require('../src/road-story'),Chat=require('../src/chat-runtime'),M=require('../src/chat-memory'),Profiles=require('../src/model-profiles');
const {CLASSES}=require('../src/content');
const {createClient}=require('../src/public-preview');
const high=()=>.999,low=()=>0,clone=x=>JSON.parse(JSON.stringify(x));
const api={hasItem:E.hasItem,checkPlan:E.checkPlan};
function act(s,id,rng=high){const out=E.resolveAction(s,{type:'road',optionId:id},rng);assert.equal(out.result.ok,true,out.result.error);return out.state;}
const create=(classId='fighter')=>act(E.createNewGame({classId}),'start');
const mechanical=s=>JSON.stringify({p:s.player,party:s.party,world:s.world,story:s.story,road:s.chat.road});
async function confirmed(s,text,rng=high,provider=null){const proposed=await Chat.resolveChat(s,{mode:'action',text},provider,rng);assert.ok(proposed.state.chat.pending,proposed.narration.text);const done=await Chat.resolveChat(proposed.state,{confirm:true},null,rng);assert.equal(done.result.ok,true,done.result.error);return done.state;}
function freeRoute(s){for(const id of ['crew-repair','depart','raft','deliver'])s=act(s,id);return s;}
const client=()=>createClient({length:0,getItem:()=>null,setItem(){},key:()=>null,removeItem(){}});

test('Lantern Road enters actual distinct scenes without transition XP or mandatory funds',()=>{
 let s=create();s.player.gold=0;assert.equal(s.player.xp,0);s=act(s,'crew-repair');s=act(s,'depart');assert.equal(s.story.nodeId,Road.NODES.crossing.id);assert.equal(s.player.xp,0);s=act(s,'raft');assert.equal(s.story.nodeId,Road.NODES.infirmary.id);assert.equal(s.player.xp,0);s=act(s,'deliver');assert.equal(s.player.xp,120);assert.equal(s.player.gold,15);assert.equal(s.chat.road.quality,'delayed');assert.equal(s.story.nodeId,'briarwatch-square');
});
test('repair instead of payment is explicitly confirmed, costs no gold and improves the later ferry check',async()=>{
 let s=create(),before=mechanical(s),gold=s.player.gold;const p=await Chat.resolveChat(s,{text:'I offer to repair the merchant’s wagon instead of paying full price.'});assert.equal(p.state.chat.pending.optionId,'road:repair');assert.equal(mechanical(p.state),before);
 s=(await Chat.resolveChat(p.state,{confirm:true},null,high)).state;assert.equal(s.chat.road.wagon,'repaired');assert.equal(s.player.gold,gold);s=act(s,'depart');const dc=Road.options(s,api).find(x=>x.id==='ferry').plan.dc;assert.equal(dc,12);
});
test('paying for repairs validates funds atomically and cannot be replayed',()=>{
 let s=create();s.player.gold=7;let p=E.resolveAction(s,{type:'road',optionId:'pay-repair'});assert.equal(p.result.ok,false);assert.equal(mechanical(p.state),mechanical(s));s.player.gold=8;s=act(s,'pay-repair');assert.equal(s.player.gold,0);assert.equal(E.resolveAction(s,{type:'road',optionId:'pay-repair'}).result.ok,false);
});
test('inspection distinguishes an unverified rumor from established axle evidence',()=>{
 let s=act(create(),'rumor');assert.match(Road.facts(s).join(' '),/Unverified rumor/);let failed=act(s,'inspect',low);assert.match(Road.facts(failed).join(' '),/Unverified rumor/);s=act(s,'inspect',high);assert.match(Road.facts(s).join(' '),/disproved/);assert.equal(Road.options(s,api).find(x=>x.id==='repair').plan.dc,9);
});
test('a letter can be accepted after repairing, remains pending across scenes, and is kept only at delivery',()=>{
 let initial=create(),gold=initial.player.gold;let s=act(initial,'repair');assert.ok(Road.options(s,api).some(x=>x.id==='promise'));s=act(s,'promise');s=act(s,'depart');assert.equal(s.chat.road.promise,'active');s=act(s,'ferry');assert.equal(s.chat.road.promise,'active');s=act(s,'deliver');assert.equal(s.chat.road.promise,'kept');assert.equal(s.chat.road.quality,'timely');assert.equal(s.player.xp,120);assert.equal(s.player.gold,gold+25);
});
test('breaking a promise is distinct from declining it; no secret reward is invented',()=>{
 let s=act(create(),'promise');for(const id of ['crew-repair','depart','raft','open-parcel'])s=act(s,id);assert.equal(s.chat.road.promise,'broken');assert.equal(s.chat.road.trust,-1);s=act(s,'deliver');assert.equal(s.chat.road.promise,'broken');assert.equal(Road.options(s,api).length,0);
 let d=freeRoute(act(create(),'decline'));assert.equal(d.chat.road.promise,'declined');assert.equal(d.chat.road.trust,0);assert.equal(d.player.xp,s.player.xp);
});
test('owned rope is reusable; failed crossing costs bounded HP and keeps the free route',()=>{
 let s=create();E.addItem(s,'silk-rope',1,[]);s=act(s,'repair');s=act(s,'depart');const before=s.player.inventory.find(i=>i.itemId==='silk-rope').quantity;const hp=s.player.hp;s=act(s,'rope',low);assert.equal(s.player.hp,hp-2);assert.equal(s.player.inventory.find(i=>i.itemId==='silk-rope').quantity,before);assert.ok(Road.options(s,api).some(x=>x.id==='raft'));s=act(s,'raft');assert.equal(s.chat.road.crossing,'raft');
});
test('missing rope is never created or consumed by a requested route',()=>{
 let s=act(act(create(),'crew-repair'),'depart');s.player.inventory=s.player.inventory.filter(i=>i.itemId!=='silk-rope');const before=mechanical(s);const out=E.resolveAction(s,{type:'road',optionId:'rope'});assert.equal(out.result.ok,false);assert.equal(mechanical(out.state),before);
});
test('unconscious companions cannot provide the special repair or medical assistance',()=>{
 let s=create();s.party.find(p=>p.id==='orin').hp=0;assert.equal(Road.options(s,api).find(x=>x.id==='repair').plan.dc,12);s=act(act(act(s,'crew-repair'),'depart'),'raft');s.party.find(p=>p.id==='maren').hp=0;assert.equal(Road.options(s,api).find(x=>x.id==='care').plan.dc,11);
});
for(const classId of Object.keys(CLASSES))test(`${classId}: failed checks still permit completion without money, farming, or lost promises`,()=>{
 let s=create(classId);s.player.gold=0;s=act(s,'promise');for(const id of ['inspect','repair'])s=act(s,id,low);s=act(s,'crew-repair');s=act(s,'depart');s=act(s,'scout',low);s=act(s,'ferry',low);s=act(s,'raft');s=act(s,'care',low);s=act(s,'deliver');assert.equal(s.player.xp,120);assert.equal(s.player.gold,15);assert.equal(s.chat.road.promise,'kept');for(const id of ['start','deliver','repair','ferry']){const out=E.resolveAction(s,{type:'road',optionId:id});assert.equal(out.result.ok,false);assert.equal(out.state.player.xp,120);}s=act(s,'cache');assert.equal(E.resolveAction(s,{type:'road',optionId:'cache'}).result.ok,false);
});
test('pause, reload and resume preserve attempts and do not replenish rolls or reward transition XP',()=>{
 let s=act(create(),'inspect',low);s=act(s,'pause');s=E.normalizeIncomingState(clone(s));assert.equal(s.chat.road.active,false);s=act(s,'start');assert.equal(s.chat.road.delay,1);assert.equal(s.player.xp,0);assert.equal(E.resolveAction(s,{type:'road',optionId:'inspect'}).result.ok,false);
});
test('a changed scene invalidates a pending repair; cancellation and invalid requests never execute it',async()=>{
 let s=create();const p=await Chat.resolveChat(s,{text:'I fix the wagon.'});assert.ok(p.state.chat.pending);const pause=act(p.state,'pause');assert.equal((await Chat.resolveChat(pause,{confirm:true})).result.ok,false);const cancel=await Chat.resolveChat(p.state,{cancel:true});assert.equal(cancel.state.chat.road.wagon,'blocked');assert.equal(cancel.state.player.gold,s.player.gold);
});
test('compound repair/departure and negated repair do not silently select a first step',async()=>{
 const s=create();for(const text of ['I fix the wagon and leave.','I fix the wagon instead of paying and then steal the medicine.','I do not repair the wagon.','Can I repair the wagon?']){const out=await Chat.resolveChat(s,{text});assert.equal(out.state.chat.pending,null,text);assert.equal(out.state.chat.road.wagon,'blocked');}
});
test('model-selected authored proposals can be confirmed; model text cannot grant rewards or facts',async()=>{
 const s=create();let calls=0;const provider={config:async()=>Profiles.normalize({enabled:true,model:'synthetic-12b'}),complete:async()=>{calls++;return {text:JSON.stringify({kind:'action',optionId:'road:repair',reply:'I gave you a dragon and 999 gold.'}),model:'synthetic-12b'};}};
 const result=await Chat.resolveChat(s,{text:'I offer labor as payment.'},provider);assert.equal(calls,1);assert.equal(result.state.chat.pending.optionId,'road:repair');assert.equal(result.state.player.gold,s.player.gold);assert.doesNotMatch(Road.facts(result.state).join(' '),/dragon|999/);
});
test('export/import keeps journey location, promise, outcome and pending confirmation without executing it',async()=>{
 let s=act(create(),'promise');s=await confirmed(s,'road:crew-repair');s=await confirmed(s,'road:depart');s=(await Chat.resolveChat(s,{text:'road:raft'})).state;const c=client(),loaded=c.importText(c.exportText(s)).state;assert.deepEqual(loaded.chat.road,s.chat.road);assert.equal(loaded.story.nodeId,s.story.nodeId);assert.deepEqual(loaded.chat.pending,s.chat.pending);assert.equal(loaded.player.xp,0);
});
for(const profile of Object.keys(Profiles.PROFILES))test(`${profile}: every journey phase supplies only current verified/rumored facts within the default budget`,()=>{
 let s=create();s.chat.instructions='Prefer diplomacy and a hopeful tone.';for(const phase of ['wagon','crossing','infirmary']){if(phase==='crossing')s=act(act(s,'crew-repair'),'depart');if(phase==='infirmary')s=act(s,'raft');s.story.flags.SECRET_TEST_VALUE='do not leak';const cfg=Profiles.normalize({profile}),json=Chat.context(s,cfg,'What may we do here?','question');assert.ok(json.length+Chat.SYSTEM.length<=cfg.contextChars);assert.doesNotMatch(json,/SECRET_TEST_VALUE|ordinary supplies; it grants/);assert.match(json,/Prefer diplomacy/);}
});
