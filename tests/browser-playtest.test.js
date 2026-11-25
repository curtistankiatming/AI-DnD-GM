'use strict';
// Browser playtest, 25 November 2026 (docs/reviews/claude-browser-playtest-2026-11-25.md):
// a fight won by force reads as a sentence, a third failed death save does not
// say the hero died, Nessa gets two chances to join (Curtis), and a hosted
// visitor's browser really keeps the current game.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path'), net = require('node:net');
const { spawn } = require('node:child_process');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Hosted = require('../src/hosted');
const { createSeededRng } = require('../src/rules');

const ROOT = path.join(__dirname, '..');
const SECRET = 'browser-playtest-secret-'.padEnd(48, 'x');
const high = () => .999999, low = () => 0;
function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Pell', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function myTurn(s) {
  const me = s.combat.actors.find((a) => a.id === 'player');
  s.combat.actors = [me, ...s.combat.actors.filter((a) => a !== me)]; s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; me.actionUsed = false; me.bonusUsed = false;
  return me;
}

test('a chapter fight won by defeating everyone tells the objective as done, in a real sentence', () => {
  const s = hero('fighter', 4); E.startCombat(s, 'quest:road', createSeededRng(5), []);
  s.world.activeQuest = 'road'; s.world.progress.road = {};
  myTurn(s);
  const foes = s.combat.actors.filter((a) => a.team === 'enemy');
  for (const f of foes) { f.hp = 0; f.conditions = [...(f.conditions || []), 'unconscious']; }
  foes[0].hp = 1; foes[0].ac = 1; foes[0].conditions = [];
  const target = foes[0].id;
  const r = E.resolveAction(s, { type: 'combat', actionId: 'weapon-attack', targetId: target }, high);
  assert.equal(r.result.ok, true, r.result.error);
  const told = r.events.map((e) => e.text || '').join(' ');
  assert.match(told, /The opposition is defeated, and with nobody left to stop you the job is finished\. Release the wagon drivers: done\./);
  assert.doesNotMatch(told, /secures release/);
});

test('a third failed death save loses the fight without saying the hero died', () => {
  const s = hero('rogue', 3); E.startCombat(s, 'quest:road', createSeededRng(5), []);
  const me = myTurn(s); me.hp = 0; me.deathSaves = { successes: 0, failures: 2, stable: false };
  const r = E.resolveAction(s, { type: 'combat', actionId: 'death-save' }, () => 0.2);
  const told = r.events.map((e) => e.text || '').join(' ');
  assert.match(told, /Pell fails a third death save\. The fight is lost\./);
  assert.doesNotMatch(told, /dies|chapter is lost/);
});

test('an older save that never saw the offer can still meet Nessa through the guild, in a short scene', () => {
  const s = hero('rogue', 3); s.world.completed.bell = { xp: 0, gold: 0 };
  s.world.unlockedTowns = ['briarwatch']; s.world.townId = 'briarwatch'; s.story.nodeId = 'town-briarwatch'; W.init(s);
  assert.equal(E.buildView(s).world.canRecruit, true);
  const r = E.resolveAction(s, { type: 'recruit', companionId: 'nessa' }, low);
  assert.equal(r.result.ok, true, r.result.error);
  assert.ok(r.state.party.some((m) => m.id === 'nessa'));
  const told = r.events.map((e) => e.text || '').join(' ');
  assert.match(told, /Nessa: Guild says you’re short a pair of eyes\./);
  assert.doesNotMatch(told, /recruitment fee/);
});

function reportedWithoutNessa() {
  const s = hero('rogue', 2); s.story.nodeId = 'ending';
  assert.ok(!s.party.some((m) => m.id === 'nessa'));
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'report-bell' }, low);
  assert.equal(r.result.ok, true, r.result.error);
  return r.state;
}

test('a hero who walked past the rescue gets a second and last chance to take Nessa on', () => {
  const s = reportedWithoutNessa();
  assert.equal(s.story.nodeId, 'nessa-offer');
  assert.deepEqual(E.buildView(s).scene.choices.map((c) => c.id), ['nessa-take', 'nessa-decline']);
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'nessa-take' }, low);
  assert.equal(r.result.ok, true, r.result.error);
  assert.ok(r.state.party.some((m) => m.id === 'nessa'));
  assert.equal(r.state.story.flags['nessa:offer'], 'joined');
  assert.equal(r.state.story.nodeId, 'town-briarwatch');
});

test('turning Nessa down a second time is final', () => {
  let s = reportedWithoutNessa();
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'nessa-decline' }, low);
  assert.equal(r.result.ok, true, r.result.error);
  s = r.state;
  assert.ok(!s.party.some((m) => m.id === 'nessa'));
  assert.equal(s.story.flags['nessa:offer'], 'declined');
  assert.equal(s.story.nodeId, 'town-briarwatch');
  E.awardXp(s, P.XP_NEXT[4], [], 'test fixture');
  assert.equal(E.buildView(s).world.canRecruit, false, 'no town button either');
  assert.equal(E.resolveAction(s, { type: 'recruit', companionId: 'nessa' }, low).result.ok, false);
});

test('a hero who rescued Nessa does not meet her twice', () => {
  let s = hero('rogue', 2); s.story.nodeId = 'mist-hollow';
  s = E.resolveAction(s, { type: 'story-choice', choiceId: 'hold-wolves' }, low).state;
  assert.ok(s.party.some((m) => m.id === 'nessa'), 'rescued in the mist');
  if (s.combat?.active) s.combat = null;
  s.story.nodeId = 'ending';
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'report-bell' }, low);
  assert.equal(r.result.ok, true, r.result.error);
  assert.equal(r.state.party.filter((m) => m.id === 'nessa').length, 1);
  assert.equal(r.state.story.nodeId, 'town-briarwatch', 'no second offer');
});

test('the story remembers a Nessa who was turned away, or never met', () => {
  const X = require('../src/expansion');
  const raw = (file) => require(`../src/data/${file}.json`);
  const told = (state, lines) => X.liveLines(state, lines.map(X.storyLine)).map((l) => l.narration || `${l.speaker}: ${l.text}`).join(' ');
  const base = () => hero('rogue', 6);
  const declined = base(); declined.story.flags['nessa:offer'] = 'declined';
  const never = base();
  const signal = raw('quests').signal.after;
  assert.match(told(declined, signal), /Wren: Girl came through the fort a fortnight back/);
  assert.match(told(never, signal), /Wren: I tied that scarf up for a scout of mine\. Reed\./);
  const cinder = raw('quests').cinderfold.opening;
  assert.match(told(declined, cinder), /Reed's on the coast road/);
  assert.match(told(never, cinder), /tell her the forge has a post going/);
  const forge = Object.values(raw('scenes')).flatMap((sc) => Object.values(sc.nodes || {})).find((n) => JSON.stringify(n).includes("Orin has the quartermaster's invoice")).lines;
  assert.match(told(declined, forge), /Reed came by in the autumn and lit it for me/);
  assert.match(told(never, forge), /asks if you ever ran into a scout called Reed/);
  // With Nessa in the party none of it is told.
  let withHer = base(); withHer.story.nodeId = 'mist-hollow';
  withHer = E.resolveAction(withHer, { type: 'story-choice', choiceId: 'hold-wolves' }, low).state;
  assert.ok(withHer.party.some((m) => m.id === 'nessa'));
  assert.doesNotMatch(told(withHer, [...signal, ...cinder, ...forge]), /scout called Reed|Girl came through|I tied that scarf|coast road/);
});

// --- The hosted server over HTTP ---
async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close((e) => e ? reject(e) : resolve(port)); });
  });
}
async function startServer(t, env) {
  const saveDir = await fs.mkdtemp(path.join(os.tmpdir(), 'briarwatch-browser-'));
  const port = await freePort(), base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), SAVE_DIR: saveDir, AI_CONFIG_PATH: path.join(saveDir, 'ai.json'), ENV_FILE_PATH: path.join(saveDir, '.env'), ANTHROPIC_API_KEY: '', ...env },
    stdio: 'ignore'
  });
  t.after(async () => { child.kill(); await fs.rm(saveDir, { recursive: true, force: true }); });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${base}/api/health`)).ok) return base; } catch {}
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('Server did not become healthy.');
}
async function call(base, route, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + route, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let payload = null; try { payload = JSON.parse(await response.text()); } catch {}
  return { status: response.status, payload };
}

test('a hosted visitor without an account continues the game the browser kept, and only an untouched one', { timeout: 30000 }, async (t) => {
  const base = await startServer(t, { HOSTED: '1', HOSTED_SECRET: SECRET, HOSTED_SECURE_COOKIE: '0' });
  const paid = { authorization: `Bearer ${Hosted.issuePass({ id: 'reader', plan: 'paid' }, SECRET)}` };
  assert.deepEqual((await call(base, '/api/setup')).payload.hosted, { serverSaves: false });
  assert.deepEqual((await call(base, '/api/setup', { headers: paid })).payload.hosted, { serverSaves: true });

  const started = await call(base, '/api/session/new', { method: 'POST', body: { setup: { name: 'Guest', classId: 'cleric' } } });
  const kept = JSON.parse(JSON.stringify(started.payload.state));
  const back = await call(base, '/api/session/resume', { method: 'POST', body: { state: kept } });
  assert.equal(back.status, 200);
  assert.equal(back.payload.state.player.name, 'Guest');
  assert.ok(back.payload.view.scene);
  assert.equal(Hosted.verify(back.payload.state, SECRET), true);

  const edited = JSON.parse(JSON.stringify(kept)); edited.player.gold = 99999;
  const refused = await call(base, '/api/session/resume', { method: 'POST', body: { state: edited } });
  assert.equal(refused.status, 409);
  assert.equal(refused.payload.error, Hosted.TAMPERED);
  assert.equal((await call(base, '/api/session/resume', { method: 'POST', body: {} })).status, 400);
});

test('the open-source server has no resume route and says nothing about hosting', { timeout: 30000 }, async (t) => {
  const base = await startServer(t, { HOSTED: '' });
  assert.equal((await call(base, '/api/setup')).payload.hosted, undefined);
  assert.equal((await call(base, '/api/session/resume', { method: 'POST', body: { state: {} } })).status, 404);
});
