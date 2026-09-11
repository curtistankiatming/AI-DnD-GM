# Integrating the alpha.2 review candidate later

This document is for the development session handling the repository, not a requirement for the player to perform manual Git work now.

The live baseline read for this package was commit `5e34236c4c840ab512912f05e3a5ccbfbda7b12f`, tree `1698292f99770a45c3eaa45214bee3055af53eb7`. The local reconstruction commit in the testing environment is synthetic; it must not be mistaken for that remote commit.

Use a clean review branch based on the verified remote baseline, not the public distribution branch. Recheck remote state first. Apply the provided patch with `git apply --check` before applying it; do not force over intervening changes or existing local work. The complete source ZIP is an alternative, not a second patch to combine blindly.

`REVIEW-CHANGES.patch` is the cumulative source delta from the baseline above to
alpha.2. `ALPHA1-TO-ALPHA2.patch` is an alternative delta from the alpha.1 source
candidate tree `303f9217e7daebf75a9c9150a75b84f35297d96d` to alpha.2. Apply only the
one appropriate patch. Packaging-only files (manifest, patches, browser-preview)
are not Git source inputs. Do not apply a patch to this already updated source.
Both patch routes were roundtrip-verified when this package was assembled.

Run `npm run check`, `npm test`, `npm run playtest`, `npm run fuzz`, and `npm run build:public`. For browser testing install `tests/browser-requirements.txt` into a dedicated test environment, install the selected Playwright browser, and run `python tests/browser_smoke.py --engine chromium --target all`. This test uses OS-temporary browser profiles/settings/saves and does not contact a real model. A blocked or failed browser check must be reported honestly.

The supplemental command `node tests/long-wait-check.js` is an opt-in real-duration
loopback check that takes about ten minutes. It is not part of every unit-test run.
`node tests/combat-context-policy.js` builds contexts at actual scripted-campaign
combat snapshots across the three profiles; it does not run any real model.
Use output environment variables documented in these scripts to keep evidence out
of source directories. Test-only simulated services are isolated on loopback.

The proposed workflows add browser validation and require the reusable validation workflow before publishing. The existing public-release ZIP is extracted and browser-tested before publication. The workflow should receive a real hosted run after integration; its initial definition is not evidence of success. GitHub writes, hosted CI, deployment and merging did not occur in the authoring session.

Keep `.local-ai.json`, `.env`, authentication tokens, personal saves and browser profiles out of Git. The app accepts an exact local model ID selected by its user, never an automatic model download/swap. The existing public browser edition continues to operate without live AI.

Do not merge or publish changes without the owner's required review/approval process. Do not rewrite shared history, alter the license, enable paid services or expose the user's local server.
