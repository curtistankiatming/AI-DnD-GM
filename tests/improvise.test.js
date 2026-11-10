'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const E=require('../src/engine');
const I=require('../src/improvise');
const Chat=require('../src/chat-runtime');
const Journal=require('../src/journal');
const {createLocalAI}=require('../src/local-ai');
const {createClaudeProvider}=require('../src/claude-ai');

const high=()=>0.999,low=()=>0;
const base={intent:'climb the bell tower to look over the square',skill:'athletics',ability:'',difficulty:'moderate',success:'From the tower you spot fresh tracks leading north.',failure:'You slip and scrape your hands on the stone.',reward:'insight',risk:'harm'};
const fresh=()=>E.createNewGame({classId:'fighter'});
const act=(state,proposal,rng)=>E.resolveAction(state,{type:'improvise',proposal},rng);

test('validation fills the ability from the skill and rejects unknown values',()=>{
  const v=I.validate(base);assert.equal(v.ok,true);assert.equal(v.proposal.ability,'str');
  for(const bad of [{...base,skill:'hacking'},{...base,difficulty:'impossible'},{...base,reward:'magic-sword'},{...base,risk:'death'},{...base,intent:''},null,[]])assert.equal(I.validate(bad).ok,false);
  assert.equal(I.validate({...base,skill:'',ability:''}).proposal.ability,'wis','A non-trivial check without a skill falls back to Wisdom.');
});

test('trivial attempts never roll, reward or risk anything material',()=>{
  const s=fresh(),xp=s.player.xp,gold=s.player.gold;
  const out=act(s,{...base,difficulty:'trivial',reward:'xp',risk:'harm'},low);
  assert.equal(out.result.ok,true);assert.equal(out.events.some(e=>e.type==='roll'),false);
  assert.equal(out.state.player.xp,xp);assert.equal(out.state.player.gold,gold);
});

test('caps: XP needs moderate+ and is granted once per scene; material rewards stop after three',()=>{
  let s=fresh();
  assert.equal(E.previewImprovised(s,{...base,difficulty:'easy',reward:'xp'}).proposal.reward,'insight');
  const won=act(s,{...base,reward:'xp'},high);s=won.state;
  assert.equal(won.state.player.xp,I.xpFor(1,'moderate'));
  const again=E.previewImprovised(s,{...base,intent:'scale the old wall for a view',reward:'xp'});
  assert.equal(again.proposal.reward,'insight');assert.match(again.notes.join(' '),/already granted improvised XP/);
  for(const intent of ['search the well for coins','check under the bench for coins','pat down the drunk sleeping by the well'])s=act(s,{...base,intent,reward:'coin',risk:'none'},high).state;
  const capped=E.previewImprovised(s,{...base,intent:'search the gutters for coins',reward:'coin'});
  assert.equal(capped.proposal.reward,'insight');assert.match(capped.notes.join(' '),/no more material rewards/);
});

test('coin and harm stay within the level formula',()=>{
  const s=fresh(),gold=s.player.gold,hp=s.player.hp;
  const rich=act(s,{...base,reward:'coin',risk:'none'},high);
  const gained=rich.state.player.gold-gold;assert.ok(gained>=1&&gained<=4,`level 1 coin is 1d4, got ${gained}`);
  const hurt=act(fresh(),{...base,risk:'harm'},high===high?()=>0.5:low);
  const lost=hp-hurt.state.player.hp;assert.ok(lost>=0&&lost<=6,`level 1 harm is 1d6, got ${lost}`);
});

test('repeated, combat and exhausted attempts are refused without spending anything',()=>{
  let s=fresh();s=act(s,base,high).state;
  assert.equal(act(s,{...base},high).result.ok,false,'Same intent twice in one scene is refused.');
  const combat=fresh();combat.combat={active:true};
  assert.equal(E.previewImprovised(E.normalizeIncomingState(fresh()),base).ok,true);
  assert.match(I.bound(combat,I.validate(base).proposal,'x').error,/combat/);
  let t=fresh();
  for(let i=0;i<I.MAX_ATTEMPTS_PER_SCENE;i++)t=act(t,{...base,intent:`attempt number ${i} with variation ${'x'.repeat(i+4)}`,reward:'none',risk:'none'},high).state;
  assert.match(act(t,{...base,intent:'one more completely different idea'},high).result.error,/tried everything/);
});

test('successful insights become journal facts that later prompts can see',()=>{
  const s=act(fresh(),base,high).state;
  const fact=Journal.sync(s).facts.find(f=>f.source==='Improvised action confirmed by a roll');
  assert.ok(fact);assert.match(fact.text,/fresh tracks/);
  assert.match(JSON.stringify(Journal.forPrompt(s,4000)),/fresh tracks/);
  const reloaded=E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.equal(reloaded.improv.log.length,1,'Improvisation history survives a save round trip.');
});

test('the Claude schema is strict at every level',()=>{
  const walk=o=>{if(o.type==='object'){assert.equal(o.additionalProperties,false);assert.deepEqual([...o.required].sort(),Object.keys(o.properties).sort());Object.values(o.properties).forEach(walk);}};
  walk(Chat.CLAUDE_SCHEMA);assert.match(Chat.CLAUDE_SYSTEM,/kind=improvise/);
});

async function claudeService(t,replies){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-improv-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const calls=[];let i=0;
  const client={beta:{messages:{create:async body=>{calls.push(body);const text=replies[Math.min(i++,replies.length-1)];return {model:'claude-opus-5-5',stop_reason:'end_turn',content:[{type:'text',text}]};}}}};
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),claude:createClaudeProvider({clientFactory:()=>client})});
  await ai.save({enabled:true,provider:'claude'});
  return {ai,calls};
}

test('Claude improvisation: preview first, roll only on confirm, then Claude narrates the result',async t=>{
  const {ai,calls}=await claudeService(t,[JSON.stringify({kind:'improvise',optionId:'',reply:'Bold idea.',improvise:base}),'You haul yourself up the tower and see the tracks.']);
  const proposed=await Chat.resolveChat(fresh(),{mode:'action',text:'I climb the bell tower to get a better look'},ai,high);
  assert.equal(proposed.result.kind,'clarification');assert.equal(proposed.state.chat.pending.kind,'improvise');
  assert.match(proposed.narration.text,/Athletics \+\d+ vs DC 13/);assert.match(proposed.narration.text,/Nothing has happened yet/);
  assert.equal(proposed.state.improv.log.length,0,'No roll before confirmation.');
  assert.equal(calls[0].output_config.format.schema,Chat.CLAUDE_SCHEMA);assert.equal(calls[0].system[0].text,Chat.CLAUDE_SYSTEM);
  assert.match(calls[0].messages[0].content,/"improvisation"/);
  const saved=JSON.parse(JSON.stringify(proposed.state));
  const done=await Chat.resolveChat(saved,{confirm:true},ai,high);
  assert.equal(done.result.ok,true);assert.equal(done.state.improv.log[0].success,true);
  assert.ok(done.events.some(e=>e.type==='roll'));assert.equal(done.narration.source,'ai-chat');
  assert.equal(calls.length,2);
});

test('an edited pending proposal is re-bounded on confirm',async t=>{
  const {ai}=await claudeService(t,[JSON.stringify({kind:'improvise',optionId:'',reply:'',improvise:{...base,difficulty:'trivial',reward:'none',risk:'none'}}),'Done.']);
  const proposed=await Chat.resolveChat(fresh(),{mode:'action',text:'look around'},ai,high);
  const tampered=JSON.parse(JSON.stringify(proposed.state));tampered.chat.pending.proposal.reward='xp';
  const done=await Chat.resolveChat(tampered,{confirm:true},ai,high);
  assert.equal(done.state.player.xp,0,'Trivial attempts cannot grant XP even if the save is edited.');
});

test('local models cannot improvise; they are asked to pick a listed approach',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'briarwatch-improv-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const reply=JSON.stringify({kind:'improvise',optionId:'',reply:'',improvise:base});
  const ai=createLocalAI({configPath:path.join(dir,'ai.json'),fetchImpl:async()=>({ok:true,text:async()=>JSON.stringify({choices:[{finish_reason:'stop',message:{content:reply}}]})})});
  await ai.save({enabled:true,provider:'local',model:'m'});
  const out=await Chat.resolveChat(fresh(),{mode:'action',text:'I climb the tower'},ai,high);
  assert.equal(out.state.chat.pending,null);assert.match(out.narration.text,/Claude provider/);
});

test('a new game already has its improvisation record, so a save and reload is unchanged',()=>{
  const s=fresh();assert.deepEqual(s.improv,{version:1,scenes:{},log:[]});
  const strip=x=>{const c=JSON.parse(JSON.stringify(x));delete c.updatedAt;return c;};
  assert.deepEqual(strip(E.normalizeIncomingState(JSON.parse(JSON.stringify(s)))).improv,strip(s).improv);
});
