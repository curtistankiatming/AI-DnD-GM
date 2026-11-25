'use strict';
// Gritty past level 40 (Curtis, 23 November 2026): hardened enemies.
// See src/xp.js (grittyLate) and docs/reviews/claude-playtest-book-four-2026-11-22.md.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), XP = require('../src/xp'), Power = require('../src/power');
const Director = require('../src/director');
const { createSeededRng } = require('../src/rules');

function fight(difficulty, questId, level = 55, flags = {}) {
  const s = E.createNewGame({ name: 'Rhea', classId: 'fighter', difficulty });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.story.flags, flags);
  const events = [];
  E.startCombat(s, `quest:${questId}`, createSeededRng(7), events);
  return { s, events, enemies: s.combat.actors.filter(a => a.team === 'enemy') };
}

test('only Gritty fights past level 40 have hardened enemies, with a little more health', () => {
  assert.ok(Director.quest(E.createNewGame({ name: 'R', classId: 'fighter' }), 'b4-orme').level > XP.LATE_LEVEL);
  const gritty = fight('gritty', 'b4-orme'), standard = fight('standard', 'b4-orme'), story = fight('story', 'b4-orme');
  assert.ok(gritty.enemies.every(e => e.hardened));
  assert.ok([...standard.enemies, ...story.enemies].every(e => !e.hardened));
  assert.ok(gritty.events.some(e => /hardened/.test(e.text)));
  // Same chapter, same party: Gritty's own scale times the late health.
  const enc = require('../src/content').ENCOUNTERS['quest:b4-orme'];
  const ratio = gritty.enemies[0].maxHp / standard.enemies[0].maxHp;
  const expected = (enc.grittyScale || 1) / (enc.standardScale || 1) * XP.grittyLate(Director.quest(gritty.s, 'b4-orme').level).hp;
  assert.ok(Math.abs(ratio - expected) < 0.02, `${ratio} against ${expected}`);
  // A chapter at level 40 or below is unchanged on Gritty.
  const early = fight('gritty', 'b3-pass', 40);
  assert.ok(Director.quest(early.s, 'b3-pass').level <= XP.LATE_LEVEL);
  assert.ok(early.enemies.every(e => !e.hardened));
});

test('hardened enemies find the gaps in heavy armour, up to a cap', () => {
  assert.equal(XP.grittyArmour(16), 0);
  assert.equal(XP.grittyArmour(XP.GRITTY_ARMOUR_FROM), 0);
  assert.equal(XP.grittyArmour(XP.GRITTY_ARMOUR_FROM + 3 * XP.GRITTY_ARMOUR_STEP), 3);
  assert.equal(XP.grittyArmour(60), XP.GRITTY_ARMOUR_MAX);
});

test("worn gear's damage cut counts only a share against a hardened enemy", () => {
  const target = { team: 'party', gearTaken: -0.3, conditions: [] };
  assert.equal(Power.damageFactor({ conditions: [] }, target), 0.7);
  assert.ok(Math.abs(Power.damageFactor({ hardened: true, conditions: [] }, target) - (1 - 0.3 * XP.GRITTY_GEAR_TAKEN_SHARE)) < 1e-9);
});

test('a careful approach no longer catches Gritty enemies off guard past level 40', () => {
  const flags = { 'approach:b4-orme': true };
  // Surprise can already be spent by the time the hero acts, so look at what the fight said.
  const caught = (r) => r.enemies.some(e => e.conditions.some(c => c.id === 'surprised')) || r.events.some(e => /surprised|off guard/i.test(e.text));
  assert.equal(caught(fight('gritty', 'b4-orme', 55, flags)), false);
  assert.equal(caught(fight('standard', 'b4-orme', 55, flags)), true);
  // The approach still lowers the objective's DC on Gritty.
  const g = fight('gritty', 'b4-orme', 55, flags), plain = fight('gritty', 'b4-orme', 55);
  assert.equal(g.s.combat.objective.dc, plain.s.combat.objective.dc - 1);
});
