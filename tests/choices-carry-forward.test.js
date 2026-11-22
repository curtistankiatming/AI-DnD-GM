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

// Curtis, 22 November 2026, after the first report: "Fix those." Hollin's Reach,
// the flavour-only camp choices and Maren's and Orin's endings.
const RAWQ = require('../src/data/quests.json'), RAW2 = require('../src/data/scenes.json');
const { STORY_NODES } = require('../src/content');
const live = (raw, flags, drop = []) => { const s = withNessa(flags); s.party = s.party.filter((m) => !drop.includes(m.id)); return X.dialogueText(X.liveLines(s, raw.map(X.storyLine))); };

test('Hollin\'s Reach is remembered at the Second Oath, and telling Elske makes persuading her easier', () => {
  const opening = RAWQ.oath.opening;
  assert.match(live(opening, { hollin_told: true }), /told me the bell there had stopped/);
  assert.match(live(opening, { hollin_kept: true }), /You let it be mine/);
  assert.doesNotMatch(live(opening, {}), /Hollin's Reach and told me|You let it be mine/);
  const resolve = STORY_NODES['q-oath-crisis'].choices.find((c) => c.id === 'resolve');
  assert.equal(resolve.check.easierWith.flag, 'hollin_told');
  assert.match(live(RAWQ.oath.peaceful.success, { hollin_kept: true }), /never told her what the council house/);
});

test('what the hero did by the fire on the south road is remembered at the Mother Bell', () => {
  const after = RAWQ.motherbell.after;
  assert.match(live(after, { 'b2:orin_hal': 'said', south_hal_council: true }), /She came on time/);
  assert.match(live(after, { 'b2:orin_hal': 'left', south_hal_guild: true }), /the night you left them to it/);
  assert.doesNotMatch(live(after, { 'b2:orin_hal': 'said', south_hal_council: true, mother_recalled: true }), /She came on time/);
});

test('camp choices that used to change nothing are told again later', () => {
  const forge = RAW2['oath-epilogue'].nodes.forge.lines;
  assert.match(live(forge, { 'b2:cards': 'called' }), /friend with no manners/);
  assert.match(live(forge, { 'b2:cards': 'lost' }), /button folded into it/);
  assert.doesNotMatch(live(forge, { 'b2:cards': 'lost' }, ['maren']), /button/);
  const home = RAWS.firstbell.nodes.home.lines;
  assert.match(live(home, { b3_brede_written: true }), /You wrote that page yourself/);
  assert.match(live(home, { b3_bett: 'stay' }), /about the whaling ships/);
  assert.match(live(home, { b3_bett: 'take' }), /There is never a note/);
  assert.doesNotMatch(live(home, { b3_bett: 'pay' }), /mackerel/);
  assert.match(live(home, { b3_pim_rang: true }), /late is still ringing/);
  assert.match(live(home, { b3_vault_word: 'register' }), /same word on every page/);
  assert.match(live(home, { b3_vault_word: 'quiet' }), /a woman calling a child in/);
  const sets = (raw, id) => Object.values(raw).flatMap((sc) => Object.values(sc.nodes || {}).flatMap((n) => n.choices || [])).filter((c) => c.setFlags && id in c.setFlags).length;
  for (const [raw, id, n] of [[RAW2, 'b2:orin_hal', 2], [RAW2, 'b2:cards', 2], [RAW2, 'b3_vault_word', 3], [RAWS, 'b3_bett', 3], [RAWS, 'b3_brede_written', 1], [RAWS, 'b3_pim_rang', 1]]) assert.equal(sets(raw, id), n, id);
});

test('the AI game master hears how Maren\'s and Orin\'s stories went', () => {
  const s = (flags) => { const st = withNessa(flags); return st; };
  const party = (flags) => { const st = s(flags); X.standing(st, 'orin'); return { orin: X.standing(st, 'orin').join(' '), maren: X.standing(st, 'maren').join(' ') }; };
  assert.match(party({ 'keeper-list-done': true }).maren, /Sallows long room/);
  assert.match(party({ second_oath: 'town' }).maren, /one empty space/);
  assert.doesNotMatch(party({ 'keeper-list-done': true, b3_done: true }).maren, /Sallows long room/);
  assert.match(party({ b3_done: true }).maren, /keeps no list/);
  assert.match(party({ b3_seal_taken: true, b3_done: true }).maren, /free wards' seal/);
  assert.match(party({ b3_orin_tried: true, b3_mags_forgives: true }).orin, /Mags Peller forgave him/);
  assert.doesNotMatch(party({ b3_orin_tried: true, b3_mags_forgives: true }).orin, /given the same/);
  assert.match(party({ south_hal_council: true, second_oath: 'none' }).orin, /Hal held the iron doors/);
  const p = JSON.parse(Director.prompt(s({ b3_orin_gives: true })));
  assert.match(p.party.find((m) => m.name.startsWith('Orin')).standing.join(' '), /gave up the Saltwick night/);
  assert.match(JSON.parse(Director.prompt(s({ hollin_told: true }))).hero.standing.join(' '), /Hollin's Reach/);
});
