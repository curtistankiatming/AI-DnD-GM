'use strict';
// Book Four items review (22 November 2026, docs/reviews/claude-book-four-items-2026-11-22.md):
// the shop's shelves on a phone, the heavy armour curve from 40 to 50, and the
// Thrum Lane Cloak. Every Book Four part is previewed, with fixture chapters for
// any not written (tests/fixtures/book-four.js); node --test runs this file in
// its own process. Nothing here calls the paid API.
require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world');
const { QUESTS } = require('../src/expansion');
const { ITEMS } = require('../src/content');

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
// A fighter in the town where a Book Four chapter starts, every chapter before it done.
function ready(id, { level = QUESTS[id].level, classId = 'fighter' } = {}) {
  const q = QUESTS[id];
  const s = E.createNewGame({ name: 'Rowan', classId });
  if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  s.world.completed.bell = { xp: 0, gold: 0 };
  const reached = new Set(FREE_TOWNS);
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; if (other.nextTown) reached.add(other.nextTown); }
  s.world.unlockedTowns = [...reached]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true }); W.init(s);
  return s;
}
const shopOf = (s) => E.buildView(s).world.shop;
const usable = (i) => i.comparisons.some((c) => !c.unmet);

test('a big shop puts gear for the hero\'s level first, then supplies, and folds the rest without dropping any of it', () => {
  const s = ready('b4-invoice');
  assert.equal(s.world.townId, 'highpass');
  const shop = shopOf(s), level = s.player.level;
  assert.ok(shop.length >= 60, `Highpass sells ${shop.length} things in Part Three`);
  assert.deepEqual(shop.map((i) => i.id).sort(), W.townStock(s, 'highpass').slice().sort(), 'every item is still on sale');
  const order = shop.map((i) => i.shelf);
  assert.deepEqual([...new Set(order)], ['gear', 'supplies', 'more'], 'gear, then supplies, then the fold');
  const gear = shop.filter((i) => i.shelf === 'gear');
  assert.ok(gear.length > 0 && gear.length <= 15, `${gear.length} gear cards before the supplies`);
  for (const i of gear) { assert.ok(i.level >= level - W.SHELF_SPAN, `${i.id} is recent`); assert.ok(usable(i), `${i.id} fits somebody`); }
  for (let k = 1; k < gear.length; k++) assert.ok(gear[k - 1].level >= gear[k].level, 'newest first');
  for (const i of shop.filter((x) => x.shelf === 'more')) assert.ok(i.comparisons.length && (i.level < level - W.SHELF_SPAN || !usable(i)), `${i.id} is older or fits nobody`);
  for (const i of shop.filter((x) => x.shelf === 'supplies')) assert.equal(i.comparisons.length, 0, i.id);
});

test('a shop with nothing recent still opens on the newest gear the party can wear', () => {
  // Briarwatch at 69 sells nothing newer than tier 40 until the hero reaches 70.
  const s = ready('b4-parting');
  const shop = shopOf(s), gear = shop.filter((i) => i.shelf === 'gear');
  assert.ok(gear.length, 'some gear is on the first shelf');
  const top = Math.max(...shop.filter((i) => i.comparisons.length && usable(i)).map((i) => i.level));
  assert.ok(gear.every((i) => i.level >= Math.min(s.player.level - W.SHELF_SPAN, top)));
  // A new hero's first shop is not folded at all: everything is within reach of level 1.
  const fresh = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  assert.ok(shopOf(fresh).every((i) => i.shelf !== 'more' || !usable(i)));
});

test('the town page draws the shelves: headings, and the rest in a fold that stays open after a purchase', () => {
  const src = fs.readFileSync(path.join(__dirname, '../public/expedition.js'), 'utf8');
  assert.match(src, /Gear for your level · \$\{gear\.length\}/);
  assert.match(src, /Supplies · \$\{supplies\.length\}/);
  assert.match(src, /createElement\('details','smith-fold shop-fold'\)/);
  assert.match(src, /shopFoldOpen\[market\]=fold\.open/);
});

test('heavy armour climbs from 40 to 50: tier 45 and the warm tier 50 plate give up no saves for their AC', () => {
  const saves = (i) => Object.values(i.saveBonuses || {}).reduce((a, b) => a + b, 0);
  const w40 = ITEMS['wardsmith-plate'], f45 = ITEMS['frostforged-plate'], w50 = ITEMS['whitewool-plate'];
  for (const [lo, hi] of [[w40, f45], [f45, w50]]) {
    assert.ok(hi.armor.base >= lo.armor.base, `${hi.id} AC`);
    for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) assert.ok((hi.saveBonuses?.[k] || 0) >= (lo.saveBonuses?.[k] || 0), `${hi.id} ${k} save`);
  }
  assert.ok(saves(w50) > saves(f45) && f45.armor.base > w40.armor.base);
  assert.match(f45.purpose, /\+1 to every saving throw/);
  assert.match(w50.purpose, /\+2 to Strength and Constitution saves/);
});

test('the Thrum Lane Cloak is as good as the warm tier 50 jerkin it is given beside', () => {
  const cloak = ITEMS['thrum-lane-cloak'], jerkin = ITEMS['whitewool-jerkin'];
  assert.equal(cloak.armor.base, jerkin.armor.base);
  assert.ok(cloak.stats.dealt >= jerkin.stats.dealt && cloak.stats.taken <= jerkin.stats.taken);
  assert.ok(cloak.stats.dealt <= 0.1, 'and uses no tier 55 number');
});
