# Tansy through Book Four, 23 November 2026

I played Tansy, a Bard on Standard difficulty with seed **11**, through all **20 chapters of The Names in the Bronze** and all **30 chapters of The Long Tally**, including both epilogues and both job trials. I started from the original level 21 Lorekeeper save in Briarwatch, with Orin, Maren and Nessa. That save came from the [level 1–21 playtest](codex-bard-level1-21-2026-11-20.md).

I played `master` at `ca76d866d76254caf21df11d1be089a741e0b461` with Node.js v24.22.1 and `BRIARWATCH_PREVIEW_BOOKS=1` to open the written chapters locally. The terminal run covered one route. I made all 436 `choose` actions manually. The 791 additional turns include 220 `auto 1` actions during active fights, three manual combat actions and five rejected town actions. I used the written trials and made zero AI calls, with no `jump`, fixtures or save edits. Hosted access and the browser interface were outside this run.

| Milestone | Save turn | Level | Outcome |
| --- | ---: | ---: | --- |
| Imported save | 280 | 21 | Lorekeeper with 79,617 XP |
| Book Three epilogue | 585 | 40 | Restored the old way of asking and gave the memory of Dera's forge |
| Third job | 607 | 40 | Passed the Loremaster trial and unlocked Book Four |
| Book Four, Part One | 774 | 50 | Reached the Hall of Legends and found the road north into the Wold |
| Book Four, Part Two | 911 | 60 | Sheltered the column at the Hall of Legends |
| Book Four epilogue | 1048 | 70 | Shared the winter, left the Parting Bell silent and gave the account to the Long Tally |
| Fourth job | 1071 | 71 | Started the trial at level 70, became Keeper of the First Song and learned Song of Unmaking |

## Findings

### 1. The carried copy of the rite disappears from the council's decision

- **Where** `q-b3-rite-after` / `carry`, `q-b3-vell-start` / `investigate`, then `q-b3-paid-after` / `law`.
- **What** Tansy wrapped the eleven annotated pages in oilcloth, then took them from her pack in Vell to lay beside Corvane's. Hesk later took “the pages of Corvane's copy.” When Tansy put the rite under council law, the scene said “Merrowgate holds the only one on paper.” There had been no scene parting Tansy from her copy.
- **Why it matters** The player can bring the best evidence for the annual right to leave a bell and still hear that the council has to work from Corvane's notes.
- **Suggestion** Let the council receive the carried copy in the `law` outcome, or show where the copy went before anyone counts the surviving pages.
- **Severity** Major.

### 2. The last choice gives two accounts of what ringing backward does

- **Where** `q-b4-parting-start` / `talk-sloe` and `investigate`, then `q-b4-parting-after` / `note`.
- **What** Sloe promises the Wold “its first clear winter since the founders,” and the final choice repeats that promise. The marks on the bell say “the white stays where it is.” I heard both accounts before choosing to share the winter.
- **Why it matters** The player is deciding whether anyone should give up their memories for this winter, and taking the marks literally changes what that sacrifice would buy.
- **Suggestion** Say whether the snow already in the Wold recedes and where new white falls during the wards' silence. Use that same distinction in the inscription, Sloe's explanation and the choice text.
- **Severity** Minor.

### 3. The terminal board hides the next job at both book endings

- **Where** Highpass's `town` board after Book Three, and Briarwatch's board after Book Four's epilogue, at turns 589 and 1048.
- **What** The epilogues said the trial waited on the expedition board. At Highpass the board showed “The Walker on the North Road … (not available here yet).” At Briarwatch it said “both books are finished” and advertised an AI adventure. I used `do '{"type":"job-trial"}'` to post each written trial and was then able to depart and finish it.
- **Why it matters** The third job gates Book Four, and the fourth job is the promised reward for finishing it. A player following the printed commands can miss either one.
- **Suggestion** Print the trial command while one is ready, show the required job beside the locked chapter, and use the actual book count in the terminal ending. Update `docs/AGENT-PLAYTEST.md` to include the preview and the offline trial command.
- **Severity** Minor.

### 4. The terminal first explains the cold after combat starts

- **Where** Highpass's board before `b4-lantry`, Lantry's board before `b4-sheddon`, and `q-b4-column-crisis`.
- **What** The expedition cards supplied a warning about warm gear, but it was absent from the terminal board. In Lantry, all four party members started the deciding fight Slowed. I bought and equipped wool for Tansy, Orin and Nessa, leaving Maren in her mail for comparison. On the road to the peaks only Maren was Slowed and lost two points of armour for the first round.
- **Why it matters** The modifier works per wearer and the player can prepare for it when the board tells them how.
- **Suggestion** Print the existing cold warning on the terminal board and include it in the first expedition's arrival text so Highpass departures can plan to find wool in Lantry.
- **Severity** Minor.

## Play notes

Tansy settled 34 of the 50 chapters peacefully. The first Saltwick fight took her to 31/129 HP, and The Lamp Roster took her to 39/171 HP before she bought better armour. The descent in Book Three and the last three Book Four chapters continued directly between expeditions. The ledge rests and the handoff from the column to the north door kept those sequences moving. At the Hall of Legends, Unravel moved the trial marker from 0/4 to 2/4. The objective timed out at 3/4. One more successful objective check ended the fight at 4/4 with reduced gold for a costly victory, and Tansy received the fourth job. The saved game recorded both trials and 741,639 XP. The offline `npm test` suite passed 1,193 tests, with one skipped.

## Three things to keep

1. **Saltwick's oil has an address.** Hesk remembers the seized carts and says Harl Cross spent four nights dark on half a load. “Nobody died of it. I want you to know that I checked.” That makes him more convincing in the vault and gives the earlier relief choice a cost the player can remember.
2. **Greve's names change what the tally can say.** After Tansy let people give their grief and send their names to Orme, Burdock read that Comfrey could whistle with two fingers. Later Sloe said “I did not know you could feel a sum.” Burdock putting one pair of spectacles over another is funny in the same particular way that his attention to the entries matters.
3. **The companions keep their promises in different ways.** Orin gives Davin the rear in Sheddon, trusts him with a door at Cinder Fold and finally lets him say “Captain” in front of everyone. Maren still has a copy of the Greve names, and Nessa offers to tell Rue who she is every day if she rings. Linus leaves the closing verse to the tally as requested. Those choices reach the epilogue in what people actually do.
