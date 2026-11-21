'use strict';
// The bounty board: a repeatable side battle in any town, at the hero's level.
// It pays battle XP by the engine's usual rating (src/xp.js) and a little gold,
// so a hero who has fallen behind the story can catch up. Like every other XP,
// it never takes the hero past the level the current chapter is written for
// (src/book.js). No story text is needed: the foes come from the town's region.
const { ENCOUNTERS, ENEMIES } = require('./content');
const XP = require('./xp');
const Book = require('./book');
const P = require('./progression');
const Gear = require('./gear');

// Who is posted on each town's board. Unknown towns use the road wardens' list.
const BOARDS = Object.freeze({
  briarwatch: { main: 'Bramble Poacher', retainer: 'Poacher\'s Hound', attack: 'Hooked Spear', type: 'piercing', place: 'the briar woods', retainers: "Poacher's Hounds" },
  ashford: { main: 'Crossroads Raider', retainer: 'Raider Cutpurse', attack: 'Road Axe', type: 'slashing', place: 'the three roads', retainers: "Raider Cutpurses" },
  highpass: { main: 'Ridge Stalker', retainer: 'Snow Wolf', attack: 'Rending Claws', type: 'slashing', place: 'the high passes', retainers: "Snow Wolves" },
  merrowgate: { main: 'Wrecker Captain', retainer: 'Tidewrack Smuggler', attack: 'Gaff Hook', type: 'piercing', place: 'the harbour flats', retainers: "Tidewrack Smugglers" },
  cinderfold: { main: 'Slag Golem', retainer: 'Cinder Imp', attack: 'Molten Fist', type: 'fire', place: 'the forge wastes', retainers: "Cinder Imps" },
  default: { main: 'Wanted Outlaw', retainer: 'Outlaw Bravo', attack: 'Notched Blade', type: 'slashing', place: 'the roads', retainers: "Outlaw Bravos" }
});
const board = townId => BOARDS[townId] || BOARDS.default;

const ID = 'bounty';
ENEMIES['bounty-main'] = { id: 'bounty-main', name: 'Wanted Outlaw', maxHp: 30, ac: 12, level: 1, abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 11, cha: 10 }, attack: { name: 'Notched Blade', bonus: 4, damage: '1d6+2', damageType: 'slashing' }, aiRole: 'leader', tags: [], resistances: [], xp: 0 };
ENEMIES['bounty-retainer'] = { id: 'bounty-retainer', name: 'Outlaw Bravo', maxHp: 14, ac: 11, level: 1, abilities: { str: 12, dex: 12, con: 12, int: 9, wis: 10, cha: 9 }, attack: { name: 'Club', bonus: 3, damage: '1d6+2', damageType: 'bludgeoning' }, aiRole: 'soldier', tags: [], resistances: [], xp: 0 };
ENCOUNTERS[ID] = { id: ID, name: 'Bounty', bounty: true, enemies: ['bounty-main', 'bounty-retainer', 'bounty-retainer'], storyScale: 0.82, standardScale: 1, grittyScale: 1.18, xp: 0, loot: [], intro: 'The bounty is where the board said it would be.' };

const gold = level => 8 + 3 * Math.max(1, Math.floor(Number(level) || 1));
// While the hero is under the current chapter's level, a bounty pays half as
// much XP again, so catching up takes a handful of fights, not dozens.
const CATCH_UP = 1.5;
// After the written story, bounties lift a hero to level 20 (the 2nd job) and
// no further: past that, AI adventures and the next book are the way on.
const AFTER_BOOKS_LEVEL = P.SECOND_JOB_LEVEL || 20;
// A loss or retreat costs a tenth of the gold carried, never more than a win pays.
const lossCost = state => Math.min(Math.floor(state.player.gold * 0.1), gold(state.player.level));
function room(state) {
  const r = Book.xpRoom(state);
  if (Number.isFinite(r)) return r;
  return Math.max(0, (P.XP_NEXT[AFTER_BOOKS_LEVEL] || Infinity) - 1 - (Number(state.player.xp) || 0));
}

// Shapes a bounty's enemies for the hero's level as an adventure battle would be.
function shape(state, enemies, scale = 1) {
  const level = state.player.level, b = board(state.world?.townId), f = XP.foeStats(XP.challenge({ level }));
  for (const e of enemies) {
    const def = e.refId === 'bounty-main' ? f.main : f.retainer;
    e.name = e.refId === 'bounty-main' ? b.main : b.retainer;
    e.level = level; e.maxHp = Math.max(1, Math.round(def.maxHp * scale)); e.hp = e.maxHp; e.ac = def.ac;
    e.attack = { name: e.refId === 'bounty-main' ? b.attack : 'Strike', bonus: def.attackBonus, damage: def.damage, damageType: e.refId === 'bounty-main' ? b.type : 'bludgeoning' };
  }
}

// The XP and gold a win pays now, before the chapter cap.
function reward(state) {
  const level = state.player.level, f = XP.foeStats(XP.challenge({ level }));
  const { rating, xp: base } = XP.battleXp(level, [f.main, f.retainer, f.retainer], 'normal', level);
  const cap = Book.levelCap(state), behind = cap !== null && level < cap;
  return { rating, xp: behind ? Math.round(base * CATCH_UP / 10) * 10 : base, gold: gold(level), behind };
}

function view(state) {
  const w = state.world, b = board(w.townId), r = reward(state), left = room(state);
  const open = Boolean(w.completed?.bell && !w.onExpedition && !state.combat?.active && !w.practiceSnapshot);
  const xp = Math.min(r.xp, left);
  return {
    available: open,
    name: `${b.main} and two ${b.retainers}`,
    place: b.place,
    level: state.player.level,
    reward: { xp, gold: r.gold },
    capped: xp < r.xp,
    catchUp: r.behind,
    loss: lossCost(state),
    reason: open ? null : !w.completed?.bell ? 'The bounty board opens once the bell investigation is finished.' : 'Return to town to take a bounty.'
  };
}

function start(state, rng, events, api) {
  const v = view(state);
  if (!v.available) return { ok: false, error: v.reason };
  state.world.bounty = { nodeId: state.story.nodeId, townId: state.world.townId, level: state.player.level };
  events.push({ type: 'combat', tone: 'neutral', text: `Bounty taken: ${v.name}, out in ${v.place}. A win pays ${v.reward.xp} XP and ${v.reward.gold} gold.` });
  if (!api.startCombat(state, ID, rng, events)) { delete state.world.bounty; return { ok: false, error: 'The bounty is unavailable.' }; }
  if (state.combat) state.combat.name = `Bounty: ${v.name}`;
  return { ok: true, kind: 'combat', outcomeText: `The party goes after the bounty in ${v.place}.` };
}

// Ends a bounty fight. A win pays; a loss or retreat costs a tenth of the gold
// carried and brings the party home hurt. Nothing touches the story or an
// expedition in progress.
function finish(state, result, events, api) {
  const b = state.world.bounty || { nodeId: `town-${state.world.townId}`, level: state.player.level };
  delete state.world.bounty;
  state.world.day += 1;
  if (result === 'defeat' || result === 'retreat') {
    const cost = lossCost(state);
    state.player.gold -= cost;
    for (const a of api.actors(state)) { a.hp = Math.max(1, Math.ceil(a.maxHp * 0.4)); a.temporaryHp = 0; a.deathSaves = { successes: 0, failures: 0, stable: false }; }
    api.enterNode(state, b.nodeId, events);
    events.push({ type: 'rest', tone: 'warning', text: `${result === 'retreat' ? 'The party gives up the bounty' : 'The bounty beats the party'} and limps home. ${cost ? `Patching up costs ${cost} gold. ` : ''}No XP or equipment lost.` });
    return;
  }
  const r = reward(state), xp = Math.max(0, Math.min(r.xp, room(state)));
  state.player.gold += r.gold;
  if (xp) api.awardXp(state, xp, events, `Bounty claimed (${r.rating} battle)`);
  events.push({ type: 'reward', tone: 'good', text: `Bounty claimed: ${r.gold} gold${xp ? ` and ${xp} XP` : ''}.${xp < r.xp ? (Number.isFinite(Book.xpRoom(state)) ? ' XP is capped: you are at the level this chapter of the story is written for.' : ` XP is capped: bounties take a hero to level ${AFTER_BOOKS_LEVEL}; AI adventures or the next book go further.`) : ''}` });
  // The first bounty claimed in a town gives that town's bounty item (src/gear.js).
  Gear.award(state, `bounty:${b.nodeId.replace(/^town-/, '')}`, events);
  api.enterNode(state, b.nodeId, events);
}

module.exports = { ID, BOARDS, board, shape, reward, view, start, finish, gold, lossCost, room, CATCH_UP, AFTER_BOOKS_LEVEL };
