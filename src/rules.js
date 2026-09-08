"use strict";

const { POINT_BUY_COSTS, SKILLS } = require("./content");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function abilityModifier(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}

function proficiencyBonus(level) {
  return 2 + Math.floor((Math.max(1, Number(level || 1)) - 1) / 4);
}

function createSeededRng(seed = Date.now()) {
  let state = Number(seed) >>> 0;
  if (!state) state = 0x6d2b79f5;
  return function seededRandom() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, minInclusive, maxInclusive) {
  const min = Math.ceil(Number(minInclusive));
  const max = Math.floor(Number(maxInclusive));
  return min + Math.floor(rng() * (max - min + 1));
}

function rollDie(rng, sides) {
  return randomInt(rng, 1, Number(sides));
}

function substituteFormula(formula, variables = {}) {
  let output = String(formula || "0");
  for (const [key, value] of Object.entries(variables)) {
    output = output.replaceAll(String(key), String(Number(value || 0)));
  }
  return output;
}

function rollFormula(rng, formula, variables = {}) {
  const resolved = substituteFormula(formula, variables).replace(/\s+/g, "").toLowerCase();
  const tokens = resolved.match(/[+-]?[^+-]+/g) || [];
  const parts = [];
  let total = 0;

  for (const rawToken of tokens) {
    const sign = rawToken.startsWith("-") ? -1 : 1;
    const token = rawToken.replace(/^[+-]/, "");
    const diceMatch = token.match(/^(\d*)d(\d+)$/);
    if (diceMatch) {
      const count = Math.max(0, Number(diceMatch[1] || 1));
      const sides = Math.max(1, Number(diceMatch[2]));
      const rolls = [];
      for (let i = 0; i < count; i += 1) rolls.push(rollDie(rng, sides));
      const subtotal = rolls.reduce((sum, value) => sum + value, 0) * sign;
      total += subtotal;
      parts.push({ type: "dice", count, sides, sign, rolls, subtotal });
      continue;
    }
    const flat = Number(token);
    if (Number.isFinite(flat)) {
      total += flat * sign;
      parts.push({ type: "flat", value: flat * sign });
    }
  }

  return { formula: resolved, total, parts };
}

function rollD20(rng, { advantage = false, disadvantage = false } = {}) {
  const mode = advantage && !disadvantage ? "advantage" : disadvantage && !advantage ? "disadvantage" : "normal";
  const rolls = [rollDie(rng, 20)];
  if (mode !== "normal") rolls.push(rollDie(rng, 20));
  let natural = rolls[0];
  if (mode === "advantage") natural = Math.max(...rolls);
  if (mode === "disadvantage") natural = Math.min(...rolls);
  return { natural, rolls, mode };
}

function normalizeAbilities(raw = {}, fallback = {}) {
  const result = {};
  for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) {
    const candidate = Number(raw[ability]);
    const fallbackValue = Number(fallback[ability] || 10);
    result[ability] = clamp(Number.isFinite(candidate) ? Math.round(candidate) : fallbackValue, 3, 20);
  }
  return result;
}

function pointBuyCost(abilities = {}) {
  let total = 0;
  for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) {
    const score = Number(abilities[ability]);
    if (!Object.prototype.hasOwnProperty.call(POINT_BUY_COSTS, score)) return Infinity;
    total += POINT_BUY_COSTS[score];
  }
  return total;
}

function validatePointBuy(abilities = {}) {
  const cost = pointBuyCost(abilities);
  return {
    valid: Number.isFinite(cost) && cost <= 27,
    cost,
    remaining: Number.isFinite(cost) ? 27 - cost : -1
  };
}

function actorSkillBonus(actor, skillId) {
  const skill = SKILLS[skillId];
  if (!skill) return 0;
  const abilityBonus = abilityModifier(actor?.abilities?.[skill.ability]);
  const proficient = Array.isArray(actor?.skills) && actor.skills.includes(skillId);
  const expertise = Array.isArray(actor?.expertise) && actor.expertise.includes(skillId);
  const prof = proficiencyBonus(actor?.level || 1);
  const itemBonus = Number(actor?.skillBonuses?.[skillId] || 0);
  return abilityBonus + (expertise ? prof * 2 : proficient ? prof : 0) + itemBonus;
}

function actorAbilityBonus(actor, abilityId, save = false) {
  const base = abilityModifier(actor?.abilities?.[abilityId]);
  const proficient = save && Array.isArray(actor?.savingThrows) && actor.savingThrows.includes(abilityId);
  const saveBonus = Number(actor?.saveBonuses?.[abilityId] || 0);
  return base + (proficient ? proficiencyBonus(actor?.level || 1) : 0) + saveBonus;
}

function formatSigned(value) {
  const numeric = Number(value || 0);
  return numeric >= 0 ? `+${numeric}` : String(numeric);
}

module.exports = {
  clamp,
  deepClone,
  abilityModifier,
  proficiencyBonus,
  createSeededRng,
  randomInt,
  rollDie,
  rollFormula,
  rollD20,
  normalizeAbilities,
  pointBuyCost,
  validatePointBuy,
  actorSkillBonus,
  actorAbilityBonus,
  formatSigned
};
