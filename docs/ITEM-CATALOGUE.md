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

**A cap on damage taken.** However many worn pieces cut damage taken, gear takes off at most 30% (`MAX_GEAR_TAKEN` in `src/equipment.js`). Plate, shield and charm at level 40 add up to 45%, which with AC 28 and Masterwork refines left a heavy wearer taking about a tenth of normal damage. Every item card that cuts damage taken says so: "(all worn gear together takes off at most 30%)".

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
kit as well as Highpass. In the same way Part Two leaves Highpass and Cinder
Fold at level 34, and from 35 Briarwatch (chapter 16) is the last shop before
the stair, so it also sells their tier 35 knife, greathammer, shield, plate
and envoy's chain. A second test checks every class, branch and companion
against only the towns the story stops in at each tier. Another test checks that no Book Three item is
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
| Old Wall Mail | Armour | Legendary | 650 | AC 17 + Dex (max 2), +1 CON save | 10% less taken | Level 31 | Chapter: The Town That Said No (b3-ashford) |
| Slag Golem's Core | Accessory | Legendary | 650 |  | 5% less taken; Molten Core (burning) | Level 31 | First bounty, Cinder Fold at level 30+ |
| Archive Grammar | Main hand | Epic | 510 | +4 spell attack, +3 DC | 5% more dealt; Unravel (vulnerable) | Level 32 · Wizard | Ashford Crossing (from 30) |
| Plank-hook Gloves | Accessory | Epic | 510 | +3 Sleight of Hand, +3 Stealth | story: Stealth | Level 32 | Saltwick only (from 30) |
| Roof-council Coat | Armour | Epic | 510 | AC 17 + Dex (max 2), +1 DEX save | 10% less taken | Level 32 | Highpass Watch (from 30), Saltwick (from 30) |
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
| Council Envoy's Chain | Accessory | Legendary | 690 | +3 Persuasion, +3 Insight | 5% more dealt; story: Persuasion | Level 35 | Highpass Watch (from 35), Briarwatch (from 35) |
| Frost-edge Knife | Main hand | Legendary | 690 | 1d8, finesse, +2/+5 | 10% more dealt; Hamstring (slowed) | Level 35 · Dexterity 13 | Highpass Watch (from 35), Briarwatch (from 35) |
| Hearth-bell Charm | Accessory | Legendary | 690 | +1 AC, +1 CON save, +1 WIS save | 10% less taken | Level 35 | Cinder Fold only (from 35) |
| Hearth-bell Shield | Off hand | Legendary | 690 | +4 AC, +1 saves | 15% less taken; Brace (fortified) | Level 35 · Fighter or Cleric · Strength 13 | Cinder Fold (from 35), Briarwatch (from 35) |
| Ridge Stalker's Pelt | Accessory | Legendary | 690 | +1 AC, +3 Stealth | story: Stealth | Level 35 | First bounty, Highpass Watch at level 35+ |
| Snow-guide's Scale | Armour | Legendary | 690 | AC 18 + Dex (max 2) | 5% less taken | Level 35 | Briarwatch (from 35), Highpass Watch (from 35) |
| Surveyor's Lamp | Accessory | Legendary | 690 | +3 Survival, +3 Investigation | 10% more dealt; story: Survival | Level 35 | Chapter: The Deep (b3-deep) |
| Watch-captain's Horn | Accessory | Legendary | 690 | +3 Performance | 15% more dealt; Sound the Watch (empowered) | Level 35 | Briarwatch (from 35) |
| Watch-line Longbow | Main hand | Legendary | 690 | 1d8, bow, +2/+5 | 5% more dealt | Level 35 · Dexterity 13 | Briarwatch (from 35) |
| Winter Tracker's Cloak | Accessory | Legendary | 690 | +3 Survival, +3 Stealth | story: Survival | Level 35 | Briarwatch (from 35) |
| Winter-watch Staff | Main hand | Legendary | 690 | +4 spell attack, +4 DC | 5% more dealt; Hold the Line (slowed) | Level 35 · Wizard, Cleric or Bard | Briarwatch (from 35) |
| Book of Hours | Accessory | Legendary | 700 | +3 Religion, +3 History, +3 Medicine | story: Religion | Level 36 | Briarwatch (from 35) |
| Circle-edge Plate | Armour | Legendary | 700 | AC 22, heavy | 15% less taken; Brace (fortified) | Level 36 · Strength 15 | Chapter: The First Promise (b3-promise) |
| Ninefold Greathammer | Main hand | Legendary | 700 | 2d6, Str, two-handed, +2/+5 | 5% more dealt; Shatter (vulnerable) | Level 36 · Strength 15 | Cinder Fold (from 35), Briarwatch (from 35) |
| Winter-watch Plate | Armour | Legendary | 700 | AC 22, heavy | 15% less taken | Level 36 · Fighter or Cleric · Strength 13 | Highpass Watch (from 35), Cinder Fold (from 35), Briarwatch (from 35) |
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
| Wardsmith's Scale | Armour | Legendary | 740 | AC 18 + Dex (max 2), +1 CON save | 10% less taken | Level 40 | Briarwatch (from 40), Highpass Watch (from 40) |

## Gear for levels 45 to 100 (22 November 2026)

Curtis asked for gear up to level 100 without one item of every type at every
level, and for equipment sets with set bonuses. There are 77 new pieces at nine
tiers (45, 50, 55, 60, 65, 70, 80, 90 and 100), about eight a tier:

- **45:** armour of all three weights, two shields (one, the Warded Buckler,
  needs no Strength, so Maren and other casters can carry a shield) and three accessories.
- **50:** a weapon or focus for every style, and three accessories.
- **55 to 65: the Book Four sets.** Weapons and foci at 55, armour and shields at 60, accessories at 65.
- **70:** armour, a shield and four accessories (two from level bounties).
- **80:** a weapon or focus for every style, a Strength-free buckler, and three bounty accessories.
- **90 to 100: the final sets.** Weapons, armour and shields at 90, accessories at 100, plus a
  greataxe, a scale coat and a bounty bell at 100.

Every tier has something for every class and for Orin, Maren and Nessa, and each
kind of kit (each weapon style, each armour weight, shields, accessories) gets
an upgrade at least every 20 levels. Each upgrade is a small step on the last
(tests/endgame-gear.test.js), and nothing is matched by an older piece.

**Where it comes from.** Until Book Four's towns are written, Briarwatch and
Highpass sell every tier from its level, and only for a save that has begun Book
Three (like the level 20 to 40 stock). The Book Four thread will move the 45 to
70 stock into its own towns (Lantry, Orme and the others in
docs/book-four/DESIGN.md). Six accessories are level bounty rewards in Briarwatch,
Highpass, Ashford, Merrowgate and Cinder Fold, at 70, 80 and 100. Gear found on
AI adventures now keeps improving past level 40 (up to +4 to hit, +7 damage at
100), a step behind the shops.

**Equipment sets.** Six sets, one per play style (heavy fighters and clerics;
finesse fighters, rogues and bards; archers; wizards; clerics; bards), each in a
Book Four version and a final version. A set has 3 pieces (weapon or focus,
armour, accessory); the heavy and cleric sets have a shield as a 4th. Wearing 2
pieces turns on a small bonus; each further piece adds one, and the full set
gives a set skill, a bonus action once per fight. Set bonuses count toward the
caps on gear: at most 30% less damage taken and, new, at most 50% more damage
dealt (Book Four design). Set pieces need the set's classes; other accessories
still need only a level. A Masterwork refine of a set piece is still that piece.

**Balance.** A simulation of the standard AI-adventure battle (one class branch
each, 6 seeds, Normal and Heroic) at levels 50, 70 and 100 compared the level 40
kit with the new kit: both win every fight, in 2 to 6 rounds, with 85% to 99% of
the party's health left. The new gear adds a few points of health left and
shortens some fights by a round. It does not change the result: fights past
level 40 are already easy with the level 40 kit, which is about enemy strength,
not gear (a follow-up for the Book Four and gameplay threads).

### Level 45: 8 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Frostforged Plate | Armour | Base AC 23, no Dexterity bonus. -2 Stealth. 15% less damage taken. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Ridgeguard Scale | Armour | Base AC 19, up to +2 from Dexterity. +1 Constitution saves, +1 Dexterity saves. 10% less damage taken. | Anyone | Briarwatch, Highpass |
| Mistweave Jerkin | Armour | Base AC 17, full Dexterity bonus. +2 Stealth. 10% more damage dealt; 5% less damage taken. | Anyone | Briarwatch, Highpass |
| Gatewarden Shield | Off hand | Equip in your off hand for +5 Armor Class. Cannot be used with a two-handed weapon. +2 to every saving throw. 15% less damage taken; Skill, Hold the Gate: Become Fortified for two rounds: take 25% less damage. Bonus action, once per fight.. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Warded Buckler | Off hand | Equip in your off hand for +4 Armor Class. Cannot be used with a two-handed weapon. +1 Wisdom saves, +1 Constitution saves. 10% less damage taken. | Wizard, Cleric, Bard | Briarwatch, Highpass |
| Hoarfrost Locket | Accessory | Equip in the accessory slot: +1 AC. +1 Strength saves, +1 Dexterity saves, +2 Constitution saves, +1 Intelligence saves, +1 Wisdom saves, +1 Charisma saves. 15% less damage taken. | Anyone | Briarwatch, Highpass |
| Ghostlace Gloves | Accessory | Equip in the accessory slot. +3 Stealth, +3 Sleight of Hand, +3 Acrobatics. | Anyone | Briarwatch, Highpass |
| Pilgrim's Almanac | Accessory | Equip in the accessory slot. +3 Arcana, +3 History, +3 Religion, +3 Medicine. | Anyone | Briarwatch, Highpass |

### Level 50: 8 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Rimeheart Longsword | Main hand | Strength, 1d10 slashing, +3 to hit, +6 damage. 5% more damage dealt; Skill, Frostbite: Slow an enemy for two rounds: 2 less armour. Bonus action, once per fight.. | STR 13 | Briarwatch, Highpass |
| Glacier Maul | Main hand | Strength, 2d6 bludgeoning, +3 to hit, +6 damage. Two-handed. 5% more damage dealt; Skill, Cave In: Make an enemy Vulnerable for one round: it takes 25% more damage. Bonus action, once per fight.. | STR 15 | Briarwatch, Highpass |
| Icicle Stiletto | Main hand | Finesse, 1d8 piercing, +3 to hit, +6 damage. 10% more damage dealt; Skill, Numb: Weaken an enemy for one round: it deals 25% less damage. Bonus action, once per fight.. | DEX 13 | Briarwatch, Highpass |
| Skyreach Longbow | Main hand | Dexterity, 1d8 piercing, +3 to hit, +6 damage. Two-handed ranged weapon. 10% more damage dealt; Skill, Pin Down: Slow an enemy for two rounds: 2 less armour. Bonus action, once per fight.. | DEX 13 | Briarwatch, Highpass |
| Aurora Staff | Main hand | Equip: +5 spell attack bonus and +5 spell save DC. 10% more damage dealt; Skill, Dazzle: Weaken an enemy for one round: it deals 25% less damage. Bonus action, once per fight.. | Wizard, Cleric, Bard | Briarwatch, Highpass |
| Avalanche Horn | Accessory | Equip in the accessory slot. 20% more damage dealt; 5% less damage taken; Skill, Rallying Blast: Become Empowered for one round: deal 25% more damage. Bonus action, once per fight.. | Anyone | Briarwatch, Highpass |
| Ambassador's Brooch | Accessory | Equip in the accessory slot. +3 Persuasion, +3 Deception, +3 Insight, +2 History. 5% more damage dealt. | Anyone | Briarwatch, Highpass |
| Wolfpelt Mantle | Accessory | Equip in the accessory slot. +3 Survival, +3 Perception, +3 Nature, +3 Animal Handling. 5% more damage dealt. | Anyone | Briarwatch, Highpass |

### Level 55: 6 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Bellwarden Hammer (Bellwarden's Oath set) | Main hand | Strength, 1d10 bludgeoning, +3 to hit, +7 damage. 5% more damage dealt. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Thornstep Rapier (Thornstep set) | Main hand | Finesse, 1d8 piercing, +3 to hit, +7 damage. 10% more damage dealt; Skill, Thorned Riposte: Weaken an enemy for one round: it deals 25% less damage. Bonus action, once per fight.. | Fighter, Rogue, Bard · DEX 13 | Briarwatch, Highpass |
| Long Watch Bow (The Long Watch set) | Main hand | Dexterity, 1d8 piercing, +3 to hit, +7 damage. Two-handed ranged weapon. 10% more damage dealt. | Ranger, Rogue, Fighter · DEX 13 | Briarwatch, Highpass |
| Lamplit Staff (The Lamplit Scholar set) | Main hand | Equip: +6 spell attack bonus and +5 spell save DC. 10% more damage dealt; Skill, Read the Weakness: Make an enemy Vulnerable for one round: it takes 25% more damage. Bonus action, once per fight.. | Wizard | Briarwatch, Highpass |
| Hearthward Staff (Hearthward set) | Main hand | Equip: +6 spell attack bonus and +5 spell save DC. 5% more damage dealt; Skill, Censure: Weaken an enemy for one round: it deals 25% less damage. Bonus action, once per fight.. | Cleric | Briarwatch, Highpass |
| Chorus Baton (The Chorus set) | Main hand | Equip: +5 spell attack bonus and +6 spell save DC. 10% more damage dealt; Skill, Sour Note: Slow an enemy for one round: 2 less armour. Bonus action, once per fight.. | Bard | Briarwatch, Highpass |

### Level 60: 9 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Bellwarden Plate (Bellwarden's Oath set) | Armour | Base AC 23, no Dexterity bonus. -2 Stealth; +1 to every saving throw. 15% less damage taken. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Bellwarden Shield (Bellwarden's Oath set) | Off hand | Equip in your off hand for +6 Armor Class. Cannot be used with a two-handed weapon. 15% less damage taken. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Thornstep Leathers (Thornstep set) | Armour | Base AC 17, full Dexterity bonus. +2 Stealth, +2 Acrobatics. 10% more damage dealt; 5% less damage taken. | Fighter, Rogue, Bard | Briarwatch, Highpass |
| Long Watch Coat (The Long Watch set) | Armour | Base AC 17, full Dexterity bonus. +2 Perception, +2 Survival. 5% more damage dealt; 5% less damage taken. | Ranger, Rogue, Fighter | Briarwatch, Highpass |
| Lamplit Robe (The Lamplit Scholar set) | Armour | Base AC 17, full Dexterity bonus. +2 Arcana; +1 Intelligence saves, +1 Wisdom saves. 10% less damage taken. | Wizard | Briarwatch, Highpass |
| Hearthward Mail (Hearthward set) | Armour | Base AC 19, up to +2 from Dexterity. +2 Medicine; +1 Wisdom saves, +1 Constitution saves. 10% less damage taken. | Cleric | Briarwatch, Highpass |
| Hearthward Buckler (Hearthward set) | Off hand | Equip in your off hand for +5 Armor Class. Cannot be used with a two-handed weapon. +1 Wisdom saves, +1 Constitution saves. 10% less damage taken. | Cleric | Briarwatch, Highpass |
| Chorus Coat (The Chorus set) | Armour | Base AC 17, full Dexterity bonus. +2 Performance, +2 Persuasion. 5% more damage dealt; 5% less damage taken. | Bard | Briarwatch, Highpass |
| Riftcleaver | Main hand | Strength, 2d6 slashing, +3 to hit, +7 damage. Two-handed. 10% more damage dealt; Skill, Split the Ice: Make an enemy Vulnerable for one round: it takes 25% more damage. Bonus action, once per fight.. | STR 15 | Briarwatch, Highpass |

### Level 65: 6 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Bellwarden Seal (Bellwarden's Oath set) | Accessory | Equip in the accessory slot: +1 AC. +3 Athletics; +1 to every saving throw. 10% less damage taken. | Fighter, Cleric | Briarwatch, Highpass |
| Thornstep Band (Thornstep set) | Accessory | Equip in the accessory slot. +3 Stealth, +3 Acrobatics. 15% more damage dealt. | Fighter, Rogue, Bard | Briarwatch, Highpass |
| Long Watch Quiver (The Long Watch set) | Accessory | Equip in the accessory slot. +3 Survival, +3 Perception. 15% more damage dealt. | Ranger, Rogue, Fighter | Briarwatch, Highpass |
| Lamplit Lens (The Lamplit Scholar set) | Accessory | Equip in the accessory slot. +3 Arcana, +3 History; +1 Intelligence saves. 10% more damage dealt. | Wizard | Briarwatch, Highpass |
| Hearthward Rosary (Hearthward set) | Accessory | Equip in the accessory slot. +3 Religion, +3 Medicine; +1 Wisdom saves. 10% less damage taken. | Cleric | Briarwatch, Highpass |
| Chorus Bell (The Chorus set) | Accessory | Equip in the accessory slot. +3 Performance, +3 Persuasion, +3 Insight. 10% more damage dealt. | Bard | Briarwatch, Highpass |

### Level 70: 8 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Summitforged Plate | Armour | Base AC 24, no Dexterity bonus. -2 Stealth; +1 to every saving throw. 15% less damage taken. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Summit Scale | Armour | Base AC 20, up to +2 from Dexterity. +1 Constitution saves, +1 Dexterity saves. 10% less damage taken. | Anyone | Briarwatch, Highpass |
| Windrunner Leathers | Armour | Base AC 18, full Dexterity bonus. +2 Stealth. 10% more damage dealt; 5% less damage taken. | Anyone | Briarwatch, Highpass |
| Summit Wall Shield | Off hand | Equip in your off hand for +6 Armor Class. Cannot be used with a two-handed weapon. +2 to every saving throw. 15% less damage taken; Skill, Wall of Winter: Become Fortified for one round: take 25% less damage. Bonus action, once per fight.. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Stormcaller Ring | Accessory | Equip in the accessory slot. 25% more damage dealt; 5% less damage taken; Reward for the first bounty claimed in Briarwatch at level 70 or above. | Anyone | First bounty in briarwatch at 70+ |
| Glacier Heart | Accessory | Equip in the accessory slot: +1 AC. +2 to every saving throw. 15% less damage taken; Reward for the first bounty claimed in Highpass Watch at level 70 or above. | Anyone | First bounty in highpass at 70+ |
| Wayfarer's Compass | Accessory | Equip in the accessory slot. +3 Survival, +3 Perception, +3 Investigation, +3 Nature. | Anyone | Briarwatch, Highpass |
| Courtier's Mask | Accessory | Equip in the accessory slot. +3 Persuasion, +3 Deception, +3 Insight, +3 Performance. | Anyone | Briarwatch, Highpass |

### Level 80: 9 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Thunderbrand | Main hand | Strength, 1d10 slashing, +4 to hit, +8 damage. 5% more damage dealt; Skill, Thunderclap: Slow an enemy for two rounds: 2 less armour. Bonus action, once per fight.. | STR 13 | Briarwatch, Highpass |
| Ridgebreaker Maul | Main hand | Strength, 2d6 bludgeoning, +4 to hit, +7 damage. Two-handed. 10% more damage dealt; Skill, Rockfall: Make an enemy Vulnerable for one round: it takes 25% more damage. Bonus action, once per fight.. | STR 15 | Briarwatch, Highpass |
| Starling Knife | Main hand | Finesse, 1d8 piercing, +4 to hit, +8 damage. 10% more damage dealt; Skill, Flicker: Weaken an enemy for two rounds: it deals 25% less damage. Bonus action, once per fight.. | DEX 13 | Briarwatch, Highpass |
| Comet Longbow | Main hand | Dexterity, 1d8 piercing, +4 to hit, +8 damage. Two-handed ranged weapon. 5% more damage dealt; Skill, Falling Star: Set an enemy Burning for two rounds. Bonus action, once per fight.. | DEX 13 | Briarwatch, Highpass |
| Eclipse Staff | Main hand | Equip: +7 spell attack bonus and +6 spell save DC. 10% more damage dealt; Skill, Darken: Weaken an enemy for two rounds: it deals 25% less damage. Bonus action, once per fight.. | Wizard, Cleric, Bard | Briarwatch, Highpass |
| Bounty Hunter's Badge | Accessory | Equip in the accessory slot, +1 to hit with weapons. 15% more damage dealt; Reward for the first bounty claimed in Ashford Crossing at level 80 or above. | Anyone | First bounty in ashford at 80+ |
| Ironbark Amulet | Accessory | Equip in the accessory slot: +1 AC. +3 Athletics; +2 to every saving throw. 15% less damage taken; Reward for the first bounty claimed in Merrowgate at level 80 or above. | Anyone | First bounty in merrowgate at 80+ |
| Sage's Circlet | Accessory | Equip in the accessory slot. +3 Arcana, +3 History, +3 Religion, +3 Investigation. Reward for the first bounty claimed in Cinder Fold at level 80 or above. | Anyone | First bounty in cinderfold at 80+ |
| Stormglass Buckler | Off hand | Equip in your off hand for +6 Armor Class. Cannot be used with a two-handed weapon. +2 Constitution saves, +2 Wisdom saves. 15% less damage taken. | Wizard, Cleric, Bard | Briarwatch, Highpass |

### Level 90: 14 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Highbell Warhammer (Highbell Regalia set) | Main hand | Strength, 1d10 bludgeoning, +5 to hit, +8 damage. 10% more damage dealt; Skill, Toll: Make an enemy Vulnerable for one round: it takes 25% more damage. Bonus action, once per fight.. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Highbell Plate (Highbell Regalia set) | Armour | Base AC 25, no Dexterity bonus. -2 Stealth; +2 to every saving throw. 15% less damage taken. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Highbell Tower Shield (Highbell Regalia set) | Off hand | Equip in your off hand for +7 Armor Class. Cannot be used with a two-handed weapon. +1 to every saving throw. 15% less damage taken. | Fighter, Cleric · STR 13 | Briarwatch, Highpass |
| Nightbriar Blade (Nightbriar set) | Main hand | Finesse, 1d8 piercing, +5 to hit, +9 damage. 10% more damage dealt; Skill, Briar Snare: Slow an enemy for two rounds: 2 less armour. Bonus action, once per fight.. | Fighter, Rogue, Bard · DEX 13 | Briarwatch, Highpass |
| Nightbriar Leathers (Nightbriar set) | Armour | Base AC 18, full Dexterity bonus. +3 Stealth, +2 Acrobatics. 15% more damage dealt; 5% less damage taken. | Fighter, Rogue, Bard | Briarwatch, Highpass |
| Farwatch Greatbow (Farwatch set) | Main hand | Dexterity, 1d8 piercing, +5 to hit, +8 damage. Two-handed ranged weapon. 10% more damage dealt; Skill, Mark the Quarry: Make an enemy Vulnerable for one round: it takes 25% more damage. Bonus action, once per fight.. | Ranger, Rogue, Fighter · DEX 13 | Briarwatch, Highpass |
| Farwatch Mantle (Farwatch set) | Armour | Base AC 18, full Dexterity bonus. +2 Survival, +2 Perception. 10% more damage dealt; 5% less damage taken. | Ranger, Rogue, Fighter | Briarwatch, Highpass |
| Starward Staff (Starward set) | Main hand | Equip: +8 spell attack bonus and +7 spell save DC. 10% more damage dealt; Skill, Starfall: Set an enemy Burning for two rounds. Bonus action, once per fight.. | Wizard | Briarwatch, Highpass |
| Starward Robe (Starward set) | Armour | Base AC 18, full Dexterity bonus. +3 Arcana; +2 Intelligence saves, +1 Wisdom saves. 10% less damage taken. | Wizard | Briarwatch, Highpass |
| Dawnhearth Rod (Dawnhearth set) | Main hand | Equip: +7 spell attack bonus and +7 spell save DC. 10% more damage dealt; Skill, Dawnlight: Weaken an enemy for two rounds: it deals 25% less damage. Bonus action, once per fight.. | Cleric | Briarwatch, Highpass |
| Dawnhearth Hauberk (Dawnhearth set) | Armour | Base AC 20, up to +2 from Dexterity. +3 Medicine; +1 Wisdom saves, +1 Constitution saves. 15% less damage taken. | Cleric | Briarwatch, Highpass |
| Dawnhearth Aegis (Dawnhearth set) | Off hand | Equip in your off hand for +7 Armor Class. Cannot be used with a two-handed weapon. +2 Wisdom saves, +1 Constitution saves. 15% less damage taken. | Cleric | Briarwatch, Highpass |
| Grand Chorus Baton (The Grand Chorus set) | Main hand | Equip: +7 spell attack bonus and +7 spell save DC. 15% more damage dealt; Skill, Discord: Slow an enemy for two rounds: 2 less armour. Bonus action, once per fight.. | Bard | Briarwatch, Highpass |
| Grand Chorus Mantle (The Grand Chorus set) | Armour | Base AC 18, full Dexterity bonus. +3 Performance, +2 Persuasion. 10% more damage dealt; 5% less damage taken. | Bard | Briarwatch, Highpass |

### Level 100: 9 items

| Item | Slot | What it does | Who | Where |
|---|---|---|---|---|
| Highbell Seal (Highbell Regalia set) | Accessory | Equip in the accessory slot: +2 AC. +2 to every saving throw. 10% less damage taken. | Fighter, Cleric | Briarwatch, Highpass |
| Nightbriar Ring (Nightbriar set) | Accessory | Equip in the accessory slot. +3 Stealth, +3 Acrobatics. 25% more damage dealt. | Fighter, Rogue, Bard | Briarwatch, Highpass |
| Farwatch Horn (Farwatch set) | Accessory | Equip in the accessory slot. +3 Survival, +3 Perception. 25% more damage dealt. | Ranger, Rogue, Fighter | Briarwatch, Highpass |
| Starward Orrery (Starward set) | Accessory | Equip in the accessory slot. +3 Arcana, +3 History; +2 Intelligence saves. 15% more damage dealt. | Wizard | Briarwatch, Highpass |
| Dawnhearth Reliquary (Dawnhearth set) | Accessory | Equip in the accessory slot. +3 Religion, +3 Medicine; +2 Wisdom saves. 15% less damage taken. | Cleric | Briarwatch, Highpass |
| Grand Chorus Chime (The Grand Chorus set) | Accessory | Equip in the accessory slot. +3 Performance, +3 Persuasion, +3 Insight. 15% more damage dealt. | Bard | Briarwatch, Highpass |
| Kingsfall Greataxe | Main hand | Strength, 2d6 slashing, +5 to hit, +8 damage. Two-handed. 10% more damage dealt; Skill, Felling Blow: Make an enemy Vulnerable for two rounds: it takes 25% more damage. Bonus action, once per fight.. | STR 15 | Briarwatch, Highpass |
| Hundredfold Scale | Armour | Base AC 21, up to +2 from Dexterity. +1 Constitution saves, +1 Dexterity saves. 15% less damage taken. | Anyone | Briarwatch, Highpass |
| Hundredth Bell | Accessory | Equip in the accessory slot: +1 AC. 20% more damage dealt; 10% less damage taken; Reward for the first bounty claimed in Briarwatch at level 100 or above. | Anyone | First bounty in briarwatch at 100+ |

### The sets

| Set | Pieces | Bonuses |
|---|---|---|
| Bellwarden's Oath (Book Four) | Bellwarden Hammer (55), Bellwarden Plate (60), Bellwarden Shield (60), Bellwarden Seal (65) | 2: +1 AC<br>3: +1 to hit with weapons, +1 weapon damage<br>4: 5% more damage dealt, set skill Oathbell: Become Fortified for two rounds: take 25% less damage. Bonus action, once per fight |
| Thornstep (Book Four) | Thornstep Rapier (55), Thornstep Leathers (60), Thornstep Band (65) | 2: 5% more damage dealt<br>3: +1 to hit with weapons, set skill Thornstep Dance: Become Empowered for two rounds: deal 25% more damage. Bonus action, once per fight |
| The Long Watch (Book Four) | Long Watch Bow (55), Long Watch Coat (60), Long Watch Quiver (65) | 2: +1 to hit with weapons<br>3: 5% more damage dealt, set skill Watcher's Mark: Make an enemy Vulnerable for two rounds: it takes 25% more damage. Bonus action, once per fight |
| The Lamplit Scholar (Book Four) | Lamplit Staff (55), Lamplit Robe (60), Lamplit Lens (65) | 2: +1 spell save DC<br>3: +1 spell attack, set skill Footnote: Slow an enemy for two rounds: 2 less armour. Bonus action, once per fight |
| Hearthward (Book Four) | Hearthward Staff (55), Hearthward Mail (60), Hearthward Buckler (60), Hearthward Rosary (65) | 2: +1 AC<br>3: +1 spell save DC, +1 Wisdom saves, +1 Constitution saves<br>4: 5% more damage dealt, set skill Hearth and Home: Become Fortified for two rounds: take 25% less damage. Bonus action, once per fight |
| The Chorus (Book Four) | Chorus Baton (55), Chorus Coat (60), Chorus Bell (65) | 2: +2 Performance, +2 Persuasion<br>3: +1 spell save DC, set skill Swell: Become Empowered for two rounds: deal 25% more damage. Bonus action, once per fight |
| Highbell Regalia (Final) | Highbell Warhammer (90), Highbell Plate (90), Highbell Tower Shield (90), Highbell Seal (100) | 2: +1 AC, +1 to every saving throw<br>3: +1 to hit with weapons, +2 weapon damage<br>4: 10% more damage dealt, set skill Highbell Toll: Become Fortified for two rounds: take 25% less damage. Bonus action, once per fight |
| Nightbriar (Final) | Nightbriar Blade (90), Nightbriar Leathers (90), Nightbriar Ring (100) | 2: +1 to hit with weapons, 5% more damage dealt<br>3: +2 weapon damage, set skill Night Bloom: Become Empowered for two rounds: deal 25% more damage. Bonus action, once per fight |
| Farwatch (Final) | Farwatch Greatbow (90), Farwatch Mantle (90), Farwatch Horn (100) | 2: +1 to hit with weapons, 5% more damage dealt<br>3: +2 weapon damage, set skill Farwatch Volley: Become Empowered for two rounds: deal 25% more damage. Bonus action, once per fight |
| Starward (Final) | Starward Staff (90), Starward Robe (90), Starward Orrery (100) | 2: +1 spell save DC, 5% more damage dealt<br>3: +1 spell attack, +1 spell save DC, set skill Conjunction: Make an enemy Vulnerable for two rounds: it takes 25% more damage. Bonus action, once per fight |
| Dawnhearth (Final) | Dawnhearth Rod (90), Dawnhearth Hauberk (90), Dawnhearth Aegis (90), Dawnhearth Reliquary (100) | 2: +1 AC, +1 Wisdom saves, +1 Constitution saves<br>3: +1 spell attack, +1 spell save DC<br>4: 10% more damage dealt, set skill First Light: Become Fortified for two rounds: take 25% less damage. Bonus action, once per fight |
| The Grand Chorus (Final) | Grand Chorus Baton (90), Grand Chorus Mantle (90), Grand Chorus Chime (100) | 2: +1 spell save DC, +2 Performance, +2 Insight<br>3: +1 spell attack, 5% more damage dealt, set skill Crescendo: Become Empowered for two rounds: deal 25% more damage. Bonus action, once per fight |
