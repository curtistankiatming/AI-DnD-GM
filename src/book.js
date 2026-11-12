'use strict';
// The written story ("the books") and what the AI game master may do around it.
//
// While a written chapter exists for the hero, the books are the spine of the
// story. The AI may play along with anything the player tries, run short
// detours and small side quests, and develop minor people, but it steers back
// to the book and cannot change the book's path. XP the AI hands out can help
// a hero who is behind catch up to the chapter's level, never overtake it.
//
// Once the last written chapter is finished, the save becomes the hero's own
// story: the AI writes full adventures and no chapter cap applies. That save
// stays an AI story even if more books are written later; new books are for
// new saves.
const { QUESTS } = require('./expansion');
const P = require('./progression');

const FINISHED = 'books:finished';
const LAST_LEVEL = Math.max(1, ...Object.values(QUESTS).map(q => Number(q.level) || 1));
const BELL = Object.freeze({ id: 'bell', name: 'The Bell Beneath Briarwatch', level: 1, brief: 'Find out why the ward-bell beneath Briarwatch fell silent.' });

// Detour turns in one scene before the AI starts steering back, and the steps
// of the steering ladder from docs/AI-STORYTELLER.md.
const STEER_FROM = Object.freeze([4, 6, 8]);
const STEERING = Object.freeze([
  'Play along fully. The player is exploring; no steering yet.',
  'Tie the detour in: let what happens turn up a clue, a person or a favour that matters to the current chapter, or let a companion raise their own reason to go on, in their own voice.',
  'Let the world move: a messenger, the weather, or the chapter\'s own deadline presses in. The detour still counts, but the book is calling.',
  'Close the detour gently in one or two sentences and point the player back to the listed choices. Never refuse or scold; the world simply moves on.'
]);

const flags = state => state?.story?.flags && typeof state.story.flags === 'object' ? state.story.flags : null;
const done = (state, id) => Boolean(state?.world?.completed?.[id]);

// True once every written chapter is complete, or this save was already an AI
// story. Marks the save so later books never pull it back.
function finished(state) {
  const f = flags(state);
  if (f?.[FINISHED]) return true;
  // Saves from before this rule could level past the books on AI adventures
  // alone; a hero above the last written chapter's level is on their own story.
  const pastBooks = (Number(state?.player?.level) || 1) > LAST_LEVEL;
  if (!pastBooks && (!done(state, 'bell') || Object.values(QUESTS).some(q => !done(state, q.id)))) return false;
  if (f) f[FINISHED] = true;
  return true;
}
const running = state => !finished(state);

// The written chapter the hero is on now: the bell, then each authored
// expedition in order. Null once the books are finished.
function chapter(state) {
  if (finished(state)) return null;
  if (!done(state, 'bell')) return BELL;
  const q = Object.values(QUESTS).find(x => !done(state, x.id));
  return q ? { id: q.id, name: q.name, level: q.level, brief: q.brief } : null;
}

// The level the current chapter is written for. AI XP may bring the hero up to
// this level but never into the next one.
function levelCap(state) {
  const c = chapter(state);
  return c ? Math.max(1, Math.min(P.MAX_LEVEL, c.level)) : null;
}
// XP the AI may still give before the hero would level past the chapter.
function xpRoom(state) {
  const cap = levelCap(state);
  if (cap === null) return Infinity;
  const ceiling = (P.XP_NEXT[cap] || Infinity) - 1;
  return Math.max(0, ceiling - Math.max(0, Number(state.player?.xp) || 0));
}
const capXp = (state, amount) => Math.max(0, Math.min(Math.floor(Number(amount) || 0), xpRoom(state)));
const behind = state => { const cap = levelCap(state); return cap !== null && (state.player?.level || 1) < cap; };

// Turns the player has spent in this scene talking or improvising rather than
// taking one of the written choices. Kept in the chat memory.
function detour(chat, nodeId) {
  const d = chat?.detour;
  return d && d.node === nodeId ? d.turns : 0;
}
function countDetour(chat, nodeId) {
  if (!chat) return 0;
  const turns = detour(chat, nodeId) + 1;
  chat.detour = { node: String(nodeId || '').slice(0, 120), turns: Math.min(50, turns) };
  return turns;
}
function normalizeDetour(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.node !== 'string') return null;
  return { node: raw.node.slice(0, 120), turns: Math.max(0, Math.min(50, Math.floor(Number(raw.turns) || 0))) };
}
function steerLevel(turns) {
  let level = 0;
  for (const from of STEER_FROM) if (turns >= from) level += 1;
  return level;
}

// What the AI is told about the book on each turn. Facts and limits only; the
// engine enforces every number.
function facts(state, chat = null) {
  const c = chapter(state);
  if (!c) return { running: false, mode: 'beyond the books: this is the hero\'s own story; continue it freely within the rules' };
  const turns = detour(chat, state.story?.nodeId);
  const step = steerLevel(turns);
  return {
    running: true,
    chapter: c.name,
    chapterGoal: c.brief,
    chapterLevel: c.level,
    heroBehindChapter: behind(state),
    detourTurnsThisScene: turns,
    steering: STEERING[step]
  };
}

module.exports = { FINISHED, STEER_FROM, STEERING, finished, running, chapter, levelCap, xpRoom, capXp, behind, detour, countDetour, normalizeDetour, steerLevel, facts };
