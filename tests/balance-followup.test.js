'use strict';
// Balance follow-up: the original level-10 specialization skills scale with
// level, Time Stop needs a save, Pathfinder skills deal damage.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const P = require('../src/progression');
const { CLASSES } = require('../src/content');
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
  player.resources = deepClone(P.resources(CLASSES[classId], level, s.player)); player.progression = deepClone(s.player.progression);
  for (const a of s.combat.actors.filter(a => a.team === 'enemy')) { a.hp = 5000; a.maxHp = 5000; a.ac = 1; a.resistances = []; }
  return s;
}
const dealt = (cls, level, branch, actionId) => {
  const s = battle(cls, level, branch), enemy = s.combat.actors.find(a => a.team === 'enemy');
  const r = E.resolveAction(s, { type: 'combat', actionId, targetId: enemy.id }, () => 0.5);
  assert.equal(r.result.ok, true, r.result.error);
  return 5000 - r.state.combat.actors.find(a => a.id === enemy.id).hp;
};

test('the original specialization skills grow with level: x1 to 19, x2 from 20, x3 from 80', () => {
  assert.ok(dealt('cleric', 80, 'exorcist', 'spec:exorcist') > dealt('cleric', 20, 'exorcist', 'spec:exorcist'));
  const desc = level => P.classActions(battle('cleric', level, 'exorcist').player).find(a => a.id === 'spec:exorcist').description;
  assert.match(desc(20), /multiplied by 2/); assert.match(desc(80), /multiplied by 3/);
  assert.doesNotMatch(desc(20).replace(/multiplied by 2/, ''), /multiplied/);
  assert.doesNotMatch(P.classActions(battle('fighter', 20, 'duelist').player).find(a => a.id === 'spec:duelist').description, /multiplied/, 'Weapon skills already scale.');
});

test('Time Stop makes every enemy save; Pathfinder control skills deal damage', () => {
  const ts = JOBS.wizard.branches.find(b => b.id === 'chronist').thirdSkills.find(k => k.id === 'time-stop');
  assert.ok(ts.effects.every(e => e.do === 'save' && e.area && e.onFail?.id === 'stunned'));
  const pf = JOBS.ranger.branches.find(b => b.id === 'pathfinder');
  for (const id of ['ambush-ground', 'lead-astray', 'hidden-route']) {
    const k = [...pf.skills, ...pf.thirdSkills].find(k => k.id === id);
    assert.ok(k.effects.some(e => e.damage && (e.on === 'enemies' || e.area)), id);
  }
});
