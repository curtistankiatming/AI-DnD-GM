# How to try the public development build

The published 4.1.0-alpha.3 line includes PR #4's chat foundation, Lantern Road
adventure and journal. Full source from the post-PR #5 release also includes the
shared model evaluator. See [Current status](https://github.com/curtistankiatming/AI-DnD-GM/blob/master/docs/CURRENT-STATUS.md)
in the repository for the dated release commit and evidence. This is unfinished
software, not a stable release or a complete official D&D rules implementation.

## Play without a model

From [Releases](https://github.com/curtistankiatming/AI-DnD-GM/releases), download
**briarwatch-browser-playtest.zip**, extract it, and open **briarwatch-playtest.html**
in a modern desktop browser. No Node.js, API key, account or internet is needed
after download. The browser edition runs the local rules/content on your device
and uses deterministic narration. It does not contact your model or a shared AI.
The game has no telemetry; the download/hosting provider can still receive normal
web request information. This download is not a hosted click-to-play website.

## Normal play and sandbox testing

Start at level 1 for earned progression. For testing later systems, expand
**Sandbox checkpoints**, choose the class on setup, then a level/scenario. Grants
are explicit: XP, supplies, 400 gold and prerequisite flags. Choose pending class
rewards, prepare in town and use the expedition board. A scenario enforces its
minimum level. Sandbox outcomes are not evidence of naturally earned progression.

Playable content ends at level 10, first advancement and its follow-on expedition.
Courier at the Ferry and Lantern Road supplement the main campaign. Level-30/70
advancements and unlimited generated worlds remain future work.

## Saves and feedback

Export a JSON save before closing, updating, moving files or changing browsers.
Import supports compatible V4 saves. Browser storage depends on profile, origin
and file location; private browsing or clearing data can remove it. If storage
is unavailable, the UI warns you to export. Normal and sandbox autosaves are
separate; switching modes does not delete named saves.

**Export bug report** produces build/class/level/scene/browser details without a
character name, history, credential or full save. Nothing is submitted automatically.
GitHub feedback is public: review attachments and never post private data or keys.
Testing and development do not depend on receiving public comments.

## Full source and remaining limits

The optional **briarwatch-source.zip** needs Node.js 22 or newer. Use `run-local.bat`
or `npm start` beside `package.json`; no npm install is needed. Enable local AI
explicitly in the game's settings only when a compatible local server is ready.
`EVALUATE-MODEL.bat` offers a confirmed three-prompt test; its results stay local.
The evaluator is not bundled into browser HTML. Real-model quality, speed and
sustained reliability are not certified by the automated simulated tests.

Orin's higher-level short-rest capacity defect is fixed (issue #2). Final balance,
encounter variety and broader improvised chat remain unfinished. Do not expose
the local unauthenticated game server or your model to the internet. No paid
fallback, automatic model switch, or model download is enabled.

New public releases run validation and a packaged-browser check first. Old releases
and their evidence are retained. Editing repository docs does not rewrite an
already-published ZIP or update a user's installed copy.
