# Book Three design: The Names in the Bronze, Part One (levels 20 to 30)

The approved Book Three design (20 November 2026), carried into the 20 to 40
plan (21 November 2026). Part One is chapters 1 to 10. **The "Revisions for
the 20 to 40 book" section at the end overrides anything above it.** Part Two
(chapters 11 to 20) gets its own design before Part One is released.

Build rules for every chapter: the Book Two shape (opening, talks, a clue to
investigate, a route, a crisis with a peaceful way and a fight, then one
decision that completes it). A second choice goes in a scene with an empty
cast that runs straight after. "Needs the clue" means `prepared:<chapter id>`,
set only when the investigation succeeds. Every chapter has `"book": 3`,
`"part": 1`, and pays `xp` equal to `P.levelBand(level)` exactly. Story first;
lighter moments only where the people in the scene would have one.

## World rules
Five rules every Book Three scene keeps to, each checked against Books One and Two.
Wards are many kinds of thing. A song in four verses (Fenmere), a hearth bell every house keeps (Cinder Fold), a bell holding a keeper's spirit (Briarwatch), nine named bells under a forge. Book Three adds no rule that all wards are people.
The old keepers' rite let a keeper's spirit choose to stay in its bell after death and keep the place. Sable altered it to bind a spirit that had not chosen: Aster Vey, Briarwatch's first bell-keeper. You broke his rite before it finished her, and she spent years without her own name.
What is new, and the book's horror: Sable's altered rite does not need the keeper to be dead. Cast a bell around a living volunteer and the ward is whole in a night, where the old way takes a keeper's whole life. Sable sent the rite to Corvane from his cell last autumn, because Corvane asked politely.
Why the Commandery fell. Central Command melted its own province's wards into the iron echo-stones of the Single Voice, a generation before it took the free wards' keepers. Echo-stones answer only the Single Voice, so when you broke it they went dead. The Mother Bell speaks through wards, whether it commands them or asks them, so in every Book Two ending its note never reached a province with none.
What a bound voice costs. A voice in a bell does not age, sleep or leave, and cannot close up unless it is let go. Aster is the proof of what binding takes from someone.
## Chapters 1 to 3: home
Every chapter is an expedition in the Book Two shape: opening, talks, a clue to investigate, a route, a crisis with a peaceful way and a fight, then one decision that completes it. A second choice in a chapter goes in a scene with no cast that runs straight after, the way the Second Oath does. Ids are given for the build.
### 1. The Letter from Vell (b3-letter, level 20, Briarwatch)
Opening. Spring. Tovin rings the hours and Pim rings them with him, on time. A Commandery courier, Sergeant Ama Roke, comes up the Briarwood road on a cart white with frost, nearly dead. She carries a letter from Corvane addressed to "the one who broke the Single Voice". Who reads it out follows your Second Oath: Aveline at the council table (council), in the square (town), Orin by the fire (companions), you alone (no one).
The letter, in full: the towns the Gloam has taken this winter, by name, and an invitation to come and see the nurseries.
Talks. Aster Vey, from the bell: she knows the rite he means, and asks you to take her to Sable before you answer. Pim asks Tovin what it is like to be a bell; Tovin is frightened, and tells him so. Roke, who crossed three towns living on their rooftops to get here; one was Saltwick, and Orin goes quiet at the name.
Clue (history, alt. arcana): the frost on the cart is Gloam that rode in with it, folded into the canvas.
Crisis. At dusk it gets loose in the lanes and starts taking the warmth out of houses. Peaceful: Aster and Tovin ring it back together (performance, alt. religion). Fight: frost-shapes, called the Cart's Cold.
Decision. Write back that you are coming (b3_answered: Corvane meets you at Vell's gate himself in chapter 5), take the letter to the council first (b3_to_council: Iona is sent with you, which puts her in Vell for chapter 5), or tell Aster you will hear her first (b3_asked_aster: she trusts you, which matters when she asks you for something in chapter 7).
Lighter side. Dera, mending your gear, wants every scrap of news from Vell as payment, and haggles over the quality of it.
Camp scene letter-camp: what each companion knows of the Commandery. Orin will not say why Saltwick matters.
### 2. Sable's Rite (b3-rite, level 21, Highpass)
Opening. Sable in his cell under Highpass, with more books than he can read. Aster Vey comes in the little bell in your pack.
Talks. Sable explains the old keepers' rite and what he changed, and that it works on the living. He admits he sent Corvane a copy last autumn: "He asked politely. Nobody had asked me anything in a year." His case for it nearly convinces you again. Aster asks him one question: did he know her name when he did it? He did.
Clue (investigation, alt. insight): the Lantern Hall's couriers carried Sable's letters, and a second copy of the rite is in the prison ledger room.
Crisis. That night Lantern Hall agents break into the prison for the copy, to sell it. Peaceful: turn the agents' hired guide (persuasion; if b2:lysa_turned, Lysa is the guide). Fight: Lantern Hall bravos.
Decision (the copy): burn it (b3_rite_burned; Maren +1), carry it to Vell (b3_rite_carried; Nessa +1; lets you show Corvane the old version beside his in chapter 5), or give it to the council (b3_rite_council; Orin +1; strengthens the law in chapter 10). Sable still has it in his head whatever you choose, and says so.
Lighter side. None. This is Aster's chapter.
Camp scene rite-camp: Aster speaks about the years under the roots without her name.
### 3. The Pass in Spring (b3-pass, level 22, Highpass)
Opening. Six hundred Commandery refugees at the gate, the Gloam a mile behind them. Captain Sorrel has no beds, again. The delegates are there; Elske too if elske_seat.
Talks. A woman from the Iron Road who lost two towns in one winter. Clerk-Major Fennick, who walked over the pass carrying Vell's census of the lost in a box, and will not put it down. Hal, if her soldiers serve the council (south_hal_council): they crewed echo-stones and know the refugees' towns by name.
Clue (history, alt. insight): the refugees' towns had echo-stones and nothing else. Your victory at the beacon cost them their wards.
Crisis. The Gloam is in the refugees' goods: blankets, sacks, cradles, all carrying frost. Let them in with it and it gets into Highpass. Peaceful: persuade them to burn everything they carried at the gate and come in with nothing (persuasion, alt. insight). Fight: the Gloam rising out of the carts at the palisade.
Decision. Let everyone in and the council feeds six hundred (b3_pass_all; Orin +1), children and the sick first, the rest camp below the walls (b3_pass_some), or send them on to Fenmere's rise, beside Fenmere's own people still waiting to go home (b3_pass_fenmere; reads fen_build_above and fen_promise for what Brannagh can offer).
After, lighter side. Iona and Fennick go through each other's paperwork in silence, line by line, for an hour. Then Iona corrects his arithmetic.
Camp scene pass-camp: Nessa and Biscuit with the refugee children; then the question of who goes to Vell, answered by your Second Oath.
## Chapters 4 to 6: over the mountains
### 4. The Last Roof (b3-saltwick, level 23, Saltwick). Orin's story
Orin's past, made specific. Eight years ago Orin's company was a hired road company, guarding Commandery salt carts over the pass for one season. When a Gloam tide came up the valley, its captain ordered it out and left Saltwick behind. Orin obeyed. That is the night behind "we left civilians behind once". Central Command later set an echo-stone there; it went dead last year, and the town went up onto its roofs.
Opening. The Iron Road over the pass, a dead echo-stone on a post every mile. Saltwick's people live on the rooftops, joined by planks, its lamplighters keeping lamps lit all night to hold the mist down in the streets.
Talks. Orin, finally, about that night. Mags Peller, the lamplighters' head, who remembers his face and says so before he does. Her grandson Davin, who was six then and does not remember Orin at all.
Clue (investigation, alt. survival): the lamp oil runs out in four nights. Vell's ration office, run under Commander Hesk's quotas, sends oil only to towns that send volunteers.
Crisis. The night tide comes up the streets to the eaves. Peaceful: take the whole town over the roofs and down the far road to Vell in one night, nobody left behind (athletics, alt. survival; Orin leads it). Fight: the tide's shapes on the planks.
Decision. Saltwick goes to Vell with you (b3_saltwick_moved; Orin +1), holds on oil bought from Hesk's office with gold and two volunteers' names (b3_saltwick_bought; Orin -1, Maren -1), or holds on oil you seize from the ration convoy (b3_saltwick_seized; Hesk remembers it in chapter 5). Later lines that only need "Saltwick held" check either of the last two.
What Orin gets. Not forgiveness. Mags says she will think about it, and means it. That thread closes in the epilogue.
Lighter side. The lamplighters have opinions about knots. So does Orin. They argue on a plank over a twenty-foot drop, and both enjoy it.
Camp scene saltwick-camp: who sits with Orin. His approval decides how much he says.
### 5. The Casting Yard (b3-vell, level 24, Vell). Nessa's story
Opening. Vell: iron gates, a drill-yard the size of Briarwatch, and four hundred names chalked on the casting wall. Corvane meets you (at the gate himself if b3_answered; otherwise after Fennick has processed you). His first question follows your Second Oath.
Corvane's ask, and his line. The first casting is in nine days. He wants your blessing, because the free wards will follow your word and he will need their bronze. He tells you plainly that he will cast on the ninth day with it or without it.
Talks. Corvane and his ledger of the lost, read aloud each night. Commander Idris Hesk, his second, who makes his case to your face: his district lost six hundred people this winter waiting for volunteers, and the willing are a luxury he can no longer afford. Ysolde Carr, nineteen, first on the wall, volunteering so her brothers Hugh and Wil are fed for life.
Clue (arcana, alt. history): Corvane's copy is Sable's altered rite. If b3_rite_carried, you can show him the old keepers' version beside it.
Crisis. Hesk's officers try to take the iron vault's keys at night. Peaceful: wake Corvane and make him refuse them in front of his own officers (persuasion, alt. intimidation). Fight: Hesk's drill-guard.
Decision. Give Corvane your blessing (b3_blessed), refuse it (b3_refused), or "not yet; show me all of it first" (b3_waiting). It decides whose name is on the first casting in chapter 7.
Nessa (scene vell-ysolde, straight after, cast Nessa). She tries to smuggle Ysolde out through the sluices, and Ysolde refuses. You back Nessa (b3_ysolde_pressed; Nessa +1 now) or Ysolde's right to choose (b3_ysolde_respected; Nessa -1 now; Nessa's arc completes only on this path). If Nessa is away, Ysolde's refusal is told and neither flag is set.
After. Fennick's welcome procedures, which take a full day and are the only thing in Vell that runs on time.
Camp scene vell-camp: a companion notices the hero's new 2nd job skill at level 25, in a way that fits that job.
### 6. The Witness (b3-witness, level 25, Vell). Maren's story
Opening. Corvane asks Maren to sit with every volunteer, face to face, and hear whether their yes is a lie. It would make the casting as honest as it can be.
The limit, as the bible sets it. Maren hears a calm person lie. She cannot hear someone who believes what they say. She will catch the volunteers who were told what to say, and miss the ones who talked themselves into it. Ysolde believes every word.
Talks. Maren, about what it means to be the one who says "true". Three volunteers, each a short scene: one lying, one certain, one who has not decided and wants Maren to decide for him.
Clue (insight, alt. investigation): Hesk's quota for every district, and the trade it has grown: district wardens selling places on the wall, so a poor family's child goes in place of a rich one.
Crisis. Hesk defends the quotas in person in the casting yard, in front of the volunteers. Peaceful: lay the trade before the volunteers themselves (persuasion, alt. insight; the strongest version needs the clue to have been found, prepared:b3-witness). Fight: the district wardens' men.
Decision. Maren witnesses (b3_witnessed; 63 withdraw, 337 remain), refuses (b3_unwitnessed; Maren +1; all 400 remain, on the officers' word), or witnesses and exposes the quotas (b3_quotas_exposed; Corvane ends them, 190 remain, and Hesk turns to the vault).
Lighter side. The night before, Maren plays cards with the volunteers, wins everything, and gives it all back.
Camp scene witness-camp: Maren and the hero, about the one she could not hear.
## Chapters 7 to 10 and the epilogue
### 7. Home for Help (b3-home, level 26, Briarwatch)
Opening. Back over the pass, the news follows you: the nine days ran out, and Corvane cast the first fifty. Your name was read out over the pit (b3_blessed), or he cast without the free wards' blessing and said so (b3_refused), or he waited three more days for you, then cast (b3_waiting). The rite works on the living. Everyone now knows it.
The council's question. Take in a city of twenty thousand if it comes to it, or send help and no more. Iona has the numbers, and they are bad.
Talks. Tovin and Pim, about Aster. Brannagh, who offers to take back Fenmere's lower village from the Gloam with the refugees' hands, if the council pays for it. Elske (seat: in the room; judged or free: by letter), who knows how Corvane thinks.
Clue (persuasion, alt. history): the frost has come over the pass again, in goods from Vell, and Briarwatch's farmers have noticed.
Crisis. A cart from Vell goes white in the market, and a frightened crowd turns on the refugees camped by the river. Peaceful: talk the crowd into helping burn the goods instead, with Brannagh beside you (persuasion, alt. performance). Fight: the frost-shapes rising out of the cart.
Decision (the council): take the city if it must come (b3_council_take), send help but not the city (b3_council_help), or refuse (b3_council_refuse; the council's mood drops for the rest of the book).
Aster (scene home-aster, straight after, no cast). Aster Vey asks to go to Vell and take its great bell: the one ward who can say yes knowing exactly what it is. With b3_asked_aster she asks you first, as a friend; otherwise she asks the council and you hear it there. With wards_seat the wards vote, and they split evenly, so your answer decides. Agree she may go (b3_aster_may_go) or ask her to stay (b3_aster_stays).
Camp scene home-camp: Tovin rings the hours and nobody speaks until he has finished. Later a refugee boy from the pass starts minding Brannagh's goat, and she lets him.
### 8. The Quiet Bells (b3-vault, level 27, under Vell's drill-yard). The darkest chapter, no lighter moment
Opening. While Corvane is on the wall, Hesk opens the iron vault: thirty-one iron bells, keepers Central Command bound against their will over sixty years. Hesk wants them on the walls tonight.
Maren. With Elske she heard no lie because Elske believed herself. Here there is no breath to hear at all. She has to decide to believe them.
Talks. The bound, through Aster, who was bound as they were. Corvane, who knew the vault was there and chose volunteers because of it.
Clue (investigation, alt. religion): the records of what each was taken for. Most were taken for being in the wrong place.
Crisis. Stop Hesk's waking before it ties them to the walls. Peaceful: Aster speaks to them as one of them (religion, alt. persuasion). Fight: Hesk's vault guard and the Iron Chorus, the bound voices driven into one.
Decision. Let them go and close up for good (b3_vault_closed; Maren +1; the walls are weaker at the great bell), or let them hold the walls one more night, which binds them again (b3_vault_held; Maren -1, Orin -1; they stay bound until chapter 10's law decides).
After. Hesk is gone, and so is Corvane's copy of the rite.
Camp scene vault-camp: no banter. Each companion says one thing they will remember about one of the bound.
### 9. The Great Bell of Vell (b3-greatbell, level 28, Vell)
Opening. The Gloam's great surge comes down on Vell from three sides. Anwen's way is tried first (Anwen herself if elske_free, otherwise Maren): every name said aloud. It holds the hospice. It does not hold a city.
Corvane, at last against you. He means to cast every name on the wall at once, tonight, and has the pit lit. Peaceful: talk him off the pit stairs (persuasion, alt. insight). Fight: his own guard at the pit; then the Gloam's heart (boss) comes up through the yard. Either way you reach the pit with the choice still open.
The vault pays off. With b3_vault_held the walls hold long enough to choose calmly. With b3_vault_closed the surge reaches the yard first and the fight is harder (an engine change, listed under testing).
The decision, three answers, each with a loser:
Cast the volunteers (b3_bell_cast). How much of Vell holds depends on how many names are left: 400 hold the whole city, 337 all but the outer district, 190 only the inner city, and the rest of its people go over the pass. If b3_ysolde_respected, Nessa is with Ysolde at the pit; otherwise Ysolde goes in alone.
Take the city over the pass (b3_bell_evacuate). Vell is lost and the Commandery ends as a place. The free wards must feed it: possible with b3_council_take, hungry with b3_council_help, and with b3_council_refuse the refugees go to the rooftops of Saltwick and Fenmere's rise with nothing promised. Ysolde goes with her brothers. Corvane stays behind with his ledger until you carry him out.
Aster takes the great bell (b3_bell_aster, needs b3_aster_may_go). The city's heart holds and its outer districts still go over the pass. Ysolde is not cast. Briarwatch's bell is empty: from now on the Gloam reaches the edge of the Briarwood every winter and the village keeps a night watch. Book Four reads this.
Camp scene none: the chapter runs straight into chapter 10.
### 10. What Was Paid (b3-paid, level 29, the Iron Road)
Opening. The first fifty proved the rite, whatever happened at the great bell. Hesk is carrying Corvane's copy over the pass to sell to every frightened town in the free wards, and the Lantern Hall is waiting for him at Highpass.
Talks. Sergeant Roke, who knows the Iron Road. Corvane, who asks to come. He tells Orin whose name is first in his ledger: his sister Merel, taken at Saltwick eight years ago, the night a hired company left. Orin tells him he was in it.
Crisis. Catch Hesk at the last echo-stone before the pass. Peaceful: turn his soldiers, whose families are in Vell or on the road behind them (persuasion, alt. intimidation; their loyalty is already cracked if b3_quotas_exposed, shown in the lines). Fight: Commander Hesk, the book's last boss.
Decision (the rite, for good): destroy every copy (b3_rite_destroyed; Sable still remembers it, and the epilogue says so), give it to the council under a written law (b3_rite_law; a witness, no quotas, never the unwilling, and the thirty-one let go if b3_vault_held; stronger with b3_rite_council), or leave it with Vell (b3_rite_vell).
### Epilogue (b3-epilogue scene, level 30, Dera's forge)
First, Corvane. Send him to the council's judgement (b3_corvane_judged), leave him to his own people (b3_corvane_vell), or let him keep the ledger as keeper of the names (b3_corvane_keeper).
Dera has your gear on the bench before you have finished saying hello. Orin decides whether to spend a season in Saltwick (Mags has thought about it); he is back for Book Four's first chapter either way. Nessa writes to Ysolde, or about her, and sends it. Maren keeps no list.
If Aster went to Vell, Tovin rings the Briarwatch bell by hand on the hour, and Pim rings it with him.
The 2nd job skill at level 30 is named in the last camp lines.
The hook. A letter from Vell, or from Fennick if Vell is gone: under the iron vault there is a stair nobody built, going down into the old places.
## New story flags
Every choice that a later chapter reads, and where. All flags start b3_ so they never collide with Books One and Two. Every flag here is read at least once.
| Set in | 
Flags | 
Read in
| 1 Letter | 
b3_answered, b3_to_council, b3_asked_aster | 
5 (who meets you; Iona in Vell), 7 (how Aster asks)
| 2 Rite | 
b3_rite_burned, b3_rite_carried, b3_rite_council | 
5 (show Corvane the old rite), 10 (the law is stronger)
| 3 Pass | 
b3_pass_all, b3_pass_some, b3_pass_fenmere | 
7 (where the refugees are camped), 9 (evacuation lines)
| 4 Saltwick | 
b3_saltwick_moved, b3_saltwick_bought, b3_saltwick_seized | 
5 (Saltwick's people in Vell; Hesk remembers the convoy), 9, epilogue (Orin and Mags)
| 5 Vell | 
b3_blessed, b3_refused, b3_waiting; scene: b3_ysolde_pressed, b3_ysolde_respected | 
7 (whose name is on the first casting), 9 (Nessa at the pit), epilogue
| 6 Witness | 
b3_witnessed, b3_unwitnessed, b3_quotas_exposed | 
9 (how much of Vell holds), 10 (Hesk's soldiers)
| 7 Home | 
b3_council_take, b3_council_help, b3_council_refuse; scene: b3_aster_may_go, b3_aster_stays | 
9 (evacuation, Aster's answer)
| 8 Vault | 
b3_vault_closed, b3_vault_held | 
9 (how hard the yard is), 10 (the law lets them go)
| 9 Great bell | 
b3_bell_cast, b3_bell_evacuate, b3_bell_aster | 
10, epilogue, Book Four
| 10 Paid | 
b3_rite_destroyed, b3_rite_law, b3_rite_vell; epilogue: b3_corvane_judged, b3_corvane_vell, b3_corvane_keeper | 
Epilogue, Book Four
Every Book Three line that reads a Book Two flag (second_oath, Elske's fate, wards_seat, south_hal_council, b2:lysa_turned, Fenmere's flags) has a version for when the flag is missing, using the bible's old-save defaults. A second-scene flag can be missing when its companion is away; lines check for that too.
## Side jobs and camp scenes
Six side jobs, built the PR #50 way: each open for a window of chapters, mostly gold and about 130 XP, never past the current chapter's level, and never assumed by the main story.
| Hub | 
Side job | 
Open during | 
What it is
| Briarwatch | 
Pim's Apprenticeship | 
1 to 3 | 
Tovin wants Pim apprenticed to Dera for a season, away from bells. Pim does not. Talk all three round.
| Highpass | 
Beds for Six Hundred | 
3 to 4 | 
Captain Sorrel needs six hundred beds by nightfall; Iona and Fennick each have a plan.
| Highpass | 
Sable's Library | 
2 to 7 | 
Sable wants his books returned to the Ashford archive with notes in the margins. Read the notes first.
| Saltwick | 
The Oil Run | 
4 to 6 | 
Get one cart of lamp oil up the Iron Road before the tide.
| Vell | 
Fennick's Census | 
5 to 9 | 
Match a refugee at Highpass to a name in Fennick's box. One is alive.
| Vell | 
Hugh and Wil | 
6 to 9 | 
Ysolde's brothers want to volunteer in her place. Talk them out of it, or find them work.
Camp scenes: one after each chapter except 9, ids as listed in the chapters. The ones after chapter 5 and the epilogue also mark the 2nd job skills at 25 and 30. After `b3_bell_evacuate`, Vell's town page becomes the empty city: no merchants or side jobs, one visit scene.

## Revisions for the 20 to 40 book (override the above)

**Ids and levels.** Chapters 1 to 10 are b3-letter (20), b3-rite (21),
b3-pass (22), b3-saltwick (23), b3-vell (24), b3-witness (25), b3-home (26),
b3-vault (27), b3-greatbell (28), b3-paid (29). XP for each is exactly
`levelBand(level)`: 6,750; 7,000; 7,250; 7,500; 7,750; 8,000; 8,250; 8,500;
8,750; 9,000.

**Sable** is always alive in a cell at Highpass in Book Two's data, so no
variant is needed for his fate.

**Chapter 4.** Mags "will think about it" and says so; her answer is no longer
in the epilogue. It comes in Part Two (chapter 13). Orin's past: his captain
eight years ago was **Captain Odell Varn** (named here for the first time; Part
Two brings him back). Do not use the name Brask: Sergeant Brask is one of
Hal's soldiers in Book Two.

**Chapter 8 aftermath.** "Hesk is gone, and so is Corvane's copy of the rite"
becomes: in the confusion after the vault, a Lantern Hall agent takes Corvane's
copy; Hesk does not have it. The vault's floor has a round iron door nobody in
Vell built, sealed, older than the drill-yard. Hesk has its key; nobody else
knows what it opens. Hesk is not "gone": he withdraws to his district.

**Chapter 9.** Lines that said "Book Four reads this" now mean Part Two reads
it. Unchanged otherwise.

**Chapter 10, What Was Paid (b3-paid, level 29), rewritten opening and after.**
Opening: Hesk takes his drill-guard over the pass by the Iron Road, to sell the
rite to the free wards as he believes he can, and Corvane says he does not have
the copy he thinks he has. Talks: Sergeant Roke; Corvane, who asks to come, and
tells Orin whose name is first in his ledger (Merel, taken at Saltwick); Orin
tells him he was there. Crisis as approved: catch Hesk at the last echo-stone.
Peaceful: turn his soldiers (loyalty cracked if b3_quotas_exposed). Fight:
Commander Hesk, Part One's boss. After the crisis, the cost: Hesk's satchel is
empty. The Lantern Hall's agent took the copy from the vault and it crossed the
pass a week ago; it is already being read aloud in Merrowgate. Hesk is taken
into the council's custody. Decision (unchanged ids): b3_rite_destroyed
(destroy every copy the council can reach; one is already out of reach),
b3_rite_law (a written law: a witness, no quotas, never the unwilling, the
thirty-one let go if b3_vault_held; stronger with b3_rite_council), or
b3_rite_vell (leave it to each town). The decision also decides how Hesk gets
out in Part Two.

**End of Part One (scene b3-partone-end, after b3-paid, empty cast).** Corvane's
fate first (b3_corvane_judged, b3_corvane_vell, b3_corvane_keeper), moved from
the old epilogue. Then a camp at Dera's forge: Dera has your gear on the bench
before you have finished saying hello. Orin does not go to Saltwick yet. Nessa
writes to Ysolde, or about her. If Aster went to Vell, Tovin rings the
Briarwatch bell by hand on the hour, and Pim rings it with him. The 2nd job
skill at level 30 is named in the last camp lines. Last: a letter from
Fennick (or from Corvane's clerks if Vell still stands) saying that someone has
opened the iron door under the vault and gone down. Then "To be continued".

**The Mother Bell.** Anything in Part One that says the Mother Bell's note did
not reach the Commandery reads the Book Two flags (mother_chorus,
mother_silenced, mother_recalled; vote_elske_won/lost) with an old-save
default of mother_chorus, as the world rules above require.

**New flags in Part One** add nothing beyond the table above except
`b3_partone_done` (set by the end-of-part scene), which Part Two reads.

**TODO (from the PR #62 review).** Saltwick's town page (src/data/towns.json)
does not change after `b3_saltwick_moved`: it still describes a town living on
its roofs. It should read as the emptied town, its lamps kept lit by Mags and a
few lamplighters, the way Vell's page is to change after `b3_bell_evacuate`.
This needs a town page that can follow a flag.
Done in Book Four's engine groundwork (docs/book-four/DESIGN.md, "Town pages
that follow a flag"): `pages` in towns.json gives Saltwick its page after
`b3_saltwick_moved`. Its market stays open: Saltwick still sells Book Three's
level 30 gear.
