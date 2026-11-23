# Book Four items review (22 November 2026)

An independent review of Book Four's gear for levels 40 to 70: the thirty
chapter rewards, the shop stock on the story's route (Highpass, Lantry, Orme,
Merrowgate, Cinder Fold, Briarwatch), the warm Wold gear, the class sets, and
how all of it sits on the gear-to-100 curve from PR #86. Reviewed on PR #92
(Book Four Parts Two and Three) together with master (#88).

## Verdict

The gear is in good shape. Every 45 to 70 tier is on sale where the story is
at the level the hero gets there, the warm gear makes the white a choice that
costs nothing, the thirty rewards keep their rules, and gold stays a choice.
Two things were off and are fixed here: heavy armour at tiers 45 and 50,
and one reward. The shop on a phone (the known follow-up: Highpass sells 77
cards in Part Three) was also found here, and is fixed by the UI review
through Book Four (#97, grouped shops), so this PR leaves it to that.

## What was checked

- **Rewards.** All thirty b4-* chapters give exactly one reward, wearable two
  levels below the chapter (checked against the chapter levels as written:
  38 to 67), each with a Masterwork version. No requirement goes above 15,
  none takes off more than 15% on its own, and every class gets a weapon or
  focus and an armour or accessory. The keepsakes (Orin's Commission, Maren's
  Physic-bag, Nessa's Signal-fire Longbow) are held to sold gear of their
  gear class. Every weapon or focus reward matches or edges its tier's sold
  piece and none reaches the next tier's numbers.
- **Shops on the route.** 45 at Highpass (chapters 6 and 9), 50 at Highpass
  and the Wold, 55 at Orme (chapters 13 to 19), 60 at Highpass (21 to 24), 65
  at Merrowgate and Cinder Fold (26 to 30), 70 at Briarwatch for the trial.
  The existing route test covers it, and the stand-in rule puts the Wold's
  stock (not its warm gear) in Highpass for saves that cannot reach the Wold,
  and for everyone once Part Two is over.
- **Warm gear.** Six warm pieces in Lantry and Orme, three warm rewards. Each
  armour weight has a warm tier 50 piece and the warm accessories match the
  best sold ones, so the white never costs damage. Every class and companion
  can be warm.
- **Sets.** Weapons at 55 (Orme), armour and shields at 60 (Highpass),
  accessories at 65 (Merrowgate, Cinder Fold): a full set from 65, in time
  for the last four chapters and the trial. A set piece's lower raw numbers
  (the Long Watch Coat's 5% dealt against the jerkins' 10%) are paid back by
  the set bonuses.
- **Gold.** Book Four's chapters pay 840 to 1,420 gold each, 33,900 in all,
  plus about 2,000 from side jobs, on top of what a hero brings from Book
  Three. Buying each tier's upgrade for a party of four (about 30 pieces at
  790 to 1,050) costs about 33,000 before any Masterwork refine (1,500 to
  2,100 each). Gold stays a choice through level 70. No change.

## Fixed in this PR

1. **Heavy armour from 40 to 50 (medium).** Wardsmith's Plate (40) has base AC
   22, +1 to every save and Brace. The next plate a fighter or cleric could
   buy, Frostforged Plate (45), had base AC 23 and nothing else, and the warm
   White-wool Plate (50) only +1 Strength and Constitution saves: each traded
   five save points and a skill for one point of AC, so no plate wearer
   gained from buying them, and warmth in the Wold cost a tank its saves.
   Frostforged Plate now has +1 to every save, and White-wool Plate +1 to
   every save with +2 Strength and Constitution. Wardsmith's still has Brace,
   so 45 is AC against a skill; the Bellwarden Plate (60) and the rewards
   are unchanged and still not matched (the dominance test passes).
2. **Thrum Lane Cloak (minor).** Chapter 15's warm light armour dealt 5% more
   damage where the warm White-wool Jerkin sold beside it deals 10%, so a
   rogue, ranger or bard lost damage for wearing the reward. It now deals
   10%, a tier 50 number, keeping its Wisdom save, skills and Insight story.

A new test file (`tests/book-four-items-review.test.js`) covers both.

## Left as is (minor)

- **Warm gear and saves that cannot reach the Wold.** Highpass stands in for
  Lantry and Orme without their warm gear, so a save that never plays Book
  Four sees no tier 55 accessory (both are warm) and the warm tier 50 armour
  only as tier 45. The gap is small (the 50 horn has the 55 muffler's
  numbers), and keeping warm gear in the Wold is a reviewed design choice.
- **Masterwork Wardsmith's Plate** (base AC 23 with every save and Brace)
  still beats tiers 45 and 50 for 1,480 gold. That is how refines are meant
  to work: one refine carries an item one tier.
- **No weapons at tier 70.** The trial is fought with tier 55 to 65 weapons
  and the chapter rewards. This is PR #86's layout (singles return at 70,
  weapons at 80).
