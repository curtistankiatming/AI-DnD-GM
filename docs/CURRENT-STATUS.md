# Current development and release status

Status snapshot: **13 September 2026**, checked against GitHub. This page records
the post-PR #5 baseline below; dated validation reports remain historical evidence.
Curtis approved the housekeeping validations and requested a further check on
13 September. [PR #6](https://github.com/curtistankiatming/AI-DnD-GM/pull/6) records
the final recheck, merge outcome and any subsequent publication. Consult that PR
and [Releases](https://github.com/curtistankiatming/AI-DnD-GM/releases) for later
housekeeping snapshots. Documentation edits do not rewrite older release assets.

## Verified post-PR #5 baseline (before housekeeping integration)

| Item | Verified state |
| --- | --- |
| Game version | 4.1.0-alpha.3 |
| Evaluation suite | 1.0.0; 13 synthetic cases |
| Default development branch | `master` |
| Post-PR #5 baseline commit | `6978757638845b807000fad205b1eea74797b286` |
| Source tree at that commit | `c0863f81814312ea5e0a82a28384577177968fb5` |
| PR #4 | Merged 11 September; chat foundation, Lantern Road, journal and fixes |
| PR #5 | Merged 12 September; shared local-model evaluator, no runtime gameplay change |
| Post-PR #5 public release | Published 12 September, `playtest-6978757638845b807000fad205b1eea74797b286` |
| Issue #2 | Companion-rest fix merged through PR #4; closed with evidence 13 September |

The same game version occurs in more than one release because evaluation tooling
has its own version and documentation-only snapshots do not change gameplay.
Use the commit suffix and build metadata as well as the name. Repository edits
never update a user's local installation automatically.

## Direct evidence

- [Merged PR #4](https://github.com/curtistankiatming/AI-DnD-GM/pull/4): merge
  `9a9122fefd77f862340b05321ec8dc4c7fa54127`; final journal validation
  [34609171882](https://github.com/curtistankiatming/AI-DnD-GM/actions/runs/34609171882).
- [Merged PR #5](https://github.com/curtistankiatming/AI-DnD-GM/pull/5): merge
  `6978757638845b807000fad205b1eea74797b286`; evaluation validation
  [34622959879](https://github.com/curtistankiatming/AI-DnD-GM/actions/runs/34622959879).
- [Post-PR #5 validation and packaging](https://github.com/curtistankiatming/AI-DnD-GM/actions/runs/34702058328):
  completed successfully, including the packaged-browser check.
- [Published post-PR #5 browser/source downloads](https://github.com/curtistankiatming/AI-DnD-GM/releases/tag/playtest-6978757638845b807000fad205b1eea74797b286).
- [Companion recovery issue and closure evidence](https://github.com/curtistankiatming/AI-DnD-GM/issues/2).

PR #5's recorded suite contains 297 passing tests. Its eight hosted jobs cover
Windows/Linux with Node 22/24, simulated evaluation, campaign/state checks, and
Windows Chromium plus Ubuntu Chromium/Firefox. Nine browser/format combinations
and six actual disk-profile restarts were verified. Restarts cover standalone and
static browser targets; local-server UI was tested in-session, not after a full
server restart. These counts belong to the identified revisions/runs, not every
future commit. Simulated responses do not certify any actual model.

## What remains

Live Qwen/Gemma/smaller-model quality, latency, sustained sessions and the user's
Windows launchers still need testing. Broader improvised actions/adaptive story
creation, final balance and content variety, local-server restart coverage, and
click-to-play hosting remain work. Playable content ends at level 10 after the
first advancement and follow-on expedition; levels 30/70 remain future plans.
Public browser play is model-free. Local AI is optional, loopback-only and has no
automatic paid fallback. This is not an unrestricted AI world or full official D&D.

## Reading older documents

`TEST_REPORT.md`, `BALANCE_REPORT.md`, `FEASIBILITY.md`, `UPGRADE_NOTES.md`,
`CANDIDATE-BASELINE.json`, `reports/`, and dated review/validation documents retain
their original scope. Pending/unmerged statements in old reports describe that
historical revision, not today's repository. `docs/CHAT-FOUNDATION.md` describes
the alpha.2 implementation and its then-pending browser checks; final acceptance
is recorded above. Stage 2/3 notes remain design/implementation detail.

Do not overwrite historical measurements, relabel mocked output as live results,
or rewrite old release assets. Use this page for status and the linked runs for
source-specific acceptance. Update it when a new reviewed milestone is promoted.
