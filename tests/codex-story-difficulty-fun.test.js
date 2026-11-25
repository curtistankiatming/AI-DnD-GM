'use strict';
// Codex playtest, 25 November 2026 (docs/reviews/codex-story-difficulty-fun-2026-11-25.md):
// a job trial rescue costs no gold, the defeat screen names the fight that was
// lost and puts rescue first, and the terminal shows the short rest it can take.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Director = require('../src/director');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;
const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell', 'lantry', 'orme'];
void FX;

function act(s, a) { const r = E.resolveAction(s, a, high); assert.equal(r.result.ok, true, `${JSON.stringify(a)}: ${r.result.error}`); return r; }
function ready(id, job = {}) {
  const q = QUESTS[id];
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true }, job); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...ALL_TOWNS];
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b4_partone_done: true }); W.init(s);
  s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass'; s = act(s, { type: 'recruit' }).state;
  s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  return s;
}

test('a job trial rescue keeps every coin and says so', () => {
  const s = ready('b3-firstbell', { thirdJob: false }); s.player.level = 40; s.player.gold = 36800;
  const r = Director.commissionTrial(s, null, []); assert.equal(r.ok, true, r.error);
  const trial = Object.values(s.director.quests).find((q) => q.trial === 'third');
  s.world.activeQuest = trial.id; s.world.onExpedition = true; s.story.nodeId = 'defeat';
  assert.equal(W.inTrial(s), true);
  const view = E.buildView(s);
  assert.equal(view.scene.title, 'The trial is halted');
  assert.doesNotMatch(view.scene.opening, /bell|Sable/);
  assert.match(view.scene.objective, /^Accept rescue/);
  assert.match(view.scene.choices.find((c) => c.id === 'recover').description, /No gold/);
  const after = act(s, { type: 'story-choice', choiceId: 'recover' }).state;
  assert.equal(after.player.gold, 36800, 'A trial rescue costs no gold.');
});

test('a chapter defeat names the chapter, not the bell, and still costs a quarter of the gold', () => {
  const s = ready('b3-saltwick'); s.player.gold = 1000;
  s.world.activeQuest = 'b3-saltwick'; s.world.onExpedition = true; s.story.nodeId = 'defeat';
  const view = E.buildView(s);
  assert.doesNotMatch(view.scene.opening, /bell|Sable/);
  assert.match(view.scene.opening, new RegExp(QUESTS['b3-saltwick'].name));
  assert.match(view.scene.objective, /rescue|ledge/i);
  assert.doesNotMatch(view.scene.objective, /Reload/);
  assert.equal(act(s, { type: 'story-choice', choiceId: 'recover' }).state.player.gold, 750);
});

test('the bell keeps its own defeat words', () => {
  const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  s.world.activeQuest = 'bell'; s.story.nodeId = 'defeat';
  const view = E.buildView(s);
  assert.match(view.scene.opening, /Sable's command/);
  assert.match(view.scene.objective, /^Accept rescue/);
});
