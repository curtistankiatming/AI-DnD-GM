# UI/UX Batch 2 — story-first workspace

This feature follows merged PR #9. Consult this batch's pull request for its
current approval, tested revision, hosted results and publication status. A
review branch does not update the public release or an installed game.

## Player flow

The five destinations are Adventure, Party, Journal, Prepare and Settings.
Adventure keeps the current objective and party health near the story, brings
recent conversation and the latest response together, and keeps the message
composer separate from the scrollable story. Available approaches and confirmed
dice/events remain accessible without hiding the explicit combat controls.
A duplicate latest guide/rules line is hidden only from the transcript display;
no stored conversation is deleted or promoted into a verified fact.

Act, Say and Ask are visible single-choice controls. Their meanings are the
existing Action, Dialogue and Question modes. Interpreted actions still require
confirmation. Campaign instructions have a separate labelled editor: Save replaces,
blank clears, Cancel/Escape does not save. The ordinary unsent message and its
mode are preserved. The editor uses the existing validated instruction action,
not a new model request. Slash commands remain supported by the existing engine.

Journal contains the durable campaign records plus the original clues/history.
Filters show leads, evidence/rumors, promises, people, notes and completed records.
These are display filters, not changes to the knowledge model. Notes stay
unverified; uncertain rumors stay uncertain. The existing note capacity remains.
Party and Prepare reuse the current character/equipment/service controls; Batch 3's
management redesign and new game mechanics are not included.

Settings holds saves, local AI configuration, reading-size preferences, and the
offline edition's export/import/sandbox tools. Setup retains Continue/Load and
moves its offline tools into a disclosure. Batch 1's campaign-specific Quick Save,
replacement warnings, save-error protection, read-only waits and draft retention
remain required regression coverage. A UI preference is not a campaign save.

## Keyboard and responsive behaviour

Section tabs and message-mode controls support Left/Right, Home and End, with a
single tab stop and visible selection/focus. Panels have names and relationships.
A skip link leads to Adventure. The instructions editor is a native modal. Existing
setup and targeting dialogs gain focus entry/containment/return and an inert
background. Ctrl/Cmd+S does not save behind an open modal. Escape cancels a target
or returns from setup when an existing adventure can be resumed; it does not
create a character or confirm an action.

The layout keeps the composer in its own grid row on ordinary-height viewports;
short screens use natural scrolling rather than a fixed overlay obscuring content.
Larger reading text and reduced-motion preferences are supported. A reader away
from the recent response gets a jump-to-latest control rather than an unsolicited
focus jump. These behaviours require actual browser checks, not only CSS inspection.
Automated viewport widths are not proof of physical phone-keyboard or screen-reader
compatibility; those remain separate acceptance tasks.

## Validation and boundaries

The normal tests include pure display-policy checks. Browser smoke exercises the
actual five destinations, keyboard controls, draft retention, instruction editing,
journal filters, target-modal focus, narrow/short views and reading size, alongside
the existing save/journal/repair regression flow. Delayed-model and response-routing
tests use synthetic loopback services only. No actual Qwen quality result follows.

Run `npm run check`, `npm test`, `npm run playtest`, `npm run fuzz`,
`npm run build:public`, and the existing browser smoke command. The offline build
embeds the new assets and retains its no-network content-security policy. The
rules, server API, save schema, model prompts/settings, evaluator scoring, version,
dependencies and final CI workflows are unchanged by this batch.

Design reference: W3C APG tabs and modal-dialog patterns:
https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
These inform the implementation; no blanket accessibility certification is claimed.
