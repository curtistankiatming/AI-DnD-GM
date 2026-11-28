# Second full Claude run, 20 prompts every 10 levels (28 November 2026)

Curtis asked for another full Claude run with up to 20 AI prompts every 10 levels,
and a no-AI run. The last full run was a Bard, so this one is a Cleric. Bugs were
reproduced live before fixing and checked live after, with an independent review.
Nothing is merged without Curtis's OK.

## What was played

| | |
| --- | --- |
| Hero | Sister Ashe, Cleric (acolyte), Standard |
| Build | master at 943010f (after #124 and #125), with Books Three and Four switched on for the test only (`BRIARWATCH_PREVIEW_BOOKS=1`) |
| How | game actions through the HTTP API, played by `tests/player-policy.js`, with AI prompts sent through `/api/chat` like the browser does (a confirmed roll for each typed action) |
| AI | Claude, claude-opus-5-5 at low effort, narration off |
| No-AI run | same hero and driver, AI off: level 71, 2,526 actions, 0 errors, 1 defeat (the first fight, level 1, recovered) |
| AI run | level 71, 2,615 actions, 0 errors, 1 defeat (level 70, recovered) |
| AI prompts | 143: 20 in every band from 0s to 60s, 3 at level 70 to 71 |
| Kinds | 46 questions, 46 lines to a companion, 51 typed actions (each then rolled), 4 side-quest requests, 2 AI job trials |
| Reached | all four books; Lifewarden, Mender of Hosts at 40, Living Saint at 70 |
| Party | Orin, Maren and Nessa (Nessa joined through the story, so tavern hiring was not tested) |

**Cost:** 183 Claude calls for the run, about **$9.60**, plus about **$0.16** for a
short driver check and **$5.80** for reproducing and checking the fixes (75 calls;
answers at level 71 carry a long journal). About **$15.50** in all, so about
**$52.30** of the $60 budget is spent.

The run was not stopped or resumed. The driver used here is not in the repository
(it is a small script beside the policy, as before).

## Results

- No game errors, no failed AI calls, no refused answers. One request was turned
  away correctly: a side quest asked for at level 33 while Fever at Wickham Ford
  (written at 15) was still on the board. The driver always takes the next book
  chapter first, so that side quest waited until after level 40.
- All 3 AI side quests were written and played: The Bear in the Lantern Shrine (8),
  Fever at Wickham Ford (15), The Hush Under St. Odda's (55). Both AI job trials were
  written and played: The Mender of Hosts (40) and The Living Saint's Vigil (70).
- Choices carry forward. The level 40 trial opens with Dera: "You gave the first
  night you were here. I remember it, if you don't." From Book Three on, Orin and
  Nessa know they gave up a memory in the deep and say so ("I gave it up in the deep.
  I know I did"). A failed claim to be king at Briarwatch (15%) had the town telling
  the story; the same claim at Orme had the Hall's readers calling her "Your Majesty"
  for days.
- Wishes are handled well. "I want to find a chest with ten thousand gold" got a
  plain no twice, with real places to look instead. A failed lock-pick
  at Saltwick had Mags's lamplighters watching from the roofs, and the next answer
  remembered it.
- The writing is strong throughout: Nessa's reasons for the unsent letters, Maren's
  worst jobs, Orin's forty names. Questions answer from the journal and say when
  something is not known.

## Fixed: companions repeated the same habit in nearly every reply

The last fix stopped Maren asking the question back and Orin finishing a knot. With
46 more companion lines, other habits turned into tics.

- **Orin offered to carry something** in 14 of 16 answers ("I'll carry the herbs",
  "Give me the shields", "That's heavy. Give it here") and said "I'll take the door"
  in 7.
- **Nessa mentioned Biscuit** in 14 of 15 answers and her unsent letters in 10.
- **The narration said how fast they answered**, because the last fix tells them to
  answer in the first line: "Maren answers at once" (5 times), "Nessa answers before
  you've quite finished asking" (3).

Their descriptions said Orin "then offers to carry something" and "always takes the
door", which Claude read as every reply.

**Reproduced:** 20 lines asked live at level 71 (8 to Orin, 8 to Nessa, 4 to Maren),
each from the same save: Orin offered to carry something in 6 of 8 and fiddled with
his pack strap in 5; Nessa scratched Biscuit's ears in 6 of 8 and named him in 8;
"answers at once" or "before you finish" in 5 of 20.

**Fix:** Orin's and Nessa's descriptions now say these habits come "now and then,
not in most replies" (as Maren's already did), and that Biscuit is a he (one answer
in the run called him she). The shared companion voice rule now also says not to say
how quickly they answer, and not to give a companion the same gesture or prop reply
after reply.

**Checked:** the same 20 lines after the fix: Orin offered to carry 0 of 8 times,
pack strap 0, the door 0; Nessa named Biscuit in 3 of 8 (scratching his ears once)
and the letters in 0; no "answers at once" anywhere. Their voices still show: Orin
answers "Yes." and "Sleep. First two days, sleep."; Nessa still interrupts herself.

## Fixed: a successful haggle paid free gold

Haggling for a healing potion succeeded twice in the run, and both times paid gold
with nothing bought: "You leave the counter 37 gold richer than you came in, with the
discounted potion still waiting on his shelf", and "Your purse sits heavier by 106
gold". An improvised action cannot buy anything, so Claude picked the coin reward
for the saving and the engine paid it as found money. At 70% odds a player could
haggle for gold over and over.

**Reproduced:** three haggles asked twice each at level 71 (a potion, a shield, a
night's room): 6 of 6 proposed the coin reward (71d4 gold).

**Fix:** the chat prompt now says coin is only for money that comes to the hero
(found, paid, won or earned); an improvised action cannot buy or sell, so a haggle or
bargain never gets coin, and success says how the seller warms to the hero instead.

**Checked:** the same 6 haggles after the fix: 4 proposed a recorded discovery and 2
nothing beyond the story; none paid gold.

Tests: `tests/claude-full-run-2.test.js`. `npm run check`, `npm test` (1,318 pass,
1 skipped), `npm run playtest` and `npm run fuzz` pass.

**Independent review:** no blocking issues; old saves pick up the new descriptions on load, and players never see them (only the AI does). Two wording suggestions were taken: the haggle rule is now its own sentence after the reward list, and the story bible no longer says Orin offers to carry something every time. It also noted that the tests check the prompt text, not Claude's behaviour; the live checks above are the behaviour check.

## Not fixed (notes)

- Answers still give raw HP ("Orin is at 135 of 180") when asked how the party is
  doing. Noted in earlier runs. Once Orin said it in speech: "Fifty-odd hit points
  on a cleric's body doesn't walk far in that cold".
- One improvised result ended "Your party's trade reputation holds steady at 14."
- One answer (level 28, gold) used a Markdown list ("- Healing").
- Nessa's past drifts between answers: once she learned from a herbwife at a
  waystation and writes to her, elsewhere it is always Wren.
- Maren's bad stew still comes up in 2 of 4 answers after the fix; it is listed in
  her description and reads as a running joke rather than a tic, so it was left.
