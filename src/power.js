'use strict';
// How hard the party hits, and the shared buffs, debuffs and chain attacks.
//
// Damage grows with the attacker: every hit from a party member adds their
// attacking stat's modifier once per power tier (tier 1 from level 5, 2 from
// 11, 3 from 17, then one more every 24 levels past 20). Enemies already grow
// through src/xp.js. Buffs and debuffs are ordinary combat conditions with a
// known id; the engine reads their effects here so every source (companion
// combinations, job skills, enemies) uses the same rules.
const P = require('./progression');
const { abilityModifier } = require('./rules');

function tier(level) {
  return Math.max(0, Math.floor((P.powerLevel(level) + 1) / 6));
}

// Extra damage on a hit from the attacking stat: modifier x tier, never negative.
function statDamage(actor, abilityId) {
  if (!actor || actor.team === 'enemy' || !abilityId) return 0;
  const mod = abilityModifier(actor.abilities?.[abilityId] ?? 10);
  return Math.max(0, mod) * tier(actor.level || 1);
}

// The named buffs and debuffs. `dealt` and `taken` multiply damage, `ac` adds
// to armour, `burn` deals damage at the start of the bearer's turn.
const EFFECTS = Object.freeze({
  empowered: { name: 'Empowered', dealt: 0.25, text: 'Deals 25% more damage.' },
  weakened: { name: 'Weakened', dealt: -0.25, text: 'Deals 25% less damage.' },
  vulnerable: { name: 'Vulnerable', taken: 0.25, text: 'Takes 25% more damage.' },
  // Fortified and Slowed come from item skills (src/gear.js).
  fortified: { name: 'Fortified', taken: -0.25, text: 'Takes 25% less damage.' },
  slowed: { name: 'Slowed', ac: -2, text: '2 less armour.' },
  burning: { name: 'Burning', burn: true, text: 'Takes fire damage at the start of its turn until the fire goes out.' }
});

const has = (actor, id) => Boolean(actor?.conditions?.some(c => c.id === id));

// Multiplier on damage from `attacker` to `target` from their conditions.
const XP_GEAR_TAKEN_SHARE = () => require('./xp').GRITTY_GEAR_TAKEN_SHARE;
function damageFactor(attacker, target) {
  let f = 1;
  for (const [id, e] of Object.entries(EFFECTS)) {
    if (e.dealt && has(attacker, id)) f += e.dealt;
    if (e.taken && has(target, id)) f += e.taken;
  }
  // Worn items' special stats (src/gear.js).
  f += Number(attacker?.gearDealt) || 0;
  // On Gritty past level 40 a hardened enemy's blows go through most of worn gear's damage cut (src/xp.js).
  f += (Number(target?.gearTaken) || 0) * (attacker?.hardened ? XP_GEAR_TAKEN_SHARE() : 1);
  // Under-level penalty (src/xp.js): the condition carries its own share.
  for (const c of attacker?.conditions || []) if (c.id === 'outclassing') f += Number(c.dealt) || 0;
  return Math.max(0.25, f);
}

function acShift(actor) {
  let n = 0;
  for (const [id, e] of Object.entries(EFFECTS)) if (e.ac && has(actor, id)) n += e.ac;
  return n;
}

const burnDamage = level => 2 + 2 * tier(level);

// Chain attacks: party hits on the same enemy in the same round build a chain,
// whoever lands them (an Extra Attack counts too). The second hit adds 15%, the
// third 30%, up to 60%. A companion combination starts a fresh chain on its
// target: its own hit is the first link.
const CHAIN_STEP = 0.15, CHAIN_MAX = 0.6;
function chainHit(combat, attacker, target) {
  if (!combat || attacker?.team !== 'party' || target?.team !== 'enemy') return 0;
  const c = combat.chain;
  if (c && c.targetId === target.id && c.round === combat.round) c.count += 1;
  else combat.chain = { targetId: target.id, round: combat.round, count: 1 };
  return Math.min(CHAIN_MAX, CHAIN_STEP * (combat.chain.count - 1));
}
function startChain(combat, target) {
  if (combat && target) combat.chain = { targetId: target.id, round: combat.round, count: 0 };
}

module.exports = { tier, statDamage, EFFECTS, damageFactor, acShift, burnDamage, chainHit, startChain, CHAIN_STEP, CHAIN_MAX };
