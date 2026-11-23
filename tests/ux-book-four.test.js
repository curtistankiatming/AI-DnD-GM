'use strict';
// UX review of Book Four, levels 40 to 70 (docs/reviews/claude-ux-book-four-2026-11-22.md):
// the end of Book Three says the 3rd job trial comes before Book Four's first
// chapter, straight-on chapters say how far they run and where they come out,
// the Wold's chapters warn about the white before setting out, and job trial
// text says "an" before a vowel.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book'), Director = require('../src/director');
const { QUESTS } = require('../src/expansion');
const { STORY_NODES } = require('../src/content');
const high = () => .999999;
const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell', 'lantry', 'orme'];
void FX;

function act(s, a) { const r = E.resolveAction(s, a, high); assert.equal(r.result.ok, true, `${JSON.stringify(a)}: ${r.result.error}`); return r; }
// A hero in town, ready for chapter `id`: every chapter before it done.
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
const card = (s, id) => E.buildView(s).world.quests.find((q) => q.id === id);

test('the end of Book Three says the 3rd job trial comes before Book Four\'s first chapter', () => {
  const s = ready('b3-firstbell', { thirdJob: false });
  const text = Book.bookEnd('b3-firstbell', s);
  assert.match(text, /^Book Three, The Names in the Bronze, is complete\. Book Four, The Long Tally, begins\. Its first chapter, The Walker on the North Road, is on the expedition board in Highpass Watch\. First comes your 3rd job trial/);
  s.player.progression.thirdJob = true;
  assert.doesNotMatch(Book.bookEnd('b3-firstbell', s), /job trial/, 'A hero who already has the 3rd job is not told to take it.');
});

test('a straight-on chapter says how many chapters run on and where they come out', () => {
  assert.equal(card(ready('b4-column'), 'b4-column').straightOnNote,
    'Straight on: this chapter and the next run on with no town, shop or side job until Highpass Watch. The party rests between chapters, but buy potions and gear before you set out.');
  assert.match(card(ready('b4-ropes'), 'b4-ropes').straightOnNote, /this chapter and the next 2 run on with no town, shop or side job until the end of the book\./);
  assert.equal(card(ready('b4-ropes'), 'b4-ropes').straightOn, true);
});

test('the ledge on the peaks road goes on up, and back down to Orme', () => {
  const ledge = STORY_NODES['q-b4-column-ledge'];
  assert.equal(ledge.objective, 'Rest, then go on up.');
  assert.deepEqual(ledge.choices.map((c) => c.label), ['Rest, then go on up', 'Go back down to Orme']);
  assert.equal(STORY_NODES['q-b3-company-ledge'].objective, 'Rest, then go back down.', 'The stair keeps its own words.');
});

test('a chapter in the white warns before setting out, and names who has no warm gear', () => {
  const s = ready('b4-sheddon');
  const note = card(s, 'b4-sheddon').white;
  assert.match(note, /^The white: in this chapter's deciding fight, anyone without warm gear is Slowed for the first round \(2 less armour\)\. Not wrapped up: you, /);
  assert.match(note, /Warm Wold-made wool is sold in Lantry and Orme\.$/);
  assert.equal(card(ready('b4-knot'), 'b4-knot').white, undefined, 'Part Three is out of the Wold.');
});

test('job trial text says "an" before a vowel', () => {
  const s = ready('b4-walker', { thirdJob: true }); s.player.level = 70; s.player.progression.specialization = 'guardian';
  const quest = Director.writtenTrial ? Director.writtenTrial(s, 'fourth') : null;
  if (quest) { assert.match(quest.threat, /fights the way an Aegis Paragon must/); assert.match(quest.opening, /A legend waits at the gate\./); }
  const t = ready('b3-firstbell', { thirdJob: false }); t.player.level = 40;
  const events = [], r = Director.commissionTrial(t, null, events);
  assert.equal(r.ok, true, r.error);
  assert.doesNotMatch(events[0].text, /\ba [aeiou]/i);
  assert.equal((events[0].text.match(/Bulwark Knight\./g) || []).length, 1, 'The trial says what it makes you once.');
});
