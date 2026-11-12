# Playing and reviewing Briarwatch as an agent (Codex, Claude or anyone)

This guide is for a coding agent asked to **play the written (no-AI) story and
review it**. You do not need an API key, a browser or a server. Everything runs
with Node.js 22 or later from the repository root.

Never call a paid AI model or set an API key while doing this. Do not edit game
code or story data unless the person who asked you says so: your job is to play
and report.

## 1. Read first

1. `docs/STORY-BIBLE.md`: the tone, the characters and the plot to level 20.
   Judge the writing against it.
2. This file.

## 2. Play from the terminal

The game is saved to `.playtest/game.json` (ignored by git). Use `--save <file>`
to keep several games. Dice are seeded, so the same commands give the same rolls.

```
node scripts/play.js new --class ranger --name Wren   # classes: fighter rogue wizard cleric ranger bard
node scripts/play.js look                             # where you are, what was said, your choices
node scripts/play.js choose 2                         # pick a story choice by number or id
node scripts/play.js town                             # in a town: rest, expeditions, level rewards, companions
node scripts/play.js do '{"type":"depart","questId":"road"}'   # any action the town screen prints
node scripts/play.js fight weapon-attack enemy:goblin:0         # in combat: action id, then target id
node scripts/play.js auto 30                          # let the scripted test player take 30 turns (good for long fights)
```

Every screen prints the exact command for each option, so copy from it.

### Reviewing a specific scene without playing up to it

```
node scripts/play.js scenes                           # every story node; conversations are marked
node scripts/play.js read scene-bridge-camp-night     # every line, choice and outcome of one node, no dice
node scripts/play.js jump q-bridge-after --level 4 --with nessa --save .playtest/bridge.json
```

`jump` makes a **review fixture**: a fresh hero placed at that scene. It is not a
real playthrough (earlier choices and items are missing), so say so in your
report whenever you used it.

## 3. What to review

Play as a real player would: read everything, make the choices a person would
make, and try at least one choice you think the writers did not expect. When a
playthrough is the goal, play one class from the start for as long as you are
asked to (`auto` is fine for long fights, not for story choices).

Report on these, in this order of importance:

1. **Story.** Does each scene move something (a clue, a relationship, a choice
   with a cost)? Is anything confusing, contradictory, or forgotten later? Do
   choices feel like they matter?
2. **Characters.** Do Orin, Maren and Nessa sound like the bible describes, and
   like different people? Does anyone act out of character or say a line only
   to be funny?
3. **Comedy.** Does each funny moment come from the characters and the
   situation, or does it feel forced? Is there humour where it doesn't belong
   (someone grieving, a dark chapter)?
4. **Pacing.** Scenes that drag, scenes that are too thin, too many checks in a
   row, places where the player waits with nothing to decide.
5. **Bugs and rules.** Anything that breaks: a choice that does nothing, a dead
   end, the wrong person speaking, wrong names, text that talks about game rules
   inside the story, numbers that look wrong, a scene that repeats.
6. **Writing.** Typos, clumsy sentences, modern slang, lines that explain the
   joke or the feeling instead of showing it.

## 4. How to write the report

Write it as Markdown to `docs/reviews/<agent>-<yyyy-mm-dd>.md`, for example
`docs/reviews/codex-2026-11-12.md`. Start with:

- what you played: class, how far (level and scene), how many turns, the seed,
  and whether any part used `jump` or `auto`;
- the commit you played (`git rev-parse --short HEAD`).

Then list findings, most important first. For each one give:

- **Where:** the node id (from `look` or `scenes`) and the choice id if relevant.
- **What:** what happened or what reads wrong, quoting the line.
- **Why it matters**, in one sentence.
- **Suggestion:** a concrete fix or rewrite, if you have one.
- **Severity:** blocker (breaks play), major (hurts the story), minor, or nit.

End with three things that work well and should be kept. Keep the whole report
plain English: the game's owner reads the reports but not the code.
