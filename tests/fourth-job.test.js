'use strict';
// Job advancement step 5: the 4th job (70 to 100), its legendary trial and the ultimates.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const P = require('../src/progression');
const XP = require('../src/xp');
const { CLASSES } = require('../src/content');
const { createSeededRng, deepClone } = require('../src/rules');
const JOBS = require('../src/data/jobs.json').classes;

const clone = x => JSON.parse(JSON.stringify(x));
const act = (s, action) => E.resolveAction(s, action, () => 0.999);
function hero(level = 70, { third = true, fourth = false, branch = 'guardian', classId = 'fighter' } = {}) {
  const s = E.createNewGame({ name: 'Rhea', classId });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  s.world.completed.bell = { day: 1, quality: 'force' }; s.world.completed.trial = { day: 1 };
  s.story.nodeId = 'town-briarwatch'; s.world.townId = 'briarwatch';
  Object.assign(s.player.progression, { specialization: branch, thirdJob: third, fourthJob: fourth });
  return E.normalizeIncomingState(s);
}
const trialQuest = (s, kind) => Object.values(s.director.quests).find(q => q.trial === kind);
function playTrial(s, kind) {
  const id = trialQuest(s, kind).id;
  for (const a of [{ type: 'depart', questId: id }, ...['investigate', 'advance', 'careful', 'resolve', 'd1'].map(choiceId => ({ type: 'story-choice', choiceId }))]) {
    const out = act(s, a); assert.equal(out.result.ok, true, `${a.choiceId || a.type}: ${out.result.error}`); s = out.state;
  }
  return s;
}
function battle(cls, branch) {
  const s = E.createNewGame({ name: 'Rhea', classId: cls });
  Object.assign(s.player.progression, { mastery: true, specialization: branch, thirdJob: true, fourthJob: true });
  E.awardXp(s, P.XP_NEXT[P.MAX_LEVEL - 1], [], 'test fixture');
  E.startCombat(s, 'practice', createSeededRng(222), []);
  const player = s.combat.actors.find(a => a.id === 'player');
  s.combat.actors = [player, ...s.combat.actors.filter(a => a !== player)];
  s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; player.actionUsed = false; player.bonusUsed = false;
  player.resources = deepClone(s.player.resources); player.progression = deepClone(s.player.progression);
  for (const a of s.combat.actors.filter(a => a.team === 'enemy')) { a.hp = 2000; a.maxHp = 2000; a.ac = 10; }
  return s;
}
const targetFor = (s, k) => k.target === 'enemy' ? s.combat.actors.find(a => a.team === 'enemy').id : k.target === 'ally' ? 'companion:orin' : k.target === 'self' ? 'player' : undefined;

test('every branch has a 4th job with skills at 70, 80 and 90 and an ultimate at 100', () => {
  for (const cls of Object.keys(CLASSES)) for (const b of JOBS[cls].branches) {
    assert.deepEqual(b.fourthSkills.map(s => s.level), [70, 80, 90, 100], `${cls}/${b.id}`);
    const ult = b.fourthSkills[3];
    assert.equal(ult.ultimate, true); assert.equal(ult.resource, 'ultimate'); assert.match(ult.description, /Once per long rest/);
  }
  assert.ok(P.ADVANCEMENTS.every(a => a.status === 'Playable'));
});

test('the legendary trial needs the 3rd job and level 70, and is always Heroic', () => {
  assert.equal(P.nextTrial(hero(75, { third: false }).player), 'third', 'A hero who skipped the 3rd job trial takes it first.');
  assert.match(act(hero(69), { type: 'job-trial' }).result.error, /level 70/);
  const out = act(hero(70), { type: 'job-trial' });
  assert.equal(out.result.ok, true, out.result.error);
  assert.equal(out.result.trial, 'fourth');
  const q = trialQuest(out.state, 'fourth');
  assert.equal(q.tier, 'heroic'); assert.equal(q.name, 'The Aegis Paragon Trial');
  assert.equal(q.xp, XP.share(70, XP.TRIAL_SHARE));
  assert.match(act(out.state, { type: 'adventure-tier', questId: q.id, tier: 'normal' }).result.error, /always Heroic/);
  const card = out.view.world.quests.find(c => c.id === q.id);
  assert.equal(card.trialLabel, 'Legendary trial'); assert.equal(card.trialTier, 'Heroic');
  assert.match(out.view.world.director ? '' : 'x', /^$/);
  assert.equal(E.normalizeIncomingState(clone(out.state)).director.quests[q.id].trial, 'fourth');
});

test('passing it gives the 4th job; the ultimate arrives at 100, once per long rest', () => {
  let s = hero(70);
  assert.equal(P.jobView(s.player).nextSkill.name, 'Pass the Aegis Paragon trial');
  s = playTrial(act(s, { type: 'job-trial' }).state, 'fourth');
  const job = P.jobView(s.player);
  assert.equal(s.player.progression.fourthJob, true);
  assert.equal(job.title, 'Aegis Paragon'); assert.equal(job.tier, 4); assert.equal(job.trialReady, false);
  assert.equal(s.player.resources.advancement.max, 5, 'Two, +1 at 30, +1 per later job.');
  assert.ok(P.classActions(s.player).some(a => a.id === 'job:aegis-of-ages'));
  assert.ok(!s.player.resources.ultimate, 'No ultimate before level 100.');
  assert.deepEqual(job.nextSkill, { level: 80, name: 'Paragon Hide' });
  E.awardXp(s, P.XP_NEXT[P.MAX_LEVEL - 1] - s.player.xp, []);
  assert.equal(s.player.level, P.MAX_LEVEL);
  assert.deepEqual([s.player.resources.ultimate.max, s.player.resources.ultimate.refresh], [1, 'long']);
  assert.ok(P.classActions(s.player).some(a => a.id === 'job:immortal-bastion'));
  assert.equal(P.jobView(s.player).nextSkill, null, 'Every skill on the path is learnt.');
});

test('renown ranks begin only once the 4th job is learnt at level 100', () => {
  const xp = P.XP_NEXT[P.MAX_LEVEL - 1] + 3 * P.RANK_XP;
  const s = hero(70, { fourth: false });
  s.player.level = P.MAX_LEVEL; s.player.xp = xp;
  assert.equal(P.renownRank(s.player), 0);
  s.player.progression.fourthJob = true;
  assert.equal(P.renownRank(s.player), 3, 'XP earned before the 4th job still counts.');
});

test('every 4th job skill and ultimate resolves in combat without NaN; the ultimate is spent', () => {
  for (const cls of Object.keys(CLASSES)) for (const b of JOBS[cls].branches) {
    for (const k of b.fourthSkills.filter(k => !k.passive)) {
      const s = battle(cls, b.id);
      const r = E.resolveAction(s, { type: 'combat', actionId: `job:${k.id}`, targetId: targetFor(s, k) }, () => 0.999999);
      assert.equal(r.result.ok, true, `${cls}/${b.id}/${k.id}: ${r.result.error}`);
      for (const a of r.view.combat ? r.view.combat.actors : []) assert.ok(Number.isFinite(a.hp) && Number.isFinite(a.ac), `${k.id}: ${a.id}`);
      if (k.ultimate) {
        const me = r.state.combat.actors.find(a => a.id === 'player');
        assert.equal(me.resources.ultimate.current, 0, `${k.id} spends the ultimate`);
      }
    }
  }
});

test('the combat skill bar has a 4th job group', () => {
  const M = require('../public/management-view');
  const s = hero(100, { fourth: true, branch: 'duelist' });
  const job = P.jobView(s.player);
  assert.equal(M.actionGroup('job:one-cut', job), 'job4');
  assert.equal(M.actionGroup('job:thousand-cuts', job), 'job3');
  const tree = job.branches.find(b => b.id === 'duelist');
  assert.ok(tree.fourthSkills.every(k => k.learnt));
  assert.equal(tree.fourthSkills[3].ultimate, true);
});
