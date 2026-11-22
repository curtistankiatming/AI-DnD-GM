# UX review: from the end of Book Two through Book Three (2026-11-22)

Independent player-experience review of the flows after Book Two: the paid-book
gate and its messages on the hosted game, the two-part release, the chapters
below the stair with no town, refining, the level 40 job trial and the end of
Book Three. Two leftovers from the first UX review were included: a short rest
offered at full health, and combat orders with no explanation.

How: scripted campaigns with every book previewed (`tests/campaign-playtest.js`
with the event log captured, fighter/prepared and wizard/direct), the text of
each message at each step read in order, and the end-of-book screen checked in
the browser at laptop and phone width.

## Fixed in this PR

1. **The end of Book Three said "your written campaign ends here" when the 3rd
   job trial was waiting.** Book Three ends at level 40, the 3rd job, but the
   closing message only talked about the AI storyteller, and the trial button
   was only on the Prepare screen. Now the ending says the trial is ready and
   needs no AI game master, and What's next shows the trial with a "Begin your
   trial" button (it starts the same written or AI trial as Prepare).
2. **A hero who finished Book Three short of level 40 was stuck below the
   trial without the AI.** A wizard on the direct route ended at level 38, and
   bounties paid 0 XP after the books (they stopped at level 20, from when the
   books ended at 20). Now, after the books, bounties go up to the level the last
   open book ends at (40 after Book Three, still 20 after Book Two on a free
   hosted account), at the catch-up rate while below it. The ending and What's
   next say "Your 3rd job trial opens at level 40; bounties can take you there."
3. **Nothing warned that the stair has no town.** Hesk's Company (chapter 17)
   goes straight on through four chapters with no shop. Its card on What's next
   and Prepare now says so and suggests buying potions and gear first.
4. **"Retreat to town" below the stair went to a ledge.** The button now reads
   "Fall back to the ledge" with a matching description, and after a defeat
   there the choice reads "Wake on the last safe ledge" instead of "Accept
   rescue and return to a safe town".
5. **"To be continued" after Part One did not say what was finished or what
   comes next.** It now reads: "You have finished The Bronze, Part One of Book
   Three, The Names in the Bronze. Part Two, The Stair, is being written...
   Until then, bounties and side jobs stay open."
6. **"Book 2" / "Book 3" in player text, next to titles like "Book Two".**
   Every player message (book ends, the paid-book messages, What's next,
   Prepare) now names books in words.
7. **Short rest offered at full health** (leftover). It is offered only when it
   would restore something: hero HP with a Hit Die to spend, a short-rest
   resource, a hurt or tired companion, or bleeding, fear or deafness.
8. **Combat orders had one generic description** (leftover). Each order now
   says what the companions do (attack your pick, guard and heal your pick, or
   help with the objective), that it is free, and that without an order each
   companion fights by their own tactic from the Party sheet.

## Checked, no change

- Paid-book gate: the end-of-Book-Two message for a free hosted account leads
  with the paid book and states the AI-adventure trade-off clearly (from PR #73).
  The rule itself (an AI adventure closes the paid book to that save) is still
  Curtis's call and is unchanged.
- Refining (Masterwork): the smith section explains the one-upgrade rule, and
  each card shows owner, cost and effect.
- Ledges: resting and going back down works, and survives save and load.

## Left for later

- The hosted game has no account system yet, so "upgrade" in the paid-book
  messages has nowhere to click. When the hosted build gets accounts, those
  messages need a link.
- A smith upgrade you cannot afford is a greyed button with no reason given.
- Book Three is still hidden (`out: 0` in src/book.js) until Curtis releases it.
- The direct (fight-everything) route still ends Book Three about two levels
  short; this PR makes that reachable by bounties, but the chapter XP is the
  gameplay thread's call.
