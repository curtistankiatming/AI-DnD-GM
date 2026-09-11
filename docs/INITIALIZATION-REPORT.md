# Initialization report — 4.1.0-alpha.1

Date: 10 September 2026. Scope: the approved chat/memory/local-AI foundation, multi-size profiles, companion recovery, and test automation initialization.

## Source and publication status

The connected GitHub API reported `master` at `5e34236c4c840ab512912f05e3a5ccbfbda7b12f`, tree `1698292f99770a45c3eaa45214bee3055af53eb7`. The isolated baseline was reconstructed from the available artifacts and repository reads, then verified with Git: **the entire baseline file tree matched that tree exactly**. This was not an older unverified archive substituted for live source.

The changes are in a **local** review branch, `review/chat-ai-foundation`. The current connector exposes repository reads but no push/commit/PR writes. An installable connector search did not provide a write route. No new remote branch, commit, PR, merge, deployment, release or GitHub Actions execution was performed. The live published game remains unchanged. The supplied source package and patch are the deliverables for review/integration.

## Implemented

- Persistent campaign preferences, bounded chat transcript and authoritative side-story facts.
- Separate actions, dialogue, questions and campaign-instruction commands.
- Validated, explicitly confirmed model proposals; unavailable actions and unknown mechanical fields rejected.
- Local model selection and connection settings in the game's local-server UI.
- Independent Compact/Balanced/Expanded workload presets for approximately 7B/12B/27B starting points, with manual overrides and no family whitelist.
- Optional plain-JSON/JSON-Schema output and alternate prompt-role templates.
- Ten-minute per-request ceiling, single active request, bounded context/output, cancellation, clear failure messages and no model/cloud retry or automatic download.
- An optional courier/ferry scenario with actual checks, preparation, consequences, a fail-forward completion route and one-time rewards.
- Companion short-rest correction, shared recovery logic, and save/level transition coverage.
- Browser test scripts with real-navigation/persistent-profile checks, plus workflow definitions that gate publication on the expanded validation and check the packaged HTML.

This is **not** unlimited improvisational story generation. The model currently interprets input against validated authored approaches, handles grounded dialogue/questions, and writes consequences after resolution. The main campaign remains levels 1–10. Levels 30/70 and general runtime-generated quests remain future work.

## Measured local results

Runtime: Linux, Node.js 22.16.0. All model requests in tests used fixtures or simulated responses; no real local or cloud model was called.

| Check | Result |
| --- | --- |
| Verified baseline test suite | 93 passed, zero failed |
| Companion regressions before correction | 7 failed, 12 passed, demonstrating the defect |
| Companion regressions after correction | 19 passed |
| Final unit/integration suite | 164 passed, zero failed |
| JavaScript syntax | 41 files passed |
| Chat foundation tests | 23 passed |
| Local provider/profile tests | 28 passed |
| New actual local HTTP chat/settings/save integration | Passed against an isolated fake model server |
| Full ordinary-policy campaign sweep | 270/270 completed through level 10/first advancement/aftermath |
| Campaign actions | 63,433 |
| Campaign engine/action-policy errors | Zero |
| Rescue events / setbacks | 67 rescues and 795 setbacks; completion is not undefeated success |
| Randomized game-state diagnostics | 14,400 actions across 240 controlled fixtures |
| Accepted / rejected diagnostic actions | 9,087 / 5,313 |
| Diagnostic save-normalization checks | 1,440 |
| Diagnostic state-consistency failures | Zero |
| Python browser-test syntax | Compiled successfully |
| Workflow definitions | YAML and basic dependency structure checked; not run on GitHub |

The campaign sweep covers six classes, three difficulties, three route policies and five seeds. It uses public-view scripted decisions, not a new blind human-like level-10 browser playthrough. Randomized high-level fixtures do not demonstrate earned progression. The normal campaign policies do not evaluate open-ended model quality.

The local provider tests check the exact user-supplied Qwen and Gemma ID strings and a synthetic 7B identifier in fake requests. They check request configuration, not real model compatibility. A 3-second test verifies the timeout mechanism; the production configuration accepts the requested 600-second limit. We did not wait thirty minutes against a nonexistent real model or claim a live ten-minute test succeeded.

## Browser evidence — important limitation

An actual persistent-profile Chromium test attempted normal file navigation. It failed with:

```text
net::ERR_BLOCKED_BY_ADMINISTRATOR at file:///.../dist-public/index.html
```

That restriction was not bypassed. The real-browser navigation/restart acceptance gate remains **unverified**, not passed. Hosted Windows, Chromium/Firefox restart tests and actual Safari are also unverified in this session.

A separate, explicitly limited `set_content` harness rendered the generated original HTML/JS/CSS with **memory-backed test storage**. Visible controls completed: new character; saved instructions; side-story start; civic approach; confirmation; earned 40 XP; save export; labelled level-10 sandbox; restoration of the separate normal campaign; and import through a file input. It recorded no JavaScript errors or network requests. At 390-pixel viewport width, document/body widths were both 390. Screenshots and the harness log are in the evidence package.

That test validates interface integration in the harness. It does not prove persistent browser disk saves, the user's Windows launcher, or a real Qwen/Gemma response. The candidate includes a real-navigation test script for later GitHub/local execution without substituting storage or bypassing policy.

## Feasibility and cost boundaries

One local-compatible adapter can carry different exact model IDs, response templates and request budgets. Its correctness can be tested without loading model weights. Parameter count is not a guarantee of JSON compliance, context capacity, latency, quality or hardware fit. The preset numbers remain conservative starting settings to tune with real measurements.

The game runtime remains dependency-free. Browser tests add development-only Python tooling; players do not install it. The new adapter accepts only loopback endpoints and never chooses a paid/cloud fallback. GitHub workflow definitions use standard hosted runner labels and three-day retention for browser evidence, not paid larger runners or a self-hosted desktop agent. No new paid service was enabled.

A hosting site, shared inference endpoint, telemetry system, vector database and model downloads are not required for this initialization and were not added.

## Remaining acceptance gates

1. Review/apply the supplied patch or source changes to a new remote branch, then execute the prepared GitHub workflow. Do not represent locally generated workflow files as successful hosted jobs.
2. Complete actual browser-file, static HTTP and local-server UI checks, including real browser restart and compatible-build save import. Retain original player backups.
3. Run the existing ten-minute Qwen check on the user's PC when available. Then test the same pipeline with Gemma and a deliberately selected smaller instruction model, recording exact model/quantization/runtime, cold/warm latency and instruction adherence separately.
4. Broaden chat actions and generated story primitives only after this bounded slice is reliable. No need to wait for public commenters, but scripted success is not proof of enjoyment.

No action is required on the unavailable PC to keep this code/review work available. The source package is complete for this initialized slice; real-model and real-browser acceptance are intentionally not claimed.
