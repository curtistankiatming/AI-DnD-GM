'use strict';
// Job advancement step 6: the balance pass. The full simulation is
// `npm run balance` (slow); these checks pin the rules it settled on.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const P = require('../src/progression');
const { createSeededRng, deepClone } = require('../src/rules');
const JOBS = require('../src/data/jobs.json').classes;

function battle(classId, level, branch) {
  const s = E.createNewGame({ name: 'Rhea', classId });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: branch, thirdJob: level >= 40, fourthJob: level >= 70 });
  E.startCombat(s, 'practice', createSeededRng(7), []);
  const player = s.combat.actors.find(a => a.id === 'player');
  s.combat.actors = [player, ...s.combat.actors.filter(a => a !== player)];
  s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; player.actionUsed = false; player.bonusUsed = false;
  player.resources = deepClone(P.resources(require('../src/content').CLASSES[classId], level, s.player)); player.progression = deepClone(s.player.progression);
  for (const a of s.combat.actors.filter(a => a.team === 'enemy')) { a.hp = 5000; a.maxHp = 5000; a.ac = 1; }
  return s;
}

test('fighters attack three times from the 2nd job; rangers twice; others once', () => {
  const swings = (cls, level, branch) => {
    const s = battle(cls, level, branch), enemy = s.combat.actors.find(a => a.team === 'enemy');
    const before = enemy.hp;
    const r = E.resolveAction(s, { type: 'combat', actionId: 'weapon-attack', targetId: enemy.id }, () => 0.5);
    assert.equal(r.result.ok, true, r.result.error);
    return { r, dealt: before - r.state.combat.actors.find(a => a.id === enemy.id).hp };
  };
  const one = swings('fighter', 19, null), three = swings('fighter', 20, 'guardian');
  assert.ok(three.dealt > one.dealt, 'A third strike adds damage at level 20.');
  const view = E.buildView(battle('fighter', 20, 'guardian')).combat.actions.find(a => a.id === 'weapon-attack');
  assert.match(view.description, /Three strikes/);
  assert.match(E.buildView(battle('ranger', 20, 'deadeye')).combat.actions.find(a => a.id === 'weapon-attack').description, /Two strikes/);
  assert.doesNotMatch(E.buildView(battle('rogue', 20, 'shadow')).combat.actions.find(a => a.id === 'weapon-attack').description, /strikes/);
});

test('a one-strike weapon skill makes as many attacks as the Attack action', () => {
  const s = battle('fighter', 30, 'duelist'), enemy = s.combat.actors.find(a => a.team === 'enemy');
  const r = E.resolveAction(s, { type: 'combat', actionId: 'job:disarming-flourish', targetId: enemy.id }, () => 0.5);
  assert.equal(r.result.ok, true, r.result.error);
  const swings = r.events.filter(e => e.type === 'roll' && /^Rhea uses/.test(e.text || '')).length;
  assert.equal(swings, 3, 'Disarming Flourish is one strike plus two follow-ups.');
});

test('only an ultimate moves a combat objective more than two steps', () => {
  for (const cls of Object.values(JOBS)) for (const b of cls.branches) for (const k of [...b.skills, ...b.thirdSkills, ...b.fourthSkills]) {
    for (const e of k.effects || []) if (e.do === 'objective' && !k.ultimate) assert.ok((e.steps || 1) <= 2, `${b.id}/${k.id}`);
  }
});
