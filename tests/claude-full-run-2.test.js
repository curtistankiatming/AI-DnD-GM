'use strict';
// Fixes from the second full Claude run of 28 November 2026 (Cleric, level 1
// to 71, up to 20 AI prompts every 10 levels). No test here calls a real model.
const test = require('node:test'), assert = require('node:assert/strict');
const COMPANIONS = require('../src/data/companions.json');

// Orin offered to carry something in 14 of 16 answers in the run ("I'll carry
// the herbs", "Give me the shields", "I'll take the door"), and Nessa
// mentioned Biscuit in 14 of 15 and her unsent letters in 10 of 15. Asked
// again live at level 71: Orin 7 of 8 with pack-strap business, Nessa 8 of 8
// scratching Biscuit's ears. Their descriptions said "then offers to carry
// something" and "always takes the door", which Claude read as every reply.
test('companion habits are described as occasional, not every reply', () => {
  assert.doesNotMatch(COMPANIONS.orin.personality, /plainly, then offers to carry|always takes the door/);
  assert.match(COMPANIONS.orin.personality, /Now and then, not in most replies, offers to carry something or takes the door/);
  assert.match(COMPANIONS.nessa.personality, /Now and then, not in most replies, mentions the letters she writes and does not send/);
  // Biscuit is a he (STORY-BIBLE.md); one reply in the run called him she.
  assert.match(COMPANIONS.nessa.personality, /her dog Biscuit \(he\)/);
});

// After the last fix told companions to answer in their first line, the
// narration started saying so: "Maren answers at once" (5 of 15) and "Nessa
// answers before you've quite finished asking" (3 of 15, and 3 of 8 live).
test('the voice rule bans narrating how fast they answer and a repeated gesture', () => {
  const { VOICE_RULE } = require('../src/companion-voice');
  assert.match(VOICE_RULE, /do not say how quickly they answer/);
  assert.match(VOICE_RULE, /do not give a companion the same gesture or prop in reply after reply/);
  // The rule still carries what the earlier fixes put there.
  assert.match(VOICE_RULE, /answers in their first line/);
  assert.match(VOICE_RULE, /most passages and replies show none/);
});

// A successful haggle was given the coin reward every time (twice in the run,
// 6 of 6 live): "your purse sits heavier by 106 gold" with the potion left on
// the shelf. Improvised actions cannot buy anything, so a haggle paid free gold.
test('a haggle or bargain is never paid as found coin', () => {
  const { CLAUDE_SYSTEM } = require('../src/chat-runtime');
  assert.match(CLAUDE_SYSTEM, /coin only where money plausibly comes to the hero \(found, paid, won or earned\)/);
  assert.match(CLAUDE_SYSTEM, /a haggle or bargain never gets coin/);
});
