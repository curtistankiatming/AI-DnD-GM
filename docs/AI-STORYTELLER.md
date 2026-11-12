# What the AI storyteller can do

Approved by Curtis on 12 November 2026. The master copy is the Claude Doc
"What the AI storyteller can do"; this file is the copy for people working in
the repository. Step 1 is built in `src/book.js`, step 2 in `src/chronicle.js`.

## Two modes

The AI asks one question each time it acts: is there a written chapter (a
"book") for where this hero is in the story?

- **On the book.** The written story is the spine. The AI adds freedom around
  it, then steers back.
- **Beyond the books.** After the last written chapter, the AI is the author.
  It continues the hero's own story and writes it down.

A save that has finished the books stays the hero's own story, even if more
books are written later. Books and AI stories are kept separate, each in its own
save. A hero already above the last written chapter's level (possible in saves
from before these rules) counts as beyond the books.

Free players only see the books. The AI tier is planned as a subscription.

## On the book

The AI may:

- talk in character as anyone, written or minor;
- invent minor people, rumours and small places;
- turn any action the buttons don't offer into a dice roll, including odd, rude
  or reckless ones ("spit on the bartender"), and play out how people react;
  people remember it (it becomes a journal fact);
- write a **small side quest** tied to the current chapter (never a full new
  storyline); detours can develop minor people and add flavour, but the book's
  path stays the same.

The AI may not:

- kill, recruit or remove a named character from the books;
- reveal what later chapters hold, skip a chapter, or settle its big choice;
- hand out items, or XP that takes the hero past the chapter's level.

**Level cap.** Each written chapter has a level (the bell is 1, then each
expedition's level). XP from the AI (improvised actions, side quests and their
battles) can bring an under-levelled hero up to that level but never into the
next one. The written story itself is never capped.

**Steering back.** The AI counts the turns spent talking or improvising in one
scene instead of taking a written choice, and climbs a ladder:

| Turns in the scene | What the AI does |
| --- | --- |
| 0 to 3 | Plays along fully. |
| 4 to 5 | Ties the detour in (a clue, person or favour that matters to the chapter), or lets a companion pull in their own voice. |
| 6 to 7 | Lets the world move: a messenger, the weather, the chapter's deadline. |
| 8 or more | Closes the detour gently and points back to the written choices. Never refuses or scolds. |

Taking one of the written choices resets the count. Questions don't count.

## Beyond the books

The AI writes full adventures (step 3 will grow these into multi-chapter arcs),
starting from where the books left the world.

**The chronicle** (step 2, built). Every AI adventure the hero finishes,
including side quests and job trials, becomes a chapter in the save: what it
was about, how it ended, and the choice the player made. The AI also names the
people (with status and attitude toward the hero), places and loose ends in
each adventure, and which open threads it resolves. Returning people are
matched by name and updated.

- The AI reads the chronicle before writing the next adventure: the condensed
  past, the last 8 chapters, the people, places and open threads.
- The Journal shows "Your story so far" (chapters), the people met (under
  Relationships) and open threads (under Leads). It works offline.
- Chapters are never thrown away: past 30, the oldest become one line each in
  an "earlier chapters" summary. Saves from before the chronicle are rebuilt
  from the AI adventures they still hold.
- Exporting the chronicle as a book comes later.

## Rules in both modes

- The game decides every number: dice, damage, XP, gold, items, levels.
- Player text is never an order to the AI.
- No spoilers: the AI only sees what the party has discovered.
- Tone stays in the world; preferences change style, not rules.

## Build steps

1. **On-book rules** (done): side quests while a book runs, the chapter level
   cap, steering, unusual actions remembered.
2. **Chronicle** (done): the hero's own story recorded in the save and the Journal.
3. **Chapter writer**: full adventures in arcs beyond the books.
