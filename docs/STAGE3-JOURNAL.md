# Stage 3 — durable campaign journal

This stage builds on the independently validated alpha2 integration (Stage 1)
and Lantern Road adventure (Stage 2). The journal is available in both the local
server and offline browser editions. It does not require a model, database,
account, telemetry, or a background service.

## What the player receives

A collapsible **Campaign journal** groups the current objective, unresolved leads,
promises, rumors/reports, relationships, verified facts, completed adventures and
player notes. It distinguishes the bystander’s unverified bandit claim from the
confirmed axle-inspection result; it does not reveal that result before discovery.
It also remembers chosen regional aftermath decisions, discovered campaign clues,
companion personal requests and the medicine-delivery follow-up gift.

Chat questions such as **What did we promise?**, **Why does Tamsin trust us?** and
**What were we doing?** use these records without a model call. `/journal` gives a
short recap. `/note text` adds an explicitly unverified player reminder;
`/forget-note note-1` removes that reminder. The panel has equivalent controls.
There are twelve note slots, each limited to 400 characters. A full notebook rejects
additional notes instead of deleting older notes silently. Exact duplicates are
not added twice. Notes cannot grant an item, declare a promise kept or change a roll.

## Authority and continuity

`src/journal.js` rebuilds its displayed records from the saved engine fields:
`story.clues`, chosen consequence flags, completed quests, companion bonds and
personal requests, the courier’s resolved checks, and the Lantern Road state.
It never mines generated prose, recent chat, or an AI-written summary for facts.
The computed journal is also included in saves. On load it is reconciled with
canonical fields rather than trusting an imported journal’s claimed facts.

This works after recent chat/history is pruned and allows older compatible saves
without a journal to acquire one. It is **not anti-cheat**: a user editing the
underlying game state can change an offline single-player campaign. No official
server-side authority, cross-device account, or cloud-save service is implied.

Private player notes stay separate and are excluded from ordinary model prompts.
An explicit question about your notes returns them locally with an unverified
label. Text that looks like HTML is displayed with textContent, not rendered as
markup. No journal import executes code.

## Model context

Each workload profile receives a bounded selection of durable records. Promises,
rumor status and unresolved leads have priority over optional recalled prose.
Optional journal records are trimmed before necessary combat facts or campaign
instructions. Omission counts are explicit: missing context is not evidence that
an item, relationship or earlier event never existed. The full journal stays in
the save even when a small prompt includes only part of it.

A model can still write a wrong answer. This stage improves the information it
receives; it does not certify Qwen/Gemma/7B output quality or implement unlimited
AI-created worlds. New mechanical facts still need an authored/validated action.

## Validation design

Targeted tests cover long-history pruning, promise and rumor transitions,
forged journal claims, notes vs facts, note limits/removal, old-save migration,
question handling without model calls, bounded context across all three profiles,
regional consequences and courier evidence. Controlled diagnostic fixtures are
not natural player progression.

The browser test uses the actual built file, static HTTP build and Node-server
interface. It checks active/kept promises, one-time follow-up resolution, note
persistence, literal HTML-looking notes, older-alpha2 import and current-save
restore. Standalone/static checks close and reopen an actual temporary on-disk
browser profile. Windows Chromium and Ubuntu Chromium/Firefox results must be
read from the PR’s hosted jobs; this document does not assert pending tests passed.

Successful test traces are deleted after screenshots and summaries are collected;
failure traces remain available. Transient toasts are capped at three to avoid
covering the mobile screen during rapid actions. Neither change alters gameplay.

## Correction found during this stage

The all-profile campaign-context sweep found one final Bard encounter that
exceeded Compact after adding durable journal metadata. A new regression first
reproduced that failure. The adapter now omits old clue names, with an explicit
count and warning, before rejecting a current-combat question. It retains current
actors, conditions, resource counts, action availability and preferences. The
corrected sweep covered 523 combat states across all three profiles (1,569
requests) without exceeding a default budget. This is prompt construction testing,
not an actual 7B/12B/27B model benchmark.
