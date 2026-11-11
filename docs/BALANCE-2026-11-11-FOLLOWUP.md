# Job balance follow-up, 11 November 2026

Follow-up to [BALANCE-2026-11-11.md](BALANCE-2026-11-11.md), asked for by Curtis
after that report: even out the casters, give the Pathfinder direct damage and
pull the clerics back. Simulated battles only; not natural or browser play.

## Method

Same simulator, matrix and seeds as the first report (`npm run balance`,
8 seeds, 3,888 battles per run with jobs). Both hero play styles were run:
skills in the order learnt (default) and newest skill first (`--policy newest`).
"Before" is master at `174cc46` (the first balance pass); "after" is this branch.
Runtime: Node v22.23.4, Linux, no AI or network calls.

## What was wrong

- **The swing between play styles** came from the original specialization
  skills (the ones first written for level 10: Sever the Binding, Unravel,
  Arcane Nova, Aegis Line and others). Their dice and amounts never grew, so at
  level 60 a 4d6 skill was far weaker than the branch's later skills. A hero who
  spent Advancement on them first lost most Heroic battles; one who used the
  newest skill first won almost all of them.
- **Time Stop** stopped every enemy's next action with no save.
- **Pathfinder** control skills (Ambush Ground, Lead Astray, Hidden Route) dealt
  no damage, so the branch only won by finishing the objective.

## What changed

- The original specialization skills that deal damage, heal or grant temporary
  HP now multiply their dice and amounts with level: x1 to 19, x2 from 20, x3
  from 80. Their description says so. Weapon-attack skills and Pack Instinct do
  not scale (weapons already grow).
- Time Stop: every enemy makes a Wisdom save; on a failure it takes force damage
  and loses its next action, on a success half damage.
- Pathfinder: Ambush Ground and Hidden Route hit every enemy without a roll;
  Lead Astray now affects every enemy with damage on a failed save (half on a
  success).
- Casters: Bound Familiar and Word of Unmaking hit harder; Thunderclap, Meteor,
  Song of Unmaking, Chain Reaction, Tripwire Net and Controlled Blast hit a
  little less, so the newest skills no longer dwarf the early ones.
- Clerics: Divine Aegis heals a sixth of the level instead of a quarter;
  Lifewarden healing passives are +2 each (were +3, +3, +4); Battle Priest's
  Spirit Weapon scales more slowly, Templar's Mail gives +1 to saves instead of
  +1 AC, Hallowed Champion no longer adds +1 to attack, and Champion's Might and
  Champion's Faith give less.

## Results: win rate, Normal / Hard / Heroic

| Class | Branch | Before: in order learnt | Before: newest first | After: in order learnt | After: newest first |
| --- | --- | --- | --- | --- | --- |
| Fighter | guardian | 99 / 89 / 78 | 100 / 93 / 86 | 97 / 90 / 78 | 100 / 93 / 86 |
| Fighter | duelist | 100 / 97 / 89 | 99 / 99 / 90 | 100 / 97 / 89 | 99 / 99 / 90 |
| Fighter | warlord | 100 / 93 / 76 | 97 / 90 / 65 | 100 / 93 / 76 | 97 / 90 / 65 |
| Rogue | shadow | 100 / 97 / 92 | 100 / 100 / 99 | 100 / 99 / 99 | 100 / 100 / 99 |
| Rogue | saboteur | 83 / 67 / 51 | 99 / 99 / 99 | 94 / 83 / 75 | 99 / 99 / 99 |
| Rogue | grifter | 97 / 94 / 89 | 100 / 96 / 89 | 97 / 94 / 89 | 100 / 96 / 89 |
| Wizard | evoker | 88 / 56 / 39 | 97 / 92 / 86 | 100 / 100 / 97 | 99 / 96 / 96 |
| Wizard | chronist | 93 / 79 / 72 | 94 / 76 / 63 | 92 / 86 / 76 | 93 / 76 / 63 |
| Wizard | binder | 89 / 76 / 46 | 99 / 92 / 82 | 100 / 94 / 83 | 99 / 94 / 82 |
| Cleric | lifewarden | 100 / 99 / 89 | 100 / 100 / 93 | 100 / 94 / 88 | 100 / 99 / 97 |
| Cleric | exorcist | 90 / 75 / 58 | 100 / 100 / 96 | 100 / 92 / 75 | 100 / 100 / 97 |
| Cleric | battlepriest | 100 / 100 / 100 | 100 / 100 / 97 | 100 / 100 / 99 | 100 / 100 / 96 |
| Ranger | beastwarden | 100 / 100 / 97 | 96 / 86 / 71 | 100 / 100 / 97 | 96 / 86 / 71 |
| Ranger | deadeye | 99 / 94 / 89 | 93 / 81 / 75 | 99 / 94 / 89 | 93 / 81 / 75 |
| Ranger | pathfinder | 100 / 99 / 94 | 58 / 28 / 19 | 100 / 99 / 94 | 96 / 89 / 81 |
| Bard | lorekeeper | 79 / 61 / 26 | 97 / 93 / 88 | 97 / 92 / 65 | 99 / 96 / 90 |
| Bard | battlecantor | 93 / 79 / 74 | 93 / 76 / 60 | 97 / 90 / 75 | 93 / 79 / 60 |
| Bard | envoy | 90 / 83 / 78 | 93 / 75 / 65 | 90 / 83 / 78 | 93 / 75 / 65 |

## Reading the results

- **Casters:** the Heroic gap between the two play styles fell from 47 to 1
  point for the Evoker, 36 to 1 for the Binder, 62 to 25 for the Lorekeeper,
  38 to 22 for the Exorcist and 48 to 24 for the Saboteur.
- **Pathfinder:** played newest-skill-first it now wins 81% of Heroic battles
  (was 19%); played the other way it is unchanged.
- **Clerics were not pulled back.** The trims barely moved them: the Battle
  Priest still wins 96 to 99% of Heroic battles. A further test that removed
  Spirit Weapon's mark changed nothing and was not kept. Their strength comes
  from the cleric's own 1st-job skills (Radiant Burst and Divine Aegis on the
  Technique resource, used almost every turn), which every cleric branch has.
  Pulling clerics back further means changing those, which also weakens the
  Exorcist.
- Evoker and Shadow now sit at the top with the clerics (96 to 99% Heroic).
- Fighters, Grifter, Beastwarden, Deadeye and Envoy are unchanged.

## Limitations

As in the first report: eight seeds per cell, simple policies, only the
AI-adventure battle, no renown boons. Single cells can move 10 to 15 points.
