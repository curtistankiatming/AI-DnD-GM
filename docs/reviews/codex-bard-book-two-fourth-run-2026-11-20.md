# The Council of Small Voices, fourth bard playtest, 20 November 2026

## What I played

- **Build** `1e66de53c743ac32dd331d146d01abf9774693fb` (`1e66de5`), on `master`, with Node.js v24.22.1. This includes the changes from the [third Book Two review](codex-bard-book-two-third-run-2026-11-19.md).
- **Hero** Lark, Bard, seed **2**, from a copy of the original level 10 save in Highpass Watch at turn 139. I swore to protect people who could not hold the road themselves, used Song of Rest in the relief convoy, and left local keepers in charge. Book Two started on turn 167.
- **Finish** All ten chapters and the epilogue. Lark ended in Briarwatch at **level 20**, with **78,281 XP**, **123/123 HP**, and **5,491 gold**. I chose **Envoy** and verified that Lark learned **Parley** in town.
- **Turns** 192 new actions, ending at turn **331**. The lead-in took 27, Book Two through the epilogue took 164, and the job took one. These were 90 manual story choices, 18 other manual actions, four manual combat actions, and 80 `auto 1` actions across eight active fights, including the convoy. All story decisions were manual. I used the terminal, with no `jump`, AI, fixtures, or save edits.

| Chapter | Main decision | Completion turn | Level after |
| --- | --- | ---: | ---: |
| The Chair Problem | Backed Brannagh's plan for towns to share the cost | 184 | 11 |
| Fenmere Under the Gloam | Promised to reclaim the lower village and fetched Brannagh for Tam's ward | 202 | 12 |
| The Long Road South | Held the bridge and asked Hal to serve the council | 219 | 13 |
| The Harbour Bell | Rescued Iona in a fight and exposed Haverick at the auction | 238 | 14 |
| The Last Name on the List | Kept the patients remembering and gave the receipts to Elske | 248 | 15 |
| Hollin's Reach | Rang the bell in the memory and left Elske to tell her own story | 274 | 16 |
| Cinder Fold | Held the lid, promised Aster a seat, and handed Nessa the taper | 293 | 17 |
| The Vote | Spoke in the square without investigating, then signaled no to Brannagh | 301 | 18 |
| The Mother Bell | Tried persuasion without a lead, held the doors in battle, and locked away the rope | 319 | 19 |
| The Second Oath | Answered plainly without reflection, persuaded Elske, and gave her a council seat | 327 | 20 |

I swore the Second Oath to Briarwatch and walked with Nessa to send her letter. The selected route included seven objective fights in Book Two and reached every chapter on its intended level. For comparison I copied checkpoints to replay the hearing fight, test a failed speech from the previous run's naturally reached save, and check the lawful Warden's hearing after intervening directly at the Mother Bell. These were short replays outside the main turn count.

## Findings

### 1. A successful vote speech gives Lark evidence the player never found

- **Where** `q-vote-start` / skipped `investigate`, then `q-vote-crisis` / `resolve`, turn 300.
- **What** Lark asked Sable and Brannagh about the vote, skipped the inquiry about the visitors, and went door to door with Aveline. The inquiry's lead was absent from the save. A successful roll at DC 23 still said I told Briarwatch “exactly who the carters are and who paid them,” then named the Lantern Hall. The approach had only shown how the carters behaved and how Aveline prepared the households. At Fenmere, skipping investigation likewise let Ilka say “I have the verse” after telling Lark she had forgotten it. Moments later the song faltered at “the missing line.”
- **Why it matters** The extra difficulty makes an improvised peaceful solution fair mechanically. Its writing still credits the player with work they chose to skip.
- **Suggestion** Keep the prepared version with the specific accusation. Without the clue, let Lark win over the crowd by pointing to the disruption in front of them, or have someone identify the guild mark during the speech. Give Ilka a hesitant line about the missing verse if the player goes straight to the crisis.
- **Severity** Major.

### 2. Peaceful persuasion puts Elske beside the locked-away rope

- **Where** `q-motherbell-after` / `silence` into `q-oath-crisis` / successful `resolve`, turn 326.
- **What** The opening correctly says the rope is coiled behind a lock and puts Elske at the foot of the ladder, with a forge hammer nearby. Lark skipped reflection, answered plainly, and succeeded exactly at DC 25. The result then says “Elske stands by the rope for a long time” before she sits down.
- **Why it matters** The rewrite gives the player a clear picture of what Elske might do, then discards it at the moment she chooses to stand down.
- **Suggestion** On the silenced route, let her look up at the beam or pause by the ladder before taking the chair.
- **Severity** Minor.

### 3. Combat shortcuts can hide the action that resolves a chapter

- **Where** `q-hollin-crisis` and `q-oath-crisis`, on the last `auto 1` action. Also `look` after taking the hearing's `objective` choice.
- **What** At Hollin's Reach the final automated objective printed its command and jumped to “You come out of the council house into an ordinary grey afternoon.” It skipped the bell ringing and ending the memory. At the hearing I replayed the same fight twice. Finishing with `fight objective` showed “You reach her first. Your hand closes over hers. She lets go.” Finishing with `auto 1` went directly to the council's deliberations. During that fight, the hint said to run `look` to read how it started. The result showed only “Your companions take their positions” and the combat screen.
- **Why it matters** The playtest guide encourages combat automation, and those omitted lines show what the player's work accomplished.
- **Suggestion** Keep mid-fight output short, print the written objective result when combat ends, and let `look` retrieve the crisis setup when the player asks for it.
- **Severity** Minor.

## What I verified from the previous review

- **Persuasion stays available.** The main hearing offered it after a plain answer with no reflection and no lead. The check was DC 25 and the dialogue advanced to the decision about Elske's future. The preparatory choice still matters because it lowers the difficulty.
- **A failed speech leaves the party unharmed.** I replayed the same failed approach from the third run's Cinder Fold checkpoint. Lark's 18 missed DC 21. All four characters kept their full HP, and the help text described the social consequence before the roll.
- **The hammer and ladder are in the scene before combat.** They explain how Elske can ring the bell even when the party holds the only key. On combat turns the earlier crisis no longer repeats. The resumed lawful route also gave Iona the line that Elske used the authority the charter had granted.
- **The lamp-man acknowledges the peaceful rescue.** He says, “My nephew still knows his own name tonight, because you stayed and talked.” Elske's promise to fix the lamps from her salary leads into a lit street outside Anwen's card game.

The unsuccessful persuasion routes still told a coherent story about trying words first, especially when Brask rejected another promise and Hal ordered half the line to stand down. The peaceful hospice scene was a welcome change of pace after the sequence of fights from Highpass to Merrowgate. Anwen's method gives each patient something specific to do. Maren can be direct about why her list matters, while Orin's reaction to Hal holding the door is mostly practical and dry. Nessa and Wren's match on the stairs is light enough to sit beside the handover. The darkest chapters leave room for a quiet aftermath, especially when the party gives Elske space after Hollin's Reach.

## Evidence

The separate saves, command logs and transcripts are under `.playtest/` in the review worktree. I verified the chapter outcomes, absent leads, final choices and Envoy unlock from the saved game. Scope was the written terminal campaign and the job unlock. The full `npm test` suite passed **671 tests** with one expected skip. The initial sandboxed invocation hit restrictions on child processes, and the approved rerun passed.

## Three things to keep

1. **The council's first real agreement takes eleven hours and a mist.** Brannagh's cost-sharing argument, Iona doing the sum and the first paper agreement turn a small accounting dispute into a tangible start for the council.
2. **The hospice rescue pays off in one sentence from the lamp-man.** His nephew still knows his own name. That connects the party's bedside work to why the man risks handing over the receipts.
3. **Maren's new list has a different purpose.** She lets go of the old list of missing people. In spring, she writes down the names of living patients and something true about each of them, the same thing Anwen asked them to do in the night.
