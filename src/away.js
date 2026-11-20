'use strict';
// Companions who walk out for a chapter (docs/STORY-BIBLE.md: "If approval
// falls too low, a companion walks out for one chapter and can be won back").
//
// Approval is counted over one chapter at a time: every change from the end
// of the last chapter (its camp scene included) through this one, side jobs
// and all. In Book Two, a companion who ends a chapter LIMIT or more down
// leaves for the next chapter and comes back when it is done. A chapter may
// list companions it "needs" (their own story, the last chapters); before one
// of those they stay and say so instead. Book One only closes the count.
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

// Every approval change counts toward the chapter in progress.
function count(state, id, delta) {
  const w = state.world;
  if (!w || !delta) return;
  w.approvalWindow ||= {};
  w.approvalWindow[id] = (w.approvalWindow[id] || 0) + delta;
}

// A written chapter is done: the walk into town settles the count.
function chapterDone(state, questId) {
  if (state.world && QUESTS[questId]) state.world.awayCheck = questId;
}

const nextChapter = (state) => Book.CHAPTERS.find((q) => !state.world.completed[q.id]) || null;

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
  if ((QUESTS[done].book || 1) === 2 && next && (next.book || 1) === 2) {
    for (const member of state.party) {
      if (!SCENES[member.id] || w.awayHandled.includes(member.id) || (w.approvalWindow[member.id] || 0) > -LIMIT) continue;
      if ((next.needs || []).includes(member.id)) { state.story.flags[`away:stay-${member.id}`] = next.id; return nodeId(member.id, 'stay'); }
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
  const text = `${member.name} has left the party for now. ${COMPANIONS[id].pronouns?.startsWith('he') ? 'He' : 'She'} will be back once ${next.name} is done.`;
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

module.exports = { LIMIT, SCENES, ensure, count, chapterDone, pending, apply, view, nodeId };
