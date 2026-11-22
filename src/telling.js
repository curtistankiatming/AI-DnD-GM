'use strict';
// The Telling (docs/book-four/DESIGN.md, "Systems and gameplay"): how Linus
// Pardew's song (the ballad) and the Long Tally at Orme tell what the hero
// did. A written chapter carries one "told" ({ ballad, tally }) for all of its
// decisions, and a decision may carry its own "told", which wins when that
// decision was chosen. The Journal shows both versions side by side ("What
// they tell of you") until the epilogue's "fourth_telling" names who keeps the
// story; from then on only that keeper's version goes on, and it is what the
// AI storyteller is given as the hero's legend after the books.
const { QUESTS } = require('./expansion');

const KEEPERS = Object.freeze(['ballad', 'tally', 'companions', 'none']);
// The neutral legend for a hero who asked that the story not be told, so the
// AI storyteller still has something to continue from.
const UNTOLD = 'The hero of the Long Tally, who asked that the story not be told.';
const clean = v => typeof v === 'string' ? v.trim() : '';

// The told lines of every finished written chapter, in story order:
// [{ id, chapter, ballad, tally }].
function lines(state) {
  const done = state?.world?.completed || {}, flags = state?.story?.flags || {};
  const out = [];
  for (const q of Object.values(QUESTS)) {
    if (!q || q.sideJob || q.generated || !done[q.id]) continue;
    const chosen = (q.decisions || []).find(d => d.flag && flags[d.flag] && d.told);
    const t = chosen?.told || q.told;
    const ballad = clean(t?.ballad), tally = clean(t?.tally);
    if (ballad || tally) out.push({ id: q.id, chapter: q.name, ballad, tally });
  }
  return out;
}
// Who keeps the story, once the epilogue has asked (null before then).
function keeper(state) {
  const v = state?.story?.flags?.fourth_telling;
  return KEEPERS.includes(v) ? v : null;
}
// What each told line shows now: both versions until a keeper is chosen, then
// the keeper's own ("companions" keep both; "none" keeps nothing).
function shown(state) {
  const k = keeper(state);
  if (k === 'none') return [];
  return lines(state).map(x => ({ ...x, ballad: k === 'tally' ? '' : x.ballad, tally: k === 'ballad' ? '' : x.tally })).filter(x => x.ballad || x.tally);
}
// The hero's legend for the AI storyteller, or null when nothing is told.
function legend(state) {
  const k = keeper(state);
  if (k === 'none') return { keeper: 'none', text: UNTOLD, lines: [] };
  const told = shown(state);
  if (!told.length) return null;
  const pick = x => k === 'ballad' ? x.ballad : k === 'tally' ? x.tally : [x.ballad && `Song: ${x.ballad}`, x.tally && `Tally: ${x.tally}`].filter(Boolean).join(' ');
  return { keeper: k, lines: told.slice(-12).map(x => ({ chapter: x.chapter, told: pick(x) })) };
}

module.exports = { KEEPERS, UNTOLD, lines, keeper, shown, legend };
