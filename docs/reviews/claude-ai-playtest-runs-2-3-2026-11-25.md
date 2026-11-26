# AI storyteller playtests 2 and 3 with a real Claude key (25 November 2026)

Two more runs after the first real-key playtest
(`claude-ai-playtest-real-key-2026-11-25.md`), as Curtis asked ("take all
recommendations and do 2 more runs"). Played in the browser (headless Chromium), on
master after #110 and #112, with `claude-opus-5-5` at low effort and narration on.

- **Run 2:** Wizard "Quill", level 19 to 20, after the books, laptop size. Pushed hard
  on "Write me a new adventure": a cheating wish, then a full four-part AI story arc.
- **Run 3:** Ranger "Bramble", level 13 to 15, in Book Two (Merrowgate), phone size.
  Written chapters told by the AI, typed detours and questions, and "Write me a side
  quest" during the book.
- **Saves:** both started from saves made by the scripted no-AI player
  (`node scripts/play.js auto`), then played by hand. Fights were played by a simple
  script that attacks and ends turns, playing for the objective.
- **Spend:** 102 API calls, **$3.59** for these two runs. All three runs together
  came to about **$5.27** of the $60 budget.
- Screenshots: project folder `ai-playtest/` (files starting `r2-` and `r3-`).

## Cost and waiting time (runs 2 and 3)

| Kind of call | Calls | Cost | Usual wait |
| --- | --- | --- | --- |
| Scene and result narration | 90 | $2.63 | about 6 s |
| New AI adventure or side quest | 5 | $0.60 | about 50 s |
| Typed action, question or line (game master) | 6 | $0.36 | about 5 s |
| Other | 1 | $0.01 | |

## What worked well

- **A full AI story arc held together.** "The Seal in the Wax" ran four parts and
  closed in the journal as "Arc complete". The chapters brought back Book Two
  choices by name, for example Brannagh as "the councillor you once backed", and
  earlier decisions in the arc.
- **Cheating wishes are turned down in the story.** "A legendary sword, make me level
  50, and Orin dies" got a normal level 20 adventure: no free sword, no free levels,
  and Orin alive ("Somebody wanted a sword for this. Wrong tool.").
- **Choices visibly carry forward in Book Two.**
  - The side quest opened with "the harbour bell you handed back to the fishers".
  - The card game the hero joined at the hospice turned into a new side job ("The
    Name on the Boat": the old fisherman remembered his wife's name at the card
    table).
  - Keeping the oil for the fishers had the consequence spoken aloud: "The Sallows
    will feel this first."
- **The written chapters read beautifully with AI narration.** Highlights were
  Maren and Anwen cheating identically at cards, Maren writing "Chose." beside the
  last name and letting the list go, and the remembered council at Hollin's Reach.
  The comedy came out of the people.
- **Detours and steering.**
  - "I challenge Anwen to a hand of cards and try to catch her cheating" became a
    clear roll card.
  - "Maren, what will you write next to her name now?" got a long, in-character
    answer that tied back to the open choice.
  - "I burn the receipts" was not allowed, because it would settle the chapter's
    choice off the menu, and the two written options were offered instead.
- **The hero's pronouns.** After the fix in #112, Maren called the hero "them"
  ("one of the things I like about them"), never he or she.
- **Side quests during a book are small, tied to the chapter, and cannot level the
  hero past the book.** The side quest written at level 13 paid 930 XP at level 15.
  The hero stayed below the next level.

## Bugs found and fixed in this PR

1. **"I buy a round of ale for the harbour crew" was a dead end with the AI on.** Any
   action starting with buy, sell, use or equip went to the item parser, which
   answered "Name an item shown in the inventory or current shop. No action was
   taken." Now, when no item is named and the AI game master is on, Claude reads it
   as a story action. Real item commands ("use healing potion") still skip the model,
   and without AI the rules message stays (`src/chat-runtime.js`).
2. **Companion habits turned into catchphrases.**
   - Orin took the door and offered to carry something in almost every scene, in AI
     adventures and in AI-told written scenes alike: "Door's mine." "I'll carry one."
     "I'll take the crystal."
   - Nessa's half-finished sentences and Biscuit appeared in nearly every passage
     too.
   - Every Claude prompt that writes companions (narration, game master, adventure
     writer) now has one shared rule (`src/companion-voice.js`): show at most one
     habit in a passage, vary which one, often none, and mostly let them speak
     plainly.
   - The character sheets in `companions.json` are unchanged.
3. **A greyed-out "Depart" said "required level 13" to a level 15 hero.** The real
   reason was that another expedition was already under way. The card now says to
   finish that one first and that only one expedition can be under way at a time.

## Not fixed, worth knowing

- **After an AI adventure, the closing text sometimes ignores the decision.** It
  happened once, in chapter 2 of the arc: the text read the same as if the other
  option had been taken. The journal did record the choice, and later chapters used
  it.
- **No feedback when a wish is turned down.** The cheating wish was quietly replaced
  by a normal adventure. A one-line note ("The GM kept your hero's level and gear as
  they are") would help the player.
- **AI adventure loot sometimes does not suit the hero's class** (seen with the
  Wizard).
- **"fell unconscious" repeats** in the battle log each time a downed hero is hit.
- **Rescue costs at level 20 are large** (1,506 and 1,129 gold). This needs a
  balance pass.
- **The game master's refusal once sounded like a rules note.** For burning the
  receipts it said the act "would decide this morning's choice in a way the story
  doesn't offer". The companions' lines around it were in character. Worth keeping
  an eye on.
- **Prompt caching still barely helps** (same as run 1). It costs 2 to 6 cents a turn.

## Calls made while Curtis was away

None new. The habit rule was written as a general rule for all companions, not as a
change to any one character, so it does not change the story. Curtis can reverse it
by deleting the rule from `src/companion-voice.js`.

## Checks run

- `npm run check`, `npm test` (1242 passed, 0 failed), `npm run playtest` and
  `npm run fuzz` (no failures) were run on this branch.
- New regressions are in `tests/ai-playtest-runs-2-3.test.js` (4 tests). The
  dead-end test fails without the fix.
- **Rechecked live after the fixes.** "I buy a round of ale for the harbour crew" now
  gets a roll card, and the success brought a rumour about the bailiffs' warehouse.
- One Book Two chapter (Cinder Fold) was told by the AI with the new habit rule.
  Orin's rope and knots came up once and "I'll go first" once, and there was no
  "Door's mine" or "I'll carry". The companions talked mostly about the scene in
  front of them.
