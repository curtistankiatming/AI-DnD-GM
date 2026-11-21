# Gameplay playtest after the rebalance (21 November 2026)

An independent playtest of the five-step combat and equipment rebalance
(PRs #56, #61, #66, #68, #70), checked against Curtis's goals:

- fights last about 4 to 7 rounds;
- falling more than 5 levels behind is punished, and side battles fix it;
- a balanced team beats an all-damage team;
- gold matters;
- no soft-locks or crashes.

Played at commit `8b150cb` (master after #70), with Book Three previewed
(`BRIARWATCH_PREVIEW_BOOKS=1`). No paid AI model was called.

## What was played

- **144 scripted campaigns** from level 1 to the end of Book Three Part One
  (level 28 to 30): 6 classes, 4 play styles, 3 difficulties, 2 seeds. The
  player is `tests/player-policy.js`, which reads only the screen.
  "Careful" uses the objective route, takes side jobs and bounties until caught
  up; "peace" looks for peaceful endings; "direct" fights every deciding battle
  by force and takes bounties only when more than 3 levels behind; "skip" never
  takes side content.
- **More than 60 random-action campaigns**: the same player, but 30% of the time it does
  something random that the screen offers (buy, sell, equip anything on anyone,
  change tactics, travel, bounties, side jobs, retreat), and the save is
  reloaded every 200 steps.
- **Fight tests**: each chapter's deciding fight by force, for all six classes
  with several seeds, at Harbour (level 13), the Oath (19), Saltwick (23) and the
  Vault (27), and also at the levels of Book One. These start from a fresh hero
  with starting gear (a review fixture, not a real playthrough).
- **AI adventures**: `npm run balance` at levels 20, 40, 70 and 100.

## Findings, most important first

### 1. Fights by force were too long (major, fixed)

Average rounds per deciding fight, scripted campaigns:

| Difficulty | Levels | By force | By objective | Bounty |
|---|---|---|---|---|
| Standard | 6-10 | 7.0 | 3.9 | 5.7 |
| Standard | 11-20 | 8.9 | 4.2 | 6.7 |
| Standard | 21-30 | 7.6 | 4.8 | — |
| Gritty | 11-20 | 11.2 | 4.4 | 8.1 |
| Gritty | 21-30 | 9.7 | 5.2 | — |

AI adventures averaged 7.5 rounds on Normal, 8.4 on Hard and 9.1 on Heroic.
On the fight tests at the right level, Standard force fights took 6.6 to 8.8
rounds, Gritty 7.6 to 10.8, and the party almost never lost (100% wins, 70-86%
health left). Fights were long and safe at the same time: enemies had too much
health for the damage the party now deals.

**Fix** (`src/xp.js`): enemy health is trimmed by a quarter, easing in from
level 5 to the full trim at level 8, and enemies hit harder by the same amount
as they shrink (+3 per hit per power tier on top of the existing +3, so +6 per
tier from level 8). Levels 1 to 4 are unchanged, and Book One's level 5 fight
(the Archive) hits as hard as before. This covers every chapter, bounty and AI
adventure fight, which all use the same enemy table.

### 2. In late Book Three, being far behind barely mattered (major, fixed)

Fight tests, deciding fight by force, Standard, win rate by levels under:

| Chapter | Even | 3 under | 5 under | 6 under | 8 under |
|---|---|---|---|---|---|
| Harbour (13) | 100% | 88% | 38% | 21% | 0% |
| Oath (19) | 100% | 79% | 54% | 29% | 0% |
| Saltwick (23) | 100% | 100% | 100% | 75% | 25% |
| Vault (27) | 100% | 100% | 100% | 100% | 83% |

In Books One and Two, falling behind already hurts a lot, even before the
penalty starts at 6 under. In Book Three a level past 20 adds little raw power
(the jobs carry the growth), so a level 21 hero at the level 27 Vault fought as
well as a level 27 one.

**Fix** (`src/xp.js`): in the deciding fight, each missing level past 20 (and
past 5 under) counts three times: +3 to hit and +30% damage instead of +1 and
+10%. Missing levels below 20 count once, as before, and the fight penalty
stops at 9 steps so a fight far behind stays hard rather than hopeless. Story
checks keep one step per level, at most 5. Both reviewers flagged the first
version (weight by chapter level, no cap) as too harsh at chapters 21 to 23
and at 10 under; this is the corrected rule. With that, at
the Vault (after the fight fixes) 7 under wins 94%, 8 under 83% and 10 under
56% on Standard (Gritty 72%, 39% and 28%), against 100% at 6 under before.
Saltwick (23) is mostly below level 20 for a hero that far behind, so it keeps
the single steps. The "What's next?" card shows the real numbers before you
set out.

**Fixable by side battles?** Yes. A bounty pays 15% of a level while you are
behind, so each missing level costs about 7 bounties. No scripted player ever
fell more than 3 levels behind on the main path, even one who never took side
content (skip players end Book Two at 17 and Part One at 28), so the penalty
only meets players who deliberately avoid the bounty board.

### 3. Balanced team beats all-damage (works, no change)

The game has three fixed companions, so an "all-damage team" means setting
every companion's tactic to Aggressive (or leaving one out). Fight tests at
Harbour, the Oath, Saltwick and the Vault, 30 fights each:

| Team | Standard win | Gritty win | Hero knock-downs per fight |
|---|---|---|---|
| Default tactics (balanced) | 100% | 90-100% | 0.00-0.37 |
| All Aggressive | 97-100% | 83-100% | 0.20-0.70 |
| All Protective | 97-100% | 87-93% | 0.03-0.50 |
| Without Maren (healer) | 63-93% | 27-60% | 0.17-0.83 |
| Without Orin (guardian) | 90-97% | 60-77% | 0.43-0.87 |
| Without Nessa (scout) | 87-100% | 53-83% | 0.13-0.43 |

All Aggressive ends fights about half a round sooner but knocks the hero down
two to three times as often and loses more on Gritty. Dropping any companion
costs more, the healer most of all. Together with story checks going to the
best-suited companion, this rewards keeping the full, balanced party. After the
fixes the pattern is the same.

### 4. Gold piles up from mid Book Two (major, passed to the items review)

Heroes end Part One with 10,000 to 12,000 gold unspent. A player who buys every
upgrade the shop comparison shows, for the hero and all three companions, still
spends only about 6,000 of 13,500 earned and ends Book Two with about 3,000
spare. Gold is tight in Book One (under 500 by the beacon) and stops mattering
from about level 14; the dearest item costs 700. This is an economy question
for the items review, not changed here.

### 5. Five skills skipped stat damage (minor, fixed; see the merge note below)

Arcane Snare, the bard and rogue Sabotage, the wizard Nova, the cleric
Banishment and Nessa's Trick Shot added no stat damage while every other attack
does (`src/combat.js`). They now add it. The Burning description also said
"each turn" although most Burning lasts one round; it now says "at the start
of its turn while it burns".

### 6. Soft-locks and crashes (none found)

No crash, rejected action loop or dead end in the 144 scripted or the 60-plus
random-action campaigns, including selling and re-equipping gear mid-story,
changing tactics, retreating and reloading saves. Every run reaches the end of
Book Three Part One, where the written story stops until Part Two
(`tests/campaign-playtest.js` reports that end state as an engine error, on
master too, because it expects the books to be complete). One
random-action run on Gritty spent 1,500 steps 3 levels behind losing the first
Book Three fight by force and retrying; the scripted direct player only takes
bounties when more than 3 behind, and the same run finished on the final code,
so this is the player, not the game.

## After the fixes

AI adventures (`npm run balance`, levels 20 to 100, every class and branch, 4
seeds):

| Tier | Rounds before | after | Win % before | after | Health left before | after | Without jobs, win % before | after |
|---|---|---|---|---|---|---|---|---|
| Normal | 7.5 | 5.7 | 99 | 100 | 66% | 65% | 72 | 80 |
| Hard | 8.4 | 6.4 | 97 | 97 | 60% | 59% | 51 | 61 |
| Heroic | 9.1 | 7.0 | 91 | 94 | 51% | 50% | 34 | 39 |

Fight tests at the right level, by force (rounds, win rate):

| Chapter | Standard before | after | Gritty before | after |
|---|---|---|---|---|
| Signal (6) | 5.7, 100% | 5.2, 100% | 6.5, 100% | 5.8, 100% |
| Beacon (9) | 6.6, 100% | 5.4, 100% | 7.9, 100% | 6.2, 100% |
| Harbour (13) | 7.1, 100% | 5.6, 96% | 8.5, 100% | 6.9, 100% |
| Cinder Fold (16) | 8.6, 100% | 6.7, 100% | 11.3, 88% | 7.9, 92% |
| Oath (19) | 8.8, 100% | 6.1, 100% | 10.5, 92% | 8.4, 96% |
| Saltwick (23) | 6.6, 100% | 5.5, 100% | 7.6, 96% | 6.3, 96% |
| Vault (27) | 6.7, 100% | 6.0, 96% | 7.8, 96% | 6.4, 96% |

Scripted campaigns, before and after:

| Difficulty | Route | Levels | Rounds before | after | Fights lost before | after |
|---|---|---|---|---|---|---|
| Story | By force | 1-5 | 5.3 | 5.2 | 0 of 96 | 0 of 96 |
| Story | By force | 6-10 | 5.9 | 4.5 | 0 of 84 | 0 of 84 |
| Story | By force | 11-20 | 7.3 | 5.2 | 0 of 144 | 0 of 144 |
| Story | By force | 21-30 | 6.3 | 4.5 | 0 of 72 | 0 of 72 |
| Story | Objective route | 1-5 | 3.2 | 3.2 | 0 of 184 | 0 of 184 |
| Story | Objective route | 6-10 | 3.9 | 3.9 | 0 of 202 | 0 of 197 |
| Story | Objective route | 11-20 | 3.9 | 4.0 | 0 of 323 | 2 of 328 |
| Story | Objective route | 21-30 | 4.6 | 4.3 | 0 of 212 | 0 of 208 |
| Standard | By force | 1-5 | 6.6 | 6.4 | 3 of 99 | 3 of 99 |
| Standard | By force | 6-10 | 7.0 | 5.5 | 0 of 84 | 0 of 84 |
| Standard | By force | 11-20 | 8.9 | 6.1 | 6 of 150 | 1 of 145 |
| Standard | By force | 21-30 | 7.6 | 5.5 | 1 of 73 | 0 of 72 |
| Standard | Objective route | 1-5 | 3.7 | 3.7 | 1 of 183 | 1 of 183 |
| Standard | Objective route | 6-10 | 3.9 | 4.0 | 0 of 207 | 0 of 211 |
| Standard | Objective route | 11-20 | 4.2 | 4.6 | 6 of 320 | 10 of 329 |
| Standard | Objective route | 21-30 | 4.8 | 4.7 | 0 of 209 | 0 of 217 |
| Gritty | By force | 1-5 | 8.7 | 9.3 | 42 of 138 | 75 of 171 |
| Gritty | By force | 6-10 | 8.2 | 6.3 | 1 of 85 | 1 of 85 |
| Gritty | By force | 11-20 | 11.2 | 7.8 | 64 of 208 | 24 of 168 |
| Gritty | By force | 21-30 | 9.7 | 6.5 | 10 of 82 | 2 of 74 |
| Gritty | Objective route | 1-5 | 3.8 | 3.9 | 3 of 186 | 2 of 185 |
| Gritty | Objective route | 6-10 | 3.8 | 4.0 | 0 of 211 | 1 of 206 |
| Gritty | Objective route | 11-20 | 4.4 | 4.8 | 5 of 331 | 14 of 337 |
| Gritty | Objective route | 21-30 | 5.2 | 5.2 | 1 of 209 | 7 of 221 |

Gritty levels 1 to 5 by force: one Gritty bard who forced the Archive (level 5)
from level 4 lost it 40 times in a row before winning (11 times before the
fix, on different dice; that fight's enemies are unchanged). The scripted
direct player only takes bounties when more than 3 behind, so it kept
retrying; a real player would take the objective route or a bounty. The other
Gritty runs lost the Archive about as often as before. The objective route got
slightly riskier at levels 11 to 30 (on Standard 10 of 329 fights lost instead
of 6 of 320), because enemies now hit harder while that fight still lasts 4 to
5 rounds.

Bounty fights after the fixes: 3.8 to 5.8 rounds (before 4.6 to 8.1) and still
no losses in about 2,600 bounty fights across all three difficulties. Hero
knock-downs per fight by force, levels 11 to 20: Standard 0.15 before, 0.13
after; Gritty 0.57 before, 0.42 after.

Standard and Story force fights now sit inside 4 to 7 rounds (4.5 to 6.4);
Gritty, the hard setting, runs 6.3 to 7.8 past level 5 and loses far less. The objective route is unchanged at 4 to 5 rounds.

## After merging the other area reviews (#71 to #75)

The systems review (#72) had already given the older skills stat damage (with
gear damage and chains too), so this PR keeps its version and adds only Trick
Shot. #72's under-level objective DC now uses the unweighted check steps.
Re-checked on the merged code: fight tests by force at the right level take 4.6
to 6.1 rounds on Standard and 5.3 to 7.3 on Gritty (94-100% wins); AI
adventures 5.5 / 6.1 / 6.6 rounds (Normal / Hard / Heroic), 100% / 98% / 94%
wins. 861 tests pass.

## Left for later

- The objective route got slightly riskier, because one enemy table feeds every
  fight: Gritty levels 21 to 30 lost 7 of 221 objective fights (1 of 209
  before). A small objective DC relief would offset it; watch it in the next
  playtest.
- Averages hide some long AI adventures at level 20: on Heroic, the bard's
  Battlecantor and Envoy branches still take 8 to 11 rounds, and the Chronist
  and Lifewarden branches win only about a third of the time (3 to 4 seeds,
  so noisy). Level 20 Heroic was already the hardest cell before this change.
- Sabotage, Nova and Banishment add stat damage now, but not gear damage or
  the chain bonus that other job skills get (as before this PR).
- Gold surplus, for the items review.

## Three things that work well

1. The objective route: 4 to 5 rounds, rarely lost, and clearly rewarded for
   preparing (rumours, careful approach).
2. Companions each matter, and the healer most: losing one is felt at once.
3. The bounty board is a clean safety valve: no losses in over 1,700 bounty
   fights on Story and Standard, and it always pays enough to clear a
   checkpoint such as the Oath of the Road.
