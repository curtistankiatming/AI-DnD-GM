'use strict';
// Book Four character review (docs/reviews/claude-characters-book-four-2026-11-22.md):
// earlier camp choices come back in Book Four, Biscuit waits at Highpass, and the
// AI game master hears how each companion's Book Four arc went.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const X = require('../src/expansion');
const B4Q = require('../src/data/book-four/quests.json');
const B4S = require('../src/data/book-four/scenes.json');
const B4J = require('../src/data/book-four/side-jobs.json');

function withParty(flags = {}, drop = []) {
  const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  for (const id of ['orin', 'maren', 'nessa']) if (!s.party.some((m) => m.id === id)) E.extensionApi?.().recruitCompanion(s, id);
  s.party = s.party.filter((m) => !drop.includes(m.id));
  Object.assign(s.story.flags, flags);
  return s;
}
const live = (raw, flags, drop) => X.dialogueText(X.liveLines(withParty(flags, drop), raw.map(X.storyLine)));
const standing = (flags, who) => X.standing(withParty(flags), who).join(' ');

test('Book Two and Three camp choices are remembered in Book Four', () => {
  const cards = B4S['hospice-camp'].nodes.room.lines;
  assert.match(live(cards, { 'b2:cards': 'called' }), /friend with no manners/);
  assert.doesNotMatch(live(cards, { 'b2:cards': 'called' }, ['maren']), /friend with no manners/);
  assert.match(live(cards, { 'b2:cards': 'lost' }, ['maren']), /slides a button across the table/);
  assert.doesNotMatch(live(cards, {}), /button|no manners/);

  const bett = B4J['bett-berth'].nodes.quay.lines;
  assert.match(live(bett, { b3_bett: 'stay' }), /whaling one/);
  assert.match(live(bett, { b3_bett: 'take' }), /mackerel for you in a cloth/);
  assert.doesNotMatch(live(bett, { b3_bett: 'pay' }), /whaling|mackerel/);

  const brede = B4Q['b4-ford'].talks.find((t) => /Hollis Brede/.test(t.label)).lines;
  assert.match(live(brede, { b3_brede_written: true, b3_ashford_defended: true }), /You spelled us right/);
  assert.doesNotMatch(live(brede, { b3_ashford_defended: true }), /spelled/);

  const greve = B4Q['b4-greve'].talks.find((t) => t.id === 'maren').lines;
  assert.match(live(greve, { b3_maren_one_name: true }), /Ysolde Carr, Sixth District/);
  assert.doesNotMatch(live(greve, {}), /Ysolde/);

  const pim = B4Q['b4-quietnight'].opening;
  assert.match(live(pim, { b3_pim_rang: true }), /Pim rings it a full breath late/);
  assert.doesNotMatch(live(pim, {}), /full breath late/);
});

test('Biscuit stops at Highpass when the party goes north, as Parts Two and Three tell it', () => {
  const camp = B4S['key-camp'].nodes.door.lines;
  for (const key of ['b4_key_hew', 'b4_key_carried', 'b4_key_left']) {
    const text = live(camp, { [key]: true });
    assert.match(text, /He'll stop at Highpass, by the guardroom brazier/, key);
    assert.doesNotMatch(text, /he stays here|every night\. He'll want to/, key);
  }
});

test('the AI game master hears how each companion\'s Book Four arc went', () => {
  // Nessa: the key's Book Three facts give way to what she did with it at Cinder Fold.
  const before = standing({ nessa_keeper: 'later', b3_wren_cast: true }, 'nessa');
  assert.match(before, /Nessa is keeper of Cinder Fold's forge-signal/);
  const hew = standing({ nessa_keeper: 'later', b3_wren_cast: true, b4_key_hew: true }, 'nessa');
  assert.match(hew, /gave the forge-signal key to Hew/); assert.doesNotMatch(hew, /Nessa is keeper/);
  assert.match(standing({ nessa_keeper: 'declined', b4_key_carried: true }, 'nessa'), /took the forge-signal key north/);
  assert.doesNotMatch(standing({ nessa_keeper: 'declined', b4_key_carried: true }, 'nessa'), /turned down/);
  assert.doesNotMatch(standing({ second_oath: 'town', b4_key_left: true }, 'nessa'), /never answered/);
  assert.match(standing({ b4_nessa_with_rue: true }, 'nessa'), /stood beside her among the ringers/);
  // Orin: Sheddon's order and Sorrel's commission.
  assert.match(standing({ b4_orin_ordered: true, b4_orin_captain: true }, 'orin'), /ordered the column on[^]*took Captain Sorrel's commission/);
  assert.match(standing({ b4_orin_davin: true }, 'orin'), /Davin of Saltwick his sergeant/);
  assert.match(standing({ b4_orin_soldier: true }, 'orin'), /still the one who carries things/);
  // Maren: Merrowgate.
  assert.match(standing({ b4_maren_vouched: true }, 'maren'), /vouched for Sloe/);
  assert.match(standing({ b4_maren_doubts: true }, 'maren'), /would not vouch/);
  // Each chapter decision gives exactly one fact.
  for (const [who, flags] of [['nessa', ['b4_key_left', 'b4_key_carried', 'b4_key_hew']], ['nessa', ['b4_nessa_with_rue', 'b4_nessa_stops_rue', 'b4_nessa_signal']], ['orin', ['b4_orin_captain', 'b4_orin_soldier', 'b4_orin_davin']], ['maren', ['b4_maren_vouched', 'b4_maren_doubts', 'b4_maren_silent']]]) {
    for (const f of flags) assert.equal(X.standing(withParty({ [f]: true }), who).length, 1, f);
  }
});

test('no new Book Four name reuses an earlier book\'s person', () => {
  // Ada Rusk is Book One's echo-stone crew; the carter's wife in chapter 6 is Lettice.
  assert.doesNotMatch(JSON.stringify(B4Q), /\bAda\b/);
  assert.match(JSON.stringify(B4Q['b4-book']), /my Lettice went into it/);
});
