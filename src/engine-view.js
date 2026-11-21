"use strict";
// Builds the read-only view the browser renders from the authoritative state.
const { ABILITIES, SKILLS, ITEMS, CLASSES, CLUES, CAMPAIGN } = require("./content");
const { abilityModifier, proficiencyBonus, actorSkillBonus } = require("./rules");
const P = require("./progression");
const G = require("./equipment");
const W = require("./world");
const ChatMemory = require("./chat-memory");
const Courier = require("./courier-scene");
const Road = require("./road-story");
const Journal = require("./journal");
const { titleCase, inventoryEntry, hasItem, playerAttackProfile, findCompanion, strengths, successProbability, SCHEMA_VERSION, TACTICS, XP_THRESHOLDS } = require("./engine-core");
const Engine = require("./engine");
const { dialogueText, liveLines, nodeLocation } = require("./expansion");
const currentNode = (...args) => Engine.currentNode(...args);
const requirementStatus = (...args) => Engine.requirementStatus(...args);
const completedChoice = (...args) => Engine.completedChoice(...args);
const checkPlan = (...args) => Engine.checkPlan(...args);
const Combat = require("./combat");

// Odds and stakes of a waiting improvised attempt, recomputed from the current
// state so the roll card always shows what confirming would actually roll.
function pendingPreview(state) {
  const pending = ChatMemory.ensure(state).pending;
  if (!pending || pending.kind !== "improvise") return null;
  const preview = Engine.previewImprovised(state, pending.proposal);
  if (!preview.ok) return null;
  const c = preview.check;
  return {
    intent: preview.proposal.intent, success: preview.proposal.success, failure: preview.proposal.failure,
    check: c ? { actor: c.actor, name: c.name, bonus: c.bonus, dc: c.dc, mode: c.mode, chance: c.chance } : null,
    reward: preview.effects.reward, risk: preview.effects.risk, notes: preview.notes
  };
}
const currentCombatActor = (...args) => Combat.currentCombatActor(...args);
const combatView = (...args) => Combat.combatView(...args);

function storyChoicesView(state) {
  if (state.combat?.active) return [];
  const node = currentNode(state);
  // A choice you could take with more gold stays in view, locked; other unmet ones are hidden.
  return node.choices.filter(choice=>requirementStatus(state,choice.requires?{...choice.requires,gold:0}:choice.requires).met).map((choice) => {
    const requirement = requirementStatus(state, choice.requires);
    const completed = choice.once && completedChoice(state, node.id, choice.id);
    const plan = choice.check ? checkPlan(state, choice) : null;
    const mode = plan?.advantage ? "advantage" : plan?.disadvantage ? "disadvantage" : "normal";
    const probability = plan ? successProbability(plan.dc, plan.bonus, mode) : null;
    return {
      id: choice.id,
      // A peaceful resolution tried without its lead is worded for what the hero actually has.
      label: choice.labelNoLead && choice.check?.lead && !state.story.clues.includes(choice.check.lead) ? choice.labelNoLead : choice.label,
      description: choice.description,
      locked: !requirement.met,
      lockedReason: choice.lockedText || requirement.reason,
      completed,
      check: plan
        ? {
            actor: plan.actor.name,
            actorId: plan.actor.id,
            // When a companion rolls, what the hero would have instead.
            ...(plan.actor.id !== "player" && !choice.check.companion ? (() => { const h = checkPlan(state, choice, state.player); const hm = h.advantage ? "advantage" : h.disadvantage ? "disadvantage" : "normal"; return { hero: { bonus: h.bonus, probability: Math.round(successProbability(h.dc, h.bonus, hm) * 100) } }; })() : {}),
            skill: plan.skillId ? SKILLS[plan.skillId].name : ABILITIES[plan.abilityId]?.name,
            bonus: plan.bonus,
            dc: plan.dc,
            mode,
            helper: plan.helper?.name || null,
            reasons: plan.reasons,
            probability: Math.round(probability * 100)
          }
        : null
    };
  });
}

function equipmentView(state) {
  const slots = ["mainHand", "offHand", "armor", "accessory"];
  return slots.map((slot) => {
    const itemId = state.player.equipment[slot];
    const item = itemId ? ITEMS[itemId] : null;
    return { slot, label: titleCase(slot), item: item ? itemView(state, { itemId, quantity: inventoryEntry(state, itemId)?.quantity || 1 }) : null };
  });
}

function itemView(state, entry) {
  const item = ITEMS[entry.itemId];
  const equippedSlots = Object.entries(state.player.equipment).filter(([, id]) => id === item.id).map(([slot]) => slot);
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    rarity: item.rarity,
    quantity: entry.quantity,
    charges: entry.charges,
    description: item.description,
    purpose: item.purpose,
    slot: item.slot || null,
    equippedSlots,
    allocated:G.allocated(state,item.id),
    available:G.available(state,item.id),
    comparisons:item.slot ? [state.player,...state.party].map(a=>G.comparison(state,item.id,a.id)):[],
    value:item.value,
    canEquip: Boolean(item.slot),
    canUseStory: Boolean(item.usable?.contexts?.includes("story")),
    targetKind: item.usable?.target || null
  };
}

function playerSheetView(state) {
  const classDef = CLASSES[state.player.classId];
  const attack = playerAttackProfile(state.player);
  return {
    id: state.player.id,
    name: state.player.name,
    className: classDef.name,
    classDescription: classDef.description,
    backgroundName: state.player.backgroundName,
    level: state.player.level,
    xp: state.player.xp,
    nextLevelXp: XP_THRESHOLDS[state.player.level] || null,
    gold:state.player.gold,
    temporaryHp:state.player.temporaryHp||0,
    cloakReady:state.player.used?.cloakReady!==false,
    hp: state.player.hp,
    maxHp: state.player.maxHp,
    ac: state.player.ac,
    proficiency: proficiencyBonus(state.player.level),
    inspiration: state.player.inspiration,
    inspirationPrepared: state.player.inspirationPrepared,
    hitDice: state.player.hitDice,
    abilities: Object.fromEntries(Object.keys(ABILITIES).map((id) => [id, { ...ABILITIES[id], score: state.player.abilities[id], modifier: abilityModifier(state.player.abilities[id]) }])),
    skills: Object.fromEntries(Object.keys(SKILLS).map((id) => [id, { ...SKILLS[id], proficient: state.player.skills.includes(id), expertise: state.player.expertise.includes(id), bonus: actorSkillBonus(state.player, id) }])),
    attack,
    resources: state.player.resources,
    conditions: state.player.conditions
  };
}

function partyView(state) {
  const combatActors = state.combat?.active ? state.combat.actors : [];
  return state.party.map((member) => {
    const actor = combatActors.find((candidate) => candidate.refId === member.id);
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      level:member.level,
      equipment:member.equipment,
      personalStyle:member.personalStyle||null,
      temporaryHp:actor?.temporaryHp??member.temporaryHp??0,
      summary: member.summary,
      personality: member.personality,
      strengths: strengths(member),
      hp: actor?.hp ?? member.hp,
      maxHp: actor?.maxHp ?? member.maxHp,
      ac: actor?.ac ?? member.ac,
      bond: member.bond,
      tactic: member.tactic,
      tactics: TACTICS,
      conditions: actor?.conditions || member.conditions,
      currentTurn: currentCombatActor(state)?.id === actor?.id
    };
  });
}

function endingSummary(state) {
  if (currentNode(state).id !== "ending") return null;
  const flags = state.story.flags;
  const lines = [];
  if (flags.spiritFreed) lines.push("Aster Vey was freed from Sable's binding and returned to the ward by choice.");
  else if (flags.ritualWeakened) lines.push("The altered ritual was broken, though the ward-spirit's recovery will take time.");
  else lines.push("The ritual was stopped by force before it could spread beyond Briarwatch.");
  lines.push(flags.cultDefects ? "Warden Sable, abandoned by his own followers, was taken alive and sent in chains to Highpass to answer for the binding." : "Warden Sable was taken alive when he fell, and sent in chains to Highpass to answer for the binding.");
  if (flags.lysaSpared) lines.push("Lysa survived to testify about the cult.");
  if (flags.tovinFrightened) lines.push("Tovin gave vital information, but remembers the party's coercion.");
  if (findCompanion(state, "nessa")) lines.push("Nessa returned to Briarwatch as a proven member of the party.");
  if (hasItem(state, "warden-ledger")) lines.push("The cipher ledger gives the village enough evidence to rebuild its leadership openly.");
  return lines;
}

function buildView(state) {
  const node = currentNode(state);
  return {
    schemaVersion: SCHEMA_VERSION,
    campaign: {
      id: CAMPAIGN.id,
      title: CAMPAIGN.title,
      subtitle: CAMPAIGN.subtitle,
      premise: CAMPAIGN.premise,
      levelRange: CAMPAIGN.levelRange
    },
    scene: {
      id: node.id,
      act: node.act,
      title: node.title,
      location: nodeLocation(state, node),
      objective: node.objective,
      // Only the written lines that apply to this save (see liveLines).
      opening: node.dialogue ? dialogueText(liveLines(state, node.dialogue)) : node.opening,
      safeRest: node.safeRest,
      ending: Boolean(node.ending),
      defeat: Boolean(node.defeat),
      lastOutcome: state.story.lastOutcome,
      choices: storyChoicesView(state),
      heroRolls: state.story.heroRolls === true,
      // Whether any companion could roll a check (standing, bond 0 or more).
      companionsCanRoll: state.party.some((m) => m.hp > 0 && m.bond >= 0),
      canShortRest: Boolean(node.safeRest && !state.story.shortRestsUsed[node.id] && !state.combat?.active && (state.player.hitDice.current > 0 || state.player.hp < state.player.maxHp)),
      endingSummary: endingSummary(state)
    },
    player: playerSheetView(state),
    party: partyView(state),
    combat: combatView(state),
    inventory: state.player.inventory.map((entry) => itemView(state, entry)),
    equipment: equipmentView(state),
    clues: state.story.clues.map((id) => CLUES[id]),
    history: state.story.history.slice(-25),
    logs: state.logs.slice(-80),
    difficulty: state.difficulty,
    progression:P.view(state.player,state.world),
    world:W.view(state),
    chat:{...ChatMemory.view(state),pendingPreview:pendingPreview(state),road:Road.view(state,{hasItem,checkPlan}),roadAvailable:Road.home(state),courierOptions:Courier.options(state,{hasItem,checkPlan}).map(o=>({id:o.id,label:o.label,description:o.description})),courierAvailable:Courier.available(state)},
    journal:Journal.sync(state),
    pendingIntent:state.pendingIntent||null
  };
}

Object.assign(module.exports, { storyChoicesView, buildView });
