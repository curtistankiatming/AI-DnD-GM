'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const E = require('../src/engine');
const { CLASSES } = require('../src/content');
const { QUESTS } = require('../src/expansion');
const { createSeededRng } = require('../src/rules');
const { createClient, makeSandbox, PREFIX } = require('../src/public-preview');
const { buildPublic } = require('../scripts/build-public');
const { chooseAction } = require('./player-policy');
function storage() {
  const values = new Map();
  return { get length() { return values.size; }, key: n => [...values.keys()][n],
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
async function call(client, route, body, method = body ? 'POST' : 'GET') {
  const response = await client.request(route, { method, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { response, payload: await response.json() };
}

test('offline requests create games and reject unrelated commands without calling fetch', async t => {
  const old = global.fetch; global.fetch = async () => { throw new Error('Network not permitted'); }; t.after(() => { global.fetch = old; });
  const client = createClient(storage());
  assert.equal((await call(client, '/api/setup')).payload.catalog.classes.length, 6);
  const { payload } = await call(client, '/api/session/new', { classId: 'rogue' });
  assert.equal(payload.state.player.level, 1);
  assert.equal(payload.narration.source, 'deterministic');
  const rejected = await call(client, '/api/action', { state: payload.state, action: { type: 'missing-action' } });
  assert.equal(rejected.response.status, 422);
  assert.deepEqual(rejected.payload.state.player.inventory, payload.state.player.inventory);
  assert.equal(rejected.payload.state.story.nodeId, payload.state.story.nodeId);
});

test('sandbox saves and autosaves cannot replace normal campaign slots', async () => {
  const store = storage(), client = createClient(store);
  const campaign = (await call(client, '/api/session/new', { name: 'Campaign Hero' })).payload.state;
  await call(client, '/api/session/save', { slot: 'same-name', state: campaign });
  const before = store.getItem(`${PREFIX}save:same-name`), auto = store.getItem(`${PREFIX}save:autosave`);
  const sandbox = (await call(client, '/api/test/start', { level: 10, questId: 'trial' })).payload.state;
  assert.equal(sandbox.player.level, 10); assert.equal(sandbox.publicTest.mode, 'sandbox');
  assert.equal((await call(client, '/api/session/save', { slot: 'same-name', state: sandbox })).payload.slot, 'sandbox-same-name');
  assert.equal(store.getItem(`${PREFIX}save:same-name`), before);
  assert.equal(store.getItem(`${PREFIX}save:autosave`), auto);
  assert.equal((await call(client, '/api/session/save', { slot: 'sandbox-same-name', state: campaign })).response.ok, false);
  const loaded = (await call(client, '/api/session/load?slot=sandbox-same-name')).payload.state;
  assert.equal(loaded.publicTest.mode, 'sandbox');
  assert.deepEqual(loaded.player.inventory, sandbox.player.inventory);
  assert.deepEqual(loaded.world.completed, sandbox.world.completed);
  await call(client, '/api/session/delete?slot=sandbox-same-name', null, 'DELETE');
  assert.equal((await call(client, '/api/session/load?slot=sandbox-same-name')).response.status, 404);
  assert.equal(store.getItem(`${PREFIX}save:same-name`), before);
});

test('save export/import retains partial resources, equipment and sandbox label', () => {
  const client = createClient(storage(), { version: 'test', sourceSha256: 'test-build' });
  const state = makeSandbox({ classId: 'wizard', level: 7 });
  state.player.resources.technique.current = 1;
  const text = client.exportText(state), loaded = client.importText(text).state;
  assert.equal(loaded.player.resources.technique.current, 1);
  assert.equal(loaded.publicTest.mode, 'sandbox');
  assert.deepEqual(loaded.player.equipment, state.player.equipment);
  assert.deepEqual(loaded.player.inventory, state.player.inventory);
  assert.equal(JSON.parse(text).build.version, 'test');
});

test('bad imports are rejected before writing any browser save', () => {
  const store = storage(), client = createClient(store);
  for (const text of ['null', '[]', '{}', '{', 'x'.repeat(1024 * 1024 + 1), JSON.stringify({format:'other',state:E.createNewGame()})]) {
    assert.throws(() => client.importText(text));
  }
  assert.equal(store.length, 0);
  const future = E.createNewGame(); future.schemaVersion = 5;
  assert.throws(() => client.importText(JSON.stringify(future)));
  assert.equal(store.length, 0);
});

test('storage failure does not block gameplay or falsely report a successful save', async () => {
  const store = storage(); store.setItem = () => { throw new Error('Quota'); };
  const client = createClient(store);
  const started = await call(client, '/api/session/new', { classId: 'fighter' });
  assert.equal(started.response.status, 200); assert.match(started.payload.storageWarning, /Export/);
  assert.equal((await call(client, '/api/session/save', { slot: 'save', state: started.payload.state })).response.ok, false);
  assert.equal(JSON.parse(client.exportText(started.payload.state)).state.player.level, 1);
});

test('all class/scenario fixtures render without claiming natural progression', () => {
  for (const classId of Object.keys(CLASSES)) for (const questId of ['town', ...Object.keys(QUESTS)]) {
    const state = makeSandbox({ classId, questId, level: 1 });
    const view = E.buildView(state);
    assert.equal(state.publicTest.mode, 'sandbox');
    assert.equal(view.player.level, Math.max(1, QUESTS[questId]?.level || 1));
    assert.equal(view.player.gold, 400);
    if (questId !== 'town') {
      assert.ok(state.world.completed[QUESTS[questId].unlock]);
      assert.ok(!state.world.completed[questId]);
    }
  }
});

for (const classId of Object.keys(CLASSES)) {
  test(`offline transport completes ${classId} campaign to level 10 with ordinary policy actions`, async () => {
    const client = createClient(storage(), {}, createSeededRng(301)), memory = {};
    let payload = (await call(client, '/api/session/new', { classId, difficulty: 'standard' })).payload;
    for (let step = 0; step < 900; step++) {
      const action = chooseAction(payload.view, memory, 'prepared');
      if (!action) break;
      assert.ok(!action.error, action.error);
      const next = await call(client, '/api/action', { state: payload.state, action });
      assert.equal(next.response.ok, true, JSON.stringify(next.payload.result));
      payload = next.payload;
    }
    assert.equal(payload.state.player.level, 10);
    assert.ok(payload.view.world.campaignComplete);
    assert.ok(payload.view.progression.specialization);
    assert.equal(payload.state.publicTest.mode, 'campaign');
  });
}

test('static build is self-contained, blocks networking, and embeds source identity', t => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'briarwatch-public-build-')); t.after(() => fs.rmSync(out, {recursive:true,force:true}));
  const first = buildPublic(out), second = buildPublic(out);
  assert.equal(first.html, second.html);
  assert.match(first.html, /connect-src 'none'/);
  assert.doesNotMatch(first.html, /<script[^>]+src=|<link[^>]+rel="stylesheet"/);
  assert.match(first.html, /window\.BriarwatchOffline\.request\(path/);
  assert.ok(first.html.includes(first.build.sourceSha256));
  assert.match(fs.readFileSync(path.join(out, 'SHA256SUMS.txt'), 'utf8'), /briarwatch-playtest\.html/);
  assert.equal(fs.readFileSync(path.join(out, 'index.html'), 'utf8'), fs.readFileSync(path.join(out, 'briarwatch-playtest.html'), 'utf8'));
});
