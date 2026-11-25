'use strict';
// Special monsters (src/special.js, src/data/special-monsters.json) and the XP
// a written chapter's own fight pays (src/xp.js chapterBattle). Curtis,
// 25 November 2026: "check if some of the options choices that lead to battles
// give exp appropriately. Some encounters can be special monsters with
// increased difficulty, substantial exp provision and also unique equipments."
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), XP = require('../src/xp');
const S = require('../src/special'), Gear = require('../src/gear');
const { STORY_NODES, ENEMIES, ENCOUNTERS, ITEMS } = require('../src/content');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;

function hero(level) { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); s.player.progression.mastery = level >= 10; return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
// A hero at a chapter's opening scene, with every chapter before it done.
function at(id, flags = {}) {
  const q = QUESTS[id];
  let s = hero(q.level); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', q.town]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, flags); W.init(s);
  s = act(s, { type: 'recruit' }).state;
  s = act(s, { type: 'depart', questId: id }).state;
  assert.equal(s.story.nodeId, `q-${id}-start`);
  return s;
}
const choose = (s, id) => act(s, { type: 'story-choice', choiceId: id }).state;
const choices = (s) => E.buildView(s).scene.choices.map((c) => c.id);
const told = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');
function endFight(s, enemyHp) {
  for (const a of s.combat.actors) if (a.team === 'enemy') a.hp = enemyHp; else if (enemyHp) a.hp = 0;
  const me = s.combat.actors.find((a) => a.id === 'player');
  s.combat.turnIndex = s.combat.actors.indexOf(me); s.combat.awaitingPlayer = true;
  return act(s, { type: 'combat', actionId: 'end-turn' }).state;
}
const win = (s) => endFight(s, 0);

test('every special monster belongs to a written chapter, one each, with its own unique accessory', () => {
  const monsters = Object.values(S.MONSTERS);
  assert.equal(monsters.length, 8);
  assert.equal(new Set(monsters.map((m) => m.chapter)).size, monsters.length, 'one per chapter');
  const books = {};
  for (const m of monsters) {
    const q = QUESTS[m.chapter];
    assert.ok(q && !q.trial && q.xp > 0, m.id);
    books[q.book || 1] = (books[q.book || 1] || 0) + 1;
    const item = ITEMS[m.drop];
    assert.ok(item, `${m.id} drops ${m.drop}`);
    assert.equal(item.slot, 'accessory', 'accessories are shared by every class (gear-to-100 rule)');
    assert.equal(item.requires?.classes, undefined);
    assert.equal(item.exclusive?.event, `special:${m.id}`, 'never sold in a shop');
    assert.equal(item.requires?.level || 1, Math.max(1, q.level - 2), 'wearable from two levels under its chapter, like chapter rewards');
    assert.match(Gear.source(item), new RegExp(`Dropped by ${m.name}`));
    for (const key of ['lines', 'won', 'lost']) assert.ok(Array.isArray(m[key]) && m[key].length, `${m.id} ${key}`);
    assert.ok(m.power > 0);
  }
  assert.deepEqual(books, { 1: 2, 2: 2, 3: 2, 4: 2 }, 'two in each book');
  // Book Four's monsters drop warm wool-weight gear for the Wold's cold.
  assert.ok(ITEMS['whitecoat-mantle'].warm && ITEMS['snowcat-pelt'].warm);
});

test('a special monster is much stronger than its chapter\'s own boss', () => {
  for (const m of Object.values(S.MONSTERS)) {
    const q = QUESTS[m.chapter], boss = ENEMIES[`special-${m.id}`], normal = ENEMIES[q.foe];
    assert.ok(boss.maxHp >= normal.maxHp * 1.6, `${m.id} health`);
    assert.ok(XP.averageDamage(boss.attack.damage) > XP.averageDamage(normal.attack.damage), `${m.id} damage`);
    assert.ok(boss.attack.bonus > normal.attack.bonus && boss.ac > normal.ac, `${m.id} accuracy and armour`);
    assert.equal(XP.rate(q.level, ENCOUNTERS[S.encounterId(m.id)].enemies.map((e) => ENEMIES[e]), q.level), 'deadly');
  }
});

test('the hunt is offered on the chapter\'s opening, before setting out, and starts the special fight', () => {
  const s = at('marsh');
  const ids = choices(s);
  assert.ok(ids.includes('hunt-snapjaw'));
  assert.ok(ids.indexOf('hunt-snapjaw') < ids.indexOf('advance'), 'the way on stays last');
  const card = E.buildView(s).scene.choices.find((c) => c.id === 'hunt-snapjaw');
  assert.match(card.description, /special monster/);
  const t = choose(s, 'hunt-snapjaw');
  assert.equal(t.combat?.encounterId, 'special:snapjaw');
  assert.equal(t.world.activeQuest, 'marsh', 'the chapter stays in progress');
  assert.match(told(t), /Snapjaw/);
  assert.equal(choices(at('harbour')).includes('hunt-snapjaw'), false, 'only in its own chapter');
});

test('winning pays big XP, the unique item and a flag once, then goes back to the chapter', () => {
  let s = choose(at('marsh'), 'hunt-snapjaw');
  const xp = s.player.xp, nessa = s.party.find((m) => m.id === 'nessa').bond;
  s = win(s);
  const paid = s.player.xp - xp;
  assert.equal(paid, XP.share(QUESTS.marsh.level, S.SPECIAL_SHARE));
  assert.ok(paid >= 3 * XP.share(QUESTS.marsh.level, XP.BATTLE_SHARE.normal), 'worth three ordinary battles or more');
  assert.ok(s.player.inventory.some((e) => e.itemId === 'snapjaw-scute'));
  assert.equal(s.story.flags.special_snapjaw, true);
  assert.equal(s.party.find((m) => m.id === 'nessa').bond, Math.min(5, nessa + 1));
  assert.equal(s.story.nodeId, 'special-snapjaw-won');
  assert.match(told(s), /grandmother's story finished/);
  s = choose(s, 'back');
  assert.equal(s.story.nodeId, 'q-marsh-start');
  assert.equal(choices(s).includes('hunt-snapjaw'), false, 'gone once it is beaten');
  assert.ok(choices(s).includes('advance'), 'the chapter goes on as before');
  s = choose(choose(s, 'advance'), 'direct');
  assert.equal(s.story.nodeId, 'q-marsh-crisis');
});

test('losing or running costs only health: back to the chapter, and the hunt can be tried again', () => {
  for (const how of ['defeat', 'retreat']) {
    let s = choose(at('marsh'), 'hunt-snapjaw');
    const gold = s.player.gold, xp = s.player.xp;
    if (how === 'defeat') s = endFight(s, 50);
    else {
      const me = s.combat.actors.find((a) => a.id === 'player');
      s.combat.turnIndex = s.combat.actors.indexOf(me); s.combat.awaitingPlayer = true;
      const action = E.buildView(s).combat.actions.find((a) => a.id === 'retreat');
      assert.equal(action.name, 'Fall back'); assert.match(action.description, /Costs nothing but health/);
      s = act(s, { type: 'combat', actionId: 'retreat' }).state;
    }
    assert.equal(s.combat, null);
    assert.equal(s.story.nodeId, 'special-snapjaw-lost', how);
    assert.equal(s.player.gold, gold); assert.equal(s.player.xp, xp);
    assert.ok(s.player.hp >= Math.ceil(s.player.maxHp * S.LOST_HP));
    assert.equal(s.world.pendingBattle, null);
    assert.equal(s.world.activeQuest, 'marsh');
    assert.equal(s.player.inventory.some((e) => e.itemId === 'snapjaw-scute'), false);
    s = choose(s, 'back');
    assert.equal(s.story.nodeId, 'q-marsh-start');
    assert.ok(choices(s).includes('hunt-snapjaw'), `${how}: it can be hunted again`);
    s = win(choose(s, 'hunt-snapjaw'));
    assert.ok(s.player.inventory.some((e) => e.itemId === 'snapjaw-scute'));
  }
});

test('the monster\'s XP never carries the hero two levels past the story', () => {
  let s = at('marsh');
  E.awardXp(s, P.XP_NEXT[QUESTS.marsh.level + 1] - 1 - s.player.xp - QUESTS.marsh.xp, [], 'test fixture');
  const xp = s.player.xp;
  s = win(choose(s, 'hunt-snapjaw'));
  assert.ok(s.player.xp - xp < XP.share(QUESTS.marsh.level, S.SPECIAL_SHARE));
  assert.ok(s.player.inventory.some((e) => e.itemId === 'snapjaw-scute'), 'the item still drops');
});

test('a chapter\'s own fight pays its share when won, and the chapter the rest: the total is unchanged', () => {
  const q = QUESTS.marsh, { base } = XP.chapterBattle(q);
  assert.equal(base, XP.share(q.level, XP.CHAPTER_BATTLE_SHARE));
  let s = choose(choose(at('marsh'), 'advance'), 'direct');
  const start = s.player.xp;
  s = win(choose(s, 'confront'));
  assert.equal(s.player.xp - start, base, 'paid as soon as the fight is won');
  s = choose(s, STORY_NODES['q-marsh-after'].choices[0].id);
  assert.equal(s.player.xp - start, q.xp, 'the chapter pays the rest');
  assert.equal(s.world.completed.marsh.xp, q.xp);
  // The peaceful way pays the same in all.
  let p = choose(choose(at('marsh'), 'advance'), 'direct');
  for (const k of ['str', 'dex', 'int', 'wis', 'cha']) p.player.abilities[k] = 30;
  p.player.inspirationPrepared = true;
  const before = p.player.xp;
  p = choose(p, 'resolve');
  assert.equal(p.story.nodeId, 'q-marsh-after');
  p = choose(p, STORY_NODES['q-marsh-after'].choices[0].id);
  assert.equal(p.player.xp - before, q.xp);
});

test('a fight an earlier choice made tougher pays that much more', () => {
  const q = QUESTS['b3-greatbell'];
  assert.equal(q.flagScale.b3_vault_closed, 1.3);
  const { base, extra } = XP.chapterBattle(q, 1.3);
  assert.equal(extra, Math.round(base * 0.3 / 10) * 10);
  assert.ok(extra > 0);
  assert.equal(XP.chapterBattle(q, 0.85).extra, 0, 'an easier fight still pays the full share');
  assert.deepEqual(XP.chapterBattle(QUESTS.trial), { base: 0, extra: 0 }, 'the level 10 trial pays nothing, as before');
  const s = hero(q.level); s.world.activeQuest = q.id; s.story.flags.b3_vault_closed = true;
  const xp = s.player.xp;
  assert.equal(W.awardChapterBattleXp(s, q.id, [], { awardXp: E.awardXp }, 1.3), base + extra);
  assert.equal(s.player.xp - xp, base + extra);
  assert.equal(W.awardChapterBattleXp(s, q.id, [], { awardXp: E.awardXp }, 1.3), 0, 'once');
  assert.equal(W.battlePaid(s, q), base, 'the chapter\'s end takes off only the base share');
});
