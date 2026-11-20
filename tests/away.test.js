'use strict';
// Companions walking out for a chapter (src/away.js, src/data/away.json,
// docs/STORY-BIBLE.md "Can companions leave?"). In Book Two, a companion who
// ends a chapter 2 or more approval down leaves for the next chapter and comes
// back when it is done, unless the next chapter needs them.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Away = require('../src/away');
const { QUESTS } = require('../src/expansion');
const { STORY_NODES } = require('../src/content');
const high = () => .999999;

function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
function ready(id, flags = {}) {
  const q = QUESTS[id];
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'fixture');
  s.player.gold = 500; s.player.progression.mastery = true; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold']; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, flags); W.init(s);
  return act(s, { type: 'recruit' }).state;
}
// Straight to a chapter's ending, as if its crisis had just been settled.
function atEnd(s, id) { s.story.nodeId = `q-${id}-after`; s.world.activeQuest = id; s.world.onExpedition = true; s.story.flags[`method:${id}`] = 'peace'; return s; }
const said = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');
const inParty = (s, id) => s.party.some((m) => m.id === id);
// Play through any camp scene to the next stop that isn't a scene.
function throughScenes(s) {
  for (let i = 0; i < 6 && E.buildView(s).scene.id.startsWith('scene-'); i++) s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
  return s;
}

test('two things Orin could not stand behind in one chapter: he walks out for the next, then comes back', () => {
  let s = ready('keeper');
  // A side job in the same chapter: out through the coal-hole (Orin -1).
  s = act(s, { type: 'side-job', jobId: 'afterdark' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'roof' }).state;
  assert.equal(s.story.nodeId, 'town-merrowgate', 'One disapproval is not a walk-out.');
  s = act(s, { type: 'depart', questId: 'keeper' }).state;
  s = atEnd(s, 'keeper');
  s = act(s, { type: 'story-choice', choiceId: 'tell' }).state; // Orin -1
  s = throughScenes(s);
  assert.equal(s.story.nodeId, 'away-orin-leave');
  assert.match(E.buildView(s).scene.opening, /walk with the relief carts/);
  s = act(s, { type: 'story-choice', choiceId: 'let' }).state;
  assert.equal(s.story.nodeId, 'town-merrowgate');
  assert.ok(!inParty(s, 'orin'));
  const view = E.buildView(s);
  assert.deepEqual(view.world.away.map((a) => [a.id, a.until]), [['orin', 'hollin']]);
  // Hollin's Reach without him: nobody talks to him, and no talk is offered with him.
  s = act(s, { type: 'depart', questId: 'hollin' }).state;
  assert.doesNotMatch(E.buildView(s).scene.opening, /Stoneward|Orin/);
  assert.ok(!E.buildView(s).scene.choices.some((c) => c.id === 'talk-orin'));
  s = atEnd(s, 'hollin');
  assert.doesNotMatch(E.buildView(s).scene.opening, /^Orin:/m);
  s = act(s, { type: 'story-choice', choiceId: 'keep' }).state;
  assert.match(said(s), /Maren: That was decent\./);
  s = throughScenes(s);
  assert.equal(s.story.nodeId, 'away-orin-back');
  assert.ok(inParty(s, 'orin'), 'He is back for his own scene.');
  const bond = s.party.find((m) => m.id === 'orin').bond;
  s = act(s, { type: 'story-choice', choiceId: 'explain' }).state;
  assert.equal(s.story.nodeId, 'town-cinderfold');
  const orin = s.party.find((m) => m.id === 'orin');
  assert.ok(orin, 'He is back.'); assert.equal(orin.bond, Math.min(5, bond + 1));
  assert.equal(orin.level, s.player.level); assert.equal(orin.hp, orin.maxHp);
  assert.deepEqual(s.party.map((m) => m.id), ['orin', 'maren', 'nessa']);
  assert.deepEqual(E.buildView(s).world.away, []);
  assert.equal(s.story.flags['walked:orin'], 1);
});

test('before a chapter that needs them, a companion stays and says why', () => {
  let s = ready('fenmere');
  s = act(s, { type: 'side-job', jobId: 'letters' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'keep' }).state; // Orin -1
  s = act(s, { type: 'depart', questId: 'fenmere' }).state;
  s = atEnd(s, 'fenmere');
  s = act(s, { type: 'story-choice', choiceId: 'promise' }).state; // Orin -1; next is his chapter
  s = throughScenes(s);
  assert.equal(s.story.nodeId, 'away-orin-stay');
  assert.match(E.buildView(s).scene.opening, /Kell's Bridge next/);
  s = act(s, { type: 'story-choice', choiceId: 'after' }).state;
  assert.equal(s.story.nodeId, 'town-briarwatch');
  assert.ok(inParty(s, 'orin'));
  assert.equal(s.story.flags['away:stay-orin'], undefined);
});

test('approval is counted on balance over the chapter, and Book One never ends in a walk-out', () => {
  let s = ready('fenmere');
  s = act(s, { type: 'side-job', jobId: 'letters' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'keep' }).state; // Orin -1
  s.world.approvalWindow.orin += 1; // something he liked
  s = act(s, { type: 'depart', questId: 'fenmere' }).state;
  s = atEnd(s, 'fenmere');
  s = throughScenes(act(s, { type: 'story-choice', choiceId: 'promise' }).state);
  assert.equal(s.story.nodeId, 'town-briarwatch', 'Down 1 on balance: he stays without a word.');
  assert.deepEqual(s.world.approvalWindow, {}, 'A new chapter starts a new count.');

  let one = ready('beacon');
  one.world.approvalWindow = { maren: -4 };
  one = atEnd(one, 'beacon');
  one = throughScenes(act(one, { type: 'story-choice', choiceId: QUESTS.beacon.decisions[0].id }).state);
  assert.ok(E.buildView(one).world.town, 'Book One: no walk-out scene.');
  assert.ok(inParty(one, 'maren'));
});

test('an away companion survives a save and load, and the scenes cannot be skipped by going to town', () => {
  let s = ready('hollin');
  s.world.approvalWindow = { maren: -2 };
  s = atEnd(s, 'hollin');
  s = throughScenes(act(s, { type: 'story-choice', choiceId: 'keep' }).state);
  assert.equal(s.story.nodeId, 'away-maren-leave');
  assert.equal(E.resolveAction(s, { type: 'return-town' }, high).state.story.nodeId, 'away-maren-leave');
  s = act(s, { type: 'story-choice', choiceId: 'let' }).state;
  const loaded = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.ok(!inParty(loaded, 'maren'));
  assert.equal(loaded.world.away.maren.until, 'cinderfold');
  assert.equal(loaded.world.away.maren.member.name, 'Sister Maren Vale');
});

test('every companion has a leave, stay and return scene, and every chapter that needs someone names who', () => {
  for (const id of ['orin', 'maren', 'nessa']) for (const kind of ['leave', 'stay', 'back']) assert.ok(STORY_NODES[Away.nodeId(id, kind)]?.choices.length, `${id} ${kind}`);
  assert.deepEqual(QUESTS.southroad.needs, ['orin']);
  assert.deepEqual(QUESTS.keeper.needs, ['maren']);
  assert.deepEqual(QUESTS.cinderfold.needs, ['nessa']);
  for (const id of ['motherbell', 'oath']) assert.deepEqual(QUESTS[id].needs.sort(), ['maren', 'nessa', 'orin']);
});

test('while Nessa is away she cannot be recruited again, and nobody can sell or wear the kit she took with her', () => {
  let s = ready('harbour');
  s.world.approvalWindow = { nessa: -2 };
  s = atEnd(s, 'harbour');
  s = throughScenes(act(s, { type: 'story-choice', choiceId: QUESTS.harbour.decisions[0].id }).state);
  assert.equal(s.story.nodeId, 'away-nessa-leave');
  s = act(s, { type: 'story-choice', choiceId: 'keep' }).state;
  assert.ok(!inParty(s, 'nessa'));
  const view = E.buildView(s);
  assert.equal(view.world.canRecruit, false, 'She has not left the company, only the party.');
  assert.equal(E.resolveAction(s, { type: 'recruit' }, high).result.ok, false);
  const gear = Object.values(s.world.away.nessa.member.equipment).filter(Boolean);
  assert.ok(gear.length);
  for (const itemId of gear) assert.ok(!view.world.sellable.some((e) => e.itemId === itemId && e.loose > 0), `${itemId} is still hers`);
});

test('lines that answer an away companion are told another way', () => {
  const { liveLines } = require('../src/expansion');
  let s = ready('vote');
  s.party = s.party.filter((m) => m.id !== 'orin');
  const sable = STORY_NODES['q-vote-start'].choices.find((c) => c.id === 'talk-sable').result.dialogue;
  const told = liveLines(s, sable).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');
  assert.match(told, /You ask whether he thinks she should lose\.\nSable: I think she'll win/);
});
