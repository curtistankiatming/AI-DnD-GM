# V3 → V4 implementation notes

## Identity and installation

V4.0.0 is **Briarwatch: Roads Beyond the Bell**, built from **Story Engine V3 / The Bell Beneath Briarwatch**. The earlier Bellfire Echoes ZIP is a separate branch and is not a dependency or patch. Install this single folder into a clean location after backing up V3; do not combine archives. Start a new campaign to see the complete progression sequence.

## Implemented changes

The opening chapter continues through eight regional expeditions, a level-10 advancement trial and a follow-on mission. Objective rewards take a fresh character to level 10 naturally; repeating resolved content cannot farm the same reward. Six classes each receive new techniques, five intervening development choices, and two specialization options. Companions level with the hero and can equip the shared inventory. The level-30/70 entries are explicitly future milestones only.

Three settlements now provide functioning shops, equipment comparisons/upgrades, two crafting recipes, shared storage, rest/treatment/blessings, briefings, practice, companion quest follow-up, reputation and travel. Three road-merchant archetypes have persistent stock, limited bargaining, and actual favor/barter effects. The world maintains service use, merchant meetings, discovered threats, quest state and consequences across saves.

Regional combat has explicit objectives, deadlines and noncombat resolutions. Companion orders, combinations and distinct tactical policies are wired to actual decisions. A lost fight or retreat leaves a recovery-and-retry path instead of a permanently dead save. End-of-expedition decisions update persistent flags, faction responses and later checks. High preparation can resolve a crisis without combat; victory does not require killing for XP.

The browser now shows gold, XP, upcoming development, reward choices, target previews, party equipment, objective progress, expiry turns and real stock. Unsupported free-text actions do not silently become travel; uncertain story matches require confirmation before resolution. Deterministic narration is the default, and external narration receives only public facts.

## Reproduced V3 issues addressed

| Original problem | Implemented correction |
|---|---|
| Buying in free text caused unrelated travel | Recognized transaction intents are validated against actual markets; fuzzy story matches need confirmation |
| Healer's kit disappeared after one use | Charge-aware inventory merging, consumption, storage and save normalization |
| Support behaved like Balanced | Support helps an objective or supplies a one-use die, while other policies use distinct healing/guard/attack priorities |
| Inspiration was wasted when Help already granted advantage | Redundant preparation is rejected without spending the resource |
| Narrator claimed an unacquired chime solved the scene | Removed unconditional companion prose; fallback follows established outcomes and mechanics |
| Holy water had a no-op exploration flag | Valid site use now changes relevant DCs; repeated invalid use is rejected |
| Guard/taunt outlived its duration | Source/owner-turn expiry handling with visible labels |
| Hidden route answers were exposed as locked choices | Undiscovered conditional options are omitted until their requirements are known |
| Gold had no spending system | Persistent town and merchant transactions, crafting, upgrades and services |
| No adventure after the short chapter | Continuing regional arc, advancement trial and post-specialization expedition |
| Level increases changed little | Class techniques, talents, actual modifier previews, refinements, Fieldcraft and party combinations |
| Companions remained level 1 | Shared earned levels and derived equipment statistics |

## Additional issues found during implementation/testing

Saving-throw equipment bonuses were being applied twice in one path; they now resolve once. Simultaneous counterstrike/party knockouts are resolved consistently. An early objective deadline design could have rewarded passive waiting; now missing a deadline records a cost but still requires resolution or retreat. Its text also describes the setback without pretending the unresolved objective has already succeeded.

Control refinements were inappropriate for support-oriented techniques; Fighter, Cleric and Bard now have class-appropriate effects rather than empty enemy-target promises. Ability improvements are +2, capped at 20, so choosing an even score produces an immediate modifier benefit. The browser test also exposed a cramped objective layout, which was corrected.

## Save behavior

Story Engine V3 saves are normalized to schema 4. Compatible identity, authored clues, choices, XP and items are retained; town/progression/companion-equipment systems are initialized. A representative save produced by the original V3 code was migrated and checked. V2 migration preserves identity and starts the authored campaign again. Neither route guarantees arbitrary edited or unrelated-build saves. Keep backups and do not load a V4 save in V3.

No real Windows folders or existing user saves were edited during development. Tests used an isolated copy and test save directories. The archive contains no test characters or credentials.

## Explicitly not implemented

Playable second/third advancements at 30/70; a level-70 campaign; a full official 5e rules catalog; multiplayer; grid movement; unlimited natural-language improvisation; procedurally endless adventures; hunger/durability maintenance; housing. The current data separates future advancement tiers without presenting placeholder buttons as usable gameplay.

The old public tunnel launcher was removed because this trusted local application has no authentication. Local play is the default; the separate trusted-LAN launcher warns before binding to other interfaces.
