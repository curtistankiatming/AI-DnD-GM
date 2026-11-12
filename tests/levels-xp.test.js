'use strict';
// Levels 1-100 and how XP is earned (src/xp.js).
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine');
const P = require('../src/progression');
const XP = require('../src/xp');
const D = require('../src/director');
const { proficiencyBonus } = require('../src/rules');
const { ENEMIES, ENCOUNTERS, STORY_NODES } = require('../src/content');
const draft = require('./fixtures/director-draft');

const clone = x => JSON.parse(JSON.stringify(x));
const act = (s, action) => E.resolveAction(s, action, () => 0.999);
function inTown(level, xp = level > 1 ? P.XP_NEXT[level - 1] : 0) {
  const s = E.createNewGame({ name: 'Rhea', classId: 'fighter' });
  s.player.level = level; s.player.xp = xp;
  s.world.completed.bell = { day: 1, quality: 'force' }; s.story.nodeId = 'town-briarwatch'; s.world.townId = 'briarwatch';
  s.story.flags['books:finished'] = true; // Past the written story: full AI adventures, no chapter cap.
  return E.normalizeIncomingState(s);
}
const foes = id => ENCOUNTERS[`quest:${id}`].enemies.map(e => ENEMIES[e]);

test('the level cap is 100 and every level needs a little more XP than the last', () => {
  assert.equal(P.MAX_LEVEL, 100);
  for (let l = 2; l < P.MAX_LEVEL; l++) assert.ok(P.XP_NEXT[l] > P.XP_NEXT[l - 1]);
  for (let l = 10; l < P.MAX_LEVEL; l++) assert.ok(P.levelBand(l) > P.levelBand(l - 1));
  assert.equal(P.XP_NEXT[9], 18900, 'The authored levels 1-10 keep their table.');
  assert.equal(P.RANK_XP, P.levelBand(P.MAX_LEVEL));
  const s = inTown(1); E.awardXp(s, P.XP_NEXT[P.MAX_LEVEL - 1], []);
  assert.equal(s.player.level, P.MAX_LEVEL);
  assert.equal(P.renownRank(s.player), 0, 'Renown starts only after the final level.');
});

test('bounded growth: proficiency stops at +6 and health grows slowly past 20', () => {
  assert.equal(proficiencyBonus(17), 6); assert.equal(proficiencyBonus(100), 6);
  const at = level => { const s = inTown(1); E.awardXp(s, P.XP_NEXT[level - 1], []); return s.player; };
  const h20 = at(20), h100 = at(100);
  assert.equal(h100.maxHp - h20.maxHp, 80 * 2, 'Two HP per level past 20.');
  assert.equal(h100.hitDice.max, 20);
  assert.equal(P.stats(h100).damage - P.stats(h20).damage, 8, '+1 damage per 10 levels past 20.');
});

test('adventure enemies are unchanged up to level 20 and stay inside the d20 past it', () => {
  const f10 = XP.foeStats(XP.challenge({ level: 10 }));
  assert.deepEqual(f10.main, { maxHp: 82, ac: 15, attackBonus: 8, damage: '3d6+5' });
  const f100 = XP.foeStats(XP.challenge({ level: 100 })), f20 = XP.foeStats(XP.challenge({ level: 20 }));
  assert.equal(f100.main.ac, f20.main.ac); assert.equal(f100.main.attackBonus, f20.main.attackBonus);
  assert.ok(f100.main.maxHp > f20.main.maxHp);
});

test('battles are rated against a standard fight for the hero level', () => {
  const s = D.commission(inTown(10), draft(), []); assert.equal(s.ok, true, s.error);
  const id = s.questId;
  // Install the same adventure for checking ratings at other hero levels.
  assert.equal(XP.rate(10, foes(id)), 'hard', 'A standard adventure battle is hard.');
  assert.equal(XP.rate(15, foes(id), 10), 'easy', 'Five levels below rates easy at best.');
  assert.equal(XP.rate(20, foes(id), 10), 'trivial', 'Ten levels below pays nothing.');
  assert.equal(XP.battleXp(10, foes(id)).xp, Math.round(P.levelBand(10) * 0.10 / 10) * 10);
  assert.equal(XP.battleXp(10, foes(id), 'heroic').xp, Math.round(P.levelBand(10) * 0.10 / 10) * 10 * 2);
});

test('Normal, Hard and Heroic change the challenge and rewards, and lock on departure', () => {
  let s = inTown(10);
  const made = act(s, { type: 'director-commission', draft: draft() }); s = made.state;
  const id = made.result.questId, normal = clone(s.director.quests[id]), hpNormal = ENEMIES[normal.foe].maxHp;
  const card = made.view.world.quests.find(q => q.id === id);
  assert.equal(card.tier, 'normal'); assert.deepEqual(card.tiers.map(t => t.id), ['normal', 'hard', 'heroic']);
  let out = act(s, { type: 'adventure-tier', questId: id, tier: 'heroic' }); assert.equal(out.result.ok, true, out.result.error); s = out.state;
  const heroic = s.director.quests[id];
  assert.equal(heroic.id, id); assert.equal(heroic.tier, 'heroic');
  assert.equal(heroic.xp, normal.xp * 2); assert.equal(heroic.gold, normal.gold * 2);
  assert.ok(ENEMIES[heroic.foe].maxHp > hpNormal);
  assert.equal(XP.rate(10, foes(id)), 'deadly');
  assert.match(STORY_NODES[`q-${id}-start`].act, /Heroic/);
  assert.equal(E.normalizeIncomingState(clone(s)).director.quests[id].tier, 'heroic', 'The choice survives a reload.');
  assert.equal(act(s, { type: 'adventure-tier', questId: id, tier: 'mythic' }).result.ok, false);
  s = act(s, { type: 'depart', questId: id }).state;
  assert.match(act(s, { type: 'adventure-tier', questId: id, tier: 'normal' }).result.error, /fixed once you set out/);
});

test('winning an adventure battle pays by its rating once', () => {
  let s = inTown(10);
  const made = act(s, { type: 'director-commission', draft: draft() }); s = made.state; const id = made.result.questId;
  s = act(s, { type: 'depart', questId: id }).state;
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'direct' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'confront' }).state;
  assert.equal(s.combat.active, true);
  for (const a of s.combat.actors) if (a.team === 'enemy') a.hp = 1;
  const xp = s.player.xp, events = [];
  const W = require('../src/world');
  W.awardBattleXp(s, id, events, { awardXp: E.awardXp });
  assert.equal(s.player.xp - xp, XP.battleXp(10, foes(id)).xp);
  assert.ok(events.some(e => /Won a hard battle/.test(e.text)));
  W.awardBattleXp(s, id, events, { awardXp: E.awardXp });
  assert.equal(s.player.xp - xp, XP.battleXp(10, foes(id)).xp, 'Paid once.');
});

test('old saves at the old level 10 cap turn their extra XP into levels', () => {
  const s = E.createNewGame({ name: 'Rhea', classId: 'fighter' });
  s.player.level = 10; s.player.xp = P.XP_NEXT[9] + 3 * 4000 + 100;
  s.player.progression = { choices: {}, talents: [], boons: { vigor: 2, warding: 1 } };
  const n = E.normalizeIncomingState(s);
  assert.ok(n.player.level > 10);
  assert.ok(n.player.xp >= P.XP_NEXT[n.player.level - 1] && n.player.xp < P.XP_NEXT[n.player.level]);
  assert.deepEqual(n.player.progression.boons, {}, 'Boons wait until renown starts after the final level.');
  assert.ok(n.logs.some(l => /level cap is now 100/.test(l.message)));
  for (const m of n.party) assert.equal(m.level, n.player.level);
});
