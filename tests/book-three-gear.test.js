'use strict';
// Book Three's gear for levels 20 to 40: every class, every 2nd job branch and
// every companion has an upgrade at each tier; requirements, exclusives and
// rewards are sound; and the new items follow the curve of levels 1 to 20.
// Nothing here calls the paid API.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Bounty = require('../src/bounty');
const Gear = require('../src/gear'), G = require('../src/equipment'), Power = require('../src/power'), Book = require('../src/book');
const { ITEMS, CLASSES, SKILLS, ABILITIES, COMPANIONS } = require('../src/content');
const { TOWNS, QUESTS } = require('../src/expansion');
const GEAR = require('../src/data/gear.json');

// Book Three's gear is every catalogue item that needs level 18 or more
// (chapter rewards wear from two levels below their chapter).
const B3 = GEAR.filter((i) => (i.requires?.level || 0) >= 18);
const TIERS = [20, 25, 30, 35, 40];
// Levels each tier covers: 20 to 24, 25 to 29, 30 to 34, 35 to 39, and 40.
const band = (t) => t === 40 ? [38, 40] : [t - 2, t + 4];
// Part Two's chapters (docs/book-three/DESIGN-PART-TWO.md): id and level.
const PART_TWO = { 'b3-price': 30, 'b3-wren': 31, 'b3-order': 32, 'b3-ashford': 33, 'b3-seal': 34, 'b3-winter': 35, 'b3-company': 36, 'b3-deep': 37, 'b3-promise': 38, 'b3-firstbell': 39 };

const allStock = (t) => [...t.stock, ...Object.values(t.stockByLevel || {}).flat()];
// Where an item can be had today without missing it: a town that is never
// emptied, a Part One chapter, or a bounty. Vell's shop closes if the city is
// evacuated, so it does not count. Part Two's rewards count once given.
function obtainable(item) {
  const x = item.exclusive;
  if (x?.pending) return false;
  if (x?.quest) return Boolean(QUESTS[x.quest]);
  if (x?.event) return true;
  return Object.values(TOWNS).some((t) => !t.emptied && allStock(t).includes(item.id));
}

// What each kind of item is, for the coverage checks.
const ROLE = {
  str1h: (i) => i.weapon?.ability === 'str' && !i.weapon.properties.includes('twoHanded'),
  str2h: (i) => i.weapon?.ability === 'str' && i.weapon.properties.includes('twoHanded'),
  finesse: (i) => i.weapon?.ability === 'finesse',
  bow: (i) => Boolean(i.weapon?.properties?.includes('ranged')),
  focus: (i) => i.category === 'focus',
  heavy: (i) => i.armor?.dexCap === 0,
  medium: (i) => i.armor && i.armor.dexCap > 0,
  light: (i) => i.armor && i.armor.dexCap === null,
  shield: (i) => i.category === 'shield',
  offence: (i) => i.slot === 'accessory' && ((i.stats?.dealt || 0) >= 0.1 || i.skill?.effect === 'empowered' || (i.attackBonus || 0) > 0),
  defence: (i) => (i.slot === 'accessory' && ((i.stats?.taken || 0) < 0 || (i.acBonus || 0) > 0)) || i.category === 'shield',
  debuff: (i) => i.skill?.target === 'enemy',
  skills: (...ids) => (i) => i.slot === 'accessory' && ids.some((s) => (i.skillBonuses?.[s] || 0) > 0)
};
const social = ROLE.skills('persuasion', 'deception', 'insight');
const wild = ROLE.skills('survival', 'perception', 'nature', 'animalHandling');
const lore = ROLE.skills('arcana', 'history');
const faith = ROLE.skills('religion', 'medicine');
const sneak = ROLE.skills('stealth', 'sleightOfHand');
const song = (i) => ROLE.skills('performance')(i) || (i.skill?.effect === 'empowered' && i.skill.target === 'self');

// The upgrades each class looks for in every tier: each list must be met in full.
const CLASS_NEEDS = {
  fighter: { weapon: [ROLE.str1h, ROLE.str2h], armour: [ROLE.heavy], shield: [ROLE.shield] },
  rogue: { weapon: [ROLE.finesse], armour: [ROLE.light] },
  wizard: { focus: [ROLE.focus], armour: [ROLE.light] },
  cleric: { focus: [ROLE.focus], armour: [ROLE.medium], shield: [ROLE.shield] },
  ranger: { weapon: [ROLE.bow], armour: [ROLE.light, ROLE.medium] },
  bard: { focus: [ROLE.focus], weapon: [ROLE.finesse], armour: [ROLE.light] }
};
// What each 2nd job branch (src/data/jobs.json) wants as well, beyond its class's kit.
const BRANCH_NEEDS = {
  'fighter.guardian': [ROLE.shield, ROLE.heavy], 'fighter.duelist': [ROLE.str1h, ROLE.str2h], 'fighter.warlord': [ROLE.str2h, ROLE.offence],
  'rogue.shadow': [ROLE.finesse, sneak], 'rogue.saboteur': [ROLE.debuff, sneak], 'rogue.grifter': [social],
  'wizard.evoker': [ROLE.focus, ROLE.offence], 'wizard.chronist': [ROLE.focus, ROLE.defence], 'wizard.binder': [ROLE.focus, ROLE.debuff],
  'cleric.lifewarden': [ROLE.focus, faith], 'cleric.exorcist': [ROLE.focus, ROLE.debuff], 'cleric.battlepriest': [ROLE.str1h, ROLE.shield],
  'ranger.beastwarden': [ROLE.bow, wild], 'ranger.deadeye': [ROLE.bow, ROLE.offence], 'ranger.pathfinder': [ROLE.bow, wild],
  'bard.lorekeeper': [ROLE.focus, lore], 'bard.battlecantor': [ROLE.focus, song], 'bard.envoy': [social]
};
const COMPANION_NEEDS = {
  orin: [ROLE.str1h, ROLE.heavy, ROLE.shield, ROLE.offence],
  maren: [ROLE.focus, ROLE.medium, faith, ROLE.defence],
  nessa: [ROLE.bow, ROLE.light, wild]
};

const heroes = new Map();
function hero(classId, level) {
  const key = `${classId}:${level}`;
  if (!heroes.has(key)) {
    const s = E.createNewGame({ name: 'Rowan', classId });
    E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
    heroes.set(key, s);
  }
  return heroes.get(key);
}
// The upgrades in tier `t` that `actor` can wear at the top of that tier.
function upgrades(actor, t) {
  const [lo, hi] = band(t);
  return B3.filter((i) => { const L = i.requires?.level || 0; return L >= lo && L <= hi && obtainable(i) && Gear.unmet({ ...actor, level: hi }, i) === null; });
}

test('every class has a weapon or focus, armour and (where it uses one) a shield to upgrade to at each tier from 20 to 40', () => {
  const missing = [];
  for (const [classId, needs] of Object.entries(CLASS_NEEDS)) for (const t of TIERS) {
    const s = hero(classId, band(t)[1]), list = upgrades(s.player, t);
    for (const [slot, roles] of Object.entries(needs)) for (const role of roles) if (!list.some(role)) missing.push(`${classId} ${slot} at ${t}`);
  }
  assert.deepEqual(missing, []);
});

test('every 2nd job branch has its own kind of upgrade at each tier', () => {
  const branches = Object.entries(P.JOBS).flatMap(([c, j]) => j.branches.map((b) => `${c}.${b.id}`));
  assert.deepEqual(branches.sort(), Object.keys(BRANCH_NEEDS).sort(), 'every branch is listed');
  const missing = [];
  for (const [key, roles] of Object.entries(BRANCH_NEEDS)) for (const t of TIERS) {
    const s = hero(key.split('.')[0], band(t)[1]), list = upgrades(s.player, t);
    roles.forEach((role, n) => { if (!list.some(role)) missing.push(`${key} need ${n} at ${t}`); });
  }
  assert.deepEqual(missing, []);
});

test('Orin, Maren and Nessa each have upgrades they can wear at each tier', () => {
  assert.deepEqual(Object.keys(COMPANIONS).filter((id) => COMPANIONS[id].gearClass).sort(), Object.keys(COMPANION_NEEDS).sort(), 'every companion the game equips is listed');
  const missing = [];
  for (const member of Object.values(COMPANIONS)) for (const t of TIERS) {
    const list = upgrades(member, t);
    COMPANION_NEEDS[member.id].forEach((role, n) => { if (!list.some(role)) missing.push(`${member.id} need ${n} at ${t}`); });
  }
  assert.deepEqual(missing, []);
  // And one really goes on, through the same rules as the equip screen.
  const s = JSON.parse(JSON.stringify(hero('wizard', 20)));
  E.addItem(s, 'stormlamp-lens', 1, []);
  const out = E.resolveAction(s, { type: 'equip', itemId: 'stormlamp-lens', actorId: 'maren' });
  assert.equal(out.result.ok, true, out.result.error);
});

test('every Book Three requirement is one a hero of that class can meet', () => {
  for (const item of B3) {
    const r = item.requires;
    assert.ok(Number.isInteger(r.level) && r.level >= 18 && r.level <= 40, `${item.id}: level ${r.level}`);
    for (const c of r.classes || []) assert.ok(CLASSES[c], `${item.id}: ${c}`);
    // Ability scores never rise, so no requirement goes past a preset's best score (15).
    for (const [id, n] of Object.entries(r.abilities || {})) assert.ok(ABILITIES[id] && n >= 10 && n <= 15, `${item.id}: ${id} ${n}`);
    const someone = Object.keys(CLASSES).some((c) => Gear.unmet(hero(c, Math.max(20, r.level)).player, item) === null);
    assert.ok(someone, `${item.id}: some class can wear it`);
    assert.ok(['Epic', 'Legendary'].includes(item.rarity), `${item.id}: ${item.rarity}`);
    assert.ok(item.value >= Gear.minValue(item), `${item.id}: price`);
    if (item.skill) assert.ok(Power.EFFECTS[item.skill.effect] && ['enemy', 'self'].includes(item.skill.target) && item.skill.text, item.id);
    if (item.story) assert.ok(SKILLS[item.story.skill], item.id);
    for (const k of Object.keys(item.skillBonuses || {})) assert.ok(SKILLS[k], `${item.id}: ${k}`);
    assert.equal(item.slot, { weapon: 'mainHand', focus: 'mainHand', armor: 'armor', shield: 'offHand', accessory: 'accessory' }[item.category], item.id);
  }
});

test('Book Three gear follows the curve of levels 1 to 20 and does not run away with it', () => {
  for (const item of B3) {
    const id = item.id;
    if (item.weapon) assert.ok(item.attackBonus <= 3 && item.damageBonus <= 4 && ['1d6', '1d8', '1d10', '1d12', '2d6'].includes(item.weapon.damage), id);
    if (item.weapon && item.requires.level < 40) assert.ok(item.attackBonus <= 2, `${id}: +3 to hit waits for level 40`);
    if (item.category === 'focus') assert.ok(item.spellAttackBonus <= 4 && item.spellDcBonus <= 4, id);
    if (item.armor?.dexCap === 0) assert.ok(item.armor.base <= 22, id);
    if (item.armor?.dexCap > 0) assert.ok(item.armor.base <= 18 && item.armor.dexCap <= 2, id);
    if (item.armor?.dexCap === null) assert.ok(item.armor.base <= 16, id);
    assert.ok((item.acBonus || 0) <= (item.category === 'shield' ? 4 : 1), id);
    assert.ok((item.stats?.dealt || 0) <= 0.2 && (item.stats?.taken || 0) >= -0.15, id);
    assert.ok(Object.values(item.skillBonuses || {}).every((v) => v <= 3), id);
    assert.ok(Object.values(item.saveBonuses || {}).every((v) => v <= 2), id);
  }
  // Each tier's best is at least as good as the last tier's, and only a little better.
  const score = (i) => i.category === 'focus' ? i.spellAttackBonus + i.spellDcBonus : i.weapon ? i.attackBonus + i.damageBonus : i.armor ? i.armor.base : i.acBonus;
  for (const role of ['str1h', 'str2h', 'finesse', 'bow', 'focus', 'heavy', 'medium', 'light', 'shield']) {
    let last = null;
    for (const t of TIERS) {
      const [lo, hi] = band(t), best = Math.max(...B3.filter((i) => ROLE[role](i) && obtainable(i) && i.requires.level >= lo && i.requires.level <= hi).map(score));
      if (last !== null) assert.ok(best >= last && best <= last + 2, `${role} at ${t}: ${best} after ${last}`);
      last = best;
    }
  }
});

test('exclusives are unique: one item per chapter, bounty or pending chapter, and town exclusives sold only there', () => {
  const keys = GEAR.filter((i) => i.exclusive?.quest || i.exclusive?.event || i.exclusive?.pending).map((i) => JSON.stringify(i.exclusive));
  assert.equal(new Set(keys).size, keys.length, 'no two items share a source');
  assert.equal(new Set(GEAR.map((i) => i.id)).size, GEAR.length, 'ids are unique');
  assert.equal(new Set(GEAR.map((i) => i.name)).size, GEAR.length, 'names are unique');
  for (const item of B3.filter((i) => i.exclusive?.town)) {
    const sellers = Object.values(TOWNS).filter((t) => allStock(t).includes(item.id)).map((t) => t.id);
    assert.deepEqual(sellers, [item.exclusive.town], item.id);
  }
  for (const t of Object.values(TOWNS)) for (const id of allStock(t)) assert.ok(ITEMS[id], `${t.id}: ${id}`);
  // Taken names stay out of the new items (docs/STORY-BIBLE.md and the book plans).
  for (const item of B3) assert.doesNotMatch(`${item.name} ${item.description}`, /\b(Tamsin|Brask|Hesper|Pell|Pellow|Tam|Ansel|Garrow)\b/, item.id);
});

test('every Part One chapter gives its own item, wearable from two levels below the chapter', () => {
  const partOne = Object.values(QUESTS).filter((q) => q.book === 3 && q.part === 1);
  assert.equal(partOne.length, 10);
  for (const q of partOne) {
    const item = GEAR.find((i) => i.exclusive?.quest === q.id);
    assert.ok(item && ITEMS[item.id], `${q.id} has a reward`);
    assert.equal(item.requires.level, q.level - 2, q.id);
    const s = hero('fighter', 20), events = [];
    const copy = JSON.parse(JSON.stringify(s));
    assert.equal(Gear.award(copy, `quest:${q.id}`, events)?.id, item.id, q.id);
    assert.match(Gear.purpose(item), new RegExp(`Reward for finishing ${q.name}`), q.id);
  }
});

test('Part Two rewards are given when their chapters finish: never sold, and one for each chapter', () => {
  const rewards = GEAR.filter((i) => PART_TWO[i.exclusive?.quest]);
  assert.deepEqual(rewards.map((i) => i.exclusive.quest).sort(), Object.keys(PART_TWO).sort(), 'one for each Part Two chapter');
  for (const item of rewards) {
    assert.ok(QUESTS[item.exclusive.quest], `${item.exclusive.quest} exists`);
    assert.equal(item.requires.level, PART_TWO[item.exclusive.quest] - 2, item.id);
    const s = JSON.parse(JSON.stringify(hero('fighter', 40)));
    assert.equal(Gear.award(s, `quest:${item.exclusive.quest}`, [])?.id, item.id, `${item.id} is given`);
    assert.ok(!Object.values(TOWNS).some((t) => allStock(t).includes(item.id)), item.id);
  }
});

test('a town sells its later gear only once the hero reaches that level', () => {
  const s = hero('fighter', 29);
  const at = (state, town) => { state.world.unlockedTowns = [...new Set([...state.world.unlockedTowns, town])]; state.world.townId = town; state.story.nodeId = `town-${town}`; return E.buildView(state).world.shop.map((o) => o.id); };
  const before = at(JSON.parse(JSON.stringify(s)), 'merrowgate');
  assert.ok(!before.includes('seawall-greatsword'), 'not at 29');
  assert.ok(before.includes('harbour-cutlass'), 'the town\'s own stock is still there');
  const later = JSON.parse(JSON.stringify(s));
  E.awardXp(later, P.XP_NEXT[29] - later.player.xp, [], 'test fixture');
  assert.equal(later.player.level, 30);
  assert.ok(at(later, 'merrowgate').includes('seawall-greatsword'), 'on sale at 30');
  assert.ok(W.townStock(later, 'briarwatch').includes('bellmetal-longsword') && !W.townStock(later, 'briarwatch').includes('watch-blade'));
});

test('a level bounty gives its item once, at or above its level, and never below', () => {
  const api = { awardXp: E.awardXp, enterNode: E.enterNode, actors: G.actors };
  const claim = (s) => { s.world.townId = 'merrowgate'; s.story.nodeId = 'town-merrowgate'; s.world.bounty = { nodeId: 'town-merrowgate', townId: 'merrowgate', level: s.player.level }; Bounty.finish(s, 'victory', [], api); };
  const count = (s, id) => s.player.inventory.filter((e) => e.itemId === id).reduce((n, e) => n + e.quantity, 0);
  const low = JSON.parse(JSON.stringify(hero('rogue', 25)));
  claim(low);
  assert.equal(count(low, 'wrecker-gaff'), 1, 'the town\'s first bounty item');
  assert.equal(count(low, 'wrecker-spyglass'), 0, 'not below level 30');
  const high = JSON.parse(JSON.stringify(hero('rogue', 30)));
  claim(high); claim(high);
  assert.equal(count(high, 'wrecker-spyglass'), 1, 'once');
  assert.match(Gear.purpose(ITEMS['wrecker-spyglass']), /first bounty claimed in Merrowgate at level 30 or above/);
});

test('Book Three stays hidden: the new gear changes no book', () => {
  assert.equal(Book.SHELF.find((b) => b.n === 3).out, 0);
});
