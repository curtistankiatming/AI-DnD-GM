# Briarwatch — public playtest

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
