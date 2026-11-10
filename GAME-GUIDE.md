# Briarwatch — Game guide for 4.1.0-alpha.3

A local, single-player, story-led d20 adventure. PR #4 (chat, Lantern Road and journal) and PR #5 (shared evaluator v1) are merged. See [Current status](docs/CURRENT-STATUS.md) for dated release and validation evidence. This is the V4 continuation of Story Engine V3 / The Bell Beneath Briarwatch, not the separate Bellfire Echoes build.

**Playable scope: authored levels 1–10, a class mastery trial at level 10, a post-advancement expedition, AI-directed adventures up to level 100, the 2nd job at level 20, the 3rd job at level 40, and endless renown ranks after level 100.** The 4th job (levels 70 to 100) is planned and shown as coming in a later update; it is not playable yet. This is a custom D&D-style RPG, not a complete official Dungeons & Dragons rules implementation.

## Earlier reliability fixes (V4.0.1)

That earlier focused maintenance update did not expand the level cap. It fixed
the level-7 Technique capacity, stale combat narration and model calls for rejected
actions. Save names are checked for Windows portability; HTTP tests use isolated
save folders. The health endpoint reads the package version rather than a second
hard-coded version string.

Use Node.js 22 or newer; the repository tests Node 22 and 24. No third-party
runtime packages or model account are required. The old review below records
V4.0.1 measurements, not current live-model acceptance.

`npm run validate` runs syntax, unit/integration, campaign and state checks. The
GitHub workflow runs on pull requests and main/master pushes, using Windows/Linux
and Node 22/24 for tests. Validation uses no real-model credentials. A separate
public-playtest workflow validates and publishes browser/source downloads. See
[the repository review](docs/REVIEW-2026-09-08.md) for measured results and limits;
root-level V4.0.0 reports remain historical evidence, not this patch's results.

## Repo quickstart

This repository contains a ready-to-run local game. It has no external runtime dependencies.

### Prerequisites

- Node.js 22 or newer
- Git only when cloning (not required for an extracted ZIP)

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

Offline play needs no `npm install`. Claude AI play needs `npm install` once; `run-local.bat` does this for you on first run.

## Start on Windows (ZIP installation)

1. Stop the old game server. Keep the existing folder and export/back up saves.
2. Extract the new source ZIP into a separate folder; do not overlay an old build.
3. Open the folder containing `server.js` and `package.json`, regardless of its name.
4. Double-click `run-local.bat` and keep its console open while playing.
5. Open `http://localhost:4173`; use Ctrl+C in the console to stop the server.

`run-local.bat` installs the Claude library on first run; offline play works without it. Verify `/api/health` reports `4.1.0-alpha.3` and check
the release commit; the interface's generic "AI Dungeon Master V4" title does not
identify a patch. If a port is occupied, stop the other server or set a different
`PORT` before launching. The actual user's interactive Windows launcher remains
untested; hosted Windows browser/Node tests are documented separately.

The browser-only ZIP instead opens `briarwatch-playtest.html` directly without
Node or a model. Source downloads do not promise a `browser-preview` directory;
`npm run build:public` produces generated HTML under `dist-public`.

## What is actually implemented

### Campaign, towns, and preparation

The original Briarwatch mystery now leads into ten authored regional expeditions, including the advancement trial and its follow-on mission. Eight expeditions carry the party from the opening chapter toward level 10; the trial and final mission make that level usable rather than ending at its unlock.

The earlier V4.0.1 catalog contained **57 scene definitions and 134 choice definitions**; those historical counts exclude the later chat side-adventure modules. These include towns, transitional scenes and endings; they are not 57 separate towns or 134 mutually exclusive campaign branches. The regional adventures have a deliberately structured investigation → approach → crisis → consequence rhythm. No endless procedural world is claimed.

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
| 10 | The Oath of the Road trial, which teaches your class mastery skill, and a subsequent expedition |

Talent choices appear in the development panel. They cannot be silently selected twice. XP, the next unlock, and outstanding rewards remain visible. Companions share the earned level.

The trial can be retried without losing anything to one unlucky check. Heroes who chose a specialization at level 10 in an earlier version keep it as their 2nd job branch.

### Jobs: class mastery and the 2nd job

Your class is your 1st job. Each later job adds new skills; you keep every skill
you already have. Skills that are always on (passives) add small bonuses, and
attack, Armor Class and saving throw bonuses from all sources together stop at +4.

| Level | What you learn |
| --- | --- |
| 10 | Class mastery skill, from the Oath of the Road trial |
| 13 | A passive 1st-job skill |
| 16 | An active 1st-job skill |
| 20 | **2nd job**: choose one of three branches for your class (permanent) and learn its first skill |
| 25, 30, 35 | The branch's next three skills |
| 40 | **3rd job**: pass your branch's trial to take its 3rd job and learn its first skill |
| 48, 56, 64 | The 3rd job's next three skills |
| 70 to 100 | 4th job (later update) |

| Class | Mastery (10) | 1st-job skills (13, 16) | 2nd job branches (20) |
| --- | --- | --- | --- |
| Fighter | Battle Surge | Hardened, Crushing Blow | Guardian / Duelist / Warlord |
| Rogue | Vanishing Step | Evasion, Twin Daggers | Shadow Agent / Saboteur / Grifter |
| Wizard | Arcane Barrier | Spell Focus, Lightning Lance | Evoker / Chronist / Binder |
| Cleric | Divine Aegis | Blessed Vigor, Radiant Burst | Lifewarden / Exorcist / Battle Priest |
| Ranger | Volley | Trailwise, Hunter's Snare | Wild Warden / Deadeye / Pathfinder |
| Bard | Song of Rest | Jack of All Trades, Cutting Words | Lorekeeper / Battle Cantor / Envoy |

Branch skills use the Advancement resource (2 uses per long rest, 3 from level
30, 4 with the 3rd job). The **job tree** in the development panel (Prepare tab) shows your 1st job,
all three 2nd-job branches with their skills and the 3rd and 4th jobs each one
leads to, which skills you have learnt, and your next skill. Once you choose a
branch, the other two are greyed out. In combat, the skill bar groups your
actions into 1st job, 2nd job and 3rd job skills.

**The 3rd job trial.** At level 40, with a 2nd job branch, any town's expedition
board offers your branch's trial (for example, a Guardian's trial makes them a
Bulwark Knight). With the Claude AI game master on, Claude writes the trial
around your branch and your story; with the AI off, or if its draft can't be
used, a written trial is used instead. A trial is always Hard, pays half a
level of XP plus its battle, and does not take up the slot for an AI adventure.
Passing it gives the new job title, its first skill and one more Advancement
use per long rest; its other skills arrive at 48, 56 and 64.

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

## Chat, journal and optional local AI

The game's chat separates Action, Dialogue, Question and Campaign Instructions.
Instructions replace previous preference text and are saved with the campaign;
`/instructions clear` clears them. A model proposal must be confirmed before a
roll, inventory change or scene transition. Combat still uses explicit controls.
Exact supported commands and journal questions can work without a model.

Start Courier at the Ferry or Lantern Road from Briarwatch. Lantern Road connects
wagon repairs, a crossing and medicine delivery, with trust, timing, a sealed-letter
promise and one-time follow-up. The journal distinguishes verified facts, rumors,
promises, relationships and leads. `/journal` gives a recap; `/note text` adds an
unverified reminder; `/forget-note note-1` removes it. The panel has equivalent
controls. Twelve note slots allow up to 400 characters each; notes grant no rewards
and are excluded from regular model prompts.

AI is optional and off by default. Two providers are available under
**Settings → AI settings**:

- **Claude API (recommended).** Copy `.env.example` to `.env` beside
  `package.json`, put your key after `ANTHROPIC_API_KEY=`, restart the game, then
  enable AI and pick a Claude model (Opus 5.5 by default; Sonnet 5.5 and Haiku 5.5
  are faster and cheaper). Each chat turn is one API request and is billed to
  your Anthropic account. `run-local.bat` installs the Claude library on first run;
  from a terminal, run `npm install` once.
- **Local model server.** Start Bionic or another compatible local server, choose
  **Local model server**, then list and explicitly select the installed
model ID. The usual address is `http://127.0.0.1:1234/v1`. Compact/Balanced/Expanded
are request workloads, not certifications of a model size. The chat connection
allows ten minutes per request; a proposal and later narration can be separate
requests. The provider rejects overlapping work instead of retrying or silently
switching models. Cancellation may not immediately stop the model server's GPU
work; inspect it before another request. Actual model quality/speed is unverified.

Settings are stored in `.local-ai.json`; `AI_CONFIG_PATH` can select an isolated
file. A local server's optional token comes from `LOCAL_AI_TOKEN`, never chat,
saves, a public repository or a screenshot. Listing models does not download or
load them; inference may trigger the local server's just-in-time loading.

### Improvised actions (Claude only)

In Action mode, describe anything sensible your hero tries. If no listed approach
fits, Claude proposes how to resolve it: a skill (or ability), a difficulty, what
happens on success and failure, a reward and a risk. Before anything happens you
see the roll you need and your chance. The engine enforces the limits:

| Difficulty | DC | Can earn |
| --- | --- | --- |
| Trivial | no roll | a recorded discovery only |
| Easy | 10 | discovery, 1d4 gold per level, Inspiration |
| Moderate / Hard / Very hard | 13 / 16 / 19 | also XP: 5% / 8% / 12% of your current level band |

Each scene allows 8 improvised attempts, 3 material rewards and XP once. Failure
risks are a story setback, ⌈level/3⌉d6 damage, or losing up to 3 gold per level.
Repeating the same attempt in a scene is refused. Improvising is paused in combat.
Successful discoveries appear in the journal as *established* facts.

### Story director: new adventures (Claude only)

After the bell chapter, every town's expedition board has **Ask the GM for a new
adventure**. Type an optional wish in the message box first, or use
`/adventure <wish>` in chat. Claude writes a complete expedition in the same
shape as the authored ones: a briefing, an investigation, an approach, a crisis
with a peaceful resolution and a fight-side objective, an opponent, and two or
three permanent decisions. It also updates a short *story so far* arc, shown on
the board, that the next adventure continues.

Claude writes the story and chooses which skills, tools and factions matter. The
engine sets every number with the authored formulas:

| Part | Set by the engine |
| --- | --- |
| Level | your current level (max 10) |
| Checks | DC 11/12/14 + ½ level for investigate/approach/resolve |
| Opponent | same health, armour and attacks as an authored expedition of that level |
| Reward | 30% of your current level's XP band, 20 + 20 × level gold |
| Decisions | +2 to the favoured faction, +1 to an optional second |

One generated adventure can wait on the board at a time; dismiss it if you would
rather have another. It returns you to a town you already know, so it cannot
open a locked region early. Generated adventures are stored in the save,
re-checked against these limits whenever a save loads, and play without AI once
written. An adventure pays 25% of your current level on completion, plus XP for
its battle by how hard it is (see below).

### Levels 11 to 100 and how XP is earned

The level cap is 100. Levels 1 to 10 follow the authored campaign's table; after
that each level needs 250 XP more than the one before (4,250 XP for level 10 to
11, 26,500 XP for level 99 to 100). Every reward is a share of what your current
level needs, so each level takes about the same effort from start to finish.

| Source | XP, as a share of your current level |
| --- | --- |
| Easy battle | 3% |
| Normal battle | 6% |
| Hard battle | 10% |
| Deadly battle | 15% |
| Battle far below your level | 0 (10 or more levels below), easy at best (5 or more) |
| Mission (a companion's personal quest) | 12% |
| Quest or AI adventure, on completion | 25%, plus its battle |
| Improvised action | 2 to 8% by difficulty, capped per scene |
| 3rd job trial, on completion | 50%, plus its battle (always Hard) |

The game rates each AI adventure battle by comparing its enemies with a standard
fight for your level; the AI never sets XP. Resolving the crisis peacefully pays
the same battle XP as winning the fight. The authored Briarwatch campaign (levels
1 to 10) keeps its hand-tuned quest and battle rewards.

Before you depart on an AI adventure you can choose its difficulty on the
expedition board:

| Difficulty | Challenge | Rewards |
| --- | --- | --- |
| Normal | The standard challenge for your level | 1x XP and gold |
| Hard | +2 levels of enemy health and damage, +1 to AC, enemy attacks and DCs | 1.5x |
| Heroic | +4 levels of enemy health and damage, +2 to AC, enemy attacks and DCs | 2x |

The choice is fixed once you set out.

Growth past level 20 is deliberately gentle so the d20 still matters: the
proficiency bonus stops at +6, enemy AC, attacks and DCs stop at their level-20
values, and health and damage keep growing slowly on both sides (+2 HP a level
and +1 damage and healing every 10 levels for heroes). New power past 20 will
comes from job skills: the 2nd and 3rd jobs now, the 4th job in a later update.

Saves from when level 10 was the cap keep their XP: XP past level 10 now counts
as levels, and boons picked then return when renown starts after level 100.

### Renown: progression after level 100

After level 100, every 26,750 XP earns a **renown rank**, without end. Each rank
gives one boon, chosen in the character development panel. Boons stack up to a
limit, so they never break the d20 maths:

| Boon | Effect per pick | Limit |
| --- | --- | --- |
| Vigor | +6 maximum HP | 5 |
| Precision | +1 to attack rolls | 2 |
| Warding | +1 Armor Class | 1 |
| Resolve | +1 to saving throws | 2 |
| Might | +1 damage on attacks and spells | 3 |
| Mending | +2 to healing you give | 3 |
| Purpose | +1 to combat-objective checks | 2 |

When every boon is full (18 ranks), ranks still record your legend. AI-directed
adventures add half your renown rank, up to 6, to their enemy health and damage.

Story narration uses the same AI settings: tick **AI narration for story
scenes** to have the selected provider narrate resolved story choices and combat.
The older `AI_NARRATOR`/`AI_MODEL`/`LM_STUDIO_BASE_URL` environment variables were
removed; use the settings panel instead.

The engine resolves rules first. The model receives bounded public facts, current
combat resources and confirmed events; hidden facts are omitted. Its prose can
still be wrong and is not an executable result. The mechanics feed is authoritative.
Loading restores saved narration or a current-state recap without another roll.
Offline browser HTML never calls a model. Generated adventures use the existing
rules, towns, items and enemy formulas; Claude cannot add new mechanics.

For a controlled live check later, use `EVALUATE-MODEL.bat` (explicit START consent)
or follow [Shared model evaluation](docs/MODEL-EVALUATION.md). It uses synthetic
cases and isolated settings, not player saves. `npm run eval:plan` uses no model;
`npm run eval:mock` tests the evaluator, not real intelligence or performance.

## Validation and reproducibility

```text
npm test
npm run playtest
npm run fuzz
```

`npm test` runs rules, economy, progression, item/gear, companion, narration-adapter and HTTP save-lifecycle checks. `npm run playtest` runs deterministic whole-campaign policies across classes, routes and difficulties. `npm run fuzz` performs bounded diagnostic actions on isolated high-level fixtures; those fixture levels are not evidence of natural levelling. See [Current status](docs/CURRENT-STATUS.md) for source-specific hosted results and limits. `TEST_REPORT.md` and `BALANCE_REPORT.md` remain historical V4.0.0 reports.

To change the simulation size, set `PLAYTEST_RUNS` (seeds per class/route/difficulty). `PLAYTEST_OUTPUT` selects a JSON result file; `FUZZ_CASES`, `FUZZ_STEPS` and `FUZZ_OUTPUT` control diagnostic fuzzing. The test policies read public game views. They are not estimates of human enjoyment or human win rates.

## Local-only security and hosting

The default host is `127.0.0.1`. This is a trusted single-player local application: the API accepts client-supplied state and has **no accounts, authentication or anti-cheat**. Do not expose it to the internet. Mutating browser requests must come from the game’s own origin; JSON requests must use `application/json`. These checks do not turn the client-state API into authenticated hosting. The old public-tunnel launcher has been removed. `start-host.bat` is an explicit trusted-LAN option with a warning, not secure public hosting. Never forward its port on your router.

## Project structure

`src/data/*.json`: all authored content (story scenes, classes, items, enemies, towns, merchants, expeditions), checked by `tests/content-data.test.js`; `src/content.js`: loads the base tables; `src/expansion.js`: adds the regional tables and builds expedition scenes from each quest; `src/progression.js`: levels and class development; `src/equipment.js`: shared ownership and derived statistics; `src/world.js`: town/economy/travel state; `src/engine.js`: authoritative action resolution, story scenes, items and saves (public API); `src/combat.js`: tactical combat; `src/engine-view.js`: the view the browser renders; `src/engine-core.js`: shared inventory, log and XP helpers; `src/improvise.js` and `src/director.js`: bounds for Claude-authored actions and adventures; `src/narrator.js`: optional prose; `public/`: browser interface; `server.js`: local HTTP and atomic saves; `tests/`: reproducible validation.

Not included: multiplayer, a tactical movement grid, the complete official spell/ancestry/subclass catalog, endless generated campaigns, routine hunger/durability, player housing, or playable level-30/70 content. These limits are intentional rather than hidden behind decorative controls.
