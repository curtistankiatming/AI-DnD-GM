# Systems review of Book Four, 22 November 2026 (Claude)

An independent code review of the systems Book Four (levels 40 to 70) leans
on: PR #92 (Book Four Parts Two and Three) merged with `master` (#87, #88,
#89, #90, #91). It reads the code and runs scripted checks; nothing here is
natural play.

- **Tested source:** `claude/project-thread-d2sjb4` at bfad843 merged with
  `master` at 05171d6 (no conflicts), then this branch.
- **Runtime:** Node 22, no AI provider, no network.
- **Commands:** `npm run check`, `npm test` (1,170 tests before, 1,174 after),
  `npm run fuzz` with the preview on (14,400 actions, 1,440 reloads, no
  failures), one full scripted run of a bard from level 1 to the 4th job
  (2,302 steps, 45 seconds), and small probe scripts for the cases below.
- **Limits:** no live Claude call; one class through the full run, not the
  whole playtest grid (PR #92 reports 108 of 108 runs reach the 4th job).

## What was checked

| Area | Where | Verdict |
| --- | --- | --- |
| 3rd job gate on Book Four | `requiresJob: 3` on `b4-walker`, `W.jobNeeded`, `completeQuest` | Sound. A level 40 hero without the 3rd job sees "Pass your 3rd job trial first." on the board and cannot depart. |
| 4th job at 70 | `levelFloor: 70` on `b4-parting`, `P.nextTrial`, `Book.trialLine` | Sound. Chapter 30 tops the hero up to 70; the books are marked finished, AI XP is no longer capped, and the ending says the 4th job trial is ready and needs no AI game master. The scripted run took it and reached the 4th job. |
| Levelling through 40 to 70 | `Book.levelCap`, `capXp`, `jobRoom`, bounty caps (`src/bounty.js`) | Sound. AI XP, side jobs and bounties all stop at the chapter's level. Between released parts, bounties stop at the level after the last released chapter. |
| Book and part visibility | `src/book.js` `buildShelf`, `townOpen`, `Recap.recap` | Sound. Book Four is `out: 0` (hidden) on this branch. Lantry and Orme stay closed until a chapter that names them can be played. The recap card shows only while chapter 1 is next. |
| Gear 41 to 70 | `Book.gearOpen`, `ownsGear` | Sound. It waits for Book Four only while the save can read Book Four. A save that cannot (hidden, unpaid, or on its own AI story) keeps Book Three's rule. |
| Hosted signed saves | `src/hosted.js` `seal`, `verify` | Sound. Book Four adds no field outside the sealed state. A full save at level 71 is about 280 KB (the request limit is 3 MB), and it seals, goes through JSON and verifies. |
| Lapsed hosted account | `Book.locked`, `Book.chapter` | **Bug (fixed):** a save part-way through Book Four, or past every book, whose paid pass lapsed was told it was "part-way through Book Three". The note now names the book the save is held in, and says "has gone on past" for a save that finished the books. The behaviour is unchanged: the save waits, and the AI writes only small side stories. |
| AI storyteller handoff after Book Four | `Book.finished`, `Book.facts`, `Director` prompt | Sound. After chapter 30 the AI gets "beyond the books", the last 15 chapters with their decisions, the Telling's legend and each companion's standing. |
| Straight-on chapters and the safety valve | `continues` on `b4-column`, `b4-ropes`, `b4-lid`; `W.goOn`, `backDown`, `climbUp` | Works: a defeat in chapters 20, 29 or 30 wakes on the ledge before it; after 3 defeats the ledge offers the way out, and departing again goes back to the same fight. **Wording bug (fixed):** every Book Four ledge said "Rest, then go back down" and "Climb back up to town", the words for Book Three's stair. Chapter 20 goes up the north face, and 29 and 30 are on the casting floor in Cinder Fold. Quests may now set `ledgeLabel`, `climbText` (with `ledgeBackLabel` from the UX review, #95), and the three Book Four ledges do. |
| Saves loading | `normalizeIncomingState` | Sound. A full end-of-Book-Four save loads and builds its view. |

## Fixes on this branch

1. `src/book.js`: `heldBook` is the latest closed book the save has begun;
   `locked` and the locked chapter's note use it.
2. `src/expansion.js`, `src/engine.js`, `src/data/book-four/quests.json`:
   `climbText` (with `ledgeBackLabel` from the UX review, #95) for a ledge's way out; the ledge objective
   follows `ledgeLabel`. Book Three's stair is unchanged.
3. `tests/book-four-systems.test.js`: four tests for the above.

## For Curtis

- **New books and AI stories.** A save that finishes the last book that is
  out and then starts an AI adventure never goes into a book released later
  (`src/book.js`: "new books are for new saves"). If Book Three comes out
  before Book Four, every save that tries the AI after Book Three will never
  get Book Four. Either release Books Three and Four together, or let such
  saves go back into the new book, the way a free account that upgrades
  already does (`books:waiting`).
- **Lapsed after every book.** A paid save that finished all four books and
  is on its own AI story waits if the pass lapses, like a save mid-book. This
  is kept as it was (safer for the paid tier); the note now says so plainly.

## Left for later

- The failure count behind the safety valve never resets, so after the first
  climb out the way out is offered after every later defeat in that chapter
  (also noted in the last systems review).
- A save past every book on a lapsed account has its AI XP capped at its
  current level while it waits.
