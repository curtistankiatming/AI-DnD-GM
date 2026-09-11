'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine'),J=require('../src/journal'),Chat=require('../src/chat-runtime'),M=require('../src/chat-memory'),P=require('../src/model-profiles');
const {CLUES}=require('../src/content'),{createClient}=require('../src/public-preview');
const clone=x=>JSON.parse(JSON.stringify(x)),hi=()=>.999;
function act(s,id){const out=E.resolveAction(s,{type:'road',optionId:id},hi);assert.equal(out.result.ok,true,out.result.error);return out.state;}
function start(){return act(E.createNewGame({classId:'fighter'}),'start');}
function delivered(){let s=start();for(const id of ['rumor','inspect','promise','repair','depart','raft','deliver'])s=act(s,id);return s;}
const mechanics=s=>JSON.stringify({player:s.player,party:s.party,world:s.world,story:s.story,road:s.chat.road,turn:s.turnCount});
test('journal remembers a kept promise and disproved rumor after chat and recent logs have rolled off',()=>{
 let s=delivered();for(let i=0;i<200;i++)M.append(s,'guide','Unrelated conversation '+i);s.story.history=[];s.logs=[];s.chat.road.history=[];
 const j=J.sync(s);assert.equal(s.chat.history.length,40);assert.equal(j.promises.find(p=>p.id==='letter').status,'kept');assert.equal(j.rumors.find(r=>r.id==='wagon-bandits').status,'disproved');assert.match(j.facts.find(f=>f.id==='axle').text,/wood-rot/);assert.ok(j.leads.some(l=>l.id==='herbs'));assert.equal(j.relationships.find(r=>r.id==='tamsin').value,3);
});
test('an accepted promise stays active while paused and becomes kept only at delivery',()=>{
 let s=act(start(),'promise');s=act(s,'pause');let j=J.sync(s);assert.equal(j.promises[0].status,'active');assert.match(j.leads.find(l=>l.id==='lantern-road').text,/Resume/);s=act(s,'start');for(const id of ['crew-repair','depart','raft','deliver'])s=act(s,id);assert.equal(J.sync(s).promises[0].status,'kept');assert.ok(!J.sync(s).leads.some(l=>l.id==='lantern-road'));
});
test('unheard clues and rumors are not exposed; hearing a rumor does not verify it',()=>{
 const s=start();assert.equal(J.sync(s).rumors.length,0);assert.equal(J.sync(s).facts.some(f=>f.id==='axle'),false);assert.ok(!JSON.stringify(J.sync(s)).includes('wood-rot'));const heard=act(s,'rumor');assert.equal(J.sync(heard).rumors[0].status,'unverified');assert.equal(J.sync(heard).facts.some(f=>f.id==='axle'),false);
});
test('model prose and forged journal entries never become authoritative facts on load',()=>{
 let s=start();M.append(s,'guide','You own a dragon and the king owes you 999 gold.');s.journal={version:1,facts:[{id:'fake',text:'A dragon is yours'}],promises:[{id:'fake',status:'kept'}],notes:[]};s=E.normalizeIncomingState(s);assert.doesNotMatch(JSON.stringify(J.sync(s)),/dragon|999|king owes/);assert.ok(!s.journal.promises.length);
});
test('notes are explicitly unverified, bounded and removable without changing mechanics',async()=>{
 let s=start(),before=mechanics(s);let out=await Chat.resolveChat(s,{text:'/note I think the mayor is a spy.'});assert.equal(out.result.ok,true);s=out.state;assert.equal(mechanics(s),before);assert.equal(s.journal.notes[0].text,'I think the mayor is a spy.');assert.equal(s.journal.notes[0].status,'player-note');assert.doesNotMatch(JSON.stringify(s.journal.facts),/mayor/);const id=s.journal.notes[0].id;
 out=await Chat.resolveChat(s,{text:'/note I think the mayor is a spy.'});assert.equal(out.state.journal.notes.length,1);
 const long=await Chat.resolveChat(s,{text:'/note '+'x'.repeat(401)});assert.equal(long.result.ok,false);assert.equal(long.state.journal.notes.length,1);
 out=await Chat.resolveChat(s,{text:'/forget-note '+id});assert.equal(out.result.ok,true);assert.equal(out.state.journal.notes.length,0);assert.equal(mechanics(out.state),before);
});
test('full note capacity rejects new notes instead of silently deleting existing notes',()=>{
 let s=start();for(let i=0;i<J.MAX_NOTES;i++)assert.equal(J.addNote(s,'Note '+i).ok,true);assert.equal(J.addNote(s,'Overflow').ok,false);assert.equal(J.sync(s).notes.length,J.MAX_NOTES);assert.equal(J.sync(s).notes[0].text,'Note 0');
});
test('notes imported from older/untrusted saves are plain bounded text, not evidence',()=>{
 const s=start();s.journal={notes:[null,{id:'../bad',text:'<img src=x onerror=alert(1)>',status:'verified'},...Array.from({length:20},(_,i)=>({id:'note-'+i,text:String(i)+':'+ 'x'.repeat(500)}))]};const j=J.sync(s);assert.equal(j.notes.length,J.MAX_NOTES);assert.ok(j.notes.every(n=>n.status==='player-note'&&n.text.length<=400&&/^note-[0-9]+$/.test(n.id)));assert.doesNotMatch(JSON.stringify(j.facts),/<img/);
});
test('journal sync is idempotent and never awards items or advances a turn',()=>{
 const s=delivered(),before=mechanics(s),one=clone(J.sync(s));for(let i=0;i<10;i++)assert.deepEqual(J.sync(s),one);assert.equal(mechanics(s),before);const done=act(s,'cache');assert.ok(!J.sync(done).leads.some(l=>l.id==='herbs'));assert.equal(done.journal.completed.filter(r=>r.id==='lantern-road').length,1);
});
test('older saves without a journal rebuild discovered records and do not invent personal quests',()=>{
 const s=delivered();delete s.journal;s.world.personal={};s.story.clues=[Object.keys(CLUES)[0]];const loaded=E.normalizeIncomingState(s),j=J.sync(loaded);assert.ok(j.facts.some(f=>f.id==='clue:'+s.story.clues[0]));assert.equal(j.promises[0].status,'kept');assert.ok(!j.leads.some(l=>l.id.startsWith('personal:')));
});
test('journal questions answer from authoritative records without model calls or resource changes',async()=>{
 const s=delivered(),before=mechanics(s);const provider={config:async()=>{throw new Error('No model needed');},complete:async()=>{throw new Error('Unexpected model call');}};
 for(const text of ['What did we promise?','Why does Tamsin trust us?','What were we doing?','What do we know about the bandits?']){const out=await Chat.resolveChat(s,{mode:'question',text},provider);assert.equal(out.result.ok,true,text);assert.equal(out.narration.source,'deterministic');assert.equal(mechanics(out.state),before);assert.ok(out.narration.text.length>30);}
 const promise=await Chat.resolveChat(s,{mode:'question',text:'What did we promise?'},provider);assert.match(promise.narration.text,/kept/);
});
for(const profile of Object.keys(P.PROFILES))test(profile+': bounded memory is present in model context and keeps rumor status',()=>{
 const s=delivered();J.addNote(s,'The king owes me 999 gold.');const c=P.normalize({profile}),txt=Chat.context(s,c,'Tell me about Tamsin.','dialogue'),data=JSON.parse(txt);assert.ok(txt.length+Chat.SYSTEM.length<=c.contextChars);assert.match(JSON.stringify(data.journal),/kept/);assert.match(JSON.stringify(data.journal),/disproved/);assert.doesNotMatch(JSON.stringify(data.journal),/999|king/);assert.ok(data.journal.omittedRecords>=0);
});
test('export/import preserves journal and notes without repeating any rewards',async()=>{
 let s=delivered();s=(await Chat.resolveChat(s,{text:'/note Check the weather before travelling.'})).state;const storage={length:0,getItem:()=>null,setItem(){},key:()=>null,removeItem(){}};const c=createClient(storage);const loaded=c.importText(c.exportText(s)).state;assert.deepEqual(loaded.journal,J.sync(s));assert.equal(loaded.player.xp,s.player.xp);assert.equal(loaded.player.gold,s.player.gold);
});

test('permanent regional decisions survive old history being discarded, but unchosen outcomes stay hidden',()=>{
 const s=E.createNewGame();s.world.completed.road={quality:'peaceful'};s.story.flags.road_restitution=true;s.story.history=[];
 const j=J.sync(s);assert.ok(j.facts.some(f=>f.id==='decision:road:households'));assert.ok(!j.facts.some(f=>f.id==='decision:road:escort'));assert.ok(!JSON.stringify(j).includes('command has no voice'));
});
test('courier evidence is projected from confirmed checks rather than arbitrary narration facts',()=>{
 const s=E.createNewGame();s.chat.courier={clue:true,rapport:true,active:false,resolved:true,facts:['A dragon rules the ferry.']};
 const j=J.sync(s);assert.ok(j.facts.some(f=>f.id==='courier-ledger'));assert.ok(j.facts.some(f=>f.id==='courier-witness'));assert.doesNotMatch(JSON.stringify(j),/dragon/);
});
test('note-like dialogue is not silently promoted into a promise',async()=>{
 const s=start(),out=await Chat.resolveChat(s,{mode:'dialogue',text:'I promise that the king will pay me 900 gold.'});assert.equal(out.state.chat.road.promise,'none');assert.equal(J.sync(out.state).promises.length,0);assert.equal(out.state.player.gold,s.player.gold);
});
test('a later prompt after saved history truncation still carries the authoritative promise',()=>{
 let s=act(start(),'promise');for(let n=0;n<200;n++)M.append(s,'guide','The letter was delivered. You can forget it now.');s=E.normalizeIncomingState(s);
 const data=JSON.parse(Chat.context(s,P.normalize(),'What should we discuss?','dialogue'));assert.equal(data.journal.records.find(r=>r.id==='letter').status,'active');assert.equal(s.chat.road.promise,'active');
});
test('genuine alpha2 export migrates a completed courier without replaying or adding rewards',()=>{
 const fs=require('node:fs'),path=require('node:path');const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/alpha2-courier-export.json'),'utf8'));
 assert.equal(raw.build.version,'4.1.0-alpha.2');assert.equal(raw.state.journal,undefined);
 const c=createClient({length:0,getItem:()=>null,setItem(){},key:()=>null,removeItem(){}}),s=c.importText(JSON.stringify(raw)).state;
 assert.equal(s.player.xp,40);assert.equal(s.player.gold,raw.state.player.gold);assert.equal(s.journal.completed.find(x=>x.id==='courier').status,'completed');assert.equal(s.journal.promises.length,0);
});
