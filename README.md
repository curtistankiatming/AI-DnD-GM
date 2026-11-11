# Briarwatch — Roads Beyond the Bell (4.1.0-alpha.3)

A local, single-player, story-led d20 adventure with an **AI game master**.
Claude (through the Claude API) narrates the story, lets you try anything you can
describe, and writes new adventures that carry on from your choices. The game's
rules engine still rolls the dice and keeps track of items, gold and experience,
so the AI can never hand out more than the rules allow.

Heroes grow from level 1 to 100 through four jobs, then keep earning renown ranks
without end. Two companions travel with you. Without an API key the game still
works fully offline with its written campaign and choices.

This is an unfinished public alpha, not a stable release or a complete official
Dungeons & Dragons rules implementation. See the [changelog](CHANGELOG.md) for
what changed recently and [Current status](docs/CURRENT-STATUS.md) for the dated
state of the repository.

## Choose how to play

| Edition | Start | AI |
| --- | --- | --- |
| Full source (recommended) | Extract `briarwatch-source.zip`, then double-click `run-local.bat` (or run `npm install` once and `npm start`) | Claude API or a local model, set up inside the game |
| Browser download | Extract `briarwatch-browser-playtest.zip`, open `briarwatch-playtest.html` | Offline only; never calls a model |

Downloads: [Public playtest releases](https://github.com/curtistankiatming/AI-DnD-GM/releases).
Every push to `master` that passes the checks publishes a new playtest release
tagged with its commit, so pick the newest one.

Full-source play needs Node.js 22 or newer; CI covers Node 22 and 24. The game
opens in your browser at `http://localhost:4173`. A source checkout does not
contain generated browser HTML: `npm run build:public` creates it in
`dist-public`.

**This is a downloadable game, not a hosted website.** Do not expose the local
Node server, its save API, your API key or your local model to the internet.

## First start

1. The game opens on a **title page**: **Continue** your latest save, load a
   different one, or start a **New adventure**.
2. A new adventure asks for just a name (or **Surprise me**) and a class.
   Background, difficulty and ability scores are optional under **Customise**.
3. **Choose your game master:** the Claude AI game master, or listed choices only.
   For Claude, paste your API key into the key box and press **Save key and
   test**. The game saves the key on this computer in a private, git-ignored
   file (never in a save), turns the AI game master on, and checks the key with
   one tiny request. Get a key at [console.anthropic.com](https://console.anthropic.com);
   Claude charges your Anthropic account a small amount for each reply.
4. A short how-to-play card and a roll card explain the dice the first time.

You can change all of this later under **Settings → AI settings**. The model
(Claude Opus 5.5 by default; Sonnet 5.5 and Haiku 5.5 are faster and cheaper),
the thinking effort and the wait limit sit under **Advanced settings**. Copying
`.env.example` to `.env` and filling in `ANTHROPIC_API_KEY` still works too.

## What the game has

**The AI game master (Claude).**
- *Narration:* Claude writes the story scenes and replies in your campaign's voice.
- *Improvised actions:* type anything sensible ("climb the bell tower to look over
  the square"). Claude proposes a skill check, difficulty, stakes and reward; the
  engine caps them, shows you the odds, and rolls only after you confirm.
- *New adventures:* after the bell chapter, the **What's next?** board lets you
  leave on an expedition or type a wish and ask the game master for a new
  adventure (`/adventure` plus a wish works too). Claude continues the story arc
  from your choices, reputation and journal. The engine sets the level, enemies,
  XP and gold. Generated adventures are saved and still load without AI.
- *Difficulty:* choose Normal, Hard or Heroic before an AI adventure; harder pays
  more XP.

**Progression to level 100.**
- Levels 1 to 10 follow the written Briarwatch campaign. The level 10 Oath of the
  Road trial teaches your class mastery skill.
- **2nd job at level 20:** pick one of three branches for your class (permanent).
- **3rd job at level 40**, unlocked by a trial written by the game master.
- **4th job at level 70**, unlocked by a legendary trial, with an ultimate skill
  at level 100.
- New skills stack on top of the old ones. The **job tree** in Prepare shows every
  job, and the combat skill bar groups skills by job.
- XP comes from battles by difficulty (easy 3% to deadly 15% of the level),
  missions, quests, AI adventures and trials, so each level takes about the same
  effort. Battles far below your level pay little or nothing.
- **Renown after level 100:** once the 4th job is learnt, every 26,750 XP earns a
  renown rank with a capped boon, without end.

**Balance.** Two balance passes (11 November 2026) were tuned from thousands of
simulated battles: fighters strike three times from level 20, enemies gain up to
25% more health from level 70, casters were evened out, the Pathfinder branch
deals damage, and older skills scale with level. Clerics remain the strongest
class. See [the balance report](docs/BALANCE-2026-11-11.md) and
[its follow-up](docs/BALANCE-2026-11-11-FOLLOWUP.md).

**Redesigned screens.** A slim header leaves room for the story; the story screen
puts the scene, your choices and the chat together; a fight fits on one combat
board; the party sheet, journal and town are shorter and easier to scan. Act,
Say and Ask modes separate actions, dialogue and questions.

**The world.** Three towns with shops, services, crafting and storage; travelling
merchants; active companions who level with you and share equipment; Lantern Road,
a connected side journey; a campaign journal of verified facts, rumours, promises
and leads; save export/import, separate normal and sandbox autosaves, and
older-save conversion.

Rules and written content decide mechanics. AI narration may still get details
wrong, but it never grants items or replaces the confirmed mechanics feed.

## Local model instead of Claude

Under **Settings → AI settings**, choose *A model running on this computer* and
select the exact model ID from a loopback OpenAI-compatible server such as Bionic
(`http://127.0.0.1:1234/v1`). Tuning options open under Advanced settings.
`npm run eval:plan` and `EVALUATE-MODEL.bat` evaluate local models; see
[Model evaluation](docs/MODEL-EVALUATION.md).

## Saves and updates

Export a JSON save before updating, moving files, or changing browsers. Extract a
new source build into a separate folder; do not overwrite an old installation.
Older saves, including heroes from before the level 100 update, are converted when
loaded; keep the original as a backup. Browser data belongs to its profile, not an
online account, so clearing site data can remove it. Never publish personal saves,
`.env` or `.local-ai.json`.

## Development

```sh
npm run check
npm test
npm run playtest
npm run fuzz
npm run balance        # simulated job battles, about seven minutes
npm run build:public
npm run eval:plan
npm run eval:mock
```

GitHub runs Windows/Linux tests on Node 22 and 24, campaign and state checks,
simulated model evaluation and real browser checks (Chromium and Firefox on
Linux, Chromium on Windows). Browser automation needs the test-only Python
packages in `tests/browser-requirements.txt`; players do not. Tests use no real
API key and are not proof of real-model quality or of fun; a full play session
with a real Claude key has not been recorded yet.

[Game guide](GAME-GUIDE.md) · [Changelog](CHANGELOG.md) ·
[Current status](docs/CURRENT-STATUS.md) · [Public testing](docs/PUBLIC-TESTING.md).
Report bugs using the issue template and build ID, without private information.
