# AI-DnD-GM working rules

- Read README.md and the latest review under docs/ before changing gameplay.
- Use a dedicated review branch. Do not merge, rewrite shared history, change
  visibility/licensing/protection, or deploy without Curtis's explicit approval.
- Rules and authored content determine game facts. Narration is presentation;
  never delegate dice, inventory, XP, hidden knowledge or scene transitions to it.
- Direction (Nov 2026): Claude API is the primary AI provider; the goal is an
  open-ended AI GM. Offline/browser play must keep working without AI. The only
  runtime dependency is `@anthropic-ai/sdk`, loaded lazily by `src/claude-ai.js`.
- Claude-authored content (improvised actions in `src/improvise.js`, generated
  adventures in `src/director.js`) supplies story and choices only. Every number
  (DCs, enemy stats, XP, gold, reputation) comes from engine formulas, and saved
  generated content is re-bounded on load.
- Tests and CI never call the paid Claude API or a real model: inject a fake
  client (see `tests/claude-ai.test.js`) or use isolated loopback mocks.
- Authored content lives in `src/data/*.json`. Edit the data, not the loaders;
  `tests/content-data.test.js` checks that every reference resolves.
- Keep save schema compatibility explicit. Use an OS temporary SAVE_DIR for all
  HTTP tests; never touch real saves or include them in commits/releases.
- Authored content is levels 1–10; the cap is 100, reached through AI-directed
  adventures. XP rewards are shares of the current level (`src/xp.js`); growth
  past level 20 is bounded (proficiency +6, enemy AC/attacks/DCs stop at their
  level-20 values). After 100, XP earns renown ranks with capped boons
  (`src/progression.js`). Job skills (class mastery at 10, 1st-job skills at
  13/16, three 2nd-job branches per class with skills at 20/25/30/35) are data
  in `src/data/jobs.json`, built from effect primitives that
  `resolveJobAction` in `src/combat.js` runs; flat attack/AC/save bonuses are
  capped by `BONUS_CAPS`. Do not replace content depth with inflated XP or
  uncapped bonuses.
- Before a fix, reproduce it in a targeted regression test. Run `npm run check`,
  `npm test`, `npm run playtest` and `npm run fuzz` after changes.
- Distinguish actual browser interaction, public-view scripted campaign policies,
  controlled fixtures and simulations. Fixtures must not be called natural play.
- Do not overwrite historical reports with new claims. New reports must identify
  the tested source, runtime, commands, counts and limitations.
