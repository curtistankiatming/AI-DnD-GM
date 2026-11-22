'use strict';
// Book Three is hidden from players until it is released (src/book.js, "out").
// These tests read it the way agent playtests do. node --test runs each file
// in its own process, so this reaches no other test file.
process.env.BRIARWATCH_PREVIEW_BOOKS = '1';
// Book Three, Part Two, "The Stair", chapters 11 to 20
// (docs/book-three/DESIGN-PART-TWO.md): the price of a yes, Wren's bell, the
// order, the town that said no, the witness's seal, the winter watch,
// Hesk's company, the deep, the first promise and the first bell, their
// scenes and side jobs, and the engine work they need (oneOf line groups,
// line setFlag, walkouts in Part Two and none from the stair on, a peaceful
// way made easier or harder by an earlier choice, chapters that go straight
// on with a ledge to wake at, and the epilogue framing the 3rd job trial).
//
// These tests start each chapter from a scripted state with every chapter
// before it marked done.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book'), Away = require('../src/away');
const { STORY_NODES, ENEMIES, ENCOUNTERS, COMPANIONS, CLUES } = require('../src/content');
const X = require('../src/expansion');
const { QUESTS, SCENES, SIDE_JOBS, liveLines, playLines, storyLine, dialogueText } = X;
const RAWQ = require('../src/data/book-three-part-two/quests.json'), RAWS = require('../src/data/book-three-part-two/scenes.json'), RAWJ = require('../src/data/book-three-part-two/side-jobs.json');
const high = () => .999999, low = () => 0;

const IDS = ['b3-price', 'b3-wren', 'b3-order', 'b3-ashford', 'b3-seal', 'b3-winter', 'b3-company', 'b3-deep', 'b3-promise', 'b3-firstbell'];
const PART_TWO = Object.values(QUESTS).filter((q) => q.book === 3 && q.part === 2);
const PART_ONE_IDS = ['b3-letter', 'b3-rite', 'b3-pass', 'b3-saltwick', 'b3-vell', 'b3-witness', 'b3-home', 'b3-vault', 'b3-greatbell', 'b3-paid'];
const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];

function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
// A hero in the town where a chapter starts, with every chapter before it
// done.
function ready(id, { cls = 'fighter', party = ['orin', 'maren', 'nessa'], flags = {}, town } = {}) {
  const q = QUESTS[id];
  let s = hero(cls, q.level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...ALL_TOWNS]; s.world.townId = town || q.town; s.story.nodeId = `town-${town || q.town}`;
  Object.assign(s.story.flags, { b3_partone_done: true }, flags); W.init(s);
  // Nessa joined long ago; the Empty City (b3_bell_evacuate) has nobody to recruit, so she is recruited before that flag is read.
  if (party.includes('nessa')) { const empty = s.story.flags.b3_bell_evacuate; delete s.story.flags.b3_bell_evacuate; s = act(s, { type: 'recruit' }).state; if (empty) s.story.flags.b3_bell_evacuate = empty; }
  s.party = s.party.filter((m) => party.includes(m.id));
  return s;
}
const at = (id, phase, opts) => { const s = ready(id, opts); s.story.nodeId = `q-${id}-${phase}`; s.world.activeQuest = id; s.world.onExpedition = true; return s; };
const told = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');
const opening = (s) => E.buildView(s).scene.opening;
const bond = (s, id) => s.party.find((m) => m.id === id)?.bond;
const sceneOf = (id) => Object.values(SCENES).find((x) => x?.after === id);
function toTown(s) { for (let i = 0; i < 8 && !E.buildView(s).world.town; i++) s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices.find((c) => !c.locked)?.id }).state; return s; }
function strong(s) { s.player.inspirationPrepared = true; for (const k of ['str', 'dex', 'int', 'wis', 'cha']) s.player.abilities[k] = 30; return s; }
// Investigate, the careful route and the peaceful way (sure rolls), then the decision.
function playPeaceful(id, decision, opts = {}) {
  let s = strong(ready(id, opts));
  s = act(s, { type: 'depart', questId: id }).state;
  assert.equal(s.story.nodeId, `q-${id}-start`);
  for (const t of E.buildView(s).scene.choices.filter((c) => c.id.startsWith('talk-') && !c.locked)) s = act(s, { type: 'story-choice', choiceId: t.id }).state;
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'careful' }).state;
  assert.equal(s.story.nodeId, `q-${id}-crisis`);
  strong(s);
  s = act(s, { type: 'story-choice', choiceId: 'resolve' }).state;
  assert.equal(s.story.nodeId, `q-${id}-after`, `${id}: the peaceful way reaches the ending`);
  return act(s, { type: 'story-choice', choiceId: decision });
}
function winFight(s) {
  for (const a of s.combat.actors) if (a.team === 'enemy') a.hp = 0;
  const me = s.combat.actors.find((a) => a.id === 'player');
  s.combat.turnIndex = s.combat.actors.indexOf(me); s.combat.awaitingPlayer = true;
  return act(s, { type: 'combat', actionId: 'end-turn' }).state;
}
const peaceAt = (id, opts = {}) => { const s = strong(at(id, 'crisis', opts)); s.story.clues.push(`${id}-evidence`); return act(s, { type: 'story-choice', choiceId: 'resolve' }).state; };
const decide = (id, decision, opts) => act(at(id, 'after', opts), { type: 'story-choice', choiceId: decision }).state;

// The engine work: line groups and line flags.
test('a oneOf group tells the first line whose condition holds, and only that one', () => {
  const s = hero(); s.party = [];
  const lines = [{ narrate: 'Before.' }, { oneOf: [{ narrate: 'A.', when: { flag: 'a' } }, { narrate: 'B.', when: { flag: 'b' } }, { narrate: 'Otherwise.' }] }, { narrate: 'After.' }].map(storyLine);
  const say = () => liveLines(s, lines).map((l) => l.narration).join(' ');
  assert.equal(say(), 'Before. Otherwise. After.');
  s.story.flags.b = true; assert.equal(say(), 'Before. B. After.');
  s.story.flags.a = true; assert.equal(say(), 'Before. A. After.', 'The first that holds, never two.');
  // A group with no line that holds tells nothing; a group may have its own when.
  const none = [{ oneOf: [{ narrate: 'X.', when: { flag: 'x' } }] }, { oneOf: [{ narrate: 'Y.' }], when: { flag: 'y' } }].map(storyLine);
  assert.deepEqual(liveLines(s, none), []);
  s.story.flags.y = true; assert.deepEqual(liveLines(s, none).map((l) => l.narration), ['Y.']);
  // A companion's line in a group is passed over when they are away, like any line.
  const spoken = [{ oneOf: [{ say: 'orin', text: 'Orin speaks.' }, { narrate: 'Nobody speaks.' }] }].map(storyLine);
  assert.deepEqual(liveLines(s, spoken).map((l) => l.text || l.narration), ['Nobody speaks.']);
  // The written text keeps every alternative.
  assert.match(dialogueText(lines), /A\.\nB\.\nOtherwise\./);
});

test('a line\'s setFlag is set when the line is told, and counts for the lines after it', () => {
  const s = hero();
  const lines = [{ oneOf: [{ narrate: 'Forgiven.', when: { flag: 'tried' }, setFlag: 'forgives' }, { narrate: 'Not hers.', setFlag: { not_hers: true } }] }, { narrate: 'She means it.', when: { flag: 'forgives' } }, { narrate: 'Nor anyone.', when: { flag: 'not_hers' } }].map(storyLine);
  assert.deepEqual(liveLines(s, lines).map((l) => l.narration), ['Not hers.', 'Nor anyone.'], 'Looking reads in order...');
  assert.equal(s.story.flags.not_hers, undefined, '...and sets nothing.');
  assert.ok(liveLines(s, lines).every((l) => !('setFlag' in l) && !('when' in l)));
  assert.deepEqual(playLines(s, lines).map((l) => l.narration), ['Not hers.', 'Nor anyone.']);
  assert.equal(s.story.flags.not_hers, true, 'Telling it sets the flag.');
  const t = hero(); t.story.flags.tried = true;
  assert.deepEqual(playLines(t, lines).map((l) => l.narration), ['Forgiven.', 'She means it.']);
  assert.deepEqual([t.story.flags.forgives, t.story.flags.not_hers], [true, undefined]);
  // A line that is not told sets nothing.
  const u = hero(); u.party = []; playLines(u, [{ say: 'orin', text: 'Spring.', setFlag: 'orin_spoke' }].map(storyLine));
  assert.equal(u.story.flags.orin_spoke, undefined);
});

test('a oneOf group\'s own setFlag is set when any line in it is told, and not when none is', () => {
  const group = [{ oneOf: [{ narrate: 'A.', when: { flag: 'a' } }, { narrate: 'B.', when: { flag: 'b' } }], setFlag: 'heard' }].map(storyLine);
  const s = hero(); s.story.flags.b = true;
  assert.deepEqual(playLines(s, group).map((l) => l.narration), ['B.']);
  assert.equal(s.story.flags.heard, true);
  const t = hero(); playLines(t, group);
  assert.equal(t.story.flags.heard, undefined);
});

test('no written line is gated on the negation of the flag it sets itself (views re-run the lines after they are played)', () => {
  const sets = (l) => Object.keys(typeof l.setFlag === 'string' ? { [l.setFlag]: 1 } : l.setFlag || {});
  const check = (l, outer = []) => {
    const own = [...outer, ...sets(l)];
    const w = l.when || {};
    for (const f of own) assert.ok(w.notFlag !== f && !(w.noneFlag || []).includes(f), `${l.narrate || l.text}: notFlag ${f}`);
    for (const alt of l.oneOf || []) check(alt, own);
  };
  for (const file of ['quests.json', 'scenes.json', 'side-jobs.json']) JSON.stringify(require(`../src/data/book-three-part-two/${file}`), (k, v) => { if (Array.isArray(v)) for (const l of v) if (l && typeof l === 'object' && (l.narrate || l.say || l.oneOf)) check(l); return v; });
});

test('a scene choice with requires is offered only when it is met', () => {
  // The Mother Bell's first node (chapter 20) needs this; Part Two uses it in the lamp round.
  const s = decide('b3-order', 'both');
  assert.equal(s.story.nodeId, 'scene-order-mags-round');
  assert.deepEqual(E.buildView(s).scene.choices.map((c) => [c.id, Boolean(c.locked)]), [['round', false], ['leave', false]]);
  const alone = decide('b3-order', 'varn', { party: ['maren', 'nessa'] });
  assert.equal(alone.story.nodeId, 'scene-order-mags-round');
  assert.equal(E.resolveAction(alone, { type: 'story-choice', choiceId: 'leave' }, high).result.ok, false, 'Orin is not there to leave the oil with.');
  const r = STORY_NODES['scene-order-mags-round'].choices.find((c) => c.id === 'leave');
  assert.deepEqual(r.requires, { companion: 'orin' });
});

// The chapters.
test('Part Two follows Part One: ten chapters, one level each, in their own files', () => {
  assert.deepEqual(PART_TWO.map((q) => q.id), IDS);
  assert.deepEqual(PART_TWO.map((q) => [q.id, q.unlock, q.town, q.nextTown || q.town, q.level, q.xp, q.book, q.part]), [
    ['b3-price', 'b3-paid', 'merrowgate', 'cinderfold', 30, 9250, 3, 2],
    ['b3-wren', 'b3-price', 'cinderfold', 'saltwick', 31, 9500, 3, 2],
    ['b3-order', 'b3-wren', 'saltwick', 'ashford', 32, 9750, 3, 2],
    ['b3-ashford', 'b3-order', 'ashford', 'highpass', 33, 10000, 3, 2],
    ['b3-seal', 'b3-ashford', 'highpass', 'briarwatch', 34, 10250, 3, 2],
    ['b3-winter', 'b3-seal', 'briarwatch', 'vell', 35, 10500, 3, 2],
    ['b3-company', 'b3-winter', 'vell', 'vell', 36, 10750, 3, 2],
    ['b3-deep', 'b3-company', 'vell', 'vell', 37, 11000, 3, 2],
    ['b3-promise', 'b3-deep', 'vell', 'vell', 38, 11250, 3, 2],
    ['b3-firstbell', 'b3-promise', 'vell', 'briarwatch', 39, 11500, 3, 2]
  ]);
  // Chapters 17 to 19 go straight on, down the stair; chapter 20 ends the book.
  assert.deepEqual(PART_TWO.filter((q) => q.continues).map((q) => q.id), ['b3-company', 'b3-deep', 'b3-promise']);
  for (const q of PART_TWO) {
    assert.equal(q.xp, P.levelBand(q.level), `${q.id} pays exactly one level`);
    assert.ok(RAWQ[q.id] && !require('../src/data/quests.json')._note, `${q.id} is written in the Part Two file`);
    for (const key of ['opening', 'crisis', 'after', 'approach']) assert.ok(Array.isArray(q[key]) && q[key].length, `${q.id}.${key}`);
    // The door under the vault has two answers; every other decision has three.
    assert.ok(q.talks.length >= 3 && q.decisions.length === (q.id === 'b3-company' ? 2 : 3), q.id);
    assert.ok(STORY_NODES[`q-${q.id}-start`] && STORY_NODES[`q-${q.id}-after`], q.id);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
    assert.equal(Book.bookOf(q.id).title, 'The Names in the Bronze');
  }
  assert.deepEqual(QUESTS['b3-wren'].needs, ['nessa']); assert.deepEqual(QUESTS['b3-order'].needs, ['orin']); assert.deepEqual(QUESTS['b3-seal'].needs, ['maren']);
  // Story order: after every Part One chapter, written now or later.
  const order = Book.CHAPTERS.map((q) => q.id);
  for (const id of PART_ONE_IDS) assert.ok(order.indexOf(id) < order.indexOf('b3-price'), `${id} comes before b3-price`);
  assert.deepEqual(order.slice(-IDS.length), IDS);
  // Every Part One chapter it follows is written.
  for (const id of PART_ONE_IDS) assert.ok(QUESTS[id], id);
  // Book Three stays hidden from players; with its finale written it is no longer being written.
  assert.equal(Book.SHELF.find((b) => b.n === 3).out, 0);
  assert.equal(Book.SHELF.find((b) => b.n === 3).finale, 'b3-firstbell');
  assert.equal(Book.SHELF.find((b) => b.n === 3).writing, false, 'Chapter 20 is the last.');
});

test('every consumer sees one set of tables: the Part Two files are merged into quests, scenes and side jobs', () => {
  for (const [file, table] of [['quests.json', QUESTS], ['scenes.json', SCENES], ['side-jobs.json', SIDE_JOBS]]) {
    const raw = require(`../src/data/${file}`), part = require(`../src/data/book-three-part-two/${file}`);
    for (const id of Object.keys(part).filter((k) => !k.startsWith('_'))) { assert.ok(table[id], `${file} ${id}`); assert.equal(raw[id], table[id], `${file}: whoever reads the table sees ${id}`); }
  }
  assert.ok(STORY_NODES['scene-price-camp-fish'] && STORY_NODES['job-debtbook-row'] && ENCOUNTERS['quest:b3-ashford']);
  assert.ok(!QUESTS._note, 'Part Two notes are not merged as chapters');
});

test('the browser build carries the Part Two files', () => {
  const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'briarwatch-part-two-build-'));
  try {
    const { html } = require('../scripts/build-public').buildPublic(out);
    for (const f of ['quests.json', 'scenes.json', 'side-jobs.json']) assert.ok(html.includes(`"./data/book-three-part-two/${f}"`), f);
  } finally { fs.rmSync(out, { recursive: true, force: true }); }
});

const EXPECT = {
  'b3-price': { shut: ['b3_market_shut', { orin: 1 }], rule: ['b3_market_ruled', { maren: 1 }], debts: ['b3_debts_bought', { nessa: 1 }] },
  'b3-wren': { cast: ['b3_wren_cast', {}], refuse: ['b3_wren_refused', {}], wait: ['b3_wren_waits', {}] },
  'b3-order': { both: ['b3_orin_tried', { orin: 1, nessa: -1 }], varn: ['b3_varn_judged', { orin: -1 }], free: ['b3_varn_freed', { orin: -1, maren: -1 }] },
  'b3-ashford': { defend: ['b3_ashford_defended', {}], children: ['b3_ashford_children', { maren: -1 }], cast: ['b3_ashford_cast', { nessa: -1, maren: -1 }] },
  'b3-seal': { take: ['b3_seal_taken', { maren: -1 }], refuse: ['b3_seal_refused', { maren: 1 }], many: ['b3_seal_many', {}] },
  'b3-winter': { promise: ['b3_wards_promise', {}], towns: ['b3_towns_asked', {}], alone: ['b3_go_alone', {}] },
  'b3-company': { keep: ['b3_door_kept', {}], close: ['b3_door_closed', {}] },
  'b3-deep': { escort: ['b3_turned_escorted', {}], fennick: ['b3_turned_fennick', {}], leave: ['b3_turned_left', { maren: -1, orin: -1 }] },
  'b3-promise': { tell: ['b3_three_told', {}], take: ['b3_three_taken', { maren: -1 }], left: ['b3_three_left', {}] },
  'b3-firstbell': { old: ['b3_promise_old', {}], hesk: ['b3_promise_hesk', {}], seal: ['b3_stair_sealed', {}] }
};
// The chapter that follows one which goes straight on.
const nextOf = (id) => PART_TWO.find((q) => q.unlock === id);

test('every chapter plays to its end peacefully, by every decision, levels the hero by one, and its scene or the next chapter follows', () => {
  for (const id of IDS) for (const [decision, [flag, approval]] of Object.entries(EXPECT[id])) {
    const r = playPeaceful(id, decision);
    const s = r.state;
    assert.ok(s.world.completed[id], `${id}/${decision}`);
    assert.equal(s.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(EXPECT[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(s.story.flags[other], undefined, `${id}/${decision} not ${other}`);
    assert.equal(s.story.flags[`method:${id}`], 'peace');
    assert.equal(s.player.level, QUESTS[id].level + 1, `${id}: after chapter N the hero is level 20+N`);
    assert.equal(s.player.xp, P.XP_NEXT[QUESTS[id].level - 1] + QUESTS[id].xp, `${id}: exactly the chapter's XP`);
    assert.deepEqual(QUESTS[id].decisions.find((d) => d.id === decision).approval || {}, approval, `${id}/${decision} approval`);
    // Chapters 17 to 19 have no scene: they go straight on to the next chapter's opening.
    const scene = sceneOf(id);
    if (QUESTS[id].continues) { assert.equal(scene, undefined, id); assert.equal(s.story.nodeId, `q-${nextOf(id).id}-start`, `${id}/${decision} goes straight on`); continue; }
    assert.ok(scene, `${id} has a scene`);
    assert.equal(s.story.nodeId, `scene-${scene.id}-${scene.start}`, `${id}: its scene follows`);
    assert.equal(toTown(s).story.nodeId, `town-${QUESTS[id].nextTown}`, `${id}/${decision}`);
  }
});

test('a decision changes exactly the approval the design gives it', () => {
  for (const [id, decisions] of Object.entries(EXPECT)) for (const [decision, [, approval]] of Object.entries(decisions)) for (const who of ['orin', 'maren', 'nessa']) {
    const s = at(id, 'after');
    for (const m of s.party) m.bond = 2;
    assert.equal(bond(act(s, { type: 'story-choice', choiceId: decision }).state, who), 2 + (approval[who] || 0), `${id}/${decision}/${who}`);
  }
});

test('each crisis can be fought instead, and winning reaches the same ending told the way it was won', () => {
  for (const [id, fought] of [['b3-price', /carried out of the rope-walk/], ['b3-wren', /grey to the elbow/], ['b3-order', /went off the planks/], ['b3-ashford', /overturned, where the fight was/],
    ['b3-seal', /blood in the snow by the steps/], ['b3-winter', /broken lanterns in it/], ['b3-company', /blood on the rim of the door/]]) {
    const failed = act(at(id, 'crisis'), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    let s = act(at(id, 'crisis'), { type: 'story-choice', choiceId: 'confront' }).state;
    assert.ok(s.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    assert.match(opening(s), fought, id);
    assert.doesNotMatch(opening(s), /Nobody is hurt at the rope-walk|Nobody is lost in the pit|Nobody falls\.|exactly to the line|Nobody was hurt on the steps|Nobody was lost\.|and nobody hurt/, id);
    assert.equal(ENCOUNTERS[`quest:${id}`].victoryNode, `q-${id}-after`);
  }
});

// Chapter 11.
test('the price of a yes: how Hesk got out follows chapter 10, with a line for a save without it', () => {
  const start = (flags) => opening(act(ready('b3-price', { flags }), { type: 'depart', questId: 'b3-price' }).state);
  assert.match(start({ b3_rite_law: true }), /out on licence to the Lantern Hall/);
  assert.match(start({ b3_rite_destroyed: true }), /bought his bond/);
  assert.match(start({ b3_rite_vell: true }), /claimed him from the council's custody as a contractor/);
  const old = start({});
  assert.match(old, /papers from Merrowgate's harbour court/);
  for (const t of [start({ b3_rite_law: true }), start({ b3_rite_destroyed: true }), start({ b3_rite_vell: true }), old]) {
    assert.equal((t.match(/licence|bought his bond|claimed him|papers from Merrowgate/g) || []).length, 1, 'One way out, told once.');
    assert.match(t, /The poor have always paid for safety\. Now somebody pays them\./);
  }
  assert.match(start({ 'b2:haverick_named': true }), /since Pell Haverick fell at the Vote/);
  assert.match(old, /retired to the country/); assert.doesNotMatch(old, /fell at the Vote/);
});

test('Elske speaks in Merrowgate only as the Second Oath left her, and an old save has no Elske lines', () => {
  const talk = (flags) => { const s = act(ready('b3-price', { flags }), { type: 'depart', questId: 'b3-price' }).state; return E.buildView(s).scene.choices.some((c) => c.id === 'talk-elske') ? told(act(s, { type: 'story-choice', choiceId: 'talk-elske' }).state) : null; };
  assert.match(talk({ elske_seat: true }), /vote against it/); assert.doesNotMatch(talk({ elske_seat: true }), /hospice|cell at Highpass/);
  assert.match(talk({ elske_free: true }), /Nineteen\. Volunteers since midsummer/); assert.doesNotMatch(talk({ elske_free: true }), /vote against it|cell at Highpass/);
  assert.match(talk({ elske_judged: true }), /cell at Highpass/); assert.doesNotMatch(talk({ elske_judged: true }), /vote against it|Nineteen/);
  assert.equal(talk({}), null, 'No Elske talk on an old save.');
  const after = (flags) => opening(peaceAt('b3-price', { flags }));
  assert.match(after({ elske_seat: true }), /Elske Marrow, in Merrowgate's chair/); assert.doesNotMatch(after({}), /Elske/);
});

test('talking Coll down is strongest with the day his debt was bought', () => {
  const s = peaceAt('b3-price', { flags: { 'prepared:b3-price': true } });
  assert.match(told(s), /bought by the Hall on the ninth of the month/); assert.match(told(s), /We buy the paper first/);
  const u = peaceAt('b3-price');
  assert.match(told(u), /He has to think/); assert.doesNotMatch(told(u), /ninth of the month/);
  assert.equal(STORY_NODES['q-b3-price-crisis'].choices.find((c) => c.id === 'resolve').check.lead, 'b3-price-evidence');
});

// Chapter 12.
test('Wren\'s bell: the Mother Bell is told three ways, the chorus for an old save', () => {
  const start = (flags) => opening(act(ready('b3-wren', { flags }), { type: 'depart', questId: 'b3-wren' }).state);
  assert.match(start({ mother_silenced: true }), /that winter|Last winter was mild/); assert.doesNotMatch(start({ mother_silenced: true }), /asking them|recalled/);
  assert.match(start({ mother_recalled: true }), /council recalled the Mother Bell/);
  for (const t of [start({ mother_chorus: true }), start({})]) { assert.match(t, /held the free wards by asking them/); assert.doesNotMatch(t, /mild|recalled/); }
  assert.match(start({ 'job:minersvote-decided': true }), /tied fourteen times/); assert.doesNotMatch(start({}), /tied fourteen times/);
});

test('Wren\'s bell: Nessa\'s long yes comes due if she gave it, and otherwise Wren asks her to stand at the pit', () => {
  const start = (flags, party) => opening(act(ready('b3-wren', { flags, party }), { type: 'depart', questId: 'b3-wren' }).state);
  const keeper = start({ nessa_keeper: 'later' });
  assert.match(keeper, /you're not dead, so you can manage another winter/); assert.match(keeper, /^Nessa: So you'd still be here\.$/m);
  assert.doesNotMatch(keeper, /Stand at the pit with me/);
  const asked = start({});
  assert.match(asked, /Stand at the pit with me/); assert.match(asked, /never been sent|has never been sent|does not take it out/);
  assert.doesNotMatch(asked, /manage another winter/);
  const away = start({ nessa_keeper: 'later' }, ['orin', 'maren']);
  assert.match(away, /No Reed\./); assert.doesNotMatch(away, /^Nessa:|manage another winter|Stand at the pit/m);
  assert.match(away, /held for her/); assert.doesNotMatch(start({}, ['orin', 'maren']), /held for her/);
});

test('Wren\'s bell: Nessa answers her long yes in every decision, and only if she gave it and is there', () => {
  const answer = { cast: /Now, not later\. I'll take it\./, refuse: /It's not yet, Wren\. That's my answer\./, wait: /So here's a real one\. Yes\./ };
  for (const [decision, line] of Object.entries(answer)) {
    const keeper = told(decide('b3-wren', decision, { flags: { nessa_keeper: 'later' } }));
    assert.match(keeper, line, decision);
    for (const other of Object.values(answer).filter((x) => x !== line)) assert.doesNotMatch(keeper, other, decision);
    assert.doesNotMatch(told(decide('b3-wren', decision)), line, `${decision}: no long yes, no answer`);
    const away = told(decide('b3-wren', decision, { flags: { nessa_keeper: 'later' }, party: ['orin', 'maren'] }));
    assert.doesNotMatch(away, /^Nessa:|signal key|It's written|From a chair/m, `${decision}: without Nessa`);
  }
  assert.match(told(decide('b3-wren', 'cast', { flags: { nessa_keeper: 'later' } })), /Nessa Reed, keeper of the forge-signal/);
});

// Curtis, 22 November 2026: Nessa's epilogue answer is the player's to shape,
// so a sent "no" (nessa_keeper "declined") is its own story here, not silence.
test('Wren\'s bell: if Nessa said no to the post, Wren kept the no and the committee has it in the minutes', () => {
  const start = (flags, party) => opening(act(ready('b3-wren', { flags, party }), { type: 'depart', questId: 'b3-wren' }).state);
  const no = start({ nessa_keeper: 'declined' });
  assert.match(no, /I kept your no/); assert.match(no, /would not ask a second time/); assert.match(no, /You said no to the post, girl\. You didn't say no to me\./);
  assert.doesNotMatch(no, /manage another winter|Stand at the pit with me|asked once/);
  const away = start({ nessa_keeper: 'declined' }, ['orin', 'maren']);
  assert.match(away, /No Reed\./); assert.match(away, /asked once/); assert.doesNotMatch(away, /^Nessa:|I kept your no|held for her/m);
});

test('Wren\'s bell: Nessa\'s no is answered in every decision, and the long yes is not', () => {
  const answer = { cast: /Keep your no, Reed\. It was an honest one\./, refuse: /I said no to your post, Wren\. I never said no to you\./, wait: /I'm still not taking the signal/ };
  for (const [decision, line] of Object.entries(answer)) {
    const no = told(decide('b3-wren', decision, { flags: { nessa_keeper: 'declined' } }));
    assert.match(no, line, decision);
    assert.doesNotMatch(no, /Now, not later|It's not yet, Wren|So here's a real one|long yes owing/, decision);
    for (const other of Object.values(answer).filter((x) => x !== line)) assert.doesNotMatch(no, other, decision);
    assert.doesNotMatch(told(decide('b3-wren', decision, { flags: { nessa_keeper: 'later' } })), line, `${decision}: only after a no`);
    const away = told(decide('b3-wren', decision, { flags: { nessa_keeper: 'declined' }, party: ['orin', 'maren'] }));
    assert.doesNotMatch(away, /^Nessa:|Keep your no|on the roster/m, `${decision}: without Nessa`);
  }
  assert.match(told(decide('b3-wren', 'cast', { flags: { nessa_keeper: 'declined' }, party: ['orin', 'maren'] })), /Reed said no to it/);
});

test('Wren\'s bell agrees with Books One and Two: twenty years on the tower, and Ottilie Brand\'s fourteen-seat committee', () => {
  const s = act(ready('b3-wren'), { type: 'depart', questId: 'b3-wren' }).state;
  const all = `${opening(s)}\n${RAWQ['b3-wren'].talks.flatMap((t) => everyLine(t.lines)).map((l) => l.narrate || l.text).join('\n')}`;
  assert.match(all, /kept the Highpass tower for twenty years/); assert.match(all, /Eleven to three\. Fourteen seats/); assert.match(all, /eleven to three/);
  assert.doesNotMatch(all, /[Tt]hirty years|[Tt]hirty-one to four|Agnes|gallery crew/);
  assert.match(all, /Ottilie Brand has chaired the miners' committee/);
  // With the mould job done first, Ottilie knows the founders' words already.
  const ledger = (flags) => { const t = at('b3-wren', 'start', { flags }); return told(act(t, { type: 'story-choice', choiceId: 'investigate' }).state); };
  assert.match(ledger({}), /Ask who\? Ask them all what\?/);
  assert.match(ledger({ 'job:mould-kept': true }), /same five words as on the mould/); assert.doesNotMatch(ledger({ 'job:mould-kept': true }), /Ask who\? Ask them all what/);
  assert.match(ledger({ 'job:mould-sold': true }), /before the Hall carted it off/);
});

test('the wren-nessa scene: with Nessa the letter on the table, without her the letter to pass on; the camp beat is last', () => {
  for (const [decision, line] of [['cast', /buttons the coat over it/], ['refuse', /next to the hearth bell/], ['wait', /writes something at the bottom/]]) {
    const s = decide('b3-wren', decision);
    assert.equal(s.story.nodeId, 'scene-wren-nessa-letter');
    assert.match(opening(s), line, decision);
    const camp = act(s, { type: 'story-choice', choiceId: 'wall' }).state;
    assert.equal(camp.story.nodeId, 'scene-wren-nessa-door');
    assert.match(opening(camp), /Biscuit will not leave the forge door/);
    assert.equal(act(camp, { type: 'story-choice', choiceId: 'sleep' }).state.story.nodeId, 'town-saltwick');
  }
  const alone = decide('b3-wren', 'cast', { party: ['orin', 'maren'] });
  assert.match(opening(alone), /For Reed, when you see her/); assert.doesNotMatch(opening(alone), /Biscuit|^Nessa:/m);
  const camp = act(alone, { type: 'story-choice', choiceId: 'wall' }).state;
  assert.match(opening(camp), /Hew comes past/); assert.doesNotMatch(opening(camp), /Biscuit/);
  assert.match(told(decide('b3-wren', 'cast')), /ten bells round the lid/);
});

// Chapter 13.
test('the order: the trial is held wherever Saltwick\'s people are now', () => {
  const start = (flags) => opening(act(ready('b3-order', { flags }), { type: 'depart', questId: 'b3-order' }).state);
  assert.match(start({}), /Saltwick is still on its roofs/);
  assert.match(start({ b3_saltwick_bought: true }), /Saltwick is still on its roofs/);
  const quarter = start({ b3_saltwick_moved: true });
  assert.match(quarter, /quarter of Vell/); assert.match(quarter, /cooper's shed/); assert.doesNotMatch(quarter, /still on its roofs|Highpass road/);
  const camp = start({ b3_saltwick_moved: true, b3_bell_evacuate: true });
  assert.match(camp, /on the Highpass road/); assert.match(camp, /lamp wagon/); assert.doesNotMatch(camp, /quarter of Vell|still on its roofs/);
});

test('Mags says before the verdict that she will not forgive a man who was let off', () => {
  const after = opening(peaceAt('b3-order'));
  assert.match(after, /I'll not forgive a man who's been let off/);
  assert.ok(after.indexOf("let off") < after.length, 'The player hears it before deciding.');
  assert.match(after, /^Orin: I was at the back of his column/m);
  const alone = opening(peaceAt('b3-order', { party: ['maren', 'nessa'] }));
  assert.match(alone, /Stoneward's friends heard me/); assert.doesNotMatch(alone, /^Orin:|Orin stands up/m);
  const view = E.buildView(at('b3-order', 'after', { party: ['maren', 'nessa'] }));
  assert.equal(E.resolveAction(at('b3-order', 'after', { party: ['maren', 'nessa'] }), { type: 'story-choice', choiceId: 'both' }, high).result.ok, false, 'Orin cannot ask to be tried if he is not there.');
  assert.ok(view.scene.choices.some((c) => c.id === 'varn'));
});

test('Mags\'s answer: she forgives Orin only if he was tried, otherwise it was never hers; without him neither is set', () => {
  const answer = (decision, party) => { let s = decide('b3-order', decision, { party }); const first = opening(s); s = toTown(s); return { first, flags: s.story.flags }; };
  const tried = answer('both');
  assert.equal(tried.flags.b3_mags_forgives, true); assert.equal(tried.flags.b3_mags_not_hers, undefined);
  assert.match(tried.first, /I forgive you/); assert.match(tried.first, /Come back in the spring, for the lamps/); assert.doesNotMatch(tried.first, /never mine to forgive/);
  for (const decision of ['varn', 'free']) {
    const r = answer(decision);
    assert.equal(r.flags.b3_mags_not_hers, true, decision); assert.equal(r.flags.b3_mags_forgives, undefined, decision);
    assert.match(r.first, /It was never mine to forgive/); assert.doesNotMatch(r.first, /I forgive you/);
  }
  for (const decision of ['varn', 'free']) {
    const r = answer(decision, ['maren', 'nessa']);
    assert.equal(r.flags.b3_mags_forgives, undefined); assert.equal(r.flags.b3_mags_not_hers, undefined, `${decision}: Orin away sets neither`);
    assert.match(r.first, /he can come and get it himself/); assert.doesNotMatch(r.first, /Stoneward/);
  }
  // The camp beat is the last node.
  const s = decide('b3-order', 'both');
  const camp = act(s, { type: 'story-choice', choiceId: 'round' }).state;
  assert.equal(camp.story.nodeId, 'scene-order-mags-knots');
  assert.match(opening(camp), /Orin unties every knot/);
  assert.equal(act(camp, { type: 'story-choice', choiceId: 'sleep' }).state.story.nodeId, 'town-ashford');
});

test('the verdicts move Saltwick\'s standing as the design says', () => {
  const rep = (decision) => decide('b3-order', decision).world.reputation.wilds;
  const base = at('b3-order', 'after').world.reputation.wilds;
  assert.equal(rep('both'), base - 1); assert.equal(rep('varn'), base + 1);
  assert.match(told(decide('b3-order', 'both')), /^Nessa: He left a town to die and he gets the same lamps as you\?$/m);
});

// Chapter 14.
test('the town that said no: Sister Ilse has Sable\'s books only if they were sent, and the lower town was called Ashford', () => {
  const talks = (flags) => E.buildView(act(ready('b3-ashford', { flags }), { type: 'depart', questId: 'b3-ashford' }).state).scene.choices.map((c) => c.id);
  assert.ok(!talks({}).includes('talk-ilse'));
  for (const f of ['job:library-sent', 'job:library-noted', 'job:library-cut', 'job:library-unread']) assert.ok(talks({ [f]: true }).includes('talk-ilse'), f);
  const ilse = (flags) => { const s = act(ready('b3-ashford', { flags }), { type: 'depart', questId: 'b3-ashford' }).state; return told(act(s, { type: 'story-choice', choiceId: 'talk-ilse' }).state); };
  assert.match(ilse({ 'job:library-sent': true }), /Why did they stop/); assert.match(ilse({ 'job:library-cut': true }), /birds/); assert.doesNotMatch(ilse({ 'job:library-cut': true }), /Why did they stop/);
  for (const [decision, line] of [['defend', /I've given it up again/], ['children', /My grandson's at Highpass/], ['cast', /Amos Wick said yes/]]) {
    const s = decide('b3-ashford', decision);
    assert.equal(s.story.nodeId, 'scene-ashford-camp-wall');
    const text = opening(s);
    assert.match(text, /^Hollis Brede: Ashford\. That's what it was called\./m); assert.match(text, line, decision);
    assert.equal(toTown(s).story.nodeId, 'town-highpass');
  }
});

// Lines and flags.
const COMPANION_NAMES = { orin: /\b(Orin|Stoneward)\b/, maren: /\bMaren\b|\bSister\b(?! Ilse)/, nessa: /\b(Nessa|Reed|Biscuit)\b/ };
// Every line in a piece of content, with the conditions of the group it is in.
function everyLine(value, out = [], group = {}) {
  if (Array.isArray(value)) value.forEach((v) => everyLine(v, out, group));
  else if (value && typeof value === 'object') {
    if (value.oneOf) everyLine(value.oneOf, out, { ...group, ...(value.when || {}) });
    else if (value.say || value.narrate) out.push({ ...value, when: { ...group, ...(value.when || {}) } });
    // A talk or choice that needs a companion is told only with them.
    else { const g = value.requires?.companion ? { ...group, party: value.requires.companion } : group; for (const v of Object.values(value)) everyLine(v, out, g); }
  }
  return out;
}
const CONTENT = [...IDS.map((id) => [id, RAWQ[id]]), ...Object.entries(RAWS).filter(([k]) => !k.startsWith('_')), ...Object.entries(RAWJ).filter(([k]) => !k.startsWith('_'))];

test('a line that names a companion is told only when they are there, or is written for when they are away', () => {
  for (const [owner, content] of CONTENT) for (const l of everyLine(content)) for (const [who, name] of Object.entries(COMPANION_NAMES)) {
    if (l.say === who || !name.test(l.text || l.narrate)) continue;
    assert.ok(l.when.party === who || l.when.absent === who, `${owner}: "${(l.text || l.narrate).slice(0, 70)}" names ${who} without a party gate`);
  }
});

test('every Part Two line uses known conditions, and every flag it reads is set earlier or has a default', () => {
  const KNOWN = new Set(['flag', 'is', 'notFlag', 'anyFlag', 'noneFlag', 'party', 'absent', 'class', 'spec', 'bondAtLeast', 'bondBelow', 'item', 'notItem', 'clue', 'notClue', 'access', 'notAccess']);
  // Read from Books One and Two and from Part One (design, "Book Two and Part One flags read in Part Two").
  const EARLIER = new Set(['nessa_keeper', 'elske_seat', 'elske_free', 'elske_judged', 'b2:haverick_named', 'mother_chorus', 'mother_silenced', 'mother_recalled', 'job:minersvote-decided', 'job:library-sent', 'job:library-noted', 'job:library-cut', 'job:library-unread',
    'b3_rite_law', 'b3_rite_destroyed', 'b3_rite_vell', 'b3_saltwick_moved', 'b3_saltwick_bought', 'b3_bell_evacuate', 'b3_partone_done',
    'b3_bell_cast', 'b3_bell_aster', 'b3_vault_word', 'b3_witnessed', 'b3_quotas_exposed', 'b3_vault_held', 'b3_corvane_keeper', 'b3_corvane_vell', 'b3_corvane_judged', 'second_oath', 'wards_seat']);
  const ENGINE = /^(method|prepared|approach|partial|job|away|walked):/;
  const setIn = (content) => { const f = new Set(); JSON.stringify(content, (k, v) => { if (k === 'setFlags' && v) Object.keys(v).forEach((x) => f.add(x)); if (k === 'setFlag') Object.keys(typeof v === 'string' ? { [v]: 1 } : v).forEach((x) => f.add(x)); return v; }); for (const d of content.decisions || []) f.add(d.flag); return f; };
  const byChapter = IDS.map((id) => { const f = setIn(RAWQ[id]); const sc = sceneOf(id); if (sc) for (const x of setIn(RAWS[sc.id])) f.add(x); return f; });
  const setBefore = (flag, upTo) => byChapter.slice(0, upTo).some((f) => f.has(flag));
  // A line's setFlag is set as it is told, so the lines after it in the same piece may read it.
  const toldIn = (content) => { const f = new Set(); for (const l of everyLine(content)) if (l.setFlag) Object.keys(typeof l.setFlag === 'string' ? { [l.setFlag]: 1 } : l.setFlag).forEach((x) => f.add(x)); return f; };
  const check = (owner, content, upTo) => {
    const own = toldIn(content);
    for (const l of everyLine(content)) {
      for (const key of Object.keys(l.when)) assert.ok(KNOWN.has(key), `${owner}: ${key}`);
      for (const key of ['party', 'absent']) if (l.when[key]) assert.ok(COMPANIONS[l.when[key]], owner);
      for (const flag of [l.when.flag, l.when.notFlag, ...(l.when.anyFlag || []), ...(l.when.noneFlag || [])].filter(Boolean)) {
        if (ENGINE.test(flag) && !/^job:(minersvote|library)/.test(flag)) continue;
        assert.ok(EARLIER.has(flag) || setBefore(flag, upTo) || own.has(flag), `${owner}: ${flag} is read before it can be set`);
      }
    }
  };
  // A chapter's ledge is woken at only after its decision, so it may read the chapter's own flags.
  IDS.forEach((id, i) => { const { ledge, ...chapter } = RAWQ[id]; check(id, chapter, i); if (ledge) check(`${id} ledge`, ledge, i + 1); });
  for (const [id, s] of Object.entries(RAWS).filter(([k]) => !k.startsWith('_'))) check(id, s, IDS.indexOf(s.after) + 1);
  for (const [id, j] of Object.entries(RAWJ).filter(([k]) => !k.startsWith('_'))) check(id, j, Math.max(0, IDS.indexOf(j.until)));
  for (const id of IDS) for (const t of RAWQ[id].talks) for (const f of t.requires?.flagsAny || []) assert.ok(EARLIER.has(f), `${id}/${t.id}: ${f}`);
});

test('a save missing every Book Two and Part One choice still hears each chapter whole, and without companions no companion speaks', () => {
  for (const id of IDS) for (const party of [['orin', 'maren', 'nessa'], []]) {
    const s = ready(id, { party });
    for (const key of Object.keys(s.story.flags)) if (!/^(method|prepared|approach|partial):/.test(key)) delete s.story.flags[key];
    let t = act(s, { type: 'depart', questId: id }).state;
    const start = opening(t);
    assert.ok(start.length > 800, `${id}: the opening is told`);
    for (const talk of E.buildView(t).scene.choices.filter((c) => c.id.startsWith('talk-') && !c.locked)) { t = act(t, { type: 'story-choice', choiceId: talk.id }).state; if (!party.length) assert.doesNotMatch(told(t), /^(Orin|Maren|Nessa):/m, `${id}/${talk.id}`); }
    const after = opening(peaceAt(id, { party }));
    assert.ok(after.length > 300, id);
    if (!party.length) for (const text of [start, after]) assert.doesNotMatch(text, /^(Orin|Maren|Nessa):/m, id);
    if (!party.length) for (const d of QUESTS[id].decisions.filter((x) => !x.requires)) {
      let r = act(at(id, 'after', { party }), { type: 'story-choice', choiceId: d.id }).state;
      // Through the scene to town, or (straight on) to the next chapter's opening.
      for (let i = 0; i < 4 && !E.buildView(r).world.town; i++) { assert.doesNotMatch(opening(r), /^(Orin|Maren|Nessa):/m, `${id}/${d.id} ${r.story.nodeId}`); if (r.story.nodeId.startsWith('q-')) break; r = act(r, { type: 'story-choice', choiceId: E.buildView(r).scene.choices.find((c) => !c.locked).id }).state; }
    }
  }
});

test('no new name reuses one the story bible keeps for someone else', () => {
  const text = JSON.stringify([RAWQ, RAWS, RAWJ]);
  for (const name of ['Tamsin', 'Brask', 'Hesper', 'Pell Haverick', 'Pellow', 'Tam']) {
    const uses = text.match(new RegExp(`\\b${name}\\b`, 'g')) || [];
    if (name === 'Pell Haverick') assert.ok(uses.length <= 2, 'Haverick is named only as himself.');
    else assert.equal(uses.length, 0, name);
  }
  assert.match(text, /Cass Ord/); assert.match(text, /Captain Odell Varn|Odell Varn/); assert.match(text, /Hollis Brede/); assert.match(text, /Coll Haddow/);
});

// Walkouts in Part Two.
function finish(s, id, decision) {
  s.story.nodeId = `q-${id}-after`; s.world.activeQuest = id; s.world.onExpedition = true; s.story.flags[`method:${id}`] = 'peace';
  s = act(s, { type: 'story-choice', choiceId: decision }).state;
  for (let i = 0; i < 6 && E.buildView(s).scene.id.startsWith('scene-'); i++) s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices.find((c) => !c.locked).id }).state;
  return s;
}
test('in Part Two a companion who ends a chapter two down walks out for the next, and comes back after it', () => {
  let s = ready('b3-price');
  s.world.approvalWindow = { orin: -2 };
  s = finish(s, 'b3-price', 'rule');
  assert.equal(s.story.nodeId, 'away-orin-leave');
  s = act(s, { type: 'story-choice', choiceId: 'let' }).state;
  assert.equal(s.story.nodeId, 'town-cinderfold');
  assert.ok(!s.party.some((m) => m.id === 'orin'));
  assert.deepEqual(E.buildView(s).world.away.map((a) => [a.id, a.until]), [['orin', 'b3-wren']]);
  s = finish(s, 'b3-wren', 'cast');
  assert.equal(s.story.nodeId, 'away-orin-back');
  assert.ok(s.party.some((m) => m.id === 'orin'));
  s = act(s, { type: 'story-choice', choiceId: 'explain' }).state;
  assert.equal(s.story.nodeId, 'town-saltwick');
  assert.equal(s.party.find((m) => m.id === 'orin').level, s.player.level);
});

test('a companion never walks out before their own chapter in Part Two: they stay and say why', () => {
  let s = ready('b3-price');
  s.world.approvalWindow = { nessa: -3 };
  s = finish(s, 'b3-price', 'shut');
  assert.equal(s.story.nodeId, 'away-nessa-stay');
  assert.match(opening(s), /Wren's written\. From Cinder Fold/);
  s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
  assert.ok(s.party.some((m) => m.id === 'nessa'));
  let o = ready('b3-wren');
  o.world.approvalWindow = { orin: -2 };
  o = finish(o, 'b3-wren', 'cast');
  assert.equal(o.story.nodeId, 'away-orin-stay');
  assert.match(opening(o), /they've caught my old captain/);
});

test('walkouts do not run in Part One, or when no written chapter follows', () => {
  let s = ready('b3-witness');
  s.world.approvalWindow = { orin: -2 };
  s = finish(s, 'b3-witness', 'witness');
  assert.ok(STORY_NODES[s.story.nodeId].townId, `${s.story.nodeId}: no walkout after a Part One chapter`);
  assert.ok(s.party.some((m) => m.id === 'orin'));
  // After the last chapter nothing is written to walk out of.
  let last = ready('b3-firstbell');
  last.world.approvalWindow = { maren: -2 };
  last = finish(last, 'b3-firstbell', 'seal');
  assert.equal(last.story.nodeId, 'town-briarwatch');
  assert.ok(last.party.some((m) => m.id === 'maren'));
  assert.equal(Book.chapter(last), null, 'The written books are finished.');
  assert.equal(Away.LIMIT, 2);
});

// Side jobs.
const JOB_IDS = ['debtbook', 'mould', 'lamps', 'roster'];
function paths(job) {
  const out = [];
  const walk = (key, trail, seen) => {
    for (const c of job.nodes[key].choices) for (const rng of c.check ? [high, low] : [high]) {
      const o = c.check ? (rng === high ? c.success : c.failure) : c;
      const step = [...trail, { choiceId: c.id, rng, o }];
      if (o.next) { if (!seen.includes(`${key}>${c.id}`)) walk(o.next, step, [...seen, `${key}>${c.id}`]); } else out.push(step);
    }
  };
  walk(job.start, [], []);
  return out;
}
// The chapter a job is played during: the one after its window opens.
const during = (job) => (job.from === 'b3-paid' ? 'b3-price' : IDS[IDS.indexOf(job.from) + 1]);
test('the Debt Book, the Tenth Mould, Lamps for the Roofs and the Watch Roster open in their windows, and only then', () => {
  assert.deepEqual(JOB_IDS.map((id) => [id, SIDE_JOBS[id].town, SIDE_JOBS[id].from, SIDE_JOBS[id].until]), [
    ['debtbook', 'merrowgate', 'b3-paid', 'b3-wren'], ['mould', 'cinderfold', 'b3-price', 'b3-ashford'], ['lamps', 'saltwick', 'b3-wren', 'b3-seal'], ['roster', 'briarwatch', 'b3-seal', 'b3-winter']]);
  const offered = (id, chapter) => { const job = SIDE_JOBS[id]; const s = ready(chapter, { town: job.town }); return E.buildView(s).world.sideJobs.some((j) => j.id === id); };
  assert.ok(offered('debtbook', 'b3-price') && offered('debtbook', 'b3-wren') && !offered('debtbook', 'b3-order'));
  assert.ok(!offered('mould', 'b3-price') && offered('mould', 'b3-wren') && offered('mould', 'b3-ashford'));
  // Lamps for the Roofs is open during chapters 13 to 15, as the design gives it.
  assert.ok(!offered('lamps', 'b3-wren') && offered('lamps', 'b3-order') && offered('lamps', 'b3-ashford') && offered('lamps', 'b3-seal') && !offered('lamps', 'b3-winter'));
  // The Watch Roster is open during chapter 16 only.
  assert.ok(!offered('roster', 'b3-seal') && offered('roster', 'b3-winter') && !offered('roster', 'b3-company'));
  // Before Part One is over the Debt Book is not on offer.
  const early = ready('b3-witness', { town: 'merrowgate' }); delete early.world.completed['b3-paid'];
  assert.ok(!E.buildView(early).world.sideJobs.some((j) => j.id === 'debtbook'));
});

test('every way through every Part Two job ends in town, paid once, at most 130 XP, never past the chapter, with or without companions', () => {
  for (const job of JOB_IDS.map((id) => SIDE_JOBS[id])) {
    assert.equal(W.jobXp(job), 130, `${job.id}: Book Three's job XP cap`);
    for (const party of [['orin', 'maren', 'nessa'], []]) for (const path of paths(job)) {
      let s = ready(during(job), { party, town: job.town });
      const before = { xp: s.player.xp, gold: s.player.gold, level: s.player.level };
      s = act(s, { type: 'side-job', jobId: job.id }).state;
      for (const step of path) s = act(s, { type: 'story-choice', choiceId: step.choiceId }, step.rng).state;
      const where = `${job.id} ${path.map((p) => p.choiceId).join('>')} [${party.join(',')}]`;
      assert.equal(s.story.nodeId, `town-${job.town}`, where);
      assert.equal(s.story.flags[`job:${job.id}`], true, where);
      const spent = path.reduce((n, p) => n + (Number.isFinite(p.o.gold) ? p.o.gold : 0), 0);
      assert.equal(s.player.gold, before.gold + spent + job.gold, where);
      assert.ok(s.player.xp > before.xp && s.player.xp - before.xp <= 130, where);
      assert.equal(s.player.level, before.level, `${where}: never levels past the chapter`);
      if (!party.length) assert.doesNotMatch(told(s), /^(Orin|Maren|Nessa):/m, where);
    }
  }
});

test('the jobs are told for what the chapters decided, with a line for a save without it', () => {
  const start = (id, chapter, flags) => { const job = SIDE_JOBS[id]; const s = ready(chapter, { flags, town: job.town }); return opening(act(s, { type: 'side-job', jobId: id }).state); };
  assert.match(start('debtbook', 'b3-wren', { b3_debts_bought: true }), /Forty-six names/); assert.match(start('debtbook', 'b3-price', {}), /Two hundred and eighty names/);
  assert.match(start('mould', 'b3-order', { b3_wren_cast: true }), /the ten ringing/); assert.match(start('mould', 'b3-order', { b3_wren_waits: true }), /by hand/); assert.match(start('mould', 'b3-wren', {}), /out of time/);
  assert.match(start('lamps', 'b3-order', { b3_saltwick_moved: true }), /Saltwick is empty/); assert.match(start('lamps', 'b3-order', {}), /still on its roofs/);
  assert.match(start('roster', 'b3-winter', { b3_bell_evacuate: true }), /two thousand people from Vell in the fields/); assert.match(start('roster', 'b3-winter', {}), /walked that edge for two hundred years/);
});

test('the main story never assumes a Part Two job was done', () => {
  for (const id of IDS) for (const l of everyLine(RAWQ[id])) if (/Ida Ferris|Coppin|Corry Marl|Ivo Sefton|Barnaby Fisk|Jem Tullow|Greta Danner|tenth mould stands|debt book/i.test(l.text || l.narrate)) assert.ok(l.when.flag?.startsWith('job:'), `${id}: ${(l.text || l.narrate).slice(0, 60)}`);
  for (const [id, s] of Object.entries(RAWS).filter(([k]) => !k.startsWith('_'))) for (const l of everyLine(s)) assert.ok(!/Ida Ferris|Coppin|Corry Marl|Ivo Sefton|Barnaby Fisk|Jem Tullow|Greta Danner/.test(l.text || l.narrate) || l.when.flag?.startsWith('job:'), id);
});

// Chapter 15.
test('the witness\'s seal: why a witness is needed follows the law or Merrowgate\'s rule, with buyers wanting one otherwise', () => {
  const start = (flags, party) => opening(act(ready('b3-seal', { flags, party }), { type: 'depart', questId: 'b3-seal' }).state);
  assert.match(start({ b3_rite_law: true }), /Since the Iron Road there has been a law/); assert.doesNotMatch(start({ b3_rite_law: true }), /The buyers do|Merrowgate's rule says the same/);
  assert.match(start({ b3_market_ruled: true }), /Since Merrowgate made its rule/); assert.doesNotMatch(start({ b3_market_ruled: true }), /The buyers do|there has been a law/);
  assert.match(start({ b3_rite_law: true, b3_market_ruled: true }), /Merrowgate's rule says the same/);
  for (const t of [start({}), start({ b3_market_shut: true })]) { assert.match(t, /No law asks for a witness\. The buyers do\./); assert.doesNotMatch(t, /there has been a law|made its rule/); }
  assert.match(start({}), /^Reeve Aveline: They want you to be the seal, Maren\./m);
  const alone = start({}, ['orin', 'nessa']);
  assert.match(alone, /addressed to Sister Maren Vale/); assert.doesNotMatch(alone, /^Maren:|be the seal, Maren/m);
  assert.equal(QUESTS['b3-seal'].peaceful.skill, 'insight'); assert.deepEqual(QUESTS['b3-seal'].peaceful.alt, ['persuasion']);
  assert.equal(QUESTS['b3-seal'].investigate.skill, 'insight'); assert.equal(QUESTS['b3-seal'].investigate.alt[0], 'religion');
});

test('the forged seals are in Maren\'s hand, and with the clue the forger writes her name in front of the crowd', () => {
  const s = peaceAt('b3-seal', { flags: { 'prepared:b3-seal': true } });
  assert.match(told(s), /And then write my name/); assert.match(told(s), /He writes it\. It is very good/);
  const u = peaceAt('b3-seal');
  assert.match(told(u), /That's a lie\. You said it very calmly/); assert.doesNotMatch(told(u), /write my name|He writes it/);
  const alone = peaceAt('b3-seal', { party: [], flags: { 'prepared:b3-seal': true } });
  assert.match(told(alone), /ask him to write the witness's name/); assert.doesNotMatch(told(alone), /^Maren:|Maren goes down/m);
  assert.match(CLUES['b3-seal-evidence'].text, /forged in the witness's own hand/);
});

test('seal-sable: Sable asks to be cast, Aster speaks first, and the player decides; the camp beat is last', () => {
  for (const decision of ['take', 'refuse', 'many']) {
    const s = decide('b3-seal', decision);
    assert.equal(s.story.nodeId, 'scene-seal-sable-cell');
    const text = opening(s);
    assert.match(text, /I want to be cast/); assert.match(text, /last person alive who knows the rite by heart/);
    assert.match(text, /^Aster Vey: Nobody is owed that\. Not even by you\.$/m);
    assert.ok(text.indexOf('Nobody is owed that') < text.indexOf('Then it\'s yours to say'), 'Aster speaks before the choice is the hero\'s.');
  }
  const cast = act(decide('b3-seal', 'take'), { type: 'story-choice', choiceId: 'let' }).state;
  assert.equal(cast.story.flags.b3_sable_cast, true); assert.equal(cast.story.flags.b3_sable_lives, undefined);
  assert.match(told(cast), /Highpass has a ward/); assert.match(told(cast), /as the seal/);
  assert.equal(cast.story.nodeId, 'scene-seal-sable-snow');
  assert.match(opening(cast), /new bell stands with snow on its shoulders/);
  assert.equal(act(cast, { type: 'story-choice', choiceId: 'sleep' }).state.story.nodeId, 'town-briarwatch');
  const no = act(decide('b3-seal', 'refuse'), { type: 'story-choice', choiceId: 'refuse' }).state;
  assert.equal(no.story.flags.b3_sable_lives, true); assert.equal(no.story.flags.b3_sable_cast, undefined);
  assert.match(opening(no), /one cell has its lamp lit/);
  // Aster by letter when she is in Vell's great bell.
  const letter = opening(decide('b3-seal', 'many', { flags: { b3_bell_aster: true } }));
  assert.match(letter, /Aster's second letter/); assert.match(letter, /That is all the letter says/); assert.doesNotMatch(letter, /little bell/);
  assert.deepEqual(STORY_NODES['scene-seal-sable-cell'].choices.map((c) => [c.id, c.result.setFlags]), [['let', { b3_sable_cast: true }], ['refuse', { b3_sable_lives: true }]]);
});

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
test('the camp after chapter 15 names the hero\'s 2nd job skill at level 35 for every branch', () => {
  const J = require('../src/data/jobs.json').classes;
  const camp = (cls, party, spec) => {
    const s = act(decide('b3-seal', 'many', { cls, party }), { type: 'story-choice', choiceId: 'refuse' }).state;
    assert.equal(s.story.nodeId, 'scene-seal-sable-snow');
    s.player.progression.specialization = spec;
    E.enterNode(s, 'scene-seal-sable-snow', []);
    return opening(s);
  };
  for (const [cls, c] of Object.entries(J)) for (const b of c.branches) {
    const skill = b.skills.find((k) => k.level === 35);
    assert.ok(skill, `${cls}/${b.id} has a level-35 skill`);
    for (const party of [['orin', 'maren', 'nessa'], ['orin'], []]) {
      const text = camp(cls, party, b.id);
      assert.equal(text.split(skill.name).length - 1, 1, `${cls}/${b.id} [${party}]: ${skill.name} is named once`);
      if (party.includes('maren')) assert.match(text, new RegExp(`^Maren: .*${escape(skill.name)}`, 'm')); else assert.doesNotMatch(text, /^Maren:/m);
    }
  }
  assert.match(camp('fighter', ['maren'], null), /different this winter/);
  assert.equal(P.XP_NEXT[33] + P.levelBand(34), P.XP_NEXT[34], 'Chapter 15 leaves the hero at level 35.');
});

// Chapter 16.
test('the winter watch: the second winter follows the great bell, with a line for a save without it', () => {
  const start = (flags, party) => opening(act(ready('b3-winter', { flags, party }), { type: 'depart', questId: 'b3-winter' }).state);
  assert.match(start({ b3_bell_aster: true }), /The tower is empty/); assert.doesNotMatch(start({ b3_bell_aster: true }), /Aster Vey is in Briarwatch's tower|in Briarwatch's fields/);
  assert.match(start({ b3_bell_evacuate: true }), /Vell's people are in Briarwatch's fields/);
  const cast = start({ b3_bell_cast: true });
  assert.match(cast, /voices in Vell's bells are holding the city/); assert.match(cast, /three hundred and ninety-one voices/);
  assert.match(start({ b3_bell_cast: true, b3_witnessed: true }), /three hundred and thirty voices/);
  assert.match(start({ b3_bell_cast: true, b3_quotas_exposed: true }), /a hundred and eighty-six voices/);
  const old = start({});
  assert.match(old, /Aster Vey is in Briarwatch's tower/); assert.doesNotMatch(old, /tower is empty|in Briarwatch's fields|voices in Vell's bells|four hundred voices/);
  for (const t of [old, cast]) { assert.match(t, /three hundred volunteers/); assert.match(t, /a few days after Commander Hesk was taken at the foot of the pass/); }
  assert.match(start({ b3_wren_waits: true }), /Ned Thorne fell from the ropes/); assert.match(start({ b3_wren_waits: true }), /can no longer climb to the pit/);
  assert.doesNotMatch(old, /Ned Thorne/);
  assert.match(start({ b3_debts_bought: true }), /went to buy Merrowgate's harbour debts instead/); assert.doesNotMatch(old, /harbour debts/);
});

test('Elske speaks at Briarwatch only as the Second Oath left her; on an old save Brannagh chairs', () => {
  const s0 = (flags) => act(ready('b3-winter', { flags }), { type: 'depart', questId: 'b3-winter' }).state;
  const talk = (flags, id) => { const s = s0(flags); return E.buildView(s).scene.choices.some((c) => c.id === `talk-${id}`) ? told(act(s, { type: 'story-choice', choiceId: `talk-${id}` }).state) : null; };
  assert.match(talk({ elske_seat: true }, 'elske'), /council has given her its chair/);
  assert.match(talk({ elske_free: true }, 'elske'), /harbour hospice/); assert.match(talk({ elske_judged: true }, 'elske'), /her cell at Highpass/);
  assert.equal(talk({}, 'elske'), null, 'No Elske on an old save.');
  for (const flags of [{}, { elske_free: true }, { elske_judged: true }]) assert.match(talk(flags, 'brannagh'), /I'm in the chair/, JSON.stringify(flags));
  assert.doesNotMatch(talk({ elske_seat: true }, 'brannagh'), /I'm in the chair/);
  const approach = (flags) => opening(act(s0(flags), { type: 'story-choice', choiceId: 'advance' }).state);
  assert.match(approach({}), /Brannagh of Fenmere is in the chair/); assert.doesNotMatch(approach({}), /Elske/);
  assert.match(approach({ elske_seat: true }), /Elske Marrow is in the chair/);
});

test('what the hero asks of the free wards is framed by the Second Oath, with a version for an old save', () => {
  const after = (flags) => opening(peaceAt('b3-winter', { flags }));
  assert.match(after({ second_oath: 'council' }), /swore your Second Oath to the council/);
  assert.match(after({ second_oath: 'town' }), /swore your Second Oath to Briarwatch/);
  assert.match(after({ second_oath: 'companions' }), /swore your Second Oath to the people who walk with you/);
  assert.match(after({ second_oath: 'none' }), /swore your Second Oath to no one/);
  assert.match(after({}), /asking the hero of the free wards/); assert.doesNotMatch(after({}), /Second Oath/);
  // The clue: the first keepers' words, from Aster in the bell, or in her own hand in the bell-book.
  const clue = (flags) => { const s = strong(act(ready('b3-winter', { flags }), { type: 'depart', questId: 'b3-winter' }).state); return told(act(s, { type: 'story-choice', choiceId: 'investigate' }).state); };
  assert.match(clue({}), /we gave a little, all of us, and it was enough/); assert.match(clue({}), /^Aster Vey:/m);
  assert.match(clue({ b3_bell_aster: true }), /in Aster Vey's own hand/); assert.doesNotMatch(clue({ b3_bell_aster: true }), /^Aster Vey:/m);
  assert.match(clue({}), /hearth bell/);
});

test('winter-camp: Tovin rings the hour and Pim rings it with him', () => {
  for (const [flags, line] of [[{ b3_bell_aster: true }, /There is nobody in the bell/], [{}, /inside the bell Aster Vey rings with them/]]) {
    const s = decide('b3-winter', 'towns', { flags });
    assert.equal(s.story.nodeId, 'scene-winter-camp-hour');
    assert.match(opening(s), /Tovin rings/); assert.match(opening(s), /Pim rings/); assert.match(opening(s), line);
    assert.equal(act(s, { type: 'story-choice', choiceId: 'listen' }).state.story.nodeId, 'town-vell');
  }
});

// Chapter 17.
test('Hesk\'s company: who the three hundred are follows the market, and Varn and the bound bells come only when they should', () => {
  const start = (flags) => opening(act(ready('b3-company', { flags }), { type: 'depart', questId: 'b3-company' }).state);
  assert.match(start({ b3_market_shut: true }), /inland buyers' volunteers/); assert.match(start({ b3_market_ruled: true }), /witnessed volunteers, every one/);
  assert.match(start({ b3_debts_bought: true }), /Hardly any of them are from Merrowgate's docks/);
  const old = start({});
  assert.match(old, /from every town the Lantern Hall has sold to/);
  assert.match(old, /round iron door in the vault floor, the one nobody in Vell built, is standing open/); assert.match(old, /the council's custody ledger at the foot of the pass/); assert.match(old, /count them back up/);
  assert.match(start({ b3_bell_evacuate: true }), /Vell is empty/); assert.doesNotMatch(old, /Vell is empty/);
  assert.match(start({ b3_varn_freed: true }), /Captain Odell Varn is in the column/); assert.doesNotMatch(old, /Varn/);
  assert.match(start({ b3_vault_held: true }), /thirty-one iron bells are still in their rows/);
  assert.doesNotMatch(start({ b3_vault_held: true, b3_rite_law: true }), /thirty-one/); assert.doesNotMatch(old, /thirty-one/);
});

test('Corvane will not cast again, wherever chapter 10 left him, and Ysolde talks only if she was not cast', () => {
  const talk = (flags, id) => { const s = act(ready('b3-company', { flags }), { type: 'depart', questId: 'b3-company' }).state; return E.buildView(s).scene.choices.some((c) => c.id === `talk-${id}`) ? told(act(s, { type: 'story-choice', choiceId: `talk-${id}` }).state) : null; };
  const where = { b3_corvane_keeper: /at a small table by the door/, b3_corvane_vell: /in the census hall with his clerks/, b3_corvane_judged: /in a cell at Highpass/ };
  for (const [f, line] of Object.entries(where)) { const t = talk({ [f]: true }, 'corvane'); assert.match(t, line, f); assert.match(t, /I will not do it again/, f); }
  assert.match(talk({ b3_corvane_vell: true, b3_bell_evacuate: true }, 'corvane'), /in the empty city/);
  const old = talk({}, 'corvane');
  assert.match(old, /has kept to his rooms all winter/); assert.match(old, /I will not do it again/); assert.match(old, /Hesk stood beside me at every casting/);
  assert.equal(talk({ b3_bell_cast: true }, 'ysolde'), null);
  assert.match(talk({}, 'ysolde'), /I was first on the wall/); assert.match(talk({ b3_bell_evacuate: true }, 'ysolde'), /came back over the pass/);
  assert.match(talk({}, 'volunteer'), /Lise Bracken/);
});

test('the rear ranks hear you more easily if you came with nothing to sell', () => {
  const check = (id, flags) => E.buildView(at(id, 'crisis', { flags })).scene.choices.find((c) => c.id === 'resolve').check;
  const plain = check('b3-company', {}), alone = check('b3-company', { b3_go_alone: true });
  assert.equal(alone.dc, plain.dc - 2);
  assert.ok(alone.reasons.includes('Coming down with nothing to sell lowers DC by 2')); assert.ok(!plain.reasons.some((r) => /nothing to sell/.test(r)));
  assert.match(told(peaceAt('b3-company', { flags: { b3_go_alone: true } })), /nothing to offer them/);
  assert.match(told(peaceAt('b3-company', { flags: { b3_wards_promise: true } })), /promised help/);
  // No other chapter reads it.
  assert.ok(!check('b3-winter', { b3_go_alone: true }).reasons.some((r) => /nothing to sell/.test(r)));
});

test('Hesk escapes down the stair however the vault floor goes, Varn turns forty back either way, and the door decides the way home', () => {
  const peace = opening(peaceAt('b3-company', { flags: { b3_varn_freed: true } }));
  const fight = opening(winFight(act(at('b3-company', 'crisis', { flags: { b3_varn_freed: true } }), { type: 'story-choice', choiceId: 'confront' }).state));
  for (const t of [peace, fight]) {
    assert.match(t, /He goes down\./); assert.match(t, /^Idris Hesk: You came\./m);
    assert.match(t, /forty of his recruits/); assert.match(t, /^Odell Varn: Stoneward\. I gave the order\./m);
  }
  const noVarn = opening(peaceAt('b3-company'));
  assert.doesNotMatch(noVarn, /Varn|forty/); assert.match(noVarn, /He goes down\./);
  assert.match(opening(peaceAt('b3-company', { party: [], flags: { b3_varn_freed: true } })), /^Odell Varn: Tell Stoneward/m);
  assert.match(opening(peaceAt('b3-company', { flags: { b3_vault_held: true } })), /sledge-tracks/);
  // Chapter 17 has no scene: its decision goes straight on down the stair, to chapter 18.
  assert.equal(sceneOf('b3-company'), undefined);
  for (const [decision, f, line] of [['keep', 'b3_door_kept', /Vell's watch will hold it/], ['close', 'b3_door_closed', /Under the lid/]]) {
    const s = decide('b3-company', decision);
    assert.equal(s.story.flags[f], true); assert.match(told(s), line);
    assert.equal(s.story.nodeId, 'q-b3-deep-start'); assert.equal(Book.chapter(s).id, 'b3-deep');
  }
  assert.match(told(decide('b3-company', 'keep', { flags: { b3_bell_evacuate: true } })), /Fennick's clerks will hold it, and Mags's six lamplighters/);
});

// Walkouts from chapter 15 on.
test('Maren never walks out before her own chapter, and walkouts still run between chapters 15 and 16', () => {
  let s = ready('b3-ashford');
  s.world.approvalWindow = { maren: -3 };
  s = finish(s, 'b3-ashford', 'children');
  assert.equal(s.story.nodeId, 'away-maren-stay');
  assert.match(opening(s), /the council's letter is addressed to me/);
  s = act(s, { type: 'story-choice', choiceId: 'after' }).state;
  assert.ok(s.party.some((m) => m.id === 'maren'));
  let o = ready('b3-seal');
  o.world.approvalWindow = { orin: -2 };
  o = finish(o, 'b3-seal', 'many');
  assert.equal(o.story.nodeId, 'away-orin-leave');
  o = act(o, { type: 'story-choice', choiceId: 'let' }).state;
  assert.deepEqual(E.buildView(o).world.away.map((a) => [a.id, a.until]), [['orin', 'b3-winter']]);
  o = finish(o, 'b3-winter', 'towns');
  assert.equal(o.story.nodeId, 'away-orin-back');
});

test('no companion walks out after the winter watch: from the stair on they stay and say why', () => {
  assert.equal(QUESTS['b3-company'].together, true);
  for (const who of ['orin', 'maren', 'nessa']) {
    let s = ready('b3-winter');
    s.world.approvalWindow = { [who]: -5 };
    s = finish(s, 'b3-winter', 'alone');
    assert.equal(s.story.nodeId, `away-${who}-stay`, who);
    assert.match(opening(s), /stair/, who);
    s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
    assert.equal(s.story.nodeId, 'town-vell');
    assert.ok(s.party.some((m) => m.id === who), `${who} is still in the party`);
    assert.deepEqual(E.buildView(s).world.away, []);
  }
  // All three at once: each stays in turn, and nobody leaves.
  let all = ready('b3-winter');
  all.world.approvalWindow = { orin: -2, maren: -2, nessa: -2 };
  all = finish(all, 'b3-winter', 'promise');
  for (let i = 0; i < 4 && all.story.nodeId.startsWith('away-'); i++) { assert.match(all.story.nodeId, /-stay$/); all = act(all, { type: 'story-choice', choiceId: E.buildView(all).scene.choices[0].id }).state; }
  assert.equal(all.party.length, 3); assert.equal(all.story.nodeId, 'town-vell');
  // The rule holds for every chapter after a "together" one, not only the first.
  const was = QUESTS['b3-seal'].together;
  try {
    QUESTS['b3-seal'].together = true;
    let later = ready('b3-seal');
    later.world.approvalWindow = { orin: -2 };
    later = finish(later, 'b3-seal', 'take');
    assert.equal(later.story.nodeId, 'away-orin-stay', 'b3-winter comes after a together chapter, so nobody walks out before it');
  } finally { if (was === undefined) delete QUESTS['b3-seal'].together; else QUESTS['b3-seal'].together = was; }
});

test('chapter 17 plays in the Empty City: from Vell\'s emptied town page, down the stair, and on into the deep', () => {
  let s = strong(ready('b3-company', { flags: { b3_bell_evacuate: true } }));
  assert.equal(E.buildView(s).world.town.subtitle, 'The Empty City');
  assert.deepEqual(E.buildView(s).world.sideJobs, []);
  s = act(s, { type: 'depart', questId: 'b3-company' }).state;
  assert.match(opening(s), /Vell is empty/);
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'careful' }).state;
  s = act(strong(s), { type: 'story-choice', choiceId: 'resolve' }).state;
  assert.equal(s.story.nodeId, 'q-b3-company-after');
  s = act(s, { type: 'story-choice', choiceId: 'keep' }).state;
  assert.match(told(s), /Fennick's clerks will hold it/);
  assert.equal(s.story.nodeId, 'q-b3-deep-start'); assert.equal(E.buildView(s).world.town, null);
  assert.equal(s.player.level, 37);
});

// Chapters 18 to 20: straight on down the stair, and the end of the book.
const D = require('../src/director');
// Walk a scene's choices (the first one offered, unless named) until a town or a chapter.
function through(s, pick = {}) {
  for (let i = 0; i < 8 && !E.buildView(s).world.town && !s.story.nodeId.startsWith('q-'); i++) {
    const choices = E.buildView(s).scene.choices.filter((c) => !c.locked);
    s = act(s, { type: 'story-choice', choiceId: (choices.find((c) => c.id === pick[s.story.nodeId]) || choices[0]).id }).state;
  }
  return s;
}
const fightAt = (id, opts) => act(at(id, 'crisis', opts), { type: 'story-choice', choiceId: 'confront' }).state;

test('chapters 17 to 19 go straight on: a rest, then the next chapter\'s opening, with no town between', () => {
  let s = strong(ready('b3-company'));
  s = act(s, { type: 'depart', questId: 'b3-company' }).state;
  for (const [id, decision, next] of [['b3-company', 'keep', 'b3-deep'], ['b3-deep', 'escort', 'b3-promise'], ['b3-promise', 'tell', 'b3-firstbell']]) {
    for (const c of ['investigate', 'advance', 'careful']) s = act(s, { type: 'story-choice', choiceId: c }).state;
    s = act(strong(s), { type: 'story-choice', choiceId: 'resolve' }).state;
    for (const a of [s.player, ...s.party]) a.hp = 1;
    const r = act(s, { type: 'story-choice', choiceId: decision }); s = r.state;
    assert.equal(s.story.nodeId, `q-${next}-start`, `${id} goes straight on to ${next}`);
    assert.equal(s.world.activeQuest, next); assert.equal(s.world.onExpedition, true); assert.ok(s.world.completed[id]);
    assert.equal(s.player.level, QUESTS[next].level, 'one level per chapter');
    // The chapter's end is a safe rest: everyone is whole again.
    for (const a of [s.player, ...s.party]) assert.equal(a.hp, a.maxHp, `${a.id || 'hero'} rests at the end of ${id}`);
    assert.ok(r.events.some((e) => /rests at the end of/.test(e.text)), id);
    const v = E.buildView(s);
    assert.equal(v.world.town, null, 'no town page below the stair'); assert.deepEqual(v.world.sideJobs, []); assert.equal(v.world.canReturn, false);
    assert.equal(E.resolveAction(s, { type: 'return-town' }, high).result.ok, false, 'no way back to town below the stair');
    assert.equal(Book.chapter(s).id, next);
  }
});

test('a defeat in the deep wakes the hero at the last safe ledge, which survives a save and load, and goes back down to the fight', () => {
  for (const [id, ledge, line] of [['b3-deep', 'q-b3-company-ledge', /iron door|stair under Vell/], ['b3-promise', 'q-b3-deep-ledge', /horn button/], ['b3-firstbell', 'q-b3-promise-ledge', /floor of given things/]]) {
    let s = fightAt(id);
    assert.equal(s.combat?.encounterId, `quest:${id}`);
    const xp = s.player.xp;
    const r = act(s, { type: 'combat', actionId: 'retreat' }); s = r.state;
    assert.equal(s.story.nodeId, ledge, `${id}: the ledge, not a town`);
    assert.equal(s.world.pendingBattle, `quest:${id}`); assert.equal(s.player.xp, xp);
    assert.ok(r.events.some((e) => /last safe ledge/.test(e.text)), id);
    assert.match(opening(s), line);
    const v = E.buildView(s);
    assert.equal(v.world.town, null); assert.equal(v.world.canReturn, false); assert.deepEqual(v.scene.choices.map((c) => c.id), ['down']);
    assert.equal(STORY_NODES[ledge].safeRest, true);
    // Saved and loaded on the ledge.
    s = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
    assert.equal(s.story.nodeId, ledge); assert.equal(s.world.activeQuest, id);
    s = act(s, { type: 'story-choice', choiceId: 'down' }).state;
    assert.equal(s.combat?.encounterId, `quest:${id}`, `${id}: back down to the interrupted fight`);
    assert.equal(s.player.hp, s.player.maxHp, 'rested on the ledge');
    assert.equal(s.story.nodeId, `q-${id}-crisis`);
  }
  // Above the stair a defeat still goes to town.
  const up = act(fightAt('b3-company'), { type: 'combat', actionId: 'retreat' }).state;
  assert.equal(up.story.nodeId, 'town-vell');
});

test('a save made mid-deep loads and plays on to the next chapter', () => {
  let s = decide('b3-company', 'close');
  s = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  assert.equal(s.story.nodeId, 'q-b3-deep-start'); assert.equal(s.world.activeQuest, 'b3-deep'); assert.equal(E.buildView(s).world.town, null);
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }).state;
  s = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'careful' }).state;
  s = act(strong(s), { type: 'story-choice', choiceId: 'resolve' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'fennick' }).state;
  assert.equal(s.story.nodeId, 'q-b3-promise-start');
  assert.equal(s.story.flags.b3_door_closed, true);
  // An old save left waiting in Vell after chapter 17 departs for chapter 18 from the board.
  const old = strong(ready('b3-deep'));
  assert.ok(E.buildView(old).world.town);
  assert.equal(act(old, { type: 'depart', questId: 'b3-deep' }).state.story.nodeId, 'q-b3-deep-start');
});

test('the stay scenes are told below the stair, and the party goes on down after them', () => {
  for (const [id, decision, who, line, next] of [['b3-company', 'keep', 'orin', /on the vault floor before you go down/, 'b3-deep'], ['b3-deep', 'escort', 'maren', /notice what it takes/, 'b3-promise'], ['b3-promise', 'tell', 'nessa', /the last bit/, 'b3-firstbell']]) {
    let s = at(id, 'after');
    s.world.approvalWindow = { [who]: -3 };
    s.story.flags[`method:${id}`] = 'peace';
    s = act(s, { type: 'story-choice', choiceId: decision }).state;
    assert.equal(s.story.nodeId, `away-${who}-stay`, id);
    assert.match(opening(s), line, id);
    assert.doesNotMatch(opening(s), /before breakfast|after supper|on the step/, `${id}: not told as if in town`);
    // Saved and loaded in the middle of it, it still goes on down after.
    s = E.normalizeIncomingState(JSON.parse(JSON.stringify(s)));
    assert.equal(E.buildView(s).world.canReturn, false);
    s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
    assert.equal(s.story.nodeId, `q-${next}-start`, `${id}: then straight on`);
    assert.ok(s.party.some((m) => m.id === who));
  }
  // Orin's knot is gone after the stair: he puts the pack down instead of re-tying it.
  let o = at('b3-deep', 'after'); o.world.approvalWindow = { orin: -2 };
  o = act(o, { type: 'story-choice', choiceId: 'fennick' }).state;
  assert.match(opening(o), /He puts the pack down\. He does not untie it\./); assert.doesNotMatch(opening(o), /march knot/);
});

test('the thirty-one make chapter 19 harder, the lost day makes its peaceful way harder, and the choice in the circle scales chapter 20', () => {
  const Combat = require('../src/combat');
  assert.deepEqual(ENCOUNTERS['quest:b3-promise'].flagScale, { b3_thirtyone_came: 1.3 });
  assert.deepEqual(ENCOUNTERS['quest:b3-firstbell'].flagScale, { b3_three_left: 1.3, b3_three_told: 0.85 });
  // The thirty-one come only when the vault held and the rite is not law; the flag is set as the opening tells it.
  const came = act(ready('b3-promise', { flags: { b3_vault_held: true } }), { type: 'depart', questId: 'b3-promise' }).state;
  assert.equal(came.story.flags.b3_thirtyone_came, true); assert.match(opening(came), /thirty-one iron bells are there/);
  for (const flags of [{}, { b3_vault_held: true, b3_rite_law: true }]) assert.equal(act(ready('b3-promise', { flags }), { type: 'depart', questId: 'b3-promise' }).state.story.flags.b3_thirtyone_came, undefined);
  const hp = (s) => s.combat.actors.filter((a) => a.team === 'enemy').reduce((n, a) => n + a.maxHp, 0);
  assert.ok(hp(fightAt('b3-promise', { flags: { b3_thirtyone_came: true } })) > hp(fightAt('b3-promise')));
  assert.ok(hp(fightAt('b3-firstbell', { flags: { b3_three_left: true } })) > hp(fightAt('b3-firstbell', { flags: { b3_three_taken: true } })));
  assert.ok(hp(fightAt('b3-firstbell', { flags: { b3_three_told: true } })) < hp(fightAt('b3-firstbell', { flags: { b3_three_taken: true } })));
  assert.equal(Combat.flagScale({ story: { flags: { b3_three_told: true } } }, ENCOUNTERS['quest:b3-firstbell']), 0.85);
  // harderWith: the day lost taking the thirty-eight home.
  const check = (flags) => E.buildView(at('b3-promise', 'crisis', { flags })).scene.choices.find((c) => c.id === 'resolve').check;
  const plain = check({}), late = check({ b3_turned_escorted: true });
  assert.equal(late.dc, plain.dc + 2);
  assert.ok(late.reasons.some((r) => /day lost on the stair/.test(r))); assert.ok(!plain.reasons.some((r) => /day lost/.test(r)));
  const crisis = (flags) => dialogueText(liveLines(at('b3-promise', 'crisis', { flags }), QUESTS['b3-promise'].crisis.map(storyLine)));
  assert.match(crisis({ b3_turned_escorted: true }), /You lost a day on the stair/); assert.doesNotMatch(crisis({}), /lost a day/);
});

test('in the first promise each companion answers as their story left them; an absent companion sets neither flag', () => {
  const answers = (flags, party) => { const s = act(ready('b3-promise', { flags, party }), { type: 'depart', questId: 'b3-promise' }).state; return [s, ['orin', 'maren', 'nessa'].map((w) => (s.story.flags[`b3_${w}_gives`] ? 'gives' : s.story.flags[`b3_${w}_keeps`] ? 'keeps' : null))]; };
  assert.deepEqual(answers({})[1], ['keeps', 'keeps', 'keeps'], 'an old save: everyone keeps');
  assert.deepEqual(answers({ b3_mags_forgives: true, b3_seal_refused: true, b3_wren_cast: true })[1], ['gives', 'gives', 'gives']);
  assert.deepEqual(answers({ b3_seal_many: true })[1], ['keeps', 'gives', 'keeps']);
  const [sealed, seal] = answers({ b3_seal_taken: true });
  assert.equal(seal[1], 'keeps'); assert.match(opening(sealed), /^Maren: I'm the seal\./m);
  for (const who of ['orin', 'maren', 'nessa']) {
    const [s, got] = answers({ b3_mags_forgives: true, b3_seal_refused: true, b3_wren_cast: true }, ['orin', 'maren', 'nessa'].filter((w) => w !== who));
    const i = ['orin', 'maren', 'nessa'].indexOf(who);
    assert.equal(got[i], null, `${who} is away: neither flag`);
    assert.equal(s.story.flags[`b3_${who}_gives`], undefined); assert.equal(s.story.flags[`b3_${who}_keeps`], undefined);
    assert.doesNotMatch(opening(s), new RegExp(`Aster Vey: ${{ orin: 'Orin Stoneward', maren: 'Maren Vale', nessa: 'Nessa Reed' }[who]}\\. Would you give one\\?`));
  }
});

test('Hesk\'s way is offered only if the circle was not emptied by force, and the gift only after the old way', () => {
  const offered = (flags) => E.buildView(at('b3-firstbell', 'after', { flags })).scene.choices.filter((c) => !c.locked).map((c) => c.id);
  assert.deepEqual(offered({}), ['old', 'hesk', 'seal']);
  assert.deepEqual(offered({ b3_three_taken: true }), ['old', 'seal']);
  assert.equal(E.resolveAction(at('b3-firstbell', 'after', { flags: { b3_three_taken: true } }), { type: 'story-choice', choiceId: 'hesk' }, high).result.ok, false);
  const gift = (decision) => E.buildView(decide('b3-firstbell', decision)).scene.choices.filter((c) => !c.locked).map((c) => c.id);
  assert.deepEqual(gift('old'), ['firstnight', 'forge', 'bell', 'name']);
  for (const d of ['hesk', 'seal']) {
    assert.deepEqual(gift(d), ['on'], d);
    assert.equal(E.resolveAction(decide('b3-firstbell', d), { type: 'story-choice', choiceId: 'forge' }, high).result.ok, false, `${d}: nothing is given`);
  }
});

const framings = RAWS.firstbell.trialFraming.lines[0].oneOf;
test('the epilogue: each door comes home its own way, b3_done is set, and the hero arrives in Briarwatch with the book finished', () => {
  for (const [door, line] of [['b3_door_kept', /Pike asleep in a chair/], ['b3_door_closed', /founders' hatch/], [null, /^You come up\.$/m]]) {
    let s = decide('b3-firstbell', 'old', { flags: door ? { [door]: true } : {} });
    s = act(s, { type: 'story-choice', choiceId: 'forge' }).state;
    s = act(s, { type: 'story-choice', choiceId: 'up' }).state;
    assert.equal(s.story.nodeId, 'scene-firstbell-home');
    assert.equal(E.buildView(s).scene.location, "Dera's forge, Briarwatch, in early spring");
    const epilogue = opening(s);
    s = act(s, { type: 'story-choice', choiceId: 'home' }).state;
    assert.match(epilogue, line, door || 'neither');
    assert.equal(s.story.nodeId, 'town-briarwatch');
    assert.equal(s.story.flags.b3_done, true); assert.equal(s.story.flags.b3_gave_forge, true);
    assert.match(epilogue, /There is a trial waiting for the next thing you will be/);
    assert.match(epilogue, /^Dera: You gave this place\. My forge\./m, 'the epilogue ends on the framing line');
  }
  const s = through(decide('b3-firstbell', 'seal'));
  assert.equal(s.story.nodeId, 'town-briarwatch'); assert.equal(s.player.level, 40);
  const v = E.buildView(s);
  assert.equal(v.world.booksComplete, true); assert.equal(v.world.book, null); assert.equal(Book.chapter(s), null);
  assert.equal(Book.finished(s), true); assert.equal(s.story.flags[Book.FINISHED], true);
  assert.match(Book.ending(s), /all three books, The Bell Beneath Briarwatch, The Council of Small Voices and The Names in the Bronze\. From here the AI storyteller/);
  assert.equal(Book.SHELF.find((b) => b.n === 3).out, 0, 'Book Three is still hidden from players');
  // Every framing line fits the trial's brief.
  for (const l of framings) assert.ok(`Dera: ${l.text}`.length <= 400, l.text);
});

test('after b3_done the 3rd job trial opens with the epilogue\'s framing, read from the save, offline', () => {
  const end = (decision, gift) => { let s = decide('b3-firstbell', decision); s = through(s, gift ? { 'scene-firstbell-gift': gift } : {}); s.player.progression.specialization = 'guardian'; return s; };
  for (const [decision, gift, line] of [['old', 'firstnight', /You gave the first night/], ['old', 'bell', /You gave the bell/], ['old', 'name', /You gave a name/], ['hesk', null, /You gave nothing down there/], ['seal', null, /You kept all of it/]]) {
    const s = end(decision, gift);
    assert.equal(P.nextTrial(s.player), 'third');
    const first = D.writtenTrial(s).opening;
    assert.match(first, line, `${decision}/${gift}`); assert.match(first, /^Dera: .*Banners of every Guardian/);
    const view = E.buildView(s).world.director.trial;
    assert.match(view.framing, line); assert.equal(view.canRequest, true);
  }
  // Commissioned with a draft (as if from Claude, without calling it), the trial still opens with the framing.
  const s = end('old', 'forge');
  const before = hero('fighter', 40); before.player.progression.specialization = 'guardian';
  const draft = { ...D.writtenTrial(before), opening: 'A storm comes down off the pass the morning you set out.' };
  const out = D.commissionTrial(s, draft, []);
  assert.equal(out.ok, true);
  assert.match(out.outcomeText, /^Dera: You gave this place/);
  assert.match(s.director.quests[out.questId].opening, /^Dera: You gave this place.*A storm comes down off the pass/s);
  // Without the epilogue there is no framing, and the 4th job is never framed by it.
  assert.equal(E.buildView(before).world.director.trial.framing, null);
  assert.doesNotMatch(D.writtenTrial(before).opening, /Dera/);
  assert.equal(X.trialFraming(before), '');
  const later = end('seal'); later.player.progression.thirdJob = true;
  assert.doesNotMatch(D.writtenTrial(later, 'fourth').opening, /Dera/);
});

test('with the preview on, an agent playtest walks the hero to level 40 and stops at the 3rd job trial', () => {
  const { run } = require('./campaign-playtest');
  const r = run('fighter', 'standard', 301, 'prepared');
  assert.deepEqual(r.errors, []);
  assert.equal(r.complete, true); assert.equal(r.waiting, false);
  assert.equal(r.level, 40); assert.equal(r.booksFinished, true); assert.equal(r.trialOffered, true);
  assert.ok(r.completed['b3-firstbell']);
});

// Systems review, 22 November 2026.
test('a long AI trial opening keeps the framing and is cut at a sentence end, never mid-word', () => {
  let s = decide('b3-firstbell', 'old'); s = through(s, { 'scene-firstbell-gift': 'forge' }); s.player.progression.specialization = 'guardian';
  const before = hero('fighter', 40); before.player.progression.specialization = 'guardian';
  const long = Array.from({ length: 40 }, (_, i) => `The road bends east at marker ${i}.`).join(' ');
  const out = D.commissionTrial(s, { ...D.writtenTrial(before), opening: long }, []);
  assert.equal(out.ok, true); assert.equal(out.written, false);
  const opening = s.director.quests[out.questId].opening;
  assert.match(opening, /^Dera: You gave this place/);
  assert.ok(opening.length <= 900, `${opening.length}`);
  assert.match(opening, /marker \d+\.$/, 'ends on a whole sentence');
});

test('below the stair, a stay scene whose next chapter can no longer be played goes to town instead of stopping', () => {
  let s = at('b3-company', 'after');
  s.world.approvalWindow = { orin: -3 }; s.story.flags['method:b3-company'] = 'peace';
  s = act(s, { type: 'story-choice', choiceId: 'keep' }).state;
  assert.equal(s.story.nodeId, 'away-orin-stay');
  Book.grant(s, Book.FREE_BOOKS); // the subscription lapses in the middle of the scene
  s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
  assert.equal(s.story.nodeId, `town-${s.world.townId}`);
  assert.equal(s.world.goingOn, undefined);
});

test('below the stair the retreat order says it falls back to the ledge; above it, to town', () => {
  const retreat = (id) => { const s = act(at(id, 'crisis'), { type: 'story-choice', choiceId: 'confront' }).state; return E.buildView(s).combat.actions.find((a) => a.id === 'retreat'); };
  assert.equal(retreat('b3-deep').name, 'Fall back to the ledge');
  assert.match(retreat('b3-deep').description, /last safe ledge/);
  assert.equal(retreat('b3-winter').name, 'Retreat to town');
});

test('after three defeats in the same chapter below the stair, the ledge also offers the climb back up to town, and the chapter resumes from there', () => {
  let s = fightAt('b3-deep');
  for (let i = 0; i < 3; i++) {
    const c = E.buildView(s).scene.choices.find((x) => x.id === 'climb');
    if (i) assert.ok(!c || c.locked, `closed after ${i} defeat(s)`);
    s = act(s, { type: 'combat', actionId: 'retreat' }).state;
    if (i < 2) s = act(s, { type: 'story-choice', choiceId: 'down' }).state;
  }
  assert.equal(s.story.nodeId, 'q-b3-company-ledge');
  const climb = E.buildView(s).scene.choices.find((x) => x.id === 'climb');
  assert.ok(climb && !climb.locked);
  s = act(s, { type: 'story-choice', choiceId: 'climb' }).state;
  assert.equal(s.story.nodeId, `town-${s.world.townId}`);
  assert.equal(s.world.activeQuest, 'b3-deep'); assert.equal(s.world.pendingBattle, 'quest:b3-deep');
  assert.ok(E.buildView(s).world.town);
  s = act(s, { type: 'depart', questId: 'b3-deep' }).state;
  assert.equal(s.combat?.encounterId, 'quest:b3-deep', 'departing again goes back down to the same fight');
});
