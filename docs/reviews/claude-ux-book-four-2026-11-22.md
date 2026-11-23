# UX review: Book Four, levels 40 to 70 (2026-11-22)

Independent player-experience review of Book Four, The Long Tally, on the
branch of PR #92 (`claude/project-thread-d2sjb4` at bfad843): the hand-over
from Book Three, what the board says is next at each step, the two
straight-on runs, the Wold's cold, the part ends, the 4th job trial and the
end at level 70.

How: scripted campaigns with every book previewed (`BRIARWATCH_PREVIEW_BOOKS=1`,
the `tests/campaign-playtest.js` policy, standard difficulty, seed 301):
fighter, rogue, cleric, bard and ranger on the prepared route and wizard on the
direct route, each from level 1 to the 4th job. For the fighter and the
wizard the board was dumped (recap, trial, chapter cards, bounty, side jobs)
every time the party stood in a town from level 39 on, and every event was read
in order around levels 39 to 41, 49 to 50, 59 to 60 and 69 to 71. The part
ends were checked with `BRIARWATCH_PREVIEW_PARTS=4:1` and `4:2`. These are
scripted runs, not natural play, and no browser screenshots were taken this
time: the page changes are one line of text on two existing cards.

## Fixed in this PR

1. **The end of Book Three sent players to a chapter they could not start.**
   It said "Book Four begins. Its first chapter, The Walker on the North Road,
   is on the expedition board in Highpass Watch", but that chapter needs the
   3rd job. Now it goes on: "First comes your 3rd job trial: begin it from
   What's next or the expedition board. It is written into the game, so it
   does not need the AI game master. The chapter opens once you pass." It is
   only said to a hero who has not passed the trial.
2. **The straight-on warning was Book Three's.** Both of Book Four's runs
   (The Road to the Peaks into The North Door, and The Rope Families to the
   end) said "Straight on down the stair ... until the end of the book". The
   first goes up a mountain and comes out at Highpass. The card now says how
   many chapters run on and where they come out, for example "Straight on:
   this chapter and the next run on with no town, shop or side job until
   Highpass Watch." Book Three's stair now reads "this chapter and the next 3
   ... until the end of the book".
3. **Nothing warned about the white before setting out.** The cold (anyone
   without warm gear is Slowed in round 1) was told only once the fight had
   started. Every Wold chapter card (Part Two) now says so before you leave,
   names who is not wrapped up, and says where warm wool is sold. Once
   everyone wears warm gear it says nobody will be slowed.
4. **"a Aegis Paragon", "a examiner".** Job trial text used "a" before every
   job and judge name. It now says "an" before a vowel (an Aegis Paragon, an
   Archmage of Ruin, an Inquisitor, an examiner) on the board, on Prepare and
   in the trial's own text and AI brief.
5. **The trial announcement said the same thing twice** ("Pass their trial to
   rise from Bulwark Knight to Aegis Paragon. Pass it to become a Aegis
   Paragon."). The second sentence is left out when the brief already names
   the job.
6. **The end of Part Two was headed "To Be Continued"** even with Part Three
   out. That scene is now "Gone South", after Rue's chalk line.
7. **The peaks road's ledge said "go back down" and "Climb back up to town".**
   On that road the fight is above you and Orme is below. Its ledge now reads
   "Rest, then go on up" and "Go back down to Orme". The stair keeps its words;
   the retreat and defeat texts now say "go back to the fight" instead of
   "go back down".

## Checked, no change

- The recap card on Book Four's first screen shows until the first chapter is
  begun, and the first chapter's card says "Pass your 3rd job trial first".
- Every chapter from 40 to 69 was on the board in the town the party stood in,
  with nothing blocked, in all six runs. Side jobs appeared where the design
  puts them.
- Part ends: Part One stops at 50 and Part Two at 60 with "To be continued",
  naming the part finished and the next one. Bounties stay open.
- Level 70: the closing message names all four books, says the 4th job trial
  is ready and needs no AI, and What's next shows "Begin your trial". All six
  heroes passed it.

## Left for later

- After the 4th job (level 71) bounties pay no XP, so without the AI game
  master the 4th job's skills at 80, 90 and 100 cannot be reached. That
  matches the design (the AI story goes on from here) and the board says
  "no XP: you are at the most a bounty can give here", but What's next could
  say plainly that the next skills come from AI adventures.
- The first Wold chapter (Written on the Doors) leaves from Highpass, before
  anyone can buy warm wool, so its warning can only say where wool is sold.
  The chapter's own scarf reward fixes it for the next fight.
- The retreat message below a ledge still says gold was "lost in the dark",
  which reads oddly on the snowy peaks road.
