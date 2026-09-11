"use strict";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const dom = {
  toastRegion: $("#toastRegion"),
  setupOverlay: $("#setupOverlay"),
  setupPremise: $("#setupPremise"),
  setupName: $("#setupName"),
  setupBackground: $("#setupBackground"),
  setupDifficulty: $("#setupDifficulty"),
  backgroundDescription: $("#backgroundDescription"),
  difficultyDescription: $("#difficultyDescription"),
  classCards: $("#classCards"),
  useClassPresetBtn: $("#useClassPresetBtn"),
  abilityBuilder: $("#abilityBuilder"),
  pointSpent: $("#pointSpent"),
  pointStatus: $("#pointStatus"),
  setupSummaryName: $("#setupSummaryName"),
  setupSummaryIdentity: $("#setupSummaryIdentity"),
  setupSummaryStats: $("#setupSummaryStats"),
  setupFeatureList: $("#setupFeatureList"),
  startCampaignBtn: $("#startCampaignBtn"),
  setupError: $("#setupError"),
  gameLayout: $("#gameLayout"),
  campaignTitle: $("#campaignTitle"),
  campaignSubtitle: $("#campaignSubtitle"),
  narratorBadge: $("#narratorBadge"),
  saveQuickBtn: $("#saveQuickBtn"),
  newGameBtn: $("#newGameBtn"),
  playerIdentity: $("#playerIdentity"),
  playerLevel: $("#playerLevel"),
  playerHp: $("#playerHp"),
  playerAc: $("#playerAc"),
  playerProf: $("#playerProf"),
  hpMeter: $("#hpMeter"),
  playerConditions: $("#playerConditions"),
  resourceList: $("#resourceList"),
  inspirationBtn: $("#inspirationBtn"),
  toggleSkillsBtn: $("#toggleSkillsBtn"),
  abilitySummary: $("#abilitySummary"),
  skillSummary: $("#skillSummary"),
  partyCards: $("#partyCards"),
  sceneAct: $("#sceneAct"),
  sceneLocation: $("#sceneLocation"),
  sceneTitle: $("#sceneTitle"),
  sceneObjective: $("#sceneObjective"),
  narrationSource: $("#narrationSource"),
  narrationText: $("#narrationText"),
  combatPanel: $("#combatPanel"),
  combatTitle: $("#combatTitle"),
  combatRound: $("#combatRound"),
  initiativeTrack: $("#initiativeTrack"),
  turnEconomy: $("#turnEconomy"),
  combatActions: $("#combatActions"),
  choicePanel: $("#choicePanel"),
  storyChoices: $("#storyChoices"),
  shortRestBtn: $("#shortRestBtn"),
  actionForm: $("#actionForm"),
  actionInput: $("#actionInput"),
  actionSubmitBtn: $("#actionSubmitBtn"),
  clearEventsBtn: $("#clearEventsBtn"),
  eventFeed: $("#eventFeed"),
  equipmentSlots: $("#equipmentSlots"),
  inventoryCards: $("#inventoryCards"),
  clueList: $("#clueList"),
  historyList: $("#historyList"),
  saveSlotInput: $("#saveSlotInput"),
  saveBtn: $("#saveBtn"),
  refreshSavesBtn: $("#refreshSavesBtn"),
  saveList: $("#saveList"),
  targetDialog: $("#targetDialog"),
  targetDialogTitle: $("#targetDialogTitle"),
  targetDialogDescription: $("#targetDialogDescription"),
  targetOptions: $("#targetOptions"),
  targetDialogClose: $("#targetDialogClose")
};

let catalog = null;
let narratorInfo = null;
let state = null;
let view = null;
let lastNarration = null;
let busy = false;
let eventHistory = [];
let targetAction = null;

const setup = {
  classId: "fighter",
  backgroundId: "outlander",
  difficulty: "standard",
  abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 13, cha: 10 }
};

const pointCosts = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const abilityOrder = ["str", "dex", "con", "int", "wis", "cha"];
const slotLabels = { mainHand: "Main hand", offHand: "Off hand", armor: "Armor", accessory: "Accessory" };

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function signed(value) {
  const number = Number(value || 0);
  return number >= 0 ? `+${number}` : String(number);
}

function titleCase(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function percentage(current, max) {
  return Math.max(0, Math.min(100, (Number(current || 0) / Math.max(1, Number(max || 1))) * 100));
}

function setBusy(next) {
  busy = Boolean(next);
  document.body.classList.toggle("is-busy", busy);
  for (const control of $$('button, select')) {
    if (!control.dataset.keepEnabled) control.disabled = busy || control.dataset.disabled === "true";
  }
  dom.actionInput.disabled = busy;
}

function toast(message, tone = "neutral") {
  const item = createElement("div", `toast toast-${tone}`);
  item.textContent = message;
  // Fast successive actions must not cover the whole mobile screen.
  while (dom.toastRegion.children.length >= 3) dom.toastRegion.firstElementChild.remove();
  dom.toastRegion.appendChild(item);
  window.setTimeout(() => item.classList.add("is-visible"), 10);
  window.setTimeout(() => {
    item.classList.remove("is-visible");
    window.setTimeout(() => item.remove(), 220);
  }, 3600);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = { error: `Unexpected ${response.status} response.` };
  }
  if (!response.ok && response.status !== 422) throw new Error(payload.error || `Request failed (${response.status}).`);
  return { response, payload };
}

function selectedClass() {
  return catalog?.classes?.find((entry) => entry.id === setup.classId) || catalog?.classes?.[0];
}

function selectedBackground() {
  return catalog?.backgrounds?.find((entry) => entry.id === setup.backgroundId) || catalog?.backgrounds?.[0];
}

function selectedDifficulty() {
  return catalog?.difficulties?.find((entry) => entry.id === setup.difficulty) || catalog?.difficulties?.[0];
}

function pointBuySpent() {
  return abilityOrder.reduce((sum, id) => sum + (pointCosts[setup.abilities[id]] ?? 99), 0);
}

function abilityModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

function renderSetupSelectors() {
  clear(dom.setupBackground);
  for (const background of catalog.backgrounds) {
    const option = createElement("option", "", background.name);
    option.value = background.id;
    dom.setupBackground.appendChild(option);
  }
  dom.setupBackground.value = setup.backgroundId;

  clear(dom.setupDifficulty);
  for (const difficulty of catalog.difficulties) {
    const option = createElement("option", "", difficulty.name);
    option.value = difficulty.id;
    dom.setupDifficulty.appendChild(option);
  }
  dom.setupDifficulty.value = setup.difficulty;
}

function renderClassCards() {
  clear(dom.classCards);
  for (const classDef of catalog.classes) {
    const button = createElement("button", `class-card ${classDef.id === setup.classId ? "is-selected" : ""}`);
    button.type = "button";
    button.dataset.classId = classDef.id;
    const head = createElement("div", "class-card-head");
    head.append(createElement("strong", "", classDef.name), createElement("span", "class-role", classDef.role));
    button.append(head, createElement("p", "", classDef.description));
    const meta = createElement("div", "class-card-meta");
    meta.append(
      createElement("span", "tag", `d${classDef.hitDie} hit die`),
      createElement("span", "tag", `${classDef.primaryAbility.toUpperCase()} primary`)
    );
    button.appendChild(meta);
    button.addEventListener("click", () => {
      setup.classId = classDef.id;
      setup.abilities = { ...classDef.preset };
      renderSetup();
    });
    dom.classCards.appendChild(button);
  }
}

function renderAbilityBuilder() {
  clear(dom.abilityBuilder);
  for (const id of abilityOrder) {
    const ability = catalog.abilities[id];
    const score = setup.abilities[id];
    const card = createElement("div", "ability-builder-card");
    const top = createElement("div", "ability-builder-top");
    const nameBlock = createElement("div");
    nameBlock.append(createElement("strong", "", ability.name), createElement("span", "ability-code", id.toUpperCase()));
    top.append(nameBlock, createElement("span", "modifier-badge", signed(abilityModifier(score))));
    const controls = createElement("div", "score-controls");
    const minus = createElement("button", "score-button", "−");
    minus.type = "button";
    minus.dataset.disabled = String(score <= 8);
    minus.disabled = busy || score <= 8;
    minus.addEventListener("click", () => {
      setup.abilities[id] = Math.max(8, score - 1);
      renderSetup();
    });
    const value = createElement("strong", "score-value", score);
    const plus = createElement("button", "score-button", "+");
    plus.type = "button";
    plus.dataset.disabled = String(score >= 15);
    plus.disabled = busy || score >= 15;
    plus.addEventListener("click", () => {
      const next = Math.min(15, score + 1);
      const projected = pointBuySpent() - pointCosts[score] + pointCosts[next];
      if (projected > 27) {
        toast("The 27-point budget would be exceeded.", "warning");
        return;
      }
      setup.abilities[id] = next;
      renderSetup();
    });
    controls.append(minus, value, plus);
    card.append(top, controls, createElement("p", "", ability.summary));
    dom.abilityBuilder.appendChild(card);
  }
}

function renderSetupSummary() {
  const classDef = selectedClass();
  const background = selectedBackground();
  const difficulty = selectedDifficulty();
  const name = dom.setupName.value.trim() || "Aster";
  dom.setupSummaryName.textContent = name;
  dom.setupSummaryIdentity.textContent = `Level 1 ${classDef.name} · ${background.name} · ${difficulty.name}`;
  clear(dom.setupSummaryStats);
  const conMod = abilityModifier(setup.abilities.con);
  const startingHp = Math.max(1, classDef.hitDie + conMod);
  const previewStats = [
    ["Starting HP", startingHp],
    ["Hit die", `d${classDef.hitDie}`],
    ["Primary ability", classDef.primaryAbility.toUpperCase()],
    ["Saving throws", classDef.savingThrows.map((id) => id.toUpperCase()).join(", ")]
  ];
  for (const [label, value] of previewStats) {
    dom.setupSummaryStats.append(createElement("dt", "", label), createElement("dd", "", value));
  }
  clear(dom.setupFeatureList);
  for (const feature of classDef.actions) {
    const item = createElement("div", "feature-item");
    const heading = createElement("div", "feature-heading");
    heading.append(createElement("strong", "", feature.name), createElement("span", "cost-badge", feature.cost));
    item.append(heading, createElement("p", "", feature.description));
    dom.setupFeatureList.appendChild(item);
  }
}

function renderSetup() {
  if (!catalog) return;
  dom.setupPremise.textContent = catalog.campaign.premise;
  renderSetupSelectors();
  renderClassCards();
  renderAbilityBuilder();
  const spent = pointBuySpent();
  dom.pointSpent.textContent = `${spent} / 27`;
  dom.pointStatus.textContent = spent === 27 ? "Budget fully assigned." : `${27 - spent} point${27 - spent === 1 ? "" : "s"} unspent.`;
  dom.pointStatus.className = spent > 27 ? "form-error" : "muted";
  dom.startCampaignBtn.dataset.disabled = String(spent > 27);
  dom.startCampaignBtn.disabled = busy || spent > 27;
  dom.backgroundDescription.textContent = selectedBackground().summary;
  dom.difficultyDescription.textContent = selectedDifficulty().description;
  renderSetupSummary();
}

function ingestPayload(payload, { appendEvents = true } = {}) {
  if (payload.state) state = payload.state;
  if (payload.view) view = payload.view;
  if (payload.narration) lastNarration = payload.narration;
  if (appendEvents && Array.isArray(payload.events) && payload.events.length) {
    eventHistory.push(...payload.events.map((event) => ({ ...event, at: Date.now() })));
    eventHistory = eventHistory.slice(-120);
  }
  if (payload.result?.ok === false) toast(payload.result.error || "The rules rejected that action.", "warning");
  renderGame();
}

async function startCampaign() {
  dom.setupError.textContent = "";
  const spent = pointBuySpent();
  if (spent > 27) {
    dom.setupError.textContent = "Ability scores exceed the 27-point budget.";
    return;
  }
  setBusy(true);
  try {
    const { payload } = await api("/api/session/new", {
      method: "POST",
      body: JSON.stringify({
        setup: {
          name: dom.setupName.value.trim() || "Aster",
          classId: setup.classId,
          backgroundId: setup.backgroundId,
          difficulty: setup.difficulty,
          abilities: setup.abilities
        }
      })
    });
    eventHistory = [];
    ingestPayload(payload);
    dom.setupOverlay.classList.add("is-hidden");
    dom.gameLayout.classList.remove("is-hidden");
    dom.saveSlotInput.value = `${state.player.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-briarwatch`;
    toast("Campaign started. The listed choices are authoritative story routes.", "good");
  } catch (error) {
    dom.setupError.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

async function sendAction(action) {
  if (!state || busy) return;
  setBusy(true);
  try {
    const { payload } = await api("/api/action", {
      method: "POST",
      body: JSON.stringify({ state, action })
    });
    ingestPayload(payload);
  } catch (error) {
    toast(error.message, "bad");
  } finally {
    setBusy(false);
  }
}

function renderNarratorBadge() {
  if (!narratorInfo) return;
  if (["ai", "ai-chat", "ai-proposal"].includes(lastNarration?.source)) {
    dom.narratorBadge.textContent = `Narrator: AI · ${lastNarration.model || narratorInfo.model || "configured model"}`;
    dom.narratorBadge.className = "status-badge status-online";
  } else if (lastNarration?.source === "deterministic-fallback") {
    dom.narratorBadge.textContent = "Narrator: deterministic fallback";
    dom.narratorBadge.className = "status-badge status-warning";
  } else {
    dom.narratorBadge.textContent = narratorInfo.enabled ? "Narrator: AI configured" : "Narrator: deterministic story prose";
    dom.narratorBadge.className = `status-badge ${narratorInfo.enabled ? "status-online" : ""}`;
  }
}

function conditionLabel(condition) {
  const label=condition.name || titleCase(condition.id);
  if(!condition.expiresRound)return label;
  const source=view?.combat?.actors.find(a=>a.id===condition.sourceId)?.name;
  return `${label} · ends round ${condition.expiresRound}, ${source?source+"'s":"owner's"} turn`;
}

function renderPlayer() {
  const player = view.player;
  const specialization=view.progression?.techniques.find(a=>a.id===`spec:${view.progression.specialization}`)?.name;
  dom.playerIdentity.textContent = `${player.name} · ${player.className}${specialization ? ` · ${specialization}` : ""}`;
  dom.playerLevel.textContent = `Level ${player.level}`;
  dom.playerHp.textContent = `${player.hp} / ${player.maxHp}`;
  dom.playerAc.textContent = player.ac;
  dom.playerProf.textContent = signed(player.proficiency);
  dom.hpMeter.style.width = `${percentage(player.hp, player.maxHp)}%`;
  dom.hpMeter.dataset.health = percentage(player.hp, player.maxHp) <= 30 ? "low" : percentage(player.hp, player.maxHp) <= 60 ? "mid" : "high";

  clear(dom.playerConditions);
  if (!player.conditions.length) dom.playerConditions.appendChild(createElement("span", "tag tag-muted", "No conditions"));
  for (const condition of player.conditions) dom.playerConditions.appendChild(createElement("span", "tag tag-warning", conditionLabel(condition)));

  clear(dom.resourceList);
  for (const resource of Object.values(player.resources || {})) {
    const row = createElement("div", "resource-row");
    row.append(createElement("span", "", resource.name), createElement("strong", "", `${resource.current} / ${resource.max}`));
    dom.resourceList.appendChild(row);
  }
  const hitDieRow = createElement("div", "resource-row");
  hitDieRow.append(createElement("span", "", `Hit Dice (d${player.hitDice.die})`), createElement("strong", "", `${player.hitDice.current} / ${player.hitDice.max}`));
  dom.resourceList.appendChild(hitDieRow);

  dom.inspirationBtn.textContent = player.inspirationPrepared
    ? `Inspiration prepared (${player.inspiration} available)`
    : `Prepare Inspiration (${player.inspiration} available)`;
  dom.inspirationBtn.dataset.disabled = String(Boolean(view.combat?.active || player.inspiration <= 0));
  dom.inspirationBtn.disabled = busy || view.combat?.active || player.inspiration <= 0;
  dom.inspirationBtn.classList.toggle("is-active", player.inspirationPrepared);
}

function renderAbilities() {
  clear(dom.abilitySummary);
  for (const id of abilityOrder) {
    const ability = view.player.abilities[id];
    const item = createElement("div", "ability-pill");
    item.title = ability.summary;
    item.append(createElement("span", "", id.toUpperCase()), createElement("strong", "", ability.score), createElement("em", "", signed(ability.modifier)));
    dom.abilitySummary.appendChild(item);
  }

  clear(dom.skillSummary);
  const skills = Object.values(view.player.skills).sort((a, b) => b.bonus - a.bonus || a.name.localeCompare(b.name));
  for (const skill of skills) {
    const row = createElement("div", `skill-row ${skill.proficient ? "is-proficient" : ""}`);
    const name = createElement("span", "", skill.name);
    if (skill.expertise) name.appendChild(createElement("small", "expertise-label", " Expertise"));
    row.append(name, createElement("strong", "", signed(skill.bonus)));
    dom.skillSummary.appendChild(row);
  }
}

function bondLabel(bond) {
  if (bond >= 4) return "Devoted";
  if (bond >= 2) return "Trusting";
  if (bond >= 0) return "Steady";
  if (bond >= -2) return "Guarded";
  return "Hostile";
}

function renderParty() {
  clear(dom.partyCards);
  for (const member of view.party) {
    const card = createElement("article", `party-card ${member.currentTurn ? "is-current" : ""}`);
    const head = createElement("div", "party-card-head");
    const identity = createElement("div");
    identity.append(createElement("strong", "", member.name), createElement("span", "", member.role));
    head.append(identity, createElement("span", "bond-badge", `${bondLabel(member.bond)} ${signed(member.bond)}`));
    const hpLine = createElement("div", "party-hp-line");
    hpLine.append(createElement("span", "", `HP ${member.hp}/${member.maxHp}`), createElement("span", "", `AC ${member.ac}`));
    const meter = createElement("div", "meter meter-small");
    const fill = createElement("div", "meter-fill");
    fill.style.width = `${percentage(member.hp, member.maxHp)}%`;
    fill.dataset.health = percentage(member.hp, member.maxHp) <= 30 ? "low" : percentage(member.hp, member.maxHp) <= 60 ? "mid" : "high";
    meter.appendChild(fill);
    const conditionRow = createElement("div", "tag-row");
    for (const condition of member.conditions || []) conditionRow.appendChild(createElement("span", "tag tag-warning", conditionLabel(condition)));
    const controls = createElement("div", "party-controls");
    const select = createElement("select", "tactic-select");
    select.setAttribute("aria-label", `${member.name} tactic`);
    for (const tactic of member.tactics) {
      const option = createElement("option", "", titleCase(tactic));
      option.value = tactic;
      select.appendChild(option);
    }
    select.value = member.tactic;
    select.addEventListener("change", () => sendAction({ type: "set-tactic", companionId: member.id, tactic: select.value }));
    const talk = createElement("button", "btn btn-ghost btn-small", "Ask advice");
    talk.type = "button";
    talk.dataset.disabled = String(Boolean(view.combat?.active));
    talk.disabled = busy || Boolean(view.combat?.active);
    talk.title = view.combat?.active ? "Companion conversations resume after initiative ends." : "Ask for this companion's current perspective.";
    talk.addEventListener("click", () => sendAction({ type: "talk", companionId: member.id }));
    controls.append(select, talk);
    card.append(head, createElement("p", "party-summary", member.summary), hpLine, meter, conditionRow, controls);
    dom.partyCards.appendChild(card);
  }
}

function checkSummary(check) {
  if (!check) return "No roll required";
  const parts = [`${check.actor}: ${check.skill} ${signed(check.bonus)} vs DC ${check.dc}`, `${check.probability}% estimated`];
  if (check.mode !== "normal") parts.push(check.mode);
  if (check.helper) parts.push(`${check.helper} helps`);
  return parts.join(" · ");
}

function renderStoryChoices() {
  clear(dom.storyChoices);
  const choices = view.scene.choices;
  if (!choices.length) {
    const message = view.scene.defeat
      ? "This campaign state is a defeat. Load a save or begin a new campaign."
      : view.scene.ending
        ? "The chapter has reached its epilogue."
        : "No story choices are available while combat is active.";
    dom.storyChoices.appendChild(createElement("p", "empty-state", message));
    return;
  }
  for (const choice of choices) {
    const card = createElement("button", `choice-card ${choice.locked ? "is-locked" : ""} ${choice.completed ? "is-completed" : ""}`);
    card.type = "button";
    card.dataset.choiceId=choice.id;
    card.dataset.disabled = String(choice.locked || choice.completed);
    card.disabled = busy || choice.locked || choice.completed;
    const head = createElement("div", "choice-card-head");
    head.append(createElement("strong", "", choice.label));
    if (choice.completed) head.appendChild(createElement("span", "tag tag-good", "Resolved"));
    else if (choice.locked) head.appendChild(createElement("span", "tag tag-muted", "Locked"));
    else if (choice.check) head.appendChild(createElement("span", `odds-badge ${choice.check.probability < 50 ? "odds-low" : choice.check.probability >= 75 ? "odds-high" : ""}`, `${choice.check.probability}%`));
    else head.appendChild(createElement("span", "tag", "No roll"));
    card.append(head, createElement("p", "", choice.description));
    const metaText = choice.locked ? choice.lockedReason : checkSummary(choice.check);
    card.appendChild(createElement("div", `choice-meta ${choice.locked ? "locked-reason" : ""}`, metaText));
    card.addEventListener("click", () => sendAction({ type: "story-choice", choiceId: choice.id }));
    dom.storyChoices.appendChild(card);
  }
}

function actorHealthClass(actor) {
  if (actor.hp <= 0) return "is-down";
  const ratio = actor.hp / actor.maxHp;
  if (ratio <= 0.3) return "is-critical";
  if (ratio <= 0.6) return "is-wounded";
  return "";
}

function renderCombat() {
  const combat = view.combat;
  dom.combatPanel.classList.toggle("is-hidden", !combat?.active);
  dom.choicePanel.classList.toggle("is-hidden", Boolean(combat?.active));
  dom.actionInput.disabled = busy;
  dom.actionSubmitBtn.dataset.disabled = "false";
  dom.actionSubmitBtn.disabled = busy;
  if (!combat?.active) return;

  dom.combatTitle.textContent = combat.name;
  dom.combatRound.textContent = `Round ${combat.round} · ${combat.currentActorName}`;
  clear(dom.initiativeTrack);
  for (const actor of combat.actors) {
    const card = createElement("div", `initiative-card ${actor.team} ${actor.current ? "is-current" : ""} ${actorHealthClass(actor)}`);
    const top = createElement("div", "initiative-card-head");
    top.append(createElement("strong", "", actor.name), createElement("span", "initiative-number", actor.initiative));
    const stats = createElement("div", "initiative-stats");
    stats.append(createElement("span", "", `HP ${actor.hp}/${actor.maxHp}`), createElement("span", "", `AC ${actor.ac}`));
    const tags = createElement("div", "tag-row");
    for (const condition of actor.conditions || []) tags.appendChild(createElement("span", "tag tag-warning", conditionLabel(condition)));
    if (actor.unconscious) tags.appendChild(createElement("span", "tag tag-bad", "Unconscious"));
    card.append(top, stats, tags);
    dom.initiativeTrack.appendChild(card);
  }

  clear(dom.turnEconomy);
  if (combat.economy) {
    const action = createElement("span", `economy-chip ${combat.economy.actionUsed ? "is-used" : ""}`, combat.economy.actionUsed ? "Action used" : "Action ready");
    const bonus = createElement("span", `economy-chip ${combat.economy.bonusUsed ? "is-used" : ""}`, combat.economy.bonusUsed ? "Bonus used" : "Bonus ready");
    dom.turnEconomy.append(action, bonus);
  } else {
    dom.turnEconomy.appendChild(createElement("span", "muted", "Companion and enemy turns resolve automatically according to initiative."));
  }

  clear(dom.combatActions);
  if (!combat.actions.length) {
    dom.combatActions.appendChild(createElement("p", "empty-state", "Automatic turns are resolving."));
    return;
  }
  for (const action of combat.actions) {
    const button = createElement("button", `combat-action ${action.disabled ? "is-disabled" : ""}`);
    button.type = "button";
    button.dataset.disabled = String(Boolean(action.disabled));
    button.disabled = busy || action.disabled;
    const head = createElement("div", "combat-action-head");
    head.append(createElement("strong", "", action.name), createElement("span", `cost-badge cost-${action.cost}`, action.cost));
    button.append(head, createElement("p", "", action.disabled ? `${action.description} ${action.disabledReason}` : action.description));
    button.dataset.actionId = action.id;
    button.addEventListener("click", () => chooseCombatAction(action));
    dom.combatActions.appendChild(button);
  }
}

function chooseCombatAction(action) {
  if (action.disabled) return;
  if (["enemy", "ally"].includes(action.targetKind)) {
    const targets = action.targets || [];
    if (targets.length === 1) {
      void sendAction({ type: "combat", actionId: action.id, targetId: targets[0].id });
      return;
    }
    openTargetDialog({
      title: action.name,
      description: action.description,
      targets,
      onChoose: (targetId) => sendAction({ type: "combat", actionId: action.id, targetId })
    });
    return;
  }
  void sendAction({ type: "combat", actionId: action.id, targetId: action.targets?.[0]?.id });
}

function renderScene() {
  dom.sceneAct.textContent = view.scene.act;
  dom.sceneLocation.textContent = view.scene.location;
  dom.sceneTitle.textContent = view.scene.title;
  dom.sceneObjective.textContent = view.scene.objective;
  const text = lastNarration?.text || state.lastNarration || view.scene.lastOutcome?.text || view.scene.opening;
  dom.narrationText.textContent = text;
  dom.narrationSource.textContent = ["ai", "ai-chat", "ai-proposal"].includes(lastNarration?.source)
    ? `AI prose · mechanics locked`
    : lastNarration?.source === "save"
      ? "Saved narration · no new action"
      : lastNarration?.source === "save-recap"
        ? "Saved-game recap · no new action"
        : lastNarration?.source === "deterministic-fallback"
          ? "Local fallback · mechanics locked"
          : "Deterministic prose · mechanics locked";
  dom.shortRestBtn.classList.toggle("is-hidden", !view.scene.canShortRest);
  dom.shortRestBtn.dataset.disabled = String(!view.scene.canShortRest);
  dom.shortRestBtn.disabled = busy || !view.scene.canShortRest;
  renderStoryChoices();
  renderCombat();
}

function renderEquipment() {
  clear(dom.equipmentSlots);
  for (const slot of view.equipment) {
    const card = createElement("div", "equipment-slot");
    const top = createElement("div", "equipment-slot-head");
    top.append(createElement("span", "", slotLabels[slot.slot] || titleCase(slot.slot)));
    if (slot.item) top.appendChild(createElement("strong", "", slot.item.name));
    else top.appendChild(createElement("strong", "muted", "Empty"));
    card.appendChild(top);
    if (slot.item) {
      card.appendChild(createElement("p", "", slot.item.purpose));
      const unequip = createElement("button", "text-button", "Unequip");
      unequip.type = "button";
      unequip.dataset.disabled = String(Boolean(view.combat?.active));
      unequip.disabled = busy || Boolean(view.combat?.active);
      unequip.title = view.combat?.active ? "Equipment changes are locked during initiative." : "Unequip this item.";
      unequip.addEventListener("click", () => sendAction({ type: "unequip", slot: slot.slot }));
      card.appendChild(unequip);
    }
    dom.equipmentSlots.appendChild(card);
  }
}

function useStoryItem(item) {
  if (view.combat?.active) {
    toast("Use combat items from the combat action panel so action economy and targets remain explicit.", "warning");
    return;
  }
  if (item.targetKind === "ally") {
    const targets = [{ id: "player", name: view.player.name, hp: view.player.hp, maxHp: view.player.maxHp }, ...view.party.map((member) => ({ id: member.id, name: member.name, hp: member.hp, maxHp: member.maxHp }))];
    openTargetDialog({
      title: `Use ${item.name}`,
      description: item.purpose,
      targets,
      onChoose: (targetId) => sendAction({ type: "use-item", itemId: item.id, targetId })
    });
    return;
  }
  void sendAction({ type: "use-item", itemId: item.id, targetId: "player" });
}

function renderInventory() {
  renderEquipment();
  clear(dom.inventoryCards);
  if (!view.inventory.length) {
    dom.inventoryCards.appendChild(createElement("p", "empty-state", "The pack is empty."));
    return;
  }
  const sorted = [...view.inventory].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  for (const item of sorted) {
    const card = createElement("article", "inventory-card");
    const head = createElement("div", "inventory-card-head");
    const identity = createElement("div");
    identity.append(createElement("strong", "", item.name), createElement("span", "", `${titleCase(item.category)} · ${item.rarity}`));
    const quantity = createElement("span", "quantity-badge", item.charges !== undefined ? `×${item.quantity} · ${item.charges} uses in open kit` : `×${item.quantity}`);
    head.append(identity, quantity);
    const purpose = createElement("div", "purpose-box");
    purpose.append(createElement("span", "", "Purpose"), createElement("p", "", item.purpose));
    const actions = createElement("div", "inventory-actions");
    if (item.canEquip) {
      const equip = createElement("button", "btn btn-secondary btn-small", item.equippedSlots.length ? "Re-equip" : "Equip");
      equip.type = "button";
      equip.dataset.equipItem = item.id;
      equip.dataset.disabled = String(Boolean(view.combat?.active));
      equip.disabled = busy || Boolean(view.combat?.active);
      equip.title = view.combat?.active ? "Equipment changes are locked during initiative." : "Equip this item.";
      equip.addEventListener("click", () => chooseEquipmentOwner(item));
      actions.appendChild(equip);
    }
    if (item.canUseStory) {
      const use = createElement("button", "btn btn-ghost btn-small", "Use");
      use.type = "button";
      use.dataset.useItem = item.id;
      use.dataset.disabled = String(Boolean(view.combat?.active));
      use.disabled = busy || Boolean(view.combat?.active);
      use.title = view.combat?.active ? "Use this item from the combat action panel." : "Use this item.";
      use.addEventListener("click", () => useStoryItem(item));
      actions.appendChild(use);
    }
    if (item.equippedSlots.length) actions.appendChild(createElement("span", "tag tag-good", `Equipped: ${item.equippedSlots.map((slot) => slotLabels[slot]).join(", ")}`));
    if(item.allocated) actions.appendChild(createElement("span", "tag", `${item.allocated} assigned to party · ${item.available} spare`));
    card.append(head, createElement("p", "item-description", item.description), purpose, actions);
    dom.inventoryCards.appendChild(card);
  }
}

function renderJournal() {
  clear(dom.clueList);
  if (!view.clues.length) dom.clueList.appendChild(createElement("p", "empty-state", "No firm clues have been established yet."));
  for (const clue of view.clues) {
    const card = createElement("article", "clue-card");
    card.append(createElement("strong", "", clue.name), createElement("p", "", clue.text));
    dom.clueList.appendChild(card);
  }
  if (view.scene.endingSummary?.length) {
    const ending = createElement("article", "ending-summary");
    ending.appendChild(createElement("strong", "", "Epilogue consequences"));
    const list = createElement("ul");
    for (const line of view.scene.endingSummary) list.appendChild(createElement("li", "", line));
    ending.appendChild(list);
    dom.clueList.prepend(ending);
  }

  clear(dom.historyList);
  for (const entry of [...view.history].reverse()) {
    const item = createElement("li");
    item.append(createElement("span", "history-turn", `Turn ${entry.turn}`), createElement("p", "", entry.summary));
    dom.historyList.appendChild(item);
  }
}

function eventIcon(type) {
  return ({ roll: "d20", damage: "−HP", heal: "+HP", clue: "?", item: "+", party: "P", level: "↑", combat: "⚔", warning: "!", condition: "◎", xp: "XP", resource: "◇" })[type] || "•";
}

function renderEvents() {
  clear(dom.eventFeed);
  if (!eventHistory.length) {
    dom.eventFeed.appendChild(createElement("p", "empty-state", "Resolved dice, damage, healing, conditions, loot, and relationship changes appear here."));
    return;
  }
  for (const event of [...eventHistory].reverse().slice(0, 45)) {
    const row = createElement("div", `event-row event-${event.tone || "neutral"}`);
    row.append(createElement("span", "event-icon", eventIcon(event.type)), createElement("p", "", event.text));
    dom.eventFeed.appendChild(row);
  }
}

function renderGame() {
  if (!state || !view) return;
  dom.gameLayout.classList.remove("is-hidden");
  dom.campaignTitle.textContent = view.campaign.title;
  dom.campaignSubtitle.textContent = view.campaign.subtitle;
  renderNarratorBadge();
  renderPlayer();
  renderAbilities();
  renderParty();
  renderScene();
  renderInventory();
  renderJournal();
  renderEvents();
  if (typeof renderExpansion === "function") renderExpansion();
  if (window.BriarwatchChat) window.BriarwatchChat.render();
  setBusy(busy);
}

function openTargetDialog({ title, description, targets, onChoose }) {
  targetAction = { onChoose };
  dom.targetDialogTitle.textContent = title;
  dom.targetDialogDescription.textContent = description;
  clear(dom.targetOptions);
  for (const target of targets) {
    const button = createElement("button", `target-option ${target.hp <= 0 ? "is-down" : ""}`);
    button.type = "button";
    const top = createElement("div", "target-option-head");
    top.append(createElement("strong", "", target.name));
    if(target.hp!==undefined)top.append(createElement("span", "", `HP ${target.hp}/${target.maxHp}`));
    button.appendChild(top);
    if(target.detail)button.appendChild(createElement("p", "", target.detail));
    button.dataset.targetId=target.id;
    if (target.ac !== undefined) button.appendChild(createElement("span", "muted", `Armor Class ${target.ac}`));
    if (target.unconscious) button.appendChild(createElement("span", "tag tag-bad", "Unconscious"));
    button.dataset.disabled=String(Boolean(target.disabled));button.disabled=Boolean(target.disabled);
    button.addEventListener("click", () => {
      closeTargetDialog();
      void onChoose(target.id);
    });
    dom.targetOptions.appendChild(button);
  }
  dom.targetDialog.classList.remove("is-hidden");
}

function closeTargetDialog() {
  targetAction = null;
  dom.targetDialog.classList.add("is-hidden");
}

async function saveGame(slotOverride) {
  if (!state) return;
  const slot = String(slotOverride || dom.saveSlotInput.value || "quick-save").trim();
  setBusy(true);
  try {
    const { payload } = await api("/api/session/save", {
      method: "POST",
      body: JSON.stringify({ slot, state })
    });
    dom.saveSlotInput.value = payload.slot;
    localStorage.setItem("dnd-ai-gm-v4-last-slot", payload.slot);
    toast(`Saved as “${payload.slot}”.`, "good");
    await refreshSaves();
  } catch (error) {
    toast(error.message, "bad");
  } finally {
    setBusy(false);
  }
}

async function loadGame(slot) {
  setBusy(true);
  try {
    const { payload } = await api(`/api/session/load?slot=${encodeURIComponent(slot)}`);
    eventHistory = [];
    ingestPayload(payload, { appendEvents: false });
    dom.setupOverlay.classList.add("is-hidden");
    dom.saveSlotInput.value = slot;
    localStorage.setItem("dnd-ai-gm-v4-last-slot", slot);
    toast(`Loaded “${slot}”.`, "good");
  } catch (error) {
    toast(error.message, "bad");
  } finally {
    setBusy(false);
  }
}

async function deleteGame(slot) {
  setBusy(true);
  try {
    await api(`/api/session/delete?slot=${encodeURIComponent(slot)}`, { method: "DELETE" });
    toast(`Deleted “${slot}”.`, "neutral");
    await refreshSaves();
  } catch (error) {
    toast(error.message, "bad");
  } finally {
    setBusy(false);
  }
}

async function refreshSaves() {
  try {
    const { payload } = await api("/api/session/list");
    clear(dom.saveList);
    if (!payload.saves.length) {
      dom.saveList.appendChild(createElement("p", "empty-state", "No save files yet."));
      return;
    }
    for (const save of payload.saves) {
      const card = createElement("article", `save-card ${save.corrupted ? "is-corrupted" : ""}`);
      const info = createElement("div");
      info.append(createElement("strong", "", save.slot), createElement("span", "", save.corrupted ? "Unreadable save" : `${save.playerName} · Level ${save.level} · ${save.scene}`));
      const controls = createElement("div", "save-actions");
      const load = createElement("button", "btn btn-secondary btn-small", "Load");
      load.type = "button";
      load.dataset.disabled = String(Boolean(save.corrupted));
      load.disabled = busy || save.corrupted;
      load.addEventListener("click", () => loadGame(save.slot));
      const remove = createElement("button", "btn btn-ghost btn-small", "Delete");
      remove.type = "button";
      remove.addEventListener("click", () => deleteGame(save.slot));
      controls.append(load, remove);
      card.append(info, controls);
      dom.saveList.appendChild(card);
    }
  } catch (error) {
    toast(`Could not list saves: ${error.message}`, "bad");
  }
}

function setActiveTab(tab) {
  for (const button of $$(".tab-button")) button.classList.toggle("is-active", button.dataset.tab === tab);
  $("#tabInventory").classList.toggle("is-hidden", tab !== "inventory");
  $("#tabJournal").classList.toggle("is-hidden", tab !== "journal");
  $("#tabSaves").classList.toggle("is-hidden", tab !== "saves");
  if (tab === "saves") void refreshSaves();
}

function wireEvents() {
  dom.setupName.addEventListener("input", renderSetupSummary);
  dom.setupBackground.addEventListener("change", () => {
    setup.backgroundId = dom.setupBackground.value;
    renderSetup();
  });
  dom.setupDifficulty.addEventListener("change", () => {
    setup.difficulty = dom.setupDifficulty.value;
    renderSetup();
  });
  dom.useClassPresetBtn.addEventListener("click", () => {
    setup.abilities = { ...selectedClass().preset };
    renderSetup();
  });
  dom.startCampaignBtn.addEventListener("click", startCampaign);
  dom.newGameBtn.addEventListener("click", () => {
    state = null;
    view = null;
    lastNarration = null;
    eventHistory = [];
    dom.setupOverlay.classList.remove("is-hidden");
    dom.gameLayout.classList.add("is-hidden");
    renderSetup();
  });
  dom.saveQuickBtn.addEventListener("click", () => saveGame(localStorage.getItem("dnd-ai-gm-v4-last-slot") || dom.saveSlotInput.value || "quick-save"));
  dom.inspirationBtn.addEventListener("click", () => sendAction({ type: "prepare-inspiration" }));
  dom.toggleSkillsBtn.addEventListener("click", () => {
    const hidden = dom.skillSummary.classList.toggle("is-hidden");
    dom.toggleSkillsBtn.textContent = hidden ? "Show skills" : "Hide skills";
  });
  dom.shortRestBtn.addEventListener("click", () => sendAction({ type: "short-rest" }));
  dom.actionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = dom.actionInput.value.trim();
    if (!text) return;
    dom.actionInput.value = "";
    if (window.BriarwatchChat) void window.BriarwatchChat.send(text);
    else void sendAction({ type: "freeform", text });
  });
  dom.clearEventsBtn.addEventListener("click", () => {
    eventHistory = [];
    renderEvents();
  });
  dom.saveBtn.addEventListener("click", () => saveGame());
  dom.refreshSavesBtn.addEventListener("click", refreshSaves);
  for (const button of $$(".tab-button")) button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  dom.targetDialogClose.addEventListener("click", closeTargetDialog);
  dom.targetDialog.addEventListener("click", (event) => {
    if (event.target === dom.targetDialog) closeTargetDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTargetDialog();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveGame(localStorage.getItem("dnd-ai-gm-v4-last-slot") || dom.saveSlotInput.value || "quick-save");
    }
  });
}

async function initialize() {
  wireEvents();
  setBusy(true);
  try {
    const { payload } = await api("/api/setup");
    catalog = payload.catalog;
    narratorInfo = payload.narrator;
    setup.classId = catalog.classes[0].id;
    setup.backgroundId = catalog.backgrounds.find((entry) => entry.id === "outlander")?.id || catalog.backgrounds[0].id;
    setup.difficulty = "standard";
    setup.abilities = { ...catalog.classes[0].preset };
    dom.saveSlotInput.value = localStorage.getItem("dnd-ai-gm-v4-last-slot") || "briarwatch-01";
    renderSetup();
    renderNarratorBadge();
    await refreshSaves();
  } catch (error) {
    dom.setupError.textContent = `The local server could not be reached: ${error.message}`;
  } finally {
    setBusy(false);
  }
}

void initialize();
