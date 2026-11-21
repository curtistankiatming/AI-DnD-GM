'use strict';
// The party member best suited to a story check rolls it (src/engine.js checkPlan).
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const { makeSandbox } = require('../src/public-preview');

const choice = (check) => ({ id: 'probe', label: 'Probe', check: { dc: 15, ...check } });
const chance = (p) => E.successProbability(p.dc, p.bonus, p.advantage ? 'advantage' : p.disadvantage ? 'disadvantage' : 'normal');

test('the best-suited party member rolls, and the hero wins a tie', () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  const plan = E.checkPlan(s, choice({ skill: 'athletics' }));
  const hero = E.checkPlan(s, choice({ skill: 'athletics' }), s.player);
  assert.ok(chance(plan) >= chance(hero));
  assert.equal(plan.actor.id, 'orin', 'Orin is the strongest at Athletics');
  // An arcana check: the wizard is best and keeps it.
  assert.equal(E.checkPlan(s, choice({ skill: 'arcana' })).actor.id, 'player');
});

test('the hero can help a companion who rolls', () => {
  const s = makeSandbox({ classId: 'fighter', level: 5 });
  s.player.skills = [...new Set([...(s.player.skills || []), 'insight'])];
  const plan = E.checkPlan(s, choice({ skill: 'insight' }), s.party.find(m => m.id === 'maren'));
  assert.equal(plan.helper?.id, 'player');
  assert.equal(plan.advantage, true);
});

test('a fallen or estranged companion does not roll', () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  const orin = s.party.find(m => m.id === 'orin');
  orin.hp = 0;
  assert.notEqual(E.checkPlan(s, choice({ skill: 'athletics' })).actor.id, 'orin');
  orin.hp = orin.maxHp; orin.bond = -1;
  assert.notEqual(E.checkPlan(s, choice({ skill: 'athletics' })).actor.id, 'orin');
});

test('the player can choose to roll every check, and switch back', () => {
  let s = makeSandbox({ classId: 'wizard', level: 5 });
  let out = E.resolveAction(s, { type: 'check-roller', roller: 'hero' });
  assert.equal(out.result.ok, true);
  assert.equal(out.state.story.heroRolls, true);
  assert.equal(E.checkPlan(out.state, choice({ skill: 'athletics' })).actor.id, 'player');
  out = E.resolveAction(out.state, { type: 'check-roller', roller: 'best' });
  assert.equal(out.state.story.heroRolls, undefined);
  assert.equal(E.checkPlan(out.state, choice({ skill: 'athletics' })).actor.id, 'orin');
});

test('a check written for a named companion still goes to that companion', () => {
  const s = makeSandbox({ classId: 'fighter', level: 5 });
  assert.equal(E.checkPlan(s, choice({ skill: 'arcana', companion: 'maren' })).actor.id, 'maren');
});

test('companions gain expertise in their signature skill from level 21', () => {
  const at = (level) => { const s = makeSandbox({ classId: 'wizard', level: 10 }); const orin = s.party.find(m => m.id === 'orin'); orin.level = level; return E.checkPlan(s, choice({ skill: 'athletics' }), orin).bonus; };
  const low = at(20), high = at(21);
  assert.ok(high - low >= 2, `${high} vs ${low}: expertise doubles proficiency`);
});

test('the scene says who rolls and what the hero would have had', () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  const node = E.currentNode(s), before = node.choices;
  node.choices = [...(before || []), choice({ skill: 'athletics' })];
  let seen;
  try { seen = E.buildView(s).scene.choices.find(c => c.id === 'probe').check; } finally { node.choices = before; }
  assert.equal(seen.actorId, 'orin');
  assert.ok(seen.hero && typeof seen.hero.probability === 'number');
  assert.ok(seen.probability >= seen.hero.probability);
});

test('old saves load without a roller setting and only keep heroRolls when true', () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  s.story.heroRolls = false;
  const n = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.equal('heroRolls' in n.story, false);
  s.story.heroRolls = true;
  assert.equal(E.normalizeIncomingState(JSON.parse(JSON.stringify(s))).story.heroRolls, true);
});

test('the party card lists what each companion is best at', () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  const orin = E.buildView(s).party.find(m => m.id === 'orin');
  assert.equal(orin.strengths.length, 3);
  assert.equal(orin.strengths[0].name, 'Athletics');
  assert.ok(orin.strengths[0].bonus >= orin.strengths[2].bonus);
});

test('a companion who would disapprove never rolls the check for the hero', () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  const c = { ...choice({ skill: 'insight' }), success: { approval: { maren: -2 } }, failure: {} };
  assert.notEqual(E.checkPlan(s, c).actor.id, 'maren');
  assert.equal(E.checkPlan(s, choice({ skill: 'insight' })).actor.id, 'maren');
});

test("the hero always rolls their own improvised actions and checks marked for the hero", () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  assert.equal(E.checkPlan(s, choice({ skill: 'athletics', hero: true })).actor.id, 'player');
  const preview = E.previewImprovised(s, { intent: 'Haul the gate open', skill: 'athletics', difficulty: 'moderate', success: 'It opens.', failure: 'It holds.', risk: 'none', reward: 'none' });
  assert.equal(preview.ok, true);
  assert.equal(preview.check.actor, s.player.name);
});

test('switching who rolls keeps the last story result on screen', () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  s.story.lastOutcome = { kind: 'story', title: 'T', text: 'Before.' };
  const out = E.resolveAction(s, { type: 'check-roller', roller: 'hero' });
  assert.equal(out.state.story.lastOutcome.text, 'Before.');
});

test('the narrator is told which companion rolled', () => {
  const N = require('../src/narrator');
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  const events = [{ type: 'roll', text: 'Orin rolled', roll: { actorId: 'orin', actor: 'Orin Stoneward' } }];
  assert.match(N.buildNarratorPrompt(s, E.buildView(s), { type: 'story-choice', choiceId: 'x' }, events), /Check rolled by: Orin Stoneward/);
  s.lastNarration = 'The scene.';
  assert.equal(N.deterministicFallback(s, E.buildView(s), { type: 'check-roller' }, []), 'The scene.');
});

test('the toggle is offered only while a companion could roll', () => {
  const s = makeSandbox({ classId: 'wizard', level: 5 });
  assert.equal(E.buildView(s).scene.companionsCanRoll, true);
  for (const m of s.party) m.hp = 0;
  assert.equal(E.buildView(s).scene.companionsCanRoll, false);
});
