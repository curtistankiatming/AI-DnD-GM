'use strict';
// Book Four's release pass (build step 12 of docs/book-four/DESIGN.md): the
// recap card on Book Four's first screen, read from Book Three's flags, and the
// caps on damage dealt and taken on item cards and the sheet's totals. The full
// playtest to the legendary trial is tests/campaign-playtest.js.
const FX = require('./fixtures/book-four').install({ BRIARWATCH_PREVIEW_BOOKS: '1', BRIARWATCH_PREVIEW_PARTS: null });
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Gear = require('../src/gear'), G = require('../src/equipment');
const { ITEMS } = require('../src/content');
const { QUESTS } = require('../src/expansion');
const high = () => .999999;

const FREE_TOWNS = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold', 'saltwick', 'vell'];
function act(s, a) { const r = E.resolveAction(s, a, high); assert.equal(r.result.ok, true, `${JSON.stringify(a)}: ${r.result.error}`); return r; }
// A hero at the start of Book Four: Book Three done, with these flags, and this party.
function start(flags, party = ['orin', 'maren', 'nessa']) {
  const q = QUESTS['b4-walker'];
  let s = E.createNewGame({ name: 'Rowan', classId: 'fighter' }); E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'test fixture');
  Object.assign(s.player.progression, { mastery: true, specialization: 'guardian', thirdJob: true }); s.player.gold = 1000; s.world.completed.bell = { xp: 0, gold: 0 };
  const reached = new Set(FREE_TOWNS);
  for (const other of Object.values(QUESTS)) { if (other.id === q.id) break; if (other.sideJob) continue; s.world.completed[other.id] = { xp: 0, gold: 0 }; if (other.nextTown) reached.add(other.nextTown); }
  s.world.unlockedTowns = [...reached];
  Object.assign(s.story.flags, { b3_partone_done: true, b3_done: true }, flags); W.init(s);
  s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass'; s = act(s, { type: 'recruit' }).state;
  s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  s.party = s.party.filter((m) => party.includes(m.id));
  return s;
}
const recap = (s) => E.buildView(s).world.bookRecap;

test('the recap card on Book Four\'s first screen reads Book Three\'s ending, the gift, Aster, Hesk and each companion', () => {
  let r = recap(start({ b3_promise_old: true, b3_gave_forge: true, wards_seat: true, b3_mags_forgives: true, b3_seal_taken: true, nessa_keeper: 'later', b3_wren_cast: true }));
  assert.equal(r.title, 'Where Book Three left you');
  assert.deepEqual(r.lines, [
    'Under the stair, the free wards give one memory each, one person at a time, and their giving holds the lid. The nine have rested.',
    "Your gift was Dera's forge. You do not remember it, and she showed you round it again.",
    "Aster Vey stayed in Briarwatch's bell for one more generation, to see Pim grow old.",
    'Hesk was judged at Highpass in the open, and is in a cell under its gatehouse.',
    'Orin went to Saltwick in the spring for the lamps, as Mags asked him.',
    'Maren is the seal: every week in Highpass she hears the people who come to give.',
    'Nessa has the forge-signal key on a cord round her neck, and said she would go back to Cinder Fold to keep it.'
  ]);
  r = recap(start({ b3_promise_hesk: true, b3_three_told: true, b3_bell_aster: true }));
  assert.match(r.lines[0], /some of the free wards, for a while/);
  assert.match(r.lines[1], /^Aster Vey is in Vell's great bell/);
  assert.match(r.lines[2], /free wards call him their hero/);
  assert.ok(!r.lines.some((l) => /gift/i.test(l)), 'no gift without the old promise');
  r = recap(start({ b3_stair_sealed: true, b3_maren_gives: true, nessa_keeper: 'declined' }));
  assert.match(r.lines[0], /The nine carry it alone/);
  assert.match(r.lines[1], /still in Briarwatch's bell/);
  assert.match(r.lines[2], /back down the stair alone, with a lamp/);
  assert.match(r.lines.join('\n'), /taught Pim knots[^]*a day she would have written first[^]*said no to the forge-signal/);
  // Nessa's line follows Wren's ending, and Orin's his trial (review of step 12).
  const nessa = (flags) => recap(start(flags, ['nessa'])).lines.at(-1);
  assert.equal(nessa({ b3_promise_old: true, nessa_keeper: 'later', b3_wren_waits: true }), 'In the spring Nessa went back over the pass to Cinder Fold, to take the forge-signal key from Wren.');
  assert.equal(nessa({ b3_promise_old: true, nessa_keeper: 'later' }), "Nessa said yes to the forge-signal. Wren keeps it from a chair, and Nessa's yes is held for her.");
  assert.equal(nessa({ b3_promise_old: true, b3_wren_cast: true }), 'Nessa writes about Wren, and sends it to Cinder Fold to be read out at the lid. She does not keep a copy.');
  assert.equal(recap(start({ b3_promise_old: true, b3_orin_tried: true }, ['orin'])).lines.at(-1), 'Orin asked to be tried at Saltwick, and was. He owes its roof council a season of lamps.');
  assert.equal(recap(start({ b3_promise_old: true })).lines[0], 'Under the stair, the free wards give one memory each, one person at a time. The nine stay, very tired.');
  r = recap(start({ b3_promise_old: true, b3_bell_aster: true, b3_gave_name: true }));
  assert.match(r.lines.join('\n'), /a name, and you did not say whose[^]*Aster Vey rested/);
  // Only the companions in the party, and never a line that names one who is not.
  r = recap(start({ b3_promise_old: true }, ['maren']));
  assert.doesNotMatch(r.lines.join('\n'), /Orin|Nessa/);
  assert.match(r.lines.at(-1), /^Maren keeps no list/);
  for (const line of r.lines) assert.doesNotMatch(line, /[{}@]/);
});

test('the recap is shown only before Book Four\'s first chapter begins', () => {
  let s = start({ b3_promise_old: true });
  assert.ok(recap(s));
  s = act(s, { type: 'depart', questId: 'b4-walker' }).state;
  assert.equal(recap(s), null, 'not once the chapter is under way');
  s = start({ b3_promise_old: true }); s.world.completed['b4-walker'] = { xp: 0, gold: 0 };
  assert.equal(recap(s), null, 'not after it');
  s = start({ b3_promise_old: true }); delete s.story.flags.b3_done;
  assert.equal(recap(s), null, 'not without Book Three finished');
});

test('item cards name the 50% cap on damage dealt, and the sheet totals worn gear with both caps', () => {
  const dealer = Object.values(ITEMS).find((i) => i.stats?.dealt > 0), taker = Object.values(ITEMS).find((i) => i.stats?.taken < 0);
  assert.match(Gear.describe(dealer).join(' '), /% more damage dealt \(all worn gear together deals at most 50% more\)/);
  assert.match(Gear.describe(taker).join(' '), /% less damage taken \(all worn gear together takes off at most 30%\)/);
  const s = start({});
  assert.equal(E.buildView(s).player.gearTotals, null, 'nothing to total in starting gear');
  // Totals as the sheet shows them, under the caps and over them.
  const fake = (dealt, taken) => { const a = { id: 'player', kind: 'player', equipment: {} }; const orig = Gear.stats; Gear.stats = () => ({ dealt, taken }); try { return G.gearTotals(a); } finally { Gear.stats = orig; } };
  assert.equal(fake(0.2, -0.1).text, 'Worn gear in all: 20% more damage dealt (worn gear deals at most 50% more); 10% less damage taken (worn gear takes off at most 30%).');
  assert.deepEqual([fake(0.7, -0.45).dealt, fake(0.7, -0.45).taken], [0.5, -0.3]);
  assert.equal(fake(0.7, -0.45).text, 'Worn gear in all: 50% more damage dealt (70% from worn gear, capped at 50%); 30% less damage taken (45% from worn gear, capped at 30%).');
});

test('the recap card, the Journal\'s columns and long tally lines fit a 360px phone', () => {
  const css = fs.readFileSync(path.join(__dirname, '../public/adventure.css'), 'utf8') + fs.readFileSync(path.join(__dirname, '../public/styles.css'), 'utf8');
  assert.match(css, /\.whats-next-recap \{[^}]*min-width:0;[^}]*overflow-wrap:anywhere;/);
  assert.match(css, /\.whats-next \{[^}]*min-width:0;/);
  // The Telling's two columns stack below 2 × 14rem, and long lines wrap.
  assert.match(css, /\.telling-columns \{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 14rem\), 1fr\)\)/);
  assert.match(css, /\.telling-column \{[^}]*min-width: 0;[^}]*overflow-wrap: anywhere;/);
  const js = fs.readFileSync(path.join(__dirname, '../public/whats-next.js'), 'utf8');
  assert.match(js, /if \(w\.bookRecap\)[^]*'whats-next-recap'[^]*w\.bookRecap\.lines/);
});

test('town shop cards carry the item\'s level, which a long shop on the Town tab sorts and folds by (UI review)', () => {
  const s = start({});
  const shop = E.buildView(s).world.shop;
  assert.ok(shop.length > 24, `Highpass at level 40 has a long shop (${shop.length})`);
  for (const item of shop) assert.equal(item.level, ITEMS[item.id].requires?.level || 1, item.id);
  assert.ok(shop.some((i) => i.level >= 35), 'late gear is in stock');
  const js = fs.readFileSync(path.join(__dirname, '../public/expedition.js'), 'utf8');
  assert.match(js, /function v4ShopGroups\(stock\)/);
  assert.match(js, /stock\.length<=24/, 'a short shop stays one list');
});
