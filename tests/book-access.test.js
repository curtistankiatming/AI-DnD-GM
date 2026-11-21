'use strict';
// Paid books (docs/AI-STORYTELLER.md, "Paid books"): the open-source game plays
// every book; the hosted game, on its owner's AI key, opens Book Three and
// later to paid accounts only. The server grants access per session; a save
// can never grant itself access. Book Three has no chapters yet, so these
// tests stand a free account at Book One (grant 1) to lock Book Two.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { QUESTS } = require('../src/expansion');
const { STORY_NODES } = require('../src/content');
const high = () => .999999;

function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, r.result.error); return r; }
// A hero in a chapter's town with every earlier chapter done.
function ready(id) {
  const q = QUESTS[id];
  const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', ...(['briarwatch', 'highpass'].includes(q.town) ? [] : [q.town])];
  s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  W.init(s);
  return s;
}
const finishChapter = (s, id) => { s.story.nodeId = `q-${id}-after`; s.world.activeQuest = id; s.world.onExpedition = true; return act(s, { type: 'story-choice', choiceId: QUESTS[id].decisions[0].id }); };
function home(r) {
  const events = [...r.events]; let s = r.state;
  for (let i = 0; i < 8 && !E.buildView(s).world.town; i++) { const x = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }); events.push(...x.events); s = x.state; }
  return { state: s, events };
}

test('Book Three is on the shelf as a paid book, hidden until its chapters are written', () => {
  const three = Book.SHELF.find((b) => b.n === 3);
  assert.equal(three.title, 'The Names in the Bronze');
  assert.equal(three.paid, true);
  assert.equal(three.last, null);
  assert.deepEqual(Book.BOOKS.map((b) => b.n), [1, 2]);
  assert.equal(Book.CHAPTERS.at(-1).id, 'oath');
  assert.equal(Book.LAST_LEVEL, 19);
  assert.equal(Book.FREE_BOOKS, 2, 'A free hosted account reads Books One and Two.');
});

test('the open-source game opens every book; a save cannot grant itself access', () => {
  const s = ready('chairs');
  assert.equal(Book.allows(s, 99), true, 'No grant: every book is open.');
  Book.grant(s, 1);
  assert.equal(Book.allows(s, 2), false);
  // Access survives the engine's own copy of the state, but never a save file.
  const next = E.normalizeIncomingState(s);
  assert.equal(Book.allows(next, 2), false);
  const saved = E.normalizeIncomingState(JSON.parse(JSON.stringify(next)));
  assert.equal(Book.allows(saved, 2), true);
  const forged = JSON.parse(JSON.stringify(next)); forged.access = 1; forged['books:access'] = 1;
  assert.equal(Book.allows(E.normalizeIncomingState(forged), 3), true, 'Only the server sets access.');
  Book.grant(next, Infinity);
  assert.equal(Book.allows(next, 2), true);
});

test('a free account finishing its last open book is told the story goes on for paid accounts', () => {
  const s = Book.grant(ready('aftermath'), 1);
  const { state, events } = home(finishChapter(s, 'aftermath'));
  assert.ok(events.some((e) => /The story goes on in Book 2, The Council of Small Voices, for paid accounts/.test(e.text)), events.map((e) => e.text).join('\n'));
  assert.equal(state.story.flags[Book.FINISHED], true);
  assert.equal(Book.chapter(state), null);
  assert.equal(E.buildView(state).world.booksComplete, true);
  assert.deepEqual(E.buildView(state).world.paidBook, { n: 2, title: 'The Council of Small Voices' });
  // Book Two's first chapter is not on the board, and cannot be taken.
  const r = E.resolveAction(state, { type: 'depart', questId: 'chairs' }, high);
  assert.equal(r.result.ok, false);
  assert.equal(Book.playable(state, 'chairs'), false);
  // The open-source game (no grant) is told only that the books it has are done.
  const open = home(finishChapter(ready('aftermath'), 'aftermath'));
  assert.ok(open.events.some((e) => /Book 1, The Bell Beneath Briarwatch, is complete\. Book 2, The Council of Small Voices, begins/.test(e.text)));
  assert.ok(!open.events.some((e) => /paid accounts/.test(e.text)));
});

test('upgrading carries the waiting save straight into the next book', () => {
  const free = home(finishChapter(Book.grant(ready('aftermath'), 1), 'aftermath')).state;
  const paid = E.normalizeIncomingState(Book.grant(free, Infinity));
  assert.equal(paid.story.flags[Book.FINISHED], undefined);
  assert.equal(Book.chapter(paid).id, 'chairs');
  assert.equal(Book.playable(paid, 'chairs'), true);
  // But not once the save has become an AI story of its own.
  const own = JSON.parse(JSON.stringify(free)); own.chronicle = { ...(own.chronicle || {}), arc: { title: 'My own road' } };
  assert.equal(Book.aiStory(own), true);
  assert.equal(Book.chapter(own), null);
});

test('a save part-way through a book it can no longer open waits, untouched', () => {
  const s = Book.grant(ready('fenmere'), 1);
  assert.equal(Book.locked(s), true);
  const c = Book.chapter(s);
  assert.equal(c.id, 'locked'); assert.equal(c.locked, true);
  assert.match(c.brief, /Book 2, The Council of Small Voices, which needs a paid account here/);
  const next = E.normalizeIncomingState(s);
  assert.equal(next.story.flags[Book.FINISHED], undefined, 'Never handed to the AI storyteller in its place.');
  assert.equal(E.resolveAction(next, { type: 'depart', questId: 'fenmere' }, high).result.ok, false);
  assert.equal(E.buildView(next).world.booksComplete, false);
  assert.equal(E.buildView(next).world.book.locked, true);
  assert.equal(E.buildView(next).world.paidBook, null);
  assert.match(Book.facts(next).chapterGoal, /closed to this account/, 'The AI game master leaves the closed book alone.');
  // An expedition already under way counts as begun.
  const away = Book.grant(ready('chairs'), 1); away.world.activeQuest = 'chairs';
  assert.equal(Book.locked(away), true);
  // When access returns, the save carries on where it was.
  const back = E.normalizeIncomingState(Book.grant(next, Infinity));
  assert.equal(Book.chapter(back).id, 'fenmere');
  assert.equal(act(back, { type: 'depart', questId: 'fenmere' }).result.ok, true);
});

test('written lines can depend on which books this session may read', () => {
  const end = STORY_NODES['scene-oath-epilogue-end'] || Object.values(STORY_NODES).find((n) => (n.dialogue || []).some((l) => /end of the written story/.test(l.narration || '')));
  assert.ok(end, 'The Book Two epilogue ends on a line about what comes next.');
  const lines = end.dialogue.filter((l) => l.when && ('access' in l.when || 'notAccess' in l.when));
  assert.equal(lines.length, 2);
  const { liveLines } = require('../src/expansion');
  const lines3 = [{ narrate: 'a', when: { notAccess: 3 } }, { narrate: 'b', when: { access: 2 } }];
  const s = ready('oath');
  assert.deepEqual(liveLines(s, lines3).map((l) => l.narrate), ['a', 'b'], 'Book Three is not out yet; Book Two is open.');
  assert.deepEqual(liveLines(Book.grant(s, 1), lines3).map((l) => l.narrate), ['a']);
});

test('a book can come out in parts: only released parts play, and the hero waits between them', () => {
  const ch = [{ id: 'a', book: 3, part: 1 }, { id: 'b', book: 3, part: 1 }, { id: 'c', book: 3, part: 2 }];
  const def = (out) => Book.buildShelf([{ n: 3, title: 'T', parts: 2, out }], ch)[0];
  assert.deepEqual([def(0).last, def(0).writing], [null, false], 'Nothing out: hidden.');
  assert.deepEqual([def(1).last, def(1).writing], ['b', true], 'Part One out: to be continued after it.');
  assert.deepEqual([def(2).last, def(2).writing], ['c', false], 'Both out: the whole book.');
  const preview = Book.buildShelf([{ n: 3, title: 'T', parts: 2, out: 0 }], ch, true)[0];
  assert.deepEqual([preview.last, preview.writing], ['c', false], 'Tests and playtests see every written part.');
  const half = Book.buildShelf([{ n: 3, title: 'T', parts: 2, out: 0 }], ch.slice(0, 2), true)[0];
  assert.deepEqual([half.last, half.writing], ['b', true], 'Preview still waits while the last part has no chapters.');
  const three = Book.SHELF.find((b) => b.n === 3);
  assert.equal(three.parts, 2);
  assert.equal(three.out, 0, 'Book Three stays hidden until Part One is finished.');
});

// Guards each Book Three chapter as it lands (none are written yet).
test('each Book Three chapter pays exactly one level, so chapter N ends at level 20 + N', () => {
  const P = require('../src/progression');
  for (const q of Object.values(QUESTS).filter((x) => x.book === 3 && !x.sideJob)) {
    assert.equal(q.xp, P.levelBand(q.level), `${q.id}: 105% would compound past level 40`);
  }
});
