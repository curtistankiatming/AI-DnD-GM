'use strict';
// Codex playtest, 25 November 2026: the middle of Book Four (The Captain's
// Order to The Reckoner's Sum) repeated rest, set out, talk, investigate,
// approach check and deciding check in every town. Each of those chapters now
// opens on what the party carried from the last one: every decision of the
// chapter before has its own way straight to the deciding moment.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;
const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell', 'lantry', 'orme'];
void FX;

function act(s, a) { const r = E.resolveAction(s, a, high); assert.equal(r.result.ok, true, `${JSON.stringify(a)}: ${r.result.error}`); return r; }
function ready(id, flags) {
  const q = QUESTS[id];
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true }); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...ALL_TOWNS];
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b4_partone_done: true }, flags); W.init(s);
  s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass'; s = act(s, { type: 'recruit' }).state;
  s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  return act(s, { type: 'depart', questId: id }).state;
}
const MIDDLE = ['b4-sheddon', 'b4-orme', 'b4-greve', 'b4-thrum', 'b4-reckoning'];

test('every decision of the chapter before opens its own carried way in', () => {
  for (const id of MIDDLE) {
    const q = QUESTS[id], before = QUESTS[q.unlock];
    for (const d of before.decisions) {
      const s = ready(id, { [d.flag]: true });
      const carried = E.buildView(s).scene.choices.filter((c) => c.id.startsWith('carry-'));
      assert.equal(carried.length, 1, `${id} after ${before.id}:${d.id} has one carried way in`);
      assert.equal(E.buildView(s).scene.choices[0].id, carried[0].id, 'the carried way is offered first');
    }
  }
});

test('a carried way in gives the lead, tells the approach and opens on the deciding moment', () => {
  for (const id of MIDDLE) {
    const q = QUESTS[id], d = QUESTS[q.unlock].decisions[0];
    const s = ready(id, { [d.flag]: true });
    const c = E.buildView(s).scene.choices.find((x) => x.id.startsWith('carry-'));
    assert.equal(c.check, null, 'no roll');
    const after = act(s, { type: 'story-choice', choiceId: c.id }).state;
    assert.equal(after.story.nodeId, `q-${id}-crisis`);
    assert.ok(after.story.clues.includes(`${id}-evidence`), 'the chapter lead is in hand');
    assert.equal(after.story.flags[`prepared:${id}`], true);
    assert.equal(after.story.flags[`approach:${id}`], undefined, 'no approach advantage');
    assert.equal(after.story.flags[`carried:${id}`], c.id.slice('carry-'.length));
  }
});

test('Orme hears how Sedge\'s mother was left or carried', () => {
  const back = ready('b4-orme', { b4_hero_went_back: true });
  const view = E.buildView(act(back, { type: 'story-choice', choiceId: 'carry-went-back' }).state);
  assert.match(JSON.stringify(view.scene.lastOutcome), /Sedge comes in with his mother on his arm/);
});
