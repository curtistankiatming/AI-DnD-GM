'use strict';
// Book Four held at Part One (BRIARWATCH_PREVIEW_PARTS=4:1), as players will
// first have it, with fixture chapters standing in for the ones not written
// yet (tests/fixtures/book-four.js). node --test runs each file in its own
// process, so these settings reach no other file.
//
// Build step 3 of docs/book-four/DESIGN.md: Part One, chapters 1 to 3 (the
// walker on the north road, the two accounts, the song about you), their
// camp scenes, and the side jobs Rue's Doors and The Third Verse.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: '4:1' });
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { STORY_NODES, ENEMIES, ENCOUNTERS, COMPANIONS } = require('../src/content');
const { QUESTS, SCENES, SIDE_JOBS, outcomeForRoller } = require('../src/expansion');
const high = () => .999999, low = () => 0;

const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
function ready(level, upTo) {
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'guardian' });
  s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const q of Object.values(QUESTS)) { if (q.sideJob) continue; s.world.completed[q.id] = { xp: 0, gold: 0 }; if (q.id === upTo) break; }
  s.world.unlockedTowns = [...ALL_TOWNS]; s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true }); W.init(s);
  const r = E.resolveAction(s, { type: 'recruit' }, () => 0.9); assert.equal(r.result.ok, true, r.result.error);
  return r.state;
}

test('with Part One out, Book Four plays to chapter 10 and waits at "to be continued" at level 50, naming Part Two', () => {
  const four = Book.SHELF.find((b) => b.n === 4);
  assert.equal(four.open, 1); assert.equal(four.writing, true); assert.equal(four.last, 'b4-peaks');
  assert.ok(!Book.CHAPTERS.some((q) => q.book === 4 && q.part > 1));
  const s = ready(50, 'b4-peaks'); s.player.progression.thirdJob = true;
  const c = Book.chapter(s);
  assert.equal(c.id, 'to-be-continued'); assert.equal(c.level, 50); assert.equal(Book.finished(s), false);
  assert.equal(Book.playable(s, 'b4-lantry'), false);
  assert.equal(Book.bookEnd('b4-peaks', s), 'To be continued. You have finished The North Road, Part One of Book Four, The Long Tally. Part Two, The Wold, is being written; its chapters will appear on the expedition board when it comes out. Until then, bounties and side jobs stay open, and your hero, party and choices stay saved.');
});

test('the scripted player takes the 3rd job trial, plays Part One, and waits at the end of it', () => {
  const { run } = require('./campaign-playtest');
  const r = run('fighter', 'standard', 301, 'prepared', false, ready(40, 'b3-firstbell'));
  assert.deepEqual(r.errors, []);
  assert.equal(r.waiting, true); assert.equal(r.thirdJob, true); assert.equal(r.trials, 1);
  assert.ok(r.completed['b4-peaks'] && !r.completed['b4-lantry']);
  assert.equal(r.level, 50);
});

// ---------------------------------------------------------------------------
// Chapters 1 to 3, as written.
const IDS = ['b4-walker', 'b4-records', 'b4-ballad'];
const RAWQ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/quests.json'), 'utf8'));
const RAWS = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/scenes.json'), 'utf8'));
const RAWJ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/side-jobs.json'), 'utf8'));
const entries = (raw) => Object.entries(raw).filter(([k]) => !k.startsWith('_'));
const sceneOf = (id) => Object.values(SCENES).find((x) => x?.after === id);
const JOB_IDS = ['rue-doors', 'third-verse'];

function hero(level) { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true }); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
// The Book Three save every Book Four test starts from: the old way, the forge given.
const BOOK_THREE = { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true };
// A hero in the town where a chapter starts, with every chapter before it done.
function at(id, { party = ['orin', 'maren', 'nessa'], flags = {}, town, phase } = {}) {
  const q = QUESTS[id];
  let s = hero(q.level); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (!other.sideJob) s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...ALL_TOWNS]; s.world.townId = town || q.town; s.story.nodeId = `town-${town || q.town}`;
  Object.assign(s.story.flags, BOOK_THREE, flags); W.init(s);
  if (party.includes('nessa')) s = act(s, { type: 'recruit' }).state;
  s.party = s.party.filter((m) => party.includes(m.id));
  if (phase) { s.story.nodeId = `q-${id}-${phase}`; s.world.activeQuest = id; s.world.onExpedition = true; }
  return s;
}
const told = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');
const opening = (s) => E.buildView(s).scene.opening;
const bond = (s, id) => s.party.find((m) => m.id === id)?.bond;
function strong(s) { s.player.inspirationPrepared = true; for (const k of ['str', 'dex', 'int', 'wis', 'cha']) s.player.abilities[k] = 30; return s; }
function choose(s, id) { return act(s, { type: 'story-choice', choiceId: id }).state; }
function toTown(s) { for (let i = 0; i < 8 && !E.buildView(s).world.town; i++) s = choose(s, E.buildView(s).scene.choices.find((c) => !c.locked).id); return s; }
// Investigate, the careful route and the peaceful way (sure rolls), then the decision.
function playPeaceful(id, decision, opts = {}) {
  let s = strong(at(id, opts));
  s = act(s, { type: 'depart', questId: id }).state;
  assert.equal(s.story.nodeId, `q-${id}-start`);
  for (const t of E.buildView(s).scene.choices.filter((c) => c.id.startsWith('talk-') && !c.locked)) s = choose(s, t.id);
  s = choose(s, 'investigate'); s = choose(s, 'advance'); s = choose(s, 'careful');
  assert.equal(s.story.nodeId, `q-${id}-crisis`);
  s = choose(strong(s), 'resolve');
  assert.equal(s.story.nodeId, `q-${id}-after`, `${id}: the peaceful way reaches the ending`);
  return choose(s, decision);
}
function winFight(s) {
  for (const a of s.combat.actors) if (a.team === 'enemy') a.hp = 0;
  const me = s.combat.actors.find((a) => a.id === 'player');
  s.combat.turnIndex = s.combat.actors.indexOf(me); s.combat.awaitingPlayer = true;
  return act(s, { type: 'combat', actionId: 'end-turn' }).state;
}
const decide = (id, decision, opts = {}) => choose(at(id, { ...opts, phase: 'after', flags: { [`method:${id}`]: 'peace', ...(opts.flags || {}) } }), decision);
const departed = (id, opts) => act(at(id, opts), { type: 'depart', questId: id }).state;
const talk = (id, talkId, opts) => told(choose(departed(id, opts), `talk-${talkId}`));
const talkIds = (id, opts) => E.buildView(departed(id, opts)).scene.choices.filter((c) => c.id.startsWith('talk-') && !c.locked).map((c) => c.id.slice(5));

const EXPECT = {
  'b4-walker': { council: ['b4_rue_council', {}], party: ['b4_rue_party', {}], watch: ['b4_rue_watch', {}] },
  'b4-records': { publish: ['b4_truth_published', {}], council: ['b4_truth_council', {}], ailith: ['b4_truth_ailith', {}] },
  'b4-ballad': { rings: ['b4_bw_rings', {}], quiet: ['b4_bw_quiet', { nessa: 1, orin: -1 }], pim: ['b4_bw_pim', {}] }
};

test('chapters 1 to 3 are written in Book Four\'s own file, in story order, each paying exactly one level and 20 x level + 40 gold', () => {
  assert.deepEqual(FX.WRITTEN, IDS);
  assert.deepEqual(IDS.map((id) => { const q = QUESTS[id]; return [q.id, q.book, q.part, q.level, q.unlock, q.town, q.nextTown]; }), [
    ['b4-walker', 4, 1, 40, 'b3-firstbell', 'highpass', 'ashford'],
    ['b4-records', 4, 1, 41, 'b4-walker', 'ashford', 'briarwatch'],
    ['b4-ballad', 4, 1, 42, 'b4-records', 'briarwatch', 'merrowgate']
  ]);
  for (const id of IDS) {
    const q = QUESTS[id];
    assert.equal(q.name, RAWQ[id].name, `${id} is read from src/data/book-four/quests.json`);
    assert.equal(q.xp, P.levelBand(q.level), `${id} pays exactly one level`);
    assert.equal(q.gold, 20 * q.level + 40, `${id} gold`);
    assert.equal(Book.bookOf(id).title, 'The Long Tally');
    for (const key of ['opening', 'approach', 'crisis', 'after']) assert.ok(Array.isArray(q[key]) && q[key].length, `${id}.${key}`);
    assert.ok(q.talks.length >= 4, `${id} talks`);
    assert.equal(q.decisions.length, 3, `${id}: one decision, three answers`);
    assert.ok(q.told?.ballad && q.told?.tally, `${id}: the Telling has one line for the chapter`);
    assert.ok(STORY_NODES[`q-${id}-start`] && STORY_NODES[`q-${id}-after`], id);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
    assert.equal(ENCOUNTERS[`quest:${id}`].victoryNode, `q-${id}-after`);
    assert.ok(q.investigate && q.route && q.peaceful && q.objective, id);
  }
  // Chapter 1 opens when Book Three's last chapter is done, and needs the 3rd job; no floor.
  assert.equal(QUESTS['b4-walker'].requiresJob, 3); assert.equal(QUESTS['b4-walker'].levelFloor, undefined);
  for (const id of ['b4-records', 'b4-ballad']) assert.equal(QUESTS[id].requiresJob, undefined, id);
  for (const id of IDS) assert.equal(QUESTS[id].needs, undefined, `${id} is nobody's own chapter`);
  // Book Four stays hidden from players.
  assert.equal(Book.SHELF.find((b) => b.n === 4).out, 0);
});

test('each chapter has one camp scene: an empty cast, nodes chained by next, and the camp beat last', () => {
  assert.deepEqual(entries(RAWS).map(([k, v]) => [k, v.after]), [['walker-camp', 'b4-walker'], ['records-camp', 'b4-records'], ['ballad-camp', 'b4-ballad']]);
  for (const id of IDS) {
    const scenes = Object.values(SCENES).filter((x) => x?.after === id);
    assert.equal(scenes.length, 1, `${id} has at most one scene`);
    const [scene] = scenes;
    assert.deepEqual(scene.cast, [], `${scene.id}: empty cast`);
    // Walk the chain from the start: every node is reached by next, and the last node's choices end the scene.
    const seen = [];
    for (let key = scene.start; key; ) {
      assert.ok(scene.nodes[key] && !seen.includes(key), `${scene.id}: ${key}`); seen.push(key);
      const nexts = [...new Set(scene.nodes[key].choices.map((c) => c.next).filter(Boolean))];
      assert.ok(nexts.length <= 1, `${scene.id}: one chain`);
      if (!nexts.length) assert.ok(scene.nodes[key].choices.every((c) => !c.next), scene.id);
      key = nexts[0];
    }
    assert.deepEqual(seen.sort(), Object.keys(scene.nodes).sort(), `${scene.id}: every node is on the chain`);
    const last = scene.nodes[seen.at(-1)];
    assert.equal(last.objective, 'Camp.', `${scene.id}: the camp beat is the last node`);
    for (const c of Object.values(scene.nodes).flatMap((n) => n.choices)) assert.ok(!c.approval && !c.setFlags, `${scene.id}/${c.id}: a camp choice changes nothing`);
  }
});

test('every chapter plays to its end peacefully, by every decision, sets only its flag, levels the hero by one, and its scene leads to the next town', () => {
  for (const id of IDS) for (const [decision, [flag]] of Object.entries(EXPECT[id])) {
    const s = playPeaceful(id, decision);
    assert.ok(s.world.completed[id], `${id}/${decision}`);
    assert.equal(s.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(EXPECT[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(s.story.flags[other], undefined, `${id}/${decision} not ${other}`);
    assert.equal(s.story.flags[`method:${id}`], 'peace');
    assert.equal(s.player.level, QUESTS[id].level + 1, `${id}: after chapter N the hero is level 40 + N`);
    assert.equal(s.player.xp, P.XP_NEXT[QUESTS[id].level - 1] + QUESTS[id].xp, `${id}: exactly the chapter's XP`);
    const scene = sceneOf(id);
    assert.equal(s.story.nodeId, `scene-${scene.id}-${scene.start}`, `${id}: its scene follows`);
    assert.equal(toTown(s).story.nodeId, `town-${QUESTS[id].nextTown}`, `${id}/${decision}`);
  }
});

test('a decision changes exactly the approval the design gives it: the quiet night pleases Nessa and costs Orin', () => {
  for (const [id, decisions] of Object.entries(EXPECT)) for (const [decision, [, approval]] of Object.entries(decisions)) {
    assert.deepEqual(QUESTS[id].decisions.find((d) => d.id === decision).approval || {}, approval, `${id}/${decision}`);
    for (const who of ['orin', 'maren', 'nessa']) {
      const s = at(id, { phase: 'after', flags: { [`method:${id}`]: 'peace' } });
      for (const m of s.party) m.bond = 2;
      assert.equal(bond(choose(s, decision), who), 2 + (approval[who] || 0), `${id}/${decision}/${who}`);
    }
  }
});

test('each crisis can be fought instead, and winning reaches the same ending told the way it was won', () => {
  for (const [id, fought] of [['b4-walker', /three houses in it stand empty/], ['b4-records', /heads bound up/], ['b4-ballad', /grey at the Briarwood end, where the fight was/]]) {
    const failed = act(at(id, { phase: 'crisis' }), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    let s = choose(at(id, { phase: 'crisis' }), 'confront');
    assert.ok(s.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    assert.match(opening(s), fought, id);
    assert.doesNotMatch(opening(s), /Nobody is hurt|standing, every house in it|Every pot in Briarwatch is dented/, id);
    // The scene is told for the fight too.
    s = choose(s, QUESTS[id].decisions[0].id);
    assert.ok(s.story.nodeId.startsWith('scene-'), id);
  }
  // The clue makes the peaceful way's opening line: told only when the chapter's lead was found.
  for (const id of IDS) {
    const lines = QUESTS[id].peaceful.success.filter((l) => l.when?.flag === `prepared:${id}`);
    assert.equal(lines.length, 1, `${id}: a line for the prepared peaceful way`);
  }
});

// Lines, gates and flags.
const COMPANION_NAMES = { orin: /\b(Orin|Stoneward)\b/, maren: /\bMaren\b|\bSister\b(?! Ilse)/, nessa: /\b(Nessa|Reed|Biscuit)\b/ };
function everyLine(value, out = [], group = {}) {
  if (Array.isArray(value)) value.forEach((v) => everyLine(v, out, group));
  else if (value && typeof value === 'object') {
    if (value.oneOf) everyLine(value.oneOf, out, { ...group, ...(value.when || {}) });
    else if (value.say || value.narrate) out.push({ ...value, when: { ...group, ...(value.when || {}) } });
    else { const g = value.requires?.companion ? { ...group, party: value.requires.companion } : group; for (const v of Object.values(value)) everyLine(v, out, g); }
  }
  return out;
}
const CONTENT = [...entries(RAWQ), ...entries(RAWS), ...entries(RAWJ)];

test('every line that names or answers Orin, Maren or Nessa is told only with them there, or is written for when they are away', () => {
  let gated = 0;
  for (const [owner, content] of CONTENT) for (const l of everyLine(content)) for (const [who, name] of Object.entries(COMPANION_NAMES)) {
    if (l.say === who) { gated++; continue; }
    if (!name.test(l.text || l.narrate)) continue;
    assert.ok(l.when.party === who || l.when.absent === who, `${owner}: "${(l.text || l.narrate).slice(0, 70)}" names ${who} without a party gate`);
    gated++;
  }
  assert.ok(gated > 40, `${gated} companion lines`);
});

test('with no companions, and with each one away, every chapter, scene and job is told whole, with no empty line, no token and no absent companion', () => {
  const parties = [[], ['maren', 'nessa'], ['orin', 'nessa'], ['orin', 'maren'], ['orin', 'maren', 'nessa']];
  const clean = (text, party, where) => {
    assert.ok(text && text.trim().length, `${where}: something is told`);
    assert.doesNotMatch(text, /\n\s*\n|undefined|null|[{}@]/, `${where}: no empty line or token`);
    for (const who of ['orin', 'maren', 'nessa']) if (!party.includes(who)) assert.doesNotMatch(text, COMPANION_NAMES[who], `${where}: ${who} is away`);
  };
  for (const id of IDS) for (const party of parties) {
    let s = departed(id, { party });
    clean(opening(s), party, `${id} opening [${party}]`);
    for (const t of talkIds(id, { party })) clean(talk(id, t, { party }), party, `${id}/${t} [${party}]`);
    for (const phase of ['approach', 'crisis']) clean(opening(at(id, { party, phase })), party, `${id} ${phase} [${party}]`);
    for (const d of QUESTS[id].decisions) {
      const a = at(id, { party, phase: 'after', flags: { [`method:${id}`]: 'peace' } });
      clean(opening(a), party, `${id} after [${party}]`);
      let r = choose(a, d.id);
      clean(told(r), party, `${id}/${d.id} [${party}]`);
      for (let i = 0; i < 4 && r.story.nodeId.startsWith('scene-'); i++) { clean(opening(r), party, `${r.story.nodeId} [${party}]`); const c = E.buildView(r).scene.choices.find((x) => !x.locked); r = choose(r, c.id); }
      assert.equal(r.story.nodeId, `town-${QUESTS[id].nextTown}`);
    }
  }
});

test('every check result reads for whoever rolls it: the hero, or Orin, Maren or Nessa', () => {
  const actors = [{ id: 'player' }, { id: 'orin' }, { id: 'maren' }, { id: 'nessa' }];
  let tokens = 0;
  for (const node of Object.values(STORY_NODES).filter((n) => IDS.includes(n.questId) || JOB_IDS.includes(n.sideJob))) for (const c of node.choices || []) {
    if (!c.check) continue;
    for (const key of ['success', 'failure']) {
      if (/\{(You|you)/.test(c[key].text || '')) tokens++;
      for (const actor of actors) { const o = outcomeForRoller(c[key], actor); assert.doesNotMatch(o.text || '', /[{}@]/, `${node.id} ${c.id} ${key} ${actor.id}`); }
    }
  }
  assert.ok(tokens >= 10, 'The results are written with the roller tokens.');
  assert.match(outcomeForRoller(STORY_NODES['q-b4-walker-crisis'].choices.find((c) => c.id === 'resolve').success, { id: 'orin' }).text, /Orin steps into the gateway/);
});

test('no written line is gated on the negation of the flag it sets itself', () => {
  const sets = (l) => Object.keys(typeof l.setFlag === 'string' ? { [l.setFlag]: 1 } : l.setFlag || {});
  const check = (l, outer = []) => {
    const own = [...outer, ...sets(l)], w = l.when || {};
    for (const f of own) assert.ok(w.notFlag !== f && !(w.noneFlag || []).includes(f), `${l.narrate || l.text}: notFlag ${f}`);
    for (const alt of l.oneOf || []) check(alt, own);
  };
  for (const raw of [RAWQ, RAWS, RAWJ]) JSON.stringify(raw, (k, v) => { if (Array.isArray(v)) for (const l of v) if (l && typeof l === 'object' && (l.narrate || l.say || l.oneOf)) check(l); return v; });
});

// Flags set in Books One to Three (and the side jobs' job: flags), read by Book Four.
function flagsSetIn(raw) {
  const f = new Set();
  JSON.stringify(raw, (k, v) => {
    if (k === 'setFlags' && v && typeof v === 'object') Object.keys(v).forEach((x) => f.add(x));
    if (k === 'setFlag' && v) Object.keys(typeof v === 'string' ? { [v]: 1 } : v).forEach((x) => f.add(x));
    if (v && typeof v === 'object' && Array.isArray(v.decisions)) for (const d of v.decisions) if (d.flag) f.add(d.flag);
    return v;
  });
  return f;
}
const DATA = path.join(__dirname, '../src/data');
// Read from the files, not from require: src/expansion.js merges Book Four into the tables it requires.
const file = (f) => JSON.parse(fs.readFileSync(path.join(DATA, `${f}.json`), 'utf8'));
const OLDER = ['quests', 'scenes', 'side-jobs', 'story-nodes', 'away', 'book-three-part-two/quests', 'book-three-part-two/scenes', 'book-three-part-two/side-jobs'].map(file);
const EARLIER = new Set([...OLDER.flatMap((raw) => [...flagsSetIn(raw)]), 'second_oath']);
const readsIn = (content) => { const f = new Set(); for (const l of everyLine(content)) for (const x of [l.when.flag, l.when.notFlag, ...(l.when.anyFlag || []), ...(l.when.noneFlag || [])]) if (x) f.add(x); JSON.stringify(content, (k, v) => { if (k === 'requires' && v) for (const x of [...(v.flagsAny || []), ...(v.flagsAll || []), ...(v.flagsNone || [])]) f.add(x); return v; }); return f; };

test('every Book Four flag set is read: each chapter\'s answers change the lines of the chapters, scenes and jobs after it', () => {
  const set = new Set(IDS.flatMap((id) => [...flagsSetIn({ x: RAWQ[id] })]));
  assert.deepEqual([...set].sort(), ['b4_bw_pim', 'b4_bw_quiet', 'b4_bw_rings', 'b4_rue_council', 'b4_rue_party', 'b4_rue_watch', 'b4_truth_ailith', 'b4_truth_council', 'b4_truth_published']);
  // Nothing in these chapters sets a flag any other way (a companion's answer, a scene choice).
  for (const [owner, c] of CONTENT) for (const l of everyLine(c)) assert.equal(l.setFlag, undefined, owner);
  const read = new Set(CONTENT.flatMap(([, c]) => [...readsIn(c)]));
  for (const flag of set) assert.ok(read.has(flag), `${flag} is read`);
});

test('every flag a Book Four line reads is set earlier in Books One to Four, or is the engine\'s own', () => {
  const KNOWN = new Set(['flag', 'is', 'notFlag', 'anyFlag', 'noneFlag', 'party', 'absent', 'class', 'spec', 'bondAtLeast', 'bondBelow', 'item', 'notItem', 'clue', 'notClue', 'access', 'notAccess', 'roller', 'notRoller']);
  const ENGINE = /^(method|prepared|approach|partial|away|walked):/;
  const setBefore = (upTo) => new Set(IDS.slice(0, upTo).flatMap((id) => [...flagsSetIn({ q: RAWQ[id], s: RAWS[sceneOf(id)?.id] })]));
  const check = (owner, content, upTo) => {
    const before = setBefore(upTo);
    for (const l of everyLine(content)) for (const key of Object.keys(l.when)) assert.ok(KNOWN.has(key), `${owner}: ${key}`);
    for (const flag of readsIn(content)) {
      if (ENGINE.test(flag)) continue;
      assert.ok(EARLIER.has(flag) || before.has(flag), `${owner}: ${flag} is read before it can be set`);
    }
  };
  IDS.forEach((id, i) => check(id, RAWQ[id], i));
  for (const [id, s] of entries(RAWS)) check(id, s, IDS.indexOf(s.after) + 1);
  for (const [id, j] of entries(RAWJ)) check(id, j, Math.min(IDS.length, IDS.indexOf(j.from) + 1));
});

test('chapter 1 reads Book Three: the session follows its ending, Sorrel greets by the Second Oath, Hesk talks only from his cell', () => {
  const start = (flags, party) => opening(departed('b4-walker', { flags: { b3_promise_old: false, ...flags }, party }));
  assert.match(start({ b3_promise_old: true }), /Hesk's appeal/);
  assert.match(start({ b3_promise_hesk: true }), /honours for Idris Hesk/);
  assert.match(start({ b3_stair_sealed: true }), /the seal's first inspection/);
  assert.ok(talkIds('b4-walker').includes('hesk'));
  assert.ok(!talkIds('b4-walker', { flags: { b3_promise_old: false, b3_promise_hesk: true } }).includes('hesk'));
  assert.match(talk('b4-walker', 'hesk'), /Ask her what she's walking away from/);
  for (const [oath, line] of [['council', /The council's own/], ['town', /Briarwatch's/], ['companions', /whoever you've brought/], ['none', /Answering to nobody/]]) assert.match(start({ second_oath: oath }), line, oath);
  assert.match(start({}), /I've been looking for ten minutes/);
  // The companions arrive by their Book Three flags.
  assert.match(start({ b3_orin_tried: true }), /owes Saltwick's roof council a season of lamps/);
  assert.match(start({}), /teaching Pim knots/);
  assert.match(start({ nessa_keeper: 'later', b3_wren_waits: true }), /went back in the spring to take the key from Wren/);
  assert.match(start({ b3_seal_taken: true }), /She is the free wards' seal/);
  assert.doesNotMatch(start({ b3_seal_taken: true }, []), /free wards' seal|Orin|Nessa|Maren/);
  // Sable speaks from his cell or from Highpass's bell.
  assert.match(talk('b4-walker', 'sable'), /in his cell under the gatehouse/);
  assert.match(talk('b4-walker', 'sable', { flags: { b3_sable_cast: true } }), /Again\. The third line/);
  assert.match(talk('b4-walker', 'sable'), /the tenth mould/);
});

test('where Rue stays is read in chapters 2 and 3 and in her side job', () => {
  for (const [flag, line, after] of [['b4_rue_party', /came down the Highpass road with you/, /written all of it down, sitting on the toll-house step/],
    ['b4_rue_council', /under Brannagh's roof/, /She asked Brannagh/], ['b4_rue_watch', /at the fire on the north road with Sorrel's watch/, /Sorrel sent her with the rider/]]) {
    assert.match(opening(departed('b4-records', { flags: { [flag]: true } })), line, flag);
    assert.match(opening(at('b4-records', { phase: 'after', flags: { [flag]: true } })), after, flag);
  }
  assert.match(talk('b4-records', 'rue', { flags: { b4_rue_party: true } }), /Is it what we learned from them/);
  assert.match(talk('b4-records', 'rue', { flags: { b4_rue_watch: true } }), /Do not fold them/);
  assert.doesNotMatch(talk('b4-records', 'rue', { flags: { b4_rue_watch: true } }), /^Rue:/m);
  // Chapter 3: Rue is there to answer Pim only if she walks with you.
  assert.match(opening(at('b4-ballad', { phase: 'after', flags: { b4_rue_party: true } })), /^Rue: Yes\. It comes down on Thrum/m);
  assert.match(opening(at('b4-ballad', { phase: 'after', flags: { b4_rue_council: true } })), /Rue has gone back up to Highpass/);
  // The camp scene after chapter 1 is told where she lodges.
  assert.match(opening(decide('b4-walker', 'council')), /Brannagh's goat follows her/);
  assert.match(opening(decide('b4-walker', 'watch')), /between Sorrel and the sergeant/);
  assert.match(opening(decide('b4-walker', 'party')), /in the room Sorrel has found you/);
});

test('chapter 2 reads how Ashford ended Book Three, and how the founders\' page was told is read in chapter 3', () => {
  const start = (flags) => opening(departed('b4-records', { flags }));
  assert.match(start({ b3_ashford_defended: true }), /scaffolding on every second house/);
  assert.match(start({ b3_ashford_defended: true, b3_promise_old: false, b3_promise_hesk: true }), /nobody has begun to build there yet/);
  assert.match(start({ b3_ashford_cast: true }), /a bell the height of a man/);
  assert.match(start({ b3_ashford_children: true }), /children came home from Highpass/);
  assert.match(talk('b4-records', 'brede', { flags: { b3_ashford_cast: true } }), /Amos Wick/);
  assert.match(talk('b4-records', 'brede', { flags: { b3_ashford_children: true } }), /fat and spoilt/);
  assert.match(talk('b4-records', 'ilse', { flags: { 'job:library-sent': true } }), /Sable's books are on the shelf/);
  assert.doesNotMatch(talk('b4-records', 'ilse'), /Sable's books/);
  for (const [flag, line] of [['b4_truth_published', /off a post at the Crossing/], ['b4_truth_council', /the council's sitting on/], ['b4_truth_ailith', /Cinder Fold took home/]]) assert.match(talk('b4-ballad', 'linus', { flags: { [flag]: true } }), line, flag);
  for (const [decision, line] of [['publish', /printer's proof/], ['council', /under seal in the morning/], ['ailith', /Ailith's cart goes at first light/]]) assert.match(opening(decide('b4-records', decision)), line, decision);
});

test('chapter 3 follows Aster: in Briarwatch\'s bell she feels where the white goes; with her gone, the watch-fire and Rue\'s kindest winter', () => {
  const flags = { b3_bell_aster: true };
  assert.match(talk('b4-ballad', 'bell'), /^Aster Vey: Every time I ring now/m);
  assert.match(talk('b4-ballad', 'bell', { flags }), /She's not there/);
  assert.match(talk('b4-ballad', 'bell', { flags: { ...flags, b3_promise_old: false, b3_promise_hesk: true } }), /She's at Vell, in the great bell/);
  assert.match(talk('b4-ballad', 'bell', { flags: { ...flags, b4_rue_party: true } }), /^Rue: Last winter/m);
  assert.match(talk('b4-ballad', 'bell', { flags }), /Kindest winter in the Tally/);
  assert.doesNotMatch(talk('b4-ballad', 'bell', { flags }), /Aster Vey:/);
  // The night watch is Pim's crisis with Aster gone; otherwise the bell.
  assert.match(opening(at('b4-ballad', { phase: 'crisis', flags })), /watch-fire is cold/);
  assert.match(opening(at('b4-ballad', { phase: 'crisis' })), /the bell hangs still/);
  // The answers are read in the camp scene and the job after it.
  for (const [decision, line] of [['quiet', /a rhyme for 'share'/], ['pim', /letters an inch high/], ['rings', /Nobody wants a song about a thing staying the same/]]) assert.match(opening(decide('b4-ballad', decision)), line, decision);
  assert.match(opening(decide('b4-ballad', 'rings')), /^Orin: Calder bridge/m);
  assert.match(opening(decide('b4-ballad', 'rings', { party: ['maren', 'nessa'] })), /Is he really eight feet tall/);
  assert.match(opening(decide('b4-ballad', 'rings', { flags: { b3_orin_tried: true } })), /where I asked to be tried/);
});

// Side jobs.
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
// A chapter a job is played during: the one after its window opens.
const during = (job) => Object.values(QUESTS).find((q) => q.unlock === job.from).id;

test('Rue\'s Doors and The Third Verse are on their towns\' boards in their windows, and only then', () => {
  assert.deepEqual(JOB_IDS.map((id) => [id, SIDE_JOBS[id].town, SIDE_JOBS[id].from, SIDE_JOBS[id].until, SIDE_JOBS[id].level]), [
    ['rue-doors', 'highpass', 'b4-walker', 'b4-ballad', 41], ['third-verse', 'briarwatch', 'b4-ballad', undefined, 43]]);
  const offered = (id, chapter) => E.buildView(at(chapter, { town: SIDE_JOBS[id].town })).world.sideJobs.some((j) => j.id === id);
  assert.ok(!offered('rue-doors', 'b4-walker') && offered('rue-doors', 'b4-records') && offered('rue-doors', 'b4-ballad') && !offered('rue-doors', 'b4-company'));
  // The Third Verse closes after chapter 6 (until: b4-book) once chapter 6 is written; a job may only name a written chapter.
  assert.ok(!FX.WRITTEN.includes('b4-book'));
  assert.ok(!offered('third-verse', 'b4-ballad') && offered('third-verse', 'b4-company') && offered('third-verse', 'b4-book'));
  for (const id of JOB_IDS) assert.ok(SIDE_JOBS[id].gold >= 120 && SIDE_JOBS[id].gold <= 180, id);
});

test('every way through both jobs ends in town, paid once, at most 130 XP, never past the chapter, with or without companions', () => {
  for (const job of JOB_IDS.map((id) => SIDE_JOBS[id])) {
    assert.equal(W.jobXp(job), 130, `${job.id}: the job XP cap`);
    for (const party of [['orin', 'maren', 'nessa'], []]) for (const p of paths(job)) {
      let s = at(during(job), { party, town: job.town });
      const before = { xp: s.player.xp, gold: s.player.gold, level: s.player.level };
      s = act(s, { type: 'side-job', jobId: job.id }).state;
      for (const step of p) s = act(s, { type: 'story-choice', choiceId: step.choiceId }, step.rng).state;
      const where = `${job.id} ${p.map((x) => x.choiceId).join('>')} [${party.join(',')}]`;
      assert.equal(s.story.nodeId, `town-${job.town}`, where);
      assert.equal(s.story.flags[`job:${job.id}`], true, where);
      assert.ok(Object.keys(s.story.flags).some((f) => f.startsWith(`job:${job.id}-`)), `${where}: the way it went is remembered`);
      const spent = p.reduce((n, x) => n + (Number.isFinite(x.o.gold) ? x.o.gold : 0), 0);
      assert.equal(s.player.gold, before.gold + spent + job.gold, where);
      assert.ok(s.player.xp > before.xp && s.player.xp - before.xp <= 130, where);
      assert.equal(s.player.level, before.level, `${where}: never levels past the chapter`);
      if (!party.length) assert.doesNotMatch(told(s), /^(Orin|Maren|Nessa):/m, where);
    }
  }
  // Paid near the top of a level, a job never carries the hero past it.
  const s = at('b4-records', { town: 'highpass' }); s.player.xp = P.XP_NEXT[41] - 10;
  let t = act(s, { type: 'side-job', jobId: 'rue-doors' }).state; t = choose(t, 'talk'); t = choose(t, 'door');
  assert.equal(t.player.level, 41); assert.ok(t.player.xp < P.XP_NEXT[41]);
});

test('the jobs are told for what the chapters decided, and the main story never assumes they were done', () => {
  const start = (id, flags) => opening(act(at(during(SIDE_JOBS[id]), { flags, town: SIDE_JOBS[id].town }), { type: 'side-job', jobId: id }).state);
  assert.match(start('rue-doors', { b4_rue_council: true }), /Brannagh's own door is clean/);
  assert.match(start('rue-doors', { b4_rue_watch: true }), /A door a day/);
  assert.match(start('rue-doors', { b4_rue_party: true }), /I've hidden the ink/);
  assert.match(start('third-verse', { b4_bw_quiet: true, 'method:b4-ballad': 'peace' }), /one night a month now/);
  assert.match(start('third-verse', { 'method:b4-ballad': 'peace' }), /the night Briarwatch rang its pans/);
  assert.match(start('third-verse', {}), /the night the white came into the lanes/);
  assert.match(start('third-verse', { b3_bell_aster: true }), /The fire going out/);
  for (const id of IDS) for (const l of everyLine(RAWQ[id])) assert.ok(!/innkeeper|third verse|oak door/i.test(l.text || l.narrate) || l.when.flag?.startsWith('job:'), `${id}: ${(l.text || l.narrate).slice(0, 60)}`);
  for (const [id, sc] of entries(RAWS)) for (const l of everyLine(sc)) assert.ok(!/innkeeper|oak door/i.test(l.text || l.narrate), id);
});

test('no new person in Book Four takes a name the earlier books or the story bible keep for someone else', () => {
  const text = JSON.stringify([RAWQ, RAWS, RAWJ]);
  // Taken first names (design, "Test plan"), with every first name of Book Three's #79 Saltwick list.
  for (const name of ['Tamsin', 'Brask', 'Hesper', 'Pell', 'Pellow', 'Tam', 'Ansel', 'Garrow', 'Edda', 'Hob', 'Bryony', 'Brack', 'Tansy', 'Kester', 'Ostler', 'Hugh', 'Owen', 'Robin', 'Nan', 'Mae', 'Joan', 'Alfie', 'Mallory', 'Abner', 'Hilde', 'Rosa', 'Dunstan', 'Cobb'])
    assert.doesNotMatch(text, new RegExp(`\\b${name}\\b`), name);
  // Every speaker is a companion, someone returning from Books One to Three, or one of the design's new people.
  const RETURNING = new Set(['Sorrel', 'Sable', 'Hesk', 'Brannagh', 'Sister Ilse', 'Hollis Brede', 'Dera', 'Tovin', 'Pim', 'Aveline', 'Reeve Aveline', 'Aster Vey']);
  const NEW = new Set(['Rue', 'Linus Pardew', 'Ailith Strake']);
  const UNNAMED = new Set(['The watch sergeant', "The rope-men's foreman", 'The innkeeper']);
  const speakers = new Set(CONTENT.flatMap(([, c]) => everyLine(c).map((l) => l.say)).filter(Boolean));
  for (const who of speakers) assert.ok(COMPANIONS[who] || RETURNING.has(who) || NEW.has(who) || UNNAMED.has(who), who);
  // The new names are not anyone's in Books One to Three.
  const older = JSON.stringify(OLDER);
  for (const name of ['Rue', 'Linus', 'Pardew', 'Ailith', 'Strake', 'Sloe', 'Burdock', 'Yarrow', 'Sedge', 'Heath', 'Teasel', 'Campion']) assert.doesNotMatch(older, new RegExp(`"say": ?"${name}`), name);
});
