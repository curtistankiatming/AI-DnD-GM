'use strict';
// Codex playtest, 25 November 2026 (docs/reviews/codex-two-full-runs-2026-11-25.md):
// the terminal lists the shop, a late objective win reads as a win, and a
// bounty tells its pay once.
const test = require('node:test'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const E = require('../src/engine'), P = require('../src/progression'), W = require('../src/world');
const { QUESTS } = require('../src/expansion');
const { createSeededRng } = require('../src/rules');
const { chooseAction } = require('./player-policy');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'play.js');
const run = (...a) => execFileSync(process.execPath, [SCRIPT, ...a], { encoding: 'utf8', env: { ...process.env, ANTHROPIC_API_KEY: '' } });
const high = () => .999999;

function hero(cls = 'fighter', level = 1) { const s = E.createNewGame({ name: 'Ivo', classId: cls }); if (level > 1) E.awardXp(s, P.XP_NEXT[level - 1], [], 'test fixture'); return s; }

test('the terminal town screen points to a shop command that lists stock, prices and the buy action', () => {
  const s = hero('bard', 10); s.player.gold = 3000; s.world.completed.bell = { xp: 0, gold: 0 };
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass', 'merrowgate']; s.world.townId = 'merrowgate'; s.story.nodeId = 'town-merrowgate'; W.init(s);
  const save = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'play-shop-')), 'g.json');
  fs.writeFileSync(save, JSON.stringify({ seed: 1, turn: 0, fixture: true, state: s }));
  assert.match(run('town', '--save', save), /Shop: \d+ items for sale {2}-> node scripts\/play\.js shop/);
  assert.match(run('look', '--save', save), /"node scripts\/play\.js shop" for gear and supplies/);
  const shop = run('shop', '--save', save);
  const item = E.buildView(s).world.shop.find((i) => i.comparisons.length);
  assert.ok(item, 'Merrowgate sells gear.');
  assert.match(shop, new RegExp(`${item.id}: ${item.name}, ${item.rarity}, ${item.price} gold`));
  assert.match(shop, new RegExp(`do '\\{"type":"buy","itemId":"${item.id}","market":"town"\\}'`));
  assert.match(shop, /Would change: Ivo \(replaces /);
  assert.match(shop, /"type":"equip"/);
  // The printed buy action works.
  const r = E.resolveAction(s, { type: 'buy', itemId: item.id, market: 'town' }, high);
  assert.equal(r.result.ok, true, r.result.error);
});

test('an objective finished after its deadline reads as done late, not as the marker slipping away', () => {
  const s = hero('fighter', 5); E.startCombat(s, 'quest:bridge', createSeededRng(222), []);
  s.world.activeQuest = 'bridge'; s.world.progress.bridge = {};
  const player = s.combat.actors.find((a) => a.id === 'player');
  s.combat.actors = [player, ...s.combat.actors.filter((a) => a !== player)]; s.combat.turnIndex = 0; s.combat.awaitingPlayer = true; player.actionUsed = false; player.bonusUsed = false;
  for (const a of s.combat.actors.filter((x) => x.team === 'enemy')) { a.hp = 200; a.maxHp = 200; a.ac = 10; }
  s.combat.round = 10;
  let r = E.resolveAction(s, { type: 'combat', actionId: 'order:cover' }, high);
  assert.equal(r.state.combat.objective.failed, true);
  const late = r.state; late.combat.objective.progress = late.combat.objective.target - 1;
  const me = late.combat.actors.find((a) => a.id === 'player'); late.combat.actors = [me, ...late.combat.actors.filter((a) => a !== me)]; late.combat.turnIndex = 0; late.combat.awaitingPlayer = true; me.actionUsed = false;
  r = E.resolveAction(late, { type: 'combat', actionId: 'objective' }, high);
  assert.equal(r.result.ok, true, r.result.error); assert.equal(r.state.combat, null);
  const told = r.events.filter((e) => e.type === 'objective').map((e) => e.text).join(' ');
  assert.match(told, /done, after the deadline\. What the missed deadline cost still stands\./);
  assert.doesNotMatch(told, /remaining opposition|slips away/);
  assert.equal(r.state.world.progress.bridge.setback, true, 'The deadline\'s setback still stands.');
});

test('a won bounty tells its XP and gold in one line', () => {
  const q = QUESTS.marsh; let s = hero('fighter', 2); s.player.xp = P.XP_NEXT[1]; s.player.gold = 1000; s.player.progression.mastery = true;
  s.world.completed.bell = { xp: 0, gold: 0 };
  for (const other of Object.values(QUESTS)) { if (other.id === 'marsh') break; s.world.completed[other.id] = { xp: 0, gold: 0 }; }
  s.world.unlockedTowns = ['briarwatch', 'ashford', 'highpass']; s.world.townId = q.town; s.story.nodeId = `town-${q.town}`; W.init(s);
  const offer = E.buildView(s).world.bounty, xp = s.player.xp;
  s = E.resolveAction(s, { type: 'bounty' }, createSeededRng(3)).state;
  const rng = createSeededRng(9), memory = {}; let last;
  for (let i = 0; i < 300 && s.combat?.active; i++) { last = E.resolveAction(s, chooseAction(E.buildView(s), memory, 'direct'), rng); s = last.state; }
  assert.equal(s.player.xp - xp, offer.reward.xp);
  const claims = last.events.filter((e) => /Bounty/.test(e.text || '') && /XP/.test(e.text));
  assert.equal(claims.length, 1, claims.map((e) => e.text).join(' | '));
  assert.match(claims[0].text, new RegExp(`^Bounty claimed \\(\\w+ battle\\): ${offer.reward.gold} gold and ${offer.reward.xp} XP\\.`));
});
