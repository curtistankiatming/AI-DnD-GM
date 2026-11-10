# Play screens, step 3: the one-screen combat board (10 November 2026)

Third of four redesign steps from the play-screen review. Steps 1 and 2 merged as
PRs #17 and #21. This step changes presentation only: the engine still supplies
every fighter, action, target and hit chance, and the same
`{type:'combat', actionId, targetId}` actions are sent. No rules, save format,
API payload or model prompt changed.

## What changed

- **One board instead of a long page.** A fight now shows, top to bottom: the
  turn order as a strip of name tokens (enemies red, party green, whose turn it
  is in bronze, the fallen struck through), enemies as cards, your party as
  cards, your actions, then one footer row with Orders, End Turn and Retreat.
  On a 1440x900 laptop the whole board fits without scrolling.
- **Health is a bar.** Every fighter card has a health bar, hit points, armour
  and short condition names (the full wording with its expiry is the tooltip).
- **Tap a target on the board.** Your weapon is ready by default, so each living
  enemy card is a button showing the engine's hit chance ("83% to hit"). Picking
  Brace, a potion or an order moves the targets to the party or enemy row. The
  separate "Choose target" pop-up is no longer used in a fight (it is still used
  for equipment and for items outside a fight).
- **What just happened sits beside the board.** During a fight the latest
  result (your choice, the roll chips, damage and the prose) is shown in a
  column to the right on a laptop and above the cards on a phone. It returns to
  the story column when the fight ends. After each action the board, not just
  the result, scrolls into view.
- **Enemy rolls are coloured from your side.** An enemy's hit is red and an
  enemy's miss is green. The engine marks any hit as good; the display now
  flips that for attackers on the enemy team.
- **Retreat** is a quiet link at the end of the footer and still asks first.
- The party panel from step 2 and the story text are hidden during a fight,
  since the board shows the party itself.

## How it is built

`public/combat-board.js` (new) wraps `renderCombat` and `chooseCombatAction`
after `management-ui.js`. It keeps the existing `#combatActions` buttons, their
groups and their order (tests still count one button per engine action, with
Retreat last) and adds `#combatOrder`, `#combatEnemies`, `#combatParty` and
`#combatLog`. Styles are the "Step 3" block in `public/adventure.css`. The
script is listed in `scripts/build-public.js` so the single-file build has it.

## Not in this step

- On a phone the board is taller than one screen (about two), because the
  message box and the tabs take the lower third. The result, enemies, party and
  actions are in that order.
- Action tiles show the engine's description, clipped to two lines. Shorter
  authored summaries per action would read better but are content, not layout.
- Party, Journal and Prepare layouts are step 4.

## Verification

Source: branch `claude/project-thread-wob5kj` on top of master `eec4c0f`.
Runtime: Node 22, Chromium (Playwright) in a Linux container. No model or paid
API was called; the game ran with the AI off and an OS temporary `SAVE_DIR`.

- `npm run check`: 89 JavaScript files syntax-checked.
- `npm test`: 546 passed, 0 failed (one new test: the board script ships in the
  served page and the single-file build, after the scripts it wraps).
- `npm run playtest` and `npm run fuzz`: completed without failures.
- `npm run build:public`, then
  `python3 tests/browser_smoke.py --engine chromium --target all`: all targets
  passed, including the new `exercise_combat_board` in `tests/story_browser.py`.
  That is real browser interaction: it reaches the first fight through story
  choices, checks the cards and bars against `view.combat`, checks each enemy's
  hit chance against the engine's number, arms Brace without changing state,
  attacks by tapping an enemy with no pop-up, checks End Turn is in view at
  1440x900, checks nothing passes the right edge at 390px and 320px, and
  retreats.
- Manual script at 1440x900, iPhone 13 size and 320x740: start of the fight,
  arming Brace, an attack, a full round. Repeated with letter-spacing 1.2px as a
  stand-in for wider browser text: no element past the right edge.

Limits: Firefox and Windows were not run locally (CI runs them). Only the first
story fight and its actions were exercised by hand; encounter objectives and
higher-level abilities use the same tiles but were not looked at on screen.
