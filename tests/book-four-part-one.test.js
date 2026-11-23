'use strict';
// Book Four held at Part One (BRIARWATCH_PREVIEW_PARTS=4:1), as players will
// first have it, with fixture chapters standing in for the ones not written
// yet (tests/fixtures/book-four.js). node --test runs each file in its own
// process, so these settings reach no other file.
//
// Build steps 3 to 5 of docs/book-four/DESIGN.md: Part One, chapters 1 to 10,
// their camp scenes and the end-of-part scene, the side jobs Rue's Doors, The
// Third Verse, Bett's Berth and The Ninth Rope, and the chapter rewards.
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
// Chapters 1 to 10, as written.
const IDS = ['b4-walker', 'b4-records', 'b4-ballad', 'b4-company', 'b4-davin', 'b4-book', 'b4-key', 'b4-letters', 'b4-embassy', 'b4-peaks'];
// Where a chapter's decision leaves the party: chapter 10 has no nextTown, so it ends in its own town.
const home = (id) => QUESTS[id].nextTown || QUESTS[id].town;
const RAWQ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/quests.json'), 'utf8'));
const RAWS = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/scenes.json'), 'utf8'));
const RAWJ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/side-jobs.json'), 'utf8'));
const entries = (raw) => Object.entries(raw).filter(([k]) => !k.startsWith('_'));
const sceneOf = (id) => Object.values(SCENES).find((x) => x?.after === id);
const JOB_IDS = ['rue-doors', 'third-verse', 'bett-berth', 'ninth-rope'];

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

// Each decision: its flag, its approval, and any flag its lines set as well
// (Mags answers for Davin: without b3_mags_forgives she says no).
const EXPECT = {
  'b4-walker': { council: ['b4_rue_council', {}], party: ['b4_rue_party', {}], watch: ['b4_rue_watch', {}] },
  'b4-records': { publish: ['b4_truth_published', {}], council: ['b4_truth_council', {}], ailith: ['b4_truth_ailith', {}] },
  'b4-ballad': { rings: ['b4_bw_rings', {}], quiet: ['b4_bw_quiet', { nessa: 1, orin: -1 }], pim: ['b4_bw_pim', {}] },
  'b4-company': { broken: ['b4_company_broken', { nessa: 1 }], council: ['b4_company_council', {}], sails: ['b4_company_sails', { maren: -1 }] },
  'b4-davin': { comes: ['b4_davin_comes', { nessa: 1 }], home: ['b4_davin_home', { orin: 1 }], mags: ['b4_davin_mags', { maren: 1 }, ['b4_davin_home']] },
  'b4-book': { returned: ['b4_book_returned', {}], rewritten: ['b4_book_rewritten', { maren: 1 }], burned: ['b4_book_burned', { maren: -1 }] },
  // With Nessa there the key is hers to answer for; the fourth answer is for when she is away.
  'b4-key': { left: ['b4_key_left', {}], carried: ['b4_key_carried', {}], hew: ['b4_key_hew', {}] },
  'b4-letters': { read: ['b4_letters_read', {}], copied: ['b4_letters_copied', {}], answered: ['b4_letters_answered', {}] },
  'b4-embassy': { council: ['b4_embassy_council', {}], own: ['b4_embassy_own', {}], refuge: ['b4_embassy_refuge', {}] },
  'b4-peaks': { rung: ['b4_parting_rung', {}], unannounced: ['b4_unannounced', {}], gave: ['b4_gave_door', {}] }
};

test('chapters 1 to 10 are written in Book Four\'s own file, in story order, each paying exactly one level and 20 x level + 40 gold', () => {
  assert.deepEqual(FX.WRITTEN.slice(0, IDS.length), IDS);
  assert.deepEqual(IDS.map((id) => { const q = QUESTS[id]; return [q.id, q.book, q.part, q.level, q.unlock, q.town, q.nextTown]; }), [
    ['b4-walker', 4, 1, 40, 'b3-firstbell', 'highpass', 'ashford'],
    ['b4-records', 4, 1, 41, 'b4-walker', 'ashford', 'briarwatch'],
    ['b4-ballad', 4, 1, 42, 'b4-records', 'briarwatch', 'merrowgate'],
    ['b4-company', 4, 1, 43, 'b4-ballad', 'merrowgate', 'saltwick'],
    ['b4-davin', 4, 1, 44, 'b4-company', 'saltwick', 'highpass'],
    ['b4-book', 4, 1, 45, 'b4-davin', 'highpass', 'cinderfold'],
    ['b4-key', 4, 1, 46, 'b4-book', 'cinderfold', 'vell'],
    ['b4-letters', 4, 1, 47, 'b4-key', 'vell', 'highpass'],
    ['b4-embassy', 4, 1, 48, 'b4-letters', 'highpass', 'highpass'],
    ['b4-peaks', 4, 1, 49, 'b4-embassy', 'highpass', undefined]
  ]);
  for (const id of IDS) {
    const q = QUESTS[id];
    assert.equal(q.name, RAWQ[id].name, `${id} is read from src/data/book-four/quests.json`);
    assert.equal(q.xp, P.levelBand(q.level), `${id} pays exactly one level`);
    assert.equal(q.gold, 20 * q.level + 40, `${id} gold`);
    assert.equal(Book.bookOf(id).title, 'The Long Tally');
    for (const key of ['opening', 'approach', 'crisis', 'after']) assert.ok(Array.isArray(q[key]) && q[key].length, `${id}.${key}`);
    assert.ok(q.talks.length >= 4, `${id} talks`);
    assert.equal(q.decisions.length, id === 'b4-key' ? 4 : 3, `${id}: one decision, three answers (and one for the key with Nessa away)`);
    assert.ok(q.told?.ballad && q.told?.tally, `${id}: the Telling has one line for the chapter`);
    assert.ok(STORY_NODES[`q-${id}-start`] && STORY_NODES[`q-${id}-after`], id);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
    assert.equal(ENCOUNTERS[`quest:${id}`].victoryNode, `q-${id}-after`);
    assert.ok(q.investigate && q.route && q.peaceful && q.objective, id);
  }
  // Chapter 1 opens when Book Three's last chapter is done, and needs the 3rd job; no floor.
  assert.equal(QUESTS['b4-walker'].requiresJob, 3); assert.equal(QUESTS['b4-walker'].levelFloor, undefined);
  for (const id of IDS.slice(1)) assert.equal(QUESTS[id].requiresJob, undefined, id);
  // Chapters 5, 6 and 7 are Orin's, Maren's and Nessa's own, and all three go to the Hall: nobody walks out before theirs.
  assert.deepEqual(IDS.map((id) => QUESTS[id].needs), [undefined, undefined, undefined, undefined, ['orin'], ['maren'], ['nessa'], undefined, undefined, ['orin', 'maren', 'nessa']]);
  // Only the end of the part tops a hero up: to 50, after chapter 10's own XP.
  assert.deepEqual(IDS.map((id) => QUESTS[id].levelFloor), [...Array(9).fill(undefined), 50]);
  // Book Four stays hidden from players.
  assert.equal(Book.SHELF.find((b) => b.n === 4).out, 0);
});

test('each chapter has one camp scene: an empty cast, nodes chained by next, and the camp beat last', () => {
  assert.deepEqual(entries(RAWS).filter(([, v]) => IDS.includes(v.after)).map(([k, v]) => [k, v.after]), [['walker-camp', 'b4-walker'], ['records-camp', 'b4-records'], ['ballad-camp', 'b4-ballad'],
    ['company-camp', 'b4-company'], ['davin-camp', 'b4-davin'], ['book-camp', 'b4-book'], ['key-camp', 'b4-key'],
    ['letters-camp', 'b4-letters'], ['embassy-camp', 'b4-embassy'], ['b4-partone-end', 'b4-peaks']]);
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
    // The end of the part sets b4_partone_done on its last choice, as Book Three's did; nothing else changes anything.
    for (const c of Object.values(scene.nodes).flatMap((n) => n.choices)) assert.ok(!c.approval && (!c.setFlags || (scene.id === 'b4-partone-end' && JSON.stringify(c.setFlags) === '{"b4_partone_done":true}')), `${scene.id}/${c.id}: a camp choice changes nothing`);
  }
  assert.deepEqual(last(SCENES['b4-partone-end']).choices.map((c) => c.setFlags), [{ b4_partone_done: true }]);
});
const last = (scene) => { let key = scene.start; while (scene.nodes[key].choices[0].next) key = scene.nodes[key].choices[0].next; return scene.nodes[key]; };

test('every chapter plays to its end peacefully, by every decision, sets only its flag, levels the hero by one, and its scene leads to the next town', () => {
  for (const id of IDS) for (const [decision, [flag, , also = []]] of Object.entries(EXPECT[id])) {
    const s = playPeaceful(id, decision);
    assert.ok(s.world.completed[id], `${id}/${decision}`);
    for (const f of [flag, ...also]) assert.equal(s.story.flags[f], true, `${id}/${decision} sets ${f}`);
    for (const other of Object.values(EXPECT[id]).map((x) => x[0]).filter((f) => f !== flag && !also.includes(f))) assert.equal(s.story.flags[other], undefined, `${id}/${decision} not ${other}`);
    assert.equal(s.story.flags[`method:${id}`], 'peace');
    assert.equal(s.player.level, QUESTS[id].level + 1, `${id}: after chapter N the hero is level 40 + N`);
    assert.equal(s.player.xp, P.XP_NEXT[QUESTS[id].level - 1] + QUESTS[id].xp, `${id}: exactly the chapter's XP`);
    const scene = sceneOf(id);
    assert.equal(s.story.nodeId, `scene-${scene.id}-${scene.start}`, `${id}: its scene follows`);
    assert.equal(toTown(s).story.nodeId, `town-${home(id)}`, `${id}/${decision}`);
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
  for (const [id, fought] of [['b4-walker', /three houses in it stand empty/], ['b4-records', /heads bound up/], ['b4-ballad', /grey at the Briarwood end, where the fight was/],
    ['b4-company', /a lantern-pole through a wheel/], ['b4-davin', /being told their own names/], ['b4-book', /black to the arch/], ['b4-key', /being told which bells are theirs/],
    ['b4-letters', /reads them their own entries/], ['b4-embassy', /four of the men from the road in the cells under the gatehouse\./], ['b4-peaks', /trampled flat round the bell, where the fight was\./]]) {
    const failed = act(at(id, { phase: 'crisis' }), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    let s = choose(at(id, { phase: 'crisis' }), 'confront');
    assert.ok(s.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    assert.match(opening(s), fought, id);
    assert.doesNotMatch(opening(s), /[Nn]obody is hurt|standing, every house in it|Every pot in Briarwatch is dented/, id);
    // The scene is told for the fight too.
    s = choose(s, QUESTS[id].decisions[0].id);
    assert.ok(s.story.nodeId.startsWith('scene-'), id);
  }
  // The clue makes the peaceful way's opening line: told only when the chapter's lead was found.
  for (const id of IDS) {
    const lines = QUESTS[id].peaceful.success.filter((l) => l.when?.flag === `prepared:${id}`);
    // One line, or one for each Book Three ending it is told for (chapter 7: the sealed hatch).
    assert.equal(lines.length, id === 'b4-key' ? 2 : 1, `${id}: a line for the prepared peaceful way`);
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
    // A line told only when that companion rolls the check is told only with them there.
    assert.ok(l.when.party === who || l.when.absent === who || l.when.roller === who, `${owner}: "${(l.text || l.narrate).slice(0, 70)}" names ${who} without a party gate`);
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
    const open = E.buildView(at(id, { party, phase: 'after', flags: { [`method:${id}`]: 'peace' } })).scene.choices.filter((c) => !c.locked).map((c) => c.id);
    assert.ok(open.length >= 1, `${id} [${party}]: an answer is open`);
    for (const d of QUESTS[id].decisions.filter((x) => open.includes(x.id))) {
      const a = at(id, { party, phase: 'after', flags: { [`method:${id}`]: 'peace' } });
      clean(opening(a), party, `${id} after [${party}]`);
      let r = choose(a, d.id);
      clean(told(r), party, `${id}/${d.id} [${party}]`);
      for (let i = 0; i < 4 && r.story.nodeId.startsWith('scene-'); i++) { clean(opening(r), party, `${r.story.nodeId} [${party}]`); const c = E.buildView(r).scene.choices.find((x) => !x.locked); r = choose(r, c.id); }
      assert.equal(r.story.nodeId, `town-${home(id)}`);
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
  assert.deepEqual([...set].sort(), ['b4_book_burned', 'b4_book_returned', 'b4_book_rewritten', 'b4_bw_pim', 'b4_bw_quiet', 'b4_bw_rings', 'b4_company_broken', 'b4_company_council', 'b4_company_sails',
    'b4_davin_comes', 'b4_davin_home', 'b4_davin_mags', 'b4_embassy_council', 'b4_embassy_own', 'b4_embassy_refuge', 'b4_gave_door', 'b4_key_carried', 'b4_key_hew', 'b4_key_left',
    'b4_letters_answered', 'b4_letters_copied', 'b4_letters_maren', 'b4_letters_read', 'b4_parting_rung', 'b4_rue_council', 'b4_rue_party', 'b4_rue_watch', 'b4_truth_ailith', 'b4_truth_council', 'b4_truth_published', 'b4_unannounced']);
  // Nothing else sets a flag any other way (a companion's answer, a scene choice): only Mags's answer for Davin, and Maren carrying the letters.
  const lineSets = [];
  for (const [owner, c] of CONTENT) for (const l of everyLine(c)) if (l.setFlag !== undefined) lineSets.push([owner, l.say, l.setFlag]);
  assert.deepEqual(lineSets, [['b4-davin', 'Mags Peller', 'b4_davin_comes'], ['b4-davin', 'Mags Peller', 'b4_davin_comes'], ['b4-davin', 'Mags Peller', 'b4_davin_home'], ['b4-davin', 'Mags Peller', 'b4_davin_home'], ['b4-letters', undefined, 'b4_letters_maren'], ['b4-parting-end', undefined, 'b4_done']]);
  const read = new Set(CONTENT.flatMap(([, c]) => [...readsIn(c)]));
  for (const flag of set) assert.ok(read.has(flag), `${flag} is read`);
});

test('every flag a Book Four line reads is set earlier in Books One to Four, or is the engine\'s own', () => {
  const KNOWN = new Set(['flag', 'is', 'notFlag', 'anyFlag', 'noneFlag', 'party', 'absent', 'class', 'spec', 'bondAtLeast', 'bondBelow', 'item', 'notItem', 'clue', 'notClue', 'access', 'notAccess', 'roller', 'notRoller']);
  const ENGINE = /^(method|prepared|approach|partial|away|walked):/;
  // Before chapter upTo: the chapters and scenes before it, and the jobs open before it.
  // Every written chapter in story order (Part Two's too: this file reads the whole of Book Four's data).
  const ORDER = FX.WRITTEN, sceneRaw = (id) => entries(RAWS).find(([, s]) => s.after === id)?.[1];
  const setBefore = (upTo) => new Set([...ORDER.slice(0, upTo).flatMap((id) => [...flagsSetIn({ q: RAWQ[id], s: sceneRaw(id) })]),
    ...entries(RAWJ).filter(([, j]) => ORDER.indexOf(j.from) < upTo).flatMap(([, j]) => [...flagsSetIn({ j })])]);
  const check = (owner, content, upTo) => {
    const before = setBefore(upTo);
    for (const l of everyLine(content)) for (const key of Object.keys(l.when)) assert.ok(KNOWN.has(key), `${owner}: ${key}`);
    for (const flag of readsIn(content)) {
      if (ENGINE.test(flag)) continue;
      assert.ok(EARLIER.has(flag) || before.has(flag), `${owner}: ${flag} is read before it can be set`);
    }
  };
  ORDER.forEach((id, i) => check(id, RAWQ[id], i));
  for (const [id, s] of entries(RAWS)) check(id, s, ORDER.indexOf(s.after) + 1);
  // A job may read what any chapter before its window closes decided, with a line for while it is undecided.
  for (const [id, j] of entries(RAWJ)) check(id, j, j.until ? ORDER.indexOf(j.until) : ORDER.length);
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
  assert.match(opening(at('b4-ballad', { phase: 'after', flags: { b4_rue_party: true } })), /^Rue: Yes\. It comes down on Thrum\. It is in my book, most winters/m);
  assert.match(opening(at('b4-ballad', { phase: 'after', flags: { b4_rue_council: true } })), /Rue has gone back up to Highpass/);
  // The camp scene after chapter 1 is told where she lodges.
  assert.match(opening(decide('b4-walker', 'council')), /comes up from Brannagh's lodging/);
  assert.doesNotMatch(opening(decide('b4-walker', 'council')), /goat/);
  // With nobody else in the party, Rue's page is for the hero alone.
  assert.match(opening(decide('b4-walker', 'council', { party: [] })), /She has made a page for you\./);
  assert.match(opening(decide('b4-walker', 'council')), /She has made a page for each of you\./);
  // Chapter 2 sends her back up to Highpass when she came down after her pages.
  for (const [flag, line] of [['b4_rue_council', /Rue goes back up to Highpass on the morning coach/], ['b4_rue_watch', /Sorrel's rider takes Rue back up to Highpass/]]) assert.match(opening(decide('b4-records', 'publish', { flags: { [flag]: true } })), line, flag);
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
  // The Wold's last winter follows Book Three's ending: kindest only with the old way.
  const hesk = { ...flags, b3_promise_old: false, b3_promise_hesk: true }, sealed = { ...flags, b3_promise_old: false, b3_stair_sealed: true };
  assert.match(talk('b4-ballad', 'bell', { flags: hesk }), /Worst winter in the Tally\. Every lane under but ours\. Thrum's lane clear past the third door until midwinter/);
  assert.match(talk('b4-ballad', 'bell', { flags: sealed }), /Worse than the last/);
  assert.match(talk('b4-ballad', 'bell', { flags: { ...hesk, b4_rue_party: true } }), /^Rue: Last winter\. The winter your bell was empty\. It was the worst winter in the Tally/m);
  assert.match(talk('b4-ballad', 'bell', { flags: { ...sealed, b4_rue_party: true } }), /^Rue: Last winter was worse than the one before/m);
  for (const f of [hesk, sealed, { ...hesk, b4_rue_party: true }, { ...sealed, b4_rue_party: true }]) assert.doesNotMatch(talk('b4-ballad', 'bell', { flags: f }), /[Kk]indest|kind winter/);
  assert.equal((talk('b4-ballad', 'bell', { flags: { ...flags, b4_rue_party: true } }).match(/Last winter/g) || []).length, 1, 'Rue or her pages, not both');
  // Pim's fire with Aster gone: the watch is a winter old, and the fire his for a month.
  assert.match(opening(at('b4-ballad', { phase: 'after', flags })), /since Aster left the bell\. It's the first rule this village made without her\. Now a boy who's had the fire one month/);
  assert.match(opening(at('b4-ballad', { phase: 'after', flags: { ...flags, 'method:b4-ballad': 'peace' } })), /same as the fire/);
  assert.match(opening(at('b4-ballad', { phase: 'after' })), /Now Pim, who's rung it since he was a boy/);
  assert.match(told(decide('b4-ballad', 'pim', { flags })), /He has stood it since last winter.*He is the one who asked\./);
  assert.match(told(decide('b4-ballad', 'pim')), /He has rung the bell since he was a boy/);
  // Aster, still in her bell, answers the quiet night.
  // In the quiet night she answers whether or not Orin asked; with Pim she
  // speaks after his rule, not before it.
  assert.match(told(decide('b4-ballad', 'quiet')), /^Aster Vey: Ask me too, while you're asking\. Yes\. One night/m);
  assert.match(told(decide('b4-ballad', 'pim')), /Pim: And I'll be on it\.[^]*^Aster Vey: He asked me first, you know\. I said yes\./m);
  for (const d of ['quiet', 'pim']) {
    assert.doesNotMatch(told(decide('b4-ballad', d, { flags })), /Aster Vey:/, d);
  }
  for (const raw of [RAWQ, RAWJ]) assert.doesNotMatch(JSON.stringify(raw), /since he was nine|when he was nine|bell went quiet/);
  assert.doesNotMatch(talk('b4-ballad', 'bell', { flags }), /Aster Vey:/);
  // The night watch is Pim's crisis with Aster gone; otherwise the bell.
  assert.match(opening(at('b4-ballad', { phase: 'crisis', flags })), /watch-fire is cold/);
  assert.match(opening(at('b4-ballad', { phase: 'crisis' })), /the bell hangs still/);
  // The answers are read in the camp scene and the job after it.
  for (const [decision, line] of [['quiet', /a rhyme for 'share'/], ['pim', /letters an inch high/], ['rings', /Nobody wants a song about a thing staying the same/]]) assert.match(opening(decide('b4-ballad', decision)), line, decision);
  assert.match(opening(decide('b4-ballad', 'rings')), /^Orin: The ford at Calder/m);
  assert.match(opening(decide('b4-ballad', 'rings', { flags: { b3_orin_tried: true, b3_orin_gives: true } })), /^Orin: Then Briarwatch\. Then the council\. Then Saltwick\. I don't remember it/m);
  assert.match(opening(decide('b4-ballad', 'rings', { party: ['maren', 'nessa'] })), /Is he really eight feet tall/);
  assert.match(opening(decide('b4-ballad', 'rings', { flags: { b3_orin_tried: true } })), /where I asked to be tried/);
});

test('the review\'s fixes hold: Sorrel is she, Sable judges what he can, and each line follows the Book Three ending it is told for', () => {
  const all = JSON.stringify([RAWQ, RAWS, RAWJ]);
  // Captain Sorrel is a woman (Book Three).
  for (const s of all.match(/[^."]*Sorrel[^."]*/g)) assert.doesNotMatch(s.replace(/take it down to him/, ''), /\b(he|him|his|himself)\b/i, s);
  assert.match(talk('b4-walker', 'sorrel'), /She points with her chin/);
  // Sable hears a copy Rue made, and in the bell in the gatehouse yard judges the spellings, not the hand.
  const cast = talk('b4-walker', 'sable', { flags: { b3_sable_cast: true } });
  assert.match(cast, /gatehouse yard/); assert.match(cast, /Those are the founders' spellings/);
  assert.doesNotMatch(cast, /tower|Square letters/);
  assert.match(talk('b4-walker', 'sable'), /Rue copies her first page out for you herself, through the bars/);
  assert.match(talk('b4-walker', 'sable'), /Square letters/);
  // Chapter 1's opening by ending: the partial ring, Maren's sealed table, Orin back with Mags.
  const start = (flags, party) => opening(departed('b4-walker', { flags: { b3_promise_old: false, ...flags }, party }));
  assert.match(start({ b3_promise_hesk: true, b3_three_told: true }), /holds what towns it can, for as long as it can/);
  assert.match(start({ b3_promise_hesk: true }), /whose ring of bells holds the free wards/);
  assert.match(start({ b3_promise_old: true }), /the sentence given at the first sitting this spring/);
  assert.match(start({ b3_stair_sealed: true, b3_seal_taken: true }), /a table in the gatehouse that nobody comes to now/);
  assert.match(start({ b3_promise_hesk: true, b3_seal_taken: true }), /across from people who have come to give/);
  assert.match(start({ b3_orin_tried: true, b3_mags_forgives: true }), /Mags Peller asked for him back, and he went/);
  assert.doesNotMatch(start({ b3_orin_tried: true }), /Mags Peller/);
  assert.match(opening(at('b4-walker', { phase: 'crisis', party: ['maren', 'nessa'] })), /They are all looking at the third house/);
  // Chapter 2: the nine rest with the wards' seat; Rue reads first when she walks with you; Maren speaks before the choice.
  assert.match(talk('b4-records', 'ailith', { flags: { wards_seat: true } }), /The nine have rested/);
  assert.match(talk('b4-records', 'ailith'), /nine people under that lid/);
  const resolved = (id, opts) => told(choose(strong(at(id, { ...opts, phase: 'crisis' })), 'resolve'));
  assert.match(resolved('b4-records', { flags: { b4_rue_party: true } }), /Rue is already in the square with her own pages when (you get|Orin gets|Maren gets|Nessa gets) there,/);
  assert.match(resolved('b4-records', { flags: { b4_rue_party: true } }), /Then Rue reads the Wold's winters again/);
  assert.doesNotMatch(resolved('b4-records', { flags: { b4_rue_watch: true } }), /Rue is out of the cellar door|Then Rue reads/);
  assert.match(opening(at('b4-records', { phase: 'after' })), /^Maren: Whoever has it next will want to change a word/m);
  assert.doesNotMatch(opening(at('b4-records', { phase: 'after', party: ['orin', 'nessa'] })), /change a word/);
  assert.match(told(decide('b4-records', 'ailith')), /You can wait till morning, Ailith\. Two hundred years, you can wait a night/);
  // A page read in Ashford's square is not a page nobody has heard.
  for (const flag of ['b4_truth_council', 'b4_truth_ailith']) {
    assert.match(talk('b4-ballad', 'linus', { flags: { [flag]: true, 'method:b4-records': 'peace' } }), /Ashford heard a page read in its square at midnight/, flag);
    assert.doesNotMatch(talk('b4-ballad', 'linus', { flags: { [flag]: true, 'method:b4-records': 'peace' } }), /Nobody knows what's on it|Nobody outside Cinder Fold knows/, flag);
  }
  // The Telling's lines fit the fight as well as the peaceful way.
  for (const id of IDS) assert.doesNotMatch(QUESTS[id].told.ballad, /read in the square|pots and pans|stood in the gate/, id);
  // Narrator wit and the goat are cut.
  assert.doesNotMatch(all, /number of cups|read to for two days|neither of them notices|being bored|I don't usually find it|blisters|goat is tied|goat follows/);
  // Goats are Brannagh's: her old lodger in chapter 1, and her question after the vote (and Nessa's answer to it).
  const goats = CONTENT.flatMap(([owner, c]) => everyLine(c).filter((l) => /goat/.test(l.text || l.narrate)).map((l) => [owner, l.say]));
  assert.deepEqual(goats, [['b4-walker', 'Brannagh'], ['embassy-camp', 'Brannagh'], ['embassy-camp', 'nessa'], ['embassy-camp', 'Brannagh']]);
  // The camp after chapter 1: Hesk's appeal was heard that day.
  assert.match(opening(choose(decide('b4-walker', 'party'), 'ask')), /the speech he gave at his appeal today/);
  assert.match(opening(choose(decide('b4-walker', 'party', { party: [] }), 'ask')), /and the line about you\./);
});

test('a companion who rolls a check is the one doing every verb after "and" in its result', () => {
  // The verbs written with a roller token, as the hero says them and as a companion does.
  const pairs = new Map();
  JSON.stringify([RAWQ, RAWJ], (k, v) => { if (typeof v === 'string') for (const m of v.matchAll(/\{(?:[Yy]ou )?([a-z]+)\|(?:@ )?([a-z]+)\}/g)) if (m[2] !== m[1] && /s$/.test(m[2])) pairs.set(m[1], m[2]); return v; });
  assert.ok(pairs.size >= 20, `${pairs.size} verbs`);
  for (const base of ['sing', 'lose', 'come', 'beat', 'put', 'read']) assert.ok(pairs.has(base), base);
  const third = [...pairs.values()].join('|'), bases = new Set(pairs.keys());
  let checked = 0;
  for (const node of Object.values(STORY_NODES).filter((n) => IDS.includes(n.questId) || JOB_IDS.includes(n.sideJob))) for (const c of node.choices || []) {
    if (!c.check) continue;
    for (const key of ['success', 'failure']) for (const id of ['orin', 'maren', 'nessa']) {
      const name = COMPANIONS[id].name.split(' ')[0];
      for (const sentence of (outcomeForRoller(c[key], { id }).text || '').split(/(?<=[.!?:])\s+|\n/)) {
        const at = sentence.search(new RegExp(`\\b${name} (${third})\\b`));
        if (at < 0) continue;
        checked++;
        // Read on from the companion's verb until a new clause starts with someone else.
        for (const m of sentence.slice(at).matchAll(/(,\s+)?\b(and|but) (\w+)/g)) {
          assert.ok(m[2] !== 'and' || !bases.has(m[3]), `${node.id} ${c.id} ${key} [${id}]: "and ${m[3]}" in "${sentence}"`);
          if (m[1] && !bases.has(m[3])) break;
        }
      }
    }
  }
  assert.ok(checked > 50, `${checked} sentences`);
});

test('a line that answers a companion\'s line is told only with that companion there', () => {
  let answers = 0;
  const walk = (value, owner) => {
    if (Array.isArray(value)) {
      value.forEach((l, i) => {
        const prev = value[i - 1];
        if (!prev?.say || !COMPANIONS[prev.say] || !l?.say || COMPANIONS[l.say]) return;
        answers++;
        assert.equal(l.when?.party, prev.say, `${owner}: "${l.text.slice(0, 60)}" answers ${prev.say}`);
      });
      value.forEach((v) => walk(v, owner));
    } else if (value && typeof value === 'object') for (const v of Object.values(value)) walk(v, owner);
  };
  for (const [owner, content] of CONTENT) walk(content, owner);
  assert.ok(answers >= 8, `${answers} answers`);
});

test('The Third Verse follows the night as it went and Aster\'s bell', () => {
  const job = (flags, choice) => { let s = act(at(during(SIDE_JOBS['third-verse']), { flags, town: 'briarwatch' }), { type: 'side-job', jobId: 'third-verse' }).state; const o = opening(s); if (!choice) return o; return told(act(s, { type: 'story-choice', choiceId: choice }, high).state); };
  assert.match(job({}), /He's the one who sat with it all night/);
  assert.match(job({ b3_bell_aster: true }), /since Aster went from the bell/);
  assert.match(job({ b3_bell_aster: true }), /it wasn't the fire/);
  assert.doesNotMatch(job({}), /stew pot/);
  assert.match(job({ 'method:b4-ballad': 'peace' }), /stew pot/);
  assert.match(job({ b3_bell_aster: true }, 'dera'), /goes down to the fire at the stream early/);
  assert.match(job({}, 'dera'), /climbs the tower early/);
  assert.match(job({ b3_bell_aster: true }, 'tovin'), /the way the fire went out/);
  assert.match(job({}, 'tovin'), /the way the hour was missed/);
  assert.match(job({ 'method:b4-ballad': 'peace' }, 'all'), /who did not bang anything/);
  assert.doesNotMatch(job({}, 'all'), /did not bang anything|stew pot/);
  assert.match(told(act(act(at(during(SIDE_JOBS['third-verse']), { town: 'briarwatch' }), { type: 'side-job', jobId: 'third-verse' }).state, { type: 'story-choice', choiceId: 'all' }, low).state), /and they sing it anyway\./);
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

test('the four jobs are on their towns\' boards in their windows, and only then', () => {
  assert.deepEqual(JOB_IDS.map((id) => [id, SIDE_JOBS[id].town, SIDE_JOBS[id].from, SIDE_JOBS[id].until, SIDE_JOBS[id].level]), [
    ['rue-doors', 'highpass', 'b4-walker', 'b4-ballad', 41], ['third-verse', 'briarwatch', 'b4-ballad', 'b4-book', 43],
    ['bett-berth', 'merrowgate', 'b4-ballad', 'b4-key', 44], ['ninth-rope', 'cinderfold', 'b4-book', 'b4-embassy', 46]]);
  const offered = (id, chapter) => E.buildView(at(chapter, { town: SIDE_JOBS[id].town })).world.sideJobs.some((j) => j.id === id);
  assert.ok(!offered('rue-doors', 'b4-walker') && offered('rue-doors', 'b4-records') && offered('rue-doors', 'b4-ballad') && !offered('rue-doors', 'b4-company'));
  // The Third Verse is open during chapters 4 to 6, Bett's Berth during 4 to 7.
  assert.ok(!offered('third-verse', 'b4-ballad') && offered('third-verse', 'b4-company') && offered('third-verse', 'b4-book') && !offered('third-verse', 'b4-key'));
  assert.ok(!offered('bett-berth', 'b4-ballad') && offered('bett-berth', 'b4-company') && offered('bett-berth', 'b4-key') && !offered('bett-berth', 'b4-letters'));
  // The Ninth Rope is open during chapters 7 to 9, and closes once chapter 9 is done.
  assert.ok(!offered('ninth-rope', 'b4-book') && offered('ninth-rope', 'b4-key') && offered('ninth-rope', 'b4-letters') && offered('ninth-rope', 'b4-embassy') && !offered('ninth-rope', 'b4-peaks'));
  for (const id of JOB_IDS) assert.ok(SIDE_JOBS[id].gold >= 120 && SIDE_JOBS[id].gold <= 180, id);
});

test('every way through every job ends in town, paid once, at most 130 XP, never past the chapter, with or without companions', () => {
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
    assert.doesNotMatch(text.replace(/Tam Orrey, the baker from Fenmere/g, ''), new RegExp(`\\b${name}\\b`), name);
  // Tam Orrey is Book Two's Fenmere baker himself (chapter 18, Maren), not a new person with his name.
  // Every speaker is a companion, someone returning from Books One to Three, or one of the design's new people.
  const RETURNING = new Set(['Sorrel', 'Sable', 'Hesk', 'Brannagh', 'Sister Ilse', 'Hollis Brede', 'Dera', 'Tovin', 'Pim', 'Aveline', 'Reeve Aveline', 'Aster Vey',
    'Cass Ord', 'Coll Haddow', 'Bett', 'Elske', 'Mags Peller', 'Davin', 'Varn', 'Odell Varn', 'Peg Halloran', 'Iona', 'Wren', 'Ottilie Brand', 'Hew', 'Rafe Coppin', 'Tilda Coppin',
    'Fennick', 'Corvane', 'Anwen']);
  const NEW = new Set(['Rue', 'Linus Pardew', 'Ailith Strake', 'Vetch of Wem', 'Garth Mott', 'Teasel', 'Sedge', 'Burdock', 'Sloe', 'Yarrow', 'Madder', 'Heath', 'Furze', 'Campion', 'Lovage', 'Betony', 'Bistort of Greve', 'Annis Corby', 'Wystan Strake']);
  const UNNAMED = new Set(['The watch sergeant', "The rope-men's foreman", 'The innkeeper', "The Company's factor", 'The carter', 'A rope-man', 'A man in a good coat', "Sheddon's eldest", "The weavers' eldest", "Wem's door-bearer", "Dunnet's door-bearer", "Wem's elder", 'The walker', 'A man from the yard', "The Hall's sergeant"]);
  const speakers = new Set(CONTENT.flatMap(([, c]) => everyLine(c).map((l) => l.say)).filter(Boolean));
  for (const who of speakers) assert.ok(COMPANIONS[who] || RETURNING.has(who) || NEW.has(who) || UNNAMED.has(who), who);
  // The new names are not anyone's in Books One to Three.
  const older = JSON.stringify(OLDER);
  for (const name of ['Rue', 'Linus', 'Pardew', 'Ailith', 'Strake', 'Sloe', 'Burdock', 'Yarrow', 'Sedge', 'Heath', 'Teasel', 'Campion', 'Madder', 'Furze', 'Lovage', 'Betony', 'Bistort', 'Annis', 'Wystan']) assert.doesNotMatch(older, new RegExp(`"say": ?"${name}`), name);
  // Chapter 7's family from Wem and the Ninth Rope's ringers are nobody's in Books One to Three, or the story bible's.
  const bible = fs.readFileSync(path.join(__dirname, '../docs/STORY-BIBLE.md'), 'utf8');
  for (const name of ['Vetch', 'Clary', 'Burnet', 'Garth', 'Mott', 'Perrin', 'Rowe', 'Madder', 'Comfrey', 'Furze', 'Lovage', 'Piers', 'Ashdown', 'Betony', 'Bistort', 'Annis', 'Corby', 'Merrick', 'Wystan']) { assert.doesNotMatch(older, new RegExp(`\\b${name}\\b`), name); assert.doesNotMatch(bible, new RegExp(`\\b${name}\\b`), name); }
  // A name one letter from a returning one is not new (the Book Three review: Tobin and Tovin).
  assert.doesNotMatch(text, /\bTobin\b/);
});

// ---------------------------------------------------------------------------
// Chapters 4 to 7.
function walkThrough(s) { for (let i = 0; i < 6 && E.buildView(s).scene.id.startsWith('scene-'); i++) s = choose(s, E.buildView(s).scene.choices.find((c) => !c.locked).id); return s; }

test('chapter 4 reads Merrowgate\'s Book Three, and its charter is read by the camp, chapter 6 and Bett\'s Berth', () => {
  assert.match(talk('b4-company', 'haddows', { flags: { b3_debts_bought: true } }), /They burned my paper last summer/);
  assert.match(talk('b4-company', 'haddows'), /You saw to that, last summer/);
  assert.ok(!talkIds('b4-company').includes('elske'));
  for (const [flag, line] of [['elske_seat', /in Merrowgate's chamber/], ['elske_free', /in the long room at the harbour hospice, where she works now, with Anwen's cards[^]*They will tell you the land is empty/], ['elske_judged', /the Sallows hospice, which the council sentenced her to keep open for five years[^]*Forty families/]]) assert.match(talk('b4-company', 'elske', { flags: { [flag]: true } }), line, flag);
  assert.deepEqual(QUESTS['b4-company'].peaceful.easierWith.flag, 'b4_truth_published');
  // A lost fight leaves the wagons where the after finds them.
  assert.doesNotMatch(QUESTS['b4-company'].objective.failText, /go out at dawn|sails on the tide|gone north/);
  assert.match(talk('b4-company', 'haddows', { flags: { b3_debts_bought: true } }), /last summer/);
  // The camp: Bett asks Nessa, or the hero with Nessa away.
  for (const [decision, line] of [['broken', /unloading by lamplight/], ['council', /chalking the council's seal/], ['sails', /crossed out/]]) assert.match(opening(decide('b4-company', decision)), line, decision);
  assert.match(opening(decide('b4-company', 'broken')), /^Nessa: Never been\./m);
  const away = opening(decide('b4-company', 'broken', { party: ['orin', 'maren'] }));
  assert.match(away, /You tell her you have never been/); assert.doesNotMatch(away, /Nessa|Biscuit/);
  // Chapter 6: Iona has priced the charter's ending.
  for (const [flag, line] of [['b4_company_council', /a bill on my desk from Cass Ord/], ['b4_company_sails', /went over the pass a month ago/], ['b4_company_broken', /broke the Hall's charter in a morning/]]) assert.match(talk('b4-book', 'iona', { flags: { [flag]: true } }), line, flag);
  assert.match(told(choose(strong(departed('b4-book', { flags: { b4_company_sails: true } })), 'investigate')), /The Company's copyist had it first/);
  assert.doesNotMatch(told(choose(strong(departed('b4-book')), 'investigate')), /copyist/);
});

test('chapter 5 reads where Saltwick lives and Orin\'s trial; Mags answers by whether she forgave him', () => {
  const start = (flags) => opening(departed('b4-davin', { flags }));
  assert.match(start({}), /Saltwick is still on its roofs/);
  assert.match(start({ b3_saltwick_moved: true }), /Summer in Vell/);
  assert.match(start({ b3_saltwick_moved: true, b3_bell_evacuate: true }), /Summer on the Highpass road/);
  assert.match(start({ b3_saltwick_moved: true, b3_bell_aster: true }), /Saltwick is home/);
  assert.match(start({ 'job:lamps-davin': true }), /when you left it there and walked the first night with him/);
  assert.match(start({ b3_orin_tried: true }), /as the roof council sentenced him/);
  assert.ok(!talkIds('b4-davin').includes('varn'));
  assert.match(talk('b4-davin', 'varn', { flags: { b3_orin_tried: true } }), /Either way you're the one who decided/);
  assert.match(talk('b4-davin', 'varn', { flags: { b3_varn_judged: true } }), /up the Iron Road in exile/);
  assert.doesNotMatch(talk('b4-davin', 'varn', { flags: { b3_varn_judged: true }, party: ['maren', 'nessa'] }), /Orin|Stoneward/);
  // Mags's answer: her own, by b3_mags_forgives.
  let s = decide('b4-davin', 'mags', { flags: { b3_mags_forgives: true } });
  assert.equal(s.story.flags.b4_davin_comes, true); assert.equal(s.story.flags.b4_davin_home, undefined);
  assert.match(told(s), /Yes\. Go\. Go with him\. I forgave Orin Stoneward for a lantern/);
  s = decide('b4-davin', 'mags');
  assert.equal(s.story.flags.b4_davin_home, true); assert.equal(s.story.flags.b4_davin_comes, undefined);
  assert.match(told(s), /No\. Not because of Orin/);
  assert.match(told(decide('b4-davin', 'mags', { flags: { b3_mags_forgives: true }, party: ['maren', 'nessa'] })), /Go with them\. I forgave a man for a lantern once/);
  // The camp: the knot, by the answer.
  assert.match(opening(decide('b4-davin', 'comes')), /Davin's pack between them[^]*The stopper goes on the other side[^]*^Davin: Where you can see me\./m);
  assert.match(opening(decide('b4-davin', 'home')), /The pack is unpacked[^]*^Davin: They've got somebody\./m);
  assert.match(opening(decide('b4-davin', 'mags')), /Mags comes up the ladder before it is quite dark/);
  assert.doesNotMatch(opening(decide('b4-davin', 'home')), /Mags comes up the ladder/);
  const away = opening(decide('b4-davin', 'comes', { party: ['maren', 'nessa'] }));
  assert.match(away, /He shows you the knot on his pack[^]*I'll tie yours, on the road/); assert.doesNotMatch(away, /Orin|Stoneward/);
});

test('chapter 6 reads Rue\'s doors and where she lodges; the book\'s answer is read by the camp', () => {
  const start = (flags) => opening(departed('b4-book', { flags }));
  for (const [flag, line] of [['job:rue-doors-gate', /to the founders' gate already/], ['job:rue-doors-office', /the door of Sorrel's office already/], ['job:rue-doors-door', /her own oak door on its frame/], ['job:rue-doors-kitchen', /read her his own door/]]) assert.match(start({ [flag]: true }), line, flag);
  assert.match(start({}), /The doors are all clean/);
  for (const [flag, line] of [['b4_rue_party', /come back up the pass with you/], ['b4_rue_council', /with Brannagh of Fenmere/], ['b4_rue_watch', /in the watch-house at the head of the north road/]]) assert.match(start({ [flag]: true }), line, flag);
  assert.match(start({ b4_davin_comes: true }), /Davin came up from Saltwick with you/);
  assert.match(start({ b4_davin_home: true }), /Davin is on the far roofs in Saltwick/);
  assert.match(told(decide('b4-book', 'burned')), /^Rue: Heath\. That is my mother/m);
  assert.match(told(decide('b4-book', 'rewritten', { party: ['orin', 'nessa'] })), /Somebody sat with me\. That is first now/);
  // The camp: Iona sends nobody a bill.
  assert.match(opening(decide('b4-book', 'returned')), /with her book under her arm/);
  assert.match(opening(decide('b4-book', 'burned')), /under it, HEATH/);
  assert.match(opening(decide('b4-book', 'rewritten', { flags: { b4_company_council: true } })), /That one I'm paying/);
  assert.match(opening(decide('b4-book', 'returned')), /the bill for the watch's night at the north gate[^]*^Iona: Given\. Write that down\./m);
  assert.doesNotMatch(opening(decide('b4-book', 'returned', { party: ['orin', 'nessa'] })), /Maren|I don't say things twice/);
});

test('chapter 7 reads the key\'s Book Three keeper; with Nessa away the key stays where it is, and the camp is told for each answer', () => {
  const after = (flags, party) => opening(at('b4-key', { phase: 'after', flags: { 'method:b4-key': 'peace', ...flags }, party }));
  assert.match(after({}), /Wren comes up the hill on her stick/);
  assert.match(after({ nessa_keeper: 'declined' }), /Nobody offers Nessa the key/);
  assert.match(after({ nessa_keeper: 'later', b3_wren_waits: true }), /Nessa has it round her neck on its cord/);
  assert.match(after({ b3_wren_cast: true }), /Ottilie Brand takes the key off its nail/);
  assert.match(after({}, ['orin', 'maren']), /Wren keeps the key/);
  // Nessa's three answers are hers; with her away there is one, and it reads as the key left.
  const open = (party) => E.buildView(at('b4-key', { phase: 'after', flags: { 'method:b4-key': 'peace' }, party })).scene.choices.filter((c) => !c.locked).map((c) => c.id);
  assert.deepEqual(open(['orin', 'maren', 'nessa']), ['left', 'carried', 'hew']);
  assert.deepEqual(open(['orin', 'maren']), ['wren']);
  const s = decide('b4-key', 'wren', { party: ['orin', 'maren'] });
  assert.equal(s.story.flags.b4_key_left, true);
  assert.doesNotMatch(told(s), /Nessa|Reed|Biscuit/);
  // The sealed hatch opens on a warrant.
  assert.match(opening(at('b4-key', { phase: 'crisis', flags: { b3_stair_sealed: true } })), /the warrant from Vell/);
  assert.match(told(choose(strong(departed('b4-key', { flags: { b3_stair_sealed: true } })), 'investigate')), /the council's lead on the iron/);
  assert.match(told(choose(strong(departed('b4-key')), 'investigate')), /Burnet of Wem\. I gave the dog/);
  assert.ok(!talkIds('b4-key').includes('coppins'));
  assert.match(talk('b4-key', 'coppins', { flags: { 'job:mould-sold': true } }), /at the coast with their mother/);
  // The camp: Biscuit was carried; Hew minds him in Cinder Fold, and he stops at
  // Highpass when the party goes north (Part Two and Three find him there).
  const hewCamp = opening(decide('b4-key', 'hew'));
  assert.match(hewCamp, /carried him across the lid[^]*with the key round his neck[^]*Take him up the stair with you while we're here/);
  assert.match(hewCamp, /He'll stop at Highpass, by the guardroom brazier/);
  assert.doesNotMatch(hewCamp, /he stays here/);
  assert.match(opening(decide('b4-key', 'carried')), /since there's nobody up it/);
  assert.match(opening(decide('b4-key', 'left')), /Count the steps for me/);
  const away = opening(decide('b4-key', 'wren', { party: ['orin', 'maren'] }));
  assert.match(away, /Hew sits up with them/); assert.doesNotMatch(away, /Nessa|Biscuit/);
});

test('Bett\'s Berth follows the charter, and The Ninth Rope the winter the miners rang the nine', () => {
  const start = (id, flags) => opening(act(at(during(SIDE_JOBS[id]), { flags, town: SIDE_JOBS[id].town }), { type: 'side-job', jobId: id }).state);
  assert.match(start('bett-berth', {}), /The North Company's ship is at the north quay[^]*Coll Haddow is sitting on a bollard/);
  assert.match(start('bett-berth', { b4_company_broken: true }), /sold at the Hall's auction/);
  assert.match(start('bett-berth', { b4_company_council: true }), /One Haddow up there is enough/);
  const sails = start('bett-berth', { b4_company_sails: true });
  assert.match(sails, /Coll went north on wagon four/); assert.doesNotMatch(sails, /Coll Haddow is sitting|^Coll Haddow:/m);
  const job = (id, flags, choice, rng = high) => told(act(act(at(during(SIDE_JOBS[id]), { flags, town: SIDE_JOBS[id].town }), { type: 'side-job', jobId: id }).state, { type: 'story-choice', choiceId: choice }, rng).state);
  assert.match(job('bett-berth', { b4_company_sails: true }, 'speak'), /her aunt's kitchen/);
  assert.match(job('bett-berth', {}, 'speak', low), /Ask me next year/);
  assert.match(start('ninth-rope', {}), /He learnt by ringing the miners' gallery bell/);
  assert.match(start('ninth-rope', { b3_wren_waits: true }), /took Ned Thorne's rope the night Ned fell/);
  assert.match(start('ninth-rope', { b4_truth_ailith: true }), /It does not say who rings them/);
  assert.match(job('ninth-rope', {}, 'ailith'), /so it's the rule and not a favour/);
  // Neither job is assumed by the chapters.
  for (const id of IDS) for (const l of everyLine(RAWQ[id])) assert.ok(!/Garth|Perrin|marlinspike|ship's girl/i.test(l.text || l.narrate), `${id}: ${(l.text || l.narrate).slice(0, 60)}`);
});

test('a companion down on chapter 4, 5 or 6 stays for their own chapter and says why; Book Four\'s leave and back lines are its own', () => {
  const stay = (id, who, flags = {}) => {
    let s = at(id, { phase: 'after', flags: { [`method:${id}`]: 'peace', ...flags } });
    s.world.approvalWindow = { [who]: -3 };
    s = walkThrough(choose(s, QUESTS[id].decisions[0].id));
    assert.equal(s.story.nodeId, `away-${who}-stay`, `${id}: ${who} stays`);
    return opening(s);
  };
  assert.match(stay('b4-company', 'orin'), /But it's Saltwick next, and Davin's packed/);
  assert.match(stay('b4-davin', 'maren'), /But Rue's written\. She wants me at Highpass/);
  assert.match(stay('b4-book', 'nessa'), /Wren's there, and the key, and Hew/);
  assert.match(stay('b4-book', 'nessa', { b3_wren_cast: true }), /The tenth bell's there, and the key/);
  assert.doesNotMatch(stay('b4-book', 'nessa', { b3_wren_cast: true }), /Wren's there/);
  // Walking out in Book Four: its own lines, Book Two's kept for Books Two and Three.
  let s = at('b4-records', { phase: 'after', flags: { 'method:b4-records': 'peace' } });
  s.world.approvalWindow = { orin: -3 };
  s = walkThrough(choose(s, 'publish'));
  assert.equal(s.story.nodeId, 'away-orin-leave');
  assert.match(opening(s), /walk with the carters on the Highpass road/); assert.doesNotMatch(opening(s), /relief carts/);
  const raw = file('away');
  const group = raw.orin.leave.lines[1].oneOf, last = group[group.length - 1];
  assert.equal(last.text, "I'm going to walk with the relief carts for a while. Somebody has to load them. I'm good at it.");
  assert.equal(last.when, undefined, 'Book Two\'s line is the ungated default');
  for (const who of ['orin', 'maren', 'nessa']) for (const kind of ['leave', 'back']) for (const l of everyLine(raw[who][kind])) if (/Highpass road|up north|nine hundred years/.test(l.text || l.narrate)) assert.ok(['b3_done', 'b4_parttwo_done'].includes(l.when.flag), `${who} ${kind}`);
});

test('the chapter\'s own companion is in one place when they roll the peaceful way', () => {
  const said = (id, who) => outcomeForRoller(STORY_NODES[`q-${id}-crisis`].choices.find((c) => c.id === 'resolve').success, { id: who }).text;
  // Orin out on the plank, or Orin at the near end, never both.
  assert.match(said('b4-davin', 'player'), /He does not go out/);
  assert.doesNotMatch(said('b4-davin', 'orin'), /He does not go out|Orin is at the near end/);
  assert.match(said('b4-davin', 'orin'), /Maren takes the near end of the rope[^]*Orin goes out/);
  assert.match(said('b4-key', 'player'), /Nessa does not go down/);
  assert.doesNotMatch(said('b4-key', 'nessa'), /Nessa does not go down/);
  assert.match(said('b4-key', 'nessa'), /Nessa goes down first, because she always does/);
  // The rope is held by as many miners as came.
  assert.match(told(choose(strong(at('b4-key', { phase: 'crisis', flags: { 'approach:b4-key': true } })), 'resolve')), /sixty miners/);
  assert.match(told(choose(strong(at('b4-key', { phase: 'crisis' })), 'resolve')), /the miners on the lid paying it out/);
  // With Nessa away and Wren cast, nobody climbs the hill.
  const away = opening(at('b4-key', { phase: 'after', flags: { 'method:b4-key': 'peace', b3_wren_cast: true }, party: ['orin', 'maren'] }));
  assert.match(away, /the tenth bell rings once/); assert.doesNotMatch(away, /Wren keeps the key|on her stick/);
  // The chapter 5 answers do not name Orin on their labels.
  for (const d of QUESTS['b4-davin'].decisions.filter((x) => x.id !== 'mags')) assert.doesNotMatch(`${d.label} ${d.description}`, /Orin/, d.id);
});

// ---------------------------------------------------------------------------
// Chapters 8 to 10, the end of Part One, and the chapter rewards.

test('chapter 8 reads how Book Three left Vell, its door and Corvane; Aster speaks only from her bell, and at rest only through Fennick', () => {
  const start = (flags) => opening(departed('b4-letters', { flags }));
  // Nobody is left in an emptied Vell to recruit from, so Nessa is left out there.
  assert.match(opening(departed('b4-letters', { flags: { b3_bell_evacuate: true }, party: ['orin', 'maren'] })), /Vell is empty[^]*finishing the census/);
  assert.match(start({ b3_bell_aster: true }), /Vell's heart went dark in the spring/);
  assert.match(start({ b3_bell_aster: true, b3_promise_old: false, b3_promise_hesk: true }), /Aster Vey holds it from the great bell/);
  assert.match(start({ b3_bell_cast: true }), /this is the last summer they will hold the city/);
  assert.match(start({ b3_bell_cast: true, b3_promise_old: false, b3_stair_sealed: true }), /held by the voices in its bells, hundreds of them/);
  assert.match(start({}), /the casting wall has been washed/);
  // The way down: the seal opened for a day on the warrant, the open door, or the chained one.
  assert.match(start({ b3_promise_old: false, b3_stair_sealed: true, b3_door_kept: true }), /council's warrant[^]*for one day/);
  assert.doesNotMatch(start({ b3_promise_old: false, b3_stair_sealed: true }), /Corvane's authority|on Corvane's/);
  assert.match(start({ b3_door_kept: true }), /Oswin Pike's lamps in a ring on the rim/);
  assert.match(start({ b3_door_closed: true }), /runs the chain back out/);
  // Corvane where Book Three put him; he talks only where he is at Vell.
  assert.match(start({ b3_corvane_judged: true }), /in a cell at Highpass/);
  assert.match(opening(departed('b4-letters', { flags: { b3_corvane_keeper: true, b3_bell_evacuate: true }, party: [] })), /the wall walk of an empty city/);
  assert.match(start({ b3_corvane_vell: true }), /people step round him/);
  assert.ok(!talkIds('b4-letters', { flags: { b3_corvane_judged: true } }).includes('corvane'));
  assert.match(talk('b4-letters', 'corvane', { flags: { b3_corvane_keeper: true } }), /^Corvane: I kept a ledger of the lost/m);
  // Aster: in Vell's great bell she speaks; at rest Fennick reads her last words; otherwise no talk.
  assert.ok(!talkIds('b4-letters').includes('aster'));
  const resting = talk('b4-letters', 'aster', { flags: { b3_bell_aster: true } });
  assert.match(resting, /The great bell is dark[^]*Tell Tovin to ring it by hand/); assert.doesNotMatch(resting, /^Aster Vey:/m);
  assert.match(talk('b4-letters', 'aster', { flags: { b3_bell_aster: true, b3_promise_old: false, b3_promise_hesk: true } }), /^Aster Vey: Letters\. Of course it's letters/m);
  // Rue reads the letter only when she walks with you; Fennick otherwise.
  assert.match(talk('b4-letters', 'letter', { flags: { b4_rue_party: true } }), /^Rue: 'To whoever is on the other side of the bells\. This is Thrum/m);
  assert.match(talk('b4-letters', 'letter'), /Fennick reads it aloud[^]*This is Thrum/);
  assert.doesNotMatch(talk('b4-letters', 'letter'), /^Rue:/m);
  // On the floor: the giving, Hesk's ring, or one set of boots going north (Hesk went down alone).
  for (const [flags, line] of [[{}, /witness's table/], [{ b3_promise_old: false, b3_promise_hesk: true }, /the ring of bells that was Hesk's company/], [{ b3_promise_old: false, b3_stair_sealed: true }, /one set of boot-prints, months old, going north/]])
    assert.match(opening(at('b4-letters', { phase: 'approach', flags })), line);
  assert.match(talk('b4-letters', 'fennick', { flags: { b3_promise_old: false, b3_stair_sealed: true } }), /Went down, one/);
  assert.match(told(choose(strong(departed('b4-letters')), 'investigate')), /The oldest are on vellum[^]*ask only for someone to write back/);
});

test('chapter 8\'s answers: the satchel costs each carrier a memory, the copies keep the clerks below, the letter back is given; the camp names the 3rd job\'s skill', () => {
  const read = told(decide('b4-letters', 'read'));
  for (const line of [/Orin carries it/, /Maren carries it/, /Nessa carries it/, /You carry it for the last hour/]) assert.match(read, line);
  const alone = told(decide('b4-letters', 'read', { party: [] }));
  assert.match(alone, /You carry it for the last hour/); assert.doesNotMatch(alone, /Orin|Maren|Nessa/);
  assert.match(told(decide('b4-letters', 'copied')), /numbering the pages/);
  // Only Maren's turn with the satchel marks what it took from her; a sealed stair needs a second warrant for the week of copying.
  assert.equal(decide('b4-letters', 'read').story.flags.b4_letters_maren, true);
  assert.ok(!decide('b4-letters', 'read', { party: ['orin', 'nessa'] }).story.flags.b4_letters_maren);
  assert.doesNotMatch(told(decide('b4-letters', 'copied')), /The warrant says one day/);
  assert.match(told(decide('b4-letters', 'copied', { flags: { b3_promise_old: false, b3_stair_sealed: true } })), /The warrant says one day[^]*six days more/);
  assert.match(told(decide('b4-letters', 'answered')), /You cannot remember a word of what you said/);
  for (const [decision, line] of [['read', /tied with red tape, and nobody touches it/], ['copied', /still at the bottom of the stair, copying/], ['answered', /try to remember what you wrote/]]) assert.match(opening(decide('b4-letters', decision)), line, decision);
  // Every 2nd job branch has its 3rd job's level 48 skill named, by the companion who would see it, or told when they are away.
  const SKILLS = { guardian: 'Iron Hide', duelist: 'Keen Edge', warlord: 'Veteran Captain', shadow: 'Blade in the Dark', saboteur: 'Master Tinker', grifter: 'Informants',
    evoker: 'Overchannel', chronist: 'Temporal Poise', binder: 'Pact Strength', lifewarden: 'Blessed Hands', exorcist: "Inquisitor's Zeal", battlepriest: 'Consecrated Plate',
    beastwarden: 'Alpha Bond', deadeye: 'Longshot', pathfinder: 'Seasoned Traveller', lorekeeper: 'Vast Learning', battlecantor: 'Rousing Voice', envoy: 'Diplomatic Immunity' };
  const jobs = require('../src/data/jobs.json').classes;
  for (const [classId, c] of Object.entries(jobs)) for (const branch of c.branches) assert.equal(branch.thirdSkills.find((x) => x.level === 48)?.name, SKILLS[branch.id], `${classId}/${branch.id}`);
  const camp = (spec, party) => { const s = at('b4-letters', { phase: 'after', party, flags: { 'method:b4-letters': 'peace' } }); s.player.progression.specialization = spec; return opening(choose(s, 'read')); };
  for (const [spec, name] of Object.entries(SKILLS)) {
    const line = RAWS['letters-camp'].nodes.stair.lines.find((l) => l.say && l.when?.spec === spec);
    assert.match(camp(spec), new RegExp(`^${{ orin: 'Orin', maren: 'Maren', nessa: 'Nessa' }[line.say]}: .*${name}`, 'm'), spec);
    const away = camp(spec, ['orin', 'maren', 'nessa'].filter((x) => x !== line.say));
    assert.match(away, new RegExp(name), `${spec} with ${line.say} away`); assert.doesNotMatch(away, COMPANION_NAMES[line.say], spec);
    assert.equal((camp(spec).match(new RegExp(name, 'g')) || []).length, 1, `${spec}: told once`);
  }
  assert.match(camp('none'), /you stopped counting the steps/);
});

test('chapter 9 reads who chairs, Hesk by the ending, the delegates\' votes by every earlier answer, and whose men are on the road', () => {
  assert.match(opening(departed('b4-embassy', { flags: { elske_seat: true } })), /Elske has the chair this session/);
  assert.match(opening(departed('b4-embassy')), /Brannagh of Fenmere has the chair again/);
  for (const [flag, line] of [['elske_seat', /^Elske: I rang the Mother Bell/m], ['elske_judged', /from the Sallows hospice in Merrowgate/], ['elske_free', /written from the harbour hospice in Merrowgate, where she works now/]]) assert.match(talk('b4-embassy', 'elske', { flags: { [flag]: true } }), line, flag);
  assert.ok(!talkIds('b4-embassy').includes('elske'), 'an old save has no Elske lines');
  assert.match(talk('b4-embassy', 'hesk'), /in his cell under the gatehouse/);
  assert.match(talk('b4-embassy', 'hesk', { flags: { b3_promise_old: false, b3_promise_hesk: true } }), /The willing were a luxury\. Strangers are a luxury\./);
  assert.ok(!talkIds('b4-embassy', { flags: { b3_promise_old: false, b3_stair_sealed: true } }).includes('hesk'), 'Hesk went down the stair');
  assert.match(talk('b4-embassy', 'ailith'), /My grandchildren didn't do this\./);
  assert.ok(!talkIds('b4-embassy').includes('rue')); assert.match(talk('b4-embassy', 'rue', { flags: { b4_rue_council: true } }), /I am keeping it for you/);
  const clue = (flags) => told(choose(strong(departed('b4-embassy', { flags })), 'investigate'));
  for (const [flags, line] of [[{ b4_truth_published: true }, /off a door, all at once/], [{ b4_truth_council: true }, /had the founders' page from the council first/], [{ b4_truth_ailith: true }, /in Ailith's own voice/],
    [{ b4_letters_read: true }, /tell us what we did/], [{ b4_letters_copied: true }, /Fennick's copies are still being made/], [{ b4_letters_answered: true }, /the first letter south to north/],
    [{ b4_bw_quiet: true }, /one night a month costs/], [{ b4_bw_pim: true }, /Pim's rule/], [{ b4_bw_rings: true }, /keeps its watch every night/],
    [{ b4_company_broken: true }, /until the council broke its charter/], [{ b4_company_sails: true }, /went north in the summer with its charter/], [{ b4_company_council: true }, /the council's name painted on/]])
    assert.match(clue(flags), line, JSON.stringify(flags));
  // Cass Ord's men with the charter broken or sailed; rope-men otherwise.
  for (const flag of ['b4_company_broken', 'b4_company_sails']) assert.match(opening(at('b4-embassy', { phase: 'crisis', flags: { [flag]: true } })), /Cass Ord's men[^]*^A man in a good coat:/m, flag);
  assert.match(opening(at('b4-embassy', { phase: 'crisis', flags: { b4_company_council: true } })), /They are rope-men[^]*^A rope-man:/m);
  // The vote passes in every answer; by how much follows the letters and the page.
  assert.match(told(decide('b4-embassy', 'council', { flags: { b4_letters_read: true } })), /by a wide margin/);
  assert.match(told(decide('b4-embassy', 'council')), /by four votes/);
  assert.match(told(decide('b4-embassy', 'refuge')), /by one vote, cast by the chair/);
  assert.match(told(decide('b4-embassy', 'own', { flags: { elske_seat: true } })), /^Elske: Then your word's your own/m);
  // Brannagh's goats, after the vote.
  for (const [decision, line] of [['council', /Seal and all/], ['own', /You're your own/], ['refuge', /Ten thousand beds/]]) assert.match(opening(decide('b4-embassy', decision)), line, decision);
  assert.match(opening(decide('b4-embassy', 'own')), /^Brannagh: Are there goats\?[^]*Nobody knows\.[^]*^Nessa: There's always goats[^]*^Brannagh: Then I'll get on with them\./m);
  assert.doesNotMatch(opening(decide('b4-embassy', 'own', { party: ['orin', 'maren'] })), /get on with them|Nessa/);
});

test('chapter 10 goes to the Hall with all three, tops the hero up to 50, and ends Part One at the north door', () => {
  assert.match(opening(departed('b4-peaks')), /nine statues stand in a row[^]*small, no bigger than a bucket, and black with age/);
  assert.match(opening(departed('b4-peaks', { flags: { b4_davin_comes: true } })), /Davin walks behind Orin/);
  assert.doesNotMatch(opening(departed('b4-peaks', { flags: { b4_davin_comes: true }, party: ['maren', 'nessa'] })), /Orin/);
  assert.doesNotMatch(opening(departed('b4-peaks', { flags: { b4_davin_home: true } })), /Davin/);
  assert.match(talk('b4-peaks', 'rue'), /The year the bells went south, the white doubled/);
  assert.match(talk('b4-peaks', 'rue', { flags: { b4_book_burned: true } }), /before it burned/);
  assert.match(talk('b4-peaks', 'linus'), /I'm not going north/);
  assert.ok(!talkIds('b4-peaks', { flags: { b4_davin_home: true } }).includes('davin'));
  assert.match(talk('b4-peaks', 'davin', { flags: { b4_davin_comes: true } }), /^Orin: Most things that matter[^]*^Davin: Like a lamp/m);
  assert.match(told(choose(strong(departed('b4-peaks')), 'investigate')), /Rung once, to part\. Ring it again and all will answer\./);
  // Nessa goes first on the rope, unless she is away; the roller is second.
  const across = (who, party) => outcomeForRoller(STORY_NODES['q-b4-peaks-crisis'].choices.find((c) => c.id === 'resolve').success, { id: who }).text;
  assert.match(across('player'), /Nessa goes first, as she said she would[^]*and you go second/);
  assert.match(across('orin'), /and Orin goes second/);
  assert.match(across('nessa'), /Nessa goes first, with the end of the rope round her waist, reading the line/);
  // The answers are read by Linus's first true verse.
  for (const [decision, line] of [['rung', /that rang once, and every bell in the south answered it/], ['unannounced', /that nobody rang\. And these went quietly down/], ['gave', /knelt at the north door and gave/]]) {
    let s = decide('b4-peaks', decision);
    assert.equal(s.story.nodeId, 'scene-b4-partone-end-door', decision);
    s = choose(s, 'answer');
    assert.match(opening(s), line, decision);
    s = choose(s, 'down');
    assert.equal(s.story.flags.b4_partone_done, true); assert.equal(s.story.nodeId, 'town-highpass', decision);
    assert.equal(Book.chapter(s).id, 'to-be-continued');
  }
  assert.match(told(decide('b4-peaks', 'rung')), /That is Lantry, under that/);
  assert.match(told(decide('b4-peaks', 'gave')), /a giver came from the south/);
  // At the north door each companion says what they are bringing, and nobody away is named.
  const door = (opts) => opening(decide('b4-peaks', 'rung', opts));
  assert.match(door({ flags: { b4_key_carried: true, b4_davin_comes: true } }), /^Orin: Davin\.[^]*^Maren: Ears\.[^]*^Nessa: The key\.[^]*^Davin: Lamps\./m);
  assert.doesNotMatch(door({ party: [] }), /Orin|Maren|Nessa/);
  assert.match(door({ flags: { b4_letters_maren: true } }), /^Maren: Ears\. And a door I can't see the colour of any more/m);
  assert.doesNotMatch(door({}), /colour/);
  // A hero behind is carried to 50 by chapter 10, after its own XP.
  const s = playPeaceful('b4-peaks', 'unannounced');
  assert.equal(s.player.level, 50);
});

test('each Book Four chapter in Part One gives its own Legendary reward, worn from two levels below the chapter and never sold', () => {
  const GEAR = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/gear.json'), 'utf8'));
  const Gear = require('../src/gear');
  const { ITEMS } = require('../src/content'), { TOWNS } = require('../src/expansion');
  const rewards = GEAR.filter((i) => QUESTS[i.exclusive?.quest]?.book === 4 && QUESTS[i.exclusive.quest].part === 1);
  assert.deepEqual(rewards.map((i) => i.exclusive.quest), IDS, 'one for each chapter, in order');
  assert.deepEqual(rewards.map((i) => i.name), ["Walker's Tally-cord", "Founders' Account Case", 'The True Verse', 'North Company Cutlass', 'Lamp-store Hook', "Rue's Spare Book", 'Brass Key-cord', 'Floor-letter Satchel', 'Embassy Seal', 'Parting-hall Plate']);
  const sold = new Set(Object.values(TOWNS).flatMap((t) => [...t.stock, ...Object.values(t.stockByLevel || {}).flat()]));
  for (const item of rewards) {
    const q = QUESTS[item.exclusive.quest];
    assert.equal(item.requires.level, q.level - 2, item.id);
    assert.equal(item.rarity, 'Legendary', item.id);
    assert.ok(item.value >= Gear.minValue(item) && item.description && item.purpose, item.id);
    assert.ok(Object.values(item.requires.abilities || {}).every((n) => n <= 15), item.id);
    assert.ok(!sold.has(item.id), `${item.id} is never sold`);
    assert.match(Gear.purpose(ITEMS[item.id]), new RegExp(`Reward for finishing ${q.name}`), item.id);
  }
  // Finishing a chapter gives its reward, once.
  for (const id of ['b4-walker', 'b4-letters', 'b4-peaks']) {
    const s = playPeaceful(id, Object.keys(EXPECT[id])[0]);
    const item = rewards.find((i) => i.exclusive.quest === id);
    assert.equal(s.player.inventory.filter((e) => e.itemId === item.id).length, 1, `${id} gives ${item.id}`);
    assert.equal(Gear.award(s, `quest:${id}`, []), null, `${id}: once`);
  }
});

test('with only Part One out, a save after chapter 10 never sees Lantry or Orme, and the Wold\'s reputation is not shown', () => {
  const s = ready(50, 'b4-peaks'); s.player.progression.thirdJob = true;
  for (const id of ['lantry', 'orme']) assert.equal(Book.townOpen(s, id), false, id);
  const D = require('../src/director');
  assert.ok(!D.SCHEMA.properties.destination.enum.includes('lantry'), 'Never offered to the AI storyteller.');
  const view = E.buildView(s);
  assert.ok(!view.world.towns.some((t) => ['lantry', 'orme'].includes(t.id)));
  assert.ok(!('wold' in view.world.reputation));
  // A save that somehow holds the town still cannot travel there.
  s.world.unlockedTowns.push('lantry');
  assert.equal(E.resolveAction(s, { type: 'travel-town', townId: 'lantry' }).result.ok, false);
});
