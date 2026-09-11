'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine'),Chat=require('../src/chat-runtime'),Profiles=require('../src/model-profiles'),R=require('../src/rules'),M=require('../src/chat-memory');
const {makeSandbox}=require('../src/public-preview'),{CLASSES}=require('../src/content');
const snapshot=s=>JSON.parse(JSON.stringify({player:s.player,party:s.party,story:s.story,world:s.world,combat:s.combat,turnCount:s.turnCount}));
function practice(classId='wizard',level=1){return E.resolveAction(makeSandbox({classId,level}),{type:'practice'},R.createSeededRng(41)).state;}
for(const profile of Object.keys(Profiles.PROFILES))test(`${profile}: every class at 1, 5 and 10 has current public combat facts within the preset`,()=>{
  for(const classId of Object.keys(CLASSES))for(const level of [1,5,10]){
    const s=practice(classId,level),v=E.buildView(s),cfg=Profiles.normalize({profile}),before=snapshot(s);
    const prompt=Chat.context(s,cfg,'What can I do this turn?','question'),data=JSON.parse(prompt);
    assert.ok(prompt.length+Chat.SYSTEM.length<=cfg.contextChars);
    assert.deepEqual(data.hero.resources,s.player.resources);assert.equal(data.combat.round,v.combat.round);
    assert.equal(data.combat.currentActorId,v.combat.currentActorId);assert.deepEqual(data.combat.economy,v.combat.economy);
    for(const actor of v.combat.actors){const fact=data.combat.actors.find(a=>a.id===actor.id);assert.equal(fact.hp,actor.hp);assert.equal(fact.ac,actor.ac);assert.equal(fact.name,actor.name);}
    assert.deepEqual(data.combat.actions.map(a=>a.id),v.combat.actions.map(a=>a.id));assert.deepEqual(snapshot(s),before);
  }
});
test('spent spell uses and action budget update immediately in the next question',()=>{
  let s=practice();const target=E.buildView(s).combat.actors.find(a=>a.team==='enemy').id;
  const out=E.resolveAction(s,{type:'combat',actionId:'magic-missile',targetId:target},()=>0.1);assert.equal(out.result.ok,true);s=out.state;
  const data=JSON.parse(Chat.context(s,Profiles.normalize(),'How many spells remain?','question'));
  assert.equal(data.hero.resources.spellSlots1.current,1);assert.equal(data.combat.economy.actionUsed,true);
  for(const action of data.combat.actions.filter(a=>a.cost==='action')){assert.equal(action.available,false);assert.match(action.reason,/already spent/);}
});
test('conditions include expiry and public source, without copying unrelated fields',()=>{
  const s=practice();s.combat.actors[0].conditions.push({id:'guarded',name:'Guarded',expiresRound:2,sourceId:'companion:orin',HIDDEN_TEST:'private'});
  const text=Chat.context(s,Profiles.normalize(),'Who is protected?','question'),data=JSON.parse(text);
  const condition=data.combat.actors[0].conditions.find(c=>c.id==='guarded');assert.equal(condition.expiresRound,2);assert.equal(condition.sourceId,'companion:orin');assert.ok(!text.includes('HIDDEN_TEST'));
});
test('current objective progress is included but hidden future outcomes are not',()=>{
  const s=practice();s.combat.objective={name:'Practice rescue',label:'Open the gate',progress:1,target:3,skill:'athletics',alt:[],dc:12,deadline:6,failed:false,successText:'HIDDEN_ENDING',failText:'HIDDEN_PENALTY'};
  const text=Chat.context(s,Profiles.normalize(),'How close are we to the objective?','question'),data=JSON.parse(text);
  assert.equal(data.combat.objective.progress,1);assert.equal(data.combat.objective.target,3);assert.equal(data.combat.objective.deadline,6);assert.equal(data.combat.objective.check.dc,12);assert.doesNotMatch(text,/HIDDEN_ENDING|HIDDEN_PENALTY/);
});
test('Compact drops optional history and clearly marks omitted action prose, not resources',()=>{
  const s=practice('cleric',10);M.instructions(s,'x'.repeat(2000));for(let i=0;i<40;i++)M.append(s,'guide','old '.repeat(300));
  const cfg=Profiles.normalize({profile:'compact',contextChars:6600}),text=Chat.context(s,cfg,'What is left?','question'),data=JSON.parse(text);
  assert.ok(text.length+Chat.SYSTEM.length<=cfg.contextChars);assert.equal(data.preferences.length,2000);assert.deepEqual(data.hero.resources,s.player.resources);assert.match(data.combat.detailNote,/omitted/);assert.equal(s.chat.history.length,40);
});
test('an over-budget required state is rejected before invoking the model',async()=>{
  const s=practice('wizard',10);M.instructions(s,'x'.repeat(2000));let calls=0;
  const provider={config:async()=>Profiles.normalize({enabled:true,model:'fixture',contextChars:4000}),complete:async()=>{calls++;throw new Error('Unexpected call');}};
  const out=await Chat.resolveChat(s,{mode:'question',text:'Q'.repeat(1900)},provider);assert.equal(out.result.ok,false);assert.match(out.narration.text,/context budget/);assert.equal(calls,0);
});
test('a combat question with a mock reply does not consume a turn or an ability',async()=>{
  const s=practice(),before=snapshot(s);let body;
  const provider={config:async()=>Profiles.normalize({enabled:true,model:'fixture'}),complete:async req=>{body=JSON.parse(req.prompt);return {model:'fixture',text:JSON.stringify({kind:'question',optionId:'',reply:'Guild Training Echo is your opponent; two spell slots remain.'})};}};
  const out=await Chat.resolveChat(s,{mode:'question',text:'Who is fighting us?'},provider);assert.equal(out.result.ok,true);assert.equal(body.hero.resources.spellSlots1.current,2);assert.deepEqual(snapshot(out.state),before);
});


test('Compact retains current combat facts in the final Bard encounter after a full journal',()=>{
  const {chooseAction}=require('./player-policy');
  let s=E.createNewGame({classId:'bard'}),memory={},rng=R.createSeededRng(301),checked=0;
  const cfg=Profiles.normalize({profile:'compact'});
  for(let i=0;i<900;i++){
    const v=E.buildView(s),a=chooseAction(v,memory,'prepared');
    if(!a)break;if(a.error)throw new Error(a.error);
    if(v.combat?.active&&s.story.nodeId==='q-aftermath-crisis'){
      const prompt=Chat.context(s,cfg,'Who are our current opponents and how many class abilities remain?','question');
      const data=JSON.parse(prompt);checked++;
      assert.ok(prompt.length+Chat.SYSTEM.length<=cfg.contextChars);
      assert.deepEqual(data.hero.resources,s.player.resources);
      assert.deepEqual(data.combat.actions.map(x=>x.id),v.combat.actions.map(x=>x.id));
      assert.deepEqual(data.combat.actors.map(x=>[x.id,x.hp,x.conditions]),v.combat.actors.map(x=>[x.id,x.hp,x.conditions.map(c=>({id:c.id,name:c.name||c.id,...(c.expiresRound!==undefined?{expiresRound:c.expiresRound}:{}),...(c.expiresOn!==undefined?{expiresOn:c.expiresOn}:{}),...(c.sourceId!==undefined?{sourceId:c.sourceId}:{}),...(c.untilActorId!==undefined?{untilActorId:c.untilActorId}:{})}))]));
      if(!data.knownClues.length&&v.clues.length)assert.match(data.clueNote,/omitted/);
    }
    const out=E.resolveAction(s,a,rng);assert.equal(out.result.ok,true,out.result.error);s=out.state;
  }
  assert.ok(checked>0,'The test must reach the real final encounter.');
  assert.ok(s.world.completed.aftermath);assert.equal(s.player.level,10);
});
