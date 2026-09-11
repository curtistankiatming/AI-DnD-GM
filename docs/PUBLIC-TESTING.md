# How to try the public development build

Download **briarwatch-browser-playtest.zip**, extract it, and open **briarwatch-playtest.html** in a modern desktop browser. No Node.js, API key, account or online model is needed. This is an unfinished public playtest, not a stable release or a full official D&D rules implementation.

The browser edition runs the actual local rules/content entirely on your device. It uses deterministic narration. No game state, names, dialogue or model credentials are sent to a shared backend. The hosting/download provider can still receive ordinary web request information; the game itself includes no telemetry.

## Normal play and sandbox testing

Start a normal level-1 campaign to evaluate progression. Or expand **Sandbox checkpoints**, choose your class on the setup screen, choose a level/scenario, and create a test character. A scenario can increase the level to its minimum. Sandbox grants are explicit: XP, supplies, 400 gold and prerequisite story flags. Choose pending class rewards and depart through the town expedition board. Do not describe these fixtures as earned progression.

Playable content ends at level 10 with the first advancement and its follow-on expedition. Level-30/70 systems remain future plans. Public testing is not held until the entire game is finished.

## Saves and feedback

Export a JSON save before closing, updating or changing browsers. Import accepts compatible V4 saves. Browser storage depends on browser profile, origin and file location; private browsing or clearing site data may remove it. If storage is unavailable, play remains possible and the UI warns you to export. There are separate sandbox/normal autosaves. Named saves are not deleted by switching modes.

**Export bug report** produces build/class/level/scene/browser details without a character name, history or full save. You choose whether to submit it. GitHub feedback is public: review attachments and never post private data or keys.

This alpha candidate fixes Orin's higher-level short-rest capacity issue. Remaining limitations: expeditions reuse a structural rhythm; the new ferry scenario is bounded; browser narration is not an AI model. Ordinary progression and combat remain subject to ongoing balance work.

The source ZIP is optional and requires Node.js 22+ to run the local server. It is not required for browser play. The public download is not a hosted click-to-play website. Never expose the local unauthenticated server just to let people test.
