# UI review through Book Three (22 November 2026)

An independent visual review of Book Three's screens and of what changed since the last UI review
(PR #74, `docs/reviews/claude-ui-2026-11-21.md`): Masterwork refining at the smith, the level 40
job trial card and the late item cards. A separate review covers player experience (UX).

## How it was checked

The game ran with `BRIARWATCH_PREVIEW_BOOKS=1` and five scripted saves, built with the same
helpers as `tests/book-three-part-two.test.js`:

| Save | What it shows |
|---|---|
| Level 20 fighter (Guardian), Briarwatch | Town at the start of Book Three |
| Level 20, chapter 1 *The Letter from Vell* | Story screen |
| Level 37 wizard, chapter 18 *The Deep* | Story screen in Part Two |
| Level 30 ranger, a bounty in Vell | Combat board |
| Level 40 fighter, every chapter done, eight Book Three items in the pack | Trial card, smith, shop, pack |

Each was captured on a phone (390 × 844), a narrow phone (320 × 700) and a laptop (1366 × 860),
including scrolled views of the combat board and the Town tab. No screen scrolled sideways and no
script errors appeared.

## What looked right

- The **level 40 trial card** ("3rd job trial — become a Bulwark Knight") reads well on every
  screen: what the trial is, that it is always Hard, and one clear button.
- **Late item cards**: rarity labels, requirement lines ("Requires Level 24 · Dexterity 15 · not
  yet for you" in red) and Locked buttons all hold up with Book Three gear.
- **Book Three story screens**: long Part Two place lines ("The stair under Vell, and the deep
  beneath Cinder Fold's lid, where the marked way begins") wrap cleanly at 320 px.
- **Laptop combat board** at level 30 with four party members: one screen, nothing cut off.

## What was fixed in this PR

1. **Party names cut to one letter at 320 px.** At Book Three levels every HP number has three
   digits ("136/136"), so the strip read "R… Or… M… N…". On screens up to 400 px the HP now sits
   under the name: "Rowan / 140/140".
2. **The message box hint was cut off on narrow phones** (a leftover from the last review). "What do
   you do?" broke over two lines and "Ask the game master a question" was cut. Up to 400 px the
   hints are now "Your move", "Say it" and "Your question". Wider screens keep the full wording.
3. **The smith at level 40 was a list of about twenty cards**, with Fine upgrades for the starting
   Iron Longsword and Chain Shirt above the Masterwork refines a level 40 hero actually wants.
   Masterwork refines now come first under their own heading, and the basic Fine upgrades fold
   under "Fine upgrades for basic gear · 11". With no Masterwork refine available, the list looks
   as it did. A refine card's title is shorter: "Vell Duelling Sword → Masterwork".
4. **End Turn could scroll out of sight on phones** (a leftover). On phones the footer with
   orders, Retreat and End Turn now sticks to the bottom of the board while the action cards
   scroll. Short screens (650 px tall or less) scroll the whole page with the message box pinned,
   so they keep the footer where it was.
5. **Item skills were hidden in the middle of the item text** (a leftover). "Skill, Bank the Fire:
   …" is now its own line with a "Skill · Bank the Fire" chip, then the effect and "Bonus action,
   once per fight", on pack cards and in shops.

A unit test checks that the smith list marks Masterwork refines.

## Left for later

- **The town shop is a 500 px box inside the page on phones.** At level 40 it holds about forty
  cards (about 8,000 px) and starts with potions and supplies, so the gear is far down. Folding cards or sorting
  gear first would help. That needs its own design pass (the last review's "item cards could fold").
- **"Saved-game recap" in the combat log** takes four lines of a phone screen after loading a
  save mid-fight. It goes away after the first action.
- At level 40 the bounty card shows gold but no XP chip. If that is intended, the card could say
  why. Not checked further here.
- The loaded-save toast still covers the top bar for a few seconds on phones.

Screenshots: `/mnt/project-files/ui-review-book-three/`.
