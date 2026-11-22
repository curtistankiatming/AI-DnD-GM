# Playtest through Book Three (levels 1 to 40), 22 November 2026

Played by Claude on master `cf51c31` with the Book Three preview on
(`BRIARWATCH_PREVIEW_BOOKS=1`). No AI calls.

## What was played

198 scripted campaigns from level 1 to the end of Book Three, each a real game
through the normal actions (the `tests/player-policy.js` player plus a wrapper
that buys and equips gear upgrades from the shop for the whole party):

- every class, all three second-job branches, Story, Standard and Gritty;
- three play styles: prepared (rumours, side jobs, gear), peaceful, and direct
  (straight to the fight, no shopping);
- 18 extra runs with every companion set to Aggressive (an "all damage" team),
  and 18 that skip bounties and side jobs.

About 11,200 fights in all. Rounds are counted per fight; a fight is "by force"
when the hero never worked the objective.

## Results

**No soft-locks or crashes.** All 198 runs reached the end of Book Three. 126
ended at level 40 with the third job trial offered; the 72 direct and
skip-side-content runs ended at level 38 (as noted in the Book Three review,
they miss the optional XP).

**Fight length (goal 4 to 7 rounds).** Chapter fights by force, average rounds:

| Levels | Story | Standard | Gritty |
|---|---|---|---|
| 1-5 | 5.2 | 6.7 | 8.8 |
| 6-10 | 4.6 | 5.3 | 6.5 |
| 11-20 | 5.4 | 6.5 | 7.9 |
| 21-30 | 4.9 | 6.0 | 7.4 |
| 31-40 | 4.1 | 5.1 | 6.0 |

Objective route: 3.0 to 4.4 rounds everywhere, no losses. Bounties and side
jobs: 3.5 to 6.4 rounds, no losses in about 3,600.

**Major, fixed in this PR: three branches finished every Book Three deciding
fight in 2 rounds.** Bard Lorekeeper and Rogue Saboteur ("Unravel: advance the
objective twice without a roll", two uses) and Ranger Pathfinder (Trailblazer,
one objective step as a bonus action, two uses) could use their skill twice in
the same fight. Book Three objectives need 4 steps, so all 317 of their Book
Three chapter fights ended in exactly 2 rounds, mostly without a roll. Now each
skill moves an objective once per fight (a second Trailblazer still gives its
temporary hit points). After the fix the same 9 campaigns take 4.1 to 4.6
rounds (Lorekeeper, Saboteur) and 3.1 (Pathfinder), still no losses. Skill
descriptions say "once per fight". The other objective skills (Warlord,
Grifter, Envoy, and the later ultimates) were already one push per use; the
rule now applies to them the same way.

**Minor, left for later: some branches still run long by force in Book Three.**
Levels 21 to 40, Standard / Gritty: Bard Battlecantor 7.6 / 8.8, Bard Envoy
7.6 / 8.5, Ranger Pathfinder 8.1 / 9.2, Cleric Lifewarden 7.2 / 8.2, Ranger
Beastwarden 6.6 / 8.9 (one Gritty fight took 17 rounds). Wizard Evoker is the
other way, 3.1 / 3.9. This matches the earlier note that the level 20 Heroic
bard fights run long. These players still win (4 losses in 246 such fights), and the
objective route is open to them, so it is not urgent; a damage bump for the
support branches is the likely fix and should get its own balance pass.

**Falling behind.** No run ever fell more than 5 levels under a chapter, even
the ones that skip every bounty and side job, so the under-level penalty never
fired on the main path. The catch-up itself is covered by the existing
`tests/catch-up*.test.js`; this playtest did not force a hero behind.

**Balanced team beats all-damage.** With every companion on Aggressive the hero
is knocked down 5 to 10 times as often (Gritty 0.11 per fight against 0.01),
fights run longer (4.7 against 4.1 rounds on Gritty) and rescues/setbacks
jump (Gritty 5.5 per campaign against 0.6).

**Gold matters through level 40.** A player who shops earns about 21,000 gold
by level 40, spends about 15,000 on gear for the party, and ends with about
6,000. A player who never shops ends with 15,000 to 19,000, which is the gold
they left on the table. Difficulty barely changes income.

**Gritty levels 1 to 5 by force are still hard** (101 of 258 fights lost,
almost all the Archive at level 5 forced from level 4, as in the last
playtest). The objective route there lost none.

## What works and should be kept

- Every campaign reaches the end with no stuck screens, across 18 branches and
  three difficulties.
- Fights get a little shorter late in Book Three on every difficulty, which
  keeps the long book moving.
- The balanced-team rule shows up clearly in the numbers without punishing
  anyone into a loss streak.
