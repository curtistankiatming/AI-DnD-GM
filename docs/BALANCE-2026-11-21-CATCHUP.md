# Balance: falling behind and catching up (21 November 2026)

Step 2 of the combat and equipment plan. Curtis asked for fights to get harder
when the hero is more than 5 levels under, so side stories and side battles are
worth doing, and chose chapters that pay about 70% of a level.

## What changed

- **Chapter XP** (`src/xp.js` `CHAPTER_SHARE`). Every chapter of Books One and
  Two pays 70% of its level's XP (it paid about 105%). Chapters written to pay
  nothing (the Oath of the Road, the aftermath) still pay nothing. Book Three
  keeps one level per chapter, as its design requires (it ends at the 3rd job
  at level 40).
- **Starting a chapter under-levelled** (`src/world.js` `minLevel`). A written
  chapter can be started up to 10 levels under its level (it needed the exact
  level before). AI adventures and job trials keep their level gate.
- **The under-level penalty** (`src/xp.js` `underSteps`). More than 5 levels
  under a chapter, each further level adds a step, up to 5 steps at 10 under.
  Each step gives the chapter's enemies +1 to hit and +10% damage (shown as
  "Outclasses you" on the combat board) and raises its story checks by 1.
  The "What's next?" card says so before you set out.
- **The bounty board** (`src/bounty.js`). Every town has a repeatable fight at
  the hero's level: a regional leader and two followers built like an
  adventure battle. A win pays battle XP by the usual rating (a standard one
  rates hard, 10% of a level) and 8 + 3 x level gold. Losing or giving up costs
  a tenth of the gold carried; it never touches the story or an expedition.
  Like all XP, it stops at the level the current chapter is written for.
  It is on the "What's next?" card and on Prepare.

## Results

Scripted campaigns (6 classes, 2 seeds, levels 1 to 20, Book One and Two).
"Careful" takes bounties until caught up and does side jobs; "Direct" fights by
force and takes bounties only when more than 3 levels under; "Skip" never takes
side content.

| Difficulty, player | Level at end of Book Two | Average levels under at a chapter | Most under | Bounties per run | Chapter fights lost per run |
|---|---|---|---|---|---|
| Standard, careful | 19 | 0 | 0 | 34 | 0.3 |
| Standard, direct | 16 | 1.8 | 3 | 1 | 2.8 |
| Standard, skip | 16 | 1.8 | 4 | 0 | 0.3 |
| Gritty, careful | 19 | 0 | 0 | 34 | 1.3 |
| Gritty, direct | 16 | 1.8 | 3 | 1 | 11 |
| Gritty, skip | 16 | 1.8 | 4 | 0 | 2.3 |

Before this step every player reached level 20 at the end of Book Two and was
never under a chapter's level.

- A player who skips side content ends Book Two about 4 levels behind, never
  more than 5 under a chapter, so the penalty does not trigger on the main path
  alone (as the plan intended). Catching up takes about two bounties per
  chapter.
- Being 2 to 4 under already makes force fights harder: a direct player who
  ignores the bounty board loses about 3 chapter fights on Standard and 11 on
  Gritty over the two books (rescue and retry, no soft-locks; every run
  finished). The objective route is much safer.
- After Book Two, bounties and AI adventures lift a careful hero from 19 to 20
  and the 2nd job in one or two fights. A no-AI player can now keep levelling
  with bounties after the written story.

## Left for later

- Story checks still rely on the hero; step 3 lets the best-suited companion
  roll.
- Gold from bounties adds to the Book Two surplus; step 5's catalogue gives it
  something to buy.
