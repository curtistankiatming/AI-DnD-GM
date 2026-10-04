'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const UI = require('../public/ui-session');
const E = require('../src/engine'), N = require('../src/narrator');
const clone = x => JSON.parse(JSON.stringify(x));
function hero(name = 'Aster', stamp = '2026-01-01T00:00:00Z', mode = 'campaign') {
  const s = E.createNewGame({name, classId: 'fighter'}); s.createdAt = stamp; s.publicTest = {mode};
  return s;
}
function payload(s) { const state = E.normalizeIncomingState(clone(s)); return {state, view: E.buildView(state), narration: N.savedNarration(state, E.buildView(state))}; }
function fixture(initial = null) {
  let state = initial && clone(initial), draft = '', input = '', busy = false, counter = 0, preferencesFail = false;
  const disk = new Map(), decisions = [], asks = [], notifications = [], calls = [], prefs = new Map();
  let fail = null, hold = null;
  const env = {
    state: () => state, draft: () => draft, clearDraft: () => draft = '', slot: v => v === undefined ? input : (input = v),
    unique: () => String(++counter).padStart(12, '0'), busy: () => busy, setBusy: v => busy = v,
    storage: () => { if (preferencesFail) throw Error('Preference denied'); return {getItem: k => prefs.get(k), setItem: (k,v) => prefs.set(k,v)}; },
    ask: async q => { asks.push(q); return decisions.shift() || 'cancel'; }, notify: (m,t) => notifications.push({m,t}),
    activate: p => state = clone(p.state), changed() {},
    api: async (route, options = {}) => {
      calls.push({route,options}); if (hold) await hold;
      const url = new URL(route, 'http://local.invalid'), body = options.body ? JSON.parse(options.body) : {};
      if (fail && route.includes(fail)) return {response: {ok:false}, payload: {error:'Synthetic storage error'}};
      let out;
      if (url.pathname.endsWith('/list')) out = {saves:[...disk].map(([slot,s]) => s.corrupted ? {slot,corrupted:true} : {slot,playerName:s.player.name,level:s.player.level,scene:E.currentNode(s).title})};
      else if (url.pathname.endsWith('/save')) { disk.set(body.slot, clone(body.state)); out = {status:'saved',slot:body.slot}; }
      else if (url.pathname.endsWith('/load')) {
        const s = disk.get(url.searchParams.get('slot'));
        if (!s || s.corrupted) return {response: {ok:false},payload:{error:'Missing or corrupt save'}};
        out = payload(s);
      } else if (url.pathname.endsWith('/delete')) {disk.delete(url.searchParams.get('slot'));out={status:'deleted'};}
      else throw Error('Unanticipated route '+route);
      return {response:{ok:true},payload:out};
    }
  };
  const ui = UI.create(env);
  return {ui, env, disk, decisions, asks, notifications, calls, prefs,
    current:()=>state, setDraft:v=>draft=v, getDraft:()=>draft, slot:()=>input,
    setBusy:v=>busy=v, fail:v=>fail=v, preferenceFailure:()=>preferencesFail=true, hold:v=>hold=v};
}
async function begin(f, s = hero()) { assert.equal(await f.ui.replace(async()=>payload(s)),true); return f.current(); }

test('new campaign has its own Quick Save slot, never the persisted previous destination', async()=>{
  const f=fixture(); const old=hero('Old Hero'); f.disk.set('old-hero-briarwatch',old); f.prefs.set('dnd-ai-gm-v4-last-slot','old-hero-briarwatch');
  await begin(f,hero('New Hero','2026-02-01')); const shown=f.slot(); assert.notEqual(shown,'old-hero-briarwatch');
  assert.equal(await f.ui.quickSave(),true); assert.deepEqual(f.disk.get('old-hero-briarwatch'),old); assert.equal(f.disk.get(shown).player.name,'New Hero');
});
for(const decision of ['cancel','discard','save'])test('replace dirty campaign with '+decision,async()=>{
  const f=fixture();await begin(f);f.current().player.gold+=7;f.setDraft('A message not sent');const before=clone(f.current());
  f.decisions.push(decision);const ok=await f.ui.replace(async()=>payload(hero('Other','2026-02-01')),{label:'starting a new campaign'});
  assert.equal(ok,decision!=='cancel');assert.equal(f.asks.length,1);
  if(decision==='cancel'){assert.deepEqual(f.current(),before);assert.equal(f.getDraft(),'A message not sent');}
  if(decision==='save'){assert.equal([...f.disk.values()][0].player.gold,before.player.gold);assert.doesNotMatch(JSON.stringify([...f.disk.values()]),/A message not sent/);}
  if(decision!=='cancel')assert.equal(f.current().player.name,'Other');
});
test('failed Save-and-continue never creates or adopts another campaign',async()=>{
  const f=fixture();await begin(f);f.decisions.push('save');f.fail('/save');let created=0;const before=clone(f.current());
  assert.equal(await f.ui.replace(async()=>{created++;return payload(hero('Other'));}),false);
  assert.equal(created,0);assert.deepEqual(f.current(),before);assert.equal(f.ui.dirty(),true);assert.equal(f.disk.size,0);
});
test('failed replacement after Discard still preserves the open state and draft',async()=>{
  const f=fixture();await begin(f);f.setDraft('Draft');f.decisions.push('discard');const before=clone(f.current());
  assert.equal(await f.ui.replace(async()=>{throw Error('Failed load');}),false);assert.deepEqual(f.current(),before);assert.equal(f.getDraft(),'Draft');
});
test('Quick Save remains tied to active slot; Save As is separate',async()=>{
  const f=fixture();await begin(f);assert.equal(await f.ui.save('original'),true);f.env.slot('typed-but-not-confirmed');
  assert.equal(await f.ui.quickSave(),true);assert.ok(!f.disk.has('typed-but-not-confirmed'));assert.equal(f.slot(),'original');
  assert.equal(await f.ui.save('copy'),true);assert.ok(f.disk.has('copy'));assert.equal(f.ui.status().activeSlot,'copy');
});
for(const decision of ['cancel','replace'])test('overwriting another campaign needs '+decision,async()=>{
  const f=fixture();const old=hero('Another Hero','2025-01-01');f.disk.set('Shared',old);await begin(f);f.decisions.push(decision);
  assert.equal(await f.ui.save('shared.json'),decision==='replace');assert.match(f.asks[0].message,/Another Hero/);
  assert.equal(f.disk.get('Shared').player.name,decision==='replace'?'Aster':'Another Hero');assert.ok(!f.disk.has('shared'));
});
test('same name with a different creation identity still requires overwrite consent',async()=>{
  const f=fixture();f.disk.set('same-name',hero('Aster','2025-01-01'));await begin(f);assert.equal(await f.ui.save('same-name'),false);assert.equal(f.asks.length,1);
});
test('a saved file changed by another session is not silently overwritten',async()=>{
  const f=fixture();await begin(f);await f.ui.save('slot');f.disk.get('slot').player.gold+=10;
  assert.equal(await f.ui.quickSave(),false);assert.match(f.asks.at(-1).message,/changed since/);assert.notEqual(f.disk.get('slot').player.gold,f.current().player.gold);
});
test('corrupted destination remains untouched when replacement is cancelled',async()=>{
  const f=fixture();f.disk.set('broken',{corrupted:true});await begin(f);assert.equal(await f.ui.save('broken'),false);assert.deepEqual(f.disk.get('broken'),{corrupted:true});assert.match(f.asks[0].message,/unreadable/);
});
test('save success stays successful when preference storage is unavailable',async()=>{
  const f=fixture();f.preferenceFailure();await begin(f);assert.equal(await f.ui.quickSave(),true);assert.equal(f.disk.size,1);assert.equal(f.ui.dirty(),false);
});
test('listing failure cannot be interpreted as no existing saves',async()=>{
  const f=fixture();await begin(f);f.disk.set(f.slot(),hero('Other'));f.fail('/list');assert.equal(await f.ui.quickSave(),false);assert.equal([...f.disk.values()][0].player.name,'Other');
});
test('failed refresh after save does not turn a completed write into failure',async()=>{
  const f=fixture();await begin(f);const api=f.env.api;let listed=0;f.env.api=async(r,o)=>{if(r.endsWith('/list')&&++listed>1)throw Error('List offline');return api(r,o);};
  assert.equal(await f.ui.quickSave(),true);assert.equal(f.ui.dirty(),false);assert.equal(f.disk.size,1);assert.match(f.notifications.at(-1).m,/Save succeeded/);
});
for(const name of ['autosave','sandbox-autosave','NUL','../x','x'.repeat(49)])test('invalid or rolling named save is blocked: '+name,async()=>{
  const f=fixture();await begin(f);assert.equal(await f.ui.save(name),false);assert.equal(f.disk.size,0);
});
test('sandbox Quick Save never writes into normal named saves',async()=>{
  const f=fixture();const normal=hero('Normal');f.disk.set('campaign',normal);await begin(f,hero('Test Hero','2026-02-01','sandbox'));
  assert.match(f.slot(),/^sandbox-/);assert.equal(await f.ui.save('campaign'),true);assert.ok(f.disk.has('sandbox-campaign'));assert.deepEqual(f.disk.get('campaign'),normal);
});
test('loading a rolling autosave gives Quick Save a new named destination',async()=>{
  const f=fixture();const auto=hero();f.disk.set('autosave',auto);assert.equal(await f.ui.load('autosave'),true);
  assert.notEqual(f.slot(),'autosave');f.current().player.gold+=2;assert.equal(await f.ui.quickSave(),true);assert.deepEqual(f.disk.get('autosave'),auto);
});
test('Continue ignores missing and corrupted preferred saves without deleting them',()=>{
  const saves=[{slot:'broken',corrupted:true},{slot:'good',playerName:'Hero'}];assert.equal(UI.continueSave(saves,'broken').slot,'good');assert.equal(UI.continueSave(saves,'missing').slot,'good');assert.equal(saves.length,2);assert.equal(UI.continueSave([],''),null);
});
test('fresh browser start warns before replacing an existing rolling autosave',async()=>{
  const f=fixture();f.disk.set('autosave',hero());let calls=0;
  assert.equal(await f.ui.replace(async()=>{calls++;return payload(hero());},{rollingSlot:'autosave'}),false);assert.equal(calls,0);assert.equal(f.current(),null);
});
test('missing or corrupt load never prompts discard or changes current progress',async()=>{
  const f=fixture();await begin(f);const before=clone(f.current());assert.equal(await f.ui.load('missing'),false);assert.deepEqual(f.current(),before);assert.equal(f.asks.length,0);
});
test('Save-and-continue when loading the same slot does not restore a stale preflight copy',async()=>{
  const f=fixture();await begin(f);await f.ui.save('current');f.current().player.gold+=9;const gold=f.current().player.gold;f.decisions.push('save');
  assert.equal(await f.ui.load('current'),true);assert.equal(f.current().player.gold,gold);assert.equal(f.ui.dirty(),false);
});
for(const choice of ['cancel','delete'])test('delete requires explicit '+choice+' and identifies campaign',async()=>{
  const f=fixture();await begin(f);await f.ui.save('slot');const before=clone(f.current());f.decisions.push(choice);
  assert.equal(await f.ui.delete('slot'),choice==='delete');assert.equal(f.disk.has('slot'),choice!=='delete');assert.match(f.asks.at(-1).message,/Aster/);assert.deepEqual(f.current(),before);
  if(choice==='delete'){assert.equal(f.ui.status().activeSlot,null);assert.equal(f.ui.dirty(),true);}
});
test('failed delete leaves both the saved file and active destination intact',async()=>{
  const f=fixture();await begin(f);await f.ui.save('slot');f.decisions.push('delete');f.fail('/delete');assert.equal(await f.ui.delete('slot'),false);assert.ok(f.disk.has('slot'));assert.equal(f.ui.status().activeSlot,'slot');
});
test('unsent draft still triggers a leave warning even after saving progress',async()=>{
  const f=fixture();await begin(f);await f.ui.quickSave();f.setDraft('Think before sending');assert.equal(f.ui.dirty(),false);
  assert.equal(await f.ui.replace(async()=>payload(hero('Other'))),false);assert.match(f.asks.at(-1).message,/unsent message/);assert.equal(f.getDraft(),'Think before sending');
});
test('busy model blocks save, deletion, load and replacing session with no network calls',async()=>{
  const f=fixture();await begin(f);f.calls.length=0;f.setBusy(true);
  assert.equal(await f.ui.quickSave(),false);assert.equal(await f.ui.delete('x'),false);assert.equal(await f.ui.load('x'),false);assert.equal(await f.ui.replace(async()=>payload(hero())),false);assert.equal(f.calls.length,0);
});
test('repeated clicks cannot start overlapping saves',async()=>{
  const f=fixture();await begin(f);let release;f.hold(new Promise(r=>release=r));const pending=f.ui.quickSave();assert.equal(await f.ui.quickSave(),false);f.hold(null);release();assert.equal(await pending,true);assert.equal(f.calls.filter(c=>c.route.endsWith('/save')).length,1);
});
test('empty-state message uses actual combat and journey state',()=>{
  const v={scene:{},chat:{road:{present:true}},combat:null};assert.match(UI.emptyChoices(v),/Lantern Road/);assert.doesNotMatch(UI.emptyChoices(v),/combat is active/);
  assert.match(UI.emptyChoices({...v,combat:{active:true}}),/combat controls/);assert.match(UI.emptyChoices({scene:{ending:true}}),/epilogue/);
});
test('snapshot ignores timestamps but tracks instructions, resources, notes and pending proposals',()=>{
  const a=hero(),b=clone(a);b.updatedAt='different';assert.equal(UI.snapshot(a),UI.snapshot(b));b.chat.instructions='Keep it hopeful';assert.notEqual(UI.snapshot(a),UI.snapshot(b));
});
test('older saves without creation identity are not assumed to be the same campaign',()=>{const a=hero(),b=clone(a);assert.equal(UI.sameCampaign(a,b),true);delete b.createdAt;assert.equal(UI.sameCampaign(a,b),false);});
