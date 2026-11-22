# Book Three gear review (22 November 2026)

An independent review of the 105 Book Three items for levels 20 to 40 (PR #69),
Masterwork refining (PR #75) and the 30% cap on damage taken, against Curtis's
item spec, [EQUIPMENT.md](../EQUIPMENT.md) and
[ITEM-CATALOGUE.md](../ITEM-CATALOGUE.md).

Curtis's spec (21 November): many equipment variations; event, quest and
region exclusives; special items with special stat combinations and sometimes
skills that help the story; every item has a minimum level, class and stat
requirements, so not everyone can equip everything.

## Verdict

The gear is in good shape. Variety, exclusives, the power curve and gold all
hold up through level 40. One real gap: from level 35 the shop the story
stops in (Briarwatch, chapter 16) had no shield, no Strength 13 plate, no
two-handed weapon and no social accessory, because those were sold only in
towns Part Two has already left. That is fixed here. Two design points are
left as questions (below).

## What was checked

- **Variety.** Items needing level 18 or more: 119 (the 105 plus the items
  review's Saltwick and Vell gear): 47 main hand, 44 accessories, 21 armours,
  7 shields. 61 have a combat skill (all six buffs and debuffs are used), 31 a
  story ability. Every class, every 2nd job branch and every companion has
  its own kind of upgrade at every tier (the existing tests).
- **Exclusives.** 19 are sold in one town only, 20 are chapter rewards (every
  Book Three chapter gives one, wearable two levels below the chapter: checked
  for all 20), 7 are bounty rewards. All skill, story and skill-bonus ids are
  valid, every Epic and Legendary item has a Masterwork version, and no two
  items share a name.
- **Power curve.** The numbers match the catalogue's tier table, and the
  existing test that no Book Three item is matched or beaten by an earlier one
  passes. A Masterwork refine adds what one tier adds, for twice the price, so
  it carries an item to the next tier rather than skipping one. Tier 40 opens
  only when the hero reaches 40, which is after the last chapter (level 39):
  it is gear for after the book.
- **The 30% cap.** `derive` caps gear at 30% less damage taken, and it is
  right (`Math.max` of two negative shares). From tier 35 a heavy armour and
  shield already reach 30%, so a damage-taken charm adds only its AC and saves
  for a tank. Item cards did not say this.
- **Gold.** Three full campaigns (fighter, wizard, rogue; the test player
  policy, which buys almost no Book Three gear) reach level 20 with about
  6,300 to 6,600 gold and earn about 14,000 more by level 40. One tier's kit
  for the hero costs about 2,000 to 2,900, for the whole party about 7,000 or
  more, and a Masterwork refine of late gear 1,400 to 1,480 each. Across four
  tiers that is two or more times what a player earns, so gold stays a choice
  through level 40. No change.

## Fixed in this PR

1. **Tier 35 kit on the story's route (major).** Part Two visits Highpass at
   level 34 and Cinder Fold at 31, and from 35 the only shop before the stair
   is Briarwatch. The Frost-edge Knife, Ninefold Greathammer, Hearth-bell
   Shield, Winter-watch Plate and Council Envoy's Chain were sold only in
   Highpass or Cinder Fold "from 35", so a player who doesn't go back found no
   tier 35 shield, Strength 13 plate (Clerics, Battle Priests, Guardians), two-
   handed weapon (Duelists, Warlords) or social accessory (Grifters, Envoys),
   and Orin had no shield. Briarwatch now sells them too, as it already does
   for tier 25. The Highpass-only Margin-noted Grammar and Cinder Fold-only
   Hearth-bell Charm stay exclusives. A new test checks every class, branch
   and companion against only the towns the story stops in at each tier.
2. **The cap on item cards (minor).** Every card that cuts damage taken now
   says "(all worn gear together takes off at most 30%)".
3. **Catalogue (docs).** Three armours' tables left out their +1 saving throw
   (Old Wall Mail, Roof-council Coat, Wardsmith's Scale).

## Questions (for two independent reviewers while Curtis is away)

1. **Requirements on accessories and light armour.** 53 of the 119 late items
   need only a level: all 44 accessories but three, and 12 light and medium
   armours. The spec says each item has level, class and stat requirements. The
   earlier catalogue made the same choice for accessories. Keep it, or add
   class or stat requirements?
2. **Maren's shield.** Every shield after the Steel Shield needs Strength 13
   and Maren has 10, so she wears a Steel Shield (Fine, +3) to level 40 while
   her other kit improves. Keep it, or add a shield she can wear?

## The reviewers' answers

Two independent reviewers both approved the PR. One of them confirmed that the
new route test fails on master's `towns.json` (11 gaps at tier 35) and passes
here. They agreed on both questions:

1. **Keep as is.** The approved levels 1 to 20 catalogue made the same choice.
   Weapons, shields and heavy armour still have class and stat requirements,
   so "not everyone can equip anything" holds. Adding requirements to 53
   items now would be a wide balance change.
2. **Keep for now.** A shield Maren can wear is a fair follow-up, but it needs
   its own Masterwork version, catalogue rows and tests. It is left for
   Curtis to decide.
