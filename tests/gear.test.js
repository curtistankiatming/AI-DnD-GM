'use strict';
// Equipment requirements, special stats, item skills and story abilities (src/gear.js).
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), R = require('../src/rules'), Gear = require('../src/gear'), G = require('../src/equipment');
const { ITEMS } = require('../src/content');
const { makeSandbox } = require('../src/public-preview');

const sandbox = (classId = 'fighter', level = 10) => makeSandbox({ classId, level });
const give = (s, id) => { E.addItem(s, id, 1, []); return s; };
const equip = (s, itemId, actorId = 'player') => E.resolveAction(s, { type: 'equip', itemId, actorId });

test('requirements say what is missing, in plain words', () => {
  const s = sandbox('wizard', 5);
  assert.equal(Gear.requirementText(ITEMS['ember-brand']), 'Level 8 · Strength 13');
  assert.match(Gear.unmet(s.player, ITEMS['ember-brand']), /^Needs level 8 \(you are 5\) and Strength 13 \(you have \d+\)\.$/);
  assert.equal(Gear.unmet(s.player, ITEMS['iron-longsword']), null);
  assert.match(Gear.unmet(s.party.find(m => m.id === 'maren'), ITEMS['veilstep-cloak']), /^Only a Rogue, Ranger or Bard can use this\.$/);
});

test('an item the wearer does not qualify for cannot be put on, and nothing changes', () => {
  const s = give(sandbox('wizard', 5), 'ember-brand');
  const before = JSON.stringify(s.player.equipment);
  const out = equip(s, 'ember-brand');
  assert.equal(out.result.ok, false);
  assert.match(out.result.error, /^You can't use Ember Brand\. Needs level 8/);
  assert.equal(JSON.stringify(out.state.player.equipment), before);
});

test('the comparison explains why someone cannot wear it, and who can', () => {
  const s = give(sandbox('fighter', 10), 'bulwark-shield');
  const view = E.buildView(s).inventory.find(i => i.id === 'bulwark-shield');
  const byId = Object.fromEntries(view.comparisons.map(c => [c.actorId, c]));
  assert.equal(byId.orin.blocked, null, 'Orin is a fighter with the strength for it');
  assert.match(byId.maren.blocked || '', /Needs/);
  assert.match(view.purpose, /Requires: Fighter or Cleric · Strength 13\./);
  assert.match(view.purpose, /Skill, Brace/);
});

test('old saves keep items their party already wears', () => {
  const s = give(sandbox('wizard', 5), 'oathbound-mail');
  s.player.equipment.armor = 'oathbound-mail';
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.player.equipment.armor, 'oathbound-mail');
});

test('special stats change damage dealt and taken', () => {
  const s = give(give(sandbox('fighter', 10), 'warden-signet'), 'oathbound-mail');
  assert.equal(equip(s, 'warden-signet').result.ok, true);
  const p = equip(s, 'warden-signet').state.player;
  assert.equal(p.gearDealt, 0.1);
  const hit = (gearDealt) => {
    const st = E.resolveAction(sandbox('fighter', 10), { type: 'practice' }, R.createSeededRng(41)).state;
    const me = st.combat.actors.find(a => a.id === 'player'); me.gearDealt = gearDealt;
    const foe = st.combat.actors.find(a => a.team === 'enemy'); foe.hp = foe.maxHp = 9999; foe.ac = 1;
    const out = E.resolveAction(st, { type: 'combat', actionId: 'weapon-attack', targetId: foe.id }, R.createSeededRng(7));
    return 9999 - out.state.combat.actors.find(a => a.id === foe.id).hp;
  };
  assert.ok(hit(0.5) > hit(0), 'more damage with the bonus');
});

test('an item skill is a bonus action once per fight', () => {
  let s = give(sandbox('fighter', 10), 'ember-brand');
  s = equip(s, 'ember-brand').state;
  s = E.resolveAction(s, { type: 'practice' }, R.createSeededRng(41)).state;
  const foe = s.combat.actors.find(a => a.team === 'enemy' && a.hp > 0);
  const action = E.buildView(s).combat.actions.find(a => a.id === 'gear:ember-brand');
  assert.ok(action && !action.disabled);
  let out = E.resolveAction(s, { type: 'combat', actionId: 'gear:ember-brand', targetId: foe.id }, R.createSeededRng(3));
  assert.equal(out.result.ok, true);
  assert.ok(out.state.combat.actors.find(a => a.id === foe.id).conditions.some(c => c.id === 'burning'));
  out = E.resolveAction(out.state, { type: 'combat', actionId: 'gear:ember-brand', targetId: foe.id }, R.createSeededRng(3));
  assert.equal(out.result.ok, false);
});

test('a companion uses a worn item skill on their turn', () => {
  let s = give(sandbox('wizard', 10), 'bulwark-shield');
  s = equip(s, 'bulwark-shield', 'orin').state;
  s = E.resolveAction(s, { type: 'practice' }, R.createSeededRng(41)).state;
  let texts = [];
  for (let i = 0; i < 3 && s.combat?.active; i++) {
    const out = E.resolveAction(s, { type: 'combat', actionId: 'end-turn' }, R.createSeededRng(i + 1));
    texts = texts.concat(out.events.map(e => e.text)); s = out.state;
  }
  assert.ok(texts.some(t => /Orin Stoneward uses Brace/.test(t)), texts.join('\n'));
});

test('a story ability gives advantage once per long rest, for whoever wears it', () => {
  let s = give(sandbox('rogue', 10), 'veilstep-cloak');
  s = equip(s, 'veilstep-cloak').state;
  const choice = { id: 'sneak', check: { skill: 'stealth', dc: 15, hero: true } };
  const plan = E.checkPlan(s, choice);
  assert.equal(plan.advantage, true);
  assert.equal(plan.storyItemId, 'veilstep-cloak');
  Gear.spendStory(s, plan);
  assert.equal(E.checkPlan(s, choice).storyItemId, null);
  Gear.refreshStory(s);
  assert.equal(E.checkPlan(s, choice).storyItemId, 'veilstep-cloak');
});

test('passing an item round does not reuse its story ability', () => {
  let s = give(sandbox('fighter', 10), 'warden-signet');
  s = equip(s, 'warden-signet').state;
  const choice = { id: 'read', check: { skill: 'insight', dc: 15 } };
  Gear.spendStory(s, E.checkPlan(s, choice, s.player));
  s = E.resolveAction(s, { type: 'unequip', slot: 'accessory', actorId: 'player' }).state;
  s = equip(s, 'warden-signet', 'orin').state;
  assert.equal(E.checkPlan(s, choice, s.party.find(m => m.id === 'orin')).storyItemId, null);
  give(s, 'warden-signet');
  assert.equal(E.checkPlan(s, choice, s.party.find(m => m.id === 'orin')).storyItemId, 'warden-signet', 'a second copy gives a second use');
});

test('the Thornward Cloak keeps working with old saves and the character sheet', () => {
  const s = sandbox('ranger', 5);
  give(s, 'thornward-cloak'); s.player.equipment.accessory = 'thornward-cloak';
  s.player.used = { cloakReady: false };
  const choice = { id: 't', check: { skill: 'survival', dc: 12, hero: true } };
  assert.equal(E.checkPlan(s, choice).usesCloak, false, 'an old save that spent it stays spent');
  Gear.refreshStory(s);
  const plan = E.checkPlan(s, choice);
  assert.equal(plan.usesCloak, true);
  Gear.spendStory(s, plan);
  assert.equal(s.player.used.cloakReady, false);
  assert.equal(E.buildView(s).player.cloakReady, false);
});

test('a companion never takes two bonus actions in a turn', () => {
  let s = give(sandbox('fighter', 10), 'bulwark-shield');
  s = equip(s, 'bulwark-shield', 'orin').state;
  s = E.resolveAction(s, { type: 'practice' }, R.createSeededRng(41)).state;
  const orin = s.combat.actors.find(a => a.refId === 'orin'); orin.hp = Math.floor(orin.maxHp / 3);
  const out = E.resolveAction(s, { type: 'combat', actionId: 'end-turn' }, R.createSeededRng(1));
  const texts = out.events.map(e => e.text).join('\n');
  // One round runs before the player's next turn: Second Wind and Brace can't both happen in it.
  assert.ok(/Orin Stoneward's Second Wind/.test(texts), texts);
  assert.doesNotMatch(texts, /Orin Stoneward uses Brace/);
});

test('every new item is well formed', () => {
  for (const item of require('../src/data/gear.json')) {
    assert.ok(ITEMS[item.id] && item.slot && item.purpose && Gear.RARITIES.includes(item.rarity), item.id);
    if (item.skill) assert.ok(require('../src/power').EFFECTS[item.skill.effect], item.id);
    for (const c of item.requires?.classes || []) assert.ok(require('../src/content').CLASSES[c], `${item.id}: ${c}`);
  }
});

test('item skills sit with Items on the combat board', () => {
  const M = require('../public/management-view.js');
  assert.equal(M.actionGroup('gear:ember-brand', null), 'items');
});

test('the forge cannot get round a requirement', () => {
  for (const id of ['field-plate', 'greatsword']) assert.deepEqual(ITEMS[`${id}-fine`].requires, ITEMS[id].requires);
  assert.doesNotMatch(ITEMS['field-plate-fine'].purpose, /Any class/);
});

test('special stats read as more or less', () => {
  assert.match(Gear.purpose(ITEMS['oathbound-mail']), /10% less damage taken/);
  assert.match(Gear.purpose(ITEMS['warden-signet']), /10% more damage dealt/);
});
