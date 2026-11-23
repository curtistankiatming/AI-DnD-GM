# Maud from level 1 through Book Four, 24 November 2026

I played Maud, a fresh Fighter on Standard difficulty with seed **27**, on `master` at `ca76d866d76254caf21df11d1be089a741e0b461`, the same game build as the Tansy review. I played the opening, all 70 written expeditions through Book Four and both later job trials. Maud finished at **level 71** in Briarwatch with **737,540 XP**. [Tansy's playtest](https://github.com/curtistankiatming/AI-DnD-GM/blob/a2cc4c85a43d5f9a8e76648cafc0ee1066741f55/docs/reviews/codex-bard-books-three-four-2026-11-23.md)

I used Node.js v24.22.1 and the offline terminal preview (`BRIARWATCH_PREVIEW_BOOKS=1`). The save advanced **1,288 turns**. I made all 618 `choose` actions manually, used `auto 1` for 448 actions during active fights, entered 14 manual combat actions and issued 208 other actions, including five rejected commands. The campaign used the written trials, with no `jump`, fixtures, save edits or live AI.

| Milestone | Turn | Level | Choice or result |
| --- | ---: | ---: | --- |
| Briarwatch village square | 0 | 1 | Created Maud with `node scripts/play.js new --class fighter --name Maud --seed 27` |
| Book One finished | 260 | 10 | Owed the road to its towns and left local keepers in charge |
| Book Two epilogue | 439 | 18 | Gave Elske a council seat, swore to the companions and backed Nessa's yes to Wren |
| Warlord | 519 | 22 | Chose the second job on reaching Vell |
| Book Three epilogue | 753 | 40 | Evacuated Vell and sealed the stair |
| Banner Captain | 782 | 40 | Passed the third-job trial and reached Book Four's board |
| Book Four, Part Two | 1118 | 60 | Brought the Wold's column through the south door |
| Book Four epilogue | 1269 | 70 | Chose Sloe's note and gave the last verse to Linus |
| High Marshal | 1288 | 71 | Claimed the trial marker in round four and learned Marshal's Command |

## Findings

### 1. Elske's account puts the Single Voice design in her childhood

- **Where** `q-hollin-approach` in Book Two, then `q-b3-home-start` / `talk-elske` in Book Three. I gave Elske a council seat at the Second Oath.
- **What** The memory at Hollin's Reach takes place “eleven years ago” and introduces Elske as “a woman of thirty.” In the following book she says, “I knew Corvane, a little, forty years ago, before the Single Voice was anything but a drawing on my table.” That puts the drawing in her early childhood, despite the story bible placing her design after the fire.
- **Why it matters** The connection between the vote during the fire and Elske's later design explains why she wants emergency powers.
- **Suggestion** Date Corvane's visit from the fire or remove the number and keep the sequence clear. Apply the same wording to both versions of Elske's conversation.
- **Severity** Major.

### 2. Sealing the stair denies two gifts the party has just made

- **Where** `q-b3-promise-start` and `q-b3-firstbell-after` / `seal`.
- **What** Orin offers up the night at Saltwick, leaves his badge on the floor and looks toward the missing roofs in confusion. Nessa lays down an unsent letter. Soon afterward Maud seals the stair. The outcome says, “Nobody gives anything tonight, and nobody is cast.” Neither gift is retrieved in the scene.
- **Why it matters** Two companion choices are already complete by the time the player decides whether to make a wider promise on behalf of the free wards.
- **Suggestion** Say that the party asks for no more gifts, or have Orin and Nessa take their offerings back if sealing is meant to undo what they gave.
- **Severity** Major.

### 3. Book Four's epilogue puts Hesk back below the stair

- **Where** `q-b4-orme-start` / `talk-hesk`, `q-b4-knot-start`, then `scene-b4-parting-end-home`.
- **What** After I sealed the stair in Book Three, Hesk took the marked way north and told Maud in Orme, “I came out the other end.” He then walked behind Sloe and her ringers into the free wards. His last line on my route was “A man who went north and came back.” At the forge, the narrator says, “Nobody hears from Hesk. The stair is sealed, and he is below it.” His return underground never occurs on this route.
- **Why it matters** Hesk's journey through the Wold is one of the largest consequences of sealing the stair, and the epilogue sends him back to his Book Three fate without a scene.
- **Suggestion** Give the Hesk who came south with Sloe an epilogue line of his own. If he is meant to go back under the stair, establish when and why.
- **Severity** Major.

### 4. Greve's names appear in the tally after the player declines to send them

- **Where** `q-b4-greve-after` / `given`, then `scene-b4-parting-end-home`.
- **What** I chose “Leave Greve's custom as it is.” Madder says she will give at the next giving, and Maren says “I'd have liked them to keep the names.” The epilogue tells me “The names from Greve are written in the tally, and Maren has a copy.” The chapter had offered sending the names as its own choice.
- **Why it matters** Respecting Yarrow's custom should preserve the cost Maud agreed to accept.
- **Suggestion** Give `given` its own ending line about Yarrow's house or Madder. Save the tally and Maren's copy for `written`, or show who made the later decision to send the names.
- **Severity** Minor.

### 5. Fenmere loses a line the party has just recovered

- **Where** `q-fenmere-start` / successful `investigate`, followed by `q-fenmere-crisis` / failed `resolve`.
- **What** A girl “sings the whole thing through without stopping” and Ilka writes it on her arm. The deciding roll then fails and says, “The song starts strong and falters at the missing line.”
- **Why it matters** The rescue can fail for plenty of reasons in a flooded village, but this reason erases the thing the player just helped recover.
- **Suggestion** On the prepared route let the singers lose the beat, each other or their breath. Keep the missing line for a route where nobody recovered it.
- **Severity** Minor.

### 6. The level 10 trial expects a bounty command the terminal never prints

- **Where** Highpass's board after `q-beacon-after` / `charter`, before `trial`.
- **What** Maud reached the first-advancement gate at level 9 with 14,950 of the 18,900 XP required, after all prior main expeditions and all three companion requests. The only expedition printed was “Oath of the Road — First Advancement (not available here yet).” I used `do '{"type":"bounty"}'` to fight the Highpass ridge stalker and wolves seven times for 600 XP each. The trial opened at 19,150 XP.
- **Why it matters** The terminal gives a fresh player neither a way to discover the catch-up activity nor an estimate of the detour.
- **Suggestion** Show the required level and current XP gap on the locked card and print the bounty action and reward on the board. Consider a first-clear reward or a level floor at the preceding chapter if the trial is intended to follow the beacon directly.
- **Severity** Major for terminal progression.

## What this route confirmed

The council-copy route correctly recalls the sealed pages in `q-b3-paid-after` / `law`. That pins the continuity problem in Tansy's run to carrying the copy herself. The backward-ringing epilogue confirms the Wold had a clear winter and names losses on the southern side, which gives the bell inscription a specific outcome to describe. Both later job trials still required the terminal's unlisted `job-trial` action.

Everyone was Slowed in Lantry. After equipping warm gear on all four, the party entered the later Wold fights without the cold penalty. Rallying Cry restored 22 HP to Maren in Lantry, Pincer Command landed both strikes against the Founders' Shade's retainer, and the High Marshal trial ended with four manual objective successes. That trial paid its full 2,840 gold, compared with the reduced payout for Tansy's late marker.

## Three things to keep

1. **The price of Saltwick's oil follows people.** Bram Tolley and Ella Marsh put their names on the ledger, Ella explains in Vell that the oil stops if they withdraw, and Mags refuses to sell Hesk a third name later. The town's relief decision keeps getting more specific.
2. **Sending the white to Sheddon makes the bells' argument playable.** Rue names the town the pots have sent it to. The next chapter opens on the damage, and Maud can turn back to take Sedge's mother out herself. The effect comes soon enough to change the player's next decision.
3. **Nessa introduces herself to Rue after the note.** “Hello. I'm Nessa. You're Rue. You wrote it down. I'll show you.” It pays off Nessa's promise at the signal house in her own voice. Linus singing the final verse wrong and the square joining in on the wrong places gives the cost of the winter room to settle before the trial begins.
