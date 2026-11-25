# Live Claude GM playtest · 25 November 2026

**Dialogue and improvised actions worked. Adventure generation was blocked.** Elin
and Rowan both finished Book Four offline. Anthropic rejected adventure requests
during the books and after them, so neither run could finish a Claude-authored
adventure. The bundled sample let me verify the engine and browser behavior
from an accepted draft through the final choice, Journal, and offline reload.

## Revisions, setup, and live request count

- **Full live playtest** on `6844cb7a9d86d14631d5fe15d10989aff0a898a7`,
  the tip of `master` when play began. It covered requests 1–11 and the
  browser runs below.
- **Latest-master recheck** on `2a83a9ac9cc8026d53fcfa0e156ce47ea5f1cc08`.
  PR #110 landed during the test and added `GAME_ANTHROPIC_API_KEY` as a
  fallback. The adventure schema, request options, and gameplay code are
  identical across the two commits. On the new tip I reran the game's AI
  settings connection check (request 12), reloaded both completion saves and
  both sample saves in a fresh offline server, and ran 33 targeted Claude,
  director, and chronicle tests with mocked requests. All 33 passed.
- **Runtime** Node 24.22.3, Chromium via Playwright, local Node edition with
  `HOSTED=0`, `NODE_USE_ENV_PROXY=1`, and `BRIARWATCH_PREVIEW_BOOKS=1`
  for all four written books. I used temporary `SAVE_DIR`, `AI_CONFIG_PATH`,
  and browser profiles. The thread reported `ANTHROPIC_API_KEY` ready for
  `api.anthropic.com`; the settings endpoint recognized it. The latest-tip
  check used the primary binding alone. No credential values were captured.
- **Method** I used the repo's seeded, public-view player policy for the
  routine written campaigns. It starts fresh characters and drives normal
  engine actions. I used the local game's settings test endpoint, visible
  browser chat and expedition controls, and normal action, save, and load
  paths for the live and sample legs. Both campaign saves came from normal
  game actions. An isolated copy was used for the XP cap boundary. On the
  latest tip the offline replays reached the same post-bell board and
  completed Book Four at the same game turns for both heroes, using Elin's
  saved post-chat state for her second leg.
- **Model and accounting** `claude-haiku-5-5` was the main model, the fastest
  supported option in the game. Sonnet and Opus were model-only retries
  through the same browser control. The temporary counter recorded destination
  path and status only. **12 outbound requests total, no SDK retries.**

| Requests | Game operation | Model and result |
| --- | --- | --- |
| 1 | AI settings test | Haiku 5.5, HTTP 200, 538 ms |
| 2–3 | Elin asks Maren about the verse and proposes a twine experiment | Haiku 5.5, both HTTP 200 |
| 4, 5, 7 | Elin asks for a side adventure, three attempts | Haiku, Sonnet, Opus 5.5, all upstream HTTP 400 |
| 6, 8, 9 | Rowan asks for a first post-book adventure, three attempts | Haiku, Sonnet, Opus 5.5, all upstream HTTP 400 |
| 10 | Rowan asks Nessa about Rue using the genuine completion save | Haiku 5.5, HTTP 200 |
| 11 | Rowan asks for the next adventure after completing the sample | Haiku 5.5, upstream HTTP 400 |
| 12 | Latest-master AI settings test with the primary binding alone | Haiku 5.5, HTTP 200, 587 ms |

## Blocker · The director request is rejected in both modes

- **Where** The Briarwatch expedition board during *The Toll of Empty
  Wagons*, and the board after *The Parting Bell* on Rowan's completed Book
  Four save. I used **Write me a side quest** and **Write me a new adventure**.
- **What** The game returned HTTP 422 with Anthropic's HTTP 400
  `invalid_request_error`. The provider message was “The compiled grammar
  is too large, which would cause performance issues. Simplify your tool
  schemas or reduce the number of strict tools.” Changing the model did
  not help. The board received no new adventure on any failed request. The
  game displayed the provider error as a warning.
- **Why it matters** The settings check, dialogue, and improvised proposal can
  all succeed while the first side adventure and the post-book story are
  still unavailable.
- **Suggestion** Reduce or split the strict director schema, keeping the
  engine's validation and reward calculations. Then rerun both board requests
  and a follow-up from a completed generated adventure against the live
  provider. The 33 passing mocked tests do not exercise Anthropic's grammar
  compiler.

## Run 1 · Elin, Standard cleric

Fresh Elin reached the post-bell Briarwatch board at level 2 in 35 offline
actions (seed 301). The active chapter was *The Toll of Empty Wagons*. I
continued the genuine save after the live chat with seed 479 for the remaining
written chapters. Elin finished *The Parting Bell* at level 70, at game turn
2,463, with all 30 Book Four chapters complete. The side sample stayed on a
separate copy.

- **Live dialogue.** Haiku's Maren called the discovered Hushed Verse “a verse
  built like a trap: it sounds like comfort until you try to set the grief
  down.” The next line recalled Tovin saying the verse without knowing why.
  In the authored conversation Elin had already played, Tovin said,
  “I said it too. I don't know why I said it.” Maren suggested looking
  for the people who taught it, which added a possible line of inquiry.
- **Live proposal, engine roll.** I asked to copy the toll by having Orin
  strike twine stretched between pegs. The browser showed Investigation
  −1, DC 13, 35% success, both outcomes, a recorded discovery on success,
  and a possible setback on failure. Turn, XP, gold, chapter, and scene
  were unchanged before confirmation. I disabled AI, clicked **Roll the
  dice**, and the engine rolled 15 − 1 = 14. The “pair of short pulls
  followed by a long fall” came from Claude's proposed outcome and was
  applied by the engine. There was no second narration request.
- **Side quest sample.** I loaded the repo's *The Salt Choir* draft on a
  copy using the engine's ordinary commission action. It was classified
  as a level 2 side quest. I investigated, took the careful route,
  failed the peaceful check, won via the battle objective, and chose
  “Name the guild that caused the flood.” The browser run took 14 actions,
  eight of them in combat. The engine gave 180 total XP including combat
  and 30 gold. Elin stayed at level 2 and returned to Briarwatch, where
  *The Toll of Empty Wagons* was still listed. The sample's saltworks
  story is unrelated to the wagons and supplies no evidence of live
  chapter fit.
- **XP limit.** On another controlled copy, I set up Elin at 1,098 XP and
  finished the same sample using fixed high rolls. The engine granted
  only one XP, capped both the battle and quest awards, and left her
  at level 2 with 1,099 XP. The chapter remained the same. This checked
  engine enforcement with the sample.

## Run 2 · Rowan, Story ranger

There was no prior Book Four completion save in the workspace. I created
Rowan fresh and played the four written books offline (seed 301), with the
public-view policy driving ordinary actions. The resulting save records the
full campaign. Rowan finished all 30 Book Four chapters
and *The Parting Bell* at level 70, game turn 1,815. His earlier Beastbond
Trial used the written fallback and already had a Journal entry.

- **Live continuity in conversation.** The saved relationship says Nessa
  went down and stood beside Rue among the ringers. I asked what Nessa
  owed Rue after the Parting Bell without supplying that answer. Haiku
  replied, “I went down the stairs and I stood there, and I'd do it again,
  and I still don't know if it was enough.” The callback matches Rowan's
  choice. The unsent letter and Biscuit line gave the reply Nessa's voice.
  This verified dialogue continuity on the genuine save. The three
  director requests produced no adventure with which to check the same
  continuity.
- **Final choice and reload sample.** On a separate copy I commissioned the
  bundled *Salt Choir* as a full adventure. I played through the careful
  route, failed the talking check, won via the combat objective, publicly
  named the guild, and returned to Ashford Crossing. The run took 18
  actions, 12 in combat. The Journal added “You chose: Name the guild
  that caused the flood” and marked part 1 of 4 of the untitled arc. It
  persisted on browser reload and loaded in a fresh server with AI
  disabled and the credentials absent. This was scripted sample prose
  and deterministic rules output.
- **Next adventure.** I re-enabled Haiku on that completed sample copy
  and asked for a person, promise, or loose end to carry forward. The
  request hit the same grammar error. The bundled draft has no structured
  cast or open threads; it supplied a real recorded choice and aftermath,
  but could not show whether Claude would pick up a returning person or
  thread. No live sequel, generated final choice, or live-authored save
  round trip could be assessed.

## Ratings and what to keep

Scores are impressions from the live dialogue, the sample play, and the
recorded offline campaigns. They exclude any rating of failed generation.
For difficulty and grind, higher means harder or more repetitive.

| Run | Story quality | Difficulty | Grind | Fun |
| --- | --- | --- | --- | --- |
| Elin, Standard cleric | **4/5**. Maren sounded like herself and used the clue in context. | **3/5**. The improvised check was risky and the side sample's failed peace check mattered. The full offline route logged 38 setbacks. | **3/5**. The policy took 17 bounties in the later route. The side sample added one compact detour. | **3/5**. The experiment had real stakes and a useful result; the board error stopped the live detour. |
| Rowan, Story ranger | **4/5**. Nessa's answer recalled exactly how she supported Rue. | **2/5**. No setbacks in the written route. In the sample the peace check still had only a 40% chance and combat supplied a way through. | **3/5**. The policy took 17 bounties and substantially fewer combat actions than Elin. The count reflects the policy's route. | **3/5**. The party's choices carried into dialogue and the objective was satisfying. The board error halted the live story. |

1. Keep the pre-roll card. It made the improvised request a choice with
   known odds, consequences, and an opportunity to cancel.
2. Keep the specific companion callbacks. Nessa standing beside Rue
   carried more weight than a broad recap of the finale.
3. Keep the engine-owned rewards, clear return to the chapter, and
   offline Journal. Those worked through play, save, and reload with the
   same sample draft.
