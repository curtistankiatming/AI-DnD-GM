# Gameplay review, 21 November 2026 (Claude)

An independent review of how the game **plays**: fights, checks, levels and XP,
jobs, gold, side jobs, companions walking out, soft-locks, and the phone and
laptop screens. The story itself is reviewed separately.

## What I played and ran

- **Build:** `3f6a2cc` on `master` (after PR #51), Node.js v22.23.5, Linux.
- **By hand, terminal (`scripts/play.js`):** a fresh **Wizard**, seed 7, from the
  Briarwatch square through the bell vault and the Toll of Empty Wagons to level 3
  (about 30 actions, all choices mine, `auto` only to finish the Sable fight).
  Plus hand checks of a level 16 Cinder Fold fight (a `jump` **fixture**), a retreat
  and rescue at level 5, the Second Oath epilogue, and the bundled sample AI
  adventure after the books.
- **By hand, real browser (Playwright, Chromium):** iPhone 13 and a 1366×850
  laptop. New game, Book One choices, a level 14 fight, the 2nd job choice at 20,
  and the AI storyteller after the books with the Claude GM turned on against a
  **fake local Claude server** (no real AI, no key; the fake returns the bundled
  sample adventure).
- **Simulated (the scripted test player from `tests/player-policy.js`, seeded dice):**
  54 full campaigns, level 1 to 20 (6 classes × 3 play styles × 3 difficulties),
  instrumented to record every fight (rounds, lowest HP, knock-downs), every story
  check offered (DC and chance), the level at each chapter, gold, side jobs and
  walk-outs. Plus 12 Book Two runs that pick the last or a random story choice, to
  see walk-outs fire. Play styles: *prepared* (investigates, takes side jobs, uses
  the fight objective), *peace* (talks first), *direct* (fights everything by force).
  These are simulations, not natural play.
- `npm run check`, `npm test` (708 pass, 1 skipped), `npm run playtest` (108/108),
  `npm run fuzz` all green after the fixes below.

## The short version

The game is stable: no crashes, no soft-locks, every simulated run of every class,
style and difficulty reached level 20 and finished both books. Walk-outs fire and
resolve cleanly. The weak spots are balance and pacing, and three of them are
worth a decision from you:

1. **Fighting by force gets slow as you level up.** Fights won by force take about
   7 rounds at level 3 and **12 to 15 rounds** in the last Book Two chapters.
   Fights won through the objective take about 4 rounds at every level.
2. **Story checks get much harder after level 10.** The chance shown on story
   checks falls from about **65%** in levels 1 to 10 to about **35%** at levels 16 to 20,
   and for some classes the peaceful ending of a Book Two chapter is **0 to 5%**.
3. **Gold stops mattering in Book Two.** A typical hero ends Book Two with about
   **5,500 gold**; the best item any shop sells costs 130.

I fixed two small, clear bugs in a PR (story text in the wrong order, and the
difficulty picker missing from "Set out"). Everything else is described below
for you to decide.

## Findings, most important first

### 1. Fights won by force drag on in Book Two (major)

**What happens.** Every chapter's deciding fight can be won two ways: finish the
objective (for example "Hold the lid while the old names are read", 2 to 4
successful actions) or defeat every enemy. In the simulations on Standard:

| Chapter level | Rounds, objective route | Rounds, by force |
| ---: | ---: | ---: |
| 3 to 5 | 3.3 | 6.7 to 8.2 |
| 10 (The Chair Problem) | 4.2 | 9.7 |
| 12 to 14 | 3.2 to 4.7 | 11.0 to 11.5 |
| 15 to 19 | 3.2 to 4.8 | 12.3 to 15.0 |

On Gritty, a ranger fighting by force averaged 16 rounds a fight and lost 15 of
38. By hand at level 16 (fixture), a fighter hit a Mist-Taken Founder for 6 to 18 a
swing; the fight had 90 + 90 + 144 enemy HP.

**Why.** Enemy health grows every level (22 + 6 per power level for a boss, 10 + 4
for a retainer), but weapon damage only grows with the ability modifier. Book Two
adds no new weapons. Magic Missile is still 4d4+4 at level 14.

**Why it matters.** Fifteen rounds is 15 of your own turns plus 5 or 6 other
turns each round. A player who likes fighting is punished with a slog, and the
objective becomes the only sensible route.

**Suggestions (pick one):** let weapon and cantrip damage grow by tier (for example
an extra die at 11 and 17, as cantrips do in D&D); or grow enemy HP more slowly
than now from level 10 to 20; or let job skills carry more of the damage. Then
check rounds-to-win as well as win rate in `npm run balance`.

### 2. Story checks after level 10 are mostly coin flips or worse (major)

**What happens.** Story DCs rise with the chapter (about 12 at level 1 to about 21
at level 19), but only the skills the hero is trained in grow. The hero always
rolls; a companion who is good at it only gives advantage. Chance shown on the
checks offered, prepared play, Standard:

| Class | Levels 1 to 10 | Levels 11 to 15 | Levels 16 to 20 | Checks at 25% or lower, 16 to 20 |
| --- | ---: | ---: | ---: | ---: |
| Fighter | 66% | 50% | 35% | 6 of 16 |
| Rogue | 65% | 58% | 35% | 7 of 16 |
| Wizard | 63% | 52% | 35% | 6 of 16 |
| Cleric | 71% | 54% | 46% | 3 of 16 |
| Ranger | 62% | 45% | 29% | 11 of 16 |
| Bard | 68% | 59% | 44% | 2 of 16 |

Examples from a ranger: Mother Bell "investigate" History −1 against DC 20 (0%),
Mother Bell peaceful ending Persuasion +1 against DC 22 (0%), the Second Oath
peaceful ending 5%. An AI adventure at level 20 offered a fighter "Question the
saltworkers" at 10%.

**Why it matters.** The peaceful endings are some of the best writing in Book Two,
and most classes can't reach them. Low odds also make the "Failure still reveals
a useful lead" checks feel like a formality.

**Suggestions:** let the best-suited party member make the check (Maren for
Insight and Medicine, Nessa for Persuasion), with the hero still choosing; or stop
DCs at about 18; or give the hero half proficiency in untrained skills from level
10. The first fits the companion-heavy story best.

### 3. Gold piles up with nothing to buy (major for Book Three)

**What happens.** By level 15 the simulated fighter had 3,089 gold; nearly every run
ended Book Two with 4,600 to 5,600 (one Gritty ranger that kept losing had 512). The best item on sale anywhere is Field Plate
at 127 to 130 gold, and Merrowgate's shop sells the same Book One list. A rescue costs about 80 gold, and the civic rest is free.

**Why it matters.** Side jobs pay mostly gold, so their main reward is
meaningless, and losing a fight costs nothing that matters.

**Suggestions:** add Book Two gear (a second tier of weapons and armour, sold
from Merrowgate on), costly services (re-training a talent, hiring help for a
fight), or gold costs inside the story (Fenmere already does this well with the
loan). Book Three is the natural place to start.

### 4. Standard difficulty rarely puts the hero in danger (minor)

In the 12 prepared and peaceful runs on Standard (201 fights), the hero was never
knocked down, and the lowest party HP in a fight averaged around 60%.
Standard is described as "meaningful resource pressure". If you want Standard to
feel tense, enemies could hit a little harder; Story mode already covers players
who want it easy.

### 5. The road from level 20 to 100 is very long (decision, not a bug)

After the books, an AI adventure on Normal pays about 35% of a level (a quarter for
the adventure, a tenth for its battle). That is about 2.9 adventures per level.

| Goal | AI adventures on Normal | On Heroic |
| --- | ---: | ---: |
| 3rd job (level 40) | about 57 | about 29 |
| 4th job (level 70) | about 143 | about 71 |
| Level 100 | about 228 | about 114 |

Each adventure is one long Claude request plus narration. That is fine if the
goal is "infinite story", but it is worth knowing for API cost on your hosted
version. Book Three (20 to 30) will help the early part.

### 6. Phone screen: the message box takes a third of the screen (minor)

On an iPhone 13 the story and choices get a 367-pixel window (about 43% of the
screen). The Act/Say/Ask box, the "Turn on the AI game master" button and the
bottom tabs take the rest, even with the AI game master off, where typing only
replies "the game can only follow the listed choices". About 2.5 choice cards fit
at once. Screenshot: `phone-story-composer.png`.
**Suggestion:** with the AI off, fold the box down to one "Turn on the AI game
master" line.

### 7. Phone fights: choose an action at the bottom, then scroll up for the target (minor, known)

Tapping Magic Missile at the bottom of the action list highlights the enemy cards,
which are now off screen above it (`phone-combat-pick-target.png`). This is the
"phone combat board two screens tall" item left open after the UI redesign; it is
still there. **Suggestion:** after an action that needs a target, scroll the enemy
row into view or show the targets as a small sheet.

### 8. The 2nd job choice is only a dot on the Prepare tab (minor)

At level 20, during the Second Oath epilogue, the choice of 2nd job (the biggest
choice in the game) is marked only by a small dot on Prepare
(`phone-2nd-job-only-a-dot.png`). The terminal shows nothing. **Suggestion:** a
card on the story screen ("You can take your 2nd job") the first time it is
ready, as the level rewards already have.

### 9. Smaller things (minor and nits)

- **"Turn on Claude" opens Settings but does not tick the box.** You then tick
  "Turn on the AI game master", press Save, and press "Back to your message"
  (even when you had no message).
- **Game-rules sentences inside the story text:** "Town stock refreshed after new
  progress, not after opening a menu." and "Resolved checks cannot be rerolled
  and merchants do not replenish from travel." appear in the story paragraph on
  returning to town.
- **Casters show "Unarmed Strike, 1-1 bludgeoning"** as their first action because
  the wand is a focus. It reads like a bug; consider hiding it for casters or
  naming it "Staff strike".
- **One XP short at the end of Book Two.** The cap leaves every hero at
  79,399 of 79,400 XP. Harmless (the next reward tips it), but the screen invites
  "why one short?".
- **Companions are not healed by the epilogue.** Orin 112/148 and Maren 103/126 in
  town after the books end.
- **Early checks are very easy.** In Book One most checks show 80 to 91% because a
  companion's Help gives advantage. Combined with finding 2, the difficulty curve
  runs the wrong way: easy at first, hard at the end.

## What I checked that held up

- **No soft-locks or errors.** 54 instrumented campaigns, 12 contrarian Book Two
  runs, 108 `npm run playtest` runs and the fuzz test: none got stuck.
- **Walk-outs work.** Picking the last or a random story choice in Book Two made
  someone walk out in 10 of 12 runs (Maren, Nessa or Orin, depending on the
  run), each came back a chapter later, and every run still reached
  level 20. Picking sensibly never triggers one, which seems right.
- **XP pacing in the books is exact.** In all 54 runs (1,080 chapter departures),
  the hero set out on each chapter at exactly that chapter's level. Side jobs, peaceful or violent
  play never put a hero ahead or behind.
- **Retreat and rescue are fair.** Retreating costs some gold, keeps XP and gear,
  and "Resume the interrupted fight" restarts it cleanly after a free rest.
- **The AI handoff works end to end** with the Claude GM on (fake server): the
  "Write me a new adventure" box, the board card, the difficulty picker and
  setting out.

## Fixed in the PR with this report

1. **Book One story text was told out of order.** After a choice that moves to a
   new place, the paragraph told the new place first and the roll that got you
   there second, then repeated the chapter heading ("Act II — Roads That
   Remember: Three Ways into the Briarwood"), and told the choice card's hint as if
   it had happened ("Commit to the trail. More evidence may make later choices
   easier."). Now: the roll and its result, then the new place, with no heading or
   hint. Screenshot of the old text: `laptop-story-order-before-fix.png`.
2. **"Set out" on the story screen skipped the difficulty choice.** The Normal /
   Hard / Heroic picker for AI adventures was only on Prepare, so a player who uses
   the "What's next?" card always played Normal (twice as many adventures per
   level as Heroic). The card now shows the same picker (a trial shows its fixed
   difficulty). Screenshot: `phone-difficulty-on-set-out-fixed.png`.

Both have regression tests; all suites pass.

## Three things to keep

1. **The objective in every deciding fight.** Holding a door, closing a sluice,
   reading names while the Gloam pushes: it gives every class a way to win that
   isn't just damage, and the deadline adds real pressure.
2. **XP that can't run away.** Rewards as a share of the level, with the chapter
   cap, keep the written story at the right level for every player.
3. **Walk-outs that only come from your own choices.** Nobody leaves by accident;
   a run of choices against someone's values makes them go, and they come back.

## Evidence

Screenshots are in the project's files under `gameplay-review/`. The simulation
harness and its raw output were kept outside the repository (they reuse
`tests/player-policy.js` and record per-fight and per-check data); I can add them
as a script if you want these numbers re-run after a balance change.
