# Item catalogue (21 November 2026)

Step 5 of the gameplay review plan. The equipment rules are in
[EQUIPMENT.md](EQUIPMENT.md); this is what uses them.

The game now has 185 pieces of equipment (204 items with potions and tools).
Step 5 and the items review took it from 30 to 80 (twelve came from the items review, [report](reviews/claude-items-2026-11-21.md)); Book Three's gear for levels 20 to 40 adds 105
more (see [Book Three gear](#book-three-gear-levels-20-to-40) below). All of
them are in `src/data/gear.json`.

## Where items come from

- **Shops.** Each town sells gear for the levels its chapters are written for:
  Briarwatch (levels 1-5), Ashford (4-9), Highpass (6-10), Merrowgate (11-14),
  Cinder Fold (15-19), and in Book Three Saltwick (20-23) and Vell (23-26).
  Vell's shop closes for good when the city is evacuated late in Book Three,
  so its exclusives can be missed.
- **Shops that grow with the hero.** A town can also have `stockByLevel` in
  `src/data/towns.json`: lists of items that join its shop once the hero
  reaches that level. Book Three uses it for levels 20 to 40, so Highpass,
  Briarwatch and the Part Two towns sell gear for the chapters that come back
  to them. It opens only for a save that has begun Book Three.
- **Region exclusives.** One or two items per town are sold nowhere else. The
  card says "Only sold in …".
- **Chapter rewards.** Twenty chapters (all ten of Book Three, Part One among
  them) give their own item when finished, once per save. They are never
  sold, and each can be worn from two levels below its chapter, so a hero who
  skipped side content can still use it.
- **Bounty rewards.** The first bounty claimed in Briarwatch, Ashford,
  Highpass, Merrowgate, Cinder Fold, Saltwick and Vell gives that town's bounty
  item. A **level bounty** (`bounty:<town>:<level>`) is given by a bounty
  claimed there at that level or above; each claim gives at most one, the
  highest the hero has reached, so a hero who comes back later collects the
  rest one bounty at a time. Level bounties are Book Three's, so they too wait
  until the save has begun it.
- **Rewards waiting for a chapter.** An item with `exclusive.pending` names a
  chapter that is not in the game yet. It is never sold or given until that
  chapter is wired by changing `pending` to `quest`. (Book Three's Part Two
  rewards used this until their chapters went in; none are pending now.)
- **AI adventures.** Finishing an AI adventure gives one item made from a
  template (blade, bow, focus, mail or charm) at the adventure's level. The
  storyteller never sets the numbers: an item is just a template and a level
  (at most 500 possible items), and it is rebuilt from those on every load.
  A save that holds a found item without its record loses it, so on a shared
  server one player's items never appear in another's game. Saves themselves
  are trusted, as with gold: editing a save can still give you items.
  Bonuses stop at +2 to hit, +3 damage, +2 spell attack and DC, base AC 15
  armour and +3 to a skill, however high the level.

## Prices rise

An item costs at least a floor for its rarity (Uncommon 30, Rare 70, Epic 150,
Legendary 300 gold) plus 10 gold per level it needs. A test checks every item.

## Masterwork: what late gold is for

From mid Book Two, heroes earned far more gold than shops could take: a
playtest of 144 campaigns ended Book Three Part One with 10,000 to 12,000
gold unspent. So any smith can now refine an Epic or Legendary item, once,
into a **Masterwork** item one rarity higher. A refine adds one number:

- Weapon: +1 damage. Armour: +1 base AC. Shield: +1 AC.
- Focus: +1 spell save DC. Accessory: 5% more damage dealt.
- Price: **twice the item's price** (Commandery Halberd: 1,240 gold).

Refining the best Epic and Legendary gear of the hero and all three companions
late in Book Three Part One costs up to about 14,000 gold, more than a player
has spare, so gold buys real choices again: who to refine first, and whether
to refine now or wait for the next town's gear. Each item is refined once, so
this is not an endless sink. Basic items, and the two Common catalogue
weapons (Woodcutter's Axe, Hunting Spear), keep their Fine upgrade at the old
price (45 gold plus half the item's price). Uncommon and Rare special items
have no upgrade, because a cheap refine of early gear would beat the next
towns' items. A Masterwork item is never in a shop or given as a reward; it
sells for 30% of its value, like everything else, which is less than it cost.
A refined item shares its base item's story use.

## The new items

| Item | Slot | Rarity | Gold | Requires | Where |
|---|---|---|---|---|---|
| Woodcutter's Axe | Main hand | Common | 18 | None | Briarwatch only |
| Hunting Spear | Main hand | Common | 14 | None | Briarwatch |
| Riverguard Spear | Main hand | Uncommon | 75 | Level 4 · Strength 12 | Ashford Crossing only |
| Toll-keeper's Ledger | Accessory | Uncommon | 85 | Level 4 | Ashford Crossing |
| Marsh Leather | Armour | Uncommon | 80 | Level 4 | Ashford Crossing |
| Glasswind Bow | Main hand | Rare | 150 | Level 7 · Dexterity 13 | Highpass Watch only |
| Signal-keeper's Charm | Accessory | Uncommon | 95 | Level 6 | Highpass Watch |
| Watch-captain's Brigandine | Armour | Rare | 170 | Level 8 · Fighter, Cleric or Ranger · Strength 11 | Highpass Watch |
| Warded Tome | Main hand | Rare | 175 | Level 8 · Wizard | Highpass Watch |
| Harbour Cutlass | Main hand | Rare | 210 | Level 11 · Dexterity 13 | Merrowgate only |
| Lantern-works Goggles | Accessory | Rare | 200 | Level 11 | Merrowgate |
| Tidecaller Staff | Main hand | Rare | 230 | Level 12 · Wizard, Cleric or Bard | Merrowgate |
| Sallows Shadowcoat | Armour | Epic | 320 | Level 12 · Rogue, Ranger or Bard · Dexterity 14 | Merrowgate |
| Forgeheart Maul | Main hand | Epic | 380 | Level 15 · Strength 15 | Cinder Fold only |
| Slag Plate | Armour | Epic | 420 | Level 16 · Fighter or Cleric · Strength 15 | Cinder Fold |
| Bellwright's Chime | Accessory | Epic | 360 | Level 15 · Cleric or Bard | Cinder Fold |
| Emberward Shield | Off hand | Epic | 350 | Level 15 · Strength 13 | Cinder Fold |
| Saltwick Harpoon | Main hand | Epic | 460 | Level 20 · Strength 15 | Saltwick only |
| Roofrunner Boots | Accessory | Epic | 440 | Level 20 · Dexterity 15 | Saltwick |
| Commandery Halberd | Main hand | Legendary | 620 | Level 23 · Fighter · Strength 15 | Vell only |
| Vell Armoury Mail | Armour | Legendary | 700 | Level 24 · Strength 15 | Vell |
| Drillmaster's Baton | Accessory | Legendary | 650 | Level 23 | Vell |
| Roadwarden's Badge | Accessory | Uncommon | 60 | None | Chapter: road |
| Fenmere Reed-pipe | Accessory | Uncommon | 65 | None | Chapter: marsh |
| Drowned Codex | Main hand | Rare | 130 | Wizard, Cleric or Bard | Chapter: archive |
| Glasswind Cloak | Accessory | Rare | 150 | Level 5 | Chapter: summit |
| Beacon-shard Blade | Main hand | Rare | 170 | Level 7 | Chapter: beacon |
| Echo-court Ring | Accessory | Rare | 180 | Level 8 | Chapter: trial |
| Lantern-works Lamp | Accessory | Rare | 210 | Level 11 | Chapter: harbour |
| First-forge Hammer | Main hand | Epic | 360 | Level 14 · Strength 13 | Chapter: cinderfold |
| Casting-hall Charm | Accessory | Epic | 380 | Level 16 | Chapter: motherbell |
| Oathkeeper's Mantle | Accessory | Legendary | 520 | Level 17 | Chapter: oath |
| Volunteer's Ribbon | Accessory | Legendary | 600 | Level 22 | Chapter: b3-vell |
| Bounty-hunter's Cord | Accessory | Uncommon | 55 | None | First bounty, Briarwatch |
| Toll-bridge Buckler | Off hand | Uncommon | 70 | None | First bounty, Ashford Crossing |
| Ridge-stalker's Hood | Accessory | Rare | 140 | Level 6 · Dexterity 13 | First bounty, Highpass Watch |
| Wrecker's Gaff | Main hand | Rare | 200 | Level 11 | First bounty, Merrowgate |
| Slagcaller Gauntlets | Accessory | Epic | 340 | Level 15 · Strength 13 | First bounty, Cinder Fold |
| Cinderglass Longbow | Main hand | Epic | 380 | Level 15 · Dexterity 14 | Cinder Fold |
| Smoke-glass Rapier | Main hand | Epic | 390 | Level 16 · Dexterity 14 | Cinder Fold |
| Bellmetal Rod | Main hand | Epic | 400 | Level 16 · Wizard, Cleric or Bard | Cinder Fold |
| Ward-thread Robe | Armour | Epic | 360 | Level 15 · Wizard, Cleric or Bard | Cinder Fold |
| Plankwalker Sabre | Main hand | Epic | 480 | Level 20 · Dexterity 15 | Saltwick |
| Mistwatch Bow | Main hand | Epic | 470 | Level 20 · Dexterity 15 | Saltwick |
| Saltwick Oilskin | Armour | Epic | 460 | Level 20 · Rogue, Ranger or Bard · Dexterity 15 | Saltwick |
| Lamplighter's Staff | Main hand | Epic | 480 | Level 21 · Wizard, Cleric or Bard | Saltwick |
| Commandery Longbow | Main hand | Legendary | 640 | Level 23 · Dexterity 15 | Vell only |
| Vell Duelling Sword | Main hand | Legendary | 660 | Level 24 · Dexterity 15 | Vell only |
| Chancery Rod | Main hand | Legendary | 680 | Level 24 · Wizard or Bard | Vell only |
| Vell Courier Leathers | Armour | Legendary | 680 | Level 24 · Rogue, Ranger or Bard · Dexterity 15 | Vell only |

## Book Three gear (levels 20 to 40)

The items review found no gear past level 25. Book Three now has 105 more
pieces in five tiers, each in the places its chapters go back to. Book Three
itself stays hidden (`out: 0` in `src/book.js`).

**Only for a save that has begun Book Three.** The level stock
(`stockByLevel`) and the level bounties open only once this save may play
Book Three and has finished one of its chapters (`Book.started(state, 3)`). A
hero who levels past 20 another way (bounties, AI adventures, or a free hosted
account without Book Three) sees only each town's own stock.

**The curve.** Past level 20 enemy armour and attack stop rising (bounded
accuracy), and power comes from job skills, so gear rises slowly, but every
tier is a step up for every kind of item:

| | Tier 20 | Tier 25 | Tier 30 | Tier 35 | Tier 40 |
|---|---|---|---|---|---|
| Weapons (to hit / damage) | +2/+3 | +2/+4 | +2/+4, 5% more dealt | +2/+5, 5% more dealt | +3/+5, 5% more dealt |
| Spell focus (attack / DC) | +3/+3 | +3/+3 to +3/+4, 5% more dealt | +4/+3, 5% more dealt | +4/+4, 5 to 10% more dealt | +5/+4, 10% more dealt |
| Heavy armour (AC) | 20, 10% less taken | 21, 10% less taken | 21, 15% less taken | 22, 15% less taken | 22, 15% less taken, +1 saves, Brace for two rounds |
| Medium armour (AC + Dex up to 2) | 16 | 16 to 17, 5% less taken | 17, 10% less taken | 18, 5% less taken | 18, 10% less taken |
| Light armour (AC + Dex) | 15 | 15, 5% more dealt | 15, 5% more dealt and less taken | 16, 5% more dealt and less taken | 16, 10% more dealt, 5% less taken |
| Shield | +4, 10% less taken | +4, 10% less taken, Brace for two rounds | +4, 10 to 15% less taken | +4, 15% less taken, +1 saves | +5, 15% less taken, +1 saves |

**A cap on damage taken.** However many worn pieces cut damage taken, gear takes off at most 30% (`MAX_GEAR_TAKEN` in `src/equipment.js`). Plate, shield and charm at level 40 add up to 45%, which with AC 28 and Masterwork refines left a heavy wearer taking about a tenth of normal damage.

Every tier has a heavy armour that Fighters and Clerics can wear at Strength 13
(a Cleric starts with 13), and one at Strength 15 that anyone strong enough
can. Accessories reach 20% more damage dealt only at 40 (15% from level 22
on), and skill bonuses stop at +3, as AI adventure items do. No requirement
asks for more than 15 in a score: a preset's best score is 15, and a hero may
never take an ability rise. Strength 15 is for the heaviest armour and
two-handed weapons; one-handed weapons, shields and Dexterity weapons mostly
need 13.

**Who it is for.** A test (`tests/book-three-gear.test.js`) checks that at each
tier every class has a weapon or focus and armour it can wear (and a shield for
Fighters and Clerics, and heavy armour for Clerics), every 2nd job branch has
its own kind of upgrade, and Orin, Maren and Nessa each have upgrades they can
wear. Only places that can't be missed count: Vell's shop and bounty board
close if the city is evacuated, so they don't. Part One never goes back to
Highpass after level 22, so Briarwatch (chapter 7, level 26) sells the tier 25
kit as well as Highpass. Another test checks that no Book Three item is
matched or beaten, for everyone who can wear it, by an item already available
at the same or a lower level (Fine forge items included; a Masterwork refine is left out, since it is meant to carry an item towards the next tier for twice its price). Finesse weapons gain a little more damage dealt per tier than other weapons, because the items review's Saltwick and Vell blades already sit at the top of tier 20.

| Branch | What it gets at each tier |
|---|---|
| Guardian, Battle Priest | Shields and heavy armour (Battle Priests: Strength 13 heavy armour, one-handed Strength 13 weapons and shields) |
| Duelist, Warlord | One- and two-handed Strength weapons; damage accessories for the Warlord |
| Shadow Agent, Saboteur | Finesse weapons, Stealth and Sleight of Hand accessories, items with a debuff skill |
| Grifter, Envoy | Persuasion, Deception and Insight accessories |
| Evoker, Chronist, Binder | A spell focus each tier, damage or defence accessories |
| Lifewarden, Exorcist | Foci for Clerics, Religion and Medicine accessories, debuff skills |
| Wild Warden, Deadeye, Pathfinder | Bows, Survival, Perception, Nature and Animal Handling accessories |
| Lorekeeper, Battle Cantor | Foci for Bards, Arcana and History accessories, Performance and Empowered items |

**Chapter rewards.** Every Part One chapter now gives an item (b3-vell's
Volunteer's Ribbon was the only one), and so does every Part Two chapter:

| Part Two chapter | Item | Requires |
|---|---|---|
| 11, The Price of a Yes (b3-price) | Docker's Debt-tally | Level 28 |
| 12, Wren's Bell (b3-wren) | Forge-signal Longbow | Level 29 · Dexterity 13 |
| 13, The Order (b3-order) | Long-plank Shield | Level 30 · Fighter or Cleric · Strength 13 |
| 14, The Town That Said No (b3-ashford) | Old Wall Mail | Level 31 |
| 15, The Witness's Seal (b3-seal) | Witness's Staff | Level 32 · Cleric or Bard |
| 16, The Winter Watch (b3-winter) | Watch-line Lantern | Level 33 |
| 17, Hesk's Company (b3-company) | Hired Captain's Sabre | Level 34 · Dexterity 13 |
| 18, The Deep (b3-deep) | Surveyor's Lamp | Level 35 |
| 19, The First Promise (b3-promise) | Circle-edge Plate | Level 36 · Strength 15 |
| 20, The First Bell (b3-firstbell) | First-note Tuning Iron | Level 37 · Wizard, Cleric or Bard |

Each is given when its chapter is completed (`src/world.js` calls
`Gear.award(state, 'quest:<id>')` for every chapter).

### Tier 20: levels 20 to 24 (Part One): 22 items

| Item | Slot | Rarity | Gold | Stats | Special | Requires | Where |
|---|---|---|---|---|---|---|---|
| Courier's Frost-cloak | Accessory | Epic | 370 | +1 AC, +1 CON save | 5% less taken | Level 18 | Chapter: The Letter from Vell (b3-letter) |
| Old Keepers' Hand-bell | Main hand | Epic | 380 | +3 spell attack, +3 DC | Ask by Name (weakened) | Level 19 · Wizard, Cleric or Bard | Chapter: Sable's Rite (b3-rite) |
| Iron Road Guide's Cord | Accessory | Epic | 390 | +2 Survival, +2 Animal Handling | story: Survival | Level 20 | Highpass Watch (from 20) |
| Lamp-oil Flask | Accessory | Epic | 390 | +2 Sleight of Hand | Spill and Light (burning) | Level 20 | Saltwick only |
| Ledger-room Lens | Accessory | Epic | 390 | +2 History, +2 Arcana | story: History | Level 20 | Highpass Watch (from 20) |
| Pass-warden's Greataxe | Main hand | Epic | 390 | 2d6, Str, two-handed, +2/+3 |  | Level 20 · Strength 15 | Highpass Watch (from 20) |
| Plankwalker's Leathers | Armour | Epic | 390 | AC 15 + Dex |  | Level 20 | Highpass Watch (from 20), Saltwick |
| Sorrel's Gate Shield | Off hand | Epic | 390 | +4 AC | 10% less taken; Brace (fortified) | Level 20 · Fighter or Cleric · Strength 13 | Chapter: The Pass in Spring (b3-pass) |
| Storm-lamp Lens | Main hand | Epic | 390 | +3 spell attack, +3 DC | Hold the Mist (slowed) | Level 20 · Wizard, Cleric or Bard | Highpass Watch (from 20), Saltwick |
| Tide-hunter's Bolas | Accessory | Epic | 390 | +2 Athletics | Tangle (slowed) | Level 20 | First bounty, Saltwick |
| Watch Chaplain's Mace | Main hand | Epic | 390 | 1d8, Str, +2/+3 | Hallow (vulnerable) | Level 20 · Strength 13 | Highpass Watch (from 20) |
| Iron Road Longbow | Main hand | Epic | 400 | 1d8, bow, +2/+3 |  | Level 21 · Dexterity 13 | Highpass Watch (from 20), Saltwick |
| Lamplighter's Hook-knife | Main hand | Epic | 400 | 1d8, finesse, +2/+3 | Catch the Eaves (slowed) | Level 21 · Dexterity 13 | Saltwick only |
| Lamplighters' Knotted Line | Accessory | Epic | 400 | +1/+1 with weapons, +2 Athletics | story: Athletics | Level 21 | Chapter: The Last Roof (b3-saltwick) |
| Pass-guard Plate | Armour | Epic | 400 | AC 20, heavy | 10% less taken | Level 21 · Fighter or Cleric · Strength 13 | Highpass Watch (from 20) |
| Commandery Brigandine | Armour | Epic | 410 | AC 16 + Dex (max 2) |  | Level 22 | Highpass Watch (from 20), Vell |
| Drill-guard Sabre | Main hand | Legendary | 570 | 1d8, finesse, +2/+3 | Disarming Cut (weakened) | Level 23 · Dexterity 13 | First bounty, Vell (closes if Vell is evacuated) |
| Drill-yard Pavise | Off hand | Legendary | 570 | +4 AC | 5% less taken; Lock Shields (fortified) | Level 23 · Fighter or Cleric · Strength 13 | Vell only |
| Ration-office Ledger | Accessory | Legendary | 570 | +2 Insight, +2 Investigation | story: Investigation | Level 23 | Vell only |
| Witness's Stole | Accessory | Legendary | 570 | +2 Insight, +2 Medicine, +1 WIS save | 5% less taken; story: Insight | Level 23 | Chapter: The Witness (b3-witness) |
| Briarwatch Hour-rope | Accessory | Legendary | 580 | +2 Performance | Ring the Hour (empowered) | Level 24 | Chapter: Home for Help (b3-home) |
| Dead Echo-stone Rod | Main hand | Legendary | 580 | +3 spell attack, +3 DC | 5% more dealt; Unravel (vulnerable) | Level 24 · Wizard | Vell only |

### Tier 25: levels 25 to 29 (Part One): 21 items

| Item | Slot | Rarity | Gold | Stats | Special | Requires | Where |
|---|---|---|---|---|---|---|---|
| Bell-keeper's Staff | Main hand | Epic | 440 | +3 spell attack, +4 DC | 5% more dealt; Still the Frost (weakened) | Level 25 · Wizard, Cleric or Bard | Briarwatch (from 25) |
| Bellmetal Longsword | Main hand | Epic | 440 | 1d10, Str, +2/+4 | Ringing Parry (fortified) | Level 25 · Strength 13 | Briarwatch (from 25) |
| Bramblewood Longbow | Main hand | Epic | 440 | 1d8, bow, +2/+4 | Pinning Shot (slowed) | Level 25 · Dexterity 13 | Briarwatch (from 25) |
| Delegate's Seal | Accessory | Epic | 440 | +3 Persuasion, +2 Deception | story: Deception | Level 25 | Briarwatch (from 25), Highpass Watch (from 25) |
| Furnace-iron Maul | Main hand | Legendary | 590 | 2d6, Str, two-handed, +2/+4 | Shatter (vulnerable) | Level 25 · Strength 15 | Vell only |
| Hollow-oak Leathers | Armour | Epic | 440 | AC 15 + Dex | 5% more dealt | Level 25 | Briarwatch (from 25) |
| Keeper's Prayer-beads | Accessory | Epic | 440 | +2 Religion, +2 History, +1 WIS save | story: Religion | Level 25 | Briarwatch (from 25) |
| Night-watch Cloak | Accessory | Epic | 440 | +1 AC, +2 Perception | 5% less taken; story: Perception | Level 25 | Briarwatch (from 25) |
| Pass-guide's Horn | Accessory | Epic | 440 | +3 Survival, +2 Animal Handling | story: Survival | Level 25 | Briarwatch (from 25), Highpass Watch (from 25) |
| Pass-runner's Blade | Main hand | Epic | 440 | 1d8, finesse, +2/+4 | 5% more dealt; Hamstring (slowed) | Level 25 · Dexterity 13 | Briarwatch (from 25), Highpass Watch (from 25) |
| Smuggler's Gloves | Accessory | Epic | 440 | +2 Sleight of Hand, +2 Stealth | story: Stealth | Level 25 | Briarwatch (from 25), Highpass Watch (from 25) |
| Vault Bell Clapper | Main hand | Legendary | 590 | 1d10, Str, +2/+4 | Last Toll (vulnerable) | Level 25 · Strength 13 | Chapter: The Quiet Bells (b3-vault) |
| Watch-captain's Scale | Armour | Epic | 440 | AC 16 + Dex (max 2) | 5% less taken | Level 25 | Briarwatch (from 25), Highpass Watch (from 25) |
| Bell-bronze Plate | Armour | Epic | 450 | AC 21, heavy | 10% less taken; Brace (fortified) | Level 26 · Fighter or Cleric · Strength 13 | Briarwatch (from 25) |
| Gate-bell Staff | Main hand | Legendary | 600 | +3 spell attack, +3 DC | 5% more dealt; Ring the Gates (slowed) | Level 26 · Wizard, Cleric or Bard | Chapter: The Great Bell of Vell (b3-greatbell) |
| Gloam-cutter Greatsword | Main hand | Epic | 450 | 2d6, Str, two-handed, +2/+4 | Kindle (burning) | Level 26 · Strength 15 | Briarwatch (from 25), Highpass Watch (from 25) |
| Watch-fire Brooch | Accessory | Epic | 450 |  | 15% more dealt; 5% less taken; Rally (empowered) | Level 26 | Briarwatch (from 25), Highpass Watch (from 25) |
| Bell-rim Shield | Off hand | Epic | 460 | +4 AC | 10% less taken; Brace (fortified) | Level 27 · Fighter or Cleric · Strength 13 | Briarwatch (from 25) |
| Hesk's Drill-coat | Armour | Legendary | 610 | AC 17 + Dex (max 2) | 5% less taken | Level 27 | Chapter: What Was Paid (b3-paid) |
| Docker's Debt-tally | Accessory | Legendary | 620 | +3 Insight, +2 Investigation | 10% more dealt; 5% less taken; story: Insight | Level 28 | Chapter: The Price of a Yes (b3-price) |
| Forge-signal Longbow | Main hand | Legendary | 630 | 1d8, bow, +2/+4 | Signal Shot (vulnerable) | Level 29 · Dexterity 13 | Chapter: Wren's Bell (b3-wren) |

### Tier 30: levels 30 to 34 (Part Two): 26 items

| Item | Slot | Rarity | Gold | Stats | Special | Requires | Where |
|---|---|---|---|---|---|---|---|
| Dock-runner's Jerkin | Armour | Epic | 490 | AC 15 + Dex | 5% more dealt; 5% less taken | Level 30 | Merrowgate (from 30) |
| Harbour Factor's Ring | Accessory | Epic | 490 | +3 Persuasion, +3 Deception | story: Deception | Level 30 | Merrowgate (from 30) |
| Harbour Hospice Censer | Accessory | Epic | 490 | +3 Medicine, +2 Religion, +1 WIS save | story: Medicine | Level 30 | Merrowgate (from 30) |
| Lantern Hall Smallsword | Main hand | Epic | 490 | 1d8, finesse, +2/+4 | 5% more dealt; Disarming Cut (weakened) | Level 30 · Dexterity 13 | Merrowgate only (from 30) |
| Long-plank Shield | Off hand | Legendary | 640 | +4 AC | 10% less taken; Hold the Plank (fortified) | Level 30 · Fighter or Cleric · Strength 13 | Chapter: The Order (b3-order) |
| Miners' Signal-staff | Main hand | Epic | 490 | +4 spell attack, +3 DC | 5% more dealt; Signal (weakened) | Level 30 · Wizard, Cleric or Bard | Highpass Watch (from 30), Cinder Fold (from 30) |
| Seawall Greatsword | Main hand | Epic | 490 | 2d6, Str, two-handed, +2/+4 | 5% more dealt | Level 30 · Strength 15 | Ashford Crossing (from 30), Merrowgate (from 30) |
| Wrecker Captain's Spyglass | Accessory | Legendary | 640 | +3 Perception | 10% more dealt; story: Perception | Level 30 | First bounty, Merrowgate at level 30+ |
| Ashford Wall-bow | Main hand | Epic | 500 | 1d8, bow, +2/+4 | 5% more dealt; Pinning Shot (slowed) | Level 31 · Dexterity 13 | Ashford Crossing (from 30), Highpass Watch (from 30) |
| Foundry Brand-ring | Accessory | Epic | 500 |  | 15% more dealt; 5% less taken; Bank the Fire (empowered) | Level 31 | Cinder Fold (from 30) |
| Gallery Warhammer | Main hand | Epic | 500 | 1d10, Str, +2/+4 | 5% more dealt; Shatter (vulnerable) | Level 31 · Strength 13 | Cinder Fold only (from 30) |
| Lid-forge Plate | Armour | Epic | 500 | AC 21, heavy | 15% less taken | Level 31 · Fighter or Cleric · Strength 13 | Cinder Fold only (from 30) |
| Miners' Rope-chime | Accessory | Epic | 500 | +3 Performance | Every Rope at Once (empowered) | Level 31 | Cinder Fold (from 30) |
| Old Wall Mail | Armour | Legendary | 650 | AC 17 + Dex (max 2) | 10% less taken | Level 31 | Chapter: The Town That Said No (b3-ashford) |
| Slag Golem's Core | Accessory | Legendary | 650 |  | 5% less taken; Molten Core (burning) | Level 31 | First bounty, Cinder Fold at level 30+ |
| Archive Grammar | Main hand | Epic | 510 | +4 spell attack, +3 DC | 5% more dealt; Unravel (vulnerable) | Level 32 · Wizard | Ashford Crossing (from 30) |
| Plank-hook Gloves | Accessory | Epic | 510 | +3 Sleight of Hand, +3 Stealth | story: Stealth | Level 32 | Saltwick only (from 30) |
| Roof-council Coat | Armour | Epic | 510 | AC 17 + Dex (max 2) | 10% less taken | Level 32 | Highpass Watch (from 30), Saltwick (from 30) |
| Salt-ward Charm | Accessory | Epic | 510 | +1 AC, +1 saves | 5% less taken | Level 32 | Saltwick (from 30) |
| Witness's Staff | Main hand | Legendary | 660 | +4 spell attack, +4 DC | 5% more dealt; Hear the Lie (weakened) | Level 32 · Cleric or Bard | Chapter: The Witness's Seal (b3-seal) |
| Archive Reader's Spectacles | Accessory | Epic | 520 | +3 Arcana, +3 History | story: History | Level 33 | Ashford Crossing (from 30) |
| Ashford Wall-shield | Off hand | Epic | 520 | +4 AC | 15% less taken; Hold the Wall (fortified) | Level 33 · Fighter or Cleric · Strength 13 | Ashford Crossing only (from 30) |
| Raider Chief's Axe | Main hand | Legendary | 670 | 1d8, Str, +2/+4 | 5% more dealt; Sweep (weakened) | Level 33 · Strength 13 | First bounty, Ashford Crossing at level 30+ |
| Valley Scout's Horn | Accessory | Epic | 520 | +3 Survival, +3 Perception | story: Perception | Level 33 | Ashford Crossing (from 30) |
| Watch-line Lantern | Accessory | Legendary | 670 | +1 AC, +3 Perception | 10% less taken; story: Perception | Level 33 | Chapter: The Winter Watch (b3-winter) |
| Hired Captain's Sabre | Main hand | Legendary | 680 | 1d8, finesse, +2/+4 | 10% more dealt; Disarming Cut (weakened) | Level 34 · Dexterity 13 | Chapter: Hesk's Company (b3-company) |

### Tier 35: levels 35 to 39 (Part Two): 19 items

| Item | Slot | Rarity | Gold | Stats | Special | Requires | Where |
|---|---|---|---|---|---|---|---|
| Briarwood Night-leathers | Armour | Legendary | 690 | AC 16 + Dex | 5% more dealt; 5% less taken | Level 35 | Briarwatch (from 35) |
| Briarwood Watch-blade | Main hand | Legendary | 690 | 1d10, Str, +2/+5 | 5% more dealt | Level 35 · Strength 13 | Briarwatch (from 35) |
| Council Envoy's Chain | Accessory | Legendary | 690 | +3 Persuasion, +3 Insight | 5% more dealt; story: Persuasion | Level 35 | Highpass Watch (from 35) |
| Frost-edge Knife | Main hand | Legendary | 690 | 1d8, finesse, +2/+5 | 10% more dealt; Hamstring (slowed) | Level 35 · Dexterity 13 | Highpass Watch (from 35) |
| Hearth-bell Charm | Accessory | Legendary | 690 | +1 AC, +1 CON save, +1 WIS save | 10% less taken | Level 35 | Cinder Fold only (from 35) |
| Hearth-bell Shield | Off hand | Legendary | 690 | +4 AC | 15% less taken; Brace (fortified) | Level 35 · Fighter or Cleric · Strength 13 | Cinder Fold (from 35) |
| Ridge Stalker's Pelt | Accessory | Legendary | 690 | +1 AC, +3 Stealth | story: Stealth | Level 35 | First bounty, Highpass Watch at level 35+ |
| Snow-guide's Scale | Armour | Legendary | 690 | AC 18 + Dex (max 2) | 5% less taken | Level 35 | Briarwatch (from 35), Highpass Watch (from 35) |
| Surveyor's Lamp | Accessory | Legendary | 690 | +3 Survival, +3 Investigation | 10% more dealt; story: Survival | Level 35 | Chapter: The Deep (b3-deep) |
| Watch-captain's Horn | Accessory | Legendary | 690 | +3 Performance | 15% more dealt; Sound the Watch (empowered) | Level 35 | Briarwatch (from 35) |
| Watch-line Longbow | Main hand | Legendary | 690 | 1d8, bow, +2/+5 | 5% more dealt | Level 35 · Dexterity 13 | Briarwatch (from 35) |
| Winter Tracker's Cloak | Accessory | Legendary | 690 | +3 Survival, +3 Stealth | story: Survival | Level 35 | Briarwatch (from 35) |
| Winter-watch Staff | Main hand | Legendary | 690 | +4 spell attack, +4 DC | 5% more dealt; Hold the Line (slowed) | Level 35 · Wizard, Cleric or Bard | Briarwatch (from 35) |
| Book of Hours | Accessory | Legendary | 700 | +3 Religion, +3 History, +3 Medicine | story: Religion | Level 36 | Briarwatch (from 35) |
| Circle-edge Plate | Armour | Legendary | 700 | AC 22, heavy | 15% less taken; Brace (fortified) | Level 36 · Strength 15 | Chapter: The First Promise (b3-promise) |
| Ninefold Greathammer | Main hand | Legendary | 700 | 2d6, Str, two-handed, +2/+5 | 5% more dealt; Shatter (vulnerable) | Level 36 · Strength 15 | Cinder Fold (from 35) |
| Winter-watch Plate | Armour | Legendary | 700 | AC 22, heavy | 15% less taken | Level 36 · Fighter or Cleric · Strength 13 | Highpass Watch (from 35), Cinder Fold (from 35) |
| First-note Tuning Iron | Main hand | Legendary | 710 | +4 spell attack, +4 DC | 10% more dealt; First Note (vulnerable) | Level 37 · Wizard, Cleric or Bard | Chapter: The First Bell (b3-firstbell) |
| Margin-noted Grammar | Main hand | Legendary | 710 | +4 spell attack, +4 DC | 10% more dealt; Unravel (vulnerable) | Level 37 · Wizard | Highpass Watch only (from 35) |

### Tier 40: level 40 (after the book): 17 items

| Item | Slot | Rarity | Gold | Stats | Special | Requires | Where |
|---|---|---|---|---|---|---|---|
| Bell-iron Shield | Off hand | Legendary | 740 | +5 AC | 15% less taken; Brace (fortified) | Level 40 · Fighter or Cleric · Strength 13 | Briarwatch (from 40) |
| Bellward Longsword | Main hand | Legendary | 740 | 1d10, Str, +3/+5 | 5% more dealt; Kindle (burning) | Level 40 · Strength 13 | Briarwatch (from 40), Highpass Watch (from 40) |
| Bramble-silk Gloves | Accessory | Legendary | 740 | +3 Stealth, +3 Sleight of Hand | Snare (slowed) | Level 40 | Briarwatch (from 40) |
| Bramble-steel Rapier | Main hand | Legendary | 740 | 1d8, finesse, +3/+5 | 10% more dealt; Disarming Cut (weakened) | Level 40 · Dexterity 13 | Briarwatch (from 40), Highpass Watch (from 40) |
| Briar-leather Coat | Armour | Legendary | 740 | AC 16 + Dex | 10% more dealt; 5% less taken | Level 40 | Briarwatch (from 40) |
| Briar-yew Greatbow | Main hand | Legendary | 740 | 1d8, bow, +3/+5 | 5% more dealt; Pinning Shot (slowed) | Level 40 · Dexterity 13 | Briarwatch (from 40), Highpass Watch (from 40) |
| Briarwatch Greatsword | Main hand | Legendary | 740 | 2d6, Str, two-handed, +3/+5 | 5% more dealt; Shatter (vulnerable) | Level 40 · Strength 15 | Briarwatch (from 40) |
| Briarwood Warden's Horn | Accessory | Legendary | 740 | +3 Survival, +3 Perception, +3 Nature | 5% more dealt; story: Survival | Level 40 | Briarwatch (from 40) |
| Free Wards' Envoy Seal | Accessory | Legendary | 740 | +3 Persuasion, +3 Deception, +3 Insight | 5% more dealt; story: Persuasion | Level 40 | Briarwatch (from 40) |
| Hour Chime | Accessory | Legendary | 740 | +3 Performance, +2 WIS save, +2 CHA save | Ring True (empowered) | Level 40 | Briarwatch (from 40) |
| Hour-bell Staff | Main hand | Legendary | 740 | +5 spell attack, +4 DC | 10% more dealt; Toll the Hour (weakened) | Level 40 · Wizard, Cleric or Bard | Briarwatch (from 40), Highpass Watch (from 40) |
| Keeper's Day-book | Accessory | Legendary | 740 | +3 Arcana, +3 History, +3 Religion | story: Arcana | Level 40 | Briarwatch (from 40) |
| Poacher-king's Longbow | Main hand | Legendary | 740 | 1d8, bow, +3/+5 | 10% more dealt | Level 40 · Dexterity 13 | First bounty, Briarwatch at level 40+ |
| Second-winter Charm | Accessory | Legendary | 740 | +1 AC, +1 saves | 15% less taken | Level 40 | Briarwatch (from 40) |
| Ward-captain's Signet | Accessory | Legendary | 740 |  | 20% more dealt; 5% less taken; story: Insight | Level 40 | Briarwatch (from 40) |
| Wardsmith's Plate | Armour | Legendary | 740 | AC 22, heavy | 15% less taken; Brace (fortified) | Level 40 · Fighter or Cleric · Strength 13 | Briarwatch (from 40) |
| Wardsmith's Scale | Armour | Legendary | 740 | AC 18 + Dex (max 2) | 10% less taken | Level 40 | Briarwatch (from 40), Highpass Watch (from 40) |
