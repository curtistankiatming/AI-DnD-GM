'use strict';
// Book Four readable but held at Part One (BRIARWATCH_PREVIEW_PARTS=4:1), as
// players will first have it: Lantry and Orme are closed. A hero who has
// finished Part One waits at level 50, and if one is past it anyway (an older
// save, or XP from before the part was held), Highpass stands in for the
// Wold's shops, without the Wold's warm gear. Fixture chapters stand in for
// the ones not written yet (tests/fixtures/book-four.js); node --test runs each
// file in its own process, so these settings reach no other file.
require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: '4:1' });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const Bounty = require('../src/bounty');
const { QUESTS, TOWNS } = require('../src/expansion');
const { ITEMS } = require('../src/content');

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
function afterPartOne(level) {
  const s = E.createNewGame({ name: 'Rowan', classId: 'wizard' });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: P.JOBS.wizard.branches[0].id, thirdJob: true });
  s.player.gold = 5000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const q of Object.values(QUESTS)) { if (q.sideJob) continue; s.world.completed[q.id] = { xp: 0, gold: 0 }; if (q.id === 'b4-peaks') break; }
  s.world.unlockedTowns = [...FREE_TOWNS]; s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true, b4_partone_done: true }); W.init(s);
  return s;
}
const TIER55 = TOWNS.orme.stockByLevel['55'].filter((id) => !ITEMS[id].warm);

test('after Part One the hero waits at level 50: bounties and the AI can never carry them to 51', () => {
  const s = afterPartOne(50);
  assert.equal(Book.reads(s, 4), true); assert.equal(Book.started(s, 4), true);
  assert.equal(Book.chapter(s).id, 'to-be-continued');
  assert.equal(Book.levelCap(s), 50);
  assert.equal(Number(s.player.xp) + Bounty.room(s), P.XP_NEXT[50] - 1, 'A bounty stops just under level 51');
  assert.equal(Number(s.player.xp) + Book.xpRoom(s), P.XP_NEXT[50] - 1);
  s.player.xp = P.XP_NEXT[50] - 1;
  assert.equal(Bounty.room(s), 0);
  // So at 50 Highpass already sells the tier the hero can use, and no 55.
  const stock = W.townStock(s, 'highpass');
  assert.ok(TOWNS.highpass.stockByLevel['50'].every((id) => stock.includes(id)));
  assert.ok(!stock.some((id) => TIER55.includes(id)));
});

test('a hero past 50 with the Wold closed buys the Wold\'s tier 55 at Highpass, but never its warm gear', () => {
  for (const id of ['lantry', 'orme']) assert.equal(Book.townOpen(afterPartOne(55), id), false, id);
  let s = afterPartOne(55);
  const stock = W.townStock(s, 'highpass');
  for (const id of TIER55) assert.ok(stock.includes(id), `${id} at Highpass`);
  assert.ok(!stock.some((id) => ITEMS[id].warm), 'No warm gear outside the Wold');
  for (const id of stock) assert.doesNotMatch(`${ITEMS[id].name} ${ITEMS[id].description || ''}`, /Wold|Lantry|Orme/, id);
  const shop = E.buildView(s).world.shop;
  assert.ok(shop.some((x) => x.id === 'lamplit-staff'));
  const r = E.resolveAction(s, { type: 'buy', itemId: 'lamplit-staff', quantity: 1 });
  assert.equal(r.result.ok, true, r.result.error);
  s = r.state;
  assert.ok(s.player.inventory.some((e) => e.itemId === 'lamplit-staff'));
});
