"use strict";

// How XP is earned. Every reward is a share of the XP the hero's current level
// needs, so the number of battles and adventures per level stays about the same
// from level 1 to 100. The engine rates each battle by comparing its enemies
// with a standard fight for the hero's level; Claude never sets XP.
const P = require('./progression');

// Share of the current level's band for each kind of reward.
const BATTLE_SHARE = Object.freeze({ trivial: 0, easy: 0.03, normal: 0.06, hard: 0.10, deadly: 0.15 });
const MISSION_SHARE = 0.12;
const QUEST_SHARE = 0.25;
const TRIAL_SHARE = 0.5;   // A job trial (40, 70), once.
// A written chapter pays about 70% of its level (Curtis, 21 November 2026).
// Its battles, side jobs, bounties and AI side quests make up the rest, so a
// player who skips all side content falls a few levels behind.
const CHAPTER_SHARE = 0.7;
const chapterXp = level => share(level, CHAPTER_SHARE);

// Falling behind: a hero more than UNDER_FREE levels under an adventure's
// level faces enemies that hit harder and more often, and harder checks. Each
// level further behind adds one step, up to UNDER_MAX (weighted for the fight
// past level 20, see underSteps). A written chapter can be
// started up to UNDER_FREE + UNDER_MAX levels under its level.
const UNDER_FREE = 5, UNDER_MAX = 5;
const UNDER_DAMAGE = 0.1;   // per step: +10% enemy damage
function underBy(heroLevel, level) {
  return Math.max(0, Math.floor(Number(level) || 1) - Math.floor(Number(heroLevel) || 1));
}
// Past level 20 a level adds little raw power (the jobs carry the growth), so
// being far behind a Book Three chapter barely mattered: each step counts
// UNDER_LATE_WEIGHT times for adventures written past UNDER_LATE_LEVEL.
const UNDER_LATE_LEVEL = 20, UNDER_LATE_WEIGHT = 3;
// Steps for story checks: one per level past UNDER_FREE, never weighted (a
// check 15 harder would be impossible).
function underChecks(heroLevel, level) {
  return Math.min(UNDER_MAX, Math.max(0, underBy(heroLevel, level) - UNDER_FREE));
}
// Steps for the deciding fight: +1 to hit and UNDER_DAMAGE more damage each.
// Only the missing levels past UNDER_LATE_LEVEL are weighted (levels below it
// still add real power), and the total stops at UNDER_LATE_MAX so a fight far
// behind stays hard rather than hopeless.
const UNDER_LATE_MAX = 9;
function underSteps(heroLevel, level) {
  const steps = underChecks(heroLevel, level);
  const late = underChecks(Math.max(Math.floor(Number(heroLevel) || 1), UNDER_LATE_LEVEL), level);
  return late ? Math.min(UNDER_LATE_MAX, steps + late * (UNDER_LATE_WEIGHT - 1)) : steps;
}

// Difficulty a player picks for an AI-written adventure before departing.
// `power` adds levels to enemy health and damage, `accuracy` to AC, enemy
// attacks and DCs; rewards are multiplied.
const TIERS = Object.freeze({
  normal: { id: 'normal', name: 'Normal', power: 0, accuracy: 0, reward: 1, description: 'The standard challenge for your level.' },
  hard: { id: 'hard', name: 'Hard', power: 2, accuracy: 1, reward: 1.5, description: 'Tougher enemies and checks. 1.5 times the XP and gold.' },
  heroic: { id: 'heroic', name: 'Heroic', power: 4, accuracy: 2, reward: 2, description: 'The toughest fight on offer. Twice the XP and gold.' }
});
const tier = id => TIERS[id] || TIERS.normal;

// XP the hero's current level needs; past the final level, one renown rank.
function band(level) {
  const l = Math.max(1, Math.floor(Number(level) || 1));
  return l >= P.MAX_LEVEL ? P.RANK_XP : P.levelBand(l);
}
const share = (level, fraction) => Math.round(band(level) * fraction / 10) * 10;

// Challenge of an adventure. Levels 1-20 behave exactly as before; past 20,
// AC, attack and DCs stop growing and health and damage grow slowly.
// Past 40, `late` (levels past LATE_LEVEL) adds health, damage and a little
// to hit (foeStats). Renown (q.power above q.level) and the chosen tier add on top.
function challenge(q) {
  const level = Math.max(1, Math.floor(Number(q?.level) || 1));
  const renown = Math.max(0, Math.floor(Number(q?.power) || level) - level);
  const t = tier(q?.tier);
  return { accuracy: P.accuracyLevel(level) + t.accuracy, power: P.powerLevel(level) + renown + t.power, vigor: vigor(level), late: lateLevels(level) };
}

// Extra enemy health for the 4th job's levels: none up to 70, rising to +25%
// at 100 so 4th job skills and ultimates do not make battles trivial.
const VIGOR_LEVEL = 70, VIGOR_MAX = 0.25;
function vigor(level) {
  const l = Math.min(P.MAX_LEVEL, Math.max(1, Math.floor(Number(level) || 1)));
  return 1 + VIGOR_MAX * Math.max(0, l - VIGOR_LEVEL) / (P.MAX_LEVEL - VIGOR_LEVEL);
}

// The boss and retainer of an adventure's deciding battle.
// Enemies hit harder by power tier, as the party does from its stats (src/power.js):
// nothing below power 5, then ENEMY_TIER_DAMAGE more per hit for each tier.
// The health trim below adds up to ENEMY_TRIM_DAMAGE more per tier as it eases
// in (3 + 3 = 6 from power 8), so shorter fights stay as dangerous.
const ENEMY_TIER_DAMAGE = 3, ENEMY_TRIM_DAMAGE = 3;
// Past level 40 the gear of levels 45 to 100 (AC, damage dealt, damage taken
// cut), set bonuses and the 3rd and 4th jobs outgrew the enemies: fights by
// force stayed short, but the hero lost a fifth as much health at 100 as at
// 40, because enemy attacks stopped at +13 while gear AC kept rising
// (docs/reviews/claude-enemies-past-40-2026-11-22.md). Each level past
// LATE_LEVEL adds LATE_HP more health and LATE_DAMAGE more damage per hit,
// and every LATE_ATTACK_EVERY levels add +1 to hit (+4 at 100: every 10, as
// first tried, overshot level 40's band with shop gear). Levels 1 to 40 are unchanged.
const LATE_LEVEL = 40, LATE_HP = 0.006, LATE_DAMAGE = 0.3, LATE_ATTACK_EVERY = 15;
const lateLevels = level => Math.max(0, Math.min(P.MAX_LEVEL, Math.floor(Number(level) || 1)) - LATE_LEVEL);
// Gritty past level 40 (Curtis, 23 November 2026). With level gear a party
// went through Book Four on Gritty in about 3 rounds a fight with 95% of its
// health, and stronger enemies alone hit the players who don't shop far harder
// than those who do (docs/reviews/claude-playtest-book-four-2026-11-22.md). So
// Gritty's extra pressure past LATE_LEVEL is aimed at gear: enemies have
// GRITTY_LATE_HP more health per level past 40, get +1 to hit per
// GRITTY_ARMOUR_STEP points of the target's armour above GRITTY_ARMOUR_FROM
// (at most GRITTY_ARMOUR_MAX),
// worn gear's damage cut counts only GRITTY_GEAR_TAKEN_SHARE against them, and
// a careful approach no longer catches them off guard (src/combat.js). Gear
// still helps; it no longer makes a party untouchable. Story, Standard and
// levels 1 to 40 are unchanged.
const GRITTY_LATE_HP = 0.005, GRITTY_ARMOUR_FROM = 18, GRITTY_ARMOUR_STEP = 1, GRITTY_GEAR_TAKEN_SHARE = 0.25, GRITTY_ARMOUR_MAX = 8;
const grittyArmour = ac => Math.min(GRITTY_ARMOUR_MAX, Math.max(0, Math.floor((Number(ac) - GRITTY_ARMOUR_FROM) / GRITTY_ARMOUR_STEP)));
const grittyLate = level => ({ hp: 1 + GRITTY_LATE_HP * lateLevels(level) });
const foeTier = p => Math.max(0, Math.floor((p + 1) / 6));
// Enemy health is trimmed as the party's stat damage arrives, so fights by
// force last about 4 to 7 rounds (playtest 21 November 2026): none up to
// power 4, easing in to HP_TRIM from power 8.
const HP_TRIM = 0.75, HP_TRIM_FROM = 4, HP_TRIM_FULL = 8;
function hpTrim(p) {
  if (p <= HP_TRIM_FROM) return 1;
  return 1 - (1 - HP_TRIM) * Math.min(1, (p - HP_TRIM_FROM) / (HP_TRIM_FULL - HP_TRIM_FROM));
}
function foeStats({ accuracy: a, power: p, vigor: v = 1, late = 0 }) {
  const trim = hpTrim(p), hp = v * trim * (1 + LATE_HP * late);
  const extra = Math.floor(foeTier(p) * (ENEMY_TIER_DAMAGE + ENEMY_TRIM_DAMAGE * (1 - trim) / (1 - HP_TRIM)) + LATE_DAMAGE * late);
  const hit = Math.floor(late / LATE_ATTACK_EVERY);
  return {
    main: { maxHp: Math.round((22 + p * 6) * hp), ac: 12 + Math.floor(a / 3), attackBonus: 3 + Math.floor(a / 2) + hit, damage: `${1 + Math.floor(p / 5)}d6+${2 + Math.floor(p / 3) + extra}` },
    retainer: { maxHp: Math.round((10 + p * 4) * hp), ac: 11 + Math.floor(a / 3), attackBonus: 3 + Math.floor(a / 3) + hit, damage: `1d6+${2 + Math.floor(p / 3) + extra}` }
  };
}

function averageDamage(formula) {
  let total = 0;
  for (const [, sign, n, die, flat] of String(formula || '').replace(/\s/g, '').matchAll(/([+-]?)(?:(\d*)d(\d+)|(\d+))/g)) {
    const value = die ? (Number(n) || 1) * (Number(die) + 1) / 2 : Number(flat || 0);
    total += sign === '-' ? -value : value;
  }
  return Math.max(1, total);
}
const threat = def => Math.max(1, Number(def?.maxHp) || 1) * averageDamage(def?.attack?.damage || def?.damage);

// A standard adventure battle (boss and two retainers) for a hero of this
// level rates "hard"; a battle far below the hero's level rates "trivial".
function reference(level) {
  const f = foeStats(challenge({ level }));
  return threat(f.main) + 2 * threat(f.retainer);
}
// A battle written for a level well below the hero's is capped as well:
// 5 levels below rates easy at best, 10 levels below pays nothing.
function rate(level, enemyDefs, battleLevel = level) {
  const ratio = enemyDefs.reduce((sum, def) => sum + threat(def), 0) / reference(level);
  const gap = Math.floor(Number(level) || 1) - Math.floor(Number(battleLevel) || 1);
  if (gap >= 10 || ratio < 0.4) return 'trivial';
  if (gap >= 5 || ratio < 0.7) return 'easy';
  return ratio < 0.95 ? 'normal' : ratio < 1.35 ? 'hard' : 'deadly';
}

// XP for winning (or peacefully overcoming) an AI-written adventure's battle.
function battleXp(level, enemyDefs, tierId, battleLevel = level) {
  const rating = rate(level, enemyDefs, battleLevel);
  return { rating, xp: Math.round(share(level, BATTLE_SHARE[rating]) * tier(tierId).reward / 10) * 10 };
}
const missionXp = level => share(level, MISSION_SHARE);

module.exports = { GRITTY_LATE_HP, GRITTY_ARMOUR_FROM, GRITTY_ARMOUR_STEP, GRITTY_GEAR_TAKEN_SHARE, GRITTY_ARMOUR_MAX, grittyArmour, grittyLate, CHAPTER_SHARE, chapterXp, UNDER_FREE, UNDER_MAX, UNDER_DAMAGE, UNDER_LATE_LEVEL, UNDER_LATE_WEIGHT, UNDER_LATE_MAX, HP_TRIM, hpTrim, ENEMY_TIER_DAMAGE, ENEMY_TRIM_DAMAGE, LATE_LEVEL, LATE_HP, LATE_DAMAGE, LATE_ATTACK_EVERY, lateLevels, underBy, underSteps, underChecks, VIGOR_LEVEL, VIGOR_MAX, vigor, BATTLE_SHARE, MISSION_SHARE, QUEST_SHARE, TRIAL_SHARE, TIERS, tier, band, share, challenge, foeStats, averageDamage, threat, reference, rate, battleXp, missionXp };
