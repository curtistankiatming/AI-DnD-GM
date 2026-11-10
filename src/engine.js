"use strict";
const { ABILITIES, SKILLS, BACKGROUNDS, ITEMS, CLASSES, COMPANIONS, CLUES, STORY_NODES, CAMPAIGN } = require("./content");
const { clamp, deepClone, abilityModifier, rollFormula, rollD20, normalizeAbilities, validatePointBuy, actorSkillBonus, actorAbilityBonus, formatSigned } = require("./rules");
const P = require("./progression");
const G = require("./equipment");
const W = require("./world");
const ChatMemory = require("./chat-memory");
const Courier = require("./courier-scene");
const Road = require("./road-story");
const Journal = require("./journal");
const Improvise = require("./improvise");
const Director = require("./director");
Road.register(STORY_NODES);
const Core = require("./engine-core");
const { nowIso, normalizeId, titleCase, mergeInventory, addItem, inventoryEntry, hasItem, consumeItemUse, buildClassResources, applyEquipmentDerivedStats, pushLog, recordHistory, findCompanion, successProbability, awardXp, invalidResult, SCHEMA_VERSION, MAX_LOGS, MAX_HISTORY, TACTICS } = require("./engine-core");
const Combat = require("./combat");
const startCombat = (...args) => Combat.startCombat(...args);
const normalizeCombat = (...args) => Combat.normalizeCombat(...args);
const savingThrow = (...args) => Combat.savingThrow(...args);
const resolveCombatAction = (...args) => Combat.resolveCombatAction(...args);
const View = require("./engine-view");
const storyChoicesView = (...args) => View.storyChoicesView(...args);
const buildView = (...args) => View.buildView(...args);

function resolvePlayerSkills(classDef, backgroundDef) {
  const skills = [];
  for (const skill of [...(classDef.defaultSkills || []), ...(backgroundDef.skills || [])]) {
    if (!skills.includes(skill)) skills.push(skill);
  }
  for (const candidate of classDef.skillsChoose || []) {
    if (skills.length >= 4) break;
    if (!skills.includes(candidate)) skills.push(candidate);
  }
  return skills;
}

function createPlayer(setup = {}) {
  const classDef = CLASSES[normalizeId(setup.classId)] || CLASSES.fighter;
  const backgroundDef = BACKGROUNDS[normalizeId(setup.backgroundId)] || BACKGROUNDS.outlander;
  let abilities = normalizeAbilities(setup.abilities, classDef.preset);
  if (!validatePointBuy(abilities).valid) abilities = deepClone(classDef.preset);
  const inventory = [];
  for (const itemId of Object.values(classDef.equipment || {})) {
    if (itemId) inventory.push({ itemId, quantity: 1 });
  }
  inventory.push(...deepClone(classDef.inventory || []));
  if (backgroundDef.item) inventory.push({ itemId: backgroundDef.item, quantity: 1 });
  const level = 1;
  const maxHp = Math.max(1, classDef.hitDie + abilityModifier(abilities.con));
  const player = {
    id: "player",
    kind: "player",
    name: String(setup.name || "Aster").trim().slice(0, 28) || "Aster",
    classId: classDef.id,
    className: classDef.name,
    backgroundId: backgroundDef.id,
    backgroundName: backgroundDef.name,
    level,
    xp: 0,
    abilities,
    skills: resolvePlayerSkills(classDef, backgroundDef),
    expertise: deepClone(classDef.expertise || []),
    savingThrows: deepClone(classDef.savingThrows || []),
    maxHp,
    hp: maxHp,
    temporaryHp: 0,
    ac: 10,
    speed: 30,
    inventory: mergeInventory(inventory),
    equipment: deepClone(classDef.equipment),
    resources: buildClassResources(classDef, level),
    hitDice: { die: classDef.hitDie, current: 1, max: 1 },
    conditions: [],
    gold: Number(backgroundDef.gold || 0),
    inspiration: 1,
    inspirationPrepared: false,
    deathSaves: { successes: 0, failures: 0, stable: false },
    skillBonuses: {},
    saveBonuses: {},
    used: { cloakReady: true },
    progression: { choices: {}, talents: [], specialization: null }
  };
  return applyEquipmentDerivedStats(player);
}

function createCompanion(id) {
  const definition = COMPANIONS[id];
  if (!definition) return null;
  return {
    ...deepClone(definition),
    kind: "companion",
    level: 1,
    hp: definition.maxHp,
    conditions: [],
    tactic: definition.tactic || "balanced",
    recruited: true,
    deathSaves: { successes: 0, failures: 0, stable: false }
  };
}

function createNewGame(setup = {}) {
  const difficulty = ["story", "standard", "gritty"].includes(normalizeId(setup.difficulty))
    ? normalizeId(setup.difficulty)
    : "standard";
  const state = {
    schemaVersion: SCHEMA_VERSION,
    campaignId: CAMPAIGN.id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    turnCount: 0,
    difficulty,
    player: createPlayer(setup),
    party: [createCompanion("orin"), createCompanion("maren")],
    story: {
      nodeId: CAMPAIGN.startNode,
      visitedNodes: [],
      completedChoices: {},
      flags: {},
      clues: [],
      history: [],
      shortRestsUsed: {},
      lastOutcome: null
    },
    combat: null,
    logs: [],
    lastNarration: ""
  };
  W.init(state);
  ChatMemory.ensure(state, true);
  Improvise.normalize(state);
  Director.normalize(state);
  const events = [];
  enterNode(state, CAMPAIGN.startNode, events);
  pushLog(state, "GM", STORY_NODES[CAMPAIGN.startNode].opening, "story");
  return state;
}

function migrateLegacyState(raw) {
  const legacyClassMap = {
    warrior: "fighter",
    mage: "wizard",
    archer: "ranger",
    gunner: "ranger",
    monk: "fighter",
    cleric: "cleric",
    rogue: "rogue"
  };
  const legacyPlayer = raw?.player || {};
  const migrated = createNewGame({
    name: legacyPlayer.name || "Aster",
    classId: legacyClassMap[normalizeId(legacyPlayer.classId || legacyPlayer.class)] || "fighter",
    backgroundId: "outlander",
    abilities: legacyPlayer.abilities || {},
    difficulty: "standard"
  });
  migrated.logs.push({
    source: "System",
    type: "system",
    message: "A legacy V2 save was imported into a fresh V4 campaign. Character identity and compatible ability scores were retained; the old random-scene state was not."
  });
  return migrated;
}

function normalizeResourceState(resources, classDef, level, player = null) {
  const defaults = buildClassResources(classDef, level, player);
  const result = {};
  for (const [id, definition] of Object.entries(defaults)) {
    const incoming = resources?.[id];
    const current = typeof incoming === "number" ? incoming : incoming?.current;
    result[id] = {
      ...definition,
      current: clamp(Number.isFinite(Number(current)) ? Number(current) : definition.max, 0, definition.max)
    };
  }
  return result;
}

function normalizeIncomingState(raw) {
  if (!raw || typeof raw !== "object") return createNewGame();
  if (![3, 4].includes(Number(raw.schemaVersion))) { if (Number(raw.schemaVersion) > SCHEMA_VERSION) throw new Error("This save needs a newer game version."); return migrateLegacyState(raw); }
  const state = deepClone(raw);
  state.schemaVersion = SCHEMA_VERSION;
  const classDef = CLASSES[state.player?.classId] || CLASSES.fighter;
  const backgroundDef = BACKGROUNDS[state.player?.backgroundId] || BACKGROUNDS.outlander;
  const freshPlayer = createPlayer({
    name: state.player?.name,
    classId: classDef.id,
    backgroundId: backgroundDef.id,
    abilities: state.player?.abilities,
    difficulty: state.difficulty
  });
  state.player = {
    ...freshPlayer,
    ...state.player,
    classId: classDef.id,
    className: classDef.name,
    backgroundId: backgroundDef.id,
    backgroundName: backgroundDef.name,
    level: clamp(Math.floor(Number(state.player?.level || 1)), 1, P.MAX_LEVEL),
    xp: Math.max(0, Math.floor(Number(state.player?.xp || 0))),
    abilities: normalizeAbilities(state.player?.abilities, classDef.preset),
    skills: Array.isArray(state.player?.skills) ? state.player.skills.filter((id) => SKILLS[id]) : freshPlayer.skills,
    expertise: Array.isArray(state.player?.expertise) ? state.player.expertise.filter((id) => SKILLS[id]) : freshPlayer.expertise,
    savingThrows: Array.isArray(state.player?.savingThrows) ? state.player.savingThrows.filter((id) => ABILITIES[id]) : classDef.savingThrows,
    inventory: mergeInventory(state.player?.inventory || freshPlayer.inventory),
    equipment: { ...freshPlayer.equipment, ...(state.player?.equipment || {}) },
    conditions: Array.isArray(state.player?.conditions) ? state.player.conditions : [],
    used: state.player?.used && typeof state.player.used === "object" ? state.player.used : {},
    deathSaves: { successes: 0, failures: 0, stable: false, ...(state.player?.deathSaves || {}) }
  };
  state.player.resources = normalizeResourceState(state.player.resources, classDef, state.player.level, state.player);
  state.player.hitDice = {
    die: classDef.hitDie,
    max: P.hitDiceMax(state.player.level),
    current: clamp(Number(state.player?.hitDice?.current ?? state.player.level), 0, P.hitDiceMax(state.player.level))
  };
  state.player.maxHp = P.maxHp(state.player);
  state.player.gold = Number.isFinite(Number(state.player.gold)) ? clamp(Math.floor(Number(state.player.gold)), 0, 10000000) : 0;
  state.player.hp = clamp(Number(state.player.hp ?? state.player.maxHp), 0, state.player.maxHp);
  state.player.inspiration = clamp(Math.floor(Number(state.player.inspiration || 0)), 0, 3);
  applyEquipmentDerivedStats(state.player);

  state.party = Array.isArray(state.party) ? state.party : [];
  state.party = state.party
    .map((member) => {
      const base = COMPANIONS[member?.id];
      if (!base) return null;
      return {
        ...createCompanion(base.id),
        ...member,
        abilities: normalizeAbilities(member.abilities, base.abilities),
        skills: Array.isArray(member.skills) ? member.skills.filter((id) => SKILLS[id]) : base.skills,
        conditions: Array.isArray(member.conditions) ? member.conditions : [],
        hp: clamp(Number(member.hp ?? base.maxHp), 0, Number(member.maxHp || base.maxHp)),
        maxHp: Number(member.maxHp || base.maxHp),
        tactic: TACTICS.includes(member.tactic) ? member.tactic : base.tactic,
        bond: clamp(Number(member.bond ?? base.bond ?? 0), -5, 5),
        resources: { ...(base.resources || {}), ...(member.resources || {}) }
      };
    })
    .filter(Boolean);

  // Generated adventures must be installed before their story nodes are validated.
  Director.normalize(state);
  state.story = {
    nodeId: STORY_NODES[state.story?.nodeId] ? state.story.nodeId : CAMPAIGN.startNode,
    visitedNodes: Array.isArray(state.story?.visitedNodes) ? state.story.visitedNodes.filter((id) => STORY_NODES[id]) : [],
    completedChoices: state.story?.completedChoices && typeof state.story.completedChoices === "object" ? state.story.completedChoices : {},
    flags: state.story?.flags && typeof state.story.flags === "object" ? state.story.flags : {},
    clues: Array.isArray(state.story?.clues) ? [...new Set(state.story.clues.filter((id) => CLUES[id]))] : [],
    history: Array.isArray(state.story?.history) ? state.story.history.slice(-MAX_HISTORY) : [],
    shortRestsUsed: state.story?.shortRestsUsed && typeof state.story.shortRestsUsed === "object" ? state.story.shortRestsUsed : {},
    lastOutcome: state.story?.lastOutcome || null
  };
  state.logs = Array.isArray(state.logs) ? state.logs.slice(-MAX_LOGS) : [];
  state.difficulty = ["story", "standard", "gritty"].includes(state.difficulty) ? state.difficulty : "standard";
  state.turnCount = Math.max(0, Math.floor(Number(state.turnCount || 0)));
  state.updatedAt = nowIso();
  W.init(state);
  ChatMemory.ensure(state, true);
  Improvise.normalize(state);
  // Saves from when level 10 was the cap: XP earned past it becomes levels.
  // Boons chosen then are put away until renown starts again after the cap.
  if (state.player.level === 10 && state.player.xp >= Core.XP_THRESHOLDS[10]) {
    Core.checkLevelUp(state, []);
    pushLog(state, "Progression", `The level cap is now ${P.MAX_LEVEL}. Your experience past level 10 now counts as levels: ${state.player.name} is level ${state.player.level}. Renown ranks and boons return after level ${P.MAX_LEVEL}.`, "level");
  }
  if (state.combat?.active) normalizeCombat(state);
  else state.combat = null;
  Journal.sync(state);
  return state;
}

function clueCount(state) {
  return state.story.clues.length;
}

function addClue(state, clueId, events = []) {
  if (!CLUES[clueId] || state.story.clues.includes(clueId)) return false;
  state.story.clues.push(clueId);
  events.push({ type: "clue", tone: "good", text: `Clue discovered: ${CLUES[clueId].name}.` });
  return true;
}

function recruitCompanion(state, id, events = []) {
  if (!COMPANIONS[id] || findCompanion(state, id)) return false;
  state.party.push(createCompanion(id));
  events.push({ type: "party", tone: "good", text: `${COMPANIONS[id].name} joined the party.` });
  pushLog(state, "Party", `${COMPANIONS[id].name} joined the party.`, "party");
  return true;
}

function applyApproval(state, changes = {}, events = []) {
  for (const [id, deltaRaw] of Object.entries(changes || {})) {
    const member = findCompanion(state, id);
    if (!member) continue;
    const delta = Number(deltaRaw || 0);
    member.bond = clamp(Number(member.bond || 0) + delta, -5, 5);
    const direction = delta > 0 ? "approved" : delta < 0 ? "disapproved" : "was unaffected";
    if (delta) events.push({ type: "party", tone: delta > 0 ? "good" : "warning", text: `${member.name} ${direction} (${delta > 0 ? "+" : ""}${delta} bond).` });
  }
}

function currentNode(state) {
  return STORY_NODES[state.story.nodeId] || STORY_NODES[CAMPAIGN.startNode];
}

function enterNode(state, nodeId, events = []) {
  const node = STORY_NODES[nodeId];
  if (!node) return false;
  const firstVisit = !state.story.visitedNodes.includes(nodeId);
  state.story.nodeId = nodeId;
  if (state.world && node.questId) { state.world.activeQuest = node.questId; state.world.onExpedition = true; (state.world.progress[node.questId] ||= {}).node = nodeId; }
  if (state.world && node.townId) { state.world.townId = node.townId; state.world.onExpedition = false; }
  if (firstVisit) {
    state.story.visitedNodes.push(nodeId);
    if (!node.questId && !node.townId && !node.defeat && !node.sideStory) awardXp(state, 8, events, `Reached ${node.title}`);
    if (node.onEnter?.clues) for (const clue of node.onEnter.clues) addClue(state, clue, events);
    if (node.onEnter?.setFlags) Object.assign(state.story.flags, node.onEnter.setFlags);
    if (nodeId === "vault-antechamber" && state.player.level < 2) {
      awardXp(state, 120, events, "Planning the confrontation beneath Briarwatch");
    }
  }
  state.story.lastOutcome = {
    kind: "node",
    title: node.title,
    text: node.opening,
    location: node.location,
    act: node.act
  };
  recordHistory(state, `Entered ${node.title}.`, { kind: "node" });
  events.push({ type: "story", tone: "neutral", text: `${node.act}: ${node.title}` });
  return true;
}

function requirementStatus(state, requires = {}) {
  if (!requires || !Object.keys(requires).length) return { met: true, reason: "" };
  const flags = state.story.flags;
  const clues = state.story.clues;
  if (requires.clueCountMin && clueCount(state) < Number(requires.clueCountMin)) {
    return { met: false, reason: `Requires ${requires.clueCountMin} discovered clue${Number(requires.clueCountMin) === 1 ? "" : "s"}.` };
  }
  if (requires.flagsAll && !requires.flagsAll.every((flag) => Boolean(flags[flag]))) {
    return { met: false, reason: "Required prior consequence has not been established." };
  }
  if (requires.flagsAny && !requires.flagsAny.some((flag) => Boolean(flags[flag]))) {
    return { met: false, reason: "Requires information or access from an earlier decision." };
  }
  if (requires.cluesAll && !requires.cluesAll.every((clue) => clues.includes(clue))) {
    return { met: false, reason: "Required clue has not been discovered." };
  }
  if (requires.cluesAny && !requires.cluesAny.some((clue) => clues.includes(clue))) {
    return { met: false, reason: "Requires a relevant clue from an earlier investigation." };
  }
  if (requires.item && !hasItem(state, requires.item)) {
    return { met: false, reason: `Requires ${ITEMS[requires.item]?.name || titleCase(requires.item)}.` };
  }
  if (requires.companion && !findCompanion(state, requires.companion)) {
    return { met: false, reason: `Requires ${COMPANIONS[requires.companion]?.name || "a specific companion"}.` };
  }
  return { met: true, reason: "" };
}

function completedChoice(state, nodeId, choiceId) {
  return Array.isArray(state.story.completedChoices[nodeId]) && state.story.completedChoices[nodeId].includes(choiceId);
}

function markChoiceCompleted(state, nodeId, choiceId) {
  if (!state.story.completedChoices[nodeId]) state.story.completedChoices[nodeId] = [];
  if (!state.story.completedChoices[nodeId].includes(choiceId)) state.story.completedChoices[nodeId].push(choiceId);
}

function bestCheckSkill(actor, check) {
  const candidates = [check.skill, ...(check.alternateSkills || [])].filter(Boolean);
  if (!candidates.length) return null;
  return candidates
    .map((skillId) => ({ skillId, bonus: actorSkillBonus(actor, skillId) }))
    .sort((a, b) => b.bonus - a.bonus)[0];
}

function companionHelper(state, skillId, leadId) {
  if (!skillId) return null;
  const candidates = state.party
    .filter((member) => member.id !== leadId && member.hp > 0 && member.bond >= 0 && member.skills.includes(skillId))
    .map((member) => ({ member, bonus: actorSkillBonus(member, skillId) }))
    .sort((a, b) => b.bonus - a.bonus);
  return candidates[0]?.member || null;
}

function checkPlan(state, choice) {
  const check = choice.check;
  if (!check) return null;
  let actor = state.player;
  if (check.companion) actor = findCompanion(state, check.companion) || state.player;
  const skillPlan = bestCheckSkill(actor, check);
  const skillId = skillPlan?.skillId || null;
  const abilityId = check.ability || (skillId ? SKILLS[skillId].ability : null);
  let bonus = skillId ? skillPlan.bonus : actorAbilityBonus(actor, abilityId, false);
  const helper = check.companion ? null : companionHelper(state, skillId, actor.id);
  let advantage = Boolean(helper);
  let disadvantage = false;
  const reasons = [];
  if (helper) reasons.push(`${helper.name} can Help`);
  if (choice.advantageIfFlag && state.story.flags[choice.advantageIfFlag]) {
    advantage = true;
    reasons.push("prior preparation grants advantage");
  }
  if (choice.advantageIfItem && hasItem(state, choice.advantageIfItem)) {
    advantage = true;
    reasons.push(`${ITEMS[choice.advantageIfItem].name} grants advantage`);
  }
  if (check.tools?.some((itemId) => hasItem(state, itemId))) {
    advantage = true;
    const itemId = check.tools.find((candidate) => hasItem(state, candidate));
    reasons.push(`${ITEMS[itemId].name} assists`);
  }
  if (check.toolsRequiredOrPenalty && !hasItem(state, check.toolsRequiredOrPenalty)) {
    disadvantage = true;
    reasons.push(`missing ${ITEMS[check.toolsRequiredOrPenalty]?.name || "required tools"}`);
  }
  if (actor.id==='player' && actor.level>=6 && check.tools?.some(id=>hasItem(state,id))) { bonus+=2;reasons.push('Fieldcraft +2 with the listed tools'); }
  const cloak=ITEMS[actor.equipment?.accessory];
  const usesCloak=skillId==='survival' && cloak?.id==='thornward-cloak' && actor.used?.cloakReady;
  if(usesCloak){advantage=true;reasons.push('Thornward Cloak: first Survival check after a long rest');}
  const usesInspiration=state.player.inspirationPrepared && actor.id==='player' && !advantage;
  if(usesInspiration){advantage=true;reasons.push('Prepared Inspiration improves this check');}
  let dc=Number(check.dc||10);
  const quest=currentNode(state).questId;
  if(quest && state.story.flags[`prepared:${quest}`]){dc-=2;reasons.push('Established evidence lowers DC by 2');}
  if(quest && state.story.flags[`approach:${quest}`]){dc-=1;reasons.push('Successful approach lowers DC by 1');}
  if(quest==='beacon'){const n=['marsh_council','keystone_shared','district_consent','archive_open'].filter(f=>state.story.flags[f]).length;dc-=Math.min(3,n);if(n)reasons.push(`Independent allies lower DC by ${Math.min(3,n)}`);}
  if(state.story.flags.siteConsecrated && ['religion','arcana'].includes(skillId) && /shrine|vault/.test(currentNode(state).id)){dc-=2;reasons.push('Holy water consecration lowers ritual DC by 2');}
  const effectiveAdvantage = advantage && !disadvantage;
  const effectiveDisadvantage = disadvantage && !advantage;
  return { actor, skillId, abilityId, bonus, helper, advantage: effectiveAdvantage, disadvantage: effectiveDisadvantage, dc, reasons, usesInspiration, usesCloak };
}

function resolveStoryCheck(state, choice, rng, events) {
  const plan = checkPlan(state, choice);
  if (!plan) return { success: true, text: "" };
  if (plan.usesCloak) plan.actor.used.cloakReady=false;
  if (plan.usesInspiration) {
    state.player.inspirationPrepared = false;
    state.player.inspiration = Math.max(0, state.player.inspiration - 1);
    events.push({ type: "resource", tone: "neutral", text: "Inspiration spent for advantage." });
  }
  const d20 = rollD20(rng, { advantage: plan.advantage, disadvantage: plan.disadvantage });
  const total = d20.natural + plan.bonus;
  const success = total >= plan.dc;
  const checkName = plan.skillId ? SKILLS[plan.skillId].name : ABILITIES[plan.abilityId]?.name || "Check";
  const modeText = d20.mode === "normal" ? "" : ` (${d20.mode}: ${d20.rolls.join(", ")})`;
  const helperText = plan.helper ? ` ${plan.helper.name} helped.` : "";
  const rollText = `${plan.actor.name} rolled ${d20.natural}${modeText} ${formatSigned(plan.bonus)} = ${total} vs DC ${plan.dc} ${checkName}: ${success ? "success" : "failure"}.${helperText}`;
  events.push({ type: "roll", tone: success ? "good" : "bad", text: rollText, roll: { ...d20, bonus: plan.bonus, total, dc: plan.dc, checkName } });
  pushLog(state, "Dice", rollText, "roll", { success });
  return { success, plan, d20, total, text: rollText };
}

function applyDamageToEntity(entity, amount, events, source = "Hazard") {
  const damage = Math.max(0, Math.floor(Number(amount || 0)));
  if (!damage) return 0;
  const previous = entity.hp;
  entity.hp = Math.max(0, entity.hp - damage);
  const applied = previous - entity.hp;
  events.push({ type: "damage", tone: "bad", text: `${entity.name} took ${applied} damage from ${source}.` });
  if (previous > 0 && entity.hp === 0) events.push({ type: "condition", tone: "bad", text: `${entity.name} fell unconscious.` });
  return applied;
}

function healEntity(entity, amount, events, source = "Healing") {
  const healing = Math.max(0, Math.floor(Number(amount || 0)));
  const previous = entity.hp;
  entity.hp = Math.min(entity.maxHp, entity.hp + healing);
  const applied = entity.hp - previous;
  if (applied > 0) {
    entity.deathSaves = { successes: 0, failures: 0, stable: false };
    events.push({ type: "heal", tone: "good", text: `${entity.name} recovered ${applied} HP from ${source}.` });
  }
  return applied;
}

function applyOutcome(state, outcome = {}, rng, events) {
  if (outcome.recover) { W.recover(state, events, extensionApi()); return; }
  if (outcome.completeQuest) W.completeQuest(state, outcome.completeQuest, events, extensionApi());
  if (outcome.reputation) W.reputation(state, outcome.reputation);
  if (outcome.setFlags) Object.assign(state.story.flags, outcome.setFlags);
  if (outcome.clues) for (const clueId of outcome.clues) addClue(state, clueId, events);
  if (outcome.items) for (const entry of outcome.items) addItem(state, entry.itemId, entry.quantity, events);
  if (outcome.approval) applyApproval(state, outcome.approval, events);
  if (outcome.recruit) recruitCompanion(state, outcome.recruit, events);
  if (outcome.damage?.target === "player") {
    const damage = rollFormula(rng, outcome.damage.formula).total;
    applyDamageToEntity(state.player, damage, events, "a failed approach");
  }
  if (outcome.partyDamage) {
    for (const actor of [state.player, ...state.party]) {
      if (actor.hp <= 0) continue;
      const damage = rollFormula(rng, outcome.partyDamage).total;
      applyDamageToEntity(actor, damage, events, "the hazardous passage");
    }
  }
  if (outcome.poison) for (const actor of [state.player,...state.party]) {
    const save = savingThrow(state, actor, "con", 13, rng, events, "poison");
    if (!save.success && !actor.conditions.some(c=>c.id==="poisoned")) actor.conditions.push({id:"poisoned",name:"Poisoned: disadvantage on attacks"});
  }
  if (outcome.companionDamage?.id) {
    const companion = findCompanion(state, outcome.companionDamage.id);
    if (companion) applyDamageToEntity(companion, rollFormula(rng, outcome.companionDamage.formula).total, events, "the rescue");
  }
  if (outcome.text) {
    state.story.lastOutcome = { kind: "choice", title: currentNode(state).title, text: outcome.text };
    events.push({ type: "story", tone: "neutral", text: outcome.text });
    pushLog(state, "GM", outcome.text, "story");
  }
  if (outcome.nextNode) enterNode(state, outcome.nextNode, events);
  if (outcome.combat) startCombat(state, outcome.combat, rng, events);
}

function resolveDynamicFinalCombat(state) {
  if (state.story.flags.spiritFreed) return "finale-sable-only";
  if (state.story.flags.ritualWeakened || state.story.flags.ritualPartlyWeakened) return "finale-weakened";
  return "finale-full";
}

function resolveStoryChoice(state, choiceId, rng, events) {
  const node = currentNode(state);
  const choice = node.choices.find((candidate) => candidate.id === normalizeId(choiceId));
  if (!choice) return invalidResult(state, events, "That choice is not available in the current scene.");
  if(node.questId&&state.world.completed[node.questId])return invalidResult(state,events,"That expedition has already been resolved. Its decisions and rewards are final.");
  const firstResolution = !completedChoice(state, node.id, choice.id);
  if (choice.once && !firstResolution) {
    return invalidResult(state, events, "That approach has already been resolved.");
  }
  const requirement = requirementStatus(state, choice.requires);
  if (!requirement.met) return invalidResult(state, events, choice.lockedText || requirement.reason);

  let success = true;
  let outcome = choice.result || { text: choice.description, nextNode: choice.nextNode, combat: choice.combat };
  if (choice.check) {
    const checkResult = resolveStoryCheck(state, choice, rng, events);
    success = checkResult.success;
    outcome = success ? choice.success : choice.failure;
  } else if (choice.autoSuccess) {
    outcome = choice.result;
  } else {
    outcome = { ...outcome, nextNode: outcome.nextNode || choice.nextNode, combat: outcome.combat || choice.combat };
  }
  if (choice.dynamicCombat) outcome = { text: "The party enters together and the final battle begins.", combat: resolveDynamicFinalCombat(state) };
  markChoiceCompleted(state, node.id, choice.id);
  const summary = `${choice.label}: ${success ? "succeeded" : "failed"}.`;
  recordHistory(state, summary, { kind: "choice", choiceId: choice.id, success });
  // Revisiting a hub or travel transition remains legal, but it cannot be
  // exploited for unlimited XP. Only the first resolution of a choice grants
  // progression credit.
  if (firstResolution && !node.questId && !node.townId && !node.defeat) awardXp(state, success ? 14 : 7, events, choice.label);
  applyOutcome(state, outcome || {}, rng, events);
  return { ok: true, kind: "story", success, outcomeText: outcome?.text || "" };
}

function prepareInspiration(state, events) {
  if (state.combat?.active) return invalidResult(state, events, "Inspiration for story checks must be prepared outside combat.");
  if (state.player.inspiration <= 0) return invalidResult(state, events, "No Inspiration remains.");
  state.player.inspirationPrepared = !state.player.inspirationPrepared;
  const message = state.player.inspirationPrepared
    ? "Inspiration is prepared: it will only be spent when it improves a player-led check; redundant advantage does not consume it."
    : "Inspiration preparation cancelled.";
  events.push({ type: "resource", tone: "neutral", text: message });
  return { ok: true, kind: "resource", outcomeText: message };
}

function equipItem(state,itemId,events,actorId='player') {
  const r=G.equip(state,normalizeId(itemId),actorId);
  if(!r.ok)return invalidResult(state,events,r.error);
  events.push({type:'equipment',tone:'good',text:r.message});
  return {ok:true,kind:'equipment',outcomeText:r.message};
}

function unequipItem(state,slot,events,actorId='player') {
  const r=G.unequip(state,slot,actorId);
  if(!r.ok)return invalidResult(state,events,r.error);
  events.push({type:'equipment',tone:'neutral',text:r.message});
  return {ok:true,kind:'equipment',outcomeText:r.message};
}

function storyUseItem(state, itemId, targetId, rng, events) {
  const id = normalizeId(itemId);
  const item = ITEMS[id];
  const entry = inventoryEntry(state, id);
  if (!item || !entry) return invalidResult(state, events, "That item is not in your inventory.");
  if (!item.usable?.contexts?.includes("story")) return invalidResult(state, events, `${item.name} has no general out-of-combat use here; its purpose is shown in the inventory card.`);
  const target = targetId === "player" || !targetId ? state.player : findCompanion(state, targetId);
  if (!target) return invalidResult(state, events, "Choose a valid party target.");
  if (item.usable.effect === "heal" || item.usable.effect === "healersKit") {
    if (target.hp >= target.maxHp) return invalidResult(state, events, `${target.name} is already at full health.`);
    const roll = rollFormula(rng, item.usable.formula);
    const applied=healEntity(target, roll.total+P.stats(state.player).healing, events, item.name);
    consumeItemUse(state, id);
    return { ok: true, kind: "item", outcomeText: `${target.name} uses ${item.name} and recovers ${applied} HP.` };
  }
  if (item.usable.effect === "cure") {
    const before = target.conditions.length;
    target.conditions = target.conditions.filter((condition) => condition.id !== item.usable.condition);
    if (before === target.conditions.length) {
      if (target.conditions.some(c=>c.id==="poisonWard")) return invalidResult(state, events, `${target.name} already has protection for the next poison save.`);
      target.conditions.push({id:"poisonWard",name:"Antitoxin: advantage on next poison save",uses:1});
      consumeItemUse(state,id);
      return {ok:true,kind:"item",outcomeText:`${target.name} prepares Antitoxin for the next poison saving throw.`};
    }
    consumeItemUse(state, id);
    return { ok: true, kind: "item", outcomeText: `${item.name} removed ${titleCase(item.usable.condition)} from ${target.name}.` };
  }
  if (item.usable.effect === "coating") {
    if(target.conditions.some(c=>c.id==="coating"))return invalidResult(state,events,"That party member already has an unused coating.");
    target.conditions.push({id:"coating",name:"Ward oil: +1d4 radiant on next 3 weapon hits",uses:3});consumeItemUse(state,id);
    return {ok:true,kind:"item",outcomeText:`${target.name} prepares Ward Oil for three successful weapon hits.`};
  }
  if (item.usable.effect === "holyWater") {
    const node = currentNode(state);
    if (!node.id.includes("shrine") && node.id !== "bell-vault") return invalidResult(state, events, "There is no profaned focus here that holy water can meaningfully affect.");
    if(state.story.flags.siteConsecrated)return invalidResult(state,events,"This site is already consecrated. No flask was consumed.");
    consumeItemUse(state, id);
    state.story.flags.siteConsecrated = true;
    events.push({ type: "item", tone: "good", text: "Holy water lowers Arcana and Religion check DCs at the shrine and bell vault by 2." });
    return { ok: true, kind: "item", outcomeText: "The holy water hisses across the old stone and the hostile resonance recedes." };
  }
  return invalidResult(state, events, `${item.name} cannot be used that way.`);
}

function shortRest(state, rng, events) {
  const node = currentNode(state);
  if (state.combat?.active) return invalidResult(state, events, "You cannot take a short rest during combat.");
  if (!node.safeRest) return invalidResult(state, events, "This location is not safe enough for a short rest.");
  if (state.story.shortRestsUsed[node.id]) return invalidResult(state, events, "The party has already rested at this location.");
  if (state.player.hitDice.current <= 0 && state.player.hp >= state.player.maxHp) return invalidResult(state, events, "No hit dice remain and the player is already at full health.");
  state.story.shortRestsUsed[node.id] = true;
  if (state.player.hitDice.current > 0 && state.player.hp < state.player.maxHp) {
    state.player.hitDice.current -= 1;
    const result = rollFormula(rng, `1d${state.player.hitDice.die}${abilityModifier(state.player.abilities.con) >= 0 ? "+" : ""}${abilityModifier(state.player.abilities.con)}`);
    healEntity(state.player, Math.max(1, result.total), events, "a spent Hit Die");
  }
  for (const resource of Object.values(state.player.resources)) {
    if (resource.refresh === "short") resource.current = resource.max;
  }
  for (const companion of state.party) {
    if (companion.hp > 0 && companion.hp < companion.maxHp) healEntity(companion, rollFormula(rng, "1d6+2").total, events, "the short rest");
    P.refreshCompanion(companion, 'short');
  }
  state.player.conditions = state.player.conditions.filter((condition) => !["bleeding", "frightened", "deafened"].includes(condition.id));
  const message = "The party takes a guarded short rest, spends recovery resources, and reviews what it has learned.";
  state.story.lastOutcome = { kind: "rest", title: node.title, text: message };
  recordHistory(state, "Took a short rest.", { kind: "rest" });
  pushLog(state, "Party", message, "rest");
  return { ok: true, kind: "rest", outcomeText: message };
}

function talkToCompanion(state, companionId, events) {
  const companion = findCompanion(state, companionId);
  if (!companion) return invalidResult(state, events, "That companion is not currently in the party.");
  const nodeId = currentNode(state).id;
  const line = companion.dialogue?.[nodeId] || companion.dialogue?.default || "They consider the situation in silence.";
  const bondTone = companion.bond >= 3 ? " Their trust in you is evident." : companion.bond <= -2 ? " They remain guarded around you." : "";
  const text = `${companion.name}: “${line}”${bondTone}`;
  events.push({ type: "dialogue", tone: "neutral", text });
  pushLog(state, companion.name, line, "dialogue");
  state.story.lastOutcome = { kind: "dialogue", title: `Conversation with ${companion.name}`, text };
  return { ok: true, kind: "dialogue", outcomeText: text };
}

function setTactic(state, companionId, tactic, events) {
  const companion = findCompanion(state, companionId);
  const normalized = normalizeId(tactic);
  if (!companion) return invalidResult(state, events, "That companion is not in the party.");
  if (!TACTICS.includes(normalized)) return invalidResult(state, events, "Unknown companion tactic.");
  companion.tactic = normalized;
  const active=state.combat?.actors.find(a=>a.refId===companion.id);if(active)active.tactic=normalized;
  const text = `${companion.name}'s combat tactic is now ${titleCase(normalized)}.`;
  events.push({ type: "party", tone: "neutral", text });
  return { ok: true, kind: "party", outcomeText: text };
}

function findChoiceByFreeText(state,text) {
  const norm=String(text).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const stop=new Set(['the','and','with','from','that','this','into','then','have','would','like','want','please']);
  const words=norm.split(' ').filter(w=>w.length>3&&!stop.has(w));
  const options=storyChoicesView(state).filter(c=>!c.locked&&!c.completed);
  const ranked=options.map(c=>{const label=c.label.toLowerCase();return {c,score:words.filter(w=>label.includes(w)).length};}).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score);
  if(!ranked.length||(ranked[1]&&ranked[1].score===ranked[0].score))return null;
  return currentNode(state).choices.find(c=>c.id===ranked[0].c.id);
}

function improvisedStoryAction(state,text,rng,events) {
  return invalidResult(state,events,'That approach has no implemented consequence here. Nothing was spent or rolled. Use an offered story choice, or type a supported command such as “buy 2 healing potions”, “use antitoxin on Orin”, “talk to Maren”, or “return to town”.');
}

// Claude-proposed free-form action. The proposal is re-validated and bounded
// here on every call, so a stale or edited proposal can never exceed the caps.
function previewImprovised(state, raw) {
  const v=Improvise.validate(raw);if(!v.ok)return v;
  const plan=Improvise.bound(state,v.proposal,state.story.nodeId);if(!plan.ok)return plan;
  if(plan.dc===null)return {...plan,check:null};
  const p=plan.proposal,check=checkPlan(state,{check:{skill:p.skill||undefined,ability:p.skill?undefined:p.ability,dc:plan.dc}});
  const mode=check.advantage?'advantage':check.disadvantage?'disadvantage':'normal';
  const name=check.skillId?SKILLS[check.skillId].name:ABILITIES[check.abilityId]?.name||'Check';
  return {...plan,check:{actor:check.actor.name,name,bonus:check.bonus,dc:check.dc,mode,chance:Math.round(successProbability(check.dc,check.bonus,mode)*100),reasons:check.reasons}};
}

function resolveImprovised(state, raw, rng, events) {
  const preview=previewImprovised(state,raw);if(!preview.ok)return invalidResult(state,events,preview.error);
  const sceneId=state.story.nodeId,p=preview.proposal;
  let success=true;
  if(preview.dc!==null)success=resolveStoryCheck(state,{check:{skill:p.skill||undefined,ability:p.skill?undefined:p.ability,dc:preview.dc}},rng,events).success;
  const text=Improvise.apply(state,preview,success,sceneId,rng,events,{rollFormula,awardXp,applyDamage:applyDamageToEntity});
  recordHistory(state,`Improvised: ${p.intent} (${success?'success':'failure'}). ${text}`);
  state.story.lastOutcome={kind:'improvise',title:currentNode(state).title,text};
  pushLog(state,'GM',text,'story');
  Journal.sync(state);
  return {ok:true,kind:'improvise',outcomeText:text,success};
}

function resolveFreeform(state,text,rng,events) {
  const normalized=normalizeId(text).replace(/^i\s+/,'');
  if(!normalized||normalized.length>600)return invalidResult(state,events,'Describe an action in 1–600 characters.');
  if(/^(return|go back) to (town|the town)/.test(normalized))return W.handle(state,{type:'return-town'},rng,events,extensionApi());
  if(/^(buy|purchase|sell|equip|use)\b/.test(normalized)){
    const aliases={'healing-potion':['healing potion','potion of healing'],'greater-healing':['greater healing'],'healers-kit':["healer's kit",'healers kit'],'antitoxin':['antitoxin','antidote'],'holy-water':['holy water'],'iron-longsword':['iron longsword','longsword']};
    const candidates=Object.values(ITEMS).filter(i=>[i.name.toLowerCase(),i.id.replaceAll('-',' '),...(aliases[i.id]||[])].some(a=>normalized.includes(a))).sort((a,b)=>b.name.length-a.name.length);
    const item=candidates[0];if(!item)return invalidResult(state,events,'Name an item shown in the inventory or current shop. No action was taken.');
    const namedTarget=state.party.find(m=>normalized.includes(m.id)||normalized.includes(m.name.toLowerCase()));
    const explicitTarget=normalized.match(/\b(?:on|for)\s+(.+)$/)?.[1];
    if(explicitTarget&&!namedTarget&&!['me','myself','the hero','hero','player',state.player.name.toLowerCase()].includes(explicitTarget))return invalidResult(state,events,'That target is not in your party. No item was used or equipped.');
    const target=namedTarget?.id||'player';
    if(/^(buy|purchase|sell)/.test(normalized)){
      const number=normalized.match(/\b(\d+|one|two|three|four|five)\b/);const words={one:1,two:2,three:3,four:4,five:5};
      const quantity=number?(words[number[1]]||Number(number[1])):1;
      return W.handle(state,{type:normalized.startsWith('sell')?'sell':'buy',itemId:item.id,quantity,market:W.town(state)?'town':'merchant'},rng,events,extensionApi());
    }
    if(normalized.startsWith('equip'))return equipItem(state,item.id,events,target);
    return storyUseItem(state,item.id,target,rng,events);
  }
  if(/^talk\s+(to\s+)?/.test(normalized)){
    const member=state.party.find(m=>normalized.includes(m.id)||normalized.includes(m.name.toLowerCase()));
    if(member)return talkToCompanion(state,member.id,events);
  }
  if(/^(short rest|rest here|take a short rest)$/.test(normalized))return shortRest(state,rng,events);
  if(/^(rest|sleep|stay at the inn)$/.test(normalized))return W.handle(state,{type:'town-service',serviceId:'civic-rest'},rng,events,extensionApi());
  const matched=findChoiceByFreeText(state,normalized);
  if(matched){state.pendingIntent={sceneId:state.story.nodeId,choiceId:matched.id,label:matched.label};return {ok:true,kind:'clarification',outcomeText:`Proposed interpretation: “${matched.label}”. Confirm it below before any roll or scene change.`};}
  return improvisedStoryAction(state,text,rng,events);
}

function resolveAction(rawState, rawAction, rng = Math.random) {
  const state=normalizeIncomingState(rawState);
  const action=rawAction&&typeof rawAction==='object'?rawAction:{type:'freeform',text:String(rawAction||'')};
  const events=[];state.turnCount+=1;state.updatedAt=nowIso();let result;
  if(!['chat-instructions','courier'].includes(action.type))ChatMemory.ensure(state).pending=null;
  if(action.type==='chat-instructions')result=ChatMemory.instructions(state,action.text);
  else if(action.type==='courier')result=Courier.apply(state,action.optionId,rng,events,{...extensionApi(),hasItem,checkPlan});
  else if(action.type==='road')result=Road.apply(state,action.optionId,rng,events,{...extensionApi(),hasItem,checkPlan});
  else if(action.type==='set-tactic')result=setTactic(state,action.companionId,action.tactic,events);
  else if(state.combat?.active){
    result=action.type==='combat'?resolveCombatAction(state,action,rng,events):invalidResult(state,events,'Use combat controls while initiative is active.');
  } else if(action.type==='confirm-intent'){
    const pending=state.pendingIntent;state.pendingIntent=null;
    result=pending&&pending.sceneId===state.story.nodeId?resolveStoryChoice(state,pending.choiceId,rng,events):invalidResult(state,events,'That interpretation has expired.');
  } else if(action.type==='cancel-intent'){state.pendingIntent=null;result={ok:true,kind:'clarification',outcomeText:'Proposed interpretation cancelled. No action was taken.'};}
  else if(action.type==='story-choice') {state.pendingIntent=null;result=resolveStoryChoice(state,action.choiceId,rng,events);}
  else if(action.type==='freeform')result=resolveFreeform(state,action.text,rng,events);
  else if(action.type==='improvise')result=resolveImprovised(state,action.proposal,rng,events);
  else if(action.type==='director-commission'||action.type==='director-dismiss'||action.type==='adventure-tier'){
    const r=action.type==='director-commission'?Director.commission(state,action.draft,events):action.type==='adventure-tier'?Director.setTier(state,String(action.questId||''),String(action.tier||''),events):Director.dismiss(state,String(action.questId||''),events);
    result=r.ok?r:invalidResult(state,events,r.error);
  }
  else if(action.type==='equip')result=equipItem(state,action.itemId,events,action.actorId||'player');
  else if(action.type==='unequip')result=unequipItem(state,action.slot,events,action.actorId||'player');
  else if(action.type==='use-item')result=storyUseItem(state,action.itemId,action.targetId,rng,events);
  else if(action.type==='short-rest')result=shortRest(state,rng,events);
  else if(action.type==='talk')result=talkToCompanion(state,action.companionId,events);
  else if(action.type==='prepare-inspiration')result=prepareInspiration(state,events);
  else result=W.handle(state,action,rng,events,extensionApi())||invalidResult(state,events,'Unknown action type.');
  if(ChatMemory.ensure(state).courier?.active&&!Courier.available(state)){
    state.chat.courier.active=false;state.chat.pending=null;
    events.push({type:'story',text:'The courier side story is paused while you leave Briarwatch or enter combat. Its discoveries are retained.'});
  }
  if(ChatMemory.ensure(state).road?.active&&!Road.present(state)){
    state.chat.road.active=false;state.chat.pending=null;
    events.push({type:'story',text:'Lantern Road paused. Its confirmed progress and promises remain in your save.'});
  }
  if(action.type==='road'&&result.ok&&result.outcomeText)state.story.lastOutcome={kind:'road',title:Road.TITLE,text:result.outcomeText};
  G.normalizeEquipment(state);
  if(state.player.hp<=0&&!state.combat?.active&&!currentNode(state).defeat){state.player.hp=1;events.push({type:'warning',tone:'warning',text:'Outside combat, the party prevents a lethal collapse; the hero remains at 1 HP.'});}
  if(result.ok&&result.outcomeText&&['world','item','equipment','rest','party','level','dialogue','clarification'].includes(result.kind))state.story.lastOutcome={kind:result.kind,title:currentNode(state).title,text:result.outcomeText};
  if(currentNode(state).questId)(state.world.progress[currentNode(state).questId]||={}).node=state.story.nodeId;
  if(result.ok&&result.outcomeText&&action.type!=='chat-instructions')ChatMemory.append(state,'rules',result.outcomeText);
  const eventText=events.map(e=>e.text).filter(Boolean).join(' ');if(eventText)pushLog(state,'Rules',eventText,'mechanics');
  return {state,view:buildView(state),events,result};
}

function extensionApi(){return {addItem,awardXp,enterNode,startCombat,recruitCompanion};}

function setupCatalog() {
  return {
    campaign: {
      id: CAMPAIGN.id,
      title: CAMPAIGN.title,
      subtitle: CAMPAIGN.subtitle,
      premise: CAMPAIGN.premise,
      levelRange: CAMPAIGN.levelRange
    },
    classes: Object.values(CLASSES).map((entry) => ({
      id: entry.id,
      name: entry.name,
      role: entry.role,
      hitDie: entry.hitDie,
      primaryAbility: entry.primaryAbility,
      description: entry.description,
      preset: entry.preset,
      savingThrows: entry.savingThrows,
      defaultSkills: entry.defaultSkills,
      resources: entry.resources,
      actions: entry.actions.map((action) => ({ id: action.id, name: action.name, cost: action.cost, description: action.description }))
    })),
    backgrounds: Object.values(BACKGROUNDS),
    abilities: ABILITIES,
    skills: SKILLS,
    pointBuy: { budget: 27, min: 8, max: 15 },
    difficulties: [
      { id: "story", name: "Story", description: "Lower incoming damage and slightly weaker enemies. Decisions and checks remain consequential." },
      { id: "standard", name: "Standard", description: "Balanced for the player plus active companions, with meaningful resource pressure." },
      { id: "gritty", name: "Gritty", description: "Stronger enemies and higher incoming damage. Saving before major fights is recommended." }
    ]
  };
}

Object.assign(module.exports, {
  SCHEMA_VERSION,
  enterNode, extensionApi, currentNode, requirementStatus, completedChoice, checkPlan, createNewGame, normalizeIncomingState, resolveAction, setupCatalog, previewImprovised,
  buildView: View.buildView,
  addItem: Core.addItem,
  hasItem: Core.hasItem,
  playerAttackProfile: Core.playerAttackProfile,
  applyEquipmentDerivedStats: Core.applyEquipmentDerivedStats,
  startCombat: Combat.startCombat,
  awardXp: Core.awardXp,
  successProbability: Core.successProbability,
  savingThrow: Combat.savingThrow,
  objectivePlan: Combat.objectivePlan
});
