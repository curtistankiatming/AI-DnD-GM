# Public preview validation — 8 September 2026

Base: approved PR #1, merged commit `abe8b07e024478c3b23c5afed8679834aeb57f8d`, tree `f98a511488bb9f17bea95fe42fcacb9ef8024866`. The local baseline reconstructed from the prior package matches this Git tree exactly. Public-preview version: `4.0.2-preview.1`. The new adapter does not modify class, encounter, XP, economy or companion rules.

## Locally executed checks

Linux, Node 22.16.0. Baseline: 80 tests passed. Candidate: 93 tests passed, including six full Standard/prepared campaign policies through the browser-only transport to level 10 and the post-advancement completion. These are scripted policy runs, not blind player sessions. The sandbox fixture matrix covers all six classes and every supplied scenario. Additional checks cover exported-save compatibility, spent resources, mode separation, invalid imports, storage failures, no model/network use, self-contained bundling and reproducible source identity.

The existing whole-campaign validation completed 54/54 campaigns (six classes, three difficulties, three routes, one seed), with 12,568 actions, zero engine/action-policy errors, 18 rescue events and 166 setbacks. Randomized validation completed 7,200 actions on 120 controlled fixtures (4,490 accepted / 2,710 rejected), 720 save-normalization checks and zero invariant failures. These are separate from the six adapter campaign tests. High-level sandbox fixtures are diagnostic starts, not naturally levelled characters.

## Browser UI check

Chromium's administrator policy blocked file:// navigation. That policy was not disabled. The actual generated, self-contained HTML was loaded through Playwright `set_content`, with an explicitly injected memory-backed storage fixture. This has no HTTP bridge and does not contact the Node server or an AI model. It validates rendering/actions but not browser disk persistence or the user's actual double-click launch.

The UI run created a normal campaign, exported its JSON file, quick-saved, created a level-10 trial sandbox using visible controls, exported/saved it, resumed the untouched normal autosave and imported the sandbox export through the file picker. It found zero JavaScript errors and no horizontal overflow at 390px width. Actual disk localStorage persistence, mobile Safari and Windows double-click behavior remain untested locally.

## Publishing boundaries

Only the browser build allowlist is embedded; no `.env`, server.js, save directories or environment credentials are included. Network/model calls are disabled for the browser transport, and a content-security policy disallows network connections. This is device-local single-player execution, not authenticated shared hosting, multiplayer or anti-cheat.

The public workflow runs only for master/public-testing pushes or explicit manual dispatch, not fork PR events. Publishing uses the repository Actions token only in the release step. Releases are identified by source commit, marked prerelease, not promoted as a stable latest release, and are not overwritten on reruns. Future unsupported/broken builds do not replace earlier usable releases.

PR #1 is merged. The new preview implementation remains separately reviewable; public availability of a development snapshot is not equivalent to merging it into the default branch. Repository visibility, primary branch naming and licensing have not been changed. Orin's issue #2 is intentionally disclosed and remains unresolved.
