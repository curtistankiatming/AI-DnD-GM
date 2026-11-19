'use strict';
// Book Two, "The Council of Small Voices": the written story from level 10 to
// 20 (docs/STORY-BIBLE.md). Chapters are authored expeditions in
// src/data/quests.json with "book": 2; their camp scenes are in scenes.json.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { STORY_NODES, ENEMIES } = require('../src/content');
const { QUESTS, TOWNS, SCENES } = require('../src/expansion');
const draft = require('./fixtures/director-draft');
const high = () => .999999;

const TWO = Object.values(QUESTS).filter((q) => q.book === 2);
function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, r.result.error); return r; }
// A hero at the town where a chapter starts, with every earlier chapter done.
function ready(id, { cls = 'fighter', nessa = true, flags = {} } = {}) {
  const q = QUESTS[id];
  let s = hero(cls, q.level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass']; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, flags); W.init(s);
  if (nessa) s = act(s, { type: 'recruit' }).state;
  return s;
}
const told = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');

test('Book Two follows Book One in order, from Highpass to Merrowgate', () => {
  assert.deepEqual(TWO.slice(0, 3).map((q) => [q.id, q.unlock, q.town, q.nextTown || q.town]), [
    ['chairs', 'aftermath', 'highpass', 'highpass'],
    ['fenmere', 'chairs', 'highpass', 'briarwatch'],
    ['southroad', 'fenmere', 'briarwatch', 'merrowgate']
  ]);
  assert.ok(TOWNS.merrowgate);
  for (const q of TWO) {
    assert.ok(STORY_NODES[`q-${q.id}-start`] && STORY_NODES[`q-${q.id}-after`], q.id);
    assert.ok(q.decisions.length >= 2, `${q.id} ends on a real choice`);
    assert.ok(Array.isArray(q.opening) && Array.isArray(q.crisis), `${q.id} is written as scenes, not summaries`);
  }
  assert.equal(Book.bookOf('chairs').title, 'The Council of Small Voices');
  assert.equal(Book.bookOf('road').title, 'The Bell Beneath Briarwatch');
});

test('each chapter pays about one level, like Book One, so the free story reaches level 20', () => {
  for (const q of TWO) {
    const band = P.levelBand(q.level);
    assert.ok(q.xp >= band && q.xp <= band * 1.1, `${q.id}: ${q.xp} XP for a ${band} XP level`);
  }
});

test('the council chapter has conversations before setting out, and they cost nothing', () => {
  let s = ready('chairs');
  s = act(s, { type: 'depart', questId: 'chairs' }).state;
  assert.equal(s.story.nodeId, 'q-chairs-start');
  assert.match(E.buildView(s).scene.opening, /It does not have enough chairs/);
  const talks = E.buildView(s).scene.choices.filter((c) => c.id.startsWith('talk-')).map((c) => c.id);
  assert.deepEqual(talks, ['talk-elske', 'talk-brannagh', 'talk-aveline']);
  const before = { xp: s.player.xp, gold: s.player.gold, orin: s.party.find((m) => m.id === 'orin').bond };
  const r = act(s, { type: 'story-choice', choiceId: 'talk-aveline' });
  assert.match(told(r.state), /Aveline: I slept on the cart\./);
  assert.equal(r.state.player.xp, before.xp); assert.equal(r.state.player.gold, before.gold);
  assert.equal(r.state.party.find((m) => m.id === 'orin').bond, before.orin + 1);
  assert.equal(r.state.story.nodeId, 'q-chairs-start', 'A conversation keeps you in the scene.');
  const again = E.buildView(r.state).scene.choices.find((c) => c.id === 'talk-aveline');
  assert.ok(!again || again.completed, 'Each conversation is had once.');
  const elske = act(r.state, { type: 'story-choice', choiceId: 'talk-elske' }).state;
  assert.equal(elske.story.flags['b2:met_elske'], true);
});

test('lines for a companion who is not in the party are left out', () => {
  let s = ready('chairs', { nessa: false });
  s = act(s, { type: 'depart', questId: 'chairs' }).state;
  const opening = E.buildView(s).scene.opening;
  assert.doesNotMatch(opening, /^Nessa:/m);
  assert.match(opening, /^Orin: Understood\./m);
  const withNessa = act(ready('chairs'), { type: 'depart', questId: 'chairs' }).state;
  assert.match(E.buildView(withNessa).scene.opening, /^Nessa: Can't we just go\?/m);
});

test('every Book Two battle has its own enemies, named for the story', () => {
  assert.equal(ENEMIES['gloam-tide-retainer'].name, 'Mist-Taken Shape');
  assert.equal(ENEMIES['gloam-tide'].attack.name, 'Cold Forgetting');
  assert.equal(ENEMIES['sergeant-brask-retainer'].name, 'Beacon Crew Veteran');
  for (const q of TWO) assert.ok(ENEMIES[q.foe] && ENEMIES[q.foe].level >= q.level - 1, q.id);
});

test('a chapter plays through to its camp scene, then to the next town', () => {
  let s = ready('fenmere');
  s = act(s, { type: 'depart', questId: 'fenmere' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'careful' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'resolve' }).state;
  assert.equal(s.story.nodeId, 'q-fenmere-after');
  const level = s.player.level;
  const r = act(s, { type: 'story-choice', choiceId: 'above' });
  s = r.state;
  assert.ok(s.world.completed.fenmere); assert.equal(s.story.flags.fen_build_above, true);
  assert.equal(s.player.level, level + 1, 'The chapter levels the hero.');
  assert.equal(s.story.nodeId, 'scene-fenmere-bakery-shop');
  assert.match(E.buildView(s).scene.opening, /The baker's ward: We open at six\./);
  s = act(s, { type: 'story-choice', choiceId: 'tell' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'road' }).state;
  assert.equal(s.story.nodeId, 'town-briarwatch');
});

test('the south road ends in Merrowgate, and Hal\'s company goes where you sent it', () => {
  let s = ready('southroad');
  s.story.nodeId = 'q-southroad-after'; s.world.activeQuest = 'southroad'; s.world.onExpedition = true;
  s = act(s, { type: 'story-choice', choiceId: 'guild' }).state;
  assert.equal(s.story.flags.south_hal_guild, true);
  assert.ok(s.world.unlockedTowns.includes('merrowgate'));
  assert.equal(s.story.nodeId, 'scene-southroad-camp-fire');
  s = act(s, { type: 'story-choice', choiceId: 'leave' }).state;
  assert.equal(s.story.nodeId, 'town-merrowgate');
});

test('while Book Two is still being written, its last written chapter says "to be continued"', { skip: !Book.WRITING }, () => {
  let s = ready('southroad');
  s.story.nodeId = 'q-southroad-after'; s.world.activeQuest = 'southroad'; s.world.onExpedition = true;
  const r = act(s, { type: 'story-choice', choiceId: 'council' });
  assert.ok(r.events.some((e) => /^To be continued\./.test(e.text)));
  assert.equal(r.state.story.flags[Book.FINISHED], undefined, 'The save does not become an AI story.');
  assert.equal(r.view.world.book.waiting, true);
  // The AI may still write small side quests, capped below the next chapter.
  let t = r.state;
  t = act(t, { type: 'story-choice', choiceId: 'leave' }).state;
  const made = act(t, { type: 'director-commission', draft: draft() });
  assert.equal(made.state.director.quests[made.result.questId].side, true);
  assert.equal(Book.levelCap(made.state), Book.LAST_LEVEL + 1);
});

test('the written chapters are never confused with an AI story', () => {
  const s = ready('chairs');
  assert.equal(Book.chapter(s).id, 'chairs');
  assert.equal(Book.aiStory(s), false);
  assert.equal(JSON.parse(require('../src/director').prompt(s)).book.book, 'The Council of Small Voices');
});

test('every Book Two scene and talk speaks only for characters who exist', () => {
  const companions = new Set(['orin', 'maren', 'nessa']);
  for (const scene of Object.values(SCENES).filter((x) => x?.nodes && QUESTS[x.after]?.book === 2)) {
    for (const node of Object.values(scene.nodes)) for (const line of node.lines || []) if (companions.has(line.say)) assert.ok(scene.cast.includes(line.say), `${scene.id}: ${line.say} speaks but is not in the cast`);
  }
  for (const q of TWO) for (const t of q.talks || []) for (const id of Object.keys(t.approval || {})) assert.ok(companions.has(id), `${q.id}/${t.id}`);
});
