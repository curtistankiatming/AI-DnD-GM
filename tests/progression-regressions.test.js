'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine');
const P = require('../src/progression');
const { CLASSES } = require('../src/content');

for (const classId of Object.keys(CLASSES)) {
  test(`${classId}: Technique capacity follows the advertised 2/5/7/9 milestones`, () => {
    const expected = [0, 2, 2, 2, 3, 3, 4, 4, 5, 5];
    for (let level = 1; level <= 10; level++) {
      assert.equal(P.resources(CLASSES[classId], level).technique?.max || 0,
        expected[level - 1], `Level ${level}`);
    }
  });
}

test('Endurance adds exactly one use without delaying the level-7 milestone', () => {
  const state = E.createNewGame({ classId: 'fighter' });
  E.awardXp(state, P.XP_NEXT[6], [], 'diagnostic fixture');
  const result = E.resolveAction(state, { type: 'choose-reward', level: 5, optionId: 'economy' });
  assert.equal(result.result.ok, true);
  assert.equal(result.state.player.resources.technique.max, 5);
});

test('loading a pre-patch level-7 save raises capacity without restoring spent uses', () => {
  const state = E.createNewGame({ classId: 'wizard' });
  E.awardXp(state, P.XP_NEXT[6], [], 'diagnostic fixture');
  state.player.resources.technique.max = 3;
  state.player.resources.technique.current = 1;
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(state)));
  assert.equal(loaded.player.resources.technique.max, 4);
  assert.equal(loaded.player.resources.technique.current, 1);
  assert.deepEqual(loaded.player.progression, state.player.progression);
});
