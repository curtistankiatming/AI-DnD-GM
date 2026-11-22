# Character review, Book Three (Claude, 22 November 2026)

An independent review of the people in Book Three, "The Names in the Bronze"
(levels 20 to 40, both parts, merged in PR #69). It checks the companions and
the named NPCs against Books One and Two, `docs/STORY-BIBLE.md` and the
earlier review `docs/reviews/claude-characters-2026-11-21.md`: voices, arcs,
motives, name clashes and one-liner characters.

## What was read

Every Book Three line, dumped with its speaker and `when` condition: chapters
`b3-letter` to `b3-paid` and the Part One camp scenes and side jobs in
`src/data/quests.json`, `scenes.json` and `side-jobs.json`; all of
`src/data/book-three-part-two/`. Companion lines were read in full; NPC lines
were read for the main cast (Corvane, Aster Vey, Sable, Fennick, Hesk, Mags
Peller, Ysolde) and sampled for the rest. Names were checked by machine
against every Book One and Two string. This is a reading review, not a
playtest.

## Verdict

The cast is the strongest in the game so far. Orin, Maren and Nessa each get
a story chapter that turns their Book One want inside out: Orin meets the town
he left, Maren meets the limit of her gift four hundred times, and Nessa
meets someone who chooses the thing she cannot bear. The voices hold (Orin's
short sentences and knots, Maren's precise questions and cards, Nessa's
broken-off sentences and letters she doesn't send). Corvane, Aster Vey, Sable
and Fennick each have a want and a scene that changes them, and nobody
important is only a joke. The problems were continuity, not character.

| # | Finding | Fixed |
| --- | --- | --- |
| 1 | **Orin's past happens twice, eight years ago, in two different companies.** Book One: "Eight years ago we held a ford at Calder" with the Second Company; Hal went back, Orin didn't. Book Three: eight years ago he was in Odell Varn's hired road company at Saltwick, and calls it the meaning of "we left civilians behind once". Both stood unreconciled. | Yes. Orin now says the player thought he meant Calder and he let them: Saltwick was that spring, he signed for the Second Company that summer because he thought a proper company wouldn't do it, and then it did. "Twice in one year. Not once. Calder was the one I could tell, because Hal was in it." His camp line now goes to the guild "after Calder". |
| 2 | **Jory reused.** Book One's first chapter has Jory Tanner, the driver; Book Three's Jory Carr is Ysolde's brother. | Ysolde's brother is now Hugh Carr (also the side-job giver). |
| 3 | **Tam reused three times.** Tam Orrey is the Fenmere baker who never came back (Book One); Book Three added Tam Ostler (Saltwick lamplighter) and Tam Hollis (a bell in the vault). | Kester Ostler and Owen Pask. |
| 4 | **Pell reused.** Pell Moran (the boy in bell Thirty-One) shares a first name with Book Two's Pell Haverick. | Ewan Moran. |
| 5 | **Three Hannes in one book,** two of them from Lindmoor: Hanne Ostrow (the mother at the pass), Hanne Coyle (ninety, Saltwick; Coyle is also Haverick's fixer in Book Two) and Hanne Ilvey (fourteen, the vault, and Maren's line in the vault camp scene). | Hanne Ostrow kept; the others are Nan Dobbin and Mae Ilvey. |
| 6 | **Ada reused.** Ada Rusk is the mother in Book Two's Letters job; Book Three added Ada Marrin (the census puzzle) and Ada Brennick (Corvane's list), and the Brennick surname twice (the list and Joss Brennick, the Saltwick carter). | Joan Marrin; the family on Corvane's list is now Mallory. |
| 7 | **Two Hobbs in Briarwatch.** Old Hobb the baker sits on the council (Book One); Book Three's Hobb Garland is a Briarwatch farmer "who has known you since the bell". | Abner Garland. |
| 8 | **Smaller reuses on lists:** Edda Vane (Edda runs the relic merchant), Anwen Teller (Anwen Holt is Maren's teacher), Joss Marley (next to Joss Brennick), Tobin Marrin (one letter from Tovin). | Marta Vane, Rosa Teller, Dunstan Marley, Alfie Marrin. |

All renames touch Book Three text only. Books One and Two are unchanged, and
no flag, id or save field uses these names.

## Checked and fine

- **Arcs.** Orin's Saltwick thread runs from the letter camp ("We left. That's
  the whole of it") through the roof, Mags's "I'm thinking about it", the
  trial in Part Two and the stair. Maren's gift is tested exactly where the
  bible says it fails (people who believe what they say, and Aster's voice
  with no breath). Nessa's Ysolde choice feeds Aster's ask and her chapter
  with Wren.
- **Nessa's epilogue choice** is untouched (still waiting on Curtis). Book
  Three's Wren chapter already branches on `is: "later"`.
- **Ages.** Davin was six on the Saltwick night and is fourteen, then
  fifteen. Nessa was nine in the culvert, and Wren's "twenty years" fits a
  woman of about thirty. Maren: gift woke at nine, novice at sixteen, Sister
  Corra taken when she was nineteen. All consistent.
- **The Hesper clash** from the last review is fixed (Sister Corra).
- **Absent companions.** Lines that need a companion are gated with `party`
  and have `absent` versions where the scene needs one.

## Left open (not changed)

- **Factor Ansel Crane** (Lantern Hall, Part One and Two) shares a surname
  with Book Two's Lenora and Davy Crane. Both are from Merrowgate, so it can
  read as a family; left as is.
- **Speaker labels vary between parts:** "Hesk" in Part One and "Idris Hesk"
  in Part Two, the same for Aveline/Reeve Aveline, Elske/Elske Marrow,
  Ysolde/Ysolde Carr and Varn/Odell Varn. Each is consistent within a
  chapter, so it is polish.
- **Orin "stood in shield walls twenty years"** and also "never had good pay"
  eight years ago in a hired company. That is possible (militia before), but
  nothing says so.
