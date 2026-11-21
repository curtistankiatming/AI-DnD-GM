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
// level further behind adds one step, up to UNDER_MAX. A written chapter can be
// started up to UNDER_FREE + UNDER_MAX levels under its level.
const UNDER_FREE = 5, UNDER_MAX = 5;
const UNDER_DAMAGE = 0.1;   // per step: +10% enemy damage
function underBy(heroLevel, level) {
  return Math.max(0, Math.floor(Number(level) || 1) - Math.floor(Number(heroLevel) || 1));
}
function underSteps(heroLevel, level) {
  return Math.min(UNDER_MAX, Math.max(0, underBy(heroLevel, level) - UNDER_FREE));
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
// Renown (q.power above q.level) and the chosen tier add on top.
function challenge(q) {
  const level = Math.max(1, Math.floor(Number(q?.level) || 1));
  const renown = Math.max(0, Math.floor(Number(q?.power) || level) - level);
  const t = tier(q?.tier);
  return { accuracy: P.accuracyLevel(level) + t.accuracy, power: P.powerLevel(level) + renown + t.power, vigor: vigor(level) };
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
const ENEMY_TIER_DAMAGE = 3;
const foeTier = p => Math.max(0, Math.floor((p + 1) / 6));
function foeStats({ accuracy: a, power: p, vigor: v = 1 }) {
  const extra = ENEMY_TIER_DAMAGE * foeTier(p);
  return {
    main: { maxHp: Math.round((22 + p * 6) * v), ac: 12 + Math.floor(a / 3), attackBonus: 3 + Math.floor(a / 2), damage: `${1 + Math.floor(p / 5)}d6+${2 + Math.floor(p / 3) + extra}` },
    retainer: { maxHp: Math.round((10 + p * 4) * v), ac: 11 + Math.floor(a / 3), attackBonus: 3 + Math.floor(a / 3), damage: `1d6+${2 + Math.floor(p / 3) + extra}` }
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
  const l = Math.max(1, Math.floor(Number(level) || 1));
  const f = foeStats({ accuracy: P.accuracyLevel(l), power: P.powerLevel(l), vigor: vigor(l) });
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

module.exports = { CHAPTER_SHARE, chapterXp, UNDER_FREE, UNDER_MAX, UNDER_DAMAGE, underBy, underSteps, VIGOR_LEVEL, VIGOR_MAX, vigor, BATTLE_SHARE, MISSION_SHARE, QUEST_SHARE, TRIAL_SHARE, TIERS, tier, band, share, challenge, foeStats, averageDamage, threat, reference, rate, battleXp, missionXp };
