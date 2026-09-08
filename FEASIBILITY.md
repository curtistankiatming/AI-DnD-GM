# Feasibility and design verification — V4

This is a feasibility assessment of the implemented scope, not a promise that every future RPG feature has been built.

| System | Implemented approach | Feasibility check and trade-off |
|---|---|---|
| Level 1–10 campaign | Original chapter plus authored regional contracts with unique completion rewards | Natural policy and browser paths reach 10 without grants; quest order provides sufficient XP. Authored content is finite and structurally repeatable rather than an open-ended simulation. |
| Milestones 10/30/70 | First specialization playable; later tiers separately identified in progression data | Avoids fake level counters without content. Levels 30/70 require later class design, encounters and content; not operationally validated in V4. |
| Meaningful intervening levels | Techniques, talents, +2 ability changes, skill training, refinement and combinations | Unit checks tie selections to actual rolls/resources/HP/AC. Class-specific control refinements prevent empty support-class choices. |
| Town economy | Shared inventory and explicit transactions, stock, prices and services | Purchases validate stock/funds first; bounded discounts and sellback values reject simple arbitrage. Unique progress restocks; free lodging prevents insolvency from becoming a softlock. |
| Wandering merchants | One saved meeting per expedition, three archetypes, bounded favor/barter rules | Basic supply does not depend on appearance luck. Persistent meetings prevent save-menu rerolling. This is not a simulated traveling population. |
| Gear and crafting | Four slots per actor, conserved item copies, capped quality upgrades and two recipes | Comparisons reflect derived statistics; a copy cannot be simultaneously assigned twice. Small recipe count keeps the first release comprehensible. |
| Companions | Existing initiative plus tactical policies, orders, shared levels and personal rewards | Tests distinguish policies and check equipment/level changes. There is no generative companion planner; tactics are inspectable rules. |
| Story/encounter outcomes | Discovered information changes checks; social and objective routes grant resolution XP | Prepared routes require fewer actions and rescues in scripted tests. A timeout incurs a cost without granting automatic victory. Rescue preserves a retry path. |
| Narration | Rules state is separate from presentation; prompts omit undiscovered facts | Local mock tests cover replies/failure and no mechanical mutation. A real model can still hallucinate prose; its text never executes a game action. |
| Free-text interaction | Finite intent vocabulary plus explicit confirmation of uncertain story matches | Prevents unrelated movement and invented purchases. Arbitrary imagined actions are not generally understood. |
| Saves | JSON schema normalization, persistent economy/objective fields, atomic file replacement | Unit, HTTP and browser save/load checks. Representative V3 migration verified; not every historic/customized save is guaranteed. |
| Local deployment | Node standard library and bundled browser assets | No installation-time package dependency or public service is required for offline play. Windows batch execution and the user's local model remain untested here. |

## Gameplay conclusions

The implementation makes preparation functional: information, tools, gear and companion development alter later options or checks. It also makes the first advancement usable in a follow-on contract. The scripted and UI runs establish reachability and internal consistency, not that the pacing is optimal for every player.

The main remaining design risk is repetition. Regional contracts deliberately reuse a four-stage structure, though their situations, tools, objectives and decisions differ. The party is supportive by design, and free civic recovery is forgiving. Players seeking a punishing survival campaign or unrestricted tabletop improvisation will not get those experiences from this release.

A sensible next evaluation is a human playthrough of V4: whether the player understands purchases, develops a preferred build, notices companion behavior, and finds the repeated expedition rhythm engaging. Those questions cannot be answered by raising a simulated completion percentage.
