'use strict';
// Book Four items review (22 November 2026, docs/reviews/claude-book-four-items-2026-11-22.md):
// the heavy armour curve from 40 to 50, and the
// Thrum Lane Cloak. Every Book Four part is previewed, with fixture chapters for
// any not written (tests/fixtures/book-four.js); node --test runs this file in
// its own process. Nothing here calls the paid API.
require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
require('../src/expansion');
const { ITEMS } = require('../src/content');

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
