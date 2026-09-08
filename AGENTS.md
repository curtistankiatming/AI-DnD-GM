# AI-DnD-GM working rules

- Read README.md and the latest review under docs/ before changing gameplay.
- Use a dedicated review branch. Do not merge, rewrite shared history, change
  visibility/licensing/protection, or deploy without Curtis's explicit approval.
- Rules and authored content determine game facts. Narration is presentation;
  never delegate dice, inventory, XP, hidden knowledge or scene transitions to it.
- Preserve offline operation and the dependency-free runtime. Do not turn on a
  paid or external model for validation; use isolated local mocks.
- Keep save schema compatibility explicit. Use an OS temporary SAVE_DIR for all
  HTTP tests; never touch real saves or include them in commits/releases.
- Playable content is levels 1–10. Levels 30/70 are future advancement milestones,
  not implemented campaigns. Do not replace content depth with inflated XP.
- Before a fix, reproduce it in a targeted regression test. Run `npm run check`,
  `npm test`, `npm run playtest` and `npm run fuzz` after changes.
- Distinguish actual browser interaction, public-view scripted campaign policies,
  controlled fixtures and simulations. Fixtures must not be called natural play.
- Do not overwrite historical reports with new claims. New reports must identify
  the tested source, runtime, commands, counts and limitations.
