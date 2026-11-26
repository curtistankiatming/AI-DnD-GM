'use strict';
// Tavern nights (src/data/tavern.json; Curtis, 26 November 2026: "have a
// tavern that players can visit during special occurrences during the story
// that they are able to recruit players should they have missing party
// members"; then "create a massive 100 character roster for the tavern.
// Selection features 2-3 a time", "Random selections").
//
// A night opens when the party finishes one of the chapters listed in the data
// (a turn in the story: the Oath of the Road, the Harbour Bell, the Second
// Oath...), a 3rd or 4th job trial, or the last written chapter. It stays open
// in that town until the party next sets out on an expedition, and the tavern
// only lets in a party with an empty place: fewer than MAX companions, a
// companion away for a chapter (src/away.js) still counting as one.
//
// Each night offers 2 or 3 people picked at random from the roster
// (src/roster.js), mixing kinds where it can. Hire one and the others move on;
// go in, leave them and set out, and they move on too. Nobody who has moved on
// is offered again. Declining Nessa keeps its cost (Curtis: "Keep that cost of
// the choice"): no night before the Oath of the Road, a fee per hero level, a
// little less fight than a story companion, no personal quest, and a hire
// never takes Nessa's place in the written story.
const DATA = require('./data/tavern.json');
const CHAPTERS = require('./data/tavern-chapters.json').chapters;
const Roster = require('./roster');

const MAX = 3;
const NIGHTS = Object.freeze(Object.fromEntries(Object.entries(DATA.nights).filter(([k, v]) => !k.startsWith('_') && v && Array.isArray(v.lines))));
const nodeId = (night) => `tavern-${night}`;
const fee = (state, id) => Math.max(0, Math.round((Roster.RECRUITS[id]?.fee || 0) * Math.max(1, Number(state?.player?.level) || 1)));
// How many places the party has filled: who is here, and who is away for a chapter.
const filled = (state) => (state.party || []).length + Object.keys(state.world?.away || {}).length;
const hasRoom = (state) => filled(state) < MAX;
const offer = (state) => (Array.isArray(state?.world?.tavern?.offer) ? state.world.tavern.offer : []);
const fill = (text, map) => String(text).replace(/\{(\w+)\}/g, (m, k) => (map[k] !== undefined ? map[k] : m));

// Builds one story node per night: the night's lines, each recruit's
// introduction (told only while they are offered), and the tavern's lines.
// Every recruit has a hire choice on every night; only tonight's offer shows
// (src/engine-view.js hides a choice whose tavernOffer is unmet).
// Called by src/expansion.js once the chapters exist, before lines compile.
function install({ QUESTS, STORY_NODES, TOWNS, choice }) {
  const t = DATA.tavern;
  const intros = Roster.IDS.flatMap((id) => Roster.RECRUITS[id].intro.map((l) => ({ ...l, when: { ...(l.when || {}), offered: id, tavernSeen: false } })));
  for (const [night, n] of Object.entries(NIGHTS)) {
    if (!['books', 'job'].includes(night) && !QUESTS[night]) throw new Error(`Tavern night ${night} names an unknown chapter`);
    if (n.town && !TOWNS[n.town]) throw new Error(`Tavern night ${night} names an unknown town ${n.town}`);
    const home = `town-${n.town || 'briarwatch'}`;
    const [opener, ...rest] = t.lines;
    STORY_NODES[nodeId(night)] = {
      id: nodeId(night), act: 'Tavern night', title: n.title, location: n.town ? `The inn's taproom, ${TOWNS[n.town].name}` : "The inn's taproom",
      objective: 'Your party has an empty place. Decide whether to hire someone to fill it.',
      lines: [...n.lines, opener, ...intros, ...rest], safeRest: true, sideStory: true, tavern: night,
      choices: [
        ...Roster.IDS.map((id) => { const r = Roster.RECRUITS[id];
          return choice(`hire-${id}`, `Hire ${r.name}`, { description: hireDescription(null, id), requires: { tavernOffer: id, hireFee: id }, result: { lines: [...r.hired, ...t.hiredAfter], hire: id, toTown: true, nextNode: home } }); }),
        choice('leave', t.leave.label, { once: false, description: t.leave.description, result: { lines: t.leave.lines, setFlags: { 'tavern:met': true }, toTown: true, nextNode: home } })
      ]
    };
  }
  // A hire's lines in the written chapters (src/data/tavern-chapters.json),
  // told in each chapter's aftermath after its first line, only with a hire.
  for (const [id, lines] of Object.entries(CHAPTERS)) {
    const node = STORY_NODES[`q-${id}-after`];
    if (!QUESTS[id] || !Array.isArray(node?.lines)) throw new Error(`Tavern chapter lines name an unknown chapter ${id}`);
    node.lines.splice(1, 0, ...lines.map((l) => ({ ...l, when: { ...(l.when || {}), hire: true } })));
  }
}

// Which night a finished chapter opens, if any: its own, a job trial's, or
// the books' end (booksDone: the last written chapter was just finished).
function nightFor(q, booksDone) {
  if (q?.id && NIGHTS[q.id] && !q.generated) return q.id;
  if (q?.trial === 'third' || q?.trial === 'fourth') return 'job';
  return booksDone ? 'books' : null;
}
// Who could be offered now: not moved on, not in the party, old enough for this stretch.
function pool(state) {
  const gone = new Set(state.world?.tavernGone || []), level = Number(state.player?.level) || 1;
  const here = new Set([...(state.party || []).map((m) => m.id), ...Object.keys(state.world?.away || {})]);
  return Roster.IDS.filter((id) => !gone.has(id) && !here.has(id) && Roster.RECRUITS[id].from <= level);
}
// 2 or 3 at random, of different kinds where the pool allows.
function pick(state, rng = Math.random) {
  const left = pool(state).slice();
  for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
  const want = Math.min(left.length, rng() < 0.5 ? 2 : 3), out = [];
  for (const id of left) { if (out.length >= want) break; if (!out.some((o) => Roster.RECRUITS[o].kind === Roster.RECRUITS[id].kind)) out.push(id); }
  for (const id of left) { if (out.length >= want) break; if (!out.includes(id)) out.push(id); }
  return out;
}
// Called by src/world.js completeQuest. A night is recorded even if the party
// is full now; whether the door opens is settled when it is shown.
function open(state, q, town, booksDone, rng = Math.random) {
  const night = nightFor(q, booksDone);
  if (!night) return null;
  close(state);
  state.world.tavern = { night, town: NIGHTS[night].town || town, offer: pick(state, rng), seen: false };
  return night;
}
// Setting out ends the night. Anyone the party met tonight and did not hire moves on.
function close(state) {
  const t = state.world?.tavern;
  if (t?.seen) state.world.tavernGone = [...new Set([...(state.world.tavernGone || []), ...offer(state).filter((id) => !state.party.some((m) => m.id === id))])];
  if (state.world) state.world.tavern = null;
}
function ensure(state, TOWNS) {
  const w = state.world;
  if (!w) return;
  w.tavernGone = Array.isArray(w.tavernGone) ? [...new Set(w.tavernGone.filter((id) => Roster.RECRUITS[id]))] : [];
  const t = w.tavern;
  if (!(t && typeof t === 'object' && NIGHTS[t.night] && TOWNS[t.town])) { w.tavern = null; return; }
  const kept = Array.isArray(t.offer) ? [...new Set(t.offer.filter((id) => Roster.RECRUITS[id] && !w.tavernGone.includes(id)))].slice(0, 3) : [];
  w.tavern = { night: t.night, town: t.town, offer: kept.length ? kept : pick(state), seen: Boolean(t.seen) };
}
// The night as the town page shows it, or null when the door is shut.
function view(state, here, TOWNS) {
  const t = state.world?.tavern;
  if (!t || !NIGHTS[t.night] || !hasRoom(state) || !offer(state).length) return null;
  return { night: t.night, title: NIGHTS[t.night].title, town: t.town, townName: TOWNS[t.town]?.name || t.town, here: here === t.town,
    hires: offer(state).map((id) => { const r = Roster.RECRUITS[id]; return { id, name: Roster.first(r), fullName: r.name, role: r.role, kind: Roster.KIND_WORD[r.kind], fee: fee(state, id) }; }) };
}
// Whether the party may go in now (src/world.js, action "tavern").
function canVisit(state, here) {
  const t = state.world?.tavern;
  if (!t || !NIGHTS[t.night] || !offer(state).length) return { ok: false, error: 'The tavern has nothing for you tonight. It opens at turns in the story.' };
  if (!hasRoom(state)) return { ok: false, error: 'Your party has no empty place to fill.' };
  if (here !== t.town) return { ok: false, error: 'Travel back to the town where the night is being held.' };
  return { ok: true, node: nodeId(t.night) };
}
// Marks tonight's people as met, once their introductions have been told.
function seen(state) { if (state.world?.tavern) state.world.tavern.seen = true; }
// The choice's requirements (src/engine.js requirementStatus): who is here
// tonight (an unmet one hides the choice), and the fee (shown, but locked).
function offerStatus(state, id) {
  return offer(state).includes(id) ? { met: true, reason: '' } : { met: false, reason: 'They are not here tonight.' };
}
function feeStatus(state, id) {
  if (!Roster.RECRUITS[id]) return { met: false, reason: 'Nobody by that name is here.' };
  if (!hasRoom(state)) return { met: false, reason: 'Your party has no empty place to fill.' };
  const cost = fee(state, id);
  return state.player.gold < cost ? { met: false, reason: `Requires ${cost} gold for the fee.` } : { met: true, reason: '' };
}
// Hires someone (a choice's "hire" outcome): pays the fee, and the place is filled.
function hire(state, id, events, recruit) {
  if (!offerStatus(state, id).met || !feeStatus(state, id).met) return false;
  const cost = fee(state, id);
  if (!recruit(state, id, events)) return false;
  state.player.gold -= cost;
  events.push({ type: 'loot', tone: 'neutral', text: `Paid ${cost} gold: the fee.` });
  state.story.flags['tavern:hired'] = id;
  state.story.flags['tavern:met'] = true;
  seen(state); close(state);
  return true;
}
// What the AI and the Journal are told about a hire (src/expansion.js standing).
function standing(state, who) {
  const r = Roster.RECRUITS[who];
  return r && state.party?.some((m) => m.id === who) ? [`${r.name} was hired at a tavern for a fee, not sworn to the cause: ${r.summary.charAt(0).toLowerCase()}${r.summary.slice(1)}`] : [];
}

// A hire card's words: the kind of fighter and the fee in gold at the hero's
// level now (the whats-next row shows the same total), then the rate.
function hireDescription(state, id) {
  const r = Roster.RECRUITS[id];
  const total = state ? fee(state, id) : r.fee;
  return fill(DATA.tavern.hireDescription, { kindWord: Roster.KIND_WORD[r.kind] || r.kind, role: r.role, roleLower: r.role.toLowerCase(), summary: r.summary, fee: r.fee, total });
}

module.exports = { hireDescription, CHAPTERS, MAX, NIGHTS, nodeId, fee, filled, hasRoom, offer, install, nightFor, pool, pick, open, close, ensure, view, canVisit, seen, offerStatus, feeStatus, hire, standing };
