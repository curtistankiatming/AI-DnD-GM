'use strict';
// Systems review, 21 November 2026: stat damage on the older skills, the
// under-level objective, companion voices and what the AI director is told.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), Power = require('../src/power');
const Director = require('../src/director'), Book = require('../src/book');
const { CLASSES, COMPANIONS } = require('../src/content');
const { QUESTS } = require('../src/expansion');
const { createSeededRng, deepClone } = require('../src/rules');

// A practice fight with the hero acting first and every enemy a 5000 HP dummy.
function battle(classId, level, branch, abilities = {}) {
  const s = E.createNewGame({ name: 'Rhea', classId });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: branch });
  Object.assign(s.player.abilities, abilities);
  E.startCombat(s, 'practice', createSeededRng(7), []);
  const player = s.combat.actors.find(a => a.id === 'player');
  Object.assign(player.abilities, abilities);
  s.combat.actors = [player, ...s.combat.actors.filter(a => a !== player)];
  s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; player.actionUsed = false; player.bonusUsed = false;
  player.resources = deepClone(P.resources(CLASSES[classId], level, s.player)); player.progression = deepClone(s.player.progression);
  for (const a of s.combat.actors.filter(a => a.team === 'enemy')) { a.hp = 5000; a.maxHp = 5000; a.ac = 1; a.resistances = []; a.conditions = []; }
  return s;
}
function dealt(classId, branch, actionId, abilities) {
  const s = battle(classId, 17, branch, abilities), enemy = s.combat.actors.find(a => a.team === 'enemy');
  const r = E.resolveAction(s, { type: 'combat', actionId, targetId: enemy.id }, () => 0.5);
  assert.equal(r.result.ok, true, r.result.error);
  return r.state.combat.actors.filter(a => a.team === 'enemy').reduce((n, a) => n + 5000 - a.hp, 0);
}

test('Arcane Snare, Saboteur, Lorekeeper, Focused Nova and Sever the Binding add stat damage', () => {
  // Level 17 is power tier 3: a +4 modifier adds 12 per hit, a +0 adds nothing.
  const strong = 18, plain = 10, bonus = Power.statDamage({ team: 'party', level: 17, abilities: { x: strong } }, 'x');
  assert.equal(bonus, 12);
  const cases = [
    ['wizard', 'evoker', 'arcane-snare', 'int', 1],
    ['rogue', 'saboteur', 'spec:saboteur', 'dex', 1],
    ['bard', 'lorekeeper', 'spec:lorekeeper', 'cha', 1],
    ['cleric', 'exorcist', 'spec:exorcist', 'wis', 1]
  ];
  for (const [cls, branch, id, ability, hits] of cases) {
    const diff = dealt(cls, branch, id, { [ability]: strong }) - dealt(cls, branch, id, { [ability]: plain });
    assert.equal(diff, bonus * hits, `${id} adds ${ability} damage`);
  }
  // The nova hits every enemy, each for the bonus (halved on a save).
  assert.ok(dealt('wizard', 'evoker', 'spec:evoker', { int: strong }) > dealt('wizard', 'evoker', 'spec:evoker', { int: plain }));
});

test('Burning says it lasts until the fire goes out, not every turn for ever', () => {
  assert.doesNotMatch(Power.EFFECTS.burning.text, /each turn/);
});

test('more than 5 levels under a chapter, its fight objective is harder too', () => {
  const W = require('../src/world');
  const hero = level => { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; };
  const ready = (id, level) => {
    const q = QUESTS[id], s = hero(level); s.player.gold = 1000; s.player.progression.mastery = true;
    s.world.completed.bell = { xp: 0, gold: 0 };
    for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
    s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass'];
    if (!s.world.unlockedTowns.includes(q.town)) s.world.unlockedTowns.push(q.town);
    s.world.townId = q.town; s.story.nodeId = `town-${q.town}`; W.init(s);
    return s;
  };
  const act = (s, a) => { const r = E.resolveAction(s, a, createSeededRng(3)); assert.equal(r.result.ok, true, r.result.error); return r; };
  const fightOf = s => {
    s = act(s, { type: 'depart', questId: 'harbour' }).state;
    s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
    s = act(s, { type: 'story-choice', choiceId: 'direct' }).state;
    return act(s, { type: 'story-choice', choiceId: 'confront' }).state.combat;
  };
  const q = QUESTS.harbour, behind = fightOf(ready('harbour', q.level - 7)), even = fightOf(ready('harbour', q.level));
  assert.ok(behind.objective && even.objective, 'the chapter fight has an objective');
  assert.equal(behind.objective.dc - even.objective.dc, 2);
});

test('a save from before a character rewrite gets the companions\' current voice', () => {
  const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  const old = JSON.parse(JSON.stringify(s));
  for (const m of old.party) { m.personality = 'An old description.'; m.summary = 'Old.'; m.bond = 3; }
  const loaded = E.normalizeIncomingState(old);
  for (const m of loaded.party) {
    assert.equal(m.personality, COMPANIONS[m.id].personality);
    assert.equal(m.summary, COMPANIONS[m.id].summary);
    assert.equal(m.bond, 3, 'what the save earned is kept');
  }
});

test('the AI director gets each companion\'s voice and no unplayable chapter names', () => {
  const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  const sent = JSON.parse(Director.prompt(s));
  for (const m of sent.party) {
    const id = s.party.find(p => p.name === m.name).id;
    assert.equal(m.voice, COMPANIONS[id].personality);
    assert.equal(m.pronouns, COMPANIONS[id].pronouns);
  }
  assert.match(Director.SYSTEM, /party\[\]\.voice/);
  // Every chapter the open-source game can play is done: nothing written is
  // left to name, so unreleased Book Three chapters and side jobs stay out.
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const q of Book.chapters(s)) s.world.completed[q.id] = { xp: 0, gold: 0 };
  const playable = new Set(Book.chapters(s).map(q => q.name));
  const upcoming = JSON.parse(Director.prompt(s)).upcomingAuthoredAdventures;
  for (const name of upcoming) assert.ok(playable.has(name), `${name} is playable`);
  const hidden = Object.values(QUESTS).filter(q => q.sideJob || !Book.playable(s, q.id));
  assert.ok(hidden.length > 0, 'there are side jobs or unreleased chapters to keep out');
  for (const q of hidden) assert.ok(!upcoming.includes(q.name), `${q.name} is not sent`);
  // A free hosted account is not told the names of a paid book's chapters.
  const free = Book.grant(E.createNewGame({ name: 'Rowan', classId: 'fighter' }), 1);
  free.world.completed.bell = { xp: 0, gold: 0 };
  for (const q of Book.chapters(free)) free.world.completed[q.id] = { xp: 0, gold: 0 };
  const names = JSON.parse(Director.prompt(free)).upcomingAuthoredAdventures;
  for (const q of Object.values(QUESTS).filter(q => (q.book || 1) >= 2)) assert.ok(!names.includes(q.name), `${q.name} is not sent to a Book One account`);
});
