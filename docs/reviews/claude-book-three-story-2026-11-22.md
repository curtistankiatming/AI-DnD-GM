# Book Three story review (22 November 2026)

An independent read of Book Three, "The Names in the Bronze": all twenty
chapters, every camp scene, the end of Part One and the Part Two epilogue
(`src/data/quests.json`, `src/data/scenes.json`,
`src/data/book-three-part-two/`). Read as a player would meet it, in order,
with every flag variant side by side. Checked against Books One and Two and
`docs/STORY-BIBLE.md`.

## Verdict

Book Three is the strongest writing in the game. It is ready to release once
the continuity slips below are fixed (this PR fixes them). Nothing needs
rewriting.

- **Plot.** One question carries all twenty chapters: what a yes is worth,
  and who pays for a ward. Part One asks it of a city (Vell) and Part Two asks
  it of the free wards (the Hall's market, Wren, Ashford, the witness's seal,
  Hesk's ring). The book ends on the one answer that nobody can buy: one
  memory each, given freely. Each twist is set up fairly. Crane steadies
  Hesk's arm at the top of the vault stair in chapter 8, and the satchel is
  empty in chapter 10. The founders' "Not this way. Ask them all." in
  chapter 12 pays off on the floor of given things in chapter 19.
- **Continuity with Books One and Two.** Book Two flags are read carefully,
  with a line for a save that lacks them: second oath, Elske's three fates,
  wards' seat, Hal's company, Lysa, Fenmere's promise and Haverick. Book One
  is remembered where it should be: the Ashford archive "years after the
  drowning", Wren pulling Nessa out of a drain at nine, Biscuit and the
  bridge, Aster's flat third hour.
- **Pacing.** Part One stays at Vell for much of its length (chapters 5, 6, 8,
  9 and 10). That is right for a book about one city's choice, and chapter 7's
  return home breaks it up. Part Two moves every chapter until the stair. The
  three straight-on chapters (17 to 19) work because each ends on a ledge.
- **Tone.** Story comes first, and the lighter moments come from the people in
  the scene: Dera taking news as payment, Fennick's welcome forms (Biscuit
  entered as "livestock (canine, attached)"), Orin and Tam Ostler bouncing on a
  plank to test each other's knots, and Maren winning fourteen hands of Seven
  Bells and giving everything back. Chapter 8 has no joke, as designed. The
  knot motif, a round turn, two half-hitches and a stopper, ends with Orin
  forgetting the stopper on the stair. It is the best payoff in the book.

## Fixed in this PR

1. **The rite changed length.** Sable's letter is eleven pages in the prison
   ledger (chapter 2), and Corvane shows eleven pages in chapter 5. In
   chapters 8 and 10 it had become nine. Now it is eleven everywhere. A test
   already treated "Eleven pages" as canon, but it only read chapters 4 to 6.
2. **The round key was in two places.** In chapter 10 the key is written into
   the custody ledger at the foot of the pass ("one key, iron, round, on a
   chain"), and Sorrel says it is hers now. Chapter 17 said it was lifted
   "before anything was listed" and that the ledger had it as "not among the
   effects". Now it is listed, and it goes missing from the effects box that
   night, before the ledger reaches Highpass.
3. **Vell's voices were miscounted in the winter letter.** Chapter 16 said
   400, 337 or 190 voices hold Vell. Those were the names on the wall before
   anyone was cast. The bells hold the fifty from the first casting plus those
   cast at the great bell, which is 391, 330 or 186. That matches Sorrel's
   figures at the end of Part One.
4. **Mags remembered the wrong roof.** At Varn's trial (chapter 13) she says
   that Orin asked her "on the salt-hall roof". In every version of chapter 4
   that talk happens on the ridge road above the town, after the tide. Now it
   says so.
5. **Corvane spoke twice.** On a save where the council recalled Elske and
   also took the rope down, Corvane's opening in chapter 9 used both lines,
   one after the other. Now the "recalled" line plays only when the rope is
   still up.
6. **Names that belonged to somebody else.** These are minor characters, so
   the names were changed:
   - Pell Moran, the bound boy in the vault, shared a first name with Pell
     Haverick, who returns in chapter 11. He is now Teo Moran.
   - Anwen Teller, read out from Corvane's ledger, came a chapter before Anwen
     Holt's way is tried at the hospice. She is now Gwen Teller.
   - There were three Hannes. Hanne Ostrow, from Cask and Lindmoor, stays. The
     ninety-year-old in Saltwick is now Nan Coyle. The fourteen-year-old bound
     girl, who was also from Lindmoor, is now Effie Ilvey (Maren's camp line
     too).
   - Tam Hollis, the bound shepherd, was a second Tam beside Tam Ostler, and a
     Hollis beside Reeve Hollis Brede. He is now Hugh Hollis.
   - Hobb Garland, the Briarwatch farmer in chapter 7, shared a name with Old
     Hobb from Book One. He is now Edwin Garland.
   - The widow Marsh, a Briarwatch farmer, was a second Marsh beside Ella
     Marsh. She is now the widow Dorley.
7. **Small wording fixes.**
   - "Corvane's letter from the free wards" (it is the council's letter for
     him) is now "The free wards' letter for Corvane".
   - "Hesk comes up the stair the hero of the free wards" read like a slip. It
     is now "Hesk comes up the stair, and the free wards call him their hero".
   - Oswin Pike "has not needed [the keys] since the autumn" is now "since the
     summer", which is when the vault was opened.
8. **A carried-over follow-up.** If you told Aster you would hear her first
   (`b3_asked_aster`), she now says so on the road to Sable in chapter 2: "You
   made Corvane wait for me."

Test: `tests/book-three.test.js`, "Book Three story review". Chapter 16's
test now expects the corrected counts, and chapter 17's test the new key
line. `docs/book-three/DESIGN-PART-TWO.md` is updated to match.

## Noted, not changed

- **Jory.** Ysolde's brother Jory Carr shares a first name with Jory Tanner,
  the seed-cart driver in Book One's opening chapters. They are far apart and
  in different families. Renaming him would touch a whole side job, so I left
  it.
- **Kettle Cross and Kettle Down.** Roke sleeps on the roofs of Kettle Cross
  (chapter 1), and Cass Ord lists Kettle Down among her castings (chapter 11).
  Each is named only once, so I left both.
- **Tam Ostler and Tam Orrey.** The Saltwick lamplighter shares a first name
  with Fenmere's baker in Book Two's ward scene. It is a common name in a
  different book, so I left it.
- **Saltwick's town page.** After `b3_saltwick_moved` the page still describes
  a town on its roofs (the TODO in `docs/book-three/DESIGN.md`). The only
  mechanism the game has is Vell's `emptied` page, which also closes the shop.
  Saltwick has its own gear, so this belongs to the systems and items threads,
  not to a story fix.
