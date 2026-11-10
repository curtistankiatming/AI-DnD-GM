"use strict";
// Shared state helpers for the rules engine: inventory, logs, XP and levels.
// No story or combat logic lives here, so every engine module can use it.
const { ITEMS, CLASSES } = require("./content");
const { clamp, abilityModifier } = require("./rules");
const P = require("./progression");
const G = require("./equipment");
const SCHEMA_VERSION = 4;
const MAX_LOGS = 180;
const MAX_HISTORY = 80;
const TACTICS = ["balanced", "aggressive", "protective", "support"];
const XP_THRESHOLDS = P.XP_NEXT;

function nowIso() {
  return new Date().toISOString();
}

function normalizeId(value) {
  return String(value || "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mergeInventory(entries = []) { return G.inventory(entries); }

function addItem(state, itemId, quantity = 1, events = []) {
  const id = normalizeId(itemId);
  const item = ITEMS[id];
  if (!item) return false;
  const count = Math.max(1, Math.floor(Number(quantity || 1)));
  const existing = state.player.inventory.find((entry) => entry.itemId === id);
  if (existing) {
    if (item.category === "quest") return true;
    existing.quantity += count;
  } else {
    const entry = { itemId: id, quantity: count };
    if (Number.isFinite(Number(item.charges))) entry.charges = Number(item.charges);
    state.player.inventory.push(entry);
  }
  events.push({ type: "item", tone: "good", text: `Gained ${count > 1 ? `${count} × ` : ""}${item.name}.` });
  return true;
}

function inventoryEntry(state, itemId) {
  return state.player.inventory.find((entry) => entry.itemId === normalizeId(itemId)) || null;
}

function hasItem(state, itemId, quantity = 1) {
  const entry = inventoryEntry(state, itemId);
  return Boolean(entry && entry.quantity >= quantity);
}

function removeItem(state, itemId, quantity = 1) {
  const id = normalizeId(itemId);
  const entry = inventoryEntry(state, id);
  if (!entry || entry.quantity < quantity) return false;
  entry.quantity -= quantity;
  if (entry.quantity <= 0) {
    state.player.inventory = state.player.inventory.filter((candidate) => candidate !== entry);
    for (const slot of Object.keys(state.player.equipment || {})) {
      if (state.player.equipment[slot] === id) state.player.equipment[slot] = null;
    }
  }
  return true;
}

function consumeItemUse(state, itemId) { return G.consume(state.player.inventory, itemId); }

function buildClassResources(classDef, level = 1, player = null) { return P.resources(classDef, level, player); }

function applyEquipmentDerivedStats(player) { return G.derive(player); }

function playerWeapon(player) {
  const equipped = ITEMS[player.equipment?.mainHand];
  if (equipped?.weapon) return equipped;
  return {
    id: "unarmed",
    name: "Unarmed Strike",
    weapon: { damage: "1", damageType: "bludgeoning", ability: "str", properties: [] }
  };
}

function weaponAbility(player, weapon) {
  const ability = weapon?.weapon?.ability || "str";
  if (ability === "finesse") {
    return abilityModifier(player.abilities.dex) >= abilityModifier(player.abilities.str) ? "dex" : "str";
  }
  return ability;
}

function playerAttackProfile(player) { return G.weaponProfile(player); }

function pushLog(state, source, message, type = "system", meta = {}) {
  if (!message) return;
  state.logs.push({ source, message: String(message), type, ts: nowIso(), ...meta });
  if (state.logs.length > MAX_LOGS) state.logs = state.logs.slice(-MAX_LOGS);
}

function recordHistory(state, summary, details = {}) {
  state.story.history.push({
    turn: state.turnCount,
    nodeId: state.story.nodeId,
    summary,
    ts: nowIso(),
    ...details
  });
  if (state.story.history.length > MAX_HISTORY) state.story.history = state.story.history.slice(-MAX_HISTORY);
}

function findCompanion(state, id) {
  return state.party.find((member) => member.id === normalizeId(id)) || null;
}

function successProbability(dc, bonus, mode = "normal") {
  const successFaces = clamp(21 - (Number(dc) - Number(bonus)), 0, 20);
  const normal = successFaces / 20;
  if (mode === "advantage") return 1 - (1 - normal) ** 2;
  if (mode === "disadvantage") return normal ** 2;
  return normal;
}

function awardXp(state, amount, events = [], reason = "Progress") {
  const gain = Math.max(0, Math.floor(Number(amount || 0)));
  if (!gain) return;
  const rankBefore = P.renownRank(state.player);
  state.player.xp += gain;
  events.push({ type: "xp", tone: "good", text: `${reason}: +${gain} XP.` });
  checkLevelUp(state, events);
  const rank = P.renownRank(state.player);
  if (rank > rankBefore) {
    const open = P.pendingBoons(state.player);
    const text = `${state.player.name} reached renown rank ${rank}. ${open ? `Choose ${open === 1 ? "a renown boon" : `${open} renown boons`} on the character sheet.` : "Every boon is already at its maximum; the legend still grows."}`;
    events.push({ type: "level", tone: "good", text }); pushLog(state, "Progression", text, "level");
  }
}

function checkLevelUp(state, events = []) {
  while (state.player.level < P.MAX_LEVEL && state.player.xp >= (XP_THRESHOLDS[state.player.level] || Infinity)) {
    const player=state.player, before=player.maxHp;
    player.level+=1; player.maxHp=P.maxHp(player); player.hp+=Math.max(0,player.maxHp-before);
    player.hitDice.max=player.level;player.hitDice.current=Math.min(player.level,player.hitDice.current+1);
    player.resources=buildClassResources(CLASSES[player.classId],player.level,player);
    player.inspiration=Math.min(3,player.inspiration+1);
    for (const member of state.party) { P.levelCompanion(member,player.level); G.derive(member); }
    const text=`${player.name} reached level ${player.level}: ${P.REWARDS[player.level]} The companions share the new level.`;
    events.push({type:'level',tone:'good',text});pushLog(state,'Progression',text,'level');
  }
}

function invalidResult(state, events, message) {
  events.push({ type: "warning", tone: "warning", text: message });
  pushLog(state, "Rules", message, "warning");
  return { ok: false, error: message };
}

Object.assign(module.exports, { SCHEMA_VERSION, MAX_LOGS, MAX_HISTORY, TACTICS, XP_THRESHOLDS, nowIso, normalizeId, titleCase, addItem, hasItem, consumeItemUse, playerAttackProfile, pushLog, recordHistory, findCompanion, successProbability, awardXp, invalidResult, inventoryEntry, mergeInventory, buildClassResources, applyEquipmentDerivedStats });
