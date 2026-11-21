# Items and equipment review (21 November 2026)

An independent review of the equipment rules (PR #68, [EQUIPMENT.md](../EQUIPMENT.md))
and the item catalogue (PR #70, [ITEM-CATALOGUE.md](../ITEM-CATALOGUE.md)),
checked against Curtis's ask of 21 November:

> There should be equipment variations, so we should create a bunch of them,
> alongside event/quest/region exclusive equipments, special equipments give
> special stat combinations, and sometimes skills to help the story
> progression. Each equipment has minimum level, class and stat requirements.
> So not everyone can equip anything.

## Verdict

The rules meet the ask: level, class and ability requirements, rarity,
special stats, combat skills, story abilities, town, chapter and bounty
exclusives, and AI items the storyteller can't inflate. The catalogue had one
real hole, fixed here: **only Strength fighters kept finding better weapons
after level 12.**

## What was checked

| Ask | Before this review | Now |
|---|---|---|
| Many variations | 68 pieces of equipment | 80 |
| Event, quest and region exclusives | 7 town, 11 chapter, 5 first-bounty | 11 town (4 more in Vell) |
| Special stat combinations | damage dealt and taken, saves, skills | unchanged |
| Skills that help the story | advantage on the first check with a skill after each long rest | unchanged, now shown on the card |
| Level, class and stat requirements | on 41 items | on 53 items |
| Prices | rise with rarity and level, tested | unchanged |

## Findings

### 1. Gear stopped at level 7 to 12 for everyone but Strength fighters (fixed)

The best item of each kind, by the level it needs:

| Kind | Before | After |
|---|---|---|
| Strength weapon | 23 (Commandery Halberd) | 23 |
| Heavy armour | 24 (Vell Armoury Mail) | 24 |
| Finesse weapon (rogue, bard) | 11 (Harbour Cutlass) | 24 (Vell Duelling Sword) |
| Bow (ranger, Nessa) | 7 (Glasswind Bow) | 23 (Commandery Longbow) |
| Spell focus (wizard, cleric, bard, Maren) | 12 (Tidecaller Staff) | 24 (Chancery Rod; 21 for clerics) |
| Light armour (rogue, ranger, bard) | 12 (Sallows Shadowcoat) | 24 (Vell Courier Leathers) |
| Armour a caster with low Strength can wear | 4 (Marsh Leather) | 15 (Ward-thread Robe) |

Twelve new items, sold where those levels are played:

| Item | Slot | Rarity | Gold | Requires | Where |
|---|---|---|---|---|---|
| Cinderglass Longbow | Main hand | Epic | 380 | Level 15 · Dexterity 14 | Cinder Fold |
| Smoke-glass Rapier | Main hand | Epic | 390 | Level 16 · Dexterity 14 | Cinder Fold |
| Bellmetal Rod | Main hand (focus) | Epic | 400 | Level 16 · Wizard, Cleric or Bard | Cinder Fold |
| Ward-thread Robe | Armour | Epic | 360 | Level 15 · Wizard, Cleric or Bard | Cinder Fold |
| Plankwalker Sabre | Main hand | Epic | 480 | Level 20 · Dexterity 15 | Saltwick |
| Mistwatch Bow | Main hand | Epic | 470 | Level 20 · Dexterity 15 | Saltwick |
| Saltwick Oilskin | Armour | Epic | 460 | Level 20 · Rogue, Ranger or Bard · Dexterity 15 | Saltwick |
| Lamplighter's Staff | Main hand (focus) | Epic | 480 | Level 21 · Wizard, Cleric or Bard | Saltwick |
| Commandery Longbow | Main hand | Legendary | 640 | Level 23 · Dexterity 15 | Vell only |
| Vell Duelling Sword | Main hand | Legendary | 660 | Level 24 · Dexterity 15 | Vell only |
| Chancery Rod | Main hand (focus) | Legendary | 680 | Level 24 · Wizard or Bard | Vell only |
| Vell Courier Leathers | Armour | Legendary | 680 | Level 24 · Rogue, Ranger or Bard · Dexterity 15 | Vell only |

Their numbers stay inside the bounds the catalogue already set: at most +2
to hit and +3 damage (as the Saltwick Harpoon), +3 spell attack and DC, 10%
more damage dealt and 10% less taken. Casters gain +1 DC and the damage share
over the Tidecaller Staff, not a bigger spell attack, since clerics are
already the strongest class. For the same reason the Legendary Chancery Rod
is for wizards and bards only. Vell's four are marked "Only sold in Vell", because Vell's
shop closes when the city is evacuated.

### 2. Fine items could look less rare than their base (fixed)

Every smith upgrade was labelled Uncommon, so Fine Field Plate (Uncommon) sat
below Field Plate (Rare). A Fine item now keeps its base rarity, and is at
least Uncommon. Prices and numbers don't change.

### 3. No story charge was shown anywhere (fixed)

The Thornward Cloak's text said its charge was on the character sheet, but no
screen showed it, and no other story item showed one either. Every item card
with a story ability now ends with "Story ability ready." or "Story ability
used; ready again after a long rest."

### 4. Found items at different levels shared names (fixed)

An AI item's name came from a hash, so two items of one template (such as two
Rimecut Blades) often had the same name, and typed "equip rimecut blade"
picked one at random. Names now step with the level, so one template repeats
a name only 16 levels apart for bows and 24 for the rest. When two owned
items still share a name, typed commands pick one the hero can wear, then the
higher level. Found items are rebuilt from their template and level on load,
so old saves just show the new names.

### 5. Does gold matter? Yes, through Book Three Part One

A buyer who gets the best item they can wear in every slot at each town:

| Reached | Chapter gold on arrival | Hero's kit | Whole party's kit |
|---|---|---|---|
| Merrowgate (first chapter there, level 13) | 2,655 | 965 to 1,295 | 3,715 to 4,045 |
| Saltwick (level 23) | 7,355 | 1,735 to 2,835 | 8,475 to 9,575 |
| Vell (levels 24 to 29) | 7,935 on arrival, 11,835 by its last chapter | 2,845 to 4,825 | 14,195 to 16,175 |

The kit columns add up everything bought from Briarwatch on, for each class.
(Chapter gold only. Bounties, side jobs, AI adventures and selling add more.)
Gold buys the hero's gear with some to spare, but not the whole party's, so
the player has to choose who gets what. No price change is needed.

## Left for later

- **Levels 25 to 40 have no new gear.** Book Three Part Two (chapters 11 to
  20, levels 30 to 40) isn't written yet. Its towns should get shop gear and
  chapter rewards when it is, or gold piles up with nothing to buy. AI items
  stop getting better at about level 24 too (their bounds are fixed).
- **No item opens a story choice.** Story abilities give advantage on checks,
  which helps, but no written scene has a choice that an item unlocks.
  That is story work, for a book thread.
- **Companions can't raise their ability scores**, so Maren (Strength 10)
  can't wear the Watch-captain's Brigandine (Strength 11). The Ward-thread
  Robe is her armour from level 15.
