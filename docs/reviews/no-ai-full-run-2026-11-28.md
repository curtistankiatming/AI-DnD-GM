# Full no-AI run, level 1 to 71, 28 November 2026

Curtis asked for another full run with no AI, alongside a Claude run.

## Setup

- Hero: Wren, a **Ranger** on **Gritty** (the recent full runs were Bard, Fighter, Rogue and Wizard; the game has six classes).
- No AI at all. Played through the game's HTTP API (`/api/session/new`, `/api/action`) with `BRIARWATCH_PREVIEW_BOOKS=1`, so all four books were on (Books Three and Four stay hidden for players).
- Nessa declined both times ("Tell her the party is full", and the whisper path not taken), so the party was three until the first tavern night.
- Written story choices outside the chapter phases were picked at random (seeded), so the run took different turns from earlier runs.
- Tavern: went in at every night that opened, and hired one of the people offered at random.

## Two runs

The first run used the test policy as it is. It reached 71, but it never bought or wore any gear after level 5: Book Four on Gritty was fought in a Fine Dueling Blade and Fine Leather Armour, and every quest reward sat unworn in the pack. So I added gear to the driver (wear anything owned that is better for any of the four, buy a shop piece when it clearly helps and gold allows) and played again from a new hero. The second run is the real one; the first is kept for comparison.

| Run | Actions | Fights | Defeats | Hired at the level 10 night | Gold at 71 |
|---|---|---|---|---|---|
| 1, no gear after level 5 | 2,414 | 104 | 12, all recovered (9 Book Four chapters; the Gatehouse 3 times) | Jessa Flint, archer, 250 gold | |
| 2, with gear | 3,739 (about 1,300 are the driver swapping charms) | 93 | 1, recovered (the Parting Bell) | Rosamund Pyle, healer, 200 gold | 21,076 |

Both runs: all four books finished, Beastwarden at 10, 3rd and 4th job trials passed, level 71. No engine errors, no rejected actions, no `undefined`, `NaN`, braces, Markdown or double spaces in any line shown.

Covered: Book One with three people, both Nessa refusals and every later line that checks for her, the tavern night after the level 10 trial (2 people offered each time; the night did not open again because the party was full, as designed), the hire's lines in every chapter after it, side jobs (25), bounties (17), rumours, tools, shop gear, smith upgrades, both job trials.

## Bugs found and fixed

| What the player saw | Fix |
|---|---|
| Book Four, the Signal (level 66), with Nessa never in the party: "You receive Signal-fire Longbow (Legendary). Nessa only." Nobody in the company can ever use it (seen in both runs). | A companion keepsake whose companion is not with the company (not in the party, not away on the roads) is not given. The hero is paid what it would sell for (294 gold), with the line "Signal-fire Longbow was kept for Nessa, who is not with your company. You take its worth instead: 294 gold." The money is the same as selling it, so declining Nessa costs no less than before. With Nessa in the party, or away and coming back, the bow is given as before. |
| Book Three, Wren's Bell, without Nessa, after choosing to let the committee cast her: the chapter ends "She gives her stick to Hew... and walks to the mould without it" and "In the morning there are ten bells", then the camp said "That night Wren comes down to the forge wall... slowly, on her stick" with a letter for Reed. | In that one case the line now reads "The night before she went to the mould, Wren came down to the forge wall where you were sitting, slowly, on her stick...". Refusing or waiting keep "That night". |

Tests: one in `tests/book-four-part-three-companions.test.js`, one in `tests/book-three-part-two.test.js`. Both fail on the old code. Full suite: 1,317 pass, 0 fail, 1 skipped.

## Seen but not changed

- **Gear matters a lot on Gritty.** Without gear after level 5 the run lost 12 times in Book Four; with gear, once. The game is fine; the old test policy just never shopped. A player who skips the gear screen will find Book Four on Gritty hard.
- **Gold piles up.** 21,000 gold at level 71 after buying gear for all four. The tavern fee (200 to 250 at level 10) is the last time money felt short.
- **Only one tavern night.** Once the hire filled the empty place, no later night opened (by design: nights only open with a place free).
- **"The tavern."** is shown as its own line after "Tavern night: The Night of the Oath". Harmless, a little bare.
- Wren's letter "For Reed, when you see her" (run 1) did not come up again before level 71. It may be meant to stay undelivered without Nessa.
