# Briarwatch from level 1 through Book Four, two fresh runs

25 November 2026 · Tested `fb775dd85adfb45f78866c8868e8883612ca09ea` with Node.js v24.22.1.

I started two fresh characters at level 1 and played through the opening, all 70 written chapters, and the job trials at levels 10, 40, and 70. I made the story choices in the offline terminal with `BRIARWATCH_PREVIEW_BOOKS=1`. I used `auto 1` for combat alongside manual actions. I created Tess through the CLI and Ivo through the same game creation function so I could select Gritty from the start. Both used the normal game rules throughout. I separately replayed a previous trial loss from a copy of Soren's old Book Four ending. No scene jumps or live AI.

| Run | Levels at the ends of Books I / II / III / IV | Book-ending turns | Final checkpoint |
| --- | --- | --- | --- |
| Tess, Standard Ranger, seed 137 | 10 / 18 / 40 / 70 | 203 / 382 / 660 / 1,114 | Level 71 Worldwalker, Briarwatch, turn 1,131 |
| Ivo, Gritty Bard, seed 149 | 10 / 18 / 40 / 70 | 255 / 441 / 844 / 1,348 | Level 71 Keeper of the First Song, Briarwatch, turn 1,371 |

| Rating | Tess | Ivo |
| --- | --- | --- |
| Story fun | **9/10** | **9/10** |
| Combat difficulty | **3/5** | **4/5** |
| Combat fun | **8/10** | **8/10** |
| Overall fun | **9/10** | **8/10** |
| Level 10 grind | **2/5** | **3/5** |
| Grind after level 10 | **1/5** | **1/5** |

Difficulty runs from forgiving at 1 to repeated stalls with preparation at 5. Grind of 1 means the story carries progression, 2 means one to three repeats, and 3 means four to six. The characters, seeds, gear, and decisions differed. The ratings describe these two runs.

## Story and fun

My favourite part of the full run was seeing two versions of the story diverge after the Mother Bell. Tess left the bell for the towns to ring together. Ivo took down the rope, and years later walked it back into the casting hall himself. Hesk became a second, sharper decision. Tess let the willing few finish his casting in Book Three. At the Book Four council there was a dinner and a medal for him, even though the new ring could hold only some towns. I liked having to live with that compromise two books after the game first asked who should get to use the bells.

Nessa felt like the same person at level 1 and at the end. When Ivo found her in the snare, her first exchange with Orin was “Put me down” and “You'll fall over.” Later, at Thrum, she answered Rue about what to give away. On Tess's route she stood beside Rue as Rue gave up the memory and held her book for her. When Rue lost the rest at the Parting Bell, Nessa wrote the first page of her new book in capitals. Those scenes made the long story feel like a journey with a particular party.

The combat that stayed with me had a reason to finish quickly. Tess used Hidden Route to advance the legendary trial marker while shielding the party, then completed it in round three. She went down during Old Snapjaw, and the party still won. Old Whitecoat brought her to **6/262 HP** on Standard, a much bigger scare than most ordinary fights. Ivo lost Greyback, later beat Old Tollclaw, and needed rescue in Sable's Rite. Rescue cost Ivo 1,537 gold. He replaced his starting leather, shared the earned accessories, and brought the watch in on the retry with Orin down to 1 HP. Ivo's legendary trial was the best use of his job. Unravel and Recital of Ages put him at 3/4 on the marker, and he came back from a knockdown to finish it in round seven. Tess won 31 fights. Ivo won 35 of 37, with one lost hunt and one chapter rescue.

## Progression and grind

Tess arrived at the first trial gate with **17,127 of 18,900 XP**. Her gap was **1,773 XP**. Three 600-XP bounties opened it, as the board estimated. Old Snapjaw had paid **360 XP** along the way. Ivo reached the same gate at **16,640 XP**, a **2,260 XP** gap. The board estimated four bounties, and four wins opened it. Greyback gave him a good reason to try without costing a full rescue when he lost. These are two runs with different story rewards.

Both entered Book Three at level 18 and reached their specializations through the story. Later chapters took them to both advanced job trials. I bought party gear with campaign earnings, including a full change into warm armor for the Wold, without running further bounties for XP or gold.

## Findings

### The terminal sends players to a shop it never lists

- **Where** `look` and `town` in Highpass Watch after Ivo's Sable's Rite rescue. Also checked the Merrowgate and Cinder Fold stops during recovery.
- **What** `look` says to run `town` “for rest, shops, level rewards and the expedition board.” The town output lists services, travel and expeditions but omits the shop stock, prices, requirements, and buy command. Ivo had enough gold for better armour. I used the underlying shop data to find the Sallows Shadowcoat in Merrowgate and Ward-thread Robe in Cinder Fold, then equipped them with the standard terminal actions.
- **Why it matters** Armour helped turn a loss into a win. A player following the terminal prompts cannot discover the equipment or see what they can buy.
- **Suggestion** Print shop stock and the exact buy command, or add a terminal `shop` command and point the town screen to it. Include item requirements and price.
- **Severity** Major for terminal-only play.

### A late trial objective completion reads like a failure

- **Where** The Keeper of the First Song Trial, round seven at turn 1,369, `objective`.
- **What** Ivo missed the deadline with three of four points on the marker. The interface still offered the objective, as the deadline warning said it would. A successful roll then printed “progress made. 4/4” and “The marker slips away; the legend presses on. The remaining opposition has now been resolved.” The legend still had 16 HP on the preceding screen. Ivo had in fact finished the fight and could accept the job.
- **Why it matters** The result gives conflicting answers about whether the Bard's objective play worked, just before the game awards his final title.
- **Suggestion** Call the state “deadline missed” in combat. On a late objective win, say that the hero secured the marker after the deadline and name any lasting setback.
- **Severity** Minor. The trial advanced correctly.

### One bounty reports its XP twice

- **Where** Highpass Watch's repeatable bounty on the way to level 10. Seen on both routes.
- **What** Tess's first win printed “Bounty claimed (hard battle): +600 XP” followed by “Bounty claimed: 35 gold and 600 XP.” Her save went from **17,127** to **17,727 XP**, the correct single 600-XP award. The duplicate lines returned on later wins.
- **Why it matters** A player watching the XP gate sees two claims for the same win and has to inspect the total to learn how much the fight counted.
- **Suggestion** Use one bounty victory line for the payout. The gate estimate already gives the correct XP per win.
- **Severity** Minor.

## Fixes checked in play

- At Thrum, Nessa advised Rue to give the memory on Tess's route and to keep it on Ivo's route. Both got exactly one new entrance to The Reckoner's Sum, the joint Rue-and-Nessa count.
- Tess held the Parting Bell herself. The backward note now explicitly says “You give Rue the rope.” Ivo gave custody to the council and stopped Rue from asking. In his ending Brannagh handed the rope to Sloe herself.
- Ivo's Sable's Rite defeat named the expedition. The separate replay of the Ruinmaker defeat named the trial and said the judges called a halt. Rescue again charged zero gold.

## Three things to keep

1. **Keep decisions visible when the party returns to familiar places.** Seeing Hesk wear the council's medal made the decision at the end of Book Three feel more consequential.
2. **Keep optional monsters dangerous and local.** Old Whitecoat was a serious fight on Standard. Its mantle gives a player a practical reason to go after it just before heading into the Wold.
3. **Keep the trials tied to what the jobs do.** Having a Ranger find a route past a legend and a Bard try to unravel the marker made the titles feel earned.

The full suite reported **1,222 passed, one skipped, zero failures**. [Previous Books Three and Four review](https://github.com/curtistankiatming/AI-DnD-GM/blob/30fca4d2298dadbfd096efbdfad6da225f3d0339/docs/reviews/codex-books-three-four-retest-2026-11-25.md)
