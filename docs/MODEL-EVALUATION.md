# Shared model evaluation — initialization 1.0.0

This tests how a selected local instruction model handles **the same synthetic
Briarwatch situations**. It does not download models, run a paid judge, use cloud
inference, read player saves, change game AI settings, or publish results.
Evaluation tooling has its own version; the game remains 4.1.0-alpha.3.

## Simple use, when the model PC is available

Keep the full game source together. With Node 22+ installed, open Bionic's Local
Model API and leave the server running. Finish other generation/game sessions.
Double-click **EVALUATE-MODEL.bat**, paste the exact installed model ID, and choose
a profile. Pressing Enter selects Compact. The launcher explains the request count
and asks you to type **START** before generating. It runs three initial prompts,
one at a time, with ten minutes per request and a thirty-minute total budget.

Results are in a new folder under **evaluation-results**. Read SUMMARY.md; review
responses.json before sharing it. report.json carries checks/timings, requests.json
shows the synthetic prompts, and review.json is a blank story-quality scorecard.
No files are sent to GitHub or a shared backend. Your game saves are not involved.
Auth, when needed, uses LOCAL_AI_TOKEN in the local environment, never JSON config.
No npm install is needed for this evaluator or ordinary gameplay.

## Reproducible commands

```sh
npm run eval:plan
npm run eval:mock
# Exact local model ID required; --yes is explicit permission for generation.
npm run eval:model -- --yes --model "YOUR_EXACT_MODEL_ID" --profile compact
# Full set with repeat-major ordering, optional warm-up and a bounded total run:
npm run eval:model -- --yes --model "YOUR_EXACT_MODEL_ID" --full --repeat 2 --warmup --minutes 90
npm run eval:compare -- first/report.json second/report.json
```

No arguments only prepares a plan. `eval:mock` uses simulated replies and cannot
measure model quality or speed. Live mode is blocked in CI. Standard PR validation
runs the new test suite and a simulated full batch on Windows/Linux; it never
requires your PC, GPU, local token, or a paid model account.

Copy model-eval.example.json to .model-eval.json for advanced settings. Pass
`--config .model-eval.json` along with --live/--yes through the CLI or eval:model.
A config file cannot select live mode. Use loopback endpoints only. Cloud/LAN
addresses and redirects are rejected. Models are looked up by exact ID before
inference. API generation may cause the local server to load the installed model
on demand; the evaluator does not manage downloads, unload models, or substitute IDs.

Compact/Balanced/Expanded change request budgets, not allowed model families or
sizes. Qwen, Gemma, and other compatible instruction models use the same adapter.
7B/12B/27B are not compatibility or quality certifications. The current models
remain **untested live**. Start comparisons with the same profile across models;
profile-tuning experiments are separate, not apples-to-apples rankings. Context
limits are JavaScript character lengths, not tokenizer-measured tokens.

## Cases and meaning

The full suite has **13 cases**: courier evidence, repair for passage, compound
requests, negation, missing equipment, attempted rule overrides, unverified rumor,
updated axle evidence, promise recall after misleading/pruned conversation,
current combat resources, preference-following dialogue, failed-repair narration,
and delivery narration. The quick set contains evidence, repair and failed repair.

Fixtures use actual engine state builders, controlled dice/levels and current
production chat prompts. They are NOT natural playthroughs. Model probes go
straight to the shared production planner context so the model really answers;
in normal gameplay some exact commands and journal questions use zero-cost local
rules instead. That bypass is explicitly labelled in each case. Consequence cases
capture the prompt produced by a real confirmed action. Expected answers, reference
facts and synthetic replies are not added to model requests.

**Four separate questions remain separate:** Did a complete reply arrive? Did it
satisfy the proposal contract? Did it meet a narrowly defined task? Is it good
storytelling? Ten cases have intent/option/exact-answer checks. Three prose cases
are review-required even when formatting works. Exact-answer failure can be a
formatting problem, not proof of inability to reason. Every sample has a manual
review slot; a fluent false reward receives no automatic story-quality pass.

The rubric covers grounding, continuity, player agency, clarity and style, from
1 (poor) to 5 (strong), with null for unreviewed/not applicable. Fill review.json
only after the batch finishes. Scores are NOT automatically trusted, averaged or
fed back into the game. Share the synthetic replies for review rather than relying
on an uncalibrated model judge. No composite leaderboard or automatic winner exists.

## Fair comparison, timing and identity

Reports record suite version, exact model ID, profile/settings, run UUID, repeat,
request hashes, game/evaluator source fingerprint and individual results. Identical
fixtures rebuild deterministically; inference is sampled, not deterministic.
The production adapter uses 0.1 temperature for proposals and 0.5 for prose; no model
seed is claimed. Output schema is plain JSON by default. JSON Schema and single-user
roles are explicit settings for compatible servers, not automatic retries.

The comparison tool refuses an apples-to-apples verdict for mixed simulated/live,
changed code/cases/prompts/profiles, different repeat/warm-up limits, or incomplete
runs. Timing labels require matching user-reported hardware/runtime/quantization;
they are not an independently controlled benchmark. Warm-up is excluded from
measured cases. The first request is not labelled a cold start. Whole-request
latency includes loading/input/output; it is **not tokens per second or time to
first token**. Successful-reply median/p95 never hides failure and not-run counts.
A few successful trials do not establish long-session stability or broad appeal.

## Failure, privacy and scope

Requests are serial; timeout, truncation, reasoning-only output, HTTP error or a
disconnect stops the batch without retry. A completed but wrong proposal is recorded
as a task failure and evaluation can continue. One warm-up is optional, not hidden.
Ctrl+C cancels and saves partial evidence. Abrupt power loss preserves the latest
completed checkpoint. The overall run cap includes warm-up and model lookup.
Server inference may continue after the client disconnects: inspect/stop it in
Bionic before starting again. The evaluator cannot certify server-side cancellation.

A lock prevents two evaluator processes using the same loopback port. It does not
coordinate with unrelated applications. A stale lock after a killed process fails
closed: ensure no evaluator is running, then remove the matching
briarwatch-model-eval-*.lock from your OS temporary directory. Do not blindly remove
locks belonging to a running session. No lock or model is automatically replaced.

Reports contain generated prose from synthetic scenarios, not real saves. Backend
error bodies and known auth tokens are omitted/redacted; still inspect files before
sharing. Results and .model-eval*.json are Git-ignored. Only explicitly collected
synthetic CI logs should enter public artifacts. Evaluation code is not bundled
into the offline HTML. No hosting, licence, ruleset, visibility or level-cap change
is part of this initialization.

Technical references: the local API uses the documented chat-completions and model
listing routes, through the existing bounded Node transport:
- https://lmstudio.ai/docs/developer/openai-compat/chat-completions
- https://lmstudio.ai/docs/developer/openai-compat/models
- https://nodejs.org/api/http.html
