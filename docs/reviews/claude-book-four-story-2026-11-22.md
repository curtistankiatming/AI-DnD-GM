# Book Four story review (22 November 2026)

An independent read of Book Four, "The Long Tally": all thirty chapters, every
camp, the three part-end scenes and the Wold's side jobs
(`src/data/book-four/`), on the Parts Two and Three branch (PR #92) with Part
One from master (PR #88). I read it as a player meets it, in order, with every
flag variant side by side, and checked it against Books One to Three and
`docs/book-four/DESIGN.md`.

## Verdict

Book Four is ready for Curtis once the deadline slip below is fixed (this PR
fixes it). Nothing needs rewriting.

- **Plot.** The book asks a single question: who pays for the free wards'
  warm winters? The answer comes in three parts. Part One follows the line
  south through Ashford, Briarwatch, Merrowgate, Saltwick, Highpass, Cinder
  Fold and Vell. Part Two crosses into the Wold that pays. Part Three brings the
  bill home: Iona's invoice, the reading at Highpass, and the night at Cinder
  Fold. The final choice (share, bring them south, Sloe's note) is set up
  fairly, and the founders' "Not this way" pays off as the forward marks
  scratched through on the Parting Bell.
- **Choices matter.** Almost every decision flag is read again later, often
  many chapters on. A few are read only once, in a camp or a part-end scene.
  These are fine as they are, and are listed under follow-ups in case Curtis
  wants more echo.
- **Continuity.** Book Three flags are gated with care, each with a line for a
  save that lacks them. These include the bell's keeper (Aster, Vell, the
  rest), Hesk's ring, the sealed stair, the thirty-one in the vault, Wren,
  Sable and Orin's knot. Sorrel, Hollin's Reach and Biscuit all match canon.
- **Pacing.** Part One moves every chapter. Part Two slows in the right place:
  Orme, Greve and Thrum, three quiet chapters, before the vote. Part Three
  runs from spring to midwinter and then goes straight on through chapters 28
  to 30, each ending on a ledge, which works.
- **Tone.** Story comes first. The lighter moments come from the people in the
  scene: Burdock's corrections, Iona's invoice with its "Held to midwinter",
  Linus singing the old verse louder because they asked, Davin writing
  everything on the slate. Sloe is the best new character in the game, and
  Rue's ending under Sloe's note ("YOU ARE RUE. YOU ARE OUR FRIEND.") lands.

## Fixed in this PR

- **Sloe's deadline passed silently.** In chapter 16 (The Reckoner's Sum),
  Sloe said she would ring the Parting Bell backward "at midwinter". But
  chapter 16 happens in the Wold's winter, chapters 17 to 20 cross that
  winter, and chapter 21 opens in early spring. So her deadline came and went
  without a word. Part Three (chapters 22 to 30) then uses the following
  midwinter. The chapter now says so: "Not this midwinter. The road south is
  shut until the thaw, and a sum must be heard before it can be answered. The
  next one." The tally-guard hold the southerners "until the thaw opens the
  road" instead of until midwinter. The design doc is updated to match, and a
  test in `tests/book-four-part-two.test.js` keeps chapter 16 on the next
  midwinter.

## Follow-ups (not errors, for Curtis to decide)

- **Flags read only once.** `b4_book_returned` (its camp),
  `b4_unannounced` (end of Part One), `b4_envoys_only` (end of Part Two),
  `b4_accused_quiet` (chapter 22), `b4_voice_quiet` (the final scene),
  `b4_embassy_own` (chapter 16) and `b4_sable_silent` (chapter 29). Each one
  pays off. A second echo, for example in the final epilogue, would make
  these choices feel bigger.
- **Chapter 5, Orin's lamp season.** Orin's lamp season "ends tomorrow",
  although he has travelled with the party through chapters 2 to 4. That
  can be read as him going back for the last night. One line could make it
  explicit.
