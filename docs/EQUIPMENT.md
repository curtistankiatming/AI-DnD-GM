# Equipment rules (21 November 2026)

Step 4 of the gameplay review plan. Curtis asked for many equipment items with
requirements. This is the system; step 5 adds the full catalogue.

Every rule below is an optional field on an item, so older items work as
before. The code is in `src/gear.js`; the items are in `src/data/gear.json`.

## Requirements: who may wear it

`requires: { level, classes, abilities }`

- **Level:** the wearer's level must be at least this.
- **Classes:** the wearer's class must be one of these. Companions count as the
  class nearest their role: Orin a Fighter, Maren a Cleric, Nessa a Ranger.
- **Abilities:** each listed score must be at least this, such as Strength 13.

The item card ends with "Requires: Level 8 · Strength 13." When you choose who
wears an item, anyone who can't is greyed out with the reason, for example
"Needs level 8 (you are 5) and Strength 13 (you have 10)." or "Only a
Fighter or Cleric can use this." Trying anyway changes
nothing and says why.

Requirements are checked only when an item is put on. **An old save keeps
everything its party already wears**, even if the wearer no longer qualifies.

Two older items gained a requirement: Field Plate and the Greatsword need
Strength 13, and so do their Fine versions from the smith. That leaves them to
Fighters, Clerics and Orin unless the hero raises Strength. Companions'
ability scores don't change, so Maren (Strength 10) and Nessa (Strength 9)
can't wear the heaviest gear.

## Rarity

Common, Uncommon, Rare, Epic and Legendary. Shown on item cards and in shops.

## Special stats

`stats: { dealt, taken }`: a share of damage dealt or taken, such as 10% more
damage dealt or 10% less damage taken. They add to the buffs and debuffs of
`src/power.js`.

## Item skills

`skill: { name, effect, target, rounds, text }`: a bonus action once per fight
that puts one of the existing buffs or debuffs (Burning, Slowed, Vulnerable,
Weakened, Empowered, Fortified) on an enemy or the wearer. The hero gets it as
a combat button. A companion wearing it uses it once their bonus action is free (after
Healing Word or Second Wind), on the healthiest enemy it can affect. Kindle
is never wasted on an enemy that resists fire.

## Story abilities

`story: { skill }`: advantage on the first check with that skill after each
long rest, for whoever wears it and rolls. Uses are counted per item for the
whole party, so handing the item to someone else doesn't give a second use;
a second copy does. The Thornward Cloak now uses this rule, and old saves keep
its spent or ready state. The item's card says whether its story ability is ready or used
until the next long rest.

## The first seven items

| Item | Slot | Rarity | Requires | Special |
|---|---|---|---|---|
| Mirefang Dagger | Main hand | Uncommon | Dexterity 13 | Hamstring: Slowed, 2 rounds |
| Veilstep Cloak | Accessory | Uncommon | Rogue, Ranger or Bard | +1 AC; Stealth story ability |
| Hexwood Rod | Main hand (focus) | Rare | Level 4; Wizard, Bard or Cleric | +2 spell attack and DC; Unravel: Vulnerable |
| Bulwark Shield | Off hand | Rare | Fighter or Cleric; Strength 13 | +3 AC; Brace: Fortified |
| Ember Brand | Main hand | Rare | Level 8; Strength 13 | +1 to hit, +2 damage; Kindle: Burning, 2 rounds |
| Warden's Signet | Accessory | Rare | Level 10 | 10% more damage dealt; Insight story ability |
| Oathbound Mail | Armour | Epic | Level 15; Strength 15 | AC 19; 10% less damage taken |

They are sold in Briarwatch (dagger, cloak), Ashford (rod, shield), Highpass
(brand, signet) and Cinder Fold (mail, brand).
