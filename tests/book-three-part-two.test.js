'use strict';
// Book Three is hidden from players until it is released (src/book.js, "out").
// These tests read it the way agent playtests do. node --test runs each file
// in its own process, so this reaches no other test file.
process.env.BRIARWATCH_PREVIEW_BOOKS = '1';
// Book Three, Part Two, "The Stair", chapters 11 to 14
// (docs/book-three/DESIGN-PART-TWO.md): the price of a yes, Wren's bell, the
// order and the town that said no, their scenes and side jobs, and the engine
// work they need (oneOf line groups, line setFlag, walkouts in Part Two).
//
// Part One's chapters 7 to 10 are still being written. These tests start
// each chapter from a scripted state with every chapter before it, written or
// still to come, marked done, so they hold when b3-vault, b3-greatbell and
// b3-paid are added.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book'), Away = require('../src/away');
const { STORY_NODES, ENEMIES, ENCOUNTERS, COMPANIONS, CLUES } = require('../src/content');
const X = require('../src/expansion');
const { QUESTS, SCENES, SIDE_JOBS, AWAITED, liveLines, playLines, storyLine, dialogueText } = X;
const RAWQ = require('../src/data/book-three-part-two/quests.json'), RAWS = require('../src/data/book-three-part-two/scenes.json'), RAWJ = require('../src/data/book-three-part-two/side-jobs.json');
const high = () => .999999, low = () => 0;

const IDS = ['b3-price', 'b3-wren', 'b3-order', 'b3-ashford'];
const PART_TWO = Object.values(QUESTS).filter((q) => q.book === 3 && q.part === 2);
const PART_ONE_IDS = ['b3-letter', 'b3-rite', 'b3-pass', 'b3-saltwick', 'b3-vell', 'b3-witness', 'b3-home', 'b3-vault', 'b3-greatbell', 'b3-paid'];
const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];

function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
// A hero in the town where a chapter starts, with every chapter before it
// done, including Part One's chapters that are not written yet.
function ready(id, { cls = 'fighter', party = ['orin', 'maren', 'nessa'], flags = {}, town } = {}) {
  const q = QUESTS[id];
  let s = hero(cls, q.level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  for (const awaited of AWAITED) s.world.completed[awaited] = { xp: 0, gold: 0 };
  s.world.unlockedTowns = [...ALL_TOWNS]; s.world.townId = town || q.town; s.story.nodeId = `town-${town || q.town}`;
  Object.assign(s.story.flags, { b3_partone_done: true }, flags); W.init(s);
  if (party.includes('nessa')) s = act(s, { type: 'recruit' }).state;
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
test('Part Two follows Part One: four chapters, one level each, in their own files', () => {
  assert.deepEqual(PART_TWO.map((q) => q.id), IDS);
  assert.deepEqual(PART_TWO.map((q) => [q.id, q.unlock, q.town, q.nextTown || q.town, q.level, q.xp, q.book, q.part]), [
    ['b3-price', 'b3-paid', 'merrowgate', 'cinderfold', 30, 9250, 3, 2],
    ['b3-wren', 'b3-price', 'cinderfold', 'saltwick', 31, 9500, 3, 2],
    ['b3-order', 'b3-wren', 'saltwick', 'ashford', 32, 9750, 3, 2],
    ['b3-ashford', 'b3-order', 'ashford', 'highpass', 33, 10000, 3, 2]
  ]);
  for (const q of PART_TWO) {
    assert.equal(q.xp, P.levelBand(q.level), `${q.id} pays exactly one level`);
    assert.ok(RAWQ[q.id] && !require('../src/data/quests.json')._awaits, `${q.id} is written in the Part Two file`);
    for (const key of ['opening', 'crisis', 'after', 'approach']) assert.ok(Array.isArray(q[key]) && q[key].length, `${q.id}.${key}`);
    assert.ok(q.talks.length >= 3 && q.decisions.length === 3, q.id);
    assert.ok(STORY_NODES[`q-${q.id}-start`] && STORY_NODES[`q-${q.id}-after`], q.id);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
    assert.equal(Book.bookOf(q.id).title, 'The Names in the Bronze');
  }
  assert.deepEqual(QUESTS['b3-wren'].needs, ['nessa']); assert.deepEqual(QUESTS['b3-order'].needs, ['orin']);
  // Story order: after every Part One chapter, written now or later.
  const order = Book.CHAPTERS.map((q) => q.id);
  for (const id of PART_ONE_IDS.filter((x) => QUESTS[x])) assert.ok(order.indexOf(id) < order.indexOf('b3-price'), `${id} comes before b3-price`);
  assert.deepEqual(order.slice(-4), IDS);
  // The chapters it follows that are not written yet are Part One's, and only those.
  for (const id of AWAITED) { assert.ok(PART_ONE_IDS.includes(id) && !QUESTS[id], id); }
  // Book Three stays hidden from players; the preview shows it waiting after chapter 14.
  assert.equal(Book.SHELF.find((b) => b.n === 3).out, 0);
  assert.equal(Book.SHELF.find((b) => b.n === 3).writing, true, 'Chapters 15 to 20 are still to come.');
});

test('every consumer sees one set of tables: the Part Two files are merged into quests, scenes and side jobs', () => {
  for (const [file, table] of [['quests.json', QUESTS], ['scenes.json', SCENES], ['side-jobs.json', SIDE_JOBS]]) {
    const raw = require(`../src/data/${file}`), part = require(`../src/data/book-three-part-two/${file}`);
    for (const id of Object.keys(part).filter((k) => !k.startsWith('_'))) { assert.ok(table[id], `${file} ${id}`); assert.equal(raw[id], table[id], `${file}: whoever reads the table sees ${id}`); }
  }
  assert.ok(STORY_NODES['scene-price-camp-fish'] && STORY_NODES['job-debtbook-row'] && ENCOUNTERS['quest:b3-ashford']);
  assert.ok(!QUESTS._awaits && !QUESTS._note && !SCENES._awaits);
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
  'b3-ashford': { defend: ['b3_ashford_defended', {}], children: ['b3_ashford_children', { maren: -1 }], cast: ['b3_ashford_cast', { nessa: -1, maren: -1 }] }
};

test('every chapter plays to its end peacefully, by every decision, levels the hero by one, and its scene leads to the next town', () => {
  for (const id of IDS) for (const [decision, [flag, approval]] of Object.entries(EXPECT[id])) {
    const r = playPeaceful(id, decision);
    const s = r.state;
    assert.ok(s.world.completed[id], `${id}/${decision}`);
    assert.equal(s.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(EXPECT[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(s.story.flags[other], undefined, `${id}/${decision} not ${other}`);
    assert.equal(s.story.flags[`method:${id}`], 'peace');
    assert.equal(s.player.level, QUESTS[id].level + 1, `${id}: after chapter N the hero is level 20+N`);
    assert.equal(s.player.xp, P.XP_NEXT[QUESTS[id].level - 1] + QUESTS[id].xp, `${id}: exactly the chapter's XP`);
    const scene = sceneOf(id);
    assert.equal(s.story.nodeId, `scene-${scene.id}-${scene.start}`, `${id}: its scene follows`);
    assert.deepEqual(QUESTS[id].decisions.find((d) => d.id === decision).approval || {}, approval, `${id}/${decision} approval`);
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
  for (const [id, fought] of [['b3-price', /carried out of the rope-walk/], ['b3-wren', /grey to the elbow/], ['b3-order', /went off the planks/], ['b3-ashford', /overturned, where the fight was/]]) {
    const failed = act(at(id, 'crisis'), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    let s = act(at(id, 'crisis'), { type: 'story-choice', choiceId: 'confront' }).state;
    assert.ok(s.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    assert.match(opening(s), fought, id);
    assert.doesNotMatch(opening(s), /Nobody is hurt at the rope-walk|Nobody is lost in the pit|Nobody falls\.|exactly to the line/, id);
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
  for (const [decision, line] of [['defend', /I've given it up again/], ['children', /My grandson's at Highpass/], ['cast', /Ansel Wick said yes/]]) {
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
    'b3_rite_law', 'b3_rite_destroyed', 'b3_rite_vell', 'b3_saltwick_moved', 'b3_bell_evacuate', 'b3_partone_done']);
  const ENGINE = /^(method|prepared|approach|partial|job|away|walked):/;
  const setIn = (content) => { const f = new Set(); JSON.stringify(content, (k, v) => { if (k === 'setFlags' && v) Object.keys(v).forEach((x) => f.add(x)); if (k === 'setFlag') Object.keys(typeof v === 'string' ? { [v]: 1 } : v).forEach((x) => f.add(x)); return v; }); for (const d of content.decisions || []) f.add(d.flag); return f; };
  const byChapter = IDS.map((id) => { const f = setIn(RAWQ[id]); const sc = sceneOf(id); if (sc) for (const x of setIn(RAWS[sc.id])) f.add(x); return f; });
  const setBefore = (flag, upTo) => byChapter.slice(0, upTo).some((f) => f.has(flag));
  const check = (owner, content, upTo) => {
    for (const l of everyLine(content)) {
      for (const key of Object.keys(l.when)) assert.ok(KNOWN.has(key), `${owner}: ${key}`);
      for (const key of ['party', 'absent']) if (l.when[key]) assert.ok(COMPANIONS[l.when[key]], owner);
      for (const flag of [l.when.flag, l.when.notFlag, ...(l.when.anyFlag || []), ...(l.when.noneFlag || [])].filter(Boolean)) {
        if (ENGINE.test(flag) && !/^job:(minersvote|library)/.test(flag)) continue;
        assert.ok(EARLIER.has(flag) || setBefore(flag, upTo), `${owner}: ${flag} is read before it can be set`);
      }
    }
  };
  IDS.forEach((id, i) => check(id, RAWQ[id], i));
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
      for (let i = 0; i < 4 && !E.buildView(r).world.town; i++) { assert.doesNotMatch(opening(r), /^(Orin|Maren|Nessa):/m, `${id}/${d.id} ${r.story.nodeId}`); r = act(r, { type: 'story-choice', choiceId: E.buildView(r).scene.choices.find((c) => !c.locked).id }).state; }
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
  assert.match(text, /Cass Ord/); assert.match(text, /Captain Odell Varn|Odell Varn/); assert.match(text, /Hollis Brede/); assert.match(text, /Coll Garrow/);
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
  let last = ready('b3-ashford');
  last.world.approvalWindow = { maren: -2 };
  last = finish(last, 'b3-ashford', 'defend');
  assert.equal(last.story.nodeId, 'town-highpass');
  assert.ok(last.party.some((m) => m.id === 'maren'));
  assert.equal(Book.chapter(last).id, 'to-be-continued', 'The hero waits for chapter 15.');
  assert.equal(Away.LIMIT, 2);
});

// Side jobs.
const JOB_IDS = ['debtbook', 'mould', 'lamps'];
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
test('the Debt Book, the Tenth Mould and Lamps for the Roofs open in their windows, and only then', () => {
  assert.deepEqual(JOB_IDS.map((id) => [id, SIDE_JOBS[id].town, SIDE_JOBS[id].from, SIDE_JOBS[id].until]), [
    ['debtbook', 'merrowgate', 'b3-paid', 'b3-wren'], ['mould', 'cinderfold', 'b3-price', 'b3-ashford'], ['lamps', 'saltwick', 'b3-wren', 'b3-ashford']]);
  const offered = (id, chapter) => { const job = SIDE_JOBS[id]; const s = ready(chapter, { town: job.town }); return E.buildView(s).world.sideJobs.some((j) => j.id === id); };
  assert.ok(offered('debtbook', 'b3-price') && offered('debtbook', 'b3-wren') && !offered('debtbook', 'b3-order'));
  assert.ok(!offered('mould', 'b3-price') && offered('mould', 'b3-wren') && offered('mould', 'b3-ashford'));
  assert.ok(!offered('lamps', 'b3-wren') && offered('lamps', 'b3-order') && offered('lamps', 'b3-ashford'));
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
});

test('the main story never assumes a Part Two job was done', () => {
  for (const id of IDS) for (const l of everyLine(RAWQ[id])) if (/Ida Ferris|Coppin|Corry Marl|Ivo Sefton|tenth mould stands|debt book/i.test(l.text || l.narrate)) assert.ok(l.when.flag?.startsWith('job:'), `${id}: ${(l.text || l.narrate).slice(0, 60)}`);
  for (const [id, s] of Object.entries(RAWS).filter(([k]) => !k.startsWith('_'))) for (const l of everyLine(s)) assert.ok(!/Ida Ferris|Coppin|Corry Marl|Ivo Sefton/.test(l.text || l.narrate) || l.when.flag?.startsWith('job:'), id);
});
