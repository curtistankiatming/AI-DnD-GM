'use strict';
// The item catalogue (step 5): exclusives, rising prices, rewards and AI item templates.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), W = require('../src/world'), Bounty = require('../src/bounty'), Gear = require('../src/gear'), G = require('../src/equipment');
const { ITEMS } = require('../src/content');
const { TOWNS, QUESTS } = require('../src/expansion');
const { makeSandbox } = require('../src/public-preview');
const GEAR = require('../src/data/gear.json');

test('the catalogue holds 60 to 80 pieces of equipment', () => {
  const n = Object.values(ITEMS).filter(i => i.slot && !i.upgradeTier && !i.forged).length;
  assert.ok(n >= 60 && n <= 80, `${n} equippable items`);
});

test('prices rise with rarity and with the level an item needs', () => {
  for (const item of GEAR) assert.ok(item.value >= Gear.minValue(item), `${item.id}: ${item.value} < ${Gear.minValue(item)}`);
});

test('exclusive items are sold only where they say, and rewards are never sold', () => {
  for (const item of GEAR) {
    const sellers = Object.values(TOWNS).filter(t => t.stock.includes(item.id)).map(t => t.id);
    if (item.exclusive?.town) assert.deepEqual(sellers, [item.exclusive.town], item.id);
    if (item.exclusive?.quest || item.exclusive?.event) assert.deepEqual(sellers, [], item.id);
    if (item.exclusive?.quest) assert.ok(QUESTS[item.exclusive.quest], `${item.id}: ${item.exclusive.quest}`);
    if (item.exclusive?.event) assert.ok(TOWNS[item.exclusive.event.replace('bounty:', '')], item.id);
    if (!item.exclusive) assert.ok(sellers.length >= 1, `${item.id} is sold somewhere`);
  }
  assert.match(Gear.purpose(ITEMS['glasswind-bow']), /Only sold in Highpass Watch\./);
  assert.match(Gear.purpose(ITEMS['beacon-shard-blade']), /Reward for finishing/);
});

test("finishing a chapter gives its reward item once", () => {
  const s = makeSandbox({ classId: 'fighter', level: 7 }), events = [];
  assert.equal(Gear.award(s, 'quest:summit', events)?.id, 'glasswind-cloak');
  assert.equal(Gear.award(s, 'quest:summit', events), null);
  assert.equal(s.player.inventory.filter(e => e.itemId === 'glasswind-cloak').reduce((n, e) => n + e.quantity, 0), 1);
  assert.match(events[0].text, /You receive Glasswind Cloak \(Rare\)/);
});

test('the first bounty claimed in a town gives its bounty item', () => {
  let s = makeSandbox({ classId: 'fighter', level: 6 });
  s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  const api = { awardXp: E.awardXp, enterNode: E.enterNode, actors: G.actors };
  for (let i = 0; i < 2; i++) { s.world.bounty = { nodeId: 'town-highpass', townId: 'highpass', level: 6 }; Bounty.finish(s, 'victory', [], api); }
  assert.equal(s.player.inventory.filter(e => e.itemId === 'ridge-stalker-hood').reduce((n, e) => n + e.quantity, 0), 1);
  s.world.bounty = { nodeId: 'town-highpass', townId: 'highpass', level: 6 };
  const before = s.player.inventory.length; Bounty.finish(s, 'defeat', [], api);
  assert.equal(s.player.inventory.length, before, 'a lost bounty gives nothing');
});

test('AI adventure items come only from templates, with numbers bounded by level', () => {
  for (const template of Gear.TEMPLATES) for (const level of [1, 10, 20, 40, 100]) {
    const item = Gear.forge({ id: 'forged-t', template, level, from: 'A Test' });
    assert.ok((item.attackBonus || 0) <= 2 && (item.damageBonus || 0) <= 3 && (item.spellAttackBonus || 0) <= 2, `${template} ${level}`);
    assert.ok(!item.armor || item.armor.base <= 15);
    assert.ok(Object.values(item.skillBonuses || {}).every(v => v <= 3));
    assert.equal(item.requires.level, level);
    assert.ok(item.value >= Gear.minValue(item));
  }
  // A save can't make one stronger: only template, level, name and place are kept.
  const evil = Gear.forge({ id: 'forged-x', template: 'blade', level: 5, attackBonus: 99, name: '<script>Doom</script>' });
  assert.equal(evil.attackBonus, 1);
  assert.doesNotMatch(evil.name, /[<>]/);
});

test('finishing an AI adventure gives a templated item that survives a save round trip', () => {
  const s = makeSandbox({ classId: 'fighter', level: 8 }), events = [];
  const item = Gear.forgeReward(s, { id: 'gen-abc', generated: true, level: 8, name: 'The Saltmarsh Job' }, events);
  assert.ok(item && item.forged && item.requires.level === 8);
  assert.equal(Gear.forgeReward(s, { id: 'gen-abc', generated: true, level: 8, name: 'x' }, events), null, 'once per adventure');
  delete ITEMS[item.id];
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.ok(loaded.player.inventory.some(e => e.itemId === item.id), 'the found item is still in the pack');
  assert.equal(ITEMS[item.id].name, item.name);
  assert.equal(Gear.forgeReward(s, { id: 'q', level: 8 }, events), null, 'written chapters use their own rewards');
});

test('every catalogue item is well formed', () => {
  for (const item of GEAR) {
    assert.ok(item.description && item.purpose && Gear.RARITIES.includes(item.rarity), item.id);
    if (item.weapon) assert.match(item.weapon.damage, /^\d+d\d+$/, item.id);
    if (item.story) assert.ok(require('../src/content').SKILLS[item.story.skill], item.id);
  }
});

test('no new item is weaker than the Fine version of a cheaper item in the same slot', () => {
  const ac = i => (i.armor ? i.armor.base + (i.armor.dexCap === null ? 2 : Math.min(2, i.armor.dexCap)) : 0) + (i.acBonus || 0);
  const power = i => i.category === 'focus' ? (i.spellAttackBonus || 0) + (i.spellDcBonus || 0) : i.weapon ? (i.attackBonus || 0) + (i.damageBonus || 0) : ac(i);
  for (const item of GEAR.filter(i => ['weapon', 'focus', 'armor', 'shield'].includes(i.category) && i.rarity !== 'Common' && i.rarity !== 'Uncommon')) {
    for (const fine of Object.values(ITEMS).filter(f => f.upgradeTier && f.category === item.category && f.value < item.value)) {
      if (item.weapon && fine.weapon && (fine.weapon.damage !== item.weapon.damage)) continue;
      // Light armour (full Dexterity) is compared only with light armour, heavy with heavy.
      if (item.armor && fine.armor && (item.armor.dexCap === null) !== (fine.armor.dexCap === null)) continue;
      assert.ok(power(item) >= power(fine), `${item.id} (${power(item)}) is weaker than ${fine.id} (${power(fine)})`);
    }
  }
});
