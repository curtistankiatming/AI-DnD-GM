'use strict';
// Book Four stays hidden (`out: 0` in src/book.js) until Curtis releases a
// part. This file plays with Book Three open and Book Four held at no parts
// (BRIARWATCH_PREVIEW_PARTS=4:0), as players will have it once Book Three is
// out, with Book Four's fixture chapters written (tests/fixtures/book-four.js),
// so it runs the same whether or not the suite has the preview on. node --test
// runs each file in its own process, so these settings reach no other file.
require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: '4:0' });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const Bounty = require('../src/bounty');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;

const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
// A hero in Briarwatch with Book Three done, at a level.
function afterBookThree(level, { third = false } = {}) {
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: third });
  s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const q of Object.values(QUESTS)) if (!q.sideJob && (Number(q.book) || 1) <= 3) s.world.completed[q.id] = { xp: 0, gold: 0 };
  s.world.unlockedTowns = [...ALL_TOWNS]; s.world.townId = 'briarwatch'; s.story.nodeId = 'town-briarwatch';
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true }); W.init(s);
  return act(s, { type: 'recruit' }).state;
}

test('with no part out, Book Four is not on the shelf or the board, even with its chapters written', () => {
  const four = Book.SHELF.find((b) => b.n === 4);
  assert.equal(four.out, 0); assert.equal(four.open, 0); assert.equal(four.last, null);
  assert.deepEqual(Book.BOOKS.map((b) => b.n), [1, 2, 3]);
  assert.ok(QUESTS['b4-walker'], 'The fixture chapters are written.');
  assert.ok(!Book.CHAPTERS.some((q) => q.book === 4));
  assert.equal(Book.LAST_LEVEL, 39);
  const s = afterBookThree(40, { third: true });
  assert.equal(Book.playable(s, 'b4-walker'), false); assert.equal(Book.chapter(s), null);
  assert.ok(!E.buildView(s).world.quests.some((q) => String(q.id).startsWith('b4-')));
  assert.equal(E.resolveAction(s, { type: 'depart', questId: 'b4-walker' }, high).result.ok, false);
  assert.equal(Book.lockedBook(s), null, 'A hidden book is never offered as a paid one.');
});

test('a hidden Book Four never lets bounties run past 40, and its gear stays unsold', () => {
  const s = afterBookThree(40, { third: true });
  assert.equal(Book.finished(s), true);
  assert.equal(Bounty.afterBooksLevel(s), 40); assert.equal(Bounty.bountyLevel(s), 40, 'The 4th trial is at 70, but the books here end at 40.');
  assert.equal(Bounty.room(s), P.XP_NEXT[40] - 1 - s.player.xp);
  s.player.xp = P.XP_NEXT[40] - 1;
  assert.equal(Bounty.room(s), 0);
  assert.equal(Book.gearOpen(s, 40), true); assert.equal(Book.gearOpen(s, 45), false);
});

test('the ending counts the three books open here and points at the 3rd job trial', () => {
  const s = afterBookThree(40);
  const end = Book.ending(s);
  assert.match(end, /you have finished all three books, The Bell Beneath Briarwatch, The Council of Small Voices and The Names in the Bronze\./);
  assert.match(end, /Your 3rd job trial is ready/);
  assert.doesNotMatch(end, /Long Tally|Book Four/);
});

test('an old save that ended Book Three at 38 bounties to 40, takes the written trial and stops', () => {
  const start = afterBookThree(38);
  assert.equal(Book.finished(start), true);
  assert.equal(Bounty.bountyLevel(start), 40);
  const { run } = require('./campaign-playtest');
  const r = run('fighter', 'standard', 301, 'direct', false, start);
  assert.deepEqual(r.errors, []);
  assert.equal(r.level, 40); assert.equal(r.thirdJob, true); assert.equal(r.fourthJob, false); assert.equal(r.trials, 1);
  assert.equal(r.complete, true); assert.equal(r.waiting, false);
});
