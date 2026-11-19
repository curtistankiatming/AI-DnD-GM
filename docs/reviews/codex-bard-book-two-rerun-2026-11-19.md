# The Council of Small Voices, second bard playtest, 19 November 2026

## What I played

- **Build** `7473b45587a5a0c3fa1d023fc45da41523db2b73` (`7473b45`), the merged Book Two build on `master`, using Node.js v24.22.1. Its files match `a4391e7`, the development commit that addressed the [first Book Two review](codex-bard-book-two-2026-11-19.md).
- **Hero** Lark, Bard, seed **2**. I copied the original level 10 save at turn 139 in Highpass Watch, with 21,881 XP and all three companions. I renewed the Oath of the Road, used Song of Rest in the relief convoy, and opened Book Two on turn 167.
- **Finish** All ten chapters and the epilogue, at **level 20**, **78,281 XP**, **73/123 HP**, and **5,491 gold** in Briarwatch. Lark answered to no one in the Second Oath, then took **Battle Cantor** and learned **Defiant Chorus** at turn 289. I verified the skill unlock in town.
- **Turns** 150 new actions on the main route. The lead-in took 27, Book Two through the epilogue took 122, and the job took one. Those actions were 93 manual story choices, 16 other manual actions, seven manual combat actions, and 34 uses of `auto 1` during four active fights. A separate 21-action replay from the save at turn 249 took the affirmative vote through the epilogue. Every choice in that replay was manual. Both routes used the ordinary terminal game with no `jump`, fixture, save edits, or AI.

| Chapter | Main decision | Completion turn | Level after |
| --- | --- | ---: | ---: |
| The Chair Problem | Pledged my contract fee for Fenmere | 172 | 11 |
| Fenmere Under the Gloam | Promised to reclaim the lower village and fetched Brannagh for Tam's ward | 182 | 12 |
| The Long Road South | Asked Hal's company to serve the council | 192 | 13 |
| The Harbour Bell | Gave the harbour ward to the fishers and pilots | 202 | 14 |
| The Last Name on the List | Held the hospice door and kept the receipts for the vote | 221 | 15 |
| Hollin's Reach | Changed the vote in the memory and let Elske tell her own story | 232 | 16 |
| Cinder Fold | Told Aster Vey the council was unready to seat the wards | 240 | 17 |
| The Vote | Showed Sorrel the receipts and signaled no to Brannagh | 250 | 18 |
| The Mother Bell | Held the casting hall doors and cut down the rope | 269 | 19 |
| The Second Oath | Won the objective fight and asked the council to judge Elske | 285 | 20 |

The main route rejected the Warden by three votes to two and sentenced Elske to five years away from the council while keeping the Sallows hospice open. Lark swore the Second Oath independently, walked with Nessa to send her letter, and returned to town at turn 288. The choice to answer to no one landed harder than I expected after taking Elske to a public hearing. Elske closes her eyes and says, “That's what I said, at your age. Be better at it than I was.”

## Findings

### 1. Combat repeats mutually exclusive versions of the vote

- **Where** `q-motherbell-crisis` / `objective` after `q-vote-after` / `no`, and `q-oath-crisis` / `objective` on the same route.
- **What** The Mother Bell scene correctly says “Elske rings the Mother Bell, without the council's leave.” Starting the objective fight prints “Elske rings the Mother Bell, lawfully, as Warden of the Chorus” immediately before repeating the unlawful version. The fight introduction later says she has no authority and that a lawful recall is possible. At the Second Oath, entering combat plays three versions of Iona's statement, including “She was the lawful Warden” and “We recalled her, lawfully.” This Elske lost the vote and was never recalled. The enemy list calls her “Elske Marrow, Warden of the Chorus.” The save retains the correct rejected-vote result and both fights still finish normally.
- **Why it matters** The final chapters ask the player to respond to the legal outcome of a vote, and starting combat makes that outcome sound undecided.
- **Suggestion** Use the same filtered story lines in the combat introduction as on the screen before the fight, and use Elske's title only on routes that granted it. Give Iona a separate rejected-vote line about an emergency power that was never granted. Her opening line currently discusses removing a Warden even outside the fight.
- **Severity** Major.

### 2. The hearing uses the rope after Wren locks it away

- **Where** `q-motherbell-after` / `silence` into `q-oath-crisis` / `objective`.
- **What** “You and Orin cut the bell-rope down and coil it, and Wren locks it in the forge-signal house, and gives you the only key.” At the hearing, Elske is already standing beside “the bell-rope,” and the objective is “Reach the bell-rope before it rings alone.” I played and won that fight. The final save still records the decision to silence the bell.
- **Why it matters** The big decision to make the Mother Bell unusable disappears exactly when its consequences should matter.
- **Suggestion** Give the silence route a hearing and objective built around the secured rope, such as keeping the key in the council's custody while the chamber quarrels. Keep the race to the hanging rope for the route that left it attached.
- **Severity** Major.

### 3. After the recall, the delegates are still on their way

- **Where** `q-motherbell-crisis` / `recall` into `q-motherbell-after`.
- **What** Hal arrives “with the delegates' coaches,” the council sits at dawn, and Aveline reads the result. The next scene retells Hal's arrival and then says “The council's delegates are coming up the mountain road.” The subsequent hearing correctly remembers the recall.
- **Why it matters** The scene makes the delegates' arrival the payoff for waiting a full night, then puts them back on the road.
- **Suggestion** For the recall route, open the aftermath with the delegates already in the hall and let Orin react to what Hal did without recounting her entrance. Keep the incoming coaches in routes where the council has yet to arrive.
- **Severity** Minor.

### 4. Keeping the hospice receipts overstates what the party pays for and what gets repaired

- **Where** `q-keeper-after` / `keep` into `scene-keeper-cards-cards`, at turn 221.
- **What** Maren warns that keeping the receipts leaves the lower town's lamps “unfixed, for another month.” The result says “You pay the lamp-man to fix the worst six out of the party's own reward. It is not enough, and everyone knows it.” The purse rose from **2,791 to 3,191 gold**, the full **400-gold** reward. The next scene says “the lamps in the Sallows are lit along the whole street.” That may describe only the hospice street, but the text never identifies the part still in darkness.
- **Why it matters** The point of keeping the receipts is deferring repairs to hold Haverick accountable, and the player gets little sense of the price paid or who is still waiting.
- **Suggestion** Show a small stated contribution from the reward, or say who covered it if the party's gold stays the same. Describe the six repaired lamps and leave a visible stretch dark.
- **Severity** Minor.

## What held up on the new build

- **Aster and the older save.** Lark still had no silver chime entering Book Two. Aster spoke through an inn's bronze bell, and Wren put it in Lark's hand. The little bell in the pack then made sense at the Mother Bell. Refusing to promise her a seat gave her a short, weary answer that fit someone who has already waited centuries.
- **Fenmere and the hospice.** The same failed Performance check now introduced the girl who knew the verse from her cousin's wedding. This run showed the party's pledge, reimbursement, and unchanged 320-gold reward. In the hospice, the lamp-man visibly handed over the receipts after the failed investigation and successful rescue. His nephew in the end bed gave him a reason to speak.
- **The legal recall and the epilogue.** On the separate affirmative-vote replay, the new choice explained the cost before I committed. I sent Nessa, held the hall overnight, saw the 4–1 recall, and heard how Ilka lost the third verse again. Both Elske and Iona remembered the recall at the hearing. On both routes, the CLI's AI handoff notice appeared when I chose `home`, after the oath and Nessa's letter.

The bard's Persuasion made room for many peaceful successes, and the two objective fights at the end made Bardic Inspiration and companion support matter. There was no XP grind. The repeated crisis introduction slowed down both fights, especially after the quieter political scenes. Character humour stayed specific. Brannagh buying a harbour for one crown makes the auction's rules look as absurd as they are, and Orin asking for stew on the pass makes the scene gentler without draining the tension. The darkest stretch at Hollin's Reach still has space to sit with Elske's decision. The camp with Hal happened in a natural order on the council-contract route.

## Evidence

I captured separate terminal transcripts by replaying the recorded commands against two local saves and checked the resulting state against the live run. The scripts and logs are ignored under `.playtest/` in the playtest worktree. The main route starts from the same level 10 save as the first review. The replay branches just before `choose no` or `choose yes` at `q-vote-after`. I used the town and combat screens and checked the saved results. Scope was the written terminal campaign and the Battle Cantor unlock in town. The tests `node tests/book-two.test.js`, `node tests/book.test.js`, and `node tests/review-2026-11-19.test.js` passed 45 checks, with one expected skip for Book Two still being written.

## Three things to keep

1. **The hearing quotes the route I actually played.** Elske remembered the promise to reclaim Fenmere, giving away the harbour, and keeping the receipts for the vote. Her accusation held up because I remembered why I had made each decision.
2. **The recall makes patience cost something.** The missing third verse carries more weight than a generic penalty. Elske's “I didn't think I'd be the one it was used on. I hoped I would be” makes her promise to accept limits believable.
3. **Brannagh can be blunt and tender in the same breath.** She tells Tam's ward to stop baking because the loaves are making people hungry, then carries one of those nonexistent loaves all the way up the hill.
