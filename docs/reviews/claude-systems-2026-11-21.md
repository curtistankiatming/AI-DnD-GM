# Systems review, 21 November 2026 (Claude)

An independent code review of the game engine after the gameplay rebalance
(PRs #56, #61, #66, #68, #70) and the Book Three work (#51 to #67). It reads
the code rather than playing the story; nothing here is natural play.

- **Tested source:** `master` at 8b150cb, then this branch.
- **Runtime:** Node 22, no AI provider, no network.
- **Commands:** `npm run check`, `npm test`, `npm run playtest`, `npm run fuzz`,
  and `node scripts/balance-sim.js --seeds 6 --levels 20,40` before and after
  the fixes (seeded simulation, not play).
- **Limits:** no live Claude call (the director and chat prompts were checked
  by building them, not by sending them); the item catalogue, UI, UX and
  gameplay feel have their own review threads and are only touched where they
  meet the engine.

## What was checked

| Area | Where | Verdict |
| --- | --- | --- |
| Damage formula (stat x power tier, gear, buffs) | `src/power.js`, `src/combat.js` | Sound. Five older skills missed the stat bonus (fixed). |
| Buffs and debuffs | `Power.EFFECTS`, `damageFactor`, `acShift` | Sound. Floor of 25% damage holds. Burning's text was wrong (fixed). |
| Chain attacks | `Power.chainHit`, `chained()` | Sound. Arcane Snare, an attack roll, did not join chains (fixed). |
| Under-level rule (more than 5 under) | `src/xp.js`, `startCombat`, `checkPlan` | Enemies and story checks get harder; the fight objective did not (fixed). |
| XP: chapters at about 70% of a level | `XP.chapterXp`, `src/expansion.js` | Correct for Books One and Two; Book Three keeps one level per chapter, as designed and tested. |
| AI XP caps, side jobs, bounties | `src/book.js` (`capXp`, `jobRoom`), `src/bounty.js` | Correct. Bounties stop at the chapter's level, or level 20 after the books. |
| Best-suited companion rolls | `checkPlan` in `src/engine.js` | Correct: hero wins ties, typed actions stay the hero's, a companion who would disapprove never rolls, helper is never the roller. |
| Saves and migrations | `normalizeIncomingState` | Sound, with one gap: companions kept the voice text of the save's day (fixed). |
| Book gating and paid tiers | `src/book.js`, `server.js` | Sound: access is set by the server on every request and never read from a save. One leak to the AI (fixed). |
| AI director | `src/director.js` | Bounded and re-validated on load. Missing companion voices (fixed) and the leak above. |

## Findings fixed in this branch

1. **Older skills got no stat damage.** Arcane Snare, Saboteur, Lorekeeper,
   Focused Nova and Sever the Binding dealt their dice only, so from level 5
   they fell behind every other attack. They now add the attacking stat's
   bonus (stat modifier x power tier) and the hero's gear damage bonus, like
   the job skills. Nessa's Trick Shot is a rider on a weapon hit that already
   counts her Dexterity, like Sneak Attack, so it is left as it was. Arcane
   Snare, which rolls to hit, also joins chain attacks; the automatic and
   saving-throw skills do not, matching the job skills.
2. **Burning said "each turn".** It burns once by default (two turns from
   Kindle). The text now says it burns "until the fire goes out".
3. **The fight objective ignored the under-level rule.** More than 5 levels
   under a chapter, story checks were harder and enemies hit harder, but the
   objective inside the same fight kept its normal DC, so it was the easy way
   round the penalty. It now rises by the same steps, and the warning says so.
4. **Old saves kept old companion voices.** Loading a save copied each
   companion's saved `personality` and `summary`, so a save from before the
   character review (#63) still gave the narrator and the AI the old voices.
   A companion's authored identity (name, role, pronouns, summary,
   personality, signature skill, gear class) now always comes from
   `companions.json`; what the save earned (bond, level, gear, HP) is kept.
5. **The AI director did not know how the companions talk.** It was sent each
   companion's name and bond only, so after the books their voices could
   drift. It now gets role, pronouns and voice, and its instructions say to
   keep each companion in their own voice. Chat (Claude only) also gets the
   voice for in-character replies; small local models keep the short list.
6. **The director was told the names of chapters the player cannot play.**
   `upcomingAuthoredAdventures` listed the first unfinished entries of every
   written chapter, so once Books One and Two were done the AI was sent the
   names of hidden Book Three chapters ("The Letter from Vell", "Sable's
   Rite", ...). Once Book Three is released, a free hosted account would also
   have been sent the paid book's chapter names. It now lists only chapters
   this save can play (the test checks the gate with a Book One-only grant).

Each fix has a regression test in `tests/systems-review.test.js`; all five
tests fail on `master` and pass here.

## Balance check for fix 1

Run before the gear damage bonus was added to Saboteur, Lorekeeper, Nova and
Sever the Binding (a flat bonus from the hero's weapon, usually +0 to +3).

Seeded simulation (`--seeds 6 --levels 20,40`, 1,296 battles each run; the
standard AI-adventure battle, not play). Only the branches whose skills
changed moved. Rounds to win and hero HP left (%), before -> after:

| Branch | Level 20 Normal | Level 20 Heroic | Level 40 Normal | Level 40 Heroic |
| --- | --- | --- | --- | --- |
| Rogue Saboteur | (same) | 12.7 rnds, 20% -> 11.2, 33% | 10.0, 49% -> 9.0, 61% | 12.5, 26% -> 11.5, 34% |
| Wizard Evoker | 7.2, 67% -> 6.3, 68% | 8.7, 56% -> 7.8, 57% | 5.8, 64% -> 5.0, 68% | 7.0, 51% -> 5.7, 54% |
| Cleric Exorcist | 8.7, 57% -> 8.8, 60% | 10.2, 46% -> 9.5, 56% | 8.8, 64% -> 8.0, 66% | 10.8, 46% -> 10.0, 55% |
| Bard Lorekeeper | (same) | 11.5, 52% -> 11.8, 47% | 7.7, 68% -> 7.0, 69% | 9.7, 49% -> 8.7, 54% |

Win rates stay at 83-100% for these branches. The Saboteur, the weakest
rogue branch before, gains most; no changed branch becomes the strongest of
its class. Six seeds is a small sample, so single cells move by chance.

## Noted, not changed

- **The server trusts the client's state.** Every request carries the whole
  save from the browser. That is fine for a single-player local game, and
  book access cannot be forged (it is a symbol the server sets each request),
  but on the hosted game a player could still edit their own XP or gold.
  Worth an account-side save before the hosted game charges money.
- **Companion personal missions** pay 12% of a level once each and are not
  held to the chapter's level cap. At most three, so the effect is small.
- **Trick Shot's dice** stay 1d6 / 2d6 at every level, like the other
  on-hit riders; the hit it rides on scales.
- **The testing tools' scenario list** (`src/public-preview.js`) names every
  written chapter, hidden ones too. It is a developer menu, not sent to the AI.
- **Clerics are still the strongest class** in the balance simulation;
  Curtis said the current balance is good (11 November).
