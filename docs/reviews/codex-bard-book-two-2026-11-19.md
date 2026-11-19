# The Council of Small Voices, bard playtest, 19 November 2026

## What I played

- **Build** `3ce1e7216a983ed43b620197e3a71104615d7fd8` (`3ce1e72`), the Book Two development branch `claude/project-thread-i43k6z`. Node.js v24.22.1. This branch contains all ten chapters and the epilogue.
- **Hero** Lark, Bard, seed **2**, using a copy of the genuine level 10 save from the [earlier bard run](https://github.com/curtistankiatming/AI-DnD-GM/blob/8163f39/docs/reviews/codex-bard-level10-2026-11-12.md). The save began at turn 139 in Highpass Watch with 21,881 XP. It carried the public ward charter, Quiet District double consent, Hal's supervised bridge repairs, and all three companion personal quests.
- **Finish** Level **20**, **78,281 XP**, **123/123 HP**, and **5,491 gold**, at `town-briarwatch`. Completed all ten Book Two chapters and the epilogue. The Second Oath answers to the council. Nessa sent her letter accepting Wren's post for later. Lark then chose **Envoy**, and the save shows **Parley** learned.
- **Turns** 132 new actions, ending at save turn **271**. The trial and convoy lead-in took 27 actions, Book Two through the epilogue took 104, and selecting Envoy took one. The 132 actions comprise 93 manual story choices, 16 other manual actions, four manual combat actions, and 19 `auto 1` combat actions. Automation only ran during active fights. No `jump`, fixture, save edits, or live model. All progress came from the written chapters.

The renewed Oath of the Road gave Lark a spoken promise to protect every town. Song of Rest then healed Maren for 10 HP and Lark for 13 HP in the convoy fight. The convoy ending pointed to The Chair Problem on the Highpass board. I played the following route through the book.

| Chapter | Played decision | Save turn at quest completion | Level after |
| --- | --- | ---: | ---: |
| The Chair Problem | Offered the party purse for Fenmere | 172 | 11 |
| Fenmere Under the Gloam | Built on the rise, then let the baker's ward open at six | 182 | 12 |
| The Long Road South | Advised Hal to take the guild contract | 192 | 13 |
| The Harbour Bell | Rescued Iona and named Haverick publicly | 202 | 14 |
| The Last Name on the List | Held the hospice door, then gave Elske the receipts | 221 | 15 |
| Hollin's Reach | Rang the bell in the memory and told Elske what I saw | 232 | 16 |
| Cinder Fold | Promised Aster Vey a seat and let Wren light the signal | 241 | 17 |
| The Vote | Signaled yes to Brannagh | 250 | 18 |
| The Mother Bell | Persuaded Elske to share the rope and kept the bell for many voices | 259 | 19 |
| The Second Oath | Persuaded Elske to sit with the council and asked it to give her a seat | 267 | 20 |

The two deliberate departures from the expected choice were financing Fenmere from the party purse and letting Tam's ward keep its hours instead of telling it to close. Waiting brought a complete, bittersweet outcome and a loss of Maren's approval. I finished the oath and forge scenes after reaching level 20, returned to town on turn 270, and chose Envoy on turn 271. The only fight within Book Two was the hospice objective after a failed attempt to keep the patients remembering. Lark's Persuasion expertise worked well throughout the book, while failed History, Perception, and Performance checks still left ways forward. There were no defeats, rejected commands, or detours to earn XP.

## Findings

### 1. Aster's chime appears in narration without ever entering Lark's pack

- **Where** `q-cinderfold-start` / `talk-aster`, then `q-motherbell-crisis` and `q-oath-start`.
- **What** The invitation is “Answer the silver chime in your pack.” The result says “the silver chime you carried out of the bell-vault under Briarwatch rings on its own.” Lark's Book One route went through Nessa's rescue and the vault fight without acquiring `silver-chime`. The item is absent from both the starting and final inventories. The Mother Bell again says “the chime in your pack goes cold,” and the council seats “Aster Vey's chime” on a stool.
- **Why it matters** Book Two builds a major claim about the personhood of wards on a shared memory and possession this hero never had.
- **Suggestion** Introduce Aster through the forge bells when the hero lacks the chime, then give her a vessel in a visible exchange if she needs one for the later scenes. Keep the carried-chime reunion for saves that actually have it.
- **Severity** Major.

### 2. The legal recall is described but never offered in the crisis

- **Where** `q-motherbell-crisis`, after passing the Warden vote with `q-vote-after` / `yes`.
- **What** Elske rings lawfully. The scene says “she can be recalled by two-thirds of the council, and the delegates are on the road behind you,” then offers persuasion to share the rope, holding the doors while the bell is freed, or direct confrontation. I could persuade her and did. I could not select the recall the scene had just described. At `q-oath-crisis`, Iona discusses removing a Warden “who acts without the council,” although the earlier text explicitly told me the ringing was lawful. The council eventually took away the power when I chose `seat`.
- **Why it matters** For the route that granted emergency authority, the promised public check on that authority is the choice I most wanted to try.
- **Suggestion** Give the lawful route a choice to call the recall, with the delegates' arrival and the cost of waiting made visible, or explicitly say why it cannot happen in time. Carry the result into the hearing and distinguish lawful emergency use from an abuse of its terms.
- **Severity** Major.

### 3. The hospice's evidence changes from suspicion to receipts offscreen

- **Where** `q-keeper-start` / `investigate`, `q-keeper-after` / `tell`.
- **What** My failed investigation read “The dead lamps tell you nothing you can prove,” followed by the lamp-man looking frightened. The game awarded a lead whose full text mentions the signed receipts, while the terminal displayed only its title. After the objective fight, the story asks what to do with “the receipts from the lamp-man, signed by Haverick's office.” Elske reads them and pledges to replace the lamps. The evidence is recorded, but the scene never shows how it reached Lark's hands.
- **Why it matters** The choice to confront Elske with evidence is strongest when the player can remember how it became evidence.
- **Suggestion** Keep the failed check's weaker lead, then give the lamp-man a reason to bring the receipts after the party saves the hospice. One line from him would connect the investigation, rescue, and decision.
- **Severity** Minor.

### 4. Paying for Fenmere is a strong political gesture with no visible personal cost

- **Where** `q-chairs-after` / `party`, turn 172, with a callback at `q-oath-start`.
- **What** “Pay Fenmere's first week out of your party's own purse” has the help text “Your purse stays as it is.” In the outcome I put the contract fee on the table, Brannagh presses Iona to cover the rest, and Iona sends a receipt. My gold went from **1,391 to 1,711**, the full 320-gold quest reward. Elske later says I paid out of my own purse. The political callback worked, while the transaction the story describes had no cost to the player.
- **Why it matters** A choice about assuming a burden is less legible when the story dramatizes a sacrifice and the purse shows only a reward.
- **Suggestion** Label it “Pledge your contract fee to start the relief,” then reconcile the pledge and payout in the result. If it is an actual expense, show it before choosing and keep it separate from the objective reward.
- **Severity** Minor.

### 5. The AI handoff interrupts the ending before the player can swear the Second Oath

- **Where** `q-oath-after` / `seat`, entering `scene-oath-epilogue-oath` on turn 267.
- **What** The terminal announces “The written story is complete” and explains how to ask Claude for a new adventure. Immediately below, Aveline asks who the hero answers to and offers the four oath choices. There are two further scenes before the ending. I completed all of them and verified the final town board then correctly explains the handoff.
- **Why it matters** A player following the completion notice could leave before making the choice the entire chapter asks them to make.
- **Suggestion** Keep the level 20 advancement event at quest completion and move the handoff notice to `home`, or show it only after the epilogue is finished. Update the repository's game guide, whose scope still calls the written campaign levels 1–10 on this branch.
- **Severity** Minor.

### 6. A couple of scene joins show the seams between branches

- **Where** `q-fenmere-start` / failed `investigate` into `q-fenmere-crisis` / `resolve`, and `q-southroad-after` / `guild` into `scene-southroad-camp-fire`.
- **What** Fenmere's successful crisis refers to “the girl from the wedding,” although my investigation failure had only said the villagers put back most of the verse. On the south road, the guild result says Orin speaks “once you are back on the road south,” then the camp starts “Late, with the soldiers asleep in the station,” where Orin and Hal sit together again. The camp dialogue itself is strong.
- **Why it matters** An unidentified villager and a jump backward in the evening can make the player wonder what was missed.
- **Suggestion** Introduce the girl on both investigation paths or describe her in the crisis as someone new. Put Orin's warning beside the campfire or on the following morning's departure.
- **Severity** Nit.

## Dialogue, humour, and pacing

Book Two gives the political disagreement the faces it needed. Elske's “I said wait” at Hollin's Reach makes her earlier argument about speed comprehensible, and at the Mother Bell the silence after her success gives the cost a physical form. The last hearing named four things Lark had done, including paying for Fenmere, giving Hal advice, naming Haverick, and signaling Brannagh's vote. The encounter made the player answer for those choices. The lack of a recall action stands out because the rest of that argument is so well set up.

The companions sound distinct. Orin cannot manage the traders' cover story and gets through on his knowledge of a hinge, then gives Hal an honest offer with no certainty of pay. Maren can acknowledge both Anwen's independence and Elske's sincerity. Nessa and Wren interrupt each other until they both shift their weight the same way on the stairs. The epilogue follows through on the list, invoice, and unsent letters. Iona's itemised beer, the goat and fence, and Orin asking for stew all change meaning when they return. Fenmere's loss and the memory inside the burned council house have room to breathe. Aveline's papers surviving a ghost makes a small joke on the ridge before entering Hollin's Reach, while the town and replay themselves stay sober.

The new approaches have specific scenes, so the repeated `advance` and `careful` travel labels are a smaller pacing problem than in Book One. Chapter rewards advanced Lark one level at a time with no grinding, and most major choices were between positions I could explain in the story. A bard with strong Persuasion naturally saw many peaceful resolutions. This run therefore says more about those routes and the hospice objective than about general combat balance or the losing vote branch.

## Evidence and checks

The local save, transcript, command list, and summary are `.playtest/lark-book-two.json`, `.playtest/lark-transcript.txt`, `.playtest/lark-commands.txt`, and `.playtest/lark-summary.json`. To start from the same checkpoint, copy the previous level 10 Lark save and run `node scripts/play.js look --save .playtest/lark-book-two.json`. Every action ran against that copy through the terminal. The report covers the displayed consequences and read-only checks of the final save and starting inventory. It does not cover the alternate vote, second-job combat, or AI continuation. `node tests/book-two.test.js` and `node tests/book.test.js` passed **28 checks** with one skip for the case in which Book Two is still being written.

## Three things to keep

1. **Hal's guild contract comes back twice.** She can give the tip at the harbour in her guild coat, then take the coat off and hold the forge door against Haverick's people. Orin's “Terrible. I'd like to do it again” completes his arc without spelling it out.
2. **The baker's ward gives grief a choice with no obvious right answer.** Waiting costs Maren's approval, yet she still calls it kind. “It does not seem to mind. It is open” says more than a tidy verdict would.
3. **The epilogue makes the companions' stories pay off.** Maren lets her old list go, the invoice becomes something Orin keeps, and Nessa sends the letter herself. Those details make the return to Dera's forge feel earned.
