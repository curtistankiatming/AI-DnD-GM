'use strict';
// The item catalogue (step 5): exclusives, rising prices, rewards and AI item templates.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), W = require('../src/world'), Bounty = require('../src/bounty'), Gear = require('../src/gear'), G = require('../src/equipment');
const { ITEMS } = require('../src/content');
const { TOWNS, QUESTS } = require('../src/expansion');
const { makeSandbox } = require('../src/public-preview');
const GEAR = require('../src/data/gear.json');

test('the catalogue holds 60 to 90 pieces of equipment', () => {
  const n = Object.values(ITEMS).filter(i => i.slot && !i.upgradeTier && !i.forged).length;
  assert.ok(n >= 60 && n <= 90, `${n} equippable items`);
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
    // Masterwork items are refined by the smith for twice their price, so they're left out.
    for (const fine of Object.values(ITEMS).filter(f => f.upgradeTier && !f.masterwork && f.category === item.category && f.value < item.value)) {
      if (item.weapon && fine.weapon && (fine.weapon.damage !== item.weapon.damage)) continue;
      // Light armour (full Dexterity) is compared only with light armour, heavy with heavy.
      if (item.armor && fine.armor && (item.armor.dexCap === null) !== (fine.armor.dexCap === null)) continue;
      assert.ok(power(item) >= power(fine), `${item.id} (${power(item)}) is weaker than ${fine.id} (${power(fine)})`);
    }
  }
});

test("one save's found items never reach another save", () => {
  const a = makeSandbox({ classId: 'fighter', level: 8 });
  const item = Gear.forgeReward(a, { id: 'gen-leak', generated: true, level: 8, name: 'The Leak' }, []);
  E.normalizeIncomingState(JSON.parse(JSON.stringify(a)));
  const b = makeSandbox({ classId: 'wizard', level: 3 });
  b.player.inventory.push({ itemId: item.id, quantity: 1 });
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(b)));
  assert.equal(loaded.player.inventory.some(e => e.itemId === item.id), false, 'B has no record of it, so it is dropped');
});

test('an edited found-item record no longer matches its id and is dropped', () => {
  const s = makeSandbox({ classId: 'fighter', level: 8 });
  const item = Gear.forgeReward(s, { id: 'gen-edit', generated: true, level: 8, name: 'The Edit' }, []);
  const raw = JSON.parse(JSON.stringify(s));
  raw.world.forged[0].level = 100;
  const loaded = E.normalizeIncomingState(raw);
  assert.equal(loaded.player.inventory.some(e => e.itemId === item.id), false);
  assert.equal(loaded.world.forged.length, 0);
});

test('typed commands never match another save\'s found item', () => {
  const a = makeSandbox({ classId: 'fighter', level: 8 });
  Gear.forgeReward(a, { id: 'gen-name', generated: true, level: 8, name: 'Healing Potion Hall' }, []);
  const b = makeSandbox({ classId: 'fighter', level: 3 });
  b.world.townId = 'briarwatch'; b.story.nodeId = 'town-briarwatch';
  const out = E.resolveAction(b, { type: 'freeform', text: 'buy healing potion' });
  assert.doesNotMatch(String(out.result.error || ''), /stocked item/);
});

test('found items are a template and a level, so there are at most 500 and they never change', () => {
  const a = Gear.forge({ template: 'blade', level: 12 }), b = Gear.forge({ template: 'blade', level: 12, name: 'Anything', from: 'Elsewhere' });
  assert.deepEqual(a, b);
  assert.equal(a.id, 'forged-blade-12');
  assert.equal(Gear.TEMPLATES.length * 100, 500);
});

// Items review (21 November 2026): every kind of fighter keeps finding better gear.
test('every weapon style, focus and armour type has gear for Book Three levels', () => {
  const sold = new Set(Object.values(TOWNS).flatMap(t => t.stock));
  const late = GEAR.filter(i => sold.has(i.id) && (i.requires?.level || 0) >= 20);
  const kinds = {
    strength: i => i.weapon?.ability === 'str',
    finesse: i => i.weapon?.ability === 'finesse',
    bow: i => i.weapon?.properties?.includes('ranged'),
    focus: i => i.category === 'focus',
    'light armour': i => i.armor && i.armor.dexCap === null,
    'heavy armour': i => i.armor && i.armor.dexCap === 0,
  };
  for (const [kind, is] of Object.entries(kinds)) assert.ok(late.some(is), `no ${kind} item needs level 20 or more`);
  for (const kind of ['finesse', 'bow', 'focus']) assert.ok(GEAR.some(i => kinds[kind](i) && (i.requires?.level || 0) >= 15 && (i.requires?.level || 0) < 20 && sold.has(i.id)), `no ${kind} item for levels 15-19`);
});

test('a caster who is not strong still has armour past level 12', () => {
  const maren = { id: 'maren', refId: 'maren', name: 'Maren', level: 16, abilities: require('../src/content').COMPANIONS.maren.abilities };
  assert.equal(Gear.unmet(maren, ITEMS['wardthread-robe']), null);
  assert.equal(Gear.unmet({ id: 'player', kind: 'player', classId: 'wizard', level: 15, abilities: { str: 8, dex: 14 } }, ITEMS['wardthread-robe']), null);
});

test('a Fine item is never shown as less rare than its base item', () => {
  const order = Gear.RARITIES;
  for (const fine of Object.values(ITEMS).filter(i => i.upgradeTier)) {
    const base = ITEMS[fine.baseId];
    assert.ok(order.indexOf(fine.rarity) >= Math.max(1, order.indexOf(base.rarity)), `${fine.id} is ${fine.rarity}, ${base.id} is ${base.rarity}`);
  }
  assert.equal(ITEMS['field-plate-fine'].rarity, 'Rare');
});

test('an item card says whether its story ability is ready', () => {
  const s = makeSandbox({ classId: 'rogue', level: 6 });
  G.addTo(s.player.inventory, 'signal-charm', 1);
  const card = () => E.buildView(s).inventory.find(i => i.id === 'signal-charm').purpose;
  assert.match(card(), /Story ability ready\./);
  Gear.spendStory(s, { storyItemId: 'signal-charm' });
  assert.match(card(), /Story ability used; ready again after a long rest\./);
  Gear.refreshStory(s);
  assert.match(card(), /Story ability ready\./);
  assert.doesNotMatch(ITEMS['thornward-cloak'].purpose, /character sheet/);
});

test('found items of one template have different names at nearby levels', () => {
  for (const template of Gear.TEMPLATES) {
    const names = new Set();
    for (let level = 1; level <= 16; level++) names.add(Gear.forge({ template, level }).name);
    assert.equal(names.size, 16, template);
  }
});

test('typed "equip" picks the found item you own and can wear when two share a name', () => {
  const s = makeSandbox({ classId: 'fighter', level: 3 });
  s.world.forged = [{ id: 'forged-blade-25', template: 'blade', level: 25 }, { id: 'forged-blade-1', template: 'blade', level: 1 }];
  Gear.register(s);
  G.addTo(s.player.inventory, 'forged-blade-25', 1); G.addTo(s.player.inventory, 'forged-blade-1', 1);
  const low = ITEMS['forged-blade-1'], high = ITEMS['forged-blade-25'];
  assert.equal(low.name, high.name, 'the names repeat 24 levels apart');
  const out = E.resolveAction(s, { type: 'freeform', text: `equip ${low.name.toLowerCase()}` });
  assert.equal(out.state.player.equipment.mainHand, 'forged-blade-1', 'the level 1 one, which a level 3 hero can wear');
});

// Gold sink (21 November 2026): the smith refines special gear into Masterwork.
test('the smith refines Rare and better gear into Masterwork for twice its price', () => {
  const mw = ITEMS['commandery-halberd-fine'], base = ITEMS['commandery-halberd'];
  assert.equal(mw.name, 'Masterwork Commandery Halberd');
  assert.ok(mw.masterwork && mw.rarity === 'Legendary' && !mw.exclusive);
  assert.equal(mw.attackBonus, base.attackBonus + 1);
  assert.equal(mw.damageBonus, base.damageBonus + 1);
  assert.equal(Gear.upgradeCost(base), 2 * base.value);
  assert.equal(ITEMS['harbour-cutlass-fine'].rarity, 'Epic', 'one step rarer');
  assert.equal(ITEMS['chancery-rod-fine'].spellDcBonus, ITEMS['chancery-rod'].spellDcBonus + 1);
  assert.equal(ITEMS['warden-signet-fine'].stats.dealt, 0.15);
  assert.equal(ITEMS['mirefang-dagger-fine'], undefined, 'Uncommon special items have no upgrade');
  assert.equal(Gear.upgradeCost(ITEMS['iron-longsword']), 45 + Math.floor(ITEMS['iron-longsword'].value / 2), 'basic upgrades cost what they did');
  // A refined chapter reward is not a second reward.
  const s = makeSandbox({ classId: 'fighter', level: 8 }), events = [];
  assert.equal(Gear.award(s, 'quest:summit', events)?.id, 'glasswind-cloak');
});

test('refining an equipped item charges twice its price and keeps it worn', () => {
  const s = makeSandbox({ classId: 'fighter', level: 10 }); s.player.level = 24;
  s.world.townId = 'briarwatch'; s.story.nodeId = 'town-briarwatch';
  G.addTo(s.player.inventory, 'commandery-halberd', 1);
  s.player.equipment.offHand = null; s.player.equipment.mainHand = 'commandery-halberd'; G.derive(s.player);
  s.player.gold = 2000;
  const card = E.buildView(s).world.upgrades.find(u => u.itemId === 'commandery-halberd' && u.actorId === 'player');
  assert.equal(card.cost, 1240);
  const out = E.resolveAction(s, { type: 'upgrade', itemId: 'commandery-halberd', actorId: 'player' });
  assert.equal(out.state.player.gold, 760);
  assert.equal(out.state.player.equipment.mainHand, 'commandery-halberd-fine');
  const again = E.resolveAction(out.state, { type: 'upgrade', itemId: 'commandery-halberd-fine', actorId: 'player' });
  assert.equal(again.state.player.gold, 760, 'only one upgrade');
});
