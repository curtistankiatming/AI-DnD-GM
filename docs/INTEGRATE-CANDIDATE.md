# Integration and validation history

**Integration is complete for PR #4 and PR #5.** The default development branch is
`master`; the older `main`/`public-testing` branches are not the current baseline.
See [Current status](CURRENT-STATUS.md) for the dated master/release snapshot.
These names do not authorize deletion or rewriting of old branches.

## Sequential evidence

| Stage | Tested review head | Hosted validation |
| --- | --- | --- |
| Alpha.2 integration | `0611af7074f27bb920852258983a5d7938e4d7d9` | [34562198820](https://github.com/curtistankiatming/AI-DnD-GM/actions/runs/34562198820) |
| Lantern Road | `e1bb9f5731f449ede5d39b672fc4e57725385fc5` | [34563544179](https://github.com/curtistankiatming/AI-DnD-GM/actions/runs/34563544179) |
| Final journal | `672205bcc365998f8345b5f82f0cb009b8ec2908` | [34609171882](https://github.com/curtistankiatming/AI-DnD-GM/actions/runs/34609171882) |
| Shared evaluator v1 | `723252012bec33fb28a2a6a19fe12da23e496d0c` | [34622959879](https://github.com/curtistankiatming/AI-DnD-GM/actions/runs/34622959879) |

Each stage passed its own eight hosted jobs. PR #4 merged at
`9a9122fefd77f862340b05321ec8dc4c7fa54127`; PR #5 merged at
`6978757638845b807000fad205b1eea74797b286`. The latter's
[post-merge validation/publication](https://github.com/curtistankiatming/AI-DnD-GM/actions/runs/34702058328)
also succeeded. No unresolved source-transfer or final-journal gate remains.

Hosted browsers navigated the built file, static HTTP edition and local-server
UI. The file/static targets closed and reopened real temporary disk profiles;
the Node UI used an isolated SAVE_DIR and was tested in-session. Earlier local
memory-backed harness results are not the basis for those restart claims.

One-time transfer workflows/branches were used during source integration. They
are not part of the game source, its review commits or release package. Historical
reports describing those temporary procedures are not instructions for players.

## Reproduction and future review boundary

Run `npm run check`, `npm test`, `npm run playtest`, `npm run fuzz`,
`npm run build:public`, and `npm run eval:mock`. For browser checks, install
`tests/browser-requirements.txt` and the appropriate Playwright browser, then run
`python tests/browser_smoke.py --engine chromium --target all`.
`tests/long-wait-check.js` uses roughly ten minutes of loopback fixtures; it is not
part of ordinary fast tests. `tests/combat-context-policy.js` checks prompt sizes,
not actual model performance. Live inference is not part of CI.

Use dedicated review branches for future edits. Run source-specific checks and
obtain Curtis's approval before merging/publishing or changing repository policy.
Keep saves, local settings, tokens and profiles private. Existing release assets
are retained; documentation cleanup does not replace them in place.
