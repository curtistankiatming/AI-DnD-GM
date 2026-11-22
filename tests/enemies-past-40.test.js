'use strict';
// Enemies past level 40 (22 November 2026): the gear of levels 45 to 100,
// its set bonuses and the 3rd and 4th jobs had outgrown the standard fight, so
// each level past 40 now adds enemy health, damage and (every 15 levels) +1 to
// hit (src/xp.js LATE_*). Levels 1 to 40 are unchanged.
// See docs/reviews/claude-enemies-past-40-2026-11-22.md. No paid API calls.
const test = require('node:test'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const E = require('../src/engine'), P = require('../src/progression'), XP = require('../src/xp'), G = require('../src/equipment');
const { CLASSES } = require('../src/content');
const { createSeededRng } = require('../src/rules');
const JOBS = require('../src/data/jobs.json').classes;
const draft = require('./fixtures/director-draft');

test('levels 1 to 40 are exactly as before, on every tier', () => {
  const rows = [];
  for (let level = 1; level <= 40; level++) for (const tier of ['normal', 'hard', 'heroic']) {
    assert.equal(XP.challenge({ level, tier }).late, 0, `level ${level}`);
    const f = XP.foeStats(XP.challenge({ level, tier }));
    rows.push([level, tier, f.main.maxHp, f.main.ac, f.main.attackBonus, f.main.damage, f.retainer.maxHp, f.retainer.ac, f.retainer.attackBonus, f.retainer.damage, XP.reference(level)]);
  }
  // Digest of the table above, taken from the code before the change (commit c5359ae).
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'), '6937e4430d65edd8cc525157dd57ec5f974b1b509836be5c74be6d378798e678');
  assert.deepEqual(XP.foeStats(XP.challenge({ level: 40 })), { main: { maxHp: 129, ac: 18, attackBonus: 13, damage: '6d6+34' }, retainer: { maxHp: 83, ac: 17, attackBonus: 9, damage: '1d6+34' } });
  assert.equal(XP.reference(40), 13320);
});

test('past 40 enemies gain health, damage and a little to hit each level, and stop at 100', () => {
  assert.equal(XP.LATE_LEVEL, 40);
  assert.deepEqual([41, 50, 100, 140].map(XP.lateLevels), [1, 10, 60, 60]);
  const at = level => XP.foeStats(XP.challenge({ level }));
  assert.deepEqual(at(50), { main: { maxHp: 146, ac: 18, attackBonus: 13, damage: '6d6+38' }, retainer: { maxHp: 94, ac: 17, attackBonus: 9, damage: '1d6+38' } });
  assert.deepEqual(at(70), { main: { maxHp: 189, ac: 18, attackBonus: 15, damage: '7d6+51' }, retainer: { maxHp: 122, ac: 17, attackBonus: 11, damage: '1d6+51' } });
  assert.deepEqual(at(100), { main: { maxHp: 334, ac: 18, attackBonus: 17, damage: '9d6+69' }, retainer: { maxHp: 217, ac: 17, attackBonus: 13, damage: '1d6+69' } });
  // Enemy AC never grows past 20; every number grows level by level.
  let last = at(40);
  for (let level = 41; level <= 100; level++) {
    const f = at(level);
    assert.equal(f.main.ac, last.main.ac, `AC at ${level}`);
    assert.ok(f.main.maxHp >= last.main.maxHp && f.main.attackBonus >= last.main.attackBonus && XP.averageDamage(f.main.damage) >= XP.averageDamage(last.main.damage), `level ${level}`);
    last = f;
  }
});

test('battle ratings use the same scale: the standard battle still rates hard, an old one less', () => {
  for (const level of [41, 45, 50, 60, 70, 80, 90, 100]) {
    const f = XP.foeStats(XP.challenge({ level }));
    assert.equal(XP.reference(level), XP.threat(f.main) + 2 * XP.threat(f.retainer), `reference at ${level}`);
    assert.equal(XP.rate(level, [f.main, f.retainer, f.retainer]), 'hard', `standard battle at ${level}`);
    // The same written enemies, fought 9 levels later (no level cap applies), are worth less.
    if (level <= 91) assert.notEqual(XP.rate(level + 9, [f.main, f.retainer, f.retainer], level + 9), 'hard', `level ${level} foes at ${level + 9}`);
  }
  // A written chapter at its level (Book Four at 41) gets the scale through XP.challenge.
  assert.equal(XP.foeStats(XP.challenge({ level: 41 })).main.maxHp, Math.round((22 + P.powerLevel(41) * 6) * XP.HP_TRIM * (1 + XP.LATE_HP)));
});

// ---- A deterministic simulation: the standard adventure fight by force ------
// The hero (fighter, rogue, wizard or cleric) and Orin and Maren in the best shop gear of their level (no Masterwork),
// fighting a boss and two retainers. The policy uses job and gear skills, then
// plain attacks (as scripts/balance-sim.js).
const KIT = {
  40: { rogue: ['bramblesteel-rapier', 'duelist-buckler-fine', 'wardsmith-scale', 'watchfire-brooch'], cleric: ['hourbell-staff', 'bell-iron-shield', 'wardsmith-plate', 'watchfire-brooch'], fighter: ['bellward-longsword', 'bell-iron-shield', 'wardsmith-plate', 'watchfire-brooch'], wizard: ['hourbell-staff', 'tollbridge-buckler', 'wardsmith-scale', 'watchfire-brooch'], bard: ['hourbell-staff', 'tollbridge-buckler', 'wardsmith-scale', 'watchfire-brooch'], orin: ['bellward-longsword', 'bell-iron-shield', 'wardsmith-plate', 'watchfire-brooch'], maren: ['hourbell-staff', 'tollbridge-buckler', 'wardsmith-scale', 'watchfire-brooch'] },
  50: { rogue: ['icicle-stiletto', 'duelist-buckler-fine', 'ridgeguard-scale', 'avalanche-horn'], cleric: ['aurora-staff', 'bell-iron-shield', 'wardsmith-plate', 'avalanche-horn'], fighter: ['rimeheart-longsword', 'bell-iron-shield', 'wardsmith-plate', 'avalanche-horn'], wizard: ['aurora-staff', 'warded-buckler', 'ridgeguard-scale', 'avalanche-horn'], bard: ['aurora-staff', 'warded-buckler', 'ridgeguard-scale', 'avalanche-horn'], orin: ['rimeheart-longsword', 'bell-iron-shield', 'wardsmith-plate', 'avalanche-horn'], maren: ['aurora-staff', 'warded-buckler', 'ridgeguard-scale', 'avalanche-horn'] },
  70: { rogue: ['thornstep-rapier', 'duelist-buckler-fine', 'summit-scale', 'avalanche-horn'], cleric: ['hearthward-staff', 'summit-wall-shield', 'summitforged-plate', 'avalanche-horn'], fighter: ['bellwarden-hammer', 'bellwarden-shield', 'bellwarden-plate', 'avalanche-horn'], wizard: ['lamplit-staff', 'warded-buckler', 'summit-scale', 'avalanche-horn'], bard: ['chorus-baton', 'warded-buckler', 'summit-scale', 'avalanche-horn'], orin: ['bellwarden-hammer', 'bellwarden-shield', 'bellwarden-plate', 'avalanche-horn'], maren: ['hearthward-staff', 'hearthward-buckler', 'summit-scale', 'avalanche-horn'] },
  100: { rogue: ['songsteel-rapier', 'duelist-buckler-fine', 'hundredfold-scale', 'hundredth-bell'], cleric: ['dawnhearth-rod', 'dawnhearth-aegis', 'hallowsteel-plate', 'avalanche-horn'], fighter: ['highbell-warhammer', 'highbell-tower-shield', 'highbell-plate', 'avalanche-horn'], wizard: ['starward-staff', 'stormglass-buckler', 'hundredfold-scale', 'avalanche-horn'], bard: ['grand-chorus-baton', 'stormglass-buckler', 'hundredfold-scale', 'avalanche-horn'], orin: ['highbell-warhammer', 'highbell-tower-shield', 'highbell-plate', 'avalanche-horn'], maren: ['dawnhearth-rod', 'dawnhearth-aegis', 'dawnhearth-hauberk', 'avalanche-horn'] }
};
function party(classId, level, branch = JOBS[classId].branches[0].id) {
  const s = E.createNewGame({ name: 'Rhea', classId });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  s.world.completed.bell = { day: 1, quality: 'force' }; s.world.completed.trial = { day: 1 };
  s.story.nodeId = 'town-briarwatch'; s.world.townId = 'briarwatch';
  Object.assign(s.player.progression, { mastery: true, specialization: branch, thirdJob: level >= P.THIRD_JOB_LEVEL, fourthJob: level >= P.FOURTH_JOB_LEVEL });
  const out = E.normalizeIncomingState(s);
  for (const a of [out.player, ...out.party]) {
    const [mainHand, offHand, armor, accessory] = KIT[level][a.id === 'player' ? classId : a.id];
    for (const id of [mainHand, offHand, armor, accessory]) E.addItem(out, id, 1, []);
    a.equipment = { mainHand, offHand, armor, accessory };
  }
  G.normalizeEquipment(out);
  out.player.resources = P.resources(CLASSES[classId], out.player.level, out.player);
  for (const a of [out.player, ...out.party]) a.hp = a.maxHp;
  return out;
}
function choose(v, used) {
  const c = v.combat, ok = id => c.actions.find(a => a.id === id && !a.disabled);
  const target = c.actors.filter(a => a.team === 'enemy' && a.hp > 0).sort((a, b) => a.hp - b.hp)[0];
  if (c.actors.find(a => a.id === 'player').hp <= 0) return { actionId: ok('death-save') ? 'death-save' : 'end-turn' };
  if (!c.order && ok('order:focus') && target) return { actionId: 'order:focus', targetId: target.id };
  const skill = cost => c.actions.find(a => !a.disabled && a.cost === cost && /^(job|spec|gear):/.test(a.id) && a.targetKind !== 'ally' && !used.has(`${c.round}:${a.id}`));
  for (const [cost, done] of [['bonus', c.economy.bonusUsed], ['action', c.economy.actionUsed]]) {
    if (done || !target) continue;
    const k = skill(cost);
    if (k) { used.add(`${c.round}:${k.id}`); return { actionId: k.id, targetId: k.targetKind === 'enemy' ? target.id : k.targetKind === 'self' ? 'player' : undefined }; }
    if (cost === 'action') for (const id of ['magic-missile', 'fire-bolt', 'weapon-attack']) if (ok(id)) return { actionId: id, targetId: target.id };
  }
  return { actionId: 'end-turn' };
}
const THEMES = ['wild', 'undead', 'storm', 'construct', 'soldier', 'caster'];
function fight(s, tier, seed) {
  const rng = createSeededRng(seed);
  let o = E.resolveAction(s, { type: 'director-commission', draft: { ...draft(), enemyTheme: THEMES[seed % THEMES.length] } }, rng); s = o.state;
  const id = o.result.questId;
  if (tier !== 'normal') s = E.resolveAction(s, { type: 'adventure-tier', questId: id, tier }, rng).state;
  for (const a of [{ type: 'depart', questId: id }, { type: 'story-choice', choiceId: 'advance' }, { type: 'story-choice', choiceId: 'direct' }, { type: 'story-choice', choiceId: 'confront' }]) {
    o = E.resolveAction(s, a, rng); s = o.state; assert.equal(o.result.ok, true, o.result.error);
  }
  for (const a of s.combat.actors.filter(a => a.team === 'party')) a.hp = a.maxHp;
  const max = s.combat.actors.find(a => a.id === 'player').maxHp;
  const used = new Set();
  let v = o.view, rounds = 0, low = max, steps = 0;
  while (v.combat?.active && steps++ < 400) {
    rounds = v.combat.round;
    o = E.resolveAction(s, { type: 'combat', ...choose(v, used) }, rng);
    if (!o.result.ok) o = E.resolveAction(s, { type: 'combat', actionId: 'end-turn' }, rng);
    s = o.state; v = o.view;
    const me = s.combat?.actors?.find(a => a.id === 'player');
    if (me) low = Math.min(low, Math.max(0, me.hp));
  }
  const won = /-after$/.test(s.story.nodeId);
  return { won, rounds, lost: won ? 1 - low / max : 1, stuck: steps >= 400 };
}
function measure(level, tier, heroes = [['fighter'], ['rogue'], ['wizard'], ['cleric']]) {
  const r = [];
  for (const [classId, branch] of heroes) { const s = party(classId, level, branch); for (let i = 0; i < 6; i++) r.push(fight(JSON.parse(JSON.stringify(s)), tier, 500 + i * 7919 + level)); }
  const avg = f => r.reduce((t, x) => t + f(x), 0) / r.length;
  return { rounds: avg(x => x.rounds), lost: avg(x => x.lost), wins: r.filter(x => x.won).length, stuck: r.filter(x => x.stuck).length, n: r.length };
}

// Before the change the hero lost about half as much health at 70 and a
// fifth to a third as much at 100 as at 40 (the review has the numbers).
test('fights by force past 40 stay in the level 40 band: as long, about as much health lost, no soft-locks', () => {
  const got = {};
  for (const level of [40, 50, 70, 100]) for (const tier of ['normal', 'heroic']) {
    const m = got[`${level}:${tier}`] = measure(level, tier);
    if (process.env.DEBUG_LATE) console.log(level, tier, JSON.stringify(m));
    assert.equal(m.stuck, 0, `${level} ${tier}: no fight runs out of steps`);
    assert.ok(m.wins >= m.n - 1, `${level} ${tier}: the party wins (${m.wins}/${m.n})`);
    if (level === 40) continue;
    const base = got[`40:${tier}`];
    assert.ok(m.rounds >= base.rounds - 0.25 && m.rounds <= 7, `${level} ${tier}: ${m.rounds.toFixed(2)} rounds (level 40: ${base.rounds.toFixed(2)})`);
    // Pressure stays near level 40's: at most one and a half times, and at
    // least three quarters from 70 (half at 50, which has no to-hit step yet).
    const floor = level >= 70 ? 0.75 : 0.5;
    assert.ok(m.lost >= floor * base.lost && m.lost <= 1.5 * base.lost, `${level} ${tier}: hero loses ${Math.round(m.lost * 100)}% of their health at worst (level 40: ${Math.round(base.lost * 100)}%)`);
  }
  for (const level of [50, 70, 100]) assert.ok(got[`${level}:heroic`].rounds >= got[`${level}:normal`].rounds, `${level}: heroic lasts at least as long`);
});

// A bard branch stays inside Book Three's 7-round cap by force past 40.
// Battlecantor and Envoy already run past it and are a follow-up in the
// review, not part of this change.
test('a bard branch stays inside the 7-round cap past 40', () => {
  for (const level of [50, 70, 100]) for (const tier of ['normal', 'heroic']) {
    const m = measure(level, tier, [['bard', 'lorekeeper']]);
    if (process.env.DEBUG_LATE) console.log('bard', level, tier, JSON.stringify(m));
    assert.equal(m.stuck, 0, `${level} ${tier}: no fight runs out of steps`);
    assert.ok(m.wins >= m.n - 1, `${level} ${tier}: the party wins (${m.wins}/${m.n})`);
    assert.ok(m.rounds <= 7, `${level} ${tier}: ${m.rounds.toFixed(2)} rounds`);
  }
});
