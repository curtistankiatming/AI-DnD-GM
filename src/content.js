"use strict";

const ABILITIES = {
  str: { id: "str", name: "Strength", summary: "Athletics, forcing obstacles, and heavy melee weapons." },
  dex: { id: "dex", name: "Dexterity", summary: "Stealth, initiative, finesse and ranged weapons, and reflexes." },
  con: { id: "con", name: "Constitution", summary: "Hit points, endurance, and resistance to bodily harm." },
  int: { id: "int", name: "Intelligence", summary: "Investigation, lore, arcana, and deliberate reasoning." },
  wis: { id: "wis", name: "Wisdom", summary: "Perception, insight, survival, medicine, and resolve." },
  cha: { id: "cha", name: "Charisma", summary: "Persuasion, deception, intimidation, and force of personality." }
};

const SKILLS = {
  athletics: { id: "athletics", name: "Athletics", ability: "str" },
  acrobatics: { id: "acrobatics", name: "Acrobatics", ability: "dex" },
  sleightOfHand: { id: "sleightOfHand", name: "Sleight of Hand", ability: "dex" },
  stealth: { id: "stealth", name: "Stealth", ability: "dex" },
  arcana: { id: "arcana", name: "Arcana", ability: "int" },
  history: { id: "history", name: "History", ability: "int" },
  investigation: { id: "investigation", name: "Investigation", ability: "int" },
  nature: { id: "nature", name: "Nature", ability: "int" },
  religion: { id: "religion", name: "Religion", ability: "int" },
  animalHandling: { id: "animalHandling", name: "Animal Handling", ability: "wis" },
  insight: { id: "insight", name: "Insight", ability: "wis" },
  medicine: { id: "medicine", name: "Medicine", ability: "wis" },
  perception: { id: "perception", name: "Perception", ability: "wis" },
  survival: { id: "survival", name: "Survival", ability: "wis" },
  deception: { id: "deception", name: "Deception", ability: "cha" },
  intimidation: { id: "intimidation", name: "Intimidation", ability: "cha" },
  performance: { id: "performance", name: "Performance", ability: "cha" },
  persuasion: { id: "persuasion", name: "Persuasion", ability: "cha" }
};

const POINT_BUY_COSTS = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

const BACKGROUNDS = {
  soldier: {
    id: "soldier",
    name: "Soldier",
    summary: "A veteran used to discipline, danger, and command.",
    skills: ["athletics", "intimidation"],
    item: "healers-kit",
    gold: 12
  },
  urchin: {
    id: "urchin",
    name: "Urchin",
    summary: "A survivor of alleys, rooftops, locks, and watchful crowds.",
    skills: ["sleightOfHand", "stealth"],
    item: "thieves-tools",
    gold: 8
  },
  sage: {
    id: "sage",
    name: "Sage",
    summary: "A scholar of lost names, old powers, and dangerous texts.",
    skills: ["arcana", "history"],
    item: "scholars-journal",
    gold: 10
  },
  acolyte: {
    id: "acolyte",
    name: "Acolyte",
    summary: "A temple-trained mediator familiar with rites and suffering.",
    skills: ["insight", "religion"],
    item: "holy-water",
    gold: 10
  },
  outlander: {
    id: "outlander",
    name: "Outlander",
    summary: "A pathfinder who reads weather, spoor, and wild terrain.",
    skills: ["perception", "survival"],
    item: "silk-rope",
    gold: 9
  },
  charlatan: {
    id: "charlatan",
    name: "Charlatan",
    summary: "A practiced liar with a talent for masks and social pressure.",
    skills: ["deception", "persuasion"],
    item: "disguise-kit",
    gold: 14
  }
};

const ITEMS = {
  "iron-longsword": {
    id: "iron-longsword",
    name: "Iron Longsword",
    category: "weapon",
    slot: "mainHand",
    rarity: "Common",
    value: 15,
    description: "A reliable one-handed blade with enough weight to turn a committed strike.",
    purpose: "Equip in your main hand. Uses Strength for attacks and deals 1d8 slashing damage.",
    weapon: { damage: "1d8", damageType: "slashing", ability: "str", properties: [] }
  },
  "steel-shield": {
    id: "steel-shield",
    name: "Steel Shield",
    category: "shield",
    slot: "offHand",
    rarity: "Common",
    value: 10,
    description: "A broad shield marked by old repairs.",
    purpose: "Equip in your off hand for +2 Armor Class. Cannot be used with a two-handed weapon.",
    acBonus: 2
  },
  "chain-shirt": {
    id: "chain-shirt",
    name: "Chain Shirt",
    category: "armor",
    slot: "armor",
    rarity: "Common",
    value: 50,
    description: "Interlocking rings worn beneath a fitted leather coat.",
    purpose: "Sets base Armor Class to 13 and adds up to +2 from Dexterity.",
    armor: { base: 13, dexCap: 2 }
  },
  "leather-armor": {
    id: "leather-armor",
    name: "Leather Armor",
    category: "armor",
    slot: "armor",
    rarity: "Common",
    value: 10,
    description: "Supple boiled leather that protects without impeding movement.",
    purpose: "Sets base Armor Class to 11 and adds your full Dexterity modifier.",
    armor: { base: 11, dexCap: null }
  },
  "studded-leather": {
    id: "studded-leather",
    name: "Studded Leather",
    category: "armor",
    slot: "armor",
    rarity: "Uncommon",
    value: 45,
    description: "Flexible leather reinforced with close-set metal studs.",
    purpose: "Sets base Armor Class to 12 and adds your full Dexterity modifier.",
    armor: { base: 12, dexCap: null }
  },
  "shortsword": {
    id: "shortsword",
    name: "Shortsword",
    category: "weapon",
    slot: "mainHand",
    rarity: "Common",
    value: 10,
    description: "A quick, narrow blade suited to close quarters.",
    purpose: "Equip in your main hand. Uses the better of Strength or Dexterity and deals 1d6 piercing damage.",
    weapon: { damage: "1d6", damageType: "piercing", ability: "finesse", properties: ["finesse"] }
  },
  "shortbow": {
    id: "shortbow",
    name: "Shortbow",
    category: "weapon",
    slot: "mainHand",
    rarity: "Common",
    value: 25,
    description: "A compact bow with a waxed string and a dozen serviceable arrows.",
    purpose: "Equip in your main hand. Uses Dexterity and deals 1d6 piercing damage at range.",
    weapon: { damage: "1d6", damageType: "piercing", ability: "dex", properties: ["ranged", "twoHanded"] }
  },
  "oak-staff": {
    id: "oak-staff",
    name: "Oak Quarterstaff",
    category: "weapon",
    slot: "mainHand",
    rarity: "Common",
    value: 2,
    description: "A straight-grained staff banded with iron near the grip.",
    purpose: "Equip in your main hand. Uses Strength and deals 1d6 bludgeoning damage.",
    weapon: { damage: "1d6", damageType: "bludgeoning", ability: "str", properties: [] }
  },
  "ash-wand": {
    id: "ash-wand",
    name: "Ash Wand",
    category: "focus",
    slot: "mainHand",
    rarity: "Common",
    value: 10,
    description: "A scorched wand that steadies the shaping of arcane force.",
    purpose: "Equip as an arcane focus. Grants +1 to spell attack rolls.",
    spellAttackBonus: 1
  },
  "war-mace": {
    id: "war-mace",
    name: "War Mace",
    category: "weapon",
    slot: "mainHand",
    rarity: "Common",
    value: 5,
    description: "A flanged iron mace balanced for one-handed use.",
    purpose: "Equip in your main hand. Uses Strength and deals 1d6 bludgeoning damage.",
    weapon: { damage: "1d6", damageType: "bludgeoning", ability: "str", properties: [] }
  },
  "lute-blade": {
    id: "lute-blade",
    name: "Courtier's Rapier",
    category: "weapon",
    slot: "mainHand",
    rarity: "Common",
    value: 25,
    description: "A slender duelling blade carried beside a travel-worn lute.",
    purpose: "Equip in your main hand. Uses the better of Strength or Dexterity and deals 1d8 piercing damage.",
    weapon: { damage: "1d8", damageType: "piercing", ability: "finesse", properties: ["finesse"] }
  },
  "healing-potion": {
    id: "healing-potion",
    name: "Potion of Healing",
    category: "consumable",
    rarity: "Common",
    value: 50,
    description: "A thumb-sized red vial that warms when uncorked.",
    purpose: "Use as an action in or out of combat to restore 2d4 + 2 hit points.",
    usable: { contexts: ["combat", "story"], effect: "heal", formula: "2d4+2", target: "ally", cost: "action" }
  },
  "antitoxin": {
    id: "antitoxin",
    name: "Antitoxin",
    category: "consumable",
    rarity: "Common",
    value: 50,
    description: "A bitter herbal draught sealed in green glass.",
    purpose: "Use to end the Poisoned condition or gain advantage against the next poison save.",
    usable: { contexts: ["combat", "story"], effect: "cure", condition: "poisoned", target: "ally", cost: "action" }
  },
  "holy-water": {
    id: "holy-water",
    name: "Holy Water",
    category: "consumable",
    rarity: "Common",
    value: 25,
    description: "Consecrated water in a stoppered silver flask.",
    purpose: "Throw in combat to deal 2d6 radiant damage to undead, or use at certain profaned sites.",
    usable: { contexts: ["combat", "story"], effect: "holyWater", formula: "2d6", target: "enemy", cost: "action" }
  },
  "smoke-bomb": {
    id: "smoke-bomb",
    name: "Smoke Bomb",
    category: "consumable",
    rarity: "Uncommon",
    value: 35,
    description: "A clay shell packed with soot, saltpetre, and bitterleaf.",
    purpose: "Use in combat to gain the Hidden condition and impose disadvantage on attacks against you until your next turn.",
    usable: { contexts: ["combat"], effect: "hide", target: "self", cost: "bonus" }
  },
  "healers-kit": {
    id: "healers-kit",
    name: "Healer's Kit",
    category: "tool",
    rarity: "Common",
    value: 5,
    description: "Bandages, needles, splints, and clean bitter spirits.",
    purpose: "Outside combat, expend a use to restore 1d6 + 2 hit points. In combat, stabilize an unconscious ally.",
    charges: 3,
    usable: { contexts: ["combat", "story"], effect: "healersKit", formula: "1d6+2", target: "ally", cost: "action" }
  },
  "thieves-tools": {
    id: "thieves-tools",
    name: "Thieves' Tools",
    category: "tool",
    rarity: "Common",
    value: 25,
    description: "Picks, files, a narrow mirror, and folding pliers in a leather roll.",
    purpose: "Unlocks tool-assisted choices involving locks and traps; usually improves the odds of success.",
    tags: ["lockpick"]
  },
  "silk-rope": {
    id: "silk-rope",
    name: "Silk Rope",
    category: "tool",
    rarity: "Common",
    value: 10,
    description: "Fifty feet of light, strong rope.",
    purpose: "Unlocks safer traversal choices and can prevent damage from climbs, pits, and swift water.",
    tags: ["rope"]
  },
  "disguise-kit": {
    id: "disguise-kit",
    name: "Disguise Kit",
    category: "tool",
    rarity: "Common",
    value: 25,
    description: "Pigments, wax, false hair, and reversible costume pieces.",
    purpose: "Unlocks disguise-based social approaches and may grant advantage on Deception checks.",
    tags: ["disguise"]
  },
  "scholars-journal": {
    id: "scholars-journal",
    name: "Scholar's Journal",
    category: "tool",
    rarity: "Common",
    value: 10,
    description: "A field journal indexed with historical and arcane references.",
    purpose: "Can assist History or Arcana checks when time permits.",
    tags: ["reference"]
  },
  "silver-chime": {
    id: "silver-chime",
    name: "Silver Pilgrim Chime",
    category: "quest",
    rarity: "Rare",
    value: 0,
    description: "A small chime engraved with the first wardens' vow.",
    purpose: "A story item. Its clear note can awaken or quiet the ward-bell's ancient magic.",
    tags: ["bell", "consecrated"]
  },
  "cult-seal": {
    id: "cult-seal",
    name: "Black-Wax Cult Seal",
    category: "quest",
    rarity: "Uncommon",
    value: 0,
    description: "A seal pressed with a thorn coiled around a cracked bell.",
    purpose: "Evidence of the conspiracy and a possible key to cult-controlled doors.",
    tags: ["cult", "evidence", "key"]
  },
  "warden-ledger": {
    id: "warden-ledger",
    name: "Warden's Cipher Ledger",
    category: "quest",
    rarity: "Rare",
    value: 0,
    description: "A coded ledger linking payments from Briarwatch to the bell cult.",
    purpose: "Strong evidence. It can turn frightened guards or villagers against the conspirator.",
    tags: ["evidence", "ledger"]
  },
  "bellfire-locket": {
    id: "bellfire-locket",
    name: "Bellfire Locket",
    category: "accessory",
    slot: "accessory",
    rarity: "Uncommon",
    value: 75,
    description: "A warm brass locket holding a sliver of resonant crystal.",
    purpose: "Equip for +1 on Wisdom saving throws and certain checks involving the ward-bell.",
    saveBonuses: { wis: 1 },
    skillBonuses: { religion: 1, insight: 1 }
  },
  "thornward-cloak": {
    id: "thornward-cloak",
    name: "Thornward Cloak",
    category: "accessory",
    slot: "accessory",
    rarity: "Uncommon",
    value: 80,
    description: "A moss-green cloak whose clasp is shaped like a closed briar.",
    purpose: "Equip for +1 Armor Class and advantage on the first Survival check made in the Briarwood after resting.",
    acBonus: 1,
    tags: ["briarwood"]
  }
};

const CLASSES = {
  fighter: {
    id: "fighter",
    name: "Fighter",
    role: "Front-line defender",
    hitDie: 10,
    primaryAbility: "str",
    savingThrows: ["str", "con"],
    skillsChoose: ["athletics", "intimidation", "perception", "survival", "insight"],
    defaultSkills: ["athletics", "perception"],
    preset: { str: 15, dex: 12, con: 14, int: 8, wis: 13, cha: 10 },
    equipment: { mainHand: "iron-longsword", offHand: "steel-shield", armor: "chain-shirt", accessory: null },
    inventory: [{ itemId: "healing-potion", quantity: 1 }],
    description: "Durable and direct. Protects the party, holds the line, and recovers through punishment.",
    resources: { secondWind: { name: "Second Wind", max: 1, refresh: "short" } },
    actions: [
      {
        id: "second-wind",
        name: "Second Wind",
        kind: "heal",
        cost: "bonus",
        resource: "secondWind",
        target: "self",
        formula: "1d10+level",
        description: "Recover 1d10 + level hit points. Refreshes on a short rest."
      },
      {
        id: "brace",
        name: "Brace",
        kind: "guard",
        cost: "action",
        target: "ally",
        description: "Grant an ally +2 AC until your next turn and make enemies more likely to attack you."
      }
    ]
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    role: "Skirmisher and expert",
    hitDie: 8,
    primaryAbility: "dex",
    savingThrows: ["dex", "int"],
    skillsChoose: ["acrobatics", "deception", "insight", "investigation", "perception", "persuasion", "sleightOfHand", "stealth"],
    defaultSkills: ["stealth", "investigation"],
    expertise: ["stealth"],
    preset: { str: 8, dex: 15, con: 13, int: 14, wis: 12, cha: 10 },
    equipment: { mainHand: "shortsword", offHand: null, armor: "leather-armor", accessory: null },
    inventory: [{ itemId: "smoke-bomb", quantity: 1 }, { itemId: "healing-potion", quantity: 1 }],
    description: "Excels at stealth, investigation, precision attacks, and turning an ally's distraction into damage.",
    resources: {},
    passives: ["sneakAttack"],
    actions: [
      {
        id: "cunning-hide",
        name: "Cunning Hide",
        kind: "hide",
        cost: "bonus",
        target: "self",
        description: "Make a Stealth check against the enemies' awareness. On success, gain advantage on your next attack."
      },
      {
        id: "cunning-disengage",
        name: "Disengage",
        kind: "disengage",
        cost: "bonus",
        target: "self",
        description: "Withdraw safely; gain +2 AC against the next attack before your turn."
      }
    ]
  },
  wizard: {
    id: "wizard",
    name: "Wizard",
    role: "Arcane controller",
    hitDie: 6,
    primaryAbility: "int",
    savingThrows: ["int", "wis"],
    skillsChoose: ["arcana", "history", "insight", "investigation", "medicine", "religion"],
    defaultSkills: ["arcana", "investigation"],
    preset: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    equipment: { mainHand: "ash-wand", offHand: null, armor: null, accessory: null },
    inventory: [{ itemId: "healing-potion", quantity: 1 }, { itemId: "scholars-journal", quantity: 1 }],
    description: "Fragile but versatile. Uses cantrips freely and spell slots for decisive arcane effects.",
    resources: { spellSlots1: { name: "1st-level Spell Slots", max: 2, refresh: "long" } },
    actions: [
      {
        id: "fire-bolt",
        name: "Fire Bolt",
        kind: "spellAttack",
        cost: "action",
        target: "enemy",
        ability: "int",
        damage: "1d10",
        damageType: "fire",
        description: "Ranged spell attack for 1d10 fire damage. No spell slot required."
      },
      {
        id: "magic-missile",
        name: "Magic Missile",
        kind: "autoDamage",
        cost: "action",
        target: "enemy",
        resource: "spellSlots1",
        damage: "3d4+3",
        damageType: "force",
        description: "Automatically hits for 3d4 + 3 force damage. Costs one spell slot."
      },
      {
        id: "sleep",
        name: "Sleep",
        kind: "sleep",
        cost: "action",
        target: "enemyGroup",
        resource: "spellSlots1",
        formula: "5d8",
        description: "Puts the weakest enemies into magical sleep, starting with the lowest current HP. Costs one spell slot."
      }
    ]
  },
  cleric: {
    id: "cleric",
    name: "Cleric",
    role: "Divine support",
    hitDie: 8,
    primaryAbility: "wis",
    savingThrows: ["wis", "cha"],
    skillsChoose: ["history", "insight", "medicine", "persuasion", "religion"],
    defaultSkills: ["medicine", "religion"],
    preset: { str: 13, dex: 10, con: 14, int: 8, wis: 15, cha: 12 },
    equipment: { mainHand: "war-mace", offHand: "steel-shield", armor: "chain-shirt", accessory: null },
    inventory: [{ itemId: "holy-water", quantity: 1 }, { itemId: "healing-potion", quantity: 1 }],
    description: "A resilient healer who can restore allies without surrendering the rest of a turn.",
    resources: { spellSlots1: { name: "1st-level Spell Slots", max: 2, refresh: "long" } },
    actions: [
      {
        id: "sacred-flame",
        name: "Sacred Flame",
        kind: "saveDamage",
        cost: "action",
        target: "enemy",
        ability: "wis",
        saveAbility: "dex",
        damage: "1d8",
        damageType: "radiant",
        description: "Target makes a Dexterity save or takes 1d8 radiant damage. No spell slot required."
      },
      {
        id: "healing-word",
        name: "Healing Word",
        kind: "heal",
        cost: "bonus",
        target: "ally",
        resource: "spellSlots1",
        formula: "1d4+mod",
        ability: "wis",
        description: "Restore 1d4 + Wisdom modifier hit points at range. Costs one spell slot."
      },
      {
        id: "guiding-bolt",
        name: "Guiding Bolt",
        kind: "spellAttack",
        cost: "action",
        target: "enemy",
        resource: "spellSlots1",
        ability: "wis",
        damage: "4d6",
        damageType: "radiant",
        onHit: "guiding",
        description: "Ranged spell attack for 4d6 radiant damage; the next attack against the target has advantage. Costs one spell slot."
      }
    ]
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    role: "Hunter and pathfinder",
    hitDie: 10,
    primaryAbility: "dex",
    savingThrows: ["str", "dex"],
    skillsChoose: ["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"],
    defaultSkills: ["perception", "survival"],
    preset: { str: 10, dex: 15, con: 14, int: 8, wis: 13, cha: 12 },
    equipment: { mainHand: "shortbow", offHand: null, armor: "leather-armor", accessory: null },
    inventory: [{ itemId: "antitoxin", quantity: 1 }, { itemId: "silk-rope", quantity: 1 }, { itemId: "healing-potion", quantity: 1 }],
    description: "A reliable ranged combatant with exceptional wilderness skills and focused prey damage.",
    resources: { huntersMark: { name: "Hunter's Mark", max: 2, refresh: "long" } },
    actions: [
      {
        id: "hunters-mark",
        name: "Hunter's Mark",
        kind: "mark",
        cost: "bonus",
        target: "enemy",
        resource: "huntersMark",
        description: "Mark one enemy. Your weapon hits deal +1d6 damage to it until it falls or combat ends."
      },
      {
        id: "field-dressing",
        name: "Field Dressing",
        kind: "heal",
        cost: "action",
        target: "ally",
        formula: "1d6+2",
        limit: "oncePerCombat",
        description: "Restore 1d6 + 2 hit points to an ally. Once per combat."
      }
    ]
  },
  bard: {
    id: "bard",
    name: "Bard",
    role: "Social support and control",
    hitDie: 8,
    primaryAbility: "cha",
    savingThrows: ["dex", "cha"],
    skillsChoose: Object.keys(SKILLS),
    defaultSkills: ["persuasion", "insight"],
    preset: { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 },
    equipment: { mainHand: "lute-blade", offHand: null, armor: "leather-armor", accessory: null },
    inventory: [{ itemId: "disguise-kit", quantity: 1 }, { itemId: "healing-potion", quantity: 1 }],
    description: "Shapes the party's luck through inspiration, sharp words, and flexible support magic.",
    resources: {
      bardicInspiration: { name: "Bardic Inspiration", max: 3, refresh: "long" },
      spellSlots1: { name: "1st-level Spell Slots", max: 2, refresh: "long" }
    },
    actions: [
      {
        id: "vicious-mockery",
        name: "Vicious Mockery",
        kind: "saveDamage",
        cost: "action",
        target: "enemy",
        ability: "cha",
        saveAbility: "wis",
        damage: "1d4",
        damageType: "psychic",
        onFail: "mocked",
        description: "Target makes a Wisdom save or takes 1d4 psychic damage and has disadvantage on its next attack."
      },
      {
        id: "bardic-inspiration",
        name: "Bardic Inspiration",
        kind: "inspire",
        cost: "bonus",
        target: "ally",
        resource: "bardicInspiration",
        description: "Give an ally a d6 that is automatically added to its next failed attack or saving throw."
      },
      {
        id: "healing-word",
        name: "Healing Word",
        kind: "heal",
        cost: "bonus",
        target: "ally",
        resource: "spellSlots1",
        formula: "1d4+mod",
        ability: "cha",
        description: "Restore 1d4 + Charisma modifier hit points at range. Costs one spell slot."
      }
    ]
  }
};

const COMPANIONS = {
  orin: {
    id: "orin",
    name: "Orin Stoneward",
    role: "Guardian",
    pronouns: "he/him",
    summary: "A plain-spoken shield veteran who treats retreat as a tool, not a shame.",
    personality: "Practical, protective, suspicious of needless cruelty, and dryly humorous under pressure.",
    abilities: { str: 15, dex: 10, con: 14, int: 9, wis: 12, cha: 11 },
    skills: ["athletics", "perception"],
    maxHp: 15,
    ac: 16,
    attack: { name: "Warhammer", bonus: 4, damage: "1d8+2", damageType: "bludgeoning" },
    tactic: "protective",
    aiRole: "guardian",
    resources: { secondWind: 1 },
    bond: 1,
    dialogue: {
      default: "We decide what matters, then we stand where it matters.",
      "briarwatch-square": "Someone wanted that bell silent. Bells do not cut their own ropes.",
      "forest-edge": "Main road is fastest and easiest to trap. I would choose certainty over speed.",
      "bell-vault": "Give me a chain to break or a doorway to hold. Do not ask me to out-sing a ghost."
    }
  },
  maren: {
    id: "maren",
    name: "Sister Maren Vale",
    role: "Healer",
    pronouns: "she/her",
    summary: "A travelling shrine-keeper who hears lies as changes in a speaker's breathing.",
    personality: "Compassionate without being naive, attentive to ritual, and openly opposed to intimidation of the helpless.",
    abilities: { str: 10, dex: 12, con: 13, int: 11, wis: 16, cha: 14 },
    skills: ["insight", "medicine", "religion"],
    maxHp: 12,
    ac: 14,
    attack: { name: "Sacred Flame", bonus: 5, damage: "1d8", damageType: "radiant", save: "dex" },
    tactic: "support",
    aiRole: "healer",
    resources: { healingWords: 2, guidingBolt: 1 },
    bond: 1,
    dialogue: {
      default: "Mercy and caution are not opposites. Both ask us to see clearly.",
      "briarwatch-square": "The silence feels made, not natural. There is a ritual shape to it.",
      "old-shrine": "This shrine remembers the bell before it became a weapon. We should listen before touching anything.",
      "bell-vault": "The spirit is furious, but fury is not always malice. Its true name may still reach it."
    }
  },
  nessa: {
    id: "nessa",
    name: "Nessa Reed",
    role: "Scout",
    pronouns: "she/her",
    summary: "A Briarwatch outrider with quick eyes, quicker arrows, and unfinished business below the wood.",
    personality: "Restless, observant, protective of villagers, and impatient with ceremonial caution.",
    abilities: { str: 9, dex: 16, con: 12, int: 12, wis: 14, cha: 10 },
    skills: ["perception", "stealth", "survival"],
    maxHp: 11,
    ac: 14,
    attack: { name: "Shortbow", bonus: 5, damage: "1d6+3", damageType: "piercing", ranged: true },
    tactic: "aggressive",
    aiRole: "scout",
    resources: { trickShot: 1 },
    bond: 0,
    dialogue: {
      default: "Point me at the thing that thinks it is hidden.",
      "mist-hollow": "I was following the bell's echo. It doubled back like a hunter covering tracks.",
      "root-gate": "Seals, locks, guards—I prefer problems with hinges.",
      "bell-vault": "The robed one carries a bronze key. Give me ten breaths and a distraction."
    }
  }
};

const ENEMIES = {
  "goblin-cutthroat": {
    id: "goblin-cutthroat",
    name: "Goblin Cutthroat",
    maxHp: 7,
    ac: 13,
    abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
    attack: { name: "Jagged Blade", bonus: 4, damage: "1d6+2", damageType: "slashing" },
    xp: 25,
    aiRole: "skirmisher"
  },
  "cult-lookout": {
    id: "cult-lookout",
    name: "Thorn-Bell Lookout",
    maxHp: 9,
    ac: 12,
    abilities: { str: 10, dex: 13, con: 11, int: 10, wis: 12, cha: 9 },
    attack: { name: "Hooked Spear", bonus: 3, damage: "1d6+1", damageType: "piercing" },
    xp: 35,
    aiRole: "soldier"
  },
  "briar-wolf": {
    id: "briar-wolf",
    name: "Briar Wolf",
    maxHp: 11,
    ac: 13,
    abilities: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
    attack: { name: "Thorn Bite", bonus: 4, damage: "1d6+2", damageType: "piercing", onHit: "bleeding" },
    xp: 40,
    aiRole: "beast"
  },
  "rootbound-guard": {
    id: "rootbound-guard",
    name: "Rootbound Guard",
    maxHp: 13,
    ac: 14,
    abilities: { str: 14, dex: 9, con: 14, int: 6, wis: 10, cha: 5 },
    attack: { name: "Briar Club", bonus: 4, damage: "1d8+2", damageType: "bludgeoning" },
    xp: 50,
    aiRole: "brute"
  },
  "bell-acolyte": {
    id: "bell-acolyte",
    name: "Bell Acolyte",
    maxHp: 10,
    ac: 12,
    abilities: { str: 9, dex: 12, con: 11, int: 12, wis: 14, cha: 13 },
    attack: { name: "Resonant Hex", bonus: 4, damage: "1d8+2", damageType: "psychic", save: "wis" },
    heal: { name: "Mend the Faithful", formula: "1d6+2", uses: 1 },
    xp: 55,
    aiRole: "caster"
  },
  "warden-sable": {
    id: "warden-sable",
    name: "Warden Sable",
    maxHp: 24,
    ac: 15,
    abilities: { str: 14, dex: 14, con: 14, int: 13, wis: 12, cha: 15 },
    attack: { name: "Blackthorn Sabre", bonus: 5, damage: "1d8+3", damageType: "slashing" },
    special: { name: "Commanding Rebuke", recharge: 3, damage: "1d6+2", save: "wis", condition: "frightened" },
    xp: 120,
    aiRole: "leader"
  },
  "bell-wraith": {
    id: "bell-wraith",
    name: "Wraith of the Hollow Bell",
    maxHp: 30,
    ac: 13,
    abilities: { str: 6, dex: 14, con: 16, int: 12, wis: 14, cha: 16 },
    attack: { name: "Grief Toll", bonus: 5, damage: "1d8+3", damageType: "necrotic", save: "wis" },
    special: { name: "Shattering Peal", recharge: 3, damage: "2d6", save: "con", condition: "deafened" },
    resistances: ["slashing", "piercing", "bludgeoning"],
    tags: ["undead"],
    xp: 160,
    aiRole: "boss"
  }
};

const ENCOUNTERS = {
  "road-ambush": {
    id: "road-ambush",
    name: "Ambush on the Bell Road",
    enemies: ["goblin-cutthroat", "cult-lookout", "goblin-cutthroat"],
    storyScale: 0.85,
    standardScale: 1,
    grittyScale: 1.15,
    victoryNode: "ambush-aftermath",
    defeatNode: "defeat",
    xp: 70,
    loot: [{ itemId: "healing-potion", quantity: 1 }, { itemId: "cult-seal", quantity: 1 }],
    intro: "Cords snap tight across the road. Goblins rise from the fern while a masked lookout signals from the rocks."
  },
  "snare-rescue": {
    id: "snare-rescue",
    name: "The Snare-Keeper's Pack",
    enemies: ["briar-wolf", "briar-wolf"],
    storyScale: 0.85,
    standardScale: 1,
    grittyScale: 1.1,
    victoryNode: "mist-hollow-after",
    defeatNode: "defeat",
    xp: 65,
    loot: [{ itemId: "thornward-cloak", quantity: 1 }],
    intro: "The snare line rings like wire. Two briar wolves burst from the mist, thorns bristling through their hides."
  },
  "hollow-guards": {
    id: "hollow-guards",
    name: "The Hollow Court",
    enemies: ["rootbound-guard", "bell-acolyte", "cult-lookout"],
    storyScale: 0.82,
    standardScale: 1,
    grittyScale: 1.15,
    victoryNode: "vault-antechamber",
    defeatNode: "defeat",
    xp: 105,
    loot: [{ itemId: "bellfire-locket", quantity: 1 }, { itemId: "warden-ledger", quantity: 1 }],
    intro: "The court erupts. A rootbound sentinel tears free of the wall while an acolyte raises a cracked bronze censer."
  },
  "finale-full": {
    id: "finale-full",
    name: "The Bell Beneath Briarwatch",
    enemies: ["warden-sable", "bell-wraith"],
    storyScale: 0.78,
    standardScale: 1,
    grittyScale: 1.12,
    victoryNode: "ending",
    defeatNode: "defeat",
    xp: 220,
    loot: [],
    intro: "Sable draws his sabre as the broken bell exhales a figure made of smoke, iron dust, and remembered grief."
  },
  "finale-weakened": {
    id: "finale-weakened",
    name: "The Bell Beneath Briarwatch",
    enemies: ["warden-sable", "bell-wraith"],
    modifiers: { enemyHp: 0.72, wraithNoResistance: true },
    storyScale: 0.72,
    standardScale: 0.9,
    grittyScale: 1.02,
    victoryNode: "ending",
    defeatNode: "defeat",
    xp: 220,
    loot: [],
    intro: "The true chime fractures the ritual. Sable turns on you, and the wraith forms only halfway, its outline leaking silver light."
  },
  "finale-sable-only": {
    id: "finale-sable-only",
    name: "The Traitor at the Bell",
    enemies: ["warden-sable"],
    storyScale: 0.9,
    standardScale: 1,
    grittyScale: 1.12,
    victoryNode: "ending",
    defeatNode: "defeat",
    xp: 160,
    loot: [],
    intro: "The ward-spirit withdraws from Sable's command. Alone and exposed, the warden answers with steel."
  }
};

const CLUES = {
  "black-wax": { id: "black-wax", name: "Black Wax on the Bell Rope", text: "The ward-bell was silenced with the same thorn-and-bell wax used by the hidden cult." },
  "sable-dispute": { id: "sable-dispute", name: "Sable's Private Dispute", text: "Warden Sable argued with the bell-keeper hours before the disappearance." },
  "hushed-verse": { id: "hushed-verse", name: "The Hushed Verse", text: "The cult repeats: ‘Name the grief, then ring it home.’" },
  "thorn-wound": { id: "thorn-wound", name: "Ritual Thorn Wound", text: "Tovin's wound came from a ritual briar hook, not an animal or ordinary weapon." },
  "bell-true-name": { id: "bell-true-name", name: "The Bell's True Name", text: "The ward-bell was once called Aster Vey, ‘the star that answers.’" },
  "sable-payments": { id: "sable-payments", name: "Sable's Payments", text: "A cipher ledger proves Sable funded the cult and sold access to the ward-vault." },
  "wraith-bound": { id: "wraith-bound", name: "The Bound Wraith", text: "The spirit below is the first bell-keeper, bound by Sable's altered ritual rather than willingly hostile." }
};

const STORY_NODES = {
  "briarwatch-square": {
    id: "briarwatch-square",
    act: "Act I — A Village Holding Its Breath",
    title: "The Silent Bell",
    location: "Briarwatch Village Square",
    safeRest: true,
    objective: "Learn why the ward-bell fell silent, then follow the missing bell-keeper into the Briarwood.",
    opening: "Rain beads on a bell rope cut cleanly at shoulder height. Briarwatch's ward-bell hangs above the square, mute for the first time in living memory. Reeve Aveline watches shuttered windows while your companions study the gathered villagers.",
    choices: [
      {
        id: "inspect-rope",
        label: "Inspect the severed bell rope",
        description: "Examine the cut, residue, and nearby tower fittings.",
        keywords: ["inspect rope", "bell rope", "tower", "wax"],
        once: true,
        check: { skill: "investigation", dc: 11, tools: ["scholars-journal"] },
        success: {
          text: "Under the rain-dark fibres you find a thumbprint of black wax stamped with a thorn around a broken bell.",
          clues: ["black-wax"],
          items: [{ itemId: "cult-seal", quantity: 1 }]
        },
        failure: {
          text: "The rain has ruined most traces. Maren nevertheless notices that the rope was cut after the bell stopped, not before.",
          setFlags: { ropeTimingKnown: true }
        }
      },
      {
        id: "question-reeve",
        label: "Question Reeve Aveline",
        description: "Read what the reeve is reluctant to say about the bell-keeper and Warden Sable.",
        keywords: ["question reeve", "talk aveline", "warden sable", "ask reeve"],
        once: true,
        check: { skill: "insight", dc: 11 },
        success: {
          text: "Aveline admits Warden Sable met bell-keeper Tovin in secret. Their argument ended with Sable riding north before dawn.",
          clues: ["sable-dispute"],
          approval: { orin: 1 }
        },
        failure: {
          text: "Aveline gives only the official account, but Orin catches her glance toward the infirmary whenever Sable's name is spoken.",
          setFlags: { infirmaryHint: true }
        }
      },
      {
        id: "visit-tovin",
        label: "Visit the wounded bell-keeper",
        description: "Tovin survived the night but has not spoken coherently since returning from the wood.",
        keywords: ["visit tovin", "infirmary", "bell keeper", "survivor"],
        nextNode: "tovin-infirmary"
      },
      {
        id: "leave-village",
        label: "Follow the north road into the Briarwood",
        description: "Commit to the trail. More evidence may make later choices easier.",
        keywords: ["leave village", "north road", "briarwood", "depart"],
        nextNode: "forest-edge"
      }
    ]
  },
  "tovin-infirmary": {
    id: "tovin-infirmary",
    act: "Act I — A Village Holding Its Breath",
    title: "A Witness Who Hears the Bell",
    location: "Briarwatch Infirmary",
    safeRest: true,
    objective: "Learn what Tovin encountered without breaking what remains of his composure.",
    opening: "Tovin lies beneath wool blankets, fingers closed around an invisible rope. Each time thunder rolls, he whispers a line that almost becomes a prayer. Maren kneels at a respectful distance; Orin quietly closes the door.",
    choices: [
      {
        id: "calm-tovin",
        label: "Calm Tovin and let him set the pace",
        description: "Use patience and reassurance to separate memory from panic.",
        keywords: ["calm tovin", "reassure", "persuade witness"],
        once: true,
        check: { skill: "persuasion", dc: 11 },
        success: {
          text: "Tovin repeats the cult's whispered verse: ‘Name the grief, then ring it home.’ He says the words made the roots open beneath an old shrine.",
          clues: ["hushed-verse"],
          setFlags: { oldShrineKnown: true },
          approval: { maren: 1 }
        },
        failure: {
          text: "Tovin cannot finish the verse, but he scratches the shape of a shrine arch into the bedside dust.",
          setFlags: { oldShrineKnown: true }
        }
      },
      {
        id: "examine-wound",
        label: "Examine the wound on Tovin's shoulder",
        description: "Determine what dragged or marked him in the wood.",
        keywords: ["examine wound", "medicine", "shoulder wound"],
        once: true,
        check: { skill: "medicine", dc: 12 },
        success: {
          text: "The wound contains ritual ash and tiny barbs cut in repeating threes. It came from a consecrated briar hook, not a beast.",
          clues: ["thorn-wound"],
          approval: { maren: 1 }
        },
        failure: {
          text: "You clean and bind the wound but cannot identify the implement. Tovin's breathing steadies enough to point north.",
          setFlags: { tovinStabilized: true }
        }
      },
      {
        id: "press-tovin",
        label: "Press Tovin for an immediate answer",
        description: "Use fear and urgency. This may produce information at a human cost.",
        keywords: ["threaten tovin", "press tovin", "intimidate witness"],
        once: true,
        check: { skill: "intimidation", dc: 10 },
        success: {
          text: "Tovin blurts out the hidden verse and the old shrine's location, then turns his face to the wall.",
          clues: ["hushed-verse"],
          setFlags: { oldShrineKnown: true, tovinFrightened: true },
          approval: { maren: -2, orin: -1 }
        },
        failure: {
          text: "Tovin collapses into panic. Maren ends the questioning and spends several minutes bringing him back to the room.",
          damage: { target: "player", formula: "0" },
          approval: { maren: -2 }
        }
      },
      {
        id: "return-square",
        label: "Return to the village square",
        description: "Rejoin Reeve Aveline and prepare to leave.",
        keywords: ["return square", "leave infirmary", "back"],
        nextNode: "briarwatch-square"
      }
    ]
  },
  "forest-edge": {
    id: "forest-edge",
    act: "Act II — Roads That Remember",
    title: "Three Ways into the Briarwood",
    location: "North Verge of the Briarwood",
    safeRest: false,
    objective: "Choose a route toward the hidden hollow and accept the risks that come with it.",
    opening: "The north road divides beneath trees knitted together by old thorns. Wagon ruts vanish into fern on the left. A pilgrim marker leans toward a narrow rise. From the misted hollow to the right comes one faint, impossible bell note.",
    choices: [
      {
        id: "track-wagon",
        label: "Track the missing wagon through the fern",
        description: "Use spoor and broken vegetation to approach the ambushers on better terms.",
        keywords: ["track wagon", "follow trail", "survival", "fern"],
        check: { skill: "survival", dc: 12, tools: ["silk-rope"] },
        success: {
          text: "Nessa's kind of trailcraft would approve: you find the ambush line before it closes and turn the trap back on its makers.",
          setFlags: { ambushSurprise: true },
          combat: "road-ambush"
        },
        failure: {
          text: "The trail is deliberately doubled. A cord snaps behind you and masked figures rise from the brush.",
          combat: "road-ambush"
        }
      },
      {
        id: "pilgrim-path",
        label: "Take the old pilgrim path",
        description: "Follow weathered ward-stones toward the shrine Tovin remembered.",
        keywords: ["pilgrim path", "old shrine", "ward stones"],
        requires: { flagsAny: ["oldShrineKnown"], cluesAny: ["hushed-verse"] },
        lockedText: "You have not learned enough to identify the pilgrim path with confidence.",
        check: { skill: "religion", dc: 11, alternateSkills: ["history"] },
        success: {
          text: "The old marks resolve into a sequence of safe steps. The path carries you above the traps and toward a forgotten shrine.",
          nextNode: "old-shrine"
        },
        failure: {
          text: "You find the shrine, but a false ward-stone cuts the party with a burst of thorn splinters.",
          partyDamage: "1d4",
          nextNode: "old-shrine"
        }
      },
      {
        id: "follow-whisper",
        label: "Follow the impossible bell-note into the mist",
        description: "Trust instinct and the sound no one in the village could hear.",
        keywords: ["follow bell", "mist", "whisper", "sound"],
        check: { ability: "wis", dc: 12 },
        success: {
          text: "You separate the true note from its echoes and discover a trapped Briarwatch scout before the hunters return.",
          nextNode: "mist-hollow"
        },
        failure: {
          text: "The note leads in circles. By the time you find the snare clearing, the creatures guarding it are already moving.",
          setFlags: { snareEnemiesAlert: true },
          nextNode: "mist-hollow"
        }
      },
      {
        id: "main-road",
        label: "Advance openly along the main road",
        description: "Fast and direct, but the route offers little concealment.",
        keywords: ["main road", "advance openly", "direct route"],
        combat: "road-ambush"
      }
    ]
  },
  "old-shrine": {
    id: "old-shrine",
    act: "Act II — Roads That Remember",
    title: "The Shrine of the First Answer",
    location: "Abandoned Pilgrim Shrine",
    safeRest: true,
    objective: "Recover the shrine's forgotten knowledge and find the under-road into the cult's hollow.",
    opening: "Roots split the shrine's roof but leave its little silver bell untouched. Six names have been chiselled from the altar. A seventh remains beneath soot, beside a stone reliquary with no visible hinge.",
    choices: [
      {
        id: "read-altar",
        label: "Reconstruct the erased dedication",
        description: "Compare the surviving script, Tovin's verse, and the bell's old iconography.",
        keywords: ["read altar", "dedication", "true name", "inscription"],
        once: true,
        check: { skill: "religion", dc: 12, alternateSkills: ["history", "arcana"], tools: ["scholars-journal"] },
        success: {
          text: "The missing dedication names the bell Aster Vey—‘the star that answers.’ The silver chime rings once when you speak it aloud.",
          clues: ["bell-true-name"],
          items: [{ itemId: "silver-chime", quantity: 1 }],
          approval: { maren: 1 }
        },
        failure: {
          text: "The full name escapes you, but the surviving vow makes one fact clear: the ward-spirit once answered willing keepers, not masters.",
          clues: ["wraith-bound"]
        }
      },
      {
        id: "open-reliquary",
        label: "Open the seamless stone reliquary",
        description: "Search for the concealed catch or work the seal with proper tools.",
        keywords: ["open reliquary", "lock", "thieves tools", "stone box"],
        once: true,
        check: { skill: "sleightOfHand", dc: 13, toolsRequiredOrPenalty: "thieves-tools" },
        success: {
          text: "A hidden pin yields. Inside are two flasks of holy water and a travel cloak woven with living-looking briars.",
          items: [{ itemId: "holy-water", quantity: 2 }, { itemId: "thornward-cloak", quantity: 1 }]
        },
        failure: {
          text: "The catch bites like a thorn. The reliquary opens, but its ward burns your hand before fading.",
          damage: { target: "player", formula: "1d4" },
          items: [{ itemId: "holy-water", quantity: 1 }]
        }
      },
      {
        id: "enter-underroad",
        label: "Descend into the root-lined under-road",
        description: "Leave the shrine through the passage beneath its altar.",
        keywords: ["descend", "under road", "passage", "leave shrine"],
        nextNode: "underroad"
      }
    ]
  },
  "mist-hollow": {
    id: "mist-hollow",
    act: "Act II — Roads That Remember",
    title: "The Snared Scout",
    location: "Mist Hollow",
    safeRest: false,
    objective: "Free the trapped scout before the briar wolves close in.",
    opening: "A young scout hangs upside down above a carpet of thorn roots, one boot caught in a wire snare. She presses a finger to her lips and points to two low shapes pacing beyond the fog.",
    choices: [
      {
        id: "quiet-release",
        label: "Disarm the snare without alerting the wolves",
        description: "Use careful hands and the scout's whispered directions.",
        keywords: ["disarm snare", "free scout quietly", "cut wire"],
        check: { skill: "sleightOfHand", dc: 12, alternateSkills: ["survival"] },
        success: {
          text: "The wire slackens without a chime. Nessa drops into Orin's waiting arms and leads the party through a gap in the wolves' patrol.",
          recruit: "nessa",
          setFlags: { nessaRescuedQuietly: true },
          nextNode: "mist-hollow-after",
          approval: { nessa: 1, orin: 1 }
        },
        failure: {
          text: "The catch gives with a bright metallic snap. Nessa lands safely, but the briar wolves charge before anyone can withdraw.",
          recruit: "nessa",
          combat: "snare-rescue"
        }
      },
      {
        id: "hold-wolves",
        label: "Have Orin hold the wolves while you cut Nessa free",
        description: "A companion-led plan: Orin becomes the obvious target while you work quickly.",
        keywords: ["orin hold wolves", "guardian plan", "cut scout free"],
        requires: { companion: "orin" },
        autoSuccess: true,
        result: {
          text: "Orin steps into the clearing and hammers his shield. Nessa drops free behind him; the wolves answer his challenge.",
          recruit: "nessa",
          setFlags: { orinStartsGuarding: true },
          combat: "snare-rescue",
          approval: { orin: 1, nessa: 1 }
        }
      },
      {
        id: "rush-snare",
        label: "Rush the snare and cut it by force",
        description: "Fast, loud, and physically demanding.",
        keywords: ["rush snare", "force", "athletics"],
        check: { skill: "athletics", dc: 11 },
        success: {
          text: "You tear the anchor loose and pull Nessa clear before the wolves cross the clearing.",
          recruit: "nessa",
          setFlags: { playerStartsGuarding: true },
          combat: "snare-rescue"
        },
        failure: {
          text: "The thorn-root holds. Nessa cuts herself free as the pack reaches you, taking a hard fall in the process.",
          recruit: "nessa",
          companionDamage: { id: "nessa", formula: "1d4" },
          combat: "snare-rescue"
        }
      }
    ]
  },
  "mist-hollow-after": {
    id: "mist-hollow-after",
    act: "Act II — Roads That Remember",
    title: "What Nessa Saw",
    location: "Mist Hollow",
    safeRest: true,
    objective: "Hear Nessa's report and choose the route to the hidden gate.",
    opening: "Nessa binds her ankle and sketches the hollow from memory. She followed Warden Sable to a root-gate below the ridge. He carried a black seal and spoke to something that answered from underground.",
    onEnter: { clues: ["sable-dispute"] },
    choices: [
      {
        id: "ask-nessa",
        label: "Ask Nessa what the bell sounded like",
        description: "Her answer may distinguish a monster from a bound spirit.",
        keywords: ["ask nessa", "bell sound", "what saw"],
        once: true,
        check: { skill: "insight", dc: 10 },
        success: {
          text: "Nessa describes grief rather than hunger in the sound. Maren concludes the spirit is being forced through an altered rite.",
          clues: ["wraith-bound"],
          approval: { nessa: 1, maren: 1 }
        },
        failure: {
          text: "The memory is too tangled with fear to read cleanly, but Nessa is certain Sable commanded the cultists.",
          setFlags: { nessaSawSable: true }
        }
      },
      {
        id: "to-root-gate",
        label: "Let Nessa guide the party to the root-gate",
        description: "Take the scout's concealed ridge path.",
        keywords: ["root gate", "nessa guide", "move on"],
        nextNode: "root-gate"
      }
    ]
  },
  "ambush-aftermath": {
    id: "ambush-aftermath",
    act: "Act II — Roads That Remember",
    title: "The Mask Comes Off",
    location: "Bell Road Ambush Site",
    safeRest: true,
    objective: "Search the ambush site and decide what to do with the wounded lookout.",
    opening: "The last goblin flees into the fern. A wounded cult lookout lies beside a dropped satchel, mask cracked, one hand held away from her spear. The black seal recovered from the fight is still warm.",
    choices: [
      {
        id: "search-satchel",
        label: "Search the lookout's satchel",
        description: "Look for orders, maps, and proof of who funded the ambush.",
        keywords: ["search satchel", "search bodies", "orders", "evidence"],
        once: true,
        check: { skill: "investigation", dc: 10 },
        success: {
          text: "A false seam hides a cipher strip bearing Sable's crest and a route to the root-gate.",
          setFlags: { cipherStrip: true, rootGateKnown: true },
          clues: ["sable-dispute"]
        },
        failure: {
          text: "You find the route marks but miss whatever the lookout tried hardest to conceal.",
          setFlags: { rootGateKnown: true }
        }
      },
      {
        id: "offer-mercy",
        label: "Offer the wounded lookout mercy for the truth",
        description: "Promise treatment and a fair hearing in exchange for useful information.",
        keywords: ["offer mercy", "spare lookout", "persuade cultist"],
        once: true,
        check: { skill: "persuasion", dc: 11 },
        success: {
          text: "She gives her name—Lysa—and admits Sable changed the binding rite. The spirit below is a prisoner, not an ally. She marks a safe sign on the root-gate.",
          clues: ["wraith-bound"],
          setFlags: { lysaSpared: true, safeGateSign: true },
          approval: { maren: 2, orin: 1 }
        },
        failure: {
          text: "Lysa refuses names but accepts treatment. Before leaving, she warns that the bell ‘remembers who betrayed it.’",
          setFlags: { lysaSpared: true },
          approval: { maren: 1 }
        }
      },
      {
        id: "threaten-lookout",
        label: "Threaten the lookout with the road's consequences",
        description: "Force directions quickly, risking the party's trust.",
        keywords: ["threaten lookout", "intimidate cultist", "force answer"],
        once: true,
        check: { skill: "intimidation", dc: 10 },
        success: {
          text: "Lysa gives the route and Sable's hand-sign, then crawls away when released.",
          setFlags: { rootGateKnown: true, sableHandSign: true },
          approval: { maren: -1 }
        },
        failure: {
          text: "She calls your bluff. Orin takes the map from the fallen satchel and ends the exchange.",
          setFlags: { rootGateKnown: true },
          approval: { orin: -1, maren: -1 }
        }
      },
      {
        id: "follow-map",
        label: "Follow the route toward the hidden root-gate",
        description: "Leave the ambush site and enter the old underways.",
        keywords: ["follow map", "root gate", "move on"],
        nextNode: "underroad"
      }
    ]
  },
  "underroad": {
    id: "underroad",
    act: "Act III — Beneath the Briars",
    title: "The Flooded Under-Road",
    location: "Pilgrim Tunnels",
    safeRest: false,
    objective: "Cross the drowned passage without arriving exhausted or exposed.",
    opening: "Black water fills the old pilgrim tunnel from wall to wall. Bell-shaped niches mark a path beneath the surface, but the current pulls toward a shaft where something large turns slowly below.",
    choices: [
      {
        id: "rope-crossing",
        label: "Rig a rope line across the current",
        description: "Use fifty feet of rope to give the whole party a secure crossing.",
        keywords: ["use rope", "rope line", "cross water"],
        consumesTagUse: null,
        requires: { item: "silk-rope" },
        autoSuccess: true,
        result: {
          text: "The rope holds. One by one the party crosses while Orin anchors the line and Nessa watches the dark shaft.",
          setFlags: { crossedDry: true },
          nextNode: "root-gate"
        }
      },
      {
        id: "read-current",
        label: "Read the submerged pilgrim markers",
        description: "Find the old stepping route beneath the water.",
        keywords: ["read current", "markers", "find steps"],
        check: { skill: "investigation", dc: 12, alternateSkills: ["survival", "perception"] },
        success: {
          text: "The niches align with a raised spine of stone. The party crosses with wet boots and no worse.",
          setFlags: { crossedDry: true },
          nextNode: "root-gate"
        },
        failure: {
          text: "A false step drops everyone waist-deep into the current. Packs stay closed, but the cold takes its toll.",
          partyDamage: "1d4",
          nextNode: "root-gate"
        }
      },
      {
        id: "force-current",
        label: "Wade through and hold the weaker swimmers",
        description: "Rely on raw strength and endurance.",
        keywords: ["wade", "swim", "athletics", "force current"],
        check: { skill: "athletics", dc: 13 },
        success: {
          text: "You break the current's line and create a moving shield for the others.",
          approval: { orin: 1 },
          nextNode: "root-gate"
        },
        failure: {
          text: "The current slams the party against the stone lip before Orin drags everyone clear.",
          partyDamage: "1d6",
          nextNode: "root-gate"
        }
      }
    ]
  },
  "root-gate": {
    id: "root-gate",
    act: "Act III — Beneath the Briars",
    title: "The Door That Drinks Names",
    location: "Root-Gate of the Hollow Court",
    safeRest: false,
    objective: "Open the cult's gate without surrendering the advantage.",
    opening: "A door grown from black roots seals the passage. Its bronze mouth bears no keyhole, only a shallow seal-mark and a line of script: WHAT ENTERS UNNAMED ENTERS OWNED.",
    choices: [
      {
        id: "use-cult-seal",
        label: "Press the black-wax cult seal into the bronze mouth",
        description: "Use the conspirators' own sign to enter as expected guests.",
        keywords: ["use seal", "black wax", "cult seal"],
        requires: { item: "cult-seal" },
        autoSuccess: true,
        result: {
          text: "The roots taste the seal and draw aside. Beyond, cultists continue their work, unaware that the wrong party has entered.",
          setFlags: { infiltrated: true },
          nextNode: "hollow-court"
        }
      },
      {
        id: "speak-true-name",
        label: "Answer the gate with the bell's true name",
        description: "Invoke Aster Vey and reject the gate's claim of ownership.",
        keywords: ["true name", "aster vey", "answer gate"],
        requires: { cluesAll: ["bell-true-name"] },
        autoSuccess: true,
        result: {
          text: "At the name Aster Vey, silver light travels through the roots. The door opens and the distant wraith answers with a note of recognition.",
          setFlags: { spiritRecognized: true },
          nextNode: "hollow-court",
          approval: { maren: 1 }
        }
      },
      {
        id: "pick-root-lock",
        label: "Find and work the living lock",
        description: "Use tools and patience to separate the root tendons around the latch.",
        keywords: ["pick lock", "thieves tools", "living lock"],
        check: { skill: "sleightOfHand", dc: 13, toolsRequiredOrPenalty: "thieves-tools" },
        success: {
          text: "The lock opens without a cry. Nessa catches the door before its bronze teeth can ring together.",
          setFlags: { infiltrated: true },
          nextNode: "hollow-court"
        },
        failure: {
          text: "The root-lock shrieks like metal under strain. The door opens, but the court beyond is ready.",
          setFlags: { guardsAlert: true },
          nextNode: "hollow-court"
        }
      },
      {
        id: "break-gate",
        label: "Break the root-gate by force",
        description: "Destroy the barrier before it can close around you.",
        keywords: ["break gate", "smash door", "athletics"],
        check: { skill: "athletics", dc: 14 },
        success: {
          text: "The bronze mouth splits under a final blow. Every voice beyond falls silent.",
          setFlags: { guardsAlert: true, gateDestroyed: true },
          nextNode: "hollow-court",
          approval: { orin: 1 }
        },
        failure: {
          text: "The roots recoil and lash back before the weakened gate gives way.",
          partyDamage: "1d4",
          setFlags: { guardsAlert: true },
          nextNode: "hollow-court"
        }
      }
    ]
  },
  "hollow-court": {
    id: "hollow-court",
    act: "Act III — Beneath the Briars",
    title: "The Hollow Court",
    location: "Cult Antechamber",
    safeRest: false,
    objective: "Reach the bell-vault and obtain proof of Sable's role if possible.",
    opening: "The hollow court was once a wardens' hall. Now roots pin old shields to the walls. Acolytes carry bronze bowls between a cipher desk and a stair descending toward the bell-vault.",
    choices: [
      {
        id: "eavesdrop-court",
        label: "Eavesdrop on the acolytes at the cipher desk",
        description: "Learn the ritual sequence and where Sable keeps his orders.",
        keywords: ["eavesdrop", "listen", "cipher desk", "spy"],
        check: { skill: "stealth", dc: 12, alternateSkills: ["perception"] },
        advantageIfFlag: "infiltrated",
        success: {
          text: "You hear that Sable altered the final verse and keeps the payment ledger beneath the desk's false bottom.",
          clues: ["sable-payments", "wraith-bound"],
          items: [{ itemId: "warden-ledger", quantity: 1 }],
          setFlags: { bossRitualKnown: true },
          nextNode: "vault-antechamber"
        },
        failure: {
          text: "A censer stops mid-swing. The acolyte looks directly toward your hiding place and calls the guards.",
          combat: "hollow-guards"
        }
      },
      {
        id: "nessa-steal-ledger",
        label: "Let Nessa steal the ledger while the party creates a distraction",
        description: "A companion-led plan that depends on the rescued scout.",
        keywords: ["nessa steal", "steal ledger", "distraction"],
        requires: { companion: "nessa" },
        check: { companion: "nessa", skill: "stealth", dc: 11 },
        success: {
          text: "Orin begins a loud argument about delivery seals. Nessa slips behind the desk and returns with the ledger before the acolyte finishes objecting.",
          clues: ["sable-payments"],
          items: [{ itemId: "warden-ledger", quantity: 1 }],
          setFlags: { infiltrated: true },
          nextNode: "vault-antechamber",
          approval: { nessa: 1 }
        },
        failure: {
          text: "The false bottom catches. Nessa gets the ledger, but the desk's bronze alarm rings through the court.",
          clues: ["sable-payments"],
          items: [{ itemId: "warden-ledger", quantity: 1 }],
          combat: "hollow-guards"
        }
      },
      {
        id: "challenge-guards",
        label: "Challenge the court and break through",
        description: "Abandon subtlety and clear the route by force.",
        keywords: ["attack guards", "challenge", "fight court"],
        combat: "hollow-guards"
      },
      {
        id: "show-mercy-sign",
        label: "Use Lysa's safe sign to pass the court",
        description: "Trust the spared lookout's mark and walk through as defectors expected by the cult.",
        keywords: ["safe sign", "lysa sign", "pass court"],
        requires: { flagsAll: ["safeGateSign"] },
        check: { skill: "deception", dc: 10 },
        success: {
          text: "The sentries return the sign. You pass beneath their eyes and reach the vault stairs without drawing steel.",
          setFlags: { infiltrated: true },
          nextNode: "vault-antechamber"
        },
        failure: {
          text: "One sentry knows the sign should be mirrored. His hand closes around the alarm chain.",
          combat: "hollow-guards"
        }
      }
    ]
  },
  "vault-antechamber": {
    id: "vault-antechamber",
    act: "Act IV — The Bell Below",
    title: "Plans Before the Last Door",
    location: "Bell-Vault Antechamber",
    safeRest: true,
    objective: "Choose how the party will disrupt Sable's ritual before entering the bell-vault.",
    opening: "The last door trembles with each slow toll from below. Through its seams you see Sable at a circle of black candles and the outline of a chained spirit inside the cracked bell. Your companions speak in low voices; each has a different answer.",
    choices: [
      {
        id: "maren-rite",
        label: "Follow Maren's plan: restore the original warding verse",
        description: "Use the true name or binding evidence to turn the ritual against Sable.",
        keywords: ["maren plan", "restore rite", "warding verse"],
        requires: { companion: "maren", cluesAny: ["bell-true-name", "wraith-bound"] },
        check: { companion: "maren", skill: "religion", dc: 12 },
        advantageIfItem: "silver-chime",
        success: {
          text: "Maren rebuilds the missing line and the vault answers. The spirit's chains become visible—and breakable.",
          setFlags: { ritualWeakened: true, spiritRecognized: true },
          approval: { maren: 2 },
          nextNode: "bell-vault"
        },
        failure: {
          text: "The verse catches but does not hold. It weakens the binding enough to deny the wraith some of Sable's protection.",
          setFlags: { ritualPartlyWeakened: true },
          nextNode: "bell-vault"
        }
      },
      {
        id: "orin-chain",
        label: "Follow Orin's plan: collapse the chain winch",
        description: "Destroy the mechanism feeding tension into the spirit's binding.",
        keywords: ["orin plan", "break winch", "chain"],
        requires: { companion: "orin" },
        check: { companion: "orin", skill: "athletics", dc: 13 },
        success: {
          text: "Orin wedges his shield into the winch and tears its axle free. The ritual circle lurches out of alignment.",
          setFlags: { ritualWeakened: true },
          approval: { orin: 2 },
          nextNode: "bell-vault"
        },
        failure: {
          text: "The axle bends but holds. Orin leaves it one blow from failure and readies his shield.",
          setFlags: { ritualPartlyWeakened: true, orinStartsGuarding: true },
          nextNode: "bell-vault"
        }
      },
      {
        id: "nessa-key",
        label: "Follow Nessa's plan: steal Sable's binding key",
        description: "Slip through the service slit and take the bronze key from Sable's belt.",
        keywords: ["nessa plan", "steal key", "binding key"],
        requires: { companion: "nessa" },
        check: { companion: "nessa", skill: "stealth", dc: 13 },
        success: {
          text: "Nessa returns with the bronze key and Sable's expression changes from certainty to fear.",
          setFlags: { bindingKey: true, ritualWeakened: true },
          approval: { nessa: 2 },
          nextNode: "bell-vault"
        },
        failure: {
          text: "Sable turns at the last instant. Nessa escapes with a cut sleeve and the knowledge that surprise is gone.",
          setFlags: { bossAlert: true },
          nextNode: "bell-vault"
        }
      },
      {
        id: "player-plan",
        label: "Enter together and confront Sable with what you know",
        description: "Rely on accumulated evidence, presence, and the party's united front.",
        keywords: ["confront sable", "enter together", "my plan"],
        nextNode: "bell-vault"
      }
    ]
  },
  "bell-vault": {
    id: "bell-vault",
    act: "Act IV — The Bell Below",
    title: "The Bell Beneath Briarwatch",
    location: "The Ward-Bell Vault",
    safeRest: false,
    objective: "Break Sable's control of the ward-spirit and survive the final reckoning.",
    opening: "The buried bell is larger than the village tower above it. Black roots suspend it over a pit of pale fire. Warden Sable stands inside the ritual circle with one hand on a bronze chain. A human shape presses against the bell's inner surface each time it tolls.",
    choices: [
      {
        id: "name-the-spirit",
        label: "Ring the silver chime and name Aster Vey",
        description: "Call the ward-spirit home through its true name rather than Sable's binding.",
        keywords: ["aster vey", "ring chime", "true name", "name spirit"],
        requires: { cluesAll: ["bell-true-name"], item: "silver-chime" },
        check: { skill: "religion", dc: 11, alternateSkills: ["persuasion"] },
        advantageIfFlag: "spiritRecognized",
        success: {
          text: "The silver chime cuts through the black toll. The spirit turns from you to Sable and the binding burns away from its wrists.",
          setFlags: { spiritFreed: true },
          combat: "finale-sable-only"
        },
        failure: {
          text: "The spirit hears its name but cannot reach it through the altered verse. Its resistance still tears gaps in Sable's protection.",
          setFlags: { ritualWeakened: true },
          combat: "finale-weakened"
        }
      },
      {
        id: "expose-sable",
        label: "Expose Sable with the cipher ledger",
        description: "Turn his followers against him before the ritual completes.",
        keywords: ["expose sable", "show ledger", "evidence", "traitor"],
        requires: { item: "warden-ledger", cluesAll: ["sable-payments"] },
        check: { skill: "persuasion", dc: 12, alternateSkills: ["intimidation"] },
        success: {
          text: "The ledger passes from hand to shaking hand. Two acolytes cut the secondary chains and flee; Sable loses control of the circle.",
          setFlags: { cultDefects: true, ritualWeakened: true },
          combat: "finale-weakened"
        },
        failure: {
          text: "Sable calls the ledger a forgery and orders the final toll. Doubt remains in the room, but not enough to stop him.",
          setFlags: { cultDoubts: true },
          combat: "finale-full"
        }
      },
      {
        id: "turn-binding-key",
        label: "Turn the stolen binding key against the ritual",
        description: "Release the primary chain using Sable's own key.",
        keywords: ["binding key", "turn key", "release chain"],
        requires: { flagsAll: ["bindingKey"] },
        autoSuccess: true,
        result: {
          text: "The key turns once. Every chain but Sable's personal tether falls away, leaving the spirit free to resist him.",
          setFlags: { spiritFreed: true },
          combat: "finale-sable-only"
        }
      },
      {
        id: "attack-final",
        label: "Break the ritual by force",
        description: "Enter combat before the next toll. Prior preparations still affect the encounter.",
        keywords: ["attack", "fight sable", "break ritual", "charge"],
        dynamicCombat: true
      }
    ]
  },
  ending: {
    id: "ending",
    act: "Epilogue",
    title: "When the Bell Answers",
    location: "Briarwatch at Dawn",
    safeRest: true,
    objective: "The chapter is complete. Review the consequences of your choices.",
    opening: "Dawn reaches Briarwatch before the party does. The ward-bell sounds once across the wet roofs—not as an alarm, but as an answer. Villagers step into the road while your companions carry the proof, the wounded, and the names of those who did not return.",
    ending: true,
    choices: [
      {
        id: "new-chapter",
        label: "Conclude the chapter",
        description: "Record the ending and leave the party ready for a future campaign chapter.",
        keywords: ["conclude", "finish", "epilogue"],
        once: true,
        autoSuccess: true,
        result: {
          text: "Briarwatch begins the work of choosing new wardens. Your party's bonds—and its disagreements—will follow you beyond the village.",
          setFlags: { chapterComplete: true }
        }
      }
    ]
  },
  defeat: {
    id: "defeat",
    act: "Defeat",
    title: "The Bell Keeps Tolling",
    location: "A Memory of the Last Stand",
    safeRest: false,
    objective: "Reload a save or begin a new campaign.",
    opening: "The party falls before the ward can be restored. Briarwatch's bell continues beneath the earth, each toll carrying Sable's command farther through the roots.",
    defeat: true,
    choices: []
  }
};

const CAMPAIGN = {
  id: "bell-beneath-briarwatch",
  title: "The Bell Beneath Briarwatch",
  subtitle: "A branching d20 campaign for one player and an active companion party",
  startNode: "briarwatch-square",
  premise: "The protective bell of Briarwatch has fallen silent. Its keeper returned wounded, its warden vanished, and something beneath the forest has begun to answer in the bell's voice.",
  themes: ["mystery", "loyalty", "mercy", "the misuse of sacred power"],
  levelRange: "1–2",
  narratorFacts: [
    "Briarwatch is a small rain-soaked frontier village protected by an ancient ward-bell.",
    "Warden Sable secretly altered the old rite to bind the first bell-keeper's spirit.",
    "The spirit is dangerous while bound, but it is not inherently evil.",
    "The cult uses black wax bearing a thorn around a cracked bell.",
    "The campaign must remain grounded high fantasy; no science-fiction or modern technology exists in the setting."
  ]
};

module.exports = {
  ABILITIES,
  SKILLS,
  POINT_BUY_COSTS,
  BACKGROUNDS,
  ITEMS,
  CLASSES,
  COMPANIONS,
  ENEMIES,
  ENCOUNTERS,
  CLUES,
  STORY_NODES,
  CAMPAIGN
};
