'use strict';
// Regressions from the first playtest with a real Claude key (2026-11-25).
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const E=require('../src/engine');
const D=require('../src/director');
const Chat=require('../src/chat-runtime');
const {createLocalAI}=require('../src/local-ai');
const {createClaudeProvider}=require('../src/claude-ai');

// Every array in the adventure schema whose items carry an enum, by path.
function enumArrays(node,at='',out=[]){
  if(!node||typeof node!=='object')return out;
  if(node.type==='array'&&node.items&&node.items.enum)out.push(at);
  for(const [k,v] of Object.entries(node.properties||{}))enumArrays(v,`${at}.${k}`,out);
  if(node.items)enumArrays(node.items,`${at}[]`,out);
  return out;
}

test('the adventure schema has no skill-enum arrays (Claude refused it as "compiled grammar is too large")',()=>{
  // Five "alt" arrays of 18 skill ids each pushed the strict schema over the API's
  // grammar limit, so every "Write me a new adventure" failed with a real key.
  const arrays=enumArrays(D.SCHEMA);
  assert.deepEqual(arrays.filter(p=>p.endsWith('.alt')),[],'alt is a plain string now');
  assert.ok(arrays.length<=2,`only small enum arrays remain: ${arrays.join(', ')}`);
  for(const p of ['investigate','route','peaceful','objective'])assert.equal(D.SCHEMA.properties[p].properties.alt.type,'string');
});

test('alt skills sent as one comma-separated string are read; unknown names are dropped',()=>{
  const draft=require('./fixtures/director-draft')();
  draft.investigate.alt='history, Persuasion,hacking';draft.objective.alt='Sleight of Hand';draft.route.alt='';draft.peaceful.alt=['insight'];
  const out=D.bound({level:20,unlock:'bell'},draft);assert.equal(out.ok,true);const quest=out.quest;
  assert.deepEqual(quest.investigate.alt,['history','persuasion']);
  assert.deepEqual(quest.route.alt,[]);
  assert.deepEqual(quest.objective.alt,['sleightOfHand']);
  assert.deepEqual(quest.peaceful.alt,['insight'],'saved adventures with lists still load');
});

async function claudeService(t,replies){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-playtest-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const calls=[];let i=0;
  const client={beta:{messages:{create:async body=>{calls.push(body);const text=replies[Math.min(i++,replies.length-1)];return {model:'claude-opus-5-5',stop_reason:'end_turn',content:[{type:'text',text}]};}}}};
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),claude:createClaudeProvider({clientFactory:()=>client})});
  await ai.save({enabled:true,provider:'claude'});
  return {ai,calls};
}
const juggle={intent:'juggle three apples to cheer the villagers',skill:'performance',ability:'',difficulty:'moderate',success:'A child laughs.',failure:'An apple lands in the mud.',reward:'none',risk:'none',remembered:true};

test('the consequence prompt leaves out an unchanged trade reputation and tells Claude not to gender the hero',async t=>{
  // Playtest: "The party's trade reputation remains at 0, unchanged." ended nearly every result.
  const {ai,calls}=await claudeService(t,[JSON.stringify({kind:'improvise',optionId:'',reply:'You pick up three apples.',improvise:juggle}),'The apples fly.']);
  const proposed=await Chat.resolveChat(E.createNewGame({classId:'rogue'}),{mode:'action',text:'I juggle three apples'},ai,()=>0.999);
  const done=await Chat.resolveChat(JSON.parse(JSON.stringify(proposed.state)),{confirm:true},ai,()=>0.999);
  assert.equal(done.result.ok,true);
  const prompt=JSON.parse(calls[1].messages[0].content);
  assert.equal(prompt.ownership.partyTradeReputation,undefined);
  const sys=calls[1].system[0].text;
  assert.match(sys,/never he or she/);assert.match(sys,/do not repeat roll numbers/);
});

test('the game master prompt keeps proposals unplayed, the hero ungendered and the chapter mystery for the written choices',()=>{
  assert.match(Chat.CLAUDE_SYSTEM,/never narrate the attempt as already done/);
  assert.match(Chat.CLAUDE_SYSTEM,/never use he, she, him or her for the hero/);
  assert.match(Chat.CLAUDE_SYSTEM,/must not solve the scene's goal or mystery/);
});
