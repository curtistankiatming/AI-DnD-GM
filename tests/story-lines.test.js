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
