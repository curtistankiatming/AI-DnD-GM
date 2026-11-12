'use strict';
// Conversation scenes (src/data/scenes.json) play between an expedition and
// town. Choices change companion approval only: no XP, gold or items.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), W = require('../src/world'), P = require('../src/progression');
const { COMPANIONS, STORY_NODES } = require('../src/content');
const { TOWNS, SCENES, QUESTS } = require('../src/expansion');
const rng = () => 0.5;
function act(s, a) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, r.result.error); return r; }
function afterBridge({ nessa = true } = {}) {
  let s = E.createNewGame({ name: 'Scene test', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[3], [], 'diagnostic fixture only');
  s.world.completed.marsh = { xp: 0, gold: 0 }; s.world.unlockedTowns = Object.keys(TOWNS); s.world.townId = 'ashford'; s.story.nodeId = 'town-ashford'; W.init(s);
  if (nessa) s = act(s, { type: 'recruit' }).state;
  s.story.nodeId = 'q-bridge-after'; s.world.activeQuest = 'bridge'; s.world.onExpedition = true;
  return s;
}
const bond = (s, id) => s.party.find((m) => m.id === id).bond;

test('every scene follows a real expedition and every line and choice resolves', () => {
  for (const scene of Object.values(SCENES).filter((x) => x && x.nodes)) {
    assert.ok(QUESTS[scene.after], `${scene.id} follows a known expedition`);
    assert.ok(scene.nodes[scene.start], `${scene.id} has its start node`);
    for (const id of scene.cast) assert.ok(COMPANIONS[id], `${scene.id} cast ${id}`);
    for (const [key, node] of Object.entries(scene.nodes)) {
      const compiled = STORY_NODES[`scene-${scene.id}-${key}`];
      assert.ok(compiled.dialogue.length && compiled.choices.length, `${scene.id}/${key} has lines and choices`);
      for (const c of compiled.choices) assert.ok(STORY_NODES[c.result.nextNode], `${scene.id}/${key}/${c.id} leads somewhere`);
      for (const c of node.choices || []) for (const id of Object.keys(c.approval || {})) assert.ok(scene.cast.includes(id), `approval for cast only (${id})`);
    }
  }
});

test('the bridge camp scene plays after the bridge, keeps its lines and returns to town', () => {
  let s = afterBridge();
  const xp = s.player.xp;
  s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
  assert.equal(s.story.nodeId, 'scene-bridge-camp-night');
  const view = E.buildView(s);
  assert.equal(view.scene.lastOutcome.dialogue[1].speaker, 'Nessa');
  assert.equal(view.scene.lastOutcome.dialogue[1].text, 'What is this.');
  assert.deepEqual(view.scene.choices.map((c) => c.id), ['didnt-leave', 'tell-truth', 'sometimes', 'sit']);
  const gained = s.player.xp - xp, gold = s.player.gold, items = JSON.stringify(s.player.inventory);

  const maren = bond(s, 'maren');
  let r = act(s, { type: 'story-choice', choiceId: 'tell-truth' }); s = r.state;
  assert.equal(bond(s, 'maren'), maren + 1);
  assert.equal(s.story.nodeId, 'scene-bridge-camp-late-truth');
  // The reply comes first, then the next beat, as one structured scene.
  assert.equal(s.story.lastOutcome.dialogue[0].narration, 'Maren nods before Orin does.');
  assert.match(s.story.lastOutcome.text, /^Maren nods before Orin does\.\nOrin: All of it is a long story\./);
  s = act(s, { type: 'story-choice', choiceId: 'sleep' }).state;
  assert.equal(s.story.nodeId, 'scene-bridge-camp-breakfast');
  s = act(s, { type: 'story-choice', choiceId: 'return' }).state;
  assert.equal(s.story.nodeId, 'town-ashford');
  assert.equal(s.player.xp - xp, gained, 'scene choices pay no XP');
  assert.equal(s.player.gold, gold);
  assert.equal(JSON.stringify(s.player.inventory), items);
  assert.ok(s.world.completed.bridge, 'the expedition was already resolved before the scene');
});

test('a hard answer can cost one companion while pleasing another', () => {
  let s = afterBridge();
  s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
  const orin = bond(s, 'orin'), maren = bond(s, 'maren');
  s = act(s, { type: 'story-choice', choiceId: 'sometimes' }).state;
  assert.equal(bond(s, 'orin'), orin + 1);
  assert.equal(bond(s, 'maren'), maren - 1);
  assert.equal(s.story.nodeId, 'scene-bridge-camp-late');
  s = act(s, { type: 'story-choice', choiceId: 'sleep' }).state;
  assert.equal(s.story.nodeId, 'town-ashford', 'no breakfast scene without the promise');
});

test('a scene whose cast is not all in the party is skipped', () => {
  let s = afterBridge({ nessa: false });
  s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
  assert.equal(s.story.nodeId, 'town-ashford');
  assert.equal(s.story.visitedNodes.some((id) => id.startsWith('scene-')), false);
});

test('a save made in the middle of a scene loads back into it', () => {
  let s = afterBridge();
  s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.story.nodeId, 'scene-bridge-camp-night');
  assert.equal(E.buildView(loaded).scene.lastOutcome.dialogue.length, STORY_NODES['scene-bridge-camp-night'].dialogue.length);
  act(loaded, { type: 'story-choice', choiceId: 'sit' });
});
