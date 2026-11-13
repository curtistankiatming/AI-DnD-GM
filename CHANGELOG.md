# Changelog

The game version is still **4.1.0-alpha.3**; each playtest release is tagged by
its commit (`playtest-<commit>`). Entries are grouped by date, newest first, with
the pull requests that made them.

## 12 November 2026 — the written story comes first

- **Story arcs, step 3**: beyond the books, AI adventures come in four-chapter
  arcs (opening, rising, turn, finale). The game paces them; the AI names each
  arc and writes its chapters. The Journal shows the arc in progress and each
  finished arc.
- **The chronicle, step 2**: every finished AI adventure becomes a chapter of
  the hero's own story, with the player's choice and the people, places and
  open threads it introduced. The AI reads it before writing the next
  adventure; the Journal shows "Your story so far". Old chapters are condensed,
  never dropped.
- **AI storyteller rules, step 1**: while a written chapter exists, the AI game
  master writes small side quests instead of full adventures, steers long
  detours back to the book, and can only give XP up to the chapter's level.
  Once the written story is finished, the save becomes the hero's own story with
  full AI adventures. Chat now allows unusual actions (being rude to an NPC) and
  remembers them in the journal. Design: [docs/AI-STORYTELLER.md](docs/AI-STORYTELLER.md).

## 11 November 2026 — balance passes

- **Balance pass** (#32): fighters strike three times with each Attack from
  level 20; enemies gain 0 to 25% more health from level 70; chronist, warlord
  and other branches retuned; combat objectives take steps. New battle simulator:
  `npm run balance`. Report: [docs/BALANCE-2026-11-11.md](docs/BALANCE-2026-11-11.md).
- **Balance follow-up** (#33): casters evened out across play styles; the
  original specialization skills now scale with level; Time Stop allows a save;
  Pathfinder skills deal damage; small cleric trims. Clerics remain the
  strongest class by choice. Report:
  [docs/BALANCE-2026-11-11-FOLLOWUP.md](docs/BALANCE-2026-11-11-FOLLOWUP.md).

## 10 November 2026 — job advancement to level 100

- **Levels to 100 and XP by battle difficulty** (#24): cap raised to 100; every
  XP source pays a share of the current level (battles easy 3% to deadly 15%,
  missions, quests, AI adventures, trials); Normal, Hard and Heroic adventure
  difficulty; old saves converted.
- **Class mastery and the 2nd job** (#26): the level 10 trial teaches a class
  mastery skill; three branches per class at level 20.
- **Job tree** (#27): a job tree in Prepare and a combat skill bar grouped by job.
- **3rd job at level 40** (#28) with a trial written by the game master.
- **4th job at level 70** (#30) with a legendary trial and an ultimate at 100.
  Renown ranks now start only after level 100 once the 4th job is learnt.
- **Renown ranks** (#19): endless ranks with capped boons (first placed after
  level 10, moved after level 100 by #30).

## 10 November 2026 — first-time experience and redesigned screens

- **Title page** (#29): Continue or New adventure before the hero form; AI
  tuning moved under Advanced settings.
- **First-time experience** (#18, #20, #22): welcome panel and plain AI wording;
  roll card, how-to-play card and example prompts; quick hero creation (name and
  class, the rest optional); choose your game master with an in-game key box
  that saves and tests the key, replacing the manual `.env` steps; the
  **What's next?** board for leaving on expeditions or wishing for a new adventure.
- **Play-screen redesign** (#17, #21, #23, #25): slim header and plain wording;
  a story screen with the scene, choices and chat together; a one-screen combat
  board; shorter party sheet, journal and town. Notes in `docs/UI-UX-STEP1.md`
  to `docs/UI-UX-STEP4.md`.
- Story browser test made steadier (#31).

## 10 November 2026 — the AI game master

- **Claude API provider** (#12): Claude narrates story scenes and resolves
  improvised actions, which the engine caps and you confirm before any roll.
- **Story director** (#13): Claude writes new adventures that continue the
  campaign; the engine sets level, enemies and rewards. Fixed a dead "Ask the GM
  for a new adventure" button (#15).
- Engine split into story, combat, view and core modules (#14); written content
  moved into `src/data` JSON files (#16).

## October 2026 — interface batches

- Save protection, Quick Save, Continue/Load and usable waits (#9); story-first
  layout (#10); management and preparation screens (#11).

## September 2026 — 4.1.0 alphas

- Reliability fixes, chat foundation, Lantern Road and the campaign journal
  (#4), shared local-model evaluation (#5), local AI response handling (#8).
  See [docs/CURRENT-STATUS.md](docs/CURRENT-STATUS.md) and the dated reports in
  `docs/` for the evidence from that period.
