# Arlen from level 1 through Book Four, 25 November 2026

I played a fresh Ranger, Arlen, on Standard difficulty with seed **43**, using Node.js v24.22.1 and `node scripts/play.js`. The tested build was `cc084ea68620260e25e159ed573f4c7463273a3e` on `master`. I used `BRIARWATCH_PREVIEW_BOOKS=1` to open the two unreleased books. Arlen played the opening, all 70 written expeditions and both later job trials, finishing as a **level 71 Worldwalker** in Briarwatch with **737,540 XP**.

The main save advanced **1,207 turns**. I made 622 `choose` actions, used `auto 1` for 364 actions during active combat, entered 12 manual combat actions and used 209 other commands, including two reward requests that were issued before their level and later accepted. I used the written trials, with no scene jumps, fixtures, save edits or live AI. The inscription checks on copies of the save are outside the main count.

| Milestone | Turn | Level | Choice or result |
| --- | ---: | ---: | --- |
| Briarwatch village square | 0 | 1 | Created Arlen with `node scripts/play.js new --class ranger --name Arlen --seed 43` |
| Book One finished | 281 | 10 | Swore the Oath of the Road and founded the patrol |
| Book Two epilogue | 445 | 18 | Gave Elske a council seat and swore to Briarwatch |
| Book Three epilogue | 736 | 40 | Evacuated Vell and sealed the stair |
| Wayfinder | 769 | 40 | Passed the trial and reached the Book Four board |
| Book Four, Part One | 916 | 50 | Left the bell silent and prepared to go down into the Wold |
| Book Four, Part Two | 1066 | 60 | Sent the column back to Orme and took the envoys south |
| Book Four epilogue | 1189 | 70 | Brought the Wold's people south and let the companions keep the story |
| Worldwalker | 1207 | 71 | Won the legendary trial by claiming the marker and learned Worldwalk |

## Findings

### 1. The sealed stair still forgets the gifts after acknowledging them

- **Where** `q-b3-firstbell-after` / `seal`, `scene-firstbell-gift`, and Dera's lines in `scene-firstbell-home` and the Wayfinder trial opening.
- **What** The outcome now correctly says “Nobody gives anything more tonight” and leaves Orin's badge and Nessa's letter on the floor. The choice label still says “nobody gives.” The next scene reads “Nobody gives anything here tonight. You leave the floor as you found it.” Dera then says “Nobody gave, so nobody's any lighter” in the epilogue, when the trial is posted, and when it starts.
- **Why it matters** The player now sees the correct result and its opposite within the same sequence. The trial repeats the version that erases the companions' choices.
- **Suggestion** Use “nobody else gives” in the choice and the Gift scene. Let Dera talk about what Arlen keeps and the weight the nine still carry. If she speaks for the party, let her mention the badge or letter when either was given.
- **Severity** Major.

### 2. The level 10 board gives only the first step of the XP gap

- **Where** Highpass's `town` board after `q-beacon-after` / `charter`, turn 139.
- **What** The board correctly printed the bounty command and said the trial “needs level 10, you are level 8, 163 XP to the next level.” Arlen had **14,737 XP**, and the trial needed **18,900 XP**, a gap of **4,163**. All three companion requests were complete. The first bounty paid 530 XP, and seven more paid 600 each before the trial opened at 19,467 XP.
- **Why it matters** The new board makes the intended bounty detour discoverable. The XP figure beside the locked trial still gives the player a poor estimate of how long that detour will take.
- **Suggestion** Show the XP still needed for level 10 on that card. Keep the per-bounty payout on its own line.
- **Severity** Minor.

### 3. The first cold warning names shops the party cannot reach yet

- **Where** Highpass's `town` board before `b4-lantry`, turn 916.
- **What** The board correctly listed all four party members as “Not wrapped up” and said, “Warm Wold-made wool is sold in Lantry and Orme.” Highpass had no warm stock, and both listed towns were absent from the travel menu. All four started the Lantry fight Slowed. Once the chapter opened Lantry, I bought wool for everyone and the later board correctly said the cold would slow nobody.
- **Why it matters** The first warning is useful, but pointing to a shop behind the expedition can send the player looking for a preparation step that comes later.
- **Suggestion** On Highpass's first cold card, say the party can buy wool on reaching Lantry. That gives the player a clear reason to consider the peaceful route if they want to avoid fighting in the cold.
- **Severity** Minor.

### 4. The refuge ending calls the Wold empty with Sloe still there

- **Where** `q-b4-parting-after` / `south` and `scene-b4-parting-end-home`.
- **What** Arlen promises refuge to “all of it that will come,” and Sloe has already said she will stay. The outcome describes “a country that will be empty by the spring.” The epilogue makes good on Sloe's choice: “She keeps the last door in Orme.”
- **Why it matters** Sloe staying gives the refuge ending its particular cost. It deserves to be part of the first account of what happens.
- **Suggestion** Say that the white is sent to a country whose towns will be emptying, or name the last door Sloe means to keep.
- **Severity** Nit.

### 5. The scene reader crashes on conditional Book Four dialogue

- **Where** `node scripts/play.js read q-b4-parting-start` and `node scripts/play.js read scene-b4-parting-end-home` with the preview on.
- **What** Both commands exited with `TypeError: Cannot read properties of undefined (reading 'toUpperCase')`. Reading `briarwatch-square` worked. The two Book Four scenes displayed normally in play.
- **Why it matters** The playtest guide points reviewers to `read` for inspecting alternate versions of a scene, including exactly the kinds of scenes that crash it.
- **Suggestion** Have the reader print each conditional alternative and its condition before formatting a line as narration or dialogue.
- **Severity** Minor.

## Retest of the prior reviews

| Earlier issue | What happened on this build |
| --- | --- |
| Fenmere lost a recovered verse | The investigation succeeded and the resolution failed. Ilka still had the words on her arm. The crowd lost the beat under pressure. |
| Elske's timeline | Seated Elske dated Corvane's visit to the winter after the fire, eleven years ago. |
| The carried copy disappeared from the law | Arlen handed the oilcloth bundle to Sorrel, who wrote the annual consent clause into law from those pages. |
| The stair erased gifts | The immediate outcome kept the badge and letter. The adjacent lines still conflict with it, as described above. |
| Hesk and Greve in the epilogue | Hesk wintered at Highpass after returning with Sloe. Greve kept its custom. Madder sent a loaf, and Maren kept the cloth. |
| Missing board commands and the two-book message | The bounty, Wayfinder and Worldwalker commands appeared at the right gates. Book Four named the third-job prerequisite. The final board said “every written book is finished.” |
| Cold preparation | The board warned before Lantry and confirmed the whole party was warm after outfitting. The equipped party fought on the road to the peaks without the penalty. |
| Where backward ringing sends the white | Arlen missed the Arcana check on the main route and on five copied checkpoints with different conversations. The authored success says the white “stays in the south, where it rises, and the Wold has a clear winter.” I verified that wording in the scene data. |

I opened the Book Two end save with the preview disabled for a read-only board check. The board had no next written expedition. Reopening it in preview showed The Letter from Vell, and the release regression test covered both later books. In combat, Hidden Route hit three enemies and advanced the Lantry objective. Lead Astray reached all three enemies on the road to the peaks. At the Worldwalker trial, Pathfinder advanced the marker, then three manual objective successes completed it. The full `npm test` suite passed **1,198 tests**, with **one skipped**.

## Three things to keep

1. **Wem takes the boundary stone.** Letting Dunnet keep its pot-bell sends Wem to Orme with its children, carts and a stone on a sledge. Campion still rings forty strokes, and the white goes down onto an empty street. The crossing stone makes the decision feel permanent.
2. **Iona remembers the refuge promise.** Arlen went north offering shelter, then asked for it in the hall. When the final choice calls for moving the Wold, Iona has already costed ten thousand places and can tell you how close three thousand will come to using them up. Her joke about having no children for a year sounds like a quartermaster counting beds.
3. **Each companion keeps a different part of the story.** Orin keeps the ford and the doors, Maren keeps the names, and Nessa keeps the signal and stair. Linus leaves the last verse unsung until he hears from them. The choice gets its own consequence at Dera's forge and in the trial's opening.
