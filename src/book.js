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
const { QUESTS, TOWNS } = require('./expansion');
const P = require('./progression');

const FINISHED = 'books:finished';
// The written chapters in story order. Book One is the bell and the roads to
// level 10; Book Two (book: 2 in quests.json) runs from level 10 to 20.
// Written side jobs (sideJob: true) are optional and never hold up the story.
const CHAPTERS = Object.values(QUESTS).filter(q => !q.sideJob);
const LAST_LEVEL = Math.max(1, ...CHAPTERS.map(q => Number(q.level) || 1));
// A book still being written ("writing") keeps the books open after its last
// written chapter: the hero waits at a "to be continued" instead of the save
// becoming an AI story. Remove the mark when the book's last chapter lands.
const BOOKS = Object.freeze([
  { n: 1, title: 'The Bell Beneath Briarwatch' },
  { n: 2, title: 'The Council of Small Voices' }
].map(b => ({ ...b, last: CHAPTERS.filter(q => (q.book || 1) === b.n).at(-1)?.id || null })).filter(b => b.last));
const WRITING = BOOKS.find(b => b.writing) || null;
const bookOf = id => BOOKS.find(b => b.n === ((QUESTS[id]?.book) || 1)) || BOOKS[0];
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
// True once the AI has written the hero a full adventure of their own (not a
// side quest during a book). Such a save never goes back to the books.
function aiStory(state) {
  const c = state?.chronicle;
  if (c && (c.arc || c.earlier || (Array.isArray(c.arcs) && c.arcs.length) || (Array.isArray(c.chapters) && c.chapters.some(x => x && x.kind !== 'side quest')))) return true;
  return Object.values(state?.director?.quests || {}).some(q => q && !q.side && !q.trial);
}
const unwritten = state => !done(state, 'bell') || CHAPTERS.some(q => !done(state, q.id));
function finished(state) {
  const f = flags(state);
  if (f?.[FINISHED]) {
    // A save marked finished at the end of Book One, before Book Two existed,
    // with no AI adventure of its own yet, carries on into the new book.
    const bookOneDone = done(state, 'bell') && CHAPTERS.filter(q => (q.book || 1) === 1).every(q => done(state, q.id));
    if (!bookOneDone || aiStory(state) || (!unwritten(state) && !WRITING) || (Number(state?.player?.level) || 1) > LAST_LEVEL + (WRITING ? 1 : 0)) return true;
    delete f[FINISHED];
    return false;
  }
  // Saves from before this rule could level past the books on AI adventures
  // alone; a hero above the last written chapter's level is on their own story.
  const pastBooks = (Number(state?.player?.level) || 1) > LAST_LEVEL + (WRITING ? 1 : 0);
  if (!pastBooks && (unwritten(state) || WRITING)) return false;
  if (f) f[FINISHED] = true;
  return true;
}
const running = state => !finished(state);
// Told once, when the last written chapter is finished.
const ENDING = 'The written story is complete: you have finished both books, The Bell Beneath Briarwatch and The Council of Small Voices. From here the AI storyteller writes your adventures from the choices you made, one expedition at a time. Ask the game master for a new adventure on the expedition board (this needs the Claude AI game master). Without it, your written campaign ends here, and your hero, party and choices stay saved.';
// Told when a book that is not the last one ends.
function bookEnd(id) {
  const b = BOOKS.find(x => x.last === id), next = b && BOOKS.find(x => x.n === b.n + 1);
  if (b?.writing) return `To be continued. You have reached the end of what is written of Book ${b.n}, ${b.title}, so far; its next chapters are being written and will appear on the expedition board. Your hero, party and choices stay saved.`;
  if (!next) return null;
  const first = CHAPTERS.find(q => (q.book || 1) === next.n);
  const where = first ? ` Its first chapter, ${first.name}, is on the expedition board in ${TOWNS[first.town]?.name || first.town}.` : '';
  return `Book ${b.n}, ${b.title}, is complete. Book ${next.n}, ${next.title}, begins.${where}`;
}

// The written chapter the hero is on now: the bell, then each authored
// expedition in order. Null once the books are finished.
function chapter(state) {
  if (finished(state)) return null;
  if (!done(state, 'bell')) return BELL;
  const q = CHAPTERS.find(x => !done(state, x.id));
  if (!q && WRITING) return { id: 'to-be-continued', name: `${WRITING.title}: the chapters still being written`, level: LAST_LEVEL + 1, brief: 'The next written chapters are not out yet. Small side stories only; the main story waits for the next chapter.', book: WRITING.title, waiting: true };
  return q ? { id: q.id, name: q.name, level: q.level, brief: q.brief, book: bookOf(q.id).title } : null;
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
    book: c.book || BOOKS[0].title,
    chapter: c.name,
    chapterGoal: c.brief,
    chapterLevel: c.level,
    heroBehindChapter: behind(state),
    detourTurnsThisScene: turns,
    steering: STEERING[step]
  };
}

module.exports = { FINISHED, ENDING, BOOKS, WRITING, CHAPTERS, LAST_LEVEL, bookEnd, bookOf, aiStory, STEER_FROM, STEERING, finished, running, chapter, levelCap, xpRoom, capXp, behind, detour, countDetour, normalizeDetour, steerLevel, facts };
