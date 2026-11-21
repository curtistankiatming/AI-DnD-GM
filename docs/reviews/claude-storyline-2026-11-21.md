# Storyline review, Book One and Book Two, 21 November 2026

An independent read of the written (no-AI) story, for story quality only. A separate review covers gameplay.

## How I read it

I read every written line in play order: the Act I opening (`story-nodes.json`), all twenty expeditions (`quests.json`), the camp and epilogue scenes, the eight side jobs, the companion walkouts and the three companion requests. I read every flag variant, not just one route. I did not play through with `scripts/play.js`; the Codex reviews already did that, and their findings (mostly lines that assumed a choice you hadn't made) are fixed. I only looked at them to avoid reporting the same things again.

Build: `3f6a2cc` on `master`.

## The short version

1. **Book Two is good.** It is the story Curtis asked for. The people have wants, the jokes come out of who they are, and the plot is about one real question (who should be allowed to ring the bell) seen from ten sides. Elske is a strong antagonist because she is right about half of it.
2. **Levels 2 to 9 of Book One read like a design summary, not a story.** After a rich opening in Briarwatch, the next eight chapters have almost no named people, almost no dialogue, no humour, and machine words ("pumping station", "relays", "command engine", "central lens") in a world of bells and songs. Then Book Two starts and the writing jumps up a level. This is the biggest problem, and it is a large rewrite, so I'm asking before doing it.
3. **Four story-logic errors**, now fixed in this PR. The worst: the bribed crowd at the vote made no difference to the vote.
4. **Book Two mostly forgets what you did in Book One.** You fixed Fenmere's well at level 3, and Fenmere didn't remember. Apart from your level 10 oath and two Act I choices (sparing Lysa, freeing Aster Vey), nothing you decided in Book One comes up in Book Two.
5. **A few catchphrases are doing the work that character should do.** Two characters share "I'd like that noted". Maren confirms Elske is telling the truth about nine times, which removes the suspense from her.
6. **Chapter 10 makes Elske undo her own Chapter 9 ending**, and then you fight her.

## What works, and should be kept

- **Elske Marrow.** Ink on two fingers, the seating chart drawn in five minutes, asking for power "in daylight", and the Hollin's Reach memory where you find out she voted to wait. Her whole motive is one room, and the book earns it.
- **Fenmere.** The white field with the weathervane, Brannagh's roof, the man who knows his daughter's face but not her name, the girl who sings the missing verse. Best chapter in the game.
- **Comedy that comes from people.** Orin giving receipts for confiscated knives; Iona's itemised invoice for the beer; Maren and Anwen cheating at cards in exactly the same way; Wren and Nessa noticing they stand the same way; the magistrate ruling it wasn't, in law, dark. None of these are one-liners. They are people being themselves under pressure.
- **Small threads that pay off.** Nessa's unsent letters and the pocket "for later"; Maren's list going into the harbour; Orin finally letting someone else hold the door; Biscuit's name in the council's record.
- **Side jobs.** All eight are proper little stories with a person at the centre (Ada at the latrine pit, Davy's boat, the Brand twins and the pony). The well on the Ashford road ("Same argument as the council. Smaller table.") is the main theme in miniature.

## Findings, most important first

### 1. Levels 2 to 9 are a thinner, different book (major; large rewrite, needs a yes)

From the toll road (level 2) to the beacon (level 9), the chapters are written as summaries of what happens rather than scenes where it happens. For example, the tollhouse investigation succeeds with: "You find two incompatible seals. The captain has been collecting an illegal second toll." Nobody speaks. The same is true of the marsh, the archive, the summit, the Quiet District and most of the beacon.

What this costs:

- **Almost no people.** "The keeper", "the courier", "three factions", "an agent of the central command", "the magistrate". Only Captain Venn, Lieutenant Hal, Wren, Edric and Corvane have names, and only Wren and Corvane get real lines.
- **No humour at all** between Act I and the bridge camp, and very little after. Book One's comedy lives entirely in the Briarwatch opening and the camp scenes.
- **The wrong vocabulary.** "Pumping station", "machinery", "engineers", "relays", "command construct", "command engine", "central lens". `campaign.json` says no modern technology, and Book Two quietly uses better words (echo-stones). The two books don't sound like the same world.
- **The back half of Act I** (the forest road through to the bell vault) is still in the old summary style too. Only the square, Tovin, Dera's forge and the snared scout were rewritten.
- **Loose threads from Act I:**
  - Dera's black lantern is set up carefully (black glass, no wick, cold, Sable gave it to Tovin) and never seen again.
  - Sable's ledger says he "sold access to the ward-vault". Sold it to whom is never answered. In Book Two his cell scene gives him a different motive ("I bound a spirit in a bell to keep this village safe"), which is the better motive, but Book One never shows it.
  - The summit's courier is carrying the keystone "toward Glasswind". Glasswind is never mentioned again.

**Proposal:** rewrite levels 2 to 9, plus the back half of Act I, to the Book Two standard. Keep every choice, flag, reward and fight exactly as it is, so saves still work and the tests still pass. Name the people in each chapter, give each one a scene, replace the machine words, and pay off the black lantern and Sable's buyer. This is roughly the size of Book Two's first half, so I would do it in three PRs (Act I back half and levels 2 to 4; levels 5 to 7; levels 8 and 9), each one reviewed before the next.

### 2. The bribed crowd at the vote made no difference to the vote (major; fixed)

The charter needed four towns of five. Three were for Elske. Haverick paid carters to break up Briarwatch's town meeting so that Briarwatch would abstain. But an abstention counts the same as a no: it still came down to Fenmere. So the chapter's villain plot had no point, and Haverick (who wants the Warden to pass) was arguably hurting his own side.

**Fixed:** the charter now needs two-thirds of the towns that vote. With all five voting, that is still four, so every later line ("Four towns of five") stays true. If Briarwatch can't vote, three of four is two-thirds and the Warden passes without Fenmere. Aveline now says this out loud, so the player understands what the carters are for.

### 3. A ward-bell can't stop a fire (major; fixed)

Hollin's Reach "burned while its council argued", and everything turns on the bell they didn't ring. But wards push back the Gloam, not fire, and nothing explained why ringing it would have saved the town. Corvane, at the beacon, describes it as mist coming over the wall.

**Fixed:** one line of narration on arrival: the Gloam came up the river road first, and the fire came behind it, from lamps and hearths left burning in houses whose people had forgotten they were there.

### 4. Book Two forgets most of Book One (moderate; partly fixed)

At level 3 you settled Fenmere's bitter well and chose who would run its water. In Book Two, Fenmere is introduced as a place you've never heard of.

**Fixed:** when you sit with Brannagh at the first council, she now remembers you, with a line for each of the two well decisions. (Water council: "We've argued every week since, and the water has never been cleaner. That's what I'd like from this lot." Ashford's engineers: "Ashford is very reliable about bills. That's why I asked to sit next to it.")

**Still open:** the toll road (refund or escort), the keystone (shared or council), the Quiet District (double consent or oversight), the beacon ending (independent wards or a charter) and the convoy epilogue are never mentioned in Book Two. One line for each, in the chapter where it fits, would make the whole thing feel like one story. The beacon ending matters most: Book Two talks about "the council's charter" even if you chose independent wards instead of a charter.

### 5. Chapter 10 makes Elske undo Chapter 9 (moderate; needs a yes)

If you talk Elske down at the Mother Bell, she looks at all the hands on the rope and lets go of hers. That is the emotional end of her story. In the next chapter she asks the council to put the bell under one voice again, and if your persuasion fails she takes the rope (or a forge hammer and the ladder), and you fight her as the final boss.

Asking the council openly is in character: it's exactly what she did at the auction. Grabbing the rope the day after letting it go is not, and fighting a forty-one-year-old provost hand to hand cuts against "human characters".

**Proposal:** keep her request, and keep the risk, but move the danger off her. For example: when persuasion fails, the delegates who are nodding call the vote right there, and the fight is against the echo of the Single Voice that wakes in the Mother Bell as the room starts to agree. Elske ends the chapter arguing against her own old idea, or being outvoted by it. This is a rewrite of one chapter's crisis, failure and fight text.

### 6. Catchphrases doing the work of character (moderate; small fix, proposed)

- **"I'd like that noted"** appears about twelve times, said by both Brannagh and Iona. It suits Iona (she issues receipts for receipts). In Brannagh's mouth it makes the two women sound alike. Brannagh already has her own voice: blunt and unasked-for ("Our keeper is an optimist. I've told her so.").
- **Maren confirms Elske is sincere about nine times** ("She means it", "Every word true", "She means that too"). Maren's gift is a lovely idea, but used every time Elske speaks it becomes a stamp, and it tells the player in advance that Elske has no hidden agenda. Keep three: the first council, "I keep waiting to hear her lie, and she doesn't", and the Mother Bell's "That's the worst of it."
- **Dera's two Book Two scenes are both goat jokes.** In Book One she is the sharpest person in Briarwatch. Give her one real line at the vote.
- **Jokes that step on serious moments.** Right after Aster Vey asks for a seat for the bells, Maren says "Aveline will need a fourth bag." Right after Aveline's report, Brannagh says "My goat is not available." Both are one-liners off the back of someone else's line, which is the kind of comedy Curtis said to avoid.
- **The stew beat is repeated nearly word for word.** The bridge camp ends with Orin eating all the stew while Maren watches and says nothing; the Mother Bell camp does the same, in almost the same sentence. The echo is a good idea, but it should sound like an echo, not a copy.
- Aveline's three bags are fine. The joke has a payoff ("for once, only one bag"). Don't add more.

### 7. Smaller continuity errors (minor; fixed)

- **Hal "took two years and a cabbage patch"** to see that Central Command was a bad idea. She only joined it after the Ashford bridge, a few months earlier. Now "a summer and a cabbage patch".
- **Merrowgate's town page** said the harbour bell "has not rung in public since anyone can remember". The chapter says it has kept the Gloam off the water for two hundred years and the pilots ring it every night. The town page now agrees with the chapter.
- **Maren's walkout** has her holding her list, even if she dropped it in the harbour a chapter earlier. Now there's a second version for that route.
- **Nessa's walkout letter** was called "the first letter Nessa Reed has ever sent anyone", which steals the weight from the epilogue, where she finally sends Wren's. Now "the first letter she has ever finished and left where somebody would read it".

### 8. Smaller things still open (minor; proposed)

- **Corvane vanishes after the beacon.** Nobody in Book Two says where he is. One line (in step with the Book Three plan, where he's in Vell) would close the gap.
- **Haverick is caught off stage**, found in a coach at the bottom of the mountain. The man behind the kidnapping, the cheap lamps and the bribed crowd never faces anyone. A short scene where he is brought before the council, or where Iona catalogues him to his face, would land it.
- **Where Aster Vey lives** is muddled: the buried bell under Briarwatch, the tower bell ("Aster Vey's bell" goes silent at the Mother Bell), and the little bell in your pack. One sentence would settle it.
- **Wren's map.** At Highpass she gives Nessa twenty years of safe lines through the pass: "Bring it back better." At Cinder Fold nobody mentions it. An easy, touching payoff.
- **Money** is "gold" in most places and "crowns" at the harbour auction and in Iona's invoice. Pick one, or say once that a crown is a gold piece.
- **The oath question is asked twice**: at the end of the Second Oath chapter, and again at the start of the epilogue scene. The first could just lead into the second.

## Pacing

Book Two's shape is strong: a slow start at the council, the first real loss at Fenmere, the city chapters, the darkest chapter at Hollin's Reach, and a fast climb to the Mother Bell. The weak spot is the end: Chapters 7, 9 and 10 all happen at Cinder Fold, and 7 and 9 are both "hold the Gloam at the forge", so the last stretch feels like one long stay. Finding 5's fix would help, because Chapter 10 would become a different kind of scene (a room deciding) rather than a third fight in the same hall.

Book One's pacing problem is Finding 1: a rich hour in Briarwatch, then eight chapters at the same flat level.

## Comedy, against Curtis's rule

Curtis's rule is: story first, comedy only when it comes naturally, human characters, not one-liners. Book Two mostly passes. Its best jokes are scenes, not lines, and they happen to people who are tired, frightened or proud. The failures are the catchphrases and the gags in Finding 6, and nearly all of them are quick to fix. Book One between levels 2 and 9 doesn't fail the rule so much as never try: there's no humour to judge.

## Fixed in this PR

| Finding | File |
|---|---|
| Vote: two-thirds of the towns that vote, and Aveline explains it | `src/data/quests.json` (vote) |
| Hollin's Reach: the Gloam came first, the fire behind it | `src/data/quests.json` (hollin) |
| Brannagh remembers the Fenmere well, both decisions | `src/data/quests.json` (chairs) |
| Hal: "a summer and a cabbage patch" | `src/data/scenes.json` |
| Merrowgate's harbour bell rings every night | `src/data/towns.json` |
| Maren's walkout after the list is gone; Nessa's letter wording | `src/data/away.json` |

All 707 tests pass (one skipped, as before) and all 108 scripted playthroughs complete.

## Recommended next steps

1. **Small follow-up** (an hour or two, no design questions): the catchphrase trims and serious-moment gags in Finding 6, the Book One callbacks in Finding 4, and the open items in Finding 8.
2. **Chapter 10 rework** (Finding 5), if Curtis agrees.
3. **Book One, levels 2 to 9, rewritten to the Book Two standard** (Finding 1), in three PRs, if Curtis agrees.

## Follow-up commit: the small cleanup (step 1 above)

- **"I'd like that noted" is Iona's now.** Brannagh's six uses are rewritten in her own blunt voice ("Fenmere consents. First, if anybody's counting."; "Nobody has persuaded me of anything. I just want a fence."). The epilogue's quick-vote line moves to Iona.
- **Maren's sincerity checks on Elske are cut from about nine to four:** the first council, "I keep waiting to hear her lie", the Hollin's Reach "It's about that room", and the Mother Bell's "That's the worst of it." After the vote, Orin now says "She'll mean it. That's the part I'm going to watch." on his own.
- **Gags removed from serious moments:** Maren's "fourth bag" after Aster Vey's plea; Brannagh's "My goat is not available."
- **Dera at the vote** has an opinion instead of a goat joke: the council took three days to send carts to Fenmere, and Tovin, who is voting no, has earned it.
- **The Mother Bell stew** now echoes the bridge camp instead of copying it.
- **The toll road comes back** in Briarwatch, on the Ashford road, at the start of the Long Road South, with a line for each of the two tollhouse decisions.

Still open from Finding 8: Corvane's whereabouts (to agree with the Book Three plan), Haverick facing someone, where Aster Vey lives, Wren's map (it needs a flag to say Nessa received it), crowns against gold, and callbacks for the keystone, the Quiet District and the beacon ending.

Tests: 706 pass, 1 skipped; 108 of 108 scripted playthroughs complete.

## Chapter 10 rework (Finding 5, approved by Curtis on 21 November)

Elske no longer grabs the rope or the forge hammer, and you no longer fight her. She asks the council openly ("I'd rather ask than take"), for somebody's single voice, not hers. As the delegates start to nod, the Mother Bell begins to hum the midwinter note on its own: it heard the request. If persuasion fails, Elske calls for a show of hands, the bell answers the room, Elske goes white ("That isn't me. I'm not touching it."), and the fight is against **The Single Note** in the bell, while the council finds its other voices. Both endings close with Elske withdrawing the proposal herself. The locked-rope route keeps its own version (the bell hums with no rope on it; you climb to the beam).
