'use strict';
// Regressions from the first live OpenAI playtest (gpt-6.2-sol, 2026-11-26).
// The bugs were not OpenAI-only; the live run is where they showed.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const E=require('../src/engine');
const Chat=require('../src/chat-runtime');
const Director=require('../src/director');
const Narrator=require('../src/narrator');
const OpenAI=require('../src/openai-ai');
const {createLocalAI}=require('../src/local-ai');
const root=path.join(__dirname,'..');
const ENV={OPENAI_API_KEY:'sk-proj-test'+'a'.repeat(40)};

async function openaiService(t,replies,settings={}){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-openai-live-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const calls=[];let i=0;
  const fetchImpl=async(url,init)=>{calls.push(JSON.parse(init.body));const content=replies[Math.min(i++,replies.length-1)];
    return {ok:true,status:200,text:async()=>JSON.stringify({model:'gpt-6.2-sol',choices:[{finish_reason:'stop',message:{role:'assistant',content}}]})};};
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),openai:OpenAI.createOpenAIProvider({fetchImpl,env:ENV})});
  await ai.save({enabled:true,provider:'openai',...settings});
  return {ai,calls};
}

test('a typed action that matches a listed check shows its words and odds, never raw JSON',async t=>{
  // Playtest: "Proposed single action: Calm Tovin… {"actor":"Tamsin","skill":"Persuasion",…}" on the story card.
  const {ai}=await openaiService(t,[JSON.stringify({kind:'action',optionId:'choice:inspect-rope',reply:'You lean in close to the cut.'})]);
  const out=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'action',text:'I look really closely at that rope'},ai,()=>0.5);
  const text=out.narration.text;
  assert.doesNotMatch(text,/[{}]|"actor"|Proposed single action/);
  assert.match(text,/^You lean in close to the cut\.\nYou could: Inspect the severed bell rope\. About \d+% to succeed, Sister Maren Vale rolls\.\nExamine the cut/);
  assert.match(text,/Confirm below or cancel\./);
  assert.equal(out.state.chat.pending.optionId,'choice:inspect-rope');
});

test('without AI, typing a listed choice also gets the readable preview',async()=>{
  const out=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'action',text:'Inspect the severed bell rope'},null,()=>0.5);
  assert.doesNotMatch(out.narration.text,/[{}]/);
  assert.match(out.narration.text,/^You could: Inspect the severed bell rope\. About \d+% to succeed, \w[\w ]* rolls\./);
});

test('an improvised intent that ends in a full stop is not printed with two',async t=>{
  // Playtest: "You could try: Echo the bell note with a whistle and listen for a response.. About 80%".
  const improvise={intent:'Echo the bell note with a whistle and listen for a response.',skill:'perception',ability:'',difficulty:'easy',success:'Something answers.',failure:'Only the mist.',reward:'insight',risk:'setback',remembered:true};
  const {ai}=await openaiService(t,[JSON.stringify({kind:'improvise',optionId:'',reply:'You cup your hands.',improvise})]);
  const out=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'action',text:'I whistle the note back into the mist'},ai,()=>0.5);
  assert.match(out.narration.text,/You could try: Echo the bell note with a whistle and listen for a response\. About/);
  assert.doesNotMatch(out.narration.text,/\.\./);
});

test('AI narration and replies show no Markdown asterisks',async t=>{
  // Playtest: "You learn **The Hushed Verse**, and Maren approves of your patience (**+1 bond**)."
  assert.equal(Narrator.plainProse('You learn **The Hushed Verse**. She *whispers* it.\n## Note'),'You learn The Hushed Verse. She whispers it.\nNote');
  assert.equal(Narrator.plainProse('Odds of 2*3 stay as they are.'),'Odds of 2*3 stay as they are.');
  const {ai}=await openaiService(t,['Maren nods. You learn **The Hushed Verse**.'],{narration:true});
  const s=E.createNewGame({classId:'rogue'});
  const out=await Narrator.narrate(s,E.buildView(s),{type:'opening'},[],null,ai);
  assert.equal(out.source,'ai');assert.equal(out.text,'Maren nods. You learn The Hushed Verse.');
  const {ai:chatAi}=await openaiService(t,[JSON.stringify({kind:'question',optionId:'',reply:'The **rope** was cut.'})]);
  const asked=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'question',text:'Who cut the bell rope so cleanly?'},chatAi,()=>0.5);
  assert.equal(asked.narration.text,'The rope was cut.');
});

test('the narrator is told to open on the new outcome, not retell the scene',()=>{
  // Playtest: asking Nessa about the bell retold her whole mud-map speech before her answer.
  assert.match(Narrator.NARRATOR_SYSTEM,/do not retell earlier lines or events/);
  assert.match(Narrator.NARRATOR_SYSTEM,/no Markdown/);
});

test('after Book One, the story director knows Sable was sent away in chains',()=>{
  // Playtest: the first AI side quest had "Warden Sable" asking the hero for help.
  const s=E.createNewGame({classId:'ranger'});
  s.world.completed={...(s.world.completed||{}),bell:{quality:'force',day:1}};
  const sent=JSON.parse(Director.prompt(s));
  const bell=sent.completedAdventures.find(a=>a.name==='The Bell Beneath Briarwatch');
  assert.match(bell.aftermath,/Warden Sable .*in chains to Highpass/);
  assert.match(Director.SYSTEM,/aftermath/);
  s.story.flags.cultDefects=true;s.story.flags.spiritFreed=true;
  const again=JSON.parse(Director.prompt(s)).completedAdventures.find(a=>a.name==='The Bell Beneath Briarwatch');
  assert.match(again.aftermath,/^Aster Vey was freed.*abandoned by his own followers/);
});

test('the side quest and adventure cards do not say only Claude can write them',async()=>{
  // Playtest with OpenAI on: "Needs the Claude API provider" and a "Turn on Claude" button.
  for(const file of ['public/whats-next.js','public/expedition.js']){
    const src=await fs.readFile(path.join(root,file),'utf8');
    assert.doesNotMatch(src,/Needs the Claude API provider|'Turn on Claude'|Claude writes (a small|your next|the next)/,file);
  }
});

test('with a cloud AI on, story questions reach the AI instead of the journal shortcut',async t=>{
  // Playtest: "What happened to the people we saved earlier?" got "Current: The Guardroom Brazier. Camp. Completed: …",
  // and "What did we promise people along the way?" got "No confirmed record…", without asking the AI.
  const {ai,calls}=await openaiService(t,[JSON.stringify({kind:'question',optionId:'',reply:'Tovin is mending, and the reeve still counts doors.'})]);
  const out=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'question',text:'What happened to the people we saved earlier?'},ai,()=>0.5);
  assert.equal(calls.length,1);assert.equal(out.narration.text,'Tovin is mending, and the reeve still counts doors.');
  const recap=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'question',text:'Give me a recap of the journal'},ai,()=>0.5);
  assert.equal(calls.length,1,'asking for the journal reads it without the AI');assert.ok(recap.narration.text);
  const offline=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'question',text:'What did we promise people along the way?'},null,()=>0.5);
  assert.match(offline.narration.text,/No confirmed record|promise/i,'without AI the journal still answers');
});

test('the story director is given a fresh enemy theme and the last adventures to vary from',()=>{
  // Playtest: six OpenAI side quests in a row were "construct" foes (a signal tender, a sorting frame, a lamp, an oven, stools, a grate),
  // most of them for the same quest-giver.
  const s=E.createNewGame({classId:'ranger'});
  s.director={version:1,count:2,arc:'',quests:{}};
  const sent=JSON.parse(Director.prompt(s));
  assert.ok(Director.THEMES.includes(sent.variety.suggestedTheme));assert.deepEqual(sent.variety.recent,[]);
  s.director.quests={'ai-1-aaaaaaa':{id:'ai-1-aaaaaaa',name:'The Lamp',foeName:'A Lamp',enemyTheme:'construct',brief:'Tamsin asks.'},'ai-2-bbbbbbb':{id:'ai-2-bbbbbbb',name:'The Stools',foeName:'Archive Porter',enemyTheme:'construct',brief:'Tamsin asks again.'}};
  const again=JSON.parse(Director.prompt(s));
  assert.notEqual(again.variety.suggestedTheme,'construct');
  assert.deepEqual(again.variety.recent.map(r=>r.name),['The Stools','The Lamp']);
  assert.match(Director.SYSTEM,/variety\.suggestedTheme/);
});

test('journal questions stay free on a hosted game and still answer when the AI cannot',async t=>{
  // Review: guests (no AI allowance) got an error for "What did we promise?" instead of the journal answer.
  const {ai,calls}=await openaiService(t,['{}']);
  const hosted={hosted:true,config:()=>ai.config(),complete:async()=>{throw new Error('The AI game master needs an account on this server.');}};
  const out=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'question',text:'What did we promise people along the way?'},hosted,()=>0.5);
  assert.equal(out.result.ok,true);assert.equal(out.narration.source,'deterministic');
  const failing={config:()=>ai.config(),complete:async()=>{throw new Error('Set OPENAI_API_KEY to use the OpenAI provider.');}};
  const fallback=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'question',text:'What did we promise people along the way?'},failing,()=>0.5);
  assert.equal(fallback.result.ok,true,'a missing key falls back to the journal');
  const other=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'question',text:'Is the smith honest?'},failing,()=>0.5);
  assert.equal(other.result.ok,false,'a question the journal cannot answer still reports the AI error');
  assert.equal(calls.length,0);
});

test('the end of the written books does not say only Claude can write what comes next',()=>{
  // Second live OpenAI playtest (Wizard, level 71): with OpenAI as the game master, the
  // end of Book Four said "this needs the Claude AI game master".
  const Book=require('../src/book');
  const s=E.createNewGame({classId:'wizard'});
  const text=Book.ending(s);
  assert.match(text,/Ask the game master for a new adventure on the expedition board \(this needs the AI game master to be on\)\./);
  assert.doesNotMatch(text,/Claude/);
  assert.doesNotMatch(Book.ENDING||'',/Claude/);
});
