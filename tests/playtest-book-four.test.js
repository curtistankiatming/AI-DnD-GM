'use strict';
// Playtest through Book Four, 22 November 2026: findings that changed the rules.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression');
const { CLASSES } = require('../src/content');
const { createSeededRng, deepClone } = require('../src/rules');

function battle(classId, branch, level) {
  const s = E.createNewGame({ name: 'Rhea', classId });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: branch, thirdJob: true, fourthJob: level >= P.FOURTH_JOB_LEVEL });
  E.startCombat(s, 'practice', createSeededRng(7), []);
  const player = s.combat.actors.find(a => a.id === 'player');
  s.combat.actors = [player, ...s.combat.actors.filter(a => a !== player)];
  s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; player.actionUsed = false; player.bonusUsed = false;
  player.resources = deepClone(P.resources(CLASSES[classId], level, s.player));
  return s;
}

// "Every enemy makes a save" skills had no area, and with no target they
// reached no one: the save was never rolled.
for (const [classId, branch, level, id, save] of [
  ['bard', 'envoy', 45, 'terms-of-surrender', 'Charisma'],
  ['rogue', 'grifter', 45, 'web-of-lies', 'Wisdom'],
  ['bard', 'envoy', 72, 'royal-decree', 'Charisma']
]) {
  test(`${id}: every enemy makes the ${save} save`, () => {
    const s = battle(classId, branch, level);
    const enemies = s.combat.actors.filter(a => a.team === 'enemy' && a.hp > 0).length;
    assert.ok(enemies >= 1);
    const r = E.resolveAction(s, { type: 'combat', actionId: `job:${id}` }, createSeededRng(1));
    assert.equal(r.result.ok, true, r.result.error);
    const saves = r.events.filter(e => new RegExp(`${save} save`).test(e.text)).length;
    assert.equal(saves, enemies, `Each of the ${enemies} enemies rolls a save.`);
  });
}

test('every job skill that calls for a save reaches an enemy', () => {
  const J = require('../src/data/jobs.json').classes;
  for (const [classId, c] of Object.entries(J)) {
    const skills = [c.mastery, ...(c.skills || []), ...c.branches.flatMap(b => [...(b.skills || []), ...(b.thirdSkills || []), ...(b.fourthSkills || [])])].filter(Boolean);
    for (const s of skills) for (const e of s.effects || []) {
      if (e.do === 'save') assert.ok(e.area || s.target === 'enemy', `${classId} ${s.id}: a save with no area needs an enemy target.`);
    }
  }
});
