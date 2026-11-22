'use strict';
// Curtis, 22 November 2026: "Players choices should matter and impact story."
// Nessa's epilogue answer (nessa_keeper "later" or "declined") and the hero's
// Second Oath are carried past the written books: into the AI game master's
// prompt, the chat context and the Journal (src/data/standing.json).
process.env.BRIARWATCH_PREVIEW_BOOKS = '1';
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), Director = require('../src/director'), Journal = require('../src/journal');
const X = require('../src/expansion');
const RAWS = require('../src/data/book-three-part-two/scenes.json');
const STANDING = require('../src/data/standing.json').entries;

function withNessa(flags = {}) {
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.extensionApi ? E.extensionApi().recruitCompanion(s, 'nessa') : null;
  Object.assign(s.story.flags, flags);
  return s;
}
const prompt = (s) => JSON.parse(Director.prompt(s));
const nessaIn = (p) => p.party.find((m) => m.name.startsWith('Nessa'));

test('the AI game master is told what Nessa chose about Wren\'s post', () => {
  assert.deepEqual(nessaIn(prompt(withNessa())).standing, [], 'Nothing before the epilogue.');
  assert.match(nessaIn(prompt(withNessa({ nessa_keeper: 'later' }))).standing.join(' '), /long yes/);
  const no = nessaIn(prompt(withNessa({ nessa_keeper: 'declined' }))).standing.join(' ');
  assert.match(no, /turned down Wren's forge-signal post/); assert.doesNotMatch(no, /long yes|keeper of Cinder Fold/);
  assert.match(nessaIn(prompt(withNessa({ nessa_keeper: 'declined', b3_wren_cast: true }))).standing.join(' '), /tenth bell/);
  assert.match(nessaIn(prompt(withNessa({ nessa_keeper: 'later', b3_wren_cast: true }))).standing.join(' '), /Nessa is keeper of Cinder Fold's forge-signal/);
  assert.match(nessaIn(prompt(withNessa({ second_oath: 'council' }))).standing.join(' '), /never answered/);
});

test('the hero\'s Second Oath reaches the AI game master', () => {
  for (const [oath, text] of [['council', /council/], ['town', /Briarwatch/], ['companions', /companions/], ['none', /no one/]]) {
    const st = prompt(withNessa({ second_oath: oath })).hero.standing;
    assert.equal(st.length, 1); assert.match(st[0], text);
  }
});

test('the Journal shows the same standing beside the companion\'s bond', () => {
  const j = Journal.sync(withNessa({ nessa_keeper: 'declined' }));
  assert.match(j.relationships.find((r) => r.id === 'companion:nessa').text, /turned down Wren's forge-signal post/);
});

test('standing facts use known conditions and real companions, and never contradict each other', () => {
  const { COMPANIONS } = require('../src/content');
  for (const e of STANDING) {
    assert.ok(e.who === 'hero' || COMPANIONS[e.who], e.who);
    assert.ok(e.text.length < 220, e.text);
  }
  for (const flags of [{ nessa_keeper: 'later' }, { nessa_keeper: 'later', b3_wren_cast: true }, { nessa_keeper: 'later', b3_wren_waits: true }, { nessa_keeper: 'later', b3_wren_refused: true }]) {
    assert.equal(X.standing(withNessa(flags), 'nessa').length, 1, JSON.stringify(flags));
  }
});

test('Book Three\'s letter night and epilogue tell a sent no its own way', () => {
  const lines = (raw, flags, party = true) => {
    const s = withNessa(flags); if (!party) s.party = s.party.filter((m) => m.id !== 'nessa');
    return X.dialogueText(X.liveLines(s, raw.map(X.storyLine)));
  };
  const letter = RAWS['wren-nessa'].nodes.letter.lines;
  assert.match(lines(letter, { nessa_keeper: 'declined' }), /Not the no, which Wren keeps pinned by the door/);
  assert.doesNotMatch(lines(letter, { nessa_keeper: 'declined' }), /Not the long yes|the one folded small that she has carried/);
  const home = RAWS.firstbell.nodes.home.lines;
  assert.match(lines(home, { nessa_keeper: 'declined', b3_wren_cast: true }), /does not go back over the pass to keep the forge-signal/);
  assert.doesNotMatch(lines(home, { nessa_keeper: 'later', b3_wren_cast: true }), /does not go back over the pass/);
});
