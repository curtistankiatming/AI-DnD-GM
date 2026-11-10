'use strict';
// Job advancement step 2: class mastery at 10, 1st-job skills at 13 and 16,
// and the 2nd job at level 20 with three branches per class (src/data/jobs.json).
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const P = require('../src/progression');
const { CLASSES } = require('../src/content');
const { createSeededRng, deepClone } = require('../src/rules');
const JOBS = require('../src/data/jobs.json').classes;

const high = () => 0.999999;
function hero(classId, level) {
  const s = E.createNewGame({ name: 'Rhea', classId });
  if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  return s;
}
function battle(classId, level, branch) {
  const s = hero(classId, level);
  s.player.progression.mastery = true;
  if (branch) s.player.progression.specialization = branch;
  s.player.resources = P.resources(CLASSES[classId], level, s.player);
  E.startCombat(s, 'practice', createSeededRng(222), []);
  const player = s.combat.actors.find(a => a.id === 'player');
  s.combat.actors = [player, ...s.combat.actors.filter(a => a !== player)];
  s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; player.actionUsed = false; player.bonusUsed = false;
  player.resources = deepClone(s.player.resources); player.progression = deepClone(s.player.progression);
  for (const a of s.combat.actors.filter(a => a.team === 'enemy')) { a.hp = 500; a.maxHp = 500; a.ac = 10; }
  return s;
}
const targetFor = (s, skill) => skill.target === 'enemy' ? s.combat.actors.find(a => a.team === 'enemy').id
  : skill.target === 'ally' ? 'companion:orin' : skill.target === 'self' ? 'player' : undefined;

test('every class has a mastery skill, two 1st-job skills and three branches of four skills', () => {
  for (const cls of Object.keys(CLASSES)) {
    const job = JOBS[cls];
    assert.ok(job, cls);
    assert.equal(job.mastery.level, 10);
    assert.deepEqual(job.firstJob.map(s => s.level), [13, 16]);
    assert.equal(job.branches.length, 3);
    assert.equal(P.SPECIALIZATIONS[cls].length, 3, 'The third branch is offered with the original two.');
    for (const b of job.branches) {
      assert.deepEqual(b.skills.map(s => s.level), [20, 25, 30, 35], `${cls}/${b.id}`);
      assert.ok(b.name && b.third && b.fourth && b.style);
    }
  }
});

test('the Oath of the Road trial teaches class mastery; the 2nd job waits for level 20', () => {
  let s = hero('fighter', 10);
  assert.equal(P.learntSkills(s.player).length, 0);
  s.world.completed.trial = { day: 1 };
  s = E.normalizeIncomingState(s);
  assert.equal(s.player.progression.mastery, true);
  assert.ok(P.classActions(s.player).some(a => a.id === `job:${JOBS.fighter.mastery.id}`));
  assert.equal(E.buildView(s).progression.specializationOptions.length, 0, 'No branch before level 20.');
  E.awardXp(s, P.XP_NEXT[19] - s.player.xp, []);
  assert.deepEqual(E.buildView(s).progression.specializationOptions.map(o => o.id), JOBS.fighter.branches.map(b => b.id));
  const out = E.resolveAction(s, { type: 'specialize', specializationId: 'warlord' }, high);
  assert.equal(out.result.ok, true, out.result.error);
  const view = out.view.progression.job;
  assert.equal(view.title, 'Warlord'); assert.equal(view.tier, 2);
  assert.ok(P.classActions(out.state.player).some(a => a.id === 'spec:warlord'), 'The level 20 skill uses the branch action.');
});

test('skills are learnt by level and old skills are kept', () => {
  const s = hero('rogue', 20);
  s.player.progression.mastery = true; s.player.progression.specialization = JOBS.rogue.branches[0].id;
  const at = level => { s.player.level = level; return P.learntSkills(s.player).map(x => x.id || x.legacy); };
  const job = JOBS.rogue, b = job.branches[0];
  assert.deepEqual(at(20), [job.mastery.id, ...job.firstJob.map(x => x.id), b.skills[0].legacy]);
  assert.equal(at(29).length, 5);
  assert.deepEqual(at(35), [job.mastery.id, ...job.firstJob.map(x => x.id), b.skills[0].legacy, ...b.skills.slice(1).map(x => x.id)]);
});

test('passive bonuses stack but attack, AC and saves are capped', () => {
  const s = hero('fighter', 35);
  s.player.progression.mastery = true; s.player.progression.specialization = 'guardian';
  const passives = P.passiveTotals(s.player);
  assert.equal(passives.ac, 1, 'Guardian learns Shield Wall.');
  assert.equal(passives.hp, 18, 'Hardened (+6) and Guardian\'s level 35 skill (+12).');
  const plain = hero('fighter', 35);
  assert.equal(P.stats(s.player).ac, P.stats(plain.player).ac + 1);
  // Talents, passives and boons together cannot pass the ceiling.
  s.player.progression.talents = ['bulwark', 'precise', 'resilient'];
  s.player.level = P.MAX_LEVEL; s.player.xp = P.XP_NEXT[P.MAX_LEVEL - 1] + P.RANK_XP * 40;
  s.player.progression.boons = { warding: 9, precision: 9, resolve: 9 };
  const st = P.stats(s.player);
  for (const [k, cap] of Object.entries(P.BONUS_CAPS)) assert.ok(st[k] <= cap, `${k} ${st[k]} > ${cap}`);
});

test('every job skill of every class and branch resolves in combat without NaN', () => {
  for (const cls of Object.keys(CLASSES)) for (const b of JOBS[cls].branches) {
    const probe = battle(cls, 35, b.id);
    const skills = P.classActions(probe.player).filter(a => a.id.startsWith('job:'));
    assert.ok(skills.length >= 3, `${cls}/${b.id} has its job actives`);
    for (const skill of skills) {
      const s = battle(cls, 35, b.id);
      const r = E.resolveAction(s, { type: 'combat', actionId: skill.id, targetId: targetFor(s, skill) }, high);
      assert.equal(r.result.ok, true, `${cls}/${b.id}/${skill.id}: ${r.result.error}`);
      for (const a of r.view.combat ? r.view.combat.actors : []) {
        assert.ok(Number.isFinite(a.hp) && Number.isFinite(a.ac), `${cls}/${skill.id} left ${a.id} with hp ${a.hp}`);
      }
      assert.ok(Number.isFinite(r.state.player.temporaryHp || 0));
    }
  }
});

test('a hero who chose a specialization at level 10 keeps it', () => {
  const s = hero('fighter', 10);
  s.world.completed.trial = { day: 1 };
  s.player.progression.specialization = 'guardian';
  const n = E.normalizeIncomingState(deepClone(s));
  assert.equal(n.player.progression.specialization, 'guardian');
  assert.ok(P.classActions(n.player).some(a => a.id === 'spec:guardian'));
  assert.ok(P.learntSkills(n.player).some(x => x.legacy === 'guardian'));
});
