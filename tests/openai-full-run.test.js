'use strict';
// Regressions from the full OpenAI run with no prompt limit (gpt-6.2-sol, 2026-11-27).
// Books Three and Four are read here the way the full run played them.
process.env.BRIARWATCH_PREVIEW_BOOKS='1';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const E=require('../src/engine');
const Chat=require('../src/chat-runtime');
const OpenAI=require('../src/openai-ai');
const {createLocalAI}=require('../src/local-ai');
const ENV={OPENAI_API_KEY:'sk-proj-test'+'a'.repeat(40)};

async function openaiService(t,replies,settings={}){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-openai-full-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const calls=[];let i=0;
  const fetchImpl=async(url,init)=>{calls.push(JSON.parse(init.body));const content=replies[Math.min(i++,replies.length-1)];
    return {ok:true,status:200,text:async()=>JSON.stringify({model:'gpt-6.2-sol',choices:[{finish_reason:'stop',message:{role:'assistant',content}}]})};};
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),openai:OpenAI.createOpenAIProvider({fetchImpl,env:ENV})});
  await ai.save({enabled:true,provider:'openai',...settings});
  return {ai,calls};
}

test('the reply after a confirmed typed choice has no Markdown',async t=>{
  // Live run: "Nessa Reed joins your party. You gain **14 XP**." on the story card.
  const {ai}=await openaiService(t,[JSON.stringify({kind:'action',optionId:'choice:inspect-rope',reply:''}),'You study the cut. You gain **14 XP** and __a clue__.']);
  const proposed=await Chat.resolveChat(E.createNewGame({classId:'fighter'}),{mode:'action',text:'I want to inspect the severed bell rope'},ai,()=>0.5);
  assert.ok(proposed.state.chat.pending);
  const done=await Chat.resolveChat(JSON.parse(JSON.stringify(proposed.state)),{confirm:true},ai,()=>0.5);
  assert.equal(done.result.ok,true);
  assert.equal(done.narration.source,'ai-chat');
  assert.doesNotMatch(done.narration.text,/\*\*|__/);
  assert.match(done.narration.text,/You gain 14 XP and a clue\./);
});

test('the "protect the party" choice keeps names in capitals',()=>{
  // Live run: "Protect the party while you get sella through the gap" (an AI adventure), and the
  // written Book Three read "...while saltwick crosses to the vell road".
  const {STORY_NODES}=require('../src/content');
  const {QUESTS,installQuest}=require('../src/expansion');
  const label=id=>STORY_NODES[`q-${id}-crisis`].choices.find(c=>c.id==='objective').label;
  assert.equal(label('b3-saltwick'),'Protect the party while you hold the planks while Saltwick crosses to the Vell road');
  assert.equal(label('b3-paid'),'Protect the party while you get through his guard to Commander Hesk at the echo-stone');
  const q=structuredClone(QUESTS['b3-saltwick']);
  q.id='ai-test-sella';q.objective={...q.objective,label:'Get Sella through the gap'};
  installQuest(q);
  assert.equal(label('ai-test-sella'),'Protect the party while you get Sella through the gap');
  // Every chapter: the word after "you" is lowered, a capital later on is kept.
  for(const x of Object.values(QUESTS)){const l=STORY_NODES[`q-${x.id}-crisis`]?.choices.find(c=>c.id==='objective')?.label;if(!l)continue;
    assert.equal(l,'Protect the party while you '+x.objective.label.charAt(0).toLowerCase()+x.objective.label.slice(1),x.id);}
});

test('the story director is told not to give the hero a gender',()=>{
  // Live run: AI adventures said "after what he did for the Fenmere skiffs" and "brought him to Merrowgate".
  const Director=require('../src/director');
  assert.match(Director.SYSTEM,/never use he, she, him, his or her for the hero/);
});
