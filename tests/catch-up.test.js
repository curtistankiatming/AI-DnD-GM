'use strict';
// Falling behind and catching up (combat plan step 2): chapters pay about 70%
// of a level, more than 5 levels under a chapter makes it harder, and the
// bounty board is a repeatable fight at the hero's level.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), XP = require('../src/xp');
const Bounty = require('../src/bounty');
const { QUESTS } = require('../src/expansion');
const { createSeededRng } = require('../src/rules');
const { chooseAction } = require('./player-policy');

function hero(level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = createSeededRng(3)) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, r.result.error); return r; }
// A hero of `level` in the town where chapter `id` starts, every earlier chapter done.
function ready(id, level) {
  const q = QUESTS[id];
  const s = hero(level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold'].filter((t) => t !== 'merrowgate' && t !== 'cinderfold' || t === q.town);
  s.world.townId = q.town; s.story.nodeId = `town-${q.town}`; W.init(s);
  return s;
}
// Plays a fight out with the scripted player.
function fight(s, rng = createSeededRng(9)) {
  const memory = {}; let last;
  for (let i = 0; i < 300 && s.combat?.active; i++) { last = E.resolveAction(s, chooseAction(E.buildView(s), memory, 'direct'), rng); s = last.state; }
  return { s, events: last?.events || [] };
}

test('Books One and Two pay about 70% of a level per chapter; Book Three keeps one level', () => {
  for (const q of Object.values(QUESTS).filter((x) => x.xp > 0 && !x.sideJob)) {
    if ((q.book || 1) <= 2) assert.equal(q.xp, XP.chapterXp(q.level), q.id);
    else assert.equal(q.xp, P.levelBand(q.level), q.id);
  }
  assert.equal(XP.chapterXp(10), Math.round(P.levelBand(10) * 0.7 / 10) * 10);
});

test('the under-level penalty starts past 5 levels under and stops growing at 10', () => {
  assert.deepEqual([5, 6, 8, 10, 14].map((under) => XP.underSteps(20 - under, 20)), [0, 1, 3, 5, 5]);
  assert.equal(XP.underSteps(25, 20), 0, 'Being over-levelled is no penalty.');
});

test('past level 20 each missing level counts three times in the fight, capped, since a level there adds little power', () => {
  assert.equal(XP.underSteps(14, 20), 1, 'A level 20 chapter keeps single steps.');
  assert.deepEqual([5, 6, 8, 10].map((under) => XP.underSteps(27 - under, 27)), [0, 3, 7, 9]);
  assert.equal(XP.underSteps(14, 21), 2, 'Missing levels below 20 are not weighted.');
  assert.equal(XP.underSteps(20, 30), XP.UNDER_LATE_MAX, 'The weighted penalty is capped.');
  assert.equal(XP.underSteps(30, 27), 0);
  assert.equal(XP.underChecks(17, 27), 5, 'Story checks keep single steps, at most 5.');
});

test('a written chapter can be started up to 10 levels under, never further', () => {
  const q = QUESTS.harbour;
  assert.equal(W.unlocked(ready('harbour', q.level - 10), q), true);
  assert.equal(W.unlocked(ready('harbour', q.level - 11), q), false);
  const card = E.buildView(ready('harbour', q.level - 7)).world.quests.find((c) => c.id === 'harbour');
  assert.equal(card.underBy, 7); assert.equal(card.underSteps, 2); assert.equal(card.canDepart, true);
});

test('more than 5 levels under, the chapter\'s enemies hit harder and its checks are harder', () => {
  const q = QUESTS.harbour, behind = ready('harbour', q.level - 7), even = ready('harbour', q.level);
  const enter = (s) => { s = act(s, { type: 'depart', questId: 'harbour' }).state; s = act(s, { type: 'story-choice', choiceId: 'advance' }).state; return act(s, { type: 'story-choice', choiceId: 'direct' }).state; };
  const a = enter(behind), b = enter(even);
  const check = (s) => E.buildView(s).scene.choices.find((c) => c.id === 'resolve').check;
  assert.equal(check(a).dc - check(b).dc, 2);
  assert.ok(check(a).reasons.some((r) => /levels under/.test(r)));
  const foes = (s) => act(s, { type: 'story-choice', choiceId: 'confront' }).state.combat.actors.filter((x) => x.team === 'enemy');
  const fa = foes(a), fb = foes(b);
  assert.equal(fa[0].attack.bonus - fb[0].attack.bonus, 2);
  assert.ok(fa[0].conditions.some((c) => c.id === 'outclassing' && Math.abs(c.dealt - 0.2) < 1e-9));
  assert.ok(!fb[0].conditions.some((c) => c.id === 'outclassing'));
});

test('the bounty board opens after the bell and pays battle XP and gold, as often as you like', () => {
  const early = hero(2); early.world.townId = 'briarwatch'; early.story.nodeId = 'town-briarwatch';
  assert.equal(E.buildView(early).world.bounty.available, false);
  assert.equal(E.resolveAction(early, { type: 'bounty' }, createSeededRng(1)).result.ok, false);
  let s = ready('marsh', 2); s.player.xp = P.XP_NEXT[1];
  for (let round = 0; round < 2; round++) {
    s = act(s, { type: 'town-service', serviceId: 'civic-rest' }).state;
    const before = { xp: s.player.xp, gold: s.player.gold }, offer = E.buildView(s).world.bounty;
    assert.equal(offer.available, true); assert.ok(offer.reward.xp > 0 && offer.reward.gold > 0);
    s = act(s, { type: 'bounty' }).state;
    assert.equal(s.combat.encounterId, 'bounty'); assert.match(s.combat.name, /^Bounty: /);
    assert.equal(s.world.activeQuest, null, 'A bounty is not an expedition.');
    const out = fight(s); s = out.s;
    assert.equal(s.combat, null); assert.equal(s.story.nodeId, `town-${QUESTS.marsh.town}`);
    assert.equal(s.player.xp - before.xp, offer.reward.xp); assert.equal(s.player.gold - before.gold, offer.reward.gold);
    assert.equal(s.story.flags['won:bounty'], undefined, 'Bounties stay repeatable.');
  }
});

test('bounty XP never takes the hero past the chapter\'s level', () => {
  let s = ready('marsh', 3); s.player.xp = P.XP_NEXT[3] - 10;
  const offer = E.buildView(s).world.bounty;
  assert.equal(offer.capped, true); assert.equal(offer.reward.xp, 9);
  s = fight(act(s, { type: 'bounty' }).state).s;
  assert.equal(s.player.level, 3); assert.equal(s.player.xp, P.XP_NEXT[3] - 1);
});

test('giving up a bounty costs a tenth of your gold and leaves an expedition untouched', () => {
  let s = ready('marsh', 3); s.player.gold = 160;
  s.world.activeQuest = 'marsh'; s.world.progress.marsh = { node: 'q-marsh-approach' };
  s = act(s, { type: 'bounty' }).state;
  s = act(s, { type: 'combat', actionId: 'retreat' }).state;
  assert.equal(s.combat, null); assert.equal(s.player.gold, 144);
  assert.equal(s.story.nodeId, `town-${QUESTS.marsh.town}`);
  assert.equal(s.world.activeQuest, 'marsh'); assert.ok(!s.world.pendingBattle);
  assert.equal(s.world.progress.marsh.setback, undefined); assert.equal(s.world.setbacks, 0);
  assert.ok(s.player.hp >= 1);
});

test('a bounty fight is shaped for the hero\'s level and the town', () => {
  const s = act(ready('marsh', 8), { type: 'bounty' }).state;
  const main = s.combat.actors.find((a) => a.refId === 'bounty-main'), f = XP.foeStats(XP.challenge({ level: 8 }));
  assert.equal(main.name, Bounty.board(QUESTS.marsh.town).main);
  assert.equal(main.attack.bonus, f.main.attackBonus); assert.equal(main.ac, f.main.ac);
});

test('the Oath of the Road and other no-XP chapters keep their exact level', () => {
  for (const id of ['trial', 'aftermath']) {
    const q = QUESTS[id];
    assert.equal(W.unlocked(ready(id, q.level - 1), q), false, `${id} below its level`);
    assert.equal(E.buildView(ready(id, q.level - 1)).world.quests.find((c) => c.id === id)?.minLevel ?? q.level, q.level);
  }
});

test('a bounty loss never costs more than a win pays', () => {
  const s = ready('marsh', 3); s.player.gold = 5000;
  assert.equal(Bounty.lossCost(s), Bounty.gold(3));
  assert.equal(E.buildView(s).world.bounty.loss, Bounty.gold(3));
});

test('a bounty pays more while the hero is behind the chapter', () => {
  const behind = ready('harbour', QUESTS.harbour.level - 3), even = ready('harbour', QUESTS.harbour.level);
  even.player.xp = P.XP_NEXT[QUESTS.harbour.level - 1];
  const share = (s) => Bounty.reward(s);
  assert.equal(share(behind).behind, true); assert.equal(share(even).behind, false);
  const L = behind.player.level, f = XP.foeStats(XP.challenge({ level: L }));
  const base = XP.battleXp(L, [f.main, f.retainer, f.retainer], 'normal', L).xp;
  assert.ok(base > 0);
  assert.equal(share(behind).xp, Math.round(base * Bounty.CATCH_UP / 10) * 10);
});

test('after the written story, bounties stop at level 20', () => {
  const s = hero(20); s.world.completed.bell = { xp: 0, gold: 0 };
  for (const q of Object.values(QUESTS)) if ((q.book || 1) <= 2) s.world.completed[q.id] = { xp: 0, gold: 0 };
  s.world.townId = 'briarwatch'; s.story.nodeId = 'town-briarwatch'; W.init(s);
  const room = Bounty.room(s);
  assert.equal(room, P.XP_NEXT[20] - 1 - s.player.xp);
  s.player.xp = P.XP_NEXT[20] - 1;
  assert.equal(E.buildView(s).world.bounty.reward.xp, 0);
});

// Codex's Wizard grind review (docs/reviews/codex-difficulty-grind-2026-11-25.md):
// a hero who finishes the last book they can play below level 20 earns the
// catch-up rate on the way to the 2nd job, as one between 20 and 40 does.
test('after the written story, a hero under level 20 gets the catch-up rate toward the 2nd job', () => {
  const s = hero(17); s.world.completed.bell = { xp: 0, gold: 0 };
  for (const q of Object.values(QUESTS)) if ((q.book || 1) <= 2) s.world.completed[q.id] = { xp: 0, gold: 0 };
  s.world.townId = 'briarwatch'; s.story.nodeId = 'town-briarwatch'; W.init(s);
  const b = E.buildView(s).world.bounty, L = s.player.level, f = XP.foeStats(XP.challenge({ level: L }));
  const base = XP.battleXp(L, [f.main, f.retainer, f.retainer], 'normal', L).xp;
  assert.equal(b.catchUp, true);
  assert.equal(b.reward.xp, Math.round(base * Bounty.CATCH_UP / 10) * 10);
});

test('a bounty lost mid-expedition survives a save round trip and leaves the expedition alone', () => {
  let s = ready('marsh', 3); s.player.gold = 100;
  s.world.activeQuest = 'marsh'; s.world.progress.marsh = { node: 'q-marsh-approach' }; s.world.pendingBattle = 'quest:marsh';
  s = act(s, { type: 'bounty' }).state;
  s = JSON.parse(JSON.stringify(s));
  for (const a of s.combat.actors) if (a.team === 'party') a.hp = 0;
  for (const a of s.party) a.hp = 0;
  s.player.hp = 0;
  const out = E.resolveAction(s, { type: 'combat', actionId: 'end-turn' }, createSeededRng(4));
  s = out.state;
  if (s.combat?.active) s = act(s, { type: 'combat', actionId: 'retreat' }).state;
  assert.equal(s.combat, null); assert.equal(s.world.bounty, undefined);
  assert.equal(s.world.activeQuest, 'marsh'); assert.equal(s.world.pendingBattle, 'quest:marsh');
  assert.equal(s.story.nodeId, `town-${QUESTS.marsh.town}`); assert.ok(s.player.hp >= 1);
});
