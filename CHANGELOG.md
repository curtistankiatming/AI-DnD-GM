# Changelog

The game version is still **4.1.0-alpha.3**; each playtest release is tagged by
its commit (`playtest-<commit>`). Entries are grouped by date, newest first, with
the pull requests that made them.

## Gameplay playtest: shorter fights, Book Three catch-up (21 November 2026)

- Fights by force were 7 to 11 rounds. Enemies now have a quarter less health
  from level 8 (easing in from level 5) and hit harder to match, so they last
  about 5.5 to 6.5 rounds on Standard and 6 to 8 on Gritty past level 5, about as dangerous as
  before. AI adventures go from 7.5-9 rounds to 5.7-7.
- In Book Three, being more than 5 levels behind a chapter barely mattered.
  In the deciding fight, each missing level past 20 now counts three times,
  up to a cap (story checks are unchanged).
- Arcane Snare, Sabotage, Nova, Banishment and Nessa's Trick Shot now add stat
  damage like every other attack.
- Report: [docs/reviews/claude-gameplay-playtest-2026-11-21.md](docs/reviews/claude-gameplay-playtest-2026-11-21.md).

## Equipment step 5: the item catalogue (21 November 2026)

- 38 new pieces of equipment, 68 in all, from common axes to legendary
  Commandery gear for Book Three. Every town sells gear for its levels, and one
  or two items per town are sold only there.
- Eleven chapters now give their own reward item, and the first bounty claimed
  in each of five towns gives that town's bounty item.
- AI adventures give one item each, built from fixed templates so the
  storyteller can't invent stats.
- Prices rise with rarity and the level an item needs. List:
  [docs/ITEM-CATALOGUE.md](docs/ITEM-CATALOGUE.md).

## Equipment step 4: requirements, rarity, item skills (21 November 2026)

- Items can need a level, a class or a stat. The item card says what it needs,
  and the "who wears it" list greys out anyone who can't, with the reason.
  Old saves keep whatever is already worn.
- Items can carry special stats (more damage dealt, less taken), a combat
  skill (a bonus action once per fight that applies Burning, Slowed,
  Vulnerable or another buff or debuff) and a story ability (advantage on the
  first check of a skill after each long rest).
- Seven new items in four towns, and Field Plate and the Greatsword now need
  Strength 13. Rules: [docs/EQUIPMENT.md](docs/EQUIPMENT.md).

## Story checks step 3: the best-suited party member rolls (21 November 2026)

- The party member with the best chance rolls each story check, counting Help,
  tools and preparation. The hero wins ties and can now Help a companion.
- "Story checks: Best person rolls / I roll every check" above a scene's choices lets
  you roll every check yourself. A companion's roll shows what you would have.
- Companions cover more skills, and the party card lists what each is best at.
- You always roll your own typed actions and the Lantern Road and courier
  crossings, and a companion who would object to a choice never rolls it for
  you. When a companion steps in, the story log says so.
- A short rest is offered only when someone can use it (hit dice left or
  missing HP).
- Generated chapters to level 10 are DC +2. Average check odds are now 60-70%
  at every level band (late checks were 36%). Report:
  [docs/BALANCE-2026-11-21-CHECKS.md](docs/BALANCE-2026-11-21-CHECKS.md).

## Combat step 2: falling behind and catching up (21 November 2026)

- Chapters of Books One and Two pay about 70% of a level instead of a full
  level. Side jobs, the new bounty board and AI side quests make up the rest.
- A chapter can be started up to 10 levels under its level. More than 5 under,
  its enemies get +1 to hit and +10% damage per extra level (up to +5 and
  +50%) and its checks get harder. The "What's next?" card warns you first.
- The level-10 Oath of the Road (and other chapters that pay no XP) still
  needs its exact level.
- The bounty board: a repeatable fight at your level in every town, on the
  story screen and on Prepare. It pays battle XP (more while you are behind)
  and gold, never past the chapter's level, and up to level 20 after the
  written story. Losing costs a tenth of your gold, never more than a win
  pays. Report:
  [docs/BALANCE-2026-11-21-CATCHUP.md](docs/BALANCE-2026-11-21-CATCHUP.md).

## Combat step 1: stat damage, buffs and debuffs, chain attacks (21 November 2026)

- Hits now grow with the attacker's stat: every party hit adds its attacking
  stat's modifier once per power tier (from level 5, 11, 17, then every 24
  levels past 20). Enemies get +3 damage per tier to match.
- New buffs and debuffs: Empowered, Weakened, Vulnerable and Burning (Fortified
  and Slowed are defined for the coming equipment skills). Companion
  combinations now apply them, Fire Bolt sets Burning, and a wounded boss from
  level 5 becomes Empowered once. The combat board shows what each one does.
- Chain attacks: party hits on the same enemy in one round add 15% each, up to
  60%. A companion combination starts a chain.
- Fights that used to drag (12 to 15 rounds at levels 15 to 20) now take about
  8; AI adventures keep the same win odds per difficulty. Report:
  [docs/BALANCE-2026-11-21-DAMAGE.md](docs/BALANCE-2026-11-21-DAMAGE.md).

## Books that come out in parts

- A book can now be released one part at a time. Book Three runs from level
  20 to 40 in two parts; each part stays hidden until all of its chapters are
  written, and heroes wait at "to be continued" between parts. Book Three's
  chapters must pay exactly one level each (a test checks every chapter as it
  lands), so the book ends at level 40 and the 3rd job.

## Gameplay review fixes (21 November 2026)

- Book One story text is told in the order it happened: the roll and what it
  did, then the new place. The chapter heading is no longer repeated in the
  paragraph, and a choice card's hint ("Commit to the trail...") is no longer
  told as if it had happened.
- The "What's next?" card on the story screen now shows the Normal / Hard /
  Heroic picker for an AI-written adventure before "Set out" (it was only on
  Prepare). A trial shows its fixed difficulty.
- Review: [docs/reviews/claude-gameplay-2026-11-21.md](docs/reviews/claude-gameplay-2026-11-21.md).

## Paid books on the hosted game (groundwork for Book Three)

- The game now knows which books a session may play. The open-source game
  plays every book free. The hosted game will open Book Three onward to paid
  accounts only; the server decides this each request, and a save cannot
  change it.
- A free hosted save that finishes Book Two is told where the story goes on
  and carries straight into Book Three on an upgrade. A save inside a paid
  book whose account lapses is kept untouched and waits.
- Book Three, The Names in the Bronze (then planned as levels 20 to 30), is on the shelf but
  hidden until its chapters are written.

## Side jobs in every Book Two town, and companions who walk out

- Eight short side jobs, two in each Book Two town (Highpass, Briarwatch,
  Merrowgate, Cinder Fold), each offered while one stretch of the story is
  open. They are on the town page and in `scripts/play.js town`. Each is a
  small situation with two or three ways through, some with a roll, and the
  companions react. They pay gold and a little XP, never so much that a later
  chapter would carry the hero two levels: level 20 still comes with the
  Second Oath. A job left half done picks up where it was.
- In Book Two, a companion whose approval falls by 2 or more over one chapter
  walks out after it, misses the next chapter and comes back when it is done,
  each with a written scene. They never leave just before their own chapter
  or the last two; they stay and say so. Some Book Two choices now cost the
  approval of the companion they cut against.
- Scenes a companion can now miss read right without them (Fenmere, the
  South Road, the Harbour Bell, the Last Name on the List, Hollin's Reach,
  the Vote). A camp scene skipped because someone is missing no longer drops
  the lines of the choice before it.
- Review fixes: while a companion is away their kit stays theirs (it can't
  be sold or worn by someone else), and Nessa can't be recruited a second
  time while she is out on the roads. Seven more lines that answered or
  carried an away companion now read right without them, one side job no
  longer assumes you backed Brannagh at the Chair Problem, and the Highpass
  room job no longer names Brannagh before you have met her.

## Story self-review: lines that assumed a choice you didn't make

- Without Nessa in the party, the Highpass signal log is read with the
  station's codebook, and Wren at Cinder Fold greets you rather than her.
- Aster Vey only thanks you for freeing her if you broke Sable's rite.
- After a fight at the council chairs, nobody claims the council agreed.
- At the South Road camp, Hal names whoever actually paid for Fenmere
  (shared cost, the guild loan, or your own fee).
- After Hollin's Reach, Orin asks about the way you actually ended the
  memory (speaking up, climbing the tower, or fighting through).
- Brannagh talks about getting the lower village back if the council
  promised it. On the recall night, a Hal who joined the guild takes off
  her guild coat instead of riding up with her company.
- Orin's Ashford reflection, if turned in after Book Two, is told as a
  memory from months before.

## Fixes from the fifth Codex playtest (a fresh bard, level 1 to 21)

- At the tollhouse, a hero who skipped the investigation is no longer
  offered the captain's duplicate receipts. They question the drivers in
  front of the guards instead. The marsh and the signal tower also word
  their peaceful option for a hero without the lead. Peaceful options can
  now have a separate label for when the lead is missing (`labelNoLead`).
- If Maren's archive reflection is turned in after she has let go of her old
  list, the story no longer brings the list back.
- If you spared Lysa in the Briarwood, she is now working for the guild on
  the Merrowgate quay in The Harbour Bell. She can tell you where Iona is
  being held, and afterwards she leaves the guild.
- The bundled sample AI adventure now names the guild it asks you to accuse.

## Book Two, fixes from the fourth Codex playtest

- If you skip looking into things, a peaceful ending no longer credits you
  with what you would have found. Briarwatch's vote speech, Ilka's missing
  verse at Fenmere, and the founders' notes at the Mother Bell each have a
  version for heroes without the lead. Written lines can now depend on
  whether a clue was found (`clue` / `notClue`).
- With the bell-rope locked away, Elske stands down at the foot of the
  ladder, not beside a rope that is no longer there.
- The text a story choice passes on (to chat narration) now leaves out
  lines that don't apply to the save, as the story screen already did.
- Terminal game: `auto` shows how a fight ended, and `look` during a fight
  also shows how it started.

## Book Two, fixes from the third Codex playtest

- At the hearing, if you locked the bell-rope away, the scene now shows the
  forge hammer and the ladder before any fight. If your speech fails, the
  fight starts with Elske climbing, and the scene before it isn't repeated.
- Every expedition now offers the peaceful resolution even if you skipped
  looking into things first. Without a lead the roll is 2 harder.
- A failed speech at the hearing, or a bad afternoon knocking on doors before
  the vote, no longer injures the party.
- After a peaceful rescue at the hospice, the lamp-man thanks you for staying
  and talking, not for holding a door.
- The terminal game no longer reprints the whole crisis after every combat
  action.

## Book Two, fixes from the second Codex playtest

- Starting a fight now tells only the version of events this hero lived
  through. Before, the Mother Bell and the hearing fights read out every
  version of the vote at once, and Elske kept the Warden's title even when
  the council had refused it.
- If you locked the bell-rope away, the hearing is now about the key and a
  forge hammer, not a rope still hanging from the bell.
- After the recall, the delegates are already in the hall instead of still
  on the road.
- Keeping the hospice receipts now costs the party 60 gold for six lamps,
  and the rest of the Sallows stays dark.
- Written choices can now cost or give gold.

## Book Two, chapters 7 to 10 and the epilogue

- **Cinder Fold** (level 16 to 17): the first forge. Nessa's mentor Wren has
  read every letter Nessa never sent. Down in the deep galleries, the nine
  first wards have been holding the Gloam alone for nine hundred years. Aster
  Vey asks for a seat on the council for the wards.
- **The Vote** (17 to 18, Briarwatch): Sable's warning from his cell, Pim's
  four-colour chart, a paid crowd at the town meeting, and the council's vote
  coming down to Brannagh, who wants a fence.
- **The Mother Bell** (18 to 19, Cinder Fold): the night before, Orin asks for
  Maren's stew. Elske rings the first bell over every ward in the land,
  lawfully or not, depending on the vote. It works, and silences every other
  voice. Someone else holds the door.
- **The Second Oath** (19 to 20): Elske's charge lists what you decided
  alone, choice by choice. Persuade her or stop her at the rope, decide her
  fate, swear who your oath answers to, then come home to Dera's forge.
- The written story now ends at level 20; after it, the AI storyteller takes
  over as before.

## Book Two, chapters 4 to 6

- **The Harbour Bell** (level 13 to 14, Merrowgate): Iona's itemised invoice,
  Guildmaster Pell Haverick, an auction where every rule makes someone richer,
  and Iona kidnapped to stop the council bidding. Get her to the hall before
  the hammer falls; Elske makes her offer of a Warden of the Chorus in public.
  Hal helps differently depending on which contract she took.
- **The Last Name on the List** (14 to 15): Maren's last lost keeper, Anwen
  Holt, is alive and runs a hospice for the mist-touched that Elske pays for.
  Hold it through a night of the Gloam; find out who skimped on the lower
  town's lamps; play cards with two people cheating the same way.
- **Hollin's Reach** (15 to 16): the town that burned while its council
  argued. Sit in the remembered council and try to get it to ring the bell.
  Elske voted to wait. Whether you tell her is up to you. Cinder Fold opens.

## 19 November 2026 — Book Two, chapters 1 to 3

The written story continues past level 10. Book Two, **The Council of Small
Voices**, follows the story bible ([docs/STORY-BIBLE.md](docs/STORY-BIBLE.md)).

- **The Chair Problem** (level 10 to 11, Highpass): the first council of the
  free wards, the seating chart, Provost Elske Marrow, Brannagh of Fenmere and
  her goat, and a Gloam tide at the gate that only the delegates together can
  ring back. Who pays for Fenmere is your call.
- **Fenmere Under the Gloam** (11 to 12): the lower village is lost because help
  came late. Save the rest with the village's ward-song; then help the baker's
  ward close up.
- **The Long Road South** (12 to 13, Briarwatch to Merrowgate): Dera, Tovin's
  keen apprentice Pim, and the "bandits" at Kell's Bridge, who are Lieutenant
  Hal's unpaid beacon crews. Orin's story. Merrowgate opens as a new town.
- Camp scenes after each chapter; conversations before setting out; Book One's
  ending now leads into Book Two. Each chapter pays about one level.
- Saves that finished Book One without any AI adventure carry on into Book Two.
  After chapter 3 the game says "to be continued" until the next chapters land.

## 19 November 2026 — fixes from the level 11 playtest

Fixes for [docs/reviews/codex-2026-11-19.md](docs/reviews/codex-2026-11-19.md).

- **End of the written story**: finishing the relief convoy now says plainly
  that Book One is complete and that further adventures come from the AI
  storyteller (or that the written campaign ends here without it). The board
  says so too, in the browser and the terminal. A commissioned adventure is
  reported straight away instead of repeating the previous message.
- **Oath of the Road**: companions name decisions this hero actually made
  (or argue about one, if the talk goes badly), and the hero swears one of
  three oaths. Mastery is announced when it is granted. The relief convoy
  remembers which oath you swore.
- **Personal moments**: Maren carries Brother Edric Moss's letter out of the
  archive and delivers it to his sister when her story resolves; Nessa has a
  scene with her mentor Wren at the signal tower; Orin's story ends at the
  bridge rail with Hal; High Warden Corvane speaks for the Single Voice at the
  beacon.
- **Approaches**: every expedition describes its own route instead of the
  generic "careful approach or a direct crossing". The relief convoy describes
  the hero's own class mastery and no longer advertises level 20 abilities.
- **Display**: a failed parley that starts a fight is told once, and continuing
  an interrupted fight from town shows the fight's scene, not the town.
- **Written lines can depend on the save**: a line may carry `"when"` (a flag,
  a companion in or out of the party, or the hero's class). Lines spoken by a
  companion who is not in the party are skipped. Expedition text fields in
  `quests.json` accept lines as well as plain text.
- `node scripts/play.js commission-sample` adds the bundled sample AI adventure
  after the written story, for terminal reviews (marked as a fixture).

## 12 November 2026 — the written story comes first

- **Story arcs, step 3**: beyond the books, AI adventures come in four-chapter
  arcs (opening, rising, turn, finale). The game paces them; the AI names each
  arc and writes its chapters. The Journal shows the arc in progress and each
  finished arc.
- **The chronicle, step 2**: every finished AI adventure becomes a chapter of
  the hero's own story, with the player's choice and the people, places and
  open threads it introduced. The AI reads it before writing the next
  adventure; the Journal shows "Your story so far". Old chapters are condensed,
  never dropped.
- **AI storyteller rules, step 1**: while a written chapter exists, the AI game
  master writes small side quests instead of full adventures, steers long
  detours back to the book, and can only give XP up to the chapter's level.
  Once the written story is finished, the save becomes the hero's own story with
  full AI adventures. Chat now allows unusual actions (being rude to an NPC) and
  remembers them in the journal. Design: [docs/AI-STORYTELLER.md](docs/AI-STORYTELLER.md).

## 11 November 2026 — balance passes

- **Balance pass** (#32): fighters strike three times with each Attack from
  level 20; enemies gain 0 to 25% more health from level 70; chronist, warlord
  and other branches retuned; combat objectives take steps. New battle simulator:
  `npm run balance`. Report: [docs/BALANCE-2026-11-11.md](docs/BALANCE-2026-11-11.md).
- **Balance follow-up** (#33): casters evened out across play styles; the
  original specialization skills now scale with level; Time Stop allows a save;
  Pathfinder skills deal damage; small cleric trims. Clerics remain the
  strongest class by choice. Report:
  [docs/BALANCE-2026-11-11-FOLLOWUP.md](docs/BALANCE-2026-11-11-FOLLOWUP.md).

## 10 November 2026 — job advancement to level 100

- **Levels to 100 and XP by battle difficulty** (#24): cap raised to 100; every
  XP source pays a share of the current level (battles easy 3% to deadly 15%,
  missions, quests, AI adventures, trials); Normal, Hard and Heroic adventure
  difficulty; old saves converted.
- **Class mastery and the 2nd job** (#26): the level 10 trial teaches a class
  mastery skill; three branches per class at level 20.
- **Job tree** (#27): a job tree in Prepare and a combat skill bar grouped by job.
- **3rd job at level 40** (#28) with a trial written by the game master.
- **4th job at level 70** (#30) with a legendary trial and an ultimate at 100.
  Renown ranks now start only after level 100 once the 4th job is learnt.
- **Renown ranks** (#19): endless ranks with capped boons (first placed after
  level 10, moved after level 100 by #30).

## 10 November 2026 — first-time experience and redesigned screens

- **Title page** (#29): Continue or New adventure before the hero form; AI
  tuning moved under Advanced settings.
- **First-time experience** (#18, #20, #22): welcome panel and plain AI wording;
  roll card, how-to-play card and example prompts; quick hero creation (name and
  class, the rest optional); choose your game master with an in-game key box
  that saves and tests the key, replacing the manual `.env` steps; the
  **What's next?** board for leaving on expeditions or wishing for a new adventure.
- **Play-screen redesign** (#17, #21, #23, #25): slim header and plain wording;
  a story screen with the scene, choices and chat together; a one-screen combat
  board; shorter party sheet, journal and town. Notes in `docs/UI-UX-STEP1.md`
  to `docs/UI-UX-STEP4.md`.
- Story browser test made steadier (#31).

## 10 November 2026 — the AI game master

- **Claude API provider** (#12): Claude narrates story scenes and resolves
  improvised actions, which the engine caps and you confirm before any roll.
- **Story director** (#13): Claude writes new adventures that continue the
  campaign; the engine sets level, enemies and rewards. Fixed a dead "Ask the GM
  for a new adventure" button (#15).
- Engine split into story, combat, view and core modules (#14); written content
  moved into `src/data` JSON files (#16).

## October 2026 — interface batches

- Save protection, Quick Save, Continue/Load and usable waits (#9); story-first
  layout (#10); management and preparation screens (#11).

## September 2026 — 4.1.0 alphas

- Reliability fixes, chat foundation, Lantern Road and the campaign journal
  (#4), shared local-model evaluation (#5), local AI response handling (#8).
  See [docs/CURRENT-STATUS.md](docs/CURRENT-STATUS.md) and the dated reports in
  `docs/` for the evidence from that period.
