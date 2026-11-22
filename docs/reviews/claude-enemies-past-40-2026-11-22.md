# Enemies past level 40, 22 November 2026

Reviewers found that enemies past level 40 were too easy, whatever gear the
party had. This pass measured the standard fight from level 40 to 100 with the
gear of PR #86, found where the curve flattens, and added a small growth term
for enemies past 40. Levels 1 to 40 are unchanged. No AI calls.

## How it was measured

A scratch harness (not committed, modelled on `scripts/balance-sim.js` and
`tests/player-policy.js`) ran the standard AI adventure fight, a boss and two
retainers from `XP.foeStats`, by force:

- every class and all three branches (18), with the jobs due at each level;
- levels 40, 45, 50, 60, 70, 80, 90 and 100;
- Standard Normal, Hard and Heroic, Gritty Normal and Heroic;
- six seeds per cell, rotating the six enemy themes;
- the hero with Orin and Maren, and the hero alone;
- every party member in the best gear they could wear at that level: the
  PR #86 catalogue with set bonuses, Masterwork refines and the level bounty
  rewards ("best gear"); and a second run with shop gear only (no Masterwork).

The policy uses job skills (ultimates first), gear and set skills, then plain
attacks. It records rounds to win, the hero's lowest health in the fight
(health lost), and losses.

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
const LATE_LEVEL = 40, LATE_HP = 0.006, LATE_DAMAGE = 0.3, LATE_ATTACK_EVERY = 10;
const lateLevels = level => Math.max(0, Math.min(P.MAX_LEVEL, level) - LATE_LEVEL);
```

`challenge()` now returns `late` (levels past 40, at most 60), and `foeStats()`
uses it:

- health × (1 + 0.6% per level past 40): +6% at 50, +18% at 70, +36% at 100;
- damage per hit + 0.3 per level past 40: +3 at 50, +9 at 70, +18 at 100;
- +1 to hit for every 10 levels past 40: +1 at 50, +3 at 70, +6 at 100
  (boss +19 at 100). Enemy AC and DCs do not change.

It is keyed on the adventure's level, not its power, so a Hard or Heroic
adventure below 40 (power +2 or +4) is unchanged. Renown past 100 adds power as
before but no more late growth. `reference()` now builds its fight from
`challenge()`, so battle ratings use the same numbers; the standard battle
still rates "hard" at every level. Written chapters, bounties, AI adventures
and the job trial at 70 all build enemies through `challenge()` and
`foeStats()`, so they get the scale without data changes (Book Three Part Two
stops at 39; Book Four's chapters at 41 and 42 gain under 2% health).

| Level | Boss HP | Boss damage | Enemy to hit | Boss hits |
|---:|---:|---|---:|---:|
| 40 | 129 | 6d6+34 | +13 | 43% |
| 50 | 146 | 6d6+38 | +14 | 39% |
| 70 | 189 | 7d6+51 | +16 | 36% |
| 100 | 334 | 9d6+69 | +19 | 41% |

## Before and after

**Hero with Orin and Maren, best gear.** Rounds / hero health lost (lowest
point) / losses, over 108 fights a cell.

| Level | Standard Normal before | after | Standard Heroic before | after | Gritty Heroic before | after |
|---:|---|---|---|---|---|---|
| 40 | 3.3 / 9% / 0 | same | 3.7 / 15% / 0 | same | 4.1 / 16% / 0 | same |
| 45 | 3.4 / 5% / 0 | 3.5 / 5% / 0 | 3.8 / 10% / 0 | 3.8 / 11% / 0 | 4.4 / 13% / 0 | 4.4 / 14% / 0 |
| 50 | 3.6 / 7% / 0 | 3.7 / 10% / 0 | 4.0 / 11% / 0 | 4.2 / 15% / 0 | 4.5 / 14% / 0 | 4.8 / 20% / 0 |
| 60 | 3.4 / 8% / 0 | 3.5 / 9% / 0 | 3.7 / 8% / 0 | 3.8 / 11% / 0 | 4.0 / 10% / 0 | 4.4 / 18% / 0 |
| 70 | 3.4 / 3% / 0 | 3.8 / 6% / 0 | 3.7 / 4% / 0 | 4.0 / 10% / 0 | 4.0 / 7% / 0 | 4.5 / 16% / 0 |
| 80 | 3.2 / 3% / 0 | 3.7 / 8% / 0 | 3.5 / 4% / 0 | 4.2 / 11% / 0 | 4.0 / 5% / 0 | 4.7 / 16% / 0 |
| 90 | 3.1 / 4% / 0 | 3.8 / 11% / 0 | 3.4 / 6% / 0 | 4.1 / 17% / 0 | 3.7 / 7% / 0 | 4.8 / 27% / 0 |
| 100 | 3.0 / 1% / 0 | 3.9 / 9% / 0 | 3.2 / 2% / 0 | 4.2 / 11% / 0 | 3.7 / 3% / 0 | 4.8 / 15% / 0 |

**The hero alone, best gear** (the clearest view of enemy pressure). Rounds /
health lost / losses of 108.

| Level | Standard Normal before | after | Standard Heroic before | after | Gritty Heroic before | after |
|---:|---|---|---|---|---|---|
| 40 | 5.6 / 52% / 22 | same | 5.5 / 65% / 39 | same | 5.1 / 73% / 57 | same |
| 50 | 5.7 / 36% / 10 | 6.1 / 46% / 12 | 6.3 / 50% / 17 | 6.0 / 59% / 30 | 6.5 / 60% / 34 | 6.4 / 71% / 45 |
| 60 | 4.8 / 32% / 7 | 4.9 / 50% / 20 | 5.2 / 43% / 14 | 5.1 / 60% / 35 | 5.3 / 52% / 33 | 5.3 / 67% / 48 |
| 70 | 4.9 / 21% / 2 | 5.1 / 46% / 25 | 5.1 / 36% / 14 | 5.1 / 58% / 37 | 5.6 / 45% / 24 | 5.5 / 67% / 48 |
| 80 | 4.8 / 21% / 3 | 4.9 / 47% / 24 | 5.2 / 27% / 7 | 5.1 / 57% / 35 | 5.7 / 36% / 15 | 5.5 / 62% / 43 |
| 90 | 4.8 / 25% / 4 | 4.8 / 53% / 34 | 5.1 / 34% / 13 | 4.8 / 64% / 49 | 5.3 / 41% / 27 | 5.0 / 74% / 58 |
| 100 | 4.3 / 11% / 0 | 4.9 / 36% / 11 | 4.6 / 18% / 5 | 5.2 / 45% / 18 | 5.4 / 24% / 5 | 5.7 / 55% / 27 |

**Hero with companions, shop gear only (no Masterwork),** 72 fights a cell.

| Level | Standard Normal before | after | Standard Heroic before | after | Gritty Heroic before | after |
|---:|---|---|---|---|---|---|
| 40 | 3.6 / 16% / 0 | same | 4.0 / 21% / 0 | same | 4.6 / 24% / 0 | same |
| 50 | 3.7 / 9% / 0 | 3.9 / 12% / 0 | 4.2 / 13% / 0 | 4.4 / 14% / 0 | 4.8 / 16% / 0 | 5.1 / 20% / 0 |
| 70 | 3.5 / 5% / 0 | 3.8 / 9% / 0 | 3.8 / 6% / 0 | 4.3 / 15% / 0 | 4.3 / 10% / 0 | 4.8 / 22% / 0 |
| 100 | 3.2 / 3% / 0 | 4.0 / 14% / 0 | 3.4 / 4% / 0 | 4.3 / 16% / 0 | 4.0 / 8% / 0 | 5.1 / 24% / 0 |

What it shows:

- **Before**, from 40 to 100 fights got shorter (3.3 to 3.0 rounds with the
  party) and the hero lost a ninth as much health (9% to 1%; alone, a fifth:
  52% to 11% and 22 losses to none). This was the flattening the reviewers felt.
- **After**, every level past 40 is back in level 40's band: about the same
  health lost (party 6 to 17%, alone 46 to 53% on Standard Normal against 52%
  at 40), fights a little longer as the jobs and sets pile up (3.5 to 4.2
  rounds), harder settings clearly harder, and no losses with a party. Losses
  alone on Gritty Heroic stay near level 40's 57 of 108 (43 to 58).
- No fight in about 19,000 ran out of steps (no soft-locks); the longest
  branch average was 7.8 rounds.

The harness's numbers are short against Book Three's playtest (31-40 by force:
4.1 Story, 5.1 Standard, 6.0 Gritty) because it gives every member the best kit
at once and fights the AI adventure from full health. The point of comparison
is level 40 in the same harness; real play past 40 should land where real play
at 40 does.

## Tests

`tests/enemies-past-40.test.js`:

- levels 1 to 40, every tier: a digest of every `foeStats` field and
  `reference()`, taken from the code before the change, and level 40 written out;
- the stats at 50, 70 and 100, AC never growing, every number growing level by level;
- `reference()` and `rate()` built from the same numbers, the standard battle
  "hard" at 41 to 100;
- a seeded simulation (fighter and wizard with Orin and Maren in shop gear,
  Normal and Heroic, six themes): at 50, 70 and 100 the party wins, no fight
  stalls, fights last at least as long as at 40 (and at most 7 rounds), and the
  hero loses at least three quarters of the health they lose at 40. The old
  code fails it (70 Normal: 4% against 6%; 100: 0%).

`tests/balance.test.js`, `tests/levels-xp.test.js` and `tests/renown.test.js`
pinned the old numbers past 40 and now include the late growth.

## For the owner to decide

- **Enemy to-hit past 40.** The design kept enemy attacks bounded at +13 from
  level 20. Late gear does not bound AC the same way, so this pass lets enemy
  attacks climb +1 every 10 levels past 40 (+19 at 100). The alternative is to
  trim AC from the late gear and leave enemies bounded, which would touch
  PR #86's catalogue and its tests.
- **Level 90 is the high point.** Without the level-100 ultimate the solo hero
  at 90 loses a third of Standard fights (34 of 108); with a party it never
  loses. If the solo case matters, `LATE_DAMAGE` 0.25 softens it.
- **The slowest branch gets slower.** Bard Envoy, already the longest by force,
  goes from 5.4 to 6.9 rounds at 100 on Standard (party, best gear); in real
  play it may pass 7. It still wins, and the objective route is open to it.
  The other branches that ran long in Book Three are fine here (Lifewarden 2.9
  to 3.7, Beastwarden 3.3 to 3.7 at 100).
- **Ranger Pathfinder at 100 ends every fight in round 1** (before and after),
  through its level-100 objective ultimate. That is not a force fight and this
  pass does not change it, but it may deserve a look.
