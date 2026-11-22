'use strict';
// Fixture chapters for Book Four's engine tests (build step 2 of
// docs/book-four/DESIGN.md). Book Four is written a few chapters at a time, so
// these tests stand plain chapters in for the ones not written yet: the ids,
// levels, parts, towns and engine fields the design gives (xp, requiresJob,
// levelFloor, needs, together), with placeholder text and none of the story.
// A chapter or scene written in src/data/book-four/ is used as written, in
// its place in story order, so the engine tests also play the real chapters.
// The fixtures are never shipped: install() puts the merged tables in Node's
// module cache in place of src/data/book-four/quests.json and scenes.json,
// before anything from src/ is loaded, so it must be called at the top of a
// test file.
//
// This relies on node --test running each test file in its own process (its
// default isolation, which scripts/verify.js uses). The fixtures and the
// preview settings install() writes to process.env would otherwise leak into
// every test file loaded after this one in the same process; never run these
// files with --test-isolation=none.
const path = require('node:path');
const Module = require('node:module');

const IDS = ['b4-walker', 'b4-records', 'b4-ballad', 'b4-company', 'b4-davin', 'b4-book', 'b4-key', 'b4-letters', 'b4-embassy', 'b4-peaks',
  'b4-lantry', 'b4-sheddon', 'b4-orme', 'b4-greve', 'b4-thrum', 'b4-reckoning', 'b4-potbells', 'b4-hush', 'b4-column', 'b4-northdoor',
  'b4-knot', 'b4-invoice', 'b4-quietnight', 'b4-gatehouse', 'b4-ford', 'b4-hospice', 'b4-signal', 'b4-ropes', 'b4-lid', 'b4-parting'];
// The design's towns ("Regions and towns"): chapter 11 is taken from
// Highpass's board and played in Lantry (its nextTown), 12 leaves from Lantry,
// 13 to 20 from Orme, and 20 returns the party to Highpass.
const TOWNS = ['highpass', 'ashford', 'briarwatch', 'merrowgate', 'saltwick', 'highpass', 'cinderfold', 'vell', 'highpass', 'highpass',
  'highpass', 'lantry', ...Array(8).fill('orme'),
  'highpass', 'highpass', 'briarwatch', 'highpass', 'ashford', 'merrowgate', 'cinderfold', 'cinderfold', 'cinderfold', 'cinderfold'];
const NEXT = [...TOWNS.slice(1), 'briarwatch'];
// The design's engine fields (engine changes 3, 4, 7 and 10): every Part Two
// chapter has "white": true.
const FLOORS = { 'b4-peaks': 50, 'b4-northdoor': 60, 'b4-parting': 70 };
const NEEDS = { 'b4-davin': ['orin'], 'b4-book': ['maren'], 'b4-key': ['nessa'], 'b4-peaks': ['orin', 'maren', 'nessa'], 'b4-ford': ['orin'], 'b4-hospice': ['maren'], 'b4-signal': ['nessa'] };
const band = (level) => 4000 + 250 * (level - 9); // P.levelBand from level 10

function chapter(id, i) {
  const level = 40 + i, check = (label, skill) => ({ label, skill, alt: [], success: `Fixture: ${label} works.`, failure: `Fixture: ${label} does not, but the way on stays open.` });
  return {
    id, book: 4, part: Math.floor(i / 10) + 1, name: `Fixture ${i + 1}`, level, town: TOWNS[i], nextTown: NEXT[i], unlock: i ? IDS[i - 1] : 'b3-firstbell',
    ...(i === 0 ? { requiresJob: 3 } : {}), ...(i >= 10 && i < 20 ? { white: true } : {}), ...(FLOORS[id] ? { levelFloor: FLOORS[id] } : {}), ...(NEEDS[id] ? { needs: NEEDS[id] } : {}), ...(id === 'b4-signal' ? { together: true } : {}),
    xp: band(level), gold: 20 * level + 40, region: 'Fixture road', threat: 'Fixture threat.', faction: 'wardens', brief: `Fixture chapter ${i + 1}.`,
    opening: 'Fixture opening.', clue: 'Fixture lead.', investigate: check('Look around', 'insight'), route: { ...check('Walk the road', 'athletics'), tools: [] },
    crisis: 'Fixture crisis.', peaceful: check('Talk it down', 'persuasion'),
    objective: { name: 'Fixture marker', label: 'Take the marker', description: 'Fixture objective.', skill: 'athletics', alt: [], target: 4, deadline: 6, failText: 'Fixture: missed.', successText: 'Fixture: taken.' },
    foe: `${id}-foe`, foeName: 'Fixture Foe', enemyTheme: 'soldier', after: 'Fixture after.',
    decisions: [{ id: 'one', label: 'Fixture choice one', text: 'Fixture: one.', flag: `${id.replace('-', '_')}_one` }, { id: 'two', label: 'Fixture choice two', text: 'Fixture: two.', flag: `${id.replace('-', '_')}_two` }]
  };
}
// The written files, read fresh (the engine changes the tables it is given).
const written = (file) => JSON.parse(require('node:fs').readFileSync(path.resolve(__dirname, `../../src/data/book-four/${file}.json`), 'utf8'));
// The chapters already written in src/data/book-four/quests.json.
const WRITTEN = Object.keys(written('quests')).filter((id) => !id.startsWith('_'));
const QUESTS = () => { const real = written('quests'); return Object.fromEntries(IDS.map((id, i) => [id, real[id] || chapter(id, i)])); };
// The epilogue's framing of the 4th job (engine change 5), in one fixture scene.
const FRAMING = 'Fixture: Dera says go and make the next verse true.';
const SCENES = () => ({
  ...Object.fromEntries(Object.entries(written('scenes')).filter(([id]) => !id.startsWith('_'))),
  'b4-fixture-parting': { id: 'b4-fixture-parting', after: 'b4-parting', cast: [], act: 'Fixture', location: 'Fixture hall', start: 'end',
    trialFraming: { flag: 'b4_done', trial: 'fourth', lines: [{ say: 'Dera', text: FRAMING }] },
    nodes: { end: { title: 'Fixture end', objective: 'Go on.', lines: [{ narrate: 'Fixture epilogue.' }], framesTrial: true, choices: [{ id: 'go', label: 'Go on', setFlags: { b4_done: true } }] } } }
});

function cache(file, exports) {
  const m = new Module(file); m.filename = file; m.loaded = true; m.exports = exports;
  require.cache[file] = m;
}
// env: the preview settings this file plays with ({ BRIARWATCH_PREVIEW_BOOKS,
// BRIARWATCH_PREVIEW_PARTS }); a setting given as null is cleared.
function install(env = { BRIARWATCH_PREVIEW_BOOKS: '1' }) {
  const src = path.resolve(__dirname, '../../src');
  if (require.cache[path.join(src, 'expansion.js')]) throw new Error('Install the Book Four fixtures before loading anything from src/.');
  for (const [k, v] of Object.entries(env)) { if (v === null) delete process.env[k]; else process.env[k] = v; }
  cache(path.join(src, 'data/book-four/quests.json'), QUESTS());
  cache(path.join(src, 'data/book-four/scenes.json'), SCENES());
  return { IDS, WRITTEN, FLOORS, NEEDS, FRAMING };
}

module.exports = { install, IDS, WRITTEN, FLOORS, NEEDS, FRAMING };
