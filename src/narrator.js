"use strict";

const { CAMPAIGN, STORY_NODES, CLUES, ITEMS } = require("./content");
const Journal = require("./journal");

const RAW_PROVIDER_URL =
  process.env.LM_STUDIO_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  "http://127.0.0.1:1234/v1/chat/completions";
const AI_PROVIDER_URL = /\/chat\/completions\/?$/.test(RAW_PROVIDER_URL) ? RAW_PROVIDER_URL : RAW_PROVIDER_URL.replace(/\/$/, "")+(RAW_PROVIDER_URL.replace(/\/$/, "").endsWith("/v1")?"/chat/completions":"/v1/chat/completions");
const AI_MODEL = process.env.AI_MODEL || "";
const AI_KEY = process.env.LOCAL_AI_TOKEN || "";
const AI_NARRATOR_MODE = String(process.env.AI_NARRATOR || "off").toLowerCase();
const configuredTimeout = Number(process.env.AI_TIMEOUT_MS || 20000);
const AI_TIMEOUT_MS = Number.isFinite(configuredTimeout)
  ? Math.min(600000, Math.max(3000, Math.floor(configuredTimeout))) : 20000;

// A combat turn has its own facts; lastOutcome may still describe an earlier
// story choice. Never turn that earlier reward into a fresh combat result.
function resolvedOutcome(state, action, events = []) {
  const warning = events.find((event) => event.type === "warning");
  const substantive = events.some((event) => ["roll", "damage", "heal", "story", "item", "world", "rest", "reward", "objective", "combat", "party", "level"].includes(event.type));
  if (warning && !substantive) return warning.text;
  if (action?.type === "combat") {
    const current = events.find((event) => event.text && event.type !== "warning");
    return current?.text || "No new mechanical event was recorded for this combat action.";
  }
  return state.story.lastOutcome?.text || STORY_NODES[state.story.nodeId].opening;
}

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
    `Latest resolved outcome: ${resolvedOutcome(state, action, events)}`,
    `Campaign style preferences (not rules or new facts): ${state.chat?.instructions || "none"}`,
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
    "DURABLE PLAYER KNOWLEDGE — confirmed records; rumors stay labelled",
    JSON.stringify(Journal.forPrompt(state,1200)),
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
  const outcome = resolvedOutcome(state, action, events);
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

// Loading is presentation restoration, never a new turn or a model request.
function savedNarration(state, view) {
  if (typeof state.lastNarration === 'string' && state.lastNarration.trim()) {
    return { text: state.lastNarration, source: 'save', model: null };
  }
  const parts = [`Saved-game recap: ${view.scene.title}.`,
    `You are level ${view.player.level}, with ${view.player.hp}/${view.player.maxHp} HP.`];
  if (view.combat?.active) {
    parts.push(`Combat round ${view.combat.round}; current turn: ${view.combat.currentActorName || 'not recorded'}.`);
    const enemies = view.combat.actors.filter(actor => actor.team === 'enemy');
    parts.push(`Opponents: ${enemies.map(actor => `${actor.name} (${actor.hp}/${actor.maxHp} HP)`).join('; ')}.`);
  } else if (view.chat?.road?.active || view.chat?.road?.phase === 'complete') {
    const road=view.chat.road;parts.push(road.phase==='complete'?'Lantern Road is complete.':`Lantern Road: ${road.phase}.`);
    parts.push(...road.facts);
  } else if (view.chat?.courier?.active || view.chat?.courier?.resolved) {
    const courier = view.chat.courier;
    parts.push(courier.resolved ? 'The courier side story is resolved.' : 'The courier side story is in progress.');
    if (courier.facts.length) parts.push(courier.facts[courier.facts.length - 1]);
  } else parts.push(`Current objective: ${view.scene.objective}`);
  // Explicitly a recap: never pretend the village opening or an old reward just happened.
  return { text: parts.join(' '), source: 'save-recap', model: null };
}

function narratorEnabled() {
  // Legacy launchers remain usable, but never default to a paid/cloud provider.
  let endpoint;
  try { endpoint = new URL(AI_PROVIDER_URL); } catch { return false; }
  if (!AI_MODEL || !['http:', 'https:'].includes(endpoint.protocol) ||
      !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname) ||
      endpoint.username || endpoint.password) return false;
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

async function callNarrator(prompt, requestImpl) {
  // Separate legacy opt-in; chat UI settings do not silently enable this route.
  const rawLimit = process.env.AI_REPLY_TOKENS;
  let replyTokens = 260;
  if (rawLimit !== undefined) {
    try {
      if (!/^(?:-1|[0-9]+)$/.test(rawLimit)) throw new Error('invalid');
      replyTokens = require('./model-profiles').replyTokenLimit(Number(rawLimit));
    } catch { throw new Error('AI_REPLY_TOKENS must be -1 (compatible server uncapped output) or 64–768.'); }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  const headers = { "Content-Type": "application/json" };
  if (AI_KEY) headers.Authorization = `Bearer ${AI_KEY}`;
  const body = {
    model: AI_MODEL,
    temperature: 0.55,
    max_tokens: replyTokens,
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
    const response = await (requestImpl || require('./local-http').localResponse)(AI_PROVIDER_URL, {
      method: "POST",
      redirect: "error",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Narrator HTTP ${response.status}`);
    const payload = await response.json();
    const choice = payload?.choices?.[0];
    if (choice?.finish_reason === 'length') throw new Error('Narrator reached its output limit before finishing.');
    const text = choice?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('Narrator returned no finished text; reasoning-only output is not narration.');
    return trimNarration(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function narrate(state, view, action, events = [], result = null, requestImpl = null) {
  const fallback = deterministicFallback(state, view, action, events);
  const narrativeAction=["opening","scene-opening","story-choice","combat","confirm-intent"].includes(action?.type);
  if (result?.ok === false || !narratorEnabled() || !narrativeAction) {
    state.lastNarration = fallback;
    return { text: fallback, source: "deterministic", model: null };
  }
  try {
    const prompt = buildNarratorPrompt(state, view, action, events);
    const text = await callNarrator(prompt, requestImpl);
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
  savedNarration,
  narratorEnabled,
  AI_MODEL,
  AI_PROVIDER_URL
};
