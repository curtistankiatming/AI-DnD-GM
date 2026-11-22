# Hosted game

This page is for running the game on your own server for other people, on your
own Claude key. The open-source game, where each player runs it on their own
computer with their own key (or none), does not use any of this and plays every
book free.

Hosted mode is off unless you turn it on. It is in `src/hosted.js` and
`server.js`, and tested in `tests/hosted.test.js`.

## Turning it on

Set these where the server runs (environment or the git-ignored `.env` beside
`package.json`):

| Setting | Needed | What it does |
| --- | --- | --- |
| `HOSTED=1` | yes | Turns hosted mode on. |
| `HOSTED_SECRET` | yes | A long random value, at least 32 characters (for example `openssl rand -base64 48`). It signs saves and account passes. Keep it private; never commit it. The server refuses to start in hosted mode without it. |
| `HOSTED_ORIGIN` | behind HTTPS | The address players use, such as `https://play.example.com`. Without it, a server behind an HTTPS proxy refuses every browser request as coming from another site. |
| `HOSTED_TRUST_PROXY=1` | behind a proxy | Count visitors by the proxy's `X-Forwarded-For` address. Only set it when a proxy you control always sets that header. |
| `HOSTED_SECURE_COOKIE=0` | testing only | Lets the pass cookie work over plain `http://`. Leave it unset in real use. |
| `ANTHROPIC_API_KEY` | for AI | Your Claude key. Players can never see or replace it in hosted mode. |

Set up the AI game master (model, effort, narration) once on the server, in
`.local-ai.json`, for example by running the game locally with the same folder
and using Settings, then AI settings. In hosted mode nobody can change it from
the browser.

## What it protects

**Saves cannot be edited.** Between turns the player's browser holds the game.
The server signs (seals) every game it sends and only continues games whose
seal still matches. Changing gold, XP, level, items, flags or any story text, in
the browser or in a save file, breaks the seal, and the server answers: "This
save was changed outside the game". Only the text currently on screen is left
out of the seal. This also stops anyone stuffing a save with huge or sneaky text
to run up the AI bill or to slip instructions into the AI's prompt.

What it does not stop: a player can go back to an older game of their own (an
earlier save, or the browser's copy) and try a roll again. That is accepted.
Games from the open-source version, or from before hosted mode was turned on,
have no seal and cannot be continued on the hosted server.

**Books come from the account.** A paid pass reads every book; a free pass or
a visitor without one reads Books One and Two (`Book.FREE_BOOKS`). This is set
by the server on every request and never read from the save, so editing a save
cannot open Book Three.

**Saves stay with their owner.** Saves kept on the server go in a folder per
account (`SAVE_DIR/accounts/...`). Nobody can list, load or delete another
account's saves. Visitors without a pass cannot keep saves on the server; the
browser keeps their current game.

**Your Claude key is protected.**
- Nobody can change the AI settings, test models, or save a new key from the
  browser. Players only see which model runs and how many AI turns they have
  left today.
- Each account has a daily AI allowance by plan, a per-minute limit, and the
  whole server has a daily total. When an allowance runs out, the written
  choices still work and narration falls back to the written text.
- Every message is checked before any AI call. Obvious attempts to use the game
  master for something else ("ignore your instructions", "show your system
  prompt", "write me some code", "pretend to be an assistant") are turned away
  without spending an AI turn. The check is kept narrow so that in-story talk of
  orders, secrets, spells and letters still goes through.
- Every Claude prompt carries a rule to stay inside the game and treat player
  text as story, never as instructions.
- Output length is capped per kind of call, below whatever the settings file
  says, and each account has its own AI slot, so one player cannot block
  everyone else. At most `HOSTED_AI_CONCURRENCY` players use the AI at once.

The engine already decides every number (dice, XP, gold, items, levels), and AI
proposals are re-checked by it, so a clever prompt cannot hand out rewards.

## Limits you can change

| Setting | Default | Meaning |
| --- | --- | --- |
| `HOSTED_AI_DAILY_GUEST` | 0 | AI turns a day for visitors without a pass. |
| `HOSTED_AI_DAILY_FREE` | 40 | AI turns a day for a free pass. |
| `HOSTED_AI_DAILY_PAID` | 400 | AI turns a day for a paid pass. |
| `HOSTED_AI_PER_MINUTE` | 8 | AI turns a minute per account. |
| `HOSTED_AI_DAILY_TOTAL` | 5000 | AI turns a day for the whole server, your bill's ceiling. |
| `HOSTED_AI_CONCURRENCY` | 4 | Players using the AI at the same moment. |
| `HOSTED_DIRECTOR_TOKENS` | 16000 | Output ceiling when the AI writes a whole adventure. |
| `HOSTED_CONTEXT_CHARS` | 120000 | Prompt size ceiling. |

An AI turn is one call to Claude: a narrated action, an improvised action or
reply, or a written adventure. The counts are kept in memory, so restarting the
server resets them for the day.

## Account passes (until real sign-in exists)

There is no sign-up or payment system yet. Until there is, you hand out passes.
On the server, with the same `HOSTED_SECRET`:

```
node scripts/hosted-pass.js --id curtis --plan paid --days 30
```

It prints a pass and a sign-in link (`https://your-address/pass?token=...`).
Opening the link stores the pass in that browser and opens the game. Anyone with
the link can use the pass, so send it privately. A pass ends on its date. To end
every pass at once, change `HOSTED_SECRET` (this also ends every sealed game
currently in a browser; saves kept on the server still load).

`GET /api/hosted/account` tells the browser its plan, books, AI turns left and
whether it can save on the server. A real sign-in system can later issue the
same passes, or replace `Hosted.account` in `src/hosted.js`.

## Still to do before charging money

- Real sign-up, sign-in and payments, which then issue passes.
- The game screen does not yet show the AI turns left or a sign-in button; it
  shows the server's messages when a limit is reached.
- AI counts reset on restart; keep them on disk if restarts become frequent.
