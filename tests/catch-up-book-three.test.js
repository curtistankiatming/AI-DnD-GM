'use strict';
// The under-level rules cover Book Three too (hidden unless previewed).
process.env.BRIARWATCH_PREVIEW_BOOKS = '1';
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world');
const { QUESTS } = require('../src/expansion');

test('a Book Three chapter can be started under-levelled, with the same warning and penalty', () => {
  const q = Object.values(QUESTS).find((x) => x.book === 3 && !x.sideJob);
  assert.ok(q, 'Book Three has a chapter');
  const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[q.level - 8], [], 'test fixture');
  s.player.progression.mastery = true; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === q.id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...new Set(['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', q.town])];
  s.world.townId = q.town; s.story.nodeId = `town-${q.town}`; W.init(s);
  const card = E.buildView(s).world.quests.find((c) => c.id === q.id);
  assert.equal(s.player.level, q.level - 7);
  assert.deepEqual([card.underBy, card.underSteps, card.canDepart, card.minLevel], [7, 2, true, q.level - 10]);
});
