'use strict';
// AI story director. Claude writes a new adventure (an expedition in the same
// shape as the authored QUESTS); this module is the editor that bounds it.
// Claude chooses the story, the people, the place, which skills matter and
// which factions a decision favours. The engine decides the numbers: level,
// DCs, enemy statistics, XP, gold and reputation sizes all come from the same
// formulas as authored expeditions, so a generated adventure can never hand
// out more than a level-appropriate reward.
//
// Generated adventures live in the save (state.director) and are re-installed
// into the story registries whenever a save is loaded, so they survive
// reloads and work in the offline browser build without a model.
const { SKILLS, ITEMS, STORY_NODES, ENCOUNTERS, ENEMIES, CLUES } = require('./content');
const { QUESTS, TOWNS, installQuest } = require('./expansion');
const P = require('./progression');

const VERSION = 1;
const OPEN_LIMIT = 1;        // Unfinished generated adventures at one time.
const MAX_STORED = 40;       // Older completed adventures are pruned beyond this.
const THEMES = Object.freeze(['wild', 'undead', 'storm', 'construct', 'soldier', 'caster']);
const FACTIONS = Object.freeze(['wardens', 'trade', 'wilds']);
const TOOLS = Object.freeze(Object.values(ITEMS).filter(i => i.category === 'tool' && i.id !== 'healers-kit').map(i => i.id));
const SKILL_IDS = Object.freeze(Object.keys(SKILLS));
const TEXT = Object.freeze({ name: 80, short: 120, label: 120, brief: 400, long: 900, arc: 900, hint: 400 });

const clean = (value, limit) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
const skill = value => SKILL_IDS.includes(value) ? value : null;
const alts = (list, main) => [...new Set((Array.isArray(list) ? list : []).filter(x => skill(x) && x !== main))].slice(0, 3);

function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36).padStart(7, '0').slice(-7);
}

const check = desc => ({
  type: 'object', additionalProperties: false, description: desc,
  properties: {
    label: { type: 'string', description: 'Button text for the player, an imperative phrase.' },
    skill: { type: 'string', enum: SKILL_IDS },
    alt: { type: 'array', items: { type: 'string', enum: SKILL_IDS }, description: 'Up to three other skills that also fit.' },
    success: { type: 'string' },
    failure: { type: 'string', description: 'Failure must still move the story forward.' }
  },
  required: ['label', 'skill', 'alt', 'success', 'failure']
});

// The adventure Claude writes. Every field is required so strict structured
// output always returns a complete draft. Numbers are deliberately absent.
const SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    name: { type: 'string', description: 'Adventure title, a few words.' },
    region: { type: 'string', description: 'Where it happens.' },
    faction: { type: 'string', enum: FACTIONS, description: 'Who asks for help.' },
    brief: { type: 'string', description: 'One or two sentences for the expedition board.' },
    threat: { type: 'string', description: 'What a paid tavern briefing reveals, including which equipment helps.' },
    opening: { type: 'string', description: 'The scene as the party arrives.' },
    clue: { type: 'string', description: 'The established lead the party records on investigating.' },
    investigate: check('How the party investigates first. Failure still yields the lead.'),
    route: {
      ...check('How the party approaches the crisis. Failure causes injury but continues.'),
      properties: { ...check('').properties, tools: { type: 'array', items: { type: 'string', enum: TOOLS }, description: 'Equipment that helps this approach, or empty.' }, poison: { type: 'boolean' } },
      required: ['label', 'skill', 'alt', 'success', 'failure', 'tools', 'poison']
    },
    crisis: { type: 'string', description: 'The deciding moment: what is at stake and what the opposition does.' },
    peaceful: check('A complete non-violent resolution of the crisis.'),
    objective: {
      type: 'object', additionalProperties: false, description: 'The goal the party pursues during the fight if talking fails.',
      properties: {
        name: { type: 'string' }, label: { type: 'string', description: 'Imperative phrase, e.g. "Seal the flooded vault".' },
        description: { type: 'string' }, skill: { type: 'string', enum: SKILL_IDS },
        alt: { type: 'array', items: { type: 'string', enum: SKILL_IDS } },
        failText: { type: 'string', description: 'Consequence if the deadline passes; the fight continues.' },
        successText: { type: 'string' }
      },
      required: ['name', 'label', 'description', 'skill', 'alt', 'failText', 'successText']
    },
    foeName: { type: 'string', description: 'The main opponent.' },
    enemyTheme: { type: 'string', enum: THEMES },
    after: { type: 'string', description: 'The aftermath scene before the final decision.' },
    decisions: {
      type: 'array', description: 'Two or three permanent choices about what the party leaves behind.',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          label: { type: 'string' }, text: { type: 'string', description: 'What follows from this choice.' },
          favors: { type: 'string', enum: FACTIONS }, also: { type: 'string', enum: ['none', ...FACTIONS] }
        },
        required: ['label', 'text', 'favors', 'also']
      }
    },
    destination: { type: 'string', enum: Object.keys(TOWNS), description: 'The town the party returns to afterwards.' },
    arc: { type: 'string', description: 'The updated running throughline of the whole campaign after this adventure is offered: open threads, recurring people, where the story is heading. Under 120 words.' }
  },
  required: ['name', 'region', 'faction', 'brief', 'threat', 'opening', 'clue', 'investigate', 'route', 'crisis', 'peaceful', 'objective', 'foeName', 'enemyTheme', 'after', 'decisions', 'destination', 'arc']
});

const SYSTEM = [
  'You are the story director for Briarwatch, a story-first d20 fantasy campaign. Write the NEXT adventure (an expedition) for this party, as JSON that matches the schema.',
  'Continue the campaign: build on what the party chose, the people they met, their reputation and any open threads in the arc. Change direction when the story invites it; introduce new places, rivals and mysteries. Do not repeat a completed adventure.',
  'The game engine sets every number: level, difficulty, enemy strength, XP, gold and reputation sizes. Do not write numbers, prices, item rewards or level changes in any text. Do not promise items. Name skills only through the skill fields.',
  'Each failure must still move the story forward. Offer a real non-violent resolution and a fight-side objective. Decisions are permanent and should be morally interesting, not good-versus-evil.',
  'Respect the player\'s campaign preferences for tone and content. Keep each text field to a few sentences. Use plain English.'
].join('\n');

function normalizeQuest(raw) {
  // Re-validate stored adventures on load; a hand-edited save cannot inject an
  // unbounded definition. The numbers are recomputed from the level.
  if (!raw || typeof raw !== 'object' || !/^ai-\d{1,4}-[a-z0-9]{7}$/.test(raw.id || '')) return null;
  const level = Math.max(1, Math.min(P.MAX_LEVEL, Math.floor(Number(raw.level) || 1)));
  const out = bound({ level, power: raw.power, town: raw.town, unlock: 'bell' }, raw, raw.id);
  return out.ok ? finalize({ ...out.quest, createdDay: Math.max(1, Math.floor(Number(raw.createdDay) || 1)), createdLevel: level }) : null;
}

function normalize(state) {
  const raw = state.director && typeof state.director === 'object' ? state.director : {};
  const quests = {};
  for (const q of Object.values(raw.quests && typeof raw.quests === 'object' ? raw.quests : {})) {
    const n = normalizeQuest(q);
    if (n) quests[n.id] = n;
  }
  state.director = {
    version: VERSION,
    count: Math.max(Object.keys(quests).length, Math.min(9999, Math.floor(Number(raw.count) || 0))),
    arc: clean(raw.arc, TEXT.arc),
    quests
  };
  for (const q of Object.values(quests)) install(q);
  return state.director;
}

function install(q) {
  // Content-hashed ids make re-installing the same adventure idempotent.
  if (!STORY_NODES[`q-${q.id}-start`] || STORY_NODES[`q-${q.id}-start`].directorHash !== q.hash) {
    installQuest(q);
    for (const phase of ['start', 'approach', 'crisis', 'after']) {
      const node = STORY_NODES[`q-${q.id}-${phase}`];
      node.directorHash = q.hash;
      node.generated = true;
      if (phase !== 'after') node.act = `AI-directed expedition • ${q.power ? `Renown challenge ${q.power}` : `Level ${q.level}`}`;
    }
  }
  return q;
}

function quest(state, id) {
  if (typeof id !== 'string') return null;
  if (Object.hasOwn(QUESTS, id)) return QUESTS[id];
  return state?.director?.quests && Object.hasOwn(state.director.quests, id) ? state.director.quests[id] : null;
}
const list = state => Object.values(state?.director?.quests || {});
const open = state => list(state).filter(q => !state.world?.completed?.[q.id]);

// Past level 10 the band is one renown rank, so about three or four
// adventures earn the next rank. Gold grows with the challenge level.
function rewards(level, power = level) {
  const band = level < P.MAX_LEVEL ? P.XP_NEXT[level] - (P.XP_NEXT[level - 1] || 0) : P.RANK_XP;
  return { xp: Math.round(band * 0.3 / 10) * 10, gold: 20 + power * 20 };
}

// The director may send the party home to any town it has already reached; it
// cannot open a locked region early.
function destination(state, id, fallback) {
  const known = Array.isArray(state.world?.unlockedTowns) ? state.world.unlockedTowns : Object.keys(TOWNS);
  return TOWNS[id] && known.includes(id) ? id : fallback;
}

// Turn Claude's draft into an expedition definition the engine can install.
function bound(state, draft, forcedId = null) {
  const fail = error => ({ ok: false, error });
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return fail('The new adventure was incomplete. Nothing was added.');
  const level = Math.max(1, Math.min(P.MAX_LEVEL, Math.floor(Number(state.level ?? state.player?.level) || 1)));
  // Challenge level: the hero's level, plus renown at level 10 (capped).
  const extra = state.player ? P.renownPower(state.player) : Math.floor(Number(state.power) - level) || 0;
  const power = level < P.MAX_LEVEL ? level : level + Math.max(0, Math.min(P.RENOWN_POWER_CAP, extra));
  const town = TOWNS[state.town] ? state.town : TOWNS[state.world?.townId] ? state.world.townId : 'briarwatch';
  const text = (v, limit, fallback = '') => clean(v, limit) || fallback;
  const ck = (raw, label) => {
    const main = skill(raw?.skill);
    if (!main) return null;
    return { label: text(raw.label, TEXT.label, label), skill: main, alt: alts(raw.alt, main), success: text(raw.success, TEXT.long, 'It works.'), failure: text(raw.failure, TEXT.long, 'It does not go to plan, but the way forward remains.') };
  };
  const name = text(draft.name, TEXT.name);
  if (name.length < 3) return fail('The new adventure had no title. Nothing was added.');
  const investigate = ck(draft.investigate, 'Investigate'), route = ck(draft.route, 'Approach carefully'), peaceful = ck(draft.peaceful, 'Resolve it without a fight');
  if (!investigate || !route || !peaceful) return fail('The new adventure named an unknown skill. Nothing was added.');
  route.tools = [...new Set((Array.isArray(draft.route.tools) ? draft.route.tools : []).filter(t => TOOLS.includes(t)))].slice(0, 2);
  if (draft.route.poison === true) route.poison = true;
  const o = draft.objective || {};
  const objSkill = skill(o.skill);
  if (!objSkill) return fail('The new adventure objective named an unknown skill. Nothing was added.');
  const objective = {
    name: text(o.name, TEXT.short, name), label: text(o.label, TEXT.label, 'Complete the objective'),
    description: text(o.description, TEXT.brief, 'Four successful actions complete the objective.'),
    skill: objSkill, alt: alts(o.alt, objSkill), target: 4, deadline: 6,
    failText: text(o.failText, TEXT.brief, 'The opportunity narrows; the fight continues.'), successText: text(o.successText, TEXT.brief, 'The objective is complete.')
  };
  const raw = (Array.isArray(draft.decisions) ? draft.decisions : []).slice(0, 3);
  const decisions = raw.map((d, i) => {
    // Drafts name factions; stored adventures carry the derived rep object.
    const stored = d?.rep && typeof d.rep === 'object' ? Object.entries(d.rep).sort((a, b) => b[1] - a[1]).map(([k]) => k) : [];
    const favors = FACTIONS.includes(d?.favors) ? d.favors : FACTIONS.includes(stored[0]) ? stored[0] : null;
    if (!favors) return null;
    const also = d.also ?? stored[1];
    const rep = { [favors]: 2 };
    if (FACTIONS.includes(also) && also !== favors) rep[also] = 1;
    return { id: `d${i + 1}`, label: text(d.label, TEXT.label, `Choice ${i + 1}`), text: text(d.text, TEXT.long, 'The choice is recorded.'), rep };
  }).filter(Boolean);
  if (decisions.length < 2) return fail('The new adventure needs at least two final decisions. Nothing was added.');
  const body = {
    name, level, ...(power > level ? { power } : {}), town, unlock: 'bell', region: text(draft.region, TEXT.short, 'The wider roads'),
    faction: FACTIONS.includes(draft.faction) ? draft.faction : 'wardens',
    brief: text(draft.brief, TEXT.brief, name), threat: text(draft.threat, TEXT.brief, 'Little is known.'),
    opening: text(draft.opening, TEXT.long, 'The road leads somewhere new.'), clue: text(draft.clue, TEXT.brief, 'A lead worth following.'),
    investigate, route, crisis: text(draft.crisis, TEXT.long, 'The moment of decision arrives.'), peaceful, objective,
    foeName: text(draft.foeName, TEXT.name, 'The Opposition'), enemyTheme: THEMES.includes(draft.enemyTheme) ? draft.enemyTheme : 'soldier',
    after: text(draft.after, TEXT.long, 'The dust settles.'),
    nextTown: destination(state, draft.destination || draft.nextTown, town),
    ...rewards(level, power)
  };
  const digest = hash(JSON.stringify(body) + JSON.stringify(decisions));
  const id = forcedId || null;
  const q = { ...body, id, hash: digest, generated: true, decisions };
  return { ok: true, quest: q, arc: clean(draft.arc, TEXT.arc) };
}

function finalize(q, n) {
  const id = q.id || `ai-${n}-${q.hash}`;
  return {
    ...q, id, foe: `${id}-foe`,
    decisions: q.decisions.map(d => ({ ...d, flag: `${id}:${d.id}` }))
  };
}

function availability(state) {
  const w = state.world || {};
  if (state.combat?.active) return 'Finish the fight before asking for a new adventure.';
  if (!w.completed?.bell) return 'Finish the bell investigation first; the director continues the story from there.';
  if (!STORY_NODES[state.story?.nodeId]?.townId) return 'Ask for a new adventure from a town.';
  if (open(state).length >= OPEN_LIMIT) return 'A director adventure is already waiting on the expedition board. Complete or dismiss it first.';
  return null;
}

// Engine action: add a bounded adventure to the board.
function commission(state, draft, events) {
  const blocked = availability(state);
  if (blocked) return { ok: false, error: blocked };
  const d = normalize(state);
  const out = bound(state, draft);
  if (!out.ok) return out;
  const q = finalize({ ...out.quest, createdDay: state.world.day, createdLevel: out.quest.level }, d.count + 1);
  if (quest(state, q.id)) return { ok: false, error: 'That adventure is already on the board.' };
  d.count += 1;
  d.quests[q.id] = install(q);
  if (out.arc) d.arc = out.arc;
  prune(state);
  const text = `New adventure on the expedition board: ${q.name} (${q.power ? `renown challenge ${q.power}` : `level ${q.level}`}). ${q.brief} Reward: ${q.xp} XP and ${q.gold} gold.`;
  events.push({ type: 'quest', tone: 'good', text });
  return { ok: true, kind: 'director', questId: q.id, outcomeText: text };
}

function dismiss(state, id, events) {
  const q = state.director?.quests?.[id];
  if (!q || state.world.completed?.[id]) return { ok: false, error: 'That generated adventure is not on the board.' };
  if (state.world.activeQuest === id || state.world.progress?.[id]?.node) return { ok: false, error: 'You have already started that adventure. Finish it instead.' };
  delete state.director.quests[id];
  const text = `${q.name} is removed from the board. Ask the director for another adventure when you are ready.`;
  events.push({ type: 'quest', tone: 'neutral', text });
  return { ok: true, kind: 'director', outcomeText: text };
}

function prune(state) {
  const d = state.director;
  const done = Object.values(d.quests).filter(q => state.world.completed?.[q.id]).sort((a, b) => a.createdDay - b.createdDay);
  while (Object.keys(d.quests).length > MAX_STORED && done.length) {
    const q = done.shift();
    state.world.completed[q.id].name ||= q.name;
    delete d.quests[q.id];
  }
}

// What Claude sees. Facts come from the game state, never from earlier prose.
function prompt(state, { hint = '', journal = '', instructions = '' } = {}) {
  const w = state.world;
  const completed = Object.entries(w.completed || {}).map(([id, r]) => {
    const q = quest(state, id);
    const chosen = (q?.decisions || []).filter(x => state.story.flags[x.flag]).map(x => x.label);
    return { name: q?.name || r.name || (id === 'bell' ? 'The Bell Beneath Briarwatch' : id), resolved: r.quality, decision: chosen[0] || null, day: r.day };
  });
  return JSON.stringify({
    request: clean(hint, TEXT.hint) || 'Surprise us with what happens next.',
    preferences: clean(instructions, 1200),
    hero: { name: state.player.name, class: state.player.className, background: state.player.backgroundName, level: state.player.level, renownRank: P.renownRank(state.player) },
    party: state.party.map(m => ({ name: m.name, bond: m.bond })),
    day: w.day, town: TOWNS[w.townId]?.name, knownTowns: w.unlockedTowns.map(id => TOWNS[id].name),
    reputation: w.reputation,
    completedAdventures: completed.slice(-15),
    upcomingAuthoredAdventures: Object.values(QUESTS).filter(q => !w.completed?.[q.id]).slice(0, 3).map(q => q.name),
    arc: state.director?.arc || '',
    journal
  });
}

function view(state) {
  const blocked = availability(state);
  return {
    canCommission: !blocked, reason: blocked, arc: state.director?.arc || '',
    open: open(state).map(q => ({ id: q.id, name: q.name, started: Boolean(state.world.activeQuest === q.id || state.world.progress?.[q.id]?.node) })),
    generated: list(state).length
  };
}

module.exports = { SCHEMA, SYSTEM, THEMES, FACTIONS, TOOLS, OPEN_LIMIT, normalize, install, quest, list, open, bound, rewards, commission, dismiss, prompt, view, availability };
