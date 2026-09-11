# Briarwatch 4.1.0-alpha.2 — corrective validation

**Date:** 10 September 2026. **Result:** the three reproduced alpha.1 defects are corrected and the local regression suite passes. This is a review candidate, not a real-model certification or a completed hosted/browser acceptance gate.

## Source and scope

Input: the delivered `briarwatch-chat-foundation-4.1.0-alpha.1.zip`.

Input archive SHA-256:
`0c09bd6a78439ab8a330c724b77e8f68bb134e3b9e4f849ebfaa78f290120d7c`

Original repository baseline: `5e34236c4c840ab512912f05e3a5ccbfbda7b12f`, Git tree
`1698292f99770a45c3eaa45214bee3055af53eb7`. The preceding alpha.1 source tree is
`303f9217e7daebf75a9c9150a75b84f35297d96d`. Local reconstruction commits are synthetic,
not claims of commits pushed to GitHub. Package metadata records the new source tree.

This work changes local-model transport, saved-story presentation and the public
combat information supplied to chat. It preserves alpha.1's saved instructions,
confirmed action proposals, companion recovery correction and model profiles.
There is no encounter rebalance, extra level cap, new paid service or new public
hosting. The underlying game remains an authored level-1–10 campaign plus a bounded
interactive ferry scenario, not arbitrary AI-generated world simulation.

The live repository's default package was read and still reported `4.0.2-preview.1`.
No GitHub source write, pull-request merge, hosted workflow dispatch or public release
was performed in this work. The corrected source is delivered as a complete ZIP and
verified patches for later review-branch integration. This is not a claim that write
capabilities are unavailable.

## Fix 1: the configured ten-minute wait now controls the whole response

The old local adapter used native `fetch`, whose lower response-header deadline
could end a request before the configured 600-second wait. A fresh unmodified-alpha.1
reproduction requested a reply after 335 seconds, with a 600-second application
limit, and failed at **300,879 milliseconds** after exactly one request.

The new server-only `src/local-http.js` uses dependency-free native HTTP(S), with the
caller-owned abort signal as the overall deadline. The same signal covers connect,
headers and the complete response body. Periodic data does not reset the deadline.
Both the new chat adapter and legacy local narration use this transport. Only the
configured loopback API is allowed; there are no redirects, automatic retries,
proxy-based cloud routing, model downloads or provider/model switching. Byte limits,
error redaction, cancellation and connection-release checks remain in place.

### Actual elapsed-time tests — no fake timers

Four isolated loopback fixture servers were tested in parallel; this was not four
concurrent requests to a real model. All four acceptance assertions passed.

| Case | Configuration | Observed result |
|---|---|---|
| No headers until the complete reply | 600-second limit; reply after 335 seconds | Completed in **335,033 ms**, one request |
| Headers/partial body, then delayed remainder | 600-second limit; remainder after 335 seconds | Completed in **335,011 ms**, one request |
| Legacy local narrator | 600-second limit; reply after 335 seconds | Completed in **335,031 ms**, one request |
| Never-finishing body with data every 10 seconds | 600-second total limit | Correctly aborted in **600,005 ms**, one request |

The deadline case is an intentionally expected timeout, not a failed test. Evidence:
`long-wait-result.json` and `baseline-long-wait/long-wait-result.json`.

Additional short tests cover abort before headers and during body, busy-state release,
pre-aborted requests, redirects refused without follow-up, oversized bodies including
UTF-8 multibyte chunks, invalid status handling, disconnection, and a successful next
request after cancellation/completion. Actual local HTTPS certificates and Bionic's
backend GPU cancellation behavior remain outside these fixture tests.

**What this means:** a slow reply is no longer rejected merely at the former five-minute
boundary. It does not make the selected model faster or establish that Qwen will
finish within ten minutes. The separate earlier diagnostic/connection ZIPs were not
modified; this fix applies to this game build's local-model routes.

## Fix 2: restore the saved story presentation

The offline transport previously handled loading like a fresh narrative action and
could replace courier consequences with the original village opening. A regression
reproduced this against the input alpha.1 build.

The browser import, named load and autosave resume now share `savedNarration` with
the server loader. Existing nonblank saved narration is restored unchanged and
labelled **Saved narration · no new action**. An older save without narration gets a
labelled **Saved-game recap** from its current scene, courier progress or active combat.
It does not reuse an unrelated previous reward, call a model or resolve another roll.

Coverage includes exact AI/deterministic text preservation, courier results, named and
repeated loads, separated sandbox/normal autosaves, legacy saves without chat fields,
mid-combat recap, pending action confirmation, invalid import, resources, XP and story
state preservation. A saved AI response remains historical unverified prose, not a
new authoritative action or a new model call.

## Fix 3: give combat chat current public facts, including small profiles

The planner/question context now includes present enemies and allies, health, armor,
temporary HP, visible conditions and expiry data, current round and actor, remaining
hero class resources, action/bonus state, usable actions and public objective progress.
It omits hidden future outcomes. Chat questions do not spend a turn or use a spell;
actual combat actions still require the existing explicit controls.

For Compact requests, optional long action descriptions can be omitted first, then
old clue prose, duplicated party details, and non-usable inventory listings. Every
such reduction is explicitly labelled in the supplied context, with instructions not
to guess omitted details. Enemy identities, current resources, turn state, objective
progress and campaign instructions are retained. A required context that still does
not fit fails clearly before a model request, rather than silently dropping core facts.

These are character budgets, not measured tokenizer windows or guarantees about
hardware/model size. Compact/Balanced/Expanded remain interchangeable starting profiles
for 7B/12B/27B-class and other models; no model is selected automatically.

### Campaign-context sweep

At **523 combat snapshots** across six prepared scripted campaigns, the new context
was built with each default profile (**1,569 total context builds**). All retained
core combat facts and none exceeded its profile budget.

| Profile | Context builds | Largest total request (characters) | Optional action descriptions reduced | Over-budget failures |
|---|---:|---:|---:|---:|
| Compact | 523 | 8,000 | 448 | 0 |
| Balanced | 523 | 13,699 | 0 | 0 |
| Expanded | 523 | 14,198 | 0 | 0 |

These are context-construction tests, not 1,569 model inferences. Longer user instructions,
different inventories or deliberate smaller overrides can still require a larger budget.
The nine exact model-identifier/profile fixture combinations also pass. They preserve
the requested model identifier without downloading or running those model weights.

## Regression, campaign and state validation

Environment: Linux, **Node.js 22.16.0**, npm 10.9.2. Real model requests: **zero**.
All HTTP servers and saves used by tests are isolated fixtures/temporary directories.

| Check | Measured result |
|---|---|
| Original alpha.1 automated suite | 164 passed, zero failed |
| Independent review regression cases on alpha.1 | 10 passed, 2 failed (save presentation and combat context) |
| Same review regression cases on corrected code | 12 passed, zero failed |
| Corrected full suite | **210 passed, zero failed, zero skipped** |
| JavaScript syntax | **48 files passed** |
| Full class/difficulty/route sweep | **270/270 completed at level 10; zero engine/action-policy errors** |
| Campaign actions | **63,433** |
| Rescue events | **67**; completion is not winning every encounter |
| Recorded campaign setbacks | **795** |
| Randomized fixture actions | **14,400** across 240 fixtures |
| Accepted/rejected fixture actions | **9,087 accepted / 5,313 rejected** |
| Reload/normalization checks inside randomized run | **1,440** |
| State-invariant failures | **Zero** |

The full campaign sweep uses six classes × three difficulties × three route policies
× five seeds. Policies use ordinary game actions, but they are scripts, not blind
human play. Controlled high-level randomized fixtures are not evidence of naturally
earned levels. Input alpha.1 historical reports were retained without relabelling
older observations as new results.

## Browser evidence and remaining gate

Playwright **1.57.0** and installed Chromium were used for attempted real file,
static-HTTP and game-server navigation with isolated disk-backed profiles. All three
were blocked by the environment's administrator policy (`ERR_BLOCKED_BY_ADMINISTRATOR`).
The policy was not changed or bypassed. These runs are **blocked, not passed**.
Real browser close/reopen persistence, real Windows launchers and actual Safari/Firefox
acceptance remain pending. The prepared hosted workflows have not run on these alpha.2
sources. A green older-repository workflow does not validate this candidate.

A separately disclosed UI harness rendered the actual generated HTML/JS/CSS with
`set_content` and memory-backed storage. It completed saved instructions, courier
proposal and confirmation (40 objective XP without forced rolls), JSON export,
explicit level-10 sandbox creation, resumption of the separate normal campaign,
and file-input import. The final courier narration matched before and after import.
There were no browser JavaScript errors or game network requests. At 390×844, document
and body width both matched the 390-pixel viewport. This is interaction/layout evidence,
not a substitute for disk persistence or real-model testing.

## Reproduction commands

Ordinary development checks:

```sh
npm run check
npm test
PLAYTEST_RUNS=5 PLAYTEST_OUTPUT=/path/to/evidence/campaign-results.json npm run playtest
FUZZ_CASES=240 FUZZ_STEPS=60 FUZZ_OUTPUT=/path/to/evidence/fuzz-results.json npm run fuzz
CONTEXT_SWEEP_OUTPUT=/path/to/evidence/context-policy-sweep.json node tests/combat-context-policy.js
npm run build:public
```

Opt-in actual ten-minute fixture check (not part of every unit test):

```sh
LONG_WAIT_OUTPUT=/path/to/evidence/long-wait-result.json node tests/long-wait-check.js
```

The build's browser test requirements and command are in `docs/INTEGRATE-CANDIDATE.md`.
A fresh extraction is also syntax/test checked and its browser rebuild compared with
the shipped files. Final package and patch roundtrip results are recorded in the
accompanying evidence, not inferred from the build script existing.

## Decision

**Accept these three corrections as locally tested fixes.** Keep the build in review
status until hosted/real-browser checks are completed. Actual Qwen, Gemma and a selected
7B model still need the separate live tests when a local model server is available.
No paid fallback, remote PC access or public AI endpoint is required or enabled.
