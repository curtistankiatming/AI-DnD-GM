# Full OpenAI run with no prompt limit, 2026-11-27

Curtis asked for a full AI run on OpenAI with no limit on AI prompts.

## Setup

- Model `gpt-6.2-sol`, low effort (medium for writing adventures), over the game's HTTP API, with `BRIARWATCH_PREVIEW_BOOKS=1` (Books Three and Four on for the test only; they stay hidden in the game).
- Hero: Brannoc, a **Fighter** on **Gritty** (earlier OpenAI runs were Cleric, Bard, Ranger, Rogue and Wizard on Standard). Nessa taken.
- AI narration on for every story turn (off during fights).
- AI prompts all the way through: in every second new story scene, one typed question, line to a companion, improvised action (then rolled) or a written choice typed in the player's own words (then confirmed). A question in one fight in five. A new AI adventure asked for in town at every level once the bell was done, and played straight away. The level 40 job trial was the AI-written one.
- Levels 1 to 5 asked for an adventure on almost every town visit (20 adventures in Book One); from level 5 on, one per level.

## Result

| Levels | Actions | AI prompts | AI calls | AI adventures | Defeats | Cost |
|---|---|---|---|---|---|---|
| 1 to 71 | about 3,500 | 597 | 1,607 | 79 | 6, all recovered | about $29.20 |

A no-AI dry run of the same hero on Gritty reached 71 with no defeats. A short re-check from the level 71 save after the fixes (AI 4th job trial and three more adventures) cost about $4.70, most of it on a driver fault that asked a question on every turn of one long fight. **Whole test: about $34.**

Every call answered except one network drop (shown as an error, nothing applied).

## Bugs found and fixed

| What the player saw | Fix |
|---|---|
| After confirming a typed choice, the AI's reply showed Markdown: "Nessa Reed joins your party. You gain **14 XP**." and "**Act III — Beneath the Briars: The Hollow Court**" (seen 3 times). | The reply after a confirmed action is now cleaned like every other AI reply. |
| The "Protect the party while you..." choice lowercased the whole goal, so names lost their capitals: "get sella through the gap" (AI adventure), and in the written Book Three "hold the planks while saltwick crosses to the vell road" and "get through his guard to commander hesk". | Only the first word is lowered now. Every written chapter checked. |
| AI adventures called the hero "he": "after what he did for the Fenmere skiffs, she's glad it's him", and the story arc it carries forward said "Brannoc's road oath has brought him to Merrowgate" and "the council still holding his oath" (about 15 of 79 adventures). | The story director is now told the hero has no chosen pronouns, as the game master already was. Re-check: 3 new adventures, none gendered. |

Tests: `tests/openai-full-run.test.js` (each one fails on the old code). Full suite: 1,314 pass, 0 fail.

## Seen but not changed

- **Gritty AI adventures late on.** All 6 defeats were in AI adventures at levels 56 to 67 (6 of the 12 played there). The written Book Four fights caused none. Worth a look on Gritty only: the earlier Claude run on Standard also lost mostly in AI adventures.
- **People come back a lot.** Washkeeper Bess Alder gave 5 adventures, Sive Linn 4, a "Sella" (three different surnames) 5. The director is told to bring people back, so this is partly by design, but first names repeat across different people.
- **Same beasts.** A sow or boar charged in three early adventures.
- Improvised checks at 99 to 100% still ask for a roll (already noted).
- Replies are otherwise clean: no raw JSON, no Claude-only wording, no broken character. When the player typed something that did not fit ("I mark the path with chalk"), the AI asked a sensible question back instead of inventing items.
