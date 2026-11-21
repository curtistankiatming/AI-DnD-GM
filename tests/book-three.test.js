'use strict';
// Book Three is hidden from players until Part One is written (src/book.js,
// "out"). These tests read it the way agent playtests do. node --test runs
// each file in its own process, so this reaches no other test file.
process.env.BRIARWATCH_PREVIEW_BOOKS = '1';
// Book Three, "The Names in the Bronze", Part One, chapters 1 to 3
// (docs/book-three/DESIGN.md): the letter, Sable's rite, the pass in spring,
// their camp scenes and the two side jobs of that stretch.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { STORY_NODES, ENEMIES, COMPANIONS, CLUES } = require('../src/content');
const { QUESTS, SCENES, SIDE_JOBS, liveLines } = require('../src/expansion');
const RAWQ = require('../src/data/quests.json'), RAWS = require('../src/data/scenes.json'), RAWJ = require('../src/data/side-jobs.json');
const high = () => .999999, low = () => 0;

const IDS = ['b3-letter', 'b3-rite', 'b3-pass'];
const THREE = Object.values(QUESTS).filter((q) => q.book === 3);
function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)}: ${r.result.error}`); return r; }
// A hero in the town where a chapter starts, with every earlier chapter done.
function ready(id, { cls = 'fighter', party = ['orin', 'maren', 'nessa'], flags = {} } = {}) {
  const q = QUESTS[id];
  let s = hero(cls, q.level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold']; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, flags); W.init(s);
  if (party.includes('nessa')) s = act(s, { type: 'recruit' }).state;
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

test('Book Three follows the Second Oath, one chapter per level, from Briarwatch to Highpass', () => {
  assert.deepEqual(THREE.map((q) => q.id), IDS);
  assert.deepEqual(THREE.map((q) => [q.id, q.unlock, q.town, q.nextTown || q.town, q.level, q.xp, q.part]), [
    ['b3-letter', 'oath', 'briarwatch', 'highpass', 20, 6750, 1],
    ['b3-rite', 'b3-letter', 'highpass', 'highpass', 21, 7000, 1],
    ['b3-pass', 'b3-rite', 'highpass', 'highpass', 22, 7250, 1]
  ]);
  for (const q of THREE) {
    assert.equal(q.xp, P.levelBand(q.level), `${q.id} pays exactly one level`);
    assert.equal(Book.bookOf(q.id).title, 'The Names in the Bronze');
    for (const key of ['opening', 'crisis', 'after', 'approach']) assert.ok(Array.isArray(q[key]) && q[key].length, `${q.id}.${key} is written as lines`);
    assert.ok(q.talks.length >= 3 && q.decisions.length === 3, q.id);
    assert.ok(STORY_NODES[`q-${q.id}-start`] && STORY_NODES[`q-${q.id}-after`], q.id);
    assert.ok(ENEMIES[q.foe] && ENEMIES[`${q.foe}-retainer`], q.id);
    assert.equal(ENEMIES[q.foe].name, q.foeName); assert.equal(ENEMIES[q.foe].attack.name, q.attackName); assert.equal(ENEMIES[`${q.foe}-retainer`].name, q.retainerName);
  }
  assert.deepEqual(Book.CHAPTERS.slice(-4).map((q) => q.id), ['oath', ...IDS], 'With the preview, the board reads Book Three after Book Two.');
});

test('the Second Oath epilogue hands the hero straight on to the letter from Vell', () => {
  let s = at('oath', 'after');
  const r = act(s, { type: 'story-choice', choiceId: 'seat' });
  assert.equal(r.state.story.flags[Book.FINISHED], undefined, 'Not handed to the AI storyteller.');
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
    'b3-pass': { all: ['b3_pass_all', { orin: 1 }], some: ['b3_pass_some', {}], fenmere: ['b3_pass_fenmere', {}] }
  };
  for (const id of IDS) for (const [decision, [flag, approval]] of Object.entries(expect[id])) {
    const before = playPeaceful(id, decision).state;
    assert.ok(before.world.completed[id], `${id}/${decision} completes the chapter`);
    assert.equal(before.story.flags[flag], true, `${id}/${decision} sets ${flag}`);
    for (const other of Object.values(expect[id]).map((x) => x[0]).filter((f) => f !== flag)) assert.equal(before.story.flags[other], undefined, `${id}/${decision} does not set ${other}`);
    assert.equal(before.story.flags[`method:${id}`], 'peace');
    assert.equal(before.player.level, QUESTS[id].level + 1, `${id}: the chapter levels the hero`);
    assert.equal(before.story.nodeId, `scene-${Object.values(SCENES).find((x) => x?.after === id).id}-${Object.values(SCENES).find((x) => x?.after === id).start}`, `${id}: the camp scene follows`);
    // The decision's own approval lands (talks may add their own before it).
    const d = QUESTS[id].decisions.find((x) => x.id === decision);
    assert.deepEqual(d.approval || {}, approval, `${id}/${decision} approval`);
    const home = toTown(before);
    assert.equal(home.story.nodeId, `town-${QUESTS[id].nextTown || QUESTS[id].town}`);
  }
});

test('a decision changes exactly the approval the design gives it', () => {
  for (const [id, decision, who, delta] of [['b3-rite', 'burn', 'maren', 1], ['b3-rite', 'carry', 'nessa', 1], ['b3-rite', 'council', 'orin', 1], ['b3-pass', 'all', 'orin', 1]]) {
    const s = at(id, 'after');
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
const KNOWN_WHEN = new Set(['flag', 'is', 'notFlag', 'anyFlag', 'party', 'absent', 'class', 'item', 'notItem', 'clue', 'notClue', 'access', 'notAccess']);
const ENGINE_PREFIX = /^(method|prepared|approach|partial|job|away|walked):/;
// Each line array in a piece of content, with its owner and where it sits in the story.
function lineArrays(owner, value, out = []) {
  if (Array.isArray(value)) { if (value.some((l) => l && (l.say || l.narrate))) out.push({ owner, lines: value }); value.forEach((v) => lineArrays(owner, v, out)); }
  else if (value && typeof value === 'object') for (const v of Object.values(value)) lineArrays(owner, v, out);
  return out;
}
const B3_SCENES = Object.values(RAWS).filter((x) => x?.nodes && IDS.includes(x.after));
const B3_JOBS = Object.values(RAWJ).filter((j) => j?.nodes && [j.from, j.until].some((id) => IDS.includes(id)));
const order = (id) => IDS.indexOf(id);
// Flags set by each Book Three chapter, its camp scene or a job, and every flag
// Books One and Two can set.
function setBy(content) { const f = new Set(); JSON.stringify(content, (k, v) => { if (k === 'flag' && typeof v === 'string' && content.decisions?.some((d) => d.flag === v)) f.add(v); if (k === 'setFlags' && v) Object.keys(v).forEach((x) => f.add(x)); return v; }); for (const d of content.decisions || []) f.add(d.flag); return f; }
const EARLIER = new Set(['second_oath', 'spiritFreed', 'lysaSpared']);
for (const q of Object.values(RAWQ).filter((q) => (q.book || 1) < 3)) for (const f of setBy(q)) EARLIER.add(f);
for (const s of Object.values(RAWS).filter((x) => x?.nodes && (RAWQ[x.after]?.book || 1) < 3)) for (const f of setBy(s)) EARLIER.add(f);
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
  }
});

test('every flag a Book Three line reads is set earlier in the story, and an old save has a line for a missing Book Two choice', () => {
  const b3Set = IDS.map((id) => { const f = setBy(RAWQ[id]); for (const s of B3_SCENES.filter((x) => x.after === id)) for (const x of setBy(s)) f.add(x); return f; });
  const setBefore = (flag, upTo) => b3Set.slice(0, upTo).some((f) => f.has(flag));
  const check = (owner, lines, upTo) => {
    for (const l of lines) {
      const w = l.when; if (!w) continue;
      for (const flag of [w.flag, w.notFlag, ...(w.anyFlag || [])].filter(Boolean)) {
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
  for (const s of B3_SCENES) for (const { owner, lines } of lineArrays(s.id, s)) check(owner, lines, order(s.after) + 1);
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
  assert.deepEqual(B3_SCENES.map((s) => [s.id, s.after]), [['letter-camp', 'b3-letter'], ['rite-camp', 'b3-rite'], ['pass-camp', 'b3-pass']]);
  for (const s of B3_SCENES) {
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
  assert.deepEqual([library.town, library.from, library.until], ['highpass', 'b3-letter', 'b3-pass']);
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
  assert.ok(!offered('library', ['b3-letter', 'b3-rite', 'b3-pass'], 'highpass'));
  // Before Book Two is over, neither is on offer.
  const early = ready('oath'); early.world.townId = 'briarwatch'; early.story.nodeId = 'town-briarwatch';
  assert.ok(!E.buildView(early).world.sideJobs.some((j) => ['apprentice', 'library'].includes(j.id)));
});

function paths(job) {
  const out = [];
  const walk = (key, trail) => {
    for (const c of job.nodes[key].choices) for (const rng of c.check ? [high, low] : [high]) {
      const o = c.check ? (rng === high ? c.success : c.failure) : c;
      const step = [...trail, { choiceId: c.id, rng }];
      if (o.next) walk(o.next, step); else out.push(step);
    }
  };
  walk(job.start, []);
  return out;
}
test('every way through both Book Three side jobs ends in town, paid once, never past the chapter, with or without companions', () => {
  for (const job of [SIDE_JOBS.apprentice, SIDE_JOBS.library]) for (const party of [['orin', 'maren', 'nessa'], []]) for (const path of paths(job)) {
    let s = ready(job.id === 'library' ? 'b3-rite' : 'b3-letter', { party });
    s.world.townId = job.town; s.story.nodeId = `town-${job.town}`;
    const before = { xp: s.player.xp, gold: s.player.gold, level: s.player.level };
    s = act(s, { type: 'side-job', jobId: job.id }).state;
    if (!party.length) assert.doesNotMatch(opening(s), /^(Orin|Maren|Nessa):/m);
    for (const step of path) s = act(s, { type: 'story-choice', choiceId: step.choiceId }, step.rng).state;
    const where = `${job.id} ${path.map((p) => p.choiceId).join('>')} [${party.join(',')}]`;
    assert.equal(s.story.nodeId, `town-${job.town}`, where);
    assert.equal(s.story.flags[`job:${job.id}`], true, where);
    assert.ok(s.player.gold >= before.gold + job.gold - 1, where);
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
