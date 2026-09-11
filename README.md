# Briarwatch — Lantern Road & Campaign Journal 4.1.0-alpha.3

**Review build on GitHub, not the published default game.** PR #4 combines the
chat foundation with a connected medicine-delivery adventure and a lasting
campaign journal. The master branch and public download remain unchanged until
review and promotion. No Qwen, Gemma or other real-model result is claimed.

## What is new

- Saved campaign instructions, confirmed chat actions and a replaceable loopback
  AI adapter with Compact/Balanced/Expanded workload settings (7B/12B/27B-class
  starting points, not restrictions or quality certifications).
- **Lantern Road: A Promise in the Rain**: three linked locations, wagon repairs,
  a flooded crossing, medicine delivery, trust, a sealed-letter promise, fail-forward
  alternatives and a one-time town follow-up. Start it in Briarwatch via chat or
  its button. It supplements rather than replaces the level-1–10 main campaign.
- **Campaign journal**: verified clues, rumors, promises, relationships, lasting
  regional decisions, unresolved leads and completed adventures. Ask for a recap
  or add your own clearly labelled notes. It survives pruning of old chat.
- Actual hosted browser validation for the earlier integration and Lantern Road
  stages has passed on Windows Chromium and Ubuntu Chromium/Firefox, including
  closing/reopening real saved profiles. Each subsequent candidate receives its
  own checks; consult PR #4 for current results.

The game is still a finite authored adventure. Models can propose validated
approaches and provide dialogue; arbitrary new worlds or unrestricted mechanical
changes are not implemented. Offline browser play does not connect to AI.

### Start this review build

Extract to a separate folder and keep old saves backed up. `run-local.bat` starts
the local game with Node.js 22 or newer; no npm install or model account is needed.
Use the game's **Local AI settings for chat** only when your local model is ready.
The endpoint is loopback-only; paid/cloud/LAN fallbacks and model downloads are off.

The supplied `browser-preview/briarwatch-playtest.html` can be opened directly for
model-free play. In a source checkout, `npm run build:public` creates that edition
under `dist-public`. The browser's toolbar supports save export/import; export
before moving files, changing browsers or updating. Browser profiles and file
origins vary, so JSON backups remain important even after our test matrix passes.

`npm test` needs only Node. Browser automation additionally uses test-only Python
packages from `tests/browser-requirements.txt`; ordinary players do not need them.
All automated saves, profiles and mock model services are isolated test fixtures.

Details: [Lantern Road](docs/STAGE2-LANTERN-ROAD.md),
[Journal](docs/STAGE3-JOURNAL.md), [Chat foundation](docs/CHAT-FOUNDATION.md),
[GitHub integration status](docs/INTEGRATE-CANDIDATE.md).
Root V4.0.0 reports and earlier alpha reports are historical evidence, not new
measurements. The known companion-rest defect is fixed in this review branch.

## Alpha.2 corrections

- Local chat and legacy local narration now honor their configured wait through
  connection, headers and body, instead of failing at the previous five-minute
  network boundary. Real-duration fixture tests completed after 5 minutes 35
  seconds and stopped a never-finishing request at the 10-minute limit.
- Import, named-save load and autosave resume restore saved narration without
  rerunning an action. Older saves without narration get a labelled current-state
  recap, not an unrelated scene opening.
- Chat requests include current combatants, turn/action state and remaining class
  resources. Smaller profiles explicitly compact optional descriptions and older
  context while preserving core combat facts and campaign instructions.

No real model quality or speed is certified by these fixes. The separate Bionic
connection/diagnostic ZIPs from earlier conversations are not modified by this game
package. The game's own Local AI settings apply to its new chat connection.

Use `run-local.bat` in this separately extracted folder to play with Node.js 22+.
There are no external runtime dependencies or default model calls. Start without
AI, then use the game's **Local AI settings for chat** to explicitly enable your
installed model later. Do not overwrite your existing game or saves.

`npm run build:public` creates an offline-only browser edition. Chat preferences
and the optional ferry scenario work there, but it does not connect to a model.
`npm test` requires only Node; browser automation additionally uses the test-only
Python packages in `tests/browser-requirements.txt`. Ordinary players do not need them.

The companion-rest bug referenced in the older release notes below is fixed in
**this candidate**, not yet in the live repository. PR #3 is already merged; this
candidate is a separate subsequent work package. It does not add levels 30/70 or
unlimited generated campaigns.

---

## Existing public playtest information (published baseline)


A story-led, single-player d20 adventure with active companions, towns, travelling merchants, equipment and progression through level 10.

**This game is unfinished. You are welcome to test it before the story, balance and systems are final.** Public test snapshots are labelled prereleases, not stable releases.

## Play without installing anything

1. Open **[Public playtest downloads](https://github.com/curtistankiatming/AI-DnD-GM/releases)** and choose the newest **Public playtest**.
2. Under **Assets**, download **`briarwatch-browser-playtest.zip`** and extract it.
3. Open **`briarwatch-playtest.html`** in a modern desktop browser.

No Node.js, AI account, API key or internet connection is needed after downloading. There is no shared game server. The browser edition uses **deterministic story narration**, not a live AI model. It uses the same gameplay rules/content as the local server edition, not a separate simplified game.

**This is a downloadable browser game, not a live hosted website.** GitHub Pages is not enabled by this change. The generated `dist-public/index.html` is suitable for static hosting once a hosting destination is configured; do not publish `server.js` as an unauthenticated service.

## Test normally or skip ahead

**Normal campaign:** begin at level 1 and earn progress through story decisions and encounters.

**Sandbox checkpoints:** expand the public-playtest toolbar, select a level and scenario, and create a labelled test character. It receives granted XP, 400 gold, supplies and prerequisite flags so you can test later systems without replaying everything. Select your class on the creation screen first. Choose pending development rewards, prepare in town, then use the expedition board. Higher-level scenarios enforce their minimum level.

Sandbox saves and autosaves use a separate prefix. They do not replace the normal campaign autosave. Sandbox outcomes are not evidence of naturally earned progression. The level-30 and level-70 advancements are future plans, not included content.

## Keep your saves

Use **Export current save** to download a JSON backup, and **Import save** to continue in another browser/build. Compatible V4 server saves can also be imported. Normal and sandbox saves retain their mode.

Browser saves are local to a browser profile and origin; they are not cloud saves. People using the same profile share that profile's storage. Clearing site data, private browsing, browser settings or moving an HTML file can affect retention. The game warns when browser storage is unavailable. **Export before closing or updating.** Existing named saves are not automatically deleted.

## Tell us what needs improvement

Use **Export bug report**, then **[submit playtest feedback](https://github.com/curtistankiatming/AI-DnD-GM/issues/new?template=playtest.yml)**. The report contains the build ID, class, level, scene and browser—not your character name, dialogue, save file or credentials. Nothing is sent automatically. A GitHub account is needed to submit an issue, but not to download or play.

Known limitations include [Orin's short-rest resource issue #2](https://github.com/curtistankiatming/AI-DnD-GM/issues/2), recurring expedition structure, and no real-model narration in the browser edition. Public access does not mean all bugs are fixed.

## Developers and local AI narration

The original local-server route remains available with Node.js 22 or newer (24 recommended):

```sh
npm start
npm run check
npm test
npm run playtest
npm run fuzz
npm run build:public
```

No `npm install` is needed. Windows users can use `run-local.bat`. The full setup, game systems and optional local-model instructions are in **[GAME-GUIDE.md](GAME-GUIDE.md)**. Keep the server bound to localhost; do not expose its save API publicly.

`npm run build:public` creates a self-contained HTML game, build manifest and checksums in `dist-public/` from an explicit source allowlist. It does not copy `.env`, saves, local credentials or the HTTP server. Network calls are disabled in the browser edition.

## Public testing channel

PR #1 was approved and merged into `master`. The new public-testing work is developed on **`public-testing`**, separately from stable/default code. The **Public playtest download** workflow validates and publishes a commit-identified prerelease when `master` or `public-testing` changes. This allows public testing of unfinished, unmerged development snapshots. Existing releases are retained; a failed build does not erase the last usable preview.

See **[public testing notes](docs/PUBLIC-TESTING.md)** for limits and **[preview validation](docs/PUBLIC-PREVIEW-VALIDATION.md)** for measured coverage. This work does not choose a new distribution license or imply official Dungeons & Dragons affiliation.
