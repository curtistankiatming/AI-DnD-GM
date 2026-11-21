'use strict';
// Book Two, "The Council of Small Voices": the written story from level 10 to
// 20 (docs/STORY-BIBLE.md). Chapters are authored expeditions in
// src/data/quests.json with "book": 2; their camp scenes are in scenes.json.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Book = require('../src/book');
const { STORY_NODES, ENEMIES } = require('../src/content');
const { QUESTS, TOWNS, SCENES } = require('../src/expansion');
const draft = require('./fixtures/director-draft');
const high = () => .999999;
// With BRIARWATCH_PREVIEW_BOOKS, Book Three follows Book Two and the books do not end here.
const PREVIEW = /^(1|true|yes|on)$/i.test(String(process.env.BRIARWATCH_PREVIEW_BOOKS || ''));

const TWO = Object.values(QUESTS).filter((q) => q.book === 2);
function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Rowan', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }
function act(s, a, rng = high) { const r = E.resolveAction(s, a, rng); assert.equal(r.result.ok, true, r.result.error); return r; }
// A hero at the town where a chapter starts, with every earlier chapter done.
function ready(id, { cls = 'fighter', nessa = true, flags = {} } = {}) {
  const q = QUESTS[id];
  let s = hero(cls, q.level); s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === id) break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', ...(q.town === 'briarwatch' || q.town === 'highpass' ? [] : [q.town])]; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`;
  Object.assign(s.story.flags, flags); W.init(s);
  if (nessa) s = act(s, { type: 'recruit' }).state;
  return s;
}
const told = (s) => (s.story.lastOutcome?.dialogue || []).map((l) => l.narration || `${l.speaker}: ${l.text}`).join('\n');

test('Book Two follows Book One in order, from Highpass to Merrowgate', () => {
  assert.deepEqual(TWO.slice(0, 3).map((q) => [q.id, q.unlock, q.town, q.nextTown || q.town]), [
    ['chairs', 'aftermath', 'highpass', 'highpass'],
    ['fenmere', 'chairs', 'highpass', 'briarwatch'],
    ['southroad', 'fenmere', 'briarwatch', 'merrowgate']
  ]);
  assert.ok(TOWNS.merrowgate);
  for (const q of TWO) {
    assert.ok(STORY_NODES[`q-${q.id}-start`] && STORY_NODES[`q-${q.id}-after`], q.id);
    assert.ok(q.decisions.length >= 2, `${q.id} ends on a real choice`);
    assert.ok(Array.isArray(q.opening) && Array.isArray(q.crisis), `${q.id} is written as scenes, not summaries`);
  }
  assert.equal(Book.bookOf('chairs').title, 'The Council of Small Voices');
  assert.equal(Book.bookOf('road').title, 'The Bell Beneath Briarwatch');
});

// Curtis, 21 November 2026: chapters pay about 70% of a level; side jobs,
// bounties and battles make up the rest (src/xp.js CHAPTER_SHARE).
test('each chapter pays about 70% of its level, like Book One', () => {
  for (const q of TWO.filter((x) => x.xp > 0)) {
    const band = P.levelBand(q.level);
    assert.ok(q.xp >= band * 0.65 && q.xp <= band * 0.75, `${q.id}: ${q.xp} XP for a ${band} XP level`);
  }
});

test('the council chapter has conversations before setting out, and they cost nothing', () => {
  let s = ready('chairs');
  s = act(s, { type: 'depart', questId: 'chairs' }).state;
  assert.equal(s.story.nodeId, 'q-chairs-start');
  assert.match(E.buildView(s).scene.opening, /It does not have enough chairs/);
  const talks = E.buildView(s).scene.choices.filter((c) => c.id.startsWith('talk-')).map((c) => c.id);
  assert.deepEqual(talks, ['talk-elske', 'talk-brannagh', 'talk-aveline']);
  const before = { xp: s.player.xp, gold: s.player.gold, orin: s.party.find((m) => m.id === 'orin').bond };
  const r = act(s, { type: 'story-choice', choiceId: 'talk-aveline' });
  assert.match(told(r.state), /Aveline: I slept on the cart\./);
  assert.equal(r.state.player.xp, before.xp); assert.equal(r.state.player.gold, before.gold);
  assert.equal(r.state.party.find((m) => m.id === 'orin').bond, before.orin + 1);
  assert.equal(r.state.story.nodeId, 'q-chairs-start', 'A conversation keeps you in the scene.');
  const again = E.buildView(r.state).scene.choices.find((c) => c.id === 'talk-aveline');
  assert.ok(!again || again.completed, 'Each conversation is had once.');
  const elske = act(r.state, { type: 'story-choice', choiceId: 'talk-elske' }).state;
  assert.equal(elske.story.flags['b2:met_elske'], true);
});

test('lines for a companion who is not in the party are left out', () => {
  let s = ready('chairs', { nessa: false });
  s = act(s, { type: 'depart', questId: 'chairs' }).state;
  const opening = E.buildView(s).scene.opening;
  assert.doesNotMatch(opening, /^Nessa:/m);
  assert.match(opening, /^Orin: Understood\./m);
  const withNessa = act(ready('chairs'), { type: 'depart', questId: 'chairs' }).state;
  assert.match(E.buildView(withNessa).scene.opening, /^Nessa: Can't we just go\?/m);
});

test('every Book Two battle has its own enemies, named for the story', () => {
  assert.equal(ENEMIES['gloam-tide-retainer'].name, 'Mist-Taken Shape');
  assert.equal(ENEMIES['gloam-tide'].attack.name, 'Cold Forgetting');
  assert.equal(ENEMIES['sergeant-brask-retainer'].name, 'Beacon Crew Veteran');
  for (const q of TWO) assert.ok(ENEMIES[q.foe] && ENEMIES[q.foe].level >= q.level - 1, q.id);
});

test('a chapter plays through to its camp scene, then to the next town', () => {
  let s = ready('fenmere');
  s = act(s, { type: 'depart', questId: 'fenmere' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'investigate' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'careful' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'resolve' }).state;
  assert.equal(s.story.nodeId, 'q-fenmere-after');
  const xp = s.player.xp;
  const r = act(s, { type: 'story-choice', choiceId: 'above' });
  s = r.state;
  assert.ok(s.world.completed.fenmere); assert.equal(s.story.flags.fen_build_above, true);
  assert.ok(s.player.xp >= xp + QUESTS.fenmere.xp, 'The chapter pays its XP.');
  assert.equal(s.story.nodeId, 'scene-fenmere-bakery-shop');
  assert.match(E.buildView(s).scene.opening, /The baker's ward: We open at six\./);
  s = act(s, { type: 'story-choice', choiceId: 'tell' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'road' }).state;
  assert.equal(s.story.nodeId, 'town-briarwatch');
});

test('the south road ends in Merrowgate, and Hal\'s company goes where you sent it', () => {
  let s = ready('southroad');
  s.story.nodeId = 'q-southroad-after'; s.world.activeQuest = 'southroad'; s.world.onExpedition = true;
  s = act(s, { type: 'story-choice', choiceId: 'guild' }).state;
  assert.equal(s.story.flags.south_hal_guild, true);
  assert.ok(s.world.unlockedTowns.includes('merrowgate'));
  assert.equal(s.story.nodeId, 'scene-southroad-camp-fire');
  s = act(s, { type: 'story-choice', choiceId: 'leave' }).state;
  assert.equal(s.story.nodeId, 'town-merrowgate');
});

test('while Book Two is still being written, its last written chapter says "to be continued"', { skip: !Book.WRITING }, () => {
  const last = Book.CHAPTERS.at(-1);
  let s = ready(last.id);
  s.story.nodeId = `q-${last.id}-after`; s.world.activeQuest = last.id; s.world.onExpedition = true;
  const r = act(s, { type: 'story-choice', choiceId: last.decisions[0].id });
  assert.equal(r.state.story.flags[Book.FINISHED], undefined, 'The save does not become an AI story.');
  assert.equal(r.view.world.book.waiting, true);
  // Through the chapter's last scene to town, where "to be continued" is said
  // (straight away if the chapter has no scene); the AI may still write small
  // side quests, capped below the next chapter.
  let t = r.state; const events = [...r.events];
  for (let i = 0; i < 8 && !E.buildView(t).world.town; i++) { const x = act(t, { type: 'story-choice', choiceId: E.buildView(t).scene.choices[0].id }); t = x.state; events.push(...x.events); }
  assert.equal(events.filter((e) => /^To be continued\./.test(e.text)).length, 1);
  const made = act(t, { type: 'director-commission', draft: draft() });
  assert.equal(made.state.director.quests[made.result.questId].side, true);
  assert.equal(Book.levelCap(made.state), Book.LAST_LEVEL + 1);
});

test("chapters 4 to 6: Merrowgate, Maren's keeper and Hollin's Reach, then on to Cinder Fold", () => {
  assert.deepEqual(['harbour', 'keeper', 'hollin'].map((id) => [QUESTS[id].unlock, QUESTS[id].town, QUESTS[id].nextTown || QUESTS[id].town]), [
    ['southroad', 'merrowgate', 'merrowgate'], ['harbour', 'merrowgate', 'merrowgate'], ['keeper', 'merrowgate', 'cinderfold']
  ]);
  assert.ok(TOWNS.cinderfold);
  // Hal's tip depends on where you sent her company on the south road.
  const guild = act(ready('harbour', { flags: { south_hal_guild: true } }), { type: 'depart', questId: 'harbour' }).state;
  const ids = (st) => E.buildView(st).scene.choices.map((c) => c.id);
  assert.ok(ids(guild).includes('talk-hal-guild'));
  const council = act(ready('harbour', { flags: { south_hal_council: true } }), { type: 'depart', questId: 'harbour' }).state;
  const locked = E.buildView(council).scene.choices.find((c) => c.id === 'talk-hal-guild');
  assert.ok(!locked || locked.locked, 'The guild-coat scene only plays if Hal took the guild contract.');
  // Elske makes her offer in public at the harbour sale.
  assert.match(STORY_NODES['q-harbour-after'].opening, /Warden of the Chorus/);
  assert.match(STORY_NODES['q-harbour-after'].opening, /two-thirds/);
  // Hollin's Reach has no lighter moment: no Book Two chapter's crisis is played for laughs, and this one says who voted to wait.
  assert.match(STORY_NODES['q-hollin-start'].choices.find((c) => c.id === 'investigate').success.text, /Elske votes to wait/);
});

test('the written chapters are never confused with an AI story', () => {
  const s = ready('chairs');
  assert.equal(Book.chapter(s).id, 'chairs');
  assert.equal(Book.aiStory(s), false);
  assert.equal(JSON.parse(require('../src/director').prompt(s)).book.book, 'The Council of Small Voices');
});

test('every Book Two scene and talk speaks only for characters who exist', () => {
  const companions = new Set(['orin', 'maren', 'nessa']);
  for (const scene of Object.values(SCENES).filter((x) => x?.nodes && QUESTS[x.after]?.book === 2)) {
    for (const node of Object.values(scene.nodes)) for (const line of node.lines || []) if (companions.has(line.say) && scene.cast.length) assert.ok(scene.cast.includes(line.say), `${scene.id}: ${line.say} speaks but is not in the cast`);
  }
  for (const q of TWO) for (const t of q.talks || []) for (const id of Object.keys(t.approval || {})) assert.ok(companions.has(id), `${q.id}/${t.id}`);
});

test('chapters 7 to 10 run Cinder Fold, Briarwatch, Cinder Fold, then home', () => {
  assert.deepEqual(['cinderfold', 'vote', 'motherbell', 'oath'].map((id) => [QUESTS[id].level, QUESTS[id].town, QUESTS[id].nextTown || QUESTS[id].town]), [
    [16, 'cinderfold', 'briarwatch'], [17, 'briarwatch', 'cinderfold'], [18, 'cinderfold', 'cinderfold'], [19, 'cinderfold', 'briarwatch']
  ]);
  assert.equal(Book.CHAPTERS.filter((q) => (q.book || 1) <= 2).at(-1).id, 'oath');
  if (!PREVIEW) assert.equal(Book.WRITING, null, 'Book Two is complete.');
});

test('the Mother Bell is told the way the vote went', () => {
  const opening = (flag) => { const s = act(ready('motherbell', { flags: { [flag]: true } }), { type: 'depart', questId: 'motherbell' }).state; return E.buildView(s).scene.opening; };
  assert.match(opening('vote_elske_won'), /Warden of the Chorus, takes the council's authority/);
  assert.doesNotMatch(opening('vote_elske_won'), /lost the vote/);
  assert.match(opening('vote_elske_lost'), /lost the vote and abided by it/);
  assert.match(opening('vote_elske_lost'), /^Orin: I know\./m, 'Orin asks for the stew the night before.');
});

test("Elske's charge names what this hero decided alone, and nothing they didn't", () => {
  const charge = (flags) => E.buildView(act(ready('oath', { flags }), { type: 'depart', questId: 'oath' }).state).scene.opening;
  const a = charge({ b2_cost_party: true, fen_promise: true, harbour_keepers: true });
  assert.match(a, /put your own fee on the table/); assert.match(a, /promised three hundred people/); assert.match(a, /gave away a harbour/);
  assert.doesNotMatch(a, /Merrowgate's loan|named Haverick|lamp receipts/);
  const b = charge({ b2_cost_loan: true, keeper_kept_receipts: true, wards_seat: true });
  assert.match(b, /Merrowgate's loan/); assert.match(b, /lamp receipts/); assert.match(b, /carries Aster Vey's voice/);
  assert.doesNotMatch(b, /own fee|gave away a harbour/);
});

test('the last chapter ends the books, then the epilogue records the Second Oath', { skip: PREVIEW && 'Book Three follows in the preview (tests/book-three.test.js)' }, () => {
  let s = ready('oath');
  s.story.nodeId = 'q-oath-after'; s.world.activeQuest = 'oath'; s.world.onExpedition = true;
  const r = act(s, { type: 'story-choice', choiceId: 'seat' });
  // The hand-over to the AI waits until the epilogue is over (Codex review, finding 5).
  assert.ok(!r.events.some((e) => e.text === Book.ENDING));
  assert.equal(r.state.story.flags[Book.FINISHED], true);
  assert.equal(r.state.story.flags.elske_seat, true);
  assert.equal(r.state.story.nodeId, 'scene-oath-epilogue-oath');
  s = act(r.state, { type: 'story-choice', choiceId: 'council' }).state;
  assert.equal(s.story.flags.second_oath, 'council');
  assert.equal(s.story.nodeId, 'scene-oath-epilogue-forge');
  s = act(s, { type: 'story-choice', choiceId: 'nessa-post' }).state;
  assert.equal(s.story.flags.nessa_keeper, 'later');
  const home = act(s, { type: 'story-choice', choiceId: 'home' });
  assert.ok(home.events.some((e) => e.text === Book.ENDING), 'Told once the hero is home.');
  s = home.state;
  assert.equal(s.story.nodeId, 'town-briarwatch');
  assert.equal(s.story.flags['books:ending-due'], undefined);
  assert.equal(E.buildView(s).world.booksComplete, true);
  assert.equal(E.buildView(s).world.director.sideQuests, false, 'After the books, the AI writes full adventures.');
});

// Fixes from docs/reviews/codex-bard-book-two-2026-11-19.md.
test('Aster Vey reaches the hero whether or not they carried the silver chime out of the vault', () => {
  const opening = (chime) => { let s = ready('cinderfold'); if (chime) s.player.inventory.push({ itemId: 'silver-chime', quantity: 1 }); s = act(s, { type: 'depart', questId: 'cinderfold' }).state; return E.buildView(s).scene.opening; };
  const withChime = opening(true), without = opening(false);
  assert.match(withChime, /the silver chime you carried out of the bell-vault/); assert.doesNotMatch(withChime, /niche by the hearth/);
  assert.match(without, /little bronze bell in the niche by the hearth/); assert.doesNotMatch(without, /silver chime you carried/);
  assert.match(without, /Wren takes the little bell/);
  for (const text of [withChime, without]) assert.match(text, /^Aster Vey: Your council argues/m);
});

test('a lawful Warden can be recalled at the Mother Bell, at a cost, and the hearing remembers it', () => {
  const crisis = (flag) => { const s = ready('motherbell', { flags: { [flag]: true } }); s.story.nodeId = 'q-motherbell-crisis'; s.world.activeQuest = 'motherbell'; s.world.onExpedition = true; return s; };
  assert.ok(!E.buildView(crisis('vote_elske_lost')).scene.choices.some((c) => c.id === 'recall'), 'No recall without a lawful Warden.');
  const s = crisis('vote_elske_won');
  assert.ok(E.buildView(s).scene.choices.some((c) => c.id === 'recall'));
  const r = act(s, { type: 'story-choice', choiceId: 'recall' });
  assert.equal(r.state.story.flags.mother_recalled, true);
  assert.equal(r.state.story.nodeId, 'q-motherbell-after');
  assert.match(told(r.state), /lost the third verse again/);
  const hearing = E.buildView(act(ready('oath', { flags: { vote_elske_won: true, mother_recalled: true } }), { type: 'depart', questId: 'oath' }).state).scene.opening;
  assert.match(hearing, /waited for the council to recall me/);
  const crisisText = (flags) => { const t = ready('oath', { flags }); t.story.nodeId = 'q-oath-start'; return act(t, { type: 'story-choice', choiceId: 'advance' }).state; };
  const lawful = act(crisisText({ vote_elske_won: true }), { type: 'story-choice', choiceId: 'direct' }).state;
  assert.match(E.buildView(lawful).scene.opening, /used the power exactly as written/);
});

test('the lamp-man brings the receipts before you decide what to do with them', () => {
  assert.match(STORY_NODES['q-keeper-after'].opening, /Lamp-man: Every receipt I've signed/);
});

test('pledging your fee for Fenmere says the council pays it back', () => {
  const party = QUESTS.chairs.decisions.find((d) => d.id === 'party');
  assert.match(party.label, /Pledge your contract fee/);
  assert.match(party.description, /repays your pledge/);
});

// Second Codex review of Book Two (docs/reviews/codex-bard-book-two-rerun-2026-11-19.md).
const atCrisis = (id, flags, nessa = true) => { const s = ready(id, { flags, nessa }); s.story.nodeId = `q-${id}-crisis`; s.world.activeQuest = id; s.world.onExpedition = true; return s; };
test('starting a fight tells only the version of the vote this hero lived through', () => {
  const lost = act(atCrisis('motherbell', { vote_elske_lost: true }), { type: 'story-choice', choiceId: 'objective' }).state;
  assert.ok(lost.combat?.active);
  assert.match(lost.combat.intro, /without the council's leave/);
  assert.doesNotMatch(lost.combat.intro, /lawfully, as Warden|can be recalled/);
  const hearing = act(atCrisis('oath', { vote_elske_lost: true }), { type: 'story-choice', choiceId: 'objective' }).state;
  assert.match(hearing.combat.intro, /She was never Warden/);
  assert.doesNotMatch(hearing.combat.intro, /lawful Warden|We recalled her/);
  assert.doesNotMatch(ENEMIES['single-note'].name, /Warden/, 'Her title is not in the enemy list on routes that never granted it.');
  assert.equal(ENEMIES['elske-marrow'], undefined, 'The hearing never makes Elske herself the enemy.');
});

test('if the bell-rope was locked away, the hearing is about the key, not a hanging rope', () => {
  const opening = (flags) => E.buildView(atCrisis('oath', flags)).scene.opening;
  const silenced = opening({ vote_elske_lost: true, mother_silenced: true });
  assert.match(silenced, /only key is in your pocket/);
  assert.doesNotMatch(silenced, /getting to the bell first/);
  assert.match(opening({ vote_elske_lost: true, mother_chorus: true }), /getting to the bell first/);
  assert.doesNotMatch(QUESTS.oath.objective.label, /rope/);
});

test('after the recall the delegates are already in the hall', () => {
  const r = act(atCrisis('motherbell', { vote_elske_won: true }), { type: 'story-choice', choiceId: 'recall' });
  const after = E.buildView(r.state).scene.opening;
  assert.match(after, /delegates are still in the hall/);
  assert.doesNotMatch(after, /coming up the mountain road|came up the mountain/);
});

test('keeping the receipts costs 60 gold, and the rest of the Sallows stays dark', () => {
  let s = ready('keeper'); s.story.nodeId = 'q-keeper-after'; s.world.activeQuest = 'keeper'; s.world.onExpedition = true;
  const keep = E.buildView(s).scene.choices.find((c) => c.id === 'keep');
  assert.match(keep.description, /60 gold/);
  const before = s.player.gold;
  s = act(s, { type: 'story-choice', choiceId: 'keep' }).state;
  assert.equal(s.player.gold, before + QUESTS.keeper.gold - 60);
  assert.match(E.buildView(s).scene.opening, /six new lamps.*rest of the Sallows is as dark/s);
});

// Third Codex review of Book Two (docs/reviews/codex-bard-book-two-third-run-2026-11-19.md).
test('with the rope locked away, the hearing shows how the bell could still ring', () => {
  const s = atCrisis('oath', { vote_elske_lost: true, mother_silenced: true });
  assert.match(E.buildView(s).scene.opening, /hum, with no rope on it.*ladder/s);
  const failed = act(s, { type: 'story-choice', choiceId: 'resolve' }, () => 0).state;
  assert.ok(failed.combat?.active);
  assert.match(failed.story.lastOutcome.text, /get up the ladder/);
  assert.doesNotMatch(failed.story.lastOutcome.text, /only key is in your pocket/, 'The fight starts at the climb, without retelling the scene before it.');
});

test('the hearing always lets you try to persuade Elske; skipping the reflection only makes it harder', () => {
  let s = ready('oath', { flags: { vote_elske_lost: true } });
  s = act(s, { type: 'depart', questId: 'oath' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'direct' }).state;
  const resolve = E.buildView(s).scene.choices.find((c) => c.id === 'resolve');
  assert.ok(resolve && !resolve.disabled && !resolve.locked, 'Persuasion is offered without the reflection.');
  const dc = (state) => act(state, { type: 'story-choice', choiceId: 'resolve' }).events.find((e) => e.roll).roll.dc;
  const withLead = structuredClone(s); withLead.story.clues.push('oath-evidence');
  assert.equal(dc(s), dc(withLead) + 2);
});

test('a fumbled speech or a bad afternoon of door-knocking hurts nobody', () => {
  for (const id of ['oath', 'vote']) {
    assert.equal(QUESTS[id].route.safe, true, id);
    let s = ready(id, { flags: { vote_elske_lost: true } });
    s = act(s, { type: 'depart', questId: id }).state;
    s = act(s, { type: 'story-choice', choiceId: 'advance' }).state;
    const hp = [s.player.hp, ...s.party.map((m) => m.hp)];
    s = act(s, { type: 'story-choice', choiceId: 'careful' }, () => 0).state;
    assert.deepEqual([s.player.hp, ...s.party.map((m) => m.hp)], hp, id);
    assert.equal(s.story.nodeId, `q-${id}-crisis`);
  }
});

test("the lamp-man thanks you for what you actually did at the hospice", () => {
  const s = atCrisis('keeper', {});
  s.story.clues.push('keeper-evidence');
  const after = act(s, { type: 'story-choice', choiceId: 'resolve' }).state;
  const text = E.buildView(after).scene.opening;
  assert.match(text, /because you stayed and talked/);
  assert.doesNotMatch(text, /You held that door/);
});

// Fourth Codex review of Book Two (docs/reviews/codex-bard-book-two-fourth-run-2026-11-20.md).
test('a peaceful ending never credits a lead the hero skipped', () => {
  const peace = (id, flags, clue) => {
    // A sure roll: these tests are about which words are told, not the odds.
    const s = atCrisis(id, { ...flags, [`prepared:${id}`]: true, [`approach:${id}`]: true }); s.player.inspirationPrepared = true; s.player.abilities.cha = 30;
    if (clue) s.story.clues.push(`${id}-evidence`);
    const r = act(s, { type: 'story-choice', choiceId: 'resolve' });
    return { before: E.buildView(s).scene.opening, after: r.state.story.lastOutcome.text, said: r.result.outcomeText };
  };
  const vote = (clue) => peace('vote', {}, clue).after;
  assert.match(vote(true), /exactly who the carters are/);
  assert.doesNotMatch(vote(false), /exactly who the carters are/);
  assert.match(vote(false), /Nobody knows who the carters are/);
  assert.doesNotMatch(peace('vote', {}, false).said, /exactly who the carters are/, 'The text sent on to chat narration is filtered too.');
  const fen = (clue) => peace('fenmere', {}, clue);
  assert.match(fen(true).before, /I have the verse/);
  assert.doesNotMatch(fen(false).before, /I have the verse/);
  assert.match(fen(false).after, /Nobody knew she knew it/);
  const bell = (clue) => peace('motherbell', { vote_elske_lost: true }, clue).after;
  assert.match(bell(true), /You tell her what the founders wrote/);
  assert.match(bell(false), /None of you ever found what the founders wrote/);
});

test('talking Elske down with the rope locked away looks up at the beam, not a rope', () => {
  const s = atCrisis('oath', { vote_elske_lost: true, mother_silenced: true, 'prepared:oath': true, 'approach:oath': true }); s.player.inspirationPrepared = true; s.player.abilities.cha = 30;
  const text = act(s, { type: 'story-choice', choiceId: 'resolve' }).state.story.lastOutcome.text;
  assert.match(text, /great beam/);
  assert.doesNotMatch(text, /humming bell/);
});

// Fifth Codex review: a fresh bard from level 1 to 21 (docs/reviews/codex-bard-level1-21-2026-11-20.md).
test('the tollhouse never hands an unprepared hero receipts they did not find', () => {
  const view = (clue) => { const s = atCrisis('road', {}, false); if (clue) s.story.clues.push('road-evidence'); return E.buildView(s).scene; };
  const lead = view(true), none = view(false);
  assert.match(lead.choices.find((c) => c.id === 'resolve').label, /duplicate receipts/);
  assert.match(none.choices.find((c) => c.id === 'resolve').label, /Ask the drivers/);
  assert.match(lead.opening, /leave the documents/);
  assert.doesNotMatch(none.opening, /documents/);
  const s = atCrisis('road', { 'prepared:road': true, 'approach:road': true }, false); s.player.inspirationPrepared = true; s.player.abilities.cha = 30;
  const text = act(s, { type: 'story-choice', choiceId: 'resolve' }).state.story.lastOutcome.text;
  assert.match(text, /Without the captain's papers/);
  assert.doesNotMatch(text, /read what they have been paid/);
});

test("Maren's late reflection doesn't bring back the list she let go", () => {
  const PERSONAL = require('../src/data/personal.json');
  assert.match(PERSONAL.maren.resolution, /on her list/);
  const late = PERSONAL.maren.resolutionIf.find((r) => r.flag === 'keeper-list-done').text;
  assert.doesNotMatch(late, /on her list/);
  assert.match(late, /old list is gone/);
});

test('if you spared Lysa, she is on the Merrowgate quay', () => {
  const talks = (flags) => { const s = act(ready('harbour', { flags }), { type: 'depart', questId: 'harbour' }).state; return { s, ids: E.buildView(s).scene.choices.map((c) => c.id) }; };
  assert.ok(!talks({}).ids.includes('talk-lysa'));
  const { s, ids } = talks({ lysaSpared: true });
  assert.ok(ids.includes('talk-lysa'));
  const r = act(s, { type: 'story-choice', choiceId: 'talk-lysa' });
  assert.match(told(r.state), /Lysa: The bell remembers who betrayed it/);
  assert.equal(r.state.story.flags['b2:lysa_turned'], true);
});

test('the bundled sample adventure names the guild it asks you to accuse', () => {
  const sample = draft();
  assert.match(sample.investigate.success, /Brinewright Guild/);
  assert.match(sample.decisions[0].text, /Brinewright Guild/);
});

// Self-review: lines that assumed a choice, a companion or a result the player may not have had.
const { liveLines } = require('../src/expansion');
const RAWQ = require('../src/data/quests.json'), RAWS = require('../src/data/scenes.json');
const rawQuest = (id) => Object.values(RAWQ).find((q) => q.id === id);
const rawScene = (id) => Object.values(RAWS).find((s) => s.id === id);
const heard = (s, lines) => liveLines(s, lines).map((l) => l.text || l.narrate).join('\n');

test('Wren only talks to Nessa at Cinder Fold when Nessa is there', () => {
  const opening = rawQuest('cinderfold').opening;
  const without = heard(ready('cinderfold', { nessa: false }), opening), withNessa = heard(ready('cinderfold'), opening);
  assert.match(without, /pulled me out from under the signal arm/);
  assert.doesNotMatch(without, /^Reed\.$/m);
  assert.match(withNessa, /^Reed\.$/m);
  assert.doesNotMatch(withNessa, /pulled me out from under the signal arm/);
});

test('Aster Vey only thanks you for freeing her if you did', () => {
  const found = [];
  for (const q of Object.values(RAWQ)) JSON.stringify(q, (k, v) => { if (Array.isArray(v) && v.some((l) => l && /Aster Vey|You freed me/.test(l.text || ''))) found.push(v); return v; });
  assert.ok(found.length);
  const freed = found.map((l) => heard(ready('cinderfold', { flags: { spiritFreed: true } }), l)).join('\n');
  const notFreed = found.map((l) => heard(ready('cinderfold'), l)).join('\n');
  assert.match(freed, /You freed me/);
  assert.doesNotMatch(notFreed, /You freed me/);
  assert.match(notFreed, /before it could finish me/);
});

test("the Highpass log is read without Nessa when she isn't with you", () => {
  const success = rawQuest('signal').investigate.success;
  assert.match(heard(ready('signal', { nessa: false }), success), /codebook/);
  assert.doesNotMatch(heard(ready('signal', { nessa: false }), success), /Nessa recognizes/);
  assert.match(heard(ready('signal'), success), /Nessa recognizes/);
});

test('the council does not say it agreed after you fought your way through the chairs', () => {
  const after = rawQuest('chairs').after;
  const said = (m) => heard(ready('chairs', { flags: { 'method:chairs': m } }), after);
  assert.match(said('peace'), /We agreed on something/);
  assert.match(said('force'), /We didn't agree on anything/);
  assert.doesNotMatch(said('force'), /We agreed on something/);
});

test('Hal names whoever actually paid for Fenmere', () => {
  const camp = rawScene('southroad-camp');
  const lines = JSON.parse(JSON.stringify(camp)).nodes;
  const say = Object.values(lines).flatMap((n) => (n.choices || []).flatMap((c) => c.lines));
  const hal = (flag) => heard(ready('southroad', { flags: { [flag]: true } }), say).split('\n').filter((t) => /^Stoneward\. You came/.test(t));
  assert.match(hal('b2_cost_shared').join(), /goat-woman/);
  assert.match(hal('b2_cost_loan').join(), /loan/);
  assert.match(hal('b2_cost_party').join(), /own fee/);
  for (const f of ['b2_cost_shared', 'b2_cost_loan', 'b2_cost_party']) assert.equal(hal(f).length, 1);
});

test('Orin asks about the way you actually ended Hollin\'s memory', () => {
  const lines = Object.values(rawScene('hollin-camp').nodes)[0].lines;
  const asks = (m) => heard(ready('hollin', { flags: { 'method:hollin': m } }), lines).split('\n').filter((t) => /Were you sure/.test(t));
  assert.match(asks('peace').join(), /stood up/);
  assert.match(asks('objective').join(), /tower/);
  assert.match(asks('force').join(), /kept going/);
  for (const m of ['peace', 'objective', 'force']) assert.equal(asks(m).length, 1);
});

test("Orin's Ashford story is told as a memory once Hal has made her choice", () => {
  const PERSONAL = require('../src/data/personal.json');
  for (const flag of ['south_hal_council', 'south_hal_guild']) assert.match(PERSONAL.orin.resolutionIf.find((r) => r.flag === flag).text, /Months after/);
});

test("Brannagh doesn't call the rise home after the council promised the lower village back", () => {
  const found = [];
  for (const q of Object.values(RAWQ)) JSON.stringify(q, (k, v) => { if (Array.isArray(v) && v.some((l) => l && l.say === 'Brannagh' && /rise/.test(l.text || ''))) found.push(v); return v; });
  const promised = found.map((l) => heard(ready('vote', { flags: { fen_promise: true } }), l)).join('\n');
  assert.match(promised, /like they promised/);
});

test('Hal takes her guild coat off on the recall night if she joined the guild', () => {
  const found = [];
  for (const q of Object.values(RAWQ)) JSON.stringify(q, (k, v) => { if (Array.isArray(v) && v.some((l) => l && /Hal/.test(l.text || l.narrate || '') && /coat|company comes up the road/.test(l.text || l.narrate || ''))) found.push(v); return v; });
  const guild = found.map((l) => heard(ready('motherbell', { flags: { south_hal_guild: true } }), l)).join('\n');
  const council = found.map((l) => heard(ready('motherbell', { flags: { south_hal_council: true } }), l)).join('\n');
  assert.match(guild, /coat/);
  assert.doesNotMatch(guild, /Hal's company comes up the road/);
  assert.match(council, /Hal's company comes up the road/);
});

test('in the epilogue, the question about Wren\'s post is not offered without Nessa', () => {
  let s = ready('oath', { nessa: false });
  s.story.nodeId = 'q-oath-after'; s.world.activeQuest = 'oath'; s.world.onExpedition = true;
  s = act(s, { type: 'story-choice', choiceId: 'seat' }).state;
  s = act(s, { type: 'story-choice', choiceId: 'council' }).state;
  assert.equal(s.story.nodeId, 'scene-oath-epilogue-forge');
  assert.deepEqual(E.buildView(s).scene.choices.map((c) => c.id), ['fire']);
  assert.equal(E.resolveAction(s, { type: 'story-choice', choiceId: 'nessa-post' }, () => 0.5).result.ok, false);
  assert.equal(s.story.flags.nessa_keeper, undefined);
});
