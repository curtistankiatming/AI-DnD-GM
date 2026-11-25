# Briarwatch story, difficulty, and fun across two fresh runs

25 November 2026 · Tested `471ceee4182e09718b5e52346f3b7da1c8d4f6a3` with Node.js v24.22.1.

I started two level 1 heroes and finished the opening, all four written books, and the level 10, 40, and 70 trials on each. I played offline in the terminal with `BRIARWATCH_PREVIEW_BOOKS=1`. The CLI starts new heroes on Standard, so I selected Story and Gritty through the normal character creation function. I made the story choices myself. For combat I used `auto 1` alongside manual commands. Both campaigns used ordinary saves throughout. I used a separate fixture to check the CLI rest prompt and a copy of an older campaign to measure released-only progression. No live AI ran.

| Route | Branch and final job | Turns through Books I / II / III / IV | Final checkpoint |
| --- | --- | --- | --- |
| Mira, Story Cleric, seed 83 | Lifewarden → Mender of Hosts → Living Saint | 199 / 393 / 702 / 1,284 | Briarwatch, level 71, 1,313 turns |
| Soren, Gritty Rogue, seed 109 | Saboteur → Trapwright → Ruinmaker | 252 / 487 / 841 / 1,416 | Briarwatch, level 71, 1,449 turns |

## How much fun were they?

These are playthrough ratings. Class, seed, gear, and story choices all differed, so the two runs give a feel for each experience. Combat difficulty uses 1 for forgiving and 5 for repeated stalls even with preparation. Fun uses 10 as the top score.

| Experience | Mira, Story | Soren, Gritty |
| --- | --- | --- |
| Story fun | **9/10**. The company belonged in the story. Giving away my memory of arriving in Briarwatch made the opening matter again forty levels later. | **9/10**. Taking down the Mother Bell's rope in Book Two made me responsible for carrying it into the Book Four finale. I wanted to see what other decisions would come back. |
| Combat difficulty | **2/5**. I could accept a low-odds conversation or try a hunt without worrying much about a reset. Zero rescues. | **4/5**. Three story fights and the legendary trial needed a rescue and retry. Two optional hunts also ended in losses. Better gear, resting, and playing the objectives gave me a way through. |
| Combat fun | **6/10**. The new hunts gave me something worth going out of the way for. Many ordinary fights settled into the same sequence once the party was geared. | **8/10**. The best fights made me choose between attacking and getting everyone through the objective. Taking a fragile party into a second fight was the part I least wanted to repeat. |
| Overall fun | **8/10** | **8/10** |

The Mother Bell is where Soren's combat clicked for me. My first attempt to defend the casting hall ended in rescue. On the retry I ordered the party to cover the objective, used the Glasswind Bow's Pinning Shot, and worked the doors. Soren finished with 40/135 HP. Hal, whom I'd sent to the guild earlier, took off her guild coat and held the door for Orin. His “Terrible. I'd like to do it again” landed because the fight had given me a reason to fear what he was giving up.

On Mira's run, Nessa chose her answer to Wren, handed the no over herself, burned the yes “a corner at a time,” and asked what was for supper. That turn back to supper sounded like Nessa. The same understated writing made her chalking “SHE IS MY FRIEND. NESSA.” onto Heath's door in Book Four land. Maren's habit of making stew in tense camps and Orin's need to take the door made their company feel lived in. The humour came out in what each of them did when the rest of the party was waiting.

## Findings

### The legendary trial charged 9,200 gold after promising a free rescue

- **Where** The Ruinmaker Trial, `defeat` → `recover`, at turn 1,441.
- **What** “The supervised trial has no gold penalty.” Soren had **36,800 gold** when the party fell. Rescue deducted **9,200** and left him with **27,600**. He kept his XP and equipment. He rested for free and won the resumed trial in round two with Unravel and Controlled Blast.
- **Why it matters** The practice cost a quarter of the party's funds even though the game said it was free. That makes trying a new approach much more expensive than the player was told.
- **Suggestion** Apply the promised waiver to the written job trials and add a regression check that gold stays unchanged after a legendary trial rescue.
- **Severity** Major.

### The hunt return screen hides a recovery action when it matters most

- **Where** The Last Roof (`q-b3-saltwick-start`, `hunt-tallow`) and The Hall of Legends (`q-b4-peaks-start`, `hunt-whitecoat`), after `back`.
- **What** “Back to the chapter, where you can rest and go on.” The terminal showed how to return to town and omitted the local short-rest command. Soren beat Tallow and then lost the deciding fight at Saltwick. He beat Old Whitecoat and went into the next scene at **14/233 HP**, with Orin at **22/206 HP**. The failed crossing check immediately opened combat and Soren went down before his first turn. In a separate CLI fixture, I took damage, used `back`, and successfully ran `do '{"type":"short-rest"}'` from the Hall opening.
- **Why it matters** The new hunts leave players deciding whether to risk the story fight, and the local rest command is hidden from the screen where they decide.
- **Suggestion** After a hunt, print the short-rest command when available and label the return-to-town option as the way to recover fully before resuming the chapter.
- **Severity** Major for the terminal playthrough. Browser controls were outside this test.

### The defeat screen names the wrong threat and points away from rescue

- **Where** `defeat` after The Last Roof and The Hall of Legends. The same screen also followed the Mother Bell and Ruinmaker Trial defeats.
- **What** “Reload a save or begin a new campaign.” The next paragraph says the bell is “carrying Sable's command farther through the roots.” At Saltwick the crisis was a town on its roofs. At the Hall it was a crossing in the white. The visible rescue choice worked and sent me back to town to rest and resume.
- **Why it matters** A new player could reload and lose progress after a recoverable defeat, and the wording breaks both late scenes.
- **Suggestion** Put rescue and resuming first in the goal. Use the current expedition's threat for the defeat prose, with a neutral line as fallback.
- **Severity** Minor. Every interrupted fight was recoverable.

### The middle of Book Four repeats its approach even when the people and stakes change

- **Where** The Wold stretch from The Captain's Order (`q-b4-sheddon-start`) through The Reckoner's Sum (`q-b4-reckoning-start`).
- **What** The run repeatedly returned to civic rest, departure, conversations, investigation, approach check, and a deciding check that could start a fight. At Orme's hearing, “Ask the door-boards to wait for the free wards' own answer” came after investigating the sum and finding out whose boards would lie face up. The vote and its terms were what I most wanted to decide. Thrum's scene with Heath and Nessa was the relief from that rhythm.
- **Why it matters** Late in a long campaign I started anticipating the menu sequence before I got to the decision that made each place distinct.
- **Suggestion** Let the party carry a result from one town into the next and use it to open directly on a conversation or decision. The two accounts, the vote, and the door in Thrum are the scenes I'd preserve.
- **Severity** Minor pacing issue.

## Progression and grind

| Gate | Mira, Story | Soren, Gritty |
| --- | --- | --- |
| Level 10, 18,900 XP | 16,717 XP at the gate. The board said **2,183 XP**, about **four** 600-XP bounties. Four wins opened it. | 17,753 XP at the gate. The board said **1,147 XP**, about **two** 600-XP bounties. Two wins opened it. Greyback had already paid 900 XP. |
| Level 20, preview open | Book Two ended at level 18 with 63,877 XP. The Book Three route opened and I earned Lifewarden in the story. | Book Two ended at level 18 with 61,983 XP. The Book Three route opened and I earned Saboteur in the story. |
| Level 40 and 70 trials | Zero further repeat bounties. | Zero further repeat bounties. |

I rate Mira's level 10 repeat grind **3/5**, Soren's **2/5**, and the rest of both preview runs **1/5**, where 1 means the story carries progression, 2 means one to three repeat wins, and 3 means four to six. On a copy of Talia's earlier Book Two save with preview off, the new post-book catch-up rate took **17 wins** to reach level 20 from **56,765 XP**, compared with **26** in the previous test. That's still **5/5** on the previous review's scale for eleven or more repeats. [Previous difficulty and grind review](https://github.com/curtistankiatming/AI-DnD-GM/blob/68a20d6/docs/reviews/codex-difficulty-grind-2026-11-25.md)

The new chapter-fight reward was visible in play. At the Mother Bell, winning paid **630 XP** before the choice at the rope. The special hunts offered better variety than the Highpass bounty loop. Mira beat Old Clinker for **1,730 XP** and Old Whitecoat for **4,200 XP**. Soren lost to Old Snapjaw and Old Tollclaw without losing gold or progress, and won against Greyback, Tallow, and Whitecoat. The Whitecoat opening showed **354 boss HP** on Story and **533** on Gritty. Both won, with Mira at **256/257 HP** and Soren at **14/233 HP**. Soren equipped the Whitecoat Mantle for warmth and the next expedition board warning correctly listed only the three companions as unwrapped.

## Three things to keep

1. **Let early choices come back as something you can touch.** Mira sacrificed the memory of the inn and arrived at an ending that asked everyone to give a little. Soren sealed the stair, and the scene kept Orin's badge and Nessa's letter on the floor. Later Soren carried the Mother Bell's rope in himself and chose Sloe's backward note, giving the Wold a clear winter at the cost of the free wards' worst in nine hundred years. Mira put the Parting Bell away and used the rota. Both routes let me recognize my earlier decisions in the ending.
2. **Keep the hunt rewards specific to the place.** Greyback helped Soren reach level 10, Tallow gave him a collar-bell, and Whitecoat gave warmth just as the road began to demand it. The bear collapsing “with a sound like a roof coming in” belongs on that pass.
3. **Keep hard fights with a job to do.** Holding the casting hall doors made a Rogue with a bow feel different from a Cleric keeping everyone standing. I'd replay a short objective encounter before another round against the same Highpass Ridge Stalker.

The full test suite reported **1,212 passed, one skipped, zero failures**.
