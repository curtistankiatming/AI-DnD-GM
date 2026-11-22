# Choices that matter: Nessa's answer, and where choices are still cosmetic (22 November 2026)

Curtis, 22 November 2026: "Players choices should matter and impact story."
This answers the open question in `claude-characters-2026-11-21.md` ("Nessa's
epilogue choice has one answer") and lists the other places where a choice
changes nothing later.

Tested source: branch `claude/project-thread-3kziiq` from master `df6ff80`.
Node 22, offline, no AI calls.

## What changed

### Nessa's answer about Wren's post (Book Two epilogue)

Before: "Ask Nessa what she has decided" always gave the same long yes
(`nessa_keeper = "later"`). The player had no say.

Now Nessa puts two letters on Dera's bench, a yes and a no, and asks the hero
what they would send. Her answer depends on what the hero says and on what
happened earlier:

| The hero says | She sends | Depends on |
| --- | --- | --- |
| "Send the yes. She chose you." | the yes (`later`) | nothing: it was her leaning already |
| "Send the no. Stay on the road with us." | the no (`declined`) if she trusts the hero (bond 3 or more), otherwise the yes, stung ("You don't get to pick for me") | how the hero treated her all book |
| "It isn't mine to say. Send the one you mean." (+1 bond) | the no if she has settled her debt to Wren (heard "this isn't a bill" at Wren's table **and** brought Wren's map back herself), otherwise the yes ("Some of it's still owing her") | two Cinder Fold choices |

"Sit by Dera's fire" still leaves her undecided, as before. She never leaves
the party (both reviewers in the earlier round agreed on that; Book Three needs
her in chapters 5, 12 and 19).

Two smaller things feed the scene: whether the hero handed Nessa the taper on
the peak stairs or let Wren light the beacon (that camp choice used to change
nothing; it now sets `b2:beacon`), and, if the hero skipped Wren's table, Nessa
now explains what the post is instead of referring to an offer the player never
saw (a small existing bug).

### The no carries forward

- **Book Three, Wren's Bell (chapter 12).** With a sent no, Wren has it pinned
  to her door ("Best letter you ever sent me. First one you ever sealed"), and
  the minutes say she told the committee she would not ask a second time, which
  Ottilie says was half the reason for the vote. Nessa answers in each of the
  three decisions in her own way (she offers to take it back at the mould and
  Wren refuses; "I said no to your post, I never said no to you"; she takes a
  rope on the winter roster but not the signal). Without Nessa, the minutes say
  "asked once".
- **The letter night and Book Three's epilogue** each have a "no" line.
- **Book Four design** (`docs/book-four/DESIGN.md`) now covers `declined`:
  nobody offers her the key again, and the chapter 7 choice is hers to make to
  the committee.

### Choices now reach the AI game master and the Journal

Scene choices (unlike chapter decisions) were never shown to the AI. A new data
file, `src/data/standing.json`, lists facts that follow from the written
choices, checked like a written line's `when`. They are sent to the AI as
`hero.standing` and `party[].standing` (director prompt and the chat context
when Claude is the provider) and shown on the companion's Journal entry. It
holds the hero's Second Oath and every state of Nessa's answer, including how
Book Three's Wren decision turned out.

## Where choices are still cosmetic

Found by a script that lists every flag the content sets and every flag it
reads (`when`, `requires`, `flagsIf`, `flagScale`, and the engine code).

1. **Hollin's Reach (Book Two, chapter 7): "Tell Elske what you saw" vs "Say
   nothing".** `hollin_told` / `hollin_kept` are never read. This is the
   biggest gap: it is a chapter's final decision about Elske, and Elske's
   charge, the vote and the epilogue never react to it.
2. **Eight camp scenes whose options are pure flavour** (same approval, no
   flag): southroad-camp (Orin's story), keeper-cards (cards with Maren),
   vault-camp, price-camp, order-mags, ashford-camp, seal-sable,
   winter-camp. These are quiet moments where the choice is how the hero
   spends the evening; that is fine as written, but none of them is ever
   remembered.
3. **Fourteen more camp scenes change only approval.** Approval does matter
   (walkouts, bond-gated lines, and now Nessa's answer), but no line ever
   recalls what was said. The ones with the most weight: Orin's Saltwick
   question in the letter camp ("Then not tonight" vs "What happened at
   Saltwick?"), the harbour invoice, and the Hollin camp.
4. **Maren's and Orin's outcomes do not reach the AI yet.** Maren's list
   (`keeper-list-done`), Orin's Saltwick sentence (`b3_orin_tried`,
   `b3_mags_forgives`) and the "gives" memories in the deep
   (`b3_*_gives`) are read by later books but not told to the AI game master.
   Adding them is one line each in `standing.json`.
5. **Chapter decisions reach the AI only as a label.** The director prompt gets
   the chosen decision's label per chapter (last 15), not what followed from it.

Suggested next steps, in order: give Hollin's Reach a payoff at the vote
(Elske's line already branches on `keeper_told_elske`); add Maren's and Orin's
standing entries; then let two or three of the approval-only camp choices set a
flag that a later line recalls.

## Tests

- `tests/book-two.test.js`: the letters scene, each answer, the trust and
  history conditions, Maren absent.
- `tests/book-three-part-two.test.js`: Wren's Bell after a no, in each
  decision, with and without Nessa.
- `tests/choices-carry-forward.test.js`: standing facts in the AI prompt and
  the Journal, Book Three's letter night and epilogue.
- `npm run check`, `npm test` (971 tests), `npm run playtest` (108 campaigns,
  no errors), `npm run fuzz` (no failures), and the playtest with Book Three
  previewed. A scripted run through Book Two with each of the three answers
  (9 runs per answer) gave `later` / `declined` / `later` as expected for
  those saves (the scripted players never sit at Wren's table, so "the one you
  mean" gives the yes).

Limitations: no browser play-through of the new scene; the AI side was checked
by reading the prompt JSON, not with a live model.
