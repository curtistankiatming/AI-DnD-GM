# Choices that matter, follow-up: Hollin's Reach, camp choices, Maren and Orin (22 November 2026)

Curtis, 22 November 2026, on the list in `claude-choices-2026-11-22.md`: "Fix
those and yes choices should matter." Tested source: the follow-up branch on
top of PR #89. Node 22, offline, no AI calls.

## Hollin's Reach (Book Two, chapter 7)

The decision ("Tell Elske what you saw" / "Say nothing") is now remembered at
the Second Oath:

- Elske's charge has a line for each answer: "you came back from Hollin's Reach
  and told me the bell there had stopped" or "you never said a word about it to
  me. You let it be mine."
- Persuading her to let the council carry the Mother Bell is 2 easier if you
  told her (`easierWith: hollin_told`). The success text starts from what she
  already knows from you, or has the hero tell her for the first time.

## Camp choices that used to change nothing

| Scene | Choice remembered | Where it comes back |
| --- | --- | --- |
| southroad-camp (Orin and Hal by the fire) | `b2:orin_hal` said / left | the Mother Bell, when Hal holds the door: "She came on time", or they have nothing left to say |
| keeper-cards (cards with Maren and Anwen) | `b2:cards` called / lost | Book Two epilogue: Anwen's monthly letters ("we have stopped cheating") or a button for you in each |
| vault-camp (what you will remember of Vell) | `b3_vault_word` register / corvane / quiet | Book Three epilogue, the line before the trial |
| price-camp (Bett's basket) | `b3_bett` take / pay / stay | Book Three epilogue: a monthly basket from Merrowgate, with Bett's note if you asked her to stay, none if you tried to pay |
| ashford-camp (Hollis Brede's name) | `b3_brede_written` | Book Three epilogue: the council's record spells it her way, in your hand |
| winter-camp (the quarter bell with Pim) | `b3_pim_rang` | Book Three epilogue: Pim rings a breath late once a day, for you |

Left as they are, on purpose: **seal-sable** (stay on the wall in the snow or go
in) and **order-mags** (walk the lamp round or leave Orin and Mags to it, which
both lead to the same knots scene). Both are mood beats, and remembering them
would mean inventing a reason to mention them.

## Maren's and Orin's endings reach the AI

`src/data/standing.json` now also covers:

- **Orin:** where Hal's company went after the south road, who held the door at
  the Mother Bell, the Saltwick hearing at Vell (tried with Varn, Varn alone, or
  neither) and Mags Peller's answer, and the night he gave up in the deep.
- **Maren:** her list after Book Two (let go, or one empty space with Elske
  below it), and after Book Three (the seal, the day she gave up, or no list).
- **Nessa:** the memory of Wren she gave up in the deep.
- **Hero:** whether they told Elske about Hollin's Reach.

Book Two facts about Maren's list are withdrawn once Book Three is done, so the
AI is never told both.

## Still open

The fourteen camp scenes that change approval only are unchanged: approval does
matter (walkouts, bond-gated lines, Nessa's answer), and adding a callback to
each was out of proportion for this pass.

## Tests

`tests/choices-carry-forward.test.js` (four new tests), the full suite, the
scripted playtest and fuzz; see the PR for counts.
