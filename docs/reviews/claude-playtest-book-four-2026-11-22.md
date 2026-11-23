# Playtest through Book Four (levels 40 to 70), 22 November 2026

Played by Claude on PR #92's branch (`bfad843`) with the preview on
(`BRIARWATCH_PREVIEW_BOOKS=1`). No AI calls. Gameplay only: soft-locks,
exploits, fight length, enemy strength.

## What was played

About 400 scripted campaigns through the real actions. Each used
`tests/player-policy.js` plus a scratch wrapper (not committed) that picks the
second-job branch, buys gear for the whole party and, in the later runs, uses
the 3rd and 4th job skills:

- **162 full campaigns from level 1 to the 4th job trial**: every class, all
  three branches, Story, Standard and Gritty. Three styles: prepared (rumours,
  side jobs, gear, objective), peaceful, and direct (no shopping, no
  objective, straight to the fight).
- **From the level 40 saves of those runs**: 36 force-only runs with full
  shop gear, 18 all-aggressive teams on Gritty, and 36 runs with every story
  and decision choice picked at random. Then 72 more (force-only geared and
  direct, Standard and Gritty, every branch) with the job skills in use.

## Findings

**No soft-locks, crashes or engine errors.** Every run finished all 30
chapters and won the 4th job trial at 70. Random choices never stranded a
save. They also never caused a Book Four walkout, so walkouts were not
exercised here (`tests/book-four-part-three-companions.test.js` covers them).

**No exploits.** Side jobs pay once. Bounty XP stops at the chapter's level
(`Book.xpRoom`), so a hero can't grind ahead. Objective skills move the
objective once per fight (#84), and arc moves fire once per fight. Bounty
gold is repeatable, as before.

**Bug, fixed: three "every enemy" saves reached no one.** Terms of Surrender
(Envoy, 40), Royal Decree (Envoy, 70) and Web of Lies (Grifter, 40) say every
enemy makes a save. But the save had no `area`, and the skills have no target,
so no save was ever rolled: no stun and no disadvantage, only the objective
step. Each now has `area: true`. A new check in
`tests/playtest-book-four.test.js` fails any job save that can reach no
enemy. In direct Gritty play, Envoy's chapter defeats fell from 3.0 to 1.3
per campaign, and its mean fight from 9.1 to 8.5 rounds.

**Harness caveat, worth knowing for every playtest: `tests/player-policy.js`
never uses 3rd or 4th job skills.** It only uses `spec:` actions, and those
skills are `job:` actions. Played that way, the support branches looked slow
by force (median 9 to 10 rounds on Gritty for Battlecantor, Envoy, Lifewarden
and Pathfinder), as in Book Three's playtest. With the job skills in use they
take 3 to 8. Most of the "support branches are long" finding was this
artifact.

**Major, not changed: with level gear, Book Four is never dangerous, even on
Gritty.** Results from runs with the job skills in use:

| Chapter fights | Standard | Gritty |
|---|---|---|
| Full shop gear, by force: median rounds | 3 | 3 |
| party HP left / hero knock-downs | 96% / 0 | 95% / 0 |
| No shopping (direct): median rounds | 5 | 6 |
| party HP left / chapter defeats per campaign | 71% / 0.06 | 64% / 0.6 |

Geared fights are under the design's 4 to 7 rounds. A geared party (AC 23 to
31, 200 to 300 HP each, 150 to 250 damage a round) kills a retainer in round
1 and the boss by round 3. A careful approach also takes the enemies' first
turn (Surprised). The enemies act four or five times a fight. The
all-aggressive team, 5 to 10 times riskier in Book Three, is no worse now.

Tuning enemies doesn't fix this. In trial runs (6 branches, geared and
direct):

| Change past 40 | Geared Gritty | Direct Gritty |
|---|---|---|
| none | 3.6 rounds, 95% HP | 5.8 rounds, 5 defeats |
| +1 to hit every 8 levels (not 15) | no change | within noise |
| health +1.5% a level (not 0.6%) | 3.9 rounds, 94% HP | 7.1 rounds, 22 defeats |
| that, and damage +0.6 a level | 3.9 rounds, 93% HP | 6.8 rounds, 18 defeats, trial at 70 nearly lost |

Enemy strength moves the non-shopper four times as much as the shopper, so it
widens the gap. The lever is the party side: the late gear and set bonuses on
top of the 3rd job.

**Gold.** Shoppers reach 40 with about 1,500 gold, spend about 38,000 on
gear in Book Four and end with 2,500 to 3,000, so gold matters to the end.
Non-shoppers end with 30,000 to 56,000 unspent.

**The white (Part Two)** can't be seen in fight length. Part Two fights run as
long as Part Three's, which have no white.

## For a decision

Geared play past 40 is too safe, and enemy numbers can't fix it without
punishing players who don't shop. Options:

1. **Trim the late gear** (45 to 70): less AC from sets and Masterwork, or
   lower caps (damage taken -30%, dealt +50%). This narrows the gap from the
   party side. It is a gear-thread change and needs its own pass.
2. **Gritty-only pressure past 40**: Gritty enemies get more health and
   damage from 41. It only affects players who chose Gritty, and a geared
   Gritty party stays the target. Non-shoppers on Gritty get harder.
3. **Leave it.** Gear decides difficulty, by design.

Recommended: 1, with 2 as the smaller step if Curtis only wants Gritty to
bite. The playtest policy should also learn the `job:` skills, so later
playtests measure real play.
