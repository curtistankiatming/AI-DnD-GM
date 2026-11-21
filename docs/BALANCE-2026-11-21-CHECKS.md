# Story checks: the best-suited party member rolls (21 November 2026)

Step 3 of the gameplay review plan. Curtis's decision: the companion best
suited to a story check rolls it, and the player can switch to rolling every
check themselves.

## What changed

- **Who rolls.** For every story check the game works out each standing
  companion's chance (bond 0 or more) and the hero's, counting Help, tools,
  preparation and the rest, and the best chance rolls. The hero wins ties.
  Checks written for a named companion still go to that companion.
- **The hero can Help.** Help now looks at the whole party, the hero included,
  when a companion rolls.
- **"Story checks: Best person rolls / I roll every check".** A toggle above the
  scene's choices. The choice is saved; old saves start on "Best person rolls".
- **Shown up front.** When a companion rolls, the check line adds "you would
  have N%" so the player can see what switching costs.
- **Companion strengths.** Orin gains Intimidation and History, Maren
  Persuasion, Nessa Investigation, so each covers different checks. The party
  card lists each companion's three best skills ("Best at: Athletics +5, ...").
  Each has a signature skill (Orin Athletics, Maren Insight, Nessa Stealth)
  that becomes expertise from level 21, past the written books. We tried level
  11, but late checks became too easy (75% and more).
- **The hero rolls their own actions.** Typed (improvised) actions, the Lantern
  Road and courier crossings, and checks marked `hero` always use the hero. A
  companion who would object to a choice (negative approval) never rolls it.
  When a companion steps in, the story log says so and the AI narrator is told
  to credit them.
- **DC pass.** Generated chapters up to level 10, where Help is almost always
  on hand, are DC +2. Hand-written Book One scenes are unchanged.

## Results

Every story check offered to six classes in two play styles (996 checks,
`checks.js` harness, Standard), average success chance:

| Hero level | Before (hero only) | After (best suited) | After, "I roll every check" |
|---|---|---|---|
| 1-5 | 66% | 70% | 67% |
| 6-10 | 68% | 67% | 61% |
| 11-15 | 53% | 68% | 61% |
| 16-20 | 36% | 60% | 43% |

With the best-suited roller every band is now inside 60-70%. The late game,
where the review found checks too hard, gains the most. Choosing to roll
everything yourself stays possible and is harder late on, which the check
line shows before you choose.
