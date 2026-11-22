'use strict';
// UX review of the flows from the end of Book Two through Book Three
// (docs/reviews/claude-ux-book-three-2026-11-22.md): a short rest only when it
// helps, orders that say what they do, falling back to a ledge below the
// stair, the warning before the stair, and the end of Book Three pointing at
// the 3rd job trial, which bounties can reach without the AI game master.
process.env.BRIARWATCH_PREVIEW_BOOKS = '1';
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book'), Bounty = require('../src/bounty');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;
const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];

function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
function ready(id, level = QUESTS[id]?.level || 1) {
  let s = hero('fighter', level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...ALL_TOWNS]; s.world.townId = QUESTS[id].town; s.story.nodeId = `town-${QUESTS[id].town}`;
  Object.assign(s.story.flags, { b3_partone_done: true }); W.init(s);
  return s;
}
const at = (id, phase) => { const s = ready(id); s.story.nodeId = `q-${id}-${phase}`; s.world.activeQuest = id; s.world.onExpedition = true; return s; };
const fightAt = (id) => act(at(id, 'crisis'), { type: 'story-choice', choiceId: 'confront' }).state;
const action = (s, id) => E.buildView(s).combat.actions.find((a) => a.id === id);

test('a short rest is offered only when it would restore something', () => {
  let s = at('b3-deep', 'after');
  assert.ok(E.buildView(s).scene.id, 'q-b3-deep-after');
  for (const m of [s.player, ...s.party]) m.hp = m.maxHp;
  for (const r of Object.values(s.player.resources)) r.current = r.max;
  for (const m of s.party) P.refreshCompanion(m, 'long');
  s.player.conditions = [];
  assert.equal(E.buildView(s).scene.canShortRest, false, 'Everyone is whole: nothing to rest for.');
  assert.equal(E.resolveAction(s, { type: 'short-rest' }, high).result.ok, false);
  s.party[0].hp -= 5;
  assert.equal(E.buildView(s).scene.canShortRest, true, 'A hurt companion is a reason to rest.');
  s.party[0].hp += 5; s.player.hp -= 5;
  assert.equal(E.buildView(s).scene.canShortRest, true, 'A hurt hero with a Hit Die is a reason to rest.');
  s = act(s, { type: 'short-rest' }).state;
  assert.equal(E.buildView(s).scene.canShortRest, false, 'Once a place.');
});

test('each companion order says what it makes the companions do, and that it is free', () => {
  const s = fightAt('b3-company');
  const focus = action(s, 'order:focus'), protect = action(s, 'order:protect');
  assert.match(focus.description, /attack the enemy you pick/);
  assert.match(protect.description, /guard and heal the ally you pick/);
  for (const o of [focus, protect]) assert.match(o.description, /Free: it does not use your action, and you can give one order a round\. Without an order, each companion fights by their own tactic/);
  const cover = action(s, 'order:cover');
  if (cover) assert.match(cover.description, /help with the objective instead of attacking/);
});

test('below the stair, a retreat or a defeat falls back to the ledge, and says so before it happens', () => {
  const up = fightAt('b3-company');
  assert.equal(action(up, 'retreat').name, 'Retreat to town', 'Above the stair a retreat still goes to town.');
  for (const id of ['b3-deep', 'b3-promise', 'b3-firstbell']) {
    const s = fightAt(id), r = action(s, 'retreat');
    assert.equal(r.name, 'Fall back to the ledge', id);
    assert.match(r.description, /last safe ledge/);
    // A defeat offers to wake on the ledge, not a rescue to a town.
    for (const a of s.combat.actors.filter((x) => x.team !== 'enemy')) a.hp = 0;
    s.player.hp = 0;
    const lost = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
    lost.combat = null; lost.world.failedEncounter = `quest:${id}`; lost.story.nodeId = 'defeat';
    const recover = E.buildView(lost).scene.choices.find((c) => c.id === 'recover');
    assert.equal(recover.label, 'Wake on the last safe ledge', id);
    const woke = act(lost, { type: 'story-choice', choiceId: 'recover' }).state;
    assert.match(woke.story.nodeId, /-ledge$/, `${id}: the choice does what it says`);
  }
});

test('the chapter that starts down the stair warns that no town follows until the end of the book', () => {
  const s = ready('b3-company');
  const card = E.buildView(s).world.quests.find((q) => q.id === 'b3-company');
  assert.equal(card.straightOn, true);
  for (const id of ['b3-winter']) { const t = ready(id); assert.ok(!E.buildView(t).world.quests.find((q) => q.id === id)?.straightOn, id); }
});

test('the end of Book Three points at the 3rd job trial, and bounties can take a hero who is short to level 40', () => {
  // A hero who finished every written chapter at level 38, with a 2nd job branch.
  let s = ready('b3-firstbell', 38);
  s.player.progression.specialization = P.JOBS.fighter.branches[0].id;
  s.world.completed['b3-firstbell'] = { xp: 0, gold: 0 };
  assert.equal(Book.finished(s), true);
  assert.match(Book.ending(s), /all three books/);
  assert.match(Book.ending(s), /Your 3rd job trial opens at level 40; bounties on the town board can take you there, with or without the AI game master\./);
  const b = Bounty.view(s);
  assert.ok(b.reward.xp > 0, 'Bounties still pay XP at 38 after Book Three.');
  assert.equal(Bounty.afterBooksLevel(s), 40);
  assert.ok(Bounty.room(s) <= P.XP_NEXT[40] - 1 - s.player.xp && Bounty.room(s) > 0);
  // At level 40 the trial is ready, and the ending says where to begin it.
  E.awardXp(s, P.XP_NEXT[39] - s.player.xp, [], 'test fixture');
  assert.equal(s.player.level, 40);
  assert.match(Book.ending(s), /Your 3rd job trial is ready: begin it from What's next or the expedition board\. It is written into the game/);
  assert.equal(Bounty.room(s) < P.XP_NEXT[40] - P.XP_NEXT[39], true, 'Never past level 40.');
});

test('after Book Two alone (a free hosted account), bounties still stop at level 20', () => {
  const s = Book.grant(ready('chairs', 19), 2);
  for (const q of Object.values(QUESTS)) if ((q.book || 1) <= 2 && !q.sideJob) s.world.completed[q.id] = { xp: 0, gold: 0 };
  assert.equal(Bounty.afterBooksLevel(s), 20);
});

test('players read books and parts in words', () => {
  assert.equal(Book.bookName(3), 'Book Three');
  assert.equal(Book.partName(Book.SHELF.find((b) => b.n === 3), 2), 'Part Two, The Stair');
  assert.match(Book.bookEnd('aftermath'), /^Book One, The Bell Beneath Briarwatch, is complete\. Book Two/);
});
