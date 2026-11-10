# Play screens, step 4: party sheet, journal and town (10 November 2026)

Last of four redesign steps from the play-screen review. Steps 1 to 3 merged as
PRs #17, #21 and #23. This step changes presentation only: every button keeps
its original handler and sends the same action. No rules, save format, API
payload or model prompt changed.

## What changed

- **Party sheet is about half as long.** The pack is now two columns of short
  cards (one column on a phone). Each card shows the name, kind, count, what the
  item does and its buttons. The flavour text and the "compare before choosing"
  reminder moved behind the existing Inspect and Compare buttons. On a 1440px
  laptop the screen went from about 4,600px tall to about 2,500px.
- **A reminder when a choice is waiting.** When a level reward, an advancement
  or a renown boon is waiting, the Party screen shows a bronze bar with a
  "Choose now" button, and the Prepare tab shows a small dot.
- **Jump links on a phone.** Hero, Companions, Gear and Pack buttons stay at the
  top of the Party screen so the pack is one tap away.
- **Journal reads like a journal.** Status is a small coloured label (Active,
  Verified, Kept, Completed) instead of text in square brackets. Sections with
  nothing in them fold into one line under "All" and still open from their own
  filter. The older Clues list is hidden under "All" when every clue is already
  in Verified facts, and is shown whenever it holds something extra (an
  epilogue, or a clue from an older save). Story history scrolls in its own box.
- **Town is in the right order.** The page title is first (it used to appear
  below the first two cards). A waiting level-up choice comes next instead of
  sitting at the very bottom. The notice board (expeditions) now comes before
  rest and shops, its notices sit two across with the Depart button in bronze,
  and your gold is shown under the town name. The party check is a row of short
  labels instead of a list of sentences.

## Levels to 100

PR #24 raised the level cap to 100 and added a difficulty picker on AI
adventures. Nothing on these screens assumes a level range: levels and XP are
printed as the engine gives them, and the difficulty picker sits inside the
notice it belongs to.

## How it is built

`public/sheets.js` (new) wraps `renderInventory` and `renderGame` after
`combat-board.js`, and watches the journal list so the status labels are added
whenever the chat panel redraws it. Record text is unchanged for assistive
technology and tests ("Title [status]"); only the brackets are hidden from
sight. Styles are the "Step 4" block in `public/adventure.css`. The script is
listed in `scripts/build-public.js` so the single-file build has it.

## Not in this step

- The tab is still called "Prepare" and its sections keep their names
  ("Expedition board & preparation" and so on), because other screens and the
  first-steps guide refer to them by name.
- The pack is still sorted by kind without headings between kinds; the Category
  filter does that job.
- Shop, smith and storage rows keep their current layout.

## Verification

Source: branch `claude/project-thread-wob5kj` on top of master `882694d`
(includes PR #24). Runtime: Node 22, Chromium (Playwright) in a Linux
container. No model or paid API was called; the game ran with the AI off and an
OS temporary `SAVE_DIR`.

- `npm run check`: 92 JavaScript files syntax-checked.
- `npm test`: 554 passed, 0 failed (one new test: the script ships in the served
  page and the single-file build, after the scripts it wraps).
- `npm run playtest` and `npm run fuzz`: completed without failures.
- `npm run build:public`, then
  `python3 tests/browser_smoke.py --engine chromium --target all`: all three
  targets passed, including the new `exercise_sheets` in
  `tests/story_browser.py`. That is real browser interaction: it checks one pack
  card per carried item, the waiting-choice bar against the engine's state, the
  journal record text and labels, empty sections under "All" and under their own
  filter, the order of the town page, nothing past the right edge at 390px and
  320px on all three screens, the Pack jump link on a phone, and that none of it
  changes the saved state.
- Manual script with a mid-campaign save (level 3, in Ashford Crossing, one
  choice waiting) at 1440x900, 390x844 and 320x740, repeated with letter-spacing
  1.2px as a stand-in for wider browser text: no element past the right edge on
  Party, Journal or Prepare.

Limits: Firefox and Windows were not run locally (CI runs them). The screens
were looked at with a level-3 fighter only; a high-level hero, a renown boon
choice and an AI-written adventure with the difficulty picker were not looked at
on screen.
