# Briarwatch: Roads Beyond the Bell — V4.0.0

A local, single-player, story-led d20 adventure. This is the **implemented V4 upgrade of Story Engine V3 / The Bell Beneath Briarwatch**, not the separate Bellfire Echoes build.

**Playable scope: levels 1–10, a first advancement at level 10, and a post-advancement expedition.** Level-30 and level-70 advancements are shown as future expansion milestones, not playable systems or content in this release. This is a custom D&D-style RPG, not a complete official Dungeons & Dragons rules implementation.

## Repo quickstart

This repository contains a ready-to-run local game. It has no external runtime dependencies.

### Prerequisites

- Node.js 18 or newer
- Git

### One-time setup

```bash
git clone https://github.com/curtistankiatming/AI-DnD-GM.git
cd AI-DnD-GM
```

### Run locally (Windows)

1. Double-click `run-local.bat`
2. Open [http://localhost:4173](http://localhost:4173)

Optional alternative:

```bat
set PORT=4175
start-host.bat
```

`run-local.bat` uses localhost (single-player local hosting).  
`start-host.bat` exposes trusted-LAN hosting and prints a security warning.

### Validation and scripts

```bash
npm test       # Optional, runs bundled test suite
npm run playtest
npm run fuzz
```

No `npm install` is required for normal gameplay because no third-party packages are used.

## Start on Windows

1. Stop the old server. Rename the existing `dnd-ai-gm` folder to `dnd-ai-gm-v3-backup`.
2. Extract this archive. It contains one project folder named `dnd-ai-gm`.
3. Place it in `C:\Users\Admin\OneDrive\Documents\ChatGPT\ComfyUI\`.
4. Double-click `run-local.bat`. Leave the console open while playing.
5. The game opens at `http://localhost:4173`. Press Ctrl+C in the console to stop it.

Node.js 18 or newer is required; this package was tested with Node.js 22.16.0. The application has no external runtime dependencies: **no `npm install` is needed**. Browser assets are included; no CDN or account is required. The deterministic narrator works offline. Windows launcher execution was not available in the build/test environment; the server was tested on Linux.

Do not merge this folder over an old build: stale scripts can obscure which version is running. Verify the heading says **AI Dungeon Master V4** and `/api/health` reports `4.0.0`. When a port is occupied, stop the other server or set a different `PORT` before launching. A browser refresh may be needed after replacing old assets.

## What is actually implemented

### Campaign, towns, and preparation

The original Briarwatch mystery now leads into ten authored regional expeditions, including the advancement trial and its follow-on mission. Eight expeditions carry the party from the opening chapter toward level 10; the trial and final mission make that level usable rather than ending at its unlock.

The complete content set contains **57 scene definitions and 134 choice definitions**. These include towns, transitional scenes and endings; they are not 57 separate towns or 134 mutually exclusive campaign branches. The regional adventures have a deliberately structured investigation → approach → crisis → consequence rhythm. No endless procedural world is claimed.

Three settlements provide preparation hubs:

- **Briarwatch:** the home town, opening investigation, ordinary supplies and recovery.
- **Ashford Crossing:** trade, better equipment, the bridge and archive contracts.
- **Highpass Watch:** later expeditions, the regional crisis, advancement trial and aftermath.

Services are functional: free civic recovery; paid inn benefits; condition treatment; a one-use saving-throw blessing; a practice arena; shop purchases and sales; equipment upgrades; two crafting recipes; shared storage; briefings; companion conversations and personal rewards; faction reputation and price effects; and an expedition board. Basic recovery remains free so an empty purse cannot trap a campaign. Supplies and equipment are shared across the party.

Read a briefing before departing. The preparation panel discusses **only discovered threats**, not hidden encounter answers. Rope, a climbing kit, a shuttered lantern, tools, holy water, antitoxin and a storm grounder can support explicitly named approaches. A tool is passive unless its card provides a Use button; it does not need to be consumed to supply a listed check bonus.

### Wandering merchants

Pella's Road Caravan, Fen the Weather Reader, and Edda's relic cabinet have distinct stock and offers. The first road encounter includes the caravan; subsequent merchant opportunities vary. Merchants are found at an expedition's opening, not during combat. Basic necessities remain available in town regardless of this luck.

Stock and appearances persist across menu changes, travel and saves. Town stock refreshes after **new unique expedition progress**, not after sleeping or reopening a shop. Bargaining is one attempt per meeting. A caravan favor has a disclosed time/HP cost and a continuing discount; relic barter exchanges actual materials and gold. Discounts are bounded. Selling returns a fraction of purchase value, so buying and immediately reselling is not a profit loop.

### Character development

| Level | Implemented development |
|---|---|
| 1 | Class identity, signature actions, trained skills, starter equipment |
| 2 | A class-specific Technique and a short-rest resource |
| 3 | A talent choice affecting accuracy, defense, saves, healing or field skills |
| 4 | +2 to an ability, capped at 20, with before/after modifier and HP preview |
| 5 | A refinement choice plus scaled class attacks/spells and more Technique uses |
| 6 | Skill proficiency or expertise and a +2 Fieldcraft bonus when relevant tools apply |
| 7 | Companion combinations after personal quests; more Technique uses |
| 8 | A second talent or ability improvement |
| 9 | +2 to objective checks and another Technique use |
| 10 | A trial, permanent specialization, its signature action, and a subsequent expedition |

Talent choices appear in the development panel. They cannot be silently selected twice. XP, the next unlock, and outstanding rewards remain visible. Companions share the earned level. The first advancement has **two choices per class**: Guardian/Duelist; Shadow Agent/Saboteur; Evoker/Chronist; Lifewarden/Exorcist; Wild Warden/Deadeye; Lorekeeper/Battle Cantor.

The first advancement is permanent for that save. The trial can be retried without losing a specialization to one unlucky check. Additional XP at the current level cap is recorded, but it does not unlock nonexistent levels. Level 30 is reserved for an advanced path; level 70 for legendary identity. No future build or save-compatibility promise is implied.

### Companions and equipment

Orin and Maren start with the hero; Nessa can join through the original story or be recruited in town once eligible. Companions have independent initiative, growing HP/resources, equipment, and distinct Aggressive, Balanced, Protective and Support policies. One free order per round can direct focus, protection or objective help. Support sometimes assists instead of attacking: inspect the mechanics feed to see the actual action.

Each companion has a personal request tied to a regional expedition. Resolve the follow-up conversation in town for a mechanical choice: Watchful defense or Decisive attack/casting support. At level 7, completed personal quests unlock a once-per-encounter party combination that consumes the hero's bonus action and a Technique use. Bonds also affect relevant exploration assistance.

Main-hand, off-hand, armor and accessory slots exist for **every party member**. A copy cannot be equipped by two people at once. Equip opens a party-member comparison, including AC, attacks, damage, casting bonuses and incompatible two-handed/shield combinations. The smith offers one capped quality improvement for appropriate gear; this is not an infinite upgrade staircase. There are **42 base item definitions plus 18 quality variants**. Some items are materials or quest objects rather than combat equipment.

Consumables show their purpose, context and charges. A healer's kit has three actual uses. Invalid uses are rejected without consumption. A partially used kit retains its remaining uses in storage; it cannot be sold as a full kit. Quest objects and assigned equipment are not ordinary spare stock.

### Story-led combat and consequences

Regional crises offer evidence-based noncombat resolutions as well as confrontation. Objective XP is equal for peaceful and combat resolutions. Preparation changes chances and circumstances rather than creating extra farming rewards.

Combat objectives include rescuing people, securing crossings and releasing ward channels. Making objective progress can end a battle while enemies remain. A deadline can cause persistent consequences and reduced payment, **but does not grant automatic victory for doing nothing**. After missing it, finish the objective, defeat the opposition, or withdraw. A hard round limit prevents endless stalled battles.

Retreat and defeat return the party to safety with a disclosed rescue cost, preserving XP, equipment and discoveries. Recovery and a retry route remain available. Finishing a quest, revisiting a scene, reloading, resting, or practicing cannot repeatedly grant the same objective reward. Story, Standard and Gritty difficulties adjust encounter pressure, not item truth or hidden dice manipulation.

## Controls and recommended first session

Choose a class preset or a legal 27-point allocation. Follow the opening story choices before expecting the regional board to unlock. Use the mechanics feed for rolls, damage, support and transaction results. At a town, expand a service heading, recover, inspect development choices, talk to companions, and review the next briefing. Spend only what supports your plan; basic lodging is free.

During initiative, choose an action and an explicit target when requested, optionally use a bonus action and one companion order, then End Turn. Companion turns resolve automatically. Condition labels identify timed expiry turns; some effects instead last until their next attack/save/hit.

Free text recognizes supported purchases, sales, equipping, item use and visible story approaches. Examples: `buy two healing potions`, `equip dueling blade`, `use healing potion on Maren`. A fuzzy match to a story approach asks for confirmation before rolling or moving. Unsupported or ambiguous requests are rejected honestly. This is **not unlimited natural-language world simulation**; the visible options remain the most reliable interface.

## Saves and upgrading

Quick Save and the Saves tab use JSON files under `saves/` by default. `SAVE_DIR` can point to a different directory. Save/load includes equipment assignments, partial item charges, currency, shop stock, merchant meetings, companion progression, choices and mid-combat objectives.

For a fresh V4 playthrough, start a new campaign. Compatible **Story Engine V3** JSON saves can be copied from the backup into the new `saves/` directory and loaded. The loader adds V4 systems; existing authored discoveries and identity are retained. Test coverage includes representative V3 migration, not every possible old save. V2 identity migration restarts the authored adventure rather than preserving the obsolete random world. Do not import the separate Bellfire Echoes build's saves. Keep original save backups: V4 saves are not intended for older versions.

## Optional local narration

By default `AI_NARRATOR=off`; configuring a key alone does not turn external narration on. To use an already running compatible local chat-completions server, set environment variables in the same terminal before starting the game, for example:

```bat
set AI_NARRATOR=on
set LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
set AI_MODEL=YOUR_LOADED_MODEL_IDENTIFIER
node server.js
```

The adapter also accepts `OPENAI_BASE_URL`, optional `OPENAI_API_KEY`, and `AI_TIMEOUT_MS`. Do not place secrets in the ZIP or a public repository. No model is bundled and this release does not install or start a model server. External providers may have separate terms and charges; there is no requirement to use one.

The engine decides the rules first. Narration receives public scene facts, discovered clues, party state and exact events; internal hidden facts are omitted. Transactions do not need model calls. Network/model failures fall back to deterministic prose. A model can still write misleading prose: its text is **not** an executable rules result, and the mechanics feed remains authoritative. The adapter was tested against a local mock, not a real model or the user's Windows configuration.

## Validation and reproducibility

```text
npm test
npm run playtest
npm run fuzz
```

`npm test` runs rules, economy, progression, item/gear, companion, narration-adapter and HTTP save-lifecycle checks. `npm run playtest` runs deterministic whole-campaign policies across classes, routes and difficulties. `npm run fuzz` performs bounded diagnostic actions on isolated high-level fixtures; those fixture levels are not evidence of natural levelling. See `TEST_REPORT.md` and `BALANCE_REPORT.md` for actual results and limitations.

To change the simulation size, set `PLAYTEST_RUNS` (seeds per class/route/difficulty). `PLAYTEST_OUTPUT` selects a JSON result file; `FUZZ_CASES`, `FUZZ_STEPS` and `FUZZ_OUTPUT` control diagnostic fuzzing. The test policies read public game views. They are not estimates of human enjoyment or human win rates.

## Local-only security and hosting

The default host is `127.0.0.1`. This is a trusted single-player local application: the API accepts client-supplied state and has **no accounts, authentication or anti-cheat**. Do not expose it to the internet. The old public-tunnel launcher has been removed. `start-host.bat` is an explicit trusted-LAN option with a warning, not secure public hosting. Never forward its port on your router.

## Project structure

`src/content.js`: original chapter and catalogs; `src/expansion.js`: regional campaign, shops and items; `src/progression.js`: levels and class development; `src/equipment.js`: shared ownership and derived statistics; `src/world.js`: town/economy/travel state; `src/engine.js`: authoritative action resolution; `src/narrator.js`: optional prose; `public/`: browser interface; `server.js`: local HTTP and atomic saves; `tests/`: reproducible validation.

Not included: multiplayer, a tactical movement grid, the complete official spell/ancestry/subclass catalog, endless generated campaigns, routine hunger/durability, player housing, or playable level-30/70 content. These limits are intentional rather than hidden behind decorative controls.
