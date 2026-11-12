# Codex bard playthrough to level 10 — 12 November 2026

## What I played

- **Hero:** Lark, Bard, from a new level-1 game with **seed 2**.
- **Finish:** level **10**, **21,881 XP**, **63/63 HP**, **1,151 gold**, at **`town-highpass`**. Completed the bell chapter and every expedition from the road through the beacon, then founded a public charter. All three companion personal quests were resolved. The newly unlocked **level-10 advancement trial and its aftermath were not played**; reaching level 10 does not mean completing those chapters or earning class mastery.
- **Length:** **139 action turns**: **58 manually chosen story choices**, **35 town/progression actions**, **seven manual combat actions**, and **39 automated combat actions**. There were also ten read-only `town` calls. Four fights were completed, with no defeat or retreat from combat. The bell fight reached displayed round 11; the other fights reached displayed round 3.
- **Automation:** used **`auto 1` 39 times, only while combat was active**. A local helper checked for combat before each call and stopped when it ended. Every automated action in the transcript was a combat action; no story choice was automated. **No `jump`, fixtures, save edits, paid models, API keys, browser or server.**
- **Source:** **`b42a25b`** (`b42a25bf04e212f65cb1f23cc4d8d5bdbd2676f8`), Node.js **v24.22.1**. Reports prepared on `review/codex-playthroughs-2026-11-12`.

I followed `docs/AGENT-PLAYTEST.md` and judged the writing against `docs/STORY-BIBLE.md`. This is a separate run from the ranger review, which remains unchanged. Nessa joined through her rescue in the mist hollow. Lark tried persuasion at each expedition crisis; failed attempts at the bell, road and archive led to combat. The road and archive were then completed through their objectives rather than defeating everyone.

The main decisions were caravan escorts, a shared water council, supervised bridge repairs, telling Orin to tell Wenna the truth, publishing the archive diagram, prioritising refugees at the tower, council custody of the keystone, double consent in the Quiet District, and a public charter at the beacon. As an unexpected sequence, I left Fenmere **after** its peaceful rescue but **before** deciding who maintained the water supply, then departed again. The game correctly returned me to the outstanding decision without repeating the crisis or paying a reward early.

The bridge camp is the clearest example of the game delivering its story bible: humour, disagreement, guilt and a player decision all develop into a later scene. Much of the remaining journey has good premises and usable peaceful resolutions, but summarises the people and arguments that should give those choices weight. I reached level 10 wanting more conversations, rather than more encounters.

## Findings, most important first

### 1. The final antagonist is still an abstract offer, not a person making a case

**Where:** `q-beacon-crisis`, `resolve`; `q-beacon-after`, `charter`.

**What:** The climax opens, “The Single Voice offers perfect safety at the cost of every keeper’s choice. The promise sounds less convincing now that you have seen whom such safety leaves behind.” My response successfully brought the independent keepers together and dissolved its central note. No named speaker made the offer or explained why a person might accept it. The bible promises that High Warden Corvane speaks through the Voice and that its design was Elske's; neither name appeared in the played narrative. Supplementary reading of the crisis confirmed that its opening contains only the abstract offer. The Gloam was also never named in this run, leaving the wards' underlying protective purpose less concrete than the abuses of their command.

**Why it matters:** The central conflict is easy to reject when the narrator has already judged the offer and the danger that might justify it has not been made equally tangible.

**Suggestion:** Let Corvane speak before the final options: name a community his system saved, admit what it takes from its keepers, and answer a question about consent. Give the party a specific example of what an unprotected ward allows through, consistent with the Gloam in the bible. Let a keeper Lark helped answer him. Introduce Elske's connection as evidence, rather than relying on knowledge from the bible. Preserve the peaceful chorus resolution.

**Severity:** major.

### 2. Maren's missing keepers never become individuals, and their families never receive the findings

**Where:** `q-archive-start`, `investigate`; `q-archive-crisis`, `resolve`; `q-archive-after`, `publish`; the Maren personal-quest resolution at `town-highpass`.

**What:** Maren's stated purpose was, “Even if we cannot save them, their families deserve the truth.” Investigation says “Maren reads the names aloud,” but supplies no actual keeper's name or letter excerpt. After recovering the records, the decision concerns diagram custody, followed by “Knowledge spreads beyond a single council.” Resolving her personal quest then prints “Watchful: +1 AC” and describes a future combat combination. No letter reaches a family on this route, and Maren has no spoken reaction to the recovery.

**Why it matters:** The story declares Maren's personal goal complete without letting the player experience the human ending she asked for.

**Suggestion:** Give one keeper a name and a few lines of their last letter. After the rescue, let Maren decide how to pass it to a surviving relative, with a short response from that person. Put the mechanical reward after this exchange. Keep the archive's restraint: it did not need a joke.

**Severity:** major.

### 3. Nessa rescues her mentor but gets no reunion

**Where:** `q-signal-crisis`, `resolve`; `q-signal-after`, `refugees`; the Nessa personal-quest resolution at `town-highpass`.

**What:** Nessa's opening personal line establishes the keeper's importance: “She taught me to leave a light for the lost.” At the tower, the keeper lies beneath a fallen arm. My successful resolution says the sentinel braces it “while you pull the keeper clear and restore the beacon.” The aftermath reports that Nessa receives “her mentor’s last reliable map,” then moves to caravan priorities. Her personal quest ends with “Decisive: +1 attack bonus and spell save DC.” The rescued keeper never speaks, and neither does Nessa about finding her.

**Why it matters:** A relationship with a living mentor becomes a map and a stat reward at the moment it should reveal Nessa's pride, fear or dependence.

**Suggestion:** Add a short exchange while the keeper is being treated. Let Nessa insist she managed the rescue herself, then quietly ask for guidance about the map. Use the mentor's name and make the keeper's condition explicit; do not imply a death when this route rescued her. Resolve the quest after the exchange.

**Severity:** major.

### 4. The summit asks whom to trust without showing the competing claims

**Where:** `q-summit-start`, `investigate`; `q-summit-crisis`, `resolve`; `q-summit-after`, `council`.

**What:** The brief promises three factions seeking custody. My successful investigation says, “You expose the missing clauses without humiliating their authors,” without showing a clause or identifying its author. The agreement ends with “Each representative signs in front of their own people.” I then chose an accountable council over shared local custody without hearing a representative argue for either. The supplementary reading of the starting scene describes camps and banners, but still names no faction.

**Why it matters:** Choosing a political structure feels abstract when I cannot judge the actual people, terms or concessions involved.

**Suggestion:** Give the courier and three representatives names, one concrete demand each, and one unacceptable custody clause the player can expose. Show what a witnessed agreement requires each side to give up. Later, have one named witness answer at the beacon. Earlier decisions did lower the final check's difficulty in this run; give that useful mechanical recognition a specific human counterpart.

**Severity:** major.

### 5. Winning the bell fight leaves Sable's and the spirit's fates unstated

**Where:** `bell-vault`, failed `expose-sable`, combat, then `ending` / `report-bell`.

**What:** Unlike the ranger's successful exposure, Lark's attempt failed: “Sable calls the ledger a forgery and orders the final toll.” After the full fight, the ending says only, “The immediate threat beneath Briarwatch has ended.” Reporting to town proceeds to payment. Sable had reached zero HP during combat, but the aftermath never establishes whether he is captured, killed or otherwise dealt with, or what becomes of the spirit.

**Why it matters:** The first chapter's resolution omits the facts the player needs to understand the victory and carry its consequences forward.

**Suggestion:** Add an aftermath for this combat route that explicitly establishes both fates, consistent with the engine's recorded outcome. Allow a brief response from a companion and the freed spirit if that is the intended result. The ranger's surrender text already shows the benefit of stating an outcome directly.

**Severity:** major.

### 6. Rescued Nessa arrives without equipment and continues fighting unarmed

**Where:** `mist-hollow`, `hold-wolves`, and subsequent combat after loading the save; equipment preparation at `town-ashford` and `town-highpass`.

**What:** The rescue fight prints “Nessa Reed uses Unarmed Strike.” At level 3 I inspected the same public party and inventory view the interface uses: her weapon and armour slots were empty, and the weapon comparison described her current damage as `1-1`. She was still unequipped after the bell and road. I bought and equipped a Frontier Warbow at Ashford, then later gave her the leather armour Lark had replaced. This differs from the ranger run's guild recruitment, whose text explicitly promises her equipment.

**Why it matters:** The rescued scout is much less capable than her role suggests, and a terminal player receives no clear prompt to supply the missing kit.

**Suggestion:** Make rescue recruitment provide and retain an appropriate starting loadout, as guild recruitment promises. If losing her gear is intentional, show the loss and offer an immediate recovery or equipment-sharing choice. Verify the loadout after saving and reopening the game.

**Severity:** major.

### 7. The terminal presentation hides story at precisely the transitions that need it

**Where:** expedition departures from `q-road-start` through `q-beacon-start`; failed `resolve` at `q-road-crisis` and `q-archive-crisis`.

**What:** Each departure replaced the location opening with “The party departs for … Returning to town will preserve resolved checks, merchant stock and consequences.” Failed peaceful attempts at the road and archive then showed combat activity instead of the persuasion roll and immediate narrative reason for the failure. At the archive, the first printed account after my attempt to acknowledge the keepers was “Frontier Warbow dealt 11 piercing damage to Bound Record Keeper.” I could infer failure from the combat screen, but lost the exchange that caused it.

**Why it matters:** Missing arrivals and failed-negotiation responses make the story feel thinner and more abrupt than the actions I selected warrant.

**Suggestion:** Display the location opening on departure, and preserve the completed choice's result before combat initiative and companion attacks. Put the persistence reminder outside the narrative. This extends the terminal-opening issue found in the first review; it is a finding about the tested terminal path, not a claim about browser behaviour.

**Severity:** minor.

### 8. The expedition structure becomes visibly repetitive, and costs remain mostly summaries

**Where:** the eight expedition approach nodes, `q-road-approach` through `q-beacon-approach`; especially `q-signal-after` / `refugees` and `q-breach-after` / `consent`.

**What:** Every approach uses the same opening: “The route ahead offers a careful approach or a direct crossing. Choose how to handle the obstacle; supplies and trained skills can change the risk.” The same route label is usually selected once to reach this screen and again to attempt the check. Aftermath decisions repeatedly promise permanence but show mainly their benefits. Prioritising refugees gives “The most vulnerable travelers reach shelter first. The outpost’s trust grows”; I never hear from the supply caravans that must wait. The Quiet District's chilling premise is resolved in a few screens without a resident's actual question or reply. Terms such as “pumping station” and “command relays” also remain in the played text despite the bible's requested fantasy terminology.

**Why it matters:** Distinct places and moral decisions start to feel like the same procedure when their sensory detail, affected people and visible sacrifices stay offscreen.

**Suggestion:** Replace each generic approach with two or three details unique to its hazard, and remove the duplicate route-confirmation step where it adds nothing. After a priority decision, show one person who benefits and one reasonable person who must bear the delay. In the Quiet District, supply the unfamiliar question and the resident's first chosen answer. Use the bible's sluice-house and echo-stone terminology where appropriate. These are requests for visible consequences within the played chapters, not a claim that later chapters cannot acknowledge the decisions.

**Severity:** minor.

## Characters, comedy, pacing and limits

At the bridge, the cast finally sound like people who know each other. Nessa's exchange about grey stew and Biscuit is quick and irreverent; Maren's “Colours are a luxury of the well-provisioned” is precise and defensive; Orin's “Fourth. You weren't watching for the first one” turns obsessive pot-cleaning into evidence of distress. The scene then gives that distress space. Choosing `tell-truth` led to Wenna's morning conversation, ending with “Then you're getting better at it,” and Orin accepting Maren's hand. The joke does a different job when he later eats the stew. This is a strong model for other companion scenes.

There were no forced jokes during the archive or Quiet District on this route. Their problem is missing emotional detail, not inappropriate humour. Maren's “That was badly done” after Orin's difficult honesty with Wenna is one line I would clarify: the scene does not show what she thinks he did badly. “That was hard” would support the exchange if criticism is not intended.

Lark's support abilities and social training supplied a clear identity. I manually used Bardic Inspiration, Vicious Mockery and Rallying Verse, and later chose Practical Medic, Control, Persuasion expertise and Charisma improvements. Field Plate, a Wardbinder Staff and a Thornward Cloak supported the build. The peaceful Quiet District resolution—an unfamiliar song moving between windows—was particularly fitting for this bard. Later social checks became very reliable; that is evidence from this build and seed, not a balance verdict for all classes.

The full bell fight reached displayed round 11, while the two expedition objective fights reached displayed round 3. Automation limits what I can say about manually playing out that longer fight. I did read its transcript, but cannot generalise its length to other tactics or equipment. No rejected action or progression blocker occurred. The Fenmere return-and-resume sequence preserved its outcome correctly. The terminal omitted shop and equipment listings, so preparation also used read-only inspection of the public game view; all purchases and equipment changes still went through `scripts/play.js do`.

After play, I used `read q-beacon-crisis` and `read q-summit-start` and limited source inspection to check observations. Those are supplementary reads, not additional scenes played. I did not test the other aftermath choices, later continuity, the level-10 trial, AI narration, browser presentation or the broad automated test suite. No game code or story data was changed.

## Reproduction and local evidence

Start with:

```sh
node scripts/play.js new --class bard --name Lark --seed 2 --save .playtest/bard-level10.json
```

The local command list is `.playtest/bard-commands.txt`; each line records arguments to `node scripts/play.js` with the same `--save .playtest/bard-level10.json` appended. It includes all 139 action turns and ten `town` reads. The combat helper calls `auto 1` only until the public view stops reporting active combat. The captured play transcript is `.playtest/bard-transcript.txt`, the final save is `.playtest/bard-level10.json`, and the final-state summary is `.playtest/bard-summary.json`. These evidence files remain ignored by git and are not part of the reviews commit.

## Three things to keep

1. **The bridge camp and its next-morning payoff.** The honest answer to Wenna's question advances Orin's story, gives the companions distinct voices, and lets the humour yield to care without explaining the emotion.
2. **Peace and protection are playable routes.** Fenmere, the bridge, tower, summit, district and beacon all resolved peacefully in this run; failed persuasion at the road and archive still allowed objective victories. The player can follow a coherent principle without being forced to kill every opponent.
3. **The theme of consent reaches the mechanics and the imagery.** Earlier community decisions lowered the final difficulty, and the district's voluntary song became the beacon's different answering rhythms. Preserve that connection while giving the individual voices names and scenes.
