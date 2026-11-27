# Full Claude run, 20 prompts every 10 levels (27 November 2026)

Curtis asked for a full AI run on Claude with up to 20 AI prompts every 10 levels
(the earlier limit was 3). Bugs were reproduced before fixing and checked after,
with an independent review. Nothing is merged without Curtis's OK.

## What was played

| | |
| --- | --- |
| Hero | Linnet, Bard, Standard |
| Build | master at fd69d8f (after #123), with Books Three and Four switched on for the test only (`BRIARWATCH_PREVIEW_BOOKS=1`) |
| How | 1,426 game actions through the HTTP API, played by `tests/player-policy.js`, with AI prompts sent through `/api/chat` like the browser does |
| AI | Claude, claude-opus-5-5 at low effort, narration off |
| AI prompts | 144: 20 in every band from 0s to 60s, 4 at level 70 to 71 |
| Kinds | 48 questions, 47 lines to a companion, 43 typed actions (each then rolled or confirmed), 4 side-quest requests, 2 AI job trials |
| Reached | Level 71, all four books, Loremaster at 40 and Keeper of the First Song at 70 |
| Party | Orin, Maren and Nessa (Nessa joined through the story) |

A no-AI dry run of the same hero and driver reached level 71 first with no errors.

**Cost:** 182 Claude calls for the run, about **$10.25**, plus about **$4.18** for
reproducing and checking the fix (60 calls). With earlier runs, about **$36.80** of
the $60 budget is spent.

**Limits:** the run was stopped and resumed twice from its own level-up save (at
level 3 and level 21) to fix the test driver (side-quest requests were sent in the
wrong form, and every companion line went to Maren). Game state carried over; only
the driver's own memory restarted. The tavern never had an empty place (Nessa
joined), so hiring was not tested in this run.

## Results

- No game errors, no failed AI calls, no refused answers. The one failed prompt
  (level 2) was the driver's own mistake, fixed on resume.
- 0 defeats (the last Claude run, a Rogue, had 6).
- All 3 AI side quests were written and played: Wolves at Tallow Fold (7), The Ferry
  at Gannet Ford (12), The Lodging at the North Gate (50). Both AI job trials were
  written and played (40, 70).
- Choices carry forward. At level 40 the trial opens with Dera: "You gave the first
  night you were here. I remember it, if you don't." At level 50, asked about the
  quarry town he grew up in, Orin answers "Don't know a quarry town. Not on any road
  I've walked": he gave that memory up in Book Three.
- Wishes are handled well. "I want to find a chest with ten thousand gold" became a
  real search with honest odds (44%), found nothing big, and later got a gentle no.
  A failed pickpocket at Highpass cost an 18 gold fine, and the next answer
  remembered it.

## Fixed: companions turned their habits into tics

With many more companion lines than before, two habits showed up in nearly every
reply.

- **Maren asked the question back.** Her listed habit is asking questions she
  already knows the answer to. In the run she opened 9 of 10 answers by turning the
  question round: "Do I trust you. You know the answer", "Which part do you mean,
  Linnet?", "You ask that as though you don't already know."
- **Orin finished a knot before he answered.** "He finishes the knot before he
  answers. He pulls the knot tight and tests it." appeared nearly word for word at
  levels 30, 34, 46 and 65.

**Reproduced:** asking Maren 6 lines live at level 21 gave 6 of 6 answers that
opened by turning the question back. Asking Orin 9 lines live at level 50 gave 8 of
9 with knot or strap business before or around the answer.

**Fix:** the shared companion voice rule (used by chat, narration and the story
director) now says a companion answers in their first line, does not repeat or ask
back the question, and does not hold the answer behind a pause or a knot, and that
most replies show no habit at all. Maren's description says she asks such questions
"now and then".

**Checked:** the same lines asked again after the fix: Maren 0 of 6 asked back
("Yes." and "Receipts," opened two answers). Orin opened all 9 answers with the
answer ("Stiff.", "No.", "Don't know a quarry town."). Knots still come up later in
some answers, but only Davin's pack, tied by Mags, which is what that camp scene is
about. Full suite, campaign playtest and fuzz pass.

**Independent review:** no blocking issues; saves pick up the new Maren text on load.
Three wording suggestions were taken (the rule now covers narration passages too,
says the voice still shows in how they speak, and lets a companion say plainly they
don't know or won't say), and the final wording was checked live once more.

## Not fixed (notes)

- An improvised check at 99 to 100% still asks for a roll (tracks at 99%, asking a
  passer-by at 100%). Noted in earlier runs.
- Answers about the party sometimes give raw HP ("Orin at 224, Maren at 202").
  Noted in earlier runs.
- At level 4 a typed "I play my lute" was told there is no lute in the pack (it
  offered the reed-pipe); at 17 the same line was told with a lute. Minor.
- Repeated stock phrases across similar prompts ("a short rusty bark of a laugh",
  "as if it owes him money"), partly because the driver reuses its prompt list.
