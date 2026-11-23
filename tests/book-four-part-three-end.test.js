'use strict';
// Book Four, Part Three, build step 11 (docs/book-four/DESIGN.md): chapters 28
// to 30, the end of the book; the parting scene (the bound voices, the Telling
// and the epilogue at Dera's forge), which frames the 4th job trial; the
// rewards for 28 to 30; and the stay lines for 29 and 30. Every part is
// previewed. node --test runs each file in its own process, so these settings
// reach no other file. Nothing here calls the paid API. The lints that read the
// whole of Book Four's data are in tests/book-four-part-one.test.js and cover these too.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), D = require('../src/director'), Telling = require('../src/telling');
const { STORY_NODES, ENEMIES, ENCOUNTERS, ITEMS } = require('../src/content');
const { QUESTS, SCENES, outcomeForRoller, trialFraming } = require('../src/expansion');
const high = () => .999999, low = () => 0;

const IDS = ['b4-ropes', 'b4-lid', 'b4-parting'];
const RAWQ = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/quests.json'), 'utf8'));
const RAWA = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/away.json'), 'utf8'));
const everyLine = (v) => { const out = []; JSON.stringify(v, (k, x) => { if (x && typeof x === 'object' && !Array.isArray(x) && (x.narrate !== undefined || x.say !== undefined)) out.push(x); return x; }); return out; };
const END = SCENES['b4-parting-end'];

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
const BOOK_THREE = { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true, b3_ashford_defended: true };
const PART_ONE = { b4_rue_party: true, b4_davin_comes: true, b4_book_returned: true, b4_key_carried: true, b4_letters_read: true, b4_embassy_council: true, b4_unannounced: true, b4_bw_quiet: true, b4_truth_published: true, b4_partone_done: true };
const PART_TWO = { b4_gave_lantry: true, b4_orin_ordered: true, b4_tally_truth: true, b4_names_written: true, b4_rue_kept: true, b4_demand_carried: true, b4_potbell_rota: true,
  b4_walkers_led: true, b4_tally_carried: true, b4_crossed: true, b4_parttwo_done: true };
const PART_THREE = { b4_accused_open: true, b4_vote_share: true, b4_voice_rings: true, b4_sable_taught: true, b4_orin_captain: true, b4_maren_vouched: true, b4_nessa_with_rue: true, b4_ailith_judged: true, b4_holder_sloe: true };
// The other ways the story can have gone.
const HALL = { b3_promise_old: false, b3_stair_sealed: true, b3_sable_cast: true, b4_sable_taught: false, b4_sable_ailith: true, mother_silenced: true, b4_potbell_rota: false, b4_potbell_kept: true,
  b4_tally_carried: false, b4_tally_left: true, b4_orin_captain: false, b4_orin_soldier: true, b4_maren_vouched: false, b4_maren_doubts: true, b4_nessa_with_rue: false, b4_nessa_stops_rue: true,
  b4_ailith_judged: false, b4_ailith_ropes: true, b4_holder_sloe: false, b4_holder_you: true, b4_vote_share: false, b4_vote_refuge: true, 'job:mould-sold': true, 'job:ninth-rope-given': true };
const ENVOYS = { b3_promise_old: false, b3_promise_hesk: true, b3_three_told: true, b3_wren_cast: true, b3_bell_cast: true, b4_sable_taught: false, b4_sable_silent: true, mother_recalled: true, b4_potbell_rota: false, b4_potbell_broken: true,
  b4_tally_carried: false, b4_tally_last: true, b4_orin_captain: false, b4_orin_davin: true, b4_maren_vouched: false, b4_maren_doubts: true, b4_accused_open: false, b4_told_sloe: true, b4_nessa_with_rue: false, b4_nessa_signal: true,
  b4_ailith_judged: false, b4_ailith_committee: true, b4_holder_sloe: false, b4_holder_council: true, b4_vote_share: false, b4_rota_towns: true, 'job:mould-kept': true, 'job:ninth-rope-stair': true };
const ASTER = { b3_bell_aster: true, b4_voice_rings: false, b4_voice_quiet: true, b4_maren_vouched: false, b4_maren_silent: true, b3_vault_held: true, wards_seat: true, 'job:ninth-rope-spare': true };
const RESTS = { b4_voice_rings: false, b4_voice_rests: true, b4_nessa_with_rue: false, b4_nessa_signal: true, b4_rue_kept: false, b4_rue_gave: true, mother_recalled: true, mother_silenced: true };
const FLAGSETS = [{}, HALL, ENVOYS, ASTER, RESTS];
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
const departed = (id, opts) => act(at(id, opts), { type: 'depart', questId: id }).state;
const talk = (id, talkId, opts) => told(choose(departed(id, opts), `talk-${talkId}`));
const talkIds = (id, opts) => E.buildView(departed(id, opts)).scene.choices.filter((c) => c.id.startsWith('talk-') && !c.locked).map((c) => c.id.slice(5));
const after = (id, opts = {}) => at(id, { ...opts, phase: 'after', flags: { [`method:${id}`]: 'peace', ...(opts.flags || {}) } });
const decide = (id, decision, opts = {}) => choose(after(id, opts), decision);
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
// The parting scene, from chapter 30's answer, with the Telling chosen.
function epilogue(ending, telling = 'ballad', opts = {}) {
  let s = decide('b4-parting', ending, opts);
  const voices = opening(s);
  assert.equal(s.story.nodeId, 'scene-b4-parting-end-voices');
  s = choose(s, 'on');
  const tellingText = opening(s);
  s = choose(s, telling);
  const chose = told(s);
  assert.equal(s.story.nodeId, 'scene-b4-parting-end-home');
  const home = opening(s);
  s = choose(s, 'home');
  return { s, voices, telling: tellingText, chose, home };
}
const COMPANION_NAMES = { orin: /\b(Orin|Stoneward)\b/, maren: /\bMaren\b|\bSister\b(?! Ilse)/, nessa: /\b(Nessa|Reed|Biscuit)\b/ };
const EXPECT = {
  'b4-ropes': { judged: ['b4_ailith_judged', { maren: 1 }, { wardens: 1 }], committee: ['b4_ailith_committee', { orin: 1 }, { wilds: 1 }], ropes: ['b4_ailith_ropes', { nessa: 1 }, { wold: 1 }] },
  'b4-lid': { sloe: ['b4_holder_sloe', { maren: 1 }, { wold: 1 }], council: ['b4_holder_council', { orin: 1 }, { wardens: 1 }], you: ['b4_holder_you', { nessa: 1 }, { wilds: 1 }] },
  'b4-parting': { share: ['b4_winter_shared', { maren: 1 }, { wold: 1 }], south: ['b4_wold_south', { orin: 1 }, { wardens: 1 }], note: ['b4_note_rung', { nessa: 1 }, { wold: 1 }] }
};

test('chapters 28 to 30 end the book at Cinder Fold: 28 and 29 go straight on, 30 tops the hero up to 70 and goes home to Briarwatch', () => {
  assert.deepEqual(FX.WRITTEN.slice(27, 30), IDS);
  assert.deepEqual(FX.WRITTEN, FX.IDS, 'every chapter of Book Four is written');
  assert.deepEqual(IDS.map((id) => { const q = QUESTS[id]; return [q.id, q.book, q.part, q.level, q.unlock, q.town, q.nextTown, q.continues, q.levelFloor, q.enemyTheme]; }), [
    ['b4-ropes', 4, 3, 67, 'b4-signal', 'cinderfold', 'cinderfold', true, undefined, 'soldier'],
    ['b4-lid', 4, 3, 68, 'b4-ropes', 'cinderfold', 'cinderfold', true, undefined, 'gloam'],
    ['b4-parting', 4, 3, 69, 'b4-lid', 'cinderfold', 'briarwatch', undefined, 70, 'gloam']
  ]);
  for (const id of IDS) {
    const q = QUESTS[id];
    assert.equal(q.xp, P.levelBand(q.level), `${id} pays exactly one level`);
    assert.equal(q.gold, 20 * q.level + 40, `${id} gold`);
    assert.equal(q.white, undefined, id); assert.equal(q.needs, undefined, id);
    for (const key of ['opening', 'approach', 'crisis', 'after']) assert.ok(Array.isArray(q[key]) && q[key].length, `${id}.${key}`);
    assert.ok(q.talks.length >= 4, `${id} talks`);
    assert.deepEqual(q.decisions.map((d) => d.id), Object.keys(EXPECT[id]), id);
    for (const d of q.decisions) { assert.ok(d.told?.ballad && d.told?.tally, `${id}/${d.id}`); assert.equal(d.requires, undefined, `${id}/${d.id} is always open`); }
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName);
    assert.equal(q.peaceful.success.filter((l) => l.when?.flag === `prepared:${id}`).length, 1, id);
    assert.equal(q.peaceful.success.filter((l) => l.when?.flag === `approach:${id}`).length, 1, id);
    assert.equal(q.peaceful.success.filter((l) => l.when?.notFlag === `approach:${id}`).length, 1, id);
  }
  assert.deepEqual(ENCOUNTERS['quest:b4-lid'].flagScale, { b4_sable_silent: 1.1 });
  assert.deepEqual(ENCOUNTERS['quest:b4-parting'].flagScale, { b4_holder_you: 1.15, b4_holder_council: 0.9 });
  // Only chapter 30 has a scene after it, and the straight-on chapters have their ledges.
  assert.deepEqual(IDS.map((id) => Object.values(SCENES).filter((x) => x?.after === id).map((x) => x.id)), [[], [], ['b4-parting-end']]);
  for (const id of ['b4-ropes', 'b4-lid']) assert.ok(STORY_NODES[`q-${id}-ledge`]?.ledge === id, id);
});

test('every chapter plays to its end peacefully by every answer, sets only its flag, and levels the hero by one', () => {
  for (const id of IDS) for (const [decision, [flag]] of Object.entries(EXPECT[id])) {
    const s = playPeaceful(id, decision);
    assert.ok(s.world.completed[id], `${id}/${decision}`);
    assert.equal(s.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(EXPECT[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(s.story.flags[other], id === 'b4-ropes' || id === 'b4-lid' ? (PART_THREE[other] || undefined) : undefined, `${id}/${decision} not ${other}`);
    if (id !== 'b4-parting') {
      assert.equal(s.player.level, QUESTS[id].level + 1, id);
      assert.equal(s.player.xp, P.XP_NEXT[QUESTS[id].level - 1] + QUESTS[id].xp, id);
    }
  }
});

test('chapters 28 and 29 go straight on into the next chapter\'s opening, and a defeat in 29 or 30 wakes on the ledge before it', () => {
  let s = decide('b4-ropes', 'judged');
  assert.equal(s.story.nodeId, 'q-b4-lid-start'); assert.equal(s.world.activeQuest, 'b4-lid');
  s = decide('b4-lid', 'sloe');
  assert.equal(s.story.nodeId, 'q-b4-parting-start'); assert.equal(s.world.activeQuest, 'b4-parting');
  for (const [id, ledge, line] of [['b4-lid', 'q-b4-ropes-ledge', /You wake on the casting floor/], ['b4-parting', 'q-b4-lid-ledge', /You wake at the head of the founders' stair/]]) {
    let f = choose(at(id, { phase: 'crisis' }), 'confront');
    assert.equal(f.combat?.encounterId, `quest:${id}`);
    f = act(f, { type: 'combat', actionId: 'retreat' }).state;
    assert.equal(f.story.nodeId, ledge, `${id}: the ledge, not a town`);
    assert.match(opening(f), line);
    f = choose(f, 'down');
    assert.equal(f.combat?.encounterId, `quest:${id}`, `${id}: back down to the fight`);
  }
});

test('chapter 30 tops a hero who is behind up to 70, and its scene goes home to Briarwatch with Book Four done', () => {
  let s = strong(at('b4-parting'));
  s.player.xp = P.XP_NEXT[64]; s.player.level = 66;
  s = act(s, { type: 'depart', questId: 'b4-parting' }).state;
  s = choose(s, 'investigate'); s = choose(s, 'advance'); s = choose(s, 'careful'); s = choose(strong(s), 'resolve');
  s = choose(s, 'share');
  assert.equal(s.player.level, 70);
  assert.ok(s.player.xp >= P.XP_NEXT[69]);
  const e = epilogue('share');
  assert.equal(e.s.story.nodeId, 'town-briarwatch');
  assert.equal(e.s.story.flags.b4_done, true); assert.equal(e.s.story.flags.fourth_telling, 'ballad');
  assert.match(e.home, /There is a trial waiting at the Hall of Legends for the next thing you will be\./);
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
  for (const [id, fought] of [['b4-ropes', /blood on the iron by the third bell/], ['b4-lid', /scored white across its floor/], ['b4-parting', /scored white between the bells/]]) {
    const failed = act(at(id, { phase: 'crisis' }), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    let s = choose(at(id, { phase: 'crisis' }), 'confront');
    assert.ok(s.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    assert.match(opening(s), fought, id);
    assert.doesNotMatch(opening(s), /[Nn]obody is hurt/, id);
  }
});

test('with no companions, and with each one away, every chapter and the parting scene are told whole, after each way the story can have gone, with no empty line, no token and no absent companion', () => {
  const parties = [[], ['maren', 'nessa'], ['orin', 'nessa'], ['orin', 'maren'], ['orin', 'maren', 'nessa']];
  const clean = (text, party, where) => {
    assert.ok(text && text.trim().length, `${where}: something is told`);
    assert.doesNotMatch(text, /\n\s*\n|undefined|null|[{}@]/, `${where}: no empty line or token`);
    for (const who of ['orin', 'maren', 'nessa']) if (!party.includes(who)) assert.doesNotMatch(text, COMPANION_NAMES[who], `${where}: ${who} is away`);
  };
  for (const flags of FLAGSETS) for (const party of parties) {
    const opts = { party, flags };
    for (const id of IDS) {
      clean(opening(departed(id, opts)), party, `${id} opening [${party}]`);
      for (const t of talkIds(id, opts)) clean(talk(id, t, opts), party, `${id}/${t} [${party}]`);
      for (const phase of ['approach', 'crisis']) clean(opening(at(id, { ...opts, phase })), party, `${id} ${phase} [${party}]`);
      clean(opening(after(id, opts)), party, `${id} after [${party}]`);
      for (const d of QUESTS[id].decisions) clean(told(decide(id, d.id, opts)), party, `${id}/${d.id} [${party}]`);
    }
    for (const ending of ['share', 'south', 'note']) for (const telling of ['ballad', 'tally', 'companions', 'none']) {
      const e = epilogue(ending, telling, opts);
      for (const key of ['voices', 'telling', 'chose', 'home']) clean(e[key], party, `epilogue ${ending}/${telling} ${key} [${party}] ${JSON.stringify(flags).slice(0, 40)}`);
    }
  }
  // Each ledge, too.
  for (const id of ['b4-ropes', 'b4-lid']) clean(STORY_NODES[`q-${id}-ledge`].opening || STORY_NODES[`q-${id}-ledge`].lines.map((l) => l.narrate).join('\n'), [], id);
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
  const lid = STORY_NODES['q-b4-lid-crisis'].choices.find((c) => c.id === 'resolve').success;
  assert.match(outcomeForRoller(lid, { id: 'player' }).text, /Orin goes down the stair to the vault/);
  assert.doesNotMatch(outcomeForRoller(lid, { id: 'orin' }).text, /Orin goes down the stair to the vault/);
  assert.match(outcomeForRoller(lid, { id: 'orin' }).text, /Orin stands at the head of the stair/);
});

test('chapter 28 reads the Mother Bell, the doors, the mould, the ninth rope and who stands by Ailith', () => {
  const open = (flags, party) => opening(departed('b4-ropes', { flags, party }));
  assert.match(open({}), /The Mother Bell's rope is up/); assert.match(open({ mother_silenced: true }), /The Mother Bell hangs bare/);
  assert.match(open({ mother_recalled: true }), /Now you'd take it off a town/);
  assert.match(open({}), /Orin's forty are across the street[^]*learnt every name/);
  assert.match(open({}, ['maren', 'nessa']), /under the captain Sorrel's paper made/);
  assert.match(open({ b4_orin_captain: false, b4_orin_davin: true }), /Davin has the rear door/);
  assert.match(open({ b4_orin_captain: false, b4_orin_soldier: true }), /Sorrel's sergeant in front of them/);
  assert.match(open({ b3_promise_old: false, b3_promise_hesk: true }), /Hesk stands beside her/);
  assert.match(open(HALL), /a bell hums[^]*Sable/);
  const clue = (flags) => told(choose(departed('b4-ropes', { flags }), 'investigate'));
  assert.match(clue({ 'job:mould-sold': true }), /Since Cinder Fold does not sell/);
  assert.match(clue({ 'job:mould-kept': true }), /stands in the casting hall against the wall/);
  assert.match(clue({}), /the founders' ledger in its iron box/);
  for (const flags of [{}, { 'job:mould-sold': true }]) assert.match(clue(flags), /Not this way\. Ask them all\./);
  assert.match(talk('b4-ropes', 'son', { flags: { 'job:ninth-rope-given': true } }), /on the ninth's rope, sits Garth Mott/);
  assert.match(talk('b4-ropes', 'son', { flags: { 'job:ninth-rope-stair': true } }), /the gallery bell/);
  assert.match(talk('b4-ropes', 'son', {}), /old Perrin Rowe/);
  // Sloe keeps the north door only on Maren's word.
  assert.ok(talkIds('b4-ropes', {}).includes('sloe'));
  assert.ok(!talkIds('b4-ropes', { flags: { b4_maren_vouched: false, b4_maren_silent: true } }).includes('sloe'));
  assert.match(talk('b4-ropes', 'sloe', { party: ['orin', 'nessa'] }), /Your healer wrote my name/);
  // The peaceful way is easier when the families know, and harder with Sable at Ailith's side.
  const check = (flags) => STORY_NODES['q-b4-ropes-crisis'].choices.find((c) => c.id === 'resolve').check;
  assert.deepEqual(check().easierWith.anyFlag, ['b4_accused_open', 'b4_truth_ailith']);
  assert.equal(check().harderWith.flag, 'b4_sable_ailith');
});

test('chapter 29: who struck the half note, how Sloe comes in, and who answers through the joined bells', () => {
  const open = (flags, party) => opening(departed('b4-lid', { flags, party }));
  assert.match(open({}), /I wanted to know I had it right/); assert.match(open({ b4_sable_taught: false, b4_sable_silent: true }), /I'd only guessed the note/);
  assert.match(open({}), /Sloe comes in by the north door, the door she was given to keep/);
  assert.match(open({ b4_maren_vouched: false, b4_maren_doubts: true }), /comes up through the lid, by the hatch at the foot of the marked way/);
  // Told Sloe and Maren doubted her: the hero's word wins, and one line says Maren doubted.
  const both = { b4_maren_vouched: false, b4_maren_doubts: true, b4_told_sloe: true, b4_accused_open: false };
  assert.match(open(both), /because it was you who told her where the bell was[^]*Maren would not vouch for her/);
  assert.match(open(both, ['orin', 'nessa']), /harbour's clerk wrote that she should be watched/);
  assert.match(open({ b4_maren_vouched: false, b4_maren_silent: true }), /comes in at the great doors/);
  assert.match(open({}), /its rope up/); assert.match(open({ mother_silenced: true }), /bare, its rope still in the signal house/);
  assert.match(open({ mother_recalled: true }), /The council recalled that bell three winters ago/);
  assert.match(talk('b4-lid', 'aster', {}), /^Aster Vey: It's in every one of us[^]*Ring them in time/m);
  assert.match(talk('b4-lid', 'aster', { flags: { b4_voice_rings: false, b4_voice_rests: true } }), /^Tovin: Can you hear this/m);
  assert.doesNotMatch(talk('b4-lid', 'aster', { flags: { b4_voice_rings: false, b4_voice_rests: true } }), /Aster Vey:/);
  assert.match(talk('b4-lid', 'aster', { flags: { b3_bell_aster: true } }), /^Tovin:/m, 'Book Three\'s old way: Aster rested from Vell\'s bell');
  assert.match(talk('b4-lid', 'aster', { flags: { b3_bell_aster: true, b3_promise_old: false, b3_stair_sealed: true } }), /^Aster Vey: It's in every one of us\. Every bell with somebody in it, from Vell/m);
  assert.ok(!talkIds('b4-lid', { flags: { b4_tally_carried: false, b4_tally_left: true } }).includes('burdock'));
  const clue = (flags) => told(choose(departed('b4-lid', { flags }), 'investigate'));
  assert.match(clue({ wards_seat: true }), /The nine are only bronze now/); assert.match(clue({}), /the voices in them are pulling against each other/);
});

test('chapter 30: who holds the bell, the Mother Bell\'s note, the forward ring never offered, and who rings Sloe\'s note', () => {
  const open = (flags) => opening(departed('b4-parting', { flags }));
  assert.match(open({}), /Sloe sitting beside it/); assert.match(open({ b4_holder_sloe: false, b4_holder_council: true }), /Brannagh on a stool beside it/);
  assert.match(open({ b4_holder_sloe: false, b4_holder_you: true }), /with your hand on it/);
  assert.match(open({ mother_silenced: true }), /yours to allow/); assert.match(open({ mother_recalled: true }), /^Brannagh: The council asks for the midwinter note/m);
  assert.match(open({}), /Ottilie has the letters/);
  assert.match(open({ b4_potbell_rota: false, b4_potbell_kept: true }), /Campion is standing under Dunnet's pot-bell/);
  assert.match(open({ b4_potbell_rota: false, b4_potbell_broken: true }), /nothing in the Wold rings at all/);
  // Forward is never a choice.
  assert.doesNotMatch(QUESTS['b4-parting'].decisions.map((d) => d.label).join(' '), /[Ff]orward/);
  assert.deepEqual(STORY_NODES['q-b4-parting-after'].choices.map((c) => c.id), ['share', 'south', 'note']);
  const note = (flags, party) => told(decide('b4-parting', 'note', { flags, party }));
  assert.match(note({}), /Rue comes across the lid to the Parting Bell with Nessa beside her[^]*Hello\. I'm Nessa/);
  assert.match(note({}, ['orin', 'maren']), /Rue comes across the lid to the Parting Bell, and asks/);
  assert.match(note({ b4_nessa_with_rue: false, b4_nessa_signal: true }), /Rue lets go of the rope/);
  assert.match(note({ b4_nessa_with_rue: false, b4_nessa_stops_rue: true }), /Sloe takes the Parting Bell's rope herself[^]*Sloe lets go of the rope/);
  assert.match(told(decide('b4-parting', 'south', { flags: { b4_vote_share: false, b4_vote_refuge: true, b4_embassy_council: false, b4_embassy_refuge: true } })), /ten thousand/);
  assert.match(told(decide('b4-parting', 'south')), /I will not come/);
  // The peaceful way is easier after the rota, the vote, the council's hands or both notes.
  assert.deepEqual(STORY_NODES['q-b4-parting-crisis'].choices.find((c) => c.id === 'resolve').check.easierWith.anyFlag, ['b4_potbell_rota', 'b4_vote_share', 'b4_holder_council', 'b4_sable_taught']);
});

test('the parting scene: the bound voices answer by Book Three and chapter 23, the Telling sets its keeper, and the epilogue follows the ending', () => {
  assert.deepEqual(Object.keys(END.nodes), ['voices', 'telling', 'home']);
  assert.deepEqual(END.cast, []); assert.equal(END.nodes.home.framesTrial, true);
  assert.deepEqual(END.nodes.telling.choices.map((c) => [c.id, c.setFlags.fourth_telling]), [['ballad', 'ballad'], ['tally', 'tally'], ['companions', 'companions'], ['none', 'none']]);
  // The bound voices.
  assert.match(epilogue('note', 'ballad', { flags: { b3_promise_old: false, b3_stair_sealed: true } }).voices, /silent tonight, against Aster's own answer/);
  assert.match(epilogue('note', 'ballad', { flags: ASTER }).voices, /with the rest, whatever its keeper answered at midsummer/);
  // With the note rung, the bound voices are quiet for a winter: nobody else answers (review of step 11).
  for (const flags of FLAGSETS) {
    const v = epilogue('note', 'ballad', { flags }).voices;
    assert.match(v, /^After midnight, every bell in the free wards with somebody in it should answer[^]*none of them can\.[^]*Then nothing else answers/, JSON.stringify(flags));
    assert.doesNotMatch(v, /^(Wren|Sable):|answer together|Hesk's company answer|The nine answer last|thirty-one iron bells ring once|The nine say nothing/m, JSON.stringify(flags));
  }
  assert.match(epilogue('share', 'ballad', { flags: ENVOYS }).voices, /^After midnight, every bell in the free wards with somebody in it answers what has been done/);
  assert.doesNotMatch(epilogue('share', 'ballad', { flags: ENVOYS }).voices, /Then nothing else answers/);
  assert.match(epilogue('share', 'ballad', { flags: RESTS }).voices, /Aster is at rest/);
  assert.match(epilogue('share').voices, /The nine answer last/); assert.match(epilogue('share', 'ballad', { flags: { wards_seat: true } }).voices, /The nine say nothing\. They rested/);
  const env = epilogue('share', 'ballad', { flags: ENVOYS }).voices;
  assert.match(env, /^Wren: Still here/m); assert.match(env, /Hesk's company answer, the ones who stayed/); assert.match(env, /In Vell the voices in the city's bells answer together/);
  assert.match(epilogue('share', 'ballad', { flags: { b3_promise_old: false, b3_stair_sealed: true, b3_vault_held: true } }).voices, /thirty-one iron bells ring once/);
  assert.doesNotMatch(epilogue('share', 'ballad', { flags: { b3_vault_held: true } }).voices, /thirty-one/);
  // The epilogue, by the ending.
  assert.match(epilogue('share').home, /every town in the free wards has kept its quiet nights on the rota/);
  assert.match(epilogue('share', 'ballad', { flags: { b3_promise_old: false, b3_stair_sealed: true } }).home, /from the north branch, at the Wold's floor[^]*Named towns have hard winters/);
  assert.match(epilogue('south').home, /the rest of the Wold comes over the peaks behind you[^]*to the families already wintering in the towns[^]*Long Tally comes south[^]*Sloe does not come south/);
  assert.match(epilogue('south', 'ballad', { flags: HALL }).home, /The Long Tally ends in Orme, in the Long Hall, with Burdock/);
  assert.match(epilogue('note').home, /the free wards' worst winter[^]*Towns fall[^]*Rue does not know any of you[^]*Nessa wrote its first page/);
  assert.match(epilogue('share', 'ballad', { flags: HALL }).home, /still on the first bell at Cinder Fold, under watch/);
  assert.match(epilogue('share', 'ballad', { flags: ENVOYS }).home, /Cinder Fold's committee judges Ailith Strake/);
  assert.match(epilogue('share').home, /judged at Highpass in the spring session/);
  assert.match(epilogue('share').home, /Orin comes in from the square in the council's grey/);
  assert.match(epilogue('share', 'ballad', { flags: { 'job:wold-family-forge': true, 'job:walkers-names-given': true } }).home, /Betony of Lantry's chalk[^]*given by Annis Corby/);
  // The Telling.
  assert.match(epilogue('share', 'companions').chose, /Orin keeps the ford[^]*Maren keeps the names[^]*Nessa keeps the signal/);
  assert.match(epilogue('share', 'companions', { party: ['maren'] }).chose, /The soldier who carried the back[^]*The girl who went first/);
  assert.match(epilogue('share', 'tally', { flags: HALL }).chose, /You tell Rue it is the tally's\. She writes it to Burdock, at Orme/);
  // The tally left in Orme, and Rue's memory rung away: Sloe writes it (review of step 11).
  const rung = epilogue('note', 'tally', { flags: { ...HALL, b4_nessa_with_rue: true } });
  assert.match(rung.telling, /Sloe is by the brazier with her slate/); assert.doesNotMatch(rung.telling, /Rue is by the brazier/);
  assert.match(rung.chose, /You tell Sloe it is the tally's/);
  assert.match(epilogue('share', 'ballad', { flags: { 'job:wold-family-rule': true } }).home, /Eleven doors on the Briarwood edge/);
  assert.match(epilogue('share', 'ballad', { flags: { 'job:wold-family-asked': true } }).home, /Two doors on the Briarwood edge[^]*Both houses were asked first/);
  assert.match(epilogue('share', 'ballad', { flags: { 'job:walkers-names-sure': true } }).home, /to the man she calls Merrick/);
  assert.match(epilogue('share', 'ballad', { flags: { 'job:walkers-names-plain': true } }).home, /Annis Corby has not been back/);
  for (const k of Telling.KEEPERS) assert.equal(epilogue('share', k).s.story.flags.fourth_telling, k);
  assert.match(epilogue('share', 'none').home, /Linus does not sing the song/);
});

test('the 4th trial is framed by Dera\'s line for the keeper, with Sloe\'s note and the Hall the book ended with', () => {
  const frame = (ending, telling, flags) => { const e = epilogue(ending, telling, { flags }); return { text: trialFraming(e.s, 'fourth'), s: e.s, home: e.home }; };
  assert.match(frame('share', 'ballad').text, /^Dera: They're singing it already, and wrong in places\. Go and make the next verse true\.\nAt the Hall of Legends the Parting Bell hangs on its hook again, silent\.$/);
  assert.match(frame('south', 'tally').text, /^Dera: Burdock's written you down[^]*the hook is empty, and the north door is barred\.$/);
  assert.match(frame('note', 'companions').text, /^Dera: They've each got a piece of it[^]*Somebody gave everything so that you could carry the rest[^]*hangs on its hook again\. It has been rung once, and everybody knows which way\.$/);
  assert.match(frame('share', 'none').text, /^Dera: Nobody's going to tell it\. Go and do it anyway\./);
  // The epilogue ends with the same lines the trial opens with, offline and in the AI brief.
  const f = frame('note', 'ballad');
  assert.ok(f.home.endsWith(f.text), 'the epilogue\'s last node ends with the framing');
  assert.ok(D.writtenTrial(f.s, 'fourth').opening.startsWith(`${f.text.replace(/\n/g, ' ')}`.slice(0, 40)));
  assert.ok(f.text.length <= 400, 'within the brief the trial opening keeps');
  assert.equal(trialFraming(f.s, 'third').startsWith('Dera: You gave this place'), true, 'the 3rd trial keeps Book Three\'s');
});

test('stay lines: after 28 and 29 nobody walks out; each companion says why, for the lid and for midnight', () => {
  for (const who of ['orin', 'maren', 'nessa']) for (const next of ['b4-lid', 'b4-parting']) assert.ok(RAWA[who].stay.lines.some((l) => l.when?.is === next), `${who}: ${next}`);
  for (const [id, decision, lines] of [['b4-ropes', 'judged', { orin: /something under the lid/, maren: /the lid's heaving/, nessa: /I've been under the lid/ }], ['b4-lid', 'sloe', { orin: /it's midnight, and the bell/, maren: /whoever rings it/, nessa: /it's midnight, and Rue/ }]]) {
    for (const who of ['orin', 'maren', 'nessa']) {
      let s = after(id); s.world.approvalWindow = { [who]: -3 };
      s = choose(s, decision);
      assert.equal(s.story.nodeId, `away-${who}-stay`, `${id}: ${who} stays`);
      assert.match(opening(s), lines[who], `${id}: ${who}`);
      s = choose(s, E.buildView(s).scene.choices[0].id);
      assert.equal(s.story.nodeId, `q-${QUESTS[id] && Object.values(QUESTS).find((q) => q.unlock === id).id}-start`, `${id}: then straight on`);
    }
  }
});

test('chapters 28 to 30 give their own Legendary rewards on the tier 65 curve, never all of a tier 80 piece, given once when the chapter is done', () => {
  const GEAR = require('../src/data/gear.json');
  const rewards = GEAR.filter((i) => IDS.includes(i.exclusive?.quest));
  assert.deepEqual(rewards.map((i) => [i.exclusive.quest, i.name, i.slot, i.category, i.requires.level, i.requires.classes]), [
    ['b4-ropes', 'Rope-family Maul', 'mainHand', 'weapon', 65, ['fighter']], ['b4-lid', 'Settling-iron Plate', 'armor', 'armor', 66, ['fighter', 'cleric']],
    ['b4-parting', 'Midwinter Tuning Fork', 'mainHand', 'focus', 67, ['wizard', 'cleric', 'bard']]]);
  for (const item of rewards) {
    assert.equal(item.rarity, 'Legendary', item.id);
    assert.equal(item.requires.level, QUESTS[item.exclusive.quest].level - 2, item.id);
    assert.equal(item.value, 340 + 10 * item.requires.level, item.id);
    assert.ok(!item.warm && !item.requires.members, item.id);
    assert.equal(item.skill.rounds, 1, item.id); assert.match(item.skill.text, /until your next turn/, item.id);
    assert.ok((item.stats.taken || 0) >= -0.15 && (item.stats.dealt || 0) <= 0.1, item.id);
    for (const v of Object.values(item.requires.abilities || {})) assert.ok(v <= 15, item.id);
  }
  assert.deepEqual(rewards.map((i) => i.skill.name), ['Shatter', 'Brace', 'First Note']);
  const maul = ITEMS['rope-family-maul'], rift = ITEMS.riftcleaver, ridge = ITEMS['ridgebreaker-maul'];
  assert.ok(maul.damageBonus === rift.damageBonus + 1 && maul.attackBonus === rift.attackBonus && maul.stats.dealt === rift.stats.dealt, 'a point of damage over the Riftcleaver');
  assert.ok(maul.attackBonus < ridge.attackBonus, 'under the tier 80 Ridgebreaker Maul');
  const plate = ITEMS['settling-iron-plate'], hall = ITEMS['parting-hall-plate'], summit = ITEMS['summitforged-plate'];
  assert.ok(plate.armor.base === hall.armor.base && plate.saveBonuses.str && !hall.saveBonuses.str && plate.skill.rounds < hall.skill.rounds, 'the Parting-hall Plate\'s base, a Strength save more, a shorter Brace');
  assert.ok(plate.armor.base < summit.armor.base, 'under the Summitforged Plate');
  const fork = ITEMS['midwinter-tuning-fork'], staff = ITEMS['lamplit-staff'], eclipse = ITEMS['eclipse-staff'];
  assert.ok(fork.spellDcBonus === staff.spellDcBonus + 1 && fork.spellAttackBonus === staff.spellAttackBonus, 'one DC over the Lamplit Staff');
  assert.ok(fork.spellAttackBonus < eclipse.spellAttackBonus, 'under the tier 80 Eclipse Staff');
  // Given once, when the chapter is done.
  const s = playPeaceful('b4-lid', 'council', { party: [] });
  assert.equal(s.player.inventory.filter((e) => e.itemId === 'settling-iron-plate').reduce((n, e) => n + e.quantity, 0), 1);
});

test('the step 11 review: Elske was recalled three winters ago, Hesk and Sable both stand on the step, Perrin speaks only for his own rope, and Sloe has her slate read to her', () => {
  const recalled = { flags: { mother_recalled: true } };
  assert.match(opening(departed('b4-ropes', recalled)), /The council took the rope off one woman three winters ago\. Elske Marrow/);
  assert.match(told(decide('b4-ropes', 'judged', recalled)) + opening(after('b4-ropes', recalled)), /recalled one woman from that rope three winters ago/);
  assert.match(opening(departed('b4-parting', recalled)), /We recalled that rope three winters ago/);
  for (const id of IDS) for (const l of everyLine(RAWQ[id])) if (/recall/.test(l.text || l.narrate)) assert.doesNotMatch(l.text || l.narrate, /last winter/, id);
  // Hesk and Sable are no longer one or the other.
  const both = opening(departed('b4-ropes', { flags: { b3_promise_old: false, b3_promise_hesk: true, b4_sable_ailith: true } }));
  assert.match(both, /Hesk stands beside her on the step[^]*Sable, who came to Cinder Fold/);
  // With Elske in the chair, Brannagh says why she speaks for the council here.
  assert.match(opening(departed('b4-ropes', { flags: { elske_seat: true } })), /here, at Cinder Fold, Brannagh chairs/);
  assert.doesNotMatch(opening(departed('b4-ropes')), /Brannagh chairs/);
  assert.match(talk('b4-ropes', 'son', { flags: { 'job:ninth-rope-given': true } }), /Perrin Rowe's family is whoever Perrin says it is/);
  const rope = talk('b4-ropes', 'son', { flags: { 'job:ninth-rope-rope': true } });
  assert.match(rope, /sits Garth Mott/); assert.doesNotMatch(rope, /Perrin/);
  // Sloe rings the note, and Rue reads her the slate; nobody hands her a book.
  const sloe = told(decide('b4-parting', 'note', { flags: { b4_nessa_with_rue: false, b4_nessa_stops_rue: true } }));
  assert.match(sloe, /Sloe lets go of the rope[^]*Rue sits down beside her on the lid, and begins to read her the slate/);
  assert.doesNotMatch(sloe, /gives it to her, open at the first page/);
  // Nessa at the signal comes down for the midnight.
  const signal = { flags: { b4_nessa_with_rue: false, b4_nessa_signal: true } };
  assert.match(talk('b4-parting', 'rue', signal), /Nessa lit it at dusk and came down for the midnight/);
  assert.match(talk('b4-parting', 'rue', { ...signal, party: ['orin', 'maren'] }), /Somebody is keeping it/);
  assert.ok(RAWA.nessa.stay.lines.some((l) => l.when?.is === 'b4-lid' && /If anybody goes down there first, it's me\. After, we'll talk\./.test(l.text)));
});
