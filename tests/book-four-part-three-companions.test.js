'use strict';
// Book Four, Part Three, build step 10 (docs/book-four/DESIGN.md): the three
// companion chapters, 25 to 27, and their camps; The Lower Town and Walkers'
// Names; the companion keepsakes (requires.members); the stay lines; and the
// companion arc moves (engine change 14). Every part is previewed, with fixture
// chapters standing in for the ones not written yet (tests/fixtures/book-four.js).
// node --test runs each file in its own process, so these settings reach no
// other file. Nothing here calls the paid API. The lints that read the whole of
// Book Four's data are in tests/book-four-part-one.test.js and cover these too.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Gear = require('../src/gear'), Combat = require('../src/combat');
const R = require('../src/rules');
const { STORY_NODES, ENEMIES, ENCOUNTERS, ITEMS, COMPANIONS, CLASSES } = require('../src/content');
const { QUESTS, SCENES, SIDE_JOBS, outcomeForRoller } = require('../src/expansion');
const high = () => .999999, low = () => 0;

const IDS = ['b4-ford', 'b4-hospice', 'b4-signal'];
const RAWQ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/quests.json'), 'utf8'));
const RAWA = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/away.json'), 'utf8'));
const sceneOf = (id) => Object.values(SCENES).find((x) => x?.after === id);
const everyLine = (v) => { const out = []; JSON.stringify(v, (k, x) => { if (x && typeof x === 'object' && !Array.isArray(x) && (x.narrate !== undefined || x.say !== undefined)) out.push(x); return x; }); return out; };

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
const BOOK_THREE = { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true, b3_ashford_defended: true };
const PART_ONE = { b4_rue_party: true, b4_davin_comes: true, b4_book_returned: true, b4_key_carried: true, b4_letters_read: true, b4_embassy_council: true, b4_unannounced: true, b4_bw_quiet: true, b4_truth_published: true, b4_partone_done: true };
const PART_TWO = { b4_gave_lantry: true, b4_orin_ordered: true, b4_tally_truth: true, b4_names_written: true, b4_rue_kept: true, b4_demand_carried: true, b4_potbell_rota: true,
  b4_walkers_led: true, b4_tally_carried: true, b4_crossed: true, b4_parttwo_done: true };
const PART_THREE = { b4_accused_open: true, b4_vote_share: true, b4_voice_rings: true, b4_sable_taught: true };
// The other ways the story can have gone: Part Two's other endings, the other Book Three endings, the other Part One answers.
const HALL = { b4_crossed: false, b4_hall_camp: true, b4_walkers_led: false, b4_hush_rang: true, b3_promise_old: false, b3_stair_sealed: true, b3_ashford_defended: false, b3_ashford_cast: true,
  b4_davin_comes: false, b4_davin_home: true, b4_book_returned: false, b4_book_burned: true, b4_rue_kept: false, b4_rue_gave: true, b4_key_carried: false, b4_key_hew: true, mother_silenced: true, b3_sable_cast: true, b4_sable_taught: false, b4_sable_ailith: true };
const ENVOYS = { b4_crossed: false, b4_envoys_only: true, b4_walkers_led: false, b4_walkers_marked: true, b3_promise_old: false, b3_promise_hesk: true, b3_three_told: true, b3_ashford_defended: false, b3_ashford_children: true,
  elske_free: true, b3_varn_freed: true, b4_key_carried: false, b4_key_left: true, b3_wren_cast: true, b4_sable_taught: false, b4_sable_silent: true, b4_company_sails: true, 'job:bett-berth-signed': true };
const FLAGSETS = [{}, HALL, ENVOYS, { b3_orin_tried: true, b4_davin_mags: true, elske_seat: true, b4_key_left: true, b4_key_carried: false, b4_names_kept: true, b4_names_written: false, mother_recalled: true }];
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
function hero(level) { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true }); return s; }
function at(id, { party = ['orin', 'maren', 'nessa'], flags = {}, phase } = {}) {
  const q = QUESTS[id];
  let s = hero(q.level); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  const reached = new Set(FREE_TOWNS);
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; if (other.nextTown) reached.add(other.nextTown); }
  s.world.unlockedTowns = [...reached]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, BOOK_THREE, PART_ONE, PART_TWO, PART_THREE, flags); W.init(s);
  for (const [k, v] of Object.entries(s.story.flags)) if (v === false) delete s.story.flags[k];
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
const after = (id, opts = {}) => at(id, { ...opts, phase: 'after', flags: { [`method:${id}`]: 'peace', ...(opts.flags || {}) } });
const decide = (id, decision, opts = {}) => choose(after(id, opts), decision);
const sceneText = (s) => { let out = ''; for (let i = 0; i < 4 && s.story.nodeId.startsWith('scene-'); i++) { out += `${opening(s)}\n`; s = choose(s, E.buildView(s).scene.choices.find((c) => !c.locked).id); } return out; };
function playPeaceful(id, decision, opts = {}) {
  let s = strong(at(id, opts));
  s = act(s, { type: 'depart', questId: id }).state;
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
function walkThrough(s) { for (let i = 0; i < 6 && E.buildView(s).scene.id.startsWith('scene-'); i++) s = choose(s, E.buildView(s).scene.choices.find((c) => !c.locked).id); return s; }
const COMPANION_NAMES = { orin: /\b(Orin|Stoneward)\b/, maren: /\bMaren\b|\bSister\b(?! Ilse)/, nessa: /\b(Nessa|Reed|Biscuit)\b/ };
const OWNER = { 'b4-ford': 'orin', 'b4-hospice': 'maren', 'b4-signal': 'nessa' };

// Each companion's answers: flag, approval, reputation. The answer for the companion away sets the default flag.
const EXPECT = {
  'b4-ford': { captain: ['b4_orin_captain', { maren: 1 }, { wardens: 1 }], soldier: ['b4_orin_soldier', { orin: 1 }, { wilds: 1 }], davin: ['b4_orin_davin', { maren: -1 }, { wardens: 1 }] },
  'b4-hospice': { vouched: ['b4_maren_vouched', { maren: 1 }, { wold: 1 }], doubts: ['b4_maren_doubts', { nessa: -1 }, { wardens: 1 }], silent: ['b4_maren_silent', { orin: 1 }, { wilds: 1 }] },
  'b4-signal': { with: ['b4_nessa_with_rue', { nessa: 1 }, { wold: 1 }], stops: ['b4_nessa_stops_rue', { maren: 1 }, { wardens: 1 }], signal: ['b4_nessa_signal', { orin: 1 }, { wilds: 1 }] }
};
const AWAY = { 'b4-ford': ['watch', 'b4_orin_soldier'], 'b4-hospice': ['anwen', 'b4_maren_silent'], 'b4-signal': ['alone', 'b4_nessa_signal'] };

test('chapters 25 to 27 are the companions\' own: Ashford, Merrowgate, Cinder Fold, each needing its companion, 27 the first together, each paying exactly one level', () => {
  assert.deepEqual(FX.WRITTEN.slice(24, 27), IDS);
  assert.deepEqual(IDS.map((id) => { const q = QUESTS[id]; return [q.id, q.book, q.part, q.level, q.unlock, q.town, q.nextTown, q.needs, q.together, q.enemyTheme]; }), [
    ['b4-ford', 4, 3, 64, 'b4-gatehouse', 'ashford', 'merrowgate', ['orin'], undefined, 'gloam'],
    ['b4-hospice', 4, 3, 65, 'b4-ford', 'merrowgate', 'cinderfold', ['maren'], undefined, 'soldier'],
    ['b4-signal', 4, 3, 66, 'b4-hospice', 'cinderfold', 'cinderfold', ['nessa'], true, 'soldier']
  ]);
  for (const id of IDS) {
    const q = QUESTS[id];
    assert.equal(q.name, RAWQ[id].name, id);
    assert.equal(q.xp, P.levelBand(q.level), `${id} pays exactly one level`);
    assert.equal(q.gold, 20 * q.level + 40, `${id} gold`);
    assert.equal(q.white, undefined, id); assert.equal(q.levelFloor, undefined, id); assert.equal(q.continues, undefined, id);
    for (const key of ['opening', 'approach', 'crisis', 'after']) assert.ok(Array.isArray(q[key]) && q[key].length, `${id}.${key}`);
    assert.ok(q.talks.length >= 4, `${id} talks`);
    assert.deepEqual(q.decisions.map((d) => d.id), [...Object.keys(EXPECT[id]), AWAY[id][0]], id);
    assert.ok(q.told?.ballad && q.told?.tally, id);
    for (const d of q.decisions) assert.ok(d.told?.ballad && d.told?.tally, `${id}/${d.id}`);
    // The companion's own answers need them there; the last is for when they are away.
    for (const d of q.decisions.slice(0, 3)) assert.equal(d.requires.companion, OWNER[id], `${id}/${d.id}`);
    assert.deepEqual(q.decisions[3].requires, { absent: OWNER[id] }, id);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
    assert.equal(ENCOUNTERS[`quest:${id}`].victoryNode, `q-${id}-after`);
    assert.equal(q.peaceful.success.filter((l) => l.when?.flag === `prepared:${id}`).length, 1, id);
    assert.equal(q.peaceful.success.filter((l) => l.when?.flag === `approach:${id}`).length, 1, id);
    assert.equal(q.peaceful.success.filter((l) => l.when?.notFlag === `approach:${id}`).length, 1, id);
  }
  assert.deepEqual(QUESTS['b4-ford'].decisions.find((d) => d.id === 'davin').requires, { flagsAll: ['b4_davin_comes'], companion: 'orin' });
});

test('each chapter has one camp: an empty cast, one node, the camp beat, and choices that change nothing', () => {
  assert.deepEqual(IDS.map((id) => sceneOf(id).id), ['ford-camp', 'hospice-camp', 'signal-camp']);
  for (const id of IDS) {
    const scene = sceneOf(id);
    assert.deepEqual(scene.cast, [], scene.id);
    assert.deepEqual(Object.keys(scene.nodes), [scene.start], scene.id);
    assert.equal(scene.nodes[scene.start].objective, 'Camp.');
    for (const c of scene.nodes[scene.start].choices) assert.ok(!c.next && !c.approval && !c.setFlags, `${scene.id}/${c.id}`);
  }
  // The camp beats: Orin leaves every knot as it was tied; Maren and Anwen let the walkers win.
  assert.match(sceneText(decide('b4-ford', 'captain')), /leaves it as it is\. He does not re-tie a single one/);
  assert.match(sceneText(decide('b4-ford', 'watch', { party: ['maren', 'nessa'] })), /Davin goes down the lines/);
  assert.match(sceneText(decide('b4-hospice', 'vouched')), /cheating, both of them, in the same way, so that the walkers will win/);
  assert.match(sceneText(decide('b4-hospice', 'anwen', { party: ['orin', 'nessa'] })), /Anwen plays cards with the walkers/);
  assert.match(sceneText(decide('b4-signal', 'with')), /Nessa is not here\. She is in the miners' hall/);
});

test('every chapter plays to its end peacefully by each of its companion\'s answers, and by the answer with them away, sets only its flag, and levels the hero by one', () => {
  const play = (id, decision, flag, party) => {
    const s = playPeaceful(id, decision, { party });
    assert.ok(s.world.completed[id], `${id}/${decision}`);
    assert.equal(s.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(EXPECT[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(s.story.flags[other], undefined, `${id}/${decision} not ${other}`);
    assert.equal(s.player.level, QUESTS[id].level + 1, id);
    assert.equal(s.player.xp, P.XP_NEXT[QUESTS[id].level - 1] + QUESTS[id].xp, id);
    assert.equal(s.story.nodeId, `scene-${sceneOf(id).id}-${sceneOf(id).start}`, `${id}: its camp follows`);
    assert.equal(toTown(s).story.nodeId, `town-${QUESTS[id].nextTown}`, `${id}/${decision}`);
  };
  for (const id of IDS) {
    for (const [decision, [flag]] of Object.entries(EXPECT[id])) play(id, decision, flag);
    play(id, AWAY[id][0], AWAY[id][1], ['orin', 'maren', 'nessa'].filter((m) => m !== OWNER[id]));
  }
  // Davin's sergeant's answer needs Davin to have come north.
  const s = after('b4-ford', { flags: { b4_davin_comes: false, b4_davin_home: true } });
  assert.ok(!E.buildView(s).scene.choices.some((c) => c.id === 'davin' && !c.locked));
});

test('a decision changes exactly the approval and the reputation listed for it', () => {
  for (const [id, decisions] of Object.entries(EXPECT)) for (const [decision, [, approval, rep]] of Object.entries(decisions)) {
    const d = QUESTS[id].decisions.find((x) => x.id === decision);
    assert.deepEqual(d.approval || {}, approval, `${id}/${decision}`);
    assert.deepEqual(d.rep, rep, `${id}/${decision}`);
    const s = after(id);
    for (const m of s.party) m.bond = 2;
    const before = { ...s.world.reputation };
    const r = choose(s, decision);
    for (const m of r.party) assert.equal(bond(r, m.id), 2 + (approval[m.id] || 0), `${id}/${decision}/${m.id}`);
    for (const [faction, n] of Object.entries(rep)) assert.equal(r.world.reputation[faction], (before[faction] || 0) + n, `${id}/${decision}/${faction}`);
  }
  for (const id of IDS) assert.equal(QUESTS[id].decisions[3].approval, undefined, `${id}: nobody approves of an answer given without the companion`);
});

test('each crisis can be fought instead, and winning reaches the same ending told the way it was won', () => {
  for (const [id, fought] of [['b4-ford', /churned to mud where the fight was/], ['b4-hospice', /blood on the bottom step/], ['b4-signal', /dark with blood at the fourth turn/]]) {
    const failed = act(at(id, { phase: 'crisis' }), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    let s = choose(at(id, { phase: 'crisis' }), 'confront');
    assert.ok(s.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    assert.match(opening(s), fought, id);
    assert.doesNotMatch(opening(s), /[Nn]obody is hurt/, id);
    s = choose(s, QUESTS[id].decisions[0].id);
    assert.ok(s.story.nodeId.startsWith('scene-'), id);
  }
});

test('with no companions, and with each one away, every chapter, camp and job is told whole, after each way the story can have gone, with no empty line, no token and no absent companion', () => {
  const parties = [[], ['maren', 'nessa'], ['orin', 'nessa'], ['orin', 'maren'], ['orin', 'maren', 'nessa']];
  const clean = (text, party, where) => {
    assert.ok(text && text.trim().length, `${where}: something is told`);
    assert.doesNotMatch(text, /\n\s*\n|undefined|null|[{}@]/, `${where}: no empty line or token`);
    for (const who of ['orin', 'maren', 'nessa']) if (!party.includes(who)) assert.doesNotMatch(text, COMPANION_NAMES[who], `${where}: ${who} is away`);
  };
  for (const flags of FLAGSETS) for (const id of IDS) for (const party of parties) {
    const opts = { party, flags };
    clean(opening(departed(id, opts)), party, `${id} opening [${party}]`);
    for (const t of talkIds(id, opts)) clean(talk(id, t, opts), party, `${id}/${t} [${party}]`);
    for (const phase of ['approach', 'crisis']) clean(opening(at(id, { ...opts, phase })), party, `${id} ${phase} [${party}]`);
    const a = after(id, opts);
    const open = E.buildView(a).scene.choices.filter((c) => !c.locked).map((c) => c.id);
    assert.ok(open.length >= 1, `${id} [${party}]: an answer is open`);
    clean(opening(a), party, `${id} after [${party}]`);
    for (const d of QUESTS[id].decisions.filter((x) => open.includes(x.id))) {
      const r = decide(id, d.id, opts);
      clean(told(r), party, `${id}/${d.id} [${party}]`);
      clean(sceneText(r), party, `${id}/${d.id} camp [${party}]`);
    }
  }
  for (const [id, chapter] of [['lower-town', 'b4-ford'], ['walkers-names', 'b4-hospice']]) for (const flags of FLAGSETS) for (const party of parties) {
    const s = at(chapter, { flags, party }); s.world.townId = SIDE_JOBS[id].town; s.story.nodeId = `town-${s.world.townId}`;
    const j = act(s, { type: 'side-job', jobId: id }).state;
    clean(opening(j), party, `${id} [${party}]`);
    for (const c of STORY_NODES[`job-${id}-${SIDE_JOBS[id].start}`].choices) for (const rng of c.check ? [high, low] : [high]) clean(told(act(j, { type: 'story-choice', choiceId: c.id }, rng).state), party, `${id}/${c.id} [${party}]`);
  }
});

test('every check result reads for whoever rolls it, and a companion who rolls is never also told doing it as themselves', () => {
  const actors = [{ id: 'player' }, { id: 'orin' }, { id: 'maren' }, { id: 'nessa' }];
  let tokens = 0;
  for (const node of Object.values(STORY_NODES).filter((n) => IDS.includes(n.questId))) for (const c of node.choices || []) {
    if (!c.check) continue;
    for (const key of ['success', 'failure']) {
      if (/\{(You|you)/.test(c[key].text || '')) tokens++;
      for (const actor of actors) { const o = outcomeForRoller(c[key], actor); assert.doesNotMatch(o.text || '', /[{}@]/, `${node.id} ${c.id} ${key} ${actor.id}`); }
    }
  }
  assert.ok(tokens >= 10, 'The results are written with the roller tokens.');
  for (const id of IDS) for (const l of everyLine(RAWQ[id])) for (const m of (l.text || l.narrate).matchAll(/\{([^{}|]*)\|[^{}]*\}/g)) assert.doesNotMatch(m[1], /^(they|them|their)\b/, `${id}: ${m[0]}`);
  // At the ford Orin goes in first, unless he is the one who rolled, and then he is told as the roller.
  const ford = STORY_NODES['q-b4-ford-crisis'].choices.find((c) => c.id === 'resolve').success;
  assert.match(outcomeForRoller(ford, { id: 'player' }).text, /Orin goes into the river first[^]*gives the column its order/);
  assert.match(outcomeForRoller(ford, { id: 'orin' }).text, /Orin goes into the river first, to his chest[^]*gives the column one word at a time/);
  assert.doesNotMatch(outcomeForRoller(ford, { id: 'orin' }).text, /gives the column its order/);
  const steps = STORY_NODES['q-b4-hospice-crisis'].choices.find((c) => c.id === 'resolve').success;
  assert.match(outcomeForRoller(steps, { id: 'maren' }).text, /Maren stands up on the bottom step beside Sloe and says what she saw/);
});

test('chapter 25 reads Ashford\'s Book Three ending, Varn\'s, Davin\'s and who came south', () => {
  assert.match(opening(departed('b4-ford')), /the scaffolding is mostly down/);
  assert.match(opening(departed('b4-ford', { flags: { b3_promise_old: false } })), /lies grey and empty/);
  assert.match(opening(departed('b4-ford', { flags: HALL })), /Amos Wick rings the hours/);
  assert.match(opening(departed('b4-ford', { flags: ENVOYS })), /two hundred and forty children/);
  assert.match(talk('b4-ford', 'brede', { flags: ENVOYS }), /The council took our children over our own vote/);
  assert.match(opening(departed('b4-ford')), /came down from Highpass in the spring[^]*the walkers from the Hush, who walk/);
  assert.match(opening(departed('b4-ford', { flags: HALL })), /first of the Wold's families from the Hall/);
  assert.doesNotMatch(opening(departed('b4-ford', { flags: HALL })), /walkers/);
  assert.match(opening(departed('b4-ford', { flags: ENVOYS })), /families from Orme[^]*walkers from the Hush who followed the marks/);
  assert.ok(!talkIds('b4-ford').includes('varn'), 'Varn comes only if Orin was tried with him or he was freed');
  assert.match(talk('b4-ford', 'varn', { flags: { b3_orin_tried: true } }), /walked Saltwick's lamps for a season/);
  assert.match(talk('b4-ford', 'varn', { flags: ENVOYS }), /turned forty of Hesk's people back on the stair/);
  assert.ok(!talkIds('b4-ford', { flags: HALL }).includes('davin'));
  assert.match(talk('b4-ford', 'davin', { flags: { b4_davin_mags: true } }), /Gran sent me with him/);
  assert.match(talk('b4-ford', 'orin'), /I gave an order at Sheddon/);
  assert.match(opening(departed('b4-ford', { party: ['maren'] })), /So I'm asking you/);
});

test('chapter 26 reads the walkers, the Company, Bett\'s berth and Elske, and Anwen speaks when Maren is away', () => {
  assert.match(opening(departed('b4-hospice')), /the walkers from the Hush/);
  assert.match(opening(departed('b4-hospice', { flags: HALL })), /the harbour's white-touched/);
  assert.match(talk('b4-hospice', 'cass', { flags: { b4_company_broken: true } }), /Your council broke my charter/);
  assert.match(talk('b4-hospice', 'cass', { flags: ENVOYS }), /My wagons are in the Wold/);
  assert.match(talk('b4-hospice', 'haddows', { flags: ENVOYS }), /one voyage[^]*Coll went north with the Company's wagons/);
  assert.match(talk('b4-hospice', 'haddows', { flags: { 'job:bett-berth-loft': true } }), /rope-loft/);
  assert.ok(!talkIds('b4-hospice').includes('elske'));
  assert.match(talk('b4-hospice', 'elske', { flags: ENVOYS }), /long room at the harbour hospice/);
  assert.match(talk('b4-hospice', 'elske', { flags: { elske_judged: true } }), /Sallows hospice/);
  assert.match(opening(departed('b4-hospice', { party: ['orin', 'nessa'] })), /Anwen: Sloe came asking this morning for your healer/);
  assert.match(told(decide('b4-hospice', 'anwen', { party: ['orin', 'nessa'] })), /I've never been north/);
});

test('chapter 27 reads the signal key, the Mother Bell, the sealed stair and Rue\'s mother and book', () => {
  assert.match(opening(departed('b4-signal')), /The forge-signal has gone unkept/);
  assert.match(opening(departed('b4-signal', { flags: HALL })), /Hew has kept the forge-signal every night/);
  assert.match(opening(departed('b4-signal', { flags: ENVOYS })), /Ottilie Brand's committee has kept the forge-signal/);
  assert.match(opening(departed('b4-signal', { flags: { b4_key_left: true, b4_key_carried: false } })), /Wren has kept the forge-signal/);
  assert.match(opening(departed('b4-signal')), /I've only got a season to lose/);
  const clue = (flags) => told(choose(departed('b4-signal', { flags }), 'investigate'));
  assert.match(clue(HALL), /The council's seal is off the hatch[^]*under the lock whose only key is yours/);
  assert.doesNotMatch(clue({}), /council's seal|only key/);
  assert.match(talk('b4-signal', 'rue', { flags: HALL }), /I gave my mother at Thrum[^]*I have no book\. You saw it burn/);
  assert.match(talk('b4-signal', 'rue'), /I kept my mother, at Thrum[^]*I have my book/);
  assert.match(talk('b4-signal', 'ailith', { flags: HALL }), /Highpass's bell is in the hall/);
  assert.match(talk('b4-signal', 'ailith'), /Sable taught you/);
  assert.match(talk('b4-signal', 'ailith', { flags: HALL }), /The Mother Bell's rope is in your signal house/);
  // With Hew keeping the key, Hew lights the signal and Nessa holds the stair.
  const lit = STORY_NODES['q-b4-signal-crisis'].choices.find((c) => c.id === 'resolve').success;
  const s = strong(at('b4-signal', { phase: 'crisis', flags: HALL }));
  assert.match(told(choose(s, 'resolve')), /Hew goes up to the lamp-room with the key[^]*Nessa stands on the stair/);
  assert.ok(lit);
});

test('step 10\'s jobs: The Lower Town on Ashford\'s board in chapters 25 and 26, Walkers\' Names on Merrowgate\'s in 26, by Ashford\'s ending and the walkers, each paying once', () => {
  assert.deepEqual(['lower-town', 'walkers-names'].map((id) => [SIDE_JOBS[id].town, SIDE_JOBS[id].from, SIDE_JOBS[id].until]), [['ashford', 'b4-gatehouse', 'b4-hospice'], ['merrowgate', 'b4-ford', 'b4-hospice']]);
  const offered = (id, chapter, done = false) => { const s = at(chapter); if (done) s.world.completed[chapter] = { xp: 0, gold: 0 }; s.world.townId = SIDE_JOBS[id].town; s.story.nodeId = `town-${SIDE_JOBS[id].town}`; return (E.buildView(s).world.sideJobs || []).some((j) => j.id === id); };
  assert.ok(!offered('lower-town', 'b4-gatehouse') && offered('lower-town', 'b4-ford') && offered('lower-town', 'b4-hospice') && !offered('lower-town', 'b4-hospice', true));
  assert.ok(!offered('walkers-names', 'b4-ford') && offered('walkers-names', 'b4-hospice') && !offered('walkers-names', 'b4-hospice', true));
  const start = (id, chapter, flags = {}, party) => { const s = at(chapter, { flags, party }); s.world.townId = SIDE_JOBS[id].town; s.story.nodeId = `town-${s.world.townId}`; return act(s, { type: 'side-job', jobId: id }).state; };
  assert.match(opening(start('lower-town', 'b4-ford')), /last plots by the river/);
  assert.match(opening(start('lower-town', 'b4-ford', { b3_promise_old: false })), /empty streets, grey and gone to grass/);
  assert.match(opening(start('lower-town', 'b4-ford', HALL)), /water-meadows below the fulling mill/);
  assert.match(opening(start('walkers-names', 'b4-hospice')), /At the end of the walkers' row/);
  assert.match(opening(start('walkers-names', 'b4-hospice', HALL)), /brought him in off the outer quay/);
  for (const [id, chapter] of [['lower-town', 'b4-ford'], ['walkers-names', 'b4-hospice']]) for (const c of STORY_NODES[`job-${id}-${SIDE_JOBS[id].start}`].choices) for (const rng of c.check ? [high, low] : [high]) {
    let s = start(id, chapter);
    const xp = s.player.xp, gold = s.player.gold, level = s.player.level;
    s = act(s, { type: 'story-choice', choiceId: c.id }, rng).state;
    assert.equal(s.story.nodeId, `town-${SIDE_JOBS[id].town}`, `${id}/${c.id}`);
    assert.equal(s.story.flags[`job:${id}`], true);
    assert.ok(s.player.xp - xp <= 130 && s.player.gold - gold >= 120 && s.player.gold - gold <= 180, `${id}/${c.id}`);
    assert.equal(s.player.level, level, `${id}: never past the chapter`);
    assert.ok(Object.keys(s.story.flags).some((f) => f.startsWith(`job:${id}-`)), `${id}/${c.id} sets its answer`);
  }
});

test('chapters 25 to 27 give keepsakes only their companion can wear, on the tier 60 curve, given once when the chapter is done', () => {
  const GEAR = require('../src/data/gear.json');
  const rewards = GEAR.filter((i) => IDS.includes(i.exclusive?.quest));
  assert.deepEqual(rewards.map((i) => [i.exclusive.quest, i.name, i.slot, i.requires.level, i.requires.members]), [
    ['b4-ford', "Captain's Commission", 'accessory', 62, ['orin']], ['b4-hospice', 'Hospice Physic-bag', 'accessory', 63, ['maren']], ['b4-signal', 'Signal-fire Longbow', 'mainHand', 64, ['nessa']]]);
  for (const item of rewards) {
    assert.equal(item.rarity, 'Legendary', item.id);
    assert.equal(item.value, 340 + 10 * item.requires.level, item.id);
    assert.ok(!item.warm, item.id);
    const who = item.requires.members[0];
    assert.match(Gear.requirementText(item), new RegExp(`^${COMPANIONS[who].name.split(' ')[0]} only · Level ${item.requires.level}`));
    assert.equal(Gear.unmet({ ...COMPANIONS[who], id: who, level: 70 }, item), null, item.id);
    for (const other of Object.keys(COMPANIONS).filter((m) => m !== who)) assert.match(Gear.unmet({ ...COMPANIONS[other], id: other, level: 70 }, item), /^Only \w+ can use this\./, `${item.id}: not ${other}`);
    for (const c of Object.keys(CLASSES)) assert.match(Gear.unmet({ id: 'player', kind: 'player', classId: c, level: 70, abilities: { str: 15, dex: 15 } }, item), /^Only/, `${item.id}: not the hero`);
    assert.ok((item.stats?.taken || 0) >= -0.1 && (item.stats?.dealt || 0) <= 0.1, item.id);
    if (item.skill) assert.equal(item.skill.rounds, 1, item.id);
  }
  assert.deepEqual(rewards.map((i) => i.skill?.effect || null), ['weakened', null, 'vulnerable']);
  assert.deepEqual(rewards.map((i) => i.story?.skill || null), ['intimidation', 'medicine', null]);
  const bow = ITEMS['signal-fire-longbow'], column = ITEMS['column-longbow'];
  assert.ok(bow.attackBonus === column.attackBonus + 1 && bow.damageBonus === column.damageBonus + 1 && bow.weapon.damage === column.weapon.damage && bow.stats.dealt === column.stats.dealt, 'a point above the Column Longbow, eight levels on');
  // Given once, and only the companion can put it on.
  let s = playPeaceful('b4-ford', 'captain');
  assert.equal(s.player.inventory.filter((e) => e.itemId === 'captains-commission').reduce((n, e) => n + e.quantity, 0), 1);
  s = toTown(s);
  assert.equal(E.resolveAction(s, { type: 'equip', itemId: 'captains-commission', actorId: 'player' }).result.ok, false);
  assert.equal(E.resolveAction(s, { type: 'equip', itemId: 'captains-commission', actorId: 'maren' }).result.ok, false);
  const r = E.resolveAction(s, { type: 'equip', itemId: 'captains-commission', actorId: 'orin' });
  assert.equal(r.result.ok, true, r.result.error);
});

test('walkouts: after chapter 25 Maren stays, because 26 is hers; after 26 and 27 everyone stays, because Cinder Fold is together', () => {
  let s = after('b4-ford'); s.world.approvalWindow = { maren: -3 };
  s = walkThrough(choose(s, 'captain'));
  assert.equal(s.story.nodeId, 'away-maren-stay');
  assert.match(opening(s), /But it's Merrowgate next, and Anwen's hospice/);
  s = after('b4-ford'); s.world.approvalWindow = { nessa: -3 };
  assert.equal(walkThrough(choose(s, 'captain')).story.nodeId, 'away-nessa-leave');
  for (const [id, decision, next, lines] of [['b4-hospice', 'vouched', 'b4-signal', { orin: /a week to midwinter/, maren: /midwinter after it/, nessa: /Rue's going there/ }], ['b4-signal', 'signal', 'b4-ropes', { orin: /be on the doors/, maren: /whoever Ailith asks to ring/, nessa: /midwinter, and Rue/ }]]) {
    for (const who of ['orin', 'maren', 'nessa']) {
      let t = after(id); t.world.approvalWindow = { [who]: -3 };
      t = walkThrough(choose(t, decision));
      assert.equal(t.story.nodeId, `away-${who}-stay`, `${id}: ${who} stays for ${next}`);
      assert.match(opening(t), lines[who], `${id}: ${who}`);
    }
  }
  for (const who of ['orin', 'maren', 'nessa']) for (const next of ['b4-signal', 'b4-ropes']) assert.ok(RAWA[who].stay.lines.some((l) => l.when?.is === next), `${who}: ${next}`);
});

// The companion arc moves (engine change 14): a practice fight at level 66 with the whole party.
function arcFight({ done = IDS, hurt = false } = {}) {
  const s = at('b4-signal');
  for (const id of IDS) if (!done.includes(id)) delete s.world.completed[id]; else s.world.completed[id] = { xp: 0, gold: 0 };
  s.world.activeQuest = null; s.world.onExpedition = false;
  E.startCombat(s, 'practice', R.createSeededRng(7), []);
  s.combat.usedActions = {};
  for (const a of s.combat.actors) { a.conditions = a.conditions.filter((c) => c.id !== 'vulnerable' && c.id !== 'fortified'); a.actionUsed = false; a.bonusUsed = false; if (a.team === 'party') a.hp = hurt ? Math.floor(a.maxHp / 3) : a.maxHp; }
  return s;
}
const member = (s, id) => s.combat.actors.find((a) => a.refId === id);
const turn = (s, id) => { const events = []; const a = member(s, id); a.actionUsed = false; a.bonusUsed = false; Combat.processCompanionTurn(s, a, R.createSeededRng(3), events); return events.map((e) => e.text).join('\n'); };

test('arc moves: each is learned on completing its companion\'s chapter, fires on its trigger, and is used once a fight', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(Combat.ARC_MOVES).map(([k, v]) => [k, [v.name, v.chapter]])), { orin: ['Hold the Column', 'b4-ford'], maren: ['Say Their Names', 'b4-hospice'], nessa: ['Signal Fire', 'b4-signal'] });
  // Not learned before the chapter is done.
  let s = arcFight({ done: [], hurt: true });
  assert.doesNotMatch(turn(s, 'orin') + turn(s, 'maren') + turn(s, 'nessa'), /Hold the Column|Say Their Names|Signal Fire/);
  // Orin and Maren wait for two of the party under half; Nessa uses hers on her first turn.
  s = arcFight();
  assert.doesNotMatch(turn(s, 'orin'), /Hold the Column/);
  assert.doesNotMatch(turn(s, 'maren'), /Say Their Names/);
  const foe = s.combat.actors.find((a) => a.team === 'enemy');
  assert.match(turn(s, 'nessa'), /Signal Fire: .* is Vulnerable for two rounds/);
  assert.deepEqual(foe.conditions.find((c) => c.id === 'vulnerable').expiresRound, s.combat.round + 2);
  assert.doesNotMatch(turn(s, 'nessa'), /Signal Fire/, 'once a fight');
  s = arcFight({ hurt: true });
  assert.match(turn(s, 'orin'), /Hold the Column: the party is Fortified/);
  for (const a of s.combat.actors.filter((x) => x.team === 'party')) assert.ok(a.conditions.some((c) => c.id === 'fortified' && c.expiresRound === s.combat.round + 1), a.id);
  assert.doesNotMatch(turn(s, 'orin'), /Hold the Column/, 'once a fight');
  const before = s.combat.actors.filter((x) => x.team === 'party').map((a) => a.hp);
  assert.match(turn(s, 'maren'), /Say Their Names/);
  s.combat.actors.filter((x) => x.team === 'party').forEach((a, i) => assert.ok(a.hp > before[i], `${a.id} is healed`));
  assert.doesNotMatch(turn(s, 'maren'), /Say Their Names/, 'once a fight');
  // Maren's also fires for one of the party down; Orin's does not.
  s = arcFight(); s.combat.actors.find((a) => a.id === 'player').hp = 0;
  assert.doesNotMatch(turn(s, 'orin'), /Hold the Column/);
  assert.match(turn(s, 'maren'), /Say Their Names/);
  // Signal Fire marks the boss before anyone else.
  s = arcFight(); const boss = s.combat.actors.find((a) => a.team === 'enemy'); boss.aiRole = 'boss';
  assert.match(turn(s, 'nessa'), new RegExp(`Signal Fire: ${boss.name} is Vulnerable`));
});

test('Hold the Column never stacks with Shield Accord: Orin does not use it on a round Shield Accord is up', () => {
  const s = arcFight({ hurt: true });
  for (const a of s.combat.actors.filter((x) => x.team === 'party')) a.conditions.push({ id: 'guarded', name: 'Shield Accord', sourceId: 'player', expiresRound: s.combat.round + 1 });
  assert.doesNotMatch(turn(s, 'orin'), /Hold the Column/);
  assert.equal(s.combat.usedActions[`arc:${member(s, 'orin').id}:hold-the-column`], undefined, 'still his to use later in the fight');
  for (const a of s.combat.actors) a.conditions = a.conditions.filter((c) => c.name !== 'Shield Accord');
  assert.match(turn(s, 'orin'), /Hold the Column/);
});
