# Briarwatch combat difficulty and grind, 25 November 2026

I started Talia, a level 1 Wizard on Gritty with seed **61**, on `master` at `cc084ea68620260e25e159ed573f4c7463273a3e`. I used Node.js v24.22.1 and the offline terminal with `BRIARWATCH_PREVIEW_BOOKS=1`. The terminal's `new` command uses Standard, so I used the game's normal character creation function to select Gritty, then played the resulting level 1 save with `node scripts/play.js`. I made the story choices myself and used `auto 1` for combat alongside manual actions. The main run used the written job trials, with zero save edits, scene jumps, or live AI calls.

Talia finished all four books and the legendary trial as a **level 71 Archmage of Ruin**, in Briarwatch with **737,540 XP**. The main save advanced **1,126 turns**, including 594 manual `choose` actions, 311 `auto 1` combat actions, 16 manual combat actions, and 205 other commands.

## Combat ratings

**1/5** means forgiving, **2/5** means occasional danger, **3/5** means sustained tactical pressure, **4/5** means preparation and recovery matter, and **5/5** means repeated party defeats even with preparation. These ratings describe a Wizard with three companions and ordinary gear bought with campaign earnings.

| Mode | Rating | Book Four by force | Book Four by objective | Hero knockdowns |
| --- | --- | --- | --- | --- |
| Story | **1/5** | 2 rounds, 100% party HP left | 3 rounds, 100% HP left | 0/30 fights |
| Standard | **2/5** | 3 rounds, 96% party HP left | 3 rounds, 94% HP left | 0/30 fights |
| Gritty | **4/5** | 4 rounds, 68% party HP left | 4 rounds, 68% HP left | 6/30 fights |

The table uses medians from **90 scripted fights**. I copied saves reached in the main campaign just before the deciding fights in Two Accounts, The Road to the Peaks, and The Parting Bell. Each copy kept the same party, gear and preparation. I changed only the mode in the comparison copies and ran five fixed seeds per fight, mode and method. The force policy focused attacks and used available area spells. The objective policy pursued the encounter objective with the repository's combat policy. All 90 fights reached a win. The hardened enemies appeared in every Gritty replay and in zero Story or Standard replays.

The Parting Bell objective had the largest difference in round count. It took a median of **three rounds with 93% party HP left on Standard**, and **five rounds with 64% HP left on Gritty**. Talia went down in three of the five Gritty attempts. The main run also got her through that fight with **1/242 HP** after a knockdown and a costly victory. In the legendary trial she cleared the marker in round four, with Orin at **8/248 HP**. Finishing an objective before its deadline can spare the party several enemy turns, as the Road to the Peaks replay showed. On Gritty it took three rounds by objective and four by force, with two hero knockdowns by force and zero by objective.

| Main Gritty campaign | Level at finish | Fights | Talia knocked down |
| --- | ---: | ---: | ---: |
| Book One, including seven bounties and the level 10 trial | 10 | 13 | 1 |
| Book Two | 17 | 4 | 0 |
| Book Three | 40 | 7 | 1 |
| Stormcaller trial | 40 | 1 | 0 |
| Book Four | 70 | 9 | 1 |
| Legendary trial | 71 | 1 | 0 |

The main party won all **35 fights**. I spent **9,720 gold** at shops across the run, including a 165-gold brigandine that Maren lacked the Strength to use. Four warm pieces cost **3,344 gold** in Lantry. Campaign rewards covered those purchases and Talia finished with **47,295 gold**. The seven early bounty wins brought in 245 gold while closing the level gate. I never had to repeat a fight to pay for gear.

## Grind ratings

These ratings measure required repeats for a specific goal. **1/5** means the chapters carry you, **2/5** means one to three repeat wins, **3/5** means four to six, **4/5** means seven to ten, and **5/5** means eleven or more.

| Goal | Rating | What it took |
| --- | --- | --- |
| Open the level 10 trial | **4/5** | Seven Highpass bounty wins on the main run. In 18 separate Wizard runs to the gate, the scripted route needed eight wins with companion requests and ten without them, in all three modes. |
| Reach level 20 with Book Three open | **1/5** | Talia ended Book Two at level 17, entered Book Three immediately, and earned the second job through its chapters. |
| Reach level 20 with only the released books and offline bounties | **5/5** | From a copy of Talia's level 17 Book Two ending, **26 wins** in Briarwatch unlocked the second job. |
| Continue through Book Three, Book Four and the later trials | **1/5** | Zero extra bounties for XP or gear. |

### The level 10 detour is mainly repetition

At Highpass after the beacon, all three companion requests were complete and Talia had **14,935 of 18,900 XP**. The board accurately showed the **3,965 XP** gap and paid **600 XP** per win. All seven bounties repeated the Ridge Stalker with two Snow Wolves and paid 35 gold per win. One brought Talia to 8/60 HP. The trial opened at **19,135 XP**. The three-mode checks used the same Wizard setup, the repository's public-view policy, and seeds 61, 127 and 241, taking bounties only when the board required them. Mode changed the combat risk, while each matching run kept the same XP and win requirement.

### The offline level 20 detour misses the catch-up rate

- **Where** Briarwatch's bounty board after the Book Two epilogue, on the ordinary offline build with preview disabled.
- **What** Talia finished the ten Book Two chapters with **56,765 XP** and skipped their optional side jobs. I took the same ending save down the bounty route to level 20. It took **26 wins, zero losses and 354 actions**, with a median of **five combat rounds** per bounty. The board paid **600 XP at level 17, 630 at 18, and 650 at 19**. Catch-up stayed off for every win. The second-job menu opened at **73,165 XP**.
- **Why it matters** The standard bounty rate turns the second job into a long post-epilogue repeat for a player who finishes the available books and wants the job offline.
- **Suggestion** Apply the existing catch-up rate below level 20 after the last available book, or give the board a short chain of distinct contracts toward that job. The in-book level 10 gate can keep its existing rule.
- **Severity** Major pacing issue for this offline route.

## Checks and scope

The main run covered the opening, all 70 written expeditions and both later trials. The early scripted checks stopped when the first trial opened. The 90 late fights used controlled copies of three live checkpoints. The level 20 bounty check continued a separate Book Two save with preview disabled, using the same difficulty and ordinary bounty actions. The focused checks in `tests/gritty-late.test.js`, `tests/levels-xp.test.js` and `tests/catch-up-book-three.test.js` passed.

## Three things to keep

1. **Gritty stays tense after gear improves.** The matched Book Four fights showed the gap clearly. It came through in health and knockdowns even when the party still won.
2. **The objective offers a practical way out.** At the northward column, the team can win a round sooner by securing the sledges. In the legendary trial, clearing the marker gave Talia a way to finish while Orin was nearly down.
3. **The later books carry their own progression.** Talia entered Book Three three levels below its first chapter's recommendation, earned Evoker in the story, and reached both later trials without another training loop.
