# Last Claude run of the night (26 November 2026)

Curtis asked for one more AI run on each key, level 1 to 71, at most 3 AI prompts
every 10 levels, with bugs validated before fixing, an independent review, and a
merge once validated. This is the Claude run.

## What was played

| | |
| --- | --- |
| Hero | Kestrel, Rogue (urchin), Standard |
| Path | **Nessa accepted** (earlier runs tonight declined her) |
| Build | master after #118, #119, #120, with Books Three and Four switched on for the test only (`BRIARWATCH_PREVIEW_BOOKS=1`) |
| How | 2,326 actions through the game's HTTP API, played by `tests/player-policy.js` |
| AI | Claude, claude-opus-5-5 at low effort, narration off |
| AI prompts | 24 in all, exactly 3 in every 10 levels (0s to 70s) |
| Reached | Level 71, all four books, Nightblade at 40 and Phantom at 70 |

In each 10 levels: a question in town, a typed action at a chapter start (then its
roll), and one of these: "Write me a side quest" (10s, 30s, 50s), the AI-written job
trial (40s, 70s), or a line to Nessa (0s, 20s, 60s).

**Cost:** 36 Claude calls (including the checks for the fix), about **$2.90**.
With earlier runs, about $22.40 of the $60 is spent.

## Results

- All 3 AI side quests were written and played: The Mules of Larkspur Shelf (10),
  The Signal on Tinder Ridge (31), The Hush-Candles of Lantry (51). Both AI job trials
  were written and played: The Nightblade's Vigil (40), The Phantom's Trial: The Man
  Nobody Sees (70).
- AI side quests now write their own approach scene (#119 works). Larkspur's: Nessa
  over a bear print "as wide as a shield": "Biscuit, don't you dare, that's not a
  dog, that's... stay."
- 6 defeats, all recovered: levels 34, 57, 60, 61 (twice) and 67. Book Four's middle
  is the hard stretch, as in the Cleric run. A no-AI dry run of the same hero had 1.
  This is dice, not a bug.

## Fixed (PR #121): long answers were thrown away

At level 30 the question "What should we be most careful about on the road
ahead…?" failed with "The model proposal has unsupported fields or values". The
game refused any AI reply over 1,600 characters. Answers grow with the journal.

- **Validated:** asking the same question 3 times at level 71 gave 1,374, 1,676
  and 1,175 characters. The 1,676 one was paid for and lost.
- **Fix:** a long reply is now cut at its last full sentence. Only a runaway reply
  over 8,000 characters is refused. The AI is also asked to keep answers under 220
  words.
- **Checked:** the same question 3 times live after the fix: all answered. Full
  suite passes. An independent reviewer found no bugs.

## What worked well

- **Nessa as a companion is a real character.** Asked "Do you regret it yet?" at
  level 3: "Regret it? You think I'd... no. Biscuit, tell them." The dog thumps his
  tail once. "See." At level 60 she starts to mention Wren, loses the memory, and
  shakes it off. That ties to the Book Three cost. The comedy comes from who she is.
- **Choices carry forward.** At level 40 the answer remembers that Kestrel gave up
  the memory of the first night in Briarwatch: "The people here remember it for
  you." The level 40 trial opens with Dera saying the same. At 60 it lists the Wold
  told to come south, and Rue's chalk on the door.
- **Typed actions read the scene.** "I pick the nearest lock" in Briarwatch got a
  question back: whose lock, among friends? In Lantry it got the empty house next to
  the woman on her step.

## Not fixed (notes)

- An improvised check at 100% still asks for a roll (level 60: Stealth +14 with
  advantage against 13). Already noted tonight.
- Town answers sometimes give raw HP ("Orin … at 34 of 228").
