'use strict';
// Book Four, Part Two (docs/book-four/DESIGN.md, build step 6): chapters 11
// to 13 (Lantry, Sheddon, Orme), their camps, Lantry's two side jobs and the
// chapter rewards. Every part is previewed, with fixture chapters standing in
// for the ones not written yet (tests/fixtures/book-four.js). node --test runs
// each file in its own process, so these settings reach no other file.
// Nothing here calls the paid API. The lints that read the whole of Book
// Four's data (companion gates, names, flags read before they are set) are in
// tests/book-four-part-one.test.js and cover these chapters too.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), J = require('../src/journal');
const { STORY_NODES, ENEMIES, ENCOUNTERS, ITEMS } = require('../src/content');
const { QUESTS, SCENES, SIDE_JOBS, outcomeForRoller } = require('../src/expansion');
const GEAR = require('../src/data/gear.json');
const high = () => .999999, low = () => 0;

const IDS = ['b4-lantry', 'b4-sheddon', 'b4-orme'];
const JOB_IDS = ['painted-door', 'white-wool'];
const RAWQ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/quests.json'), 'utf8'));
const RAWS = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/scenes.json'), 'utf8'));
const RAWJ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/side-jobs.json'), 'utf8'));
const entries = (raw) => Object.entries(raw).filter(([k]) => !k.startsWith('_'));
const sceneOf = (id) => Object.values(SCENES).find((x) => x?.after === id);
const home = (id) => QUESTS[id].nextTown || QUESTS[id].town;

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
const BOOK_THREE = { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true };
// Part One as most saves will have left it: Davin north, Rue's book given back, the bell left alone.
const PART_ONE = { b4_rue_party: true, b4_davin_comes: true, b4_book_returned: true, b4_key_carried: true, b4_letters_read: true, b4_embassy_council: true, b4_unannounced: true, b4_partone_done: true };
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
function hero(level) { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true }); return s; }
// A hero in the town where a chapter starts, every chapter before it done, with the towns the story has reached.
function at(id, { party = ['orin', 'maren', 'nessa'], flags = {}, phase } = {}) {
  const q = QUESTS[id];
  let s = hero(q.level); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  const reached = new Set(FREE_TOWNS);
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; if (other.nextTown) reached.add(other.nextTown); }
  s.world.unlockedTowns = [...reached]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, BOOK_THREE, PART_ONE, flags); W.init(s);
  if (party.includes('nessa')) { s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass'; s = act(s, { type: 'recruit' }).state; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`; }
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
const departed = (id, opts) => act(at(id, opts), { type: 'depart', questId: id }).state;
const talk = (id, talkId, opts) => told(choose(departed(id, opts), `talk-${talkId}`));
const talkIds = (id, opts) => E.buildView(departed(id, opts)).scene.choices.filter((c) => c.id.startsWith('talk-') && !c.locked).map((c) => c.id.slice(5));
const decide = (id, decision, opts = {}) => choose(at(id, { ...opts, phase: 'after', flags: { [`method:${id}`]: 'peace', ...(opts.flags || {}) } }), decision);
const sceneText = (s) => { let out = ''; for (let i = 0; i < 4 && s.story.nodeId.startsWith('scene-'); i++) { out += `${opening(s)}\n`; s = choose(s, E.buildView(s).scene.choices.find((c) => !c.locked).id); } return out; };
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
const COMPANION_NAMES = { orin: /\b(Orin|Stoneward)\b/, maren: /\bMaren\b|\bSister\b(?! Ilse)/, nessa: /\b(Nessa|Reed|Biscuit)\b/ };

// Each decision: its flag, its approval, its reputation, and the party it needs (chapter 12's last answer is for Orin away).
const EXPECT = {
  'b4-lantry': { gave: ['b4_gave_lantry', { maren: 1 }, { wold: 1 }], rang: ['b4_rang_lantry', {}, { wardens: 1 }], waited: ['b4_waited_lantry', { nessa: -1 }, { wilds: 1 }] },
  'b4-sheddon': { ordered: ['b4_orin_ordered', { orin: 1, nessa: -1 }, { wardens: 1 }], orinback: ['b4_orin_went_back', {}, { wold: 1 }],
    heroback: ['b4_hero_went_back', { orin: -1 }, { wold: 1 }], 'heroback-away': ['b4_hero_went_back', {}, { wold: 1 }, ['maren', 'nessa']], onward: ['b4_hero_ordered', { nessa: -1 }, { wardens: 1 }, ['maren', 'nessa']] },
  'b4-orme': { truth: ['b4_tally_truth', {}, { wold: 1 }], reasons: ['b4_tally_reasons', {}, { wold: 1 }], wait: ['b4_tally_wait', {}, { wardens: 1 }] }
};

test('chapters 11 to 13 follow Part One in Book Four\'s own file: white, from Highpass to Lantry and Orme, each paying exactly one level', () => {
  assert.deepEqual(FX.WRITTEN, [...FX.IDS.slice(0, 10), ...IDS]);
  assert.deepEqual(IDS.map((id) => { const q = QUESTS[id]; return [q.id, q.book, q.part, q.level, q.unlock, q.town, q.nextTown, q.white, q.faction]; }), [
    ['b4-lantry', 4, 2, 50, 'b4-peaks', 'highpass', 'lantry', true, 'wold'],
    ['b4-sheddon', 4, 2, 51, 'b4-lantry', 'lantry', 'orme', true, 'wold'],
    ['b4-orme', 4, 2, 52, 'b4-sheddon', 'orme', 'orme', true, 'wold']
  ]);
  for (const id of IDS) {
    const q = QUESTS[id];
    assert.equal(q.name, RAWQ[id].name, `${id} is read from src/data/book-four/quests.json`);
    assert.equal(q.xp, P.levelBand(q.level), `${id} pays exactly one level`);
    assert.equal(q.gold, 20 * q.level + 40, `${id} gold`);
    for (const key of ['opening', 'approach', 'crisis', 'after']) assert.ok(Array.isArray(q[key]) && q[key].length, `${id}.${key}`);
    assert.ok(q.talks.length >= 4, `${id} talks`);
    assert.deepEqual(q.decisions.map((d) => d.id), Object.keys(EXPECT[id]), id);
    assert.ok(q.told?.ballad && q.told?.tally, `${id}: the Telling has one line for the chapter`);
    for (const d of q.decisions) if (d.told) assert.ok(d.told.ballad && d.told.tally, `${id}/${d.id}: a decision's own told has both lines`);
    assert.equal(q.needs, undefined, `${id}: nobody walks out in the Wold, so no chapter needs anyone`);
    assert.equal(q.levelFloor, undefined, `${id}: only the end of a part tops a hero up`);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
    assert.equal(ENCOUNTERS[`quest:${id}`].victoryNode, `q-${id}-after`);
    // The clue makes the peaceful way's first line, and the careful route its second.
    assert.equal(q.peaceful.success.filter((l) => l.when?.flag === `prepared:${id}`).length, 1, id);
    assert.equal(q.peaceful.success.filter((l) => l.when?.flag === `approach:${id}`).length, 1, id);
  }
});

test('each chapter has one camp scene: an empty cast, one node, the camp beat, and choices that change nothing', () => {
  assert.deepEqual(entries(RAWS).filter(([, v]) => IDS.includes(v.after)).map(([k, v]) => [k, v.after]), [['lantry-camp', 'b4-lantry'], ['sheddon-camp', 'b4-sheddon'], ['orme-camp', 'b4-orme']]);
  for (const id of IDS) {
    const scenes = Object.values(SCENES).filter((x) => x?.after === id);
    assert.equal(scenes.length, 1, id);
    const [scene] = scenes;
    assert.deepEqual(scene.cast, [], scene.id);
    assert.deepEqual(Object.keys(scene.nodes), [scene.start], `${scene.id}: one node`);
    assert.equal(scene.nodes[scene.start].objective, 'Camp.');
    for (const c of scene.nodes[scene.start].choices) assert.ok(!c.next && !c.approval && !c.setFlags, `${scene.id}/${c.id}`);
  }
});

test('every chapter plays to its end peacefully, by every answer, sets only its flag, levels the hero by one, and its camp leads to the next town', () => {
  for (const id of IDS) for (const [decision, [flag, , , party]] of Object.entries(EXPECT[id])) {
    const s = playPeaceful(id, decision, party ? { party } : {});
    assert.ok(s.world.completed[id], `${id}/${decision}`);
    assert.equal(s.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(EXPECT[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(s.story.flags[other], undefined, `${id}/${decision} not ${other}`);
    assert.equal(s.player.level, QUESTS[id].level + 1, `${id}: after chapter N the hero is level 40 + N`);
    assert.equal(s.player.xp, P.XP_NEXT[QUESTS[id].level - 1] + QUESTS[id].xp, `${id}: exactly the chapter's XP`);
    const scene = sceneOf(id);
    assert.equal(s.story.nodeId, `scene-${scene.id}-${scene.start}`, `${id}: its camp follows`);
    assert.equal(toTown(s).story.nodeId, `town-${home(id)}`, `${id}/${decision}`);
  }
  // Chapter 11 opens Lantry, which chapter 12 leaves from; chapter 12 ends in Orme.
  assert.ok(playPeaceful('b4-lantry', 'gave').world.unlockedTowns.includes('lantry'));
  assert.ok(playPeaceful('b4-sheddon', 'ordered').world.unlockedTowns.includes('orme'));
});

test('a decision changes exactly the approval and the reputation the design gives it; the Wold\'s moves with its own answers', () => {
  for (const [id, decisions] of Object.entries(EXPECT)) for (const [decision, [, approval, rep, party]] of Object.entries(decisions)) {
    const d = QUESTS[id].decisions.find((x) => x.id === decision);
    assert.deepEqual(d.approval || {}, approval, `${id}/${decision}`);
    assert.deepEqual(d.rep, rep, `${id}/${decision}`);
    const s = at(id, { phase: 'after', party: party || ['orin', 'maren', 'nessa'], flags: { [`method:${id}`]: 'peace' } });
    for (const m of s.party) m.bond = 2;
    const before = { ...s.world.reputation };
    const after = choose(s, decision);
    for (const m of after.party) assert.equal(bond(after, m.id), 2 + (approval[m.id] || 0), `${id}/${decision}/${m.id}`);
    for (const [faction, n] of Object.entries(rep)) assert.equal(after.world.reputation[faction], (before[faction] || 0) + n, `${id}/${decision}/${faction}`);
  }
  assert.ok(Object.values(EXPECT).some((d) => Object.values(d).some((x) => x[2].wold)), 'Part Two moves the Wold');
});

test('each crisis can be fought instead, and winning reaches the same ending told the way it was won; the white is in every fight', () => {
  for (const [id, fought] of [['b4-lantry', /scraped and trampled where the fight was/], ['b4-sheddon', /trampled grey where the fight was/], ['b4-orme', /bandages and lamps/]]) {
    const failed = act(at(id, { phase: 'crisis' }), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    let s = choose(at(id, { phase: 'crisis' }), 'confront');
    assert.ok(s.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    assert.ok(s.combat.actors.some((a) => a.conditions.some((c) => c.id === 'slowed' && c.white)), `${id}: the white slows whoever is not warm`);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    assert.match(opening(s), fought, id);
    assert.doesNotMatch(opening(s), /[Nn]obody is hurt/, id);
    s = choose(s, QUESTS[id].decisions[0].id);
    assert.ok(s.story.nodeId.startsWith('scene-'), id);
  }
});

test('with no companions, and with each one away, every chapter, camp and job is told whole, with no empty line, no token and no absent companion', () => {
  const parties = [[], ['maren', 'nessa'], ['orin', 'nessa'], ['orin', 'maren'], ['orin', 'maren', 'nessa']];
  const clean = (text, party, where) => {
    assert.ok(text && text.trim().length, `${where}: something is told`);
    assert.doesNotMatch(text, /\n\s*\n|undefined|null|[{}@]/, `${where}: no empty line or token`);
    for (const who of ['orin', 'maren', 'nessa']) if (!party.includes(who)) assert.doesNotMatch(text, COMPANION_NAMES[who], `${where}: ${who} is away`);
  };
  for (const flags of [{}, { b4_davin_comes: false, b4_davin_home: true, b4_book_returned: false, b4_book_burned: true }]) for (const id of IDS) for (const party of parties) {
    const opts = { party, flags };
    clean(opening(departed(id, opts)), party, `${id} opening [${party}]`);
    for (const t of talkIds(id, opts)) clean(talk(id, t, opts), party, `${id}/${t} [${party}]`);
    for (const phase of ['approach', 'crisis']) clean(opening(at(id, { ...opts, phase })), party, `${id} ${phase} [${party}]`);
    const after = at(id, { ...opts, phase: 'after', flags: { ...flags, [`method:${id}`]: 'peace' } });
    const open = E.buildView(after).scene.choices.filter((c) => !c.locked).map((c) => c.id);
    assert.ok(open.length >= 1, `${id} [${party}]: an answer is open`);
    clean(opening(after), party, `${id} after [${party}]`);
    for (const d of QUESTS[id].decisions.filter((x) => open.includes(x.id))) {
      const r = choose(at(id, { ...opts, phase: 'after', flags: { ...flags, [`method:${id}`]: 'peace' } }), d.id);
      clean(told(r), party, `${id}/${d.id} [${party}]`);
      clean(sceneText(r), party, `${id}/${d.id} camp [${party}]`);
    }
  }
  // Every job, every way, with every party.
  for (const id of JOB_IDS) for (const party of parties) {
    const job = SIDE_JOBS[id];
    for (const c of STORY_NODES[`job-${id}-${job.start}`].choices) for (const rng of c.check ? [high, low] : [high]) {
      let s = at('b4-orme', { party, flags: { b4_company_council: true } }); s.world.townId = 'lantry'; s.story.nodeId = 'town-lantry';
      s = act(s, { type: 'side-job', jobId: id }).state;
      clean(opening(s), party, `${id} [${party}]`);
      s = act(s, { type: 'story-choice', choiceId: c.id }, rng).state;
      clean(told(s), party, `${id}/${c.id} [${party}]`);
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
  const sheddon = STORY_NODES['q-b4-sheddon-start'].choices.find((c) => c.id === 'investigate').failure;
  assert.match(outcomeForRoller(sheddon, { id: 'player' }).text, /All you can be sure of/);
  assert.match(outcomeForRoller(sheddon, { id: 'maren' }).text, /All she can be sure of/);
});

test('every flag Part Two sets is read: by its own camp, a later chapter or both', () => {
  const sets = new Set();
  JSON.stringify(IDS.map((id) => RAWQ[id]), (k, v) => { if (v && Array.isArray(v.decisions)) for (const d of v.decisions) sets.add(d.flag); return v; });
  assert.deepEqual([...sets].sort(), ['b4_gave_lantry', 'b4_hero_ordered', 'b4_hero_went_back', 'b4_orin_ordered', 'b4_orin_went_back', 'b4_rang_lantry', 'b4_tally_reasons', 'b4_tally_truth', 'b4_tally_wait', 'b4_waited_lantry']);
  const text = JSON.stringify([...IDS.map((id) => RAWQ[id]), ...entries(RAWS).map(([, s]) => s), ...entries(RAWJ).map(([, j]) => j)]);
  for (const flag of sets) assert.ok(text.includes(`"flag":"${flag}"`) || new RegExp(`"anyFlag":\\[[^\\]]*"${flag}"`).test(text), `${flag} is read`);
  // Chapter 12 reads chapter 11, and chapter 13 reads both.
  assert.match(opening(departed('b4-sheddon', { flags: { b4_rang_lantry: true } })), /the night the pots were rung/);
  assert.doesNotMatch(opening(departed('b4-sheddon')), /pots/);
  for (const [flags, line] of [[{ b4_gave_lantry: true }, /gave at our well/], [{ b4_rang_lantry: true }, /The southerners rang/], [{ b4_waited_lantry: true }, /went in, as guests do/]]) assert.match(talk('b4-orme', 'burdock', { flags }), line);
  for (const [flags, line] of [[{ b4_orin_went_back: true }, /his mother on his arm/], [{ b4_orin_ordered: true }, /comes in on his own/]]) {
    let s = strong(departed('b4-orme', { flags })); s = choose(s, 'investigate'); s = choose(s, 'advance');
    assert.match(opening(s), line);
  }
});

test('chapter 12 with Davin left to Mags: the word was hers, not Orin\'s', () => {
  const MAGS = { b4_davin_mags: true };
  const home = { ...MAGS, b4_davin_comes: false, b4_davin_home: true }, north = { ...MAGS, b4_davin_comes: true };
  const orinHome = talk('b4-sheddon', 'orin', { flags: home });
  assert.match(orinHome, /Mags said no for him, at Saltwick\. [^\n]*still never given an order/);
  assert.doesNotMatch(orinHome, /I've given one order in my life/);
  const orinNorth = talk('b4-sheddon', 'orin', { flags: north });
  assert.match(orinNorth, /Mags sent Davin with me\./);
  assert.doesNotMatch(orinNorth, /I gave Davin my word/);
  const davin = talk('b4-sheddon', 'davin', { flags: north });
  assert.match(davin, /^Orin: You'll do what you're told\. Your gran sent you with me for that\./m);
  assert.doesNotMatch(davin, /That was the word/);
  assert.match(talk('b4-sheddon', 'davin'), /That was the word\./);
  const back = told(decide('b4-sheddon', 'orinback', { flags: north }));
  assert.match(back, /That's your order\. Your gran sent you with me for this\. Keep it\./);
  assert.doesNotMatch(back, /it's the word/);
  assert.match(told(decide('b4-sheddon', 'orinback')), /it's the word, and you keep it/);
});

test('chapter 13 knows who came up from the south: Hesk, the Company\'s wagons, the council\'s carts, the seal', () => {
  const burdock = (flags) => talk('b4-orme', 'burdock', { flags });
  assert.match(burdock({ b4_company_sails: true }), /Wagons came\. In the summer, forty/);
  assert.match(burdock({ b4_company_council: true }), /Carts came, to Lantry, with grain/);
  assert.match(burdock({}), /Nobody has ever come from the south to stay and be written\./);
  const after = (flags) => told(decide('b4-orme', 'wait', { flags }));
  assert.match(after({ b4_embassy_council: true }), /^Sloe: You carry their seal on a cord/m);
  assert.doesNotMatch(after({ b4_embassy_council: false, b4_embassy_own: true }), /You carry their seal/);
  const letter = opening(at('b4-orme', { phase: 'after', flags: { 'method:b4-orme': 'peace', b4_letters_answered: true } }));
  assert.match(letter, /Burdock: Before I write anything, I read what is already written\. This is yours\. 'To whoever is on the other side of the bells/);
});

test('chapter 11 reads how Part One came down to Lantry: the bell, the gift at the door, the Company, and Davin', () => {
  const open = (flags, party) => opening(departed('b4-lantry', { flags, party }));
  assert.match(open({ b4_unannounced: false, b4_parting_rung: true }), /'the bell'[^]*at noon yesterday/);
  assert.match(open({ b4_unannounced: false, b4_gave_door: true }), /'A giver came from the south\.'/);
  assert.match(open({}), /They have heard nothing/);
  assert.doesNotMatch(open({}), /the bell'|A giver came/);
  assert.match(open({ b4_company_council: true }), /relief convoy/);
  assert.match(open({ b4_company_sails: true }), /Forty wagons from the south/);
  assert.doesNotMatch(open({ b4_company_broken: true }), /convoy|wagons/);
  assert.match(open({}), /Davin keeps close behind Orin/);
  assert.match(open({}, ['maren', 'nessa']), /Davin reads the doors/);
  assert.doesNotMatch(open({ b4_davin_comes: false, b4_davin_home: true }), /Davin/);
  // Teasel reads the doors as Part One left them; Rue reads the book she has.
  assert.match(talk('b4-lantry', 'teasel', { flags: { b4_unannounced: false, b4_parting_rung: true } }), /I wrote that one myself, yesterday, forty times/);
  assert.match(talk('b4-lantry', 'teasel'), /Owe Sedge one hen/);
  assert.match(talk('b4-lantry', 'rue', { flags: { b4_book_returned: false, b4_book_burned: true } }), /since the fire at Highpass[^]*her name on my arm/);
  assert.match(talk('b4-lantry', 'rue'), /reads it, from the first page[^]*kind to the girl in it/);
  // Rue keeps the saddle's weather and the Wold's white apart.
  assert.match(talk('b4-lantry', 'rue'), /That was weather\. This is not\./);
});

test('chapter 11\'s answers: each companion gives a small thing, the pots send the white to Sheddon, and sheltering costs Lantry a name; the camp\'s letter is to Biscuit at Highpass', () => {
  const gave = told(decide('b4-lantry', 'gave'));
  for (const line of [/Orin gives the sound of the lamp-store door[^]*once for Davin/, /Maren gives the second verse/, /Nessa gives the taste of the bread/, /You give the colour of the first boots/]) assert.match(gave, line);
  assert.doesNotMatch(gave, /Davin gives/);
  const alone = told(decide('b4-lantry', 'gave', { party: [] }));
  assert.match(alone, /Davin gives the smell of lamp oil/); assert.doesNotMatch(alone, /Orin|Maren|Nessa/);
  assert.match(told(decide('b4-lantry', 'rang')), /That is the way to Sheddon/);
  assert.match(told(decide('b4-lantry', 'waited')), /His name was given in the night, for the guests' share/);
  assert.match(told(decide('b4-lantry', 'waited')), /^Nessa: There's an eight-year-old out there giving for me/m);
  const camp = sceneText(decide('b4-lantry', 'gave'));
  assert.match(camp, /'BISCUIT\. HIGHPASS\. THE GUARDROOM, BY THE BRAZIER\.'[^]*^Rue: Who is Biscuit\?/m);
  assert.doesNotMatch(sceneText(decide('b4-lantry', 'gave', { party: ['orin', 'maren'] })), /Biscuit|Nessa/);
  for (const [decision, line] of [['gave', /the night after the giving\. The town is quiet/], ['rang', /the night after the pots/], ['waited', /the smith's is the first/]]) assert.match(sceneText(decide('b4-lantry', decision)), line, decision);
});

test('chapter 12 is Orin\'s: the order is his to give, his answers need him there, and with him away the hero gives it', () => {
  const ids = (party) => E.buildView(at('b4-sheddon', { party, phase: 'after', flags: { 'method:b4-sheddon': 'peace' } })).scene.choices.filter((c) => !c.locked).map((c) => c.id);
  assert.deepEqual(ids(['orin', 'maren', 'nessa']), ['ordered', 'orinback', 'heroback']);
  assert.deepEqual(ids(['maren', 'nessa']), ['heroback-away', 'onward']);
  // Orin's orders follow Part One: with Davin home, he has given one already.
  assert.match(talk('b4-sheddon', 'orin', { flags: { b4_davin_comes: false, b4_davin_home: true } }), /I've given one order in my life\. 'No\.'/);
  assert.match(talk('b4-sheddon', 'orin'), /I gave Davin my word at Saltwick/);
  assert.match(talk('b4-sheddon', 'sedge'), /Lantry owes me a hen/);
  assert.ok(!talkIds('b4-sheddon', { flags: { b4_davin_comes: false, b4_davin_home: true } }).includes('davin'));
  // The answers.
  assert.match(told(decide('b4-sheddon', 'ordered')), /I gave the order\. Write that/);
  const back = told(decide('b4-sheddon', 'orinback'));
  assert.match(back, /^Orin: Davin\. Rear of the column\. You hold it/m);
  assert.match(back, /asks you what Varn's company was called\. There was a name/);
  assert.doesNotMatch(told(decide('b4-sheddon', 'orinback', { flags: { b4_davin_comes: false, b4_davin_home: true } })), /Davin/);
  assert.match(told(decide('b4-sheddon', 'heroback')), /^Orin: You took it off me/m);
  assert.match(told(decide('b4-sheddon', 'heroback')), /the day of the vote at Highpass/);
  assert.match(told(decide('b4-sheddon', 'heroback-away', { party: ['maren', 'nessa'] })), /Rue takes the front/);
  assert.doesNotMatch(told(decide('b4-sheddon', 'heroback')), /Rue takes the front/);
  assert.equal(bond(decide('b4-sheddon', 'heroback-away', { party: ['maren', 'nessa'] }), 'orin'), undefined);
  // The camp: Orin understands Varn's order, and does not forgive it.
  for (const [decision, line] of [['ordered', /Varn said the contract was the salt/], ['orinback', /lost the name of his/], ['heroback', /I was going to say 'on'/]]) {
    const camp = sceneText(decide('b4-sheddon', decision));
    assert.match(camp, line, decision); assert.match(camp, /I don't forgive him/, decision);
  }
  assert.match(sceneText(decide('b4-sheddon', 'orinback')), /^Davin: You came back\. With her\./m);
  assert.match(sceneText(decide('b4-sheddon', 'onward', { party: ['maren', 'nessa'] })), /the southerner said on/);
});

test('chapter 13 reads the Wold\'s last winter by the Book Three ending, Hesk only where the stair was sealed, and the letter back', () => {
  const sloe = (flags) => talk('b4-orme', 'sloe', { flags });
  assert.match(sloe({}), /The lightest in the tally/);
  assert.match(sloe({ b3_promise_old: false, b3_promise_hesk: true }), /The worst in the tally/);
  assert.match(sloe({ b3_promise_old: false, b3_promise_hesk: true, b3_three_told: true }), /by about a third/);
  assert.match(sloe({ b3_promise_old: false, b3_stair_sealed: true }), /a man came out of the marked way with a lamp/);
  for (const flags of [{}, { b3_promise_old: false, b3_stair_sealed: true }]) assert.match(sloe(flags), /The night of the great note/);
  const sealed = { b3_promise_old: false, b3_stair_sealed: true };
  assert.ok(talkIds('b4-orme', { flags: sealed }).includes('hesk') && !talkIds('b4-orme').includes('hesk'));
  assert.match(talk('b4-orme', 'hesk', { flags: sealed }), /That's more than you did/);
  assert.match(opening(departed('b4-orme', { flags: sealed })), /It is Hesk\./);
  assert.doesNotMatch(opening(departed('b4-orme')), /Hesk/);
  assert.match(talk('b4-orme', 'burdock', { flags: sealed }), /One came\. In the spring, with a lamp[^]*Nobody but the man with the lamp/);
  assert.match(opening(departed('b4-orme', { flags: { b4_letters_answered: true } })), /It is your letter, from the floor of given things/);
  assert.doesNotMatch(opening(departed('b4-orme')), /your letter/);
  const after = opening(at('b4-orme', { phase: 'after', flags: { 'method:b4-orme': 'peace', b4_letters_answered: true } }));
  assert.match(after, /We are coming north, to ask properly\./);
  // The answers, and the camp that reads them: Burdock spells Biscuit.
  assert.match(told(decide('b4-orme', 'truth')), /the Mother Bell that Elske rang/);
  assert.match(told(decide('b4-orme', 'reasons')), /two columns/);
  assert.match(told(decide('b4-orme', 'wait')), /We have waited nine hundred years/);
  for (const [decision, line] of [['truth', /bells and all/], ['reasons', /in its two columns/], ['wait', /'The south: not yet\.'/]]) assert.match(sceneText(decide('b4-orme', decision)), line, decision);
  const camp = sceneText(decide('b4-orme', 'truth'));
  assert.match(camp, /^Burdock: How do you spell Biscuit\?/m);
  assert.match(camp, /'Biscuit, a dog, of Highpass, grey at the mouth, kind\.'/);
  assert.doesNotMatch(sceneText(decide('b4-orme', 'truth', { party: ['orin', 'maren'] })), /Biscuit/);
});

test('the Telling: each chapter is told in the Journal, by the answer\'s own lines where it has them', () => {
  let s = playPeaceful('b4-sheddon', 'orinback');
  const entry = J.sync(s).telling.find((x) => x.id === 'told:b4-sheddon');
  assert.equal(entry.ballad, QUESTS['b4-sheddon'].decisions.find((d) => d.id === 'orinback').told.ballad);
  s = playPeaceful('b4-lantry', 'gave');
  assert.equal(J.sync(s).telling.find((x) => x.id === 'told:b4-lantry').tally, QUESTS['b4-lantry'].told.tally);
  s = playPeaceful('b4-lantry', 'rang');
  assert.match(J.sync(s).telling.find((x) => x.id === 'told:b4-lantry').tally, /The southerners rang/);
});

test('Lantry\'s two jobs are on its board once chapter 11 has opened it, The Painted Door until chapter 13 is done', () => {
  assert.deepEqual(JOB_IDS.map((id) => [SIDE_JOBS[id].town, SIDE_JOBS[id].from, SIDE_JOBS[id].until]), [['lantry', 'b4-lantry', 'b4-orme'], ['lantry', 'b4-lantry', undefined]]);
  const board = (upTo) => { const s = at(upTo); s.world.townId = 'lantry'; s.story.nodeId = 'town-lantry'; return (E.buildView(s).world.sideJobs || []).map((j) => j.id); };
  assert.deepEqual(board('b4-sheddon').filter((id) => JOB_IDS.includes(id)).sort(), ['painted-door', 'white-wool']);
  assert.deepEqual(board('b4-orme').filter((id) => JOB_IDS.includes(id)).sort(), ['painted-door', 'white-wool']);
  const done = at('b4-orme'); done.world.completed['b4-orme'] = { xp: 0, gold: 0 }; done.world.townId = 'lantry'; done.story.nodeId = 'town-lantry';
  assert.ok(!(E.buildView(done).world.sideJobs || []).some((j) => j.id === 'painted-door'), 'closed once chapter 13 is done');
  // Every way through pays once, in gold, at most 130 XP, never past the next chapter.
  for (const id of JOB_IDS) for (const c of STORY_NODES[`job-${id}-${SIDE_JOBS[id].start}`].choices) for (const rng of c.check ? [high, low] : [high]) {
    let s = at('b4-orme', { flags: { b4_company_council: true } }); s.world.townId = 'lantry'; s.story.nodeId = 'town-lantry';
    const xp = s.player.xp, gold = s.player.gold;
    s = act(s, { type: 'side-job', jobId: id }).state;
    s = act(s, { type: 'story-choice', choiceId: c.id }, rng).state;
    assert.equal(s.story.nodeId, 'town-lantry', `${id}/${c.id}`);
    assert.equal(s.story.flags[`job:${id}`], true, `${id}/${c.id}`);
    assert.ok(s.player.xp - xp <= 130 && s.player.gold - gold >= 120 && s.player.gold - gold <= 180, `${id}/${c.id}`);
    assert.ok(s.player.level <= QUESTS['b4-orme'].level, `${id}: never past the chapter`);
    assert.ok(Object.keys(s.story.flags).some((f) => f.startsWith(`job:${id}-`)), `${id}/${c.id} sets its answer`);
  }
  // The council's blankets are only there when the convoy crossed.
  const blankets = (flags) => { let s = at('b4-orme', { flags }); s.world.townId = 'lantry'; s.story.nodeId = 'town-lantry'; s = act(s, { type: 'side-job', jobId: 'white-wool' }).state; return E.buildView(s).scene.choices.find((c) => c.id === 'blankets'); };
  assert.ok(blankets({ b4_company_council: true }) && !blankets({ b4_company_council: true }).locked);
  assert.ok(!blankets({}) || blankets({}).locked);
});

test('chapters 11 to 13 each give their own Legendary reward, once, worn from two levels below the chapter, never sold; the scarf is warm', () => {
  const rewards = GEAR.filter((i) => IDS.includes(i.exclusive?.quest));
  assert.deepEqual(rewards.map((i) => [i.exclusive.quest, i.name, i.slot, i.requires.level]), [
    ['b4-lantry', "Door-reader's Scarf", 'accessory', 48], ['b4-sheddon', 'Sheddon Column Shield', 'offHand', 49], ['b4-orme', 'Long Tally Staff', 'mainHand', 50]]);
  for (const item of rewards) {
    assert.equal(item.rarity, 'Legendary', item.id);
    assert.equal(item.requires.level, QUESTS[item.exclusive.quest].level - 2, item.id);
    assert.ok((item.stats?.taken || 0) >= -0.15, item.id);
    for (const n of Object.values(item.requires.abilities || {})) assert.ok(n <= 15, item.id);
  }
  assert.equal(ITEMS['door-readers-scarf'].warm, true);
  assert.deepEqual(rewards.filter((i) => i.warm).map((i) => i.id), ['door-readers-scarf'], 'chapter 11 is the warm one, before the Wold\'s shops open');
  // Each has a skill, save or bonus that none of the Wold's warm shop pieces has, so none of them matches it.
  const shop = GEAR.filter((i) => i.warm && !i.exclusive);
  const keys = (i) => [...Object.keys(i.skillBonuses || {}).map((k) => `skill:${k}`), ...Object.keys(i.saveBonuses || {}).map((k) => `save:${k}`), ...(i.skill ? [`effect:${i.skill.effect}`] : []), ...(i.story ? [`story:${i.story.skill}`] : [])];
  for (const item of rewards) for (const w of shop) assert.ok(keys(item).some((k) => !keys(w).includes(k)), `${item.id} has something ${w.id} has not`);
  // Given once, when the chapter is done.
  let s = playPeaceful('b4-lantry', 'gave');
  assert.equal(s.player.inventory.filter((e) => e.itemId === 'door-readers-scarf').reduce((n, e) => n + e.quantity, 0), 1);
  s = playPeaceful('b4-orme', 'truth');
  assert.equal(s.player.inventory.filter((e) => e.itemId === 'long-tally-staff').reduce((n, e) => n + e.quantity, 0), 1);
});
