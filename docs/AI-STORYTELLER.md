# What the AI storyteller can do

Approved by Curtis on 12 November 2026. The master copy is the Claude Doc
"What the AI storyteller can do"; this file is the copy for people working in
the repository. Step 1 is built in `src/book.js`; steps 2 and 3 in
`src/chronicle.js`.

## Two modes

The AI asks one question each time it acts: is there a written chapter (a
"book") for where this hero is in the story?

- **On the book.** The written story is the spine. The AI adds freedom around
  it, then steers back.
- **Beyond the books.** After the last written chapter, the AI is the author.
  It continues the hero's own story and writes it down.

The books are Book One (levels 1 to 10) and Book Two (levels 10 to 20). A book
marked as still being written in `src/book.js` makes a hero who reaches its
last written chapter wait at a "to be continued": the AI can write small side
quests, capped one level above that chapter, and the save stays on the books.

A save that has finished the books stays the hero's own story, even if more
books are written later. The one exception: a save that finished Book One
before Book Two existed, and has had no full AI adventure since, carries on into
Book Two. Books and AI stories are kept separate, each in its own
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

The AI writes full adventures, starting from where the books left the world.

**Story arcs** (step 3, built). Every AI adventure beyond the books is one
chapter of a story arc of four chapters. The game keeps the count and tells
the AI which beat it is writing:

| Chapter | Beat | What the AI writes |
| --- | --- | --- |
| 1 | Opening | Names the arc and its big question; introduces its central person, place or threat; ends on a hook. |
| 2 | Rising | Raises the stakes and reveals something new; ends on a hook. |
| 3 | Turn | A reversal, betrayal or hard truth that sets up the finale. |
| 4 | Finale | Answers the arc's question; the final choice decides how it ends. |

Each chapter is still a complete adventure with its own crisis and choices,
and pays like any adventure (no extra XP). The AI can name an arc only before
its first chapter is finished. Side quests during the books and job trials
are not arc chapters; a trial stands on its own. The Journal shows the arc in
progress under Leads and each finished arc in "Your story so far".

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

## Paid books

Every book is free in the open-source game, played with the player's own AI
key. On the hosted web and app game, which plays on its owner's key, Books One
and Two are free and Book Three onward needs a paid account.

- The server decides how far a session may read, every request
  (`bookAccess` in `server.js`; the open-source server opens every book). A
  save can never grant itself access: access is held on the game state in a
  way a save file cannot carry (`Book.grant`, `Book.ACCESS` in `src/book.js`).
- A free hosted account that finishes Book Two is told the story goes on in
  Book Three for paid accounts. If it upgrades, the save carries straight on
  into Book Three. If it began an AI story of its own first, the save
  remembers the book it set aside (`books:waiting`); after an upgrade it goes
  back into that book, and its AI story carries on once the books are finished
  again.
- A save already inside a paid book whose account lapses waits untouched: it
  is never marked finished or handed to the AI storyteller, the AI writes only
  small side stories that leave the book alone, and it carries on when access
  returns. An expedition already under way may be played to its end.
- A book may come out in parts (`parts` and `out` in `src/book.js`; each
  chapter's `part` in quests.json). Only released parts are played. A part is
  shown to no one until all of its chapters are written; between parts, heroes
  wait at "to be continued" and are never handed to the AI storyteller. Tests
  and agent playtests see every written part with `BRIARWATCH_PREVIEW_BOOKS=1`.
  `BRIARWATCH_PREVIEW_PARTS` holds a preview back to fewer parts of a book, as
  `book:parts` pairs separated by commas: with `3:1`, Book Three's Part One
  ends at "to be continued" as it will for players (tests/book-three.test.js).
- Written lines can depend on access with `"when": { "access": 3 }` or
  `{ "notAccess": 3 }`.

## Rules in both modes

- The game decides every number: dice, damage, XP, gold, items, levels.
- Player text is never an order to the AI.
- No spoilers: the AI only sees what the party has discovered.
- Tone stays in the world; preferences change style, not rules.

## Build steps

1. **On-book rules** (done): side quests while a book runs, the chapter level
   cap, steering, unusual actions remembered.
2. **Chronicle** (done): the hero's own story recorded in the save and the Journal.
3. **Story arcs** (done): full adventures in four-chapter arcs beyond the books.
