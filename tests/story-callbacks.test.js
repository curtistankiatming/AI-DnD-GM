'use strict';
// Story review follow-up (21 November 2026): small payoffs that need the story
// to remember a moment, not only a decision. Wren's map remembers who was
// given it at the signal tower (decision "flagsIf"), and later chapters
// mention Book One choices, Corvane, Aster Vey's home and Pell Haverick.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;

function hero(level) { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a) { const r = E.resolveAction(s, a, high); assert.equal(r.result.ok, true, r.result.error); return r; }
function ready(id, { nessa = true, flags = {} } = {}) {
  const q = QUESTS[id];
  let s = hero(q.level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', ...(['briarwatch', 'ashford', 'highpass'].includes(q.town) ? [] : [q.town])]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, flags); W.init(s);
  if (nessa) s = act(s, { type: 'recruit' }).state;
  return s;
}
const told = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');
const opening = (s) => { const sc = E.buildView(s).scene; return [sc.opening || '', ...(sc.lines || []).map((l) => l.narration || `${l.speaker}: ${l.text}`)].join('\n'); };

test('Wren\'s map remembers whether Nessa or the hero was given it', () => {
  for (const [nessa, flag, other] of [[true, 'wren_map_nessa', 'wren_map_hero'], [false, 'wren_map_hero', 'wren_map_nessa']]) {
    let s = ready('signal', { nessa });
    s.story.nodeId = 'q-signal-after';
    s = act(s, { type: 'story-choice', choiceId: 'refugees' }).state;
    assert.equal(s.story.flags[flag], true, flag);
    assert.equal(Boolean(s.story.flags[other]), false, other);
    assert.equal(s.story.flags.signal_refugees, true);
  }
});

test('at Cinder Fold, Nessa brings Wren\'s map back better', () => {
  let s = ready('cinderfold', { flags: { wren_map_nessa: true } });
  s = act(s, { type: 'depart', questId: 'cinderfold' }).state;
  const r = act(s, { type: 'story-choice', choiceId: 'talk-wren' });
  assert.match(told(r.state), /You've moved the north gully/);
  assert.doesNotMatch(told(r.state), /you get out the pass map/);
});

test('Aster Vey says where she lives, and the Mother Bell silences that bell', () => {
  let s = ready('cinderfold', { flags: { spiritFreed: true } });
  s = act(s, { type: 'depart', questId: 'cinderfold' }).state;
  assert.match(opening(s), /My bell is still Briarwatch's, in the tower/);
  const crisis = QUESTS.motherbell.crisis.map((l) => l.narrate || l.text).join('\n');
  assert.match(crisis, /Aster Vey's own bell, goes silent, and the little bell in your pack that she travels in goes cold/);
});

test('Pell Haverick faces the council\'s list before the Second Oath', () => {
  let s = ready('oath', { flags: { harbour_exposed: true, keeper_kept_receipts: true, vote_elske_won: true } });
  s = act(s, { type: 'depart', questId: 'oath' }).state;
  const r = act(s, { type: 'story-choice', choiceId: 'talk-haverick' });
  const text = told(r.state);
  assert.match(text, /Somebody was always going to sell it/);
  assert.match(text, /You named me to the whole auction hall/);
  assert.match(text, /Those receipts of the lamp-man's/);
  assert.doesNotMatch(text, /replaced every lamp in the Sallows out of her own salary/);
  assert.match(text, /Pell Haverick has nothing to say/);
});

test('Book Two uses gold, not crowns', () => {
  const all = JSON.stringify(require('../src/data/quests.json')) + JSON.stringify(require('../src/data/side-jobs.json'));
  assert.doesNotMatch(all, /\bcrowns?\b/);
});

test('Corvane is accounted for between the books, and the vote is at the first snow', () => {
  const after = QUESTS.aftermath.after.map((l) => l.narrate).join('\n');
  assert.match(after, /Corvane has gone home to Vell/);
  assert.match(QUESTS.cinderfold.after.map((l) => l.narrate || l.text).join(' '), /at the first snow/);
  assert.doesNotMatch(JSON.stringify(QUESTS.vote), /midwinter/);
});
