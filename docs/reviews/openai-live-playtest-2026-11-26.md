# Live OpenAI playtest, 2026-11-26

The first live run of the OpenAI game master (PR #117), with Curtis's own key, in the cloud.

## Setup

- Model: `gpt-6.2-sol` (the default). It is on the key's `/v1/models` list and answered every call: connection test, ask, act, say, narration, improvised checks and side quest writing.
- Reasoning effort: low (medium for writing adventures, as the provider sets it).
- Server: `NODE_USE_ENV_PROXY=1`, a temporary `SAVE_DIR`, and `BRIARWATCH_PREVIEW_BOOKS=1` for the long run (Books Three and Four are needed to get past level 20 without an AI adventure every level).
- Cost: 64 logged calls, about 245k input and 22k output tokens. At $2 / $10 per million tokens, the whole test cost about $0.80, including a few direct re-checks of prompts.

## What was played

1. **Browser spot run** (laptop, Rogue, Book One opening, AI narration on). I set OpenAI up in Settings, then AI settings, listed the models and saved. Then I asked about the rope, climbed the tower as an improvised check, spoke to Orin in character, hummed to Tovin, whistled into the mist, and played the written choices through to the root-gate.
2. **Full run, level 1 to 71** (Ranger, Standard, over the game's HTTP API, AI narration off). This followed Curtis's rule of at most 3 AI prompts per 10 levels. In each band: one improvised action (rolled when offered), one question, and one "Write me a side quest". The hero played every AI side quest, plus the AI-written level 40 and 70 job trials. It took 1,059 actions with no failed action.

## How OpenAI did

The writing is good and in voice. Companions sound like themselves ("Ruts are fresh. Somebody brought a cart up here who didn't want to be followed."). Improvised successes give a concrete advantage, and late-game answers pull in the right threads (Orin and Saltwick, Maren and the Commandery). A typical turn takes 3 to 7 seconds. Writing a side quest takes 35 to 65 seconds.

## Bugs found and fixed (each has a test that failed before the fix)

| # | What the player saw | Fix |
|---|---|---|
| 1 | Typing an action that matched a listed check showed raw JSON: `{"actor":"Tamsin","skill":"Persuasion",...}` | Readable preview: the choice, its odds, who rolls and its description |
| 2 | "...listen for a response.. About 80%" | No double full stop |
| 3 | Narration showed `**The Hushed Verse**` and `(**+1 bond**)` | Narration and replies are plain prose. The narrator is told no Markdown and to leave numbers to the game. |
| 4 | Narration retold the previous scene before the new answer | The narrator now opens on the latest outcome |
| 5 | The first AI side quest had Warden Sable, the Book One villain sent away in chains, as the quest-giver | The director now gets how Book One ended, as canon |
| 6 | "Claude writes a small side quest" and a "Turn on Claude" button while OpenAI was the game master | Wording now says "the AI game master" |
| 7 | All six side quests were animated-object foes, most for the same quest-giver | The director gets its last adventures and a suggested enemy theme they did not use. Re-checked live: 2 of 2 came back as "wild" foes, with new quest-givers. |
| 8 | "What happened to the people we saved?" got a scene list, and "What did we promise?" got "No confirmed record", without the AI being asked | With a cloud AI on, story questions go to the AI, which reads the same journal records. Asking for the journal, a recap or your notes still reads them directly. Nothing changes without a cloud AI. |

## Seen but not changed

- Late-game improvised checks show "About 99%" or "100% to succeed" and still ask for a roll.
- The model list in AI settings includes `-healthcare`, `-pro`, codex and `gpt-live` models. It is harmless, but long.
- The game master step on the new-hero page offers only Claude or the listed choices. OpenAI is set up under Settings.
