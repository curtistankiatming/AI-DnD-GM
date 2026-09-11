# Chat and multi-model foundation — 4.1.0-alpha.2

This is an initialized, working slice of the approved plan. It is **not** a completed unlimited AI Dungeon Master or a certification that a particular model works well.

## Corrections validated in alpha.2

The native local HTTP transport uses one caller-owned wall-clock deadline rather
than the previous fetch response-header deadline. Both the chat path and legacy
local narrator were tested with actual 335-second fixture replies; a never-ending
response was aborted at 600 seconds even while receiving periodic data. Cancellation,
partial/disconnected replies and size limits remain bounded. No request is retried
or redirected to another provider. The old standalone diagnostic kits are separate
files and are not updated by this source package.

The public browser transport and server save loader now restore stored narration
as presentation only. Without stored narration, they make a labelled current-state
recap using the actual scene, active combat or courier progress. Loading neither
rolls again nor calls a model. The interface distinguishes saved narration and a
save recap from a fresh AI response.

Combat chat includes present actors and their public health, armor and conditions,
round/turn status, remaining hero resource counts, action/bonus availability, and
visible objective progress. It does not expose hidden future outcome text. Under
small budgets, optional action descriptions, clue prose, repeated party summaries
and non-usable inventory listings can be reduced in that order, with explicit notes
telling the model what is omitted and not to infer it. Core combat and preference
facts are retained or the request is rejected before inference. This is not a
promise to fit every campaign or every model context window.

## What changed for players

The game now has a chat section near the current scene. Choose Action, Dialogue, Question or Campaign Instructions. Instructions replace the previous preference text; `/instructions clear` clears it. Preferences and the recent conversation are saved with the campaign. AI proposals must be confirmed before a model-selected action causes a roll or changes resources. The interpreted single action and its rules are visible before confirmation.

Exact visible approaches and supported single inventory/rest commands work without a model. Unknown free text is not silently converted into an unrelated action. Multi-step requests are handled one step at a time. Combat still uses explicit action/target controls; chat can handle dialogue and questions without spending a combat action.

The optional **Courier at the Ferry** scenario in Briarwatch demonstrates investigation, witness testimony, distraction, rope preparation, negotiation and civic help. Discoveries change later checks. A practical rescue requires an owned Silk Rope and a prior distraction. Failure leaves a civic-help resolution; one unlucky roll cannot trap this side story. Rewards happen only once. Leaving Briarwatch or entering combat pauses it without losing discoveries. This scenario is authored and bounded, not generated freely by the model.

Companion recovery is corrected: Orin's short-rest refresh uses his level-derived capacity. Maren's and Nessa's long-rest resources do not refill on a short rest. Loading keeps legitimate spent resources spent.

## Model sizes and families

Model name, parameter count, quantization, loaded context and server capabilities are different things. No model-family name is used as a capability guarantee or an automatic switch.

| Workload preset | Suggested starting point, not a limit | Context character budget | Reply-token limit | Recent-history target |
| --- | --- | ---: | ---: | ---: |
| Compact | About 7B, or any model needing shorter requests | 8,000 | 160 | 4 entries |
| Balanced | About 12B | 14,000 | 240 | 8 entries |
| Expanded | About 27B | 22,000 | 320 | 12 entries |

Other model sizes can use any profile. A 27B model can use Compact; a smaller model may use a larger budget after testing. These do not change the model's GPU offload, quantization or loading configuration. Context budgets are **characters**, not an exact tokenizer count or a claimed supported context window. Reply-token budgets are API request settings. Both can be edited separately from the profile.

All profiles default to the approved **600-second maximum wait per request**. Output/schema quality and actual latency remain real-model acceptance checks. A confirmed action can involve a separate narration request, so a proposal and its later confirmation are separate waits. Shorter responses reduce work but can also truncate reasoning-heavy outputs; truncation is an explicit failure, not a completed reply.

The same local chat-completions adapter accepts the exact identifier supplied by the server. Planned live candidates include the user's installed:

```text
qwen3.8-27b-uncensored-hauhaucs-aggressive-mtp
gemma4-12b-qat-uncensored-hauhaucs-balanced@q4_k_m
```

These strings were provided by the user. Sending them in mock requests is **not** running or validating their real weights. No specific 7B model is chosen or downloaded automatically.

## Running this candidate later

Extract the complete source ZIP into a **separate new folder**. Keep the existing game and saves backed up. Use `run-local.bat` with Node.js 22+; Node 24 remains the documented recommended line. No `npm install` is needed to play.

Start a new character or import/copy a compatible backed-up V4 save into the candidate's separate saves folder. The saved-game schema stays at 4 with an optional versioned chat field. Ordinary old V4 identities and progression are preserved. Keep backups; do not assume a downgraded older build understands the new side-story data.

For local AI, leave Bionic or another compatible local model server running. In the game's **Local AI settings for chat**, list the installed IDs, explicitly select the desired ID, choose a workload profile, then save with AI enabled. The default local address is `http://127.0.0.1:1234/v1`. The UI does not load a model merely by listing IDs. A generation request may cause the local server's own just-in-time loader to load the selected installed model.

The preferred first live test remains Qwen, using the existing ten-minute diagnostic kit first. Do not stack concurrent generation tests. Gemma and a chosen smaller model should subsequently receive the same test prompts; do not assume equal performance from the preset names.

Settings live in `.local-ai.json` on the game computer, not in a campaign export. `AI_CONFIG_PATH` can select an isolated settings file. An optional local-server token comes only from `LOCAL_AI_TOKEN` in the server environment. Never put it into chat, a save, the repository or screenshots.

The public/offline HTML edition still makes **no model calls**. Instructions, saves, explicit approaches and the side scenario work there; model integration requires the local-server edition. No public shared AI server has been created.

## Compatibility controls

- Plain JSON is the default. The response is parsed and validated in code; it does not assume the server constrains output.
- JSON Schema mode is explicit and optional. Use it only after the selected server/model combination has demonstrated support.
- System + user messages is the default. A single-user template is available for runtimes/templates that do not accept a separate system message. The game validates output in both modes.
- No automatic schema retry, model fallback, cloud fallback, model download or paid provider is implemented.
- Only loopback HTTP(S) addresses are accepted in this preview. Redirects are not followed. A user-operated local server is still responsible for its own behaviour.
- The provider serializes requests; attempts to overlap or change settings during inference are rejected rather than queued indefinitely.

The legacy narration environment-variable route remains available for existing local setups, but its default is now local-only, requires an explicit model ID, and uses `LOCAL_AI_TOKEN` rather than an inherited cloud key. The new settings UI applies to the new chat path, not an automatic reconfiguration of old external connection helpers.

## Memory and truth

Campaign preferences (up to 2,000 characters) are stored separately from mechanics. Recent chat is bounded to 40 entries of up to 1,600 characters; this is not an unlimited transcript archive. Current world state, discoveries, equipment and progression remain the authoritative persistent record. The ferry scene retains its own bounded confirmed facts.

Prompts contain the current public state and available approaches, not internal hidden flags. Optional old conversation/history entries can be omitted whole to fit a profile; preferences and required current facts are not silently sliced. An over-budget required context produces a clear error. AI dialogue is explicitly labelled unverified conversation and cannot grant items, alter rolls or create canonical flags. Generated prose may still contain mistakes; the confirmed result and mechanics feed remain authoritative.

This initialization does **not** implement arbitrary new NPCs, quests, locations or rules from text. The next content expansion should add validated story primitives, not remove the validation boundary or pretend a finite option selector is a complete world simulator.

## Failure handling and recovery boundaries

There is at most one planner call per unfamiliar chat message. A valid action proposal causes no mechanical effect until confirmation. A confirmed result is committed in the returned game state before optional prose is requested; a failed narration request returns the original canonical result, never a second roll.

Within a single running local server, duplicate request IDs with identical payloads reuse a bounded result cache (64 entries, 20 minutes). Different content under the same ID is rejected. This cache is not durable across server restarts and is not multiplayer authority or anti-cheat. Keep saved/exported backups; do not claim exactly-once delivery across arbitrary crashes or manually replayed edited client states.

The Cancel button aborts the client connection to the local model service. Whether a particular backend immediately stops its GPU work is backend-dependent; do not start repeated tests behind a generation that is still visibly running. No automatic retry occurs.

## Validation and limits

See `VALIDATION-4.1.0-alpha.2.md` for new measured counts and limitations;
`INITIALIZATION-REPORT.md` is the preceding alpha.1 report, retained unchanged. The automated model cases use local HTTP fixtures or injected fake responses, never the user's Qwen/Gemma weights. Browser tests are prepared for GitHub, but this environment blocked actual file navigation; only the disclosed memory-backed interface harness ran locally.

Authoritative implementation references:
- https://lmstudio.ai/docs/developer/openai-compat/chat-completions
- https://lmstudio.ai/docs/developer/openai-compat/structured-output
- https://playwright.dev/python/docs/ci
- https://playwright.dev/python/docs/api/class-browsertype
