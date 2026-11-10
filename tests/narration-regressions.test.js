'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
// All model requests go to an in-memory fake of the shared AI service.
const E = require('../src/engine');
const N = require('../src/narrator');

function fakeAI(text, counter) {
  return {
    narrationEnabled: async () => true,
    complete: async () => { counter.calls++; return { text, model: 'mock-model' }; }
  };
}

function fixture() {
  const state = E.createNewGame({ classId: 'fighter' });
  state.story.lastOutcome = { text: 'A previously resolved bargain grants an emerald crown.' };
  return { state, view: E.buildView(state) };
}

test('combat fallback uses this turn’s facts, not a stale story reward', () => {
  const { state, view } = fixture();
  const events = [{ type: 'roll', text: 'Rowan misses the sentinel.' },
    { type: 'party', text: 'Orin protects Maren.' }];
  const text = N.deterministicFallback(state, view, { type: 'combat' }, events);
  assert.doesNotMatch(text, /emerald crown/);
  assert.match(text, /Rowan misses the sentinel/);
  assert.match(text, /Orin protects Maren/);
});

test('combat prompt identifies the current resolution rather than the last story reward', () => {
  const { state, view } = fixture();
  const prompt = N.buildNarratorPrompt(state, view, { type: 'combat' },
    [{ type: 'objective', text: 'The ward channel opens: 1 of 3 secured.' }]);
  assert.doesNotMatch(prompt, /emerald crown/);
  assert.match(prompt, /The ward channel opens: 1 of 3 secured/);
});

test('rejected narrative actions never call the model or re-narrate an old success', async () => {
  const counter = { calls: 0 };
  const { state, view } = fixture();
  const result = await N.narrate(state, view, { type: 'story-choice' },
    [{ type: 'warning', text: 'That choice is unavailable. Nothing was spent.' }], { ok: false }, fakeAI('Mock prose.', counter));
  assert.equal(counter.calls, 0);
  assert.equal(result.source, 'deterministic');
  assert.match(result.text, /That choice is unavailable/);
  assert.doesNotMatch(result.text, /emerald crown/);
});

test('valid narrative actions still use the configured adapter without changing game facts', async () => {
  const counter = { calls: 0 };
  const { state, view } = fixture();
  const before = JSON.stringify({ player: state.player, party: state.party, world: state.world });
  const result = await N.narrate(state, view, { type: 'opening' }, [], { ok: true }, fakeAI('The party takes stock of the road ahead.', counter));
  assert.equal(counter.calls, 1);
  assert.equal(result.source, 'ai');
  assert.equal(JSON.stringify({ player: state.player, party: state.party, world: state.world }), before);
});
