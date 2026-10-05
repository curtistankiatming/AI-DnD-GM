# UI/UX Batch 3 — management and preparation

Curtis approved initialization after merging PR #10. This is a separate review
feature; initialization does not authorize its merge or publication. Base:
`2edc8917457153cca1eb27dc4a32d17e704f1517` (published Batch 2).

## Checkpoints

- Party equipment: consistent member selector and four slots, ownership labels,
  side-by-side numerical comparison using engine-supplied values.
- Inventory: search and category filters; explicit consumable/tool/material/quest
  purpose and availability. Inspecting/filtering never equips, buys or uses items.
- Preparation: health, conditions, remaining resources, pending development and
  known expedition warnings. No hidden threats, readiness score or forced purchase.
- Combat: grouped existing actions, current turn/resources, visible disabled
  reasons. Preserve explicit targeting and End Turn; do not invent mechanics.
- Progression: persistent earned/next/pending overview and a confirmation preview
  for permanent specialization. Level-30/70 remain clearly future plans.
- Companion contribution visibility: only supplied confirmed mechanics, never
  model narration or guessed attribution. No fabricated turns or combat activity.

## Acceptance and boundaries

Preserve Batch 1 save/overwrite/replace protections and read-only model waits,
Batch 2 navigation/composer/journal/focus controls, offline no-network operation,
existing model prompts/settings, game state and save schemas. Use the current
vanilla JavaScript/CSS and no new runtime dependency or external service.

Each checkpoint needs focused tests plus existing test/build/campaign/state and
real-browser regressions. Model mocks are not model-quality results. Actual-device
and live Qwen acceptance remain separate. Preserve old reports and record final
source/run identities in the PR. Work not yet implemented must remain labelled
pending, not declared complete because this planning checkpoint exists.
