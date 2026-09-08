"use strict";

const { CAMPAIGN, STORY_NODES, CLUES, ITEMS } = require("./content");

const RAW_PROVIDER_URL =
  process.env.LM_STUDIO_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "https://api.openai.com/v1/chat/completions";
const AI_PROVIDER_URL = /\/chat\/completions\/?$/.test(RAW_PROVIDER_URL) ? RAW_PROVIDER_URL : RAW_PROVIDER_URL.replace(/\/$/, "")+(RAW_PROVIDER_URL.replace(/\/$/, "").endsWith("/v1")?"/chat/completions":"/v1/chat/completions");
const AI_MODEL = process.env.AI_MODEL || "gpt-4.1-mini";
const AI_KEY = process.env.OPENAI_API_KEY || "";
const AI_NARRATOR_MODE = String(process.env.AI_NARRATOR || "off").toLowerCase();
const AI_TIMEOUT_MS = Math.max(3000, Number(process.env.AI_TIMEOUT_MS || 20000));

function compactFlags(flags = {}) {
  return Object.entries(flags)
    .filter(([, value]) => Boolean(value))
    .slice(-30)
    .map(([key]) => key)
    .join(", ") || "none";
}

function inventoryFacts(state) {
  return state.player.inventory
    .map((entry) => `${ITEMS[entry.itemId]?.name || entry.itemId} ×${entry.quantity}${entry.charges !== undefined ? ` (${entry.charges} uses)` : ""}`)
    .join(", ") || "none";
}

function companionFacts(state) {
  return state.party
    .map((member) => {
      const currentLine = member.personality || member.summary || "";
      return `${member.name} (${member.role}; bond ${member.bond}; tactic ${member.tactic}; HP ${member.hp}/${member.maxHp}). Current perspective: ${currentLine}`;
    })
    .join("\n") || "No companions.";
}

function recentHistory(state) {
  return state.story.history
    .slice(-10)
    .map((entry) => `- ${entry.summary}`)
    .join("\n") || "- The campaign has just begun.";
}

function eventFacts(events = []) {
  return events
    .slice(-16)
    .map((event) => `- [${event.type}] ${event.text}`)
    .join("\n") || "- No mechanical event beyond the scene opening.";
}

function combatFacts(view) {
  if (!view.combat?.active) return "No active combat.";
  const actors = view.combat.actors
    .map((actor) => `${actor.name} (${actor.team}) HP ${actor.hp}/${actor.maxHp}, AC ${actor.ac}${actor.conditions.length ? `, conditions: ${actor.conditions.map((condition) => condition.name || condition.id).join(", ")}` : ""}`)
    .join("; ");
  return `Round ${view.combat.round}; current turn: ${view.combat.currentActorName}. ${actors}`;
}

function buildNarratorPrompt(state, view, action, events) {
  const node = STORY_NODES[state.story.nodeId];
  const clues = state.story.clues.map((id) => `${CLUES[id].name}: ${CLUES[id].text}`).join("\n") || "none";
  const playerAction = action?.type === "freeform"
    ? action.text
    : action?.choiceId || action?.actionId || action?.itemId || action?.type || "scene opening";
  return [
    "CAMPAIGN FRAME — public setting facts",
    `Title: ${CAMPAIGN.title}`,
    `Premise: ${CAMPAIGN.premise}`,
    `Themes: ${CAMPAIGN.themes.join(", ")}`,
    "",
    "INFORMATION BOUNDARY: Hidden campaign facts and unrevealed routes are deliberately omitted. Never infer them.",
    "",
    "CURRENT SCENE — authoritative",
    `Act: ${node.act}`,
    `Location: ${node.location}`,
    `Scene: ${node.title}`,
    `Objective: ${node.objective}`,
    `Baseline scene description: ${node.opening}`,
    `Latest resolved outcome: ${state.story.lastOutcome?.text || "none"}`,
    "",
    "PLAYER AND PARTY — authoritative",
    `Player: ${state.player.name}, level ${state.player.level} ${state.player.className}, ${state.player.backgroundName}; HP ${state.player.hp}/${state.player.maxHp}; AC ${state.player.ac}.`,
    `Inventory: ${inventoryFacts(state)}`,
    companionFacts(state),
    "",
    "DISCOVERED CLUES — player knows only these",
    clues,
    `Available public approaches: ${view.scene.choices.filter(c=>!c.completed&&!c.locked).map(c=>c.label).join("; ")}`,
    `Adventure record: ${(view.world?.completed||[]).map(q=>`${q.name}: ${q.quality}`).join("; ")||"No contracts reported yet."}`,
    "",
    "RECENT CANONICAL HISTORY",
    recentHistory(state),
    "",
    "LATEST PLAYER INPUT AND RULES RESULT",
    `Input: ${playerAction}`,
    eventFacts(events),
    `Combat state: ${combatFacts(view)}`
  ].join("\n");
}

function deterministicFallback(state, view, action, events) {
  const node = STORY_NODES[state.story.nodeId];
  const rejected=events.find(e=>e.type==="warning");
  const substantive=events.some(e=>["roll","damage","heal","story","item","world","rest","reward","objective","combat","party","level"].includes(e.type));
  const outcome = rejected&&!substantive ? rejected.text : (state.story.lastOutcome?.text || node.opening);
  const seen = new Set([outcome]);
  const mechanics = events
    .filter((event) => ["story", "roll", "damage", "heal", "combat", "condition", "clue", "item", "party", "level", "world", "rest", "reward", "objective", "feature", "practice", "warning"].includes(event.type))
    .map((event) => String(event.text || "").trim())
    .filter((text) => text && !seen.has(text) && (seen.add(text) || true))
    .slice(-4)
    .join(" ");
  const companionBeat = '';
  const actionLead = action?.type === "freeform" && action.text ? `You attempt: ${action.text}. ` : "";
  const body = `${actionLead}${outcome}${mechanics ? ` ${mechanics}` : ""}${companionBeat}`.replace(/\s+/g, " ").trim();
  return body || "The party pauses as the consequences of the last decision settle into place.";
}

function narratorEnabled() {
  if (AI_NARRATOR_MODE === "off" || AI_NARRATOR_MODE === "false" || AI_NARRATOR_MODE === "0") return false;
  if (AI_NARRATOR_MODE === "on" || AI_NARRATOR_MODE === "true" || AI_NARRATOR_MODE === "1") return true;
  return Boolean(AI_KEY || process.env.LM_STUDIO_BASE_URL);
}

function trimNarration(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json|text)?/i, "")
    .replace(/```$/i, "")
    .replace(/^Narration:\s*/i, "")
    .trim();
  return cleaned.length > 1800 ? `${cleaned.slice(0, 1797)}…` : cleaned;
}

async function callNarrator(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const headers = { "Content-Type": "application/json" };
  if (AI_KEY) headers.Authorization = `Bearer ${AI_KEY}`;
  const body = {
    model: AI_MODEL,
    temperature: 0.55,
    max_tokens: 260,
    messages: [
      {
        role: "system",
        content: [
          "You are the prose voice of a rules-authoritative fantasy campaign engine.",
          "The engine, not you, decides rolls, damage, inventory, clues, NPC knowledge, combat outcomes, and scene transitions.",
          "Narrate only the authoritative result supplied by the engine. Never change a number, revive a defeated actor, grant an item, reveal or foreshadow a GM-only fact, reveal an undiscovered clue, solve a choice, or invent a new route.",
          "Do not speak as a chatbot and do not explain rules. Do not list menu options; the interface already displays valid choices.",
          "Use second person for the player. Give active companions brief reactions consistent with their supplied personality and bond, but do not make strategic decisions for the player.",
          "Keep continuity with the current location, objective, discovered clues, and recent history.",
          "Remain grounded high fantasy. Never introduce science fiction, guns, computers, modern slang, or out-of-setting references.",
          "Write 70–150 words in one to three paragraphs. End on a concrete sensory beat or immediate tension, not an invented question."
        ].join(" ")
      },
      {
        role: "user",
        content: `Narrate this resolved game state exactly as established:\n\n${prompt}`
      }
    ]
  };
  try {
    const response = await fetch(AI_PROVIDER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Narrator HTTP ${response.status}`);
    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    return trimNarration(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function narrate(state, view, action, events = []) {
  const fallback = deterministicFallback(state, view, action, events);
  const narrativeAction=["opening","scene-opening","story-choice","combat","confirm-intent"].includes(action?.type);
  if (!narratorEnabled() || !narrativeAction) {
    state.lastNarration = fallback;
    return { text: fallback, source: "deterministic", model: null };
  }
  try {
    const prompt = buildNarratorPrompt(state, view, action, events);
    const text = await callNarrator(prompt);
    if (!text) throw new Error("Narrator returned no text");
    state.lastNarration = text;
    return { text, source: "ai", model: AI_MODEL };
  } catch (error) {
    state.lastNarration = fallback;
    return { text: fallback, source: "deterministic-fallback", model: AI_MODEL, error: error.message };
  }
}

module.exports = {
  narrate,
  buildNarratorPrompt,
  deterministicFallback,
  narratorEnabled,
  AI_MODEL,
  AI_PROVIDER_URL
};
