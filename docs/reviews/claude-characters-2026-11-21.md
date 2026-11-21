# Character review, Books One and Two (Claude, 21 November 2026)

An independent review of the people in the free storyline after the Book One
rewrite (PRs #52, #55, #58, #59): the three companions and the key NPCs, judged
against `docs/STORY-BIBLE.md` ("The cast" and "Tone"). A separate review covers
plot and story; this one asks only whether each person is distinct, consistent
and human, whether their arcs land, and whether walkouts and relationships make
sense.

## What was read

Every written line of Books One and Two, read as text, not played:
`src/data/quests.json` (chapters `road` to `oath`, Book Three skipped),
`scenes.json` (all Book One and Two camp scenes and the epilogue),
`side-jobs.json` (the eight Book Two jobs), `away.json` (all walk-out, stay and
return scenes), `personal.json`, `story-nodes.json` (the first story) and
`companions.json`. Lines were dumped with their `when` conditions so that
absent-companion variants could be checked. Line filtering was checked in
`src/expansion.js` (`lineApplies`: a companion's line is skipped when they are
not in the party). No dice were rolled and no fixture was played, so this is a
reading review, not a playtest.

## Verdict

The cast is in good shape. Orin, Maren, Brannagh, Iona, Aveline, Elske, Hal,
Wren and Anwen all have a voice you could pick out with the names covered, a
want, and at least one scene where they are funny or hurt because of who they
are rather than because the scene needed a joke. Orin's guilt-to-trust arc and
Maren's list both land well. The walkout scenes are among the best writing in
the game: each companion leaves and comes back in their own voice, and the
"stay" variants give each a reason that fits.

The problems found were small, and most were fixed in this branch:

| # | Finding | Fixed |
| --- | --- | --- |
| 1 | **Maren's last open thread never lands.** The bible gives her "whether Elske's name goes on her list"; nothing in the oath or the epilogue mentions it. | Yes: the epilogue now puts Elske on Maren's new list ("comes every week, and reads to them") or, if Maren kept the old one, below the empty space with nothing written yet ("Elske isn't finished"), echoing the archivist in Book One. |
| 2 | **Nessa's want has no backstory.** "To prove she is more than the kid her mentor rescued" is never said in the text, so her choice about the keeper's post reads as a job offer, not a turning point. | Yes: at Wren's table Wren names the rescue (a drain culvert under the Highpass road, aged nine) and tells her the post "isn't a bill". Nessa admits "some of it". |
| 3 | **Nessa is surprised Wren is at Cinder Fold,** though the chapter brief and her own "stay" scene both say Wren is there. | Yes: she now says she heard about the new signal-keeper with a stick and knew it was Wren. |
| 4 | **Elske says "I didn't know" at the vote even when you gave her the lamp receipts.** That contradicts her own words in the Sallows ("I can't break with him before the vote"). | Yes: with `keeper_told_elske` she owns it: she kept Haverick on for his money. |
| 5 | **Iona repeats herself.** Her reason for backing the Warden ("tied to a chair for a day...") appears almost word for word in the harbour camp scene and again in the next chapter. | Yes: the second time she gives a quartermaster's reason instead (she has read the proposal four times and the recall clause is better drafted than Ashford's charter). |
| 6 | **"Noted" is a running gag that does not change.** Iona says it, or writes it, eight times in Book Two, and the miners' chairwoman borrows it once. The bible: "A joke returns only if it has changed." | Trimmed four (the store-room, the auction win, the harbour camp, the miners' minutes). Kept the receipt where it starts, the kidnapping, the flue, the coach ledger and the epilogue, where it finally means the council was quick. |
| 7 | **Maren's lie-hearing never meets its limit.** The bible says it fails on people who believe what they say, which is exactly Elske; at the Mother Bell Maren repeated her Book One line about Corvane ("Every word"). | Yes: she now says she listened for the lie all year and there was never going to be one. |
| 8 | **Orin and Nessa never become "the pair who trust each other most in a fight"** (bible), though they start as opposites. | Yes: one exchange after the Mother Bell door ("You never looked round once." / "Didn't need to."), only when Nessa and Orin are both in the party. |
| 9 | **Several voices share one tic,** "Ask me when..." (Orin, Aveline, Dera). Orin's ("Ask me in a year") and Aveline's (sleep) are their own running threads. | Dera's changed to "Not in front of the customers." |
| 10 | **`companions.json` describes Orin as someone who "treats retreat as a tool, not a shame",** the opposite of his arc, and the other personalities do not match the bible's voices. This text is shown in the party view and given to the narrator. | Yes: all three personalities now match the bible's voice, flaw and lighter side, and Orin's summary matches his arc. Old saves keep the text they were created with (companions are copied at recruitment). |
| 11 | **The bible says Hal "owes Orin";** the text says the reverse (she went back at Calder, he did not). The text is better. | Bible updated. |

## Checked and fine

- **Absent companions.** Lines spoken by a missing companion are skipped by the
  engine, and the replies to them are already guarded with `when`. No line was
  found that has a companion speak, or be spoken to, while away.
- **Walkouts.** Orin loads carts, Maren sits in a shrine, Nessa leaves a
  finished letter and takes Biscuit, as the bible says; each "stay" reason fits
  the chapter it names (Kell's Bridge, Anwen's note, Wren). The Maren "stay"
  before the Sallows mentions Anwen's note before the chapter's opening reads it
  out; since that scene plays the evening after the auction and the note came
  that morning, it reads in order.
- **Ages and dates.** Elske was thirty at Hollin's Reach eleven years ago; Wren
  is sixty and Nessa about thirty ("thirty years apart"); Brannagh is seventy;
  Calder was eight years ago. All consistent.
- **One-liners.** Nobody important is only a joke. Brannagh's goat is the
  closest, and Fenmere gives it its reason (and the bakery scene gives her grief
  without a word about it). Dera now has opinions about the vote, not only the
  goat.
- **Elske.** Her case is strong and her secret lands twice (the memory, and her
  own words if told). She is never fought as a boss.

## Left open (not fixed here)

- **Haverick is only on stage once** in this branch's text (the Lantern Hall at
  noon), and **Wren's map** ("Bring it back better") is never brought back.
  Both are being handled by the story review (branch
  `claude/project-thread-h460xs`: a Haverick scene in the oath chapter, and
  `wren_map_nessa` / `wren_map_hero` flags with a payoff at Wren's table). That
  branch and this one merge without conflicts.
- **Nessa's epilogue choice has one answer** ("yes, but not yet"). The bible
  allows a permanent parting only in the epilogue; adding a second answer would
  change Book Three's cast, so it is left for Curtis.
- **Book Three name clash** (outside this review's scope): the Book Three camp
  scene after the letter names "Sister Hesper", a keeper of Upper Morrow taken
  for service; Book One already has Hesper Moss, Edric's sister at the dyers'
  yard in Highpass. Passed to the Book Three thread.
- **The AI storyteller does not receive the companions' voices.** The director
  prompt (`src/director.js`) gets the chronicle's cast but not Orin, Maren and
  Nessa's personalities, so voices may drift after the books. A system change,
  passed on for the systems review.
