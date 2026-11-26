'use strict';
// Fixes from the playtest after the tavern roster (26 November 2026): a hire card
// says what kind of fighter it is and the fee in gold at the hero's level, the
// party card does not promise a hire a personal quest, and the AI is told not to
// fill passages with a companion staying silent.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Roster = require('../src/roster');
const fs = require('node:fs'), path = require('node:path');

function nightOfTheOath(offer) {
  const s = E.createNewGame({ name: 'Pell', classId: 'fighter' });
  E.awardXp(s, P.XP_NEXT[9], [], 'test fixture');
  s.story.flags['nessa:offer'] = 'declined';
  for (const id of ['bell', 'road', 'marsh', 'bridge', 'archive', 'signal', 'summit', 'breach', 'beacon']) s.world.completed[id] = { xp: 0, gold: 0 };
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass']; s.world.townId = 'highpass'; s.story.nodeId = 'town-highpass';
  W.init(s); s.player.gold = 500;
  assert.equal(W.completeQuest(s, 'trial', [], E.extensionApi()), true);
  E.enterNode(s, 'town-highpass', []);
  s.world.tavern.offer = offer;
  const r = E.resolveAction(s, { type: 'tavern' }, () => 0.5); assert.equal(r.result.ok, true, r.result.error);
  return r.state;
}

test('a hire card names the kind of fighter and the fee in gold at the hero\'s level now', () => {
  const s = nightOfTheOath(['dov', 'agna']);
  const level = s.player.level;
  for (const id of ['dov', 'agna']) {
    const r = Roster.RECRUITS[id];
    const card = E.buildView(s).scene.choices.find((c) => c.id === `hire-${id}`);
    assert.ok(card, id);
    assert.match(card.description, new RegExp(`^${Roster.KIND_WORD[r.kind]}, `));
    assert.match(card.description, new RegExp(`Fee: ${r.fee * level} gold now \\(${r.fee} for each of your levels\\)`));
  }
});

test('a hire on the party screen is marked as hired, not as owing a personal quest', () => {
  const s = nightOfTheOath(['dov', 'agna']);
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'hire-dov' }, () => 0.5);
  assert.equal(r.result.ok, true, r.result.error);
  const party = E.buildView(r.state).party;
  assert.equal(party.find((m) => m.id === 'dov').hired, true);
  assert.equal(party.find((m) => m.id === 'orin').hired, false);
  const ui = fs.readFileSync(path.join(__dirname, '../public/expedition.js'), 'utf8');
  assert.match(ui, /member\.hired\?'Hired at the tavern':'Personal quest unresolved'/);
});

test('the AI is told to leave an idle companion out rather than have them say nothing', () => {
  const { VOICE_RULE } = require('../src/companion-voice');
  assert.match(VOICE_RULE, /simply left out/);
  assert.match(VOICE_RULE, /at most one of their habits/);
});
