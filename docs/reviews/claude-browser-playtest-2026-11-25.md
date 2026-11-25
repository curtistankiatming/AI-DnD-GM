# Browser playtest, laptop and phone (Claude, 25 November 2026)

## What was played

This time the game was played the way a player plays it: through the real web
page, not the terminal. The game server ran in a cloud sandbox and a headless
browser clicked through it, on a laptop-sized window (1366 by 850) and on an
iPhone 13-sized screen. Nothing was deployed publicly and no AI model was
called. Commit played: 6844cb7 (master), then the fixes on this branch.

| Run | Hero | Difficulty | How far |
| --- | --- | --- | --- |
| Laptop | Pell, Rogue | Standard | Fresh start, all of Book One, the level 10 Oath of the Road trial, and Book Two up to Hollin's Reach (level 15, chapter 6 of 10). |
| Phone | Bram, Cleric | Gritty | Fresh start, the Nessa rescue route, Book One to the Ashford bridge chapter (level 4). |
| Phone, hosted | A guest | Standard | `HOSTED=1` server: create a hero, play, try to save, reload, continue, try to cheat. |

Story choices were made by hand at the start, then by a simple scripted
player that reads every choice on screen and prefers ones it has not tried.
Fights were played by the same script tapping the weapon and the first enemy
(it never heals, buffs or uses items, so it is weaker than a person). Every
scene's text was read afterwards. Books Three and Four stayed hidden.

Screenshots are in the project files under `browser-playtest/`.

## Ratings

| | Rating | In one line |
| --- | --- | --- |
| Story | 9/10 | Book Two is the best writing in the game. Fenmere's churchyard and Brannagh's roof are genuinely moving. |
| Characters | 9/10 | Orin, Maren and Nessa sound like three different people in every scene. |
| Comedy | 9/10 | All of it comes from character: Dera's "that's not gossip, that's weather", the toll board that charges for reading the toll board, the goat nobody asks about. |
| Pacing | 7/10 | Chapter fronts are great; the middle of every chapter uses the same three headings, which starts to show. |
| Difficulty, Standard | 3/5 | Two early defeats for an attack-only player (Toll of Empty Wagons at level 2, Old Snapjaw). Fair once the party has four people. |
| Difficulty, Gritty | 4/5 | A level 4 party fell at the Ashford bridge. Feels right for Gritty. |
| Level 10 grind | 3/5 | Six bounties from level 8 to 10 in this run (the script skipped every optional job, so a real player needs fewer). Each one plays fast. |
| Laptop UI | 8/10 | Clear and handsome. Combat board reads well. |
| Phone UI | 7/10 | Works, everything reachable; the typing box takes room even when it can't be used. |
| Fun overall | 8/10 | |

## Fixed in this branch

1. **Broken sentence after most won fights (major, every chapter).** When a
   chapter fight was won by defeating everyone rather than by the objective,
   the game said: "The party secures demonstrate responsibility under pressure
   before returning to the witnesses." It pasted the objective's name into a
   sentence, so it read wrong in all 30 chapters ("secures release the wagon
   drivers", "secures hold the lower gate..."). It now says: "The opposition is
   defeated, and with nobody left to stop you the job is finished. Release the
   wagon drivers: done."
2. **"Pell dies. The chapter is lost." (major).** Shown after a third failed
   death save, including in a special monster hunt that says "nothing is lost
   but health" in the next sentence. Nobody dies in this game: the party is
   rescued. It now says: "Pell fails a third death save. The fight is lost."
3. **Nessa joining through the guild read like a shop receipt (minor).** "She
   brings her equipment and shares the party's level; no recruitment fee is
   required." It is now a short scene in her voice, with Orin and Maren
   reacting. See the open question below about how players miss her rescue.
4. **Hosted game asked guests to paste a Claude key (major for the hosted
   site).** The first screen and Settings showed "Paste your Claude API key",
   a model picker and "Save AI settings", all of which the hosted server
   refuses. In hosted mode those are now replaced by one line: the site runs
   the game master, no key needed, and how many AI turns are left today (or
   that the AI comes with an account).
5. **Hosted guests lost their game on refresh (blocker for the hosted site).**
   The server tells a guest "Your browser keeps your current game", but nothing
   kept it: reloading the page or closing the tab lost the hero. The browser
   now keeps the current game, and the title page offers "Continue: name ·
   Level n". It is still sealed: an edited copy (I set gold to 99,999) is
   refused with the usual "This save was changed outside the game".
6. **"Ask the GM for a side quest" without the AI only showed an error (minor).**
   With the AI game master off, the button now explains that the written story
   and the bounty board are your adventures for now, and offers to turn the AI
   on instead.

Tests for all of these are in `tests/browser-playtest.test.js`.

## Nessa's arrival (Curtis decided: two chances, then she's gone)

At "Three Ways into the Briarwood" only one route of four (follow the bell
note into the mist) leads to Nessa's rescue. On the other three she could only
be added from a town button from level 3, which is easy to miss: my laptop run
missed it until level 6, so Nessa was absent for "A Light above the Storm", the
chapter about her own mentor Wren.

Curtis's answer: choices must impact the story; give her two chances, and if
the player passes on both she never joins. Built that way:

- **Chance one** is the rescue in the mist, unchanged.
- **Chance two** is a new scene, "A Scout on the Bench", when the party reports
  the first chapter to Aveline without her: "Take her on" or "Tell her the
  party is full". Turning her down is final, and the town button is gone for
  that save. (Saves already past that point keep the old town button.)
- **The story remembers.** Wherever she would have been, someone notices she
  isn't: Wren at the signal tower ("I tied that scarf up for a scout of mine.
  Reed."), Wren again at Cinder Fold, and a letter from Wren in the Book Two
  epilogue. If you turned Nessa down, the lines say so ("Said she'd asked some
  Briarwatch folk if she could walk with them, and they'd said no"). The chapter
  brief "in Nessa's old code" now says "in a scout's old code".
- Nessa's Book Two walk-out letter no longer mentions the snare for players who
  met her on the bench; it mentions the bench instead.

### Calls made by a reviewer while Curtis slept

Curtis asked for an independent reviewer to answer questions overnight. A
separate reviewer read the new scene and the Wren chapters, and decided:

1. Nessa's lines in the new scene were too tidy for her (the bible gives her
   half-finished sentences). Rewritten to its suggested lines, and Maren now
   asks about her bandaged hand.
2. Her absence should be acknowledged in three places (signal tower, Cinder
   Fold, the Book Two epilogue letter), with a sharper version when she was
   turned down. Done as it proposed.
3. Orin's last line in the refusal was cut to "That's what worries me."; the
   longer version explained the joke.

Any of these can be reversed.

## Follow-up the same night (Curtis: "take all recommendations and do 2 more runs")

PR #111 was merged. Every suggestion below ("Not fixed, worth deciding") is now
built, and two more fresh runs were played on the new version through the
browser, with no AI:

| Run | Hero | Difficulty | How far |
| --- | --- | --- | --- |
| Run 3, laptop | Ilse, Wizard | Story | Fresh start, missed the mist and took Nessa on at the bench, Book One, the trial and Book Two (level 19). |
| Run 4, phone | Wynn, Bard | Standard | Fresh start, missed the mist and turned Nessa down, Book One, the trial and Book Two to "The Vote" (level 15). |

Neither run pressed Quick save once: each session picked up from the new
autosave through Continue, which worked every time.

### The suggestions, built

1. **Autosave.** The web version now keeps one rolling autosave after every
   new game, move and AI turn. Continue opens it when it is newer than the save
   you used last ("Picked up where you left off"). Starting a new hero asks
   before replacing it, as the downloadable edition does. Named saves are
   untouched. Hosted visitors without an account keep using the browser copy.
2. **Level-up choices.** A "Waiting for you · Choose now" block sits in the
   Adventure side panel on a laptop, and at the top of "What's next?" in town on
   any screen.
3. **Phone typing box.** In a fight, or with the AI off, the box folds to one
   "Type your own action" button. It opens with one tap.
4. **Chapter headings.** The middle of each chapter is now headed by its own
   route, objective and name ("Cross under the causeway and reach the
   drivers", "Release the wagon drivers", "After the Toll of Empty Wagons").
   Clues read "A lead on the Chair Problem". The trial no longer says
   "Objective reward: 0 gold."
5. **Wounded warnings.** One line names everyone who is hurt, and the town list
   says a party-wide warning once instead of once per expedition.
6. **Overkill.** "Shortsword dealt 36 piercing damage to the raider, more than
   the 32 health they had left."

### Found in runs 3 and 4, fixed

- **Whose map is it?** At Cinder Fold without Nessa, Wren's new line about her
  ("She asked after you once") was followed by "You take out the map she
  pressed on you", which then read as Nessa's map. It now says "the map Wren
  pressed on you".
- **"After A Light above the Storm".** Headings and clue names now lowercase a
  leading "A" or "The" ("After a Light above the Storm").
- **A rest button in the middle of the bench scene.** "Take short rest" was
  offered beside "Take her on". Removed.

### Ratings for runs 3 and 4

| | Rating | In one line |
| --- | --- | --- |
| Story difficulty, Wizard | 2/5 | Five defeats, three of them at the very first bell fight, because the script swings a Wizard's staff and never casts. Easy after that. |
| Standard, Bard, attack only | 5/5 | Eighteen defeats: seven at "The Night Hollin's Reach Burned", four at the Borrowed Magistrate, three in Fenmere's Gloam Tide. A Bard who never sings or heals is the weakest player there is, and this party was one short. |
| Nessa's second chance | 9/10 | Both answers read well. Turning her down is felt later: Wren's line at the signal tower lands. |
| Fun overall | 8/10 | |

### Worth deciding

- **Turning Nessa down makes Book Two much harder.** Run 4's party was three,
  not four, and lost eighteen fights. Most of that is the script (it never uses
  a Bard's songs or heals), but a real player who refuses her has no way to
  fill the fourth place. That may be exactly the cost Curtis wants ("choices
  impact story"). If not, a hired sellsword in Book Two for parties of three
  would soften it without bringing Nessa back.

## Not fixed, worth deciding (all built in the follow-up above)

- **No autosave in the normal web version.** Progress only reaches disk when
  you press Quick save. A desktop browser warns before closing; phones often
  don't. My own laptop run lost five Book Two chapters when the browser was
  stopped. A rolling autosave after each chapter (the downloadable edition
  already has one) would stop that.
- **Level-up choices pile up unnoticed.** By level 6 four choices were waiting
  and one from level 8 was still unchosen at level 12. The only signs are a
  toast and a small dot on the Town tab. A "Choose now" chip in the Adventure
  side panel would help.
- **Phone: the Act / Say / Ask box is always on screen**, even with the AI off
  and in fights, where it takes about an eighth of the screen.
- **Repeated scaffolding.** Every chapter's middle uses the headings "The
  approach", "The deciding moment" and "What you leave behind", and every first
  clue reads "Clue discovered: The Chair Problem: established lead". The trial
  ends with "Objective reward: 0 gold."
- **Phone town shows one chip per wounded companion** ("The Last Cart over
  Ashford: Orin Stoneward is below 65% health" four times).
- **Overkill reads oddly**: "Sneak Attack adds 36 damage. Shortsword dealt 32
  piercing damage." The second number is capped at the enemy's remaining
  health.

## Three things to keep

1. The writing in Book Two: Fenmere, the Baker's Ward, Kell's Bridge and the
   harbour auction each have a real person at the centre and a joke that only
   that person could make.
2. Failure moves the story forward: a failed roll still gives the clue, just
   with a cost.
3. The combat board on both screen sizes: tap an action, tap an enemy, with
   the hit chance on every card.
