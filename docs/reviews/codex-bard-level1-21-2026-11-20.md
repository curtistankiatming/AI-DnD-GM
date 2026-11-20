# Briarwatch from level 1 to 21, bard playtest, 20 November 2026

## What I played

- **Build** `0b23481b293a8519a5b07577c23fe7f05d92e622` (`0b23481`) on `master`, using Node.js v24.22.1. It includes the fixes from the [fourth Book Two review](codex-bard-book-two-fourth-run-2026-11-20.md).
- **Hero** Tansy, a fresh **Bard**, seed **11**. I created the level 1 save in the Briarwatch square with `node scripts/play.js new --class bard --name Tansy --seed 11`. Tansy kept the starting rapier, took Field Expert and Endurance, and learned Performance at level 6. Nessa joined through the guild at level 3 with her equipment.
- **Finish** Level **21** at **79,617 XP**, **82/125 HP**, and **5,804 gold** in Briarwatch. All three companions were level 21. Both books and the epilogue were complete. Tansy earned **Song of Rest** at 10 and became a **Lorekeeper** at 20. I started the three companion requests before their missions, then saved their earned turn-ins for after the epilogue. Each paid 810 XP, and Nessa's was the one that crossed the level 21 threshold. Their combat combinations were unavailable during the written campaign because I deferred the turn-ins.
- **Turns** 280 actions on the main save. Those were 151 manual story choices, 43 other manual actions, six manual combat actions, and 80 `auto 1` actions in active combat. I made all story decisions. The main save used no `jump`, API, save edits, or fixture. The sample handoff below was played on a separate copy.

| Milestone | Turn | What Tansy did |
| --- | ---: | --- |
| Briarwatch's bell | 25 | Spared Lysa, took the cipher ledger, and exposed Sable. His followers freed Aster Vey and surrendered him alive. |
| Level 10 | 99 | Returned the toll money, backed Fenmere's engineers, called a tribunal over the bridge orders, guarded the archive, prioritized supply trains, and left the wards independent. |
| Oath and convoy | 113 and 132 | Swore to the companions, used Song of Rest to heal all four party members in the convoy, and started a voluntary patrol. |
| Book Two through the epilogue | 133–276 | Took Merrowgate's loan, sent Hal to the guild, gave the harbour bell to its keepers, shared the lamp receipts with Elske, and voted yes on granting her emergency authority. Later Tansy locked away the Mother Bell rope, asked the council to judge Elske, and swore to answer to the council. |
| Level 21 | 280 | Took Lorekeeper on turn 277, then turned in Orin's, Maren's, and Nessa's personal requests. XP went from 77,187 to 77,997, then 78,807, then 79,617. |

## Findings

### 1. The tollhouse offers evidence from a route Tansy skipped

- **Where** `q-road-approach` / `direct` into `q-road-crisis` / `resolve`, turn 32, with `investigate` skipped.
- **What** Tansy walked straight to the tollhouse without searching the manifest or taking the passage below. The resulting choice was “Use the duplicate receipts to make the guards stand down.” It succeeded at DC 17 and the guards read the documents. The save contained no road lead, and the direct-route narration never handed over a set of papers. Captain Venn also offered to release the wagons if the party left “the documents” as soon as we arrived.
- **Why it matters** The first expedition teaches how preparation affects negotiations. This resolution works because the fiction assumes Tansy prepared anyway.
- **Suggestion** Give an unprepared party a different argument, or put a receipt in the yard where Tansy can discover it during the successful parley. Tie Venn's opening demand to actual papers or to the wagon drivers.
- **Severity** Major.

### 2. Maren's delayed reflection brings back the list she discarded

- **Where** `scene-oath-epilogue-forge`, then Briarwatch's `resolve-personal` for Maren, turn 279.
- **What** The epilogue says “Maren's list is gone; she let it go in Merrowgate harbour” and explains that the new list records living patients. I then turned in the completed archive request in Briarwatch. The scene jumps to Hesper at the Highpass dyers' yard and says Maren “finds Edric’s name on her list” and writes “delivered.” The board still offered the reflection, and the 810 XP and Watchful reward applied.
- **Why it matters** Finishing an old quest after the epilogue can undo the gesture that closed Maren's story.
- **Suggestion** For a late turn-in, tell the delivery as a remembered visit, or have Maren write a separate note for Hesper that can exist after the old list is gone.
- **Severity** Minor.

### 3. Sparing Lysa has no Book Two scene on this route

- **Where** `ambush-aftermath` / `offer-mercy`, then The Harbour Bell at `q-harbour-start` and the remaining Book Two chapters.
- **What** The vault ending said “Lysa survived to testify about the cult.” Tansy retained that choice, met the Lantern Guild's leader and Hal in Merrowgate, and completed the book. Lysa did not appear or get mentioned. The story bible describes her working for the guild after being spared and gives the player a chance to turn her again.
- **Why it matters** Lysa is one of the first people whose fate the player can change. Her return would link the two books through a choice about whom to trust.
- **Suggestion** Bring her into the harbour search when the hero spared her, or revise the story bible if her testimony at the end of the opening chapter is meant to finish that thread.
- **Severity** Minor.

## Separate level 21 handoff check

I copied the level 20 save at turn 277 and ran `node scripts/play.js commission-sample` after resting. The command marked the copy as a fixture and posted **The Salt Choir**. I played it at Normal difficulty using its objective route. Two uses of **Unravel** took the sluice from zero to four steps across two combat turns, with no objective rolls. The fight paid 680 XP and the expedition paid 1,690 XP. The copy returned to Ashford at **level 21** and **79,557 XP** on turn **288**. The chronicle recorded one chapter, *The Salt Choir*, and the choice to name the responsible guild. The fight and choice were manual. The sample text gave the player no guild name at any point, even though the last choice is “Name the guild that caused the flood.” A name in the investigation or consequence would let the public accusation land. This finding is about the bundled sample.

## What held up across the full campaign

Fenmere's new unprepared route worked in play. Ilka said she had only three verses, and Tansy's successful Performance check brought the churchyard into the song while a girl supplied the missing one. It felt like a result a bard had earned. At the final hearing, the failed social approach cost no health, and the hammer and ladder gave the ensuing fight a clear physical threat. The terminal's `look` recovered the setup, and the winning `auto 1` printed the authored result at Hollin's Reach, the Mother Bell, and the hearing. The vote and Mother Bell persuasion checks both failed on this route, so I saw their combat paths. The locked-rope hearing also ended in combat.

The dialogue across the bridge camp and Mother Bell gave the long run a sense of time passing. Tansy's “Sometimes they do” cost Maren a point of approval and gained one with Orin. Both replies felt right for them. Nessa's impatience with Wren becomes care when she learns to slow down on the stairs. The terrible stew is funny on the bridge night and touching when Orin holds out his bowl before the Mother Bell. Early fights were short, and the level rewards and advancing chapters kept the pace. The main save had no defeats or retreats.

## Evidence

The local save, transcripts, and turn-by-turn command logs are under `.playtest/` in the review worktree. I checked all authored quest completions, level and XP totals, companion rewards, job skills, and the sample chronicle in the saved state. The full `npm test` suite passed **673 tests**, with one expected skip.

## Three things to keep

1. **The first oath remembers the actual choices.** Orin brings up the tribunal, Maren remembers the guarded archive, and Nessa admits the supply trains kept the pass fed. The advancement scene gives three people reasons to remember the same road differently.
2. **Fenmere lets an unprepared bard listen.** Ilka admits she has lost the verse, a child starts singing, and the whole churchyard follows. The corrected branch gives the village agency and makes the successful check feel earned.
3. **Orin lets Hal hold the door.** Tansy's earlier advice to sign with the guild comes back when Hal takes off its coat and changes sides. Orin's “Terrible. I'd like to do it again” carries the bridge camp's promise all the way to Cinder Fold.
