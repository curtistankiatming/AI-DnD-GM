'use strict';
// Fixes from the full Claude run of 27 November 2026 (Bard, level 1 to 71, up
// to 20 AI prompts every 10 levels). No test here calls a real model.
const test = require('node:test'), assert = require('node:assert/strict');

// Maren opened nearly every answer by turning the question back on the hero:
// 9 of 10 lines in the run, and 6 of 6 when asked again live at level 21
// ("Do I trust you?", "You ask that as though you don't already know").
// Orin finished a knot "before he answers" in 8 of 9 replies asked live at
// level 50. Listed habits read as instructions for every reply.
test('companions answer what they are asked instead of asking it back', () => {
  const { VOICE_RULE } = require('../src/companion-voice');
  assert.match(VOICE_RULE, /answers in their first line/);
  assert.match(VOICE_RULE, /do not open by repeating the question, asking it back/);
  assert.match(VOICE_RULE, /do not hold the answer back behind a pause or a bit of business/);
  assert.match(VOICE_RULE, /most passages and replies show none/);
  const Chat = require('../src/chat-runtime');
  for (const sys of [Chat.CLAUDE_SYSTEM, require('../src/narrator').NARRATOR_SYSTEM, require('../src/director').SYSTEM]) assert.ok(sys.includes(VOICE_RULE));
  const maren = require('../src/data/companions.json').maren;
  assert.match(maren.personality, /Now and then asks a question she already knows the answer to/);
});
