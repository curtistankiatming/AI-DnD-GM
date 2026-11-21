'use strict';
// Without BRIARWATCH_PREVIEW_BOOKS (the default for players), Book Three's
// written chapters stay off the board until its first part is released with
// `out` in src/book.js. This file must not set the preview.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;

function ready(id) {
  const q = QUESTS[id];
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  s.player.gold = 1000; s.player.progression.mastery = true; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold']; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  W.init(s);
  return s;
}

test('without the preview, Book Three is written but not on the board', () => {
  assert.ok(!/^(1|true|yes|on)$/i.test(String(process.env.BRIARWATCH_PREVIEW_BOOKS || '')), 'This file runs as a player would.');
  assert.ok(['b3-letter', 'b3-rite', 'b3-pass', 'b3-saltwick', 'b3-vell', 'b3-witness'].every((id) => QUESTS[id]), 'The chapters exist.');
  assert.equal(Book.SHELF.find((b) => b.n === 3).out, 0);
  assert.deepEqual(Book.BOOKS.map((b) => b.n), [1, 2]);
  assert.ok(!Book.CHAPTERS.some((q) => q.book === 3));
  assert.equal(Book.CHAPTERS.at(-1).id, 'oath');
  assert.equal(Book.LAST_LEVEL, 19);
});

test('a hero who has finished Book Two cannot take a Book Three chapter or its side jobs', () => {
  const s = ready('b3-letter');
  s.world.townId = 'briarwatch'; s.story.nodeId = 'town-briarwatch';
  assert.equal(Book.playable(s, 'b3-letter'), false);
  assert.equal(Book.chapter(s), null, 'The written story is over for this save.');
  const view = E.buildView(s).world;
  assert.ok(!view.quests.some((q) => String(q.id).startsWith('b3-')));
  assert.ok(!view.sideJobs.some((j) => ['apprentice', 'library', 'beds', 'oil', 'census', 'brothers'].includes(j.id)), 'Book Three\'s side jobs stay hidden with it.');
  assert.equal(E.resolveAction(s, { type: 'depart', questId: 'b3-letter' }, high).result.ok, false);
  assert.equal(E.resolveAction(s, { type: 'side-job', jobId: 'apprentice' }, high).result.ok, false);
});

test('Saltwick and Vell are neither shown nor reachable while Book Three is hidden, even on a save that has them', () => {
  const { TOWNS } = require('../src/expansion');
  assert.ok(TOWNS.saltwick && TOWNS.vell, 'The towns are written.');
  const s = ready('b3-letter');
  s.world.unlockedTowns.push('saltwick', 'vell');
  s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  const towns = E.buildView(s).world.towns.map((t) => t.id);
  assert.ok(towns.includes('highpass') && towns.includes('cinderfold'));
  assert.ok(!towns.includes('saltwick') && !towns.includes('vell'));
  for (const id of ['saltwick', 'vell']) {
    assert.equal(W.townOpen(s, id), false, id);
    assert.equal(E.resolveAction(s, { type: 'travel-town', townId: id }, high).result.ok, false, `${id} cannot be travelled to`);
  }
  assert.equal(W.townOpen(s, 'merrowgate'), true, 'Book Two\'s towns stay open.');
});
