'use strict';
// Book Four, Part Three (docs/book-four/DESIGN.md, build steps 9 to 11), as far
// as it is written: chapters 21 to 24 and their camps, build step 9's side
// jobs and chapter rewards, and the Part Three walkout lines. Every part is previewed, with fixture chapters standing in for
// the ones not written yet (tests/fixtures/book-four.js). node --test runs each
// file in its own process, so these settings reach no other file. Nothing here
// calls the paid API. The lints that read the whole of Book Four's data
// (companion gates, names, flags read before they are set) are in
// tests/book-four-part-one.test.js and cover these chapters too.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), J = require('../src/journal');
const { STORY_NODES, ENEMIES, ENCOUNTERS } = require('../src/content');
const { QUESTS, SCENES, outcomeForRoller } = require('../src/expansion');
const high = () => .999999, low = () => 0;

const IDS = ['b4-knot', 'b4-invoice', 'b4-quietnight', 'b4-gatehouse'];
const RAWQ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/quests.json'), 'utf8'));
const RAWS = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/scenes.json'), 'utf8'));
const RAWA = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/away.json'), 'utf8'));
const entries = (raw) => Object.entries(raw).filter(([k]) => !k.startsWith('_'));
const sceneOf = (id) => Object.values(SCENES).find((x) => x?.after === id);
const home = (id) => QUESTS[id].nextTown || QUESTS[id].town;
const everyLine = (v) => { const out = []; JSON.stringify(v, (k, x) => { if (x && typeof x === 'object' && !Array.isArray(x) && (x.narrate !== undefined || x.say !== undefined)) out.push(x); return x; }); return out; };

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
const BOOK_THREE = { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true };
const PART_ONE = { b4_rue_party: true, b4_davin_comes: true, b4_book_returned: true, b4_key_carried: true, b4_letters_read: true, b4_embassy_council: true, b4_unannounced: true, b4_bw_quiet: true, b4_truth_published: true, b4_partone_done: true };
// Part Two as many saves will have left it: the tally carried, the Wold across the peaks.
const PART_TWO = { b4_gave_lantry: true, b4_orin_ordered: true, b4_tally_truth: true, b4_names_written: true, b4_rue_kept: true, b4_demand_carried: true, b4_potbell_rota: true,
  b4_walkers_led: true, b4_tally_carried: true, b4_crossed: true, b4_parttwo_done: true };
// The other two ways Part Two can end, with the other Book Three endings and Briarwatch's bell empty.
const HALL = { b4_crossed: false, b4_hall_camp: true, b4_tally_carried: false, b4_tally_left: true, b3_promise_old: false, b3_stair_sealed: true, b3_bell_aster: true, b4_davin_comes: false, b4_davin_home: true, b4_book_returned: false, b4_book_burned: true };
const ENVOYS = { b4_crossed: false, b4_envoys_only: true, b4_tally_carried: false, b4_tally_last: true, b3_promise_old: false, b3_promise_hesk: true, b3_three_told: true, b3_bell_aster: true, elske_seat: true, b4_rue_watch: true, b4_rue_party: false };
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
function hero(level) { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true }); return s; }
// A hero in the town where a chapter starts, every chapter before it done, with the towns the story has reached.
function at(id, { party = ['orin', 'maren', 'nessa'], flags = {}, phase } = {}) {
  const q = QUESTS[id];
  let s = hero(q.level); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  const reached = new Set(FREE_TOWNS);
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; if (other.nextTown) reached.add(other.nextTown); }
  s.world.unlockedTowns = [...reached]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, BOOK_THREE, PART_ONE, PART_TWO, flags); W.init(s);
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
function walkThrough(s) { for (let i = 0; i < 6 && E.buildView(s).scene.id.startsWith('scene-'); i++) s = choose(s, E.buildView(s).scene.choices.find((c) => !c.locked).id); return s; }
const COMPANION_NAMES = { orin: /\b(Orin|Stoneward)\b/, maren: /\bMaren\b|\bSister\b(?! Ilse)/, nessa: /\b(Nessa|Reed|Biscuit)\b/ };

// Each decision: its flag, its approval, its reputation, and the earlier flags it needs.
const EXPECT = {
  'b4-knot': { open: ['b4_accused_open', { maren: 1 }, { wardens: 1 }], quiet: ['b4_accused_quiet', { maren: -1 }, { wilds: 1 }], sloe: ['b4_told_sloe', {}, { wold: 1 }] },
  'b4-invoice': { share: ['b4_vote_share', { nessa: 1 }, { wold: 1 }], rota: ['b4_rota_towns', {}, { wardens: 1 }], refuge: ['b4_vote_refuge', { maren: 1 }, { wold: 1 }] },
  'b4-quietnight': { rings: ['b4_voice_rings', {}, { wardens: 1 }], quiet: ['b4_voice_quiet', { nessa: 1 }, { wold: 1 }], rests: ['b4_voice_rests', { maren: 1 }, { wilds: 1 }] },
  'b4-gatehouse': { ailith: ['b4_sable_ailith', { nessa: -1 }, { trade: 1 }], taught: ['b4_sable_taught', { maren: 1 }, { wold: 1 }], silent: ['b4_sable_silent', { orin: 1 }, { wardens: 1 }] }
};

test('chapters 21 to 24 follow Part Two: from Highpass to Briarwatch and back, and on towards Ashford, not white, each paying exactly one level', () => {
  assert.deepEqual(FX.WRITTEN.slice(20), IDS);
  assert.deepEqual(IDS.map((id) => { const q = QUESTS[id]; return [q.id, q.book, q.part, q.level, q.unlock, q.town, q.nextTown, q.faction, q.enemyTheme]; }), [
    ['b4-knot', 4, 3, 60, 'b4-northdoor', 'highpass', 'highpass', 'wardens', 'gloam'],
    ['b4-invoice', 4, 3, 61, 'b4-knot', 'highpass', 'briarwatch', 'wardens', 'soldier'],
    ['b4-quietnight', 4, 3, 62, 'b4-invoice', 'briarwatch', 'highpass', 'wilds', 'gloam'],
    ['b4-gatehouse', 4, 3, 63, 'b4-quietnight', 'highpass', 'ashford', 'wardens', 'soldier']
  ]);
  for (const id of IDS) {
    const q = QUESTS[id];
    assert.equal(q.name, RAWQ[id].name, `${id} is read from src/data/book-four/quests.json`);
    assert.equal(q.xp, P.levelBand(q.level), `${id} pays exactly one level`);
    assert.equal(q.gold, 20 * q.level + 40, `${id} gold`);
    assert.equal(q.white, undefined, `${id}: the free wards' white is the old one`);
    assert.equal(q.needs, undefined, `${id}: nobody's own chapter until 25`);
    assert.equal(q.levelFloor, undefined, id);
    assert.equal(q.continues, undefined, id);
    for (const key of ['opening', 'approach', 'crisis', 'after']) assert.ok(Array.isArray(q[key]) && q[key].length, `${id}.${key}`);
    assert.ok(q.talks.length >= 5, `${id} talks`);
    assert.deepEqual(q.decisions.map((d) => d.id), Object.keys(EXPECT[id]), id);
    assert.ok(q.told?.ballad && q.told?.tally, id);
    for (const d of q.decisions) assert.ok(d.told?.ballad && d.told?.tally, `${id}/${d.id}`);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
    assert.equal(ENCOUNTERS[`quest:${id}`].victoryNode, `q-${id}-after`);
    assert.equal(q.peaceful.success.filter((l) => l.when?.flag === `prepared:${id}`).length, 1, id);
    assert.equal(q.peaceful.success.filter((l) => l.when?.flag === `approach:${id}`).length, 1, id);
    assert.equal(q.peaceful.success.filter((l) => l.when?.notFlag === `approach:${id}`).length, 1, id);
  }
});

test('each chapter has one camp scene: an empty cast, one node, the camp beat, and choices that change nothing', () => {
  assert.deepEqual(entries(RAWS).filter(([, v]) => IDS.includes(v.after)).map(([k, v]) => [k, v.after]), [['knot-camp', 'b4-knot'], ['invoice-camp', 'b4-invoice'], ['quietnight-camp', 'b4-quietnight'], ['gatehouse-camp', 'b4-gatehouse']]);
  for (const id of IDS) {
    const scene = sceneOf(id);
    assert.deepEqual(scene.cast, [], scene.id);
    assert.deepEqual(Object.keys(scene.nodes), [scene.start], `${scene.id}: one node`);
    assert.equal(scene.nodes[scene.start].objective, 'Camp.');
    for (const c of scene.nodes[scene.start].choices) assert.ok(!c.next && !c.approval && !c.setFlags, `${scene.id}/${c.id}`);
  }
});

test('every chapter plays to its end peacefully, by every answer, sets only its flag, levels the hero by one, and its camp leads to the next town', () => {
  for (const id of IDS) for (const [decision, [flag]] of Object.entries(EXPECT[id])) {
    const s = playPeaceful(id, decision);
    assert.ok(s.world.completed[id], `${id}/${decision}`);
    assert.equal(s.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(EXPECT[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(s.story.flags[other], undefined, `${id}/${decision} not ${other}`);
    assert.equal(s.player.level, QUESTS[id].level + 1, `${id}: after chapter N the hero is level 40 + N`);
    assert.equal(s.player.xp, P.XP_NEXT[QUESTS[id].level - 1] + QUESTS[id].xp, `${id}: exactly the chapter's XP`);
    const scene = sceneOf(id);
    assert.equal(s.story.nodeId, `scene-${scene.id}-${scene.start}`, `${id}: its camp follows`);
    assert.equal(toTown(s).story.nodeId, `town-${home(id)}`, `${id}/${decision}`);
  }
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
});

test('each crisis can be fought instead, and winning reaches the same ending told the way it was won', () => {
  for (const [id, fought] of [['b4-knot', /grey with frost at the gate end, where the fight was/], ['b4-invoice', /eight of the men from the yard in the cells/], ['b4-quietnight', /torn up at the mill lane, where the fight was\. The bell was rung/], ['b4-gatehouse', /torn up from the cell stair to the gate, where the fight was/]]) {
    const failed = act(at(id, { phase: 'crisis' }), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    let s = choose(at(id, { phase: 'crisis' }), 'confront');
    assert.ok(s.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    assert.match(opening(s), fought, id);
    assert.doesNotMatch(opening(s), /[Nn]obody is hurt|[Nn]obody has been carried|every house in it/, id);
    s = choose(s, QUESTS[id].decisions[0].id);
    assert.ok(s.story.nodeId.startsWith('scene-'), id);
  }
  // The bronze bell's fight lights the fire instead.
  let s = winFight(choose(at('b4-quietnight', { phase: 'crisis', flags: { b3_bell_aster: true } }), 'confront'));
  assert.match(opening(s), /The fire at the stream was lit in the end/);
});

test('with no companions, and with each one away, every chapter and camp is told whole, after each way Part Two ends, with no empty line, no token and no absent companion', () => {
  const parties = [[], ['maren', 'nessa'], ['orin', 'nessa'], ['orin', 'maren'], ['orin', 'maren', 'nessa']];
  const clean = (text, party, where) => {
    assert.ok(text && text.trim().length, `${where}: something is told`);
    assert.doesNotMatch(text, /\n\s*\n|undefined|null|[{}@]/, `${where}: no empty line or token`);
    for (const who of ['orin', 'maren', 'nessa']) if (!party.includes(who)) assert.doesNotMatch(text, COMPANION_NAMES[who], `${where}: ${who} is away`);
  };
  for (const flags of [{}, HALL, ENVOYS, { b3_sable_cast: true, b4_accused_open: true }, { b3_sable_cast: true, b3_bell_aster: true, b4_told_sloe: true }]) for (const id of IDS) for (const party of parties) {
    const opts = { party, flags };
    clean(opening(departed(id, opts)), party, `${id} opening [${party}]`);
    for (const t of talkIds(id, opts)) clean(talk(id, t, opts), party, `${id}/${t} [${party}]`);
    for (const phase of ['approach', 'crisis']) clean(opening(at(id, { ...opts, phase })), party, `${id} ${phase} [${party}]`);
    const a = after(id, opts);
    const open = E.buildView(a).scene.choices.filter((c) => !c.locked).map((c) => c.id);
    assert.ok(open.length >= 2, `${id} [${party}]: answers are open`);
    clean(opening(a), party, `${id} after [${party}]`);
    for (const d of QUESTS[id].decisions.filter((x) => open.includes(x.id))) {
      const r = decide(id, d.id, opts);
      clean(told(r), party, `${id}/${d.id} [${party}]`);
      clean(sceneText(r), party, `${id}/${d.id} camp [${party}]`);
    }
  }
});

test('every check result reads for whoever rolls it: the hero, or Orin, Maren or Nessa', () => {
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
  // No roller line puts "they" on the hero's side.
  for (const id of IDS) for (const l of everyLine(RAWQ[id])) for (const m of (l.text || l.narrate).matchAll(/\{([^{}|]*)\|[^{}]*\}/g)) assert.doesNotMatch(m[1], /^(they|them|their)\b/, `${id}: ${m[0]}`);
  const gate = STORY_NODES['q-b4-knot-crisis'].choices.find((c) => c.id === 'resolve').success;
  assert.match(outcomeForRoller(gate, { id: 'player' }).text, /Then you go into the gateway[^]*and you do not move/);
  assert.match(outcomeForRoller(gate, { id: 'maren' }).text, /Then Maren goes into the gateway[^]*and Maren does not move/);
  const lane = STORY_NODES['q-b4-quietnight-crisis'].choices.find((c) => c.id === 'resolve').success;
  assert.match(outcomeForRoller(lane, { id: 'nessa' }).text, /Nessa brings her up the lane on her arm/);
});

test('the flags chapters 21 and 22 set are read by the chapters after them, and chapter 24 reads 21\'s', () => {
  assert.match(talk('b4-invoice', 'chair', { flags: { b4_accused_open: true } }), /Since the cut rope went on the clerk's table/);
  assert.match(talk('b4-invoice', 'chair', { flags: { b4_told_sloe: true } }), /Sloe looks at it every time/);
  assert.match(talk('b4-invoice', 'chair', { flags: { b4_accused_quiet: true } }), /Nobody in the hall looks at it but you/);
  assert.match(told(decide('b4-invoice', 'share', { flags: { b4_accused_open: true } })), /at the chair's word, 'the rope'/);
  assert.doesNotMatch(told(decide('b4-invoice', 'share', { flags: { b4_accused_quiet: true } })), /the rope/);
  const night = (flags) => opening(departed('b4-quietnight', { flags }));
  assert.match(night({ b4_vote_share: true }), /the first night the council voted to share/);
  assert.match(night({ b4_rota_towns: true }), /because Briarwatch asked to go first/);
  assert.match(night({ b4_vote_refuge: true }), /Briarwatch is keeping the night quiet anyway/);
  // b4_voice_* is read by chapter 30 (build step 11), b4_sable_* by 28 to 30.
  const set = new Set(); for (const id of IDS) for (const d of RAWQ[id].decisions) set.add(d.flag);
  const later = JSON.stringify(IDS.slice(1).map((id) => RAWQ[id]).concat(entries(RAWS).map(([, s]) => s)));
  for (const flag of [...set].filter((f) => !/^b4_(voice|sable)_/.test(f))) assert.ok(later.includes(`"flag":"${flag}"`) || later.includes(`"${flag}"`), `${flag} is read`);
});

test('chapter 21: who comes down follows chapter 20, the free wards\' winter follows Book Three, and the gate book names Ailith in every ending', () => {
  const open = (flags, party) => opening(departed('b4-knot', { flags, party }));
  assert.match(open({}), /three thousand people, a rope at a time[^]*The sledges of the Long Tally come down behind the column/);
  assert.match(open(HALL), /The rest wait in the Hall for the council's answer/); assert.doesNotMatch(open(HALL), /sledges|Burdock/);
  assert.match(open(ENVOYS), /The column has gone back out of the north door[^]*Burdock walks behind Sloe with the book of winters in his coat/);
  assert.match(open(HALL), /Hesk walks behind Sloe/); assert.doesNotMatch(open({}), /Hesk/);
  assert.match(open({}), /Nessa sits down in the wet snow of the road and lets Biscuit knock her over/);
  assert.doesNotMatch(open({}, ['orin', 'maren']), /Biscuit/);
  assert.match(open(ENVOYS), /The last watch-fire above the upper gate is burning in daylight/);
  const winter = (flags) => talk('b4-knot', 'brannagh', { flags });
  assert.match(winter({}), /The givings held/);
  assert.match(winter({ b3_promise_old: false, b3_promise_hesk: true }), /The mildest winter anyone remembers/);
  assert.match(winter({ b3_promise_old: false, b3_promise_hesk: true, b3_three_told: true }), /The ones outside it had it hard/);
  assert.match(winter({ b3_promise_old: false, b3_stair_sealed: true }), /The nine alone/);
  assert.match(winter({ b4_parting_rung: true }), /every bell in the free wards rang once by itself/);
  for (const flags of [{}, HALL, ENVOYS]) assert.match(opening(after('b4-knot', { flags })), /'Ailith Strake, of Cinder Fold, delegate, and twelve of the rope families\. Going up to the Hall, after the embassy\.'[^]*'Down\. Twelve, and a load\.'/);
  // The crisis: the sergeant leads the watch, or stands with the Wold after Rue sat at his fire.
  assert.match(opening(at('b4-knot', { phase: 'crisis' })), /^The watch sergeant: It came down after them/m);
  assert.match(opening(at('b4-knot', { phase: 'crisis', flags: ENVOYS })), /The sergeant who sat with Rue at the fire is in the gateway/);
});

test('chapter 21: Orin\'s hands know the knot only where the stair took it, and his talk needs him there', () => {
  const STAIR = { b3_orin_keeps: true };
  assert.match(talk('b4-knot', 'orin', { flags: STAIR }), /The way it's worked is mine, the way I worked it before the stair/);
  assert.match(talk('b4-knot', 'orin'), /I never tied one that tight in my life/);
  assert.doesNotMatch(talk('b4-knot', 'orin'), /before the stair/);
  assert.ok(!talkIds('b4-knot', { party: ['maren', 'nessa'] }).includes('orin'));
  const camp = (flags, party) => sceneText(decide('b4-knot', 'open', { flags, party }));
  assert.match(camp(STAIR), /The third time his hands go small and hard[^]*I still can't tell you what it's called/);
  assert.match(camp({}), /never once like that/); assert.doesNotMatch(camp({}), /The third time his hands/);
  assert.match(camp({}, ['maren', 'nessa']), /You sit by the brazier with a length of rope/);
  assert.match(camp(STAIR), /^Davin: You'll get the name back/m);
  // The answers.
  assert.match(told(decide('b4-knot', 'open')), /^Brannagh: Then we write to Cinder Fold today/m);
  assert.match(told(decide('b4-knot', 'open', { flags: ENVOYS })), /^Elske: Then we write to Cinder Fold today/m);
  assert.match(told(decide('b4-knot', 'sloe')), /My ringers are on this road/);
  assert.match(told(decide('b4-knot', 'sloe', { flags: HALL })), /I could send to the Hall for my ringers/);
  assert.match(told(decide('b4-knot', 'sloe', { flags: ENVOYS })), /I could send to Orme for my ringers/);
});

test('chapter 22: the tally is read by whoever carried it, Iona invoices the council, and the sledges are only at Highpass when the column brought them', () => {
  const open = (flags) => opening(departed('b4-invoice', { flags }));
  assert.match(open({}), /dragged up into the gatehouse yard/);
  assert.match(open(ENVOYS), /Burdock stands at the clerk's table with the book of winters/); assert.doesNotMatch(open(ENVOYS), /sledges/);
  assert.match(open(HALL), /Burdock is in Orme with the tally\. Rue stands at the clerk's table with the copy of her old book that Sister Ilse made/);
  assert.match(open({ b4_tally_carried: false, b4_tally_left: true }), /Rue stands at the clerk's table with her book open/);
  assert.match(open({}), /the one Burdock wrote at Orme about the south/); assert.doesNotMatch(open(HALL), /Burdock wrote at Orme/);
  assert.match(open({}), /^Iona: An invoice\./m); assert.match(open({}), /I've made it out to us/);
  assert.match(opening(at('b4-invoice', { phase: 'crisis' })), /put their shoulders to the Long Tally's sledges/);
  assert.match(opening(at('b4-invoice', { phase: 'crisis', flags: ENVOYS })), /come up between the benches for the clerk's table[^]*Burdock does not stop reading/);
  assert.match(opening(at('b4-invoice', { phase: 'crisis', flags: HALL })), /Rue does not stop reading/);
  assert.ok(talkIds('b4-invoice', { flags: ENVOYS }).includes('elske') && !talkIds('b4-invoice').includes('elske'), 'Elske only in saves that have her');
  assert.match(talk('b4-invoice', 'hesk', { flags: HALL }), /I'm the line on her invoice that walked/);
  assert.match(sceneText(decide('b4-invoice', 'share')), /^Burdock: We agree/m);
  assert.match(sceneText(decide('b4-invoice', 'share', { flags: HALL })), /^Rue: We agree/m);
  assert.match(told(decide('b4-invoice', 'refuge', { flags: { b4_embassy_council: false, b4_embassy_refuge: true } })), /voted it once already in the autumn/);
});

test('chapter 23: Aster asks to be asked, or Tovin is asked in her place, and she can only rest where she is in the bell', () => {
  assert.ok(talkIds('b4-quietnight').includes('aster') && !talkIds('b4-quietnight').includes('tovin'));
  assert.ok(talkIds('b4-quietnight', { flags: HALL }).includes('tovin') && !talkIds('b4-quietnight', { flags: HALL }).includes('aster'));
  assert.match(talk('b4-quietnight', 'tovin', { flags: { b3_bell_aster: true } }), /She's at rest/);
  assert.match(talk('b4-quietnight', 'tovin', { flags: HALL }), /She's in Vell's great bell/);
  const ids = (flags) => E.buildView(after('b4-quietnight', { flags })).scene.choices.filter((c) => !c.locked).map((c) => c.id);
  assert.deepEqual(ids({}), ['rings', 'quiet', 'rests']);
  assert.deepEqual(ids({ b3_bell_aster: true }), ['rings', 'quiet']);
  assert.match(told(decide('b4-quietnight', 'rings', { flags: { b3_bell_aster: true } })), /^Tovin: Every night\. That's the keeper's answer/m);
  assert.match(told(decide('b4-quietnight', 'rests')), /At the end of the summer/);
  assert.match(opening(departed('b4-quietnight', { flags: { b4_potbell_kept: true } })), /It is the first white anybody in the south has seen come from the north/);
  assert.doesNotMatch(opening(departed('b4-quietnight')), /pot-bell/);
  assert.match(talk('b4-quietnight', 'linus', { flags: { 'job:third-verse-tovin': true } }), /still Tovin's, with the end left off/);
  assert.match(sceneText(decide('b4-quietnight', 'quiet')), /Inside the bell Aster Vey rings with them/);
  assert.match(sceneText(decide('b4-quietnight', 'quiet', { flags: HALL })), /The bell is bronze only/);
});

test('the Telling tells chapters 21 to 23 in the Journal, by the answer\'s own lines', () => {
  const s = playPeaceful('b4-knot', 'sloe');
  assert.equal(J.sync(s).telling.find((x) => x.id === 'told:b4-knot').ballad, QUESTS['b4-knot'].decisions.find((d) => d.id === 'sloe').told.ballad);
});

test('companions walk out again in Part Three, with Part Three\'s own leave and back lines, and only Orin stays, after chapter 24, because chapter 25 is his', () => {
  for (const [id, who, line] of [['b4-knot', 'orin', /Everything the Wold's people need has to be carried/], ['b4-invoice', 'nessa', /it's still waiting, at our own gate now/], ['b4-quietnight', 'maren', /Maren finds you after supper/]]) {
    let s = after(id);
    s.world.approvalWindow = { [who]: -3 };
    s = walkThrough(choose(s, QUESTS[id].decisions[0].id));
    assert.equal(s.story.nodeId, `away-${who}-leave`, `${id}: ${who} leaves`);
    assert.match(opening(s), line, id);
    assert.doesNotMatch(opening(s), /relief carts|whole country up north/, id);
  }
  // The Part Three lines come first in each group, gated on the end of Part Two, and never mention a goat.
  for (const [who, kind, i] of [['orin', 'leave', 1], ['orin', 'back', 1], ['maren', 'back', 1], ['nessa', 'leave', 2], ['nessa', 'back', 1]]) {
    const group = RAWA[who][kind].lines[i].oneOf;
    assert.deepEqual(group[0].when, { flag: 'b4_parttwo_done' }, `${who} ${kind}`);
    assert.deepEqual(group[1].when, { flag: 'b3_done' }, `${who} ${kind}`);
    assert.doesNotMatch(group[0].text || group[0].narrate, /goat/, `${who} ${kind}`);
  }
  const dog = RAWA.nessa.back.choices.find((c) => c.id === 'dog').lines[0].oneOf;
  assert.deepEqual(dog[0].when, { flag: 'b4_parttwo_done' }); assert.doesNotMatch(dog[0].text, /goat/);
  // After chapter 24 the next chapter is Orin's (the ford), so he stays; Maren can still go.
  let s = after('b4-gatehouse'); s.world.approvalWindow = { orin: -3 };
  s = walkThrough(choose(s, 'taught'));
  assert.equal(s.story.nodeId, 'away-orin-stay');
  assert.match(opening(s), /But it's Ashford next, and the ford/);
  s = after('b4-gatehouse'); s.world.approvalWindow = { maren: -3 };
  assert.equal(walkThrough(choose(s, 'taught')).story.nodeId, 'away-maren-leave');
});

test('roller tokens inside a oneOf in a check result are told for whoever rolled, and roller gates inside it are settled', () => {
  const { storyLine } = require('../src/expansion');
  const lines = [{ oneOf: [{ narrate: '{You} {read|reads} the ledger and {you find|@ finds} {their} place.', when: { flag: 'x' } }, { narrate: 'Only the hero: {your} hands.', when: { roller: 'hero' } }, { narrate: '{They} {shut|shuts} it.' }] }].map(storyLine);
  const outcome = { text: '', dialogue: lines };
  const hero = outcomeForRoller(outcome, { id: 'player' }), maren = outcomeForRoller(outcome, { id: 'maren' });
  assert.deepEqual(hero.dialogue[0].oneOf.map((l) => l.narration), ['You read the ledger and you find your place.', 'Only the hero: your hands.', 'You shut it.']);
  assert.deepEqual(maren.dialogue[0].oneOf.map((l) => l.narration), ['Maren reads the ledger and Maren finds her place.', 'She shuts it.']);
  assert.equal(maren.dialogue[0].oneOf[0].when.flag, 'x');
  assert.equal(maren.dialogue[0].oneOf[1].when, undefined, 'a settled roller gate is dropped');
  assert.doesNotMatch(maren.text, /[{}@]/);
});

test('chapter 24: Sable says how Ailith learned what the bell does, in his cell or in the bell, and Aster answers him unless she is at rest', () => {
  const cast = { b3_sable_cast: true };
  assert.match(talk('b4-gatehouse', 'sable'), /down the cell stair[^]*That is how she knows\. I told her/);
  assert.match(talk('b4-gatehouse', 'sable', { flags: cast }), /stand under the bell[^]*That is how she knows/);
  assert.match(opening(departed('b4-gatehouse', { flags: cast })), /Highpass's bell stands in its frame/);
  assert.doesNotMatch(opening(departed('b4-gatehouse')), /bell stands in its frame/);
  // Aster through the joined bells with Sable cast, by Tovin's letter otherwise, and Sable speaks of her when she is at rest.
  assert.match(talk('b4-gatehouse', 'aster', { flags: cast }), /the bell in the yard answers instead[^]*Briarwatch's bell[^]*Aster Vey: Tell him I was asked/);
  assert.match(talk('b4-gatehouse', 'aster', { flags: { ...cast, b3_bell_aster: true, b3_promise_old: false, b3_promise_hesk: true } }), /Vell's great bell[^]*Aster Vey: Tell him I was asked/);
  assert.match(talk('b4-gatehouse', 'aster'), /in Tovin's careful hand[^]*Aster Vey:/);
  const rest = talk('b4-gatehouse', 'aster', { flags: { b3_bell_aster: true, b3_promise_old: true } });
  assert.match(rest, /Sable: She is at rest/); assert.doesNotMatch(rest, /Aster Vey:/);
  assert.match(talk('b4-gatehouse', 'aster', { flags: { b4_voice_rests: true } }), /I'm going to rest after the harvest/);
  // Hesk only from the next cell, Rue only if she stayed at Highpass in Part One.
  assert.ok(talkIds('b4-gatehouse').includes('hesk') && !talkIds('b4-gatehouse', { flags: { b3_promise_old: false, b3_promise_hesk: true } }).includes('hesk'));
  assert.ok(!talkIds('b4-gatehouse').includes('rue') && talkIds('b4-gatehouse', { flags: { b4_rue_watch: true } }).includes('rue'));
  // Chapter 21's answer: who knows whose cart it is.
  const open = (flags) => opening(departed('b4-gatehouse', { flags }));
  assert.match(open({ b4_accused_open: true }), /Cinder Fold answered the council's letter/);
  assert.match(open({ b4_told_sloe: true }), /whether the promise at the end of the lower watch's street still stands/);
  assert.match(open({ b4_accused_quiet: true }), /Nobody on the council has asked about the bell/);
  assert.match(opening(after('b4-gatehouse', { flags: { b4_accused_open: true } })), /nobody in the hall has to be told who sent them/);
  assert.match(opening(after('b4-gatehouse', { flags: { b4_accused_quiet: true } })), /you can see her do the sum/);
  // The cart is the bell's with Sable cast, and the after says which way the night went.
  assert.match(opening(at('b4-gatehouse', { phase: 'crisis', flags: cast })), /the bell off its beam/);
  assert.match(opening(after('b4-gatehouse', { flags: cast })), /Highpass's bell is on its beam in the frame with the dew on it/);
  // The Other Invoice is read by how it was settled.
  assert.match(open({ 'job:other-invoice-worked': true }), /Paid in wood/);
  assert.doesNotMatch(open({}), /Iona's bill/);
});

test('gatehouse-camp: a companion names the hero\'s level 64 skill for every 2nd job, or it is told with them away, and the cell or the bell follows the answer', () => {
  const JOBS = require('../src/data/jobs.json').classes;
  const camp = RAWS['gatehouse-camp'].nodes.wall.lines;
  const WHO = { orin: ['guardian', 'warlord', 'binder', 'battlepriest', 'pathfinder', 'battlecantor'], maren: ['grifter', 'chronist', 'lifewarden', 'exorcist', 'lorekeeper', 'envoy'] };
  for (const c of Object.values(JOBS)) for (const b of c.branches) {
    const skill = b.thirdSkills.find((x) => x.level === 64).name;
    const who = Object.keys(WHO).find((k) => WHO[k].includes(b.id)) || 'nessa';
    const said = camp.filter((l) => l.when?.spec === b.id);
    assert.deepEqual(said.map((l) => [l.say, l.when.party || null, l.when.absent || null]), [[who, who, null], [undefined, null, who]], b.id);
    for (const l of said) { assert.ok((l.text || l.narrate).includes(skill), `${b.id}: ${skill}`); assert.ok((l.text || l.narrate).includes(b.third.split(' ')[0]), `${b.id}: ${b.third}`); }
  }
  assert.ok(camp.some((l) => l.when?.spec === 'none'));
  const night = (decision, flags) => opening(decide('b4-gatehouse', decision, { flags }));
  assert.match(night('ailith'), /the end cell is dark/);
  assert.match(night('ailith', { b3_sable_cast: true }), /the frame stands empty/);
  assert.match(night('taught'), /writing out tomorrow's lesson/);
  assert.match(night('silent', { b3_sable_cast: true }), /says nothing all night/);
});

test('step 9\'s jobs: Iona\'s Other Invoice on Highpass\'s board during chapters 22 to 24, The Wold Family on Briarwatch\'s once chapter 23 is done, each paying once', () => {
  const { SIDE_JOBS } = require('../src/expansion');
  assert.deepEqual(['other-invoice', 'wold-family'].map((id) => [SIDE_JOBS[id].town, SIDE_JOBS[id].from, SIDE_JOBS[id].until]), [['highpass', 'b4-knot', 'b4-gatehouse'], ['briarwatch', 'b4-quietnight', 'b4-gatehouse']]);
  const offered = (id, chapter, done = false, flags) => { const s = at(chapter, { flags }); if (done) s.world.completed[chapter] = { xp: 0, gold: 0 }; s.world.townId = SIDE_JOBS[id].town; s.story.nodeId = `town-${SIDE_JOBS[id].town}`; return (E.buildView(s).world.sideJobs || []).some((j) => j.id === id); };
  assert.ok(!offered('other-invoice', 'b4-knot') && offered('other-invoice', 'b4-invoice') && offered('other-invoice', 'b4-gatehouse') && !offered('other-invoice', 'b4-gatehouse', true));
  assert.ok(!offered('wold-family', 'b4-quietnight') && offered('wold-family', 'b4-gatehouse'));
  const start = (id, chapter, flags = {}, party) => { const s = at(chapter, { flags, party }); s.world.townId = SIDE_JOBS[id].town; s.story.nodeId = `town-${s.world.townId}`; return act(s, { type: 'side-job', jobId: id }).state; };
  // The offset needs chapter 22's invoice read in the hall.
  const offset = (flags) => E.buildView(start('other-invoice', 'b4-invoice', flags)).scene.choices.find((c) => c.id === 'offset');
  assert.ok((!offset({}) || offset({}).locked) && !offset({ b4_vote_share: true }).locked);
  assert.match(opening(start('other-invoice', 'b4-invoice')), /Burdock has seen it/);
  assert.match(opening(start('other-invoice', 'b4-invoice', HALL)), /Rue has seen it/);
  assert.match(opening(start('wold-family', 'b4-gatehouse')), /the Wold's tents are still up/);
  assert.match(opening(start('wold-family', 'b4-gatehouse', HALL)), /Two of the Wold's door-bearers stayed/);
  const parties = [[], ['orin', 'maren', 'nessa'], ['orin', 'maren']];
  for (const [id, chapter] of [['other-invoice', 'b4-invoice'], ['wold-family', 'b4-gatehouse']]) for (const party of parties) for (const flags of [{ b4_vote_share: true }, { ...HALL, b4_vote_share: true }]) {
    for (const c of STORY_NODES[`job-${id}-${SIDE_JOBS[id].start}`].choices) for (const rng of c.check ? [high, low] : [high]) {
      let s = start(id, chapter, flags, party);
      const xp = s.player.xp, gold = s.player.gold, level = s.player.level;
      assert.doesNotMatch(opening(s), /[{}@]|\n\s*\n/);
      for (const who of ['orin', 'maren', 'nessa']) if (!party.includes(who)) assert.doesNotMatch(opening(s), COMPANION_NAMES[who], `${id}: ${who} away`);
      s = act(s, { type: 'story-choice', choiceId: c.id }, rng).state;
      assert.doesNotMatch(told(s), /[{}@]|\n\s*\n/, `${id}/${c.id}`);
      assert.equal(s.story.nodeId, `town-${SIDE_JOBS[id].town}`, `${id}/${c.id}`);
      assert.equal(s.story.flags[`job:${id}`], true);
      assert.ok(s.player.xp - xp <= 130 && s.player.gold - gold >= 120 && s.player.gold - gold <= 180, `${id}/${c.id}`);
      assert.equal(s.player.level, level, `${id}: never past the chapter`);
      assert.ok(Object.keys(s.story.flags).some((f) => f.startsWith(`job:${id}-`)), `${id}/${c.id} sets its answer`);
    }
  }
});

test('chapters 21 to 24 each give their own Legendary reward on the tier 60 curve: better than the sold piece of its kind on something, never all of a tier 65 piece, never all of a warm one', () => {
  const GEAR = require('../src/data/gear.json'), { ITEMS } = require('../src/content');
  const rewards = GEAR.filter((i) => IDS.includes(i.exclusive?.quest));
  assert.deepEqual(rewards.map((i) => [i.exclusive.quest, i.name, i.slot, i.requires.level]), [
    ['b4-knot', "Founders' Rope-knot", 'accessory', 58], ['b4-invoice', 'Council Ledger-case', 'accessory', 59],
    ['b4-quietnight', 'Quiet-night Lantern', 'accessory', 60], ['b4-gatehouse', 'Gatehouse Grammar', 'mainHand', 61]]);
  for (const item of rewards) {
    assert.equal(item.rarity, 'Legendary', item.id);
    assert.equal(item.requires.level, QUESTS[item.exclusive.quest].level - 2, item.id);
    assert.equal(item.value, 340 + 10 * item.requires.level, item.id);
    assert.ok(!item.warm, `${item.id}: the free wards' white is the old one`);
  }
  assert.deepEqual(ITEMS['gatehouse-grammar'].requires.classes, ['wizard']);
  assert.equal(ITEMS['gatehouse-grammar'].skill.name, 'Unravel');
  assert.deepEqual(rewards.map((i) => i.story?.skill || null), ['athletics', 'investigation', 'perception', null]);
  // No accessory or focus is sold at tier 60, so the sold piece of its kind at 60 is tier 55's.
  const sold = (pred, level) => GEAR.filter((i) => !i.exclusive && i.requires?.level === level && pred(i));
  assert.deepEqual(sold((i) => i.slot === 'accessory' || i.category === 'focus', 60), []);
  const keys = (i) => [...Object.entries(i.skillBonuses || {}).map(([k, v]) => `skill:${k}:${v}`), ...Object.entries(i.saveBonuses || {}).map(([k, v]) => `save:${k}:${v}`), ...(i.skill ? [`effect:${i.skill.effect}`] : []), ...(i.story ? [`story:${i.story.skill}`] : []),
    ...['dealt', 'taken'].filter((k) => i.stats?.[k]).map((k) => `${k}:${i.stats[k]}`), ...['acBonus', 'spellAttackBonus', 'spellDcBonus'].filter((k) => i[k]).map((k) => `${k}:${i[k]}`)];
  const covers = (a, b) => keys(b).every((k) => keys(a).includes(k)) && !(b.warm && !a.warm);
  // Better than the sold tier 55 piece on something real: a skill or save bonus it lacks, or a higher number.
  for (const r of rewards.filter((i) => i.slot === 'accessory')) for (const w of sold((i) => i.slot === 'accessory', 55)) assert.ok(Object.keys(r.skillBonuses).some((k) => !w.skillBonuses?.[k]), `${r.id} has a skill bonus ${w.id} has not`);
  const staff = ITEMS['lamplit-staff'], grammar = ITEMS['gatehouse-grammar'];
  assert.ok(grammar.spellDcBonus > staff.spellDcBonus && grammar.spellAttackBonus === staff.spellAttackBonus && grammar.stats.dealt === staff.stats.dealt, 'one more DC than the Lamplit Staff, nothing else higher');
  // Never everything a tier 65 piece of its kind has, nor everything a sold warm piece has.
  for (const r of rewards) for (const t of sold((i) => i.slot === r.slot && i.category === r.category, 65)) assert.ok(!covers(r, t) && keys(t).some((k) => !keys(r).includes(k)), `${r.id} does not beat ${t.id} outright`);
  for (const r of rewards) for (const w of GEAR.filter((i) => i.warm && !i.exclusive && i.slot === r.slot)) assert.ok(!covers(r, w), `${r.id} is not strictly better than ${w.id}`);
  for (const r of rewards.filter((i) => i.slot === 'accessory')) assert.ok((r.stats.dealt || 0) < 0.2 && (r.stats.taken || 0) > -0.15, `${r.id} under the Long Hall Muffler's 20% and the Orme Hearthstone's 15%`);
  // Given once, when the chapter is done.
  const s = playPeaceful('b4-gatehouse', 'silent', { party: [] });
  assert.equal(s.player.inventory.filter((e) => e.itemId === 'gatehouse-grammar').reduce((n, e) => n + e.quantity, 0), 1);
});
