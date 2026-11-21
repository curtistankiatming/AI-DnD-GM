# Balance: stat damage, buffs and chains (21 November 2026)

Step 1 of the combat and equipment plan. Curtis asked for damage to scale with
stats, plus buffs, debuffs and chain attacks. The gameplay review
([reviews/claude-gameplay-2026-11-21.md](reviews/claude-gameplay-2026-11-21.md))
found force fights at levels 15 to 20 taking 12 to 15 rounds, because enemy
health grows with level and weapon damage did not.

## What changed

- **Stat damage** (`src/power.js`). A party hit adds the attacking stat's
  modifier times the power tier. Tier 0 below level 5, 1 from 5, 2 from 11,
  3 from 17, then one more for every 24 levels past 20.
- **Enemy damage** (`src/xp.js` `foeStats`). +3 per hit per power tier, so
  shorter fights stay as dangerous. Nothing changes below level 5.
- **Buffs and debuffs**: Empowered (+25% dealt), Weakened (-25% dealt),
  Vulnerable (+25% taken), Fortified (-25% taken), Slowed (-2 armour), Burning
  (fire damage at the start of the turn). Fortified and Slowed have no source
  yet; step 4's equipment skills will use them.
  - Maren's combination: the healed ally is Empowered for two rounds.
  - Orin's combination: the target is Weakened until your next turn.
  - Nessa's combination: the target is Vulnerable until your next turn.
  - A fire spell hit (Fire Bolt) sets Burning for one round, except on a foe
    that resists fire.
  - A boss or leader below half health becomes Empowered once (hero level 5+).
- **Chain attacks**: each further party hit on the same enemy in the same round
  adds 15%, up to 60%, whoever lands it (an Extra Attack counts). A companion
  combination starts a fresh chain: its own hit is the first link.
- Job skills' save, area and direct-damage effects add stat damage too.

## Results

Campaign runs (6 classes, 2 seeds, levels 1 to 20, scripted player). "Direct"
fights by force; "prepared" uses the objective route. Average rounds per fight:

| Difficulty, style | Levels | Before | After |
|---|---|---|---|
| Standard, direct | 6-10 | 8.5 | 6.6 |
| Standard, direct | 11-15 | 11.3 | 7.3 |
| Standard, direct | 16-20 | 13.9 | 7.8 |
| Gritty, direct | 11-15 | 13.9 | 8.6 |
| Gritty, direct | 16-20 | 18.2 | 9.7 |
| Standard, prepared | all | 3.7-4.1 | 3.8-4.1 |

Gritty direct fights at levels 16 to 20 lost 21 times in 69 fights before, and
2 in 50 after. Hero knock-downs at levels 1 to 5 are unchanged (5-6 on standard,
17-20 on gritty), since nothing applies below level 5.

AI adventures (`npm run balance`, levels 20 to 100, every class and branch,
4-6 seeds):

| Tier | Rounds before | after | Win % before | after | Hero HP left before | after |
|---|---|---|---|---|---|---|
| Normal | 12.0 | 7.9 | 98 | 100 | 64% | 65% |
| Hard | 13.3 | 9.0 | 94 | 97 | 58% | 57% |
| Heroic | 14.2 | 9.7 | 86 | 85 | 49% | 45% |

Without the enemy damage bonus, Heroic became a 100% win with 68% health left,
so it was added. Job skills still matter: without them Heroic is won 34% of the
time (15% before).

## Left for later steps

- Standard still rarely knocks the hero down after level 5 (step 2 makes fights
  harder when you are more than 5 levels under).
- Level 20 Heroic stays hard for the Envoy and Chronist branches (as before).
