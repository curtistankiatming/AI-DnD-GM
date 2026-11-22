'use strict';
// Book Four held at Part One (BRIARWATCH_PREVIEW_PARTS=4:1), as players will
// first have it, with fixture chapters standing in for the unwritten ones
// (tests/fixtures/book-four.js). node --test runs each file in its own
// process, so these settings reach no other file.
require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: '4:1' });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { QUESTS } = require('../src/expansion');

const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
function ready(level, upTo) {
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'guardian' });
  s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const q of Object.values(QUESTS)) { if (q.sideJob) continue; s.world.completed[q.id] = { xp: 0, gold: 0 }; if (q.id === upTo) break; }
  s.world.unlockedTowns = [...ALL_TOWNS]; s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true }); W.init(s);
  const r = E.resolveAction(s, { type: 'recruit' }, () => 0.9); assert.equal(r.result.ok, true, r.result.error);
  return r.state;
}

test('with Part One out, Book Four plays to chapter 10 and waits at "to be continued" at level 50, naming Part Two', () => {
  const four = Book.SHELF.find((b) => b.n === 4);
  assert.equal(four.open, 1); assert.equal(four.writing, true); assert.equal(four.last, 'b4-peaks');
  assert.ok(!Book.CHAPTERS.some((q) => q.book === 4 && q.part > 1));
  const s = ready(50, 'b4-peaks'); s.player.progression.thirdJob = true;
  const c = Book.chapter(s);
  assert.equal(c.id, 'to-be-continued'); assert.equal(c.level, 50); assert.equal(Book.finished(s), false);
  assert.equal(Book.playable(s, 'b4-lantry'), false);
  assert.equal(Book.bookEnd('b4-peaks', s), 'To be continued. You have finished The North Road, Part One of Book Four, The Long Tally. Part Two, The Wold, is being written; its chapters will appear on the expedition board when it comes out. Until then, bounties and side jobs stay open, and your hero, party and choices stay saved.');
});

test('the scripted player takes the 3rd job trial, plays Part One, and waits at the end of it', () => {
  const { run } = require('./campaign-playtest');
  const r = run('fighter', 'standard', 301, 'prepared', false, ready(40, 'b3-firstbell'));
  assert.deepEqual(r.errors, []);
  assert.equal(r.waiting, true); assert.equal(r.thirdJob, true); assert.equal(r.trials, 1);
  assert.ok(r.completed['b4-peaks'] && !r.completed['b4-lantry']);
  assert.equal(r.level, 50);
});
