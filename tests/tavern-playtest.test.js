'use strict';
// Fixes from the playtest after the tavern roster (26 November 2026): a hire card
// says what kind of fighter it is and the fee in gold at the hero's level, the
// party card does not promise a hire a personal quest, and the AI is told not to
// fill passages with a companion staying silent.
const test = require('node:test'), assert = require('node:assert/strict');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world'), Roster = require('../src/roster'), Tavern = require('../src/tavern');
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
    assert.match(card.description, new RegExp(`^${Roster.KIND_WORD[r.kind]} · ${r.role}\\. `));
    assert.match(card.description, new RegExp(`Fee: ${Tavern.fee(s, id)} gold, paid now\\.`));
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

test('a hire\'s written lines use their own pronouns, never "they" for a she or a he', () => {
  const { storyLine, liveLines } = require('../src/expansion');
  const line = [{ narrate: '{hire} sits with {hireTheir} back to the rock; nobody asked {hireThem} to.', when: { hire: true } }].map(storyLine);
  const told = {};
  for (const id of ['dov', 'agna', Roster.IDS.find((x) => Roster.RECRUITS[x].pronouns === 'they/them')]) {
    const s = nightOfTheOath([id]);
    const r = E.resolveAction(s, { type: 'story-choice', choiceId: `hire-${id}` }, () => 0.5);
    assert.equal(r.result.ok, true, r.result.error);
    told[Roster.RECRUITS[id].pronouns] = liveLines(r.state, line)[0].narration;
  }
  assert.match(told['he/him'], /with his back to the rock; nobody asked him to/);
  assert.match(told['she/her'], /with her back to the rock; nobody asked her to/);
  assert.match(told['they/them'], /with their back to the rock; nobody asked them to/);
  // No line about the hire takes "they" for granted.
  const chapters = JSON.stringify(require('../src/data/tavern-chapters.json'));
  for (const m of chapters.match(/"narrate":"[^"]*\{hire\}[^"]*"/g)) assert.doesNotMatch(m.replace(/\{hire(Their|Them)\}/g, ""), /\b(they|their|them|themselves)\b/i, m);
});

test('Orin and Maren talk over hiring only on the first tavern night, not every night after', () => {
  const s = nightOfTheOath(['dov', 'agna']);
  const first = E.buildView(s).scene.opening;
  assert.match(first, /Any of them is more than we've got/);
  const r = E.resolveAction(s, { type: 'story-choice', choiceId: 'leave' }, () => 0.5);
  assert.equal(r.result.ok, true, r.result.error);
  assert.equal(r.state.story.flags['tavern:met'], true);
  // A later night: the same exchange is not told again.
  const later = JSON.parse(JSON.stringify(r.state));
  later.world.tavern = { night: 'harbour', town: 'highpass', offer: ['agna'], seen: false };
  later.story.nodeId = 'tavern-harbour';
  assert.doesNotMatch(E.buildView(later).scene.opening, /Any of them is more than we've got|hired, not sworn/);
  // Hiring on the first night counts as having met the tavern too.
  const h = E.resolveAction(nightOfTheOath(['dov', 'agna']), { type: 'story-choice', choiceId: 'hire-dov' }, () => 0.5);
  assert.equal(h.state.story.flags['tavern:met'], true);
});
