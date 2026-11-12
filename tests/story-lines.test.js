'use strict';
// Written story nodes and choice outcomes may use spoken "lines" (the format of
// src/data/scenes.json). They compile to structured dialogue plus plain text.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const { STORY_NODES } = require('../src/content');
require('../src/expansion');
const RAW = require('../src/data/story-nodes.json');
const rng = () => 0.99; // every check succeeds
function act(s, a) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, r.result.error); return r.state; }
const choose = (s, id) => act(s, { type: 'story-choice', choiceId: id });

test('every written line compiles to a speaker or narration, and to text', () => {
  for (const node of Object.values(STORY_NODES)) {
    if (node.lines) {
      assert.ok(node.dialogue.length && node.opening.length, `${node.id} has dialogue and text`);
      for (const l of node.dialogue) assert.ok(l.narration || (l.speaker && l.text), `${node.id} line`);
    }
    for (const c of node.choices || []) for (const key of ['success', 'failure', 'result']) {
      const o = c[key];
      if (o && o.lines) assert.ok(o.dialogue.length && o.text, `${node.id}/${c.id}/${key} compiles`);
    }
  }
  assert.ok(RAW['briarwatch-square'].lines, 'the opening is written as lines');
});

test('the opening shows the village speaking, and a check outcome keeps its lines', () => {
  let s = E.createNewGame({ name: 'Lines', classId: 'fighter' });
  const opening = E.buildView(s).scene.lastOutcome;
  assert.equal(opening.dialogue[2].speaker, 'Aveline');
  assert.match(opening.text, /Gloam/);
  s = choose(s, 'inspect-rope');
  const lo = s.story.lastOutcome;
  assert.equal(lo.dialogue[1].speaker, 'Orin');
  assert.equal(lo.dialogue[1].speakerId, 'orin');
  assert.match(lo.text, /^Under the rain-dark fibres/);
  assert.ok(s.story.clues.includes('black-wax'), 'the clue and item still arrive');
});

test("Dera's forge is a once-only talk that pays no XP and returns to a short revisit line", () => {
  let s = E.createNewGame({ name: 'Lines', classId: 'fighter' });
  s = choose(s, 'visit-dera');
  assert.equal(s.story.nodeId, 'dera-forge');
  const xp = s.player.xp, orin = s.party.find((m) => m.id === 'orin').bond;
  s = choose(s, 'keep-lit');
  assert.equal(s.player.xp, xp, 'forge choices pay no XP');
  assert.equal(s.party.find((m) => m.id === 'orin').bond, orin + 1);
  assert.equal(s.story.nodeId, 'briarwatch-square');
  const lo = s.story.lastOutcome;
  assert.equal(lo.dialogue[0].speaker, 'Dera', 'her reply comes first');
  assert.match(lo.dialogue.at(-1).narration, /^Back in the square/, 'then the short revisit line, not the whole opening');
  assert.ok(s.story.flags.blackLanternKnown);
  assert.equal(E.resolveAction(s, { type: 'story-choice', choiceId: 'visit-dera' }, rng).result.ok, false, 'the forge visit happens once');
});

// Fixes from the Codex reviews of 12 November 2026 (docs/reviews/).
test('Nessa brings her own kit when rescued in the hollow, as she does from the guild', () => {
  let s = E.createNewGame({ name: 'Kit', classId: 'fighter' });
  s.story.nodeId = 'mist-hollow';
  s = choose(s, 'quiet-release');
  const nessa = s.party.find((m) => m.id === 'nessa');
  assert.equal(nessa.equipment.mainHand, 'shortbow');
  assert.equal(nessa.equipment.armor, 'studded-leather');
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.party.find((m) => m.id === 'nessa').equipment.mainHand, 'shortbow', 'and keeps it after loading');
});

test('Lysa leaves once: mercy and threats are alternatives', () => {
  let s = E.createNewGame({ name: 'Lysa', classId: 'fighter' });
  s.story.nodeId = 'ambush-aftermath';
  s = choose(s, 'offer-mercy');
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'threaten-lookout' }, rng);
  assert.equal(r.result.ok, false);
  const shown = E.buildView(s).scene.choices.find((c) => c.id === 'threaten-lookout');
  assert.equal(shown, undefined, 'threats are no longer offered');
});

test('setting out on an expedition shows where the party arrives', () => {
  const W = require('../src/world');
  let s = E.createNewGame({ name: 'Road', classId: 'fighter' });
  s.world.completed.bell = { xp: 0, gold: 0 }; s.story.nodeId = 'town-briarwatch'; W.init(s);
  E.awardXp(s, 400, [], 'diagnostic fixture only');
  const r = E.resolveAction(s, { type: 'depart', questId: 'road' }, rng);
  assert.equal(r.result.ok, true, r.result.error);
  assert.equal(r.state.story.nodeId, 'q-road-start');
  assert.equal(r.result.outcomeText, STORY_NODES['q-road-start'].opening);
  assert.equal(r.state.story.lastOutcome.text, STORY_NODES['q-road-start'].opening);
});
