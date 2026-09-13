# Local AI response integration and acceptance

Development scope: PR #8, stacked after the repair fix in PR #7. A review branch
is not a published release or an update to an installed game. Use the PR's final
head and hosted results for acceptance; older passing runs cover older revisions.

## Uncapped output is an explicit choice

In full-source play, expand **Local AI settings for chat**, select an installed
model, and check **Uncapped requested output (compatible local servers only)**.
Save the settings. The numeric reply input is disabled while selected; switching
profiles preserves this opt-in. Unchecking restores the displayed numeric limit.
The checkbox is off by default: Compact160, Balanced240 and Expanded320 are unchanged.
The setting persists as `replyTokens: -1` in the local configuration and sends
`max_tokens: -1`. That convention worked in the user's Bionic evaluation; it is
not a universal compatibility guarantee for every local server/model.

Uncapped output does not remove the ten-minute maximum wait, cancellation,
128 KiB response-body guard, context-character budget, model context limit or
Bionic's reasoning budget. It does not mean unlimited displayed prose: strict
proposal sizes and existing narration presentation limits remain. Requests remain
serial, with no automatic retry, model switch, download or paid fallback.
A truncated/reasoning-only response is not a completed final answer.

The legacy narrator is a separate, opt-in route. It is not silently enabled or
reconfigured by chat settings. For that route only, set `AI_REPLY_TOKENS=-1` and
`AI_TIMEOUT_MS=600000` alongside the existing explicit local-model setup. Unset
output remains260 and unset timeout20seconds. Invalid explicit output values
fail to deterministic narration without contacting a model. Its existing
narration display limit remains. The chat cancel button controls chat requests,
not an independent legacy request. Do not start both routes concurrently.

## Questions, dialogue and consequences

The prompt now distinguishes factual Question replies from in-character Dialogue
and preserves clarification for uncertain or multi-step requests. A valid reply
mistagged between these two read-only modes keeps its original text but is routed
to the player's selected mode. `result.responseType` records requested, returned,
effective and adjusted values; a visible notice explains any adjustment.
This is presentation routing, **not factual verification**. A model-proposed action
in either read-only mode is still rejected. Malformed JSON, extra fields and
non-action option IDs remain invalid. No adjustment grants XP, changes inventory,
creates a journal fact or executes a roll. The raw decoder and evaluator scoring
remain strict; wrong raw labels still fail their original contract check.

Confirmed consequence prompts now include explicit ownership and before/after
changes for the party's trade reputation and Tamsin's trust toward the party.
Herbs are distinguished as not offered, offered-but-uncollected, or collected.
These fields are read from the engine, never model prose. Delivery text names the
party and reports an unchanged reputation at its cap rather than a false +1.
The actual reward, cap and trust rules have not changed. This improves supplied
facts; it cannot guarantee that every model sentence will respect them.

The longer intermediate planner prompt exceeded one tight context fixture. The
prompt was condensed, without removing required mechanical facts or relaxing the
budget test. Existing omission notices still identify optional context removed.

## Automated acceptance, not live model certification

The normal test command includes focused output-limit and response-policy tests
and a synthetic integrated HTTP journey. It runs the real Node game and loopback
adapter, cancels a waiting consequence after the delivery has committed, checks
same-request replay and one-time rewards, writes a temporary save, actually stops
and restarts the server, and reloads the saved instructions, promise and uncapped
configuration. It then collects the gift once. Temporary files are not user saves.

Browser smoke checks keep real file/static disk-profile restarts and the server UI.
Server UI checks use an explicitly configured synthetic local HTTP model to
exercise the visible Question/Dialogue adjustment notices and reject an action
returned in Question mode. The original isolated test configuration is restored.
There are three synthetic requests, not three real model evaluations. Full-server
restart is covered by the HTTP test; do not describe it as a full browser/server
restart or evidence of the user's interactive Windows launcher.

## Live acceptance after integration (still pending)

Use a separate new installation and test campaign. Keep Qwen's existing Bionic
settings unchanged; enable uncapped requested output in game chat and retain600
seconds. Do not use the old temporary source-patching launchers on this new code.
The ordinary EVALUATE-MODEL.bat still uses default profile token limits unless
using the explicit configuration route below.

Copy `model-eval-uncapped.example.json` to `.model-eval-qwen-uncapped.json` and
check its exact model ID. The plan command sends no model request:

```sh
npm run eval:plan -- --config .model-eval-qwen-uncapped.json
# Explicit consent:13 synthetic prompts,130-minute total cap,one pass,no warm-up.
npm run eval:model -- --yes --config .model-eval-qwen-uncapped.json
```

This uses the existing suite, not a new evaluation engine. New source/prompt
fingerprints distinguish this run from the original13-case run. Retain old reports;
do not relabel old failures or call changed prompts an identical workload.
`-1` in the raw settings means the uncapped request. Review final answers and
request failures separately from game routing and deterministic shortcuts.

Then try a connected session: campaign instructions, an unpaid repair offer,
a genuine refusal, a multi-step request, a confirmed action, the letter promise,
a read-only question, delivery, gift collection and save/reload. Check the
mechanics feed and journal as well as the prose. Unexpected rewards, repeated
rolls, lost progress or unhandled waits block acceptance.

Supplementary ledger wording (not replacements for the original scored case):
- Clear: "I examine the toll ledger for discrepancies." Expect the offered ledger
  investigation to be proposed, not executed without confirmation.
- Ambiguous: "I examine the records or question the official; I have not decided
  which." Expect clarification, not a silent choice.

These supplemental local tests use synthetic replies to validate game handling;
the actual model's interpretation still needs reading. Record completion, raw
response contract, factual content, story quality and waiting time separately.
No claimed Qwen improvement, Gemma comparison, smaller-model ranking or sustained
session stability follows from automated mocks. Live acceptance is not scheduled
or run by this development update.
