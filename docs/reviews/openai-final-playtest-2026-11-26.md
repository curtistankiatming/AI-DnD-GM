# Final OpenAI playtest, 2026-11-26 (night)

The last AI run of the day, on main after PRs #118, #119 and #120, with Curtis's OpenAI key.

## Setup

- Model `gpt-6.2-sol`, low effort (medium for writing adventures). Server with `NODE_USE_ENV_PROXY=1`, a temporary `SAVE_DIR` and `BRIARWATCH_PREVIEW_BOOKS=1` (Books Three and Four on for the test only).
- Hero: Ilse, a **Wizard** (earlier runs were Cleric, Bard, Ranger and Rogue), Standard difficulty, over the game's HTTP API.
- Choices varied from earlier runs: Nessa joins in Book One (earlier runs declined her), the party follows the whisper in the forest, uses the cult seal at the root-gate and names the spirit in the bell vault; elsewhere about one written choice in three was picked at random.
- Rule: level 1 to 71, at most 3 AI prompts per 10 levels, narration off. A prompt is one typed action, question, in-character line, "write me an adventure" or AI job trial. Rolling an offered check is part of the same prompt.

## Runs

| Run | Levels | Actions | AI prompts | Defeats | Cost |
|---|---|---|---|---|---|
| 1 | 1 to 71 | 1,819 | 15 (the driver left AI side quests unplayed until after the books, so bands 20s, 30s and 60s got fewer) | 1, recovered (level 70 trial) | about $0.31 |
| 2 | 1 to 71 | 1,838 | 22 (3 in every band; 1 at 70 to 71) | 0 | about $0.49 |

Total: 50 OpenAI calls, about 289k input and 22k output tokens, about **$0.80**.

## Tonight's earlier OpenAI fixes (PR #120): all hold

1. Typing a listed check ("I look really closely at that rope") shows a readable preview, no JSON.
2. No double full stop in any preview.
3. No Markdown in any reply.
4. Replies after a roll open on the new outcome.
5. No AI adventure brought back Warden Sable.
6. Wording: one more Claude-only line found (below).
7. Variety: run 2's five side quests used five different foe kinds (wild, storm, soldier, construct, undead), each with a new quest-giver.
8. Story questions ("What happened to the people we saved?", "What did we promise, and to whom?") were answered by the AI from the journal.

## Bug found and fixed

| What the player saw | Fix |
|---|---|
| With OpenAI as the game master, the end of the written books said "Ask the game master for a new adventure on the expedition board (this needs the Claude AI game master)." | Now "(this needs the AI game master to be on)". The reviewer also found the offline edition saying "connect the Claude API or a local model"; it now names OpenAI too. The hosted-only upgrade line still names Claude, since the hosted game uses only Claude. |

## Seen but not changed

- In run 1 the same AI-made examiner, Sella Tarn, ran the level 40 trial, gave the level 50 side quest and ran the level 70 trial. The director is told to bring people back, and trials are left out of its "don't repeat the quest-giver" list. Run 2 did not repeat this. Worth watching, not a clear bug.
- Late improvised checks still show "About 99%" and ask for a roll (already noted).
- OpenAI leans on a few images: "rain on the copper awning" opened two replies 30 levels apart.
