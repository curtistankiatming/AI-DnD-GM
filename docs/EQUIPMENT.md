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

## Gear by level: which book it waits for

A town's `stockByLevel` lists (`src/data/towns.json`) and its level bounties
(`bounty:<town>:<level>` in `src/data/gear.json`) open by the hero's level,
and each waits for the book whose levels it belongs to (`Book.gearOpen` in
`src/book.js`), so a hero who levels past a book another way never sees its
gear early:

- **Every level** waits until this save has begun Book Three (finished one of
  its chapters). Levels 20 to 40 are Book Three's.
- **Levels 41 to 70** are Book Four's. While this save can read Book Four
  (released, and open to this session: `Book.reads(state, 4)`), they also wait
  until it has begun Book Four. A save that cannot read it (Book Four hidden,
  or not on a free hosted account) keeps Book Three's rule, so its gear still
  opens by level. That includes AI-story saves that will never begin Book Four.
- **Above 70** the Book Three rule applies again, whether or not Book Four
  has begun.

### Where levels 45 to 70 are sold (Book Four, build step 6)

Each tier is sold where Book Four's story is when the hero reaches its level,
so nobody has to go back for it (tests/book-four-wold.test.js plays the route):

| Tier | Sold in | Why |
|---|---|---|
| 45 | Highpass | Chapter 5 ends there at 45; chapter 6 leaves from it. |
| 50 | Highpass, Lantry, Orme | Chapter 10 ends at Highpass at 50, and chapter 11 leaves from it before Lantry opens. |
| 50, warm | Lantry, Orme | Lantry opens when chapter 11 is done, at 51. |
| 55 (sets' weapons), 55 warm | Orme | Chapters 13 to 19 leave from Orme (52 to 59). |
| 60 (sets' armour and shields) | Highpass | Chapter 20 returns the party to Highpass at 60. |
| 65 (sets' accessories) | Merrowgate, Cinder Fold | Chapter 26 (65) and 27 to 30 (66 to 69). |
| 70 | Briarwatch | The epilogue and the 4th job trial. |
| 80 to 100 | Briarwatch, Highpass | Beyond the books. |

Lantry and Orme (`towns.json`, `book: 4`) are closed until a Book Four chapter
that names them is playable for this save, as Book Three's Saltwick and Vell
were. While they are closed to a save (Part Two not out, Book Four hidden or
unpaid), or the save's gear does not wait for Book Four (`Book.ownsGear`: an
AI story that will never begin it), Highpass, the town they are reached from
(`from`), sells their level stock as well, so every tier can still be bought.
Warm gear is the exception: it is sold only in Lantry and Orme. A shop drops
any entry it no longer sells (`ensureStock`), so stand-in stock goes once the
save can reach the Wold. (With only Part One out, a hero who finished it waits
at level 50: bounties and AI XP stop just under 51.)


Common, Uncommon, Rare, Epic and Legendary. Shown on item cards and in shops.

## Special stats

`stats: { dealt, taken }`: a share of damage dealt or taken, such as 10% more
damage dealt or 10% less damage taken. They add to the buffs and debuffs of
`src/power.js`. All worn pieces together take off at most 30% of damage taken
(`MAX_GEAR_TAKEN` in `src/equipment.js`).

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

## Warm gear and the white (Book Four, Part Two)

`warm: true` marks Wold-made white wool. Every Part Two chapter has
`white: true`: when its deciding fight starts, each party member who wears no
warm item is Slowed (2 less armour) until the start of their second turn, and
the fight says who and why at the top. Bounties, practice and AI adventures
never have it, and bells do not count. Warm items are ordinary tier pieces
with the tag, each as strong as the best normal piece of its kind at its
level, so warmth never costs a slot's worth of power. Their cards say "Warm:
in the Wold's white, the wearer is not Slowed at the start of a deciding fight."

| Item | Level | Slot | Who | Sold in |
|---|---|---|---|---|
| White-wool Plate | 50 | Armour, heavy (AC 23, 15% less damage taken, +1 to every save, +2 Strength and Constitution saves) | Fighter, Cleric · Strength 13 | Lantry, Orme |
| Fleece-lined Scale | 50 | Armour, medium (AC 19 + 2, 10% less damage taken, +1 Constitution and Wisdom saves) | Anyone | Lantry, Orme |
| White-wool Jerkin | 50 | Armour, light (AC 17 + Dex, 10% more damage dealt, 5% less taken, +2 Survival) | Anyone | Lantry, Orme |
| Door-chalk Mittens | 50 | Accessory (+3 Survival, Insight, History, Investigation; 5% more damage dealt) | Anyone | Lantry, Orme |
| Long Hall Muffler | 55 | Accessory (20% more damage dealt, 5% less taken; Into the Wind: Fortified 1 round; Survival story ability) | Anyone | Orme |
| Orme Hearthstone | 55 | Accessory (+1 AC, +1 to every save and +2 Wisdom, 15% less damage taken) | Anyone | Orme |

So every class and companion can be warm at each tier from 50 to 59, by
armour weight or by accessory. They sit inside PR #86's caps
(`MAX_GEAR_DEALT` 0.5, `MAX_GEAR_TAKEN` -0.3) and its curve and dominance tests.
The design makes the chapter rewards for chapters 11, 15 and 18 warm as well (not written yet).

## Masterwork

The smith refines an Epic or Legendary item once for twice its price;
see [ITEM-CATALOGUE.md](ITEM-CATALOGUE.md#masterwork-what-late-gold-is-for).

## Equipment sets (22 November 2026)

Each class has its own sets, which only that class can wear. A set piece names its set in `set` (src/data/gear.json); the sets are in
src/data/gear-sets.json. Wearing 2 or more different pieces of a set gives every
bonus of that set whose piece count is reached (src/gear.js `setBonuses`). A
bonus uses the item fields (`acBonus`, `attackBonus`, `damageBonus`,
`spellAttackBonus`, `spellDcBonus`, `saveBonuses`, `skillBonuses`, `stats`,
`skill`), and is added in `derive` like a worn item. The full set's `skill` is a
bonus action once per fight, with the id `gear:set-<set id>`. Gear, sets
included, takes off at most 30% of damage taken and adds at most 50% to damage
dealt (`MAX_GEAR_TAKEN`, `MAX_GEAR_DEALT` in src/equipment.js). Item cards show a
set line with each bonus, and the equipment screen shows the sets the hero wears
and the next bonus. The list is in
[ITEM-CATALOGUE.md](ITEM-CATALOGUE.md#gear-for-levels-45-to-100-22-november-2026).

