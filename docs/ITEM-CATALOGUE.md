# Item catalogue (21 November 2026)

Step 5 of the gameplay review plan. The equipment rules are in
[EQUIPMENT.md](EQUIPMENT.md); this is what uses them.

The game now has 68 pieces of equipment (87 items with potions and tools), up
from 30. The 38 new ones are in `src/data/gear.json`.

## Where items come from

- **Shops.** Each town sells gear for the levels its chapters are written for:
  Briarwatch (levels 1-5), Ashford (4-9), Highpass (6-10), Merrowgate (11-14),
  Cinder Fold (15-19), and in Book Three Saltwick (20-23) and Vell (23-26).
- **Region exclusives.** One or two items per town are sold nowhere else. The
  card says "Only sold in …".
- **Chapter rewards.** Eleven chapters give their own item when finished, once
  per save. They are never sold.
- **Bounty rewards.** The first bounty claimed in Briarwatch, Ashford,
  Highpass, Merrowgate and Cinder Fold gives that town's bounty item.
- **AI adventures.** Finishing an AI adventure gives one item made from a
  template (blade, bow, focus, mail or charm) at the adventure's level. The
  storyteller never sets the numbers: a save keeps only the template, level,
  where it was found and an id made from those, and the item is rebuilt on
  load. An edited record no longer matches its id and is dropped, and on a
  shared server one player's found items never appear in another's game.
  Bonuses stop at +2 to hit, +3 damage, +2 spell attack and DC, AC 15 armour
  and +3 to a skill, however high the level.

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
| Watch-captain's Brigandine | Armour | Rare | 170 | Level 8 · Fighter or Cleric or Ranger · Strength 13 | Highpass Watch |
| Warded Tome | Main hand | Rare | 175 | Level 8 · Wizard | Highpass Watch |
| Harbour Cutlass | Main hand | Rare | 210 | Level 11 · Dexterity 13 | Merrowgate only |
| Lantern-works Goggles | Accessory | Rare | 200 | Level 11 | Merrowgate |
| Tidecaller Staff | Main hand | Rare | 230 | Level 12 · Wizard or Cleric or Bard | Merrowgate |
| Sallows Shadowcoat | Armour | Epic | 320 | Level 12 · Rogue or Ranger or Bard · Dexterity 14 | Merrowgate |
| Forgeheart Maul | Main hand | Epic | 380 | Level 15 · Strength 15 | Cinder Fold only |
| Slag Plate | Armour | Epic | 420 | Level 16 · Fighter or Cleric · Strength 15 | Cinder Fold |
| Bellwright's Chime | Accessory | Epic | 360 | Level 15 · Cleric or Bard | Cinder Fold |
| Emberward Shield | Off hand | Epic | 350 | Level 15 · Strength 13 | Cinder Fold |
| Saltwick Harpoon | Main hand | Epic | 460 | Level 20 · Strength 15 | Saltwick only |
| Roofrunner Boots | Accessory | Epic | 440 | Level 20 · Dexterity 15 | Saltwick |
| Commandery Halberd | Main hand | Legendary | 620 | Level 23 · Fighter · Strength 16 | Vell only |
| Vell Casting-mail | Armour | Legendary | 700 | Level 24 · Strength 16 | Vell |
| Drillmaster's Baton | Accessory | Legendary | 650 | Level 23 | Vell |
| Roadwarden's Badge | Accessory | Uncommon | 60 | None | Chapter: road |
| Fenmere Reed-pipe | Accessory | Uncommon | 65 | None | Chapter: marsh |
| Drowned Codex | Main hand | Rare | 130 | Wizard or Cleric or Bard | Chapter: archive |
| Glasswind Cloak | Accessory | Rare | 150 | Level 7 | Chapter: summit |
| Beacon-shard Blade | Main hand | Rare | 170 | Level 9 | Chapter: beacon |
| Echo-court Ring | Accessory | Rare | 180 | Level 10 | Chapter: trial |
| Lantern-works Lamp | Accessory | Rare | 210 | Level 13 | Chapter: harbour |
| First-forge Hammer | Main hand | Epic | 360 | Level 16 · Strength 13 | Chapter: cinderfold |
| Motherbell Fragment | Accessory | Epic | 380 | Level 18 | Chapter: motherbell |
| Oathkeeper's Mantle | Accessory | Legendary | 520 | Level 19 | Chapter: oath |
| Commandery Seal | Accessory | Legendary | 600 | Level 24 | Chapter: b3-vell |
| Bounty-hunter's Cord | Accessory | Uncommon | 55 | None | First bounty, Briarwatch |
| Toll-bridge Buckler | Off hand | Uncommon | 70 | Strength 11 | First bounty, Ashford Crossing |
| Ridge-stalker's Hood | Accessory | Rare | 140 | Level 6 · Dexterity 13 | First bounty, Highpass Watch |
| Wrecker's Gaff | Main hand | Rare | 200 | Level 11 | First bounty, Merrowgate |
| Slagcaller Gauntlets | Accessory | Epic | 340 | Level 15 · Strength 13 | First bounty, Cinder Fold |
