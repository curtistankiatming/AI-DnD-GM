# Item catalogue (21 November 2026)

Step 5 of the gameplay review plan. The equipment rules are in
[EQUIPMENT.md](EQUIPMENT.md); this is what uses them.

The game now has 80 pieces of equipment (99 items with potions and tools), up
from 30. The 50 new ones are in `src/data/gear.json`. Twelve of them came from
the items review ([report](reviews/claude-items-2026-11-21.md)), so archers,
finesse fighters and casters keep finding better gear up to level 24.

## Where items come from

- **Shops.** Each town sells gear for the levels its chapters are written for:
  Briarwatch (levels 1-5), Ashford (4-9), Highpass (6-10), Merrowgate (11-14),
  Cinder Fold (15-19), and in Book Three Saltwick (20-23) and Vell (23-26).
  Vell's shop closes for good when the city is evacuated late in Book Three,
  so its exclusives can be missed.
- **Region exclusives.** One or two items per town are sold nowhere else. The
  card says "Only sold in …".
- **Chapter rewards.** Eleven chapters give their own item when finished, once
  per save. They are never sold, and each can be worn from two levels below
  its chapter, so a hero who skipped side content can still use it.
- **Bounty rewards.** The first bounty claimed in Briarwatch, Ashford,
  Highpass, Merrowgate and Cinder Fold gives that town's bounty item.
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
