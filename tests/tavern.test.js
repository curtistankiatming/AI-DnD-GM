'use strict';
// Tavern nights (src/tavern.js, src/data/tavern.json; Curtis, 26 November 2026):
// at turns in the story a party with an empty place may hire one of two people
// at the inn. Declining Nessa keeps its cost: no night before the Oath of the
// Road, a fee, and hiring one sends the other away.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Tavern = require('../src/tavern');
const { STORY_NODES, COMPANIONS } = require('../src/content');
const { standing } = require('../src/expansion');

const BOOK_ONE = ['bell', 'road', 'marsh', 'bridge', 'archive', 'signal', 'summit', 'breach', 'beacon'];
const rng = () => 0.5;
const told = (r) => r.events.map((e) => e.text || '').join('\n');
// A level 10 hero in Highpass who turned Nessa down, about to finish the Oath of the Road.
function atTheOath({ nessa = 'declined', gold = 500 } = {}) {
  const s = E.createNewGame({ name: 'Pell', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[9], [], 'test fixture');
  s.story.flags['nessa:offer'] = nessa;
  for (const id of BOOK_ONE) s.world.completed[id] = { xp: 0, gold: 0 };
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass']; s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  if (nessa === 'joined') E.extensionApi().recruitCompanion(s, 'nessa', []);
  W.init(s);
  s.player.gold = gold;
  return s;
}
function afterTheOath(opts) {
  const s = atTheOath(opts);
  assert.equal(W.completeQuest(s, 'trial', [], E.extensionApi()), true);
  E.enterNode(s, 'town-highpass', []);
  return s;
}

test('finishing the Oath of the Road opens a tavern night for a party one short', () => {
  const s = afterTheOath();
  const t = E.buildView(s).world.tavern;
  assert.equal(t.night, 'trial');
  assert.equal(t.here, true);
  assert.deepEqual(t.hires.map((h) => [h.id, h.fee]), [['dov', 60], ['agna', 40]]);
  const r = E.resolveAction(s, { type: 'tavern' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  assert.equal(r.state.story.nodeId, 'tavern-trial');
  const text = told(r) + r.result.outcomeText;
  assert.match(text, /THE COMPANY OF THE OATH IS ONE SHORT/);
  assert.match(text, /Dov Calloway\. Caravan guard/);
  assert.match(text, /Agna Brannock\. I guarded wagons/);
  // The party remembers the scout it turned away.
  assert.match(text, /We turned one away on a bench in Briarwatch/);
});

test('hiring Dov pays his fee, brings his kit at the party level, and shuts the door', () => {
  const s = afterTheOath();
  let r = E.resolveAction(s, { type: 'tavern' }, rng);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-dov' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  const dov = r.state.party.find((m) => m.id === 'dov');
  assert.ok(dov);
  assert.equal(dov.level, 10);
  assert.equal(dov.equipment.mainHand, 'shortbow');
  assert.equal(r.state.player.gold, 440);
  assert.equal(r.state.story.flags['tavern:hired'], 'dov');
  assert.equal(r.state.story.nodeId, 'town-highpass');
  assert.match(told(r), /Paid 60 gold: the fee\./);
  const v = E.buildView(r.state);
  assert.equal(v.world.tavern, null, 'the place is filled, so Agna is gone');
  assert.equal(v.world.personal.some((p) => p.companionId === 'dov'), false, 'a hire has no personal quest');
  assert.equal(E.resolveAction(r.state, { type: 'tavern' }, rng).result.ok, false);
  assert.match(standing(r.state, 'dov').join(' '), /hired at a tavern for a wage/);
});

test('hiring Agna gives the party a second shield', () => {
  const s = afterTheOath();
  let r = E.resolveAction(s, { type: 'tavern' }, rng);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-agna' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  const agna = r.state.party.find((m) => m.id === 'agna');
  assert.equal(agna.equipment.offHand, 'steel-shield');
  assert.equal(COMPANIONS.agna.aiRole, 'guardian');
  assert.equal(r.state.player.gold, 460);
  assert.equal(r.state.party.some((m) => m.id === 'dov'), false);
});

test('a hire needs the fee in the purse', () => {
  const s = afterTheOath({ gold: 30 });
  let r = E.resolveAction(s, { type: 'tavern' }, rng);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-dov' }, rng);
  assert.equal(r.result.ok, false);
  assert.match(r.result.error || told(r), /Requires 60 gold for the fee\./);
  assert.equal(r.state.party.length, 2);
  assert.equal(r.state.player.gold, 30);
});

test('"Not tonight" keeps the night open, and they are still there when you come back', () => {
  const s = afterTheOath();
  let r = E.resolveAction(s, { type: 'tavern' }, rng);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'leave' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  assert.equal(r.state.story.nodeId, 'town-highpass');
  assert.equal(E.buildView(r.state).world.tavern.night, 'trial');
  r = E.resolveAction(r.state, { type: 'tavern' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  const text = r.result.outcomeText;
  assert.match(text, /as if he had never left it/);
  assert.doesNotMatch(text, /Caravan guard, thirty-one years/);
  assert.doesNotMatch(text, /We turned one away/);
});

test('setting out on the next chapter ends the night', () => {
  const s = afterTheOath();
  const r = E.resolveAction(s, { type: 'depart', questId: 'aftermath' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  assert.equal(r.state.world.tavern, null);
});

test('a full party never sees the tavern, and the guild bench will not overfill it', () => {
  const s = afterTheOath({ nessa: 'joined' });
  assert.ok(s.party.some((m) => m.id === 'nessa'));
  assert.equal(E.buildView(s).world.tavern, null);
  assert.equal(E.resolveAction(s, { type: 'tavern' }, rng).result.ok, false);
  // An older save that never met Nessa and filled the place at the tavern.
  const old = afterTheOath({ nessa: undefined });
  delete old.story.flags['nessa:offer'];
  let r = E.resolveAction(old, { type: 'tavern' }, rng);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-agna' }, rng);
  assert.equal(E.buildView(r.state).world.canRecruit, false);
  assert.equal(E.resolveAction(r.state, { type: 'recruit', companionId: 'nessa' }, rng).result.ok, false);
});

test('a companion away for a chapter still holds their place', () => {
  const s = afterTheOath({ nessa: 'joined' });
  const [orin] = s.party.splice(0, 1);
  assert.equal(orin.id, 'orin');
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

test('every night is a scene with both hires and a way out, and the hires are companions', () => {
  for (const night of Object.keys(Tavern.NIGHTS)) {
    const n = STORY_NODES[Tavern.nodeId(night)];
    assert.ok(n, night);
    assert.deepEqual(n.choices.map((c) => c.id), ['hire-dov', 'hire-agna', 'leave'], night);
    assert.ok(n.dialogue.length > 5, night);
  }
  for (const id of Tavern.HIRES) { assert.ok(COMPANIONS[id].hired, id); assert.ok(COMPANIONS[id].loadout, id); }
});

test('a hire and an open night survive a save and load', () => {
  const s = afterTheOath();
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(loaded.world.tavern, { night: 'trial', town: 'highpass' });
  let r = E.resolveAction(loaded, { type: 'tavern' }, rng);
  r = E.resolveAction(r.state, { type: 'story-choice', choiceId: 'hire-dov' }, rng);
  const again = E.normalizeIncomingState(JSON.parse(JSON.stringify(r.state)));
  assert.ok(again.party.some((m) => m.id === 'dov' && m.name === 'Dov Calloway'));
  // A bad night in an edited save is dropped, not trusted.
  const bad = JSON.parse(JSON.stringify(s)); bad.world.tavern = { night: 'nonsense', town: 'highpass' };
  assert.equal(E.normalizeIncomingState(bad).world.tavern, null);
});
