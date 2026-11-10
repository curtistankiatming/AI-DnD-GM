'use strict';
// Job advancement step 4: the 3rd job at level 40, unlocked by a trial.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const P = require('../src/progression');
const XP = require('../src/xp');
const D = require('../src/director');
const Chat = require('../src/chat-runtime');
const { CLASSES } = require('../src/content');
const { createSeededRng, deepClone } = require('../src/rules');
const JOBS = require('../src/data/jobs.json').classes;
const draft = require('./fixtures/director-draft');

const clone = x => JSON.parse(JSON.stringify(x));
const act = (s, action) => E.resolveAction(s, action, () => 0.999);
function hero(level = 40, branch = 'guardian', classId = 'fighter') {
  const s = E.createNewGame({ name: 'Rhea', classId });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  s.world.completed.bell = { day: 1, quality: 'force' }; s.world.completed.trial = { day: 1 };
  s.story.nodeId = 'town-briarwatch'; s.world.townId = 'briarwatch';
  if (branch) s.player.progression.specialization = branch;
  return E.normalizeIncomingState(s);
}
const trialId = s => Object.values(s.director.quests).find(q => q.trial === 'third')?.id;
function playTrial(s) {
  const id = trialId(s);
  for (const a of [{ type: 'depart', questId: id }, ...['investigate', 'advance', 'careful', 'resolve', 'd1'].map(choiceId => ({ type: 'story-choice', choiceId }))]) {
    const out = act(s, a); assert.equal(out.result.ok, true, `${a.choiceId || a.type}: ${out.result.error}`); s = out.state;
  }
  return s;
}

test('every branch has a 3rd job with skills at 40, 48, 56 and 64', () => {
  for (const cls of Object.keys(CLASSES)) for (const b of JOBS[cls].branches) {
    assert.deepEqual(b.thirdSkills.map(s => s.level), [40, 48, 56, 64], `${cls}/${b.id}`);
    assert.ok(b.thirdSkills.every(s => s.name && s.description && (s.passive || s.effects?.length)));
  }
  assert.equal(P.ADVANCEMENTS.find(a => a.level === 40).status, 'Playable');
});

test('the trial needs level 40 and a branch, and only one can wait on the board', () => {
  assert.match(act(hero(39), { type: 'job-trial' }).result.error, /level 40/);
  assert.match(act(hero(40, null), { type: 'job-trial' }).result.error, /2nd job branch/);
  const out = act(hero(40), { type: 'job-trial' });
  assert.equal(out.result.ok, true, out.result.error);
  assert.equal(out.result.written, true, 'With no draft the written trial is used.');
  const q = out.state.director.quests[out.result.questId];
  assert.equal(q.trial, 'third'); assert.equal(q.tier, 'hard'); assert.equal(q.name, 'The Bulwark Knight Trial');
  assert.equal(q.xp, XP.share(40, XP.TRIAL_SHARE), 'Half a level of XP, once.');
  assert.match(act(out.state, { type: 'job-trial' }).result.error, /already on the expedition board/);
  assert.match(act(out.state, { type: 'adventure-tier', questId: q.id, tier: 'normal' }).result.error, /always Hard/);
  assert.equal(D.availability(out.state), null, 'The trial does not use up the AI adventure slot.');
  assert.equal(E.normalizeIncomingState(clone(out.state)).director.quests[q.id].trial, 'third', 'Survives a reload.');
  const card = out.view.world.quests.find(c => c.id === q.id);
  assert.equal(card.trial, 'third'); assert.equal(card.canChangeTier, false);
});

test('passing the trial gives the 3rd job title, skills by level and one more Advancement use', () => {
  let s = hero(40);
  const before = s.player.resources.advancement.max;
  assert.equal(P.jobView(s.player).title, 'Guardian');
  assert.equal(P.jobView(s.player).nextSkill.name, 'Pass the Bulwark Knight trial');
  assert.ok(!P.classActions(s.player).some(a => a.id === 'job:aegis-wall'));
  s = act(s, { type: 'job-trial' }).state;
  s = playTrial(s);
  assert.equal(s.player.progression.thirdJob, true);
  const job = P.jobView(s.player);
  assert.equal(job.title, 'Bulwark Knight'); assert.equal(job.tier, 3); assert.equal(job.trialReady, false);
  assert.equal(s.player.resources.advancement.max, before + 1);
  assert.ok(P.classActions(s.player).some(a => a.id === 'job:aegis-wall'));
  assert.equal(job.nextSkill.level, 48);
  assert.ok(!P.learntSkills(s.player).some(k => k.id === 'iron-hide'));
  s.player.level = 48;
  assert.ok(P.learntSkills(s.player).some(k => k.id === 'iron-hide'));
  assert.equal(P.passiveTotals(s.player).hp, 6 + 12 + 16, 'Hardened, Unbreakable and Iron Hide.');
  assert.ok(E.normalizeIncomingState(clone(s)).player.progression.thirdJob, 'Kept after a reload.');
  assert.equal(E.buildView(s).world.director.trial, null, 'No second trial is offered.');
});

test('Claude writes the trial for the branch; a bad draft falls back to the written trial', async () => {
  const s = hero(40, 'warlord');
  const prompt = JSON.parse(D.prompt(s, { trial: true }));
  assert.equal(prompt.hero.job, 'Warlord');
  assert.match(prompt.trial, /Warlord into a Banner Captain/);
  const provider = reply => ({ config: async () => ({ enabled: true, provider: 'claude' }), complete: async () => ({ text: reply, model: 'fake' }) });
  let out = await Chat.resolveChat(clone(s), { mode: 'trial', text: '/trial' }, provider(JSON.stringify(draft())));
  assert.equal(out.result.ok, true, out.result.error);
  assert.equal(out.state.director.quests[trialId(out.state)].name, 'The Salt Choir');
  assert.equal(out.narration.source, 'ai-director');
  out = await Chat.resolveChat(clone(s), { text: '/trial' }, provider('{"name":"x"}'));
  assert.equal(out.result.ok, true); assert.equal(out.result.written, true);
  out = await Chat.resolveChat(clone(s), { text: '/trial' }, provider('not json'));
  assert.equal(out.result.ok, true); assert.match(out.narration.text, /written trial is used/);
  out = await Chat.resolveChat(clone(s), { text: '/trial' }, null);
  assert.equal(out.result.ok, true); assert.equal(out.state.director.quests[trialId(out.state)].name, 'The Banner Captain Trial');
});

test('every 3rd job skill of every branch resolves in combat without NaN', () => {
  for (const cls of Object.keys(CLASSES)) for (const b of JOBS[cls].branches) {
    const setup = () => {
      const s = E.createNewGame({ name: 'Rhea', classId: cls });
      E.awardXp(s, P.XP_NEXT[63], [], 'test fixture');
      Object.assign(s.player.progression, { mastery: true, specialization: b.id, thirdJob: true });
      s.player.resources = P.resources(CLASSES[cls], 64, s.player);
      E.startCombat(s, 'practice', createSeededRng(222), []);
      const player = s.combat.actors.find(a => a.id === 'player');
      s.combat.actors = [player, ...s.combat.actors.filter(a => a !== player)];
      s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; player.actionUsed = false; player.bonusUsed = false;
      player.resources = deepClone(s.player.resources); player.progression = deepClone(s.player.progression);
      for (const a of s.combat.actors.filter(a => a.team === 'enemy')) { a.hp = 900; a.maxHp = 900; a.ac = 10; }
      return s;
    };
    assert.equal(setup().player.resources.advancement.max, 4, 'Two uses, +1 at 30, +1 for the 3rd job.');
    for (const k of b.thirdSkills.filter(k => !k.passive)) {
      const s = setup();
      const target = k.target === 'enemy' ? s.combat.actors.find(a => a.team === 'enemy').id : k.target === 'ally' ? 'companion:orin' : k.target === 'self' ? 'player' : undefined;
      const r = E.resolveAction(s, { type: 'combat', actionId: `job:${k.id}`, targetId: target }, () => 0.999999);
      assert.equal(r.result.ok, true, `${cls}/${b.id}/${k.id}: ${r.result.error}`);
      for (const a of r.view.combat ? r.view.combat.actors : []) assert.ok(Number.isFinite(a.hp) && Number.isFinite(a.ac), `${k.id}: ${a.id}`);
    }
  }
});

test('the combat skill bar has a 3rd job group', () => {
  const M = require('../public/management-view');
  const s = hero(56, 'duelist');
  s.player.progression.mastery = true; s.player.progression.thirdJob = true;
  const job = P.jobView(s.player);
  assert.equal(M.actionGroup('job:thousand-cuts', job), 'job3');
  assert.equal(M.actionGroup('job:disarming-flourish', job), 'job2');
  assert.equal(M.actionGroup('spec:duelist', job), 'job2');
  const tree = job.branches.find(b => b.id === 'duelist');
  assert.deepEqual(tree.thirdSkills.map(k => k.learnt), [true, true, true, false]);
});
