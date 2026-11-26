'use strict';
// Tavern nights (src/data/tavern.json; Curtis, 26 November 2026: "have a
// tavern that players can visit during special occurrences during the story
// that they are able to recruit players should they have missing party
// members").
//
// A night opens when the party finishes one of the chapters listed in the data
// (a turn in the story: the Oath of the Road, the Harbour Bell, the Second
// Oath...), a 3rd or 4th job trial, or the last written chapter. It stays open
// in that town until the party next sets out on an expedition, and the tavern
// only lets in a party with an empty place: fewer than MAX companions, a
// companion away for a chapter (src/away.js) still counting as one.
//
// The party may hire one of two people there. Declining Nessa keeps its cost
// (Curtis, 26 November 2026: "Keep that cost of the choice"): there is no
// night before the Oath of the Road, a hire is paid for (fee per hero level),
// fights a little below a story companion, has no personal quest and never
// takes Nessa's place in the written story. Hiring one sends the other away for
// good: the place is full.
const DATA = require('./data/tavern.json');

const MAX = 3;
const NIGHTS = Object.freeze(Object.fromEntries(Object.entries(DATA.nights).filter(([k, v]) => !k.startsWith('_') && v && Array.isArray(v.lines))));
const HIRES = Object.freeze(Object.keys(DATA.tavern.hires));
const nodeId = (night) => `tavern-${night}`;
const fee = (state, id) => Math.max(0, Math.round((Number(DATA.fees[id]) || 0) * Math.max(1, Number(state?.player?.level) || 1)));
// How many places the party has filled: who is here, and who is away for a chapter.
const filled = (state) => (state.party || []).length + Object.keys(state.world?.away || {}).length;
const hasRoom = (state) => filled(state) < MAX;

// Builds one story node per night: the night's own lines, then the tavern's.
// Called by src/expansion.js once the chapters exist, before lines compile.
function install({ QUESTS, STORY_NODES, COMPANIONS, TOWNS, choice }) {
  for (const id of HIRES) if (!COMPANIONS[id]) throw new Error(`Tavern hire ${id} is not in companions.json`);
  for (const [night, n] of Object.entries(NIGHTS)) {
    if (!['books', 'job'].includes(night) && !QUESTS[night]) throw new Error(`Tavern night ${night} names an unknown chapter`);
    if (n.town && !TOWNS[n.town]) throw new Error(`Tavern night ${night} names an unknown town ${n.town}`);
    const t = DATA.tavern;
    STORY_NODES[nodeId(night)] = {
      id: nodeId(night), act: 'Tavern night', title: n.title, location: n.town ? `The inn's taproom, ${TOWNS[n.town].name}` : "The inn's taproom",
      objective: 'Your party has an empty place. Decide whether to hire someone to fill it.',
      lines: [...n.lines, ...t.lines], safeRest: true, sideStory: true, tavern: night,
      choices: [
        ...HIRES.map((id) => choice(`hire-${id}`, t.hires[id].label, { description: t.hires[id].description, requires: { hireFee: id }, result: { lines: t.hires[id].lines, hire: id, toTown: true, nextNode: `town-${n.town || 'briarwatch'}` } })),
        choice('leave', t.leave.label, { once: false, description: t.leave.description, result: { lines: t.leave.lines, setFlags: { 'tavern:met': true }, toTown: true, nextNode: `town-${n.town || 'briarwatch'}` } })
      ]
    };
  }
}

// Which night a finished chapter opens, if any: its own, a job trial's, or
// the books' end (booksDone: the last written chapter was just finished).
function nightFor(q, booksDone) {
  if (q?.id && NIGHTS[q.id] && !q.generated) return q.id;
  if (q?.trial === 'third' || q?.trial === 'fourth') return 'job';
  return booksDone ? 'books' : null;
}
// Called by src/world.js completeQuest. A night is always recorded; whether the
// door opens is settled when it is shown (the party may have a place free later).
function open(state, q, town, booksDone) {
  const night = nightFor(q, booksDone);
  if (!night) return null;
  state.world.tavern = { night, town: NIGHTS[night].town || town };
  return night;
}
// Setting out ends the night.
function close(state) { if (state.world) state.world.tavern = null; }
function ensure(state, TOWNS) {
  const t = state.world?.tavern;
  if (t && !(t && typeof t === 'object' && NIGHTS[t.night] && TOWNS[t.town])) state.world.tavern = null;
  else if (state.world && t === undefined) state.world.tavern = null;
}
// The night as the town page shows it, or null when the door is shut.
function view(state, here, TOWNS) {
  const t = state.world?.tavern;
  if (!t || !NIGHTS[t.night] || !hasRoom(state)) return null;
  return { night: t.night, title: NIGHTS[t.night].title, town: t.town, townName: TOWNS[t.town]?.name || t.town, here: here === t.town, hires: HIRES.map((id) => ({ id, name: require('./content').COMPANIONS[id]?.name.split(' ')[0] || id, fee: fee(state, id) })) };
}
// Whether the party may go in now (src/world.js, action "tavern").
function canVisit(state, here) {
  const t = state.world?.tavern;
  if (!t || !NIGHTS[t.night]) return { ok: false, error: 'The tavern has nothing for you tonight. It opens at turns in the story.' };
  if (!hasRoom(state)) return { ok: false, error: 'Your party has no empty place to fill.' };
  if (here !== t.town) return { ok: false, error: 'Travel back to the town where the night is being held.' };
  return { ok: true, node: nodeId(t.night) };
}
// The choice's requirement (src/engine.js requirementStatus).
function feeStatus(state, id) {
  if (!HIRES.includes(id)) return { met: false, reason: 'Nobody by that name is here.' };
  if (!hasRoom(state)) return { met: false, reason: 'Your party has no empty place to fill.' };
  const cost = fee(state, id);
  return state.player.gold < cost ? { met: false, reason: `Requires ${cost} gold for the fee.` } : { met: true, reason: '' };
}
// Hires someone (a choice's "hire" outcome): pays the fee, and the place is filled.
function hire(state, id, events, recruit) {
  if (!feeStatus(state, id).met) return false;
  const cost = fee(state, id);
  if (!recruit(state, id, events)) return false;
  state.player.gold -= cost;
  events.push({ type: 'loot', tone: 'neutral', text: `Paid ${cost} gold: the fee.` });
  state.story.flags['tavern:hired'] = id;
  state.story.flags['tavern:met'] = true;
  close(state);
  return true;
}

module.exports = { MAX, NIGHTS, HIRES, nodeId, fee, filled, hasRoom, install, nightFor, open, close, ensure, view, canVisit, feeStatus, hire };
