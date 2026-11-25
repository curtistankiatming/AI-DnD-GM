'use strict';
// Codex's Ranger (level 1 through Book Four) and Wizard (difficulty and grind)
// playtests of 25 November 2026 (docs/reviews/codex-ranger-level1-book-four-2026-11-25.md,
// docs/reviews/codex-difficulty-grind-2026-11-25.md): sealing the stair no
// longer says nobody gave when a companion did, a locked card gives the whole
// XP gap, the first cold warning says the wool is not on the road yet, and the
// terminal reader prints conditional lines instead of crashing.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world');
const { QUESTS, trialFraming } = require('../src/expansion');
const high = () => .999999;
const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell', 'lantry', 'orme'];
void FX;

function act(s, a) { const r = E.resolveAction(s, a, high); assert.equal(r.result.ok, true, `${JSON.stringify(a)}: ${r.result.error}`); return r; }
function ready(id, towns = ALL_TOWNS) {
  const q = QUESTS[id];
  let s = E.createNewGame({ name: 'Rowan', classId: 'ranger' }); E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'beastmaster', thirdJob: true }); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...ALL_TOWNS];
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b4_partone_done: true }); W.init(s);
  s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass'; s = act(s, { type: 'recruit' }).state;
  s.world.unlockedTowns = [...towns];
  s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  return s;
}
const card = (s, id) => E.buildView(s).world.quests.find((q) => q.id === id);

test('sealing the stair is "nobody else gives", and the floor is left as it lies', () => {
  const raw = JSON.stringify(require('../src/data/book-three-part-two/quests.json'));
  assert.match(raw, /"label":"Seal the stair: nobody else gives, nobody is cast/);
  assert.doesNotMatch(raw, /Seal the stair: nobody gives,/);
  const gift = JSON.stringify(require('../src/data/book-three-part-two/scenes.json').firstbell.nodes.gift);
  assert.match(gift, /Nobody else gives anything here tonight\. You leave the floor as it lies/);
  assert.doesNotMatch(gift, /You leave the floor as you found it/);
});

test('Dera\'s words on the sealed stair keep the badge or letter a companion gave', () => {
  const s = ready('b4-walker'); s.player.progression.thirdJob = false;
  const frame = (flags) => { const t = JSON.parse(JSON.stringify(s)); Object.assign(t.story.flags, { b3_stair_sealed: true }, flags); return trialFraming(t, 'third'); };
  assert.match(frame({ b3_orin_gives: true }), /^Dera: You kept yours\. Orin's badge is still down there/);
  assert.match(frame({ b3_nessa_gives: true }), /^Dera: You kept yours\. Nessa's letter is still down there/);
  const none = frame({});
  assert.match(none, /^Dera: You kept yours, and nobody's any lighter for it\./);
  for (const text of [none, frame({ b3_orin_gives: true }), frame({ b3_nessa_gives: true })]) assert.doesNotMatch(text, /Nobody gave/);
});

test('a locked card says how much XP is still needed to reach its level, not only the next level', () => {
  const s = ready('b4-sheddon'); const q = card(s, 'b4-sheddon');
  assert.equal(q.xpToGo, undefined, 'A hero at the level has no gap.');
  const t = ready('b4-sheddon'); t.player.level = q.minLevel - 2; t.player.xp = P.XP_NEXT[q.minLevel - 3] + 50;
  assert.equal(card(t, 'b4-sheddon').xpToGo, P.XP_NEXT[q.minLevel - 1] - t.player.xp);
});

test('the first cold warning says the wool is not on the road yet, until Lantry is reached', () => {
  const before = card(ready('b4-lantry', ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell']), 'b4-lantry').white;
  assert.match(before, /Warm Wold-made wool is sold in Lantry and Orme, and neither is on your road yet: you can buy it once this chapter reaches Lantry\.$/);
  assert.match(card(ready('b4-sheddon'), 'b4-sheddon').white, /Warm Wold-made wool is sold in Lantry and Orme\.$/);
});

test('the terminal reader prints every alternative of a conditional line', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'play.js'), 'read', 'q-b4-parting-start'],
    { env: { ...process.env, BRIARWATCH_PREVIEW_BOOKS: '1' }, encoding: 'utf8' });
  assert.match(out, /One of \(the first that applies\):/);
  assert.match(out, /\[only if \{"flag":"b4_potbell_kept"\}\]/);
});
