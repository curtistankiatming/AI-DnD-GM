'use strict';
// Systems review of Book Four (docs/reviews/claude-systems-book-four-2026-11-22.md):
// a lapsed hosted save is told the book it is really held in, and the safety
// valve on Book Four's ledges says where the party goes. Every part is
// previewed; node --test runs each file in its own process.
require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
// A hero at chapter `id` of Book Four with every chapter before it done.
function at(id, { phase } = {}) {
  const q = QUESTS[id], s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true });
  s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  const reached = new Set(FREE_TOWNS);
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; if (other.nextTown) reached.add(other.nextTown); }
  s.world.unlockedTowns = [...reached]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b4_partone_done: true, b4_parttwo_done: true }); W.init(s);
  if (phase) { s.story.nodeId = `q-${id}-${phase}`; s.world.activeQuest = id; s.world.onExpedition = true; }
  return s;
}
const allDone = () => { const s = at('b4-parting'); s.world.completed['b4-parting'] = { xp: 0, gold: 0 }; s.story.flags.b4_done = true; return s; };

test('a lapsed hosted save part-way through Book Four is held in Book Four, not told it is in Book Three', () => {
  const s = Book.grant(at('b4-thrum'), Book.FREE_BOOKS);
  assert.equal(Book.locked(s), true);
  const c = Book.chapter(s);
  assert.equal(c.n, 4);
  assert.match(c.brief, /part-way through Book Four, The Long Tally, which needs a paid account/);
  assert.equal(c.level, QUESTS['b4-thrum'].level);
  assert.equal(E.buildView(E.normalizeIncomingState(s)).world.book.n, 4);
  // Paid again, it carries on with the same chapter.
  assert.equal(Book.chapter(Book.grant(s, Infinity)).id, 'b4-thrum');
});

test('a lapsed save past every book is told it has gone on past them, and still waits', () => {
  const s = allDone();
  assert.equal(Book.finished(s), true);
  Book.grant(s, Book.FREE_BOOKS);
  const c = Book.chapter(s);
  assert.equal(c.locked, true); assert.equal(c.n, 4);
  assert.match(c.brief, /has gone on past Book Four, The Long Tally, and from Book Three on the story needs a paid account/);
  assert.doesNotMatch(c.brief, /part-way/);
  assert.equal(Book.chapter(Book.grant(s, Infinity)), null, 'paid again, it is back on its own story');
});

test('Book Four\'s ledges say where the party goes: up to the north door, back to the lid or the bell, and out into the town', () => {
  const ledge = (id) => E.buildView(Object.assign(at(id), { story: { ...at(id).story, nodeId: `q-${id}-ledge` } })).scene;
  for (const [id, down, climb] of [['b4-column', /go on up to the north door/, /Orme/], ['b4-ropes', /back to the lid/, /Cinder Fold/], ['b4-lid', /back to the bell/, /Cinder Fold/]]) {
    assert.ok(QUESTS[id].climbLabel && QUESTS[id].climbText && QUESTS[id].ledgeLabel, id);
    assert.doesNotMatch(QUESTS[id].ledgeLabel, /go back down/, id);
    assert.match(QUESTS[id].ledgeLabel, down); assert.match(QUESTS[id].climbLabel, climb);
  }
  assert.ok(ledge('b4-lid').objective.startsWith('Rest, then go back to the bell'));
});

test('after three defeats at the Parting Bell the casting floor offers the way out into Cinder Fold, and the fight resumes from there', () => {
  let s = act(at('b4-parting', { phase: 'crisis' }), { type: 'story-choice', choiceId: 'confront' }).state;
  for (let i = 0; i < 3; i++) {
    s = act(s, { type: 'combat', actionId: 'retreat' }).state;
    assert.equal(s.story.nodeId, 'q-b4-lid-ledge');
    if (i < 2) s = act(s, { type: 'story-choice', choiceId: 'down' }).state;
  }
  const climb = E.buildView(s).scene.choices.find((x) => x.id === 'climb');
  assert.ok(climb && !climb.locked);
  assert.equal(climb.label, 'Go back out into Cinder Fold');
  const r = act(s, { type: 'story-choice', choiceId: 'climb' });
  s = r.state;
  assert.equal(s.story.nodeId, 'town-cinderfold');
  assert.ok(r.events.some((e) => /The Parting Bell waits where you left it/.test(e.text)));
  assert.equal(s.world.activeQuest, 'b4-parting');
  s = act(s, { type: 'depart', questId: 'b4-parting' }).state;
  assert.equal(s.combat?.encounterId, 'quest:b4-parting');
});
