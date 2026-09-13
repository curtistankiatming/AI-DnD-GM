# Briarwatch — Lantern Road & Campaign Journal 4.1.0-alpha.3

A local, single-player, story-led d20 adventure with active companions, towns,
travelling merchants, equipment, and progression through level 10.

**PR #4 and PR #5 are merged into `master`.** The public alpha includes Lantern
Road and the persistent journal; its source ZIP also includes Shared Model
Evaluation v1. This is an unfinished public playtest, not a stable release or a
complete official Dungeons & Dragons rules implementation.

See [Current status and evidence](docs/CURRENT-STATUS.md) for the dated release,
merged commits, validation records, and remaining limits. Older review reports
retain their original dates and are not the current release-status source.

## Choose how to play

| Edition | Start | AI |
| --- | --- | --- |
| Browser download | Download `briarwatch-browser-playtest.zip`, extract, open `briarwatch-playtest.html` | Offline, deterministic narration; no model calls |
| Full source | Extract `briarwatch-source.zip`; open `run-local.bat`, or run `npm start`, beside `package.json` | Optional local AI through the game's settings |

Downloads: [Public playtest releases](https://github.com/curtistankiatming/AI-DnD-GM/releases).
Choose the release by both version and commit suffix: PR #5 adds evaluation tools
without changing game version 4.1.0-alpha.3. The verified post-PR #5 release is
[4.1.0-alpha.3 (69787576)](https://github.com/curtistankiatming/AI-DnD-GM/releases/tag/playtest-6978757638845b807000fad205b1eea74797b286).

Browser play needs no Node.js, account, API key, or internet after downloading.
Full-source play needs Node.js 22 or newer; CI covers Node 22 and 24. No `npm
install` is needed for the runtime or evaluator. A source checkout does not
contain generated browser HTML: `npm run build:public` creates it in `dist-public`.
Some earlier chat-delivered ZIPs separately included a `browser-preview` folder.

**This is a downloadable game, not a hosted click-to-play website.** Do not expose
the local Node server, its save API, or your local model to the internet.

## What is implemented

- Authored level-1–10 campaign, level-10 advancement trial and follow-on mission;
  active companions, equipment comparisons, merchants, town services and recovery.
- Campaign instructions saved through chat; separate Action, Dialogue and Question
  modes; confirmation before model-proposed actions affect rolls or resources.
- Courier at the Ferry and **Lantern Road: A Promise in the Rain**. The connected
  medicine-delivery journey tracks repairs, travel, trust, promises and follow-up.
- Persistent **Campaign journal** for verified facts, rumors, relationships,
  promises and unfinished leads. Player notes remain unverified plain text.
- Normal and sandbox testing modes with separate autosaves; save export/import,
  compatible older-save migration, and voluntarily exported bug reports.
- Corrected companion-rest capacity, saved narration restoration, and bounded
  local AI transport. The chat connection defaults to ten minutes per request.

Rules and authored content determine mechanics. AI dialogue/narration may still
be wrong; it does not grant items or replace the confirmed mechanics feed.
This remains a finite authored adventure, not unlimited generated quests/worlds.
Levels 30 and 70 are planned advancement milestones, not playable content.

## Local AI and model evaluation

Start the full-source game without AI. When a compatible local model server such
as Bionic is running, use **Local AI settings for chat** to select its exact
installed model ID. The usual local address is `http://127.0.0.1:1234/v1`.
Compact/Balanced/Expanded are adjustable workloads, not model-size restrictions or
quality certifications. No paid/cloud/LAN fallback or automatic download is used.

**Actual Qwen, Gemma and smaller-model performance remains unvalidated.**
`EVALUATE-MODEL.bat` offers an explicitly confirmed three-prompt local test;
`npm run eval:plan` prepares a plan without inference. The shared suite has 13
synthetic game cases and separates completion, narrow correctness, latency and
manual story review. See [Model evaluation](docs/MODEL-EVALUATION.md).

## Saves and updates

Export a JSON save before updating, moving files, or changing browsers. Extract a
new source build into a separate folder; do not overwrite an old installation.
Browser data belongs to its profile and origin, not an online account. Clearing
site data/private browsing can remove it. Normal and sandbox autosaves are separate.
Compatible V4 saves can be imported; keep original backups and do not assume an
older build can load newer saves. Never publish personal saves or credentials.

## Development and evidence

```sh
npm run check
npm test
npm run playtest
npm run fuzz
npm run build:public
npm run eval:plan
npm run eval:mock
```

GitHub runs Windows/Linux tests, simulated evaluation and real browser regression
checks. Real browser restarts cover standalone/static editions; Node-server UI
coverage is in-session. Tests are not proof of real-model quality or human fun.
Browser automation alone needs the test-only Python dependencies in
`tests/browser-requirements.txt`; ordinary players do not.

[Game guide](GAME-GUIDE.md) · [Public testing](docs/PUBLIC-TESTING.md) ·
[Integration/evidence history](docs/INTEGRATE-CANDIDATE.md) ·
[Current status](docs/CURRENT-STATUS.md).
Report bugs using the issue template and build ID, without private information.
