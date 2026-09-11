'use strict';
// Regression cases from the alpha.1 review, retained for the corrected build.
// Local fake replies do not evaluate model weights or writing quality.
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),os=require('node:os'),fs=require('node:fs/promises');
const ROOT=path.resolve(__dirname,'..');
const E=require(ROOT+'/src/engine'),Chat=require(ROOT+'/src/chat-runtime'),Profiles=require(ROOT+'/src/model-profiles');
const {createLocalAI}=require(ROOT+'/src/local-ai'),{createClient}=require(ROOT+'/src/public-preview');
const {CLASSES}=require(ROOT+'/src/content'),R=require(ROOT+'/src/rules');
const ids=['qwen3.8-27b-uncensored-hauhaucs-aggressive-mtp','gemma4-12b-qat-uncensored-hauhaucs-balanced@q4_k_m','test-only-instruct-7b'];
for(const model of ids)for(const profile of Object.keys(Profiles.PROFILES)){
 test(`Model identifier is independent of workload preset: ${model} / ${profile}`,async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-review-model-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));let calls=0,body;
  const ai=createLocalAI({configPath:path.join(dir,'config.json'),fetchImpl:async(_,options)=>{
    calls++;body=JSON.parse(options.body);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({kind:'clarify',optionId:'',reply:'Which character are you addressing?'})}}]}));
  }});
  await ai.save({enabled:true,model,profile});
  const initial=E.createNewGame();
  const result=await Chat.resolveChat(initial,{text:'I address the nearby traveler.'},ai);
  assert.equal(result.result.ok,true);assert.equal(calls,1);assert.equal(body.model,model);
  assert.equal(body.max_tokens,Profiles.PROFILES[profile].replyTokens);
  assert.equal((await ai.config()).timeoutMs,600000);
  assert.equal(result.state.player.gold,initial.player.gold);
 });
}

test('Every class can finish the side-story after controlled failed checks; reward is one-time',async()=>{
 for(const classId of Object.keys(CLASSES)){
   let s=E.createNewGame({classId});const beforeXp=s.player.xp,beforeGold=s.player.gold;
   s=(await Chat.resolveChat(s,{mode:'instructions',text:'A hopeful mystery, with diplomacy and careful investigation.'})).state;
   s=(await Chat.resolveChat(s,{text:'/scenario'})).state;
   for(const optionId of ['ledger','ferryman','distract','negotiate']){
     const x=E.resolveAction(s,{type:'courier',optionId},()=>0);assert.equal(x.result.ok,true);s=x.state;
   }
   s=(await Chat.resolveChat(s,{text:'courier:aid'})).state;
   const done=await Chat.resolveChat(s,{confirm:true});assert.equal(done.result.ok,true);s=done.state;
   assert.equal(s.player.xp,beforeXp+40);assert.equal(s.player.gold,beforeGold);assert.equal(s.chat.courier.resolved,true);
   const repeated=E.resolveAction(s,{type:'courier',optionId:'start'});assert.equal(repeated.result.ok,false);assert.equal(repeated.state.player.xp,s.player.xp);
 }
});

test('Restoring a browser save should preserve the most recent confirmed narration',async()=>{
 let s=(await Chat.resolveChat(E.createNewGame(),{text:'/scenario'})).state;
 s=(await Chat.resolveChat(s,{text:'courier:aid'})).state;
 s=(await Chat.resolveChat(s,{confirm:true})).state;
 const client=createClient({length:0,getItem:()=>null,setItem:()=>{},key:()=>null,removeItem:()=>{}});
 const imported=client.importText(client.exportText(s)).state;
 assert.equal(imported.player.xp,40);assert.equal(imported.chat.courier.resolved,true);
 assert.equal(imported.lastNarration,s.lastNarration,'The latest ferry consequence must not turn back into the opening village narration.');
});

test('Combat question context should include visible enemy identity and current class resources',()=>{
 const result=E.resolveAction(E.createNewGame({classId:'wizard'}),{type:'practice'},R.createSeededRng(41));
 assert.equal(result.result.ok,true);const s=result.state,view=E.buildView(s);assert.equal(view.combat.active,true);
 const cfg=Profiles.normalize({enabled:true,model:'review-fixture'});
 const prompt=Chat.context(s,cfg,'Who is fighting us, and how many spells can I still use?','question');
 const enemies=view.combat.actors.filter(x=>x.team==='enemy');assert.ok(enemies.length);
 for(const enemy of enemies)assert.ok(prompt.includes(enemy.name),'An enemy visible in combat is absent from the model context.');
 const data=JSON.parse(prompt);assert.deepEqual(data.hero.resources,s.player.resources,'The model cannot infer remaining spell uses from class and level alone.');
});
