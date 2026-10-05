# UI/UX Batch 3 — management and preparation

Curtis approved initialization after merging PR #10. This is a separate review
feature (PR #11); consult the PR for its final head, checks and approval state.
Base: `2edc8917457153cca1eb27dc4a32d17e704f1517` (published Batch 2).
A review branch does not update an installed game or authorize publication.

## Implemented controls

Party equipment has a member selector and the same four slots for each actor.
Equipping and unequipping use the existing rules handlers. Ownership labels do
not transfer an item, create spare copies, or override combat/wait restrictions.
Compare stats is a separate read-only dialog; the equip-target chooser also shows
before/after tables. Values come from the engine's public comparison. Spell DC
and spell attack entries are equipment bonuses, not the actor's total DC/attack.
Different damage formulas are displayed as formulas, not guessed quality rankings.

Search and category filters cover equipment, consumables, tools, materials and
quest objects. Spare copies only excludes assigned stock. Filters do not delete
items or modify a save. Empty results have Reset filters. Item purpose and existing
context restrictions remain visible. Merchant pricing/buy/sell rules are unchanged.

Prepare starts with last-confirmed health, conditions, hero resource counts,
pending development and existing known-expedition warnings. This is not a victory
probability, mandatory shopping list or disclosure of undiscovered threats. Existing
service sections can be filtered by purpose. A legacy renderer repositioned the
world-service panel on each update; the management pass restores that same panel
to the single Prepare destination instead of cloning controls.

Combat groups the original action buttons into turn/recovery, objectives,
attacks/defense, class abilities, items and party orders/combinations. The engine
still decides availability, costs, targets and turns. Companion cards show the
latest attributable event from the confirmed mechanics feed, or an explicit
no-record message. Narration is not a source of companion actions; this is not a
complete per-companion history and clearing the feed clears that presentation.

Development shows reached/ahead milestones, pending choices and current abilities.
Permanent specialization has a named preview, default Cancel, and explicit consent.
A repeated click or stale confirmation does not queue a second specialization.
The first advancement remains level10; level30/70 are labelled future plans.

## Validation boundary

Normal tests include public-state projection checks and isolated execution of the
actual specialization wrapper. Those wrapper tests are not browser interaction.
Browser management checks use real controls for filters, comparisons, equipment
roundtrip, preparation and practice combat; no campaign state is injected into the
page. A separate server-only specialization test loads an explicitly generated
level10 sandbox save through the ordinary save/load interface, then cancels,
confirms, saves and reloads a choice. That fixture is not naturally earned progress.
All server files are in the smoke test's OS-temporary SAVE_DIR, not user saves.

Retain all Batch1 save/overwrite/replacement and read-only-wait tests, Batch2
navigation/composer/journal/focus tests, actual file/static browser restarts and
the existing integrated server-restart test. Model mocks are not Qwen results.
Physical phone-keyboard, full screen-reader and long-session acceptance remain
separate; no blanket accessibility or model-quality certification is claimed.

The vanilla JS/CSS, source rules, server/save API and schema, model prompts/settings,
token/wait limits, evaluator scoring, dependencies and final workflows are unchanged.
The browser builder embeds the new UI under the existing no-network policy.

Run `npm run check`, `npm test`, `npm run build:public`, `npm run playtest`,
`npm run fuzz`, and the existing real-browser smoke command. Review final run IDs
and evidence on PR #11 before merge; earlier passing runs cover earlier revisions.
