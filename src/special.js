'use strict';
// Special monsters (src/data/special-monsters.json; Curtis, 25 November 2026:
// "some encounters can be special monsters with increased difficulty,
// substantial exp provision and also unique equipments").
//
// Each is an optional hunt on the opening scene of one written chapter. Its
// fight is built like the chapter's own (a boss and two retainers from
// src/xp.js foeStats), but as if the chapter were the monster's "power" levels
// higher, with SPECIAL_HP times the boss's health, +SPECIAL_ATTACK to hit and
// +1 armour, so it is much harder than anything else in the chapter. A win pays
// SPECIAL_SHARE of the chapter level's XP (three bounties or so), never past
// what written side content may give (Book.capJobXp), and the monster's own
// accessory, once per save. A loss or a retreat costs only health: the party
// falls back to the chapter's opening scene and may hunt it again. The
// chapter's level, its "more than 5 levels under" pressure, Gritty past 40 and
// Book Four's white all apply as they do to the chapter's fight.
const XP = require('./xp');

const SPECIAL_SHARE = 0.3, SPECIAL_HP = 1.6, SPECIAL_ATTACK = 1, LOST_HP = 0.4;
const MONSTERS = Object.freeze(Object.fromEntries(Object.entries(require('./data/special-monsters.json')).filter(([k, v]) => !k.startsWith('_') && v && v.chapter)));
const encounterId = (id) => `special:${id}`;
const wonNode = (id) => `special-${id}-won`, lostNode = (id) => `special-${id}-lost`;
const of = (encounter) => (encounter?.special && MONSTERS[encounter.special]) || null;
const forChapter = (qid) => Object.values(MONSTERS).find((m) => m.chapter === qid) || null;

// "power" (in the data) is how many levels stronger than its chapter a
// monster hits and lasts, tuned by simulated fights (a fresh party of four
// wins about 70 to 95% of the time, with about half its health left; the
// chapter's own fight is won every time with about three quarters left).
const power = (m) => Math.max(0, Number(m.power) || 0);
const hpScale = () => SPECIAL_HP;
// Builds every monster's enemies, encounter and story nodes, and adds its hunt
// to its chapter's opening scene. Called by src/expansion.js once the chapters exist.
function install({ QUESTS, STORY_NODES, ENCOUNTERS, ENEMIES, choice }) {
  for (const m of Object.values(MONSTERS)) {
    const q = QUESTS[m.chapter];
    const start = STORY_NODES[`q-${m.chapter}-start`];
    if (!q || !start) throw new Error(`Special monster ${m.id} names an unknown chapter ${m.chapter}`);
    const f = XP.foeStats(XP.challenge({ level: q.level, power: q.level + power(m) }));
    const boss = `special-${m.id}`, minion = `special-${m.id}-retainer`;
    ENEMIES[boss] = { id: boss, name: m.name, maxHp: Math.round(f.main.maxHp * hpScale(q.level)), ac: f.main.ac + 1, level: q.level, abilities: { str: 16, dex: 13, con: 16, int: 6, wis: 13, cha: 8 }, attack: { name: m.attackName, bonus: f.main.attackBonus + SPECIAL_ATTACK, damage: f.main.damage, damageType: m.damageType || 'slashing' }, aiRole: 'boss', tags: m.tags || [], resistances: m.resistances || [], xp: 0, special: true };
    ENEMIES[minion] = { id: minion, name: m.retainerName, maxHp: f.retainer.maxHp, ac: f.retainer.ac, level: q.level, abilities: { str: 12, dex: 13, con: 12, int: 4, wis: 11, cha: 6 }, attack: { name: 'Snapping Strike', bonus: f.retainer.attackBonus, damage: f.retainer.damage, damageType: m.damageType || 'slashing' }, aiRole: 'soldier', tags: m.tags || [], resistances: [], xp: 0 };
    ENCOUNTERS[encounterId(m.id)] = { id: encounterId(m.id), name: m.name, special: m.id, chapter: m.chapter, enemies: [boss, minion, minion], storyScale: 0.82, standardScale: 1, grittyScale: 1.18, xp: 0, loot: [], intro: `${m.name} comes for you. This is a special monster: far stronger than the chapter's own fight.`, victoryNode: wonNode(m.id), defeatNode: lostNode(m.id) };
    const back = (label) => [choice('back', label, { once: false, description: 'Back to the chapter. Take a short rest there if you have not rested there yet, or return to town to recover fully before you go on.', result: { nextNode: start.id } })];
    STORY_NODES[wonNode(m.id)] = { id: wonNode(m.id), act: `Special monster • Level ${q.level}`, title: m.name, location: q.region, objective: 'Go back to the chapter.', lines: m.won, safeRest: false, questId: q.id, phase: 'start', choices: back('Go back to the work in hand') };
    STORY_NODES[lostNode(m.id)] = { id: lostNode(m.id), act: `Special monster • Level ${q.level}`, title: `${m.name} is still out there`, location: q.region, objective: 'Fall back, rest, and try again when you are ready.', lines: m.lost, safeRest: false, questId: q.id, phase: 'start', choices: back('Fall back and recover') };
    // The hunt sits before "advance" so the chapter's way on stays last.
    const hunt = choice(`hunt-${m.id}`, m.label, { once: false, special: m.id, description: m.description, requires: { flagsNone: [`won:${encounterId(m.id)}`] }, result: { lines: m.lines, combat: encounterId(m.id) } });
    const at = start.choices.findIndex((c) => c.id === 'advance');
    start.choices.splice(at < 0 ? start.choices.length : at, 0, hunt);
  }
}

// XP a win pays, before the side-content cap.
const reward = (m, QUESTS) => XP.share(QUESTS[m.chapter].level, SPECIAL_SHARE);

// Settles a special fight (src/combat.js finishCombat). Returns true when it did.
function finish(state, encounter, result, events, api) {
  const m = of(encounter);
  if (!m) return false;
  const { QUESTS } = require('./expansion'), Book = require('./book'), Gear = require('./gear');
  const lost = result === 'defeat' || result === 'retreat';
  for (const a of api.actors(state)) {
    if (lost) { a.hp = Math.max(a.hp > 0 ? a.hp : 1, Math.ceil(a.maxHp * LOST_HP)); a.temporaryHp = 0; a.conditions = []; }
    else if (a.hp <= 0) a.hp = 1;
    a.deathSaves = { successes: 0, failures: 0, stable: false };
  }
  state.world.pendingBattle = null; state.world.failedEncounter = null;
  if (lost) {
    state.story.lastOutcome = { kind: 'combatDefeat', title: m.name, text: `The party falls back from ${m.name}.` };
    events.push({ type: 'combat', tone: 'warning', text: `${m.name} is too much this time. Nothing is lost but health: rest, then hunt it again whenever you like.` });
    api.enterNode(state, lostNode(m.id), events);
    return true;
  }
  if (!state.story.flags[`won:${encounter.id}`]) {
    const full = reward(m, QUESTS), xp = Book.capJobXp(state, full);
    if (xp) api.awardXp(state, xp, events, `Defeated ${m.name}, a special monster`);
    if (xp < full) events.push({ type: 'reward', tone: 'neutral', text: 'XP is capped: side content never takes you two levels past the story. Finishing chapters raises the limit.' });
    Gear.award(state, `special:${m.id}`, events);
    if (m.setFlag) state.story.flags[m.setFlag] = true;
    if (m.approval) api.applyApproval(state, m.approval, events);
  }
  state.story.flags[`won:${encounter.id}`] = true;
  state.story.lastOutcome = { kind: 'combatVictory', title: m.name, text: `The party defeats ${m.name}.` };
  api.enterNode(state, wonNode(m.id), events);
  return true;
}

module.exports = { SPECIAL_SHARE, SPECIAL_HP, SPECIAL_ATTACK, LOST_HP, power, MONSTERS, encounterId, forChapter, install, reward, finish, of };
