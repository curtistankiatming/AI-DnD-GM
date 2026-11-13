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
const XP = require('./xp');
const Book = require('./book');
const Chronicle = require('./chronicle');

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
    arc: { type: 'string', description: 'The updated running throughline of the whole campaign after this adventure is offered: open threads, recurring people, where the story is heading. Under 120 words.' },
    cast: {
      type: 'array', description: 'Up to five named people in this adventure, new or returning from the chronicle (same spelling), with who they are now.',
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          name: { type: 'string' }, role: { type: 'string', description: 'Who they are, in a short phrase.' }, wants: { type: 'string' },
          status: { type: 'string', enum: [...Chronicle.STATUS] }, attitude: { type: 'string', enum: [...Chronicle.ATTITUDE], description: 'Toward the hero.' }
        },
        required: ['name', 'role', 'wants', 'status', 'attitude']
      }
    },
    places: {
      type: 'array', description: 'Up to three named places in this adventure, new or returning.',
      items: { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, note: { type: 'string', description: 'One short line.' } }, required: ['name', 'note'] }
    },
    threadsOpened: { type: 'array', items: { type: 'string' }, description: 'Up to three loose ends this adventure leaves for later, one sentence each.' },
    threadsClosed: { type: 'array', items: { type: 'string' }, description: 'Open threads from chronicle.openThreads that this adventure resolves, copied exactly. Usually empty.' },
    storyArc: {
      type: 'object', additionalProperties: false, description: 'This adventure\'s place in the story arc described by storyArc in the request. Leave title and premise empty for a side quest or trial.',
      properties: {
        title: { type: 'string', description: 'The arc\'s title. Only used when storyArc.status is new; otherwise repeat the given title.' },
        premise: { type: 'string', description: 'The big question the arc answers, one sentence. Only used when storyArc.status is new.' },
        nextHook: { type: 'string', description: 'One sentence that leads into the next chapter of the arc. Empty for a finale.' }
      },
      required: ['title', 'premise', 'nextHook']
    }
  },
  required: ['name', 'region', 'faction', 'brief', 'threat', 'opening', 'clue', 'investigate', 'route', 'crisis', 'peaceful', 'objective', 'foeName', 'enemyTheme', 'after', 'decisions', 'destination', 'arc', 'cast', 'places', 'threadsOpened', 'threadsClosed', 'storyArc']
});

const SYSTEM = [
  'You are the story director for Briarwatch, a story-first d20 fantasy campaign. Write the NEXT adventure (an expedition) for this party, as JSON that matches the schema.',
  'Continue the campaign: build on what the party chose, the people they met, their reputation and any open threads in the arc. Change direction when the story invites it; introduce new places, rivals and mysteries. Do not repeat a completed adventure.',
  'The game engine sets every number: level, difficulty, enemy strength, XP, gold and reputation sizes. Do not write numbers, prices, item rewards or level changes in any text. Do not promise items. Name skills only through the skill fields.',
  'Each failure must still move the story forward. Offer a real non-violent resolution and a fight-side objective. Decisions are permanent and should be morally interesting, not good-versus-evil.',
  'Respect the player\'s campaign preferences for tone and content. Keep each text field to a few sentences. Use plain English.',
  'The written story (the books) comes first. When book.running is true, write a SMALL side quest, not a new storyline: local stakes, one place, a few scenes, tied to the current chapter (book.chapter, book.chapterGoal) by a person, a clue or a favour. It may develop minor people and add flavour, but it must not resolve, spoil or replace the chapter, kill or remove a named character from the books, or open a new region. When book.running is false the books are finished and this is the hero\'s own story: continue it freely, building multi-adventure arcs from the arc and journal.',
  'The chronicle (when present) is the record of the hero\'s own story. Keep it consistent: bring back people from chronicle.cast by the same name, respect who is dead, missing or hostile, and pick up chronicle.openThreads before inventing new ones. Fill cast, places and threadsOpened for this adventure; list in threadsClosed only open threads it truly resolves, copied exactly.',
  'Beyond the books, every adventure is one chapter of a story arc (storyArc in the request). The game sets which chapter and beat it is; follow storyArc.guidance for that beat, continue from storyArc.lastHook and the earlier chapters of the arc, and fill the storyArc field. Each chapter is still a complete adventure with its own crisis and decisions.'
].join('\n');

function normalizeQuest(raw) {
  // Re-validate stored adventures on load; a hand-edited save cannot inject an
  // unbounded definition. The numbers are recomputed from the level.
  if (!raw || typeof raw !== 'object' || !/^ai-\d{1,4}-[a-z0-9]{7}$/.test(raw.id || '')) return null;
  const level = Math.max(1, Math.min(P.MAX_LEVEL, Math.floor(Number(raw.level) || 1)));
  const out = bound({ level, power: raw.power, tier: raw.tier, trial: raw.trial, side: raw.side === true, town: raw.town, unlock: 'bell' }, raw, raw.id);
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
      if (phase !== 'after') node.act = `${q.trial ? TRIALS[q.trial].label : 'AI-directed expedition'} • ${q.power ? `Renown challenge ${q.power}` : `Level ${q.level}`}${q.tier && !q.trial ? ` • ${XP.tier(q.tier).name}` : ''}`;
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
const openAdventures = state => open(state).filter(q => !q.trial);

// A quest pays a share of the hero's current level (one renown rank past the
// final level); the battle inside it pays separately by its rating. Hard and
// Heroic adventures multiply both. Gold grows with the challenge level.
function rewards(level, power = level, tierId = 'normal', trial = null, side = false) {
  const t = XP.tier(tierId);
  if (side) return { xp: Math.round(XP.share(level, XP.MISSION_SHARE) * t.reward / 10) * 10, gold: Math.round((10 + power * 10) * t.reward) };
  if (trial) return { xp: XP.share(level, XP.TRIAL_SHARE), gold: Math.round((20 + power * 20) * t.reward) };
  return { xp: Math.round(XP.share(level, XP.QUEST_SHARE) * t.reward / 10) * 10, gold: Math.round((20 + power * 20) * t.reward) };
}
// A job trial is always fought at Hard and pays half a level once.
// The 4th job's legendary trial is fought at Heroic.
const TRIALS = Object.freeze({
  third: { level: P.THIRD_JOB_LEVEL, tier: 'hard', job: '3rd', label: '3rd job trial' },
  fourth: { level: P.FOURTH_JOB_LEVEL, tier: 'heroic', job: '4th', label: 'Legendary trial' }
});

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
  const trial = Object.hasOwn(TRIALS, state.trial) ? state.trial : null;
  // A side quest: what the AI may write while a book is still running (src/book.js).
  const side = !trial && state.side === true;
  const tier = XP.tier(trial ? TRIALS[trial].tier : state.tier);
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
    name, level, ...(power > level ? { power } : {}), ...(tier.id !== 'normal' ? { tier: tier.id } : {}), ...(trial ? { trial } : {}), ...(side ? { side: true } : {}), town, unlock: 'bell', region: text(draft.region, TEXT.short, 'The wider roads'),
    faction: FACTIONS.includes(draft.faction) ? draft.faction : 'wardens',
    brief: text(draft.brief, TEXT.brief, name), threat: text(draft.threat, TEXT.brief, 'Little is known.'),
    opening: text(draft.opening, TEXT.long, 'The road leads somewhere new.'), clue: text(draft.clue, TEXT.brief, 'A lead worth following.'),
    investigate, route, crisis: text(draft.crisis, TEXT.long, 'The moment of decision arrives.'), peaceful, objective,
    foeName: text(draft.foeName, TEXT.name, 'The Opposition'), enemyTheme: THEMES.includes(draft.enemyTheme) ? draft.enemyTheme : 'soldier',
    after: text(draft.after, TEXT.long, 'The dust settles.'),
    nextTown: destination(state, draft.destination || draft.nextTown, town),
    ...rewards(level, power, tier.id, trial, side)
  };
  // Story memory for the chronicle (src/chronicle.js): text only, bounded.
  const list = (v, n) => (Array.isArray(v) ? v : []).slice(0, n);
  const cast = list(draft.cast, 5).map(c => ({ name: text(c?.name, TEXT.name), role: text(c?.role, TEXT.short), wants: text(c?.wants, TEXT.short), status: Chronicle.STATUS.includes(c?.status) ? c.status : 'alive', attitude: Chronicle.ATTITUDE.includes(c?.attitude) ? c.attitude : 'neutral' })).filter(c => c.name.length >= 2);
  const places = list(draft.places, 3).map(p => ({ name: text(p?.name, TEXT.name), note: text(p?.note, TEXT.short) })).filter(p => p.name.length >= 2);
  const opened = list(draft.threadsOpened ?? draft.threads?.opened, 3).map(t => text(t, TEXT.short)).filter(t => t.length >= 3);
  const closed = list(draft.threadsClosed ?? draft.threads?.closed, 5).map(t => text(t, TEXT.short)).filter(t => t.length >= 3);
  Object.assign(body, cast.length ? { cast } : {}, places.length ? { places } : {}, opened.length || closed.length ? { threads: { opened, closed } } : {});
  // The engine's arc tag (set at commission) or the stored one, re-checked.
  const storyArc = !side && !trial ? Chronicle.arcTag(state.arcTag || draft.storyArc) : null;
  if (storyArc) body.storyArc = storyArc;
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
  if (!w.completed?.bell) return 'Finish the bell investigation first. After that, the AI game master can write new adventures for you.';
  if (!STORY_NODES[state.story?.nodeId]?.townId) return 'Ask for a new adventure from a town.';
  if (openAdventures(state).length >= OPEN_LIMIT) return 'An adventure written for you is already waiting. Finish it or dismiss it before asking for another.';
  return null;
}

// Job trials: at level 40 (3rd job) and 70 (4th job) a hero asks for their
// branch's trial in town. A trial does not count against the one-adventure limit.
function trialAvailability(state) {
  const p = P.ensure(state.player), b = P.branchOf(state.player), kind = P.nextTrial(state.player);
  if (!b) return 'Choose your 2nd job branch first.';
  if (!kind) {
    if (p.thirdJob && p.fourthJob) return `You are already a ${b.fourth}.`;
    const next = p.thirdJob ? 'fourth' : 'third';
    return `Reach level ${TRIALS[next].level} to face the ${b[next]} trial.`;
  }
  if (state.combat?.active) return 'Finish the fight first.';
  if (!STORY_NODES[state.story?.nodeId]?.townId) return 'Ask for your trial from a town.';
  if (open(state).some(q => q.trial === kind)) return 'Your trial is already on the expedition board.';
  return null;
}
// The written trial, used when the AI game master is off. Each branch's trial
// tests what that job is about.
const TRIAL_SKILLS = {
  fighter: ['athletics', 'intimidation', 'athletics'], rogue: ['stealth', 'deception', 'sleightOfHand'], wizard: ['arcana', 'investigation', 'arcana'],
  cleric: ['religion', 'insight', 'medicine'], ranger: ['survival', 'perception', 'nature'], bard: ['performance', 'persuasion', 'history']
};
const TRIAL_PLACES = {
  third: { region: 'The Proving Ground beyond the old border road', ground: 'the Proving Ground', judges: 'elders', judge: 'examiner' },
  fourth: { region: 'The Hall of Legends above the Highpass peaks', ground: 'the Hall of Legends', judges: 'legends of old', judge: 'legend' }
};
function writtenTrial(state, kind = P.nextTrial(state.player) || 'third') {
  const b = P.branchOf(state.player), [route, peace, obj] = TRIAL_SKILLS[state.player.classId] || TRIAL_SKILLS.fighter;
  const hero = state.player.name, from = kind === 'fourth' ? b.third : b.name, to = b[kind], at = TRIAL_PLACES[kind];
  const Judge = at.judge[0].toUpperCase() + at.judge.slice(1);
  return {
    name: `The ${to} Trial`, region: at.region, faction: 'wardens',
    brief: `The ${at.judges} of the ${b.name} path have named ${hero} a candidate. Pass their trial to rise from ${from} to ${to}.`,
    threat: `The trial ends with a ${at.judge} who fights the way a ${to} must: ${b.style.toLowerCase()}`,
    opening: `Banners of every ${from} who came before line the road to ${at.ground}. A ${at.judge} waits at the gate.`,
    clue: `The ${at.judges} care less about winning than about how a ${to} wins.`,
    investigate: { label: `Hear the ${at.judges} out`, skill: 'insight', alt: ['history', 'persuasion'], success: 'They tell you what the last candidate got wrong.', failure: 'They say little, but you learn the order of the trials.' },
    route: { label: `Walk the road to ${at.ground}`, skill: route, alt: ['athletics', 'survival'], tools: [], success: 'You reach the final circle with strength to spare.', failure: 'The road takes its toll, but you reach the final circle.' },
    crisis: `The final ${at.judge} steps into the circle. ${b.style} Show that you are ready.`,
    peaceful: { label: `Answer the ${at.judge} with the creed of your path`, skill: peace, alt: ['persuasion', 'insight'], success: `The ${at.judge} lowers their weapon and bows.`, failure: `The ${at.judge} shakes their head and raises their weapon.` },
    objective: { name: 'The trial marker', label: 'Claim the trial marker', description: `Take the marker from the centre of the circle while the ${at.judge} watches.`, skill: obj, alt: ['athletics', 'acrobatics'], failText: `The marker slips away; the ${at.judge} presses on.`, successText: 'The marker is yours.' },
    foeName: `The ${to} ${Judge}`, enemyTheme: 'soldier',
    after: `The ${at.judges} gather. The banner of the ${to} is yours to carry.`,
    decisions: [
      { label: 'Swear to guard the border roads', text: 'The wardens count on your new rank.', favors: 'wardens', also: 'wilds' },
      { label: 'Swear to protect the trade roads', text: 'The merchants will remember the oath.', favors: 'trade', also: 'wardens' }
    ]
  };
}
// Engine action: put the due job trial on the board, from Claude's draft or
// the written trial.
function commissionTrial(state, draft, events) {
  const blocked = trialAvailability(state);
  if (blocked) return { ok: false, error: blocked };
  const d = normalize(state), b = P.branchOf(state.player), kind = P.nextTrial(state.player), to = b[kind];
  let out = draft ? bound({ ...state, trial: kind }, draft) : null;
  const written = !out?.ok;
  if (written) out = bound({ ...state, trial: kind }, writtenTrial(state, kind));
  if (!out.ok) return out;
  const q = finalize({ ...out.quest, createdDay: state.world.day, createdLevel: out.quest.level }, d.count + 1);
  d.count += 1;
  d.quests[q.id] = install(q);
  const text = `Your ${to} trial is on the expedition board: ${q.name}. ${q.brief} Pass it to become a ${to}. Reward: ${q.xp} XP and ${q.gold} gold.${written && draft ? ' The written trial was used because the AI draft could not be used.' : ''}`;
  events.push({ type: 'quest', tone: 'good', text });
  return { ok: true, kind: 'director', questId: q.id, trial: kind, written, outcomeText: text };
}

// Engine action: add a bounded adventure to the board.
function commission(state, draft, events) {
  const blocked = availability(state);
  if (blocked) return { ok: false, error: blocked };
  const d = normalize(state);
  const side = Book.running(state);
  // Validate first, so a bad draft never opens or renames an arc.
  const check = bound({ ...state, side }, draft);
  if (!check.ok) return check;
  const arcTag = side ? null : Chronicle.arcSlot(state, draft.storyArc);
  const out = bound({ ...state, side, arcTag }, draft);
  if (!out.ok) return out;
  const q = finalize({ ...out.quest, createdDay: state.world.day, createdLevel: out.quest.level }, d.count + 1);
  if (quest(state, q.id)) return { ok: false, error: 'That adventure is already on the board.' };
  d.count += 1;
  d.quests[q.id] = install(q);
  if (out.arc) d.arc = out.arc;
  prune(state);
  const room = Book.xpRoom(state);
  const capNote = side && room < q.xp ? ` ${room ? `Only ${room} XP of it counts` : 'It pays no XP'}: you are at the level this chapter of the story is written for, and the story itself levels you from here.` : '';
  const text = side
    ? `New side quest on the expedition board: ${q.name} (level ${q.level}). ${q.brief} Reward: ${q.xp} XP and ${q.gold} gold.${capNote}`
    : `New adventure on the expedition board: ${q.name} (${q.power ? `renown challenge ${q.power}` : `level ${q.level}`}).${q.storyArc ? ` Story arc: ${q.storyArc.title}, part ${q.storyArc.chapter} of ${q.storyArc.of}.` : ''} ${q.brief} Reward: ${q.xp} XP and ${q.gold} gold.`;
  events.push({ type: 'quest', tone: 'good', text });
  return { ok: true, kind: 'director', questId: q.id, outcomeText: text };
}

function dismiss(state, id, events) {
  const q = state.director?.quests?.[id];
  if (!q || state.world.completed?.[id]) return { ok: false, error: 'That generated adventure is not on the board.' };
  if (state.world.activeQuest === id || state.world.progress?.[id]?.node) return { ok: false, error: 'You have already started that adventure. Finish it instead.' };
  delete state.director.quests[id];
  const text = `${q.name} is removed from the board. Ask the game master for another adventure when you are ready.`;
  events.push({ type: 'quest', tone: 'neutral', text });
  return { ok: true, kind: 'director', outcomeText: text };
}

// The player picks Normal, Hard or Heroic before departing. The adventure is
// rebuilt from its stored text with the new challenge and rewards.
function setTier(state, id, tierId, events) {
  const q = state.director?.quests?.[id];
  if (!q || state.world.completed?.[id]) return { ok: false, error: 'That adventure is not on the board.' };
  if (q.trial) return { ok: false, error: `A ${TRIALS[q.trial].label.toLowerCase()} is always ${XP.tier(TRIALS[q.trial].tier).name}.` };
  if (!Object.hasOwn(XP.TIERS, tierId)) return { ok: false, error: 'Choose Normal, Hard or Heroic.' };
  if (state.world.activeQuest === id || state.world.progress?.[id]?.node) return { ok: false, error: 'The difficulty is fixed once you set out.' };
  const out = bound({ level: q.level, power: q.power, tier: tierId, side: q.side === true, town: q.town }, q, id);
  if (!out.ok) return out;
  const n = finalize({ ...out.quest, createdDay: q.createdDay, createdLevel: q.createdLevel });
  state.director.quests[id] = install(n);
  const t = XP.tier(tierId);
  const text = `${n.name} is set to ${t.name}. ${t.description} Reward: ${n.xp} XP and ${n.gold} gold, plus XP for its battle.`;
  events.push({ type: 'quest', tone: 'neutral', text });
  return { ok: true, kind: 'director', questId: id, outcomeText: text };
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
function prompt(state, { hint = '', journal = '', instructions = '', trial = false } = {}) {
  const w = state.world;
  const completed = Object.entries(w.completed || {}).map(([id, r]) => {
    const q = quest(state, id);
    const chosen = (q?.decisions || []).filter(x => state.story.flags[x.flag]).map(x => x.label);
    return { name: q?.name || r.name || (id === 'bell' ? 'The Bell Beneath Briarwatch' : id), resolved: r.quality, decision: chosen[0] || null, day: r.day };
  });
  return JSON.stringify({
    request: clean(hint, TEXT.hint) || 'Surprise us with what happens next.',
    preferences: clean(instructions, 1200),
    hero: { name: state.player.name, class: state.player.className, background: state.player.backgroundName, level: state.player.level, renownRank: P.renownRank(state.player), job: P.jobView(state.player)?.title, branchStyle: P.branchOf(state.player)?.style || null },
    ...(trial ? { trial: trialBrief(state) } : {}),
    party: state.party.map(m => ({ name: m.name, bond: m.bond })),
    day: w.day, town: TOWNS[w.townId]?.name, knownTowns: w.unlockedTowns.map(id => TOWNS[id].name),
    reputation: w.reputation,
    completedAdventures: completed.slice(-15),
    book: Book.facts(state),
    chronicle: Chronicle.forPrompt(state),
    ...(!trial && !Book.running(state) ? { storyArc: Chronicle.arcBrief(state) } : {}),
    upcomingAuthoredAdventures: Object.values(QUESTS).filter(q => !w.completed?.[q.id]).slice(0, 3).map(q => q.name),
    arc: state.director?.arc || '',
    journal
  });
}

function trialBrief(state) {
  const b = P.branchOf(state.player), kind = P.nextTrial(state.player) || 'third', from = kind === 'fourth' ? b.third : b.name;
  return `This adventure is ${state.player.name}'s ${kind === 'fourth' ? 'legendary 4th job trial' : '3rd job trial'}: the test that turns a ${from} into a ${b[kind]}. ${b.style} Make the opening, crisis and objective test exactly that, ending with an examiner, rival or ordeal worthy of the title. Name the adventure after the trial.`;
}
function trialView(state) {
  const b = P.branchOf(state.player), kind = P.nextTrial(state.player);
  if (!kind) return null;
  const q = open(state).find(x => x.trial === kind);
  const blocked = trialAvailability(state);
  return { kind, job: TRIALS[kind].job, label: TRIALS[kind].label, tier: XP.tier(TRIALS[kind].tier).name, level: TRIALS[kind].level, branch: b.name, from: kind === 'fourth' ? b.third : b.name, title: b[kind], third: b.third, style: b.style,
    canRequest: !blocked, reason: blocked, questId: q?.id || null, started: Boolean(q && (state.world.activeQuest === q.id || state.world.progress?.[q.id]?.node)) };
}
function view(state) {
  const blocked = availability(state);
  return {
    canCommission: !blocked, reason: blocked, arc: state.director?.arc || '', sideQuests: Book.running(state),
    open: openAdventures(state).map(q => ({ id: q.id, name: q.name, side: q.side === true, started: Boolean(state.world.activeQuest === q.id || state.world.progress?.[q.id]?.node) })),
    trial: trialView(state),
    generated: list(state).length
  };
}

module.exports = { SCHEMA, SYSTEM, THEMES, FACTIONS, TOOLS, OPEN_LIMIT, TRIALS, normalize, install, quest, list, open, bound, rewards, commission, commissionTrial, trialAvailability, writtenTrial, dismiss, setTier, prompt, view, availability };
