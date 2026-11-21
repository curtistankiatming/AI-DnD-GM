# Book Three design: The Names in the Bronze, Part Two, The Stair (levels 30 to 40)

Written 21 November 2026 from the approved 20 to 40 plan. Part One is in
`docs/book-three/DESIGN.md`, and its "Revisions" section is canon for
everything Part Two reads. Build rules are the same as Part One: each chapter
has the Book Two shape, and one decision completes it. A second choice goes in
a scene with an empty cast that runs straight after. "Needs the clue" means
`prepared:<chapter id>`. Every chapter has `"book": 3`, `"part": 2`, and pays
`xp` equal to `P.levelBand(level)` exactly: 9,250; 9,500; 9,750; 10,000;
10,250; 10,500; 10,750; 11,000; 11,250; 11,500. After chapter N the hero is
level 20+N, and the epilogue leaves them at 40, ready for the 3rd job trial.

Tone. There are no lighter-side lines in Part Two. A lighter moment appears
only where the people in the scene would really have one, and never on the
stair (chapters 17 to 20). Story first. There is no narrator wit.

## What Part Two is about

The book's question: may anyone let a person pay for safety with
themselves, if they say yes? Part One ended with the proof at Vell: the rite
works on the living. Part Two shows that answer spreading through the free
wards and going wrong in three ways:
- It is sold (Merrowgate).
- It is voted for by many people for one person who also says yes (Cinder
  Fold, Wren).
- A whole town refuses everything and pays for that too (Ashford).

At the bottom of the stair the book gives its own answer. The many pay a
little each, so nobody pays alone. That answer has a price as well: it is
slow and partial, and it has to be renewed.

## The lore (decided by the reviewers on 21 November)

Cinder Fold canon: nine founders cast the first bells on an iron lid over a
bottomless shaft, 900 years ago, "holding something down". Part Two adds what
that something is. Every Part Two line keeps to these points:
- **The first promise.** Before there were bells, the people of the old places
  each gave one memory, freely, to hold the Gloam back. It was renewed every
  generation, in the deep, at a place with no bell in it.
- **What the Gloam is.** It is what the deep does with memory that nobody
  gave: it takes it. Frost, mist and the white on the goods are its edges.
- **The shortcut.** The founders could not get a whole country to keep giving.
  So they found nine people who gave whole lives, and cast them in bronze on
  the lid. Keepers copied the founders. Sable's rite is the last and worst
  copy, because it needs neither death nor a real yes.
- **Why now.** The Mother Bell held, but it bought one winter. The nine at
  Cinder Fold are tiring, and the lid is moving.
- **Hesk's mistake.** He believes the promise needs whole people, because
  every copy he has seen did. He is wrong that it was ever made from a whole
  person.

## Hesk in Part Two

Commander Idris Hesk was Part One's boss, beaten on the Iron Road and taken
into the council's custody. How he gets out depends on chapter 10:
- With `b3_rite_law`, he is released on licence to the Lantern Hall. The law
  needs casters who know the rite, and he is the only one left.
- With `b3_rite_destroyed`, the Lantern Hall buys his bond, through Highpass's
  gaolers.
- With `b3_rite_vell`, Merrowgate claims him under "each town decides", as a
  contractor.

He sells the rite to raise the three hundred he takes down the stair. He would
rather buy a yes than wait for one. His line is "the willing are a luxury". He
is never cruel for its own sake. He escapes once, in chapter 17, and only
there. He is the book's last enemy, in chapter 20. Each of the three
custody routes has one line in chapter 11 and is never re-explained.

## People

New people:
- **Guildmistress Cass Ord**, head of Merrowgate's lantern guilds (the Lantern
  Hall). She took over from Haverick: if `b2:haverick_named`, he fell at the
  Vote; otherwise he "retired to the country" and she runs the guilds in
  practice. She sells castings as a public service and believes it: "The poor
  have always paid for safety. Now somebody pays them." The name Tamsin is
  taken (Tamsin Hale), so never use it.
- **Tam Pellow**, a Merrowgate docker. He says yes to clear his family's debt.
- **Captain Odell Varn**, the captain who ordered Orin's company out of
  Saltwick eight years ago.
- **Reeve Hollis Brede**, Ashford's reeve. She speaks for the town that says
  no, and is the only person in the book who is never persuaded.

Returning people: Wren, Sable, Elske, Mags, Davin, Fennick, Corvane, Iona,
Brannagh, Tovin and Pim, Dera, and Ysolde if she was not cast. Aster is
wherever chapter 9 left her: Briarwatch's bell, Vell's great bell, or the
little bell.

## Chapters

### 11. The Price of a Yes (b3-price, level 30, Merrowgate)

**Opening.** The harbour square, and a painted board outside the Lantern Hall
with a price for a casting. A town pays the guild, a volunteer is cast, and
the guild pays the volunteer's family for life. Hesk stands at the door as the
rite's caster, with one line on how he is out (above).

**Talks.**
- Cass Ord, who shows you the ledger herself.
- Hesk, at the casting yard: "You beat me on a road. The road was never the
  argument."
- Tam Pellow, on the dock with his daughter.
- Elske, depending on Book Two:
  - `elske_seat`: she holds Merrowgate's seat, and her vote is the only thing
    stopping a ban.
  - `elske_free`: she works at the harbour hospice and has already counted the
    volunteers.
  - `elske_judged`: she writes from Highpass.
  - Old save: no Elske lines.

**Clue (investigation, alt. insight).** The guild buys debts from the harbour
moneylenders, then offers to clear them for a yes. Tam's debt was bought nine
days before he volunteered.

**Crisis.** The first Merrowgate casting, tonight, with Tam on the platform.
- Peaceful: talk Tam down in front of the crowd (persuasion, alt. insight).
  The strongest version needs the clue, because it lets you show him who
  bought his debt.
- Fight: guild bravos at the pit stairs.

Either way, Hesk walks away with legal papers. He is not your prisoner.

**Decision (the market).**
- Shut it: `b3_market_shut`. Merrowgate bans paid castings, and the guild
  sells inland instead. Orin +1.
- Rule it: `b3_market_ruled`. Castings are allowed only with a witness and
  with no payment to families. Fewer buyers. Maren +1. Chapter 15 reads this.
- Buy out the debts: `b3_debts_bought`. The free wards' relief fund clears the
  harbour's bought debts, and Cass Ord says you cannot buy out a harbour
  twice. Nessa +1.

Every route leaves Hesk with buyers somewhere, which is how the three hundred
are raised.

**Camp scene price-camp.** Tam's daughter brings the party fish. Nobody is
quite sure how to accept it.

### 12. Wren's Bell (b3-wren, level 31, Cinder Fold). Nessa's story

**Opening.** The lid is moving. The nine founders' bells ring out of time,
which nobody alive has heard before. The miners' committee (Fourteen Votes and
a Tie, if that job was done) has voted yes to cast Wren, and Wren has said yes
too. Her lungs are going, and she wants her last work to count. Hesk's guild
has offered to do it for nothing, because a free casting at the first forge
would sell a hundred more. This is "many voices, asked, in time", going wrong.

**Nessa's place.**
- With `nessa_keeper`, Nessa is Cinder Fold's keeper. Nothing is cast there
  without the keeper's hands, so she must consent to it or perform it.
- Otherwise Wren asks Nessa to stand at the pit with her.

**Talks.**
- Wren, who has decided and wants Nessa to be all right with it.
- The committee's chair.
- Nessa, who interrupts everyone.

**Clue (history, alt. arcana).** The founders' ledger under the forge. The
nine were cast on the lid, and a tenth mould was made and never used. Someone
wrote beside it: "Not this way. Ask them all."

**Crisis.** The lid heaves, and the Gloam comes up through the cold galleries.
- Peaceful: get the nine ringing in time again, with every miner on a rope
  (performance, alt. athletics).
- Fight: the gallery tide. The boss is the Gloam's hand, a shape made of what
  Cinder Fold has forgotten.

**Decision (Wren).**
- Wren is cast: `b3_wren_cast`. Cinder Fold holds for a generation. Nessa's
  approval does not change; this is Wren's choice and Nessa says so.
- Refuse the committee: `b3_wren_refused`. You and Nessa overrule the vote,
  and the lower galleries are closed and lost. Wren is angry and alive.
- Ask Wren to wait one season, for what is under Vell: `b3_wren_waits`. The
  miners ring the nine by hand all winter.

**Scene wren-nessa (straight after, cast Nessa).** Nessa and Wren alone. Nessa
reads aloud the letter she wrote Wren in Book Two and never sent. If Nessa is
away, Wren gives you the letter to pass on, unread.

**Camp scene wren-camp.** Biscuit will not leave the forge door.

### 13. The Order (b3-order, level 32, Saltwick). Orin's story

**Opening.** Saltwick, rebuilt on its roofs, or empty if `b3_saltwick_moved`.
In that case the trial is held in Saltwick's quarter of Vell. Captain Odell
Varn has been caught recruiting volunteers for Hesk among the roof folk. He
pays in oil. Saltwick's roof council will try him.

**What Varn says.** He gave the order eight years ago, and he would give it
again, because his company would have died and Saltwick would have fallen
anyway. Now he sells people a better death than the one he left them to.

**Talks.**
- Varn in the lamp-store that serves as his cell.
- Mags, who has had a year to think about Orin, as she said she would in
  chapter 4.
- Davin, now fourteen, who wants to sit on the jury.

**Clue (insight, alt. investigation).** Varn's recruits all come from the
families the convoy left behind. He is choosing them on purpose, as if paying
a debt with their lives.

**Crisis.** Hesk's men try to take Varn off the roofs before the trial.
- Peaceful: Orin refuses to move from the plank, with you beside him
  (intimidation, alt. persuasion).
- Fight: Hesk's drill-guard on the planks.

**Decision (the trial).** Orin asks to be tried with Varn. Saltwick's verdict
is yours to argue for:
- Both are judged together: `b3_orin_tried`. Orin is sentenced to a season of
  lamp duty, and serves it after the book. Varn is exiled. Orin +2.
- Varn alone: `b3_varn_judged`. Orin is told he was a soldier following
  orders, and has to live with being let off. Orin -1.
- Neither: `b3_varn_freed`. Varn goes back to Hesk's company with a message
  from Orin. Orin -1, Maren -1.

**Scene order-mags (straight after, cast Orin).** Mags gives her answer:
- With `b3_orin_tried` or high approval, she forgives him and asks him to come
  back for the lamps in spring (`b3_mags_forgives`).
- Otherwise she says it is not hers to forgive, and it is not
  (`b3_mags_not_hers`).

If Orin is away, Mags tells you to tell him, and neither flag is set.

**Camp scene order-camp.** Orin re-ties every knot on the party's packs. Nobody
stops him.

### 14. The Town That Said No (b3-ashford, level 33, Ashford)

**Opening.** Ashford has voted to refuse everything: no casting, no buying, no
giving anyone to anything. Reeve Hollis Brede: "We will not be a market and we
will not be a sacrifice." Hesk's recruiters are at the gate with oil and
contracts. The Gloam is coming up the valley.

**Talks.**
- Brede.
- Iona, who is Ashford's and has already priced the walls.
- The archivist, Sister Ilse, who has Sable's books (more if the Sable's
  Library job was done).
- A recruiter, who is a decent man doing a job.

**Clue (survival, alt. history).** Ashford's old walls were built when the
town last refused, three hundred years ago. It held then by giving up the
lower town.

**Crisis.** The valley tide.
- Peaceful: move the lower town inside the walls before the white reaches it,
  with Iona's carts (athletics, alt. persuasion).
- Fight: the tide's shapes in the lower streets.

**Decision (Ashford's no).**
- Defend it as it stands: `b3_ashford_defended`. The lower town is lost, and
  Ashford keeps its no. Chapter 20 pays this off.
- Take the children to Highpass against the town's vote:
  `b3_ashford_children`. They are safe, Ashford never forgives the council,
  and Maren -1.
- Let the recruiters cast the one Ashford man who wants it:
  `b3_ashford_cast`. The town holds, and its no is broken. Nessa -1, Maren -1.

**Camp scene ashford-camp.** Iona sends the party an invoice for the carts.
Maren pays it.

### 15. The Witness's Seal (b3-seal, level 34, Highpass). Maren's story

**Opening.** Every legal casting now needs a witness:
- With `b3_rite_law`, the law says so.
- With `b3_market_ruled`, Merrowgate's rule says so.
- Otherwise, the buyers want one, because a seal sells.

The council asks Maren to be the witness for all the free wards. Cass Ord
offers the same thing, at a price. Maren's want, at last: not to be the stamp
on other people's yes.

**Talks.**
- Maren, about the one she could not hear in chapter 6.
- Cass Ord.
- Sable in his cell.
- Aster:
  - If Aster is still in Briarwatch, through the little bell.
  - With `b3_bell_aster`, by letter from Vell.

**Clue (insight, alt. religion).** The seals already on the market are forged
in Maren's hand. Somebody has been selling her name since chapter 6.

**Crisis.** A crowd at the council doors wants the seal settled tonight, with
the forgers among them.
- Peaceful: Maren hears the forgers lie in front of the crowd (insight, alt.
  persuasion). This needs the clue to be decisive.
- Fight: the forgers' hired men.

**Decision (the seal).**
- Maren becomes the seal: `b3_seal_taken`. Castings slow to the few she
  believes. Maren -1, because she did it for you.
- She refuses: `b3_seal_refused`. Castings go on, unwitnessed or forged.
  Maren +1.
- She trains witnesses, every town its own: `b3_seal_many`. It is slower, and
  chapter 20 reads it.

**Scene seal-sable (straight after, no cast).** Sable asks to be cast, to
answer for Aster. He is the last person alive with the altered rite in his
head, which pays off chapter 2. Aster answers him, in her own words:
- Let him: `b3_sable_cast`. Highpass gets a ward, and the rite in his head
  goes into bronze with him.
- Refuse him: `b3_sable_lives`. Aster says "Nobody is owed that. Not even by
  you." He lives with it.

**Camp scene seal-camp.** A companion notices the hero's 2nd job skill at
level 35, in a way that fits the job.

### 16. The Winter Watch (b3-winter, level 35, Briarwatch)

**Opening.** The second winter, shaped by chapter 9:
- `b3_bell_aster`: the bell is empty and the night watch walks the Briarwood
  edge.
- `b3_bell_evacuate`: Vell's people are in Briarwatch's fields.
- `b3_bell_cast`: Briarwatch hears that four hundred voices in bronze hold
  Vell.

A letter from Fennick: three hundred volunteers are on the Iron Road, with
Hesk.

**Talks.**
- Tovin and Pim.
- Dera.
- Brannagh.
- Elske, in whatever role the Second Oath left her.

**Clue (history, alt. arcana).** Aster, or the little bell, remembers the
first promise half-told by the first keepers: "We gave a little, all of us,
and it was enough."

**Crisis.** The council meets in Briarwatch's hall while the Gloam tests the
watch.
- Peaceful: hold the watch line with the village (survival, alt.
  persuasion).
- Fight: frost-shapes at the Briarwood edge.

**Decision (what you ask of the free wards).**
- Ask the council to promise help for whatever is under the stair:
  `b3_wards_promise`.
- Ask each town yourself: `b3_towns_asked`. It is slower, and every answer is
  its own.
- Go down alone: `b3_go_alone`.

Chapter 20's old way reads this: with a promise or the towns asked, fewer
towns fall during the winter of asking.

**Camp scene winter-camp.** Tovin rings the hour, and Pim rings it with him.

### 17. Hesk's Company (b3-company, level 36, Vell or its ruins)

**Opening.** Hesk brings his three hundred to the iron door under the vault.
The thirty-one bound bells go with him only with `b3_vault_held` and no
`b3_rite_law`. Fennick comes with his census box to count everyone down and
everyone back.

**Talks.**
- Fennick.
- Corvane, depending on his fate:
  - `b3_corvane_keeper`: at the door with his ledger.
  - `b3_corvane_vell`: in the ruins with his clerks.
  - `b3_corvane_judged`: by letter from Highpass.
- Ysolde, if she was not cast.
- One of the three hundred, who paid nothing and was paid well.

**Clue (investigation, alt. insight).** Hesk's casting plan, from his officers'
orders: three hundred at once, at the bottom, where the copies came from.

**Crisis.** The vault floor.
- Peaceful: talk the rear ranks into hearing you (persuasion, alt.
  intimidation). Some turn back here.
- Fight: Hesk's drill-guard at the door.

Either way, Hesk goes down the stair as you reach the door. This is his one
escape.

**Decision (the door).**
- Keep it open, with Vell's watch holding it for the way back:
  `b3_door_kept`.
- Close it behind you, so nothing comes up after you: `b3_door_closed`. The
  only way back is the deep's own way, up through Cinder Fold's lid. The
  epilogue reads this.

No camp scene: the chapter runs straight into chapter 18.

### 18. The Deep (b3-deep, level 37, the stair)

**Opening.** The stair goes down for a day and meets the deep under Cinder
Fold's lid. You see the nine founders' bells from below, hanging in the dark
like lamps. The party loses small memories on the way:
- Orin forgets a knot he has tied all his life.
- Maren forgets one card game's rules.
- Nessa forgets the name of the bridge where she found Biscuit, and Biscuit
  does not care.

These are only lines; the memories do not come back.

**Talks.**
- Fennick, who has stopped counting.
- The ones who turned back.
- Aster's voice, if `b3_bell_aster` and the door was kept, carried down the
  stair from Vell.

**Clue (survival, alt. arcana).** The way down is marked, at every turn, with
small things left on purpose, such as a button or a ribbon. They are older
than any bell.

**Crisis.** The Gloam in the deep comes for the ones who turned back.
- Peaceful: lead them by the marked way (survival, alt. athletics).
- Fight: the deep's shapes, which wear faces the party half-remembers.

**Decision (the ones who turned back).**
- Take them up yourselves: `b3_turned_escorted`. It costs a day, and Hesk is
  further ahead.
- Send them up with Fennick and his box: `b3_turned_fennick`.
- Go on and let them find the marked way: `b3_turned_left`. Some are lost.
  Maren -1, Orin -1.

No camp scene.

### 19. The First Promise (b3-promise, level 38, the deep)

**Opening.** The place with no bell in it: a floor of small things, nine
hundred years of buttons, ribbons, cups and letters, each one a memory given.
The truth, told by what is there, with no narrator explaining it. Hesk is
already at the far side, lighting his great casting around the three hundred.

**The companions' answers.** Each companion is asked whether they would give
one memory, and the answer is theirs. It is set by approval and their
chapter's flags, never by the player:
- **Orin** gives the Saltwick night (`b3_orin_gives`) if `b3_mags_forgives`,
  or with `b3_orin_tried` and high approval. Otherwise he keeps it
  (`b3_orin_keeps`): "I keep it. It's how I know."
- **Maren** gives the day her gift woke (`b3_maren_gives`) with
  `b3_seal_refused` or `b3_seal_many`, or with high approval. Otherwise she
  keeps it (`b3_maren_keeps`).
- **Nessa** gives a memory of Wren (`b3_nessa_gives`) with `b3_wren_cast` or
  `b3_wren_waits`, or with high approval. Otherwise she keeps it
  (`b3_nessa_keeps`): "She's still up there. I want all of her."

An absent companion sets neither flag. Both answers are written as right for
that person.

**Clue (arcana, alt. religion).** Hesk's circle is the founders' shortcut
drawn at full size.

**Crisis.** Reach the three hundred before the circle closes.
- Peaceful: tell them what the floor is (persuasion, alt. performance).
- Fight: the bound bells, if they came, or Hesk's officers.

**Decision (the three hundred).**
- Tell them the truth and let each choose: `b3_three_told`. Most step out.
- Pull them out of the circle by force: `b3_three_taken`. All are out, and
  some will never forgive you. Maren -1.
- Leave them and go for Hesk: `b3_three_left`. All are still in the circle,
  and the last fight is harder.

No camp scene.

### 20. The First Bell (b3-firstbell, level 39, the deep)

**Crisis first.** Stop Hesk's great casting. This is the book's last fight:
Commander Hesk with the circle half-lit. It is harder with `b3_three_left`,
and easier with `b3_three_told`. Peaceful: none. Hesk is the one person in the
book who cannot be talked out of a yes he bought, and he says so. After the
fight he is alive, beaten, and asks what you will do instead.

**Decision (how the promise is renewed).**
- **The old way**: `b3_promise_old`. The free wards are asked, town by town,
  to each give one memory, and the hero gives one too. It is slow and
  partial:
  - A winter of asking, while named towns fall. Fewer fall with
    `b3_wards_promise` or `b3_towns_asked`, and more with `b3_go_alone`.
  - Some towns refuse and stay exposed.
  - Ashford, which refused to be a market or a sacrifice, gives first, with
    `b3_ashford_defended`.
  - It must be renewed every generation, which makes the council's problem
    permanent.
  - With `b3_seal_many`, every town already has a witness for the giving.
  - Bound voices (Aster, Vell's cast, the nine) choose whether to rest. If
    they rest, their wards go dark, and Vell's walls go with them.
  - The dead stay dead.
- **Hesk's way**: `b3_promise_hesk`. Finish the casting. It works tonight, for
  every town, for a generation. The three hundred's yes was bought, and the
  epilogue does not pretend otherwise.
- **Seal the stair**: `b3_stair_sealed`. Nobody gives now. The nine at Cinder
  Fold carry it alone again, and the next generation pays more.

**Scene firstbell-gift (straight after, no cast; only with
`b3_promise_old`).** The hero's memory. The player picks one of these:
- The first night in Briarwatch: `b3_gave_firstnight`.
- Dera's forge: `b3_gave_forge`.
- The bell's first note in Book One: `b3_gave_bell`.
- A name the hero chooses not to say: `b3_gave_name`.

Later lines never use that memory again.

**Scene firstbell-rest (straight after, no cast).** The bound voices answer
for themselves.
- Aster:
  - With `b3_bell_aster`, she rests, and Vell's heart goes dark. Its people
    are already over the pass.
  - Otherwise she stays one more generation in Briarwatch's bell, because she
    wants to see Pim grow old.
- Vell's cast, with `b3_bell_cast`, rest by vote. Vell holds one more winter
  and then must be asked like everyone else.

### Epilogue (b3-epilogue scene, level 40, Dera's forge)

**The way home.** With `b3_door_kept`, you come up the stair. With
`b3_door_closed`, you come up through Cinder Fold's lid, under the nine.

Dera has your gear on the bench, and asks what you forgot. Hesk's fate
follows the ending:
- After the old way, he is judged at Highpass.
- After his own way, he is the hero of the free wards, and Corvane's ledger
  has his name in it.
- After the stair is sealed, he goes back down alone.

**The companions.**
- Orin goes to Saltwick for the lamps in spring, if `b3_mags_forgives`.
- Maren keeps no list.
- Nessa sends a letter.

**Framing the 3rd job.** The 3rd job trial is framed the way the Second Oath
framed the 2nd: what the hero gave, or kept, is what they carry into it. Dera
names it.

The epilogue sets `b3_done`. After it, Book Three is finished and the 3rd job
trial is offered as usual (it works offline).

## Companions

| | Part One chapter | Part Two chapter | At the first promise |
| --- | --- | --- | --- |
| Orin | The Last Roof (4) | The Order (13) | gives the Saltwick night, or keeps it |
| Maren | The Witness (6) | The Witness's Seal (15) | gives the day her gift woke, or keeps it |
| Nessa | The Casting Yard (5) | Wren's Bell (12) | gives a memory of Wren, or keeps it |

Walkouts: a companion never walks out before their own chapter (12, 13, 15),
or before the last two (19, 20).

## New story flags (Part Two)

| Set in | Flags | Read in |
| --- | --- | --- |
| 11 Price | b3_market_shut, b3_market_ruled, b3_debts_bought | 15 (why a witness is needed), 17 (who the three hundred are) |
| 12 Wren | b3_wren_cast, b3_wren_refused, b3_wren_waits | 19 (Nessa's answer), epilogue |
| 13 Order | b3_orin_tried, b3_varn_judged, b3_varn_freed; scene: b3_mags_forgives, b3_mags_not_hers | 17 (Varn in the company), 19, epilogue |
| 14 Ashford | b3_ashford_defended, b3_ashford_children, b3_ashford_cast | 20 (old way), epilogue |
| 15 Seal | b3_seal_taken, b3_seal_refused, b3_seal_many; scene: b3_sable_cast, b3_sable_lives | 19, 20 |
| 16 Winter | b3_wards_promise, b3_towns_asked, b3_go_alone | 20 (how many towns fall) |
| 17 Company | b3_door_kept, b3_door_closed | 18 (Aster's voice), epilogue |
| 18 Deep | b3_turned_escorted, b3_turned_fennick, b3_turned_left | 19 (who is in the circle), epilogue |
| 19 Promise | b3_three_told, b3_three_taken, b3_three_left; companions: b3_orin_gives/keeps, b3_maren_gives/keeps, b3_nessa_gives/keeps | 20 (fight, ending), epilogue |
| 20 First Bell | b3_promise_old, b3_promise_hesk, b3_stair_sealed; scene: b3_gave_* | epilogue, Book Four |

Every Part Two line that reads a Part One flag works when that flag is missing
(a companion away, or a second scene skipped). The default is the first
option in each row.

## Side jobs and camp scenes

There are four side jobs, built the PR #50 way. Each is open for a window of
chapters and pays mostly gold. A job never takes the hero past the chapter's
level, and the main story never assumes a job was done. Job XP follows
whatever rule Part One settles (an open item from the chapter 1 to 3 review).

| Hub | Side job | Open during | What it is |
| --- | --- | --- | --- |
| Merrowgate | The Debt Book | 11 to 12 | A moneylender's clerk wants to burn the book of debts the guild bought, and needs someone to stand at the door. |
| Cinder Fold | The Tenth Mould | 12 to 14 | Two miners' children have found the founders' unused mould and want to sell it to the guild. |
| Saltwick | Lamps for the Roofs | 13 to 15 | Mags's roster has no names for the far roofs. Find three people who will walk the planks at night. |
| Briarwatch | The Watch Roster | 16 to 17 | The village argues over who walks the night watch, and Pim has put himself down for every night. |

Camp scenes follow every chapter except 17, 18, 19 and 20. The scene after
chapter 15 marks the 2nd job skill at level 35.

## Engine work for Part Two

- A line condition `approval` (`{ "who": "orin", "atLeast": N }`), and a line
  field `setFlag` that sets a flag when the line plays. Chapter 19's answers
  use them.
- Walkouts: chapters 12, 13 and 15 count as each companion's own chapter, and
  19 and 20 count as the last two.
- Book Three's last two chapters, for the AI storyteller's steering and for
  the walkout rule, are 19 and 20 (not Part One's 9 and 10) once Part Two is
  released.
- The 3rd job trial, after `b3_done`, opens with the epilogue's framing line,
  read from the save. It works offline.
- Release: `out: 2` in `src/book.js` once chapters 11 to 20 and the epilogue
  are in and the playtest to 40 passes.

## Testing

- A playtest to 40, with every chapter-20 ending reached at least once.
- XP: after each chapter the hero is exactly level 20+N, including with side
  jobs taken.
- Each companion answer reachable at chapter 19, and none set when that
  companion is away.
- `b3_door_closed` and `b3_door_kept` both reach the epilogue.
- The 3rd job trial offered after the epilogue.
