# UI review through Book Four (22 November 2026)

A visual review of Book Four's screens (levels 40 to 70) on the Book Four branch (PR #92) with
master merged in: fights, town shops, equipment sets and the Journal. It follows the Book Three
UI review (`docs/reviews/claude-ui-book-three-2026-11-22.md`).

## How it was checked

The game ran with `BRIARWATCH_PREVIEW_BOOKS=1` and seven scripted saves, built the way
`tests/book-four-part-three.test.js` builds a hero at a chapter's town:

| Save | What it shows |
|---|---|
| Level 45 fighter, Highpass, chapter 6 *The Book* next | Town shop (60 cards), pack with late gear |
| Level 45 fighter in chapter 6's deciding fight | Combat board |
| Level 55 wizard, Orme, one Lamplit Scholar piece worn | Wold shop with warm gear, set cards |
| Level 55 wizard in chapter 16's deciding fight (the white) | Combat board with the cold |
| Level 65 rogue, Merrowgate, Thornstep set worn | Town, set cards, Journal |
| Level 65 rogue in chapter 26's deciding fight | Combat board |
| Level 70 bard, every chapter done | Legendary trial card, Journal with 30 tellings |

Each was captured on a phone (390 × 844), a narrow phone (320 × 700) and a laptop (1366 × 860), on
the Adventure, Party, Journal and Town tabs, with scrolled views of fights and shops. No screen
scrolled sideways and no script errors appeared.

## What looked right

- **The legendary trial card** at 70 ("Legendary trial: become a Keeper of the First Song · Level
  70 · Heroic", one button) reads well on every screen.
- **Set cards** on pack and shop items: the "Set · The Lamplit Scholar · you wear 1 of 3" chip, each
  bonus on its own line with the reached ones lit, and the 50% / 30% caps on the item text.
- **The Telling's two columns** (the song and the Long Tally) stack cleanly on phones.
- **Laptop fight boards** with four party members and three enemies: one screen, nothing cut off.

## What was fixed in this PR

1. **Fighter names broke mid-word at 320 px** ("Reckoner' s Guard", "Orin Stonewar d"), because
   the three-digit HP took the room beside the name. Up to 400 px the HP now sits under the name.
2. **The white's chip took three lines on every party card** ("Slowed by the white (no warm
   gear) · 1 rd"). It now reads "Slowed (cold) · 1 rd"; the full wording stays as the tooltip, and
   the line at the top of the fight still explains the cold and where warm wool is sold.
3. **Book Four's fight goals are long** (up to 91 characters, against 70 before), so the goal's
   action card on phones was a narrow column nine lines tall. On phones it now takes the whole row.
4. **A wizard's one-tap attack was an Unarmed Strike for 1 damage.** A wizard holds a focus, not a
   weapon, so "Tap an enemy to use Unarmed Strike" was the default at every level. When the weapon
   attack is unarmed, the board now readies the free attack cantrip (Fire Bolt) instead. This was
   older than Book Four but costs most at its levels.
5. **Town shops at Book Four levels were a 500 px box of 32 to 60 cards**, potions first (the Book
   Three leftover, now worse: Highpass at 45 sells 60 things). A shop with more than 24 cards is
   now grouped: **Gear for your party** (newest first) open, then **Supplies & potions**, **Older
   gear, ten or more levels below you** and **Not for your party yet**, each folded with its
   count. The page scrolls instead of a box inside it. Shops of 24 cards or fewer (Briarwatch
   has 19 early on) look as they did; Book Three's late towns get the groups too. At Highpass, level 45: 14 gear cards open, 11 supplies, 33 older and 2
   not-yet folded.
6. **Warm Wold gear had no marker**; the "Warm:" sentence sat in the middle of the item text. It is
   now its own line with a "Warm" chip on shop and pack cards.
7. **The Journal at 70 was about 18,000 px tall on a phone**: the Telling (30 entries, about
   7,300 px) opens the Journal, oldest first, and Completed adventures adds 70 more. Each now shows
   its latest entries (3 tellings, 5 adventures) with the earlier ones under one line, "Earlier
   tellings · 27". It stays open once opened. At 320 px the Journal went from 13,000 px to 4,800 px
   at level 55.

`tests/book-four-release.test.js` checks that shop cards carry the item's level.

## Left for later

- **"Saved-game recap" in the combat log** still takes four or five lines of a phone screen after
  loading mid-fight (Book Three leftover).
- **"How to play" shows on a level 70 save** in a browser that has not dismissed it. It is
  per browser, so a returning player won't see it.
- Gear for companions shows "not for your class" in red, then "Can be used by Orin Stoneward"
  under it. That's right but reads as a contradiction at a glance. A softer wording for
  companion-only gear would help.
- The loaded-save toast still covers the top bar for a few seconds.

Screenshots: `/mnt/project-files/ui-review-book-four/`.
