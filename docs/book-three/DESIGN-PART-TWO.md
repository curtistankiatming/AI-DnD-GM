# Book Three design: The Names in the Bronze, Part Two, The Stair (levels 30 to 40)

Written 21 November 2026 from the approved 20 to 40 plan, then revised the same
day after two independent reviews. Part One is in `docs/book-three/DESIGN.md`,
and its "Revisions" section is canon for everything Part Two reads.

## Build rules

Each chapter has the Book Two shape:
- opening
- talks
- a clue to investigate
- a route
- a crisis with a peaceful way and a fight
- after, with one decision that completes the chapter

Other rules:
- "Needs the clue" means `prepared:<chapter id>`.
- Every chapter has `"book": 3`, `"part": 2`, and pays `xp` equal to
  `P.levelBand(level)` exactly: 9,250; 9,500; 9,750; 10,000; 10,250; 10,500;
  10,750; 11,000; 11,250; 11,500. After chapter N the hero is level 20+N, and
  the epilogue leaves them at 40, ready for the 3rd job trial.
- Chapter 11 unlocks when chapter 10 is done; `b3_partone_done` is set by then.

**Scenes.** A chapter has at most one scene, because the engine sends a
chapter's decisions into one scene.
- The scene's cast is empty. Its nodes are chained by `next`.
- A companion's part is written as lines with `when: { party: … }` and an
  `absent` version.
- The camp beat is the last node.
- Wherever this document says "scene X (straight after)", it means the first
  node of that chapter's one scene.

**Tone.** No lighter-side column. A lighter moment appears only where the people
in the scene would really have one, and never in chapters 17 to 20. Story
first, no narrator wit.

## What Part Two is about

The book's question: may anyone let a person pay for safety with themselves, if
they say yes? Part One proved at Vell that the rite works on the living. Part
Two shows that answer spreading through the free wards and going wrong:
- It is sold (Merrowgate).
- It is voted for, for one person who also says yes (Cinder Fold, Wren).
- It is refused by a town that pays for refusing (Ashford).

At the bottom of the stair the book gives its own answer: the many give a
little each, one person at a time, so that nobody pays alone. That answer is
slow and partial, and it has to be renewed.

## The lore

This is the plan's recommended option 1, adopted under Curtis's two-reviewer
rule while he was away.

Cinder Fold canon: nine founders cast the first bells on an iron lid over a
bottomless shaft, 900 years ago, "holding something down". Every house in
Cinder Fold keeps a little hearth bell, and nobody can remember why. Down
there, Book Two says, "all the bells are joined".

Part Two adds:
- **The first promise.** Before bells, the people of the old places each gave
  one memory, freely and one at a time, to hold the Gloam back. They renewed it
  every generation in the deep, at a place with no bell in it. The hearth bells
  are what is left of the custom: each house once rang one for its giving.
- **What the Gloam is.** It is what the deep does with memory nobody gave: it
  takes it. The frost, the mist and the white on goods are its edges. That is
  why the Gloam's shapes wear half-remembered faces.
- **The shortcut.** The founders could not get a whole country to keep giving.
  Nine people gave whole lives instead, and the founders cast the bells around
  them on the lid. (Write "the bells the founders cast". The nine inside are not
  the founders.) Keepers copied the founders. Sable's rite is the last and worst
  copy.
- **Why now.** The nine are tiring and the lid is moving. The Mother Bell
  bought the free wards one winter:
  - `mother_chorus`, and the default for old saves: it held by asking the
    wards.
  - `mother_silenced`: it was quieted, and that winter was simply mild.
  - `mother_recalled`: the council's recall left the wards uneasy.

  Lines that mention the Mother Bell have these three versions.
- **Hesk's mistake.** He believes the promise needs whole people, because every
  copy he has seen did.

## Who knows the rite

Sable is the last person who knows the altered rite by heart. Every other
caster reads from a copy, and that includes Hesk. Corvane did Vell's castings
and will not cast again, so Hesk, who stood at every one, is the only trained
caster still willing. The copy the Lantern Hall took is in Merrowgate. Corvane
knows it from his copy (if `b3_rite_destroyed`, that copy is gone).

## Hesk in Part Two

Commander Idris Hesk was beaten on the Iron Road and taken into the council's
custody. How he gets out depends on chapter 10:
- `b3_rite_law`: he is released on licence to the Lantern Hall, because the law
  needs a trained caster and Corvane refuses.
- `b3_rite_destroyed`: the Lantern Hall buys his bond.
- `b3_rite_vell`: Merrowgate claims him as a contractor.

In chapter 11 he leaves under legal papers before any fight, and he is never
your prisoner there. His only escape is in chapter 17. In chapter 20 he is the
last enemy. His soldiers were turned in chapter 10, so his men in Part Two are
hired: sellswords and Lantern Hall guards. His line is "the willing are a
luxury". He is never cruel for its own sake.

**The cliffhanger, paid off.** Part One ends with "someone has opened the iron
door under the vault and gone down". Cass Ord had the key taken from Hesk's
effects while he was in custody. She sent three guild surveyors down to find
"where the copies came from". Chapter 17 finds the door already open. Chapter
18 finds the surveyors' chalk on the marked way, and one surveyor alive who has
forgotten his own name.

## Seasons

Part One runs from spring to autumn of the year after Book Two's Vote. Part
Two runs:

| Chapters | Season |
| --- | --- |
| 11 | late summer |
| 12 to 13 | autumn |
| 14 | late autumn |
| 15 | first snow |
| 16 | midwinter, the second winter since the Vote |
| 17 to 20 | the same midwinter, underground |
| Epilogue | early spring |

Mags last saw Orin in late spring (chapter 4), so she has had since spring to
think. Davin is fifteen.

## People

New people:
- **Guildmistress Cass Ord**, head of Merrowgate's lantern guilds (the Lantern
  Hall). If `b2:haverick_named`, Haverick fell at the Vote. Otherwise he
  "retired to the country" and she runs the guilds anyway. She sells castings
  as a public service and believes it: "The poor have always paid for safety.
  Now somebody pays them." Never use the name Tamsin, which is taken.
- **Coll Haddow**, a Merrowgate docker, with his daughter Bett.
- **Captain Odell Varn**, Orin's old captain.
- **Reeve Hollis Brede** of Ashford. Nobody persuades her. When she changes
  her mind, she does it by her own reasoning.

Returning people:
- Wren: sixty, one bad leg. She kept the Highpass tower for twenty years,
  then came over the pass and has kept Cinder Fold's forge-signal since.
- Ottilie Brand, who chairs Cinder Fold's fourteen-seat miners' committee
  (Book Two, `minersvote`).
- Sable, Elske, Mags, Davin, Fennick, Corvane, Iona, Sister Ilse, Brannagh,
  Tovin and Pim, and Dera.
- Ysolde, only with `notFlag b3_bell_cast`.
- Aster: in Briarwatch's bell, or with `b3_bell_aster` in Vell's great bell.
  Below the lid her voice reaches the party on every route, because the bells
  are joined there.

## Chapters

### 11. The Price of a Yes (b3-price, level 30, Merrowgate, late summer)

**Opening.** A painted board outside the Lantern Hall gives a price for a
casting. A town pays the guild, a volunteer is cast, and the guild pays the
volunteer's family for life. Hesk is at the door with his papers, and one line
says how he got out.

**Talks.**
- Cass Ord, who shows you the ledger herself.
- Hesk: "You beat me on a road. The road was never the argument."
- Coll Haddow and Bett on the dock.
- Elske:
  - `elske_seat`: she holds Merrowgate's seat, and hers is the vote against a
    ban.
  - `elske_free`: she works at the harbour hospice and has counted the
    volunteers.
  - `elske_judged`: she writes from the Sallows hospice (Book Two's sentence).
  - Old save: no Elske lines.

**Clue (investigation, alt. insight).** The guild buys debts from the
moneylenders, then offers to clear them in exchange for a yes. Coll's debt was
bought nine days before he volunteered.

**Crisis.** Tonight's casting, with Coll on the platform.
- Peaceful: talk Coll down in front of the crowd (persuasion, alt. insight).
  It is strongest with the clue.
- Fight: guild guards at the pit stairs. Hesk has already gone.

**Decision (the market).**
- Shut it: `b3_market_shut`. Merrowgate bans paid castings, and the guild sells
  inland, where nobody is watching. Orin +1.
- Rule it: `b3_market_ruled`. A witness is required and families get no
  payment. Fewer buyers, but every one is lawful. Maren +1.
- Buy the debts: `b3_debts_bought`. The free wards' relief fund clears the
  harbour's bought debts. Brannagh's Fenmere rebuilding goes unpaid for a year
  (chapter 16). Nessa +1.

**Scene price-camp.** Bett brings the party fish. Nobody is sure how to accept
it.

### 12. Wren's Bell (b3-wren, level 31, Cinder Fold, autumn). Nessa's story

**Opening.** The lid is moving, and the nine ring out of time. The miners'
committee, all fourteen seats, has voted eleven to three to cast Wren, and
Wren has said yes too. She is sixty, her leg is worse, and she kept the
Highpass tower twenty years and the forge-signal since she came over the pass.
She wants her last work to hold the town that took her in. With `job:minersvote-decided`, the committee that finally
stopped tying is the one that voted. The guild has offered to cast her for
nothing, because a free casting at the first forge would sell a hundred more.

**Nessa's place.**
- With `nessa_keeper` (set to "later" in Book Two: "yes, but not yet"): Nessa
  is the promised heir to the forge-signal. A casting makes the long yes due
  tonight, and the committee will not cast without her answer. Wren has the
  letter Nessa sent her in the spring, and reads its last line back to her.
  Nessa answers in the decision (lines on `{"flag": "nessa_keeper", "is":
  "later"}`): with a casting she says yes now and takes the signal key, and
  the committee writes her in as keeper; with a refusal she says not yet, and
  Wren keeps the signal from a chair; with the wait she says yes, in the
  spring. Without Nessa, the committee writes "held for her" beside her yes.
- Without the flag: Wren asks Nessa to stand at the pit with her. Nessa has a
  letter she wrote Wren and never sent.

**Talks.**
- Wren, who has decided.
- Ottilie Brand, the committee chair. If the `mould` job came first she knows
  the founders' words already.
- Nessa, who interrupts everyone.
- A miner's child, about the hearth bell.

**Clue (history, alt. arcana).** The founders' ledger under the forge
describes a tenth mould, never used. Beside it: "Not this way. Ask them all."

**Crisis.** The lid heaves, and the Gloam comes up the cold galleries.
- Peaceful: get the nine ringing in time again with every miner on a rope
  (performance, alt. athletics).
- Fight: the gallery tide. The boss is the Gloam's hand, made of what Cinder
  Fold has forgotten.

**Decision (Wren).**
- Cast her: `b3_wren_cast`. Cinder Fold holds for a generation. Nessa's
  approval does not change; it was Wren's choice and Nessa says so.
- Refuse the committee: `b3_wren_refused`. You and Nessa overrule a fair vote.
  The lower galleries are closed and lost, and twenty families lose their work.
  Wren is angry and alive. The guild sells the story of the hero who overruled
  a town.
- Ask her to wait one season for what is under Vell: `b3_wren_waits`. The
  miners ring the nine by hand all winter. In chapter 16 a letter says one
  miner fell from the ropes, and that Wren can no longer climb to the pit.

**Scene wren-nessa.**
- With Nessa: Nessa and Wren alone, and the letter. A casting is the next
  night.
- Without Nessa: Wren gives you the letter, unread, to pass on.

The camp beat: Biscuit will not leave the forge door.

### 13. The Order (b3-order, level 32, Saltwick, autumn). Orin's story

**Opening.** Where it happens:
- Saltwick on its roofs.
- With `b3_saltwick_moved`, the trial is held where Saltwick's people now are:
  - Saltwick's quarter of Vell.
  - Or, with `b3_bell_evacuate`, their camp on the Highpass road.

Varn has been caught recruiting for Hesk among the roof folk, paying in oil.
The roof council will try him.

**What Varn says.** He gave the order eight years ago and would give it again,
because his company would have died and Saltwick would have fallen anyway. Now
he offers people a better death than the one he left them to.

**Talks.**
- Varn, in the lamp-store.
- Mags.
- Davin, fifteen, who wants to sit on the jury.

**Clue (insight, alt. investigation).** Varn recruits only from the families
the convoy left behind. He is trying to pay a debt with their lives.

**Crisis.** Hesk's hired men try to take Varn off the roofs before the trial.
- Peaceful: Orin will not move from the plank, and you stand with him
  (intimidation, alt. persuasion).
- Fight: the hired men on the planks.

**Decision (the verdict you argue for).** Orin asks to be tried with Varn. Mags
is in the room, and says before the verdict that she will not forgive a man
who was let off. That is the only way to her forgiveness, and the player hears
it first.
- Both are tried: `b3_orin_tried`. The roof council gives both men the same
  sentence, lamp duty for a season, served after the book. The families think
  Varn got off lightly, so Saltwick's reputation drops by 1. Orin +1. Nessa -1:
  "He left a town to die and he gets the same lamps as you?"
- Varn alone: `b3_varn_judged`. Saltwick's own verdict is that the captain
  gave the order and the soldier did not. Varn is exiled to the Iron Road and
  Saltwick is satisfied, so its reputation rises by 1. Orin -1: he has to live
  with being let off.
- Neither: `b3_varn_freed`. Varn goes back to Hesk's company with a message
  from Orin. Chapter 17 pays this off: Varn turns forty of his recruits back.
  Orin -1, Maren -1.

**Scene order-mags.**
- With Orin:
  - With `b3_orin_tried`, Mags forgives him and asks him back for the lamps in
    spring (`b3_mags_forgives`).
  - Otherwise she tells him it was never hers to forgive (`b3_mags_not_hers`).
- Without Orin: Mags tells you to tell him, and neither flag is set.

Both of Mags's answers are written as right for her. The camp beat: Orin
re-ties every knot on the party's packs, and nobody stops him.

### 14. The Town That Said No (b3-ashford, level 33, Ashford, late autumn)

**Opening.** Ashford has voted to refuse everything: no casting, no buying, no
giving. Brede: "We will not be a market and we will not be a sacrifice."
Hesk's recruiters are at the gate. The Gloam is coming up the valley.

**Talks.**
- Brede.
- Iona, who has priced the walls.
- Sister Ilse at the archive, who has Sable's annotated books with any of the
  `job:library-*` flags.
- A recruiter, a decent man doing a job.

**Clue (survival, alt. history).** Ashford's old walls were built the last time
it refused, three hundred years ago. It held by giving up the lower town.

**Crisis.** The valley tide.
- Peaceful: move the lower town's people inside the walls before the white
  arrives, with Iona's carts (athletics, alt. persuasion).
- Fight: the tide's shapes in the lower streets.

**Decision (Ashford's no).**
- Defend it: `b3_ashford_defended`. The lower town's houses and fields are
  lost to the white, and its people (or most of them, after a fight) are
  inside. Ashford keeps its no.
- Take the children to Highpass against the vote: `b3_ashford_children`. The
  children are safe, and Ashford never forgives the council. Maren -1.
- Let the recruiters cast the one Ashford man who wants it:
  `b3_ashford_cast`. The town holds and its no is broken. Nessa -1, Maren -1.

**Scene ashford-camp.** Brede sits with the party and says nothing for an hour.
Then she says what the lower town was called.

### 15. The Witness's Seal (b3-seal, level 34, Highpass, first snow). Maren's story

**Opening.** Every legal casting now needs a witness:
- with `b3_rite_law`, by law
- with `b3_market_ruled`, by Merrowgate's rule
- otherwise, because buyers want one

The council asks Maren to be the witness for all the free wards. Cass Ord
offers the same, at a price. Maren's want, at last: not to be the stamp on
other people's yes.

**Talks.**
- Maren, about the one she could not hear in chapter 6.
- Cass Ord.
- Sable in his cell.
- Aster, through Briarwatch's bell, or by letter with `b3_bell_aster`.

**Clue (insight, alt. religion).** The seals already on the market are forged
in Maren's hand.

**Crisis.** A crowd at the council doors wants it settled tonight, with the
forgers among them.
- Peaceful: Maren hears the forgers lie in front of the crowd (insight, alt.
  persuasion). It is decisive with the clue.
- Fight: the forgers' hired men.

**Decision (the seal).**
- She becomes the seal: `b3_seal_taken`. Castings slow to the few she
  believes. Maren -1, because she did it for you.
- She refuses: `b3_seal_refused`. Castings go on, unwitnessed or forged. Maren
  +1.
- She trains witnesses, every town its own: `b3_seal_many`. It is slow, and
  for a season the forgers do well.

**Scene seal-sable.** Sable asks to be cast, to answer for Aster. Casting him
would take the rite he knows by heart into bronze with him. You decide, after
Aster has spoken. She says "Nobody is owed that. Not even by you." She does not
forbid it.
- Let him: `b3_sable_cast`. Highpass gets a ward.
- Refuse him: `b3_sable_lives`. He lives with it.

The camp beat: a companion notices the hero's 2nd job skill at level 35, in a
way that fits the job.

### 16. The Winter Watch (b3-winter, level 35, Briarwatch, midwinter)

**Opening.** The second winter is shaped by chapter 9:
- `b3_bell_aster`: an empty bell and the night watch on the Briarwood edge.
- `b3_bell_evacuate`: Vell's people are in Briarwatch's fields.
- `b3_bell_cast`: news of how many voices hold Vell: 391, 330 or 186, the fifty from the first casting plus those cast at the great bell.

Letters arrive:
- Fennick: three hundred volunteers are on the Iron Road with Hesk, and the
  guild's surveyors went down the stair a month ago.
- With `b3_wren_waits`, the letter from Cinder Fold.
- With `b3_debts_bought`, Brannagh's unpaid rebuilding.

**Talks.**
- Tovin and Pim.
- Dera.
- Brannagh.
- Elske in the role the Second Oath left her. On an old save, Brannagh chairs
  instead.

The hero's oath frames what they ask:
- `second_oath` council: the council.
- town: Briarwatch first.
- companions: the party.
- none: themselves.

**Clue (history, alt. arcana).** Aster, through the bell, remembers the first
keepers saying "We gave a little, all of us, and it was enough." Tovin knows
why every Cinder Fold house keeps a hearth bell: Briarwatch's oldest houses
had them once.

**Crisis.** The council meets in Briarwatch's hall while the Gloam tests the
watch.
- Peaceful: hold the watch line with the village (survival, alt. persuasion).
- Fight: frost-shapes at the Briarwood edge.

**Decision (what you ask of the free wards).**
- **Ask the council to promise help for whatever is under the stair:
  `b3_wards_promise`.**
  - Gain: in chapter 20, the old way's asking starts at once, so fewer towns
    fall.
  - Cost: the council later makes giving a civic duty, and the epilogue says
    some gave because they were told to.
- **Ask each town yourself: `b3_towns_asked`.**
  - Gain: every giver is asked in person, and Ashford answers only to this.
  - Cost: it is slower, so more towns fall than with a promise.
- **Go down alone: `b3_go_alone`.**
  - Gain: no town is bound to the stair. In chapter 17 you come with nothing to
    sell, so more of Hesk's rear ranks will listen.
  - Cost: the old way starts from nothing, so the most towns fall.

**Scene winter-camp.** Tovin rings the hour and Pim rings it with him.

### 17. Hesk's Company (b3-company, level 36, Vell or its ruins)

**Opening.** The iron door under the vault is already open, from Cass Ord's
surveyors. Hesk brings his three hundred down to it. Who they are depends on
chapter 11:
- `b3_market_shut`: inland buyers' volunteers, unwitnessed.
- `b3_market_ruled`: witnessed volunteers, each of whom really said yes.
- `b3_debts_bought`: hardly anyone from Merrowgate's docks.

More details:
- With `b3_varn_freed`, Varn is in the company.
- The thirty-one bound bells go too, only with `b3_vault_held` and no
  `b3_rite_law`.
- Fennick comes with his census box, to count everyone down and back.

**Talks.**
- Fennick.
- Corvane:
  - `b3_corvane_keeper`: at the door with his ledger.
  - `b3_corvane_vell`: in the ruins with his clerks.
  - `b3_corvane_judged`: a letter from Highpass.
- Ysolde, if she was not cast.
- One of the three hundred.

**Clue (investigation, alt. insight).** Hesk's orders: three hundred at once,
at the bottom, "where the copies came from".

**Crisis.** The vault floor.
- Peaceful: make the rear ranks hear you (persuasion, alt. intimidation). It
  is easier with `b3_go_alone`.
- Fight: Hesk's hired guard at the door.

With `b3_varn_freed`, Varn turns forty back either way. Then Hesk goes down the
stair as you reach the door. This is his one escape.

**Decision (the door).**
- Keep it open for the way back: `b3_door_kept`.
  - Vell's watch holds it, or with `b3_bell_evacuate`, Fennick's clerks and
    Mags's lamplighters.
  - Cost: the Gloam comes up the open stair while you are below, and Vell (or
    its ruins) loses the drill-yard.
- Close it behind you: `b3_door_closed`.
  - Nothing comes up after you.
  - Cost: the only way back is up through Cinder Fold's lid, a longer climb
    for everyone with you.

No scene. The chapter runs straight on (see engine work).

### 18. The Deep (b3-deep, level 37, the stair)

**Opening.** A day of stair, which meets the deep under Cinder Fold's lid. You
see the founders' bells from below, hanging in the dark like lamps. The party
loses small memories on the way:
- Orin forgets a knot he has tied all his life.
- Maren forgets one game's rules.
- Nessa forgets the name of the bridge where she found Biscuit.

Nothing comes back. This is played straight.

**Talks.**
- Fennick, who has stopped counting.
- The ones who turned back.
- Aster's voice, through the joined bells.
- The surveyor who has forgotten his name.

**Clue (survival, alt. arcana).** The way down is marked at every turn with
small things left on purpose, such as a button or a ribbon. They are older
than any bell. The guild's chalk marks are beside them.

**Crisis.** The Gloam comes for the ones who turned back.
- Peaceful: lead them along the marked way (survival, alt. athletics).
- Fight: the deep's shapes, which wear faces the party half-remembers.

**Decision (the ones who turned back).**
- Take them up yourselves: `b3_turned_escorted`. Every one gets home (the
  epilogue's count is whole). Cost: a day lost, so in chapter 19 the circle is
  half-lit and the peaceful check is harder. With `b3_door_closed`, you take
  them up to the foot of Cinder Fold's lid, where the miners lower ropes, and
  come back down. It is two days, not one, and the lines say so.
- Send them up with Fennick: `b3_turned_fennick`. Most get home. With
  `b3_door_closed`, it is the long way to the lid.
- Go on: `b3_turned_left`. You reach the circle in good time. Some are lost,
  and the epilogue names them. Maren -1, Orin -1.

No scene.

### 19. The First Promise (b3-promise, level 38, the deep)

**Opening.** The place with no bell in it: a floor of small things, nine
hundred years of buttons, cups, ribbons and letters, each one a memory given.
The truth is told by what is there; nobody explains it. Hesk is at the far side
lighting his great casting around the three hundred.

**The companions' answers.** Each companion is asked whether they would give
one memory. The answer is theirs, set by their own chapter, never by the
player. These use `oneOf` (see engine work): the first line whose condition
holds plays.
- **Orin.** With `b3_mags_forgives`, he gives the Saltwick night
  (`b3_orin_gives`). Otherwise he keeps it (`b3_orin_keeps`): "I keep it. It's
  how I know."
- **Maren.** With `b3_seal_refused` or `b3_seal_many`, she gives the day her
  gift woke (`b3_maren_gives`). Otherwise she keeps it (`b3_maren_keeps`):
  "I'm the seal. I need to remember why I can hear it."
- **Nessa.** With `b3_wren_cast`, she gives a memory of Wren (`b3_nessa_gives`):
  "She gave all of it. I can give one." Otherwise she keeps it
  (`b3_nessa_keeps`): "She's still up there. I want all of her."

Rules for these answers:
- An absent companion sets neither flag. Later lines treat a missing flag as
  "keeps".
- Every answer is written as right for that person.
- Approval does not decide them. By this point most companions are at the top
  of the scale, so it would decide nothing.

**Clue (arcana, alt. religion).** Hesk's circle is the founders' shortcut
drawn at full size.

**Crisis.** Reach the three hundred before the circle closes.
- Peaceful: tell them what the floor is (persuasion, alt. performance). It is
  harder with `b3_turned_escorted`.
- Fight: the thirty-one, if they came, or Hesk's hired captains.

**Decision (the three hundred).**
- Tell them and let each choose: `b3_three_told`. Most step out. The ones who
  stay have now said a real yes.
- Pull them out by force: `b3_three_taken`. All of them are out, and some
  will never forgive you. Maren -1.
- Leave them and go for Hesk: `b3_three_left`. All of them are still in the
  circle, and the last fight is harder.

No scene.

### 20. The First Bell (b3-firstbell, level 39, the deep)

**Opening.** Hesk, at the circle's heart, finishing it.

**Talks.**
- Hesk. He cannot be talked out of a yes he bought, and he says so.
- Aster.
- Fennick.
- Whoever of the three hundred is still in the circle.

**Clue (arcana, alt. performance).** The circle answers the first note the
founders rang. Ring it from outside, and the circle opens.

**Route.** The floor of given things. Crossing it without treading on any is a
dexterity check, and it is safe.

**Crisis.**
- Peaceful: break the circle by ringing the first note with the people in it
  (performance, alt. religion). Hesk is taken without a fight.
- Fight: Commander Hesk with the circle half-lit, the book's last fight. It is
  harder with `b3_three_left` and easier with `b3_three_told`.

Either way, Hesk is alive and beaten, and asks what you will do instead.

**Decision (how the promise is renewed).**

*The old way* (`b3_promise_old`). The free wards are asked to give one memory
each, one person at a time. The hero gives one too.
- How fast the asking goes:
  - It takes a winter, and named towns fall while it goes on.
  - The fewest fall with `b3_wards_promise`, more with `b3_towns_asked`, and
    the most with `b3_go_alone`.
- How towns answer:
  - A town "refuses" when too few of its people give. It is never a vote, and
    those towns stay exposed.
  - With `b3_ashford_defended` and `b3_towns_asked`, Ashford gives first, by
    Brede's own reasoning: "A gift isn't a sale and it isn't a sacrifice. We
    said no to those."
  - With `b3_seal_many`, every town has its own witness for the giving.
- What it costs to keep:
  - It must be renewed every generation, which makes the council's problem
    permanent.
  - The bound voices may now choose to rest, and if they rest, their wards go
    dark.
  - The dead stay dead.

*Hesk's way* (`b3_promise_hesk`). Finish the casting with whoever is still in
the circle.
- With `b3_three_left`, all three hundred are cast. It works for every town for
  a generation, and their yes was bought.
- With `b3_three_told`, only those who stayed are cast. Their yes was real, the
  ward is partial (fewer towns, a shorter time), and the epilogue says so.
- With `b3_three_taken`, this choice is unavailable (`requires: { flagsNone:
  ["b3_three_taken"] }`). Nobody would be cast unless you pushed them back in, and
  the book does not offer that.

*Seal the stair* (`b3_stair_sealed`). Nobody gives now. The nine carry it alone
again, and the next generation pays more.

**Scene firstbell (straight after, empty cast). Node 1, the gift.** The player
picks the hero's memory. These choices need `b3_promise_old`. With the other
two endings, node 1 is a single "go on" line.
- The first night in Briarwatch: `b3_gave_firstnight`.
- Dera's forge: `b3_gave_forge`.
- The bell's first note in Book One: `b3_gave_bell`.
- A name the hero chooses not to say: `b3_gave_name`.

**Node 2, the bound voices.** Each answers for itself, with `b3_promise_old`.
- Aster:
  - With `b3_bell_aster`, she rests. Vell's heart goes dark, and its people
    must leave over the pass in spring.
  - Otherwise she stays in Briarwatch's bell one more generation, to see Pim
    grow old.
- Vell's cast, with `b3_bell_cast`: they rest by their own vote, and Vell holds
  one more winter.
- Wren, with `b3_wren_cast`: she stays one more generation.
- Sable, with `b3_sable_cast`: he stays. "I have something to answer for."
- The thirty-one, if still bound: they rest.
- The nine: with `wards_seat`, the wards vote and the nine rest, and from then
  on the free wards' giving holds the lid, which is why the asking cannot stop.
  Otherwise they stay, tired.

Under Hesk's way or the sealed stair, each bound voice has one line instead,
and nobody rests.

### Epilogue (node 3 of the firstbell scene, level 40, Dera's forge, early spring)

The epilogue is the last node of chapter 20's one scene, after the bound
voices, because a chapter can have only one scene. Its title and location are
Dera's forge in early spring.

**The way home.** With `b3_door_kept`, up the stair. With `b3_door_closed`, up
through Cinder Fold's lid, under the nine. Then the road to Briarwatch.

**Dera.** Dera has your gear on the bench and asks what you forgot. With
`b3_gave_forge`, she knows you do not remember her forge, shows you round it as
if for the first time, and does not say why.

**Hesk.**
- Old way: judged at Highpass.
- His own way: the hero of the free wards, with his name in Corvane's ledger.
- Sealed stair: exiled down the stair, with Fennick's count of him as the last
  entry.

**The companions.**
- Orin goes to the Saltwick lamps in spring with `b3_mags_forgives`.
  Otherwise he stays at Dera's forge and teaches Pim knots.
- Maren:
  - With `b3_seal_taken`, she is the seal and has a list again: of yeses.
  - With `b3_maren_gives`, she has forgotten the day she would have written
    first.
- Nessa:
  - With `b3_nessa_gives`, she has forgotten one thing about Wren and asks
    you what it was.
  - Otherwise she writes to Wren, or about her, and sends it.

**What stays behind.**
- Ashford's lower town: rebuilt with `b3_ashford_defended` and the old way.
- Cinder Fold's galleries, read from `b3_wren_*`.
- Fennick's count, read from `b3_turned_*`.

**The 3rd job.** The trial is framed the way the Second Oath framed the 2nd:
what the hero gave, or kept, is what they carry into it. Dera names it. The
epilogue sets `b3_done`. The 3rd job trial is then offered as usual, offline
too.

## Companions

| | Part One | Part Two | At the first promise |
| --- | --- | --- | --- |
| Orin | The Last Roof (4) | The Order (13) | gives the Saltwick night with `b3_mags_forgives`, else keeps it |
| Maren | The Witness (6) | The Witness's Seal (15) | gives the day her gift woke unless `b3_seal_taken` |
| Nessa | The Casting Yard (5) | Wren's Bell (12) | gives a memory of Wren with `b3_wren_cast`, else keeps it |

Walkouts:
- A companion never walks out before their own chapter (12, 13, 15).
- No companion walks out after chapter 16. From chapter 17 the party is
  underground and cannot be rejoined.

## New story flags (Part Two)

| Set in | Flags | Read in |
| --- | --- | --- |
| 11 Price | b3_market_shut, b3_market_ruled, b3_debts_bought | 15 (why a witness), 16 (Brannagh), 17 (who the 300 are) |
| 12 Wren | b3_wren_cast, b3_wren_refused, b3_wren_waits | 16 (letter), 19 (Nessa), 20 (rest), epilogue |
| 13 Order | b3_orin_tried, b3_varn_judged, b3_varn_freed; scene: b3_mags_forgives, b3_mags_not_hers | 17 (Varn), 19 (Orin), epilogue |
| 14 Ashford | b3_ashford_defended, b3_ashford_children, b3_ashford_cast | 20 (old way), epilogue |
| 15 Seal | b3_seal_taken, b3_seal_refused, b3_seal_many; scene: b3_sable_cast, b3_sable_lives | 19 (Maren), 20 (old way, rest), epilogue |
| 16 Winter | b3_wards_promise, b3_towns_asked, b3_go_alone | 17 (rear ranks), 20 (how many towns fall, Ashford) |
| 17 Company | b3_door_kept, b3_door_closed | 18 (Fennick's route), epilogue (the way home, Vell's yard) |
| 18 Deep | b3_turned_escorted, b3_turned_fennick, b3_turned_left | 19 (peaceful check), epilogue (the count) |
| 19 Promise | b3_three_told, b3_three_taken, b3_three_left; b3_orin_gives/keeps, b3_maren_gives/keeps, b3_nessa_gives/keeps | 20 (fight, Hesk's way), epilogue |
| 20 First Bell | b3_promise_old, b3_promise_hesk, b3_stair_sealed; scene: b3_gave_* | epilogue, Book Four |
| Epilogue | b3_done | 3rd job trial framing, Book Four |

Book Two and Part One flags read in Part Two:
- `second_oath`, `wards_seat`, `elske_*`, `nessa_keeper`, `b2:haverick_named`,
  and the `mother_*` flags.
- `b3_rite_*`, `b3_vault_*`, `b3_bell_*`, `b3_saltwick_moved`, `b3_corvane_*`
  and `b3_partone_done`.
- The jobs `job:minersvote-decided` and `job:library-*`.

Defaults for missing flags:
- A missing Book Two flag uses the bible's old-save default.
- A missing `b3_mags_*` or gives/keeps flag reads as "not forgiven" or
  "keeps".
- A missing Elske flag means no Elske lines, and Brannagh chairs.

## Side jobs and camp scenes

There are four side jobs, built the PR #50 way. Each pays mostly gold, plus at
most 130 XP. A job never takes the hero past the chapter's level (`jobRoom`),
and the main story never assumes one was done.

| Hub | Side job | Open during | What it is |
| --- | --- | --- | --- |
| Merrowgate | The Debt Book | 11 to 12 | A moneylender's clerk wants to burn the book of debts the guild bought, and needs someone at the door. |
| Cinder Fold | The Tenth Mould | 12 to 14 | Two miners' children found the founders' unused mould and want to sell it to the guild. |
| Saltwick | Lamps for the Roofs | 13 to 15 | Mags's roster has no names for the far roofs. Find three people who will walk the planks at night. |
| Briarwatch | The Watch Roster | 16 | The village argues over who walks the night watch, and Pim has put himself down for every night. |

Camp beats come at the end of the scenes for chapters 11 to 16. The one after
chapter 15 marks the 2nd job skill at level 35. Chapters 17 to 20 have no camp.
No town page or side job appears in the deep.

## Engine work for Part Two

- **`oneOf` line groups.** A list of alternative lines, and the first whose
  `when` holds plays. Used in chapters 13, 19 and 20, and for every "otherwise".
- **Line `setFlag`.** It sets a flag when the line plays. Used for the
  companion answers in chapters 13 and 19.
- **Scene-choice `requires`.** The same as decision `requires`. Used in node 1
  of the firstbell scene.
- **Flag-scaled fights.** Part One's chapter 9 needs the same thing. Here,
  chapter 19 (whether the thirty-one came) and chapter 20 (`b3_three_*`) use
  it.
- **Straight-on chapters.** For chapters 17, 18 and 19, the decision goes
  straight to the next chapter's opening, not to a town. Each chapter's
  `after` is a safe rest. If the hero is defeated in the deep, they wake at
  the last safe ledge (the previous `after`), not in a town. After chapter 20
  and its scene, the hero arrives at Briarwatch.
- **Walkouts.** Chapters 12, 13 and 15 count as each companion's own
  chapter. There are no walkouts after chapter 16. For the AI storyteller and
  the walkout rule, Book Three's last two chapters are 19 and 20 once Part
  Two is out.
- **3rd job trial framing.** After `b3_done`, the trial opens with the
  epilogue's framing line, read from the save. It works offline.
- **Release.** Set `out: 2` in `src/book.js` once chapters 11 to 20 and the
  epilogue are in and the playtest to 40 passes. Curtis switches parts on
  himself.

## Testing

- A playtest to 40, reaching each chapter-20 ending at least once.
- XP: after each chapter the hero is exactly level 20+N, side jobs included.
- Each companion answer is reachable in chapter 19, and none is set when that
  companion is away.
- Both `b3_door_kept` and `b3_door_closed` reach the epilogue.
- A defeat in the deep wakes the hero at the last ledge.
- Hesk's way is unavailable with `b3_three_taken`.
- The 3rd job trial is offered after the epilogue.
