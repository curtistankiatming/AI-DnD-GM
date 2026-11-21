'use strict';
// A check's written result names whoever rolled it (UX review, 21 November
// 2026): the hero, or the companion best placed for it (engine.js checkPlan).
// Results are written with tokens (src/expansion.js forRoller) that read
// exactly as before when the hero rolls.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world');
const { STORY_NODES } = require('../src/content');
const { QUESTS, forRoller, outcomeForRoller } = require('../src/expansion');
const high = () => .999999;
const hero = { id: 'player' }, orin = { id: 'orin' }, maren = { id: 'maren' }, nessa = { id: 'nessa' };

test('tokens read as the hero, or name the companion with their own pronouns', () => {
  const t = '{You stand|@ stands} up and {speak|speaks}, and they look at {them}. {Your} voice carries; {they} {know|knows} it, and so does {their} friend.';
  assert.equal(forRoller(t, hero), 'You stand up and speak, and they look at you. Your voice carries; you know it, and so does your friend.');
  assert.equal(forRoller(t, null), forRoller(t, hero));
  assert.equal(forRoller(t, orin), "Orin stands up and speaks, and they look at him. Orin's voice carries; he knows it, and so does his friend.");
  assert.equal(forRoller(t, maren), "Maren stands up and speaks, and they look at her. Maren's voice carries; she knows it, and so does her friend.");
  assert.equal(forRoller('{They} {ask|asks}.', nessa), 'She asks.');
  assert.equal(forRoller('No tokens here, you see.', orin), 'No tokens here, you see.');
});

test('roller and notRoller pick a line for whoever rolled, then leave no trace', () => {
  const outcome = { dialogue: [
    { narration: '{You read|@ reads} the list.', when: { notRoller: 'maren', party: 'maren' } },
    { narration: 'Maren reads her own list.', when: { roller: 'maren' } },
    { narration: 'Only the hero.', when: { roller: 'hero' } },
    { narration: 'Any companion.', when: { roller: 'companion' } }
  ], text: 'x' };
  const lines = (a) => outcomeForRoller(outcome, a).dialogue;
  assert.deepEqual(lines(hero).map((l) => l.narration), ['You read the list.', 'Only the hero.']);
  assert.deepEqual(lines(orin).map((l) => l.narration), ['Orin reads the list.', 'Any companion.']);
  assert.deepEqual(lines(maren).map((l) => l.narration), ['Maren reads her own list.', 'Any companion.']);
  // Other conditions stay for liveLines; the roller's are settled.
  assert.deepEqual(lines(orin)[0].when, { party: 'maren' });
  assert.equal(lines(maren)[0].when, undefined);
  assert.equal(outcomeForRoller(outcome, orin).text, 'Orin reads the list.\nAny companion.');
  assert.equal(outcomeForRoller({ text: '{Your} hand.' }, nessa).text, "Nessa's hand.");
});

// Every written check result, for every roller: no token is left unread and no roller condition is left on a line.
test('every check result in the written books reads cleanly for the hero and each companion', () => {
  let checked = 0;
  for (const node of Object.values(STORY_NODES)) for (const c of node.choices || []) {
    if (!c.check) continue;
    for (const key of ['success', 'failure']) for (const actor of [hero, orin, maren, nessa]) {
      const o = outcomeForRoller(c[key], actor); if (!o) continue; checked++;
      const said = o.dialogue ? o.dialogue.map((l) => l.narration || l.text).join(' ') : o.text || '';
      assert.doesNotMatch(said, /[{}@]/, `${node.id} ${c.id} ${key} for ${actor.id}`);
      for (const l of o.dialogue || []) assert.ok(!l.when || !('roller' in l.when || 'notRoller' in l.when), `${node.id} ${c.id}`);
    }
  }
  assert.ok(checked > 1000);
  // Nowhere else in the story may use them: they are read only for checks.
  for (const node of Object.values(STORY_NODES)) {
    assert.doesNotMatch(node.opening || '', /\{(You|you|Your|your|They|they|Them|them|Their|their)\}|\{[^{}]*\|[^{}]*\}/, node.id);
    for (const c of node.choices || []) if (c.result) assert.doesNotMatch(JSON.stringify(c.result), /\{(You|you|your|they|them|their)\}/, `${node.id} ${c.id}`);
  }
});

test('the trial and the Second Oath are the hero\'s own: the hero always rolls them', () => {
  for (const [id, field] of [['trial', 'investigate'], ['trial', 'careful'], ['trial', 'resolve'], ['oath', 'investigate'], ['oath', 'careful'], ['oath', 'resolve'], ['aftermath', 'resolve']]) {
    const node = Object.values(STORY_NODES).find((n) => n.questId === id && n.choices?.some((c) => c.id === field));
    assert.equal(node.choices.find((c) => c.id === field).check.hero, true, `${id} ${field}`);
  }
  // A chapter that is nobody's in particular is still rolled by whoever is best.
  const chairs = STORY_NODES['q-chairs-start'].choices.find((c) => c.id === 'investigate');
  assert.equal(chairs.check.hero, undefined);
});

function ready(id) {
  const q = QUESTS[id];
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  s.player.progression.mastery = true; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', q.town]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`; W.init(s);
  s = E.resolveAction(s, { type: 'recruit' }, high).state;
  s.story.nodeId = `q-${id}-crisis`; s.world.activeQuest = id; s.world.onExpedition = true;
  s.story.flags[`prepared:${id}`] = true; s.story.flags[`approach:${id}`] = true; s.story.clues.push(`${id}-evidence`);
  return s;
}

test('in play, a companion\'s roll is told with their name, and the hero\'s as before', () => {
  // Fenmere's song: a performance check. Make Maren far better at it than the hero.
  const s = ready('fenmere');
  s.player.abilities.cha = 1;
  const m = s.party.find((p) => p.id === 'maren'); m.abilities.cha = 30;
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'resolve' }, high);
  assert.equal(r.result.ok, true);
  const told = r.state.story.lastOutcome.text;
  assert.match(told, /Maren gets them on their feet/);
  assert.doesNotMatch(told, /You get them on their feet|[{}@]/);
  // The same check rolled by the hero (the player's choice) reads as written before.
  const h = ready('fenmere'); h.story.heroRolls = true;
  const hr = E.resolveAction(h, { type: 'story-choice', choiceId: 'resolve' }, high);
  assert.match(hr.state.story.lastOutcome.text, /You get them on their feet/);
});

test('a job trial, written or drafted by Claude, is rolled by the hero', () => {
  const D = require('../src/director');
  const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  s.player.progression.specialization = P.SPECIALIZATIONS.fighter[0].id;
  const q = D.bound({ ...s, trial: 'third' }, D.writtenTrial(s, 'third'));
  for (const k of ['investigate', 'route', 'peaceful']) assert.equal(q.quest[k].hero, true, k);
});
