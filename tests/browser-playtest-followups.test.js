'use strict';
// The suggestions from the browser playtest of 25 November 2026
// (docs/reviews/claude-browser-playtest-2026-11-25.md, "Not fixed, worth deciding"),
// built after Curtis said "take all recommendations".
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path'), net = require('node:net');
const { spawn } = require('node:child_process');
const E = require('../src/engine'), P = require('../src/progression');
const { STORY_NODES, CLUES } = require('../src/content');
const { createSeededRng } = require('../src/rules');
const Session = require('../public/ui-session.js'), M = require('../public/management-view.js');

const ROOT = path.join(__dirname, '..');
const low = () => 0;
function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Pell', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }

test('chapter middles are headed by what happens in that chapter, not the same three words', () => {
  const titles = ['approach', 'crisis', 'after'].map((phase) => STORY_NODES[`q-road-${phase}`].title);
  assert.deepEqual(titles, ['Cross under the causeway and reach the drivers', 'Release the wagon drivers', 'After the Toll of Empty Wagons']);
  for (const node of Object.values(STORY_NODES)) assert.ok(!['The approach', 'The deciding moment', 'What you leave behind'].includes(node.title), node.id);
  assert.equal(CLUES['chairs-evidence'].name, 'A lead on the Chair Problem');
});

test('everyone hurt is named in one warning, not one each', () => {
  const s = hero('rogue', 3); s.story.nodeId = 'mist-hollow';
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'hold-wolves' }, low).state;
  if (r.combat?.active) r.combat = null;
  r.player.hp = 1; for (const m of r.party) m.hp = 1;
  r.world.completed.bell = { xp: 0, gold: 0 }; r.world.unlockedTowns = ['briarwatch']; r.world.townId = 'briarwatch'; r.story.nodeId = 'town-briarwatch';
  const prep = E.buildView(r).world.preparation;
  assert.ok(prep.length);
  const health = prep[0].warnings.filter((w) => /below 65% health/.test(w));
  assert.equal(health.length, 1);
  assert.match(health[0], /^Pell(, [^,]+)* and [^,]+ are below 65% health\.$/);
});

test('the town readiness list says a party-wide warning once, not once per expedition', () => {
  const v = { player: { name: 'Pell', hp: 5, maxHp: 10, resources: {} }, party: [], world: {
    quests: [{ id: 'a', name: 'First' }, { id: 'b', name: 'Second' }],
    preparation: [{ questId: 'a', warnings: ['Pell is below 65% health.', 'Bring rope.'] }, { questId: 'b', warnings: ['Pell is below 65% health.'] }] } };
  const r = M.readiness(v);
  assert.equal(r.filter((x) => /below 65%/.test(x)).length, 1);
  assert.ok(r.includes('Pell is below 65% health.'));
  assert.ok(r.includes('First: Bring rope.'));
});

test('a blow bigger than the health left says both numbers', () => {
  const s = hero('fighter', 4); E.startCombat(s, 'quest:road', createSeededRng(5), []);
  const me = s.combat.actors.find((a) => a.id === 'player');
  s.combat.actors = [me, ...s.combat.actors.filter((a) => a !== me)]; s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; me.actionUsed = false;
  const foe = s.combat.actors.find((a) => a.team === 'enemy'); foe.hp = 1; foe.ac = 1;
  const r = E.resolveAction(s, { type: 'combat', actionId: 'weapon-attack', targetId: foe.id }, () => .999999);
  const told = r.events.map((e) => e.text || '').join(' ');
  assert.match(told, /dealt \d+ \w+ damage to [^,]+, more than the 1 health they had left\./);
});

test('Continue opens the autosave when it is newer than the save used last', () => {
  const saves = [{ slot: 'autosave', savedAt: '2026-11-25T12:00:00Z' }, { slot: 'pell-1', savedAt: '2026-11-25T10:00:00Z' }];
  assert.equal(Session.continueSave(saves, 'pell-1').slot, 'autosave');
  assert.equal(Session.continueSave([{ ...saves[0], savedAt: '2026-11-25T09:00:00Z' }, saves[1]], 'pell-1').slot, 'pell-1');
  assert.equal(Session.continueSave([saves[1]], 'pell-1').slot, 'pell-1');
});

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer(); server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close((e) => e ? reject(e) : resolve(port)); });
  });
}
test('the web server keeps a rolling autosave after every move', { timeout: 30000 }, async (t) => {
  const saveDir = await fs.mkdtemp(path.join(os.tmpdir(), 'briarwatch-autosave-'));
  const port = await freePort(), base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, stdio: 'ignore',
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), SAVE_DIR: saveDir, AI_CONFIG_PATH: path.join(saveDir, 'ai.json'), ENV_FILE_PATH: path.join(saveDir, '.env'), ANTHROPIC_API_KEY: '', HOSTED: '', AI_NARRATOR: 'off' } });
  t.after(async () => { child.kill(); await fs.rm(saveDir, { recursive: true, force: true }); });
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 50)); }
  const post = async (route, body) => (await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
  const started = await post('/api/session/new', { setup: { name: 'Bram', classId: 'cleric' } });
  // The autosave is written just after the reply, so give it a moment.
  const read = async (ok = () => true) => {
    for (let i = 0; i < 100; i++) { try { const saved = JSON.parse(await fs.readFile(path.join(saveDir, 'autosave.json'), 'utf8')); if (ok(saved)) return saved; } catch {} await new Promise((r) => setTimeout(r, 20)); }
    return JSON.parse(await fs.readFile(path.join(saveDir, 'autosave.json'), 'utf8'));
  };
  assert.equal((await read()).state.player.name, 'Bram');
  const choice = started.view.scene.choices.find((c) => !c.disabled);
  const moved = await post('/api/action', { state: started.state, action: { type: 'story-choice', choiceId: choice.id } });
  assert.equal(moved.result.ok, true);
  assert.equal((await read((x) => x.state.story.nodeId === moved.state.story.nodeId)).state.story.nodeId, moved.state.story.nodeId);
  const list = await (await fetch(`${base}/api/session/list`)).json();
  assert.deepEqual(list.saves.map((s) => s.slot), ['autosave']);
  // A refused move leaves the autosave alone.
  const before = await fs.readFile(path.join(saveDir, 'autosave.json'), 'utf8');
  await post('/api/action', { state: moved.state, action: { type: 'story-choice', choiceId: 'no-such-choice' } });
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await fs.readFile(path.join(saveDir, 'autosave.json'), 'utf8'), before);
});
