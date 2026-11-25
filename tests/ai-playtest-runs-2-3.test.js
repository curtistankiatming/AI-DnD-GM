'use strict';
// Regressions from the second and third real-key AI playtests (2026-11-25).
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const E=require('../src/engine');
const Chat=require('../src/chat-runtime');
const {createLocalAI}=require('../src/local-ai');
const {createClaudeProvider}=require('../src/claude-ai');

async function claudeService(t,replies){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-playtest-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const calls=[];let i=0;
  const client={beta:{messages:{create:async body=>{calls.push(body);const text=replies[Math.min(i++,replies.length-1)];return {model:'claude-opus-5-5',stop_reason:'end_turn',content:[{type:'text',text}]};}}}};
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),claude:createClaudeProvider({clientFactory:()=>client})});
  await ai.save({enabled:true,provider:'claude'});
  return {ai,calls};
}
const ale={intent:'buy a round of ale for the harbour crew',skill:'persuasion',ability:'',difficulty:'easy',success:'The crew warms to you.',failure:'They drink and stay wary.',reward:'insight',risk:'coin',remembered:true};

test('"I buy a round of ale" goes to the AI game master instead of a dead-end item error',async t=>{
  // Playtest: with Claude on, this got "Name an item shown in the inventory or current shop. No action was taken."
  const {ai,calls}=await claudeService(t,[JSON.stringify({kind:'improvise',optionId:'',reply:'You wave the barman over.',improvise:ale})]);
  const out=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'action',text:'I buy a round of ale for the harbour crew'},ai,()=>0.5);
  assert.equal(calls.length,1,'Claude reads the action');
  assert.doesNotMatch(out.message||'',/Name an item shown/);
});

test('a real item command still skips the model, and without AI the rules message stays',async t=>{
  const {ai,calls}=await claudeService(t,['{}']);
  const used=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'action',text:'use healing potion'},ai,()=>0.5);
  assert.equal(calls.length,0);assert.doesNotMatch(used.message||'',/Name an item shown/);
  const off=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'action',text:'I buy a round of ale'},null,()=>0.5);
  assert.match(JSON.stringify(off),/Name an item shown/);
});

test('a blocked expedition says another one is under way, not that a level is needed',()=>{
  // Playtest: a level 15 hero saw a greyed "Depart" with "required level 13" while a chapter was in progress.
  const W=require('../src/world'),P=require('../src/progression'),{QUESTS,TOWNS}=require('../src/expansion');
  const q=QUESTS.road,s=E.createNewGame({classId:'ranger'});E.awardXp(s,P.XP_NEXT[q.level-1],[],'fixture');
  s.world.completed[q.unlock]={xp:0,gold:0};s.world.unlockedTowns=Object.keys(TOWNS);s.world.townId=q.town;s.story.nodeId=`town-${q.town}`;W.init(s);
  assert.equal(W.view(s).quests.find(c=>c.id==='road').canDepart,true);
  s.world.activeQuest='bell';
  const card=W.view(s).quests.find(c=>c.id==='road');
  assert.equal(card.canDepart,false);assert.ok(card.busyWith);
  assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/expedition.js'),'utf8'),/Only one expedition can be under way at a time/);
});

test('every Claude prompt that writes companions limits their habits',()=>{
  // Playtest: Orin took the door and offered to carry something in almost every scene.
  const {VOICE_RULE}=require('../src/companion-voice');
  assert.match(VOICE_RULE,/at most one of their habits/);
  for(const sys of [Chat.CLAUDE_SYSTEM,require('../src/narrator').NARRATOR_SYSTEM,require('../src/director').SYSTEM])assert.ok(sys.includes(VOICE_RULE));
});
