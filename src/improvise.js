'use strict';
// Improvised actions: Claude proposes how a free-form action could be resolved
// (which skill, how hard, what is at stake). This module is the rulebook that
// bounds those proposals. The engine rolls the dice and applies only the capped
// effects defined here, so the AI can write anything but cannot hand out more
// than a level-appropriate reward or risk.
const { SKILLS, ABILITIES } = require('./content');
const P = require('./progression');
const Book = require('./book');

const DIFFICULTIES = Object.freeze({ trivial: null, easy: 10, moderate: 13, hard: 16, 'very-hard': 19 });
const REWARDS = Object.freeze(['none', 'insight', 'coin', 'xp', 'inspiration']);
const RISKS = Object.freeze(['none', 'setback', 'harm', 'cost']);
// Share of the current level's XP band that one improvised success may grant.
const XP_SHARE = Object.freeze({ moderate: 0.05, hard: 0.08, 'very-hard': 0.12 });
const MAX_ATTEMPTS_PER_SCENE = 8;
const MAX_REWARDS_PER_SCENE = 3;
const MAX_LOG = 60;
const TEXT = { intent: 200, outcome: 400 };

const clean = (value, limit) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
const words = text => [...new Set(String(text).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 3))].sort().join(' ');

// The JSON shape Claude fills in. Every field is required so strict structured
// output always returns a complete proposal.
const PROPOSAL_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    intent: { type: 'string', description: 'What the hero attempts, in a short phrase.' },
    skill: { type: 'string', enum: ['', ...Object.keys(SKILLS)] },
    ability: { type: 'string', enum: ['', ...Object.keys(ABILITIES)] },
    difficulty: { type: 'string', enum: Object.keys(DIFFICULTIES) },
    success: { type: 'string', description: 'What becomes true if the attempt succeeds. Concrete, local, no new items.' },
    failure: { type: 'string', description: 'What goes wrong if it fails.' },
    reward: { type: 'string', enum: [...REWARDS] },
    risk: { type: 'string', enum: [...RISKS] },
    remembered: { type: 'boolean', description: 'True when the people present will remember this, whatever the roll: an insult, a kindness, a scene in public.' }
  },
  required: ['intent', 'skill', 'ability', 'difficulty', 'success', 'failure', 'reward', 'risk', 'remembered']
});

function validate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'The improvised action was incomplete. Nothing was applied.' };
  const p = {
    intent: clean(raw.intent, TEXT.intent), skill: raw.skill || '', ability: raw.ability || '', difficulty: raw.difficulty,
    success: clean(raw.success, TEXT.outcome), failure: clean(raw.failure, TEXT.outcome),
    reward: raw.reward || 'none', risk: raw.risk || 'none', remembered: raw.remembered === true
  };
  if (p.intent.length < 3) return { ok: false, error: 'Describe what the hero attempts. Nothing was applied.' };
  if (!Object.hasOwn(DIFFICULTIES, p.difficulty)) return { ok: false, error: 'The improvised action had no valid difficulty. Nothing was applied.' };
  if (p.skill && !Object.hasOwn(SKILLS, p.skill)) return { ok: false, error: 'The improvised action named an unknown skill. Nothing was applied.' };
  if (p.ability && !Object.hasOwn(ABILITIES, p.ability)) return { ok: false, error: 'The improvised action named an unknown ability. Nothing was applied.' };
  if (!REWARDS.includes(p.reward) || !RISKS.includes(p.risk)) return { ok: false, error: 'The improvised action had an unsupported reward or risk. Nothing was applied.' };
  if (p.difficulty !== 'trivial' && !p.skill && !p.ability) p.ability = 'wis';
  if (p.skill) p.ability = SKILLS[p.skill].ability;
  if (!p.success) p.success = 'The attempt works.';
  if (!p.failure) p.failure = 'The attempt does not work.';
  return { ok: true, proposal: p };
}

function normalize(state) {
  const raw = state.improv && typeof state.improv === 'object' ? state.improv : {};
  const scenes = {};
  for (const [id, s] of Object.entries(raw.scenes && typeof raw.scenes === 'object' ? raw.scenes : {}).slice(-200)) {
    scenes[id] = {
      attempts: Math.max(0, Math.min(99, Math.floor(Number(s?.attempts) || 0))),
      rewards: Math.max(0, Math.min(99, Math.floor(Number(s?.rewards) || 0))),
      xpGranted: Boolean(s?.xpGranted),
      intents: Array.isArray(s?.intents) ? s.intents.filter(x => typeof x === 'string').slice(-MAX_ATTEMPTS_PER_SCENE).map(x => x.slice(0, 400)) : []
    };
  }
  const log = (Array.isArray(raw.log) ? raw.log : []).slice(-MAX_LOG).filter(e => e && typeof e === 'object').map(e => ({
    turn: Math.max(0, Math.floor(Number(e.turn) || 0)), scene: clean(e.scene, 120), intent: clean(e.intent, TEXT.intent),
    success: Boolean(e.success), text: clean(e.text, TEXT.outcome), reward: REWARDS.includes(e.reward) ? e.reward : 'none', ...(e.remembered === true ? { remembered: true } : {})
  }));
  state.improv = { version: 1, scenes, log };
  return state.improv;
}

function scene(state, sceneId) {
  const improv = normalize(state);
  return improv.scenes[sceneId] || { attempts: 0, rewards: 0, xpGranted: false, intents: [] };
}

function xpFor(level, difficulty) {
  const share = XP_SHARE[difficulty];
  if (!share) return 0;
  // Past level 10 the band is one renown rank.
  const band = level >= P.MAX_LEVEL ? P.RANK_XP : (P.XP_NEXT[level] || 0) - (P.XP_NEXT[level - 1] || 0);
  return Math.max(5, Math.round(band * share / 5) * 5);
}

// Applies the hard limits. Returns what will actually happen, with the reasons
// any part of Claude's proposal was reduced, so the player sees it before rolling.
function bound(state, proposal, sceneId) {
  if (state.combat?.active) return { ok: false, error: 'During combat, use the combat controls. Improvised actions resume after the fight.' };
  const s = scene(state, sceneId);
  if (s.attempts >= MAX_ATTEMPTS_PER_SCENE) return { ok: false, error: 'You have tried everything this scene can offer. Choose an approach to move the story on.' };
  if (s.intents.includes(words(proposal.intent))) return { ok: false, error: 'You already attempted that here. Try a different approach.' };
  const p = { ...proposal }, notes = [];
  const level = state.player.level;
  if (p.difficulty === 'trivial') {
    if (!['none', 'insight'].includes(p.reward)) notes.push('No roll is needed, so it earns no material reward.');
    p.reward = p.reward === 'insight' ? 'insight' : 'none';
    p.risk = 'none';
  }
  if (p.reward === 'xp' && !XP_SHARE[p.difficulty]) { p.reward = 'insight'; notes.push('Only moderate or harder attempts earn XP.'); }
  if (p.reward === 'xp' && s.xpGranted) { p.reward = 'insight'; notes.push('This scene has already granted improvised XP.'); }
  if (p.reward === 'xp' && !xpFor(level, p.difficulty)) { p.reward = 'insight'; notes.push('You are at the level cap.'); }
  if (p.reward === 'xp' && !xpGain(state, p.difficulty)) { p.reward = 'insight'; notes.push('You are at the level this chapter of the story is written for. The story itself levels you from here.'); }
  if (p.reward === 'inspiration' && state.player.inspiration >= 3) { p.reward = 'insight'; notes.push('Inspiration is already full.'); }
  if (!['none', 'insight'].includes(p.reward) && s.rewards >= MAX_REWARDS_PER_SCENE) { p.reward = 'insight'; notes.push('This scene has no more material rewards to give.'); }
  if (p.risk === 'cost' && !state.player.gold) p.risk = 'setback';
  const effects = {
    reward: { none: 'nothing beyond the story', insight: 'a recorded discovery', coin: `${level}d4 gold`, xp: `${xpGain(state, p.difficulty)} XP`, inspiration: '1 Inspiration' }[p.reward],
    risk: { none: 'nothing beyond the story', setback: 'a story setback', harm: `${harmFormula(level)} damage to the hero`, cost: `up to ${level * 3} gold` }[p.risk]
  };
  return { ok: true, proposal: p, dc: DIFFICULTIES[p.difficulty], notes, effects };
}

// Improvised XP never takes the hero past the written chapter (src/book.js).
function xpGain(state, difficulty) { return Book.capXp(state, xpFor(state.player.level, difficulty)); }

function harmFormula(level) { return `${Math.max(1, Math.ceil(P.powerLevel(level) / 3))}d6`; }

// Called by the engine after it has rolled. `api` supplies the engine's own
// helpers so every change goes through the normal rules code.
function apply(state, plan, success, sceneId, rng, events, api) {
  const p = plan.proposal, level = state.player.level, improv = normalize(state);
  const s = improv.scenes[sceneId] || (improv.scenes[sceneId] = { attempts: 0, rewards: 0, xpGranted: false, intents: [] });
  s.attempts += 1; s.intents.push(words(p.intent));
  const text = success ? p.success : p.failure;
  events.push({ type: 'story', tone: success ? 'good' : 'bad', text });
  if (success) {
    if (p.reward === 'coin') { const gold = api.rollFormula(rng, `${level}d4`).total; state.player.gold += gold; events.push({ type: 'item', tone: 'good', text: `Gained ${gold} gold.` }); }
    if (p.reward === 'xp') { api.awardXp(state, xpGain(state, p.difficulty), events, 'Improvised success'); s.xpGranted = true; }
    if (p.reward === 'inspiration') { state.player.inspiration = Math.min(3, state.player.inspiration + 1); events.push({ type: 'resource', tone: 'good', text: 'Gained 1 Inspiration.' }); }
    if (!['none', 'insight'].includes(p.reward)) s.rewards += 1;
  } else {
    if (p.risk === 'harm') api.applyDamage(state.player, api.rollFormula(rng, harmFormula(level)).total, events, 'a failed attempt');
    if (p.risk === 'cost') { const lost = Math.min(state.player.gold, level * 3); state.player.gold -= lost; if (lost) events.push({ type: 'item', tone: 'bad', text: `Lost ${lost} gold.` }); }
  }
  improv.log.push({ turn: state.turnCount, scene: sceneId, intent: p.intent, success, text, reward: success ? p.reward : 'none', ...(p.remembered ? { remembered: true } : {}) });
  improv.log = improv.log.slice(-MAX_LOG);
  return text;
}

// Successful insights, and anything the people present will remember (an
// insult, a kindness), become journal facts so later turns (and Claude)
// remember them.
function journalFacts(state) {
  const log = Array.isArray(state.improv?.log) ? state.improv.log : [];
  return log.filter(e => e.success && e.reward === 'insight' || e.remembered === true).slice(-20).map((e, i) => ({
    id: `improv:${e.turn}:${i}`, title: clean(e.intent, 80), text: clean(e.text, TEXT.outcome),
    status: 'established', source: e.remembered === true && !(e.success && e.reward === 'insight') ? 'Improvised action the people present will remember' : 'Improvised action confirmed by a roll'
  }));
}

function summary(state, sceneId) {
  const s = scene(state, sceneId);
  return {
    attemptsLeft: Math.max(0, MAX_ATTEMPTS_PER_SCENE - s.attempts),
    materialRewardsLeft: Math.max(0, MAX_REWARDS_PER_SCENE - s.rewards),
    xpAvailable: !s.xpGranted,
    alreadyTried: s.attempts
  };
}

module.exports = { PROPOSAL_SCHEMA, DIFFICULTIES, REWARDS, RISKS, MAX_ATTEMPTS_PER_SCENE, MAX_REWARDS_PER_SCENE, validate, normalize, bound, apply, journalFacts, summary, xpFor, xpGain, harmFormula };
