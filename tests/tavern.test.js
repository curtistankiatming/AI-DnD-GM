'use strict';
// Tavern nights (src/tavern.js, src/roster.js, src/data/tavern.json and
// tavern-roster.json; Curtis, 26 November 2026): at turns in the story a party
// with an empty place meets 2 or 3 people, picked at random from a roster of
// 100, and may hire one. Whoever is met and not hired moves on for good.
// Declining Nessa keeps its cost: no night before the Oath of the Road, a fee.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Tavern = require('../src/tavern'), Roster = require('../src/roster');
const { STORY_NODES, COMPANIONS, ITEMS } = require('../src/content');
const { standing, liveLines, storyLine } = require('../src/expansion');
const { createSeededRng } = require('../src/rules');

const BOOK_ONE = ['bell', 'road', 'marsh', 'bridge', 'archive', 'signal', 'summit', 'breach', 'beacon'];
const rng = () => 0.5;
const told = (r) => r.events.map((e) => e.text || '').join('\n');
const sceneText = (s) => E.buildView(s).scene.opening;
// A level 10 hero in Highpass who turned Nessa down, about to finish the Oath of the Road.
function atTheOath({ nessa = 'declined', gold = 500 } = {}) {
  const s = E.createNewGame({ name: 'Pell', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[9], [], 'test fixture');
  if (nessa) s.story.flags['nessa:offer'] = nessa;
  for (const id of BOOK_ONE) s.world.completed[id] = { xp: 0, gold: 0 };
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass']; s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  if (nessa === 'joined') E.extensionApi().recruitCompanion(s, 'nessa', []);
  W.init(s);
  s.player.gold = gold;
  return s;
}
// After the Oath, with tonight's offer fixed (the real one is random).
function afterTheOath(opts = {}, offer = ['dov', 'agna']) {
  const s = atTheOath(opts);
  assert.equal(W.completeQuest(s, 'trial', [], E.extensionApi()), true);
  E.enterNode(s, 'town-highpass', []);
  if (s.world.tavern) s.world.tavern.offer = offer;
  return s;
}
const goIn = (s) => { const r = E.resolveAction(s, { type: 'tavern' }, rng); assert.equal(r.result.ok, true, r.result.error); return r; };

test('the roster has 100 people, each a whole character who can fight', () => {
  assert.equal(Roster.IDS.length, 100);
  const firsts = new Set(), kinds = {};
  for (const id of Roster.IDS) {
    const r = Roster.RECRUITS[id], c = COMPANIONS[id];
    assert.ok(Roster.KINDS[r.kind], id);
    kinds[r.kind] = (kinds[r.kind] || 0) + 1;
    assert.ok(!firsts.has(Roster.first(r)), `first name used twice: ${r.name}`); firsts.add(Roster.first(r));
    for (const k of ['name', 'role', 'pronouns', 'summary', 'personality', 'line']) assert.ok(r[k], `${id} ${k}`);
    assert.ok(r.intro.length >= 2 && r.hired.length >= 1, id);
    assert.ok(r.intro.some((l) => l.say), `${id} speaks when met`);
    assert.ok(c?.hired && c.gearClass && c.aiRole, id);
    for (const item of Object.values(c.loadout).filter(Boolean)) assert.ok(ITEMS[item], `${id} ${item}`);
    assert.ok(r.fee >= 3 && r.fee <= 7, id);
  }
  for (const k of Object.keys(Roster.KINDS)) assert.ok(kinds[k] >= 20, `${k}: ${kinds[k]}`);
});

test('each night offers 2 or 3 at random, mixed kinds, never anyone who moved on or is not yet about', () => {
  const s = atTheOath();
  const seen = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const o = Tavern.pick(s, createSeededRng(seed));
    assert.ok(o.length === 2 || o.length === 3, String(o));
    assert.equal(new Set(o.map((id) => Roster.RECRUITS[id].kind)).size, o.length, 'different kinds');
    for (const id of o) { assert.ok(Roster.RECRUITS[id].from <= 10, id); seen.add(id); }
  }
  assert.ok(seen.size > 30, `random: ${seen.size} different people in 40 nights`);
  s.world.tavernGone = Roster.IDS.filter((id) => id !== 'dov' && id !== 'agna' && Roster.RECRUITS[id].from <= 10);
  assert.deepEqual(Tavern.pick(s, createSeededRng(3)).sort(), ['agna', 'dov']);
});

test('finishing the Oath of the Road opens a night with tonight\'s people only', () => {
  const s = afterTheOath();
  const t = E.buildView(s).world.tavern;
  assert.equal(t.night, 'trial');
  assert.deepEqual(t.hires.map((h) => [h.id, h.fee]), [['dov', 60], ['agna', 40]]);
  const r = goIn(s);
  assert.equal(r.state.story.nodeId, 'tavern-trial');
  const text = sceneText(r.state);
  assert.match(text, /THE COMPANY OF THE OATH IS ONE SHORT/);
  assert.match(text, /Dov: Dov Calloway\. Caravan guard/);
  assert.match(text, /Agna Brannock\. I guarded wagons/);
  assert.doesNotMatch(text, /Isolde Greaves/, 'only tonight\'s people are told');
  assert.match(text, /We turned one away on a bench in Briarwatch/);
  assert.deepEqual(E.buildView(r.state).scene.choices.map((c) => c.id), ['hire-dov', 'hire-agna', 'leave']);
});

test('hiring Dov pays his fee, brings his kit at the party level, and the others move on', () => {
  const s = afterTheOath({}, ['dov', 'agna', 'isolde-greaves']);
  let r = goIn(s);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-dov' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  const dov = r.state.party.find((m) => m.id === 'dov');
  assert.equal(dov.level, 10);
  assert.equal(dov.equipment.mainHand, 'shortbow');
  assert.equal(r.state.player.gold, 440);
  assert.equal(r.state.story.flags['tavern:hired'], 'dov');
  assert.match(told(r), /Paid 60 gold: the fee\./);
  assert.deepEqual(r.state.world.tavernGone.sort(), ['agna', 'isolde-greaves']);
  const v = E.buildView(r.state);
  assert.equal(v.world.tavern, null);
  assert.equal(v.world.personal.some((p) => p.companionId === 'dov'), false, 'a hire has no personal quest');
  assert.match(standing(r.state, 'dov').join(' '), /hired at a tavern for a fee/);
});

test('every kind of hire comes with the right kit', () => {
  for (const [id, slot, item] of [['agna', 'offHand', 'steel-shield'], ['elspeth-keane', 'mainHand', 'ash-wand'], ['isolde-greaves', 'mainHand', 'shortsword']]) {
    let r = goIn(afterTheOath({}, [id]));
    r = E.resolveAction(r.state, { type: 'story-choice', choiceId: `hire-${id}` }, rng);
    assert.equal(r.result.ok, true, `${id}: ${r.result.error}`);
    assert.equal(r.state.party.find((m) => m.id === id).equipment[slot], item, id);
  }
});

test('a hire needs the fee in the purse', () => {
  let r = goIn(afterTheOath({ gold: 30 }));
  const dov = E.buildView(r.state).scene.choices.find((c) => c.id === 'hire-dov');
  assert.ok(dov, 'shown even when the purse is short');
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-dov' }, rng);
  assert.equal(r.result.ok, false);
  assert.match(r.result.error || told(r), /Requires 60 gold for the fee\./);
  assert.equal(r.state.party.length, 2);
});

test('"Not tonight" keeps them for the night; setting out sends them on for good', () => {
  let r = goIn(afterTheOath());
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'leave' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  assert.equal(E.buildView(r.state).world.tavern.night, 'trial');
  r = goIn(r.state);
  const text = sceneText(r.state);
  assert.match(text, /The same faces are still here/);
  assert.doesNotMatch(text, /Caravan guard, thirty-one years/);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'leave' }, rng);
  r = E.resolveAction(r.state, { type: 'depart', questId: 'aftermath' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  assert.equal(r.state.world.tavern, null);
  assert.deepEqual(r.state.world.tavernGone.sort(), ['agna', 'dov']);
  assert.ok(!Tavern.pool(r.state).includes('dov'));
});

test('people the party never went in to meet are not lost', () => {
  const s = afterTheOath();
  const r = E.resolveAction(s, { type: 'depart', questId: 'aftermath' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  assert.deepEqual(r.state.world.tavernGone, []);
});

test('a full party never sees the tavern, and the guild bench will not overfill it', () => {
  const s = afterTheOath({ nessa: 'joined' });
  assert.equal(E.buildView(s).world.tavern, null);
  assert.equal(E.resolveAction(s, { type: 'tavern' }, rng).result.ok, false);
  let r = goIn(afterTheOath({ nessa: null }));
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-agna' }, rng);
  assert.equal(E.buildView(r.state).world.canRecruit, false);
  assert.equal(E.resolveAction(r.state, { type: 'recruit', companionId: 'nessa' }, rng).result.ok, false);
});

test('a companion away for a chapter still holds their place', () => {
  const s = afterTheOath({ nessa: 'joined' });
  const [orin] = s.party.splice(0, 1);
  s.world.away = { orin: { member: orin } };
  assert.equal(Tavern.hasRoom(s), false);
  assert.equal(E.buildView(s).world.tavern, null);
});

test('no tavern night before the Oath of the Road: declining Nessa costs all of Book One', () => {
  for (const id of BOOK_ONE.slice(1)) assert.equal(Tavern.nightFor({ id }, false), null, id);
  assert.equal(Tavern.nightFor({ id: 'trial' }, false), 'trial');
  assert.equal(Tavern.nightFor({ id: 'gen-1', generated: true, trial: 'third' }, false), 'job');
  assert.equal(Tavern.nightFor({ id: 'gen-2', generated: true }, true), 'books');
  assert.equal(Tavern.nightFor({ id: 'gen-3', generated: true }, false), null);
});

test('every night is a scene with a choice for everyone on the roster and a way out', () => {
  for (const night of Object.keys(Tavern.NIGHTS)) {
    const n = STORY_NODES[Tavern.nodeId(night)];
    assert.ok(n, night);
    assert.equal(n.choices.length, 101, night);
    assert.equal(n.choices.at(-1).id, 'leave');
  }
});

test('an open night, its offer and who moved on survive a save and load', () => {
  const s = afterTheOath();
  s.world.tavernGone = ['isolde-greaves', 'nonsense'];
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(loaded.world.tavern, { night: 'trial', town: 'highpass', offer: ['dov', 'agna'], seen: false });
  assert.deepEqual(loaded.world.tavernGone, ['isolde-greaves']);
  let r = goIn(loaded);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-dov' }, rng);
  const again = E.normalizeIncomingState(JSON.parse(JSON.stringify(r.state)));
  assert.ok(again.party.some((m) => m.id === 'dov' && m.name === 'Dov Calloway'));
  const bad = JSON.parse(JSON.stringify(s)); bad.world.tavern = { night: 'nonsense', town: 'highpass' };
  assert.equal(E.normalizeIncomingState(bad).world.tavern, null);
  // A night saved before the roster (no offer) gets one.
  const old = JSON.parse(JSON.stringify(s)); delete old.world.tavern.offer;
  assert.ok(E.normalizeIncomingState(old).world.tavern.offer.length >= 2);
});

test('a written line for "the hire" speaks as whoever was hired, of the right kind, and is silent otherwise', () => {
  const lines = [
    { say: 'hire', text: 'I was paid for this.' },
    { say: 'hire', text: 'Arrows ready.', when: { hireKind: 'archer' } },
    { say: 'hire', text: 'Shield up.', when: { hireKind: 'shield' } },
    { narrate: '{hire} counts the coins.', when: { hire: true } }
  ].map(storyLine);
  const none = afterTheOath();
  assert.deepEqual(liveLines(none, lines), []);
  let r = goIn(afterTheOath());
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-dov' }, rng);
  assert.deepEqual(liveLines(r.state, lines).map((l) => l.narration || `${l.speaker}: ${l.text}`), ['Dov: I was paid for this.', 'Dov: Arrows ready.', 'Dov counts the coins.']);
});

test('a hire has something to say after every written chapter they can be along for, and nobody says it without one', () => {
  const firstNight = require('../src/expansion').QUESTS.trial.level;
  const chapters = Object.values(require('../src/expansion').QUESTS).filter((q) => q && Array.isArray(q.after) && q.level >= firstNight && q.id !== 'trial');
  assert.deepEqual(chapters.map((q) => q.id).sort(), Object.keys(Tavern.CHAPTERS).sort(), 'every chapter from the first night on');
  const s = afterTheOath();
  let r = E.resolveAction(goIn(s).state, { type: 'story-choice', choiceId: 'hire-agna' }, rng);
  const withHire = r.state, without = afterTheOath();
  for (const q of chapters) {
    const node = STORY_NODES[`q-${q.id}-after`], told = liveLines(withHire, node.dialogue);
    assert.ok(told.some((l) => l.speakerId === 'agna'), `${q.id}: Agna speaks`);
    assert.ok(told.every((l) => !/\{hire\}/.test(`${l.text || ''}${l.narration || ''}`)), `${q.id}: name filled in`);
    assert.ok(liveLines(without, node.dialogue).every((l) => l.speakerId !== 'hire' && !/\{hire\}|Agna/.test(`${l.text || ''}${l.narration || ''}`)), `${q.id}: silent with no hire`);
  }
  // A kind's own line comes first for that kind: Agna is a shield.
  assert.match(liveLines(withHire, STORY_NODES['q-chairs-after'].dialogue).map((l) => l.text || '').join(' '), /with my shield/);
});
