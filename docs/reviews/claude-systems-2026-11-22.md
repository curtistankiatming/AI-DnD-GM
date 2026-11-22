# Systems review, 22 November 2026 (Claude)

An independent code review of everything merged since the last systems review
(PR #72): PRs #73 to #77 and #69 (Book Three, Part Two, and its gear). It reads
the code and runs scripted checks; nothing here is natural play.

- **Tested source:** `master` at cf51c31, then this branch.
- **Runtime:** Node 22, no AI provider, no network.
- **Commands:** `npm run check`, `npm test` (945 tests), `npm run fuzz`
  (preview on: 14,400 actions, 1,440 reloads, no failures), the test suite's
  full scripted run to level 40, and small probe scripts for the cases below.
- **Limits:** no live Claude call. The full `npm run playtest` with the
  preview on did not finish inside this review's time and was stopped; its
  result is not used here.

## What was checked

| Area | Where | Verdict |
| --- | --- | --- |
| 3rd job trial at level 40 | `src/director.js` (`trialAvailability`, `writtenTrial`, `commissionTrial`, `framing`) | Sound. It cannot be reached before Book Three's last chapter (XP is capped at the chapter's level), it is asked for in a town, and the hero rolls its checks. The epilogue's framing opens the written trial. **Bug:** with Claude's draft, the framing was put in front of Claude's opening and the whole was cut at 900 characters, mid-word (fixed). |
| Book gating, two-part release | `src/book.js` (`buildShelf`, `PREVIEW_PARTS`, `started`) | Sound. Checked `out` 0, 1 and 2: hidden, then "to be continued" after chapter 10, then finished at `b3-firstbell`. `BRIARWATCH_PREVIEW_PARTS` parses safely when empty. |
| Straight-on chapters (the stair) | `src/world.js` (`goOn`, `backDown`, `below`, `ledgeOf`), `applyOutcome` | Sound for normal play: no town below the stair, defeats and retreats wake on the last ledge, saves load mid-stair. **Bug:** after a companion's scene below the stair, if the next chapter can no longer be played (a hosted subscription that lapses mid-scene), the scene's last choice went nowhere (fixed: it goes to town). The combat "Retreat to town" order below the stair now says "Fall back to the ledge" (a listed follow-up, fixed). |
| Lapsed access mid-chapter | `Book.locked`, `chapter` | As designed: the chapter under way may be finished, then the save waits. |
| Saves and migrations | `normalizeIncomingState`, `world.goingOn`, `gearAwarded`, `storySpent` | Sound. New fields are optional and read defensively. |
| Gear damage-taken cap | `src/equipment.js` (`MAX_GEAR_TAKEN`), `Power.damageFactor` | Sound. Gear stops at 30% less damage; Fortified (25%) still stacks on top, and the overall floor of 25% damage holds. |
| Refining (Masterwork) | `src/expansion.js`, `Gear.upgradeCost`, `world.js` upgrade | Sound. No gold loop: a refine costs 2x the item's price and the refined item sells for 0.9x. A refined copy shares its base item's story use. |
| Under-level penalty past level 20 | `src/xp.js` (`underSteps`, `underChecks`), `startCombat`, `checkPlan` | Sound. Fights take the weighted steps (capped at 9), story checks and the fight objective the unweighted ones (capped at 5). |
| Book Three gear in shops and bounties | `townStock`, `Gear.bountyReward` | Sound. Level stock and level bounties open only once Book Three is begun. |
| AI director across Book Three | `src/director.js`, `Book.facts` | Sound. Only playable chapters are named; an emptied town takes no asks; the trial brief carries the framing. |

## Fixed in this branch

1. **The AI-written 3rd job trial lost the end of its opening.** The framing
   (up to 400 characters) went in front of Claude's opening (up to 900), and
   the 900-character limit then cut the joined text mid-word. Claude's part is
   now cut to the room left, at a sentence end where it can be. The framing is
   cut the same way.
2. **A dead end below the stair after an access lapse.** Fixed as above; the
   normal path is unchanged.
3. **"Retreat to town" below the stair** is now "Fall back to the ledge", with
   a description that says what happens.

4. **No way back up the stair.** Below the stair the only way out was to win:
   a party that kept losing the same fight could rest on the ledge and retry
   forever, but could not level, shop or change gear, and difficulty cannot be
   changed after setup. Put to two independent reviewers while Curtis is
   away; both recommended a safety valve. After three defeats in the same
   chapter the ledge also offers "Climb back up to town". The chapter stays in
   progress, and departing again goes straight back to the same encounter.

Each has a test in `tests/book-three-part-two.test.js` that fails on `master`
or checks the new behaviour.

## Not changed

- **The hosted server trusts saves sent by the browser** (XP and gold can be
  edited). Still waiting on Curtis.
- Level bounties: a hero who first claims a bounty late gets the highest item
  first and the lower ones on later bounties. This is as the code's comment
  intends.
- Owning both an item and its refined copy gives one story use between them,
  not two. Small.
