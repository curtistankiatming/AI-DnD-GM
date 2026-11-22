'use strict';
// Book Four, The Long Tally: the engine groundwork (docs/book-four/DESIGN.md,
// build step 2). These tests play Book Four's thirty chapters with the preview
// on: the ones written so far, and fixtures (tests/fixtures/book-four.js) for the rest,
// as agent playtests read the books. node --test runs each file in its own
// process, so neither the fixtures nor the preview reach any other test file.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const Away = require('../src/away'), D = require('../src/director'), Bounty = require('../src/bounty'), Gear = require('../src/gear');
const X = require('../src/expansion');
const { QUESTS, TOWNS } = X;
const { ITEMS } = require('../src/content');
const high = () => .999999;

// A level bounty above level 40 (Book Four's), for the gear gate test. It is
// added before anything reads the reward table, which is built once.
ITEMS['fixture-b4-charm'] = { ...ITEMS['sentinel-charm'], id: 'fixture-b4-charm', name: 'Fixture Charm', exclusive: { event: 'bounty:highpass:45' } };

const ALL_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
function hero(level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); Object.assign(s.player.progression, { mastery: true, specialization: 'guardian' }); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
// A hero in the town where a chapter starts, with every chapter before it done.
function ready(id, { level = QUESTS[id].level, third = true, party = ['orin', 'maren', 'nessa'], flags = {} } = {}) {
  const q = QUESTS[id];
  let s = hero(level); s.player.gold = 1000; s.player.progression.thirdJob = third;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (!other.sideJob) s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = [...ALL_TOWNS]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true }, flags); W.init(s);
  if (party.includes('nessa')) s = act(s, { type: 'recruit' }).state;
  s.party = s.party.filter((m) => party.includes(m.id));
  return s;
}
const atEnd = (s, id) => { s.story.nodeId = `q-${id}-after`; s.world.activeQuest = id; s.world.onExpedition = true; s.story.flags[`method:${id}`] = 'peace'; return s; };
const api = { awardXp: E.awardXp, addItem: require('../src/engine-core').addItem };
const card = (s, id) => E.buildView(s).world.quests.find((q) => q.id === id);
function throughScenes(s) { for (let i = 0; i < 6 && E.buildView(s).scene.id.startsWith('scene-'); i++) s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state; return s; }

test('Book Four is on the shelf: paid, three parts, none out, ending at the parting; the free books stay two', () => {
  const four = Book.SHELF.find((b) => b.n === 4);
  const { n, title, paid, parts, out, finale } = four;
  assert.deepEqual({ n, title, paid, parts, out, finale }, { n: 4, title: 'The Long Tally', paid: true, parts: 3, out: 0, finale: 'b4-parting' });
  assert.equal(Book.FREE_BOOKS, 2);
  // The preview reads every written part.
  assert.deepEqual(Book.BOOKS.map((b) => b.n), [1, 2, 3, 4]);
  assert.equal(four.last, 'b4-parting'); assert.equal(four.writing, false);
  const chapters = Book.CHAPTERS.filter((q) => q.book === 4);
  assert.deepEqual(chapters.map((q) => q.id), FX.IDS);
  assert.equal(Book.CHAPTERS.indexOf(QUESTS['b4-walker']), Book.CHAPTERS.indexOf(QUESTS['b3-firstbell']) + 1, 'Book Four follows Book Three in story order.');
  assert.equal(QUESTS['b4-walker'].unlock, 'b3-firstbell');
  assert.deepEqual([1, 2, 3].map((p) => chapters.filter((q) => q.part === p).length), [10, 10, 10]);
  // Without the preview it is hidden, as players have it.
  const shelf = Book.buildShelf(Book.SHELF, Book.CHAPTERS, false);
  assert.equal(shelf.find((b) => b.n === 4).last, null);
});

test('the data directory merges after Book Three, and the browser build bundles it', () => {
  const os = require('node:os'), fs = require('node:fs'), path = require('node:path');
  // The written chapters are read from the real files; fixtures stand in for the rest, in story order.
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/book-four/quests.json'), 'utf8'));
  assert.deepEqual(FX.WRITTEN, Object.keys(real).filter((k) => !k.startsWith('_')));
  assert.deepEqual(FX.WRITTEN, FX.IDS.slice(0, FX.WRITTEN.length), 'Chapters are written in story order.');
  for (const id of FX.IDS) assert.equal(/^Fixture/.test(QUESTS[id].name), !FX.WRITTEN.includes(id), id);
  const { buildPublic } = require('../scripts/build-public');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b4-build-'));
  try {
    const { html } = buildPublic(dir);
    for (const f of ['quests', 'scenes', 'side-jobs']) assert.ok(html.includes(JSON.stringify(`./data/book-four/${f}.json`)), `${f}.json is bundled`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('each chapter pays exactly one level: a straight run is level 40 + N after chapter N, 70 at the end', () => {
  let total = 0;
  for (const q of Book.CHAPTERS.filter((x) => x.book === 4)) { assert.equal(q.xp, P.levelBand(q.level), q.id); total += q.xp; }
  assert.equal(total, 461250); assert.equal(total, P.XP_NEXT[69] - P.XP_NEXT[39]);
  const s = hero(40);
  FX.IDS.forEach((id, i) => { E.awardXp(s, QUESTS[id].xp, [], id); assert.equal(s.player.level, 41 + i, id); });
  assert.equal(s.player.level, 70);
});

test('chapter 1 needs the 3rd job: the board says why, and it cannot be started or completed without it', () => {
  const s = ready('b4-walker', { third: false });
  const c = card(s, 'b4-walker');
  assert.equal(c.available, false); assert.equal(c.canDepart, false);
  assert.equal(c.needs, 'Pass your 3rd job trial first.');
  // Below level 40 the trial is not offered yet, so the board says so.
  const young = ready('b4-walker', { level: 38, third: false });
  assert.equal(card(young, 'b4-walker').needs, 'Reach level 40 and pass your 3rd job trial first.');
  assert.equal(W.unlocked(s, QUESTS['b4-walker']), false);
  const r = E.resolveAction(s, { type: 'depart', questId: 'b4-walker' }, high);
  assert.equal(r.result.ok, false); assert.match(r.result.error, /Pass your 3rd job trial first/);
  assert.equal(W.completeQuest(s, 'b4-walker', [], api), false);
  assert.ok(!s.world.completed['b4-walker']);
  // The trial is what the board offers instead.
  assert.equal(E.buildView(s).world.director.trial.canRequest, true);
  s.player.progression.thirdJob = true;
  assert.equal(card(s, 'b4-walker').available, true); assert.equal(card(s, 'b4-walker').needs, undefined);
  assert.equal(act(s, { type: 'depart', questId: 'b4-walker' }).state.story.nodeId, 'q-b4-walker-start');
});

test('level floors: Book Three ends at 40, each Book Four part at 50, 60 and 70, after the chapter\'s own XP', () => {
  assert.equal(QUESTS['b3-firstbell'].levelFloor, 40);
  assert.equal(QUESTS['b4-walker'].levelFloor, undefined, 'Chapter 1 needs the 3rd job, so it needs no floor.');
  // A hero who entered Book Three's last chapter at 38.
  let s = ready('b3-firstbell', { level: 38 }); s.player.progression.thirdJob = false;
  const events = [];
  assert.equal(W.completeQuest(s, 'b3-firstbell', events, api), true);
  assert.equal(s.player.level, 40); assert.equal(s.player.xp, P.XP_NEXT[39]);
  const xp = events.filter((e) => e.type === 'xp').map((e) => e.text);
  assert.match(xp[0], /^The First Bell resolved: \+11500 XP\.$/); assert.match(xp[1], /carries you to level 40/);
  assert.deepEqual(events.filter((e) => e.type === 'level').map((e) => Number(e.text.match(/level (\d+)/)[1])), [39, 40]);
  // Several levels at once, each with its own level-up, in order.
  for (const [id, floor] of [['b4-peaks', 50], ['b4-northdoor', 60], ['b4-parting', 70]]) {
    s = ready(id, { level: floor - 7 }); const ev = [];
    W.completeQuest(s, id, ev, api);
    assert.equal(s.player.level, floor, id); assert.equal(s.player.xp, P.XP_NEXT[floor - 1], id);
    assert.deepEqual(ev.filter((e) => e.type === 'level').map((e) => Number(e.text.match(/level (\d+)/)[1])), Array.from({ length: 7 }, (_, i) => floor - 6 + i), id);
  }
  // It never lowers XP: a hero ahead keeps exactly what the chapter paid.
  s = ready('b4-peaks', { level: 51 }); const before = s.player.xp;
  W.completeQuest(s, 'b4-peaks', [], api);
  assert.equal(s.player.xp, before + QUESTS['b4-peaks'].xp);
  // Chapters without a floor leave a hero behind where the XP puts them.
  s = ready('b4-embassy', { level: 44 }); W.completeQuest(s, 'b4-embassy', [], api); assert.equal(s.player.level, 45);
});

test('bounties: never two levels past a chapter; past the books, only to the next job trial within the books\' last level', () => {
  // In a chapter, the cap is the chapter's level.
  let s = ready('b4-company', { level: 43 });
  assert.equal(Bounty.room(s), P.XP_NEXT[43] - 1 - s.player.xp);
  // An old save past the books on its own AI story, without the 3rd job: the
  // bounties stop at its trial, 40, though the books here reach 70.
  s = ready('b4-walker', { level: 38, third: false });
  s.story.flags[Book.FINISHED] = true; s.chronicle = { ...(s.chronicle || {}), arc: 'The hero\'s own road.' };
  assert.equal(Book.finished(s), true);
  assert.equal(Bounty.afterBooksLevel(s), 70);
  assert.equal(Bounty.bountyLevel(s), 40);
  assert.equal(Bounty.room(s), P.XP_NEXT[40] - 1 - s.player.xp);
  assert.equal(E.buildView(s).world.bounty.afterBooks, 40);
  s.player.progression.thirdJob = true;
  assert.equal(Bounty.bountyLevel(s), 70, 'With the 3rd job, the next trial is the 4th at 70.');
  s.player.progression.fourthJob = true;
  assert.equal(Bounty.bountyLevel(s), 70, 'Past both trials, the books\' last level.');
});

test('the 4th trial is framed by Book Four\'s epilogue and the 3rd by Book Three\'s, offline and in the AI brief', () => {
  const s = ready('b4-walker', { level: 70, flags: { b4_done: true } });
  for (const q of Book.CHAPTERS) s.world.completed[q.id] = { xp: 0, gold: 0 };
  const third = X.trialFraming(s, 'third'), fourth = X.trialFraming(s, 'fourth');
  assert.match(third, /^Dera: You gave this place/); assert.doesNotMatch(third, /Fixture/);
  assert.equal(fourth, `Dera: ${FX.FRAMING}`);
  assert.equal(X.trialFraming(s), third, 'The 3rd job is the default kind.');
  assert.ok(D.writtenTrial(s, 'fourth').opening.startsWith(`Dera: ${FX.FRAMING} `));
  assert.doesNotMatch(D.writtenTrial(s, 'fourth').opening, /You gave this place/);
  assert.match(D.writtenTrial(s, 'third').opening, /^Dera: You gave this place/);
  const view = E.buildView(s).world.director.trial;
  assert.equal(view.kind, 'fourth'); assert.equal(view.framing, `Dera: ${FX.FRAMING}`);
  assert.ok(JSON.parse(D.prompt(s, { trial: true })).trial.includes(FX.FRAMING));
  // Commissioned offline, the 4th trial opens with it.
  const out = D.commissionTrial(s, null, []);
  assert.equal(out.ok, true); assert.ok(s.director.quests[out.questId].opening.startsWith(`Dera: ${FX.FRAMING}`));
  // Before Book Four's epilogue the 4th trial has no framing at all.
  delete s.story.flags.b4_done; assert.equal(X.trialFraming(s, 'fourth'), '');
});

test('the 4th trial\'s XP is capped by the books, like AI XP', () => {
  // A trial on the board while the books still run (here a hero at the very
  // end of level 69, inside the last chapter) pays only what the chapter's level leaves.
  let s = ready('b4-parting', { level: 70 });
  let out = D.commissionTrial(s, null, []);
  assert.equal(out.ok, true);
  const full = s.director.quests[out.questId].xp;
  s.player.xp = P.XP_NEXT[69] - 1; s.player.level = 69;
  assert.ok(full > 0); assert.equal(Book.running(s), true); assert.equal(Book.xpRoom(s), 0);
  assert.equal(W.completeQuest(s, out.questId, [], api), true);
  assert.equal(s.world.completed[out.questId].xp, 0); assert.equal(s.player.progression.fourthJob, true);
  // After the books it pays in full.
  s = ready('b4-parting', { level: 70 }); s.world.completed['b4-parting'] = { xp: 0, gold: 0 };
  out = D.commissionTrial(s, null, []); const xp = s.player.xp;
  W.completeQuest(s, out.questId, [], api);
  assert.equal(s.world.completed[out.questId].xp, full); assert.equal(s.player.xp - xp >= full, true);
});

test('Book Four gear waits for Book Four: a save that can play it sees no 41 to 70 stock or level bounty until it begins', () => {
  let s = ready('b4-walker', { level: 45 });
  assert.equal(Book.reads(s, 4), true);
  assert.equal(Book.started(s, 3), true); assert.equal(Book.started(s, 4), false);
  assert.equal(Book.gearOpen(s, 40), true, 'Level 40 is Book Three\'s gear.');
  assert.equal(Book.gearOpen(s, 45), false);
  const stock = TOWNS.highpass.stockByLevel;
  stock['45'] = ['fixture-b4-charm'];
  s.world.gearAwarded = { 'bounty:highpass:35': true };
  try {
    assert.ok(!W.townStock(s, 'highpass').includes('fixture-b4-charm'));
    assert.equal(Gear.bountyReward(s, 'highpass', 45, []), null);
    s.world.completed['b4-walker'] = { xp: 0, gold: 0 };
    assert.equal(Book.gearOpen(s, 45), true);
    assert.ok(W.townStock(s, 'highpass').includes('fixture-b4-charm'));
    assert.equal(Gear.bountyReward(s, 'highpass', 45, [])?.id, 'fixture-b4-charm');
  } finally { delete stock['45']; }
  // A save whose account cannot read Book Four (a Book Three grant) keeps
  // Book Three's rule: its 41 to 70 gear opens by level.
  s = ready('b4-records', { level: 60 }); Book.grant(s, 3);
  assert.equal(Book.reads(s, 4), false); assert.equal(Book.started(s, 4), false);
  assert.equal(Book.gearOpen(s, 45), true); assert.equal(Book.gearOpen(s, 70), true);
  // A save that finished Book Three and went on to its own AI story can read
  // Book Four but will never begin it: its 41 to 70 gear opens by level too.
  s = ready('b4-walker', { level: 45 });
  s.chronicle = { ...(s.chronicle || {}), arc: { title: 'Its own road' } };
  assert.equal(Book.reads(s, 4), true); assert.equal(Book.aiStory(s), true); assert.equal(Book.started(s, 4), false);
  assert.equal(Book.gearOpen(s, 45), true); assert.equal(Book.gearOpen(s, 70), true);
});

test('gear above level 70 keeps Book Three\'s rule, whether or not Book Four has begun', () => {
  const s = ready('b4-walker', { level: 75 });
  assert.equal(Book.reads(s, 4), true); assert.equal(Book.started(s, 4), false);
  assert.equal(Book.gearOpen(s, 70), false, 'Level 70 is still Book Four\'s.');
  assert.equal(Book.gearOpen(s, 71), true); assert.equal(Book.gearOpen(s, 100), true);
  const stock = TOWNS.highpass.stockByLevel;
  stock['75'] = ['fixture-b4-charm'];
  try {
    assert.ok(W.townStock(s, 'highpass').includes('fixture-b4-charm'), 'A fixture item at 75 is sold from 75.');
    s.player.level = 74; assert.ok(!W.townStock(s, 'highpass').includes('fixture-b4-charm'), 'Not before its level.');
  } finally { delete stock['75']; }
  // Before Book Three begins, nothing by level is open at any level.
  const fresh = hero(80); assert.equal(Book.gearOpen(fresh, 75), false);
});

test('walkouts: Book Three\'s Part Two and Book Four\'s Parts One and Three, in the same book only', () => {
  // The regression: walkoutsOn hard-coded Book Two, so Part Two's warnings never fired.
  assert.equal(Away.walkoutsOn(ready('b3-order'))?.id, 'b3-ashford');
  assert.equal(Away.walkoutsOn(ready('fenmere'))?.id, 'southroad', 'Book Two is unchanged.');
  assert.equal(Away.walkoutsOn(ready('b3-rite')), null, 'Book Three, Part One has none.');
  assert.equal(Away.walkoutsOn(ready('b3-firstbell')), null, 'Never from one book into the next.');
  for (const [id, next] of [['b4-walker', 'b4-records'], ['b4-company', 'b4-davin'], ['b4-knot', 'b4-invoice'], ['b4-ford', 'b4-hospice']]) assert.equal(Away.walkoutsOn(ready(id))?.id, next, id);
  for (const id of ['b4-peaks', 'b4-lantry', 'b4-orme', 'b4-northdoor']) assert.equal(Away.walkoutsOn(ready(id)), null, `${id}: none in the Wold, or across a part`);
  assert.ok(Away.walkouts(QUESTS['b4-parting']) && !Away.walkouts(QUESTS['b4-hush']));
  // Nobody walks out before their own chapter, or before the crossing.
  const ahead = (id, who) => { const s = ready(id); s.world.approvalWindow = { [who]: -2 }; return Away.uneasy(s, who); };
  assert.equal(ahead('b4-company', 'orin'), false, 'Orin stays for chapter 5.');
  assert.equal(ahead('b4-company', 'maren'), true);
  for (const who of ['orin', 'maren', 'nessa']) assert.equal(ahead('b4-embassy', who), false, `${who} stays for the crossing`);
});

test('a companion down on a Book Four chapter walks out for the next and is back after it', () => {
  let s = ready('b4-records');
  s = act(s, { type: 'depart', questId: 'b4-records' }).state;
  s = atEnd(s, 'b4-records'); s.world.approvalWindow = { maren: -1 };
  const warned = []; Away.count(s, 'maren', -1, warned);
  assert.ok(warned.some((e) => /Maren/.test(e.text) && /may leave/.test(e.text)), 'The warning fires in Book Four.');
  s = act(s, { type: 'story-choice', choiceId: QUESTS['b4-records'].decisions[0].id }).state;
  s = throughScenes(s);
  assert.equal(s.story.nodeId, 'away-maren-leave');
  s = act(s, { type: 'story-choice', choiceId: E.buildView(s).scene.choices[0].id }).state;
  assert.ok(!s.party.some((m) => m.id === 'maren'));
  assert.equal(s.world.away.maren.until, 'b4-ballad');
});

test('no walkout after chapters 9, 10 or 26: the companion stays and says so', () => {
  for (const [id, who, why] of [['b4-embassy', 'orin', 'the crossing'], ['b4-hospice', 'nessa', 'the last four chapters']]) {
    let s = ready(id); s.world.townId = QUESTS[id].town; s.story.nodeId = `town-${QUESTS[id].town}`;
    s = act(s, { type: 'depart', questId: id }).state;
    s = atEnd(s, id); s.world.approvalWindow = { [who]: -3 };
    s = act(s, { type: 'story-choice', choiceId: 'one' }).state;
    s = throughScenes(s);
    assert.equal(s.story.nodeId, `away-${who}-stay`, `${id}: ${why}`);
  }
  // After chapter 10 the next chapter is in the Wold: no walkout and no stay scene.
  let s = ready('b4-peaks'); s = act(s, { type: 'depart', questId: 'b4-peaks' }).state;
  s = atEnd(s, 'b4-peaks'); s.world.approvalWindow = { maren: -3 };
  s = throughScenes(act(s, { type: 'story-choice', choiceId: 'one' }).state);
  assert.ok(s.story.nodeId.startsWith('town-'), s.story.nodeId);
  assert.ok(s.party.some((m) => m.id === 'maren'));
});

test('the Wold is not offered to the AI storyteller until it holds reputation (build step 6)', () => {
  assert.deepEqual([...D.FACTIONS], ['wardens', 'trade', 'wilds']);
  assert.ok(Object.isFrozen(D.FACTIONS));
  assert.ok(!D.SCHEMA.properties.faction.enum.includes('wold'));
  // Every faction the AI may name holds reputation.
  const s = ready('b4-walker');
  for (const f of D.FACTIONS) assert.ok(f in s.world.reputation, f);
});

test('the ending counts four books in words, and a Book Three account is told Book Four is for paid accounts', () => {
  const s = ready('b4-walker', { level: 70 });
  for (const q of Book.CHAPTERS) s.world.completed[q.id] = { xp: 0, gold: 0 };
  s.player.progression.fourthJob = true;
  const end = Book.ending(s);
  assert.match(end, /you have finished all four books, The Bell Beneath Briarwatch, The Council of Small Voices, The Names in the Bronze and The Long Tally\./);
  assert.doesNotMatch(end, /all 4 books/);
  // A Book Three grant at the end of Book Three.
  const t = ready('b4-walker', { level: 40 }); Book.grant(t, 3);
  const paid = Book.ending(t);
  assert.match(paid, /You have finished all three books, .*The story goes on in Book Four, The Long Tally, for paid accounts/);
});

test('paid: a free account or a Book Three grant cannot open Book Four, and a lapsed save inside it is locked, never finished', () => {
  for (const n of [2, 3]) {
    const s = ready('b4-walker'); Book.grant(s, n);
    assert.equal(Book.playable(s, 'b4-walker'), false, `grant ${n}`);
    assert.ok(!E.buildView(s).world.quests.some((q) => q.id === 'b4-walker'));
    assert.equal(E.resolveAction(s, { type: 'depart', questId: 'b4-walker' }, high).result.ok, false);
  }
  const s = ready('b4-records'); Book.grant(s, 3);
  assert.equal(Book.locked(s), true); assert.equal(Book.finished(s), false);
  assert.equal(Book.chapter(s).id, 'locked'); assert.equal(Book.chapter(s).n, 4);
  assert.match(Book.chapter(s).name, /^The Long Tally: needs a paid account/);
  Book.grant(s, Infinity); assert.equal(Book.locked(s), false); assert.equal(Book.chapter(s).id, 'b4-records');
});

test('town pages follow a flag: Saltwick after its people moved, and a page can set its own services', () => {
  const s = ready('b3-wren'); s.world.townId = 'saltwick'; s.story.nodeId = 'town-saltwick';
  assert.equal(E.buildView(s).world.town.subtitle, 'The Town on Its Roofs');
  s.story.flags.b3_saltwick_moved = true;
  const v = E.buildView(s);
  assert.equal(v.world.town.subtitle, 'The Lamps Left Burning');
  assert.match(v.world.town.description, /^Saltwick is empty. Its people went over the ridge with you/);
  assert.equal(v.scene.location, 'The Lamps Left Burning');
  assert.match(v.scene.opening, /Mags comes back over the ridge every week with six of her lamplighters/); assert.doesNotMatch(v.scene.opening, /keeps a small market\.$/m);
  assert.ok(v.world.shop.length, 'The chandler\'s stall still opens on lamp nights.'); assert.equal(v.world.town.emptied, undefined);
  // A page with services of its own, and the first page set wins.
  TOWNS.highpass.pages = [{ flag: 'fixture_camp', subtitle: 'Fixture Camp', description: 'Fixture camp page.', services: ['inn', 'storage'] }, { flag: 'fixture_later', subtitle: 'Fixture Later' }];
  try {
    const h = ready('b4-walker'); h.story.flags.fixture_later = true;
    assert.equal(E.buildView(h).world.town.subtitle, 'Fixture Later');
    h.story.flags.fixture_camp = true;
    const town = E.buildView(h).world.town;
    assert.equal(town.subtitle, 'Fixture Camp'); assert.deepEqual(town.services, ['inn', 'storage']);
    assert.equal(W.emptied(h, 'highpass'), false);
  } finally { delete TOWNS.highpass.pages; }
  // Vell's emptied page still closes the town.
  const vell = ready('b3-company', { party: ['orin', 'maren'], flags: { b3_bell_evacuate: true } }); vell.world.townId = 'vell'; vell.story.nodeId = 'town-vell';
  assert.equal(W.emptied(vell, 'vell'), true); assert.equal(E.buildView(vell).world.town.subtitle, 'The Empty City');
});

test('the scripted player takes the written 3rd and 4th job trials offline, and plays Book Four between them', () => {
  const { run } = require('./campaign-playtest');
  const start = ready('b4-walker', { level: 40, third: false });
  const r = run('fighter', 'standard', 301, 'prepared', false, start);
  assert.deepEqual(r.errors, []);
  assert.equal(r.thirdJob, true); assert.equal(r.fourthJob, true); assert.equal(r.trials, 2);
  assert.ok(FX.IDS.every((id) => r.completed[id]), 'Every Book Four chapter is done.');
  // Chapter 1 starts partway into 40 (the 3rd trial pays half a level), so the 4th trial's half takes the hero into 71.
  assert.equal(r.complete, true); assert.equal(r.level, 71);
});
