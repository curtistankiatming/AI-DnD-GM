'use strict';
// Gear for levels 45 to 100 (22 November 2026): sparse tiers at 45, 50, 55,
// 60, 65, 70, 80, 90, 95 and 100 rather than every type at every level, and six
// equipment sets in two versions (Book Four, 55 to 65; final, 90 to 95) with
// set bonuses. Nothing here calls the paid API.
// Book Four is held back even when the suite runs with the books preview on
// (BRIARWATCH_PREVIEW_BOOKS=1): once it can be read, gearOpen keeps level 41 to
// 70 gear until it begins, and these tests read the shops and bounties as
// players have them now. node --test runs each file in its own process.
process.env.BRIARWATCH_PREVIEW_PARTS = '4:0';
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), R = require('../src/rules'), W = require('../src/world'), Bounty = require('../src/bounty');
const Gear = require('../src/gear'), G = require('../src/equipment'), Power = require('../src/power'), Book = require('../src/book');
const { ITEMS, CLASSES, SKILLS, ABILITIES, COMPANIONS } = require('../src/content');
const { TOWNS } = require('../src/expansion');
const P = require('../src/progression');
const GEAR = require('../src/data/gear.json');
const SETS = require('../src/data/gear-sets.json').sets;

const LATE = GEAR.filter((i) => (i.requires?.level || 0) > 40);
const TIERS = [45, 50, 55, 60, 65, 70, 80, 90, 95, 100];
// Book Four's chapter rewards are worn from two levels below their chapter
// (docs/book-four/DESIGN.md, "Gear: chapter rewards"), so they sit between the
// tiers; the rest of the late gear is at a tier. Read from the file: the
// chapters may not be merged with Book Four held back.
const B4 = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '../src/data/book-four/quests.json'), 'utf8'));
const chapterReward = (item) => Boolean(B4[item.exclusive?.quest]) && item.requires.level === B4[item.exclusive.quest].level - 2;
// An upgrade for each kind of kit at least every 20 levels.
const WINDOWS = [[41, 60], [61, 80], [81, 100]];
const lv = (i) => i.requires?.level || 0;
const allStock = (t) => [...t.stock, ...Object.values(t.stockByLevel || {}).flat()];

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
  accessory: (i) => i.slot === 'accessory'
};
const CLASS_NEEDS = {
  fighter: ['str1h', 'str2h', 'heavy', 'shield', 'accessory'],
  rogue: ['finesse', 'light', 'accessory'],
  wizard: ['focus', 'light', 'accessory'],
  cleric: ['focus', 'medium', 'heavy', 'shield', 'accessory'],
  ranger: ['bow', 'light', 'medium', 'accessory'],
  bard: ['focus', 'finesse', 'light', 'accessory']
};
const COMPANION_NEEDS = { orin: ['str1h', 'heavy', 'shield', 'accessory'], maren: ['focus', 'medium', 'shield', 'accessory'], nessa: ['bow', 'light', 'accessory'] };

const heroes = new Map();
function hero(classId, level) {
  const key = `${classId}:${level}`;
  if (!heroes.has(key)) {
    const s = E.createNewGame({ name: 'Rowan', classId });
    E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
    heroes.set(key, s);
  }
  return JSON.parse(JSON.stringify(heroes.get(key)));
}
// A save that has begun Book Three, so level stock and level bounties are open.
const begun = (classId, level) => { const s = hero(classId, level); s.world.completed['b3-letter'] = { xp: 0, gold: 0 }; return s; };
const wearable = (actor, lo, hi) => LATE.filter((i) => lv(i) >= lo && lv(i) <= hi && Gear.unmet({ ...actor, level: hi }, i) === null);

test('every late requirement is one a hero of that class can meet, and every piece is Legendary and priced for its level', () => {
  for (const item of LATE) {
    const r = item.requires;
    assert.ok(TIERS.includes(r.level) || chapterReward(item), `${item.id}: level ${r.level} is a tier, or two below its Book Four chapter`);
    for (const c of r.classes || []) assert.ok(CLASSES[c], `${item.id}: ${c}`);
    for (const [id, n] of Object.entries(r.abilities || {})) assert.ok(ABILITIES[id] && n >= 10 && n <= 15, `${item.id}: ${id} ${n}`);
    assert.ok(Object.keys(CLASSES).some((c) => Gear.unmet(hero(c, r.level).player, item) === null), `${item.id}: some class can wear it`);
    assert.equal(item.rarity, 'Legendary', item.id);
    assert.ok(item.value >= Gear.minValue(item), `${item.id}: price`);
    if (item.skill) assert.ok(Power.EFFECTS[item.skill.effect] && ['enemy', 'self'].includes(item.skill.target) && item.skill.text, item.id);
    for (const k of Object.keys(item.skillBonuses || {})) assert.ok(SKILLS[k], `${item.id}: ${k}`);
    assert.equal(item.slot, { weapon: 'mainHand', focus: 'mainHand', armor: 'armor', shield: 'offHand', accessory: 'accessory' }[item.category], item.id);
  }
  // Every weapon and focus past 40 belongs to one class or a clear family of
  // classes; armour goes by weight and accessories stay shared (22 November 2026).
  for (const item of LATE.filter((i) => i.slot === 'mainHand')) assert.ok(item.requires.classes?.length >= 1 && item.requires.classes.length <= 3, `${item.id}: class family`);
  // Sparse: about eight pieces a tier, not one of each type at every level.
  assert.ok(LATE.length >= 60 && LATE.length <= 90, `${LATE.length} late pieces`);
});

test('each tier has something for every class and companion, and each kind of kit improves at least every 20 levels', () => {
  const missing = [];
  for (const t of TIERS) {
    for (const c of Object.keys(CLASSES)) if (!wearable(hero(c, t).player, t, t).length) missing.push(`${c} nothing at ${t}`);
    for (const m of Object.values(COMPANIONS).filter((x) => x.gearClass)) if (!wearable(m, t, t).length) missing.push(`${m.id} nothing at ${t}`);
  }
  for (const [lo, hi] of WINDOWS) {
    for (const [c, roles] of Object.entries(CLASS_NEEDS)) { const list = wearable(hero(c, hi).player, lo, hi); for (const r of roles) if (!list.some(ROLE[r])) missing.push(`${c} ${r} in ${lo}-${hi}`); }
    for (const [id, roles] of Object.entries(COMPANION_NEEDS)) { const list = wearable(COMPANIONS[id], lo, hi); for (const r of roles) if (!list.some(ROLE[r])) missing.push(`${id} ${r} in ${lo}-${hi}`); }
  }
  assert.deepEqual(missing, []);
});

test('Maren has shields she can wear without Strength 13', () => {
  const maren = COMPANIONS.maren;
  const shields = LATE.filter((i) => ROLE.shield(i) && Gear.unmet({ ...maren, level: 100 }, i) === null).map((i) => i.id);
  assert.deepEqual(shields.sort(), ['dawnhearth-aegis', 'hearthward-buckler', 'stormglass-buckler', 'warded-buckler']);
  const s = hero('wizard', 45);
  E.addItem(s, 'warded-buckler', 1, []);
  s.party.find((m) => m.id === 'maren').level = 45;
  const out = E.resolveAction(s, { type: 'equip', itemId: 'warded-buckler', actorId: 'maren' });
  assert.equal(out.result.ok, true, out.result.error);
});

test('late gear climbs in small steps from level 40 and stays inside its caps at 100', () => {
  for (const item of LATE) {
    const id = item.id;
    if (item.weapon) assert.ok(item.attackBonus <= 5 && item.damageBonus <= 9 && ['1d8', '1d10', '2d6'].includes(item.weapon.damage), id);
    if (item.category === 'focus') assert.ok(item.spellAttackBonus <= 8 && item.spellDcBonus <= 7, id);
    if (item.armor?.dexCap === 0) assert.ok(item.armor.base <= 25, id);
    if (item.armor?.dexCap > 0) assert.ok(item.armor.base <= 21 && item.armor.dexCap <= 2, id);
    if (item.armor?.dexCap === null) assert.ok(item.armor.base <= 18, id);
    assert.ok((item.acBonus || 0) <= (item.category === 'shield' ? 7 : 2), id);
    assert.ok((item.stats?.dealt || 0) <= 0.25 && (item.stats?.taken || 0) >= -0.15, id);
    assert.ok(Object.values(item.skillBonuses || {}).every((v) => v <= 3), id);
    assert.ok(Object.values(item.saveBonuses || {}).every((v) => v <= 2), id);
  }
  // The same scoring as Book Three's curve test: each time a kind of kit gets
  // an upgrade, its best is a step up (weapons strictly), and no more than 2 points.
  const pct = (i) => Math.round(((i.stats?.dealt || 0) - (i.stats?.taken || 0)) * 20);
  const score = (i) => pct(i) + (i.category === 'focus' ? i.spellAttackBonus + i.spellDcBonus : i.weapon ? i.attackBonus + i.damageBonus : i.armor ? i.armor.base : i.acBonus);
  for (const role of ['str1h', 'str2h', 'finesse', 'bow', 'focus', 'heavy', 'medium', 'light', 'shield']) {
    const strict = ['str1h', 'str2h', 'finesse', 'bow', 'focus'].includes(role);
    let last = Math.max(...GEAR.filter((i) => ROLE[role](i) && lv(i) >= 38 && lv(i) <= 40).map(score));
    for (const t of TIERS) {
      const here = LATE.filter((i) => ROLE[role](i) && lv(i) === t);
      if (!here.length) continue;
      const best = Math.max(...here.map(score));
      assert.ok((strict ? best > last : best >= last) && best <= last + 2, `${role} at ${t}: ${best} after ${last}`);
      last = best;
    }
  }
});

// a is at least as good as b for everyone who can wear b, at the same or a lower level (as in tests/book-three-gear.test.js).
const avg = (d) => { const m = /^(\d+)d(\d+)$/.exec(d); return m ? m[1] * (+m[2] + 1) / 2 : 1; };
function atLeast(a, b) {
  if (a.slot !== b.slot || a.category !== b.category || lv(a) > lv(b)) return false;
  const ca = a.requires?.classes, cb = b.requires?.classes;
  if (ca && (!cb || !cb.every((c) => ca.includes(c)))) return false;
  for (const [k, v] of Object.entries(a.requires?.abilities || {})) if ((b.requires?.abilities?.[k] || 0) < v) return false;
  if (a.weapon || b.weapon) {
    if (!a.weapon || !b.weapon || a.weapon.ability !== b.weapon.ability) return false;
    if (a.weapon.properties.includes('twoHanded') !== b.weapon.properties.includes('twoHanded') || avg(a.weapon.damage) < avg(b.weapon.damage)) return false;
  }
  if (a.armor || b.armor) {
    if (!a.armor || !b.armor || (a.armor.dexCap === 0) !== (b.armor.dexCap === 0) || (a.armor.dexCap === null) !== (b.armor.dexCap === null)) return false;
    if (a.armor.base < b.armor.base || (a.armor.dexCap !== null && a.armor.dexCap < b.armor.dexCap)) return false;
  }
  for (const k of ['attackBonus', 'damageBonus', 'spellAttackBonus', 'spellDcBonus', 'acBonus']) if ((a[k] || 0) < (b[k] || 0)) return false;
  if ((a.stats?.dealt || 0) < (b.stats?.dealt || 0) || (a.stats?.taken || 0) > (b.stats?.taken || 0)) return false;
  for (const [k, v] of Object.entries(b.saveBonuses || {})) if ((a.saveBonuses?.[k] || 0) < v) return false;
  for (const [k, v] of Object.entries(b.skillBonuses || {})) if (v > 0 && (a.skillBonuses?.[k] || 0) < v) return false;
  if (b.skill && (!a.skill || a.skill.effect !== b.skill.effect || a.skill.target !== b.skill.target || (a.skill.rounds || 1) < (b.skill.rounds || 1))) return false;
  if (b.set && a.set !== b.set) return false;
  return true;
}
test('no late item is matched or beaten by one already available at its level to the same wearers', () => {
  const pool = Object.values(ITEMS).filter((i) => i.slot && !i.forged && !i.masterwork && !(i.exclusive?.town && TOWNS[i.exclusive.town]?.emptied));
  const found = [];
  for (const b of LATE) for (const a of pool) if (a.id !== b.id && atLeast(a, b)) found.push(`${b.id} (level ${lv(b)}) is no better than ${a.id} (level ${lv(a)})`);
  assert.deepEqual(found, []);
});

test('every set is sound: real pieces in different slots, one class list, bonuses that grow to the full set', () => {
  assert.equal(SETS.length, 12);
  assert.deepEqual(Object.keys(Gear.SETS).sort(), SETS.map((s) => s.id).sort());
  const inSets = new Set();
  for (const set of SETS) {
    assert.ok(set.pieces.length >= 3 && set.pieces.length <= 4, set.id);
    const pieces = set.pieces.map((id) => ITEMS[id]);
    assert.ok(pieces.every((i) => i && i.set === set.id), `${set.id}: pieces name the set`);
    assert.equal(new Set(pieces.map((i) => i.slot)).size, pieces.length, `${set.id}: one piece per slot`);
    assert.equal(new Set(pieces.map((i) => JSON.stringify(i.requires.classes))).size, 1, `${set.id}: the same classes`);
    assert.ok(pieces.every((i) => i.exclusive === undefined), `${set.id}: every piece is sold`);
    const counts = set.bonuses.map((b) => b.pieces);
    assert.deepEqual(counts, [...counts].sort((x, y) => x - y), set.id);
    assert.equal(counts[0], 2, set.id);
    assert.equal(counts.at(-1), set.pieces.length, `${set.id}: the last bonus is for the full set`);
    assert.ok(set.bonuses.at(-1).skill && Power.EFFECTS[set.bonuses.at(-1).skill.effect], `${set.id}: the full set has a set skill`);
    for (const b of set.bonuses) {
      assert.ok((b.acBonus || 0) <= 1 && (b.attackBonus || 0) <= 1 && (b.damageBonus || 0) <= 2 && (b.spellAttackBonus || 0) <= 1 && (b.spellDcBonus || 0) <= 1, `${set.id} ${b.pieces}`);
      assert.ok((b.stats?.dealt || 0) <= 0.1 && !b.stats?.taken, `${set.id} ${b.pieces}: sets add no damage-taken cut`);
      for (const k of Object.keys(b.skillBonuses || {})) assert.ok(SKILLS[k], `${set.id}: ${k}`);
    }
    for (const id of set.pieces) { assert.ok(!inSets.has(id), `${id} is in one set`); inSets.add(id); }
  }
  assert.deepEqual(LATE.filter((i) => i.set).map((i) => i.id).sort(), [...inSets].sort(), 'every set piece is listed in its set');
  // Every class has its own sets, one in each version, that no other class can wear (Curtis, 22 November 2026).
  for (const c of Object.keys(CLASSES)) for (const grade of ['Book Four', 'Final']) {
    const own = SETS.filter((s) => s.grade === grade && JSON.stringify(ITEMS[s.pieces[0]].requires.classes) === JSON.stringify([c]));
    assert.equal(own.length, 1, `${c}: one ${grade} set of its own`);
  }
  // Every class and companion has a set of its own.
  for (const c of Object.keys(CLASSES)) assert.ok(SETS.some((s) => Gear.unmet(hero(c, 100).player, ITEMS[s.pieces[0]]) === null), c);
  for (const m of ['orin', 'maren', 'nessa']) assert.ok(SETS.some((s) => s.pieces.every((id) => Gear.unmet({ ...COMPANIONS[m], level: 100 }, ITEMS[id]) === null)), m);
});

test('wearing set pieces turns on their bonuses, and a refined copy still counts', () => {
  const s = hero('fighter', 65);
  const a = s.player;
  for (const id of ['bellwarden-hammer', 'bellwarden-plate', 'bellwarden-shield', 'bellwarden-seal']) E.addItem(s, id, 1, []);
  a.equipment = { mainHand: 'bellwarden-hammer', offHand: null, armor: 'frostforged-plate', accessory: null };
  G.derive(a);
  const base = { ac: a.ac, hit: G.weaponProfile(a).attackBonus };
  // Both plates are base AC 23, so the difference is the two-piece bonus.
  a.equipment.armor = 'bellwarden-plate'; G.derive(a);
  assert.deepEqual(Gear.setCounts(a), { 'bellwarden-oath': 2 });
  assert.equal(Gear.setBonuses(a).length, 1);
  assert.equal(a.ac, base.ac + 1, 'two pieces: +1 AC');
  a.equipment.offHand = 'bellwarden-shield'; G.derive(a);
  assert.equal(G.weaponProfile(a).attackBonus, base.hit + 1, 'three pieces: +1 to hit');
  assert.ok(!Gear.skills(a).some((k) => k.itemId === 'set-bellwarden-oath'));
  a.equipment.accessory = 'bellwarden-seal'; G.derive(a);
  const setSkill = Gear.skills(a).find((k) => k.itemId === 'set-bellwarden-oath');
  assert.ok(setSkill && setSkill.name === 'Oathbell' && setSkill.source === "Bellwarden's Oath set");
  // A Masterwork refine is the same piece.
  E.addItem(s, 'bellwarden-plate-fine', 1, []);
  a.equipment.armor = 'bellwarden-plate-fine'; G.derive(a);
  assert.equal(Gear.setCounts(a)['bellwarden-oath'], 4);
  // Taking a piece off turns its bonus off again.
  a.equipment.accessory = null; G.derive(a);
  assert.equal(Gear.setCounts(a)['bellwarden-oath'], 3);
  assert.ok(!Gear.skills(a).some((k) => k.itemId === 'set-bellwarden-oath'));
});

test('a full set gives a set skill: a bonus action once per fight', () => {
  let s = hero('rogue', 65);
  for (const id of ['thornstep-rapier', 'thornstep-leathers', 'thornstep-band']) { E.addItem(s, id, 1, []); s = E.resolveAction(s, { type: 'equip', itemId: id }).state; }
  assert.equal(Gear.setCounts(s.player).thornstep, 3);
  s = E.resolveAction(s, { type: 'practice' }, R.createSeededRng(41)).state;
  const view = E.buildView(s);
  const action = view.combat.actions.find((x) => x.id === 'gear:set-thornstep');
  assert.ok(action && !action.disabled, 'the set skill is offered');
  assert.match(action.description, /^Thornstep set: /);
  let out = E.resolveAction(s, { type: 'combat', actionId: 'gear:set-thornstep' }, R.createSeededRng(3));
  assert.equal(out.result.ok, true, out.result.error);
  assert.ok(out.state.combat.actors.find((x) => x.id === 'player').conditions.some((c) => c.id === 'empowered'));
  out = E.resolveAction(out.state, { type: 'combat', actionId: 'gear:set-thornstep' }, R.createSeededRng(3));
  assert.equal(out.result.ok, false, 'once per fight');
});

test('gear with set bonuses still cuts damage taken by at most 30% and adds at most 50% to damage dealt', () => {
  assert.equal(G.MAX_GEAR_DEALT, 0.5);
  const s = hero('rogue', 100), a = s.player;
  a.equipment = { mainHand: 'nightbriar-blade', offHand: null, armor: 'nightbriar-leathers', accessory: 'nightbriar-ring' };
  assert.ok(Gear.stats(a).dealt > 0.5, 'the full set adds up past the cap');
  G.derive(a);
  assert.equal(a.gearDealt, 0.5);
  const f = hero('fighter', 100).player;
  f.equipment = { mainHand: 'highbell-warhammer', offHand: 'highbell-tower-shield', armor: 'highbell-plate', accessory: 'highbell-seal' };
  G.derive(f);
  assert.equal(f.gearTaken, -0.3);
});

test('item cards and the equipment screen show the set and its bonuses', () => {
  const s = hero('ranger', 90);
  for (const id of ['farwatch-greatbow', 'farwatch-mantle']) { E.addItem(s, id, 1, []); }
  const after = E.resolveAction(E.resolveAction(s, { type: 'equip', itemId: 'farwatch-greatbow' }).state, { type: 'equip', itemId: 'farwatch-mantle' }).state;
  const view = E.buildView(after);
  const card = view.inventory.find((i) => i.id === 'farwatch-mantle');
  assert.match(card.purpose, /Part of the Farwatch set \(3 pieces: Farwatch Greatbow, Farwatch Mantle and Farwatch Horn\)\. 2 pieces: \+1 to hit with weapons, 5% more damage dealt\. 3 pieces: .*set skill Farwatch Volley/);
  assert.equal(card.set.worn, 2);
  assert.ok(card.purpose.includes(card.set.text), 'the card can lift the set text out of the purpose');
  assert.deepEqual(view.player.sets.map((x) => [x.id, x.worn, x.active.length, x.next.pieces]), [['farwatch', 2, 1, 3]]);
});

test('Briarwatch and Highpass sell each late tier from its level, once Book Three has begun', () => {
  const sold = LATE.filter((i) => !i.exclusive);
  for (const town of ['briarwatch', 'highpass']) for (const item of sold) assert.ok(TOWNS[town].stockByLevel[String(lv(item))]?.includes(item.id), `${town}: ${item.id}`);
  const at44 = begun('fighter', 44), at45 = begun('fighter', 45), at100 = begun('fighter', 100);
  assert.ok(!W.townStock(at44, 'briarwatch').includes('frostforged-plate'));
  assert.ok(W.townStock(at45, 'briarwatch').includes('frostforged-plate'));
  assert.ok(!W.townStock(at45, 'highpass').includes('rimeheart-longsword'));
  assert.ok(W.townStock(at100, 'highpass').includes('highbell-seal'));
  // Not for a save that has never begun Book Three, at any level.
  assert.deepEqual(W.townStock(hero('fighter', 100), 'briarwatch'), TOWNS.briarwatch.stock);
});

test('level bounties past the books give their item once, at or above its level', () => {
  const api = { awardXp: E.awardXp, enterNode: E.enterNode, actors: G.actors };
  const claim = (s, town) => { s.world.townId = town; s.story.nodeId = `town-${town}`; s.world.bounty = { nodeId: `town-${town}`, townId: town, level: s.player.level }; Bounty.finish(s, 'victory', [], api); };
  const count = (s, id) => s.player.inventory.filter((e) => e.itemId === id).reduce((n, e) => n + e.quantity, 0);
  const rewards = LATE.filter((i) => i.exclusive?.event);
  assert.equal(rewards.length, 6);
  for (const item of rewards) {
    const [, town, level] = item.exclusive.event.split(':');
    assert.ok(TOWNS[town] && !TOWNS[town].emptied, item.id);
    const s = begun('fighter', Number(level));
    // Claim until the town's level bounties up to this level are all given.
    for (let n = 0; n < 8 && !count(s, item.id); n++) claim(s, town);
    assert.equal(count(s, item.id), 1, item.id);
    claim(s, town);
    assert.equal(count(s, item.id), 1, `${item.id} once`);
    const low = begun('fighter', Number(level) - 1);
    for (let n = 0; n < 8; n++) claim(low, town);
    assert.equal(count(low, item.id), 0, `${item.id} not below ${level}`);
  }
});

test('the forge keeps AI-found gear growing to 100, a step behind the shops', () => {
  for (const t of Gear.TEMPLATES) {
    let last = null;
    for (const level of [40, 60, 80, 100]) {
      const i = Gear.forge({ template: t, level });
      const n = (i.attackBonus || 0) + (i.damageBonus || 0) + (i.spellAttackBonus || 0) + (i.armor?.base || 0);
      if (last !== null) assert.ok(n >= last, `${t} ${level}`);
      last = n;
    }
  }
  const blade = Gear.forge({ template: 'blade', level: 100 });
  assert.ok(blade.attackBonus < ITEMS['highbell-warhammer'].attackBonus && blade.damageBonus < ITEMS['highbell-warhammer'].damageBonus);
});

test('Book Three stays hidden: the late gear changes no book', () => {
  assert.equal(Book.SHELF.find((b) => b.n === 3).out, 0);
});
