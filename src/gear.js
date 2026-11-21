'use strict';
// Equipment rules beyond the slot (step 4 of the 21 November 2026 gameplay
// plan): who may wear an item, its special stats, its combat skill and its
// story ability. Every field is optional, so the older items work unchanged.
//
//   requires: { level, classes: ['fighter', ...], abilities: { str: 13 } }
//   stats:    { dealt: 0.1, taken: -0.1 }   share of damage dealt or taken
//   skill:    { name, effect, target: 'enemy'|'self', rounds, text }
//             a bonus action once per fight; effect is a src/power.js EFFECTS id
//   story:    { skill, key?, text }
//             advantage on the first check with that skill after each long rest
//
// Requirements are checked when an item is put on, never on a save that loads:
// an old save keeps everything its party already wears.
const { ITEMS, CLASSES, COMPANIONS, SKILLS, ABILITIES } = require('./content');
const Power = require('./power');

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const slots = ['mainHand', 'offHand', 'armor', 'accessory'];

// Companions wear gear as the class closest to their role (companions.json gearClass).
const gearClass = (a) => (a?.id === 'player' || a?.kind === 'player') ? a.classId : (COMPANIONS[a?.id]?.gearClass || COMPANIONS[a?.refId]?.gearClass || null);
const className = (id) => CLASSES[id]?.name || id;
const abilityName = (id) => ABILITIES[id]?.name || id.toUpperCase();

// "Level 8 · Fighter or Cleric · Strength 13", or '' when anyone may wear it.
function requirementText(item) {
  const r = item?.requires;
  if (!r) return '';
  const parts = [];
  if (r.level > 1) parts.push(`Level ${r.level}`);
  if (r.classes?.length) parts.push(orList(r.classes.map(className)));
  for (const [id, n] of Object.entries(r.abilities || {})) parts.push(`${abilityName(id)} ${n}`);
  return parts.join(' · ');
}

// "A, B or C".
const orList = (xs) => xs.length > 1 ? `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}` : xs[0] || '';

// Why `actor` can't put `item` on, in plain words, or null when they can.
// "Only a Fighter or Cleric can use this. Needs Strength 13 (you have 8)."
function unmet(actor, item) {
  const r = item?.requires;
  if (!r || !actor) return null;
  const you = actor.id === 'player' || actor.kind === 'player';
  const is = you ? 'you are' : `${actor.name} is`, has = you ? 'you have' : `${actor.name} has`;
  const out = [];
  if (r.classes?.length && !r.classes.includes(gearClass(actor))) out.push(`Only a ${orList(r.classes.map(className))} can use this.`);
  const needs = [];
  if (r.level > 1 && (actor.level || 1) < r.level) needs.push(`level ${r.level} (${is} ${actor.level || 1})`);
  for (const [id, n] of Object.entries(r.abilities || {})) {
    const have = actor.abilities?.[id] ?? 10;
    if (have < n) needs.push(`${abilityName(id)} ${n} (${has} ${have})`);
  }
  if (needs.length) out.push(`Needs ${orList(needs).replace(/ or ([^,]*)$/, ' and $1')}.`);
  return out.length ? out.join(' ') : null;
}

const worn = (a) => slots.map((s) => ITEMS[a?.equipment?.[s]]).filter(Boolean);

// Special stats summed over what an actor wears (src/equipment.js derive).
function stats(a) {
  let dealt = 0, taken = 0;
  for (const item of worn(a)) { dealt += Number(item.stats?.dealt) || 0; taken += Number(item.stats?.taken) || 0; }
  return { dealt, taken };
}

// Combat skills of worn items, for the combat actor.
const skills = (a) => worn(a).filter((i) => i.skill && Power.EFFECTS[i.skill.effect]).map((i) => ({ itemId: i.id, ...i.skill }));

// Story abilities: the first check with the item's skill after each long rest
// has advantage. The Thornward Cloak keeps its old save key, cloakReady.
const storyKey = (item) => item.story?.key || `ready:${item.id}`;
function storyItem(actor, skillId) {
  if (!skillId) return null;
  return worn(actor).find((i) => i.story?.skill === skillId && actor.used?.[storyKey(i)] !== false) || null;
}
function spendStory(plan) {
  if (!plan?.storyItemId) return;
  const item = ITEMS[plan.storyItemId];
  (plan.actor.used ||= {})[storyKey(item)] = false;
}
// After a long rest every story ability is ready again.
function refreshStory(a) {
  a.used ||= {};
  a.used.cloakReady = true;
  for (const k of Object.keys(a.used)) if (k.startsWith('ready:')) delete a.used[k];
}

// Plain words for the item card: what the extra rules do.
function describe(item) {
  const out = [];
  const pct = (v) => Math.round(Math.abs(v) * 100);
  if (item.stats?.dealt) out.push(`${pct(item.stats.dealt)}% ${item.stats.dealt > 0 ? 'more' : 'less'} damage dealt`);
  if (item.stats?.taken) out.push(`${pct(item.stats.taken)}% ${item.stats.taken > 0 ? 'more' : 'less'} damage taken`);
  if (item.skill) out.push(`Skill, ${item.skill.name}: ${item.skill.text || Power.EFFECTS[item.skill.effect]?.text} Bonus action, once per fight.`);
  if (item.story) out.push(`Story: advantage on the first ${SKILLS[item.story.skill]?.name || item.story.skill} check after each long rest.`);
  return out;
}

// The item's purpose with its extra rules and requirement, for every card.
function purpose(item) {
  if (!item) return '';
  const extra = describe(item), req = requirementText(item);
  return [item.purpose, ...extra.map((t) => t.endsWith('.') ? t : `${t}.`), req ? `Requires: ${req}.` : ''].filter(Boolean).join(' ');
}

module.exports = { purpose,  RARITIES, gearClass, requirementText, unmet, stats, skills, storyKey, storyItem, spendStory, refreshStory, describe };
