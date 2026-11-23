'use strict';
// Side jobs: short optional stories in each Book Two town (src/data/side-jobs.json,
// docs/STORY-BIBLE.md "Side stories"). They pay about 12% of a level, never
// past the current chapter's level, and the main story never needs them.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { STORY_NODES } = require('../src/content');
const { QUESTS, SIDE_JOBS } = require('../src/expansion');
const high = () => .999999, low = () => 0;

function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, `${JSON.stringify(a)}: ${r.result.error}`); return r; }
// A hero in a job's town with the chapters before its window done.
function ready(job, { party = ['orin', 'maren', 'nessa'], flags = {} } = {}) {
  let s = E.createNewGame({ name: 'Rowan', classId: 'bard' });
  const q = QUESTS[job.until] || QUESTS[job.from];
  E.awardXp(s, P.XP_NEXT[q.level - 1], [], 'fixture');
  s.player.gold = 500; s.player.progression.mastery = true; s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === job.until) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', 'merrowgate', 'cinderfold']; s.world.townId = job.town; s.story.nodeId = `town-${job.town}`;
  Object.assign(s.story.flags, flags); W.init(s);
  if (party.includes('nessa')) s = act(s, { type: 'recruit' }).state;
  s.party = s.party.filter((m) => party.includes(m.id));
  return s;
}
const said = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');
// Jobs in the books a player can open now; later books' jobs (Book Three's,
// while it is hidden) are tested with their book (tests/book-three.test.js).
const OPEN_JOBS = Object.values(SIDE_JOBS).filter((j) => [j.from, j.until].filter(Boolean).every((id) => Book.playable(null, id)));
// The Book Two shape: two jobs per town. Later books add their own jobs on top.
const BOOK_TWO_JOBS = OPEN_JOBS.filter((j) => [j.from, j.until].filter(Boolean).every((id) => Book.bookOf(id).n <= 2));

test('two side jobs in each Book Two town, each tied to a stretch of the story', () => {
  const jobs = BOOK_TWO_JOBS;
  const towns = {};
  for (const j of jobs) (towns[j.town] ||= []).push(j.id);
  assert.deepEqual(Object.keys(towns).sort(), ['briarwatch', 'cinderfold', 'highpass', 'merrowgate']);
  for (const [town, ids] of Object.entries(towns)) assert.equal(ids.length, 2, town);
  const order = Book.CHAPTERS.map((q) => q.id);
  for (const j of jobs) {
    assert.ok(order.indexOf(j.from) < order.indexOf(j.until), `${j.id}: its window opens before it closes`);
    assert.ok(STORY_NODES[`job-${j.id}-${j.start}`], j.id);
    // The job is offered in the town the story is in during its window.
    const chapter = QUESTS[j.until];
    assert.ok([chapter.town, QUESTS[j.from].nextTown || QUESTS[j.from].town].includes(j.town), `${j.id} is where the story is`);
  }
  assert.ok(!Book.CHAPTERS.some((q) => SIDE_JOBS[q.id]), 'A side job is never a chapter.');
});

test('a side job shows on the town page while its chapter window is open, and only then', () => {
  const job = SIDE_JOBS.afterdark;
  let s = ready(job);
  const card = E.buildView(s).world.sideJobs.find((j) => j.id === 'afterdark');
  assert.ok(card && card.canStart);
  assert.equal(card.reward.xp, Math.round(0.12 * P.levelBand(job.level)));
  s.world.completed.keeper = { xp: 0, gold: 0 };
  assert.ok(!E.buildView(s).world.sideJobs.some((j) => j.id === 'afterdark'), 'Gone once the story moves past it.');
  const r = E.resolveAction(s, { type: 'side-job', jobId: 'afterdark' }, high);
  assert.equal(r.result.ok, false);
  const away = ready(job); away.story.nodeId = 'town-briarwatch'; away.world.townId = 'briarwatch';
  assert.equal(E.resolveAction(away, { type: 'side-job', jobId: 'afterdark' }, high).result.ok, false, 'Taken in its own town.');
});

// Every way through every job: each choice, each roll both ways, with the full
// party and with nobody, ends back in town with the job paid once.
function paths(job) {
  const out = [];
  const walk = (key, trail) => {
    for (const c of job.nodes[key].choices) {
      const rolls = c.check ? [high, low] : [high];
      for (const rng of rolls) {
        const o = c.check ? (rng === high ? c.success : c.failure) : c;
        const step = [...trail, { choiceId: c.id, rng }];
        if (o.next) walk(o.next, step); else out.push(step);
      }
    }
  };
  walk(job.start, []);
  return out;
}
test('every way through every side job ends in town, paid once, with or without companions', () => {
  for (const job of OPEN_JOBS) for (const party of [['orin', 'maren', 'nessa'], []]) for (const path of paths(job)) {
    const flags = { harbour_keepers: true, b4_company_council: true, b4_vote_share: true }; // every choice's requires: the harbour bell's keepers (Book One), the council's convoy (White-wool), chapter 22's vote (the Other Invoice)
    let s = ready(job, { party, flags });
    const before = { xp: s.player.xp, gold: s.player.gold };
    s = act(s, { type: 'side-job', jobId: job.id }).state;
    assert.equal(s.story.nodeId, `job-${job.id}-${job.start}`);
    const opening = E.buildView(s).scene.opening;
    if (!party.length) assert.doesNotMatch(opening, /^(Orin|Maren|Nessa):/m, `${job.id}: nobody speaks who isn't there`);
    let r;
    for (const step of path) { r = act(s, { type: 'story-choice', choiceId: step.choiceId }, step.rng); s = r.state; }
    const where = `${job.id} ${path.map((p) => p.choiceId).join('>')} [${party.join(',')}]`;
    assert.equal(s.story.nodeId, `town-${job.town}`, where);
    assert.ok(s.world.jobs[job.id], where); assert.equal(s.story.flags[`job:${job.id}`], true, where);
    assert.ok(s.player.xp > before.xp && s.player.xp - before.xp <= Math.round(0.12 * P.levelBand(job.level)), where);
    if (!party.length) assert.doesNotMatch(said(s), /^(Orin|Maren|Nessa):/m, where);
    assert.ok(!E.buildView(s).world.sideJobs.some((j) => j.id === job.id), `${where}: done once`);
    assert.equal(E.resolveAction(s, { type: 'side-job', jobId: job.id }, high).result.ok, false);
  }
});

test('a side job pays gold and XP but never levels the hero past the chapter', () => {
  const job = SIDE_JOBS.well;
  let s = ready(job);
  // At the top of the level the vote chapter is written for.
  s.player.xp = P.XP_NEXT[QUESTS.vote.level] - 1;
  const level = s.player.level, gold = s.player.gold;
  s = act(s, { type: 'side-job', jobId: 'well' }).state;
  const r = act(s, { type: 'story-choice', choiceId: 'dig' });
  assert.equal(r.state.player.level, level);
  assert.equal(r.state.player.xp, P.XP_NEXT[QUESTS.vote.level] - 1);
  assert.equal(r.state.player.gold, gold + job.gold);
  assert.ok(r.events.some((e) => /XP is capped/.test(e.text)));
});

test('a choice that costs gold needs it, and a job left half done picks up where it was', () => {
  const job = SIDE_JOBS.boat;
  let s = ready(job); s.player.gold = 10;
  s = act(s, { type: 'side-job', jobId: 'boat' }).state;
  const pay = E.buildView(s).scene.choices.find((c) => c.id === 'pay');
  assert.ok(pay.locked, 'Thirty gold for the pound is not there.');
  assert.ok(!E.buildView(s).scene.choices.find((c) => c.id === 'pilots') || E.buildView(s).scene.choices.find((c) => c.id === 'pilots').locked, 'The pilots only help if the harbour went to them.');
  s.player.gold = 100;
  s = act(s, { type: 'story-choice', choiceId: 'pay' }).state;
  assert.equal(s.player.gold, 70); assert.equal(s.story.nodeId, 'job-boat-paint');
  s = act(s, { type: 'return-town' }).state;
  s = act(s, { type: 'side-job', jobId: 'boat' }).state;
  assert.equal(s.story.nodeId, 'job-boat-paint', 'Not charged twice.');
  s = act(s, { type: 'story-choice', choiceId: 'sail' }).state;
  assert.match(said(s), /Lenora/);
  assert.equal(s.world.jobs.boat.gold, job.gold);
});

test('the story mentions a side job only if it was done', () => {
  // Penn the job's, not Maud Penney of Book Three's deep (b4-hush).
  const lines = (id) => QUESTS[id].opening.concat(QUESTS[id].after).filter((l) => l.when?.flag?.startsWith('job:'));
  assert.ok(lines('chairs').length + lines('southroad').length >= 2);
  for (const q of Book.CHAPTERS) for (const key of ['opening', 'approach', 'crisis', 'after']) for (const l of Array.isArray(q[key]) ? q[key] : []) {
    if (/Tib|Ada Rusk|Penn\b|Farrow|Mag Tolly|Davy|Ottilie|Gilliam|Willem/.test(l.text || l.narrate || '')) assert.ok(l.when?.flag?.startsWith('job:'), `${q.id}.${key}: ${l.text || l.narrate}`);
  }
});
