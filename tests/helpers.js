"use strict";

const { resolveAction, buildView } = require("../src/engine");

function act(state, action, rng) {
  const result = resolveAction(state, action, rng);
  if (result.result?.ok === false) {
    const error = new Error(result.result.error || "Action failed");
    error.resolution = result;
    throw error;
  }
  return result;
}

function choice(state, choiceId, rng) {
  return act(state, { type: "story-choice", choiceId }, rng);
}

function weakestTarget(view) {
  return [...(view.combat?.actors || [])]
    .filter((actor) => actor.team === "enemy" && actor.hp > 0)
    .sort((a, b) => a.hp - b.hp || a.maxHp - b.maxHp)[0] || null;
}

function lowestAlly(view, includeFull = false) {
  return [...(view.combat?.actors || [])]
    .filter((actor) => actor.team === "party" && (includeFull || actor.hp < actor.maxHp))
    .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
}

function availableAction(view, id) {
  return (view.combat?.actions || []).find((action) => action.id === id && !action.disabled) || null;
}

function runCombat(initialState, rng, options = {}) {
  let state = initialState;
  const transcript = [];
  const maxPlayerTurns = options.maxPlayerTurns || 80;
  let playerTurns = 0;

  while (state.combat?.active && playerTurns < maxPlayerTurns) {
    const view = buildView(state);
    if (!view.combat?.awaitingPlayer) {
      throw new Error("Combat engine stopped without awaiting the player.");
    }
    playerTurns += 1;
    const player = view.player;
    const economy = view.combat.economy || { actionUsed: false, bonusUsed: false };
    const weakest = weakestTarget(view);
    const lowest = lowestAlly(view);

    if (player.hp <= 0) {
      const death = availableAction(view, "death-save");
      if (death) {
        const resolved = act(state, { type: "combat", actionId: "death-save" }, rng);
        state = resolved.state;
        transcript.push(...resolved.events.map((event) => event.text));
        continue;
      }
    }

    // Bonus-action recovery and setup, preserving the main action.
    if (!economy.bonusUsed) {
      let bonusAction = null;
      let targetId = "player";
      if (player.className === "Fighter" && player.hp / player.maxHp <= 0.55) {
        bonusAction = availableAction(view, "second-wind");
      } else if ((player.className === "Cleric" || player.className === "Bard") && lowest && lowest.hp / lowest.maxHp <= 0.55) {
        bonusAction = availableAction(view, "healing-word");
        targetId = lowest.id;
      } else if (player.className === "Ranger" && weakest) {
        bonusAction = availableAction(view, "hunters-mark");
        targetId = weakest.id;
      } else if (player.className === "Rogue") {
        bonusAction = availableAction(view, "cunning-hide");
      } else if (player.className === "Bard") {
        bonusAction = availableAction(view, "bardic-inspiration");
        targetId = lowest?.id || "companion:orin";
      }
      if (bonusAction) {
        const resolved = act(state, { type: "combat", actionId: bonusAction.id, targetId }, rng);
        state = resolved.state;
        transcript.push(...resolved.events.map((event) => event.text));
        if (!state.combat?.active) break;
      }
    }

    let refreshed = buildView(state);
    let target = weakestTarget(refreshed);
    let injured = lowestAlly(refreshed);

    // Emergency item use is intentionally an action, so it competes with attacking.
    if (injured && injured.hp / injured.maxHp <= 0.28) {
      const potion = availableAction(refreshed, "item:healing-potion");
      if (potion) {
        const resolved = act(state, { type: "combat", actionId: potion.id, targetId: injured.id }, rng);
        state = resolved.state;
        transcript.push(...resolved.events.map((event) => event.text));
      }
    }

    refreshed = buildView(state);
    if (!state.combat?.active) break;
    if (!refreshed.combat.economy.actionUsed) {
      target = weakestTarget(refreshed);
      injured = lowestAlly(refreshed);
      let mainAction = null;
      let targetId = target?.id;
      const enemyCount = refreshed.combat.actors.filter((actor) => actor.team === "enemy" && actor.hp > 0).length;

      if (player.className === "Wizard") {
        mainAction = enemyCount >= 2 ? availableAction(refreshed, "sleep") : null;
        mainAction ||= target && target.maxHp >= 18 ? availableAction(refreshed, "magic-missile") : null;
        mainAction ||= availableAction(refreshed, "fire-bolt");
      } else if (player.className === "Cleric") {
        mainAction = target && target.maxHp >= 18 ? availableAction(refreshed, "guiding-bolt") : null;
        mainAction ||= availableAction(refreshed, "sacred-flame");
      } else if (player.className === "Ranger" && injured && injured.hp / injured.maxHp <= 0.42) {
        mainAction = availableAction(refreshed, "field-dressing");
        if (mainAction) targetId = injured.id;
      } else if (player.className === "Bard") {
        mainAction = availableAction(refreshed, "vicious-mockery");
      }
      if (!mainAction) {
        mainAction = availableAction(refreshed, "weapon-attack");
        targetId = target?.id;
      }
      mainAction ||= availableAction(refreshed, "defend");

      if (mainAction) {
        const resolved = act(state, { type: "combat", actionId: mainAction.id, targetId }, rng);
        state = resolved.state;
        transcript.push(...resolved.events.map((event) => event.text));
      }
    }

    if (state.combat?.active) {
      const resolved = act(state, { type: "combat", actionId: "end-turn" }, rng);
      state = resolved.state;
      transcript.push(...resolved.events.map((event) => event.text));
    }
  }

  if (state.combat?.active) throw new Error(`Combat exceeded ${maxPlayerTurns} player turns.`);
  return { state, transcript, playerTurns };
}

module.exports = { act, choice, runCombat, weakestTarget, lowestAlly, availableAction };
