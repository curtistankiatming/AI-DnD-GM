'use strict';
// The tavern roster (src/data/tavern-roster.json): 100 people a party with an
// empty place may hire at a tavern night (src/tavern.js). Each is built into a
// companion from one of four fighting templates, a little below a story
// companion (Curtis keeps the cost of declining Nessa), and added to the
// companion table by src/content.js so saves, combat, gear and the AI treat a
// hire like anyone else in the party.
const DATA = require('./data/tavern-roster.json');

const KINDS = Object.freeze({
  archer: {
    abilities: { str: 10, dex: 15, con: 12, int: 10, wis: 13, cha: 10 }, skills: ['perception', 'survival', 'stealth', 'nature'], signature: 'perception',
    maxHp: 10, ac: 13, attack: { name: 'Shortbow', bonus: 4, damage: '1d6+2', damageType: 'piercing', ranged: true },
    tactic: 'balanced', aiRole: 'scout', resources: { trickShot: 1 }, gearClass: 'ranger',
    loadout: { mainHand: 'shortbow', offHand: null, armor: 'leather-armor', accessory: null }
  },
  shield: {
    abilities: { str: 15, dex: 10, con: 14, int: 9, wis: 11, cha: 10 }, skills: ['athletics', 'intimidation', 'perception'], signature: 'athletics',
    maxHp: 13, ac: 15, attack: { name: 'Mace', bonus: 4, damage: '1d6+2', damageType: 'bludgeoning' },
    tactic: 'protective', aiRole: 'guardian', resources: { secondWind: 1 }, gearClass: 'fighter',
    loadout: { mainHand: 'war-mace', offHand: 'steel-shield', armor: 'leather-armor', accessory: null }
  },
  mender: {
    abilities: { str: 9, dex: 11, con: 12, int: 11, wis: 15, cha: 12 }, skills: ['medicine', 'insight', 'religion', 'persuasion'], signature: 'medicine',
    maxHp: 10, ac: 13, attack: { name: 'Sacred Flame', bonus: 4, damage: '1d8', damageType: 'radiant', save: 'dex' },
    tactic: 'support', aiRole: 'healer', resources: { healingWords: 2, guidingBolt: 1 }, gearClass: 'cleric',
    loadout: { mainHand: 'ash-wand', offHand: 'steel-shield', armor: 'leather-armor', accessory: null }
  },
  blade: {
    abilities: { str: 10, dex: 15, con: 12, int: 11, wis: 10, cha: 12 }, skills: ['stealth', 'acrobatics', 'sleightOfHand', 'deception'], signature: 'stealth',
    maxHp: 10, ac: 13, attack: { name: 'Shortsword', bonus: 4, damage: '1d6+2', damageType: 'piercing' },
    tactic: 'aggressive', aiRole: 'scout', resources: {}, gearClass: 'rogue',
    loadout: { mainHand: 'shortsword', offHand: null, armor: 'leather-armor', accessory: null }
  }
});
const KIND_WORD = Object.freeze({ archer: 'Archer', shield: 'Shield', mender: 'Healer', blade: 'Blade' });

const RECRUITS = Object.freeze(Object.fromEntries((DATA.recruits || []).map((r) => [r.id, Object.freeze({ ...r, from: Number(r.from) || 10, fee: Number(r.fee) || 4 })])));
const IDS = Object.freeze(Object.keys(RECRUITS));
const first = (r) => r.name.replace(/^(Mother|Sister|Sir) /, '').split(' ')[0];

// A recruit as a companion definition (the shape of src/data/companions.json).
function companion(r) {
  const k = KINDS[r.kind];
  if (!k) throw new Error(`Tavern recruit ${r.id} has unknown kind ${r.kind}`);
  return {
    id: r.id, name: r.name, role: r.role, pronouns: r.pronouns, summary: r.summary, personality: r.personality,
    abilities: { ...k.abilities }, skills: [...k.skills], maxHp: k.maxHp, ac: k.ac, attack: { ...k.attack },
    tactic: k.tactic, aiRole: k.aiRole, resources: { ...k.resources }, bond: 0,
    dialogue: { default: r.line }, signature: k.signature, gearClass: k.gearClass, loadout: { ...k.loadout },
    hired: true, kind: r.kind
  };
}
// Adds every recruit to the companion table (src/content.js).
function register(COMPANIONS) {
  for (const r of Object.values(RECRUITS)) {
    if (COMPANIONS[r.id] && !COMPANIONS[r.id].hired) throw new Error(`Tavern recruit ${r.id} clashes with a story companion`);
    COMPANIONS[r.id] = companion(r);
  }
  return COMPANIONS;
}
// The hire travelling with the party now, if any (one place, so at most one).
const hireIn = (state) => (state?.party || []).find((m) => RECRUITS[m.id]) || null;

module.exports = { KINDS, KIND_WORD, RECRUITS, IDS, first, companion, register, hireIn };
