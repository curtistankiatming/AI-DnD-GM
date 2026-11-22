'use strict';
// Playtest through Book Three, 22 November 2026: findings that changed the rules.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression');
const { CLASSES } = require('../src/content');
const { createSeededRng, deepClone } = require('../src/rules');

function battle(classId, branch) {
  const s = E.createNewGame({ name: 'Rhea', classId });
  E.awardXp(s, P.XP_NEXT[24], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: branch });
  E.startCombat(s, 'practice', createSeededRng(7), []);
  const player = s.combat.actors.find(a => a.id === 'player');
  s.combat.actors = [player, ...s.combat.actors.filter(a => a !== player)];
  s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; player.actionUsed = false; player.bonusUsed = false;
  player.resources = deepClone(P.resources(CLASSES[classId], 25, s.player));
  s.combat.objective = { name: 'Hold the stair', label: 'Hold the stair', skill: 'athletics', progress: 0, target: 8, dc: 15, questId: 'bridge' };
  return s;
}

for (const [classId, branch] of [['bard', 'lorekeeper'], ['rogue', 'saboteur']]) {
  test(`${branch}: unravelling an objective works once per fight, not twice`, () => {
    let s = battle(classId, branch);
    const first = E.resolveAction(s, { type: 'combat', actionId: 'spec-objective' }, createSeededRng(1));
    assert.equal(first.result.ok, true, first.result.error);
    s = first.state; assert.equal(s.combat.objective.progress, 2);
    const player = s.combat.actors.find(a => a.id === 'player');
    player.actionUsed = false; assert.ok(player.resources.advancement.current >= 1, 'A second use is still in hand.');
    const view = E.buildView(s).combat.actions.find(a => a.id === 'spec-objective');
    assert.equal(view.disabled, true); assert.match(view.description, /once per fight/);
    const second = E.resolveAction(s, { type: 'combat', actionId: 'spec-objective' }, createSeededRng(1));
    assert.equal(second.result.ok, false);
    assert.equal(second.state.combat.objective.progress, 2);
  });
}

test('a job skill that moves the objective does so once per fight, and keeps its other effects', () => {
  let s = battle('ranger', 'pathfinder');
  const trail = E.buildView(s).combat.actions.find(a => a.id === 'spec:pathfinder');
  assert.ok(trail, 'Pathfinder has Trailblazer at level 25.');
  const use = st => { const p = st.combat.actors.find(a => a.id === 'player'); p.actionUsed = false; p.bonusUsed = false; const r = E.resolveAction(st, { type: 'combat', actionId: trail.id, targetId: trail.targets?.[0]?.id }, createSeededRng(2)); assert.equal(r.result.ok, true, r.result.error); return r; };
  const first = use(s); s = first.state; assert.equal(s.combat.objective.progress, 1);
  const second = use(s); assert.equal(second.state.combat.objective.progress, 1);
  assert.ok(second.events.some(e => /already moved the objective/.test(e.text)));
  assert.match(trail.description, /once per fight/);
  // The second use still grants its temporary hit points.
  const before = first.state.combat.actors.find(a => a.id === 'player');
  before.temporaryHp = 0;
  const again = use(first.state); assert.ok(again.state.combat.actors.find(a => a.id === 'player').temporaryHp > 0, 'The second use still gives temporary HP.');
});
