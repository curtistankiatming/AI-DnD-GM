'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
// This file runs in its own node:test process; all model requests are mocked.
process.env.AI_NARRATOR = 'on';
process.env.LM_STUDIO_BASE_URL = 'http://127.0.0.1:1234/v1';
process.env.OPENAI_API_KEY = '';
const E = require('../src/engine');
const N = require('../src/narrator');

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

test('rejected narrative actions never call the model or re-narrate an old success', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'Mock prose.' } }] }) };
  };
  const { state, view } = fixture();
  const result = await N.narrate(state, view, { type: 'story-choice' },
    [{ type: 'warning', text: 'That choice is unavailable. Nothing was spent.' }], { ok: false });
  assert.equal(calls, 0);
  assert.equal(result.source, 'deterministic');
  assert.match(result.text, /That choice is unavailable/);
  assert.doesNotMatch(result.text, /emerald crown/);
});

test('valid narrative actions still use the configured adapter without changing game facts', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ choices: [{ message: { content: 'The party takes stock of the road ahead.' } }] }) };
  };
  const { state, view } = fixture();
  const before = JSON.stringify({ player: state.player, party: state.party, world: state.world });
  const result = await N.narrate(state, view, { type: 'opening' }, [], { ok: true });
  assert.equal(calls, 1);
  assert.equal(result.source, 'ai');
  assert.equal(JSON.stringify({ player: state.player, party: state.party, world: state.world }), before);
});
