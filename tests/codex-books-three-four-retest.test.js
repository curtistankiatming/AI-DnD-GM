'use strict';
// Codex playtest, 25 November 2026 (docs/reviews/codex-books-three-four-retest-2026-11-25.md):
// asking Nessa gives The Reckoner's Sum one entrance, a lost trial no longer
// tells the bell's defeat in the terminal, and whoever holds the Parting Bell
// hands over its rope.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Director = require('../src/director');
const { STORY_NODES } = require('../src/content');
const { QUESTS, liveLines, dialogueText } = require('../src/expansion');
void FX;

const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell', 'lantry', 'orme'];
function ready(id, job = {}) {
  const q = QUESTS[id];
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true }, job); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...ALL_TOWNS];
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b4_partone_done: true }); W.init(s);
  s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass'; s = E.resolveAction(s, { type: 'recruit' }, () => .999999).state;
  s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  return s;
}
const fresh = (flags = {}) => { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); Object.assign(s.story.flags, flags); return s; };
const entrances = (s) => STORY_NODES['q-b4-reckoning-start'].choices.filter((c) => c.id.startsWith('carry-') && E.requirementStatus(s, c.requires).met).map((c) => c.id);

test('asking Nessa at Thrum gives The Reckoner\'s Sum only the joint entrance', () => {
  assert.deepEqual(entrances(fresh({ b4_rue_asked_nessa: true, b4_rue_gave: true })), ['carry-rue-nessa']);
  assert.deepEqual(entrances(fresh({ b4_rue_asked_nessa: true, b4_rue_kept: true })), ['carry-rue-nessa']);
  assert.deepEqual(entrances(fresh({ b4_rue_gave: true })), ['carry-rue-gave']);
  assert.deepEqual(entrances(fresh({ b4_rue_kept: true })), ['carry-rue-kept']);
});

test('a lost job trial is told as the trial, not the bell, in what the terminal prints', () => {
  const s = ready('b3-firstbell', { thirdJob: false }); s.player.level = 40;
  const r = Director.commissionTrial(s, null, []); assert.equal(r.ok, true, r.error);
  const trial = Object.values(s.director.quests).find((q) => q.trial === 'third');
  s.world.activeQuest = trial.id; s.world.onExpedition = true;
  E.enterNode(s, 'defeat', []);
  assert.doesNotMatch(s.story.lastOutcome.text, /Sable|bell continues/);
  assert.match(s.story.lastOutcome.text, /judges call a halt/);
});

test('the bell\'s own defeat still tells the bell', () => {
  const s = fresh(); s.world.activeQuest = 'bell';
  E.enterNode(s, 'defeat', []);
  assert.match(s.story.lastOutcome.text, /Sable's command/);
});

test('whoever held the Parting Bell hands its rope over', () => {
  const note = STORY_NODES['q-b4-parting-after'].choices.find((c) => c.id === 'note').result.dialogue;
  const told = (flags) => dialogueText(liveLines(fresh(flags), note));
  assert.match(told({ b4_holder_you: true, b4_nessa_signal: true }), /You give Rue the rope/);
  assert.match(told({ b4_holder_council: true, b4_nessa_signal: true }), /Brannagh .* puts the rope in Rue's hands/);
  assert.match(told({ b4_holder_sloe: true, b4_nessa_signal: true }), /Sloe looks at her a long time and gives it to her/);
  assert.match(told({ b4_holder_you: true }), /You give it to her/);
  assert.match(told({ b4_holder_council: true }), /Brannagh gives it to her/);
  assert.match(told({ b4_holder_sloe: true }), /Sloe takes the Parting Bell's rope herself/);
});
