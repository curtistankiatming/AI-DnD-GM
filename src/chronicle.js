'use strict';
// The chronicle: the hero's own story as the AI game master writes it. Every
// AI-written adventure the hero finishes becomes a chapter, with the choice
// they made, and the people, places and open threads it introduced. The AI
// reads the chronicle before writing the next adventure, so an endless story
// stays consistent, and the player reads it in the Journal.
//
// Chapters are never thrown away: past MAX_CHAPTERS the oldest are condensed
// into a one-line-per-chapter summary ("earlier"). Everything here is story
// text; it never changes a number. It lives in the save and works offline.
const VERSION = 1;
const MAX_CHAPTERS = 30;     // Full chapters kept; older ones are condensed.
const MAX_EARLIER = 6000;    // Characters of condensed summary.
const MAX_CAST = 80, MAX_PLACES = 40, MAX_OPEN = 20, MAX_CLOSED = 20;
const STATUS = Object.freeze(['alive', 'dead', 'missing', 'unknown']);
const ATTITUDE = Object.freeze(['friendly', 'neutral', 'hostile']);
const KINDS = Object.freeze(['adventure', 'side quest', 'trial']);
// Story arcs (step 3): beyond the books the AI writes adventures as arcs of
// ARC_LENGTH chapters. The engine keeps the count and says which beat each
// chapter is; Claude names the arc and writes the chapters.
const ARC_LENGTH = 4, MAX_ARCS = 30;
const BEATS = Object.freeze(['opening', 'rising', 'turn', 'finale']);
const GUIDE = Object.freeze({
  opening: 'Open a new story arc: give it a title and a premise (the big question its chapters will answer). Introduce its central person, place or threat, and end on a hook that leads to the next chapter.',
  rising: 'Continue the arc: raise the stakes, complicate the premise, reveal something new about its central question. End on a hook.',
  turn: 'The arc\'s turning point: a reversal, betrayal or hard truth about its central question that sets up the finale. End on a hook.',
  finale: 'The arc\'s finale: answer its central question in this adventure. The final decisions are about how the arc ends. Leave at most one thread for whatever comes next.'
});
const beatOf = (chapter, of) => chapter <= 1 ? 'opening' : chapter >= of ? 'finale' : chapter === of - 1 ? 'turn' : 'rising';
const T = Object.freeze({ name: 80, role: 160, wants: 200, note: 200, thread: 200, title: 80, text: 600 });
const OUTCOME = Object.freeze({ peaceful: 'resolved without a fight', objective: 'won by completing the objective under fire', force: 'won by force', costly: 'resolved at a cost' });

const clean = (value, limit) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
const key = name => clean(name, T.name).toLowerCase();
const int = (v, min, max, d = min) => { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : d; };
const pick = (list, value, fallback) => list.includes(value) ? value : fallback;

function person(raw, chapter = 0) {
  const name = clean(raw?.name, T.name);
  if (name.length < 2) return null;
  return {
    name, role: clean(raw.role, T.role), wants: clean(raw.wants, T.wants),
    status: pick(STATUS, raw.status, 'alive'), attitude: pick(ATTITUDE, raw.attitude, 'neutral'),
    first: int(raw.first ?? chapter, 0, 99999), last: int(raw.last ?? chapter, 0, 99999)
  };
}
function place(raw, chapter = 0) {
  const name = clean(raw?.name, T.name);
  return name.length < 2 ? null : { name, note: clean(raw.note, T.note), last: int(raw.last ?? chapter, 0, 99999) };
}
function thread(raw, chapter = 0) {
  const text = clean(typeof raw === 'string' ? raw : raw?.text, T.thread);
  if (text.length < 3) return null;
  return { text, status: raw?.status === 'closed' ? 'closed' : 'open', opened: int(raw?.opened ?? chapter, 0, 99999), ...(raw?.closed ? { closed: int(raw.closed, 0, 99999) } : {}) };
}
function arcTag(raw) {
  if (!raw || typeof raw !== 'object' || !/^arc-\d{1,5}$/.test(raw.id || '')) return null;
  const of = int(raw.of, 2, 8, ARC_LENGTH), chapter = int(raw.chapter, 1, of, 1);
  return { id: raw.id, title: clean(raw.title, T.title) || 'Untitled arc', premise: clean(raw.premise, T.wants), chapter, of, beat: beatOf(chapter, of), hook: clean(raw.hook ?? raw.nextHook, T.thread) };
}
function arcOf(raw) {
  if (!raw || typeof raw !== 'object' || !/^arc-\d{1,5}$/.test(raw.id || '')) return null;
  const length = int(raw.length, 2, 8, ARC_LENGTH);
  return {
    id: raw.id, n: int(raw.n, 1, 99999, 1), title: clean(raw.title, T.title) || 'Untitled arc', premise: clean(raw.premise, T.wants),
    length, done: int(raw.done, 0, length, 0), chapters: (Array.isArray(raw.chapters) ? raw.chapters : []).map(x => int(x, 1, 99999)).slice(0, length),
    hook: clean(raw.hook, T.thread), ending: clean(raw.ending, T.text)
  };
}
function chapterOf(raw) {
  const title = clean(raw?.title, T.title);
  if (!title || typeof raw.id !== 'string') return null;
  const arc = clean(raw.arc, T.title);
  return {
    ...(arc ? { arc, part: int(raw.part, 1, 8, 1), parts: int(raw.parts, 1, 8, 1) } : {}),
    id: clean(raw.id, 40), n: int(raw.n, 1, 99999), title, kind: pick(KINDS, raw.kind, 'adventure'),
    day: int(raw.day, 1, 999999, 1), level: int(raw.level, 1, 100, 1), region: clean(raw.region, T.title),
    brief: clean(raw.brief, T.text), outcome: clean(raw.outcome, T.title),
    choice: clean(raw.choice, T.role), consequence: clean(raw.consequence, T.text)
  };
}
const dedupe = (list, id) => { const seen = new Set(); return list.filter(x => x && !seen.has(id(x)) && seen.add(id(x))); };

// Re-validates a stored chronicle (a hand-edited save cannot inject anything
// but bounded story text). Saves from before the chronicle are backfilled
// from the AI adventures still stored in the save.
function normalize(state, stored = []) {
  const raw = state.chronicle && typeof state.chronicle === 'object' ? state.chronicle : null;
  const c = {
    version: VERSION,
    count: 0,
    earlier: clean(raw?.earlier, MAX_EARLIER),
    chapters: dedupe((Array.isArray(raw?.chapters) ? raw.chapters : []).map(chapterOf), x => x.id).slice(-MAX_CHAPTERS),
    cast: dedupe((Array.isArray(raw?.cast) ? raw.cast : []).map(x => person(x)), x => key(x.name)).slice(-MAX_CAST),
    places: dedupe((Array.isArray(raw?.places) ? raw.places : []).map(x => place(x)), x => key(x.name)).slice(-MAX_PLACES),
    threads: dedupe((Array.isArray(raw?.threads) ? raw.threads : []).map(x => thread(x)), x => key(x.text)),
    arc: arcOf(raw?.arc),
    arcs: dedupe((Array.isArray(raw?.arcs) ? raw.arcs : []).map(arcOf), x => x.id).slice(-MAX_ARCS),
    arcCount: 0
  };
  c.count = Math.max(int(raw?.count, 0, 99999), c.chapters.at(-1)?.n || 0);
  c.arcCount = Math.max(int(raw?.arcCount, 0, 99999), c.arc?.n || 0, c.arcs.at(-1)?.n || 0);
  if (c.arc && c.arc.done >= c.arc.length) c.arc = null;
  trimThreads(c);
  state.chronicle = c;
  if (!raw) {
    const done = stored.filter(q => q?.generated && state.world?.completed?.[q.id]).sort((a, b) => (state.world.completed[a.id].day || 0) - (state.world.completed[b.id].day || 0));
    for (const q of done) record(state, q);
  }
  return c;
}

function trimThreads(c) {
  const open = c.threads.filter(t => t.status === 'open').slice(-MAX_OPEN);
  const closed = c.threads.filter(t => t.status === 'closed').slice(-MAX_CLOSED);
  c.threads = [...closed, ...open];
}

// Past MAX_CHAPTERS, the oldest chapters become one line each in "earlier".
function condense(c) {
  while (c.chapters.length > MAX_CHAPTERS) {
    const ch = c.chapters.shift();
    const line = `Chapter ${ch.n}, ${ch.title}: ${ch.choice || ch.outcome || 'completed'}.`;
    c.earlier = (c.earlier ? `${c.earlier} ${line}` : line);
    if (c.earlier.length > MAX_EARLIER) c.earlier = '…' + c.earlier.slice(c.earlier.length - MAX_EARLIER + 1);
  }
}

// A finished AI adventure becomes the next chapter. Called once the player's
// final decision is recorded, so the chapter carries their choice.
function record(state, q) {
  const c = state.chronicle?.version === VERSION ? state.chronicle : normalize(state);
  const done = state.world?.completed?.[q?.id];
  if (!q?.generated || !done || c.chapters.some(x => x.id === q.id)) return null;
  const n = c.count + 1;
  const chosen = (q.decisions || []).find(d => state.story?.flags?.[d.flag]);
  const tag = arcTag(q.storyArc), arc = tag && c.arc?.id === tag.id ? c.arc : null;
  const ch = chapterOf({
    ...(arc ? { arc: arc.title, part: arc.done + 1, parts: arc.length } : {}),
    id: q.id, n, title: q.name, kind: q.trial ? 'trial' : q.side ? 'side quest' : 'adventure',
    day: done.day, level: q.level, region: q.region, brief: q.brief,
    outcome: OUTCOME[done.quality] || 'resolved', choice: chosen?.label || '', consequence: chosen?.text || ''
  });
  if (!ch) return null;
  c.count = n; c.chapters.push(ch); condense(c);
  if (arc) {
    arc.done += 1; arc.chapters.push(n); arc.hook = tag.hook;
    if (arc.done >= arc.length) {
      arc.ending = [chosen?.label, chosen?.text].filter(Boolean).join(': ');
      c.arcs.push(arc); c.arcs = c.arcs.slice(-MAX_ARCS); c.arc = null;
    }
  }
  for (const raw of q.cast || []) {
    const p = person(raw, n); if (!p) continue;
    const old = c.cast.find(x => key(x.name) === key(p.name));
    if (old) Object.assign(old, { role: p.role || old.role, wants: p.wants || old.wants, status: p.status, attitude: p.attitude, last: n });
    else c.cast.push(p);
  }
  c.cast = c.cast.slice(-MAX_CAST);
  for (const raw of q.places || []) {
    const p = place(raw, n); if (!p) continue;
    const old = c.places.find(x => key(x.name) === key(p.name));
    if (old) Object.assign(old, { note: p.note || old.note, last: n }); else c.places.push(p);
  }
  c.places = c.places.slice(-MAX_PLACES);
  for (const text of q.threads?.closed || []) {
    const t = c.threads.find(x => x.status === 'open' && key(x.text) === key(text));
    if (t) { t.status = 'closed'; t.closed = n; }
  }
  for (const text of q.threads?.opened || []) {
    const t = thread(text, n);
    if (t && !c.threads.some(x => key(x.text) === key(t.text))) c.threads.push(t);
  }
  trimThreads(c);
  return ch;
}

// What the AI reads before writing the next adventure: the condensed past,
// the latest chapters in full, the people, places and open threads.
function forPrompt(state, { chapters = 8, cast = 30, places = 15 } = {}) {
  const c = state.chronicle;
  if (!c?.chapters?.length && !c?.earlier) return null;
  return {
    note: 'The hero\'s own story so far, as recorded. Keep it consistent: bring people back, pick up open threads, respect who is dead or hostile.',
    earlier: c.earlier || '',
    latestChapters: c.chapters.slice(-chapters).map(ch => ({ chapter: ch.n, title: ch.title, kind: ch.kind, region: ch.region, what: ch.brief, outcome: ch.outcome, choice: ch.choice, consequence: ch.consequence })),
    cast: [...c.cast].sort((a, b) => b.last - a.last).slice(0, cast).map(p => ({ name: p.name, role: p.role, wants: p.wants, status: p.status, attitude: p.attitude, lastSeenChapter: p.last })),
    places: [...c.places].sort((a, b) => b.last - a.last).slice(0, places).map(p => ({ name: p.name, note: p.note })),
    openThreads: c.threads.filter(t => t.status === 'open').map(t => t.text),
    finishedArcs: (c.arcs || []).slice(-5).map(a => ({ title: a.title, premise: a.premise, ending: a.ending }))
  };
}

// Where the next AI adventure sits in the current arc (read only, for the
// prompt). Beyond the books every adventure belongs to an arc.
function arcBrief(state) {
  const c = state.chronicle, a = c?.arc;
  const chapter = a ? a.done + 1 : 1, of = a?.length || ARC_LENGTH, beat = beatOf(chapter, of);
  return {
    status: a && a.done > 0 ? 'continuing' : 'new',
    ...(a && a.done > 0 ? { title: a.title, premise: a.premise, lastHook: a.hook, chaptersSoFar: (c.chapters || []).filter(ch => a.chapters.includes(ch.n)).map(ch => ({ title: ch.title, choice: ch.choice })) } : {}),
    chapter, of, beat, guidance: GUIDE[beat]
  };
}

// Engine action at commission: the arc tag the new adventure carries. Opens
// a new arc when none is running. Claude may name an arc only before its
// first chapter is finished; the count and beat always come from here.
function arcSlot(state, raw) {
  const c = state.chronicle?.version === VERSION ? state.chronicle : normalize(state);
  if (!c.arc) { c.arcCount += 1; c.arc = { id: `arc-${c.arcCount}`, n: c.arcCount, title: '', premise: '', length: ARC_LENGTH, done: 0, chapters: [], hook: '', ending: '' }; }
  const a = c.arc;
  if (a.done === 0) { a.title = clean(raw?.title, T.title) || a.title || 'Untitled arc'; a.premise = clean(raw?.premise, T.wants) || a.premise; }
  return arcTag({ id: a.id, title: a.title, premise: a.premise, chapter: a.done + 1, of: a.length, hook: raw?.nextHook });
}

// The Journal's "Your story so far", plus people and open threads.
function journal(state) {
  const c = state.chronicle;
  const out = { chronicle: [], relationships: [], leads: [] };
  if (!c) return out;
  if (c.earlier) out.chronicle.push({ id: 'chronicle:earlier', title: 'Earlier chapters', status: 'condensed', text: c.earlier });
  for (const a of c.arcs || []) out.chronicle.push({ id: `arc-done:${a.n}`, title: `Story arc ${a.n}: ${a.title}`, status: 'arc complete', text: [a.premise, a.ending ? `How it ended: ${/[.!?]$/.test(a.ending) ? a.ending : a.ending + '.'}` : ''].filter(Boolean).join(' '), source: a.chapters.length ? `Chapters ${a.chapters[0]} to ${a.chapters.at(-1)}` : '' });
  for (const ch of c.chapters) {
    const parts = [ch.brief, ch.outcome ? `It was ${ch.outcome}.` : '', ch.choice ? `You chose: ${ch.choice}. ${ch.consequence}` : ''].filter(Boolean);
    out.chronicle.push({ id: `chronicle:${ch.n}`, title: `Chapter ${ch.n}: ${ch.title}`, status: ch.kind, text: parts.join(' '), source: `${ch.arc ? `${ch.arc}, part ${ch.part} of ${ch.parts}. ` : ''}Day ${ch.day}, level ${ch.level}${ch.region ? `, ${ch.region}` : ''}` });
  }
  for (const p of c.cast) {
    out.relationships.push({ id: `cast:${key(p.name)}`, title: p.name, status: p.status === 'alive' ? p.attitude : p.status, text: [p.role, p.wants ? `Wants: ${p.wants}.` : ''].filter(Boolean).join(' ') || 'Met on the road.', source: `Your story, last seen in chapter ${p.last}` });
  }
  if (c.arc && c.arc.done > 0) out.leads.push({ id: `arc:${c.arc.n}`, title: `Story arc: ${c.arc.title}`, status: `part ${c.arc.done + 1} of ${c.arc.length} next`, text: [c.arc.premise, c.arc.hook ? `Next: ${c.arc.hook}` : ''].filter(Boolean).join(' '), source: 'Your story' });
  c.threads.filter(t => t.status === 'open').forEach((t, i) => out.leads.push({ id: `thread:${t.opened}:${i}`, title: 'Open thread', status: 'open', text: t.text, source: `Your story, since chapter ${t.opened}` }));
  return out;
}

module.exports = { VERSION, MAX_CHAPTERS, MAX_EARLIER, STATUS, ATTITUDE, ARC_LENGTH, BEATS, normalize, record, forPrompt, arcBrief, arcSlot, arcTag, journal };
