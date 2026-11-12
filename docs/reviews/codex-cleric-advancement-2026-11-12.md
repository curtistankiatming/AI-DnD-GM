# Codex cleric playthrough through level-10 advancement — 12 November 2026

## What I played

- **Hero:** Ilex, Cleric, starting at level 1 with **seed 3**.
- **Source:** **`e5d0b6f`** (`e5d0b6ff7e17ef34a2b798e149d5d31daf0d9fb5`), the latest `master` fetched for this run. Node.js **v24.22.1**; report branch `review/codex-cleric-advancement-2026-11-12`.
- **Finish:** level **10**, **21,816 XP**, **73/73 HP**, **1,175 gold**, at **`town-highpass`**, with no combat active. Completed the bell, all eight expeditions through the beacon, and **Oath of the Road**. All three companion personal quests were resolved.
- **Advancement:** the trial completed on **turn 138** and taught **Divine Aegis**. The public progression view confirms `trialComplete: true`, `mastery: true`, and the skill learned. This is **level-10 class mastery**, not a second-job branch; that choice belongs at level 20. The following relief-convoy expedition was not played.
- **Length and method:** **138 campaign action turns**, followed by **13 actions in two guild practice sessions**, for **151 total**. Those comprise **65 manual story choices, 36 town/practice/progression actions, 22 manual combat actions and 28 automated combat actions**, plus eight read-only `town` calls and the initial `new` command. Every `auto` call was `auto 1` during active campaign combat; the transcript contains no automated story choices. Both practice sessions were manual: one ended in victory, the second was ended voluntarily after the self-target test.
- **Limits:** no `jump`, fixtures, save edits, AI calls, API-key setup, browser or server. Four campaign fights reached displayed rounds 7, 2, 4 and 4 respectively; there were no campaign defeats or combat retreats. Guild practice was a separate ability check using the game's ordinary practice action, not another campaign chapter.

I followed `docs/AGENT-PLAYTEST.md` and read the story bible. This is a fresh character, not a continuation of the previous ranger or bard. The fetched revision contains the Act I pilot and early fixes; I assessed the scenes actually encountered rather than assuming the whole campaign had changed.

I visited Dera, treated Tovin, rescued Nessa quietly, tried exposing Sable and fought after the attempt failed. The road, archive and summit were completed through their combat objectives. Fenmere, the bridge, tower, district, beacon and advancement trial resolved peacefully. Later decisions included engineers for Fenmere, a public tribunal for the forged bridge orders, sitting beside Orin at camp, protected archive records, supply trains first, shared keystone custody, emergency oversight and independent cooperating wards.

My unexpected sequence was to leave the bell vault after Maren's preparation, recover in town and resume. The engine preserved the location and prior choices, although the terminal did not show the command needed to resume.

The rewrite makes the opening substantially stronger. Briarwatch has identifiable people, a shared past and a clear reason to fear the silent bell. Advancement also unlocks correctly and persists after practice. The remaining problems are the later story's reliance on summaries and two weaknesses in the new mastery ability, including a reproduced self-target bug.

## Earlier findings checked again

| Earlier issue | What happened in this run |
| --- | --- |
| Tovin called missing while already in the infirmary | Fixed: the objective now says “follow Tovin's trail.” |
| The Gloam and the wards' purpose were not established | Fixed in the opening: the mist takes warmth from houses and then names from people. |
| Aveline and Tovin mostly supplied summaries; Dera barely appeared | Improved: both have conversations, and Dera has a forge visit with a gossip choice and shared history. |
| Rescued Nessa lacked equipment | Fixed on this route: she joined with a shortbow and studded leather, retained them across saves, and used the bow in combat. |
| Expedition departures skipped location openings | Fixed: the road's abandoned wagon, Fenmere's sick heron, the archive's floating desks and the district's repeated routines were printed on arrival. |

I did not retest Lysa's alternative releases or the rope-crossing route without Nessa; those earlier findings are not declared fixed by this run.

## Findings, story first

### 1. The later confrontations still do not let their antagonists make a case

**Where:** `vault-antechamber`, `maren-rite`; `bell-vault`, `expose-sable`; `q-beacon-crisis`, `resolve`.

**What:** After the more conversational opening, the antechamber returns to “Your companions speak in low voices; each has a different answer,” without an actual exchange. Sable's scene is still a physical description followed by tactical options. At the beacon, “The Single Voice offers perfect safety at the cost of every keeper's choice” is followed by the narrator's judgment that its promise sounds less convincing. Corvane and Elske never appeared by name in the played narrative. The new opening now explains the Gloam, so that earlier part of the stakes problem is resolved.

**Why it matters:** The story's argument about protection and consent remains less compelling than the people and danger now established at its beginning.

**Suggestion:** Carry the pilot's dialogue style into the vault and beacon: let Sable explain a particular failure he believes binding the spirit prevents, and let Corvane defend his offer against a named keeper the hero helped. Allow a question before the tactical choice. Keep the peaceful resolutions.

**Severity:** major.

### 2. Maren's and Nessa's personal stories still finish as reward summaries

**Where:** `q-archive-after`, `secure`, then Maren's personal resolution at `town-highpass`; `q-signal-crisis`, `resolve`, and `q-signal-after`, `supply`, then Nessa's personal resolution.

**What:** Maren promises that the keepers' families deserve the truth, but this route moves from recovering records to guarded diagram custody and “Watchful: +1 AC.” No family receives a letter on screen. At the tower, the sentinel helps us pull Nessa's mentor clear, then the aftermath gives Nessa “her mentor's last reliable map” and asks about caravan priorities. The keeper and Nessa have no reunion before her quest becomes another stat reward.

**Why it matters:** The pilot has made these companions more engaging, but their later personal milestones still omit the emotional result they were travelling toward.

**Suggestion:** Give Maren one named keeper's letter to deliver and a response from its recipient. Give Nessa a short exchange with her rescued mentor before the map changes hands. Resolve the personal quests after those scenes. Use the bridge camp as the standard for depth, without copying its humour into the archive.

**Severity:** major.

### 3. The Oath of the Road never supplies the oath or the memories behind it

**Where:** `q-trial-start`, `investigate`; `q-trial-approach`, `careful`; `q-trial-crisis`, `resolve`; `q-trial-after`, `accept`.

**What:** “Each companion names a decision they remember” does not name any decision or give any companion a line. The next scene uses the same generic careful/direct approach paragraph as the expeditions. I then select “Name your responsibility and let the easy victory go,” but do not hear Ilex's answer. Completion declares, “The Oath of the Road is sworn,” without showing the words sworn. The rescue-versus-victory premise is appropriate; its personal meaning is mostly reported afterward.

**Why it matters:** Class mastery is the journey's first major character milestone, but the player experiences a check and an unlock more fully than a commitment.

**Suggestion:** Have each companion cite one actual choice from this save—such as the tribunal, supplies or archive custody—then let the player choose a short oath reflecting whom Ilex will protect. Let the trainer or a companion answer it before the skill is granted. This needs dialogue and a meaningful expression of intent, not more checks or XP.

**Severity:** major.

### 4. Divine Aegis offers a self-target that spends its cost without granting protection

**Where:** `town-highpass`, guild practice; combat action `job:divine-aegis`, target `player`, **turn 150**.

**What:** The target list explicitly includes `player`. Ilex began with AC **19** and **6** Technique uses. Selecting that offered target printed “Ilex uses Divine Aegis. 5 uses remain.” The bonus action was spent, but AC remained **19** and no Divine Aegis condition appeared. In the first practice session, the same skill on Nessa had visibly raised her AC **16 → 18** until Ilex's next turn. Ilex was at full HP for the self-test, so this directly verifies the missing protection; it does not measure self-healing.

**Why it matters:** A valid-looking use of the newly earned mastery can waste the player's bonus action and limited resource without delivering the advertised ward.

**Suggestion:** Apply the ally-target effects to the caster when self-targeting is intended. If it is intentionally forbidden, remove the caster from the target list and reject the action before spending anything. Verify the full-health ward case as well as an injured self-target.

**Severity:** major.

### 5. The mastery heals less on average than the cleric's existing Sanctuary

**Where:** level-10 progression descriptions and the Divine Aegis practice cast; supplementary inspection of the two abilities' rules.

**What:** Both abilities use a bonus action and one Technique, and grant the same +2 AC until the caster's next turn. Sanctuary heals `1d6 + Wisdom + half your level`; Divine Aegis heals `1d8 + Wisdom + a sixth of your level`. With Ilex's level, Wisdom and Practical Medic talent, their uncapped healing is:

| Ability | Healing range | Average |
| --- | ---: | ---: |
| Sanctuary | 13–18 | 15.5 |
| Divine Aegis | 9–16 | 12.5 |

The cost, duration, healing rules and protection were checked in the resolvers. These healing values are **calculated expectations**, not measurements from injured practice targets; the allies were full when Aegis was used. Nessa's protection and the Technique cost were observed directly.

**Why it matters:** The trial's reward is a weaker average heal for the same cost and ward, making the milestone less useful than an ability learned at level 2.

**Suggestion:** Give Divine Aegis a distinct benefit—such as a stronger or longer ward, a condition cure, or healing that at least matches Sanctuary—then check it across the intended levels. Avoid solving this by simply inflating every later number.

**Severity:** minor.

### 6. Advancement text promises a specialization choice the player cannot make at level 10

**Where:** trial expedition brief; `q-trial-after`; `accept`; the newly unlocked `aftermath` brief.

**What:** The brief says, “Complete this trial to choose your level-10 specialization.” The aftermath tells me to “Choose a specialization in the Progression panel,” and completion adds, “No trainer chooses your specialization for you.” In fact the trial automatically taught Divine Aegis. The public progression view correctly showed mastery learned, no specialization, no specialization options, and the second-job choice at level 20. The next expedition still says to take the “new specialization” onto the road.

**Why it matters:** A player who has successfully advanced can reasonably think a required choice is missing or that they have failed to finish the process.

**Suggestion:** Replace those references with “class mastery” and name Divine Aegis in the cleric's result. Explain that the next branch choice is at level 20. Keep the current successful unlock and save behaviour.

**Severity:** minor.

### 7. The terminal still hides some information needed to follow the campaign

**Where:** return from `bell-vault` to `town-briarwatch`, turns 17–19; failed negotiations entering combat; `ending` after the bell fight.

**What:** After returning from the vault, the town screen said “Nothing posted” and printed no resume action. `do '{"type":"resume"}'` worked when I supplied it using the action interface rather than a displayed command. Failed negotiations at the road, archive and summit again jumped into initial combat activity without retaining their roll and immediate failure text. After the bell, the terminal showed only the generic threat-ended paragraph. A read-only check of the public view found a spirit-recovery summary that the terminal never prints: “The altered ritual was broken, though the ward-spirit's recovery will take time.” Neither that summary nor the played aftermath established Sable's fate on this combat route.

**Why it matters:** An omitted command can look like a dead end, while omitted results obscure the reasons for fights and what the first chapter actually resolved.

**Suggestion:** Print the pending resume action in town, preserve the chosen action's result before initiative and companion turns, and render the ending summary. Establish Sable's fate explicitly for the combat route. The spirit information already exists in the public view; its omission should not be described as missing underlying content. The bell fight used `auto`, but the absent summary is also a terminal-rendering limitation rather than evidence that every view lacks it.

**Severity:** minor.

## Writing, comedy and what the rewrite changes

The new village dialogue earns its length. Aveline's household count gives her worry a practical shape. Dera's “That's not gossip, that's weather” grows from her way of charging for information, and her memory of Ilex fixing the roof supplies a reason this place matters. Tovin's “I said it too. I don't know why I said it” makes the coercion personal; Maren's answer, “Because you were frightened and they were sure. That isn't the same as agreeing with them,” connects care to the central theme without a lecture.

Nessa's rescue now lets her impatience and Orin's caution clash while the predicament is still happening. Quiet release also leads to Orin catching her and her refusal to accept help, rather than just adding a scout to a roster. Her mentor's later lack of dialogue is more noticeable because this introduction works.

I chose silence beside Orin at the bridge instead of the bard's earlier advice to tell Wenna the truth. Nessa slid her bowl across, and the scene ended without the next-morning truth conversation. That is a useful, observed difference between conversation choices. The stew and Biscuit humour still yields to Orin's distress. No inappropriate joke appeared during the archive or Quiet District.

The later repeated approach screens and summary-only political arguments remain the main pacing weakness. The newly visible arrival paragraphs help: the archive's drifting desks and the district's baker kneading an empty board are effective images. They should lead into comparably concrete conversations. Dera's cold, wickless black lantern is another promising detail; it was not mentioned again before this run ended. I cannot say whether a later chapter will answer it, but a retained lead or vault callback would help the player keep track of the question.

## Verification and boundaries

Divine Aegis was earned through the real trial, appeared in the available combat actions after reopening the save, spent one Technique and a bonus action, granted Nessa +2 AC, and expired at Ilex's next turn. The subsequent self-cast reproduced the missing ward. Practice restored HP, resources and inventory afterward; mastery remained learned, the trial remained complete, and Ilex stayed level 10. No advancement blocker occurred.

The healing comparison used supplementary source inspection of the public skill definitions and their actual resolvers, rather than claiming a full balance simulation. The most relevant locations are `src/data/jobs.json` (Divine Aegis), `src/progression.js` (Sanctuary, scaling and talents), and `src/combat.js` (their costs, healing, ward and duration). Read-only public-view snapshots also verified Nessa's equipment and the ending summary. These inspections are distinct from the natural campaign and the two practice sessions.

Reproduce the campaign start with:

```sh
node scripts/play.js new --class cleric --name Ilex --seed 3 --save .playtest/cleric-advancement.json
```

The exact local argument list is `.playtest/cleric-commands.txt`, with that same save flag appended by the helper. Evidence is retained in `.playtest/cleric-transcript.txt`, `.playtest/cleric-summary.json`, the final save, and `.playtest/cleric-views/<turn>.json`. Snapshot 138 records the earned mastery; 144 records the successful ally ward; snapshots 149 and 150 show the offered self-target and its missing protection. All evidence and helper files remain git-ignored.

This run does not cover the relief-convoy expedition, second-job branches, later levels, AI narration, browser behaviour or every rewritten alternative. No game code or story data was changed and no broad automated suite was run. This review records observed improvements and remaining findings without revising the two historical reports.

## Three things to keep

1. **Briarwatch's people now give the threat meaning.** Aveline's doors, Dera's open forge and Tovin's uncertainty make the Gloam an intrusion into a place the hero knows.
2. **Nessa's rescue expresses relationships through action and speech.** Her interrupted warnings, Orin's patience and the quiet-release outcome distinguish the characters while advancing the plot; her working equipment now supports the scene mechanically.
3. **Advancement is earned and persists.** The peaceful judgment at the trial unlocked the named cleric mastery, retained it across saves and practice, and left the character at level 10. Preserve that working path while fixing its targeting and presentation.
