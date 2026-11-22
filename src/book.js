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
//
// Paid books: the open-source game plays every book free. On the hosted game,
// which uses the owner's AI key, Book Three and later need a paid account;
// the server says how far a session may read (grant), never the save.
const { QUESTS, TOWNS } = require('./expansion');
const P = require('./progression');

const FINISHED = 'books:finished';
// The paid book a free hosted save set aside when it began an AI story of its
// own. If the account upgrades, the save goes back into that book; once the
// books are finished again it carries on with its AI story.
const WAITING = 'books:waiting';
// The written chapters in story order. Book One is the bell and the roads to
// level 10; Book Two (book: 2 in quests.json) runs from level 10 to 20; Book
// Three (book: 3) from 20 to 40, in two parts; Book Four (book: 4) from 40 to
// 70, in three. Written side jobs are optional and never hold up the story.
const ALL = Object.values(QUESTS).filter(q => !q.sideJob);
const bookNo = q => Number(q?.book) || 1;

// Every book on the shelf, written or not. A book may come out in parts
// ("parts": how many it has, "out": how many are released; each chapter in
// quests.json says its "part", 1 by default). Only released parts are played.
// A book with a part still to come is "writing": the hero waits at a "to be
// continued" after its last released chapter. A book with no part out is not
// shown to players at all. Tests and agent playtests see every written part
// with BRIARWATCH_PREVIEW_BOOKS=1; BRIARWATCH_PREVIEW_PARTS="3:1" holds a
// preview of Book Three at Part One, as players will first have it. A paid book is free in the open-source game
// and needs a paid account on the hosted game (docs/AI-STORYTELLER.md,
// "Paid books").
const PREVIEW = /^(1|true|yes|on)$/i.test(String((typeof process !== 'undefined' && process.env && process.env.BRIARWATCH_PREVIEW_BOOKS) || ''));
const PREVIEW_PARTS = Object.fromEntries(String((typeof process !== 'undefined' && process.env && process.env.BRIARWATCH_PREVIEW_PARTS) || '')
  .split(',').map(x => x.split(':').map(Number)).filter(([n, p]) => Number.isInteger(n) && Number.isInteger(p) && p >= 0));
const partNo = q => Number(q?.part) || 1;
const DEFS = [
  { n: 1, title: 'The Bell Beneath Briarwatch' },
  { n: 2, title: 'The Council of Small Voices' },
  // finale: the book's last chapter. Until it is written the book is still
  // being written, even when every part has some chapters (Part Two is
  // written a few chapters at a time), so the hero waits after the last one.
  { n: 3, title: 'The Names in the Bronze', paid: true, parts: 2, out: 0, finale: 'b3-firstbell', partTitles: ['The Bronze', 'The Stair'] },
  // Book Four (docs/book-four/DESIGN.md): levels 40 to 70, three parts of ten
  // chapters, ending at the 4th job trial. Paid on the hosted game, like Book
  // Three; FREE_BOOKS stays 2.
  { n: 4, title: 'The Long Tally', paid: true, parts: 3, out: 0, finale: 'b4-parting', partTitles: ['The North Road', 'The Wold', 'The Parting Bell'] }
];
// "Book Three", "Part Two": books and parts are named in words to players.
const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = n => WORDS[n] || String(n);
const bookName = n => `Book ${word(n)}`;
const partName = (b, n) => `Part ${word(n)}${b?.partTitles?.[n - 1] ? `, ${b.partTitles[n - 1]}` : ''}`;
// limits: { book number: parts } a preview opens at most.
function buildShelf(defs, chapters, preview = false, limits = {}) {
  return Object.freeze(defs.map(b => {
    const open = !b.parts ? Infinity : preview ? Math.min(b.parts, limits[b.n] ?? b.parts) : Math.max(0, Math.min(b.parts, Number(b.out) || 0));
    const last = chapters.filter(q => bookNo(q) === b.n && partNo(q) <= open).at(-1)?.id || null;
    // Preview shows every written part, and still waits if the last part has
    // no chapters yet, so playtests can reach the "to be continued".
    const written = Math.max(0, ...chapters.filter(q => bookNo(q) === b.n).map(partNo));
    const unfinished = Boolean(b.finale) && !chapters.some(q => q.id === b.finale);
    const writing = Boolean(b.parts) && open > 0 && ((preview ? Math.min(written, open) < b.parts : open < b.parts) || (open >= b.parts && unfinished));
    return Object.freeze({ ...b, open, last, writing });
  }));
}
const SHELF = buildShelf(DEFS, ALL, PREVIEW, PREVIEW_PARTS);
const released = b => Boolean(b.last);
const shelfOf = n => SHELF.find(b => b.n === n);
// Whether a chapter is in a released part of its book.
const partOpen = q => partNo(q) <= (shelfOf(bookNo(q))?.open ?? Infinity);

// How far into the books this session may read: the highest book number. The
// server sets it per session (never from a save: a symbol cannot be written
// in JSON). The open-source game sets nothing, so every book is open; the
// hosted game sets FREE_BOOKS for an account without a subscription.
const ACCESS = Symbol('books:access');
const FREE_BOOKS = 2;
function grant(state, upTo) {
  if (state && typeof state === 'object') {
    if (Number.isFinite(upTo)) state[ACCESS] = Math.max(1, Math.floor(upTo));
    else delete state[ACCESS];
  }
  return state;
}
const limit = state => Number.isFinite(state?.[ACCESS]) ? state[ACCESS] : Infinity;
const allows = (state, n) => n <= limit(state);

// The books, and their chapters, this save can play now.
const books = state => SHELF.filter(b => released(b) && allows(state, b.n));
const chapters = state => { const open = new Set(books(state).map(b => b.n)); return ALL.filter(q => open.has(bookNo(q)) && partOpen(q)); };
const lastLevel = state => Math.max(1, ...chapters(state).map(q => Number(q.level) || 1));
const writing = state => books(state).find(b => b.writing) || null;
// The next released book this session may not open (a paid book on a free
// hosted account), or null.
// Whether this save has begun book n: it may play the book and has finished
// one of its chapters. Gear for a book's levels (towns.json stockByLevel, level
// bounties) waits for this, so a hero who levels past a book another way
// (bounties, AI adventures, a free hosted account) never sees it.
// A finished chapter means the book was playable for this save, so the
// released-parts check is not needed (and a save keeps its gear if a preview ends).
const started = (state, n) => allows(state, n) && ALL.some(q => bookNo(q) === n && done(state, q.id));
// Whether gear for a level (towns.json stockByLevel, level bounties) is open.
// Every list waits for Book Three to begin, as Book Three's levels 20 to 40
// always have. Levels 41 to 70 are Book Four's: while this save can read
// Book Four (released, and open to this session) they wait for it to begin
// too. A save that cannot read it (Book Four hidden or unpaid, or an AI story
// that will never begin it) keeps Book Three's rule, so gear still opens by
// level; and so does every level above 70 (docs/EQUIPMENT.md, "Gear by level").
const GEAR_BOOK_FOUR = Object.freeze({ from: P.THIRD_JOB_LEVEL + 1, to: P.FOURTH_JOB_LEVEL });
// Whether book n's gear waits for book n in this save: the book is released
// and open to this session (reads), and the save is not on its own AI story,
// which never begins it.
const ownsGear = (state, n) => reads(state, n) && !aiStory(state);
const gearOpen = (state, level) => {
  const l = Number(level) || 0;
  const four = l >= GEAR_BOOK_FOUR.from && l <= GEAR_BOOK_FOUR.to && ownsGear(state, 4);
  return started(state, four ? 4 : 3);
};
const lockedBook = state => SHELF.find(b => released(b) && !allows(state, b.n)) || null;
// The open-source view, for code and tests that do not hold a save.
const BOOKS = Object.freeze(books(null));
const CHAPTERS = Object.freeze(chapters(null));
const LAST_LEVEL = lastLevel(null);
const WRITING = writing(null);
const bookOf = id => SHELF.find(b => b.n === bookNo(QUESTS[id])) || SHELF[0];
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

// True once the AI has written the hero a full adventure of their own (not a
// side quest during a book). Such a save never goes back to the books.
function aiStory(state) {
  const c = state?.chronicle;
  if (c && (c.arc || c.earlier || (Array.isArray(c.arcs) && c.arcs.length) || (Array.isArray(c.chapters) && c.chapters.some(x => x && x.kind !== 'side quest')))) return true;
  return Object.values(state?.director?.quests || {}).some(q => q && !q.side && !q.trial);
}
const unwritten = state => !done(state, 'bell') || chapters(state).some(q => !done(state, q.id));
// A save already inside a book it may no longer open (a lapsed subscription on
// the hosted game): it waits, untouched, until access returns. It is never
// marked finished and never handed to the AI storyteller in its place. An
// expedition already under way when access lapsed may be played to its end.
// The book it waits in is the latest closed book it has begun: a save part-way
// through Book Four, or past every book, is held in Book Four, not Book Three.
function heldBook(state) {
  const begun = q => done(state, q.id) || state?.world?.activeQuest === q.id;
  return SHELF.filter(b => released(b) && !allows(state, b.n)).reverse()
    .find(b => ALL.some(q => bookNo(q) === b.n && partOpen(q) && begun(q))) || null;
}
const locked = state => Boolean(heldBook(state));
function finished(state) {
  if (locked(state)) return false;
  const f = flags(state);
  const W = writing(state), last = lastLevel(state);
  if (f?.[FINISHED]) {
    // A free hosted save that begins an AI story while a paid book waits
    // remembers that book, so an upgrade can still take it back there.
    const paid = lockedBook(state);
    if (paid && !f[WAITING] && aiStory(state)) f[WAITING] = paid.n;
    const back = Number(f[WAITING]) > 0 && allows(state, Number(f[WAITING]));
    // A save marked finished at the end of a book, before the next book was
    // open to it (not yet written, or not yet paid for), carries on into the
    // next book: at once if it has no AI adventure of its own yet, or, if it
    // set the paid book aside for one, once the account can read that book.
    const bookOneDone = done(state, 'bell') && chapters(state).filter(q => bookNo(q) === 1).every(q => done(state, q.id));
    if (!bookOneDone || (aiStory(state) && !back) || (!unwritten(state) && !W) || (!back && (Number(state?.player?.level) || 1) > last + (W ? 1 : 0))) return true;
    delete f[FINISHED];
    return false;
  }
  // Saves from before this rule could level past the books on AI adventures
  // alone; a hero above the last written chapter's level is on their own story.
  // A save back in the paid book it set aside is not: it plays the book first.
  const pastBooks = !f?.[WAITING] && (Number(state?.player?.level) || 1) > last + (W ? 1 : 0);
  if (!pastBooks && (unwritten(state) || W)) return false;
  if (f) {
    f[FINISHED] = true;
    // The set-aside book is done with once it is open and finished; while it
    // is still closed to this account (a lapse before it began), it waits.
    if (!lockedBook(state)) delete f[WAITING];
  }
  return true;
}
const running = state => !finished(state);
// Told once, when the last written chapter this save can play is finished.
const ENDING = 'The written story is complete: you have finished both books, The Bell Beneath Briarwatch and The Council of Small Voices. From here the AI storyteller writes your adventures from the choices you made, one expedition at a time. Ask the game master for a new adventure on the expedition board (this needs the Claude AI game master). Without it, your written campaign ends here, and your hero, party and choices stay saved.';
function ending(state) {
  const open = books(state), next = lockedBook(state);
  const titles = open.map(b => b.title);
  const list = titles.length > 1 ? `${titles.slice(0, -1).join(', ')} and ${titles.at(-1)}` : titles[0];
  const count = ['', 'the first book', 'both books'][titles.length] || `all ${word(titles.length).toLowerCase()} books`;
  const base = titles.length === 2 && !next ? ENDING : `The written story is complete: you have finished ${count}, ${list}. From here the AI storyteller writes your adventures from the choices you made, one expedition at a time. Ask the game master for a new adventure on the expedition board (this needs the Claude AI game master). Without it, your written campaign ends here, and your hero, party and choices stay saved.`;
  const trial = next ? '' : trialLine(state);
  return next ? paidEnding(count, list, next) : trial ? `${base.replace('Without it, your written campaign ends here', 'Without it, the written books end here, apart from your job trial')}${trial}` : base;
}
// A book that ends at a job trial (Book Three ends at level 40, the 3rd job)
// says how to reach it, which needs no AI game master: the trial is written,
// and bounties lift a hero who finished a little short (src/bounty.js).
function trialLine(state) {
  const player = state?.player;
  if (!player || !P.branchOf(player)) return '';
  const p = P.ensure(player), kind = P.nextTrial(player);
  if (kind) return ` Your ${kind === 'fourth' ? '4th' : '3rd'} job trial is ready: begin it from What's next or the expedition board. It is written into the game, so it does not need the AI game master.`;
  const next = !p.thirdJob ? 'third' : !p.fourthJob ? 'fourth' : null, level = next && P.TRIAL_LEVELS[next];
  if (!level || level > lastLevel(state) + 1) return '';
  return ` Your ${next === 'fourth' ? '4th' : '3rd'} job trial opens at level ${level}; bounties on the town board can take you there, with or without the AI game master.`;
}
// A free hosted account at the end of its open books. The paid book comes
// first; an AI adventure of the save's own sets the paid book aside until the
// account upgrades (WAITING, finished).
function paidEnding(count, list, next) {
  return `You have finished ${count}, ${list}. The story goes on in ${bookName(next.n)}, ${next.title}, for paid accounts: upgrade, and this save carries straight on into it. ${paidChoice(next)}`;
}
const paidChoice = (next) => `If you would rather keep going now, the AI storyteller can write adventures from the choices you made (this needs the Claude AI game master). If you upgrade later, this save goes back into ${bookName(next.n)}, and your own story carries on after it. Your hero, party and choices stay saved either way.`;
// Told when a book that is not the last one this save can play ends.
function bookEnd(id, state = null) {
  const b = SHELF.find(x => x.last === id), next = b && books(state).find(x => x.n === b.n + 1);
  if (b?.writing && b.parts > 1 && b.open < b.parts) return `To be continued. You have finished ${b.partTitles?.[b.open - 1] ? `${b.partTitles[b.open - 1]}, ` : ''}Part ${word(b.open)} of ${bookName(b.n)}, ${b.title}. ${partName(b, b.open + 1)}${b.partTitles?.[b.open] ? ',' : ''} is being written; its chapters will appear on the expedition board when it comes out. Until then, bounties and side jobs stay open, and your hero, party and choices stay saved.`;
  if (b?.writing) return `To be continued. You have reached the end of what is written of ${bookName(b.n)}, ${b.title}, so far; its next chapters are being written and will appear on the expedition board. Your hero, party and choices stay saved.`;
  if (!next) return null;
  const first = ALL.find(q => bookNo(q) === next.n);
  const where = first ? ` Its first chapter, ${first.name}, is on the expedition board in ${TOWNS[first.town]?.name || first.town}.` : '';
  return `${bookName(b.n)}, ${b.title}, is complete. ${bookName(next.n)}, ${next.title}, begins.${where}`;
}

// The written chapter the hero is on now: the bell, then each authored
// expedition in order. Null once the books are finished.
function chapter(state) {
  if (locked(state)) {
    const b = heldBook(state), q = ALL.find(x => bookNo(x) === b.n && partOpen(x) && !done(state, x.id));
    // A save that finished the book (and any after it) is past it, not part-way through.
    const where = q ? `is part-way through ${bookName(b.n)}, ${b.title}, which needs` : `has gone on past ${bookName(b.n)}, ${b.title}, and from Book ${word(FREE_BOOKS + 1)} on the story needs`;
    return { id: 'locked', name: `${b.title}: needs a paid account`, level: Number(q?.level) || Number(state?.player?.level) || 1, brief: `This save ${where} a paid account here. It is kept exactly as it is and carries on when the account is paid again.`, book: b.title, n: b.n, locked: true };
  }
  if (finished(state)) return null;
  if (!done(state, 'bell')) return BELL;
  const q = chapters(state).find(x => !done(state, x.id)), W = writing(state);
  if (!q && W) return { id: 'to-be-continued', name: `${W.title}: the chapters still being written`, level: lastLevel(state) + 1, brief: 'The next written chapters are not out yet. Small side stories only; the main story waits for the next chapter.', book: W.title, n: W.n, waiting: true };
  return q ? { id: q.id, name: q.name, level: q.level, brief: q.brief, book: bookOf(q.id).title, n: bookOf(q.id).n } : null;
}
// Whether this save may take a written chapter now (its book is released and
// open to this session).
const playable = (state, id) => !QUESTS[id] || QUESTS[id].sideJob || chapters(state).some(q => q.id === id);
// The `access` line condition: book n is released and open to this session.
const reads = (state, n) => books(state).some(b => b.n === Number(n));
// A town that only a later book's chapters reach (Book Three's Saltwick and
// Vell) is shown, travelled to, or offered to the AI storyteller only while
// one of those chapters is playable for this save: not before its book is
// released, nor on a hosted account without that book.
const TOWN_CHAPTERS = {};
for (const q of ALL) for (const id of new Set([q.town, q.nextTown])) if (id) (TOWN_CHAPTERS[id] ||= []).push(q.id);
// A town written for a later book ("book" in towns.json: Book Four's Lantry
// and Orme) that no chapter names yet is closed, so it is never shown or
// offered to the AI storyteller before its chapters are written.
const townOpen = (state, id) => Boolean(TOWNS[id]) && (TOWN_CHAPTERS[id] ? TOWN_CHAPTERS[id].some(q => playable(state, q)) : !TOWNS[id].book);

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
// Written side jobs are stricter: after each chapter still to come, with its
// own reward, the hero must be no further than the level after that chapter,
// never two levels on. Chapters pay about 70% of a level (src/xp.js), so jobs
// help a hero catch up but never carry them past the story.
function jobRoom(state) {
  if (!chapter(state)) return Infinity;
  const xp = Math.max(0, Number(state.player?.xp) || 0);
  let paid = 0, room = xp + xpRoom(state);
  for (const q of chapters(state)) {
    if (done(state, q.id)) continue;
    paid += Math.max(0, Number(q.xp) || 0);
    room = Math.min(room, (P.XP_NEXT[(Number(q.level) || 1) + 1] || Infinity) - 1 - paid);
  }
  return Math.max(0, room - xp);
}
const capJobXp = (state, amount) => Math.max(0, Math.min(Math.floor(Number(amount) || 0), jobRoom(state)));
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
    chapterGoal: c.locked ? 'This book is closed to this account for now. Write only small side stories that leave it alone: never continue, spoil or replace it.' : c.brief,
    chapterLevel: c.level,
    heroBehindChapter: behind(state),
    detourTurnsThisScene: turns,
    steering: STEERING[step]
  };
}

module.exports = {bookName, partName, trialLine, paidChoice, townOpen, buildShelf, writing, FINISHED, WAITING, ENDING, SHELF, BOOKS, WRITING, CHAPTERS, LAST_LEVEL, ACCESS, FREE_BOOKS, grant, allows, books, chapters, lastLevel, lockedBook, locked, playable, reads, ending, bookEnd, bookOf, aiStory, STEER_FROM, STEERING, finished, running, chapter, levelCap, xpRoom, capXp, jobRoom, capJobXp, behind, detour, countDetour, normalizeDetour, steerLevel, facts, started, gearOpen, ownsGear};
