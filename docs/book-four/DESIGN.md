# Book Four design: The Long Tally (levels 40 to 70)

Written 22 November 2026 for review. Curtis asked for Book Four "until the
next job advancement": levels 40 to 70, ending at the 4th job trial. It has
the same scope as Book Three (story, items, characters, systems, UI, UX and
gameplay, all designed, built and reviewed). The reviewers settle this design,
including the open questions at the end, before any chapter is written.

Book Three's design is canon for everything Book Four reads:
`docs/book-three/DESIGN.md` (its "Revisions" section overrides the rest of it)
and `docs/book-three/DESIGN-PART-TWO.md`. Where they disagree with the shipped
data in `src/data/book-three-part-two/`, the data wins.

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
- Every chapter has `"book": 4` and `"part"` 1, 2 or 3. It pays `xp` equal to
  `P.levelBand(level)` exactly (listed under "XP" below). After chapter N the
  hero is level 40+N, and the epilogue leaves them at 70, ready for the 4th
  job trial.
- Gold per chapter continues Book Three's curve, 20 x level + 40: 840 at
  level 40, 1,420 at level 69.
- Chapter 1 unlocks when `b3-firstbell` is done and `b3_done` is set.
- A chapter has at most one scene. Its cast is empty, its nodes are chained by
  `next`, and the camp beat is the last node.
- **Companions.** Every line that names, quotes or answers Orin, Maren or Nessa
  has a `when: { party: … }` gate and an `absent` version, in talks, scenes,
  decisions and check results. A flag a companion's answer sets is never set
  when that companion is away; later lines treat the missing flag as the
  default named in the flag table.
- Never gate a line on the negation of its own `setFlag`.
- Check results use the roller tokens (`{You}`, `{they}`, `{a|b}`) from the
  story bible, because the best-suited party member rolls.
- Data lives in `src/data/book-four/` (`quests.json`, `scenes.json`,
  `side-jobs.json`), merged after Book Three by `src/expansion.js`. Edit the
  JSON directly.

**Tone.** Story first. A lighter moment appears only where the people in the
scene would really have one, it comes from who they are, and it still moves
something. No narrator wit, no one-liners after fights, no rules language in
story text. There is no lighter moment in chapter 18 (the Hush) or in chapters
27 to 30. The book's sources of comedy are listed under "People"; each is a
person, not a joke.

## What Book Four is about

One question has run through the books:
- Book One: who decides what keeps people safe? Not one person alone.
- Book Two: if many decide together, how do they agree in time?
- Book Three: may anyone pay for safety with themselves, if they say yes?
  The many give a little each, so that nobody pays alone.

**Book Four asks: what do we owe the people who paid for our safety without
ever being asked?** Book Three's answer was "nobody pays alone". Book Four
finds the people who have been paying alone for nine hundred years, on the
other side of the mountains, and asks whether "nobody" includes strangers.

Its second thread is legend, because the 4th job is the legendary one. The
free wards are making the hero into a song. The people on the far side keep
everything they know in a written tally, because they cannot remember. A
legend is what strangers tell of you. At the end of the book the hero chooses
who keeps their story, and that framing is what they carry into the
legendary trial, the way the Second Oath framed the 2nd job and the gift
framed the 3rd.

## The lore

Book Three established (DESIGN-PART-TWO.md, "The lore"): the first promise,
the Gloam as what the deep does with memory nobody gave, the founders'
shortcut (nine whole lives cast into bells on the lid), and the floor of
given things at the bottom of the stair: "nine hundred years of buttons, cups,
ribbons and letters, each one a memory given". The marked way down is marked
with small things "older than any bell".

Book Four adds four things.

1. **A ward does not end the Gloam. It rings it back, and what is rung back
   goes somewhere.** Every book agrees: wards "ring back" the Gloam (Book One),
   and the Commandery, whose wards were melted into echo-stones, took the
   white when they went dead (Book Three). What nobody in the free wards ever
   asked is where it goes. It goes north, over the Highpass peaks, to the
   one country with no bells at all.
2. **The Wold.** The old places are a country: the Wold, north of the
   Highpass peaks, under a white that never lifts. Its people kept the first
   promise the old way. When the founders took the bell-craft south nine
   hundred years ago and cast the nine, the white the bells rang back began
   to fall on the Wold. The Wold's tally for that year says: "the white doubled
   and did not go back". The Wold's people have given at the floor of given
   things ever since, from the north branch of the marked way. That is who
   kept the floor growing for nine centuries.
3. **What the Wold's people pay.** With the whole of the free wards' winter on
   them, one memory each per generation is not enough. They give every
   fortnight. Nobody in the Wold remembers much more than a season, so they
   write everything down: on their doors, their walls, their arms, and in
   the Long Tally at Orme, nine hundred years of it. They name themselves by
   their town ("Rue of Thrum") because the town is written on the door.
4. **The Parting Bell.** In the Hall of Legends, on the border peaks, hangs
   the first bell the founders cast, small enough to carry. They rang it once,
   when they parted from the Wold, and never again. Every bell in the free
   wards is joined to the nine, and the nine are joined to it. Rung again, it
   moves all of them at once:
   - rung "backward", every bell in the free wards goes quiet for one winter;
   - rung "forward", every bell rings louder for good, and the Wold is buried;
   - whoever rings it, either way, gives the bell everything: every memory
     they have. That is why the founders rang it once.

   This is the Single Voice again, the book's old enemy: one note that
   decides for everyone. The book never lets the forward ring be chosen.

**How Book Three's ending changed the Wold.** Book Four reads it in every
part. Lines that mention the Wold's last winter have three versions:

| Book Three ending | The free wards now | The Wold's last winter |
| --- | --- | --- |
| `b3_promise_old` | The free wards give one memory each; the lid is held by giving (and with `wards_seat` the nine rest). Hesk is in a cell at Highpass. | The lightest winter in the Long Tally. The Wold has no idea why, and its Reckoner wants to know who did it. |
| `b3_promise_hesk` | A ring of new bells under the stair holds the free wards for a generation. Hesk is the hero of the free wards. | The worst winter in the Long Tally: more bells, more white rung north. |
| `b3_stair_sealed` | The nine carry it alone. Hesk was sent down the stair alone with a lamp. | Worse every year. And in the spring a man with a lamp came out of the marked way into the Wold: Hesk is in Orme. |

Every one of them sends someone south.

**World rules kept.** The dead stay dead. What the Gloam takes does not come
back (Book Three, "nothing comes back"). Given things are never taken back
without a cost. No rule here says all wards are people. The bound voices
(Aster, Vell's cast, Wren, Sable, Hesk's ring, the nine) are people and are
asked before anything is rung through them.

## Parts and seasons

Thirty chapters, one level each, in three parts of ten (open question 1):

| Part | Title | Chapters | Levels | Where | Season |
| --- | --- | --- | --- | --- | --- |
| One | The North Road | 1 to 10 | 40 to 49 | The free wards, then the Hall of Legends | Late spring to first snow, a few weeks after Book Three's epilogue |
| Two | The Wold | 11 to 20 | 50 to 59 | North of the peaks | One winter. The Wold has no summer; it counts its year in givings. |
| Three | The Parting Bell | 21 to 30 | 60 to 69 | The free wards, ending at Cinder Fold | Spring to midwinter of the next year; epilogue in early spring |

Ages: Davin is sixteen at the start (fifteen in Book Three's Part Two) and
seventeen by Part Three. Pim is older and taller and is never given a number.
Rue is seventeen. Biscuit is grey at the muzzle.

Each part ends with an end-of-part scene (`b4-partone-end`,
`b4-parttwo-end`) with an empty cast that sets `b4_partone_done` or
`b4_parttwo_done`. Until the next part is out, heroes wait at "to be
continued" (src/book.js parts engine), never handed to the AI storyteller.

## Regions and towns

**Returning** (town ids in `src/data/towns.json`): Briarwatch (3, 23),
Ashford Crossing (2, 25), Highpass Watch (1, 6, 9, 21, 22, 24), Merrowgate
(4, 26), Cinder Fold (7, 27 to 30), Saltwick or wherever its people are (5),
and Vell or its ruins (8). Vell's page is the emptied city with
`b3_bell_evacuate`; with `b3_bell_aster` and `b3_promise_old`, Vell's heart
went dark in the spring and its people are leaving over the pass, which the
chapter 8 lines say.

**The Hall of Legends** (chapters 10, 20; the 4th job trial's written place,
"The Hall of Legends above the Highpass peaks", made real). The founders'
hall on the saddle of the old north road. On its south face, nine statues of
the founders as the free wards' songs tell them. On its north face, the same
nine carved by the Wold, with different faces and the Wold's tally line under
them. The Parting Bell hangs in the middle. Reached from Highpass; not a town.

**New towns** (Part Two; both added to `towns.json`, opened only while a Book
Four chapter that names them is playable, `Book.townOpen`):
- **Lantry**, the first town under the north face. Every door, post and wall is
  written over. Shop and bounty board. Chapter 11 starts here.
- **Orme**, the Wold's chief town, with the Long Hall that holds the Long
  Tally. Shop and bounty board. Chapters 13, 16 and the Hush (18) depart from
  here.

**Wold places reached by chapters** (not towns, no shop): Sheddon (12), Greve
(14), Thrum (15), Dunnet and Wem (17), the Hush (18), the Orme road (19).

Travel between the free wards and the Wold is by the old north road, through
the Hall of Legends, and is allowed between chapters like any other travel.

## People

### New

| Name | Who they are | What makes them human |
| --- | --- | --- |
| **Rue of Thrum** | Seventeen. Walks down the old north road in chapter 1 with a tally book, sent south by the Reckoner to find out who sends the white. | Reads her own book aloud every morning to know who she is. Acts first and writes it down after. Nessa sees herself in her, and so does Rue. |
| **Sloe of Orme, the Reckoner** | About fifty. The one who does the Long Tally's sums. Book Four's antagonist. | She has done the arithmetic, and she is right: nine hundred years of the free wards' winters, doubled. She wants one winter back, for her people, and she will pay for it with everything she remembers. Never cruel; never wrong about the numbers. |
| **Burdock of the Long Hall** | Seventy. Keeper of the Long Tally for forty years. | Remembers none of it and trusts the tally over his own eyes. Insists the party cannot be from the south, because the tally says nobody came; then writes them in, and believes it completely. |
| **Yarrow of Greve** | Keeps the house where the Wold's grieving give their griefs to the white. | Gentle, practical, and certain she is doing good. She is, in a way Maren has to learn to see. |
| **Sedge of Sheddon** | A farmer whose family's farm is out at the edge when Sheddon goes under. | Will not leave without his mother, and will not ask anyone to go back for her. |
| **Heath of Thrum** | Rue's mother. | Gave her grief for a lost daughter to the white. Does not know Rue when she comes home. |
| **Teasel of Lantry** | Lantry's door-reader, who reads the town its doors each morning. | Reads in a schoolmaster's voice, including the doors that say "Owe Sedge one hen". |
| **Campion of Dunnet** | Fifteen; rings Dunnet's pot-bell. | Proud of it, and has never been told where the white goes. |
| **Ailith Strake** | Master of Cinder Fold's rope families, who have pulled the nine's ropes for thirty generations. Part Three's antagonist in the free wards. | Warm, generous, the best ringer alive. The founders are her family. "I didn't do this. My grandchildren didn't." She means to ring the Parting Bell forward, and believes it is the only way her town's children are safe. |
| **Kester Fitch** | A travelling ballad-seller who has written a song about the hero. | Gets everything wrong at first (the hero kills the Gloam with a sword; "Orin the Bold" is eight feet tall). Follows the story to put it right. The song changes as the book does, which is the running thread. |

### Returning

- Briarwatch: Aveline, Dera, Tovin and Pim, Aster Vey (in Briarwatch's bell,
  or with `b3_bell_aster` in Vell's great bell or at rest).
- Highpass: Captain Sorrel, Iona, Sable (in his cell with `b3_sable_lives`, in
  Highpass's bell with `b3_sable_cast`), Hesk (see below).
- The council: Brannagh (chairs on an old save), Elske in the role her flags
  give her (`elske_seat`, `elske_free`, `elske_judged`; no Elske lines if none).
- Ashford: Hollis Brede, Sister Ilse.
- Merrowgate: Cass Ord, Coll and Bett Haddow, Anwen (Maren's last keeper,
  Elske's healer, at the harbour hospice).
- Saltwick: Mags Peller, Davin; Varn by his Book Three flag.
- Cinder Fold: Wren (alive, or in the tenth bell with `b3_wren_cast`),
  Ottilie Brand, Hew (now ten), the Coppin children (with `job:mould-*`).
- Vell: Fennick, Corvane (by `b3_corvane_*`), Pike.

**Hesk in Book Four.** He is never the main antagonist; he is the loudest
voice of "strangers are a luxury", and his place follows Book Three's ending:
- `b3_promise_old`: in a cell under Highpass's gatehouse. Talks in 1, 9 and
  24 (in the cell next to Sable's).
- `b3_promise_hesk`: the free wards' hero, commanding the council's watch at
  Vell. Speaks against sharing in 9 and 22; stands beside Ailith in 28.
- `b3_stair_sealed`: in Orme. He came out of the marked way into the Wold
  last spring and has written in the Long Tally himself. Sloe's adviser in 13
  and 16; he taught Dunnet its pot-bell (17); he comes south with her in Part
  Three.

**Comedy, where it comes from.** Kester's song and Orin's mortification at
it. Burdock trusting the tally over his eyes. Sister Ilse and Rue copying each
other within an hour. Iona's invoice for nine hundred years (22), which is
devastating and is also, she insists, an invoice. Davin correcting Orin's
knot. Biscuit refusing the founders' hatch and being carried. Maren and Anwen,
who cheated at cards together in Book Two, letting the Wold's walkers win.
Each happens once, unless it has changed.

### Companions and their arcs

| | Before Book Four | Book Four arc | Part One | Part Two | Part Three |
| --- | --- | --- | --- | --- | --- |
| Orin | From guilt to trust (Books One and Two); Saltwick and Mags (Three). | From soldier to captain: giving an order that costs, and owning it. Varn's order, from the other side. | 5, The Lamp Roster (Davin) | 12, The Captain's Order | 25, The Ford (the commission) |
| Maren | Lists, then letting go (Two); the witness and the seal (Three). | From hearing the truth to trusting without proof. The Wold's people believe everything they say; her gift hears nothing. | 6, Rue's Book | 14, The House of Letting Go | 26, The Hospice (vouching for Sloe) |
| Nessa | Proving, then choosing (Two); Wren's bell (Three). | From going first to staying: at a post, beside a friend, when she would rather go. She becomes the one somebody went back for, from the other side. | 7, The Signal Key | 15, Rue's Mother | 27, The Signal (Rue's choice) |

What each starts from:
- **Orin:** with `b3_mags_forgives` he spent the spring on Saltwick's lamps;
  otherwise he has been at Dera's forge teaching Pim knots. With
  `b3_orin_gives` he gave the Saltwick night in the deep and knows he did.
- **Maren:** with `b3_seal_taken` she is the free wards' seal and has a list
  of yeses; with `b3_maren_gives` she has forgotten the day her gift woke;
  otherwise she keeps no list.
- **Nessa:** with `nessa_keeper` "later" and `b3_wren_cast` or
  `b3_wren_waits` she holds Cinder Fold's forge-signal key; with
  `b3_wren_refused` Wren keeps it from a chair and Nessa's yes is held for
  her; without `nessa_keeper` Wren (or the committee, if Wren was cast) keeps
  it. With `b3_nessa_gives` she has forgotten one thing about Wren.

**Walkouts** (the Book Two rule, src/away.js): only in Part One and Part
Three. Nobody walks out in the Wold: there is nowhere to go. No companion
walks out before their own chapter (5, 6, 7; 25, 26, 27), after chapters 9 or
10 (they would miss the crossing), or after chapter 26 (the last four
chapters run together at Cinder Fold, `together` from 27). Book Four needs its
own walkout and return lines (`away.json` is written for Book Two's places).

## Chapters

Each chapter below gives: level, where it starts, season; the opening and
talks; the clue; the crisis (peaceful way with its skill and alternates, and
the fight); the decision with its flags; and the scene's camp beat. Approval
changes are listed only where a choice cuts against what a companion cares
about (Orin: people left behind, promises nobody can keep, unaccountable
money; Maren: hidden truths, cruelty, choices taken from people; Nessa: people
made to wait while others suffer).

## Part One: The North Road (levels 40 to 49)

### 1. The Walker on the North Road (b4-walker, level 40, Highpass, late spring)

**Opening.** The old north road above Highpass, snowed shut beyond the Hall
of Legends for as long as anyone remembers, has a figure on it, walking, with
a book under her arm. The hero is at Highpass for the spring session: Hesk's
judgment (`b3_promise_old`), the council's honours for Hesk (`b3_promise_hesk`)
or the seal's first inspection (`b3_stair_sealed`). Sorrel's watch is on the
wall with bows. How Sorrel greets the hero follows `second_oath`.

**Talks.**
- Rue, who reads from her book: "My name is Rue. I am from Thrum. I have walked
  forty-one days. I do not remember the first thirty." She asks for "the
  bell-ringers".
- Sorrel, who wants her out of the gate before dark.
- Sable (cell, or Highpass's bell): Rue's script is the founders' own hand,
  the one on the tenth mould.
- Hesk, only with `b3_promise_old`: "Nobody comes from the north. Ask her what
  she's walking away from."

**Clue (history, alt. investigation).** Rue's book is written in the founders'
hand, and its first page is a copy of a line from the Long Tally: "the year
the bells went south, the white doubled".

**Crisis.** The white that came down the north road behind her rolls into the
lower watch, and the watch wants to put her back out of the gate, believing
she brought it.
- Peaceful: stand at the gate with her and keep it open until the white passes
  the watch-fires (persuasion, alt. intimidation).
- Fight: the North Road's White, frost-shapes with half-remembered faces.

**Decision (where Rue stays).**
- With the council, under Brannagh's roof: `b4_rue_council`. The council
  hears her first (9).
- With the party: `b4_rue_party`. She trusts you first (6, 15).
- With Sorrel's watch: `b4_rue_watch`. Sorrel learns the north road from her
  and trusts the Wold's people at the gate in chapter 21.

**Scene walker-camp.** Rue writes each companion's name in her book with one
line beside it, and reads them out. Orin goes quiet at his.

### 2. Two Accounts (b4-records, level 41, Ashford, late spring)

**Opening.** Sister Ilse's archive keeps the founders' own account, lent by
Cinder Fold generations ago. Rue's book holds the Wold's copy of the same
year. Ailith Strake has come from Cinder Fold to take the founders' account
home: word of Rue has reached the rope families.

**Talks.**
- Ilse.
- Brede: sure of her town with `b3_ashford_defended`, quieter with
  `b3_ashford_cast`, still angry at the council with `b3_ashford_children`.
- Ailith, who is proud of the founders and generous with everyone.
- Rue (with `b4_rue_party`; otherwise her pages, lent by the council or the
  watch).

**Clue (history, alt. arcana).** The two accounts line up year for year. The
founders' page for the casting says: "We ring it back. Where it goes is not
ours to know."

**Crisis.** Ailith's rope-men try to take the account from the archive by
night, to keep that page until Cinder Fold has heard it from its own.
- Peaceful: read the page aloud in Ashford's square before they reach the
  archive (performance, alt. persuasion).
- Fight: the rope-men, who believe they are defending their grandmothers.

**Decision (the founders' page).**
- Publish it to every town: `b4_truth_published`. The free wards know (4, 9);
  Ailith's grief turns to anger (28).
- Give it to the council first: `b4_truth_council`. Slower; the council
  decides how it is told (9).
- Give it to Ailith to read to Cinder Fold herself: `b4_truth_ailith`. She
  does, honestly. Cinder Fold takes it better (7), and the rope families'
  support for her in Part Three is smaller (28).

**Scene records-camp.** Ilse and Rue copy everything, and within an hour they
are copying each other.

### 3. The Song About You (b4-ballad, level 42, Briarwatch, early summer)

**Opening.** Kester Fitch is singing a song about the hero in Briarwatch's
square, and the square is singing it back. It is wrong in every verse. Dera
corrects it from the forge door. Tovin rings the hour, and Pim rings it with
him.

**Aster.** When Aster rings, she can feel where the white goes: north, over
the peaks. With `b3_bell_aster` the bell is Tovin's by hand and he feels
nothing; Rue's book says instead that the winter Briarwatch's bell was empty,
Thrum's lane stayed clear further than it ever had.

**Talks.** Kester, who wants the true story and will sell either. Dera.
Tovin and Pim. Aster or the empty bell. Aveline.

**Clue (performance, alt. insight).** The song's last verse rings the white
"away". Pim asks where away is.

**Crisis.** Pim stops ringing for one night, without telling anyone, "so
somebody up there gets a night". The white comes into the lanes.
- Peaceful: ring the village back together, every house with a pot or a bell
  (performance, alt. religion).
- Fight: the white in the lanes.

**Decision (Briarwatch's answer, at Aveline's table).**
- Ring every night, as always: `b4_bw_rings`.
- One quiet night a month, the first town to share: `b4_bw_quiet`. Nessa +1.
  Orin -1: the Briarwood edge houses take it.
- Pim's bell, Pim's decision: `b4_bw_pim`. He chooses quiet nights in summer
  only.

Read in 9 (Briarwatch as an example), 22 (the rota), 23 and the epilogue.

**Scene ballad-camp.** Orin, asked to sing his own verse, recites the facts
instead, and Kester writes them down.

### 4. The North Company (b4-company, level 43, Merrowgate, summer)

**Opening.** Cass Ord's Lantern Hall has chartered the North Company: wagons
and a ship to claim "an empty country beyond the peaks, where no ward is".
Coll Haddow has signed on for the wages. Bett is old enough to want to go too.

**Talks.**
- Cass Ord: "Nobody's using it." Told people live there: "Then they'll want
  lamps."
- Coll and Bett.
- Elske in her role.
- The Company's factor, a decent man doing a job.

**Clue (investigation, alt. insight).** The Company's maps are copied from
Rue's pages, and its charter claims land "where no ward is", which is the
whole Wold.

**Crisis.** The first wagons leave at dawn from the north quay.
- Peaceful: tell the dockers who lives there (persuasion, alt. performance;
  easier with `b4_truth_published`).
- Fight: the Hall's guards on the quay.

**Decision (the charter).**
- Break it: `b4_company_broken`. Nessa +1. Cass Ord remembers (9, 26).
- Take it for the council as a relief convoy: `b4_company_council`. The
  council's supplies reach Lantry (11), and Iona gets Cass Ord's bill.
- Let it go, and follow: `b4_company_sails`. The Company is in the Wold
  before you; it sells Dunnet its bell-metal (17). Maren -1.

**Scene company-camp.** Bett asks Nessa what the north is like. Nessa has
never been, and tells her anyway.

### 5. The Lamp Roster (b4-davin, level 44, Saltwick, summer). Orin's story

**Opening.** Saltwick on its roofs, or with `b3_saltwick_moved` Saltwick's
quarter of Vell (or, with `b3_bell_evacuate`, its camp on the Highpass road).
Davin, sixteen, is on the lamp roster (with `job:lamps-davin` because you put
him there) and has packed to come north with Orin.

**Talks.**
- Mags, who has an answer ready and does not say it yet.
- Davin, who has learnt the Wold from Kester's song and is wrong about most of
  it.
- Orin.
- Varn: with `b3_orin_tried`, on the lamps beside Orin for the season; "Take
  the boy or don't. Either way you're the one who decided." With
  `b3_varn_judged` or `b3_varn_freed`, a letter.

**Clue (insight, alt. survival).** Davin is not running away. He wants to be
the one who goes back for people, because someone did not go back for
Saltwick.

**Crisis.** A lamp-store fire on the roofs at night with the white in the
street below. Davin goes first along a burning plank.
- Peaceful: get everyone off the store roof (athletics, alt. survival; Orin
  leads).
- Fight: the white climbing the eaves.

**Decision (Davin).**
- He comes north on Orin's word: `b4_davin_comes`. Nessa +1.
- Orin tells him no: `b4_davin_home`. Orin +1.
- Leave it to Mags: lines with `setFlag`. With `b3_mags_forgives` she says yes
  (sets `b4_davin_comes`); otherwise she says no (sets `b4_davin_home`).
  Maren +1.

**Scene davin-camp.** Orin teaches Davin the knot the lamplighters taught
him, and Davin corrects it.

### 6. Rue's Book (b4-book, level 45, Highpass, summer). Maren's story

**Opening.** Rue's book is gone in the night. By morning she will not know
where she is. Maren sits with her (wherever `b4_rue_*` put her).

**Maren's limit.** Rue believes every word she says, because her book told
her. There is nothing for Maren to hear. With `b3_seal_taken` that is a
seal's nightmare; with `b3_maren_gives` she has already lost the day she
first heard a lie, and says so.

**Talks.** Maren. Rue, before and after the morning: she asks who Maren is,
gently, more than once. Iona, who keeps ledgers too and understands. Sorrel.

**Clue (investigation, alt. insight).** A Highpass carter took it. He lost
someone to the white last winter and believes the book is a charm that called
it. With `b4_company_sails` the Company's copyist paid him for an hour with it
first.

**Crisis.** The carter means to burn the book at the watch-fire at dawn, with
a crowd.
- Peaceful: Maren hears what he is not saying (that he is grieving, not
  afraid) and says it to him (insight, alt. persuasion).
- Fight: the watch-fire catches the north gate's timbers and the white comes
  in through the gap.

**Decision (the book).**
- Give it back as it was: `b4_book_returned`.
- Help Rue write a new first page, about today, with Maren beside her:
  `b4_book_rewritten`. Maren +1. Rue's book now begins with Maren (15, 26).
- Let it burn, and Rue begins from this morning: `b4_book_burned`. Maren -1
  ("You let someone else choose what she keeps"). Rue keeps only what she
  remembers since, and her mother's name (15).

**Scene book-camp.** Iona and Rue compare ledgers. Iona sends nobody a bill.

### 7. The Signal Key (b4-key, level 46, Cinder Fold, summer). Nessa's story

**Opening.** The nine (or ten) ringing; the forge-signal. Nessa's place is
set by her Book Two and Three flags (see "Companions"). Ailith meets the party
at the casting hall: Cinder Fold has heard the founders' page (in her voice
with `b4_truth_ailith`, from a council letter with `b4_truth_council`, from a
broadsheet with `b4_truth_published`).

**Talks.** Nessa. Wren, or the tenth bell. Ottilie Brand. Ailith. Hew, ten,
who wants a rope. The Coppin children with `job:mould-bought` or
`job:mould-sold`.

**Clue (survival, alt. investigation).** Under the lid, on the north branch of
the marked way, there are fresh given things: a child's slate in tally script,
dated "the giving before last".

**Crisis.** A Wold family, givers who came the deep way, is trapped under the
lid as it shifts, and the rope families will not open the founders' hatch for
strangers.
- Peaceful: bring them up through the hatch with every miner on a rope
  (athletics, alt. persuasion; Ailith's word opens it with `b4_truth_ailith`).
- Fight: the deep's shapes at the hatch.

**Decision (the key).** Without `nessa_keeper`, Wren offers Nessa the key and
the same three answers apply.
- Leave it with Wren, or Ottilie's committee if Wren was cast, and come north:
  `b4_key_left`.
- Take it north: `b4_key_carried`. The signal goes unkept (27).
- Give it to Hew: `b4_key_hew`. "He's ten. I was ten." The committee is
  furious and Wren is not. Hew keeps it every night (27).

If Nessa is away (she cannot walk out before this chapter, but the scene is
written for it), Wren keeps the key and no flag is set; later lines read that
as `b4_key_left`.

**Scene key-camp.** Biscuit refuses the hatch and is carried, and Nessa tells
him he is a coward in a voice that means the opposite. He stays at Cinder Fold
with Hew when the party goes north.

### 8. The Letters on the Floor (b4-letters, level 47, Vell or its ruins, late summer)

**Opening.** Vell by Book Three's ending (held by its cast, ruins with
Fennick's clerks, or emptying under a dark great bell). The way down: the
open iron door with Pike's lamps (`b3_door_kept`), the iron door unlocked with
Fennick's key (`b3_door_closed`), or the seal broken for one day on Corvane's
and Fennick's authority (`b3_stair_sealed`).

At the floor of given things, among nine hundred years of givings, there are
letters: thousands, in tally script, addressed "to whoever is on the other
side of the bells". The Wold has been writing south since the parting and
giving the letters to the floor, because it had nowhere else to send them.

**Talks.** Fennick, who counts them. Corvane (by `b3_corvane_*`). Rue reading
one aloud. Aster, through the joined bells.

**Clue (history, alt. religion).** The oldest letters ask what the Wold did
wrong. The newest ask only that someone write back.

**Crisis.** Lifting given things off the floor wakes the white: it takes
something for what is taken.
- Peaceful: put back each thing you moved, in its place, as the Wold would
  (religion, alt. sleight of hand).
- Fight: the deep's shapes.

**Decision (the letters).**
- Bring a satchel up to be read across the free wards: `b4_letters_read`. The
  floor takes a small memory from each who carries them (a line each, with
  absent versions). The council reads them in 9.
- Copy what you can by lamp and leave them: `b4_letters_copied`. Fennick's
  clerks copy for a week.
- Leave them and write one letter back, given to the floor:
  `b4_letters_answered`. The first letter south to north in nine hundred
  years. Orme's givers find it (13).

**Scene letters-camp.** A companion notices the hero's 3rd job skill at
level 48, in a way that fits the job.

### 9. The Embassy (b4-embassy, level 48, Highpass, autumn)

**Opening.** The council in session (Brannagh chairing, or Elske with
`elske_seat`). The question: send an embassy north, and with what?

**Talks.**
- Brannagh.
- Elske in her role.
- Iona, who has costed an embassy and a refuge, and both are ruinous.
- Ailith: "My grandchildren didn't do this."
- Hesk: from his cell with `b3_promise_old`; as the council's champion with
  `b3_promise_hesk` ("The willing were a luxury. Strangers are a luxury.");
  absent with `b3_stair_sealed`.
- Rue, if she is with the council (`b4_rue_council`).

**Clue (persuasion, alt. history).** Who would vote for what. The lines read
`b4_truth_*`, `b4_letters_*`, `b4_bw_*` and `b4_company_*`.

**Crisis.** The night before the vote, men waylay two delegates on the
Highpass road (Cass Ord's with `b4_company_broken` or `b4_company_sails`;
rope-men otherwise).
- Peaceful: bring the delegates in by the watch's back way (survival, alt.
  stealth).
- Fight: the men on the road.

**Decision (the embassy's mandate).**
- The council's word: `b4_embassy_council`. The vote always passes in some
  form; the lines say by how much.
- Your own word: `b4_embassy_own`. The council lets you go as yourself.
- The council's offer of refuge, if the Wold wants to come south:
  `b4_embassy_refuge`. Iona's numbers.

Read in 16 (whose promise), 22 and 30.

**Scene embassy-camp.** Brannagh asks whether there are goats in the north.
Nobody knows.

### 10. The Hall of Legends (b4-peaks, level 49, the Highpass peaks, first snow)

**Opening.** The old north road to the founders' hall: the nine statues on
the south face, the Wold's nine on the north face with its tally line beneath,
and the Parting Bell in the middle, small and black with age. Kester has
paid a guide to follow and see it for his song. Davin is here with
`b4_davin_comes`.

**Talks.** Rue. Kester. Davin. The companions about going north.

**Clue (arcana, alt. history).** The inscription on the Parting Bell: "Rung
once, to part. Ring it again and all will answer."

**Crisis.** A white-storm on the saddle as you cross.
- Peaceful: get everyone across roped (survival, alt. athletics).
- Fight: the Peaks' White (boss).

**Decision (how you go into the Wold).**
- Ring the Parting Bell once, to say you are coming: `b4_parting_rung`. Every
  bell in the free wards answers, and the white on the north side rolls down
  onto Lantry (11). Sloe learns the bell can still be rung (16).
- Go down unannounced: `b4_unannounced`.
- Give something at the north door, the Wold's way: `b4_gave_door`. The hero
  gives a small memory. Lantry's top door says a giver came from the south
  (11).

**Scene b4-partone-end (empty cast).** At the north door, each companion says
what they are bringing. Kester goes back down with the first true verse. Sets
`b4_partone_done`. "To be continued."

## Part Two: The Wold (levels 50 to 59)

Every Part Two chapter has `white: true` (see "Systems").

### 11. Written on the Doors (b4-lantry, level 50, Lantry)

**Opening.** Lantry under the north face, every surface written over. Teasel
reads the town its doors. Nobody remembers last year. With `b4_parting_rung`,
Lantry had its worst night three days ago and has written "the bell" on every
door. With `b4_gave_door`, the top door says a giver came from the south. With
`b4_company_council`, the council's carts are at the well; with
`b4_company_sails`, the Company has been and gone.

**Talks.** Teasel. The children who write the day's news. Rue, home. Orin,
who cannot remember yesterday's breakfast, and says so.

**Clue (insight, alt. history).** Lantry gives every fortnight. Its memories
go to the white, and the white goes on.

**Crisis.** Lantry's giving night, with the party in the street; anyone not
giving is taken from.
- Peaceful: give with them at the well (religion, alt. insight).
- Fight: the white in the street.

**Decision.**
- The party gives with Lantry: `b4_gave_lantry`. Each companion gives a small
  thing (a line each, with absent versions). Maren +1.
- Ring a bell to save Lantry tonight: `b4_rang_lantry`. The white goes on to
  Sheddon (12) and Dunnet learns what a bell does (17).
- Shelter, and let Lantry give alone: `b4_waited_lantry`. Lantry loses one
  person's whole name, and writes it on a door. Nessa -1.

**Scene lantry-camp.** Nessa writes a letter to Biscuit. She reads it to
nobody.

### 12. The Captain's Order (b4-sheddon, level 51, Sheddon). Orin's story

**Opening.** Sheddon is going under (faster with `b4_rang_lantry`). Two hundred
people must walk to Orme through the white, and Sheddon's elders ask Orin to
lead them because he looks as if he has done it before.

**Talks.** Orin. Sedge, whose mother is at the farm out at the edge. Davin,
with `b4_davin_comes`. Rue.

**Clue (survival, alt. insight).** The white will close the Orme road by dark.
The farm is an hour out and an hour back.

**Crisis.** The column on the road with the white closing.
- Peaceful: keep it moving with every child roped (athletics, alt. survival).
- Fight: the white's shapes on the road.

**Decision (the order).**
- Orin orders the column on: `b4_orin_ordered`. Sedge's mother is not saved
  (she is in the Hush, walking, in 18). Orin +1: it was his to give. Nessa -1.
- Orin goes back, and you take the column: `b4_orin_went_back`. She is saved.
  Orin comes out of the white without the name of the company he served in.
  With `b4_davin_comes`, Orin orders Davin to hold the column's rear, and
  Davin does.
- You go back yourself, and Orin takes the column: `b4_hero_went_back`. She is
  saved, and the hero loses a day of their own. Orin -1: "You took it off me."

**Scene sheddon-camp.** Orin, for the first time, talks about Varn's order as
something he understands. Not something he forgives.

### 13. The Long Tally (b4-orme, level 52, Orme)

**Opening.** The Long Hall: nine hundred years of tally on its walls and in
its books. Burdock keeps it. Sloe does its sums. With `b3_stair_sealed`, Hesk
is here with his lamp. With `b4_letters_answered`, the hero's letter is pinned
in the tally, the first from the south, and Sloe has read it.

**Talks.**
- Burdock, who will not believe you are from the south, then does, entirely.
- Sloe: "Every winter since the bells, doubled. You can do the arithmetic
  yourself."
- Hesk, only with `b3_stair_sealed`: "I told them the truth. They wrote it
  down. That's more than you did."
- Rue.

**Clue (history, alt. investigation).** Two lines. The year the bells went
south. And three hundred years ago: "the bell-country asked us once to come
south; we wrote it down, and forgot".

**Crisis.** Sloe's tally-guard come to hold the party as surety for the
bell-country's answer.
- Peaceful: ask Burdock to read what the tally says about guests (history,
  alt. persuasion).
- Fight: the tally-guard, with slates and spears.

**Decision (what is written about the south).**
- The whole truth, bells and all: `b4_tally_truth`.
- The truth, with the free wards' reasons: `b4_tally_reasons`. Burdock writes
  both.
- Nothing until the free wards answer: `b4_tally_wait`. Sloe distrusts you
  (16 is harder).

**Scene orme-camp.** Burdock writes each companion into the tally and asks how
to spell Biscuit.

### 14. The House of Letting Go (b4-greve, level 53, Greve). Maren's story

**Opening.** Yarrow's house, where the Wold's grieving come to give their grief
to the white so that they can work. The Wold forgets its dead every season.
Maren spent her life on lists of names.

**Talks.** Yarrow. A mother who has come to give her son's death. Maren. Rue.

**Clue (medicine, alt. religion).** Those who keep their griefs live shorter.
Those who give them forget the dead entirely. The Long Tally keeps no names
of the dead, only numbers: nine hundred years of "lost: four".

**Crisis.** A white surge on Greve's giving night, with the house full.
- Peaceful: Maren reads the names aloud, Anwen's way, every name said
  (religion, alt. performance).
- Fight: the white in the yard.

**Decision (the names).**
- Teach Greve to keep them: `b4_names_kept`. Maren +1. Grief comes back, and
  so does anger: Sloe's support grows (16, 19).
- Write the names in the tally, and let the griefs go: `b4_names_written`.
  Burdock opens the first page of names in nine hundred years. Maren's arc
  line: "I don't need to hear them to believe them."
- Leave Greve's custom as it is: `b4_names_given`. Maren -1.

**Scene greve-camp.** Maren and Yarrow, two healers, disagree all evening and
like each other.

### 15. Rue's Mother (b4-thrum, level 54, Thrum). Nessa's story

**Opening.** Rue comes home after a year. Her mother, Heath, gave her grief
for a lost daughter to the white, and does not know her. Rue's page on the
door was scrubbed off. What Rue has to show her depends on her book
(`b4_book_*`).

**Talks.** Rue. Heath. Rue's little brother, who writes the door. Nessa, who
was the kid somebody went back for. Davin, with `b4_davin_comes`.

**Clue (insight, alt. survival).** Under the new chalk on the door, the old
chalk still shows: Heath kept one line.

**Crisis.** The white comes up Thrum's lane and Rue will not leave her
mother's door.
- Peaceful: hold the lane with Thrum's giving (survival, alt. persuasion;
  Nessa leads).
- Fight: the white in the lane.

**Decision (what you tell Rue).**
- Give her memory of her mother, so it stops hurting: `b4_rue_gave`.
- Keep it, and start again with her mother as a stranger: `b4_rue_kept`. Rue
  writes a new page on the door with Nessa's help: the first of Nessa's
  letters that anyone reads.
- Let Nessa answer, from her own past (lines with `setFlag`): with
  `b3_nessa_gives`, "Keep it. I gave one of mine and I'd want it back" (sets
  `b4_rue_kept`); otherwise "It's yours. I kept all of mine, and some nights
  I'd give anything" (sets `b4_rue_gave`). Without Nessa, this choice is not
  offered (`requires: { party: "nessa" }`, engine change 15).

**Scene thrum-nessa.** Nessa and Rue on the door step.

### 16. The Reckoner's Sum (b4-reckoning, level 55, Orme)

**Opening.** Sloe has called the tally towns to Orme. She has read the Parting
Bell's line (from the north face, from Rue, and with `b4_parting_rung` she
heard it answer). Her sum: share the winter with us, or at midwinter I ring
the Parting Bell backward and every bell in the bell-country goes quiet for
one winter. Whoever rings it forgets everything. She will.

**Talks.** Sloe. Burdock. Dunnet's and Wem's delegates, quarrelling. Hesk
with `b3_stair_sealed`, who explains how a casting works and what the
founders' note does. Rue.

**Clue (arcana, alt. history).** The note is real and Sloe has it right.

**Crisis.** The tally vote, by door-boards: each town brings its door.
- Peaceful: persuade the towns to wait for the free wards' answer
  (persuasion, alt. history; easier with `b4_tally_truth` or
  `b4_tally_reasons`, harder with `b4_tally_wait` or `b4_names_kept`).
- Fight: the tally-guard in the Long Hall.

**Decision (Sloe's demand).**
- Carry it south as hers: `b4_demand_carried`.
- Promise the Wold a share: `b4_share_promised`. With `b4_embassy_council` it
  is the council's promise; otherwise it is yours, and Orin -1 (a promise
  nobody can keep yet).
- Ask her to come south and make it herself: `b4_sloe_comes`.

**Scene reckoning-camp.** A companion notices the hero's 3rd job skill at
level 56.

### 17. The Bells of Dunnet (b4-potbells, level 56, Dunnet and Wem)

**Opening.** Dunnet has cast a bell from pots and nails and rings it every
night; the white it rings back falls on Wem, a mile down the valley. Who
taught them: the Company (`b4_company_sails`), Hesk (`b3_stair_sealed`),
Lantry's night (`b4_rang_lantry`), or Sloe's reading of the tally. The two
villages are at the boundary stones with axes.

**Talks.** Campion, who rings it. Wem's elder. Rue. The Company's factor with
`b4_company_sails`.

**Clue (investigation, alt. arcana).** It is the founders' shortcut, badly
copied: the same sin, a mile wide.

**Crisis.** The white comes down on Wem while the stones are argued over.
- Peaceful: get both villages to give together, on the stones (persuasion,
  alt. religion).
- Fight: the white, or the Company's guards with `b4_company_sails`.

**Decision (the pot-bell).**
- Break it: `b4_potbell_broken`. Dunnet loses its upper fields.
- Let Dunnet keep it: `b4_potbell_kept`. Wem moves to Orme; the Wold now has
  bells of its own, and in chapter 23 their white comes south.
- Put it on a rota, the two villages ringing alternate nights:
  `b4_potbell_rota`. The first shared bell. Burdock writes it down (30).

**Scene potbells-camp.** Campion asks the hero to teach her to ring properly.

### 18. The Hush (b4-hush, level 57, the far north). The darkest chapter

**Opening.** Where everything rung back for nine hundred years has gathered.
The white is so thick it is quiet. People live here who have given
everything: they walk and work and are kind, and have no names. The shapes
wear faces the party knows: Fenmere's baker, the council at Hollin's Reach,
and with `b3_turned_left` the sixteen from the deep. With `b4_orin_ordered`,
Sedge's mother is here, walking. Aster's voice does not reach. Played
straight.

**Talks.** A walker who gives you water and does not know what a name is. Rue.
The faces.

**Clue (survival, alt. arcana).** The Hush is full, and moving south.

**Crisis.** The white rises round the walkers.
- Peaceful: lead the walkers who will follow along a marked way you make
  yourselves (survival, alt. athletics).
- Fight: the Hush's shapes.

**Decision (the walkers).**
- Lead them south to Orme: `b4_walkers_led`. Slow (19 is harder); they come
  south with the Wold (25, 26).
- Mark a way for them and go on: `b4_walkers_marked`. Some follow.
- Ring a bell here so they wake for one night: `b4_hush_rang`. They say their
  names to you, and the white goes onto the Orme road (19).

**Scene hush-camp.** No banter. Each companion says one name they will keep.

### 19. The Road to the Peaks (b4-column, level 58, the Orme road)

**Opening.** Sloe left Orme two nights ago for the peaks with her
note-ringers (to wait for you at the Hall with `b4_sloe_comes`; to wait for
the answer with `b4_demand_carried`; to see whether your promise is kept with
`b4_share_promised`). Behind her the Wold is following, thousands of people,
because the Hush is moving.

**Talks.** Burdock with the Long Tally on sledges. Rue. Dunnet and Wem (by
`b4_potbell_*`). Davin.

**Clue (survival, alt. history).** The Wold's old road up to the Hall: the
marked way above ground.

**Crisis.** The column on the switchbacks in the white.
- Peaceful: the column climbs roped, mark to mark (athletics, alt. survival).
- Fight: the white at the column's tail (harder with `b4_walkers_led` and
  `b4_hush_rang`).

**Decision (the Long Tally).**
- Bring it all on sledges: `b4_tally_carried`. Burdock comes (22).
- Leave it in Orme with Burdock: `b4_tally_left`. He stays with it.
- Bring the last book only, the record of the winters: `b4_tally_last`.
  Burdock comes.

**Scene column-camp.** Burdock asks whether the free wards keep a tally, and is
told about Fennick.

### 20. The North Door (b4-northdoor, level 59, the Hall of Legends)

**Opening.** The Hall from the north. Sloe's ringers camped at the north door.
The Wold's column on the last slope.

**Talks.** Sloe. Rue. The companions, about going home.

**Clue (arcana, alt. investigation).** The north door has been opened from
the south this autumn.

**Crisis.** The white-storm of the year on the north face, with the column
below.
- Peaceful: bring the column into the Hall (survival, alt. persuasion).
- Fight: the North Face's White (boss).

**Decision (the crossing).**
- The Wold's people cross into the free wards now, without the council's
  leave: `b4_crossed`.
- They camp in the Hall until the council answers: `b4_hall_camp`. The Hall
  becomes a town of the Wold on the border.
- Only the envoys cross; the column goes back down to Orme:
  `b4_envoys_only`. Nessa -1.

**Scene b4-parttwo-end (empty cast).** Inside the Hall, the hook where the
Parting Bell hung is empty. A rope is still on it, tied in a knot Orin knows
and cannot name: the knot he forgot in the deep in Book Three. Without Orin,
the hero sees a rope-families' knot from Cinder Fold. Sets `b4_parttwo_done`.
"To be continued."

## Part Three: The Parting Bell (levels 60 to 69)

### 21. The Knot on the Hook (b4-knot, level 60, Highpass, spring)

**Opening.** Down the north road to Highpass, with the Wold behind you
(`b4_crossed`), in the Hall (`b4_hall_camp`) or only the envoys
(`b4_envoys_only`). The council reports the winter the party missed, by Book
Three's ending.

**Talks.** Sorrel (with `b4_rue_watch` she has kept the gate open for the
Wold). Sloe. Brannagh. Rue. Orin and the knot.

**Clue (investigation, alt. history).** Ailith Strake signed the Highpass gate
book herself in the autumn, going up the north road with twelve rope-men.

**Crisis.** The white that followed the column down the north road reaches
the lower watch while the gate argues over the Wold.
- Peaceful: keep the gate (persuasion, alt. intimidation).
- Fight: the white at the gate.

**Decision (the knot).**
- Accuse Cinder Fold in the open: `b4_accused_open`. The rope families split
  (28 is easier).
- Say nothing until you have the bell: `b4_accused_quiet`. The council does
  not know (22).
- Tell Sloe only: `b4_told_sloe`. She trusts you to bring it back, and does not
  move first (29, 30).

**Scene knot-camp.** Orin ties the knot from memory, slowly, wrong, then right.
He still cannot name it.

### 22. Nine Hundred Years, Itemised (b4-invoice, level 61, Highpass)

**Opening.** The council hears the Wold. Burdock reads from the tally (with
`b4_tally_carried` or `b4_tally_last`; otherwise Rue reads from her book).
Sloe speaks. Then Iona stands up with an invoice: nine hundred years of
winters, costed, line by line. It is the most terrible thing said in that room
since the Hollin's Reach memory, and she insists it is also an invoice.

**Talks.** Iona. Brannagh. Elske. Hesk by his ending. Cinder Fold's empty
chair.

**Clue (persuasion, alt. insight).** Where each town stands, read from
`b4_bw_*`, `b4_truth_*`, `b4_letters_*`, `b4_embassy_*` and `b4_accused_*`.

**Crisis.** Men who do not want the tally read try to carry off the sledges
(or the envoys).
- Peaceful: Burdock reads on while you hold the door (performance, alt.
  persuasion).
- Fight: the men at the sledges.

**Decision (what you ask the council for before midwinter).**
- A vote to share, now: `b4_vote_share`. The lines say which towns voted for.
- A rota, each town choosing its own quiet nights: `b4_rota_towns`. Slower;
  Briarwatch first with `b4_bw_quiet`.
- Refuge: take the Wold in: `b4_vote_refuge`. Stronger with
  `b4_embassy_refuge`.

**Scene invoice-camp.** Iona and Burdock reconcile their figures, and agree.

### 23. The Quiet Night (b4-quietnight, level 62, Briarwatch, summer)

**Opening.** Briarwatch, with the Wold's families in the fields (with
`b4_crossed`). Kester has a new verse, about the Wold. With `b4_potbell_kept`,
the first white ever pushed south comes over the peaks from the Wold's own
bells.

**Aster.** Hesk's ring, Vell's cast, Wren and Sable are bound voices too, and
the Parting Bell would move them all. Aster asks to be asked. With
`b3_bell_aster`, Briarwatch's bell is empty and the chapter's voice is Tovin,
the keeper who was asked, in Book Three, what it is like to be a bell.

**Talks.** Aster or Tovin. Pim. Dera. Kester. Aveline.

**Clue (religion, alt. performance).** Through the joined bells, Aster can ask
every bound voice what it wants rung through it.

**Crisis.** The white on the Briarwood edge, in summer.
- Peaceful: hold the watch line (survival, alt. persuasion).
- Fight: frost-shapes on the Briarwood edge.

**Decision (Briarwatch's bell, asked for itself).**
- It rings every night: `b4_voice_rings`.
- It keeps quiet nights: `b4_voice_quiet`.
- Aster rests, and Briarwatch keeps a night watch: `b4_voice_rests`
  (`requires: { flagsNone: ["b3_bell_aster"] }`).

With `b3_bell_aster`, Tovin's answer sets the first two the same way.

**Scene quietnight-camp.** Pim and Tovin ring the hour together, and then do
not, and listen.

### 24. Sable's Last Lesson (b4-gatehouse, level 63, Highpass gatehouse)

**Opening.** Ailith came to Sable in the autumn to learn how to ring the
Parting Bell forward (to Highpass's bell, where his voice is, with
`b3_sable_cast`). He knows how. He has not said whether he told her. Book
One's villain took power in secret to keep a village safe "properly"; Ailith
is doing the same, and he knows it.

**Talks.** Sable: his case for telling her, which nearly convinces you, the
way his cases always do. Aster, through a bell or by letter. Sloe, who wants
the backward note's true form from him. Hesk in the next cell with
`b3_promise_old`. With `b4_rue_council` or `b4_rue_watch`, Rue, who learnt
the founders' script from him.

**Clue (arcana, alt. insight).** Either note needs the Parting Bell and the
nine together at Cinder Fold, at midwinter.

**Crisis.** Ailith's rope-men come to carry Sable (or the gatehouse bell) to
Cinder Fold. He has agreed.
- Peaceful: talk him out of the cart (persuasion, alt. insight).
- Fight: the rope-men.

**Decision (Sable).**
- He goes with Ailith: `b4_sable_ailith`. The forward ring is ready (28).
- He teaches you both notes: `b4_sable_taught`. A peaceful way at the end is
  easier (30).
- He keeps it to himself and stays: `b4_sable_silent`. Ailith has to guess,
  and her test note goes wrong (29).

**Scene gatehouse-camp.** A companion notices the hero's 3rd job skill at
level 64.

### 25. The Ford (b4-ford, level 64, Ashford, late summer). Orin's story

**Opening.** The Wold's families (with `b4_crossed` or `b4_hall_camp`) or the
walkers (with `b4_walkers_led`) must cross Ashford's ford to the free wards'
fields. Ashford said no to everything in Book Three. Sorrel offers Orin a
captain's commission: the council's watch, to see them across.

**Talks.** Orin. Brede. Davin, now seventeen, who wants to be in Orin's
company. Varn by his flag (with `b3_orin_tried` or `b3_varn_freed` he comes to
serve under Orin, as a soldier).

**Clue (history, alt. survival).** Ashford's old wall, built the last time it
refused, three hundred years ago, by giving up the lower town.

**Crisis.** The river rises white as the column reaches the ford.
- Peaceful: Orin's command gets everyone across (athletics, alt. persuasion).
- Fight: the white in the ford.

**Decision (the commission).**
- Orin takes it: `b4_orin_captain`. His company holds the casting hall's doors
  (28).
- Orin refuses and stays the man who carries things: `b4_orin_soldier`. "I'm
  good at this. Let somebody else be good at that." Sorrel's watch holds the
  doors, less well (28).
- Orin takes it and makes Davin his sergeant: `b4_orin_davin`
  (`requires: { flagsAll: ["b4_davin_comes"], party: "orin" }`). Orin has to
  give him the order to hold the rear door (28), and does.

Absent Orin: Sorrel offers the commission to the hero, and none of the three
flags is set; later lines read the missing flag as `b4_orin_soldier`.

**Scene ford-camp.** Orin re-ties nothing. He checks everyone else's knots and
leaves them as they are.

### 26. The Hospice (b4-hospice, level 65, Merrowgate, autumn). Maren's story

**Opening.** The harbour hospice, where Anwen (Maren's last keeper, Elske's
healer) has taken in the walkers with `b4_walkers_led` or
`b4_walkers_marked`. Sloe has come to Merrowgate to speak to the harbour
council. Cass Ord has made Ailith an offer for the Parting Bell's note: sell
it, town by town.

**Maren's question.** Vouch for Sloe to the council, when there is nothing to
hear? Sloe believes every word she says.

**Talks.** Maren. Anwen. Sloe. Cass Ord. Coll and Bett. Elske.

**Clue (insight, alt. medicine).** The walkers have begun saying words back,
from Maren reading names to them (stronger with `b4_names_kept` or
`b4_names_written`).

**Crisis.** The Lantern Hall's men try to take Sloe to sell her note.
- Peaceful: Maren speaks for Sloe in front of the harbour (insight, alt.
  persuasion).
- Fight: the Hall's guards.

**Decision (Maren).**
- She vouches for Sloe: `b4_maren_vouched`. Sloe is given the casting hall's
  north door at midwinter, and keeps faith (29, 30).
- She refuses: `b4_maren_doubts`. Sloe is watched, slips away, and comes up
  through the lid instead (29).
- She says nothing, and lets Sloe speak for herself: `b4_maren_silent`.

Absent Maren: Anwen speaks for Sloe and sets none of the three; later lines
read that as `b4_maren_silent`.

**Scene hospice-camp.** Maren and Anwen play cards with the walkers and let
them win.

### 27. The Signal (b4-signal, level 66, Cinder Fold, the edge of midwinter). Nessa's story

**Opening.** The forge-signal: with `b4_key_left`, Wren or the committee kept
it and saw the rope families' preparations; with `b4_key_carried`, it went
unkept and the rope families hold the casting hall already; with `b4_key_hew`,
Hew has kept it every night and has news. Rue has gone over to Sloe's
ringers. She means to ring the note herself in Sloe's place: "I've only got a
year to lose."

**Talks.** Nessa. Rue (what she remembers of her mother follows `b4_rue_*`).
Wren, Hew or Ottilie. Ailith at the hall doors.

**Clue (survival, alt. investigation).** The rope families have opened the
founders' hatch. They mean to ring from under the nine.

**Crisis.** The signal tower.
- Peaceful: Nessa gets the signal lit to warn the miners (athletics, alt.
  stealth; with `b4_key_hew`, Hew lights it and Nessa holds the stair).
- Fight: rope-men on the signal tower.

**Decision (Nessa and Rue).**
- Nessa stays with Rue among the ringers: `b4_nessa_with_rue`. She will be at
  Rue's side whatever is rung.
- Nessa tells Rue no, and stops her: `b4_nessa_stops_rue`. Rue does not ring.
- Nessa lets her go, and keeps the signal: `b4_nessa_signal`. Rue goes to the
  ringers alone.

Absent Nessa: Rue goes to the ringers and none is set; later lines read that
as `b4_nessa_signal`. No lighter moment from here to the end.

### 28. The Rope Families (b4-ropes, level 67, Cinder Fold casting hall, midwinter)

**Opening.** Ailith holds the casting hall with the Parting Bell. The nine (or
ten) overhead; the lid below. Her case, in full. Hesk beside her with
`b3_promise_hesk`.

**Talks.** Ailith. Ottilie. Ailith's son on the ropes. Sloe at the north door
with `b4_maren_vouched`.

**Clue (history, alt. persuasion).** The tenth mould: "Not this way. Ask them
all." The founders knew. (In the casting hall, or with `job:mould-sold` in the
Lantern Hall's front hall, and Cass Ord has had it carted back.)

**Crisis.** Retake the hall. The doors are held by Orin's company
(`b4_orin_captain`, `b4_orin_davin`) or Sorrel's watch.
- Peaceful: lay the founders' words before the rope families (persuasion,
  alt. history; easier with `b4_accused_open` or `b4_truth_ailith`, harder
  with `b4_sable_ailith`).
- Fight: the rope families' champions.

**Decision (Ailith).**
- The council's judgement: `b4_ailith_judged`.
- Cinder Fold's committee: `b4_ailith_committee`.
- She stays on the ropes, under watch, because she is the best ringer they
  have: `b4_ailith_ropes`. She rings in whatever comes next.

Straight on (`continues`) to chapter 29.

### 29. The Lid (b4-lid, level 68, beneath the nine, midwinter night)

**Opening.** Someone has struck the Parting Bell half a note (Ailith's test,
worse with `b4_sable_silent`), and the lid heaves. The white of both
countries, rung back from both sides, meets under Cinder Fold. Sloe's ringers
come in by the north door (`b4_maren_vouched`, `b4_told_sloe`) or up through
the lid by the marked way (`b4_maren_doubts`).

**Talks.** Sloe. Rue. Aster, through the joined bells. Burdock, if he came.

**Clue (performance, alt. arcana).** The nine are out of time with the half
note. Ring them in time and the lid settles.

**Crisis.**
- Peaceful: the miners and the Wold's ringers on every rope together
  (performance, alt. athletics).
- Fight: the Two Winters (boss).

**Decision (who holds the Parting Bell until midnight).**
- Sloe: `b4_holder_sloe`.
- The council, in Brannagh's hands: `b4_holder_council`.
- You: `b4_holder_you`.

Straight on to chapter 30.

### 30. The Parting Bell (b4-parting, level 69, Cinder Fold casting hall, midwinter midnight)

**Opening.** Every bell in the free wards listening, and the Wold's pot-bells
with them (`b4_potbell_*`). The bell in someone's hands (`b4_holder_*`).

**Talks.** Sloe. Ailith (with `b4_ailith_ropes`). Rue, with Nessa by
`b4_nessa_*`. Burdock. Aster.

**Clue (arcana, alt. performance).** The bell can be rung backward, forward,
or not at all. Forward is never offered.

**Crisis.** When the bell is touched, the Founders' Shade comes up through the
lid: the nine founders with the faces the free wards' songs give them. The
legends, fighting you.
- Peaceful: ring the nine in time with both countries on the ropes, and the
  Shade has nothing to stand on (performance, alt. religion; easier with
  `b4_potbell_rota`, `b4_vote_share`, `b4_holder_council` and
  `b4_sable_taught`).
- Fight: the Founders' Shade, the book's last fight (`flagScale`: harder
  with `b4_holder_you`, easier with `b4_holder_council`).

**Decision (how the winter is shared).** Each has a loser, and each is written
as right for someone.
- **Share it** (`b4_winter_shared`). Nobody rings the Parting Bell. It goes
  back to the Hall of Legends, silent. The free wards keep quiet nights by
  rota, town by town, and both countries give at the floor. Strongest with
  `b4_vote_share`; partial with `b4_rota_towns`. Named free-wards towns have
  hard winters, the Wold still loses people, and it must be renewed every
  generation.
- **Bring them south** (`b4_wold_south`). The bell stays silent. The Wold's
  people come over the peaks to live in the free wards, and the Wold is left
  to the white for good. Strongest with `b4_vote_refuge` and
  `b4_embassy_refuge`. Iona's arithmetic holds, just. The Long Tally comes
  south (`b4_tally_carried`, `b4_tally_last`) or ends in Orme with Burdock
  (`b4_tally_left`). Sloe does not come.
- **Sloe's note** (`b4_note_rung`). The Parting Bell is rung backward. Every
  bell in the free wards goes quiet for one winter: the Wold's first clear
  winter in nine hundred years, the free wards' worst, and named towns fall.
  The bound voices are silent for a winter. Who rings it, by `oneOf`: Rue with
  `b4_nessa_with_rue` or `b4_nessa_signal`, with Nessa beside her in the first
  case; otherwise Sloe. The ringer forgets everything.

**Scene parting (straight after, empty cast).**
- **Node 1, the bound voices.** Each answers for itself, by Book Three's flags
  and `b4_voice_*`: Aster, Vell's cast, Wren, Sable, Hesk's ring, the nine.
- **Node 2, the Telling.** Who keeps your story. The choice sets
  `fourth_telling`:
  - `ballad`: Kester's song, sung in the free wards;
  - `tally`: the Long Tally, written in the Wold (or in its southern last book);
  - `companions`: Orin, Maren and Nessa each keep a piece (a line each, with
    absent versions);
  - `none`: you ask that it not be told.
- **Node 3, the epilogue** (Dera's forge, early spring, `framesTrial`):
  - The way home, and the winter that followed, by the ending.
  - Dera has your gear on the bench.
  - Orin by `b4_orin_*`: a captain with Davin as his sergeant, a captain, or
    the man who carries things, at the forge.
  - Maren by `b4_maren_*` and `b4_names_*`.
  - Nessa by `b4_nessa_*` and `b4_key_*`; Biscuit at the forge door.
  - Rue: forgetting everything and beginning a new book with Nessa writing its
    first page; or home in Thrum; or in Briarwatch's fields.
  - Sloe, Ailith, Burdock, Hesk.
  - Kester's last verse, which follows `fourth_telling`.
  - The last line sets `b4_done`: "There is a trial waiting at the Hall of
    Legends for the next thing you will be."

## Side jobs

Twelve side jobs, four per part, built the PR #50 way. Each pays mostly gold
(120 to 180) plus at most 130 XP (`BOOK_THREE_JOB_XP`, which already applies
to Book Four), never past `jobRoom`, and is never assumed by the main story.

| Town | Job (id) | Open during | What it is |
| --- | --- | --- | --- |
| Highpass | Rue's Doors (`rue-doors`) | 1 to 3 | The innkeeper wants Rue to stop writing on his doors. Find her somewhere she may. |
| Briarwatch | The Third Verse (`third-verse`) | 3 to 6 | Kester wants the true story. Dera, Tovin and Pim each tell him a different one. |
| Merrowgate | Bett's Berth (`bett-berth`) | 4 to 7 | Bett wants to sign on as ship's girl north (the Company's or the council's, by `b4_company_*`). Coll does not want her to. |
| Cinder Fold | The Ninth Rope (`ninth-rope`) | 7 to 9 | The rope families refuse a miner's son a place on the nine's ropes. He is the best ringer in the Fold. |
| Lantry | The Painted Door (`painted-door`) | 11 to 13 | One door in Lantry has been painted over. Nobody knows who lived there. |
| Orme | Burdock's Mistake (`burdock-mistake`) | 13 to 16 | Burdock has found an error in the tally from three hundred years ago and cannot decide whether a correction is a lie. |
| Orme | The Southern Hand (`southern-hand`) | 14 to 18 | A line on Orme's oldest wall is in free-wards script: a southerner who crossed two hundred years ago and stayed. Find his family, who do not know. |
| Lantry | White-wool (`white-wool`) | 11 to 17 | Lantry's weavers need fleeces brought down from the high pasture in the white. |
| Highpass | Iona's Other Invoice (`other-invoice`) | 21 to 24 | Iona has billed the Wold's envoys for the council's costs, to the copper, and Burdock has written it into the tally as a debt. Settle it. |
| Briarwatch | The Wold Family (`wold-family`) | 23 to 26 | A Wold family in Briarwatch's fields wants to write on Briarwatch's doors. Aveline has no rule for it. |
| Ashford | The Lower Town (`lower-town`) | 25 to 26 | A Wold family asks to farm Ashford's lower town (rebuilt with `b3_ashford_defended` and the old way; still lost otherwise). |
| Merrowgate | Walkers' Names (`walkers-names`) | 26 | A Merrowgate widow is sure one of the hospice's walkers is her husband, who walked into the white at Fenmere. He is not, and she wants him to be. |

No side job is open in chapters 27 to 30. Callbacks to a finished job use
`job:<id>` or a choice's own `job:<id>-<choice>` flag and always have a
version for the job not done.

## Flag table

All new flags start `b4_`, except `fourth_telling`, which is a value flag like
`second_oath`. Every flag set here is read at least once.

**Set in Book Four:**

| Set in | Flags | Read in |
| --- | --- | --- |
| 1 Walker | b4_rue_council, b4_rue_party, b4_rue_watch | 6 (where Rue is), 9 (council heard her), 21 (Sorrel), 24 |
| 2 Records | b4_truth_published, b4_truth_council, b4_truth_ailith | 4 (dockers), 7 (Cinder Fold), 9 (votes), 22, 28 |
| 3 Ballad | b4_bw_rings, b4_bw_quiet, b4_bw_pim | 9, 22 (rota), 23, epilogue |
| 4 Company | b4_company_broken, b4_company_council, b4_company_sails | 6, 9 (waylayers), 11 (Lantry), 17 (pot-bells), 26 |
| 5 Davin | b4_davin_comes, b4_davin_home (also set by lines) | 10, 12, 15, 25 (requires), epilogue |
| 6 Book | b4_book_returned, b4_book_rewritten, b4_book_burned | 15 (the door), 27 (Rue) |
| 7 Key | b4_key_left, b4_key_carried, b4_key_hew | 27 (the signal), epilogue |
| 8 Letters | b4_letters_read, b4_letters_copied, b4_letters_answered | 9, 13 (the letter in the tally), 22 |
| 9 Embassy | b4_embassy_council, b4_embassy_own, b4_embassy_refuge | 16 (whose promise), 22, 30 (south) |
| 10 Peaks | b4_parting_rung, b4_unannounced, b4_gave_door; scene: b4_partone_done | 11 (Lantry), 16 (Sloe), 11 unlock |
| 11 Lantry | b4_gave_lantry, b4_rang_lantry, b4_waited_lantry | 12 (Sheddon), 17 (who taught Dunnet), epilogue |
| 12 Sheddon | b4_orin_ordered, b4_orin_went_back, b4_hero_went_back | 18 (Sedge's mother), 25, epilogue |
| 13 Orme | b4_tally_truth, b4_tally_reasons, b4_tally_wait | 16 (peaceful), 22 |
| 14 Greve | b4_names_kept, b4_names_written, b4_names_given | 16, 19, 26 (walkers), epilogue |
| 15 Thrum | b4_rue_gave, b4_rue_kept (also set by lines) | 27, epilogue |
| 16 Reckoning | b4_demand_carried, b4_share_promised, b4_sloe_comes | 19 (where Sloe is), 22, 26 |
| 17 Pot-bells | b4_potbell_broken, b4_potbell_kept, b4_potbell_rota | 23 (white comes south), 30 (peaceful), epilogue |
| 18 Hush | b4_walkers_led, b4_walkers_marked, b4_hush_rang | 19 (tail fight), 25, 26, epilogue |
| 19 Column | b4_tally_carried, b4_tally_left, b4_tally_last | 22 (who reads), 30 (south), epilogue |
| 20 North door | b4_crossed, b4_hall_camp, b4_envoys_only; scene: b4_parttwo_done | 21, 23, 25, 30, 21 unlock |
| 21 Knot | b4_accused_open, b4_accused_quiet, b4_told_sloe | 22, 28, 29 |
| 22 Invoice | b4_vote_share, b4_rota_towns, b4_vote_refuge | 30 |
| 23 Quiet night | b4_voice_rings, b4_voice_quiet, b4_voice_rests | 30 scene (bound voices), epilogue |
| 24 Gatehouse | b4_sable_ailith, b4_sable_taught, b4_sable_silent | 28, 29, 30 |
| 25 Ford | b4_orin_captain, b4_orin_soldier, b4_orin_davin | 28 (the doors), epilogue |
| 26 Hospice | b4_maren_vouched, b4_maren_doubts, b4_maren_silent | 28, 29, epilogue |
| 27 Signal | b4_nessa_with_rue, b4_nessa_stops_rue, b4_nessa_signal | 30 (who rings), epilogue |
| 28 Ropes | b4_ailith_judged, b4_ailith_committee, b4_ailith_ropes | 30, epilogue |
| 29 Lid | b4_holder_sloe, b4_holder_council, b4_holder_you | 30 |
| 30 Parting | b4_winter_shared, b4_wold_south, b4_note_rung; scene: fourth_telling, b4_done | Epilogue, 4th job trial framing, AI storyteller |

**Defaults for missing flags** (an absent companion, or a choice not offered):
`b4_key_*` reads as `b4_key_left`; `b4_rue_gave`/`kept` as kept;
`b4_orin_*` (25) as `b4_orin_soldier`; `b4_maren_*` (26) as
`b4_maren_silent`; `b4_nessa_*` (27) as `b4_nessa_signal`; `b4_davin_*` as
`b4_davin_home`.

**Read from Books One to Three** (Book Four always follows a finished Book
Three, so every `b3_` chapter decision is present; only companion answers and
side jobs can be missing):
- Book Two: `second_oath`, `wards_seat`, `elske_seat`/`elske_free`/
  `elske_judged`, `nessa_keeper`. Missing: the bible's old-save default (no
  Elske lines; Brannagh chairs).
- Book Three endings: `b3_promise_old`, `b3_promise_hesk`, `b3_stair_sealed`;
  the gifts `b3_gave_*` (Dera's lines); `b3_done` (unlock).
- Book Three places and people: `b3_bell_aster`/`cast`/`evacuate`,
  `b3_door_kept`/`closed`, `b3_sable_cast`/`lives`, `b3_saltwick_moved`,
  `b3_corvane_*`, `b3_ashford_*`, `b3_turned_left`, `b3_wren_*`.
- Companions: `b3_mags_forgives` (missing reads as not forgiven),
  `b3_orin_tried`, `b3_varn_*`, `b3_seal_*`, `b3_maren_gives`,
  `b3_nessa_gives`, `b3_orin_gives` (missing gives/keeps read as keeps).
- Side jobs: `job:lamps-davin`, `job:mould-bought`, `job:mould-sold`.

## Gear: chapter rewards and where Book Four goes

**Scope.** Another thread owns the gear sold in shops, the level bounties and
the equipment sets for levels 45 to 100: tiers 45, 50, 55, 60, 65 and 70, and
set bonuses. For now it puts the 45 to 70 stock in Briarwatch's and Highpass's
`stockByLevel`. This design does not set shop stock or a gear curve. It plans
one exclusive reward per chapter, and lists where Book Four goes and at what
levels, so the shop gear can be moved to those towns later.

Rules every reward keeps:
- **Gated by the book.** Each reward has `exclusive.quest` set to its b4-* id.
  It is given once per save, by `Gear.award(state, 'quest:<id>')` when the
  chapter is done, as Book Three's are. It is never sold. A save only gets it
  by playing Book Four, so it already sits behind `Book.started(state, 4)`.
  Any Book Four stock or level bounty that the gear thread moves to the towns
  below must check `Book.started(state, 4)` too (today `bountyReward` checks
  Book Three for every level).
- **Worn from two levels below its chapter**, so a hero who skipped side
  content can still use it.
- **Numbers come from the gear thread's tier for that level.** A reward is as
  good as the best sold item of its kind at its tier, with its own item skill
  or story ability, and never beats the next tier's sold items.
- **The 30% cap on damage taken stays.** No reward goes past 15% less damage
  taken on its own. Armour, shields and charms show their worth through AC,
  saves, item skills and story abilities, not more damage taken off.
- **No requirement above 15** in any score.
- **Spread.** Across the thirty rewards, every class gets a weapon or focus
  and an armour or accessory, and Orin, Maren and Nessa each get pieces they
  can wear (Maren has Strength 10, Nessa 9). Chapters 25 to 27 give companion
  keepsakes that only that companion can wear (`requires.members`, a small
  engine change).
- **Warm** (`warm: true`, see "Systems"): the rewards for chapters 11, 15 and
  18 are white-wool, made in the Wold.

### One reward per chapter

| Ch | Id | Item | Slot | Requires | Story root |
|---|---|---|---|---|---|
| 1 | b4-walker | Walker's Tally-cord | Accessory | Level 38 | The cord Rue ties round her book so she cannot lose it on the road. She gives you her spare. |
| 2 | b4-records | Founders' Account Case | Accessory | Level 39 | The oiled case Ilse kept the founders' page in for two hundred years. |
| 3 | b4-ballad | The True Verse | Accessory | Level 40 | Kester's broadsheet with Dera's corrections in the margin. Read aloud, it rallies (Empowered). |
| 4 | b4-company | North Company Cutlass | Main hand, finesse | Level 41 · Dex 13 | Issued to the Company's guards, who were never told what they were guarding. |
| 5 | b4-davin | Lamp-store Hook | Main hand | Level 42 · Str 13 | The hook Davin used to pull a burning plank clear. |
| 6 | b4-book | Rue's Second Book | Accessory | Level 43 | A blank book from Iona's own shelf, given after the first was found or lost. Insight story ability. |
| 7 | b4-key | Signal-keeper's Lanyard | Accessory | Level 44 | The cord the forge-signal key hung on, whoever has the key now. |
| 8 | b4-letters | Floor-letter Satchel | Accessory | Level 45 | The satchel Fennick lends for the letters. History and Religion. |
| 9 | b4-embassy | Embassy Seal | Accessory | Level 46 | The council's seal for the embassy north, cut overnight by a Highpass jeweller. Persuasion story ability. |
| 10 | b4-peaks | Parting-hall Plate | Armour, heavy | Level 47 · Fighter or Cleric · Str 13 | Armour left in the Hall of Legends by the founders' last guard. Brace. |
| 11 | b4-lantry | Door-reader's Scarf | Accessory, warm | Level 48 | Teasel's own white-wool scarf, chalked with your names. |
| 12 | b4-sheddon | Sheddon Column Shield | Off hand | Level 49 · Fighter or Cleric · Str 13 | A farm gate, faced with iron, carried at the column's rear. |
| 13 | b4-orme | Long Tally Staff | Main hand, focus | Level 50 · Wizard, Cleric or Bard | A tally-keeper's measuring staff, notched for nine hundred years of winters. |
| 14 | b4-greve | Letting-house Censer | Accessory | Level 51 | Yarrow's censer, the one she lights for the grieving. Medicine story ability. |
| 15 | b4-thrum | Thrum Lane Cloak | Accessory, warm | Level 52 | Heath's cloak, which she gives to the stranger who brought her daughter home. |
| 16 | b4-reckoning | Reckoner's Slate | Main hand, focus | Level 53 · Wizard | The slate Sloe did her sum on, which she will not need again. |
| 17 | b4-potbells | Pot-bell Mace | Main hand | Level 54 · Str 13 | Dunnet's clapper (if the bell was broken, a piece of the bell). |
| 18 | b4-hush | Hush-wool Mantle | Accessory, warm | Level 55 | Woven by a walker who has no name, and given without a word. |
| 19 | b4-column | Column Longbow | Main hand, bow | Level 56 · Dex 13 | The bow of the Wold's rearguard on the switchbacks. Pinning Shot. |
| 20 | b4-northdoor | North-door Greataxe | Main hand, two-handed | Level 57 · Str 15 | The axe that has hung by the Hall's north door since the parting. |
| 21 | b4-knot | Founders' Rope-knot | Accessory | Level 58 | The rope left on the empty hook, in the knot Orin knows and cannot name. Athletics. |
| 22 | b4-invoice | Council Ledger-case | Accessory | Level 59 | The case Iona's invoice came in. Investigation story ability. |
| 23 | b4-quietnight | Quiet-night Lantern | Accessory | Level 60 | The lantern Pim carries on the watch line on quiet nights. Perception. |
| 24 | b4-gatehouse | Gatehouse Grammar | Main hand, focus | Level 61 · Wizard | Sable's founders' grammar, annotated, from his cell (or from the bell-room). Unravel. |
| 25 | b4-ford | Captain's Commission | Accessory, Orin only | Level 62 | Sorrel's commission, whatever Orin did with it. Fortified for the party once a fight. |
| 26 | b4-hospice | Hospice Physic-bag | Accessory, Maren only | Level 63 | Anwen's old bag, given to Maren. Wisdom saves and Medicine. |
| 27 | b4-signal | Signal-fire Longbow | Main hand, bow, Nessa only | Level 64 · Dex 13 | Wren's bow from the forge-signal tower. Signal Shot (Vulnerable). |
| 28 | b4-ropes | Rope-family Maul | Main hand, two-handed | Level 65 · Str 15 | The maul the rope families drive the hall's wedges with. Shatter. |
| 29 | b4-lid | Lid-iron Plate | Armour, heavy | Level 66 · Str 15 | Plate cut from the lid's iron after it settled. Brace. |
| 30 | b4-parting | Midwinter Tuning Fork | Main hand, focus | Level 67 · Wizard, Cleric or Bard | The fork the ringers tuned the nine with on midwinter night. First Note. |

### Where Book Four goes, by level

For the gear thread, so the 45 to 70 stock can move from Briarwatch and
Highpass to where the story is.

| Town or region id | Kind | Book Four chapters (level) | Level range in Book Four |
|---|---|---|---|
| `highpass` | Town | 1 (40), 6 (45), 9 (48), 21 (60), 22 (61), 24 (63); the road to the Hall | 40 to 49, 60 to 64 |
| `ashford` | Town | 2 (41), 25 (64) | 41, 64 |
| `briarwatch` | Town | 3 (42), 23 (62); the epilogue and the trial at 70 | 42, 62, 70 |
| `merrowgate` | Town | 4 (43), 26 (65) | 43, 65 |
| `saltwick` | Town | 5 (44) | 44 |
| `cinderfold` | Town | 7 (46), 27 to 30 (66 to 69) | 46, 66 to 69 |
| `vell` | Town, can be emptied | 8 (47) | 47 (does not count for coverage) |
| `lantry` | New town (the Wold) | 11 (50), departure for 12 | 50 to 54 |
| `orme` | New town (the Wold) | 13 (52), 16 (55); departure for 14, 15, 17 to 19 | 52 to 59 |
| Hall of Legends | Region, from Highpass; not a town | 10 (49), 20 (59); the 4th job trial | 49, 59, 70 |
| `wold` | Region id for the white and the faction | 11 to 20 | 50 to 59 |

A natural split for the stock: tier 45 in Highpass and Cinder Fold; tiers 50
and 55 in Lantry and Orme, which no hero can miss in Part Two; tier 60 in
Highpass and Briarwatch; tier 65 in Merrowgate and Cinder Fold; tier 70 in
Briarwatch and Highpass for the trial. Two requests go with this to the gear
thread:
- white-wool warm accessories in Lantry's and Orme's stock, so every party
  member can be warm in the Wold (the three warm rewards cover three, by
  chapter 18);
- a cap on gear damage dealt (open question 9), since sold gear, sets and
  rewards together can pass 50%.

## Systems and gameplay

**XP.** Each chapter pays `P.levelBand(level)` exactly:

| Part | Levels | XP per chapter | Total |
| --- | --- | --- | --- |
| One | 40 to 49 | 11,750; 12,000; 12,250; 12,500; 12,750; 13,000; 13,250; 13,500; 13,750; 14,000 | 128,750 |
| Two | 50 to 59 | 14,250; 14,500; 14,750; 15,000; 15,250; 15,500; 15,750; 16,000; 16,250; 16,500 | 153,750 |
| Three | 60 to 69 | 16,750; 17,000; 17,250; 17,500; 17,750; 18,000; 18,250; 18,500; 18,750; 19,000 | 178,750 |

461,250 XP in all, equal to `XP_NEXT[69] - XP_NEXT[39]`, so a hero who starts
chapter 1 at the start of level 40 ends chapter 30 at the start of level 70.
- **Side jobs** pay at most 130 XP (under 1% of a level here) and never
  pass `jobRoom`.
- **Bounties** pay a hard battle's share (10% of a level, 15% while behind),
  capped by `xpRoom` at the current chapter's level. A hero can bounty up to
  just under the next level and then take the chapter, ending at most one
  level ahead; it never compounds, because the next chapter's cap is its own
  level.
- **The trial** pays half of level 70's band (9,630 XP) once, after the
  book.
- **Falling behind.** Book Three's direct playtests ended at 38, because heroes
  entered it behind from Book Two. Book Four closes that gap twice: chapter 1
  needs the 3rd job, which needs level 40 (open question 2), and the last
  chapter of each part tops a behind hero up to the part's end level
  (`levelFloor`: 50, 60, 70; open question 3). Within a part, side content
  still matters because fights more than five levels under are harder.

**Enemy scaling at 40 to 70** (`src/xp.js`, unchanged). A standard leader:

| Level | Power | HP | AC | To hit | Damage (average) |
| --- | --- | --- | --- | --- | --- |
| 40 | 25 | 129 | 18 | +13 | 6d6+34 (55) |
| 50 | 27 | 138 | 18 | +13 | 6d6+35 (56) |
| 56 | 29 | 147 | 18 | +13 | 6d6+41 (62) |
| 60 | 30 | 152 | 18 | +13 | 7d6+42 (66.5) |
| 69 | 32 | 161 | 18 | +13 | 7d6+42 (66.5) |
| 70, Heroic (the trial) | 36 | 179 | 19 | +14 | 8d6+50 (78) |

Two steps land in the book: +6 a hit at level 56 (power 29) and a die more at
60. Both fall where the 3rd job's 56 skill arrives and Part Three begins. The
hero gains 2 HP a level (a Fighter has 210 at 40, 270 at 70; a Wizard 142 and
202), +1 damage and healing at 50, 60 and 70 (`lateGrowth`), the 3rd job
skills at 48, 56 and 64, and the gear above. Companions gain 2 HP a level
(Orin 188 to 248) and nothing else, which is why Book Four gives them arc
moves (below). Enemy vigour (+25% HP by 100) starts only at 70.

**Fight targets** (the playtest after the rebalance): force fights last 4 to 7
rounds at 40 to 69, the objective route 3 to 5. Bosses (chapters 10, 20, 29,
30) may run 6 to 9.

**New mechanics.**
1. **The white** (Part Two). A chapter with `white: true` starts its deciding
   fight with each party member who wears no warm item Slowed for one round
   (the existing debuff), shown at the top of the fight with its reason.
   Warm items (`warm: true`) are Wold-made white-wool: the rewards for
   chapters 11, 15 and 18, and (asked of the gear thread) stock in Lantry and
   Orme. Bells do not count: a bell pushes the white onto someone else. It
   gives the accessory slot a real choice (warmth or damage) for ten
   chapters.
2. **The Wold's reputation.** A fourth faction, `wold`, beside wardens, trade
   and wilds. Chapter decisions move it; it sets Lantry's and Orme's prices
   (the existing rule) and changes a few lines in Part Three.
3. **The Telling.** Each chapter decision may carry `told: { ballad, tally }`:
   one sentence of how Kester's song tells it and one of how the Long Tally
   records it. The Journal shows them under "What they tell of you". After the
   epilogue only the chosen keeper's version continues (`fourth_telling`),
   and it is what the AI storyteller is given as the hero's legend.
4. **Companion arc moves.** When a companion's Part Three chapter is done,
   they learn one combat move, the same power whichever way their arc went
   (open question 8):
   - Orin, Hold the Column: the party is Fortified for one round, once a
     fight.
   - Maren, Say Their Names: heals the party, once a fight.
   - Nessa, Signal Fire: one enemy is Vulnerable for two rounds, once a fight.
5. **Level floors** (`levelFloor` on a chapter): see "Falling behind".

**Playtest target.** Scripted campaigns (`tests/campaign-playtest.js` with
`BRIARWATCH_PREVIEW_BOOKS=1`), six classes, two seeds, careful, direct and
skip players, from a Book Three save to the legendary trial:
- every run reaches level 70 at the end of chapter 30, with no soft-locks;
- nobody is more than five levels under a chapter on the main path;
- force fights in the target rounds;
- each chapter-30 ending reached at least once;
- with the gear thread's level 70 kit and a full party, the Heroic legendary trial is won in at
  least two of three attempts by every class on Standard, and a loss always
  allows a retry.

## UI and UX

- **The shelf.** Book Four's card shows "Part One of Three" and so on; the
  "to be continued" card names the next part. Book Four stays hidden
  (`out: 0`) until Curtis releases a part.
- **Paid.** On the hosted game Book Four needs a paid account, like Book
  Three; the lock and upgrade messages say "Book Four". The ending text
  counts four books ("all four books", not "all 4 books").
- **Before Book Four.** A short recap card on Book Four's first screen, from
  the save's Book Three flags: the ending, the gift, Aster, Hesk, and each
  companion's last line. Plain text, offline.
- **Telling players more is coming.** Before Book Four is out, a save that
  finished Book Three and starts an AI adventure can never go back to the
  books. Once Part One is in review, the Book Three ending should say that
  Book Four is being written and what an AI adventure would cost (open
  question 11).
- **Map and travel.** The Wold north of the peaks, the old north road through
  the Hall of Legends, Lantry and Orme on the map only once a chapter that
  names them is playable.
- **Town pages that follow a flag.** Generalise `emptied` to a list of
  `pages: [{ flag, subtitle, description, services }]`. Book Four uses it for
  Highpass and Briarwatch with the Wold's families, and the Hall camp; it also
  clears Book Three's Saltwick TODO.
- **Journal.** "What they tell of you" (the Telling, two columns until the
  epilogue); the Wold's reputation; Sloe's midwinter deadline under Leads in
  Part Three.
- **Combat.** The white's Slowed shown with its cause; warm shown on item
  cards; the companion arc moves in the combat log; "Fall back to the ledge"
  instead of "Retreat to town" for chapters 28 and 29 (Book Three's open
  follow-up, needed again).
- **Item cards and character sheet.** Show the totals and when the 30% taken
  and 50% dealt caps apply (an open follow-up from Book Three, more likely
  with Book Four gear).
- **The legendary trial card.** Shows the framing text from the epilogue and
  "Legendary trial · Heroic", as the 3rd job card shows its framing.
- **Job screen.** The next 3rd job skill (48, 56, 64) and, after the trial,
  the 4th job's 80.
- **Phone width.** The recap card, the Journal's two columns and long tally
  lines must fit 360px without sideways scrolling (the two columns stack).

## The 4th job trial

The trial itself is already built (`src/director.js`): at level 70 with the
3rd job, any town's board offers the branch's legendary trial, always Heroic,
paying half a level, AI-written or written offline, at "The Hall of Legends
above the Highpass peaks", judged by "legends of old".

Book Four frames it the way Book Three framed the 3rd job:
- The epilogue's last node is `framesTrial`. The parting scene's
  `trialFraming` has `{ "flag": "b4_done", "trial": "fourth" }` and Dera's
  lines, one per `fourth_telling` and ending:
  - `ballad`: they are singing it already, wrong in places; go and make the
    next verse true.
  - `tally`: Burdock has written you down, so the Wold will know you every
    spring; go and give them something worth reading.
  - `companions`: they each have a piece of it; go and come back to them.
  - `none`: nobody will tell it; go and do it anyway.
  - with `b4_note_rung`, Dera adds that someone gave everything so that you
    could carry the rest.
- The trial opens with that framing, offline and with the AI game master,
  as the 3rd job trial opens with Book Three's.
- The place is the Hall the book ended with. With `b4_winter_shared` the
  Parting Bell hangs there again, silent; with `b4_wold_south` the hook is
  empty and the north door is barred; with `b4_note_rung` the bell hangs there
  cracked. One optional line for the written trial's opening reads this.
- After the trial, the hero is beyond the written books. The AI storyteller
  continues from the chronicle, the Telling and Book Four's flags.

## Engine changes

1. **Shelf.** `{ n: 4, title: 'The Long Tally', paid: true, parts: 3, out: 0,
   finale: 'b4-parting' }` in `src/book.js`. `BRIARWATCH_PREVIEW_PARTS=4:1`
   holds a preview at Part One.
2. **Data.** `src/data/book-four/` merged by `src/expansion.js`: generalise the
   Part Two merge to a list of directories in story order.
3. **3rd job gate.** `requiresJob: 3` on `b4-walker`: checked in
   `world.unlocked` and `completeQuest`, like `requiresAdvancement`; the board
   card says "Pass your 3rd job trial first" (open question 2).
4. **Level floors.** `levelFloor` on a chapter tops the hero's XP up to the
   start of that level on completion: `b4-peaks` 50, `b4-northdoor` 60,
   `b4-parting` 70 (and `b3-firstbell` 40 if open question 3 says so).
5. **Trial framing by kind.** `trialFraming.trial` ('third' by default);
   `framing(state, kind)` in `src/director.js` uses it for both kinds, so the
   4th trial is never framed with Book Three's lines.
6. **Gear hooks for the rewards.** The thirty `exclusive.quest` rewards;
   `requires.members` for the keepsakes; `warm`. Shop stock, level bounties,
   sets and any `MAX_GEAR_DEALT` cap belong to the gear thread; whatever it
   moves to Book Four's towns checks `Book.started(state, 4)` (today
   `bountyReward` checks Book Three for every level).
7. **The white.** Quest `white: true`; Slowed at the start of the deciding
   fight for party members without a warm item.
8. **Faction.** `wold` in `world.reputation`, Lantry's and Orme's `faction`.
9. **The Telling.** Decision `told`; the Journal section; `fourth_telling` and
   the told lines in the AI's facts after the books.
10. **Walkouts.** `walkouts(q)` covers Book Four parts 1 and 3; `needs` on
    chapters 5, 6, 7, 25, 26, 27; no walkout after chapters 9, 10 or 26;
    `together` from 27. Book Four walkout and return lines in `away.json`.
11. **Straight on.** `continues` on chapters 28 and 29, with ledges, as Book
    Three's 17 to 19.
12. **Town pages by flag** (above), and Lantry, Orme and their bounty boards
    (`BOARDS` in `src/bounty.js`).
13. **Ending text.** `ending()` and `paidEnding()` count four books; the
    optional "Book Four is being written" line (open question 11).
14. **Companion arc moves** (if open question 8 says yes): one move per
    companion in the companion turn, unlocked by any of their Part Three
    flags.
15. **Decision `requires.party`.** A decision or scene choice offered only
    when a companion is in the party (chapters 15 and 25). Today `requires`
    checks flags and clues only (`src/engine.js`).
16. **Reused as they are:** `oneOf`, line `setFlag`, scene-choice `requires`,
    `flagScale`, `access` lines, the parts engine.

## Test plan

No test calls the paid API: tests run with the AI game master off or against
the local stub server, and never with a real key.

- **Shelf and access** (`tests/book-four-hidden.test.js`): hidden with
  `out: 0`; open in preview; `4:1` waits at "to be continued" at level 50; a
  free hosted account (grant 2) and a Book Three grant (3) cannot open Book
  Four; a save inside Book Four whose access lapses is locked, never finished.
- **XP** (`tests/book-four.test.js`): each chapter's `xp` equals
  `levelBand(level)`; a straight run is level 40+N after chapter N; side jobs
  never pass `jobRoom`; the floors lift a hero who is behind to 50, 60 and 70;
  bounties never carry a hero two levels past a chapter.
- **3rd job gate:** chapter 1 cannot be started or completed without the 3rd
  job; the board says why.
- **Continuity:** fixtures for each Book Three ending (old way, Hesk's way,
  sealed stair) with each gift, and with each companion away. Every chapter
  and scene renders with no empty line, no unresolved token and no line that
  names a missing person.
- **Companion gates:** a lint test, like Book Three's, that every line naming
  or answering Orin, Maren or Nessa has a `party` gate and an absent version,
  and that no companion's answer flag is set while that companion is away.
- **Names:** a test listing taken names (Tamsin, Brask, Hesper, Pell, Pellow,
  Tam, Ansel, Garrow, and every named person in Books One to Three) fails if
  one is reused for a new person in Book Four data.
- **Flags:** every `b4_` flag set is read somewhere; every flag read is set
  in Books One to Four or is a `job:` flag.
- **Endings:** each chapter-30 ending is reachable; the forward ring is never
  offered; `b4_voice_rests` is unavailable with `b3_bell_aster`;
  `b4_orin_davin` needs `b4_davin_comes`.
- **Trial framing:** after `b4_done` the 4th trial opens with Dera's Book Four
  line for each `fourth_telling`, offline and in the AI brief; the 3rd trial
  still uses Book Three's.
- **Walkouts:** none in Part Two, none before a companion's own chapter, none
  after chapters 9, 10 or 26.
- **Straight on:** a defeat in chapters 28 or 29 wakes the hero at the last
  ledge.
- **Chapter rewards** (`tests/book-four-rewards.test.js`): each b4-* chapter
  gives exactly one reward, once, never sold; each is wearable from two
  levels below its chapter; requirements at most 15; no reward takes more
  than 15% off damage taken and the 30% cap still applies with it worn;
  every class and each companion gets pieces they can wear across the
  thirty; keepsakes only for their companion; a save that has not begun
  Book Four has none. Stock, bounty and set coverage are the gear thread's
  tests.
- **The white:** Slowed at fight start only in `white` chapters, only for
  members without a warm item.
- **Playtest:** the targets under "Systems and gameplay", run before each
  part's release.

## Build order

Each step is one PR, reviewed by two story reviewers and two gear or systems
reviewers who must agree, as Book Three's were. Nothing is shown to players
until Curtis changes `out`.

1. **This design**, reviewed and revised.
2. **Engine groundwork:** shelf entry, data directory, 3rd job gate, level
   floors, trial framing by kind, gear gates and caps, walkouts, ending text,
   town pages by flag. Tests with fixture chapters only.
3. **Part One, chapters 1 to 3**, their scenes and two side jobs.
4. **Part One, chapters 4 to 7**, two side jobs, Book Four walkout lines.
5. **Part One, chapters 8 to 10**, the end-of-part scene and chapter
   rewards 1 to 10. Playtest to 50. Curtis may set `out: 1`.
6. **Part Two groundwork and chapters 11 to 13:** Lantry and Orme, the white,
   warm items, the Wold faction, the Telling in the Journal.
7. **Part Two, chapters 14 to 17**, and the Wold's side jobs.
8. **Part Two, chapters 18 to 20**, the end-of-part scene and chapter
   rewards 11 to 20. Playtest to 60. Curtis may set `out: 2`.
9. **Part Three, chapters 21 to 24**, and two side jobs.
10. **Part Three, chapters 25 to 27**, two side jobs, companion keepsakes and
    arc moves.
11. **Part Three, chapters 28 to 30**, the parting scene and epilogue, the 4th
    job framing and chapter rewards 21 to 30.
12. **Release pass:** the full playtest to the legendary trial, the recap
    card, item-card caps, phone checks. Curtis may set `out: 3`.

Before step 6 and step 9, the part's chapters get a short "Revisions" section
in this file for anything Part One's writing changed, as Book Three did.

## Open questions for Curtis

The reviewers settle these; each has a recommended answer.

1. **How do thirty levels map to chapters?**
   - Recommended: thirty chapters, one level each, three parts of ten. It
     keeps Book Three's rule (exactly one level per chapter, so the story
     lands on 70), lets each part come out on its own, and puts the 3rd job
     skills at 48, 56 and 64 on camp beats.
   - Alternatives: twenty chapters at one and a half levels each (breaks the
     whole-level rule and `jobRoom`), or fifteen chapters at two levels each
     (much less story per level).
2. **Must the hero pass the 3rd job trial before Book Four's first chapter?**
   Recommended yes. Its camp lines name 3rd job skills, the trial works
   offline, and it means every hero starts Book Four at level 40.
3. **Should a hero who is behind be topped up at the end of each part (50, 60,
   70), and at the end of Book Three to 40?** Recommended yes for both. It
   guarantees the trial at 70 and removes the 38-at-the-end gap the Book Three
   playtest found, while side content still matters inside each part. The
   Book Three change is one field on its last chapter.
4. **Should "Sloe's note", every free-wards bell quiet for a winter, be an
   ending the player can choose?** Recommended yes. Book Three offered Hesk's
   way; every ending has a loser, and this one is right for her.
5. **Should Ailith's forward ring, the Wold buried for good, ever be
   offered?** Recommended no. It is the Single Voice at its worst, and the
   book is about not doing that to strangers.
6. **The title.** Recommended "The Long Tally". Alternatives: "The Parting
   Bell", "The Far Side of the White".
7. **Add the white (Slowed without warm gear) in Part Two?** Recommended yes:
   small, testable, it makes the Wold feel different to play and gives the
   accessory slot a choice. The alternative is story text only.
8. **Give each companion one combat move when their arc completes?**
   Recommended yes, the same power whichever way the arc went. Book Three
   found Orin gains little after 30; companions otherwise get only HP from 40
   to 70.
9. **Cap gear damage dealt at 50%, as damage taken is capped at 30%?**
   Recommended yes, for the gear thread to decide with its sets. Today it is
   uncapped and tier 40 already reaches 45%.
10. **Walkouts in Book Four?** Recommended: Parts One and Three only, never in
    the Wold, never in the last four chapters.
11. **Should the Book Three ending say that Book Four is being written,
    before it is out?** Recommended yes, once Part One is in review: one line
    that an AI adventure now would mean this hero cannot play Book Four. Today
    a hidden book is not mentioned at all, and a player could lose it without
    knowing.
12. **Is Book Four paid on the hosted game, under the same paid account as
    Book Three?** Recommended yes; `FREE_BOOKS` stays 2 and the open-source
    game plays it free.
13. **Frame the 4th job with "who keeps your story" (the Telling)?**
    Recommended yes: it echoes the Second Oath, follows from the legend
    thread, and gives the AI storyteller the hero's legend to continue. The
    alternative is framing by the ending only.
14. **Davin, sixteen, may come north.** Recommended yes, as an option the
    player and Orin choose, written with Orin's responsibility at its centre.
    He is hurt at most, never killed.
