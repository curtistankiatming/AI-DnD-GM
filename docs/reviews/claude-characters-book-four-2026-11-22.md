# Book Four character review (22 November 2026)

Scope: Book Four, levels 40 to 70 (PR #92, branch `claude/project-thread-d2sjb4`
at bfad843), read together with master (Books One to Three, PRs #89 and #91)
and the open PR #93. Characters only: companion voices and timelines, new
names, and whether earlier choices reach Book Four.

## Fixed in this pass

| # | Finding | Fix |
| --- | --- | --- |
| 1 | **Where Biscuit is.** Chapter 7's camp (`key-camp`) has Nessa say "When we go north, he stays here. With Hew", and Hew says "I'll have him". Parts Two and Three put him at the Highpass guardroom brazier, and he runs out of Highpass's gate in chapter 21. Part Two's revisions said "Part One never says so", which was wrong. | Hew minds him while the party is in Cinder Fold, and Nessa says he will stop at Highpass by the guardroom brazier. The three key answers each get their own line. The design doc is corrected. |
| 2 | **Reused name.** The carter in chapter 6 (`b4-book`) lost "my Ada" to the white. Ada Rusk is Book One's echo-stone crew at Kell's Bridge, and Book Three already renamed its Ada for this reason. | She is now Lettice, a name used nowhere else. |
| 3 | **Earlier camp choices never reach Book Four.** None of the flags from PR #91 are read in Book Four. | Four now have a line in the place they belong: `b2:cards` (hospice-camp: Anwen at the card table), `b3_bett` (Bett's Berth: the whaling uncle, or a mackerel in a cloth), `b3_brede_written` (chapter 25: Hollis Brede remembers you spelled Ashford right), `b3_pim_rang` (chapter 23: Pim still rings the quarter late). |
| 4 | **The AI game master learns nothing about Book Four's companion arcs.** `standing.json` stops at Book Three, so once the books run out it would still say Nessa holds the key, even if she gave it to Hew. | 15 new facts for the arc chapters: Nessa's key (7) and her choice about Rue (27), Orin at Sheddon (12) and Sorrel's commission (25), and Maren at Merrowgate (26). Nessa's Book Two and Three key facts drop out once chapter 7 settles the key. Texts that a companion-away answer also sets are worded so they stay true either way. |

Tests: `tests/book-four-characters.test.js` (new, 4 tests), and the chapter 7
camp test in `tests/book-four-part-one.test.js` is updated. Full suite: 1,174
pass, 0 fail, 1 skipped. `npm run check` is clean.

## Added after PR #93 merged

`b3_maren_one_name` (Ysolde's name in the tin lid) now has a line in chapter
14, the House of Letting Go, in Maren's talk:

> There's still one name inside the lid of my button tin. Ysolde Carr, Sixth
> District. Nothing beside it. Yarrow would take it off me in a breath, and I'd
> sleep tonight. I'm keeping it. It isn't an ending. It's a name.

## Checked and consistent

- **Ages and years:** Davin is 16, then 17 by midsummer of Part Three. Mags
  says he was eight on the night of the tide, eight years ago. Bett is 10 in Book
  Three and 11 in Book Four. Hew is nine. Rue is seventeen. Counting back from
  Part Three's midwinter, Elske's recall at the Vote was "three winters ago" and
  Sable's casting was "two winters ago", both right.
- **Orin:** Calder, then Hal going back, as the bible says. His first order is
  chapter 5's "no" to Davin, then Sheddon, then Varn's commission echoed at the
  ford. The knot thread runs from chapter 5 to 21. Lines change with his Book Three
  answers (tried, gives or keeps).
- **Maren:** Elske is at the Sallows hospice in Merrowgate, sentenced to five
  years. Anwen Holt keeps the harbour hospice, and the two of them cheat at
  cards in the same way, as in Book Two. Her lines in chapter 14 change with the
  seal or the day she gave up. Her gift fails on people who believe what they
  say, which is the bible's rule and is used well.
- **Nessa:** `nessa_keeper` has its own lines for "later", "declined" and unset
  in chapters 1 and 7. `b3_wren_refused` falls into the "later" branch (Wren
  keeps the key from a chair, and Nessa's yes is held for her), which matches
  its standing fact. The culvert at nine matches Hew at nine.
- **Elske:** every line that names her either reads the `elske_*` flags, or is
  about the great note (which every save has) or about `mother_recalled`.
- **New names:** Rue, Sloe, Burdock, Yarrow, Sedge, Heath, Teasel, Campion,
  Ailith and Wystan Strake, Linus Pardew, Perrin Rowe, Garth Mott, Annis Corby,
  Merrick, Piers Ashdown, Vetch, Clary, Burnet, Betony, Furze, Madder, Comfrey,
  Bistort and Lovage are all new. Ada was the only name taken from an earlier
  book's person.

## Not changed (for Curtis or the story reviewers)

- **Nessa's voice is calmer.** In Books Two and Three about one Nessa line in
  five breaks off mid-sentence ("Has anyone even—"). In Book Four it is 3 of 116.
  Her sentences are still short, and her arc is learning to stay, so some of
  this is on purpose. A few broken-off lines at the crisis beats (chapters 18,
  27 and 29) would bring her back without undoing the arc.
- **Orin talks longer.** His lines average 22 words, against 12 in Book Three.
  His sentences are still short, and the captain arc earns most of it. Nothing
  changed.
- **Heath, Hesk and Hew** all appear in Book Four and sound alike. Each is
  clear from context, so they are left alone.
- **Side-job endings nobody reads yet:** The Painted Door, The Southern Hand
  and The Lower Town (the design marks them "not yet written"). That belongs
  to the story area, not characters.
- **Choices told in their own book only:** `b2:orin_hal`, `b3_vault_word` and
  `hollin_told` are already told in Books Two and Three and do not need a Book
  Four line.
