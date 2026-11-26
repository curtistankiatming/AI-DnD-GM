'use strict';
// Fix from the last Claude playtest of 26 November 2026 (Rogue, Nessa taken,
// level 1 to 71). Late in the run Claude's answer to "what should we be careful
// about?" ran to 1,676 characters. The decoder refused anything over 1,600, so
// the paid answer was thrown away and the player saw "The model proposal has
// unsupported fields or values". A long reply is now cut at its last full
// sentence, and the AI is asked to keep answers short.
const test = require('node:test'), assert = require('node:assert/strict');
const Chat = require('../src/chat-runtime');

const sentence = 'The white is coming down the road behind the column, and the gate will argue over who to let in. ';
const proposal = reply => JSON.stringify({ kind: 'question', optionId: '', reply, improvise: { intent: '', skill: '', ability: '', difficulty: 'trivial', success: '', failure: '', reward: 'none', risk: 'none', remembered: false } });

test('a long answer is kept, cut at its last full sentence', () => {
  const long = sentence.repeat(18).trim(); // about 1,750 characters
  assert.ok(long.length > 1600);
  const out = Chat.decode(proposal(long));
  assert.equal(out.kind, 'question');
  assert.ok(out.reply.length <= 1600, `reply is ${out.reply.length} characters`);
  assert.ok(out.reply.length > 1400);
  assert.match(out.reply, /let in\.$/, 'ends on a whole sentence');
});

test('a sentence ending in a closing quote keeps its quote', () => {
  const speech = '"Ask me again when it\'s spring." Nessa grins. '.repeat(40).trim();
  const out = Chat.decode(proposal(speech));
  assert.ok(out.reply.length <= 1600);
  assert.match(out.reply, /(grins\.|spring\.")$/);
});

test('a reply with no sentence end is cut at a word and marked', () => {
  const words = 'and the road goes on '.repeat(100).trim();
  const out = Chat.decode(proposal(words));
  assert.ok(out.reply.length <= 1601);
  assert.match(out.reply, /\w…$/);
});

test('answers of normal length are unchanged and runaway ones are still refused', () => {
  assert.equal(Chat.decode(proposal('Watch the gate.')).reply, 'Watch the gate.');
  assert.throws(() => Chat.decode(proposal('x'.repeat(9000))), /unsupported fields or values/);
});

test('the AI is asked to keep questions and dialogue short', () => {
  assert.match(Chat.CLAUDE_SYSTEM, /Keep reply under 220 words/);
});
