# Enemies past level 40, 22 November 2026

Reviewers found that enemies past level 40 were too easy, whatever gear the
party had. This pass measured the standard fight from level 40 to 100 with the
gear of PR #86, found where the curve flattens, and added a small growth term
for enemies past 40. Levels 1 to 40 are unchanged. No AI calls.

## How it was measured

Two scratch harnesses (not committed), both modelled on
`scripts/balance-sim.js` and `tests/player-policy.js`. Each runs the standard
AI adventure fight, a boss and two retainers from `XP.foeStats`, by force:

- **Best gear** (this pass): every class and all 18 branches, with the jobs
  due at each level. Every party member wears the best kit they can at that
  level: the PR #86 catalogue with set bonuses, Masterwork refines and the
  level bounty rewards. The settings are Standard Normal, Hard and Heroic, and
  Gritty Normal and Heroic. Six seeds a cell, rotating the six enemy themes,
  with the hero plus Orin and Maren, and with the hero alone. A third run uses
  shop gear only (no Masterwork).
- **Shop gear** (second reviewer): all 18 branches; each member wears the
  most valuable wearable item per slot, with no Masterwork. Standard Normal and
  Heroic, six seeds a branch, party and solo.

The policies use job skills, gear and set skills, then plain attacks. Each
records rounds to win, the hero's lowest health in the fight (health lost),
and losses.

## Where the curve flattens

| Level | Boss HP | Boss damage | Enemy to hit | Party AC (avg) | Boss hits | Hero HP |
|---:|---:|---|---:|---:|---:|---:|
| 40 | 129 | 6d6+34 | +13 | 25.4 | 43% | 186 |
| 50 | 138 | 6d6+35 | +13 | 27.2 | 34% | 210 |
| 70 | 161 | 7d6+42 | +13 | 29.8 | 21% | 262 |
| 100 | 246 | 9d6+51 | +13 | 31.9 | 13% | 330 |

(Best gear; party AC averaged over the six classes and both companions.)

Enemy health kept up with the party's damage well enough: rounds by force
hardly moved. **Enemy pressure did not.** Enemy attacks stop at +13 from level
20 (bounded accuracy), but the late gear keeps adding AC (+6.5 on average from
40 to 100) and cuts damage taken toward its 30% cap. At 100 the boss hits a
fighter in plate only on a natural 20. Expected damage to the hero per round,
as a share of their health, fell to about a quarter of its level-40 value.

## The change

`src/xp.js`, beside `ENEMY_TIER_DAMAGE`:

```js
const LATE_LEVEL = 40, LATE_HP = 0.006, LATE_DAMAGE = 0.3, LATE_ATTACK_EVERY = 15;
const lateLevels = level => Math.max(0, Math.min(P.MAX_LEVEL, level) - LATE_LEVEL);
```

`challenge()` now returns `late` (levels past 40, at most 60), and `foeStats()`
uses it:

- health × (1 + 0.6% per level past 40): +6% at 50, +18% at 70, +36% at 100;
- damage per hit + 0.3 per level past 40: +3 at 50, +9 at 70, +18 at 100;
- +1 to hit for every 15 levels past 40: +0 at 50, +2 at 70, +3 at 90, +4 at 100
  (boss +17 at 100). Enemy AC and DCs do not change.

It is keyed on the adventure's level, not its power, so a Hard or Heroic
adventure below 40 (power +2 or +4) is unchanged. Renown past 100 adds power as
before, but no more late growth. `reference()` now builds its fight from
`challenge()`, so battle ratings use the same numbers; the standard battle
still rates "hard" at every level. Written chapters, bounties, AI adventures
and the job trial at 70 all build enemies through `challenge()` and
`foeStats()`, so they get the scale without data changes. Book Three Part Two
stops at 39, and Book Four's chapters at 41 and 42 gain under 2% health.

| Level | Boss HP | Boss damage | Enemy to hit | Boss hits |
|---:|---:|---|---:|---:|
| 40 | 129 | 6d6+34 | +13 | 43% |
| 50 | 146 | 6d6+38 | +13 | 34% |
| 70 | 189 | 7d6+51 | +15 | 31% |
| 90 | 278 | 8d6+65 | +16 | 29% |
| 100 | 334 | 9d6+69 | +17 | 31% |

### Why these constants

The first version (commit 71a6fbf) used `LATE_ATTACK_EVERY = 10`, which gave
+6 to hit at 100. It matched level 40 in the best-gear harness. The second
reviewer's shop-gear harness showed it overshooting, though: the party lost
19 to 22% of the hero's health at 90 to 100 against 10% at 40, and the solo
hero lost 63 of 108 at 90 against 38 at 40. Shop gear has less AC than the best
kit, so the extra to-hit counts for more. When the two reviews disagreed, the
safer of the two tunes was taken:

- `LATE_ATTACK_EVERY = 15` (+4 at 100), so the to-hit growth roughly halves
  the AC gap instead of closing it.
- `LATE_DAMAGE = 0.3` and `LATE_HP = 0.006` stay as they were. Both reviewers
  agreed on them.

At 50 enemies have no to-hit step yet, so levels 41 to 54 are a little lighter
than 40 in both harnesses.

## Before and after

Each cell is rounds / hero health lost (lowest point) / losses.

### Best gear, hero with Orin and Maren (108 fights a cell)

| Level | Setting | Before | Every 10 (71a6fbf) | **Every 15 (final)** |
|---:|---|---|---|---|
| 40 | Standard Normal | 3.3 / 9% / 0 | same | **same** |
| 40 | Standard Heroic | 3.7 / 15% / 0 | same | **same** |
| 40 | Gritty Heroic | 4.1 / 16% / 0 | same | **same** |
| 50 | Standard Normal | 3.6 / 7% / 0 | 3.7 / 10% / 0 | **3.7 / 8% / 0** |
| 50 | Standard Heroic | 4.0 / 11% / 0 | 4.2 / 15% / 0 | **4.2 / 13% / 0** |
| 50 | Gritty Heroic | 4.5 / 14% / 0 | 4.8 / 20% / 0 | **4.8 / 16% / 0** |
| 70 | Standard Normal | 3.4 / 3% / 0 | 3.8 / 6% / 0 | **3.7 / 5% / 0** |
| 70 | Standard Heroic | 3.7 / 4% / 0 | 4.0 / 10% / 0 | **4.0 / 8% / 0** |
| 70 | Gritty Heroic | 4.0 / 7% / 0 | 4.5 / 16% / 0 | **4.5 / 13% / 0** |
| 90 | Standard Normal | 3.1 / 4% / 0 | 3.8 / 11% / 0 | **3.8 / 9% / 0** |
| 90 | Standard Heroic | 3.4 / 6% / 0 | 4.1 / 17% / 0 | **4.0 / 14% / 0** |
| 90 | Gritty Heroic | 3.7 / 7% / 0 | 4.8 / 27% / 0 | **4.8 / 18% / 0** |
| 100 | Standard Normal | 3.0 / 1% / 0 | 3.9 / 9% / 0 | **3.9 / 5% / 0** |
| 100 | Standard Heroic | 3.2 / 2% / 0 | 4.2 / 11% / 0 | **4.2 / 8% / 0** |
| 100 | Gritty Heroic | 3.7 / 3% / 0 | 4.8 / 15% / 0 | **4.9 / 12% / 0** |

### Best gear, the hero alone (losses of 108)

| Level | Setting | Before | Every 10 (71a6fbf) | **Every 15 (final)** |
|---:|---|---|---|---|
| 40 | Standard Normal | 5.6 / 52% / 22 | same | **same** |
| 40 | Standard Heroic | 5.5 / 65% / 39 | same | **same** |
| 40 | Gritty Heroic | 5.1 / 73% / 57 | same | **same** |
| 50 | Standard Normal | 5.7 / 36% / 10 | 6.1 / 46% / 12 | **6.0 / 39% / 11** |
| 50 | Standard Heroic | 6.3 / 50% / 17 | 6.0 / 59% / 30 | **6.4 / 54% / 25** |
| 70 | Standard Normal | 4.9 / 21% / 2 | 5.1 / 46% / 25 | **5.3 / 41% / 16** |
| 70 | Standard Heroic | 5.1 / 36% / 14 | 5.1 / 58% / 37 | **5.3 / 54% / 34** |
| 90 | Standard Normal | 4.8 / 25% / 4 | 4.8 / 53% / 34 | **5.1 / 47% / 29** |
| 90 | Standard Heroic | 5.1 / 34% / 13 | 4.8 / 64% / 49 | **4.8 / 56% / 43** |
| 100 | Standard Normal | 4.3 / 11% / 0 | 4.9 / 36% / 11 | **5.2 / 32% / 9** |
| 100 | Standard Heroic | 4.6 / 18% / 5 | 5.2 / 45% / 18 | **5.5 / 40% / 17** |

### Shop gear (second reviewer's harness), hero with Orin and Maren (108 fights a cell)

The "every 10" column gives the second reviewer's figures. The other two
columns were re-run for this report.

| Level | Setting | Before | Every 10 (71a6fbf) | **Every 15 (final)** |
|---:|---|---|---|---|
| 40 | Normal | 3.6 / 10% / 0 | same | **same** |
| 40 | Heroic | 4.0 / 15% / 0 | same | **same** |
| 50 | Normal | 3.7 / 7% / 0 | | **3.9 / 8% / 0** |
| 50 | Heroic | 4.1 / 14% / 0 | | **4.3 / 15% / 0** |
| 70 | Normal | 4.1 / 6% / 0 | | **4.7 / 12% / 0** |
| 70 | Heroic | 4.5 / 10% / 0 | | **5.4 / 19% / 0** |
| 90 | Normal | 3.6 / 6% / 0 | 19 to 22% at 90 to 100 | **4.5 / 16% / 0** |
| 90 | Heroic | 4.0 / 10% / 0 | | **4.9 / 25% / 0** |
| 100 | Normal | 4.3 / 6% / 0 | | **5.5 / 14% / 0** |
| 100 | Heroic | 4.7 / 7% / 0 | | **6.0 / 18% / 0** |

### Shop gear, the hero alone (losses of 108)

| Level | Normal before | **Normal final** | Heroic before | **Heroic final** |
|---:|---|---|---|---|
| 40 | 5.3 / 63% / 38 | **same** | 4.9 / 78% / 61 | **same** |
| 50 | 6.1 / 49% / 17 | **6.1 / 53% / 25** | 5.9 / 68% / 41 | **5.9 / 70% / 48** |
| 70 | 6.6 / 47% / 22 | **6.1 / 64% / 42** | 6.3 / 57% / 30 | **5.9 / 78% / 64** |
| 90 | 5.9 / 45% / 20 | **5.3 / 71% / 56** | 5.7 / 58% / 34 | **5.2 / 81% / 66** |
| 100 | 6.1 / 24% / 3 | **7.3 / 64% / 38** | 6.5 / 35% / 9 | **7.2 / 77% / 58** |

The second reviewer had 63 solo Normal losses at 90 with "every 10".

What it shows:

- **Before**, from 40 to 100 the hero lost far less health each fight. With
  the party in best gear it fell from 9% to 1%, and alone from 52% to 11% (22
  losses to none). With shop gear it fell from 10% to 6%, and alone from 38
  losses to 3. Fights did not get longer. This was the flattening the
  reviewers felt.
- **After**, the party past 40 stays close to level 40's band in both
  harnesses. Best gear: 5 to 9% lost on Normal against 9% at 40, and 8 to 14%
  on Heroic against 15%. Shop gear: 8 to 16% against 10%, and 15 to 25%
  against 15%. Fights run a little longer as the jobs and sets pile up, and
  nobody loses with a party.
- **Shop gear at 90 is the high point.** At 90, which has no level-100
  ultimate, Heroic loses 25% (1.7 times level 40's), and solo Normal loses 56
  of 108 against 38. That is lower than "every 10" (63) but still above 40.
  Solo play at 100 is back at level 40's 38 losses.
- No fight in about 30,000 ran out of steps, so there were no soft-locks.

Absolute rounds are short against Book Three's playtest (31 to 40 by force:
4.1 Story, 5.1 Standard, 6.0 Gritty). Both harnesses fight the AI adventure
from full health with the whole party kitted out at once. Each harness's own
level 40 is the comparison; real play past 40 should land where real play at
40 does.

## Tests

`tests/enemies-past-40.test.js`:

- levels 1 to 40, every tier: a digest of every `foeStats` field and
  `reference()`, taken from the code before the change, and level 40 written out;
- the stats at 50, 70 and 100, AC never growing, every number growing level by level;
- `reference()` and `rate()` built from the same numbers, with the standard
  battle "hard" at 41 to 100;
- a seeded simulation of a fighter, rogue, wizard and cleric with Orin and
  Maren in shop gear (Normal and Heroic, six themes). At 50, 70 and 100 it
  checks four things:
  - the party wins and no fight stalls;
  - fights last at least as long as at 40, and at most 7 rounds;
  - the hero loses **at most 1.5 times** the health they lose at 40;
  - the hero loses at least three quarters of level 40's from 70, and half at
    50. The old code fails this: at 70 Normal it lost 4% against 6%.
- Bard Lorekeeper wins inside 7 rounds at 50, 70 and 100, on Normal and Heroic.

`tests/balance.test.js`, `tests/levels-xp.test.js` and `tests/renown.test.js`
pinned the old numbers past 40 and now include the late growth.

## Follow-ups (not fixed here)

- **Bards run past 7 rounds by force at 70 to 100.** In the shop-gear harness
  (party, final tune) Battlecantor takes 8.0 rounds at 70, 6.5 at 90 and 8.7
  at 100 on Normal. On Heroic it takes 10.2, 7.8 and 9.3. Envoy takes 7.0,
  6.5 and 6.0 on Normal, and 9.8, 8.3 and 6.0 on Heroic. Both still win every
  fight, and the objective route is open to them. This continues Book Three's
  note on long support branches. A damage bump for those branches should get
  its own pass.
- **Ranger Pathfinder at level 100 ends every fight in round 1**, through its
  level-100 objective ultimate. The best-gear harness shows this before and
  after, on every setting. It is not a force fight and this pass leaves it
  alone, but it makes the level-100 Pathfinder fight trivial.

## For the owner to decide

- **Enemy to-hit past 40.** The design kept enemy attacks bounded at +13 from
  level 20. Late gear does not bound AC the same way, so enemies now climb +1
  every 15 levels past 40 (+17 at 100). The alternative is to trim AC from the
  late gear and leave enemies bounded, which would touch PR #86's catalogue
  and its tests.
- **Level 90 solo.** Without the level-100 ultimate, a solo hero in shop gear
  loses about half of Standard fights at 90. A party never loses.
