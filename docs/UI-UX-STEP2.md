# Play screens, step 2: the story screen (10 November 2026)

Second of four redesign steps from the play-screen review. Step 1 (wording, one
header, phone layout, Retreat confirmation) merged as PR #17. This step changes
presentation only: no rules, save format, API payload or model prompt changed.

## What changed

- **The latest turn reads as a book.** Under the scene title the screen now shows
  what you chose (italic line), the dice as a chip (die face, the sum, the target
  and Success/Failure/Hit/Miss), small pills for clues, items, damage and bond
  changes, then the prose. Sentences the chips already show are left out of the
  visible prose.
- **The saved narration is untouched.** `#narrationText` still holds the exact
  narration text (now visually hidden, read by screen readers and tests). The
  visible copy is `#storyProse`. `public/app.js` only gained `lastEvents`, the
  events of the action whose narration is on screen.
- **Party panel on wide screens** (1100px and wider, taller than 650px): health
  bars, level/role and armour, Second Wind, Inspiration, hit dice, gold and
  experience. It opens the Party screen when clicked. Narrower screens keep the
  party strip from step 1.
- **Choices** show the action and its description on the left and the odds large
  and coloured on the right. "Take short rest" sits under the choices.
- **Phone:** the five section tabs moved to the bottom edge.
- **Look:** new colour tokens in `public/styles.css` (pine ink background,
  parchment text, bell bronze for actions, verdigris for party and success,
  briar red for danger) and the Alegreya / Alegreya Sans typefaces.

## Fonts

Six Latin-subset `.woff2` files (about 142 KB in total) are in `public/fonts/`,
taken from the `@fontsource/alegreya` and `@fontsource/alegreya-sans` 5.3.0
packages. Both families are under the SIL Open Font License 1.1; the notices are
in `public/fonts/OFL.txt`. The project's own licence is unchanged. `server.js`
serves `.woff2`. The single-file public playtest carries no font files, so
`scripts/build-public.js` drops the `@font-face` rules and that build falls back
to the system serif and sans fonts.

## Not in this step

- Act / Say / Ask buttons are still there. Working the mode out from the typed
  text changes how messages are interpreted, so it needs its own decision.
- The tab is still called "Adventure" and the Prepare/Settings tabs are unchanged.
- Other screens (Party, Journal, Prepare, combat board) only picked up the new
  colours and type. Their layouts are steps 3 and 4. Many one-off colours in
  `styles.css` are still the old blue-grey.
- In a fight, an enemy's successful attack shows "Hit" in the success colour,
  because the engine marks any hit as good. The combat board (step 3) should
  colour by side.

## Verification

Source: branch `claude/project-thread-wob5kj` on top of master `1376e01`.
Runtime: Node 22, Chromium (Playwright) in a Linux container. No model or paid
API was called; the game ran with the AI off and an OS temporary `SAVE_DIR`.

- `npm run check`: 83 JavaScript files syntax-checked.
- `npm test`: 532 passed, 0 failed.
- `npm run playtest` and `npm run fuzz`: completed without failures.
- `npm run build:public`, then
  `python3 tests/browser_smoke.py --engine chromium --target all`: file and
  server targets passed, including the new `tests/story_browser.py`
  (real browser interaction: chips after a rolled choice, visible prose without
  the roll sentence, saved narration unchanged, party panel at 1440px, bottom
  tabs and no sideways scrolling at 390px and 320px).
- Manual script at 1440x900 and iPhone 13 size: opening scene, a choice, a
  fight, Retreat cancel and confirm, a typed message, all five tabs.
- Narrow check at 320px with letter-spacing up to 1.2px (stand-in for wider
  browser text): no element past the right edge on any tab.

Limits: Firefox and Windows were not run locally (CI runs them). The typed
message flow with Claude answering was not exercised (no API key here), so the
chips for AI-narrated turns were checked only through the offline narration path.
