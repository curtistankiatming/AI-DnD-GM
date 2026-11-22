'use strict';
// Companions who walk out for a chapter (docs/STORY-BIBLE.md: "If approval
// falls too low, a companion walks out for one chapter and can be won back").
//
// Approval is counted over one chapter at a time: every change from the end
// of the last chapter (its camp scene included) through this one, side jobs
// and all. In Book Two, Book Three's Part Two and Book Four's Parts One and
// Three, a companion who ends a chapter LIMIT or more down
// leaves for the next chapter and comes back when it is done. A chapter may
// list companions it "needs" (their own story, the last chapters); before one
// of those they stay and say so instead, as they do from a "together" chapter
// to the end of its book. Book One only closes the count.
//
// The scenes are in src/data/away.json and play as the party walks into town
// after the chapter: returns first, then departures, one at a time.
const { STORY_NODES, COMPANIONS } = require('./content');
const { QUESTS, storyLine, dialogueText } = require('./expansion');
const Book = require('./book');
const P = require('./progression');
const G = require('./equipment');

const LIMIT = 2;
const SCENES = Object.fromEntries(Object.entries(require('./data/away.json')).filter(([id]) => COMPANIONS[id]));
const KINDS = ['leave', 'stay', 'back'];
const ORDER = Object.keys(COMPANIONS);
const nodeId = (id, kind) => `away-${id}-${kind}`;

for (const [id, scenes] of Object.entries(SCENES)) {
  for (const kind of KINDS) {
    const raw = scenes[kind];
    if (!raw) throw new Error(`Companion ${id} has no '${kind}' scene in away.json`);
    const dialogue = raw.lines.map(storyLine);
    STORY_NODES[nodeId(id, kind)] = {
      id: nodeId(id, kind), act: 'Companions', title: raw.title, location: '', objective: '',
      opening: dialogueText(dialogue), dialogue, safeRest: true, sideStory: true, away: { id, kind },
      choices: raw.choices.map((c) => {
        const reply = (c.lines || []).map(storyLine);
        return {
          id: c.id, label: c.label, description: '', once: true,
          result: { ...(reply.length ? { dialogue: reply, text: dialogueText(reply) } : {}), away: { id, kind }, ...(c.approval ? { approval: c.approval } : {}), toTown: true, nextNode: 'town-briarwatch' }
        };
      })
    };
  }
}

function ensure(state) {
  const w = state.world;
  w.away = w.away && typeof w.away === 'object' && !Array.isArray(w.away) ? w.away : {};
  for (const id of Object.keys(w.away)) if (!COMPANIONS[id] || !w.away[id]?.member || state.party.some((m) => m.id === id)) delete w.away[id];
  w.approvalWindow = w.approvalWindow && typeof w.approvalWindow === 'object' ? w.approvalWindow : {};
  w.awayHandled = Array.isArray(w.awayHandled) ? w.awayHandled : [];
  if (w.awayCheck && !QUESTS[w.awayCheck]) w.awayCheck = null;
  return w;
}

// Whether the chapter being counted now can end in a walkout: a chapter in a
// stretch with walkouts and the next chapter in the same stretch of the same
// book (walkoutBetween, the same rule as pending). Between a chapter's end
// and the walk into town (its camp scene), the count is still that chapter's
// (awayCheck).
function walkoutsOn(state) {
  const w = state?.world;
  if (!w?.completed) return false;
  const open = Book.chapters(state).filter((q) => !w.completed[q.id]);
  const [now, next] = w.awayCheck && QUESTS[w.awayCheck] ? [QUESTS[w.awayCheck], open[0]] : open;
  return walkoutBetween(now, next) ? next : null;
}
// Whether this companion could walk out after this chapter: not before a
// chapter that needs them (they stay instead), and not once settled.
function canWalk(state, id) {
  const next = SCENES[id] && walkoutsOn(state);
  return Boolean(next && !(next.needs || []).includes(id) && !(state.world.awayHandled || []).includes(id));
}

// A companion whose count for this chapter is already at the walkout line.
function uneasy(state, id) {
  return Boolean(canWalk(state, id) && (state.world.approvalWindow?.[id] || 0) <= -LIMIT);
}

const pronoun = (id) => COMPANIONS[id]?.pronouns?.startsWith('he') ? { he: 'he', his: 'his' } : { he: 'she', his: 'her' };

// Every approval change counts toward the chapter in progress. Crossing the
// walkout line, either way, is said out loud, so a walkout never comes as a
// surprise and the player knows it can still be turned round.
function count(state, id, delta, events = null) {
  const w = state.world;
  if (!w || !delta) return;
  w.approvalWindow ||= {};
  const before = w.approvalWindow[id] || 0, after = before + delta;
  w.approvalWindow[id] = after;
  if (!events || !canWalk(state, id)) return;
  const name = COMPANIONS[id].name, p = pronoun(id);
  if (before > -LIMIT && after <= -LIMIT) events.push({ type: 'party', tone: 'warning', text: `${name} is unhappy with how this chapter is going. If it ends like this, ${p.he} may leave the party for a while. Choices ${p.he} agrees with can still change ${p.his} mind.` });
  else if (before <= -LIMIT && after > -LIMIT) events.push({ type: 'party', tone: 'good', text: `${name} seems easier about how this chapter is going.` });
}

// A written chapter is done: the walk into town settles the count.
function chapterDone(state, questId) {
  if (state.world && QUESTS[questId]) state.world.awayCheck = questId;
}

// Walkouts run in Book Two, in Book Three, Part Two, and in Book Four, Parts
// One and Three (never in the Wold): both the chapter just done and the next
// one, in the same book. A chapter's "needs" are its own companions
// (docs/book-three/DESIGN-PART-TWO.md and docs/book-four/DESIGN.md, "Walkouts").
const WALKOUT_PARTS = Object.freeze({ 2: null, 3: [2], 4: [1, 3] });
const walkouts = (q) => {
  if (!q) return false;
  const book = Number(q.book) || 1, parts = WALKOUT_PARTS[book];
  return parts !== undefined && (parts === null || parts.includes(Number(q.part) || 1));
};
const walkoutBetween = (now, next) => Boolean(now && next && walkouts(now) && walkouts(next) && (Number(now.book) || 1) === (Number(next.book) || 1));
const nextChapter = (state) => Book.chapters(state).find((q) => !state.world.completed[q.id]) || null;
// From a chapter marked "together" on, to the end of its book, nobody walks
// out: in Book Three the party goes down the stair at chapter 17 and cannot be
// rejoined underground (DESIGN-PART-TWO.md, "No companion walks out after
// chapter 16"). A companion who would have left stays and says so instead.
function together(state, next) {
  const list = Book.chapters(state);
  const book = Number(next.book) || 1;
  return list.slice(0, list.indexOf(next) + 1).some((q) => q.together && (Number(q.book) || 1) === book);
}

// The scene to play before the town, or null once everything is settled
// (which also starts the count for the next chapter).
function pending(state, events = []) {
  const w = state.world;
  if (!w?.awayCheck) return null;
  ensure(state);
  const done = w.awayCheck;
  // Someone coming back is in the party for their own scene.
  for (const [id, a] of Object.entries(w.away)) if (a.until === done) { back(state, id, events); w.awayHandled.push(id); return nodeId(id, 'back'); }
  const next = nextChapter(state);
  if (walkoutBetween(QUESTS[done], next)) {
    for (const member of state.party) {
      if (!SCENES[member.id] || w.awayHandled.includes(member.id) || (w.approvalWindow[member.id] || 0) > -LIMIT) continue;
      if ((next.needs || []).includes(member.id) || together(state, next)) { state.story.flags[`away:stay-${member.id}`] = next.id; return nodeId(member.id, 'stay'); }
      return nodeId(member.id, 'leave');
    }
  }
  w.awayCheck = null; w.awayHandled = []; w.approvalWindow = {};
  return null;
}

function leave(state, id, events) {
  const w = ensure(state);
  const index = state.party.findIndex((m) => m.id === id);
  const next = nextChapter(state);
  if (index < 0 || !next) return false;
  const [member] = state.party.splice(index, 1);
  w.away[id] = { member, left: w.awayCheck, until: next.id, day: w.day };
  state.story.flags[`away:${id}`] = next.id;
  state.story.flags[`walked:${id}`] = (Number(state.story.flags[`walked:${id}`]) || 0) + 1;
  const p = pronoun(id), text = `${member.name} has left the party for now. ${p.he[0].toUpperCase() + p.he.slice(1)} will be back once ${next.name} is done.`;
  events.push({ type: 'party', tone: 'warning', text });
  return true;
}

function back(state, id, events) {
  const w = ensure(state);
  const a = w.away[id];
  if (!a) return false;
  const member = a.member;
  member.conditions = [];
  member.deathSaves = { successes: 0, failures: 0, stable: false };
  P.levelCompanion(member, state.player.level);
  G.derive(member);
  member.hp = member.maxHp;
  member.temporaryHp = 0;
  state.party.push(member);
  state.party.sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id));
  delete w.away[id];
  delete state.story.flags[`away:${id}`];
  events.push({ type: 'party', tone: 'good', text: `${member.name} is back in the party.` });
  return true;
}

// A choice in one of the scenes above.
function apply(state, { id, kind }, events) {
  const w = ensure(state);
  if (kind === 'leave') leave(state, id, events);
  if (kind === 'stay') delete state.story.flags[`away:stay-${id}`];
  if (!w.awayHandled.includes(id)) w.awayHandled.push(id);
}

function view(state) {
  const w = state.world || {};
  return Object.entries(w.away || {}).map(([id, a]) => ({ id, name: COMPANIONS[id].name, role: COMPANIONS[id].role, until: a.until, untilName: QUESTS[a.until]?.name || a.until }));
}

module.exports = { walkouts, walkoutBetween, LIMIT, SCENES, ensure, count, uneasy, walkoutsOn, chapterDone, pending, apply, view, nodeId };
