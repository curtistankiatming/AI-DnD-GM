# Balance and progression report — V4.0.0

## Measured scope

**270 scripted complete-campaign attempts**, six classes × three difficulties × three route policies × five deterministic seeds. Each attempt starts at level 1. The runner does not grant XP, items or forced successful rolls. Policies consume the public view; they do use fixed tactical priorities and choose development rewards. This is automated coverage, not human-player win-rate research.

All 270 attempts reached level 10, selected a first specialization, and completed the post-advancement contract. No runtime/action-policy failures were recorded. The runner allowed in-game rescue, recovery and retry. Therefore **100% eventual completion must not be described as a 100% clean win rate**.

Total actions: 63,372. Total rescue events: 66. Runs without a rescue: 227/270. Recorded setbacks: 788. A setback can arise from a failed approach or objective deadline; it is not necessarily a defeat.

## Policy differences

Prepared: investigate, buy relevant exposed gear/information where affordable, coordinate the party, prioritize combat objectives. Peace: similar preparation but attempt the available negotiated resolution first. Direct: skip optional preparation and favor ordinary confrontation. All three can recover in town and spend available class resources; Direct is not a deliberately idle or equipment-stripped party.

| Difficulty | Policy | Runs | Eventual completion | No rescue | Rescue events | Mean actions |
|---|---|---:|---:|---:|---:|---:|
| Story | Prepared | 30 | 30 | 30 | 0 | 211.5 |
| Story | Peace | 30 | 30 | 30 | 0 | 163.6 |
| Story | Direct | 30 | 30 | 26 | 4 | 267.6 |
| Standard | Prepared | 30 | 30 | 29 | 1 | 218.4 |
| Standard | Peace | 30 | 30 | 29 | 1 | 172.8 |
| Standard | Direct | 30 | 30 | 24 | 7 | 313.9 |
| Gritty | Prepared | 30 | 30 | 25 | 6 | 225.0 |
| Gritty | Peace | 30 | 30 | 25 | 6 | 171.8 |
| Gritty | Direct | 30 | 30 | 9 | 41 | 367.8 |

## Interpretation

Preparation and negotiation materially reduced the number of actions and rescues compared with the direct policy. Gritty caused more rescues than Story or Standard. These are useful comparative signals, not calibrated probabilities for a human player's particular decisions. Five seeds per class/policy/difficulty are insufficient to estimate rare failure rates or guarantee all possible paths.

The game is intentionally recoverable: free lodging and retained objective progress prevent an empty purse or unlucky loss from permanently ending a campaign. More preparation can avert combat altogether. Companions contribute by attacking, healing, guarding or helping the hero complete an objective; their usefulness is not measured only by damage share.

The tested first-advancement options in the whole-campaign policies are the first listed option for each class. All twelve specializations are additionally exercised by isolated rules tests, but those tests are not twelve independent human-paced campaigns.

## Progression reachability through actual UI

The recorded unseeded browser-harness run earned the following levels through ordinary actions. No reloads were used to reverse failure, and save/load was checked only after completing the campaign.

| New level | Total XP | Action number |
|---|---:|---:|
| 2 | 610 | 18 |
| 3 | 1,460 | 36 |
| 4 | 2,710 | 58 |
| 5 | 4,410 | 78 |
| 6 | 6,610 | 102 |
| 7 | 9,310 | 125 |
| 8 | 12,510 | 143 |
| 9 | 16,310 | 165 |
| 10 | 20,710 | 185 |

The run ended as **level 10 Guardian**, 20,710 XP, after 223 recorded actions. All three companions reached level 10. Guardian was actually used in the follow-on encounter, rather than only selected at the ending. The trial and subsequent contract are included; levels above 10 are not.

## Remaining pacing risks

Regional quests reuse a clear four-stage structure. That makes them understandable and testable, but can become repetitive. The current study validates reachability, state consistency and comparative preparation benefits; it does not prove that every player will enjoy the pacing, economy or class balance. A broader human playtest remains appropriate.

## Reproduce

`npm run playtest` runs two seeds per matrix cell by default. The recorded release matrix used `PLAYTEST_RUNS=5` and wrote `PLAYTEST_OUTPUT` to a separate JSON file. The source runner is `tests/campaign-playtest.js`; its public-view policy is `tests/player-policy.js`. Diagnostic fixture tests must not be mixed into natural XP results.
