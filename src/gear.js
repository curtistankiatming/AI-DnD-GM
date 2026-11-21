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
// has advantage. Uses are counted per item for the whole party
// (world.storySpent), so passing the item round doesn't reuse it; each copy
// owned gives one use. The Thornward Cloak also keeps its old save flag,
// player.used.cloakReady, for the character sheet and old saves.
const copies = (state, id) => state.player.inventory.filter((e) => e.itemId === id).reduce((n, e) => n + (e.quantity || 0), 0);
function spent(state, id) {
  const n = state.world?.storySpent?.[id];
  if (Number.isInteger(n)) return n;
  return id === 'thornward-cloak' && state.player.used?.cloakReady === false ? 1 : 0;
}
const storyReady = (state, id) => spent(state, id) < Math.max(1, copies(state, id));
function storyItem(state, actor, skillId) {
  if (!skillId) return null;
  return worn(actor).find((i) => i.story?.skill === skillId && storyReady(state, i.id)) || null;
}
function spendStory(state, plan) {
  if (!plan?.storyItemId) return;
  const id = plan.storyItemId;
  (state.world.storySpent ||= {})[id] = spent(state, id) + 1;
  if (id === 'thornward-cloak') (state.player.used ||= {}).cloakReady = false;
}
// After a long rest every story ability is ready again.
function refreshStory(state) {
  if (state.world) delete state.world.storySpent;
  for (const a of [state.player, ...(state.party || [])]) { a.used ||= {}; a.used.cloakReady = true; for (const k of Object.keys(a.used)) if (k.startsWith('ready:')) delete a.used[k]; }
}

// Plain words for the item card: what the extra rules do.
function describe(item) {
  const out = [];
  const pct = (v) => Math.round(Math.abs(v) * 100);
  if (item.stats?.dealt) out.push(`${pct(item.stats.dealt)}% ${item.stats.dealt > 0 ? 'more' : 'less'} damage dealt`);
  if (item.stats?.taken) out.push(`${pct(item.stats.taken)}% ${item.stats.taken > 0 ? 'more' : 'less'} damage taken`);
  if (item.skill) out.push(`Skill, ${item.skill.name}: ${item.skill.text || Power.EFFECTS[item.skill.effect]?.text} Bonus action, once per fight.`);
  if (item.story) out.push(`Story: advantage on the first ${SKILLS[item.story.skill]?.name || item.story.skill} check after each long rest.`);
  const src = source(item);
  if (src) out.push(src);
  return out;
}

// Where an exclusive item comes from, in plain words.
const placeName = (id) => require('./expansion').TOWNS[id]?.name || id;
function source(item) {
  const x = item.exclusive;
  if (x?.town) return `Only sold in ${placeName(x.town)}`;
  if (x?.quest) { const q = require('./expansion').QUESTS?.[x.quest]; return `Reward for finishing ${q?.name || x.quest}`; }
  if (x?.event?.startsWith('bounty:')) return `Reward for the first bounty claimed in ${placeName(x.event.slice(7))}`;
  return '';
}

// Prices rise with rarity and with the level an item needs.
const RARITY_FLOOR = Object.freeze({ Common: 0, Uncommon: 30, Rare: 70, Epic: 150, Legendary: 300 });
const minValue = (item) => (RARITY_FLOOR[item.rarity] || 0) + 10 * (item.requires?.level || 0);

// Exclusive rewards: a quest's item when it is finished, a town's bounty item
// for the first bounty claimed there. Each is given once per save.
// Reward items by key ("quest:summit", "bounty:ashford"), built once.
let rewardMap = null;
const REWARDS = () => rewardMap ||= Object.fromEntries(Object.values(ITEMS).filter((i) => !i.forged && (i.exclusive?.quest || i.exclusive?.event)).map((i) => [i.exclusive.quest ? `quest:${i.exclusive.quest}` : i.exclusive.event, i]));
function award(state, key, events) {
  const w = state.world, given = (w.gearAwarded ||= {});
  if (given[key]) return null;
  const [kind, id] = key.split(/:(.*)/s);
  const item = REWARDS()[kind === 'quest' ? `quest:${id}` : key];
  if (!item) return null;
  given[key] = true;
  require('./equipment').addTo(state.player.inventory, item.id, 1);
  events.push({ type: 'item', tone: 'good', text: `You receive ${item.name} (${item.rarity}). ${purpose(item)}` });
  return item;
}

// Items from AI adventures come only from these templates (21 November 2026
// plan, step 5): the storyteller never sets numbers. A save stores just the
// template and the level; the item is rebuilt from those on every load.
const NOUNS = { blade: ['Blade', 'Sword', 'Edge'], bow: ['Bow', 'Longbow'], focus: ['Rod', 'Staff', 'Wand'], mail: ['Mail', 'Hauberk', 'Coat'], charm: ['Charm', 'Token', 'Pendant'] };
const ADJECTIVES = ['Weathered', 'Lantern-lit', 'Oathmarked', 'Rimecut', 'Emberbright', 'Saltworn', 'Hollow-forged', 'Wardsung'];
const CHARM_SKILLS = ['perception', 'insight', 'athletics', 'stealth', 'persuasion', 'investigation', 'survival', 'arcana'];
const TEMPLATES = Object.freeze(Object.keys(NOUNS));
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; };
const rarityFor = (level) => level < 8 ? 'Uncommon' : level < 15 ? 'Rare' : level < 21 ? 'Epic' : 'Legendary';
function forge(spec) {
  const level = Math.max(1, Math.min(100, Math.floor(Number(spec?.level) || 1)));
  const template = TEMPLATES.includes(spec?.template) ? spec.template : 'charm';
  const h = hash(`${template}|${level}`);
  const plus = Math.min(2, 1 + Math.floor(level / 12)), dmg = Math.min(3, Math.floor(level / 8));
  const name = `${ADJECTIVES[h % ADJECTIVES.length]} ${NOUNS[template][h % NOUNS[template].length]}`;
  const base = { id: `forged-${template}-${level}`, name, rarity: rarityFor(level), description: 'Recovered on an AI adventure.', requires: { level }, forged: { template, level } };
  let item;
  if (template === 'blade') item = { ...base, category: 'weapon', slot: 'mainHand', weapon: { damage: '1d8', damageType: 'slashing', ability: 'str', properties: [] }, attackBonus: plus, damageBonus: dmg, purpose: `Strength, 1d8 slashing, +${plus} to hit${dmg ? `, +${dmg} damage` : ''}.` };
  else if (template === 'bow') item = { ...base, category: 'weapon', slot: 'mainHand', weapon: { damage: '1d8', damageType: 'piercing', ability: 'dex', properties: ['ranged', 'twoHanded'] }, attackBonus: plus, damageBonus: dmg, purpose: `Dexterity, 1d8 piercing, +${plus} to hit${dmg ? `, +${dmg} damage` : ''}. Two-handed ranged weapon.` };
  else if (template === 'focus') item = { ...base, category: 'focus', slot: 'mainHand', spellAttackBonus: plus, spellDcBonus: plus, purpose: `Equip: +${plus} spell attack bonus and +${plus} spell save DC.` };
  else if (template === 'mail') item = { ...base, category: 'armor', slot: 'armor', armor: { base: 13 + plus, dexCap: 2 }, purpose: `Base AC ${13 + plus} and up to +2 from Dexterity.` };
  else { const skill = CHARM_SKILLS[h % CHARM_SKILLS.length], n = Math.min(3, 1 + Math.floor(level / 10)); item = { ...base, category: 'accessory', slot: 'accessory', skillBonuses: { [skill]: n }, story: { skill }, purpose: `Equip in the accessory slot: +${n} ${SKILLS[skill].name}.` }; }
  if (level >= 15) item.stats = { dealt: 0.05 };
  item.value = minValue(item) + 20;
  return item;
}
// A found item is fully described by its template and level, so its id is
// "forged-<template>-<level>": the same id is the same item in every save, and
// there are at most 500 of them, which can stay in the shared item list.
const cleanSpec = (s) => ({ template: TEMPLATES.includes(s?.template) ? s.template : 'charm', level: Math.max(1, Math.min(100, Math.floor(Number(s?.level) || 1))) });
const specId = (s) => { const c = cleanSpec(s); return `forged-${c.template}-${c.level}`; };
const forgedItem = (s) => ITEMS[specId(s)] ||= forge(s);
// Put a save's found items back into the item list (before its inventory is
// read), and drop any found item the save has no record of.
function register(state) {
  if (!state?.world || !state.player) return;
  const ids = new Set();
  if ('forged' in state.world) {
    const list = (Array.isArray(state.world.forged) ? state.world.forged : []).filter((s) => s && s.id === specId(s)).map((s) => ({ id: s.id, ...cleanSpec(s) }));
    state.world.forged = list.filter((s) => !ids.has(s.id) && ids.add(s.id)).slice(0, 500);
    for (const s of state.world.forged) forgedItem(s);
  }
  const foreign = (id) => /^forged-/.test(String(id)) && !ids.has(id);
  if (Array.isArray(state.player.inventory)) state.player.inventory = state.player.inventory.filter((e) => !foreign(e?.itemId || e?.id));
  if (Array.isArray(state.world.storage)) state.world.storage = state.world.storage.filter((e) => !foreign(e?.itemId || e?.id));
  for (const a of [state.player, ...(state.party || [])]) for (const [slot, id] of Object.entries(a?.equipment || {})) if (foreign(id)) a.equipment[slot] = null;
}
// Finishing an AI adventure gives one templated item at its level.
function forgeReward(state, quest, events) {
  if (!quest?.generated) return null;
  const w = state.world, given = (w.gearAwarded ||= {}), key = `forged:${quest.id}`;
  if (given[key]) return null;
  const spec = cleanSpec({ template: TEMPLATES[hash(quest.id) % TEMPLATES.length], level: quest.level });
  const id = specId(spec);
  w.forged ||= [];
  if (!w.forged.some((s) => s.id === id)) w.forged.push({ id, ...spec });
  given[key] = true;
  const item = forgedItem(spec);
  require('./equipment').addTo(state.player.inventory, id, 1);
  const from = String(quest.name || 'the adventure').replace(/[^\p{L}\p{N} ,'\-]/gu, '').slice(0, 60);
  events.push({ type: 'item', tone: 'good', text: `In ${from} you find ${item.name} (${item.rarity}). ${purpose(item)}` });
  return item;
}

// The item's purpose with its extra rules and requirement, for every card.
function purpose(item) {
  if (!item) return '';
  const extra = describe(item), req = requirementText(item);
  return [item.purpose, ...extra.map((t) => t.endsWith('.') ? t : `${t}.`), req ? `Requires: ${req}.` : ''].filter(Boolean).join(' ');
}

module.exports = { specId, purpose, source, minValue, RARITY_FLOOR, award, forge, register, forgeReward, TEMPLATES, RARITIES, gearClass, requirementText, unmet, stats, skills, storyReady, storyItem, spendStory, refreshStory, describe };
