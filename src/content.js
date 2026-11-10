"use strict";
// Authored base content. The tables live in src/data/*.json so they can be
// edited (or generated and validated) without touching game logic; this module
// only gathers them. Regional content is added by expansion.js.
const ABILITIES = require("./data/abilities.json");
const SKILLS = require("./data/skills.json");
const POINT_BUY_COSTS = require("./data/point-buy-costs.json");
const BACKGROUNDS = require("./data/backgrounds.json");
const ITEMS = require("./data/items.json");
const CLASSES = require("./data/classes.json");
const COMPANIONS = require("./data/companions.json");
const ENEMIES = require("./data/enemies.json");
const ENCOUNTERS = require("./data/encounters.json");
const CLUES = require("./data/clues.json");
const STORY_NODES = require("./data/story-nodes.json");
const CAMPAIGN = require("./data/campaign.json");

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
