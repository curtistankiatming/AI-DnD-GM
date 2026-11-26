# Two full playtests after the tavern roster (Claude, 26 November 2026)

Curtis asked for two tests after the 100-person tavern roster (#116), then for full
runs, level 1 to 71, with the AI run limited to **at most 3 AI prompts every 10
levels**. Nessa was declined both times in every run, so the tavern was in play.

## What was played

| Run | Hero | How far | How |
| --- | --- | --- | --- |
| No AI | Bram, Cleric, Standard | Level 1 to 71, all four books (Three and Four switched on with `BRIARWATCH_PREVIEW_BOOKS=1`), then past the books | 2,888 actions through the game's own server API, played by the repository's test player (`tests/player-policy.js`) |
| AI | Wren, Bard, Standard | Level 1 to 71, all four books, then past the books | 2,499 actions. AI narration was off. 23 AI prompts in all: 3 for every 10 levels, and 2 in the 70s |
| Browser, laptop and phone | Tamsin, Ranger | Tavern night at level 10, hiring, the next chapter; the end-of-books screen at 19 and 71 | Headless Chromium at laptop size (1366x850) and iPhone 13 size |
| Browser with AI (earlier, before the 3-prompt rule) | Tamsin and Wren | The tavern night with AI, typed questions to the recruits, hiring, one full chapter; levels 1 to 12 with AI narration on every turn | Real Claude key, claude-opus-5-5 at low effort |

In each 10 levels, the AI run used:
- one question in town ("What should we be most careful about on the road ahead, and what has changed because of what we did last time?");
- one typed action at a chapter start ("I quietly scout ahead…"), then its roll;
- one of these:
  - a side quest or new adventure request, in the 10s, 30s and 50s;
  - otherwise a line to Orin ("Was the last call I made the right one?").

**Spend:** this thread used about $14.30 of the AI budget. Almost all of it ($12) went
on the earlier run with AI narration on every turn, which was stopped at level 12
when Curtis set the 3-prompt rule. The rule-following run cost **about $1.90 for
levels 1 to 71**. With earlier threads, about $19.50 of the $60 is spent.

Screenshots are in the project files under `tavern-playtest/`.

## Results

| | No AI | AI (3 prompts per 10 levels) |
| --- | --- | --- |
| Reached | Level 71 | Level 71 |
| Tavern nights | Level 10 (declined), level 13 (hired Tobin Ory, shield) | Level 10 (declined), level 13 (hired Jessa Flint, archer) |
| Defeats (all recovered) | 3: Book Three's great bell (28), Book Four's quiet night (62) and ford (64) | 1: level 58 |
| AI side quests written and played | none (no AI) | 2 of 3 asked for; the 3rd was refused because one was already waiting |

The 3-person party is clearly harder in Books Three and Four. That is the cost of
turning Nessa down, as Curtis wants.

## Fixed (PR #118, merged; each one was seen in play first)

1. **Hires were called "they" whatever their pronouns.** Six chapter lines said
   "their hands" and "they say so" about Ione, who is she/her. They now use the
   hire's own pronouns.
2. **A hire's party card said "Personal quest unresolved".** Hires have no personal
   quest, so it now says "Hired at the tavern".
3. **Orin and Maren had the same "Any of them is more than we've got / hired, not
   sworn" exchange on every tavern night.** It now plays on the first night only.
4. **Hire cards said "5 gold for each of your levels"**, while the What's next row
   said 50 gold, and the card didn't say what kind of fighter the person is. Cards now
   read "Healer · Apothecary. … Fee: 50 gold now (5 for each of your levels)."
5. **The AI kept writing filler silence**, such as "Maren says nothing at all" and
   "Esme says nothing". The shared voice rule now tells it to leave an idle companion out.

## Fixed in this branch

6. **Every AI-written adventure had the same placeholder approach scene:** "The route
   ahead offers a careful approach or a direct crossing. Choose how to handle the
   obstacle…". The AI was never asked for that scene. It now writes it. Checked
   live: a new adventure, "The Hushed Road", opened its approach with Claude's own
   scene of the border road and the almost-ringing in the white.

## What worked well

- **The tavern nights are charming.** The notice Maren pinned up ("THE COMPANY OF THE
  OATH IS ONE SHORT. ENQUIRE WITHIN." / Orin: "I didn't write that." / Maren: "I did.")
  is the kind of comedy Curtis wants: it comes from character. The recruits'
  introductions land in two lines each.
- **Declining Nessa is remembered.** At the first tavern night Orin says "We turned one
  away on a bench in Briarwatch." In the Book Two epilogue, Wren's letter says Reed
  "lit it for me … Didn't mention you."
- **Hire lines in chapters work**, and the AI keeps them. With AI narration on, it
  kept Esme's written line about "escort work" and wrote her into fights as a quiet,
  dry archer.
- **Choices carry forward in what the AI writes.** Its side quests are built on the
  hero's own choices:
  - "That is the bell we gave them" (Who Rings the Harbour Bell).
  - Sedge, "whose mother was left behind at Sheddon", asking for the one who gave the
    order (The Line on Sedge's Door).
  - Asked "was the last call right?", Orin named the real decisions: Hesk's two
    names, the charter, letting Sable go down.
- **Tavern talk with AI is good.** Asked why a tax clerk should follow them up a
  mountain, Jago said: "A mountain road is only a ledger with weather."

## Not fixed (for Curtis to decide)

- **The hire fee is small next to the purse.** At level 10 the hero had about 1,200
  gold and the fees were 30 to 50 gold. The real cost of declining Nessa is Book One
  with three people, and the harder fights in Books Three and Four, not the money.
  Raise the fee only if you want money to be part of the cost.
- **No epilogue line for a hire.** A hire who travelled from level 13 to the end of
  Book Two gets lines in every chapter, but none in the Book Two or Book Four
  epilogue.
- **Orin's habits still bunch up in AI replies.** In three of his answers he coiled
  rope, tied knots, offered to "take the door" and offered to carry things, several in
  one reply. The voice rule says at most one habit per passage. Claude still leans on
  Orin's listed habits.
- **An AI side quest can wait for a long time.** The level 14 side quest sat on the
  board until level 40, because the test player only takes written chapters. While it
  waits, asking for another adventure is refused. A real player would see it on the
  board, so this is a note, not a bug.
- **Job trials at levels 40 and 70 still use the placeholder approach scene.** They
  are written from a template, not by Claude, and the template has no approach text
  (`writtenTrial` in `src/director.js`).
- **AI "risk" can be out of scale.** Buying Esme a drink showed "You risk up to 30
  gold".
