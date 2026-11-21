#!/usr/bin/env node
"use strict";
// Play Briarwatch from a terminal, one command per turn, with no AI and no
// server. Built for coding agents (Codex, Claude) and humans who want to play
// or review the written story. See docs/AGENT-PLAYTEST.md.
//
//   node scripts/play.js new --class ranger --name Wren
//   node scripts/play.js look
//   node scripts/play.js choose 2            (or a choice id)
//   node scripts/play.js fight weapon-attack goblin-1
//   node scripts/play.js do '{"type":"depart","questId":"road"}'
//   node scripts/play.js auto 20             (let the scripted player take 20 turns)
//   node scripts/play.js town                (town services, expeditions, level rewards)
//   node scripts/play.js read <node-id>      (every line and outcome of one scene, no dice)
//   node scripts/play.js scenes              (list every story scene)
//   node scripts/play.js jump <node-id> --level 4 --with nessa   (review fixture, not real play)
//   node scripts/play.js commission-sample   (after the written story: add the bundled sample AI adventure; fixture)
//
// The game lives in one JSON file (default .playtest/game.json; --save to
// change it). Dice are seeded, so the same commands give the same results.
const fs = require("node:fs");
const path = require("node:path");
const E = require("../src/engine");
const W = require("../src/world");
const P = require("../src/progression");
const { STORY_NODES, CLASSES } = require("../src/content");
const { TOWNS } = require("../src/expansion");
const { createSeededRng } = require("../src/rules");
const { deterministicFallback } = require("../src/narrator");
const { chooseAction } = require("../tests/player-policy");

const argv = process.argv.slice(2);
const flags = {};
const args = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) { const key = argv[i].slice(2); const next = argv[i + 1]; if (next === undefined || next.startsWith("--")) flags[key] = true; else { flags[key] = next; i++; } }
  else args.push(argv[i]);
}
const command = args.shift() || "look";
const savePath = path.resolve(String(flags.save || path.join(".playtest", "game.json")));

function fail(message) { console.error(`Error: ${message}`); process.exit(1); }
function load() {
  if (!fs.existsSync(savePath)) fail(`No game at ${savePath}. Start one with: node scripts/play.js new --class fighter`);
  const file = JSON.parse(fs.readFileSync(savePath, "utf8"));
  return { ...file, state: E.normalizeIncomingState(file.state) };
}
function save(file) { fs.mkdirSync(path.dirname(savePath), { recursive: true }); fs.writeFileSync(savePath, JSON.stringify(file, null, 1)); }
const line = (text = "") => console.log(text);
const wrap = (text, indent = "") => String(text || "").split("\n").forEach((t) => line(indent + t));

function printDialogue(dialogue) {
  for (const l of dialogue) wrap((l.narration ? `  ${l.narration}` : `  ${l.speaker.toUpperCase()}: ${l.text}`) + (l.when ? `  [only if ${JSON.stringify(l.when)}]` : ""));
}

// midFight: a fight already under way does not retell how it started.
function printScene(state, view, after, midFight = false) {
  const s = view.scene;
  line(`== ${s.act} · ${s.title} · ${s.location || ""}`);
  if (s.objective) line(`Goal: ${s.objective}`);
  const p = view.player;
  line(`${p.name}, level ${p.level} ${p.className || p.classId} · HP ${p.hp}/${p.maxHp} · XP ${p.xp}/${p.nextLevelXp ?? "-"} · gold ${p.gold}` +
    (view.party.length ? ` · party: ${view.party.map((a) => `${a.name.replace(/^Sister /, "").split(" ")[0]} ${a.hp}/${a.maxHp}${a.bond !== undefined ? ` bond ${a.bond}` : ""}`).join(", ")}` : ""));
  line("");
  if (after) {
    line("-- What happened --");
    const outcome = s.lastOutcome;
    if (outcome?.dialogue?.length) {
      const rest = after.replace(/\s+/g, " ").replace(outcome.text.replace(/\s+/g, " "), "").replace(`${view.scene.act}: ${view.scene.title}`, "").trim();
      if (rest) wrap(rest);
      printDialogue(outcome.dialogue);
    } else wrap(after);
  } else if (midFight && view.combat?.active && s.lastOutcome?.kind === "combatStart") line(`(The fight goes on: ${s.lastOutcome.title}. Run "look" to read how it started.)`);
  else if (s.lastOutcome?.dialogue?.length) printDialogue(s.lastOutcome.dialogue);
  else wrap(s.lastOutcome?.text || s.opening);
  if (view.scene.endingSummary?.length) { line(""); line("-- How it ended --"); for (const l of view.scene.endingSummary) wrap(`  ${l}`); }
  line("");
  if (view.combat?.active) return printCombat(view);
  const choices = s.choices || [];
  if (choices.length) {
    line("-- Choices (node scripts/play.js choose <number or id>) --");
    choices.forEach((c, i) => {
      const odds = c.check ? ` [${c.check.skill} DC ${c.check.dc}, ${c.check.actor}, ${c.check.probability}%${c.check.mode !== "normal" ? `, ${c.check.mode}` : ""}]` : "";
      line(`${i + 1}. ${c.label}${odds}${c.completed ? " (done)" : ""}${c.locked ? ` (locked: ${c.lockedReason})` : ""}  id=${c.id}`);
      if (c.description) line(`     ${c.description}`);
    });
  }
  const w = view.world;
  if (w?.town) line(`\nYou are in ${w.town.name}. Run "node scripts/play.js town" for rest, shops, level rewards and the expedition board.`);
  else if (w?.canReturn) line(`\nYou can return to town: node scripts/play.js do '{"type":"return-town"}'`);
  if (view.progression?.pending?.length) line(`\nA level reward is waiting. Run "node scripts/play.js town" to see it.`);
  if (s.ending) line("\nThis is an ending.");
}

function printCombat(view) {
  const c = view.combat;
  line(`-- Combat: ${c.name || ""} · round ${c.round} --`);
  if (c.objective) line(`Objective: ${c.objective.name} (${c.objective.progress ?? 0}/${c.objective.target}${c.objective.failed ? ", failed" : ""})`);
  for (const a of c.actors) line(`  ${a.team === "enemy" ? "Enemy" : "Party"}: ${a.name} id=${a.id} HP ${a.hp}/${a.maxHp} AC ${a.ac}${a.conditions?.length ? ` (${a.conditions.map((x) => x.name || x.id).join(", ")})` : ""}`);
  if (!c.awaitingPlayer) { line("Waiting for other turns."); return; }
  line(`Your turn. Action ${c.economy?.actionUsed ? "used" : "ready"}, bonus action ${c.economy?.bonusUsed ? "used" : "ready"}.`);
  line("-- Actions (node scripts/play.js fight <id> [target id]) --");
  for (const a of c.actions.filter((x) => !x.disabled)) line(`  ${a.id}: ${a.name}${a.cost ? ` (${a.cost})` : ""}${a.targets?.length ? ` targets: ${a.targets.map((t) => t.id).join(", ")}` : ""}`);
}

function printTown(view) {
  const w = view.world;
  if (!w.town) line("You are not in a town right now.");
  else {
    line(`== ${w.town.name} · day ${w.day}`);
    for (const s of w.services) line(`  service ${s.id}: ${s.name}, ${s.cost} gold${s.disabled ? " (unavailable)" : ""}  -> do '{"type":"town-service","serviceId":"${s.id}"}'`);
    line(`Travel: ${w.towns.map((t) => t.id + (t.current ? " (here)" : "")).join(", ")}  -> do '{"type":"travel-town","townId":"<id>"}'`);
  }
  if (w.town && w.activeQuest) line(`${w.pendingBattle ? "Resume the interrupted fight" : `Resume your expedition (${w.activeQuest})`}  -> do '{"type":"resume"}'`);
  line("-- Expedition board --");
  for (const q of w.quests) line(`  ${q.id}: ${q.name}, level ${q.level}, from ${q.townName}${q.canDepart ? `  -> do '{"type":"depart","questId":"${q.id}"}'` : " (not available here yet)"}\n     ${q.brief}`);
  const d = w.director;
  const written = w.quests.filter((q) => !q.generated);
  if (d && w.bellComplete && !d.sideQuests && !written.length) {
    line("  The written story is complete: both books are finished.");
    line("  From here the AI storyteller writes new adventures from your choices (in the browser game: \"Ask the GM for a new adventure\", with the Claude AI game master on).");
    line("  The terminal has no AI. To test the handoff with the bundled sample adventure (a fixture, not real AI writing): node scripts/play.js commission-sample");
  } else if (w.book?.waiting && !written.length) line(`  To be continued: the next chapters of ${w.book.title} are still being written.`);
  else if (!w.quests.length) line("  Nothing posted.");
  if (w.book && !w.book.waiting) line(`  Story: ${w.book.title}, chapter "${w.book.chapter}" (level ${w.book.level}).`);
  if (w.sideJobs?.length) {
    line("-- Side jobs (optional) --");
    for (const j of w.sideJobs) line(`  ${j.id}: ${j.name}, ${j.townName}, ${j.reward.gold} gold${j.started ? " (half done)" : ""}${j.canStart ? `  -> do '{"type":"side-job","jobId":"${j.id}"}'` : " (take it in its own town)"}\n     ${j.brief}`);
  }
  for (const a of w.away || []) line(`${a.name} is away. Back once "${a.untilName}" is done.`);
  if (w.canRecruit) line(`Nessa can be recruited  -> do '{"type":"recruit"}'`);
  for (const pq of w.personal || []) if (!pq.started || pq.canResolve) line(`Companion story: ${pq.name}  -> do '{"type":"${pq.canResolve ? "resolve-personal" : "personal"}","companionId":"${pq.companionId}"${pq.canResolve ? ',"choice":"watchful"' : ""}}'${pq.canResolve ? ' (or "decisive")' : ""}`);
  for (const r of view.progression.pending || []) {
    line(`Level ${r.level} reward: ${r.description}`);
    for (const o of r.options || []) line(`  ${o.id}: ${o.name || ""} ${o.description || ""}  -> do '{"type":"choose-reward","level":${r.level},"optionId":"${o.id}"}'`);
  }
  for (const o of view.progression.specializationOptions || []) line(`2nd job option ${o.id}: ${o.name}  -> do '{"type":"specialize","specializationId":"${o.id}"}'`);
}

function act(file, action) {
  const rng = createSeededRng(Number(file.seed) * 1000 + file.turn);
  const result = E.resolveAction(file.state, action, rng);
  file.turn += 1;
  file.state = result.state;
  const view = E.buildView(file.state);
  if (result.result?.ok === false) { line(`Not allowed: ${result.result.error}`); return { view, ok: false }; }
  const after = deterministicFallback(file.state, view, action, result.events || []);
  return { view, ok: true, after, events: result.events || [] };
}

function nodeText(id) {
  const n = STORY_NODES[id];
  if (!n) fail(`No story node "${id}". Run "node scripts/play.js scenes" for the list.`);
  line(`== ${id} · ${n.act} · ${n.title} · ${n.location || ""}`);
  if (n.objective) line(`Goal: ${n.objective}`);
  if (n.cast) line(`Plays only if the party includes: ${n.cast.join(", ")}`);
  line("");
  if (n.dialogue) printDialogue(n.dialogue); else wrap(n.opening);
  for (const c of n.choices || []) {
    line(`\n> ${c.label}  id=${c.id}${c.check ? ` [${c.check.skill} DC ${c.check.dc}]` : ""}${c.requires ? ` requires ${JSON.stringify(c.requires)}` : ""}`);
    for (const key of ["result", "success", "failure"]) {
      const o = c[key]; if (!o) continue;
      line(`  ${key}:`);
      if (o.dialogue) printDialogue(o.dialogue.map((l) => ({ ...l, narration: l.narration && `  ${l.narration}`, speaker: l.speaker && `  ${l.speaker}` })));
      else if (o.text) wrap(o.text, "    ");
      const effects = Object.entries(o).filter(([k]) => !["text", "dialogue", "lines"].includes(k)).map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`);
      if (effects.length) line(`    (${effects.join("; ")})`);
    }
    if (c.nextNode) line(`  -> ${c.nextNode}`);
  }
}

if (command === "new") {
  const classId = String(flags.class || "fighter");
  if (!CLASSES[classId]) fail(`Unknown class "${classId}". Classes: ${Object.keys(CLASSES).join(", ")}`);
  const state = E.createNewGame({ name: String(flags.name || "Rowan"), classId });
  const file = { seed: Number(flags.seed || 1), turn: 0, fixture: false, state };
  save(file);
  line(`New game saved to ${savePath}. Class: ${classId}.\n`);
  printScene(state, E.buildView(state));
} else if (command === "look") {
  const file = load();
  // Mid-fight, "look" also tells how the fight started (the crisis it came from).
  if (file.state.combat?.active && file.state.combat.intro) { line("-- How this fight started --"); wrap(file.state.combat.intro); line(""); }
  printScene(file.state, E.buildView(file.state));
} else if (command === "choose") {
  const file = load(); const choices = E.buildView(file.state).scene.choices || [];
  const pick = args[0]; if (!pick) fail("Say which choice: a number or an id.");
  const choice = /^\d+$/.test(pick) ? choices[Number(pick) - 1] : choices.find((c) => c.id === pick);
  if (!choice) fail(`No choice "${pick}" here. Run "look" to see the choices.`);
  line(`You choose: ${choice.label}\n`);
  const r = act(file, { type: "story-choice", choiceId: choice.id }); save(file);
  printScene(file.state, r.view, r.ok ? r.after : null);
} else if (command === "fight") {
  const file = load(); const [actionId, targetId] = args; if (!actionId) fail("Say which combat action, e.g. fight weapon-attack <enemy id>.");
  const r = act(file, { type: "combat", actionId, ...(targetId ? { targetId } : {}) }); save(file);
  if (r.ok) for (const e of r.events) if (e.text) line(`  · ${e.text}`);
  line(""); printScene(file.state, r.view, null, true);
} else if (command === "do") {
  const file = load(); let action; try { action = JSON.parse(args.join(" ")); } catch { fail("do takes one JSON action, e.g. do '{\"type\":\"return-town\"}'"); }
  const r = act(file, action); save(file);
  printScene(file.state, r.view, r.ok ? r.after : null);
} else if (command === "auto") {
  const file = load(); const steps = Number(args[0] || 10); const memory = file.policy || {};
  const wasFighting = Boolean(file.state.combat?.active);
  for (let i = 0; i < steps; i++) {
    const before = E.buildView(file.state);
    if (before.scene.ending && !before.world?.town) break;
    const action = chooseAction(before, memory);
    if (!action) break;
    // Nothing left to play: the end of what is written so far, or a real dead end.
    if (action.error) { line(before.world?.book?.waiting ? "[auto] To be continued: nothing more is written yet." : `[auto] ${action.error}`); break; }
    const r = act(file, action);
    line(`[auto] ${JSON.stringify(action)}${r.ok ? "" : " (refused)"}`);
    // The step that ends a fight shows what it achieved (the written objective result).
    if (r.ok && before.combat?.active && !file.state.combat?.active) for (const e of r.events) if (e.text) line(`  · ${e.text}`);
    if (!r.ok) break;
  }
  file.policy = memory; save(file); line(""); printScene(file.state, E.buildView(file.state), null, wasFighting);
} else if (command === "town") {
  const file = load(); printTown(E.buildView(file.state));
} else if (command === "commission-sample") {
  // A review fixture: commissions the bundled sample adventure through the
  // normal game action, as if the AI storyteller had written it.
  const file = load(); const draft = require("../tests/fixtures/director-draft.js")();
  const r = act(file, { type: "director-commission", draft }); file.fixture = true; save(file);
  if (r.ok) line("Commissioned the bundled sample adventure (a fixture, not real AI writing). The save is now marked fixture=true.\n");
  printScene(file.state, r.view, r.ok ? r.after : null);
} else if (command === "read") {
  if (!args[0]) fail("Say which node, e.g. read briarwatch-square."); nodeText(args[0]);
} else if (command === "scenes") {
  for (const [id, n] of Object.entries(STORY_NODES)) if (!id.startsWith("town-")) line(`${id}  ·  ${n.act} · ${n.title}${n.dialogue ? "  (conversation)" : ""}`);
} else if (command === "jump") {
  // A review fixture: puts a fresh hero at a chosen scene. It is not natural
  // play, so the save is marked fixture=true and reports should say so.
  const nodeId = args[0]; if (!STORY_NODES[nodeId]) fail(`No story node "${nodeId}".`);
  const classId = String(flags.class || "fighter"); const level = Number(flags.level || 1);
  let state = E.createNewGame({ name: String(flags.name || "Rowan"), classId });
  if (level > 1) E.awardXp(state, P.XP_NEXT[level - 1], [], "review fixture");
  state.world.unlockedTowns = Object.keys(TOWNS); W.init(state);
  // Orin and Maren start in the party; Nessa joins through the guild from level 3.
  for (const id of String(flags.with || "").split(",").filter(Boolean)) {
    if (state.party.some((m) => m.id === id)) continue;
    if (id !== "nessa") fail(`Unknown companion "${id}". Orin and Maren are already in the party; only nessa can be added.`);
    if (state.player.level < 3) fail("--with nessa needs --level 3 or higher.");
    state = E.resolveAction(state, { type: "recruit" }, () => 0.5).state;
  }
  const node = STORY_NODES[nodeId];
  state.story.nodeId = nodeId;
  if (node.questId) { state.world.activeQuest = node.questId; state.world.onExpedition = true; }
  const file = { seed: Number(flags.seed || 1), turn: 0, fixture: true, state };
  save(file);
  line(`Review fixture: a level ${state.player.level} ${classId} placed at ${nodeId}. This is not natural play.\n`);
  printScene(state, E.buildView(state));
} else {
  fail(`Unknown command "${command}". Commands: new, look, choose, fight, do, auto, town, read, scenes, jump, commission-sample.`);
}
