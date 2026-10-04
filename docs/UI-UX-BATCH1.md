# UI/UX Batch 1 — save safety and immediate usability

This review-branch change builds on the published PR #8 source at
`e0d58f82e9d3f5a494d513166a0da14cd9268ae4`. See the associated PR for the
final head and validation results. It does not update existing installations.

## Player-facing changes

Quick Save and Ctrl/Cmd+S now use the active campaign's destination, not an old
last-used preference. New campaigns and imports receive a fresh suggested name;
loading a named save binds Quick Save to that slot. Loading a rolling autosave
instead offers a separate named destination. The destination and whether the
current state differs from the named checkpoint are displayed above the game.
Save As remains separate and is confirmed before replacing another campaign,
a changed on-disk checkpoint, or an unreadable file. Cancel leaves it untouched.

Opening New campaign keeps the current adventure in memory. Return to current
adventure closes setup without replacing it. Begin, Load, Import and Sandbox
check for unsaved progress/conversation or an unsent draft before replacing it.
Save and continue must finish successfully; failed saves keep the old campaign
open. Discard is explicit. Draft text is not saved into campaign files, and the
warning explains that. New browser campaigns also warn before overwriting a
rolling normal autosave when no campaign has been loaded yet.

Continue and Load are available directly in setup, not hidden inside an active
campaign. Corrupted saves remain listed and are never silently deleted. Deleting
a saved file requires confirmation that names its slot, character and level.
Deleting the active checkpoint does not delete the on-screen character; it makes
that character unsaved again. Normal and sandbox naming separation is retained.

While a model request is running, gameplay-changing controls, sending, saving,
loading, deleting and model-setting edits remain blocked. Information tabs,
skills and read-only item inspection stay usable. The message box accepts a
new draft but does not queue or send it; completion/errors do not overwrite a
new draft. The wait notice identifies the displayed state as the last confirmed
facts and explains that cancelling narration cannot undo a resolved action.

Rejected requests stay near the input and in the transcript/mechanics feed,
without replacing the current story card or its saved presentation. When a
confirmed action's narration fails, the story card keeps the canonical result
and the failure notice stays separate. Empty choice panels explain the actual
combat, journey, epilogue or unavailable-choice state rather than claiming every
empty panel means combat is active.

## Boundaries

This is UI protection for a trusted local single-player application, not a
transactional multiplayer save service or a guarantee against simultaneous writes
from multiple processes or external tools. The UI rechecks the chosen destination
before writing; the underlying existing save API remains unchanged. Do not expose
the game server publicly. Named saves, rolling autosaves and exported JSON backups
are different: keep exported backups before updating or clearing browser data.
Browser close warnings depend on browser support and are not a backup mechanism.

No save schema, rules, XP/economy, authored story, AI prompt, evaluator scoring,
Bionic setting, model, output allowance, timeout or dependency is changed. The
native confirmation dialog has a Cancel default and Escape cancellation. The
larger adventure layout, unified journal, mobile navigation redesign and equipment
management redesign remain later batches.

## Validation

Run the standard syntax, test, campaign, fuzz and public-build commands. New unit
checks exercise the actual session controller with isolated storage and the
actual UI handlers with a minimal DOM. Neither is labelled real browser testing.
Browser smoke also runs a separate temporary safety profile for each target,
using real controls for save isolation, Save-and-continue, cancellation, overwrite
and deletion warnings, Continue, contextual messages and item inspection. The
server target uses an explicitly synthetic local model to hold a reply while
checking read-only navigation and draft preservation. A deliberately failed save
response tests that replacement is stopped. No actual model or personal save is
used. Existing journey, import, journal and disk-profile restart checks remain.

The PR records source identity, exact results and any environment limitations;
mocked replies cannot establish real Qwen quality or speed.
