'use strict';
// Book Three is hidden from players until Part One is written (src/book.js,
// "out"). These tests read it the way agent playtests do. node --test runs
// each file in its own process, so this reaches no other test file.
process.env.BRIARWATCH_PREVIEW_BOOKS = '1';
// Part Two is held back, so Part One ends at "To be continued" as it will for
// players; tests/book-three-part-two.test.js shows Part Two following it.
process.env.BRIARWATCH_PREVIEW_PARTS = '3:1';
// Book Three, "The Names in the Bronze", Part One, chapters 1 to 10
// (docs/book-three/DESIGN.md): the letter, Sable's rite, the pass in spring,
// Saltwick, the casting yard, the witness, home for help, the quiet bells, the
// great bell and what was paid, their scenes, the end of Part One and the six
// side jobs of that stretch.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { STORY_NODES, ENEMIES, COMPANIONS, CLUES } = require('../src/content');
const { QUESTS, SCENES, SIDE_JOBS, liveLines } = require('../src/expansion');
const RAWQ = require('../src/data/quests.json'), RAWS = require('../src/data/scenes.json'), RAWJ = require('../src/data/side-jobs.json');
const high = () => .999999, low = () => 0;

const IDS = ['b3-letter', 'b3-rite', 'b3-pass', 'b3-saltwick', 'b3-vell', 'b3-witness', 'b3-home', 'b3-vault', 'b3-greatbell', 'b3-paid'];
// Part One's chapters; Part Two's are tested in tests/book-three-part-two.test.js.
const THREE = Object.values(QUESTS).filter((q) => q.book === 3 && (q.part || 1) === 1);
function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)}: ${r.result.error}`); return r; }
// A hero in the town where a chapter starts, with every earlier chapter done.
function ready(id, { cls = 'fighter', party = ['orin', 'maren', 'nessa'], flags = {} } = {}) {
  const q = QUESTS[id];
  let s = hero(cls, q.level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell']; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  W.init(s);
  if (party.includes('nessa')) s = act(s, { type: 'recruit' }).state;
  Object.assign(s.story.flags, flags);
  s.party = s.party.filter((m) => party.includes(m.id));
  return s;
}
const at = (id, phase, opts) => { const s = ready(id, opts); s.story.nodeId = `q-${id}-${phase}`; s.world.activeQuest = id; s.world.onExpedition = true; return s; };
const told = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');
const opening = (s) => E.buildView(s).scene.opening;
const heard = (s, lines) => liveLines(s, lines).map((l) => l.text || l.narrate).join('\n');
const bond = (s, id) => s.party.find((m) => m.id === id)?.bond;
// Walk a camp scene (or any story nodes) to town by the first choice.
function toTown(s) { for (let i = 0; i < 8 && !E.buildView(s).world.town; i++) s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state; return s; }
// Every way a chapter can be told peacefully: investigate, the careful route,
// the peaceful resolution (all sure rolls), then the given decision.
function playPeaceful(id, decision, opts = {}) {
  let s = ready(id, opts);
  s.player.inspirationPrepared = true; s.player.abilities.cha = 30; s.player.abilities.int = 30; s.player.abilities.dex = 30; s.player.abilities.wis = 30;
  s = act(s, { type: 'depart', questId: id }).state;
  assert.equal(s.story.nodeId, `q-${id}-start`);
  for (const t of E.buildView(s).scene.choices.filter((c) => c.id.startsWith('talk-') && !c.locked)) s = act(s, { type: 'story-choice', choiceId: t.id }).state;
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'careful' }).state;
  assert.equal(s.story.nodeId, `q-${id}-crisis`);
  s = act(s, { type: 'story-choice', choiceId: 'resolve' }).state;
  assert.equal(s.story.nodeId, `q-${id}-after`, `${id}: the peaceful way reaches the ending`);
  assert.ok(!s.combat?.active);
  const r = act(s, { type: 'story-choice', choiceId: decision });
  return r;
}

test('Book Three follows the Second Oath, one chapter per level, from Briarwatch over the pass to Vell and back', () => {
  assert.deepEqual(THREE.map((q) => q.id), IDS);
  assert.deepEqual(THREE.map((q) => [q.id, q.unlock, q.town, q.nextTown || q.town, q.level, q.xp, q.part]), [
    ['b3-letter', 'oath', 'briarwatch', 'highpass', 20, 6750, 1],
    ['b3-rite', 'b3-letter', 'highpass', 'highpass', 21, 7000, 1],
    ['b3-pass', 'b3-rite', 'highpass', 'saltwick', 22, 7250, 1],
    ['b3-saltwick', 'b3-pass', 'saltwick', 'vell', 23, 7500, 1],
    ['b3-vell', 'b3-saltwick', 'vell', 'vell', 24, 7750, 1],
    ['b3-witness', 'b3-vell', 'vell', 'briarwatch', 25, 8000, 1],
    ['b3-home', 'b3-witness', 'briarwatch', 'vell', 26, 8250, 1],
    ['b3-vault', 'b3-home', 'vell', 'vell', 27, 8500, 1],
    ['b3-greatbell', 'b3-vault', 'vell', 'vell', 28, 8750, 1],
    ['b3-paid', 'b3-greatbell', 'vell', 'briarwatch', 29, 9000, 1]
  ]);
  for (const q of THREE) {
    assert.equal(q.xp, P.levelBand(q.level), `${q.id} pays exactly one level`);
    assert.equal(Book.bookOf(q.id).title, 'The Names in the Bronze');
    for (const key of ['opening', 'crisis', 'after', 'approach']) assert.ok(Array.isArray(q[key]) && q[key].length, `${q.id}.${key} is written as lines`);
    assert.ok(q.talks.length >= 3 && [2, 3].includes(q.decisions.length), q.id);
    assert.ok(STORY_NODES[`q-${q.id}-start`] && STORY_NODES[`q-${q.id}-after`], q.id);
    assert.ok(ENEMIES[q.foe] && ENEMIES[`${q.foe}-retainer`], q.id);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
  }
  assert.deepEqual(Book.CHAPTERS.filter((q) => (q.part || 1) === 1).slice(-11).map((q) => q.id), ['oath', ...IDS], 'With the preview, the board reads Book Three after Book Two.');
});

test('the Second Oath epilogue hands the hero straight on to the letter from Vell', () => {
  let s = at('oath', 'after');
  const r = act(s, { type: 'story-choice', choiceId: 'seat' });
  assert.equal(r.state.story.flags[Book.FINISHED], undefined, 'Not handed to the AI storyteller.');
  // Book Two is finished, so it says so on the decision itself, as before Part One.
  assert.equal(r.events.filter((e) => /Book 2, .* is complete\. Book 3, .* begins\./.test(e.text || '')).length, 1, 'Book Two ends on the oath decision.');
  assert.equal(r.state.story.flags['books:part-end-due'], undefined);
  s = act(r.state, { type: 'story-choice', choiceId: 'town' }).state;
  s = toTown(s);
  assert.equal(s.story.nodeId, 'town-briarwatch');
  assert.equal(Book.chapter(s).id, 'b3-letter');
  assert.ok(E.buildView(s).world.quests.some((q) => q.id === 'b3-letter' && q.canDepart));
});

test('every chapter plays to its end peacefully, by every decision, and sets that decision\'s flags', () => {
  const expect = {
    'b3-letter': { answer: ['b3_answered', { nessa: 1 }], council: ['b3_to_council', { orin: 1 }], aster: ['b3_asked_aster', { maren: 1 }] },
    'b3-rite': { burn: ['b3_rite_burned', { maren: 1 }], carry: ['b3_rite_carried', { nessa: 1 }], council: ['b3_rite_council', { orin: 1 }] },
    'b3-pass': { all: ['b3_pass_all', { orin: 1 }], some: ['b3_pass_some', {}], fenmere: ['b3_pass_fenmere', {}] },
    'b3-saltwick': { moved: ['b3_saltwick_moved', { orin: 1 }], bought: ['b3_saltwick_bought', { orin: -1, maren: -1 }], seized: ['b3_saltwick_seized', {}] },
    'b3-vell': { bless: ['b3_blessed', {}], refuse: ['b3_refused', {}], wait: ['b3_waiting', {}] },
    'b3-witness': { witness: ['b3_witnessed', {}], unwitness: ['b3_unwitnessed', { maren: 1 }], expose: ['b3_quotas_exposed', {}] },
    'b3-home': { take: ['b3_council_take', {}], help: ['b3_council_help', {}], refuse: ['b3_council_refuse', {}] },
    'b3-vault': { closed: ['b3_vault_closed', { maren: 1 }], held: ['b3_vault_held', { maren: -1, orin: -1 }] },
    'b3-greatbell': { cast: ['b3_bell_cast', {}], evacuate: ['b3_bell_evacuate', {}], aster: ['b3_bell_aster', {}] },
    'b3-paid': { destroy: ['b3_rite_destroyed', {}], law: ['b3_rite_law', {}], vell: ['b3_rite_vell', {}] }
  };
  // Letting Aster take the great bell needs her leave from chapter 7.
  const needs = { 'b3-greatbell/aster': { b3_aster_may_go: true } };
  for (const id of IDS) for (const [decision, [flag, approval]] of Object.entries(expect[id])) {
    const before = playPeaceful(id, decision, { flags: needs[`${id}/${decision}`] || {} }).state;
    assert.ok(before.world.completed[id], `${id}/${decision} completes the chapter`);
    assert.equal(before.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(expect[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(before.story.flags[other], undefined, `${id}/${decision} does not set ${other}`);
    assert.equal(before.story.flags[`method:${id}`], 'peace');
    assert.equal(before.player.level, QUESTS[id].level + 1, `${id}: the chapter levels the hero`);
    // The great bell has no camp: the story runs on to the Iron Road.
    const camp = Object.values(SCENES).find((x) => x?.after === id);
    if (camp) assert.equal(before.story.nodeId, `scene-${camp.id}-${camp.start}`, `${id}: the camp scene follows`);
    else assert.equal(before.story.nodeId, `town-${QUESTS[id].nextTown || QUESTS[id].town}`, `${id}: no camp, straight to town`);
    // The decision's own approval lands (talks may add their own before it).
    const d = QUESTS[id].decisions.find((x) => x.id === decision);
    assert.deepEqual(d.approval || {}, approval, `${id}/${decision} approval`);
    const home = toTown(before);
    assert.equal(home.story.nodeId, `town-${QUESTS[id].nextTown || QUESTS[id].town}`);
  }
});

test('a decision changes exactly the approval the design gives it', () => {
  for (const [id, decision, who, delta] of [['b3-rite', 'burn', 'maren', 1], ['b3-rite', 'carry', 'nessa', 1], ['b3-rite', 'council', 'orin', 1], ['b3-pass', 'all', 'orin', 1],
    ['b3-saltwick', 'moved', 'orin', 1], ['b3-saltwick', 'bought', 'orin', -1], ['b3-saltwick', 'bought', 'maren', -1], ['b3-saltwick', 'seized', 'orin', 0], ['b3-vell', 'bless', 'nessa', 0], ['b3-witness', 'unwitness', 'maren', 1], ['b3-witness', 'witness', 'maren', 0],
    ['b3-vault', 'closed', 'maren', 1], ['b3-vault', 'held', 'maren', -1], ['b3-vault', 'held', 'orin', -1], ['b3-vault', 'closed', 'orin', 0], ['b3-home', 'refuse', 'orin', 0]]) {
    const s = at(id, 'after');
    for (const m of s.party) m.bond = 2;
    const was = bond(s, who);
    assert.equal(bond(act(s, { type: 'story-choice', choiceId: decision }).state, who), was + delta, `${id}/${decision}`);
  }
});

test('each crisis can also be fought: the fight is the chapter\'s own, and it leads to the same ending', () => {
  for (const id of IDS) {
    const s = at(id, 'crisis');
    const fight = act(s, { type: 'story-choice', choiceId: 'objective' }).state;
    assert.ok(fight.combat?.active, id);
    assert.ok(fight.combat.actors.some((a) => a.team === 'enemy' && a.name === QUESTS[id].foeName), id);
    const failed = act(at(id, 'crisis'), { type: 'story-choice', choiceId: 'resolve' }, low).state;
    assert.ok(failed.combat?.active, `${id}: a failed peaceful way starts the fight`);
    const enc = require('../src/content').ENCOUNTERS[`quest:${id}`];
    assert.equal(enc.victoryNode, `q-${id}-after`);
  }
});

test('the letter is read by whoever the Second Oath answers to, and an old save still hears it', () => {
  const read = (flags, party) => opening(act(ready('b3-letter', { flags, party }), { type: 'depart', questId: 'b3-letter' }).state);
  const council = read({ second_oath: 'council' }), town = read({ second_oath: 'town' });
  const companions = read({ second_oath: 'companions' }), alone = read({ second_oath: 'none' });
  const noOrin = read({ second_oath: 'companions' }, ['maren', 'nessa']), old = read({});
  assert.match(council, /Aveline reads it at the long table.*You swore your oath to the council/s);
  assert.match(town, /Aveline reads it in the square/);
  assert.match(companions, /Orin reads it by the fire/);
  assert.match(noOrin, /You read it aloud by the fire/); assert.doesNotMatch(noOrin, /Orin reads it/);
  assert.match(alone, /You read it alone/);
  assert.match(old, /Aveline reads it at the long table/); assert.doesNotMatch(old, /You swore your oath/);
  for (const text of [council, town, companions, noOrin, alone, old]) {
    assert.match(text, /To the one who broke the Single Voice/);
    assert.match(text, /Saltwick is on its roofs/);
    assert.match(text, /Come and see the nurseries/);
    assert.equal(text.match(/^(Aveline reads it|Orin reads it|You read it)/gm).length, 1, 'One reader, never two.');
  }
});

test('Lysa is the Lantern Hall\'s guide only if she was turned in Merrowgate', () => {
  const crisis = (flags) => opening(at('b3-rite', 'crisis', { flags }));
  assert.match(crisis({ 'b2:lysa_turned': true }), /It is Lysa/);
  assert.doesNotMatch(crisis({ 'b2:lysa_turned': true }), /Corrin Mabry/);
  assert.match(crisis({}), /Corrin Mabry/);
  assert.doesNotMatch(crisis({}), /Lysa/);
  const peace = (flags) => { const s = at('b3-rite', 'crisis', { flags }); s.player.inspirationPrepared = true; s.player.abilities.cha = 30; s.story.clues.push('b3-rite-evidence'); return act(s, { type: 'story-choice', choiceId: 'resolve' }).state; };
  const turned = peace({ 'b2:lysa_turned': true });
  assert.match(told(turned), /^Lysa: Factor\. The job's off/m);
  assert.match(opening(turned), /Lysa waits at the top of the north stair/);
  assert.doesNotMatch(opening(peace({})), /Lysa/);
});

test('Iona is in Highpass and on the record only if the letter went to the council', () => {
  const start = (flags) => opening(act(ready('b3-rite', { flags }), { type: 'depart', questId: 'b3-rite' }).state);
  assert.match(start({ b3_to_council: true }), /Quartermaster Iona is waiting/);
  assert.doesNotMatch(start({ b3_answered: true }), /Iona/);
  const seal = (flags) => told(act(at('b3-rite', 'after', { flags }), { type: 'story-choice', choiceId: 'council' }).state);
  assert.match(seal({ b3_to_council: true }), /^Iona seals/m);
  assert.match(seal({}), /^Sorrel seals/m);
  assert.doesNotMatch(seal({}), /Iona/);
});

test('Hal is at the pass only if her company serves the council, and Elske only if she took her seat', () => {
  const talks = (flags) => E.buildView(act(ready('b3-pass', { flags }), { type: 'depart', questId: 'b3-pass' }).state).scene.choices.map((c) => c.id);
  assert.ok(talks({ south_hal_council: true }).includes('talk-hal'));
  assert.ok(!talks({ south_hal_guild: true }).includes('talk-hal'));
  assert.ok(!talks({}).includes('talk-hal'));
  const start = (flags) => opening(act(ready('b3-pass', { flags }), { type: 'depart', questId: 'b3-pass' }).state);
  assert.match(start({ elske_seat: true }), /Elske Marrow has come down too/);
  for (const flags of [{ elske_judged: true }, { elske_free: true }, {}]) assert.doesNotMatch(start(flags), /Elske/);
});

test('sending the six hundred to Fenmere is told the way Fenmere was rebuilt', () => {
  const said = (flags) => told(act(at('b3-pass', 'after', { flags }), { type: 'story-choice', choiceId: 'fenmere' }).state);
  const above = said({ fen_build_above: true }), promise = said({ fen_promise: true }), old = said({});
  assert.match(above, /We built on the rise/); assert.doesNotMatch(above, /promised/);
  assert.match(promise, /promised my people/); assert.match(promise, /We'll dig/); assert.doesNotMatch(promise, /We built on the rise/);
  assert.match(old, /We'll dig/); assert.doesNotMatch(old, /We built on the rise|promised/);
});

test('the pass camp asks who goes to Vell, answered by the Second Oath', () => {
  const camp = (flags) => { const s = at('b3-pass', 'after', { flags }); return opening(act(s, { type: 'story-choice', choiceId: 'all' }).state); };
  assert.match(camp({ second_oath: 'council' }), /the council asks the hero/);
  assert.match(camp({ second_oath: 'town' }), /Briarwatch says go/);
  assert.match(camp({ second_oath: 'companions' }), /You swore to us/);
  assert.match(camp({ second_oath: 'none' }), /You swore to no one/);
  const old = camp({});
  assert.match(old, /the council would like the hero/); assert.doesNotMatch(old, /You swore/);
  assert.match(camp({ second_oath: 'none' }), /In the mess at Highpass/, 'Where the children sleep follows the decision.');
  assert.match(opening(act(at('b3-pass', 'after'), { type: 'story-choice', choiceId: 'fenmere' }).state), /road east to Fenmere/);
});

test('a camp scene whose companion is away is skipped, and lines for absent companions are left out', () => {
  let s = at('b3-letter', 'after', { party: ['orin', 'maren'] });
  s = act(s, { type: 'story-choice', choiceId: 'answer' }).state;
  assert.equal(s.story.nodeId, 'town-highpass', 'The letter camp needs all three.');
  const start = opening(act(ready('b3-letter', { party: ['maren'] }), { type: 'depart', questId: 'b3-letter' }).state);
  assert.doesNotMatch(start, /^(Orin|Nessa):/m);
  assert.match(start, /You take the bridle yourself/);
  const rite = at('b3-rite', 'after', { party: ['maren'] });
  assert.equal(act(rite, { type: 'story-choice', choiceId: 'burn' }).state.story.nodeId, 'scene-rite-camp-wall', 'Aster speaks with Maren alone.');
});

// What every Book Three line may read, and where each flag it reads comes from.
const KNOWN_WHEN = new Set(['flag', 'is', 'notFlag', 'anyFlag', 'noneFlag', 'party', 'absent', 'class', 'spec', 'bondAtLeast', 'bondBelow', 'item', 'notItem', 'clue', 'notClue', 'access', 'notAccess', 'roller', 'notRoller']);
const SPECS = new Set(['none', ...Object.values(P.SPECIALIZATIONS).flat().map((b) => b.id)]);
const ENGINE_PREFIX = /^(method|prepared|approach|partial|job|away|walked):/;
// Each line array in a piece of content, with its owner and where it sits in the story.
function lineArrays(owner, value, out = []) {
  if (Array.isArray(value)) { if (value.some((l) => l && (l.say || l.narrate))) out.push({ owner, lines: value }); value.forEach((v) => lineArrays(owner, v, out)); }
  else if (value && typeof value === 'object') for (const v of Object.values(value)) lineArrays(owner, v, out);
  return out;
}
// The chapter a scene belongs to: the one it follows, or the one the scene before it follows.
const chapterOf = (s) => { for (let x = s, i = 0; x && i < 10; x = RAWS[x.after], i++) if (RAWQ[x.after]) return x.after; return null; };
const B3_SCENES = Object.values(RAWS).filter((x) => x?.nodes && IDS.includes(chapterOf(x)));
// Part One's jobs: a job that runs on into Part Two is tested there.
const partTwo = (id) => (RAWQ[id]?.book || 1) === 3 && (RAWQ[id]?.part || 1) === 2;
const B3_JOBS = Object.values(RAWJ).filter((j) => j?.nodes && [j.from, j.until].some((id) => IDS.includes(id)) && ![j.from, j.until].some(partTwo));
const order = (id) => IDS.indexOf(id);
// Flags set by each Book Three chapter, its camp scene or a job, and every flag
// Books One and Two can set.
function setBy(content) { const f = new Set(); JSON.stringify(content, (k, v) => { if (k === 'flag' && typeof v === 'string' && content.decisions?.some((d) => d.flag === v)) f.add(v); if (k === 'setFlags' && v) Object.keys(v).forEach((x) => f.add(x)); return v; }); for (const d of content.decisions || []) f.add(d.flag); return f; }
const EARLIER = new Set(['second_oath', 'spiritFreed', 'lysaSpared']);
for (const q of Object.values(RAWQ).filter((q) => (q.book || 1) < 3)) for (const f of setBy(q)) EARLIER.add(f);
for (const s of Object.values(RAWS).filter((x) => x?.nodes && (RAWQ[chapterOf(x)]?.book || 1) < 3)) for (const f of setBy(s)) EARLIER.add(f);
for (const j of Object.values(RAWJ).filter((j) => j?.nodes && !B3_JOBS.includes(j))) for (const f of setBy(j)) EARLIER.add(f);
JSON.stringify(require('../src/data/story-nodes.json'), (k, v) => { if (k === 'setFlags' && v) Object.keys(v).forEach((x) => EARLIER.add(x)); return v; });

test('every Book Three line uses only known conditions, people and clues', () => {
  const all = [...IDS.flatMap((id) => lineArrays(id, RAWQ[id])), ...B3_SCENES.flatMap((s) => lineArrays(s.id, s)), ...B3_JOBS.flatMap((j) => lineArrays(j.id, j))];
  assert.ok(all.length > 50);
  for (const { owner, lines } of all) for (const l of lines) {
    if (!l.when) continue;
    for (const key of Object.keys(l.when)) assert.ok(KNOWN_WHEN.has(key), `${owner}: unknown condition ${key}`);
    for (const key of ['party', 'absent']) if (l.when[key]) assert.ok(COMPANIONS[l.when[key]], `${owner}: ${key} ${l.when[key]}`);
    for (const key of ['clue', 'notClue']) if (l.when[key]) assert.ok(CLUES[l.when[key]], `${owner}: clue ${l.when[key]}`);
    if (l.when.is !== undefined) assert.ok(l.when.flag, `${owner}: "is" needs a flag`);
    if (l.when.anyFlag) assert.ok(Array.isArray(l.when.anyFlag) && l.when.anyFlag.length, owner);
    if (l.when.noneFlag) assert.ok(Array.isArray(l.when.noneFlag) && l.when.noneFlag.length, owner);
    if (l.when.spec !== undefined) assert.ok(SPECS.has(l.when.spec), `${owner}: spec ${l.when.spec}`);
    for (const key of ['bondAtLeast', 'bondBelow']) for (const who of Object.keys(l.when[key] || {})) assert.ok(COMPANIONS[who] && Number.isFinite(l.when[key][who]), `${owner}: ${key} ${who}`);
  }
});

test('every flag a Book Three line reads is set earlier in the story, and an old save has a line for a missing Book Two choice', () => {
  const b3Set = IDS.map((id) => { const f = setBy(RAWQ[id]); for (const s of B3_SCENES.filter((x) => chapterOf(x) === id)) for (const x of setBy(s)) f.add(x); return f; });
  const setBefore = (flag, upTo) => b3Set.slice(0, upTo).some((f) => f.has(flag));
  const check = (owner, lines, upTo) => {
    for (const l of lines) {
      const w = l.when; if (!w) continue;
      for (const flag of [w.flag, w.notFlag, ...(w.anyFlag || []), ...(w.noneFlag || [])].filter(Boolean)) {
        if (ENGINE_PREFIX.test(flag)) continue;
        if (flag.startsWith('b3_')) { assert.ok(setBefore(flag, upTo), `${owner}: ${flag} is read before it can be set`); continue; }
        assert.ok(EARLIER.has(flag), `${owner}: ${flag} is never set by Books One or Two`);
      }
      // Lines told one way per Book Two choice ("is") have a line for a save that never made it.
      const variants = new Set(lines.filter((x) => w.flag && x.when?.flag === w.flag && x.when.is !== undefined).map((x) => x.when.is));
      if (w.flag && !ENGINE_PREFIX.test(w.flag) && !w.flag.startsWith('b3_') && variants.size > 1) assert.ok(lines.some((x) => x.when?.notFlag === w.flag), `${owner}: ${w.flag} = ${w.is} has no line for an old save without it`);
    }
  };
  // A chapter reads only what earlier chapters set; its camp scene may read its own chapter's decision.
  IDS.forEach((id, i) => { for (const { owner, lines } of lineArrays(id, RAWQ[id])) check(owner, lines, i); });
  for (const s of B3_SCENES) for (const { owner, lines } of lineArrays(s.id, s)) check(owner, lines, order(chapterOf(s)) + 1);
  // A job may mention a chapter in its window that has been played.
  for (const j of B3_JOBS) for (const { owner, lines } of lineArrays(j.id, j)) check(owner, lines, Math.max(0, order(j.until)));
  // Talks behind a Book Two choice need that choice to exist.
  for (const id of IDS) for (const t of RAWQ[id].talks) for (const f of t.requires?.flagsAll || []) assert.ok(EARLIER.has(f) || setBefore(f, order(id)), `${id}/${t.id}: ${f}`);
});

test('a save missing every Book Two choice still hears each chapter whole', () => {
  for (const id of IDS) {
    const s = ready(id);
    for (const key of Object.keys(s.story.flags)) if (!ENGINE_PREFIX.test(key)) delete s.story.flags[key];
    const start = opening(act(s, { type: 'depart', questId: id }).state);
    assert.ok(start.length > 800, `${id}: the opening is told`);
    const after = opening(at(id, 'after'));
    assert.ok(after.length > 300, id);
  }
});

test('in Book Three camp scenes companions speak only if they are in the cast, and approval goes to the cast', () => {
  const companions = new Set(Object.keys(COMPANIONS));
  assert.deepEqual(B3_SCENES.map((s) => [s.id, s.after]), [['letter-camp', 'b3-letter'], ['rite-camp', 'b3-rite'], ['pass-camp', 'b3-pass'],
    ['saltwick-camp', 'b3-saltwick'], ['vell-ysolde', 'b3-vell'], ['vell-camp', 'vell-ysolde'], ['witness-camp', 'b3-witness'],
    ['home-aster', 'b3-home'], ['home-camp', 'home-aster'], ['vault-camp', 'b3-vault'], ['b3-partone-end', 'b3-paid']]);
  for (const s of B3_SCENES) {
    // A second-choice scene has no cast: it plays for everyone, and a
    // companion's lines and choices in it are for when they are there.
    if (!s.cast.length) {
      for (const node of Object.values(s.nodes)) for (const c of node.choices || []) for (const who of Object.keys(c.approval || {})) assert.equal(c.requires?.companion, who, `${s.id}/${c.id}`);
      continue;
    }
    const speaking = new Set();
    for (const { lines } of lineArrays(s.id, s)) for (const l of lines) if (companions.has(l.say)) { speaking.add(l.say); assert.ok(s.cast.includes(l.say), `${s.id}: ${l.say} speaks but is not in the cast`); }
    assert.deepEqual([...speaking].sort(), [...s.cast].sort(), `${s.id}: the cast is exactly who speaks`);
    for (const node of Object.values(s.nodes)) for (const c of node.choices || []) for (const who of Object.keys(c.approval || {})) assert.ok(s.cast.includes(who), `${s.id}/${c.id}`);
  }
  // In a chapter, a line that answers a companion is guarded when that companion may be away.
  for (const id of IDS) for (const t of RAWQ[id].talks) for (const who of Object.keys(t.approval || {})) assert.ok(companions.has(who), `${id}/${t.id}`);
});

test('Pim\'s Apprenticeship is in Briarwatch through chapters 1 to 3, Sable\'s Library in Highpass from chapter 2', () => {
  const apprentice = SIDE_JOBS.apprentice, library = SIDE_JOBS.library;
  assert.deepEqual([apprentice.town, apprentice.from, apprentice.until], ['briarwatch', 'oath', 'b3-pass']);
  assert.deepEqual([library.town, library.from, library.until], ['highpass', 'b3-letter', 'b3-home'], 'Chapters 2 to 7.');
  const offered = (id, done, town) => {
    const s = ready('b3-letter'); for (const c of done) s.world.completed[c] = { xp: 0, gold: 0 };
    s.world.townId = town; s.story.nodeId = `town-${town}`;
    return E.buildView(s).world.sideJobs.find((j) => j.id === id);
  };
  assert.ok(offered('apprentice', [], 'briarwatch')?.canStart, 'Open during chapter 1.');
  assert.ok(offered('apprentice', ['b3-letter', 'b3-rite'], 'briarwatch'), 'Still open during chapter 3.');
  assert.ok(!offered('apprentice', ['b3-letter', 'b3-rite', 'b3-pass'], 'briarwatch'), 'Closed once chapter 3 is done.');
  assert.ok(!offered('library', [], 'highpass'), 'Not before the letter.');
  assert.ok(offered('library', ['b3-letter'], 'highpass')?.canStart, 'Open from chapter 2.');
  assert.ok(offered('library', ['b3-letter', 'b3-rite', 'b3-pass'], 'highpass'), 'Still open over the pass.');
  assert.ok(offered('library', ['b3-letter', 'b3-rite', 'b3-pass', 'b3-saltwick', 'b3-vell', 'b3-witness'], 'highpass'), 'Still open during chapter 7.');
  assert.ok(!offered('library', ['b3-letter', 'b3-rite', 'b3-pass', 'b3-saltwick', 'b3-vell', 'b3-witness', 'b3-home'], 'highpass'), 'Closed once chapter 7 is done.');
  // Before Book Two is over, neither is on offer.
  const early = ready('oath'); early.world.townId = 'briarwatch'; early.story.nodeId = 'town-briarwatch';
  assert.ok(!E.buildView(early).world.sideJobs.some((j) => ['apprentice', 'library'].includes(j.id)));
});

function paths(job) {
  const out = [];
  const walk = (key, trail) => {
    for (const c of job.nodes[key].choices) for (const rng of c.check ? [high, low] : [high]) {
      const o = c.check ? (rng === high ? c.success : c.failure) : c;
      const step = [...trail, { choiceId: c.id, rng, o }];
      if (o.next) walk(o.next, step); else out.push(step);
    }
  };
  walk(job.start, []);
  return out;
}
// The chapter a job is played during: the first one after its window opens.
const during = (job) => IDS[IDS.indexOf(job.from) + 1] || IDS[0];
const B3_JOB_IDS = ['apprentice', 'library', 'beds', 'oil', 'census', 'brothers'];
test('every way through every Book Three side job ends in town, paid once, never past the chapter, with or without companions', () => {
  assert.deepEqual(B3_JOBS.map((j) => j.id).sort(), [...B3_JOB_IDS].sort());
  for (const job of B3_JOB_IDS.map((id) => SIDE_JOBS[id])) for (const party of [['orin', 'maren', 'nessa'], []]) for (const path of paths(job)) {
    let s = ready(during(job), { party });
    s.world.townId = job.town; s.story.nodeId = `town-${job.town}`;
    const before = { xp: s.player.xp, gold: s.player.gold, level: s.player.level };
    s = act(s, { type: 'side-job', jobId: job.id }).state;
    if (!party.length) assert.doesNotMatch(opening(s), /^(Orin|Maren|Nessa):/m);
    for (const step of path) s = act(s, { type: 'story-choice', choiceId: step.choiceId }, step.rng).state;
    const where = `${job.id} ${path.map((p) => p.choiceId).join('>')} [${party.join(',')}]`;
    assert.equal(s.story.nodeId, `town-${job.town}`, where);
    assert.equal(s.story.flags[`job:${job.id}`], true, where);
    // What the choices cost, then the job's pay (or the pay its last choice names).
    const spent = path.reduce((n, p) => n + (Number.isFinite(p.o.gold) ? p.o.gold : 0), 0), last = path.at(-1).o;
    assert.equal(s.player.gold, before.gold + spent + (Number.isFinite(last.reward) ? last.reward : job.gold), where);
    assert.ok(s.player.xp > before.xp && s.player.xp - before.xp <= W.jobXp(job), where);
    assert.equal(s.player.level, before.level, `${where}: a job never levels past the chapter`);
    if (!party.length) assert.doesNotMatch(told(s), /^(Orin|Maren|Nessa):/m, where);
  }
});

test('the main story never assumes a Book Three side job was done', () => {
  for (const id of IDS) for (const { owner, lines } of lineArrays(id, RAWQ[id])) for (const l of lines) {
    if (/Abernathy's books|forty-one books|Kept\.|nails/.test(l.text || l.narrate || '')) assert.ok(l.when?.flag?.startsWith('job:'), owner);
  }
  for (const s of B3_SCENES) for (const { lines } of lineArrays(s.id, s)) for (const l of lines) assert.ok(!/forty-one books|apprentice/.test(l.text || l.narrate || '') || l.when?.flag?.startsWith('job:'), s.id);
});

// Chapters 4 to 6: over the mountains.
const peaceAt = (id, flags = {}, opts = {}) => { const s = at(id, 'crisis', { flags, ...opts }); s.player.inspirationPrepared = true; s.player.abilities.cha = 30; s.player.abilities.str = 30; s.player.abilities.wis = 30; s.story.clues.push(`${id}-evidence`); return act(s, { type: 'story-choice', choiceId: 'resolve' }).state; };
// Win a chapter's fight outright: every enemy down, then end the hero's turn.
function winFight(s) {
  for (const a of s.combat.actors) if (a.team === 'enemy') a.hp = 0;
  const me = s.combat.actors.find((a) => a.id === 'player');
  s.combat.turnIndex = s.combat.actors.indexOf(me); s.combat.awaitingPlayer = true;
  return act(s, { type: 'combat', actionId: 'end-turn' }).state;
}

test('Saltwick and Vell are new towns on the road: the pass leads to Saltwick, Saltwick to Vell, and the witness home', () => {
  const { TOWNS } = require('../src/expansion');
  for (const id of ['saltwick', 'vell']) {
    assert.ok(TOWNS[id] && STORY_NODES[`town-${id}`], id);
    assert.ok(TOWNS[id].stock.length >= 12 && TOWNS[id].rumor, id);
  }
  let s = playPeaceful('b3-pass', 'all').state;
  assert.ok(s.world.unlockedTowns.includes('saltwick'));
  assert.equal(toTown(s).story.nodeId, 'town-saltwick');
  assert.ok(E.buildView(toTown(s)).world.towns.some((t) => t.id === 'saltwick' && t.current));
  s = playPeaceful('b3-saltwick', 'moved').state;
  assert.ok(s.world.unlockedTowns.includes('vell'));
  assert.equal(toTown(s).story.nodeId, 'town-vell');
  assert.equal(toTown(playPeaceful('b3-witness', 'witness').state).story.nodeId, 'town-briarwatch', 'After the witness the party goes home over the pass.');
  const v = ready('b3-vell'); v.world.townId = 'highpass'; v.story.nodeId = 'town-highpass';
  assert.equal(act(v, { type: 'travel-town', townId: 'vell' }).state.story.nodeId, 'town-vell');
});

test('each new chapter can be fought to its end, and the ending is told the way it was won', () => {
  for (const [id, decision, foughtLine] of [['b3-saltwick', 'seized', /grey to the shoulder/], ['b3-vell', 'refuse', /lieutenant sent to a post/], ['b3-witness', 'unwitness', /three more days/]]) {
    let s = act(at(id, 'crisis'), { type: 'story-choice', choiceId: 'confront' }).state;
    assert.ok(s.combat?.active, id);
    s = winFight(s);
    assert.equal(s.story.nodeId, `q-${id}-after`, `${id}: winning the fight reaches the ending`);
    assert.match(opening(s), foughtLine, id);
    s = act(s, { type: 'story-choice', choiceId: decision }).state;
    assert.ok(s.world.completed[id], `${id}: the fight path completes the chapter`);
    assert.equal(s.player.level, QUESTS[id].level + 1, id);
  }
});

test('the last roof: Orin\'s captain is Varn, and Mags says she will think about it, never that she forgives him', () => {
  const all = JSON.stringify(RAWQ['b3-saltwick']) + JSON.stringify(RAWS['saltwick-camp']);
  assert.match(all, /Captain Odell Varn/);
  assert.doesNotMatch(all, /Brask/);
  assert.doesNotMatch(all, /I forgive you|forgiven you/);
  for (const method of ['peace', 'objective']) {
    const s = method === 'peace' ? peaceAt('b3-saltwick') : winFight(act(at('b3-saltwick', 'crisis'), { type: 'story-choice', choiceId: 'objective' }).state);
    const after = opening(s);
    assert.match(after, /^Mags Peller: I'll think about it\.$/m, method);
    assert.match(after, /^Mags Peller: As long as it takes/m);
  }
  const noOrin = opening(peaceAt('b3-saltwick', {}, { party: ['maren', 'nessa'] }));
  assert.match(noOrin, /Tell him it isn't a yes/); assert.doesNotMatch(noOrin, /^Orin:/m);
  // Buying the oil costs gold and two names.
  const bought = at('b3-saltwick', 'after'); const gold = bought.player.gold;
  const b = act(bought, { type: 'story-choice', choiceId: 'bought' }).state;
  assert.equal(b.player.gold, gold - 120 + QUESTS['b3-saltwick'].gold);
  assert.match(told(b), /Ella Marsh/); assert.match(told(b), /Mags takes it out of his hand/);
  assert.doesNotMatch(told(b), /Davin Peller go/);
});

test('the oil run opens only after the last roof, and is told for a Saltwick gone to Vell, or holding on bought or seized oil', () => {
  const offered = (id) => { const s = ready(id); s.world.townId = 'saltwick'; s.story.nodeId = 'town-saltwick'; return E.buildView(s).world.sideJobs.some((j) => j.id === 'oil'); };
  assert.ok(!offered('b3-saltwick'), 'Not before the reunion on the ladder.');
  assert.ok(offered('b3-vell'));
  const start = (flags, party) => { const s = ready('b3-vell', { flags, party }); s.world.townId = 'saltwick'; s.story.nodeId = 'town-saltwick'; return opening(act(s, { type: 'side-job', jobId: 'oil' }).state); };
  const moved = start({ b3_saltwick_moved: true }), bought = start({ b3_saltwick_bought: true }), seized = start({ b3_saltwick_seized: true });
  assert.match(moved, /three hundred people gone to Vell/); assert.doesNotMatch(moved, /ration office|sword-point/);
  assert.match(bought, /off the ration office/); assert.match(seized, /sword-point/);
  for (const t of [moved, bought, seized]) { assert.equal((t.match(/^Mags Peller:/gm) || []).length, 2, 'One way of telling, never two.'); assert.match(t, /Take Davin/); }
  assert.match(start({ b3_saltwick_moved: true }, ['maren']), /^Mags Peller: Take Davin\. He came back with me to keep the lamps\. He knows the road\.$/m);
  const raw = JSON.stringify(RAWJ.oil);
  assert.doesNotMatch(raw, /Tam brings|forty-eight/);
});

test('at Vell, who meets you, who is with you and what Corvane asks first follow the earlier chapters and the Second Oath', () => {
  const start = (flags, party) => opening(act(ready('b3-vell', { flags, party }), { type: 'depart', questId: 'b3-vell' }).state);
  const answered = start({ b3_answered: true, second_oath: 'council' }), unanswered = start({ second_oath: 'town' });
  assert.match(answered, /The gate opens before you reach it/); assert.doesNotMatch(answered, /Fennick processes you/);
  assert.match(unanswered, /Fennick has walked back over the pass/); assert.doesNotMatch(unanswered, /The gate opens before you reach it/);
  assert.match(answered, /does the council say it too/); assert.match(unanswered, /How many people\?/);
  assert.match(start({ second_oath: 'companions' }), /would you let them\?/);
  assert.match(start({ second_oath: 'none' }), /nobody to tell you that you are wrong/);
  const old = start({});
  assert.match(old, /who decides while it argues/);
  assert.equal((old.match(/^Corvane: (You answer to|My first question)/gm) || []).length, 1, 'One first question.');
  assert.match(start({ b3_to_council: true }), /Quartermaster Iona is a step behind you/);
  assert.doesNotMatch(start({}), /Iona/);
  assert.match(start({ b3_saltwick_moved: true }), /Saltwick comes down the last ridge behind you/);
  assert.match(start({ b3_saltwick_bought: true }), /Ella Marsh, 31, Saltwick/); assert.doesNotMatch(start({ b3_saltwick_bought: true }), /Davin Peller, 14/);
  for (const t of [answered, unanswered, old]) assert.match(t, /I will cast on the ninth day with your blessing or without it/);
  // Talks that need an earlier choice.
  const talks = (flags) => E.buildView(act(ready('b3-vell', { flags }), { type: 'depart', questId: 'b3-vell' }).state).scene.choices.map((c) => c.id);
  assert.ok(talks({ b3_saltwick_moved: true }).includes('talk-saltwick') && !talks({}).includes('talk-saltwick'));
  assert.ok(talks({ b3_saltwick_bought: true }).includes('talk-davin') && !talks({ b3_saltwick_seized: true }).includes('talk-davin'));
  assert.ok(talks({ b3_to_council: true }).includes('talk-iona') && !talks({ b3_answered: true }).includes('talk-iona'));
  // Hesk remembers the convoy; Corvane's Mother Bell line reads Book Two, defaulting to the chorus.
  const talk = (id, flags) => { const s = act(ready('b3-vell', { flags }), { type: 'depart', questId: 'b3-vell' }).state; return told(act(s, { type: 'story-choice', choiceId: `talk-${id}` }).state); };
  assert.match(talk('hesk', { b3_saltwick_seized: true }), /Three carts of oil/);
  assert.doesNotMatch(talk('hesk', { b3_saltwick_bought: true }), /Three carts of oil/);
  assert.match(talk('ledger', {}), /every ward that heard it answered/);
  assert.match(talk('ledger', { mother_chorus: true }), /every ward that heard it answered/);
  assert.match(talk('ledger', { mother_silenced: true }), /took the rope down/);
});

test('carrying the old rite lets you lay it beside Corvane\'s', () => {
  const read = (flags) => { const s = act(ready('b3-vell', { flags }), { type: 'depart', questId: 'b3-vell' }).state; s.player.abilities.int = 30; s.player.inspirationPrepared = true; return told(act(s, { type: 'story-choice', choiceId: 'investigate' }).state); };
  const carried = read({ b3_rite_carried: true }), burned = read({ b3_rite_burned: true });
  assert.match(carried, /Sable's eleven pages/); assert.match(carried, /opens from inside/); assert.match(carried, /never said it was shut/);
  assert.doesNotMatch(burned, /eleven pages/); assert.match(burned, /chalked over the door/);
  assert.match(read({ 'job:library-sent': true }), /Ask Vell what it keeps under the drill-yard/);
  assert.doesNotMatch(burned, /under the drill-yard/);
});

test('the sluices: back Nessa or Ysolde\'s choice, and with Nessa away Ysolde\'s refusal is told and no flag is set', () => {
  const sluice = (opts) => act(at('b3-vell', 'after', opts), { type: 'story-choice', choiceId: 'wait' }).state;
  const s = sluice();
  assert.equal(s.story.nodeId, 'scene-vell-ysolde-sluice');
  assert.deepEqual(E.buildView(s).scene.choices.map((c) => c.id), ['pressed', 'respected']);
  s.party.find((m) => m.id === 'nessa').bond = 3;
  const pressed = act(s, { type: 'story-choice', choiceId: 'pressed' }).state;
  assert.equal(pressed.story.flags.b3_ysolde_pressed, true); assert.equal(pressed.story.flags.b3_ysolde_respected, undefined);
  assert.equal(bond(pressed, 'nessa'), 4);
  assert.equal(pressed.story.nodeId, 'scene-vell-camp-evening', 'The camp follows the sluices.');
  assert.match(opening(pressed), /a little way from Ysolde, not talking to her/);
  const s2 = sluice(); s2.party.find((m) => m.id === 'nessa').bond = 3;
  const respected = act(s2, { type: 'story-choice', choiceId: 'respected' }).state;
  assert.equal(respected.story.flags.b3_ysolde_respected, true); assert.equal(respected.story.flags.b3_ysolde_pressed, undefined);
  assert.equal(bond(respected, 'nessa'), 2);
  assert.match(opening(respected), /teaching Wil to whistle/);
  // Nessa away.
  const alone = sluice({ party: ['orin', 'maren'] });
  assert.equal(alone.story.nodeId, 'scene-vell-ysolde-sluice');
  const text = opening(alone);
  assert.match(text, /I'm not going\. I wanted to tell someone from the free wards/); assert.doesNotMatch(text, /Jory and Wil are at the end of the sluice|I came down here because you asked me/);
  assert.deepEqual(E.buildView(alone).scene.choices.map((c) => c.id), ['back']);
  assert.equal(E.resolveAction(alone, { type: 'story-choice', choiceId: 'pressed' }, high).result.ok, false);
  const after = act(alone, { type: 'story-choice', choiceId: 'back' }).state;
  assert.equal(after.story.flags.b3_ysolde_pressed, undefined); assert.equal(after.story.flags.b3_ysolde_respected, undefined);
  assert.equal(after.story.nodeId, 'scene-vell-camp-evening');
  assert.doesNotMatch(opening(after), /Nessa is not in her chair/);
  assert.equal(toTown(after).story.nodeId, 'town-vell');
});

test('the Vell camp names the hero\'s new 2nd job skill at level 25, in that job\'s own terms', () => {
  const camp = (spec) => { const s = at('b3-vell', 'after'); s.player.progression.specialization = spec; let x = act(s, { type: 'story-choice', choiceId: 'bless' }).state; x = act(x, { type: 'story-choice', choiceId: 'pressed' }).state; return x; };
  const g = camp('guardian');
  assert.equal(g.player.level, 25);
  assert.equal(P.learntSkills(g.player).find((k) => k.level === 25)?.name, 'Shield Wall');
  assert.match(opening(g), /Shield Wall/); assert.doesNotMatch(opening(g), /Foresight|Night eyes|haven't said what/);
  assert.match(opening(camp('lifewarden')), /Healer's grace/);
  assert.match(opening(camp('envoy')), /diplomat's poise/);
  const none = opening(camp(null));
  assert.match(none, /Steadier/); assert.match(none, /haven't said what/);
  // Every branch has its own line from Orin and from Maren.
  const lines = RAWS['vell-camp'].nodes.evening.lines;
  for (const b of Object.values(P.SPECIALIZATIONS).flat()) {
    assert.ok(lines.some((l) => l.when?.spec === b.id && l.say === 'orin') && lines.some((l) => l.when?.spec === b.id && l.say === 'maren'), b.id);
  }
});

test('the Saltwick camp: how much Orin says follows how far he trusts the hero', () => {
  const sit = (bondValue) => { const x = act(at('b3-saltwick', 'after'), { type: 'story-choice', choiceId: 'moved' }).state; x.party.find((m) => m.id === 'orin').bond = bondValue; return act(x, { type: 'story-choice', choiceId: 'you' }).state; };
  const close = opening(sit(5)), far = opening(sit(2));
  assert.match(close, /Varn's still alive/); assert.match(close, /come back here one day/); assert.doesNotMatch(close, /That is all he says/);
  assert.match(far, /That is all he says/); assert.doesNotMatch(far, /Varn's still alive/);
  assert.match(opening(act(at('b3-saltwick', 'after'), { type: 'story-choice', choiceId: 'seized' }).state), /On Saltwick's roofs/);
  assert.match(opening(act(at('b3-saltwick', 'after'), { type: 'story-choice', choiceId: 'moved' }).state), /on the Iron Road to Vell/);
});

test('the witness: the strongest way through needs the wardens\' rolls, and each decision says how many names remain', () => {
  const strong = told(peaceAt('b3-witness', { 'prepared:b3-witness': true })), weak = told(peaceAt('b3-witness'));
  assert.match(strong, /(You read|reads) it out/); assert.doesNotMatch(strong, /You don't have the wardens' rolls/);
  assert.match(weak, /You don't have the wardens' rolls/); assert.doesNotMatch(weak, /(You read|reads) it out/);
  const decide = (d, flags) => told(act(at('b3-witness', 'after', { flags }), { type: 'story-choice', choiceId: d }).state);
  assert.match(decide('witness'), /Three hundred and thirty-seven/);
  assert.match(decide('unwitness'), /All four hundred/);
  const exposed = decide('expose', { 'prepared:b3-witness': true });
  assert.match(exposed, /a hundred and ninety names on the wall/); assert.match(exposed, /iron vault's door/); assert.match(exposed, /warden's roll/);
  assert.doesNotMatch(decide('expose'), /warden's roll/);
  // Maren speaks of the one she could not hear, the way she gave her witness.
  const camp = (d) => opening(act(at('b3-witness', 'after'), { type: 'story-choice', choiceId: d }).state);
  assert.match(camp('witness'), /I gave him sixty-three/); assert.match(camp('unwitness'), /I burned it/); assert.match(camp('expose'), /A hundred and ninety stayed/);
  // Ysolde and Nessa in the opening, after the sluices.
  const start = (flags) => opening(act(ready('b3-witness', { flags }), { type: 'depart', questId: 'b3-witness' }).state);
  assert.match(start({ b3_ysolde_pressed: true }), /has not once looked at her/);
  assert.match(start({ b3_ysolde_respected: true }), /holding the other end of the wool/);
  assert.doesNotMatch(start({}), /has not once looked at her|other end of the wool/);
  assert.match(start({ b3_waiting: true }), /This is the part I can't see myself/);
});

test('the side jobs of chapters 4 to 6 open and close with their windows, and Beds for Six Hundred is told where the six hundred went', () => {
  const offered = (id, done, town) => {
    const s = ready('b3-letter'); for (const c of done) s.world.completed[c] = { xp: 0, gold: 0 };
    s.world.townId = town; s.story.nodeId = `town-${town}`;
    return E.buildView(s).world.sideJobs.find((j) => j.id === id);
  };
  const upTo = (id) => IDS.slice(0, IDS.indexOf(id) + 1);
  assert.deepEqual(['beds', 'oil', 'census', 'brothers'].map((id) => [SIDE_JOBS[id].town, SIDE_JOBS[id].from, SIDE_JOBS[id].until]), [
    ['highpass', 'b3-pass', 'b3-saltwick'], ['saltwick', 'b3-saltwick', 'b3-witness'], ['vell', 'b3-saltwick', 'b3-greatbell'], ['vell', 'b3-vell', 'b3-greatbell']]);
  assert.ok(!offered('beds', upTo('b3-rite'), 'highpass')); assert.ok(offered('beds', upTo('b3-pass'), 'highpass')?.canStart); assert.ok(!offered('beds', upTo('b3-saltwick'), 'highpass'));
  assert.ok(!offered('oil', upTo('b3-pass'), 'saltwick')); assert.ok(offered('oil', upTo('b3-saltwick'), 'saltwick')?.canStart); assert.ok(!offered('oil', upTo('b3-witness'), 'saltwick'));
  assert.ok(!offered('census', upTo('b3-pass'), 'vell')); assert.ok(offered('census', upTo('b3-saltwick'), 'vell')?.canStart);
  assert.ok(!offered('brothers', upTo('b3-saltwick'), 'vell')); assert.ok(offered('brothers', upTo('b3-vell'), 'vell')?.canStart);
  // Fennick's Census runs to chapter 9, and Jory and Wil from chapter 6 to 9.
  for (const id of ['census', 'brothers']) {
    assert.ok(offered(id, upTo('b3-vault'), 'vell')?.canStart, `${id} is open during the great bell`);
    assert.ok(!offered(id, upTo('b3-greatbell'), 'vell'), `${id} closes once the great bell is decided`);
  }
  for (const id of ['beds', 'oil', 'census', 'brothers']) assert.equal(SIDE_JOBS[id].level, QUESTS[during(SIDE_JOBS[id])].level, `${id} is at its chapter's level`);
  const beds = (flags) => { const s = ready('b3-saltwick', { flags }); s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass'; return opening(act(s, { type: 'side-job', jobId: 'beds' }).state); };
  assert.match(beds({ b3_pass_all: true }), /sleeping on my floors/);
  assert.match(beds({ b3_pass_some: true }), /camped below my walls/);
  assert.match(beds({ b3_pass_fenmere: true }), /Fenmere's rise/);
  assert.doesNotMatch(beds({ b3_pass_fenmere: true }), /sleeping on my floors|below my walls/);
});

test('on the hosted game, a free account does not see Saltwick or Vell, though the book is open to others', () => {
  const s = ready('b3-vell'); s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  assert.ok(E.buildView(s).world.towns.some((t) => t.id === 'vell'));
  Book.grant(s, Book.FREE_BOOKS);
  assert.ok(!E.buildView(s).world.towns.some((t) => ['saltwick', 'vell'].includes(t.id)));
  assert.equal(E.resolveAction(s, { type: 'travel-town', townId: 'vell' }, high).result.ok, false);
});

test('Book Three side jobs pay mostly gold and 130 XP; Book Two jobs keep their share of a level', () => {
  for (const job of B3_JOB_IDS.map((id) => SIDE_JOBS[id])) assert.equal(W.jobXp(job), 130, job.id);
  for (const job of Object.values(SIDE_JOBS).filter((j) => !B3_JOB_IDS.includes(j.id) && [j.from, j.until].every((id) => (QUESTS[id]?.book || 1) < 3))) assert.equal(W.jobXp(job), Math.round(0.12 * P.levelBand(Math.max(2, job.level))), job.id);
  const s = ready('b3-vell'); s.world.townId = 'vell'; s.story.nodeId = 'town-vell';
  assert.equal(E.buildView(s).world.sideJobs.find((j) => j.id === 'census').reward.xp, 130);
});

test('review fixes: lines that answer an absent companion, or a step not taken, are not told', () => {
  // The crossing follows the night round (the approach), not the investigation.
  const cross = (flags) => told(peaceAt('b3-saltwick', flags));
  assert.match(cross({ 'approach:b3-saltwick': true }), /the round has been walked/); assert.doesNotMatch(cross({ 'approach:b3-saltwick': true }), /nobody learned it in time/);
  assert.match(cross({ 'prepared:b3-saltwick': true }), /nobody learned it in time/);
  // "As the letter said" only if the letter was read.
  assert.match(opening(peaceAt('b3-saltwick', { 'prepared:b3-saltwick': true })), /exactly as the letter said/);
  assert.doesNotMatch(opening(peaceAt('b3-saltwick')), /exactly as the letter said/);
  // Saltwick without Orin: no reunion on the ladder, no answer to him.
  const noOrin = opening(act(ready('b3-saltwick', { party: ['maren', 'nessa'] }), { type: 'depart', questId: 'b3-saltwick' }).state);
  assert.doesNotMatch(noOrin, /looking at Orin|Orin stops|^Maren: Orin\.$|takes the end of the hook|Orin walks at the front/m);
  assert.match(noOrin, /She does not find it/); assert.match(noOrin, /Come up, then/);
  const talk = (id, opts) => told(act(act(ready(id === 'davin' ? 'b3-saltwick' : 'b3-vell', opts), { type: 'depart', questId: id === 'davin' ? 'b3-saltwick' : 'b3-vell' }).state, { type: 'story-choice', choiceId: `talk-${id}` }).state);
  assert.match(talk('davin', { party: ['maren'] }), /You tell him no\. Nobody has got to\.\nDavin: Then how is it\?/);
  assert.match(talk('davin', { party: ['maren'] }), /Nobody answers him/);
  assert.doesNotMatch(talk('davin', {}), /Nobody answers him|You tell him no/);
  const ysolde = talk('ysolde', { party: ['orin', 'maren'] });
  assert.match(ysolde, /You ask her why she is on the wall\.\nYsolde: The High Warden's promise/);
  assert.match(ysolde, /You ask her whether that is a choice at all/);
  assert.doesNotMatch(talk('ysolde', {}), /You ask her/);
  // Maren's three sittings need Maren.
  const witnessTalks = (party) => E.buildView(act(ready('b3-witness', { party }), { type: 'depart', questId: 'b3-witness' }).state).scene.choices.map((c) => c.id);
  assert.ok(['talk-bertil', 'talk-abel', 'talk-kit'].every((t) => witnessTalks(['orin', 'maren']).includes(t)));
  assert.ok(!['talk-bertil', 'talk-abel', 'talk-kit'].some((t) => witnessTalks(['orin', 'nessa']).includes(t)));
  // Exposing the trade after a fight does not cite what the volunteers said in a yard that never heard you.
  const fought = winFight(act(at('b3-witness', 'crisis'), { type: 'story-choice', choiceId: 'objective' }).state);
  const exposed = told(act(fought, { type: 'story-choice', choiceId: 'expose' }).state);
  assert.doesNotMatch(exposed, /what the volunteers told you in the yard/); assert.match(exposed, /what you saw at the barracks door/);
  assert.match(told(act(at('b3-witness', 'after', { flags: { 'method:b3-witness': 'peace' } }), { type: 'story-choice', choiceId: 'expose' }).state), /what the volunteers told you in the yard/);
  // Waiting costs Corvane the free wards' bronze.
  assert.match(told(act(at('b3-vell', 'after'), { type: 'story-choice', choiceId: 'wait' }).state), /Every day you spend looking/);
  assert.deepEqual(QUESTS['b3-vell'].decisions.find((d) => d.id === 'wait').rep, { wardens: 1 });
  // Saltwick moved gets half rations from regulation fourteen.
  assert.match(talk('saltwick', { flags: { b3_saltwick_moved: true } }), /half card/);
  // Names and canon.
  const all = JSON.stringify([RAWQ['b3-saltwick'], RAWQ['b3-vell'], RAWQ['b3-witness'], RAWJ.oil, RAWJ.census, RAWJ.brothers, RAWJ.beds]);
  assert.doesNotMatch(all, /Pell Brennick|Agathe|Nine pages|nine pages|Davin Peller, 14/);
  assert.match(all, /Anwen Holt/); assert.match(all, /Eleven pages/);
});

test('the AI storyteller is offered, and may send the party to, only towns this save can play', () => {
  const Director = require('../src/director');
  assert.ok(Director.SCHEMA.properties?.destination?.enum?.includes('vell') || JSON.stringify(Director.SCHEMA).includes('"vell"'), 'With the preview, Vell is a destination.');
  const s = ready('b3-vell');
  assert.equal(Director.destination(s, 'vell', 'highpass'), 'vell');
  Book.grant(s, Book.FREE_BOOKS);
  assert.equal(Director.destination(s, 'vell', 'highpass'), 'highpass', 'A free hosted account is never sent to Vell.');
  assert.equal(Director.destination(s, 'merrowgate', 'highpass'), 'merrowgate');
});

// Chapters 7 to 10, and the end of Part One.
const pick = (s, id) => act(s, { type: 'story-choice', choiceId: id }).state;
const decideAt = (id, d, flags = {}, opts = {}) => act(at(id, 'after', { flags, ...opts }), { type: 'story-choice', choiceId: d }).state;
const depart = (id, opts) => act(ready(id, opts), { type: 'depart', questId: id }).state;

test('home for help: Roke\'s news follows how the fifty were cast, and the council answers the way the oath was sworn', () => {
  assert.match(opening(depart('b3-home', { flags: { b3_blessed: true } })), /said yes, and that it was not only him/);
  assert.match(opening(depart('b3-home', { flags: { b3_refused: true } })), /had been asked and had said no/);
  assert.match(opening(depart('b3-home', { flags: { b3_waiting: true } })), /He waited for you/);
  // The party leaves Vell on the ninth morning; a casting put off to the twelfth catches them later.
  assert.match(opening(depart('b3-home')), /first light on the ninth day[\s\S]*fourth day out of Vell[\s\S]*Ninth day\. He cast them/);
  const late = opening(depart('b3-home', { flags: { b3_waiting: true } }));
  assert.match(late, /sixth day out of Vell[\s\S]*Twelfth day\. He cast them/); assert.doesNotMatch(late, /fourth day out|Ninth day\. He cast/);
  assert.match(opening(depart('b3-home', { flags: { b3_pass_fenmere: true } })), /Fenmere's rise/);
  const after = (flags) => opening(at('b3-home', 'after', { flags }));
  assert.match(after({ second_oath: 'council' }), /You swore your oath to this council/);
  assert.match(after({ second_oath: 'none' }), /You swore your oath to no one/);
  assert.match(after({}), /Say it plainly/);
  assert.doesNotMatch(after({}), /You swore your oath/);
  // Elske speaks only if the save has an Elske to speak.
  assert.ok(!E.buildView(depart('b3-home')).scene.choices.some((c) => c.id === 'talk-elske'));
  assert.ok(E.buildView(depart('b3-home', { flags: { elske_free: true } })).scene.choices.some((c) => c.id === 'talk-elske'));
  for (const [d, flag] of [['take', 'b3_council_take'], ['help', 'b3_council_help'], ['refuse', 'b3_council_refuse']]) assert.equal(decideAt('b3-home', d).story.flags[flag], true, d);
});

test('after the council, Aster asks to go, and the answer is a flag the great bell reads', () => {
  let s = decideAt('b3-home', 'help');
  assert.equal(s.story.nodeId, `scene-home-aster-${SCENES['home-aster'].start}`);
  const go = toTown(pick(s, 'go'));
  assert.equal(go.story.flags.b3_aster_may_go, true);
  assert.equal(go.story.nodeId, 'town-vell', 'Home for help ends back at Vell.');
  const stay = pick(decideAt('b3-home', 'help'), 'stay');
  assert.equal(stay.story.flags.b3_aster_stays, true); assert.ok(!stay.story.flags.b3_aster_may_go);
  // Without Nessa the camp is skipped.
  assert.equal(toTown(pick(decideAt('b3-home', 'help', {}, { party: ['orin', 'maren'] }), 'go')).story.nodeId, 'town-vell');
});

test('the quiet bells: Hesk keeps the round key and goes to his district; a Lantern Hall factor meets him on the stair', () => {
  let s = depart('b3-vault');
  assert.match(opening(s), /The round one/);
  s = pick(s, 'talk-hesk');
  assert.match(told(s), /round, not toothed/);
  const end = opening(at('b3-vault', 'after'));
  assert.match(end, /Ansel Crane/); assert.match(end, /Lantern Hall/);
  assert.match(end, /round, and iron, and black/);
  assert.doesNotMatch(JSON.stringify(RAWQ['b3-vault']), /Hesk takes Corvane's copy|Tamsin|Brask/);
  const closed = decideAt('b3-vault', 'closed'), held = decideAt('b3-vault', 'held');
  assert.equal(closed.story.flags.b3_vault_closed, true); assert.equal(held.story.flags.b3_vault_held, true);
  assert.match(told(held), /Nineteen yes\. Ten don't answer\. Two no\./);
  // The vault camp has no cast and closes at Vell.
  assert.equal(toTown(closed).story.nodeId, 'town-vell');
});

test('a written fight can be made harder by an earlier choice: the great bell is harder if the vault\'s bells were let go', () => {
  const Combat = require('../src/combat');
  assert.equal(Combat.flagScale({ story: { flags: {} } }, { flagScale: { a: 2 } }), 1);
  assert.equal(Combat.flagScale({ story: { flags: { a: true } } }, { flagScale: { a: 2, b: 3 } }), 2);
  assert.equal(Combat.flagScale({ story: { flags: { a: true, b: true } } }, { flagScale: { a: 2, b: 3 } }), 6);
  assert.equal(Combat.flagScale({ story: { flags: {} } }, {}), 1);
  const { ENCOUNTERS } = require('../src/content');
  assert.equal(ENCOUNTERS['quest:b3-greatbell'].flagScale.b3_vault_closed, 1.3);
  const hp = (flags) => { const s = pick(at('b3-greatbell', 'crisis', { flags }), 'confront'); assert.ok(s.combat?.active); return s.combat.actors.filter((a) => a.team === 'enemy').reduce((n, a) => n + a.maxHp, 0); };
  const plain = hp({}), held = hp({ b3_vault_held: true }), closed = hp({ b3_vault_closed: true });
  assert.equal(held, plain);
  assert.ok(closed > plain * 1.2, `${closed} > ${plain} * 1.2`);
});

test('the great bell: the names counted follow the witness, Aster goes only with leave, and the chapter runs on to the Iron Road', () => {
  const cast = (flags) => told(decideAt('b3-greatbell', 'cast', flags));
  assert.match(cast({ b3_witnessed: true }), /Two hundred and eighty|280/i);
  assert.match(cast({ b3_quotas_exposed: true }), /hundred and thirty-six|136/i);
  assert.match(cast({}), /Three hundred and forty-one/);
  const choices = (flags) => E.buildView(at('b3-greatbell', 'after', { flags })).scene.choices.map((c) => c.id).filter((id) => ['cast', 'evacuate', 'aster'].includes(id));
  assert.deepEqual(choices({}), ['cast', 'evacuate']);
  assert.deepEqual(choices({ b3_aster_may_go: true }), ['cast', 'evacuate', 'aster']);
  assert.ok(!Object.values(SCENES).some((x) => x?.after === 'b3-greatbell'), 'No camp after the great bell.');
  const s = decideAt('b3-greatbell', 'evacuate', { b3_council_take: true });
  assert.equal(s.story.nodeId, 'town-vell');
  assert.ok(E.buildView(s).world.quests.some((q) => q.id === 'b3-paid'), 'What was paid is on the board at once.');
  // Mother Bell defaults to the chorus on a save without the choice.
  assert.doesNotMatch(opening(depart('b3-greatbell')), /undefined/);
});

test('after the evacuation Vell is an empty city: no shop, forge, inn or side jobs, but a bed and the road out', () => {
  const s = decideAt('b3-greatbell', 'evacuate');
  const w = E.buildView(s).world;
  assert.equal(w.town.id, 'vell'); assert.equal(w.town.subtitle, 'The Empty City'); assert.match(w.town.description, /Vell is empty/);
  assert.deepEqual(w.shop, []); assert.deepEqual(w.upgrades, []); assert.deepEqual(w.recipes, []);
  assert.deepEqual(w.services.map((x) => x.id), ['civic-rest']);
  assert.ok(!w.sideJobs.some((j) => SIDE_JOBS[j.id]?.town === 'vell'));
  assert.equal(E.resolveAction(s, { type: 'town-service', serviceId: 'inn' }, high).result.ok, false);
  assert.equal(E.resolveAction(s, { type: 'town-service', serviceId: 'civic-rest' }, high).result.ok, true);
  assert.ok(w.towns.some((t) => t.id === 'briarwatch'));
  const cast = E.buildView(decideAt('b3-greatbell', 'cast')).world;
  assert.notEqual(cast.town.subtitle, 'The Empty City'); assert.ok(cast.shop.length > 0);
});

test('what was paid: Hesk\'s satchel is empty, the Lantern Hall\'s bill is signed by Cass Ord, and the round key is in his effects', () => {
  const end = (flags) => opening(at('b3-paid', 'after', { flags }));
  const a = end({ b3_to_council: true });
  assert.match(a, /empty/); assert.match(a, /Cass Ord/); assert.match(a, /Iona writes his effects/); assert.match(a, /one key, iron, round, on a chain/);
  assert.match(end({}), /Sorrel's clerk writes his effects/);
  assert.doesNotMatch(end({}), /Iona writes his effects/);
  assert.doesNotMatch(JSON.stringify(RAWQ['b3-paid']), /Tamsin|Brask/);
  for (const [d, flag] of [['destroy', 'b3_rite_destroyed'], ['law', 'b3_rite_law'], ['vell', 'b3_rite_vell']]) {
    const s = decideAt('b3-paid', d);
    assert.equal(s.story.flags[flag], true, d);
    assert.equal(s.story.nodeId, 'scene-b3-partone-end-corvane', `${d}: the end of Part One follows`);
    assert.equal(s.player.level, 30);
  }
  // Merel's ledger: Orin's line needs Orin.
  assert.match(told(pick(depart('b3-paid'), 'talk-ledger')), /I was holding it/);
  assert.doesNotMatch(told(pick(depart('b3-paid', { party: ['maren', 'nessa'] }), 'talk-ledger')), /I was holding it/);
});

test('the end of Part One: Corvane is decided, Dera names the level-30 skill, and a letter says someone has gone down under the vault', () => {
  const end = (spec, flags = {}, corvane = 'keeper') => { const s = decideAt('b3-paid', 'law', flags); s.player.progression.specialization = spec; return pick(s, corvane); };
  const g = end('guardian');
  assert.equal(P.learntSkills(g.player).find((k) => k.level === 30)?.name, 'Bulwark Stand');
  assert.match(opening(g), /Bulwark Stand/); assert.doesNotMatch(opening(g), /Disarming Flourish/);
  assert.equal(g.story.flags.b3_corvane_keeper, true);
  assert.match(opening(end('duelist')), /Disarming Flourish/);
  // Every 2nd job has a line from Dera that names its level-30 skill.
  const forge = RAWS['b3-partone-end'].nodes.forge.lines;
  for (const [cls, branches] of Object.entries(P.SPECIALIZATIONS)) for (const b of branches) {
    const line = forge.find((l) => l.when?.spec === b.id);
    assert.ok(line, b.id);
    const skill = P.learntSkills({ classId: cls, level: 30, progression: { specialization: b.id, mastery: true } }).find((k) => k.level === 30)?.name;
    assert.ok(skill && line.text.includes(skill), `${b.id}: ${skill}`);
  }
  assert.match(opening(end('guardian', { b3_bell_aster: true })), /by hand, on the rope/);
  assert.match(opening(end('guardian')), /Aster Vey rings with both of them/);
  for (const c of ['judged', 'vell']) assert.equal(end('guardian', {}, c).story.flags[`b3_corvane_${c}`], true);
  const letter = (flags, c) => pick(end('guardian', flags, c), 'letter');
  const fen = opening(letter({ b3_bell_evacuate: true }, 'keeper'));
  assert.match(fen, /Clerk-Major Fennick/);
  assert.match(fen, /It was not forced\. It was unlocked\./);
  assert.match(fen, /Someone has opened the iron door under the vault, and gone down\./);
  assert.doesNotMatch(fen, /To be continued/, "The engine says it once, back in town.");
  assert.match(opening(letter({}, 'keeper')), /Keeper of the Names/);
  assert.match(opening(letter({}, 'judged')), /being held at Highpass/);
  assert.doesNotMatch(opening(letter({}, 'vell')), /Fennick|Keeper of the Names|held at Highpass/);
});

test('"To be continued" is told once, back in town after the end of Part One, not when the last decision is made', () => {
  const r = act(at('b3-paid', 'after'), { type: 'story-choice', choiceId: 'law' });
  assert.ok(!r.events?.some((e) => /To be continued/.test(e.text || '')));
  assert.equal(r.state.story.flags['books:part-end-due'], 'b3-paid');
  let s = pick(pick(r.state, 'keeper'), 'letter');
  const last = act(s, { type: 'story-choice', choiceId: 'fold' });
  assert.ok(E.buildView(last.state).world.town, 'The letter is folded at home.');
  assert.equal(last.state.story.flags.b3_partone_done, true);
  assert.equal(last.events.filter((e) => /To be continued/.test(e.text || '')).length, 1);
  assert.ok(!last.state.story.flags['books:part-end-due']);
  assert.equal(Book.chapter(last.state).id, 'to-be-continued');
  assert.equal(Book.chapter(last.state).waiting, true);
  assert.equal(Book.levelCap(last.state), 30);
});

test('a hero walks Book Three from the letter to the end of Part One at level 30', () => {
  const picks = { 'b3-letter': 'aster', 'b3-rite': 'council', 'b3-pass': 'all', 'b3-saltwick': 'moved', 'b3-vell': 'wait', 'b3-witness': 'expose', 'b3-home': 'take', 'b3-vault': 'held', 'b3-greatbell': 'evacuate', 'b3-paid': 'law' };
  const scenePicks = new Set(['respected', 'go', 'keeper', 'letter', 'fold']);
  let s = ready('b3-letter');
  s.player.progression.specialization = 'guardian';
  s.player.inspirationPrepared = true; for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) s.player.abilities[k] = 30;
  for (const id of IDS) {
    if (s.world.townId !== QUESTS[id].town) s = act(s, { type: 'travel-town', townId: QUESTS[id].town }).state;
    s.player.inspirationPrepared = true;
    s = act(s, { type: 'depart', questId: id }).state;
    s = pick(s, 'investigate'); s = pick(s, 'advance'); s = pick(s, 'careful');
    s.story.clues.push(`${id}-evidence`); s.player.inspirationPrepared = true;
    s = pick(s, 'resolve');
    assert.equal(s.story.nodeId, `q-${id}-after`, id);
    let r = act(s, { type: 'story-choice', choiceId: picks[id] }); s = r.state;
    assert.equal(s.player.level, QUESTS[id].level + 1, id);
    let events = [...(r.events || [])];
    for (let i = 0; i < 12 && !E.buildView(s).world.town; i++) {
      const cs = E.buildView(s).scene.choices;
      const c = cs.find((x) => scenePicks.has(x.id) && !x.locked) || cs.find((x) => !x.locked);
      r = act(s, { type: 'story-choice', choiceId: c.id }); s = r.state; events.push(...(r.events || []));
    }
    assert.ok(E.buildView(s).world.town, `${id}: back in town`);
    if (id === 'b3-paid') assert.equal(events.filter((e) => /To be continued/.test(e.text || '')).length, 1);
  }
  assert.equal(s.player.level, 30);
  for (const f of ['b3_council_take', 'b3_vault_held', 'b3_bell_evacuate', 'b3_rite_law', 'b3_corvane_keeper', 'b3_partone_done']) assert.equal(s.story.flags[f], true, f);
  assert.equal(Book.chapter(s).id, 'to-be-continued');
  assert.equal(Book.levelCap(s), 30);
});

test('review nits: "you have seen that road" needs the night round, and in the Oil Run Davin came back with Mags to keep the lamps', () => {
  const all = (s) => `${opening(s)}\n${told(s)}`;
  const road = (flags) => { const s = at('b3-saltwick', 'crisis', { flags, party: ['maren', 'nessa'] }); return `${all(s)}\n${all(peaceAt('b3-saltwick', flags, { party: ['maren', 'nessa'] }))}`; };
  assert.match(road({ 'approach:b3-saltwick': true }), /You have seen that road/);
  assert.doesNotMatch(road({}), /You have seen that road/);
  assert.match(road({}), /You tell Mags: not to the hall/);
  const oil = (flags, party) => { const s = ready('b3-vell', { flags, party }); s.world.townId = 'saltwick'; s.story.nodeId = 'town-saltwick'; return opening(act(s, { type: 'side-job', jobId: 'oil' }).state); };
  for (const party of [['orin', 'maren'], ['maren']]) {
    assert.match(oil({ b3_saltwick_moved: true }, party), /Take Davin\. He came back with me to keep the lamps/);
    assert.match(oil({ b3_saltwick_bought: true }, party), /Take Davin\. He knows the road/);
    assert.doesNotMatch(oil({ b3_saltwick_bought: true }, party), /to keep the lamps\. He knows/);
  }
});

// PR #67 review fixes.
test('PR #67: the end of Part One cannot be left half-played, and "to be continued" never sticks', () => {
  const s = decideAt('b3-paid', 'law');
  assert.equal(s.story.nodeId, 'scene-b3-partone-end-corvane');
  assert.equal(E.buildView(s).world.canReturn, false);
  assert.equal(E.resolveAction(s, { type: 'return-town' }, high).result.ok, false);
  const forge = pick(s, 'keeper');
  assert.equal(E.resolveAction(forge, { type: 'return-town' }, high).result.ok, false, 'Not from a later node of the scene either.');
  // A camp scene that only changes approval can still be left.
  const camp = pick(decideAt('b3-home', 'help'), 'go');
  assert.equal(camp.story.nodeId, `scene-home-camp-${SCENES['home-camp'].start}`);
  assert.equal(E.resolveAction(camp, { type: 'return-town' }, high).result.ok, true);
});

test('PR #67: the Empty City has no bounty board, recruit, practice or AI work, and is called what it is', () => {
  const s = decideAt('b3-greatbell', 'evacuate', {}, { party: ['orin', 'maren'] });
  const v = E.buildView(s);
  assert.equal(v.scene.location, 'The Empty City');
  assert.equal(v.world.bounty, null); assert.equal(v.world.canRecruit, false); assert.equal(v.world.canPractice, false);
  for (const type of ['recruit', 'practice', 'bounty']) assert.equal(E.resolveAction(s, { type }, high).result.ok, false, type);
  assert.equal(v.world.director.canCommission, false); assert.match(v.world.director.reason, /nobody left in Vell/);
  assert.equal(require('../src/data/towns.json').vell.emptied.rumor, undefined);
  const cast = decideAt('b3-greatbell', 'cast');
  assert.notEqual(E.buildView(cast).scene.location, 'The Empty City');
  assert.equal(E.buildView(cast).world.canPractice, true);
});

test('PR #67: the numbers on the wall follow the witness everywhere they are said', () => {
  const aster = (flags) => opening(decideAt('b3-home', 'help', flags));
  assert.match(aster({}), /Three hundred and fifty people/);
  assert.match(aster({ b3_witnessed: true }), /Two hundred and eighty-seven/);
  assert.match(aster({ b3_quotas_exposed: true }), /A hundred and forty/);
  assert.doesNotMatch(aster({ b3_witnessed: true }), /four hundred|Three hundred and fifty/);
  const peace = (flags) => told(peaceAt('b3-greatbell', flags));
  assert.match(peace({}), /that four hundred people said yes/);
  assert.match(peace({ b3_witnessed: true }), /that three hundred and thirty-seven people said yes/);
  assert.match(peace({ b3_quotas_exposed: true }), /that a hundred and ninety people said yes/);
  assert.match(told(decideAt('b3-greatbell', 'cast')), /Almost all of it/);
  const sorrel = (flags) => opening(decideAt('b3-paid', 'law', flags));
  assert.match(sorrel({ b3_bell_evacuate: true }), /cast fifty living people/);
  assert.match(sorrel({ b3_bell_cast: true }), /cast three hundred and ninety-one living people/);
  assert.match(sorrel({ b3_bell_cast: true, b3_witnessed: true }), /cast three hundred and thirty living people/);
  assert.match(sorrel({ b3_bell_cast: true, b3_quotas_exposed: true }), /cast a hundred and eighty-six living people/);
  assert.equal((sorrel({ b3_bell_cast: true, b3_witnessed: true }).match(/^Sorrel: Him I can hold/gm) || []).length, 1);
});

test('PR #67: where the rest of Vell goes is told by the council\'s vote, on the cast and Aster routes too', () => {
  for (const d of ['cast', 'aster']) {
    const go = (flags) => told(decideAt('b3-greatbell', d, { b3_aster_may_go: true, b3_quotas_exposed: true, ...flags }));
    assert.match(go({ b3_council_take: true }), /which promised to take them/, d);
    assert.match(go({ b3_council_help: true }), /oil and seed, sent to a city/, d);
    assert.match(go({ b3_council_refuse: true }), /a council that promised them nothing/, d);
    assert.match(go({}), /with whatever she can find/, d);
  }
});

test('PR #67: lines that answer or name a companion are told only with them there', () => {
  // Tovin points back to the tower talk only if it was had.
  const tower = act(ready('b3-home'), { type: 'depart', questId: 'b3-home' }).state;
  assert.equal(pick(tower, 'talk-tower').story.flags.b3_tower_talk, true);
  assert.doesNotMatch(opening(decideAt('b3-home', 'help')), /I told you on the stair/);
  assert.match(opening(decideAt('b3-home', 'help', { b3_tower_talk: true })), /I told you on the stair/);
  // Nessa and Maren answer Aster, and are missed when away.
  assert.match(opening(decideAt('b3-home', 'help', { b3_ysolde_respected: true })), /If I let Ysolde choose/);
  assert.match(opening(decideAt('b3-home', 'help', { b3_ysolde_pressed: true })), /I told Ysolde she couldn't/);
  const alone = opening(decideAt('b3-home', 'help', { b3_ysolde_pressed: true }, { party: ['orin'] }));
  assert.match(alone, /Nessa is not here/); assert.match(alone, /Maren is not here/); assert.doesNotMatch(alone, /I told Ysolde/);
  // Tovin's hours are not lost without Nessa; her letter is.
  const camp = pick(decideAt('b3-home', 'help', {}, { party: ['orin', 'maren'] }), 'go');
  assert.equal(camp.story.nodeId, `scene-home-camp-${SCENES['home-camp'].start}`);
  assert.match(opening(camp), /Tovin rings the hours/); assert.doesNotMatch(opening(camp), /Biscuit/);
  assert.ok(!E.buildView(camp).scene.choices.some((c) => c.id === 'write'));
  // The square after a fight, with Maren away.
  const square = (party) => opening(at('b3-home', 'after', { flags: { 'method:b3-home': 'force' }, party }));
  assert.match(square(['maren']), /Maren has stitched/); assert.match(square(['orin']), /shrine-sister has stitched/); assert.doesNotMatch(square(['orin']), /Maren/);
  // Orin's question in the vault, unanswered only if he asked it.
  assert.doesNotMatch(told(decideAt('b3-vault', 'held', {}, { party: ['maren'] })), /Nobody answers him/);
  assert.match(told(decideAt('b3-vault', 'held', {}, { party: ['orin', 'maren'] })), /Nobody answers him/);
  const roofs = RAWQ['b3-greatbell'].route.failure.filter((l) => /Tanner's Row/.test(l.narrate));
  // With Orin there his rope gets whoever fell out, unless he fell himself (then your hand does).
  assert.deepEqual(roofs.map((l) => l.when), [{ party: 'orin', notRoller: 'orin' }, { party: 'orin', roller: 'orin' }, { absent: 'orin' }]);
  assert.match(roofs[1].narrate, /your hand gets him out/);
  assert.doesNotMatch(roofs[2].narrate, /Orin/);
});

test('PR #67: Dera\'s level-30 lines hold on every route, and Corvane learns of the satchel from the gate log', () => {
  const forge = RAWS['b3-partone-end'].nodes.forge.lines.filter((l) => l.say === 'Dera' && l.when?.spec);
  for (const l of forge) assert.doesNotMatch(l.text, /echo-stone|stone one|Hesk|Vell|Hollins/, l.when.spec);
  const chron = forge.filter((l) => l.when.spec === 'chronist');
  assert.deepEqual(chron.map((l) => [l.when.party, l.when.absent]), [['maren', undefined], [undefined, 'maren']]);
  assert.doesNotMatch(chron[1].text, /Maren/);
  const o = opening(depart('b3-paid'));
  assert.match(o, /I didn't know what I'd seen until Fennick read me the gate log/); assert.doesNotMatch(o, /I watched him/);
  assert.match(o, /out by the east gate/); assert.match(o, /the morning after the great bell/);
  const out = opening(depart('b3-paid', { flags: { b3_bell_evacuate: true } }));
  assert.match(out, /waiting at the Second Gate when you carry him out/); assert.doesNotMatch(out, /Two nights ago|the morning after the great bell/);
  assert.match(told(decideAt('b3-paid', 'law')), /the only caster left who will still do it/);
  assert.match(told(decideAt('b3-paid', 'law')), /I won't\. Not again\./);
  const all = JSON.stringify([RAWQ['b3-home'], RAWQ['b3-vault'], RAWQ['b3-greatbell'], RAWQ['b3-paid'], RAWS['vault-camp'], RAWS['b3-partone-end']]);
  assert.doesNotMatch(all, /south gate|congregation|Nobody makes a joke|fourteenth|only trained caster|The last nineteen years|for the harvest, and stayed/);
  assert.doesNotMatch(JSON.stringify(RAWS['b3-partone-end']), /"To be continued\."/);
});
