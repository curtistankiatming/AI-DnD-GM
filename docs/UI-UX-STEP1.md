# UI/UX redesign, step 1: wording and room for the story

Curtis chose "Step 1 first, then review" on 2026-11-10 after the play-screen
review. Base: `ae8ffa0` (master after the engine split, PR #14). This is a
review branch; it does not update an installed game or authorize publication.
Only files under `public/` and the browser tests changed. No rule, save field,
API payload or model prompt changed.

## What changed

- One slim header. The title bar, the save-status bar and the tab row are now a
  single bar. Save state is a dot with "Saved" or "Unsaved changes"; the save
  name is a tooltip and stays in the text for assistive technology. The
  narrator badge moved to Settings.
- The scene header is one compact block: act, title, goal, and each party
  member's health as a number with a bar. The two shortcut buttons are gone.
- The story, choices and fight sit in one centred reading column with larger
  story text. Odds on a choice are larger; the roll line reads
  "Aster rolls Insight +1 against 11".
- The message box is one line that grows as you type. Enter sends and
  Shift+Enter starts a new line. Act, Say and Ask sit beside it and the
  placeholder changes with the mode.
- After you click a choice, a combat action or a confirmation, or send a
  message, the new story text scrolls into view. Previously the view stayed
  where it was and offered a "jump to latest" button.
- Retreat now asks first ("Keep fighting" / "Retreat") and shows its cost. It is
  the last combat button, after End Turn, where it used to be the first.
- Plain wording replaces audit-style labels, for example "Roll history" for
  "Dice & confirmed consequences" and "Yes, do it" for "Confirm chat action".
  The "No attributable contribution" note on companion cards is removed.
- Fix: the expedition board's "Ask the GM for a new adventure" button called
  `BriarwatchChat.adventure`, which a later assignment had dropped, so the
  button did nothing. It is exported again.

On a 390 x 664 phone screen the opening narration was entirely off screen; it
is now visible without scrolling, and the scrolling story area grew from about
240 px to about 400 px. On a 1440 x 900 laptop it grew from about 300 px to
about 620 px.

## Verification (2026-11-10, Linux container, Node 22, Chromium via Playwright)

- `npm run check`: 82 files syntax checked.
- `npm test`: 529 passed, 0 failed.
- `PLAYTEST_RUNS=1 npm run playtest`: 54 of 54 scripted campaigns completed,
  0 engine errors. This is a scripted public-view policy, not natural play.
- `FUZZ_CASES=80 FUZZ_STEPS=60 npm run fuzz`: no failures.
- `npm run build:public` then `python tests/browser_smoke.py --engine chromium
  --target all`: file, static and server targets passed, including the
  workspace, safety and management browser checks updated in this change.
- Manual browser pass at 1440 x 900 and iPhone 13 size: opening scene, a
  choice, a fight, an attack, cancelling and confirming Retreat, a typed
  message, and each tab.

## Limits

- Firefox and Windows were not run locally; CI covers them.
- No Claude API key was available, so the typed-message flow was seen only in
  its offline state.
- Combat, the party sheet, the journal and the town screens keep their old
  layouts. They are steps 3 and 4 of the redesign.
