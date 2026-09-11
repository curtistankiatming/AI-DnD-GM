# GitHub review integration

The live base remains `5e34236c4c840ab512912f05e3a5ccbfbda7b12f` on master.
The review branch is `review/alpha2-integration`, PR #4. It now holds the game
sources directly; no user needs to copy a cumulative patch out of this ZIP.

Stage 1 imported exact alpha2 tree `5d534084fe11f34410c6156fd88a83c5f0e203a5`
and passed all eight hosted validation jobs in run 34562198820.
Stage 2 added Lantern Road (tree `b3ec7937fe88dc974e44296842e5b797aea94cb2`)
and passed all eight jobs in run 34563544179 before Stage 3 began.
Stage 3 adds the reconciled journal and must pass its own hosted checks before
acceptance. Consult current PR checks and the packaged final report for status.

The browser matrix tests original generated assets by navigating normally. File
and static-HTTP sessions restart actual temporary disk profiles; the Node-server
interface uses a temporary SAVE_DIR. No mocked browser storage substitutes for
those hosted checks. The local authoring environment still blocks browser navigation.

The temporary source-transfer branch is not part of the game PR, its history or
its release package. Its bounded action reconstructs hash-verified source deltas,
tests them, then stores Git objects without moving game branches or publishing.
Workflow-file changes use the GitHub connector, not the Actions content token.

Run npm run check, npm test, npm run playtest, npm run fuzz, npm run build:public.
For browsers install tests/browser-requirements.txt and the chosen Playwright
browser, then run python tests/browser_smoke.py --engine chromium --target all.
The separate tests/long-wait-check.js takes about ten minutes against loopback
mock servers and is not part of ordinary fast unit tests. Model context sweeps
use tests/combat-context-policy.js. Do not present these as real model inference.

Keep private saves, .local-ai.json, tokens, .env and browser profiles out of Git.
Do not merge/publish, change licensing, expose the local PC or enable paid APIs
without the owner's required approval. Existing public downloads stay available
until a validated candidate is promoted.
