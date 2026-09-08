"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createNewGame,
  normalizeIncomingState,
  resolveAction,
  buildView,
  setupCatalog,
  addItem,
  hasItem
} = require("../src/engine");
const { createSeededRng, validatePointBuy } = require("../src/rules");
const { choice, act, runCombat, availableAction, weakestTarget } = require("./helpers");

const alwaysHigh = () => 0.999999;
const alwaysLow = () => 0;

function travelToRoadCombat(state, rng = createSeededRng(10)) {
  state = choice(state, "leave-village", rng).state;
  state = choice(state, "main-road", rng).state;
  assert.equal(state.combat?.active, true);
  return state;
}

test("setup catalog exposes six complete classes and valid point-buy presets", () => {
  const catalog = setupCatalog();
  assert.equal(catalog.classes.length, 6);
  assert.deepEqual(new Set(catalog.classes.map((entry) => entry.id)), new Set(["fighter", "rogue", "wizard", "cleric", "ranger", "bard"]));
  for (const classDef of catalog.classes) {
    assert.equal(validatePointBuy(classDef.preset).valid, true, `${classDef.name} preset should be legal`);
    assert.ok(classDef.actions.length >= 2, `${classDef.name} should have meaningful class actions`);
  }
});

test("invalid custom ability arrays fall back to the class preset", () => {
  const state = createNewGame({ classId: "wizard", abilities: { str: 20, dex: 20, con: 20, int: 20, wis: 20, cha: 20 } });
  assert.deepEqual(state.player.abilities, setupCatalog().classes.find((entry) => entry.id === "wizard").preset);
});

test("story checks show DC, odds, and active companion Help", () => {
  const state = createNewGame({ name: "Mira", classId: "fighter", backgroundId: "outlander" });
  const view = buildView(state);
  const reeve = view.scene.choices.find((entry) => entry.id === "question-reeve");
  assert.equal(reeve.locked, false);
  assert.equal(reeve.check.dc, 11);
  assert.equal(reeve.check.mode, "advantage");
  assert.equal(reeve.check.helper, "Sister Maren Vale");
  assert.ok(reeve.check.probability > 50);
});

test("failed investigation is fail-forward and never traps the campaign", () => {
  let state = createNewGame({ name: "Mira", classId: "fighter" });
  const failed = choice(state, "inspect-rope", alwaysLow);
  state = failed.state;
  assert.equal(failed.result.success, false);
  assert.equal(state.story.flags.ropeTimingKnown, true);
  const leave = buildView(state).scene.choices.find((entry) => entry.id === "leave-village");
  assert.equal(leave.locked, false);
  state = choice(state, "leave-village", alwaysLow).state;
  assert.equal(state.story.nodeId, "forest-edge");
});

test("successful investigation persists clues, quest items, history, and transparent rolls", () => {
  let state = createNewGame({ name: "Mira", classId: "wizard", backgroundId: "sage" });
  const resolved = choice(state, "inspect-rope", alwaysHigh);
  state = resolved.state;
  assert.equal(resolved.result.success, true);
  assert.ok(state.story.clues.includes("black-wax"));
  assert.equal(hasItem(state, "cult-seal"), true);
  assert.ok(resolved.events.some((event) => event.type === "roll" && event.roll?.dc === 11));
  assert.ok(state.story.history.some((entry) => entry.choiceId === "inspect-rope"));
  const repeat = resolveAction(state, { type: "story-choice", choiceId: "inspect-rope" }, alwaysHigh);
  assert.equal(repeat.result.ok, false);
});

test("repeatable hub travel cannot be farmed for unlimited XP", () => {
  let state = createNewGame({ name: "Mira", classId: "bard" });
  state = choice(state, "visit-tovin", alwaysHigh).state;
  state = choice(state, "return-square", alwaysHigh).state;
  const xpAfterFirstCircuit = state.player.xp;

  state = choice(state, "visit-tovin", alwaysHigh).state;
  state = choice(state, "return-square", alwaysHigh).state;

  assert.equal(state.player.xp, xpAfterFirstCircuit);
  assert.ok(state.story.history.filter((entry) => entry.choiceId === "visit-tovin").length >= 2, "repeat travel should still be recorded as story history");
});

test("equipment has explicit slots and changes derived combat statistics", () => {
  let state = createNewGame({ name: "Mira", classId: "fighter" });
  const startingAc = state.player.ac;
  addItem(state, "thornward-cloak", 1);
  state = act(state, { type: "equip", itemId: "thornward-cloak" }, alwaysHigh).state;
  assert.equal(state.player.equipment.accessory, "thornward-cloak");
  assert.equal(state.player.ac, startingAc + 1);

  addItem(state, "shortbow", 1);
  state = act(state, { type: "equip", itemId: "shortbow" }, alwaysHigh).state;
  assert.equal(state.player.equipment.mainHand, "shortbow");
  assert.equal(state.player.equipment.offHand, null, "two-handed weapon should clear the shield slot");

  addItem(state, "steel-shield", 1);
  const invalid = resolveAction(state, { type: "equip", itemId: "steel-shield" }, alwaysHigh);
  assert.equal(invalid.result.ok, false);
  assert.match(invalid.result.error, /two-handed weapon/i);
});

test("inventory cards explain purpose and consumables validate targets before being spent", () => {
  let state = createNewGame({ name: "Mira", classId: "fighter" });
  const potionCard = buildView(state).inventory.find((item) => item.id === "healing-potion");
  assert.match(potionCard.purpose, /restore/i);
  const invalid = resolveAction(state, { type: "use-item", itemId: "healing-potion", targetId: "player" }, alwaysHigh);
  assert.equal(invalid.result.ok, false);
  assert.equal(invalid.state.player.inventory.find((entry) => entry.itemId === "healing-potion").quantity, 1);

  state.player.hp = 3;
  const healed = act(state, { type: "use-item", itemId: "healing-potion", targetId: "player" }, alwaysHigh);
  assert.ok(healed.state.player.hp > 3);
  assert.equal(hasItem(healed.state, "healing-potion"), false);
});

test("companions take autonomous, visible turns and their tactics persist", () => {
  const rng = createSeededRng(42);
  let state = travelToRoadCombat(createNewGame({ name: "Mira", classId: "fighter" }), rng);
  state = act(state, { type: "set-tactic", companionId: "orin", tactic: "aggressive" }, rng).state;
  assert.equal(state.party.find((member) => member.id === "orin").tactic, "aggressive");
  const ended = act(state, { type: "combat", actionId: "end-turn" }, rng);
  const transcript = ended.events.map((event) => event.text).join(" ");
  assert.match(transcript, /Orin|Maren/, "at least one companion action should be reported");
  assert.ok(ended.state.logs.some((entry) => /Orin|Maren/.test(entry.source) || /Orin|Maren/.test(entry.message)));
});

test("the healer companion recognises and revives an unconscious ally", () => {
  const rng = createSeededRng(942);
  let state = travelToRoadCombat(createNewGame({ name: "Mira", classId: "fighter" }), rng);
  const player = state.combat.actors.find((actor) => actor.id === "player");
  const maren = state.combat.actors.find((actor) => actor.refId === "maren");
  const others = state.combat.actors.filter((actor) => actor !== player && actor !== maren);

  player.hp = 0;
  player.deathSaves = { successes: 0, failures: 1, stable: false };
  maren.resources.healingWords = 2;
  for (const actor of others.filter((candidate) => candidate.team === "enemy")) {
    actor.hp = 999;
    actor.maxHp = 999;
    actor.attack = { name: "Harmless test attack", bonus: -100, damage: "0", damageType: "bludgeoning" };
    actor.special = null;
    actor.heal = null;
  }
  state.combat.actors = [player, maren, ...others];
  state.combat.turnIndex = 0;
  state.combat.awaitingPlayer = true;

  const ended = act(state, { type: "combat", actionId: "end-turn" }, rng);
  const revived = ended.state.combat.actors.find((actor) => actor.id === "player");
  assert.ok(revived.hp > 0);
  assert.ok(ended.events.some((event) => /Maren.*Healing Word/i.test(event.text)));
});

test("victory stabilises unconscious party members before the next scene", () => {
  const rng = createSeededRng(151);
  let state = travelToRoadCombat(createNewGame({ name: "Mira", classId: "fighter" }), rng);
  const player = state.combat.actors.find((actor) => actor.id === "player");
  player.hp = 0;
  for (const actor of state.combat.actors) {
    if (actor.team === "enemy" || actor.team === "party") actor.hp = 0;
  }
  state.combat.turnIndex = state.combat.actors.indexOf(player);
  state.combat.awaitingPlayer = true;

  const resolved = act(state, { type: "combat", actionId: "end-turn" }, rng);
  assert.equal(resolved.state.combat, null);
  assert.ok(resolved.state.player.hp >= 1);
  assert.ok(resolved.state.party.every((member) => member.hp >= 1));
  assert.ok(resolved.events.some((event) => /stabilis/i.test(event.text)));
});

test("action and bonus-action economy allows one of each and rejects duplicates", () => {
  const rng = createSeededRng(52);
  let state = travelToRoadCombat(createNewGame({ name: "Mira", classId: "fighter" }), rng);
  const playerActor = state.combat.actors.find((actor) => actor.id === "player");
  playerActor.hp = Math.max(1, playerActor.maxHp - 6);
  state.player.hp = playerActor.hp;

  let view = buildView(state);
  assert.ok(availableAction(view, "second-wind"));
  state = act(state, { type: "combat", actionId: "second-wind", targetId: "player" }, rng).state;
  view = buildView(state);
  assert.equal(view.combat.economy.bonusUsed, true);
  assert.equal(view.combat.economy.actionUsed, false);

  const target = weakestTarget(view);
  state = act(state, { type: "combat", actionId: "weapon-attack", targetId: target.id }, rng).state;
  if (state.combat?.active) {
    view = buildView(state);
    assert.equal(view.combat.economy.actionUsed, true);
    const duplicate = resolveAction(state, { type: "combat", actionId: "weapon-attack", targetId: weakestTarget(view)?.id }, rng);
    assert.equal(duplicate.result.ok, false);
  }
});

test("a full evidence-rich campaign route reaches a mechanically easier finale and ending", () => {
  let state = createNewGame({ name: "Mira", classId: "wizard", backgroundId: "sage", difficulty: "standard" });
  for (const id of [
    "inspect-rope",
    "visit-tovin",
    "calm-tovin",
    "return-square",
    "leave-village",
    "pilgrim-path",
    "read-altar",
    "open-reliquary",
    "enter-underroad",
    "read-current",
    "speak-true-name",
    "eavesdrop-court",
    "maren-rite",
    "name-the-spirit"
  ]) {
    state = choice(state, id, alwaysHigh).state;
  }
  assert.equal(state.combat?.encounterId, "finale-sable-only");
  assert.equal(state.story.flags.spiritFreed, true);
  assert.ok(state.story.clues.length >= 5);
  const completed = runCombat(state, createSeededRng(7123));
  assert.equal(completed.state.story.nodeId, "ending");
  assert.equal(completed.state.combat, null);
  assert.ok(buildView(completed.state).scene.endingSummary.some((line) => /freed/i.test(line)));
});

test("legacy V2 saves migrate safely into a fresh V4 campaign", () => {
  const migrated = normalizeIncomingState({
    schemaVersion: 2,
    player: { name: "Old Hero", classId: "mage", abilities: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 } }
  });
  assert.equal(migrated.schemaVersion, 4);
  assert.equal(migrated.player.name, "Old Hero");
  assert.equal(migrated.player.classId, "wizard");
  assert.equal(migrated.story.nodeId, "briarwatch-square");
  assert.ok(migrated.logs.some((entry) => /legacy V2 save/i.test(entry.message)));
});
