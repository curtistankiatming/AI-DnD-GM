# Briarwatch Book Three and Four reruns

25 November 2026 · Tested `f5a6cbbac261cd42d5b5ecbcfe41ab8dad84e433` with Node.js v24.22.1.

I copied Mira's and Soren's own Book Two ending saves into a clean workspace and replayed all 50 chapters of Books Three and Four, through the level 40 and legendary job trials. Both entered Book Three at level 18 with their earlier relationships, equipment, and choices intact. I made the story choices in the offline terminal with `BRIARWATCH_PREVIEW_BOOKS=1`, used `auto 1` only in fights alongside manual actions, and used ordinary saves throughout. I also replayed the previous Ruinmaker loss on a separate copy of Soren's old Book Four ending to check the rescue fix. No scene jumps or live AI.

| Route | Start | Book Three ending | Book Four ending | After the legendary trial |
| --- | --- | --- | --- | --- |
| Mira, Story Cleric, seed 83 | Turn 393 | Level 40, turn 702 | Level 70, turn 1,146 | Level 71 Living Saint, turn 1,173 |
| Soren, Gritty Rogue, seed 109 | Turn 487 | Level 40, turn 803 | Level 70, turn 1,345 | Level 71 Ruinmaker, turn 1,366 |

| Rating | Mira | Soren |
| --- | --- | --- |
| Story fun | **9/10** | **9/10** |
| Combat difficulty | **2/5** | **4/5** |
| Combat fun | **7/10** | **8/10** |
| Overall fun | **8/10** | **9/10** |
| Grind | **1/5** | **1/5** |

A difficulty of 1 means forgiving and 5 means repeated stalls even with preparation. Grind of 1 means the story carries progression. Neither route needed a bounty or repeated a fight to buy equipment. The ratings are my experience of these routes, with different classes, seeds, equipment, and decisions.

## How the new chapter entrances play

Both heroes used all five new entrances, from The Captain's Order through The Reckoner's Sum. Each went from the opening scene to the deciding moment in one action. Compared with investigating, advancing, and choosing an approach, that saved ten actions per route across the five chapters. It would save five against a route that skipped the optional investigation. I still stopped for optional conversations when I wanted to hear someone out. The shortcut gives the lead and leaves the deciding check or fight in place.

The strongest callback was Sheddon to Orme. Mira let Orin order the column on, then stood with him at Burdock's desk while he had the order recorded. Soren went back for Sedge's mother and walked the two of them into the same hall. Coming into Greve, Soren could repeat the two columns he had asked Burdock to write, what the bells do and why. Those were his words to carry. Mira arrived in Greve with the south's answer still unwritten, which changed what she owed the people grieving there.

The Book Three thread I most wanted to follow was what people remembered and what they chose to give. Soren gave away his memory of Dera's forge. Mira asked Nessa to answer Rue in Thrum, and Nessa admitted that some nights she'd give anything to stop hurting. She held Rue's book while Rue gave her memory away. Asking who gets to decide mattered more to me here than any of the votes. Mira later chose to ring the Parting Bell backward. When Rue forgot who she was, Nessa wrote the first page of her new book in capitals. Soren chose refuge in the south, and Sloe asked him to write down that she chose to keep the last door. Both endings made a decision about the whole country feel personal.

## Findings

### Asking Nessa creates two competing entrances to The Reckoner's Sum

- **Where** Rue's Mother, `q-b4-thrum-after` → `nessa`, then `q-b4-reckoning-start`.
- **What** Mira asked Nessa to advise Rue. Nessa told Rue to give the memory and stood with her. The next opening offered “Take Rue's count of the door-boards straight to the vote” (`carry-rue-gave`) first and “Take Rue's and Nessa's count of the door-boards straight to the vote” (`carry-rue-nessa`) second. Both appeared in the same menu. Soren advised Rue to give directly and saw only the solo entry. The joint entry on Mira's run worked and brought Nessa into the scene.
- **Why it matters** The first choice in the menu can skip the companion payoff the player just earned. The two choices read as routes from different decisions.
- **Suggestion** Offer the solo entries only when the player made Rue's decision directly. Keep both possible memory outcomes available to the later story after Rue asks Nessa.
- **Severity** Minor. The intended entry still works.

### The terminal still shows the Sable defeat paragraph under the corrected trial heading

- **Where** `defeat` after the Ruinmaker Trial, on the separate replay of the previous loss. Seen in `look` at turn 1,441.
- **What** The heading was “The trial is halted” and the goal correctly told me to accept rescue. Under them the terminal still printed “Briarwatch's bell continues beneath the earth, each toll carrying Sable's command farther through the roots.” This was a supervised trial in the Hall of Legends. The underlying rescue worked. Soren had **36,800 gold** before and after, and the receipt reported **0 gold**. I then won the resumed trial with Unravel and Controlled Blast.
- **Why it matters** The new goal tells the player how to recover. The stale paragraph still misidentifies what was lost.
- **Suggestion** Exercise a real combat defeat followed by terminal `look` in the regression test. Use the expedition-specific defeat prose when rendering the defeat screen.
- **Severity** Minor. The financial fix is verified.

### The Parting Bell changes hands offscreen

- **Where** The Lid, `q-b4-lid-after` → `you`, then The Parting Bell, `q-b4-parting-after` → `note`, with Nessa accompanying Rue.
- **What** Mira chose to hold the Parting Bell herself. At midnight it was “on the casting floor under the Mother Bell, with your hand on it.” When Rue asked for the rope, “Sloe looks at her a long time and gives it to her.” The scene gave Sloe the handoff without showing how the rope got from the player to her.
- **Why it matters** The player just accepted responsibility for holding the bell. Their part in the handoff disappears at the point where the responsibility matters.
- **Suggestion** Give the chosen holder a line or action for handing over the rope. Sloe can still tell Rue no first.
- **Severity** Minor.

## Recovery, difficulty, and progression

The terminal now prints the short-rest command and the way back to town after a hunt. I used it after Tallow, then returned to Saltwick for full recovery and resumed before taking on the chapter. After Whitecoat, Soren was at **44/233 HP** and Orin was at **12/206 HP**. The short rest took them to **53/233** and **20/206**. Returning to town gave them full health, and resuming preserved the hunt win. Soren equipped the Whitecoat Mantle and the next cold-weather warning listed only his companions as unwrapped. The previous run carried that damage into the next fight and needed rescue.

Mira won all **14** fights in the tested span and stayed conscious throughout. Soren won all **22**. He went down in The Letter from Vell, but his companions finished it. He fell below half HP in **nine of 15** Book Four fights, which made positioning and preparation matter even without a rescue. Both crews reached the level 40 and level 70 trials through chapter XP and finished with enough gold to buy their warm gear. The separate loss replay is excluded from those counts.

## Three things to keep

1. **Let the last place change the first thing you do in the next.** Seeing whether Sedge's mother comes into the Long Hall made the story move faster and made the route into Orme feel earned.
2. **Keep the jobs personal.** Maren reads a room, Orin takes responsibility for an order, and Nessa can answer a question Rue asks only of her. The vote scene where Nessa listens for what the bearers leave unsaid was a convincing reward for handing her the earlier decision.
3. **Keep the short rest and full recovery instructions together.** Keeping both in sight helped me judge the risk of the chapter after a hunt. Whitecoat's Mantle made the detour worth fighting for.

The full suite reported **1,218 passed, one skipped, zero failures**. [Previous Story and Gritty review](https://github.com/curtistankiatming/AI-DnD-GM/blob/ded75a66e418c9e1d674c570f814c65ce2bf83fc/docs/reviews/codex-story-difficulty-fun-2026-11-25.md)
