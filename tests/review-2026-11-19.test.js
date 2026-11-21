'use strict';
// Regressions for docs/reviews/codex-2026-11-19.md (level 11 fighter playtest).
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { STORY_NODES } = require('../src/content');
const { QUESTS, TOWNS } = require('../src/expansion');
const { deterministicFallback } = require('../src/narrator');
const draft = require('./fixtures/director-draft');
const high = () => .999999, low = () => 0;

function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, r.result.error); return r; }
// A hero at the town where an expedition starts, with every earlier written chapter done.
function ready(id, { cls = 'fighter', flags = {}, nessa = false } = {}) {
  const q = QUESTS[id];
  let s = hero(cls, q.level); s.player.gold = 1000;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = Object.keys(TOWNS); s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  if (q.requiresAdvancement) s.player.progression.mastery = true;
  Object.assign(s.story.flags, flags); W.init(s);
  if (nessa) s = act(s, { type: 'recruit' }).state;
  return s;
}
const said = (s) => (s.story.lastOutcome.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');

test('a failed parley that starts a fight is told once', () => {
  let s = ready('breach');
  s = act(s, { type: 'depart', questId: 'breach' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }).state;
  assert.equal(s.story.nodeId, 'q-breach-start');
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'direct' }).state;
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'resolve' }, low);
  assert.ok(r.state.combat?.active, 'The failed parley starts the fight.');
  const text = deterministicFallback(r.state, r.view, { type: 'story-choice' }, r.events);
  const line = 'A few residents wake, enough to begin an evacuation.';
  assert.equal(text.split(line).length - 1, 1, text);
});

test('continuing an interrupted fight from town shows the fight’s own scene, not the town', () => {
  let s = ready('road');
  s = act(s, { type: 'depart', questId: 'road' }).state;
  for (const choiceId of ['advance', 'direct', 'confront']) s = act(s, { type: 'story-choice', choiceId }).state;
  s = act(s, { type: 'combat', actionId: 'retreat' }).state;
  assert.equal(E.buildView(s).scene.location, TOWNS.briarwatch.subtitle);
  const r = act(s, { type: 'depart', questId: 'road' });
  assert.ok(r.state.combat?.active);
  assert.equal(r.state.story.nodeId, 'q-road-crisis');
  assert.equal(r.view.scene.location, QUESTS.road.region);
});

test('the trial companions name choices this hero actually made, and the hero swears the oath', () => {
  let s = ready('trial', { flags: { bridge_amnesty: true, archive_guarded: true, signal_supply: true }, nessa: true });
  s = act(s, { type: 'depart', questId: 'trial' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }).state;
  const talk = said(s);
  assert.match(talk, /work off what they owed/);
  assert.doesNotMatch(talk, /called a tribunal/);
  assert.match(talk, /a name beside every copy/);
  assert.match(talk, /supply trains first/);
  assert.doesNotMatch(talk, /Forty-two/);
  const after = STORY_NODES['q-trial-after'];
  assert.doesNotMatch(after.opening, /mastery is learned/i, 'Mastery is announced when it is granted, not before.');
  assert.equal(after.choices.length, 3);
  for (const c of after.choices) {
    assert.match(c.label, /^Swear the Oath of the Road/);
    assert.equal(c.result.setFlags.trial_earned, true);
  }
});

test('a failed trial talk is a real disagreement about a recorded choice', () => {
  let s = ready('trial', { flags: { district_oversight: true } });
  s = act(s, { type: 'depart', questId: 'trial' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }, low).state;
  const talk = said(s);
  assert.match(talk, /oversight council/);
  assert.doesNotMatch(talk, /Double consent/);
});

test('swearing an oath grants mastery, and the relief convoy remembers the oath', () => {
  for (const c of STORY_NODES['q-trial-after'].choices) {
    let s = ready('trial');
    s.story.nodeId = 'q-trial-after'; s.world.activeQuest = 'trial'; s.world.onExpedition = true;
    const r = act(s, { type: 'story-choice', choiceId: c.id });
    assert.equal(r.state.player.progression.mastery, true, c.id);
    assert.ok(r.events.some((e) => /The Oath of the Road is sworn/.test(e.text)), c.id);
    const oath = Object.keys(c.result.setFlags).find((f) => f.startsWith('oath:'));
    assert.equal(r.state.story.flags[oath], true);
    const convoy = STORY_NODES['q-aftermath-crisis'].choices.find((x) => x.id === 'resolve').success.dialogue;
    assert.ok(convoy.some((l) => l.when?.flag === oath), `The convoy has a line for ${oath}.`);
  }
});

test('the relief convoy describes this hero’s own mastery, not abilities they cannot have yet', () => {
  const objective = STORY_NODES['q-aftermath-crisis'].choices.find((c) => c.id === 'objective');
  assert.doesNotMatch(objective.description, /Saboteur|Lorekeeper/);
  for (const cls of ['fighter', 'rogue', 'wizard', 'cleric', 'ranger', 'bard']) {
    let s = ready('aftermath', { cls });
    s = act(s, { type: 'depart', questId: 'aftermath' }).state;
    s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
    const mastery = P.JOBS[cls].mastery.name;
    assert.match(said(s), new RegExp(mastery), cls);
    assert.doesNotMatch(said(s), /careful approach or a direct crossing/);
    for (const other of ['Battle Surge', 'Vanishing Step', 'Arcane Barrier', 'Divine Aegis', 'Volley', 'Song of Rest'].filter((m) => m !== mastery)) assert.doesNotMatch(said(s), new RegExp(other), cls);
  }
});

test('no written expedition uses the generic approach paragraph', () => {
  for (const q of Object.values(QUESTS)) assert.ok(q.approach, `${q.id} has its own approach`);
});

test('the signal tower gives Nessa a word with her mentor, and works without her', () => {
  const lines = STORY_NODES['q-signal-after'].dialogue;
  const told = (s) => { s.story.nodeId = 'town-highpass'; E.enterNode(s, 'q-signal-after', []); return said(s); };
  const withNessa = told(ready('signal', { nessa: true }));
  assert.match(withNessa, /Wren: Bring it back better\./);
  assert.match(withNessa, /Nessa: I’ll bring it back to you\./);
  const solo = ready('signal');
  const alone = told(solo);
  assert.doesNotMatch(E.buildView(solo).scene.opening, /Nessa|Wren:/, 'The scene text sent to the AI game master has only the lines that were told.');
  assert.doesNotMatch(alone, /Nessa:|Wren:/);
  assert.match(alone, /the keeper, Wren, presses a folded map on you/);
  assert.ok(lines.length > 4);
});

test('Maren carries a named letter out of the archive and delivers it when her story resolves', () => {
  assert.match(STORY_NODES['q-archive-after'].opening, /Brother Edric Moss/);
  let s = ready('aftermath');
  s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  s = act(s, { type: 'personal', companionId: 'maren' }).state;
  const r = act(s, { type: 'resolve-personal', companionId: 'maren', choice: 'watchful' });
  assert.match(r.result.outcomeText, /Hesper Moss reads her brother’s letter/);
  assert.match(r.result.outcomeText, /Watchful: \+1 AC/);
});

test('the Single Voice has a speaker at the beacon', () => {
  const crisis = STORY_NODES['q-beacon-crisis'].dialogue;
  assert.ok(crisis.some((l) => l.speaker === 'Corvane'));
});

test('finishing the last written chapter says the written story is complete and what comes next', () => {
  let s = ready('aftermath');
  s.story.nodeId = 'q-aftermath-after'; s.world.activeQuest = 'aftermath'; s.world.onExpedition = true;
  const r = act(s, { type: 'story-choice', choiceId: 'patrol' });
  // Book One now hands over to Book Two, not to the AI storyteller.
  assert.equal(r.state.story.flags[Book.FINISHED], undefined);
  assert.ok(r.events.some((e) => e.text === Book.bookEnd('aftermath')));
  assert.match(Book.bookEnd('aftermath'), /Book 1, The Bell Beneath Briarwatch, is complete\. Book 2, The Council of Small Voices, begins\. Its first chapter, The Chair Problem, is on the expedition board in Highpass Watch\./);
  assert.doesNotMatch(JSON.stringify(QUESTS.aftermath.decisions), /This season/);
  const text = deterministicFallback(r.state, r.view, { type: 'story-choice' }, r.events);
  assert.match(text, /Book 2, The Council of Small Voices, begins/);
  assert.equal(r.view.world.director.sideQuests, true);
  assert.equal(r.view.world.book.chapter, 'The Chair Problem');
});

test('commissioning an adventure reports the new adventure, not the previous message', () => {
  let s = ready('aftermath');
  for (const q of Book.CHAPTERS) s.world.completed[q.id] = { xp: 0, gold: 0 };
  const past = Book.LAST_LEVEL + (Book.WRITING ? 2 : 1);
  s.player.level = past; s.player.xp = P.XP_NEXT[past - 1];
  assert.equal(Book.finished(s), true);
  s = act(s, { type: 'town-service', serviceId: 'civic-rest' }).state;
  const r = act(s, { type: 'director-commission', draft: draft() });
  const text = deterministicFallback(r.state, r.view, { type: 'director-commission' }, r.events);
  assert.match(text, /New adventure on the expedition board: The Salt Choir/);
  assert.doesNotMatch(text, /Civic lodging/);
});

test('every conditional written line uses a known condition', () => {
  const known = new Set(['flag', 'is', 'notFlag', 'anyFlag', 'party', 'absent', 'class', 'item', 'notItem', 'clue', 'notClue', 'access', 'notAccess']);
  const lines = [];
  for (const node of Object.values(STORY_NODES)) {
    lines.push(...(node.dialogue || []));
    for (const c of node.choices || []) for (const key of ['success', 'failure', 'result']) lines.push(...(c[key]?.dialogue || []));
  }
  const conditional = lines.filter((l) => l.when);
  assert.ok(conditional.length > 10);
  for (const l of conditional) for (const key of Object.keys(l.when)) assert.ok(known.has(key), `Unknown condition "${key}" on: ${l.text || l.narration}`);
});
