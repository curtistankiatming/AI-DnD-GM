'use strict';
// Book Four, Part Two groundwork (docs/book-four/DESIGN.md, build step 6):
// Lantry and Orme, the 45 to 70 shop stock on the story's route, warm gear,
// the white, the Wold's reputation and the Telling. Every part is previewed,
// with fixture chapters for the ones not written yet (tests/fixtures/book-four.js).
// node --test runs each file in its own process, so neither the fixtures nor
// the preview reach any other file. Nothing here calls the paid API.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const D = require('../src/director'), Gear = require('../src/gear'), Combat = require('../src/combat'), J = require('../src/journal');
const Telling = require('../src/telling'), Bounty = require('../src/bounty'), R = require('../src/rules');
const { QUESTS, TOWNS } = require('../src/expansion');
const { ITEMS, COMPANIONS, CLASSES } = require('../src/content');
const GEAR = require('../src/data/gear.json');
const high = () => .999999;

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
const api = { awardXp: E.awardXp, addItem: require('../src/engine-core').addItem, enterNode: E.enterNode, startCombat: Combat.startCombat };
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)} at ${s.story.nodeId}: ${r.result.error}`); return r; }
// A hero in the town where a chapter starts, every chapter before it done,
// with only the towns the story has reached so far (each chapter's nextTown).
function ready(id, { level = QUESTS[id].level, classId = 'fighter', party = ['orin', 'maren', 'nessa'] } = {}) {
  const q = QUESTS[id];
  let s = E.createNewGame({ name: 'Rowan', classId });
  if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: CLASSES[classId] && P.JOBS[classId].branches[0].id, thirdJob: true });
  s.player.gold = 5000; s.world.completed.bell = { xp: 0, gold: 0 };
  const reached = new Set(FREE_TOWNS);
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; if (other.nextTown) reached.add(other.nextTown); }
  s.world.unlockedTowns = [...reached]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true, b3_promise_old: true, b3_gave_forge: true }); W.init(s);
  if (party.includes('nessa')) s = act(s, { type: 'recruit' }).state;
  s.party = s.party.filter((m) => party.includes(m.id));
  return s;
}
const finish = (s, id, choice = 0) => {
  const q = QUESTS[id], d = q.decisions[choice];
  s.world.activeQuest = id; s.world.onExpedition = true; s.story.flags[`method:${id}`] = 'peace'; s.story.flags[d.flag] = true;
  if (d.rep) W.reputation(s, d.rep);
  assert.equal(W.completeQuest(s, id, [], api), true, id);
  return s;
};
const fight = (s, id) => { s.world.activeQuest = id; s.world.onExpedition = true; s.story.nodeId = `q-${id}-crisis`; const events = []; assert.equal(Combat.startCombat(s, `quest:${id}`, R.createSeededRng(7), events), true); return events; };
const member = (s, id) => s.combat.actors.find((a) => a.id === id || a.refId === id);
const slowed = (a) => a.conditions.some((c) => c.id === 'slowed' && c.white);

const WARM = GEAR.filter((i) => i.warm);
const lv = (i) => i.requires?.level || 0;

test('Lantry and Orme are Book Four\'s towns of the Wold, with shops, boards and pages, reached from Highpass', () => {
  for (const id of ['lantry', 'orme']) {
    const t = TOWNS[id];
    assert.equal(t.faction, 'wold'); assert.equal(t.book, 4); assert.equal(t.from, 'highpass');
    assert.ok(t.services.includes('supplies') && t.services.includes('guild') && t.services.includes('inn'));
    assert.ok(t.subtitle && t.description && t.rumor);
    assert.ok(t.stock.every((i) => ITEMS[i] && !ITEMS[i].slot), `${id} sells supplies in its base stock, gear by level`);
    assert.ok(Object.keys(t.stockByLevel).every((l) => Number(l) >= 50 && Number(l) <= 59));
  }
  // The design's town table, in the fixture and written chapters.
  assert.deepEqual([QUESTS['b4-lantry'].town, QUESTS['b4-lantry'].nextTown], ['highpass', 'lantry']);
  assert.deepEqual([QUESTS['b4-sheddon'].town, QUESTS['b4-sheddon'].nextTown], ['lantry', 'orme']);
  assert.equal(QUESTS['b4-northdoor'].nextTown, 'highpass');
});

test('chapter 11 is taken from Highpass\'s board, and finishing it opens Lantry: on the map, for travel and for its shop', () => {
  let s = ready('b4-lantry');
  assert.equal(Book.townOpen(s, 'lantry'), true, 'Part Two is playable here.');
  let view = E.buildView(s);
  assert.ok(!view.world.towns.some((t) => t.id === 'lantry'), 'Not before chapter 11 is done.');
  assert.ok(view.world.quests.some((q) => q.id === 'b4-lantry' && q.town === 'highpass' && q.canDepart));
  assert.ok(!('wold' in view.world.reputation));
  s = finish(s, 'b4-lantry');
  assert.ok(s.world.unlockedTowns.includes('lantry')); assert.equal(s.world.townId, 'lantry');
  s.story.nodeId = 'town-lantry';
  view = E.buildView(s);
  assert.ok(view.world.towns.some((t) => t.id === 'lantry' && t.current));
  assert.equal(view.world.town.name, 'Lantry');
  assert.ok(view.world.shop.some((x) => x.id === 'door-chalk-mittens'), 'Lantry sells warm gear from level 51');
  assert.ok(view.world.quests.some((q) => q.id === 'b4-sheddon' && q.canDepart), 'Chapter 12 leaves from Lantry');
  assert.equal(view.world.reputation.wold, 0, 'The Wold\'s reputation is shown once the party is there');
  // Travel back over the north road and down again, between chapters.
  s = act(s, { type: 'travel-town', townId: 'highpass' }).state;
  s = act(s, { type: 'travel-town', townId: 'lantry' }).state;
  assert.equal(s.world.townId, 'lantry');
  // A bounty there is fought on Lantry's own board.
  const b = Bounty.view(s);
  assert.ok(b && /white beyond the doors/.test(JSON.stringify(b)), JSON.stringify(b));
});

test('the white: a Part Two deciding fight starts with everyone not wearing warm gear Slowed for one round, and says why', () => {
  const s = ready('b4-sheddon');
  E.addItem(s, 'fleece-lined-scale', 1, []);
  const after = act(s, { type: 'equip', itemId: 'fleece-lined-scale', actorId: 'orin' }).state;
  assert.equal(Gear.warmItem(after.party.find((m) => m.id === 'orin'))?.id, 'fleece-lined-scale');
  const events = fight(after, 'b4-sheddon');
  assert.ok(!slowed(member(after, 'orin')), 'Orin is warm');
  for (const id of ['player', 'maren', 'nessa']) {
    const a = member(after, id), c = a.conditions.find((x) => x.white);
    assert.ok(c && c.id === 'slowed' && c.expiresRound === 2 && /no warm gear/.test(c.name), id);
  }
  const text = events.map((e) => e.text).join('\n');
  assert.match(text, /The white comes down cold\. You, Sister Maren Vale and Nessa Reed are Slowed for the first round \(2 less armour\): no warm gear\./);
  assert.match(E.buildView(after).combat.white, /Slowed for the first round/);
  assert.ok(JSON.stringify(after.logs).includes('The white comes down cold'), 'In the fight log');
});

test('the white is only in chapters with "white": true, and never in bounties; with everyone warm nobody is slowed', () => {
  // Part One's last chapter and Part Three's first are not white.
  for (const id of ['b4-peaks', 'b4-knot']) {
    assert.ok(!QUESTS[id].white, id);
    const s = ready(id); fight(s, id);
    assert.ok(!s.combat.actors.some(slowed), id);
  }
  // Every Part Two chapter is white.
  for (const q of Object.values(QUESTS).filter((x) => x.book === 4 && x.part === 2)) assert.equal(q.white, true, q.id);
  // A bounty in Lantry is not a deciding fight.
  let s = finish(ready('b4-lantry'), 'b4-lantry'); s.story.nodeId = 'town-lantry';
  s = act(s, { type: 'bounty' }).state;
  assert.ok(s.combat?.active && !s.combat.actors.some(slowed));
  // Everyone warm.
  s = ready('b4-orme');
  for (const [item, who] of [['whitewool-plate', null], ['fleece-lined-scale', 'orin'], ['door-chalk-mittens', 'maren'], ['whitewool-jerkin', 'nessa']]) {
    E.addItem(s, item, 1, []); s = act(s, { type: 'equip', itemId: item, ...(who ? { actorId: who } : {}) }).state;
  }
  const events = fight(s, 'b4-orme');
  assert.ok(!s.combat.actors.some(slowed));
  assert.match(events.map((e) => e.text).join('\n'), /everyone is wrapped in warm Wold wool: nobody is slowed/);
});

test('the white\'s Slowed lasts one round: it is gone by the party\'s second turn', () => {
  let s = ready('b4-lantry');
  fight(s, 'b4-lantry');
  assert.ok(slowed(member(s, 'player')));
  for (let n = 0; n < 40 && s.combat?.active && s.combat.round < 2; n++) {
    const v = E.buildView(s).combat; const a = v.actions.find((x) => !x.disabled && x.id === 'defend') || v.actions.find((x) => x.id === 'end-turn');
    s = E.resolveAction(s, { type: 'combat', actionId: a.id, ...(a.targets?.length ? { targetId: a.targets[0].id } : {}) }, R.createSeededRng(n)).state;
  }
  for (let n = 0; n < 40 && s.combat?.active && !(s.combat.round >= 2 && s.combat.awaitingPlayer); n++) {
    const v = E.buildView(s).combat; const a = v.actions.find((x) => !x.disabled && x.id === 'defend') || v.actions.find((x) => x.id === 'end-turn');
    s = E.resolveAction(s, { type: 'combat', actionId: a.id, ...(a.targets?.length ? { targetId: a.targets[0].id } : {}) }, R.createSeededRng(100 + n)).state;
  }
  assert.ok(s.combat?.active, 'Still fighting in round 2'); {
    assert.ok(s.combat.round >= 2);
    assert.ok(!slowed(member(s, 'player')), 'The hero is no longer Slowed in round 2');
    assert.equal(E.buildView(s).combat.white, null, 'The note is shown in round 1 only');
  }
});

test('warm items are tier gear: Legendary, at 50 or 55, each as strong as the best normal piece of its kind, and on the cards', () => {
  assert.ok(WARM.length >= 6);
  const sold = GEAR.filter((i) => !i.exclusive && !i.warm && i.slot);
  const pct = (i) => Math.round(((i.stats?.dealt || 0) - (i.stats?.taken || 0)) * 20);
  const armour = (i) => pct(i) + i.armor.base;
  const weight = (i) => i.armor.dexCap === 0 ? 'heavy' : i.armor.dexCap === null ? 'light' : 'medium';
  for (const w of WARM) {
    assert.equal(w.rarity, 'Legendary', w.id); assert.ok([50, 55].includes(lv(w)), w.id);
    assert.ok(!w.exclusive && !w.set, `${w.id} is sold, in no set`);
    assert.ok(w.value >= Gear.minValue(w), w.id);
    for (const n of Object.values(w.requires.abilities || {})) assert.ok(n <= 15, w.id);
    assert.match(Gear.purpose(w), /Warm: in the Wold's white, the wearer is not Slowed at the start of a deciding fight\./);
    const peers = sold.filter((i) => i.slot === w.slot && lv(i) >= 41 && lv(i) <= lv(w) && (!w.armor || (i.armor && weight(i) === weight(w))));
    assert.ok(peers.length, `${w.id} has peers`);
    if (w.armor) assert.equal(armour(w), Math.max(...peers.map(armour)), `${w.id}: as good as the best ${weight(w)} armour of its tier, no better`);
    else {
      assert.ok((w.stats?.dealt || 0) <= Math.max(...peers.map((i) => i.stats?.dealt || 0)), w.id);
      assert.ok((w.stats?.taken || 0) >= Math.min(...peers.map((i) => i.stats?.taken || 0)), w.id);
      assert.ok((w.acBonus || 0) <= Math.max(...peers.map((i) => i.acBonus || 0)), w.id);
    }
  }
  // Warmth is never a tax: at 55 the warm muffler matches the best damage accessory,
  // and every armour weight has a warm piece as good as the best of its tier.
  const accessories = (at, warm) => sold.concat(WARM).filter((i) => i.slot === 'accessory' && Boolean(i.warm) === warm && lv(i) <= at && lv(i) >= 41);
  assert.equal(Math.max(...accessories(55, true).map((i) => i.stats?.dealt || 0)), Math.max(...accessories(55, false).map((i) => i.stats?.dealt || 0)));
  assert.equal(Math.min(...accessories(55, true).map((i) => i.stats?.taken || 0)), Math.min(...accessories(55, false).map((i) => i.stats?.taken || 0)));
  for (const wt of ['heavy', 'medium', 'light']) assert.ok(WARM.some((i) => i.armor && weight(i) === wt && lv(i) === 50), wt);
});

test('every class and companion has a warm piece to wear at each tier from 50 to 59, sold in Lantry and Orme', () => {
  const missing = [];
  for (const t of [50, 55]) {
    const wearable = (actor) => WARM.filter((i) => lv(i) <= t && Gear.unmet({ ...actor, level: t }, i) === null);
    for (const c of Object.keys(CLASSES)) { const s = ready('b4-lantry', { classId: c, level: 50 }); if (!wearable(s.player).length) missing.push(`${c} at ${t}`); }
    for (const m of Object.values(COMPANIONS).filter((x) => x.gearClass)) if (!wearable(m).length) missing.push(`${m.id} at ${t}`);
  }
  assert.deepEqual(missing, []);
  // At 55 a new warm piece arrives for everyone.
  for (const c of Object.keys(CLASSES)) { const s = ready('b4-lantry', { classId: c, level: 55 }); assert.ok(WARM.some((i) => lv(i) === 55 && Gear.unmet(s.player, i) === null), c); }
  for (const w of WARM) {
    const sellers = Object.values(TOWNS).filter((t) => Object.values(t.stockByLevel || {}).flat().includes(w.id)).map((t) => t.id);
    assert.deepEqual(sellers.sort(), lv(w) === 50 ? ['lantry', 'orme'] : ['orme'], w.id);
  }
});

// The story's route: where the hero is at each level from 45 to 70, read from
// the chapters (the written ones and the design's fixtures). At level L the
// party is in the town the chapter of level L-1 ended in, and departs for the
// chapter of level L from its town. Vell can be emptied, so it does not count.
function routeAt(L) {
  const chapters = Object.values(QUESTS).filter((q) => q.book === 4 && !q.sideJob);
  const before = chapters.find((q) => q.level === L - 1), now = chapters.find((q) => q.level === L);
  return [...new Set([before && (before.nextTown || before.town), now?.town].filter((t) => t && t !== 'vell'))];
}
test('every 45 to 70 tier is on sale on the story\'s route at the level the hero reaches it, without going back', () => {
  assert.deepEqual(routeAt(45), ['highpass']); assert.deepEqual(routeAt(50), ['highpass']);
  assert.deepEqual(routeAt(51), ['lantry']); assert.deepEqual(routeAt(55), ['orme']);
  assert.deepEqual(routeAt(60), ['highpass']); assert.deepEqual(routeAt(65), ['merrowgate']);
  assert.deepEqual(routeAt(70), ['briarwatch']);
  const sold = GEAR.filter((i) => !i.exclusive && i.slot && lv(i) >= 45 && lv(i) <= 70);
  const missing = [];
  for (const item of sold) {
    // Warm gear is Lantry's and Orme's: Lantry opens after chapter 11, a level after 50.
    const at = item.warm && lv(item) === 50 ? 51 : lv(item);
    const s = ready(Object.values(QUESTS).find((q) => q.book === 4 && q.level === Math.min(69, at))?.id || 'b4-parting', { level: at });
    s.world.completed['b4-walker'] ||= { xp: 0, gold: 0 };
    if (!routeAt(at).some((town) => s.world.unlockedTowns.includes(town) && W.townStock(s, town).includes(item.id))) missing.push(`${item.id} (level ${lv(item)}) at ${at} in ${routeAt(at)}`);
  }
  assert.deepEqual(missing, []);
  // Highpass keeps 45, 50 and 60; Briarwatch keeps 70 for the trial; 55 is Orme's, 65 Merrowgate's and Cinder Fold's.
  assert.deepEqual(Object.keys(TOWNS.highpass.stockByLevel).filter((l) => l >= 45 && l <= 70), ['45', '50', '60']);
  assert.deepEqual(Object.keys(TOWNS.briarwatch.stockByLevel).filter((l) => l >= 45 && l <= 70), ['70']);
  // A save playing Book Four buys the Wold's stock in the Wold, not at Highpass.
  const s = ready('b4-reckoning');
  assert.ok(W.townStock(s, 'orme').includes('lamplit-staff') && !W.townStock(s, 'highpass').includes('lamplit-staff'));
  assert.ok(!W.townStock(s, 'highpass').includes('long-hall-muffler'));
});

test('the Wold\'s reputation: chapter decisions move it, it sets Lantry\'s and Orme\'s prices, and the Journal shows it', () => {
  let s = finish(ready('b4-lantry'), 'b4-lantry');
  s.story.nodeId = 'town-lantry';
  const full = W.price(s, 'door-chalk-mittens');
  assert.equal(full, ITEMS['door-chalk-mittens'].value);
  let wold = J.sync(s).relationships.find((r) => r.id === 'faction:wold');
  assert.ok(wold && wold.value === 0 && wold.status === 'unknown');
  W.reputation(s, { wold: 10 });
  assert.equal(s.world.reputation.wold, 10);
  assert.ok(W.price(s, 'door-chalk-mittens') < full, 'Giving earns the Wold\'s prices');
  wold = J.sync(s).relationships.find((r) => r.id === 'faction:wold');
  assert.equal(wold.status, 'trusted'); assert.equal(wold.value, 10);
  // A decision's "rep" moves it through the story choice itself.
  // (Chapters install their decisions on load; a fixture's "rep" is set on its installed choice.)
  const { STORY_NODES } = require('../src/content');
  STORY_NODES['q-b4-sheddon-after'].choices[0].result.reputation = { wold: 2 };
  s = ready('b4-sheddon'); s.story.nodeId = 'q-b4-sheddon-after'; s.world.activeQuest = 'b4-sheddon'; s.world.onExpedition = true; s.story.flags['method:b4-sheddon'] = 'peace';
  s = act(s, { type: 'story-choice', choiceId: STORY_NODES['q-b4-sheddon-after'].choices[0].id }).state;
  assert.equal(s.world.reputation.wold, 2);
  assert.ok(D.prompt(s).includes('"wold":2'), 'The AI storyteller sees it once known');
});

test('the Telling: each finished chapter\'s song and tally lines in the Journal, side by side, until a keeper is chosen', () => {
  let s = ready('b4-records');
  const entry = J.sync(s).telling.find((x) => x.id === 'told:b4-walker');
  assert.ok(entry, 'Chapter 1 is told');
  assert.equal(entry.ballad, QUESTS['b4-walker'].told.ballad); assert.equal(entry.tally, QUESTS['b4-walker'].told.tally);
  assert.equal(entry.title, QUESTS['b4-walker'].name);
  // In story order, one per finished chapter that has a told line.
  const ids = J.sync(s).telling.map((x) => x.id);
  assert.deepEqual(ids, Object.values(QUESTS).filter((q) => q.told && s.world.completed[q.id]).map((q) => `told:${q.id}`));
  // A decision's own told line wins over the chapter's when it was chosen.
  QUESTS['b4-lantry'].told = { ballad: 'Fixture song.', tally: 'Fixture tally.' };
  QUESTS['b4-lantry'].decisions[1].told = { ballad: 'Fixture song two.', tally: 'Fixture tally two.' };
  s = finish(ready('b4-lantry'), 'b4-lantry', 1);
  assert.equal(J.sync(s).telling.find((x) => x.id === 'told:b4-lantry').ballad, 'Fixture song two.');
  s = finish(ready('b4-lantry'), 'b4-lantry', 0);
  assert.equal(J.sync(s).telling.find((x) => x.id === 'told:b4-lantry').tally, 'Fixture tally.');
  // While the books run the AI is not given the legend; the Journal does not send it either.
  assert.ok(!('legend' in JSON.parse(D.prompt(s))));
  assert.doesNotMatch(JSON.stringify(J.forPrompt(s, 99999)), /Fixture tally/);
  // After the epilogue only the keeper's version goes on.
  s.story.flags.fourth_telling = 'ballad';
  assert.ok(J.sync(s).telling.every((x) => x.ballad && !x.tally));
  s.story.flags.fourth_telling = 'tally';
  assert.ok(J.sync(s).telling.every((x) => x.tally && !x.ballad));
  assert.equal(Telling.legend(s).keeper, 'tally');
  assert.equal(Telling.legend(s).lines.at(-1).told, 'Fixture tally.');
  s.story.flags.fourth_telling = 'none';
  assert.deepEqual(J.sync(s).telling, []);
  assert.deepEqual(Telling.legend(s), { keeper: 'none', text: Telling.UNTOLD, lines: [] });
});

test('after the books the AI storyteller is given the hero\'s legend by its keeper', () => {
  const s = ready('b4-parting', { level: 70 });
  for (const q of Book.CHAPTERS) s.world.completed[q.id] = { xp: 0, gold: 0 };
  Object.assign(s.story.flags, { b4_done: true, fourth_telling: 'ballad' });
  assert.equal(Book.running(s), false);
  const legend = JSON.parse(D.prompt(s)).legend;
  assert.equal(legend.keeper, 'ballad');
  assert.ok(legend.lines.length > 0 && legend.lines.length <= 12);
  assert.ok(legend.lines.some((x) => x.told === QUESTS['b4-peaks'].told.ballad));
  s.story.flags.fourth_telling = 'none';
  assert.deepEqual(JSON.parse(D.prompt(s)).legend, { keeper: 'none', text: Telling.UNTOLD, lines: [] });
});

test('Book Four stays hidden', () => {
  assert.equal(Book.SHELF.find((b) => b.n === 4).out, 0);
  assert.ok(FX.IDS.includes('b4-lantry'));
});

test('the AI\'s draft schema offers the Wold only once the party has met it', () => {
  const enums = (schema) => { const p = schema.properties, d = p.decisions.items.properties; return [p.faction.enum, d.favors.enum, d.also.enum]; };
  const s = ready('b4-lantry');
  for (const list of enums(D.schema(s))) assert.ok(!list.includes('wold') && list.includes('wardens'), JSON.stringify(list));
  assert.ok(!JSON.stringify(D.schema(s)).includes('"wold"'));
  const met = finish(ready('b4-lantry'), 'b4-lantry');
  for (const list of enums(D.schema(met))) assert.ok(list.includes('wold'));
  assert.deepEqual(D.schema(met), D.SCHEMA);
});

test('before chapter 11 Highpass sells no warm gear, so the first Wold fight is cold', () => {
  const s = ready('b4-lantry');
  assert.ok(!W.townStock(s, 'highpass').some((id) => ITEMS[id].warm));
  fight(s, 'b4-lantry');
  assert.ok(s.combat.actors.filter((a) => a.team === 'party').every(slowed));
});

test('a shop drops level gear it no longer sells: stand-in stock goes once the save can reach the Wold', () => {
  let s = ready('b4-reckoning');
  Book.grant(s, 3); // an account that cannot read Book Four: Highpass stands in for Orme
  assert.equal(Book.ownsGear(s, 4), false);
  s.story.nodeId = 'town-highpass'; s.world.townId = 'highpass';
  assert.ok(E.buildView(s).world.shop.some((x) => x.id === 'lamplit-staff'));
  assert.ok('lamplit-staff' in s.world.stock.highpass);
  Book.grant(s, undefined); // the account upgrades
  assert.equal(Book.ownsGear(s, 4), true);
  assert.ok(!E.buildView(s).world.shop.some((x) => x.id === 'lamplit-staff'), 'Gone from Highpass');
  assert.ok(!('lamplit-staff' in s.world.stock.highpass));
  // Loading the save again keeps it gone, and the town's own stock stays.
  W.init(s); E.buildView(s);
  assert.ok(!('lamplit-staff' in s.world.stock.highpass));
  for (const id of TOWNS.highpass.stock) assert.ok(id in s.world.stock.highpass, id);
});
