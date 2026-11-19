# The Council of Small Voices, third bard playtest, 19 November 2026

## What I played

- **Build** `b11f33eaeab8c60d14b2bf5df4d88aa3bad8d6c4` (`b11f33e`), the merged fixes from the [second Book Two review](codex-bard-book-two-rerun-2026-11-19.md). Node.js v24.22.1.
- **Hero** Lark, Bard, seed **2**, copied from the original level 10 save at turn 139 in Highpass Watch. I swore the Oath of the Road to the companions, used Song of Rest on the relief convoy, and entered Book Two on turn 167.
- **Finish** All ten chapters and the epilogue, at **level 20**, **78,281 XP**, **100/123 HP**, and **5,431 gold** in Briarwatch. Lark let Elske go home, swore the Second Oath to the companions, and chose **Lorekeeper**. I used Cutting Words during the hearing fight and verified the **Unravel** unlock in town.
- **Turns** 146 new actions on the main route, ending at turn **285**. The lead-in took 27, Book Two through the epilogue took 118, and choosing the job took one. These were 96 manual story choices, 16 other manual actions, nine manual combat actions, and 25 `auto 1` actions across three active fights. All runs used `node scripts/play.js` with no `jump`, fixture, save edits, or live AI.

| Chapter | Main decision | Completion turn | Level after |
| --- | --- | ---: | ---: |
| The Chair Problem | Accepted Merrowgate's guild loan for Fenmere | 175 | 11 |
| Fenmere Under the Gloam | Rebuilt on the rise and told the baker's ward what happened | 185 | 12 |
| The Long Road South | Advised Hal to sign for the guild and left her to talk with Orin | 195 | 13 |
| The Harbour Bell | Rescued Iona and let the council's bid stand | 205 | 14 |
| The Last Name on the List | Kept the patients remembering, kept the receipts, and left Maren's list open | 215 | 15 |
| Hollin's Reach | Changed the vote in the memory, then told Elske what I saw | 225 | 16 |
| Cinder Fold | Promised Aster Vey a seat and handed Nessa the taper | 233 | 17 |
| The Vote | Showed Sorrel the receipts and signaled no to Brannagh | 243 | 18 |
| The Mother Bell | Held the doors and locked the rope away | 264 | 19 |
| The Second Oath | Won the objective fight and let Elske go home | 281 | 20 |

The affirmative-vote replay started at turn 242 and finished the epilogue at turn 270. I recalled Elske, kept the Mother Bell for many voices, gave Elske a council seat, and swore the Second Oath to Briarwatch. I chose to sit by the fire, leaving Nessa to decide when to speak about the post. Seven of the 28 replay actions were `auto 1` actions in the hearing fight. I also tried three short hearing variants from copies of saves reached in normal play to check the locked-rope dialogue and choice menu.

## Findings

### 1. The fight over the silenced bell needs the moment that starts it

- **Where** `q-motherbell-after` / `silence` into `q-oath-crisis` / `objective` and failed `resolve`.
- **What** With the rope locked away, Elske waits at the signal-house door. The opening says “Elske has not asked for it” and asks Lark to answer “with words, or with the key.” Choosing the objective immediately starts combat with the goal “Reach Elske before the bell is rung alone.” The scene goes from her waiting at the door to the party attacking. From a copy of that checkpoint, failed persuasion gave the fight a clear cause: “Elske starts up the ladder.” The combat screen then reprinted the hearing introduction, putting her back at the locked door after the climb began.
- **Why it matters** The player deliberately disabled the bell, so the final fight needs to show how Elske can ring it and why the party has to act now.
- **Suggestion** Put the hammer and ladder in the opening of the direct objective fight on this route. After failed persuasion, start the combat account at the climb so it follows the threat in order.
- **Severity** Major.

### 2. The hearing invites an answer with words and can offer only combat

- **Where** `q-oath-start` / `advance`, then `q-oath-approach` / `direct`, with and without `investigate`.
- **What** “Preparation remains optional” appears when I advance. I chose “Answer her plainly, without a speech” after asking the companions and Aster what they thought. The crisis still asks me to answer “with words, or with the key,” yet the only crisis choices are the objective fight and direct confrontation. On a second copy I chose “Think back over the year before you answer,” failed that check, then again answered plainly. This time `resolve` was offered.
- **Why it matters** A player who takes the hearing's plain-speaking option can reach the climax with no way to try making their case to Elske.
- **Suggestion** Make persuasion available at the hearing and let reflection lower the difficulty. If the lead is required, state that before the player leaves the opening scene.
- **Severity** Major.

### 3. A faltering speech injures the party

- **Where** `q-oath-approach` / `careful`, turn 271 on the main route.
- **What** Choosing “Stand up in the circle and answer her” failed. The story says “You stand up and find you have less to say than you thought. The council waits anyway.” The output also says Maren and Nessa took damage “from the hazardous passage.” Lark lost 13 HP, Maren 10, and Nessa seven, before anyone started fighting. The help text warns of injury, but the scene depicts a quiet pause in a speech.
- **Why it matters** The party pays a combat cost for an event that gives the player no reason to expect anyone was physically hurt.
- **Suggestion** Treat a failed speech as a weaker opening argument or a harder persuasion check. A physical penalty would need a physical hazard in the scene.
- **Severity** Minor.

### 4. The lamp-man thanks a peaceful party for holding a door

- **Where** `q-keeper-crisis` / successful `resolve` into `q-keeper-after`.
- **What** Anwen gets the patients to say each other's names and something true about them. “Maren takes the north end. You take the middle.” There was no fight. When the lamp-man hands over the signed receipts, he says “You held that door,” the same thanks the previous run earned by physically holding it in the objective fight.
- **Why it matters** The peaceful rescue has a distinct method that could carry into the handover.
- **Suggestion** Let him say what his nephew still remembers because the party stayed and talked.
- **Severity** Nit.

## What the new build changed in play

- **The vote survives entering combat.** The Mother Bell fight described only the unauthorized ringing after the no vote. At the hearing Iona said “She was never Warden. We said no,” and the combatant was named Elske Marrow. The affirmative-vote replay carried Iona's recall version into the hearing fight.
- **The new hearing starts from the locked rope.** Lark had the only key, the combat objective named Elske, and failed persuasion showed her trying to reach and strike the bell with a hammer.
- **The delegates arrive once.** The recall replay kept the coaches' arrival in the overnight action. The next scene says the delegates are “still in the hall.” Orin's new line gives him the first attack at the door and lets Hal take the second.
- **The hospice charge matches the purse and the street.** The receipt choice disclosed 60 gold before I picked it. Gold rose from **2,791 to 3,131**, the 400-gold award less 60. Six lamps lit the hospice street and the lower town beyond the corner stayed dark.

The guild loan made Haverick's role clear early. His papers are already signed before the council finishes asking for help, and Elske names him as the man who pays for her lamps. That gives her accusation about the loan at the hearing some teeth. Maren's sympathy for Elske and Orin's “It's what I'm afraid of” after the auction gave their disagreement space. Nessa lighting the forge-signal worked because Wren gets to watch someone else do her job. Orin's hinge, the pension, and Iona's breakfast are jokes about people trying to get something done. Fenmere and Hollin's Reach stay quiet where it counts. The chapters advanced a level at a time without detours for XP. Reprinting the entire crisis at each combat action was the main pacing drag.

## Evidence

Each route has its own local save, command log, and terminal transcript under `.playtest/` in the review worktree. I verified the chapter completions, ending choices, gold, and job in the saved game. The run covers the written terminal game and the job unlock in town. `node tests/book-two.test.js`, `node tests/book.test.js`, and `node tests/review-2026-11-19.test.js` passed **49 checks**, with one expected skip for Book Two still being written.

## Three things to keep

1. **The Sallows repair now has a visible boundary.** The hospice door can stay open while the rest of the district waits. That makes keeping the evidence a choice with a cost.
2. **The companions remember what the player leaves open.** Maren still has the list in the spring and has stopped looking at it every night. Lark's two oaths to the companions end with Aveline quietly writing Biscuit's name down.
3. **Anwen meets Elske with a cart, a blanket, and a pack of cards.** The choice to let Elske go home gets a small, human ending, and Anwen's loyalty makes sense after watching her at the hospice.
