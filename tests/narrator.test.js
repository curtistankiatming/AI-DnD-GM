"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createNewGame, resolveAction, buildView } = require("../src/engine");
const { buildNarratorPrompt, deterministicFallback } = require("../src/narrator");

const alwaysHigh = () => 0.999999;

function promptSection(prompt, start, end) {
  const afterStart = prompt.split(start)[1] || "";
  return (end ? afterStart.split(end)[0] : afterStart).trim();
}

test("narrator prompt omits secret continuity entirely and includes only discovered clues", () => {
  let state = createNewGame({ name: "Mira", classId: "wizard", backgroundId: "sage" });
  let view = buildView(state);
  let prompt = buildNarratorPrompt(state, view, { type: "scene-opening" }, []);

  assert.doesNotMatch(prompt, /GM-ONLY CONTINUITY FACTS/i);
  assert.match(prompt, /Hidden campaign facts and unrevealed routes are deliberately omitted/i);
  let discovered = promptSection(prompt, "DISCOVERED CLUES — player knows only these", "RECENT CANONICAL HISTORY");
  assert.doesNotMatch(discovered, /Black Wax on the Bell Rope/i);

  const resolved = resolveAction(state, { type: "story-choice", choiceId: "inspect-rope" }, alwaysHigh);
  state = resolved.state;
  view = resolved.view;
  prompt = buildNarratorPrompt(state, view, { type: "story-choice", choiceId: "inspect-rope" }, resolved.events);
  discovered = promptSection(prompt, "DISCOVERED CLUES — player knows only these", "RECENT CANONICAL HISTORY");
  assert.match(discovered, /Black Wax on the Bell Rope/i);
  assert.match(discovered, /ward-bell was silenced/i);
});

test("deterministic narration does not repeat an identical outcome event", () => {
  const state = createNewGame({ name: "Mira", classId: "fighter" });
  const text = "The ward-bell answers with one low note.";
  state.story.lastOutcome = { kind: "choice", title: "Test", text };
  const narration = deterministicFallback(
    state,
    buildView(state),
    { type: "story-choice", choiceId: "test" },
    [
      { type: "story", text },
      { type: "roll", text: "Mira succeeds on the check." }
    ]
  );
  assert.equal(narration.split(text).length - 1, 1);
  assert.match(narration, /Mira succeeds on the check/);
});
