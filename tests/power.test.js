'use strict';
// Damage from stats, buffs and debuffs, chain attacks and Burning (src/power.js).
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), R = require('../src/rules'), Power = require('../src/power');
const { makeSandbox } = require('../src/public-preview');

function practice(classId, level) { return E.resolveAction(makeSandbox({ classId, level }), { type: 'practice' }, R.createSeededRng(41)).state; }
const enemyOf = s => s.combat.actors.find(a => a.team === 'enemy' && a.hp > 0);

test('power tiers start at level 5 and never go negative', () => {
  assert.equal(Power.tier(1), 0); assert.equal(Power.tier(4), 0);
  assert.equal(Power.tier(5), 1); assert.equal(Power.tier(11), 2); assert.equal(Power.tier(17), 3);
  assert.ok(Power.tier(40) > Power.tier(20));
  const weak = { team: 'party', level: 17, abilities: { str: 6 } };
  assert.equal(Power.statDamage(weak, 'str'), 0);
  assert.equal(Power.statDamage({ team: 'party', level: 17, abilities: { str: 18 } }, 'str'), 12);
  assert.equal(Power.statDamage({ team: 'enemy', level: 17, abilities: { str: 18 } }, 'str'), 0);
});

test('buffs and debuffs stack on the damage factor and on armour', () => {
  const cond = (...ids) => ({ conditions: ids.map(id => ({ id })) });
  assert.equal(Power.damageFactor(cond(), cond()), 1);
  assert.equal(Power.damageFactor(cond('empowered'), cond('vulnerable')), 1.5);
  assert.equal(Power.damageFactor(cond('weakened'), cond('fortified')), 0.5);
  assert.equal(Power.damageFactor(null, cond('vulnerable')), 1.25);
  assert.equal(Power.acShift(cond('slowed')), -2);
});

test('chain attacks build on the same enemy in the same round and reset otherwise', () => {
  const combat = { round: 1 }, a = { team: 'party' }, foe = { id: 'x', team: 'enemy' }, other = { id: 'y', team: 'enemy' };
  assert.equal(Power.chainHit(combat, a, foe), 0);
  assert.equal(Power.chainHit(combat, a, foe), 0.15);
  assert.equal(Power.chainHit(combat, a, foe), 0.3);
  assert.equal(Power.chainHit(combat, a, other), 0);
  combat.round = 2; assert.equal(Power.chainHit(combat, a, other), 0);
  for (let i = 0; i < 10; i++) Power.chainHit(combat, a, other);
  assert.equal(Power.chainHit(combat, a, other), Power.CHAIN_MAX);
  assert.equal(Power.chainHit(combat, { team: 'enemy' }, { id: 'p', team: 'party' }), 0);
});

test('a high-level hero hits harder than the same hero without the stat bonus', () => {
  let total = 0, base = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const s = practice('fighter', 10), foe = enemyOf(s); foe.hp = foe.maxHp = 9999; foe.ac = 1;
    const out = E.resolveAction(s, { type: 'combat', actionId: 'weapon-attack', targetId: foe.id }, R.createSeededRng(seed));
    assert.equal(out.result.ok, true);
    total += 9999 - enemyOf(out.state).hp;
    base += Power.statDamage(out.state.combat.actors.find(a => a.id === 'player'), 'str');
  }
  assert.ok(base > 0, 'a level 10 fighter has a strength bonus');
  assert.ok(total >= base, `stat damage is included (${total} >= ${base})`);
});

test('a Vulnerable enemy takes more from the same roll', () => {
  const hit = vulnerable => {
    const s = practice('fighter', 10), foe = enemyOf(s); foe.hp = foe.maxHp = 9999; foe.ac = 1;
    if (vulnerable) foe.conditions.push({ id: 'vulnerable', name: 'Vulnerable' });
    const out = E.resolveAction(s, { type: 'combat', actionId: 'weapon-attack', targetId: foe.id }, R.createSeededRng(7));
    return 9999 - out.state.combat.actors.find(a => a.id === foe.id).hp;
  };
  const plain = hit(false), more = hit(true);
  assert.ok(plain > 0);
  assert.ok(more > plain, `${more} > ${plain}`);
});

test('Fire Bolt sets the target Burning for its level', () => {
  let s = practice('wizard', 5); const foe = enemyOf(s); foe.hp = foe.maxHp = 9999; foe.ac = 1;
  const out = E.resolveAction(s, { type: 'combat', actionId: 'fire-bolt', targetId: foe.id }, R.createSeededRng(3));
  assert.equal(out.result.ok, true);
  const burning = out.state.combat.actors.find(a => a.id === foe.id).conditions.find(c => c.id === 'burning');
  assert.ok(burning, 'the target is Burning');
  assert.equal(burning.damage, Power.burnDamage(5));
  assert.ok(out.events.some(e => /is Burning/.test(e.text)));
});

test("an enemy's own buffs never scale the party's damage against it", () => {
  const hit = buffed => {
    const s = practice('fighter', 10), foe = enemyOf(s); foe.hp = foe.maxHp = 9999; foe.ac = 1;
    if (buffed) foe.conditions.push({ id: 'empowered', name: 'Empowered' });
    const out = E.resolveAction(s, { type: 'combat', actionId: 'weapon-attack', targetId: foe.id }, R.createSeededRng(7));
    return out.events.filter(e => e.type === 'damage' && /to Guild Training Echo/.test(e.text)).map(e => e.text)[0];
  };
  assert.equal(hit(true), hit(false));
});

test('a wounded boss becomes Empowered once, and only from hero level 5', () => {
  const enrage = level => {
    const s = practice('fighter', level), foe = enemyOf(s);
    foe.aiRole = 'boss'; foe.hp = Math.floor(foe.maxHp / 2);
    let texts = [];
    for (let i = 0; i < 4 && s.combat?.active; i++) {
      const out = E.resolveAction(s, { type: 'combat', actionId: 'end-turn' }, R.createSeededRng(i + 1));
      texts = texts.concat(out.events.map(e => e.text));
      Object.assign(s, out.state);
    }
    return texts.filter(t => /wounded and furious/.test(t)).length;
  };
  assert.equal(enrage(4), 0);
  assert.equal(enrage(5), 1);
});

test('the combat view says what each buff and debuff does', () => {
  const s = practice('fighter', 5), foe = enemyOf(s);
  foe.conditions.push({ id: 'vulnerable', name: 'Vulnerable to Crossfire' });
  const seen = E.buildView(s).combat.actors.find(a => a.id === foe.id).conditions.find(c => c.id === 'vulnerable');
  assert.equal(seen.effect, Power.EFFECTS.vulnerable.text);
});

test('a chain does not carry into the next fight', () => {
  const s = practice('fighter', 5);
  s.combat.chain = { targetId: enemyOf(s).id, round: 1, count: 4 };
  const next = practice('fighter', 5);
  assert.equal(next.combat.chain, undefined);
  assert.equal(Power.chainHit(next.combat, { team: 'party' }, enemyOf(next)), 0);
});
