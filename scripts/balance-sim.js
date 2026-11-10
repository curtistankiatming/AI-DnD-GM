'use strict';
// Balance pass for job advancement: simulated AI-adventure battles.
//
// For every class, branch, level milestone and difficulty tier, a hero with
// the jobs due at that level (and the usual companions) fights the standard
// adventure battle (a boss and two retainers) many times with seeded dice.
// A simple policy plays the hero: it uses job skills, ultimates first, then
// falls back to plain attacks. A second run ignores every job skill, to show
// how much the jobs add. Companions and enemies use the game's own AI.
//
// No paid model calls: the adventure is the director test fixture.
//   node scripts/balance-sim.js [--seeds 12] [--json out.json] [--levels 20,40,70,100]
const E = require('../src/engine');
const P = require('../src/progression');
const { CLASSES } = require('../src/content');
const { createSeededRng } = require('../src/rules');
const JOBS = require('../src/data/jobs.json').classes;
const draft = require('../tests/fixtures/director-draft');

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const SEEDS = Number(arg('seeds', 12));
const LEVELS = String(arg('levels', '20,30,40,50,60,70,80,90,100')).split(',').map(Number);
const TIERS = String(arg('tiers', 'normal,hard,heroic')).split(',');
const CLASS_IDS = String(arg('classes', Object.keys(CLASSES).join(','))).split(',');
const MAX_STEPS = 400;
const THEMES = ['wild', 'undead', 'storm', 'construct', 'soldier', 'caster'];

function hero(classId, branch, level) {
  const s = E.createNewGame({ name: 'Rhea', classId });
  E.awardXp(s, P.XP_NEXT[level - 1], [], 'balance fixture');
  s.world.completed.bell = { day: 1, quality: 'force' }; s.world.completed.trial = { day: 1 };
  s.story.nodeId = 'town-briarwatch'; s.world.townId = 'briarwatch';
  Object.assign(s.player.progression, { mastery: level >= 10, specialization: level >= P.SECOND_JOB_LEVEL ? branch : null, thirdJob: level >= P.THIRD_JOB_LEVEL, fourthJob: level >= P.FOURTH_JOB_LEVEL });
  const out = E.normalizeIncomingState(s);
  out.player.resources = P.resources(CLASSES[classId], out.player.level, out.player);
  out.player.hp = out.player.maxHp;
  for (const c of out.party) c.hp = c.maxHp;
  return out;
}

// The hero's choice for this moment, from the public view only.
function choose(v, useJobs, memo) {
  const c = v.combat, me = c.actors.find(a => a.id === 'player');
  const ok = id => c.actions.find(a => a.id === id && !a.disabled);
  const enemies = c.actors.filter(a => a.team === 'enemy' && a.hp > 0).sort((a, b) => a.hp - b.hp);
  const allies = c.actors.filter(a => a.team === 'party' && a.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const target = enemies[0], weakest = allies[0] || me;
  if (!me || me.hp <= 0) return { actionId: ok('death-save') ? 'death-save' : 'end-turn' };
  const aim = k => k.targetKind === 'enemy' ? target?.id : k.targetKind === 'ally' ? weakest.id : k.targetKind === 'self' ? 'player' : undefined;
  if (!c.order && ok('order:focus') && target) return { actionId: 'order:focus', targetId: target.id };
  const job = cost => !useJobs ? [] : c.actions.filter(a => !a.disabled && a.cost === cost && (a.id.startsWith('job:') || a.id.startsWith('spec:')) && !memo.used.has(`${c.round}:${a.id}`));
  // Healing and protection only when someone is hurt; ultimates first.
  const rank = a => (/^Ultimate/.test(a.description || '') ? 0 : 1);
  const useful = a => !/heal|mend|restore|tempHp|ward|cover|shield|protect/i.test(`${a.id} ${a.description || ''}`) || weakest.hp / weakest.maxHp < 0.6 || a.targetKind === 'enemy';
  if (!c.economy.bonusUsed) {
    const k = job('bonus').filter(useful).sort((a, b) => rank(a) - rank(b))[0];
    if (k) { memo.used.add(`${c.round}:${k.id}`); return { actionId: k.id, targetId: aim(k) }; }
    if (me.hp / me.maxHp < 0.5 && ok('second-wind')) return { actionId: 'second-wind', targetId: 'player' };
    if (weakest.hp / weakest.maxHp < 0.5 && ok('healing-word')) return { actionId: 'healing-word', targetId: weakest.id };
  }
  if (!c.economy.actionUsed && target) {
    const k = job('action').filter(useful).sort((a, b) => rank(a) - rank(b))[0];
    if (k) { memo.used.add(`${c.round}:${k.id}`); return { actionId: k.id, targetId: aim(k) }; }
    const cls = v.player.className;
    const order = cls === 'Wizard' ? ['magic-missile', 'fire-bolt'] : cls === 'Cleric' ? ['guiding-bolt', 'sacred-flame'] : cls === 'Bard' ? ['vicious-mockery'] : ['weapon-attack'];
    for (const id of [...order, 'weapon-attack']) if (ok(id)) return { actionId: id, targetId: target.id };
  }
  return { actionId: 'end-turn' };
}

function fight(classId, branch, level, tier, seed, useJobs) {
  let s = hero(classId, branch, level);
  const rng = createSeededRng(seed);
  // Rotate the enemy theme: undead bosses resist weapons, the rest do not.
  const theme = THEMES[seed % THEMES.length];
  let o = E.resolveAction(s, { type: 'director-commission', draft: { ...draft(), enemyTheme: theme } }, rng); s = o.state;
  const id = o.result.questId;
  if (tier !== 'normal') { o = E.resolveAction(s, { type: 'adventure-tier', questId: id, tier }, rng); s = o.state; }
  for (const a of [{ type: 'depart', questId: id }, { type: 'story-choice', choiceId: 'advance' }, { type: 'story-choice', choiceId: 'direct' }, { type: 'story-choice', choiceId: 'confront' }]) {
    o = E.resolveAction(s, a, rng); s = o.state;
    if (!o.result.ok) throw new Error(`${a.type}: ${o.result.error}`);
  }
  // Start every battle at full strength so tiers compare fairly.
  for (const a of s.combat.actors.filter(a => a.team === 'party')) a.hp = a.maxHp;
  const memo = { used: new Set() };
  let steps = 0, v = o.view, rounds = 0;
  while (v.combat?.active && steps++ < MAX_STEPS) {
    rounds = v.combat.round;
    o = E.resolveAction(s, { type: 'combat', ...choose(v, useJobs, memo) }, rng);
    if (!o.result.ok) o = E.resolveAction(s, { type: 'combat', actionId: 'end-turn' }, rng);
    s = o.state; v = o.view;
  }
  const party = [s.player, ...s.party];
  const won = !s.combat?.active && /-after$/.test(s.story.nodeId);
  return { won, rounds, hp: party.reduce((t, a) => t + Math.max(0, a.hp), 0) / party.reduce((t, a) => t + a.maxHp, 0), heroDown: s.player.hp <= 0, timeout: steps >= MAX_STEPS };
}

function cell(classId, branch, level, tier, useJobs) {
  const r = [];
  for (let i = 0; i < SEEDS; i++) r.push(fight(classId, branch, level, tier, 1000 + i * 7919 + level * 6, useJobs));
  const avg = f => r.reduce((t, x) => t + f(x), 0) / r.length;
  return { rounds: avg(x => x.rounds), win: avg(x => x.won ? 1 : 0), hp: avg(x => x.won ? x.hp : 0), timeouts: r.filter(x => x.timeout).length };
}

const rows = [];
const t0 = Date.now();
for (const classId of CLASS_IDS) for (const b of JOBS[classId].branches) for (const level of LEVELS) for (const tier of TIERS) {
  const jobs = cell(classId, b.id, level, tier, true), plain = cell(classId, b.id, level, tier, false);
  rows.push({ classId, branch: b.id, level, tier, rounds: jobs.rounds, win: jobs.win, hp: jobs.hp, plainWin: plain.win, plainHp: plain.hp, timeouts: jobs.timeouts + plain.timeouts });
}
const pct = x => `${Math.round(x * 100)}`.padStart(3);
console.log(`class    branch          lvl  tier    rnds win% hpLeft% | no-jobs win% hpLeft%`);
for (const r of rows) console.log(`${r.classId.padEnd(8)} ${r.branch.padEnd(15)} ${String(r.level).padStart(3)}  ${r.tier.padEnd(7)} ${r.rounds.toFixed(1).padStart(4)} ${pct(r.win)}  ${pct(r.hp)}    | ${pct(r.plainWin)}  ${pct(r.plainHp)}${r.timeouts ? `  (${r.timeouts} timeouts)` : ''}`);
console.error(`${rows.length * SEEDS * 2} battles in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
const out = arg('json'); if (out) require('fs').writeFileSync(out, JSON.stringify(rows, null, 1));
