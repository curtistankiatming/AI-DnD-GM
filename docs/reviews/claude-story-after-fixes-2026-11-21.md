# Story review after the fixes, Books One and Two, 21 November 2026

A fresh read of the written (no-AI) story after the storyline review (PR #52) and the Book One rewrite (PRs #55, #58, #59). Scope: plot, continuity, pacing and tone. Characters have their own review thread.

Build: `78f206a` on `master`.

## How I read it

Every written line of Books One and Two, in play order, with every flag variant: the Act I opening (`story-nodes.json`), the twenty expeditions (`quests.json`), the camp and epilogue scenes, the Book Two side jobs, the walkouts and the companion requests. I checked Book Three's opening chapters only where Book Two has to agree with them (Corvane, Sable, the Lantern Hall).

## The short version

1. **The Book One rewrite worked.** Levels 2 to 9 now read like the same book as the opening and Book Two. The people have names and wants (Jory and Wat Tanner, Sefa, Bek, Mother Orla, Old Hobb and Posy, Magistrate Rook, Oda), the machine words are gone, and the loose ends from the last review are tied: the black lantern turns out to be the lock in the bell-vault, Sable's buyer is in the ledger, and Glasswind has a shrine and a spokeswoman. I found nothing in Book One that needs another pass.
2. **The five open items are now done** (below). The one that needed an engine change was Wren's map, because the story had to remember who was standing there when Wren handed it over.
3. **One real continuity error**, fixed: the vote was at midwinter, and the Gloam rose at midwinter, but Elske "abided by it for six weeks" in between.
4. **Book Two now remembers the rest of Book One.** The beacon ending, the keystone, the Quiet District and the convoy each come back once, in the chapter where they fit.
5. **Two small slips**, fixed: Brannagh "never said a word" to you in Fenmere (she does, on one route), and Sorrel says she'll speak "tonight" at a town meeting she doesn't attend.

## The open items

| Item | What changed | Where |
|---|---|---|
| Haverick confronted on stage | A new talk before the Second Oath: Haverick in the miners' lock-up, with Iona outside the grille reading him the charges as an itemised list. He gets his say ("Somebody was always going to sell it"), Orin answers it, and then Iona shows him the total. Lines change with how you handled him: naming him at the auction, giving Elske the receipts, or keeping them. | `oath` talks |
| Where Aster Vey lives | She says it at Cinder Fold: her bell is still Briarwatch's, in the tower, and she rings when Tovin does at six, but a bell is a door and she can travel in a small one. At the Mother Bell, "Aster Vey's own bell" goes silent in Briarwatch and "the little bell she travels in" goes cold. | `cinderfold` opening, `motherbell` crisis |
| Wren's map payoff | The signal tower now remembers who was given the map. At Cinder Fold, if it was Nessa, she puts it on Wren's table with new lines in a different pencil ("You've moved the north gully." "It moved. After the thaw. I went and looked."), and Wren says "Better". If it was you, you give it back, and Nessa corrects it. | `signal` decisions, `cinderfold` opening and Wren talk |
| Crowns against gold | Book Two now uses gold everywhere, like the rest of the game: Iona's invoice, the auction's opening bid, and the harbour bell sold for one gold piece. | `harbour`, `side-jobs.json` (boat) |
| Where Corvane is | The convoy drivers say it at the end of Book One: he has gone home to Vell, to the Commandery, which melted its own wards for the Single Voice and has none now. Sable says it again in his cell before the vote ("He'll be thinking. Corvane always thinks when he's cold."), which sets up the letter that opens Book Three without giving it away. | `aftermath` after, `vote` Sable talk |

## Other findings

### The vote and the Mother Bell were both at midwinter (fixed)

Cinder Fold said the council would vote "at midwinter", the vote chapter opens "at midwinter", and the Mother Bell chapter opens "At midwinter the Gloam rises everywhere at once". On the route where Elske loses the vote, she "abided by it for six weeks" before riding for the bell. All four can't be true. The vote is now at the first snow, which also fits Elske's harbour speech ("I'll put it to the council before the winter"), and the Mother Bell stays at midwinter.

### Book One choices that Book Two never mentioned (fixed)

The last review fixed the toll road and the Fenmere well. Four more now have one line each:

- **The beacon ending.** At the Highpass gate, the rule that no keeper may ring the ward alone is either in the charter nailed to the beacon door (with a complaint in the margin), or something the keepers agreed among themselves and kept to.
- **The keystone.** Lieutenant Garrow, who witnessed the custody on the summit, is on the council-room door, with a line for shared custody and one for the regional council.
- **The Quiet District.** At Briarwatch's town meeting, Aveline reads a letter from Magistrate Rook. On the double-consent route it asks whether a Warden would ask twice; on the oversight route it says the Warden has everything Tallowmarket requires, and that Old Hobb would vote no.
- **The convoy.** Back in Briarwatch at the start of the Long Road South, either Oda is the road's keeper now, or the road patrol you set up has a hut and a rota.

### The oath question was set up twice (fixed)

The end of the Second Oath said "But first they ask you to answer Elske's question", then moved on to deciding Elske's fate, and then the epilogue asked the question again. The first line now only says that Aveline has her pen ready for when they do.

## Pacing and tone

Book One's pacing problem is gone. It now builds steadily from the tollhouse to the beacon, and the comedy is the same kind as Book Two's: people being themselves under pressure (the toll board's fee for reading the toll board, Bek sitting on the keystone since Tuesday, Orin arguing about deliveries while Nessa steals the ledger).

Book Two's end is still three chapters in a row at Cinder Fold (the galleries, the Mother Bell, the Second Oath). The reworked Chapter 10 helps, because it is now a room deciding rather than a third fight in the same hall. I don't think it needs more than that.

Against Curtis's rule (story first, comedy only when it comes naturally, no one-liners): the new lines keep to it. The Haverick scene is played straight, and the only joke in it is Iona being exactly herself.

## Engine change

Decisions in `quests.json` can now carry `flagsIf`: a list of `{when, setFlags}`, where `when` is checked the same way as a written line's `when` at the moment the choice is made. The signal tower uses it to set `wren_map_nessa` or `wren_map_hero`. Saves already past the signal tower simply have neither flag, so the map lines don't play for them; nothing else changes.

## Tests

`tests/story-callbacks.test.js` covers the map flags, the Cinder Fold payoff, Aster Vey's home, the Haverick scene, gold instead of crowns, Corvane's line and the vote timing. All tests pass; see the pull request for the playthrough results.
