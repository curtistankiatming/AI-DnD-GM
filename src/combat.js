"use strict";
// Tactical combat: initiative, attacks, class actions, companions, enemies and
// the combat view. Story transitions are reached through the engine.
const { ABILITIES, SKILLS, ITEMS, CLASSES, ENEMIES, ENCOUNTERS } = require("./content");
const { clamp, deepClone, abilityModifier, proficiencyBonus, rollFormula, rollD20, actorSkillBonus, actorAbilityBonus, formatSigned } = require("./rules");
const P = require("./progression");
const G = require("./equipment");
const W = require("./world");
const Director = require("./director");
const XP = require("./xp");
const { nowIso, normalizeId, titleCase, addItem, hasItem, consumeItemUse, playerAttackProfile, pushLog, recordHistory, findCompanion, successProbability, awardXp, invalidResult } = require("./engine-core");
const Engine = require("./engine");
const enterNode = (...args) => Engine.enterNode(...args);
const extensionApi = (...args) => Engine.extensionApi(...args);

function entityById(state, id) {
  if (id === "player") return state.player;
  return findCompanion(state, id);
}

function combatActorFromPlayer(player) {
  return {
    id: "player",
    refId: "player",
    team: "party",
    kind: "player",
    name: player.name,
    classId: player.classId,
    level: player.level,
    hp: player.hp,
    maxHp: player.maxHp,
    ac: player.ac,
    abilities: deepClone(player.abilities),
    skills: deepClone(player.skills),
    expertise: deepClone(player.expertise),
    savingThrows: deepClone(player.savingThrows),
    skillBonuses: deepClone(player.skillBonuses),
    saveBonuses: deepClone(player.saveBonuses),
    resources: deepClone(player.resources),
    conditions: deepClone(player.conditions || []),
    deathSaves: deepClone(player.deathSaves),
    used: deepClone(player.used || {}),
    attack: playerAttackProfile(player),
    temporaryHp: Number(player.temporaryHp||0),
    gearSpellAttack: player.gearSpellAttack||0,
    gearSpellDc: player.gearSpellDc||0,
    progression: deepClone(player.progression||{}),
    initiative: 0,
    actionUsed: false,
    bonusUsed: false,
    reactionUsed: false
  };
}

function combatActorFromCompanion(member) {
  return {
    id: `companion:${member.id}`,
    refId: member.id,
    team: "party",
    kind: "companion",
    name: member.name,
    level: member.level || 1,
    hp: member.hp,
    maxHp: member.maxHp,
    ac: member.ac,
    abilities: deepClone(member.abilities),
    skills: deepClone(member.skills || []),
    expertise: [],
    savingThrows: [],
    resources: deepClone(member.resources || {}),
    conditions: deepClone(member.conditions || []),
    deathSaves: deepClone(member.deathSaves || { successes: 0, failures: 0, stable: false }),
    attack: member.id==='maren' && ITEMS[member.equipment?.mainHand]?.category==='focus' ? {...deepClone(member.attack), damage:member.level>=5?'2d8':'1d8'} : G.weaponProfile(member),
    temporaryHp: Number(member.temporaryHp||0),
    gearSpellAttack:member.gearSpellAttack||0,gearSpellDc:member.gearSpellDc||0,
    saveBonuses:deepClone(member.saveBonuses||{}),
    skillBonuses:deepClone(member.skillBonuses||{}),
    equippedFocus: ITEMS[member.equipment?.mainHand]?.category==='focus',
    aiRole: member.aiRole,
    tactic: member.tactic,
    bond: member.bond,
    initiative: 0,
    actionUsed: false,
    bonusUsed: false,
    reactionUsed: false
  };
}

function combatActorFromEnemy(enemyId, index, scale, encounter) {
  const definition = ENEMIES[enemyId];
  const hpScale = Number(encounter.modifiers?.enemyHp || 1) * scale;
  const maxHp = Math.max(1, Math.round(definition.maxHp * hpScale));
  const actor = {
    id: `enemy:${enemyId}:${index}`,
    refId: enemyId,
    team: "enemy",
    kind: "enemy",
    name: definition.name,
    level: definition.level||1,
    hp: maxHp,
    maxHp,
    ac: definition.ac,
    abilities: deepClone(definition.abilities),
    skills: [],
    expertise: [],
    savingThrows: [],
    conditions: [],
    deathSaves: { successes: 0, failures: 0, stable: false },
    attack: deepClone(definition.attack),
    heal: deepClone(definition.heal || null),
    special: deepClone(definition.special || null),
    specialLastRound: 0,
    resistances: encounter.modifiers?.wraithNoResistance && enemyId === "bell-wraith" ? [] : deepClone(definition.resistances || []),
    tags: deepClone(definition.tags || []),
    xp: definition.xp,
    aiRole: definition.aiRole,
    initiative: 0,
    actionUsed: false,
    bonusUsed: false,
    reactionUsed: false
  };
  if (actor.heal) actor.heal.remaining = actor.heal.uses;
  return actor;
}

function encounterScale(state, encounter) {
  const key = `${state.difficulty}Scale`;
  return Number(encounter[key] || 1);
}

// Weapon attacks per Attack action: fighters and rangers gain a second at
// level 5; fighters a third with the 2nd job (balance pass, job step 6).
function attacksPerAction(actor){
  if(actor?.kind!=='player')return 1;
  return 1+(actor.level>=5&&['fighter','ranger'].includes(actor.classId)?1:0)+(actor.level>=P.SECOND_JOB_LEVEL&&actor.classId==='fighter'?1:0);
}
function startCombat(state, encounterId, rng, events) {
  const encounter = ENCOUNTERS[encounterId];
  if (!encounter) return false;
  if(!encounter.practice && state.story.flags[`won:${encounter.id}`]){enterNode(state,encounter.victoryNode,events);return true;}
  state.world.combatOrigin=state.story.nodeId;
  if(!encounter.questId&&!encounter.practice)state.world.activeQuest="bell";
  const allies = [combatActorFromPlayer(state.player), ...state.party.map(combatActorFromCompanion)];
  const scale = encounterScale(state, encounter) * (encounter.questId ? 1+Math.max(0,state.party.length-2)*0.22 : 1);
  const enemies = encounter.enemies.map((enemyId, index) => combatActorFromEnemy(enemyId, index, scale, encounter));
  const actors = [...allies, ...enemies];
  for (const actor of actors) {
    actor.initiative = rollD20(rng).natural + abilityModifier(actor.abilities.dex);
    if (encounter.id === "road-ambush" && state.story.flags.ambushSurprise && actor.team === "party") actor.initiative += 3;
    if (encounter.id === "road-ambush" && state.story.flags.ambushSurprise && actor.team === "enemy") addCondition(actor, { id: "surprised", name: "Surprised", rounds: 1 });
  }
  actors.sort((a, b) => b.initiative - a.initiative || (a.team === "party" ? -1 : 1));
  state.combat = {
    active: true,
    encounterId,
    name: encounter.name,
    intro: encounter.intro,
    actors,
    turnIndex: 0,
    round: 1,
    awaitingPlayer: false,
    startedAt: nowIso(),
    usedActions: {},
    summary: []
  };
  if(encounter.objective){
    const q=Director.quest(state,encounter.questId);
    const prepared=Boolean(state.story.flags[`prepared:${q.id}`]);
    const approached=Boolean(state.story.flags[`approach:${q.id}`]);
    state.combat.objective={...deepClone(encounter.objective),progress:0,dc:12+Math.floor(XP.challenge(q).accuracy/2)-(prepared?2:0)-(approached?1:0),questId:q.id};
    if(q.id==='beacon')state.combat.objective.dc-=Math.min(3,['marsh_council','keystone_shared','district_consent','archive_open'].filter(f=>state.story.flags[f]).length);
    if(approached)for(const a of enemies)addCondition(a,{id:'surprised',name:'Caught off guard',rounds:1});
  }
  if(encounter.practice){for(const e of enemies){e.maxHp=25+P.powerLevel(state.player.level)*11;e.hp=e.maxHp;e.attack.bonus=2+Math.floor(P.accuracyLevel(state.player.level)/3);}}
  if (state.story.flags.orinStartsGuarding && !encounter.questId && !encounter.practice) {
    const orin = actors.find((actor) => actor.refId === "orin");
    if (orin) addCondition(orin, { id: "dodging", name: "Guarding Stance", expiresRound: 1 });
  }
  if (state.story.flags.playerStartsGuarding) {
    const player = actors.find((actor) => actor.id === "player");
    if (player) addCondition(player, { id: "dodging", name: "Guarding Stance", expiresRound: 1 });
  }
  state.story.lastOutcome = { kind: "combatStart", title: encounter.name, text: encounter.intro };
  pushLog(state, "GM", encounter.intro, "combat");
  const initiativeText = actors.map((actor) => `${actor.name} ${actor.initiative}`).join(" • ");
  pushLog(state, "Initiative", initiativeText, "roll");
  events.push({ type: "combat", tone: "warning", text: `Combat started: ${encounter.name}.` });
  events.push({ type: "roll", tone: "neutral", text: `Initiative: ${initiativeText}` });
  advanceAutomaticTurns(state, rng, events);
  return true;
}

function normalizeCombat(state) {
  const combat = state.combat;
  if (!combat || !ENCOUNTERS[combat.encounterId] || !Array.isArray(combat.actors)) {
    state.combat = null;
    return;
  }
  combat.active = true;
  combat.round = Math.max(1, Math.floor(Number(combat.round || 1)));
  combat.turnIndex = clamp(Math.floor(Number(combat.turnIndex || 0)), 0, Math.max(0, combat.actors.length - 1));
  combat.awaitingPlayer = Boolean(combat.awaitingPlayer);
  combat.usedActions = combat.usedActions && typeof combat.usedActions === "object" ? combat.usedActions : {};
  for (const actor of combat.actors) {
    actor.hp = clamp(Number(actor.hp || 0), 0, Number(actor.maxHp || 1));
    actor.conditions = Array.isArray(actor.conditions) ? actor.conditions : [];
    actor.deathSaves = { successes: 0, failures: 0, stable: false, ...(actor.deathSaves || {}) };
    actor.actionUsed = Boolean(actor.actionUsed);
    actor.bonusUsed = Boolean(actor.bonusUsed);
  }
}

function condition(actor, id) {
  return actor.conditions.find((entry) => entry.id === id) || null;
}

function hasCondition(actor, id) {
  return Boolean(condition(actor, id));
}

function addCondition(actor, entry) {
  const existing = condition(actor, entry.id);
  if (existing) Object.assign(existing, entry);
  else actor.conditions.push({ ...entry });
}

function removeCondition(actor, id) {
  actor.conditions = actor.conditions.filter((entry) => entry.id !== id);
}

function combatActor(state, id) {
  return state.combat?.actors?.find((actor) => actor.id === id) || null;
}

function livingActors(state, team) {
  return state.combat.actors.filter((actor) => actor.team === team && actor.hp > 0);
}

function currentCombatActor(state) {
  return state.combat?.actors?.[state.combat.turnIndex] || null;
}

function effectiveAc(actor) {
  let ac = Number(actor.ac || 10);
  if (hasCondition(actor, "guarded")) ac += 2;
  if (hasCondition(actor, "disengaged")) ac += 2;
  return ac;
}

function startActorTurn(state, actor, rng, events) {
  actor.actionUsed = false;
  actor.bonusUsed = false;
  actor.reactionUsed = false;
  removeCondition(actor, "guidingUsed");
  if (hasCondition(actor, "bleeding") && actor.hp > 0) {
    applyCombatDamage(state, actor, 1, "bleeding", events);
    const bleed = condition(actor, "bleeding");
    bleed.rounds = Number(bleed.rounds || 1) - 1;
    if (bleed.rounds <= 0) removeCondition(actor, "bleeding");
  }
  for(const other of state.combat.actors)other.conditions=other.conditions.filter(c=>!(c.expiresRound && c.expiresRound<=state.combat.round && (c.sourceId ? c.sourceId===actor.id : other.id===actor.id)));
  if (actor.kind === "player" && actor.hp <= 0 && !actor.deathSaves.stable) {
    events.push({ type: "turn", tone: "warning", text: `${actor.name} is unconscious and must make a death saving throw.` });
  }
  void rng;
}

function endActorTurn(state, actor) {
  removeCondition(actor, "surprised");
  removeCondition(actor, "stunned");
  if (hasCondition(actor, "mocked") && actor.actionUsed) removeCondition(actor, "mocked");
  if (hasCondition(actor, "frightened") && actor.actionUsed) removeCondition(actor, "frightened");
}

function incrementCombatTurn(state) {
  state.combat.turnIndex += 1;
  if (state.combat.turnIndex >= state.combat.actors.length) {
    state.combat.turnIndex = 0;
    state.combat.round += 1;
  }
}

function syncCombatBack(state) {
  if (!state.combat?.actors) return;
  const playerActor = combatActor(state, "player");
  if (playerActor) {
    state.player.hp = playerActor.hp;
    state.player.temporaryHp=Number(playerActor.temporaryHp||0);
    state.player.conditions = deepClone(playerActor.conditions);
    state.player.resources = deepClone(playerActor.resources);
    state.player.deathSaves = deepClone(playerActor.deathSaves);
    state.player.used = deepClone(playerActor.used || {});
  }
  for (const member of state.party) {
    const actor = combatActor(state, `companion:${member.id}`);
    if (!actor) continue;
    member.hp = actor.hp;
    member.temporaryHp=Number(actor.temporaryHp||0);
    member.conditions = deepClone(actor.conditions);
    member.resources = deepClone(actor.resources);
    member.deathSaves = deepClone(actor.deathSaves);
  }
}

function applyCombatDamage(state, target, rawAmount, damageType, events, source = "Attack") {
  let amount = Math.max(0, Math.floor(Number(rawAmount || 0)));
  if (target.resistances?.includes(damageType)) amount = Math.floor(amount / 2);
  if (state.difficulty === "story" && target.team === "party") amount = Math.floor(amount * 0.82);
  if (state.difficulty === "gritty" && target.team === "party") amount = Math.ceil(amount * 1.12);
  const ward=condition(target,'intercept');
  if(amount>0&&ward){const blocked=Math.min(amount,ward.reduction||5);amount-=blocked;removeCondition(target,'intercept');events.push({type:'feature',tone:'good',text:`Interception prevents ${blocked} damage to ${target.name}.`});
    const enemy=state.combat?.actors.find(a=>a.id===state.combat.damageSourceId);
    if(enemy&&enemy.team==='enemy'&&enemy.hp>0){const counter=Math.min(enemy.hp,proficiencyBonus(state.player.level));enemy.hp-=counter;if(ward.exposes&&enemy.hp>0)addCondition(enemy,{id:'guiding',name:'Exposed by Interception'});events.push({type:'damage',tone:'good',text:`The interception counterstrike deals ${counter} damage to ${enemy.name}.`});}}
  if (target.temporaryHp > 0) {
    const absorbed = Math.min(target.temporaryHp, amount);
    target.temporaryHp -= absorbed;
    amount -= absorbed;
  }
  const previous = target.hp;
  target.hp = Math.max(0, target.hp - amount);
  const applied = previous - target.hp;
  events.push({ type: "damage", tone: target.team === "enemy" ? "good" : "bad", text: `${source} dealt ${applied} ${damageType} damage to ${target.name}.` });
  if (applied > 0 && hasCondition(target, "sleeping")) removeCondition(target, "sleeping");
  if (previous > 0 && target.hp === 0) {
    target.deathSaves = { successes: 0, failures: 0, stable: false };
    events.push({ type: "condition", tone: target.team === "enemy" ? "good" : "bad", text: `${target.name} fell unconscious.` });
    pushLog(state, "Combat", `${target.name} fell unconscious.`, "combat");
  }
  return applied;
}

function combatHeal(state, target, amount, events, source) {
  const previous = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + Math.max(0, Math.floor(Number(amount || 0))));
  const applied = target.hp - previous;
  if (applied > 0) {
    target.deathSaves = { successes: 0, failures: 0, stable: false };
    events.push({ type: "heal", tone: "good", text: `${source} restored ${applied} HP to ${target.name}.` });
  }
  return applied;
}

function attackAdvantageState(attacker, target) {
  let advantage = false;
  let disadvantage = false;
  if (hasCondition(attacker, "hidden") || hasCondition(attacker,"packReady")) advantage = true;
  if (hasCondition(target, "guiding")) advantage = true;
  if (hasCondition(target, "sleeping")) advantage = true;
  if (hasCondition(attacker, "poisoned") || hasCondition(attacker, "mocked") || hasCondition(attacker, "frightened")) disadvantage = true;
  if (hasCondition(target, "dodging")) disadvantage = true;
  return { advantage: advantage && !disadvantage, disadvantage: disadvantage && !advantage };
}

function rollAttack(state, attacker, target, profile, rng, events, options = {}) {
  const mode = attackAdvantageState(attacker, target);
  if(state.combat.rallyReady&&attacker.team==='party'){mode.advantage=true;state.combat.rallyReady=false;}
  if (options.advantage) mode.advantage = true;
  if (options.disadvantage) mode.disadvantage = true;
  if (mode.advantage && mode.disadvantage) {
    mode.advantage = false;
    mode.disadvantage = false;
  }
  const d20 = rollD20(rng, mode);
  const bonus = Number(profile.attackBonus ?? profile.bonus ?? 0);
  let total = d20.natural + bonus;
  const ac = effectiveAc(target);
  if(hasCondition(attacker,"inspired") && d20.natural!==1 && total<ac){const extra=rollFormula(rng,"1d6").total;total+=extra;removeCondition(attacker,"inspired");events.push({type:"feature",tone:"good",text:`${attacker.name} adds ${extra} from Inspiration.`});}
  const critical = d20.natural === 20;
  const hit = critical || (d20.natural !== 1 && total >= ac);
  const modeText = d20.mode === "normal" ? "" : ` ${d20.mode} [${d20.rolls.join(", ")}]`;
  const text = `${attacker.name} uses ${profile.name}: d20 ${d20.natural}${modeText} ${formatSigned(bonus)} = ${total} vs AC ${ac} — ${critical ? "critical hit" : hit ? "hit" : "miss"}.`;
  events.push({ type: "roll", tone: hit ? "good" : "bad", text, roll: { ...d20, bonus, total, ac, hit, critical } });
  pushLog(state, attacker.name, text, "roll", { success: hit });
  if (hasCondition(attacker, "hidden")) removeCondition(attacker, "hidden");
  removeCondition(attacker,"packReady");
  if (hasCondition(attacker, "mocked")) removeCondition(attacker, "mocked");
  if (hasCondition(target, "guiding")) removeCondition(target, "guiding");
  return { hit, critical, d20, total, ac };
}

function damageRoll(rng, formula, critical = false) {
  const first = rollFormula(rng, formula);
  if (!critical) return first;
  const diceOnly = first.parts.filter((part) => part.type === "dice").reduce((sum, part) => sum + part.rolls.reduce((a, b) => a + b, 0) * part.sign, 0);
  const extra = first.parts.filter((part) => part.type === "dice").reduce((sum, part) => {
    for (let i = 0; i < part.count; i += 1) sum += rollFormula(rng, `1d${part.sides}`).total * part.sign;
    return sum;
  }, 0);
  const flat = first.total - diceOnly;
  return { formula: `${formula} critical`, total: diceOnly + extra + flat, parts: first.parts };
}

function resolveWeaponAttack(state, attacker, target, rng, events, options = {}) {
  const profile = attacker.attack;
  const attack = rollAttack(state, attacker, target, profile, rng, events, options);
  attacker.actionUsed = true;
  if (!attack.hit) return { hit: false, damage: 0 };
  let damage = damageRoll(rng, profile.damageFormula || profile.damage, attack.critical).total;
  if (attacker.kind === "player" && attacker.classId === "rogue" && !attacker.used.sneakAttackTurn) {
    const allyEngaged = livingActors(state, "party").some((actor) => actor.id !== attacker.id);
    if (attack.d20.mode === "advantage" || allyEngaged) {
      const sneak = damageRoll(rng, `${1+Math.floor((P.accuracyLevel(attacker.level)-1)/2)}d6`, attack.critical).total;
      damage += sneak;
      attacker.used.sneakAttackTurn = true;
      events.push({ type: "feature", tone: "good", text: `Sneak Attack adds ${sneak} damage.` });
    }
  }
  if (attacker.kind === "player" && attacker.classId === "ranger" && state.combat.markedTargetId === target.id) {
    const marked = damageRoll(rng, "1d6", attack.critical).total;
    damage += marked;
    events.push({ type: "feature", tone: "good", text: `Hunter's Mark adds ${marked} damage.` });
  }
  if (attacker.kind === "companion" && attacker.tactic === "aggressive") damage += 1;
  if(attacker.kind === "player")damage+=P.stats(state.player).damage;
  const oil=condition(attacker,"coating");if(oil){const extra=rollFormula(rng,"1d4").total;applyCombatDamage(state,target,extra,"radiant",events,"Ward Oil");oil.uses-=1;if(oil.uses<=0)removeCondition(attacker,"coating");}
  if(hasCondition(attacker,"shadowStrike")){damage+=rollFormula(rng,"2d6").total;removeCondition(attacker,"shadowStrike");}
  state.combat.damageSourceId=attacker.id;
  applyCombatDamage(state, target, damage, profile.damageType || "physical", events, profile.name);
  state.combat.damageSourceId=null;
  if (profile.onHit === "bleeding" && target.hp > 0) {
    addCondition(target, { id: "bleeding", name: "Bleeding", rounds: 2 });
    events.push({ type: "condition", tone: "bad", text: `${target.name} is Bleeding.` });
  }
  return { hit: true, damage };
}

function spellAttackBonus(actor, abilityId, state) {
  let bonus = proficiencyBonus(actor.level || 1) + abilityModifier(actor.abilities[abilityId]);
  bonus += Number(actor.gearSpellAttack||0);
  return bonus;
}

function spellSaveDc(actor, abilityId) {
  return 8 + proficiencyBonus(actor.level || 1) + abilityModifier(actor.abilities[abilityId]) + Number(actor.gearSpellDc||0);
}

function spendActorResource(actor, id) {
  if (!id) return true;
  const resource = actor.resources?.[id];
  if (typeof resource === "number") {
    if (resource <= 0) return false;
    actor.resources[id] -= 1;
    return true;
  }
  if (!resource || resource.current <= 0) return false;
  resource.current -= 1;
  return true;
}

function actorResourceCurrent(actor, id) {
  if (!id) return Infinity;
  const resource = actor.resources?.[id];
  if (typeof resource === "number") return resource;
  return Number(resource?.current || 0);
}

function markActionCost(actor, cost) {
  if (cost === "bonus") actor.bonusUsed = true;
  else actor.actionUsed = true;
}

// Every saving throw uses this path, including preparation and companion effects.
function savingThrow(state,target,ability,dc,rng,events,tag='') {
  const poison=tag==='poison'&&hasCondition(target,'poisonWard');
  const d20=rollD20(rng,{advantage:poison});
  const bonus=actorAbilityBonus(target,ability,true);
  let total=d20.natural+bonus;
  if(poison){removeCondition(target,'poisonWard');events.push({type:'feature',tone:'good',text:`${target.name}'s Antitoxin grants advantage on this poison save and is spent.`});}
  if(hasCondition(target,'blessed')){const n=rollFormula(rng,'1d4').total;total+=n;removeCondition(target,'blessed');events.push({type:'feature',tone:'good',text:`The shrine blessing adds ${n} to ${target.name}'s saving throw and is spent.`});}
  if(hasCondition(target,'inspired')&&total<dc){const n=rollFormula(rng,'1d6').total;total+=n;removeCondition(target,'inspired');events.push({type:'feature',tone:'good',text:`Inspiration adds ${n} to ${target.name}'s saving throw.`});}
  const success=total>=dc;
  events.push({type:'roll',tone:success?'good':'warning',text:`${target.name} ${ABILITIES[ability].name} save: d20 ${d20.natural} ${formatSigned(bonus)} = ${total} vs DC ${dc} — ${success?'saved':'failed'}.`,roll:{...d20,bonus,total,dc,success}});
  return {success,total,dc,bonus,d20};
}

function objectivePlan(state) {
  const o=state.combat?.objective;if(!o)return null;
  const a=combatActor(state,'player')||state.player;
  const skill=[o.skill,...(o.alt||[])].filter(id=>SKILLS[id]).sort((x,y)=>actorSkillBonus(a,y)-actorSkillBonus(a,x))[0];
  const q=Director.quest(state,o.questId);
  const tools=(q?.route.tools||[]).filter(id=>hasItem(state,id));
  const toolBonus=tools.length?P.stats(state.player).tool:0;
  const bonus=actorSkillBonus(a,skill)+P.stats(state.player).objective+(state.world.rumors[o.questId]?1:0)+toolBonus;
  const covered=hasCondition(a,'covered');
  const advantage=Boolean(tools.length||covered),disadvantage=hasCondition(a,'poisoned');
  const mode=advantage===disadvantage?'normal':advantage?'advantage':'disadvantage';
  const dc=Math.max(8,o.dc);
  return {skill,skillName:SKILLS[skill].name,bonus,dc,mode,successProbability:successProbability(dc,bonus,mode),tools:tools.map(id=>ITEMS[id].name),covered,description:`${SKILLS[skill].name} ${formatSigned(bonus)} vs DC ${dc}${mode==='normal'?'':` • ${mode}`}. ${o.progress}/${o.target} progress; deadline after round ${o.deadline}.`};
}

function resolveTacticalAction(state,actor,action,rng,events) {
  const id=normalizeId(action.actionId||action.id);
  if(id==='retreat'){
    finishCombat(state,'retreat',rng,events);
    return {ok:true,kind:'combat',outcomeText:'The party withdraws from the encounter. Earlier discoveries remain; the expedition board allows a return.'};
  }
  if(id.startsWith('order:')){
    const kind=id.slice(6);if(!['focus','protect','cover'].includes(kind))return invalidResult(state,events,'Unknown companion order.');
    if(state.combat.orderRound===state.combat.round)return invalidResult(state,events,'Only one free companion order may be issued each round.');
    const target=kind==='focus'?validateCombatTarget(state,action.targetId,'enemy'):kind==='protect'?validateCombatTarget(state,action.targetId,'ally'):actor;
    if(!target)return invalidResult(state,events,'Choose a valid order target.');
    state.combat.order={kind,targetId:target.id,round:state.combat.round};state.combat.orderRound=state.combat.round;
    const text=kind==='focus'?`Companions focus their attacks on ${target.name}.`:kind==='protect'?`Companions prioritize protection and healing for ${target.name}.`:'Companions provide covering help for the hero’s next objective check instead of attacking when help is still needed.';
    events.push({type:'party',tone:'good',text});return {ok:true,kind:'combat',outcomeText:text};
  }
  if(id==='objective'||id==='spec-objective'){
    const o=state.combat.objective;if(!o)return invalidResult(state,events,'There is no combat objective in this encounter.');
    if(actor.actionUsed)return invalidResult(state,events,'Your action has already been used.');
    if(id==='spec-objective'){
      if(!['saboteur','lorekeeper'].includes(P.ensure(state.player).specialization)||actorResourceCurrent(actor,'advancement')<1)return invalidResult(state,events,'This requires the appropriate advancement and an available use.');
      spendActorResource(actor,'advancement');actor.actionUsed=true;o.progress=Math.min(o.target,o.progress+2);
      events.push({type:'objective',tone:'good',text:`Your advancement unravels two objective steps: ${o.progress}/${o.target}.`});
    }else{
      const plan=objectivePlan(state);const d20=rollD20(rng,{advantage:plan.mode==='advantage',disadvantage:plan.mode==='disadvantage'});let total=d20.natural+plan.bonus;
      if(hasCondition(actor,'inspired')&&total<plan.dc){const n=rollFormula(rng,'1d6').total;total+=n;removeCondition(actor,'inspired');events.push({type:'feature',tone:'good',text:`Inspiration adds ${n} to the objective check.`});}
      const success=total>=plan.dc;actor.actionUsed=true;removeCondition(actor,'covered');
      if(success)o.progress+=1;
      events.push({type:'roll',tone:success?'good':'warning',text:`${o.label}: d20 ${d20.natural} ${formatSigned(plan.bonus)} = ${total} vs DC ${plan.dc} — ${success?'progress made':'no progress this turn'}. ${o.progress}/${o.target}.`,roll:{...d20,total,bonus:plan.bonus,dc:plan.dc,success}});
    }
    return {ok:true,kind:'combat',outcomeText:`${actor.name} works toward ${o.name.toLowerCase()}: ${o.progress}/${o.target}.`};
  }
  if(id.startsWith('combo:')){
    const cid=id.slice(6),comp=state.combat.actors.find(a=>a.refId===cid&&a.kind==='companion'&&a.hp>0);
    if(state.player.level<7||!state.world.personal[cid]?.rewarded||!comp)return invalidResult(state,events,'A conscious companion with a resolved personal quest is required at level 7 or above.');
    if(actor.bonusUsed||state.combat.comboUsed||actorResourceCurrent(actor,'technique')<1)return invalidResult(state,events,'A combination requires your bonus action and one Technique use; only one combination per encounter.');
    const target=cid==='maren'?validateCombatTarget(state,action.targetId,'ally'):validateCombatTarget(state,action.targetId,'enemy');
    if(!target)return invalidResult(state,events,'Choose a valid combination target.');
    spendActorResource(actor,'technique');actor.bonusUsed=true;state.combat.comboUsed=true;
    if(cid==='maren'){
      combatHeal(state,target,rollFormula(rng,'2d6').total+P.accuracyLevel(state.player.level),events,'Shared Renewal');removeCondition(target,'poisoned');
    }else{
      const used=comp.actionUsed;resolveWeaponAttack(state,comp,target,rng,events,{advantage:true});comp.actionUsed=used;
      if(cid==='orin')for(const a of livingActors(state,'party'))addCondition(a,{id:'guarded',name:'Shield Accord',sourceId:actor.id,expiresRound:state.combat.round+1});
      else if(target.hp>0)addCondition(target,{id:'guiding',name:'Exposed by Crossfire'});
    }
    events.push({type:'party',tone:'good',text:`${actor.name} and ${comp.name} execute their personal-quest combination.`});return {ok:true,kind:'combat',outcomeText:'The party turns a shared experience into coordinated action.'};
  }
  return null;
}

// Job skills (src/data/jobs.json) are lists of small effects the engine
// already understands, so every new skill uses tested combat paths.
function resolveJobAction(state,actor,def,target,rng,events){
  if(def.resource&&!spendActorResource(actor,def.resource))return invalidResult(state,events,'No uses remain.');
  markActionCost(actor,def.cost);
  const primary=CLASSES[actor.classId].primaryAbility,mod=abilityModifier(actor.abilities[def.ability||primary]);
  const f=formula=>P.jobFormula(formula,actor.level).replace(/\bmod\b/g,String(mod)).replace(/\+-/g,'-');
  const st=P.stats(state.player),round=state.combat.round;
  const party=()=>livingActors(state,'party'),enemies=()=>livingActors(state,'enemy');
  const pick=on=>on==='party'?party():on==='enemies'?enemies():on==='self'?[actor]:target&&target!==actor?[target]:def.target==='self'||def.target==='none'?[actor]:[];
  const condition=(a,c)=>{if(a.hp>0)addCondition(a,{id:c.id,name:c.name||def.name,sourceId:actor.id,...(c.rounds?{expiresRound:round+c.rounds}:{})});};
  for(const e of def.effects||[]){
    if(e.do==='weapon'){
      // A weapon skill never makes fewer attacks than the Attack action; the
      // attacks it adds are plain follow-ups without the skill's extra damage.
      const times=e.times||1;
      for(let n=0;n<Math.max(times,attacksPerAction(actor))&&target?.hp>0;n++){
        const r=resolveWeaponAttack(state,actor,target,rng,events,{advantage:Boolean(e.advantage)});
        if(n>=times)continue;
        if(r.hit&&e.extra&&target.hp>0)applyCombatDamage(state,target,damageRoll(rng,f(e.extra),r.critical).total,actor.attack?.damageType||'slashing',events,def.name);
        if(r.hit&&e.onHit)condition(target,e.onHit);
      }
    }else if(e.do==='spell'&&target?.hp>0){
      const r=rollAttack(state,actor,target,{name:def.name,attackBonus:spellAttackBonus(actor,def.ability||primary,state)},rng,events);
      if(r.hit){applyCombatDamage(state,target,damageRoll(rng,f(e.damage),r.critical).total+st.damage,e.type||'force',events,def.name);if(e.onHit)condition(target,e.onHit);}
    }else if(e.do==='save'){
      const dc=spellSaveDc(actor,primary);
      for(const foe of e.area?enemies():pick('target').filter(a=>a.team==='enemy'&&a.hp>0)){
        const saved=savingThrow(state,foe,e.save||'dex',dc,rng,events).success;
        if(e.damage){const amount=rollFormula(rng,f(e.damage)).total+st.damage;const dealt=saved?(e.half?Math.floor(amount/2):0):amount;if(dealt)applyCombatDamage(state,foe,dealt,e.type||'force',events,def.name);}
        if(!saved&&e.onFail)condition(foe,e.onFail);
      }
    }else if(e.do==='damage'){
      for(const foe of pick(e.on).filter(a=>a.team==='enemy'&&a.hp>0))applyCombatDamage(state,foe,rollFormula(rng,f(e.damage)).total+st.damage,e.type||'force',events,def.name);
    }else if(e.do==='heal'){
      for(const a of pick(e.on).filter(a=>a.team==='party'))combatHeal(state,a,Math.max(1,rollFormula(rng,f(e.amount)).total)+st.healing,events,def.name);
    }else if(e.do==='tempHp'){
      for(const a of pick(e.on).filter(a=>a.team==='party'&&a.hp>0))a.temporaryHp=Math.max(a.temporaryHp||0,Math.max(1,rollFormula(rng,f(e.amount)).total));
    }else if(e.do==='condition'){
      for(const a of pick(e.on))condition(a,e);
    }else if(e.do==='ward'){
      for(const a of pick(e.on).filter(a=>a.team==='party'&&a.hp>0))addCondition(a,{id:'intercept',name:'Interception',sourceId:actor.id,expiresRound:round+1,reduction:4+Math.floor(P.accuracyLevel(actor.level)/2)});
    }else if(e.do==='refresh'){
      const r=actor.resources?.[e.resource];if(r)r.current=Math.min(r.max,r.current+(e.amount||1));
    }else if(e.do==='objective'){
      const o=state.combat.objective;
      if(o&&!o.failed&&o.progress<o.target){o.progress=Math.min(o.target,o.progress+(e.steps||1));events.push({type:'objective',tone:'good',text:`${def.name} advances the objective: ${o.progress}/${o.target}.`});}
    }
  }
  events.push({type:'feature',tone:'good',text:`${actor.name} uses ${def.name}. ${def.resource?`${actorResourceCurrent(actor,def.resource)} uses remain.`:''}`});
  return {ok:true,kind:'combat',outcomeText:`${actor.name} uses ${def.name}.`};
}

function resolveAdvancedAction(state,actor,def,target,rng,events) {
  if(def.kind==='job')return resolveJobAction(state,actor,def,target,rng,events);
  const kinds=['intercept','weaponControl','snare','sanctuary','rally','bastion','precisionBurst','shadow','sabotage','nova','timeWard','massHeal','banish','pack'];
  if(!kinds.includes(def.kind))return null;
  if(def.kind==='snare'&&state.combat.usedActions[`snared:${target.id}`])return invalidResult(state,events,'That enemy has already been snared in this encounter. No Technique was consumed.');
  if(def.resource&&!spendActorResource(actor,def.resource))return invalidResult(state,events,'No uses remain.');
  markActionCost(actor,def.cost);
  const primary=CLASSES[actor.classId].primaryAbility,mod=abilityModifier(actor.abilities[def.ability||primary]);
  const expires=state.combat.round+1,sourceId=actor.id;
  const ward=(a)=>addCondition(a,{id:'intercept',name:'Interception',sourceId,expiresRound:expires,reduction:4+Math.floor(P.accuracyLevel(actor.level)/2),exposes:def.kind==='intercept'&&P.ensure(state.player).choices['5']==='control'});
  const guard=(a)=>addCondition(a,{id:'guarded',name:def.name,sourceId,expiresRound:expires});
  const all=state.combat.actors.filter(a=>a.team==='party');let connected=false;
  switch(def.kind){
    case 'intercept':ward(target);break;
    case 'weaponControl':{const r=resolveWeaponAttack(state,actor,target,rng,events);connected=r.hit;if(r.hit&&target.hp>0)addCondition(target,{id:'mocked',name:'Off balance: next attack disadvantaged'});break;}
    case 'snare':{
      const r=rollAttack(state,actor,target,{name:def.name,attackBonus:spellAttackBonus(actor,'int',state)},rng,events);connected=r.hit;
      if(r.hit){state.combat.usedActions[`snared:${target.id}`]=true;applyCombatDamage(state,target,damageRoll(rng,actor.level>=5?'3d6':'2d6',r.critical).total+P.stats(state.player).damage,'force',events,def.name);if(target.hp>0)addCondition(target,{id:'stunned',name:'Snared: lose next action'});}break;
    }
    case 'sanctuary':combatHeal(state,target,rollFormula(rng,'1d6').total+mod+Math.floor(P.accuracyLevel(actor.level)/2)+P.stats(state.player).healing,events,def.name);guard(target);if(P.ensure(state.player).choices['5']==='control')addCondition(target,{id:'packReady',name:'Sanctuary: next attack advantaged'});break;
    case 'rally':for(const a of all.filter(a=>a.hp>0)){a.temporaryHp=Math.max(a.temporaryHp||0,3+mod);if(P.ensure(state.player).choices['5']==='control')addCondition(a,{id:'packReady',name:'Refined Rally: next attack advantaged'});}state.combat.rallyReady=P.ensure(state.player).choices['5']!=='control';break;
    case 'bastion':for(const a of all.filter(a=>a.hp>0)){a.temporaryHp=Math.max(a.temporaryHp||0,8);ward(a);}break;
    case 'precisionBurst':for(let n=0;n<Math.max(2,attacksPerAction(actor))&&target.hp>0;n++)resolveWeaponAttack(state,actor,target,rng,events,{advantage:true});break;
    case 'shadow':actor.temporaryHp=Math.max(actor.temporaryHp||0,8);addCondition(actor,{id:'hidden',name:'Hidden'});addCondition(actor,{id:'shadowStrike',name:'Shadow strike: next hit +2d6'});break;
    case 'sabotage':applyCombatDamage(state,target,rollFormula(rng,'3d6').total,actor.classId==='bard'?'psychic':'force',events,def.name);if(target.hp>0)addCondition(target,{id:'stunned',name:'Disabled: lose next action'});break;
    case 'nova':for(const foe of livingActors(state,'enemy')){const saved=savingThrow(state,foe,'dex',spellSaveDc(actor,primary),rng,events).success;const amount=rollFormula(rng,'4d6').total;applyCombatDamage(state,foe,saved?Math.floor(amount/2):amount,'fire',events,def.name);}break;
    case 'timeWard':combatHeal(state,target,10+P.stats(state.player).healing,events,def.name);guard(target);if(actor.resources.technique)actor.resources.technique.current=Math.min(actor.resources.technique.max,actor.resources.technique.current+1);break;
    case 'massHeal':for(const a of all){combatHeal(state,a,rollFormula(rng,'2d6').total+mod+P.stats(state.player).healing,events,def.name);removeCondition(a,'poisoned');}break;
    case 'banish':target.resistances=[];applyCombatDamage(state,target,rollFormula(rng,target.tags?.includes('undead')?'6d6':'4d6').total,'radiant',events,def.name);break;
    case 'pack':for(const a of all.filter(a=>a.hp>0)){a.temporaryHp=Math.max(a.temporaryHp||0,6);addCondition(a,{id:'packReady',name:'Pack Instinct: next attack advantaged'});}break;
  }
  if(connected&&P.ensure(state.player).choices['5']==='control'&&target.hp>0)addCondition(target,{id:'guiding',name:'Exposed by Technique'});
  events.push({type:'feature',tone:'good',text:`${actor.name} uses ${def.name}. ${def.resource?`${actorResourceCurrent(actor,def.resource)} uses remain.`:''}`});
  return {ok:true,kind:'combat',outcomeText:`${actor.name} uses ${def.name}.`};
}

function resolveClassAction(state, actor, actionDef, target, rng, events) {
  const advanced=resolveAdvancedAction(state,actor,actionDef,target,rng,events);
  if(advanced)return advanced;
  if (actionDef.resource && !spendActorResource(actor, actionDef.resource)) return invalidResult(state, events, `No ${actionDef.resource} uses remain.`);
  markActionCost(actor, actionDef.cost);
  const mod = abilityModifier(actor.abilities[actionDef.ability || CLASSES[actor.classId]?.primaryAbility || "wis"]);
  if (actionDef.kind === "heal") {
    const recipient = target || actor;
    const amount = rollFormula(rng, actionDef.formula, { level: P.accuracyLevel(actor.level || 1), mod }).total;
    combatHeal(state, recipient, Math.max(1, amount)+P.stats(state.player).healing, events, actionDef.name);
    return { ok: true, outcomeText: `${actor.name} uses ${actionDef.name} on ${recipient.name}.` };
  }
  if (actionDef.kind === "spellAttack") {
    const profile = {
      name: actionDef.name,
      attackBonus: spellAttackBonus(actor, actionDef.ability, state),
      damage: actionDef.damage,
      damageType: actionDef.damageType
    };
    const result = rollAttack(state, actor, target, profile, rng, events);
    if (result.hit) {
      const damage = damageRoll(rng, actionDef.damage, result.critical).total+P.stats(state.player).damage;
      applyCombatDamage(state, target, damage, actionDef.damageType, events, actionDef.name);
      if (actionDef.onHit === "guiding" && target.hp > 0) addCondition(target, { id: "guiding", name: "Guiding Light" });
    }
    return { ok: true, outcomeText: `${actor.name} casts ${actionDef.name}.` };
  }
  if (actionDef.kind === "autoDamage") {
    const amount = rollFormula(rng, actionDef.damage).total+P.stats(state.player).damage;
    applyCombatDamage(state, target, amount, actionDef.damageType, events, actionDef.name);
    return { ok: true, outcomeText: `${actionDef.name} strikes ${target.name} without an attack roll.` };
  }
  if (actionDef.kind === "saveDamage") {
    const dc = spellSaveDc(actor, actionDef.ability);
    const saveBonus = actorAbilityBonus(target, actionDef.saveAbility, true);
    const d20 = rollD20(rng);
    let total = d20.natural + saveBonus;
    if (hasCondition(target, "inspired") && total < dc) {
      const die = rollFormula(rng, "1d6").total;
      total += die;
      removeCondition(target, "inspired");
      events.push({ type: "feature", tone: "good", text: `${target.name} adds ${die} from Bardic Inspiration.` });
    }
    const failed = total < dc;
    events.push({ type: "roll", tone: failed ? "good" : "bad", text: `${target.name} ${ABILITIES[actionDef.saveAbility].name} save: ${d20.natural} ${formatSigned(saveBonus)} = ${total} vs DC ${dc} — ${failed ? "failed" : "saved"}.` });
    if (failed) {
      const amount = rollFormula(rng, actionDef.damage).total+P.stats(state.player).damage;
      applyCombatDamage(state, target, amount, actionDef.damageType, events, actionDef.name);
      if (actionDef.onFail === "mocked" && target.hp > 0) addCondition(target, { id: "mocked", name: "Mocked" });
    }
    return { ok: true, outcomeText: `${actor.name} uses ${actionDef.name}.` };
  }
  if (actionDef.kind === "sleep") {
    let pool = rollFormula(rng, actionDef.formula).total;
    const candidates = livingActors(state, "enemy").sort((a, b) => a.hp - b.hp);
    const slept = [];
    for (const enemy of candidates) {
      if (enemy.tags?.includes("undead")) continue;
      if (enemy.hp <= pool) {
        pool -= enemy.hp;
        addCondition(enemy, { id: "sleeping", name: "Magically Asleep" });
        slept.push(enemy.name);
      }
    }
    events.push({ type: "condition", tone: slept.length ? "good" : "neutral", text: slept.length ? `${slept.join(", ")} fell magically asleep.` : "The sleep magic was not strong enough to overcome any foe." });
    return { ok: true, outcomeText: `${actor.name} casts Sleep.` };
  }
  if (actionDef.kind === "hide") {
    const awareness = Math.max(...livingActors(state, "enemy").map((enemy) => 10 + abilityModifier(enemy.abilities.wis)), 10);
    const d20 = rollD20(rng);
    const bonus = actorSkillBonus(actor, "stealth");
    const total = d20.natural + bonus;
    const success = total >= awareness;
    events.push({ type: "roll", tone: success ? "good" : "bad", text: `${actor.name} Stealth: ${d20.natural} ${formatSigned(bonus)} = ${total} vs ${awareness} awareness — ${success ? "hidden" : "spotted"}.` });
    if (success) addCondition(actor, { id: "hidden", name: "Hidden" });
    return { ok: true, outcomeText: `${actor.name} attempts to hide.` };
  }
  if (actionDef.kind === "disengage") {
    addCondition(actor, { id: "disengaged", name: "Disengaged", expiresRound: state.combat.round + 1 });
    return { ok: true, outcomeText: `${actor.name} withdraws behind a safer guard.` };
  }
  if (actionDef.kind === "guard") {
    addCondition(target, { id: "guarded", name: `Guarded by ${actor.name}`, expiresRound: state.combat.round + 1, sourceId: actor.id });
    addCondition(actor, { id: "taunting", name: "Holding the Line", expiresRound: state.combat.round + 1 });
    events.push({ type: "condition", tone: "good", text: `${target.name} gains +2 AC while ${actor.name} holds the line.` });
    return { ok: true, outcomeText: `${actor.name} braces to protect ${target.name}.` };
  }
  if (actionDef.kind === "mark") {
    state.combat.markedTargetId = target.id;
    events.push({ type: "condition", tone: "good", text: `${target.name} is marked as the ranger's quarry.` });
    return { ok: true, outcomeText: `${actor.name} marks ${target.name}.` };
  }
  if (actionDef.kind === "inspire") {
    addCondition(target, { id: "inspired", name: "Bardic Inspiration" });
    events.push({ type: "condition", tone: "good", text: `${target.name} gains a d6 Bardic Inspiration die.` });
    return { ok: true, outcomeText: `${actor.name} inspires ${target.name}.` };
  }
  return invalidResult(state, events, `${actionDef.name} is not implemented.`);
}

function validateCombatTarget(state, targetId, targetKind) {
  const target = combatActor(state, targetId);
  if (targetKind === "self") return combatActor(state, "player");
  if (!target) return null;
  if (targetKind === "enemy" && (target.team !== "enemy" || target.hp <= 0)) return null;
  if (targetKind === "ally" && target.team !== "party") return null;
  return target;
}

function combatUseItem(state, actor, itemId, targetId, rng, events) {
  const item = ITEMS[itemId];
  if (!item || !hasItem(state, itemId) || !item.usable?.contexts?.includes("combat")) return invalidResult(state, events, "That item cannot be used in combat.");
  const cost = item.usable.cost || "action";
  if (cost === "action" && actor.actionUsed) return invalidResult(state, events, "Your action has already been used this turn.");
  if (cost === "bonus" && actor.bonusUsed) return invalidResult(state, events, "Your bonus action has already been used this turn.");
  let target = targetId ? combatActor(state,targetId) : (item.usable.target === "self" ? actor : null);
  if(!target)return invalidResult(state,events,"Choose a valid target; no item was spent.");
  if (item.usable.target === "self") target = actor;
  if (item.usable.target === "enemy" && target.team !== "enemy") return invalidResult(state, events, "Choose an enemy target.");
  if (item.usable.target === "ally" && target.team !== "party") return invalidResult(state, events, "Choose a party target.");
  if (item.usable.effect === "heal" && target.hp >= target.maxHp) return invalidResult(state, events, `${target.name} is already at full health.`);
  if (item.usable.effect === "cure" && !hasCondition(target, item.usable.condition) && hasCondition(target,"poisonWard")) return invalidResult(state, events, `${target.name} already has poison protection.`);
  if(item.usable.effect === "healersKit" && (target.hp>0 || target.deathSaves.stable))return invalidResult(state,events,"A combat kit use only stabilizes an unconscious, unstable ally. Nothing was consumed.");
  if (item.usable.effect === "holyWater" && !target.tags?.includes("undead")) return invalidResult(state, events, "Holy Water's combat damage only affects undead targets.");
  markActionCost(actor, cost);
  if (item.usable.effect === "heal") {
    const amount = rollFormula(rng, item.usable.formula).total;
    combatHeal(state, target, amount+P.stats(state.player).healing, events, item.name);
  } else if (item.usable.effect === "healersKit") {
    if (target.hp <= 0) {
      target.deathSaves.stable = true;
      target.deathSaves.failures = 0;
      events.push({ type: "condition", tone: "good", text: `${target.name} is stabilized by the Healer's Kit.` });
    } else {
      const amount = rollFormula(rng, item.usable.formula).total;
      combatHeal(state, target, amount+P.stats(state.player).healing, events, item.name);
    }
  } else if (item.usable.effect === "cure") {
    if(hasCondition(target,item.usable.condition)){removeCondition(target,item.usable.condition);events.push({type:"condition",tone:"good",text:`${target.name} is no longer Poisoned.`});}
    else {addCondition(target,{id:"poisonWard",name:"Antitoxin: advantage on next poison save",uses:1});events.push({type:"condition",tone:"good",text:`${target.name} gains advantage on the next poison save.`});}
  } else if (item.usable.effect === "holyWater") {
    const attack = rollAttack(state, actor, target, { name: item.name, attackBonus: proficiencyBonus(actor.level) + abilityModifier(actor.abilities.dex) }, rng, events);
    if (attack.hit) applyCombatDamage(state, target, rollFormula(rng, item.usable.formula).total, "radiant", events, item.name);
  } else if (item.usable.effect === "hide") {
    addCondition(actor, { id: "hidden", name: "Hidden in Smoke" });
    addCondition(actor, { id: "dodging", name: "Smoke Cover", expiresRound: state.combat.round + 1 });
    events.push({ type: "condition", tone: "good", text: `${actor.name} vanishes into smoke and gains cover.` });
  }
  consumeItemUse(state, itemId);
  return { ok: true, kind: "item", outcomeText: `${actor.name} uses ${item.name}.` };
}

function playerDeathSave(state, actor, rng, events) {
  if (actor.hp > 0 || actor.deathSaves.stable) return invalidResult(state, events, "A death saving throw is not currently required.");
  actor.actionUsed = true;
  const d20 = rollD20(rng);
  if (d20.natural === 20) {
    actor.hp = 1;
    actor.deathSaves = { successes: 0, failures: 0, stable: false };
    events.push({ type: "roll", tone: "good", text: `Natural 20 death save: ${actor.name} regains 1 HP and consciousness.` });
  } else if (d20.natural === 1) {
    actor.deathSaves.failures += 2;
    events.push({ type: "roll", tone: "bad", text: `Natural 1 death save: two failures (${actor.deathSaves.failures}/3).` });
  } else if (d20.natural >= 10) {
    actor.deathSaves.successes += 1;
    events.push({ type: "roll", tone: "good", text: `Death save ${d20.natural}: success (${actor.deathSaves.successes}/3).` });
  } else {
    actor.deathSaves.failures += 1;
    events.push({ type: "roll", tone: "bad", text: `Death save ${d20.natural}: failure (${actor.deathSaves.failures}/3).` });
  }
  if (actor.deathSaves.successes >= 3) {
    actor.deathSaves.stable = true;
    events.push({ type: "condition", tone: "good", text: `${actor.name} is stable but remains unconscious.` });
  }
  if (actor.deathSaves.failures >= 3) {
    state.combat.playerDead = true;
    events.push({ type: "condition", tone: "bad", text: `${actor.name} dies. The chapter is lost.` });
  }
  return { ok: true, kind: "deathSave", outcomeText: `${actor.name} makes a death saving throw.` };
}

function resolvePlayerCombatAction(state, action, rng, events) {
  const actor = currentCombatActor(state);
  if (!actor || actor.id !== "player" || !state.combat.awaitingPlayer) return invalidResult(state, events, "It is not currently the player's turn.");
  const actionId = normalizeId(action.actionId || action.id);
  if (actor.hp <= 0) {
    if (actionId !== "death-save" && actionId !== "end-turn") return invalidResult(state, events, "While unconscious, only a death save or end turn is available.");
    if (actionId === "death-save") {
      if (actor.actionUsed) return invalidResult(state, events, "A death saving throw has already been made this turn.");
      const result = playerDeathSave(state, actor, rng, events);
      endActorTurn(state, actor);
      state.combat.awaitingPlayer = false;
      incrementCombatTurn(state);
      advanceAutomaticTurns(state, rng, events);
      return result;
    }
  }
  if(actionId==='end-turn' && actor.hp<=0 && !actor.deathSaves.stable && !actor.actionUsed) {
    const result=playerDeathSave(state,actor,rng,events);
    endActorTurn(state,actor);state.combat.awaitingPlayer=false;incrementCombatTurn(state);advanceAutomaticTurns(state,rng,events);return result;
  }
  const special=resolveTacticalAction(state,actor,action,rng,events);if(special)return special;
  if (actionId === "end-turn") {
    endActorTurn(state, actor);
    state.combat.awaitingPlayer = false;
    incrementCombatTurn(state);
    advanceAutomaticTurns(state, rng, events);
    return { ok: true, kind: "combat", outcomeText: `${actor.name} ends the turn.` };
  }
  if (actionId === "weapon-attack") {
    if (actor.actionUsed) return invalidResult(state, events, "Your action has already been used this turn.");
    const target = validateCombatTarget(state, action.targetId, "enemy");
    if (!target) return invalidResult(state, events, "Choose a living enemy target.");
    for(let n=0;n<attacksPerAction(actor)&&target.hp>0;n++)resolveWeaponAttack(state,actor,target,rng,events);
    return { ok: true, kind: "combat", outcomeText: `${actor.name} attacks ${target.name}.` };
  }
  if (actionId === "defend") {
    if (actor.actionUsed) return invalidResult(state, events, "Your action has already been used this turn.");
    actor.actionUsed = true;
    addCondition(actor, { id: "dodging", name: "Dodge", expiresRound: state.combat.round + 1 });
    events.push({ type: "condition", tone: "good", text: `${actor.name} takes the Dodge action; attacks have disadvantage until the next turn.` });
    return { ok: true, kind: "combat", outcomeText: `${actor.name} focuses entirely on defense.` };
  }
  if (actionId.startsWith("item:")) {
    return combatUseItem(state, actor, actionId.slice(5), action.targetId, rng, events);
  }
  const classDef = CLASSES[state.player.classId];
  const classAction = P.classActions(state.player).find((candidate) => candidate.id === actionId);
  if (!classAction) return invalidResult(state, events, "That combat action is not available.");
  if (classAction.cost === "action" && actor.actionUsed) return invalidResult(state, events, "Your action has already been used this turn.");
  if (classAction.cost === "bonus" && actor.bonusUsed) return invalidResult(state, events, "Your bonus action has already been used this turn.");
  if (classAction.resource && actorResourceCurrent(actor, classAction.resource) <= 0) return invalidResult(state, events, `No ${classAction.resource} uses remain.`);
  if (classAction.limit === "oncePerCombat" && state.combat.usedActions[`${actor.id}:${classAction.id}`]) return invalidResult(state, events, `${classAction.name} has already been used this combat.`);
  let target = actor;
  if (classAction.target === "enemy") target = validateCombatTarget(state, action.targetId, "enemy");
  if (classAction.target === "ally") target = validateCombatTarget(state, action.targetId, "ally");
  if ((classAction.target === "enemy" || classAction.target === "ally") && !target) return invalidResult(state, events, "Choose a valid target.");
  if (classAction.kind === "heal" && target && target.hp >= target.maxHp) return invalidResult(state, events, `${target.name} is already at full health.`);
  if(classAction.kind==="mark"&&state.combat.markedTargetId===target.id)return invalidResult(state,events,"That target is already marked; no use was spent.");
  if(classAction.kind==="inspire"&&hasCondition(target,"inspired"))return invalidResult(state,events,"That ally already holds an unused Inspiration die.");
  const result = resolveClassAction(state, actor, classAction, target, rng, events);
  if (result.ok && classAction.limit === "oncePerCombat") state.combat.usedActions[`${actor.id}:${classAction.id}`] = true;
  return result;
}

function companionLowTarget(state) {
  // Healers must be able to see unconscious allies. Offensive targeting still
  // uses livingActors(), but support AI deliberately includes party members at
  // 0 HP and prioritises them ahead of injured allies.
  return state.combat.actors
    .filter((actor) => actor.team === "party")
    .map((actor) => ({ actor, ratio: actor.hp <= 0 ? -1 : actor.hp / actor.maxHp }))
    .sort((a, b) => a.ratio - b.ratio)[0]?.actor || null;
}

function enemyPriorityTarget(state, attacker, rng) {
  const candidates = livingActors(state, "party");
  if (!candidates.length) return null;
  const taunter = candidates.find((candidate) => hasCondition(candidate, "taunting"));
  if (taunter && rng() < 0.7) return taunter;
  if (attacker.aiRole === "leader" || attacker.aiRole === "boss") {
    const player = candidates.find((candidate) => candidate.id === "player");
    if (player && rng() < 0.55) return player;
  }
  return candidates
    .map((candidate) => ({ candidate, score: candidate.hp / candidate.maxHp + rng() * 0.35 }))
    .sort((a, b) => a.score - b.score)[0].candidate;
}

function companionAttackTarget(state, actor) {
  const enemies = livingActors(state, "enemy");
  if (!enemies.length) return null;
  const focus=state.combat.order?.kind==="focus"?enemies.find(e=>e.id===state.combat.order.targetId):null;if(focus)return focus;
  if (actor.tactic === "aggressive" || actor.aiRole === "scout") return [...enemies].sort((a, b) => a.hp - b.hp)[0];
  if (actor.tactic === "protective") return [...enemies].sort((a, b) => b.attack?.bonus - a.attack?.bonus)[0];
  return [...enemies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
}

function processCompanionTurn(state, actor, rng, events) {
  if(actor.hp<=0||hasCondition(actor,'sleeping'))return;
  if(hasCondition(actor,'stunned')||hasCondition(actor,'surprised')){actor.actionUsed=true;events.push({type:'condition',tone:'neutral',text:`${actor.name} loses this action to a control effect.`});return;}
  const ordered=state.combat.order?.kind==='protect'?combatActor(state,state.combat.order.targetId):null;
  const lowest=companionLowTarget(state),threshold=actor.tactic==='aggressive'?0.22:actor.tactic==='protective'||actor.tactic==='support'?0.72:0.48;
  if(actor.aiRole==='healer'&&lowest&&actor.resources.healingWords>0&&(lowest.hp<=0||lowest.hp/lowest.maxHp<threshold)){
    actor.resources.healingWords--;actor.bonusUsed=true;
    combatHeal(state,lowest,rollFormula(rng,actor.level>=5?'2d4':'1d4').total+abilityModifier(actor.abilities.wis)+Math.floor(P.accuracyLevel(actor.level)/3),events,`${actor.name}'s Healing Word`);
  }
  if(actor.aiRole==='guardian'){
    if(actor.hp/actor.maxHp<0.5&&actor.resources.secondWind>0){actor.resources.secondWind--;actor.bonusUsed=true;combatHeal(state,actor,rollFormula(rng,'1d10').total+P.accuracyLevel(actor.level),events,`${actor.name}'s Second Wind`);}
    const protect=ordered||((actor.tactic==='protective'||lowest?.hp/lowest?.maxHp<0.45)&&actor.tactic!=='aggressive'?lowest:null);
    if(protect&&protect.id!==actor.id&&protect.hp>0){addCondition(protect,{id:'guarded',name:`Guarded by ${actor.name}`,sourceId:actor.id,expiresRound:state.combat.round+1});addCondition(actor,{id:'taunting',name:'Holding the line',expiresRound:state.combat.round+1});events.push({type:'party',tone:'good',text:`${actor.name} grants ${protect.name} +2 AC and draws enemy attention.`});}
  }
  if(ordered&&ordered.hp>0&&actor.tactic!=='aggressive'&&actor.aiRole!=='guardian')addCondition(ordered,{id:'guarded',name:`Covered by ${actor.name}`,sourceId:actor.id,expiresRound:state.combat.round+1});
  const hero=combatActor(state,'player');
  if(hero?.hp>0&&state.combat.objective&&(actor.tactic==='support'||state.combat.order?.kind==='cover')&&!hasCondition(hero,'covered')){
    addCondition(hero,{id:'covered',name:`Objective help from ${actor.name}`});actor.actionUsed=true;events.push({type:'party',tone:'good',text:`${actor.name} covers the hero instead of attacking: advantage on the next objective check.`});return;
  }
  if(hero?.hp>0&&actor.tactic==='support'&&!hasCondition(hero,'inspired')){
    addCondition(hero,{id:'inspired',name:`Tactical encouragement from ${actor.name}`});actor.actionUsed=true;events.push({type:'party',tone:'good',text:`${actor.name} supplies a d6 to the hero's next failed attack, objective check or save instead of attacking.`});return;
  }
  const target=companionAttackTarget(state,actor);if(!target)return;
  if(actor.aiRole==='healer'&&actor.equippedFocus){
    if(actor.tactic==='aggressive'&&actor.resources.guidingBolt>0){actor.resources.guidingBolt--;const r=rollAttack(state,actor,target,{name:'Guiding Bolt',attackBonus:spellAttackBonus(actor,'wis',state)},rng,events);if(r.hit){applyCombatDamage(state,target,damageRoll(rng,actor.level>=5?'4d6':'3d6',r.critical).total,'radiant',events,`${actor.name}'s Guiding Bolt`);if(target.hp>0)addCondition(target,{id:'guiding',name:'Guiding Light'});}}
    else{const saved=savingThrow(state,target,'dex',spellSaveDc(actor,'wis'),rng,events).success;if(!saved)applyCombatDamage(state,target,rollFormula(rng,actor.level>=5?'2d8':'1d8').total,'radiant',events,`${actor.name}'s Sacred Flame`);}
    actor.actionUsed=true;return;
  }
  const hit=resolveWeaponAttack(state,actor,target,rng,events);
  if(hit.hit&&target.hp>0&&actor.aiRole==='scout'&&actor.resources.trickShot>0&&(actor.tactic==='aggressive'||target.aiRole==='boss')){actor.resources.trickShot--;applyCombatDamage(state,target,rollFormula(rng,actor.level>=5?'2d6':'1d6').total,'piercing',events,`${actor.name}'s Trick Shot`);}
}

function enemySaveAttack(state,actor,target,rng,events,profile){
  const ability=profile.save||'wis';const dc=profile.dc||8+proficiencyBonus(actor.level||2)+Math.max(1,abilityModifier(actor.abilities.cha||actor.abilities.wis));
  const saved=savingThrow(state,target,ability,dc,rng,events,profile.damageType==='poison'?'poison':'').success;
  if(!saved){state.combat.damageSourceId=actor.id;applyCombatDamage(state,target,rollFormula(rng,profile.damage).total,profile.damageType||'psychic',events,profile.name);state.combat.damageSourceId=null;if(profile.condition&&target.hp>0)addCondition(target,{id:profile.condition,name:titleCase(profile.condition),rounds:1});}
  return !saved;
}

function processEnemyTurn(state, actor, rng, events) {
  if (actor.hp <= 0 || hasCondition(actor, "sleeping")) return;
  if(hasCondition(actor,"stunned")){actor.actionUsed=true;events.push({type:"condition",tone:"neutral",text:`${actor.name} loses an action to a control effect.`});return;}
  if (hasCondition(actor, "surprised")) {
    events.push({ type: "turn", tone: "good", text: `${actor.name} is surprised and loses the turn.` });
    actor.actionUsed = true;
    return;
  }
  if (actor.aiRole === "caster" && actor.heal?.remaining > 0) {
    const injured = livingActors(state, "enemy")
      .filter((candidate) => candidate.hp / candidate.maxHp < 0.45)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (injured) {
      actor.heal.remaining -= 1;
      combatHeal(state, injured, rollFormula(rng, actor.heal.formula).total, events, actor.heal.name);
      actor.actionUsed = true;
      return;
    }
  }
  const target = enemyPriorityTarget(state, actor, rng);
  if (!target) return;
  if (actor.special && state.combat.round - Number(actor.specialLastRound || 0) >= Number(actor.special.recharge || 3)) {
    actor.specialLastRound = state.combat.round;
    enemySaveAttack(state, actor, target, rng, events, actor.special);
    actor.actionUsed = true;
    return;
  }
  if (actor.attack.save) {
    enemySaveAttack(state, actor, target, rng, events, actor.attack);
    actor.actionUsed = true;
    return;
  }
  const profile = { name: actor.attack.name, attackBonus: actor.attack.bonus, damageFormula: actor.attack.damage, damageType: actor.attack.damageType, onHit: actor.attack.onHit };
  resolveWeaponAttack(state, actor, target, rng, events);
  actor.attack = { ...actor.attack, ...profile, bonus: profile.attackBonus, damage: profile.damageFormula };
}

function combatResolutionStatus(state,events=[]){
  if(!state.combat?.active)return null;
  if(state.combat.playerDead)return 'defeat';
  if(!livingActors(state,'enemy').length)return 'victory';
  if(!livingActors(state,'party').length)return 'defeat';
  const o=state.combat.objective;
  if(o&&o.progress>=o.target)return 'objective';
  if(!livingActors(state,'enemy').length)return 'victory';
  if(o&&state.combat.round>o.deadline&&!o.failed){
    o.failed=true;(state.world.progress[o.questId]||={}).setback=true;state.world.setbacks++;
    events.push({type:'objective',tone:'warning',text:`The objective deadline passes. ${o.failText} Complete the objective or defeat the opposition to finish; retreat remains available.`});
  }
  if(state.combat.round>40)return 'retreat';
  return null;
}

function finishCombat(state,result,rng,events){
  const c=state.combat;if(!c)return;
  const encounter=ENCOUNTERS[c.encounterId];syncCombatBack(state);
  const name=c.name;state.combat=null;
  if(encounter.practice){
    const snapshot=state.world.practiceSnapshot;
    if(snapshot){state.player=deepClone(snapshot.player);state.party=deepClone(snapshot.party);delete state.world.practiceSnapshot;enterNode(state,snapshot.nodeId,events);}
    events.push({type:'practice',tone:'neutral',text:`Practice ended (${result}). HP, resources, consumables and inventory were restored to the pre-practice snapshot. No XP or gold awarded.`});return;
  }
  // Effects with combat-only timing must never leak into later encounters.
  for(const a of G.actors(state))a.conditions=(a.conditions||[]).filter(x=>['poisoned','poisonWard','blessed','coating'].includes(x.id));
  if(result==='defeat'||result==='retreat'){
    state.world.failedEncounter=encounter.id;
    state.story.lastOutcome={kind:'combatDefeat',title:name,text:result==='retreat'?`The party withdraws from ${name}.`:`The party is overcome in ${name}; rescuers can bring them home.`};
    recordHistory(state,`${result==='retreat'?'Retreated from':'Lost'} ${name}.`,{kind:'combat',result});
    if(result==='retreat')W.recover(state,events,extensionApi());else enterNode(state,'defeat',events);
    return;
  }
  for(const a of G.actors(state))if(a.hp<=0){a.hp=1;a.deathSaves={successes:0,failures:0,stable:false};events.push({type:'heal',tone:'good',text:`${a.name} is stabilised at 1 HP after the encounter.`});}
  if(encounter.questId){
    const qid=encounter.questId;
    state.story.flags[`method:${qid}`]=result==='objective'?'objective':'force';
    if(result==='setback'){(state.world.progress[qid]||={}).setback=true;state.world.setbacks++;}
    const text=c.objective.failed?`${c.objective.failText} The remaining opposition has now been resolved.`:result==='objective'?c.objective.successText:result==='setback'?c.objective.failText:`The opposition is defeated. The party secures ${c.objective.name.toLowerCase()} before returning to the witnesses.`;
    events.push({type:'objective',tone:result==='setback'?'warning':'good',text});
    if(!state.story.flags[`won:${encounter.id}`])W.awardBattleXp(state,qid,events,{awardXp});
    state.story.lastOutcome={kind:'combatVictory',title:name,text};
  }else{
    if(!state.story.flags[`won:${encounter.id}`]){awardXp(state,encounter.xp,events,`Victory in ${name}`);for(const loot of encounter.loot||[])addItem(state,loot.itemId,loot.quantity,events);}
    state.story.lastOutcome={kind:'combatVictory',title:name,text:`The party wins ${name}. The surviving enemies can no longer block the route.`};
  }
  state.story.flags[`won:${encounter.id}`]=true;state.world.pendingBattle=null;state.world.failedEncounter=null;
  recordHistory(state,`Resolved ${name}: ${result}.`,{kind:'combat',result});pushLog(state,'Combat',`Resolved: ${name}.`,'combat');
  enterNode(state,encounter.victoryNode,events);
}

function advanceAutomaticTurns(state, rng, events) {
  let safety = 0;
  while (state.combat?.active && safety < 100) {
    safety += 1;
    const status = combatResolutionStatus(state, events);
    if (status) {
      finishCombat(state, status, rng, events);
      return;
    }
    const actor = currentCombatActor(state);
    if (!actor) {
      finishCombat(state, "defeat", rng, events);
      return;
    }
    startActorTurn(state, actor, rng, events);
    if (actor.id === "player") {
      actor.used.sneakAttackTurn = false;
      if(hasCondition(actor,"stunned")||hasCondition(actor,"surprised")){actor.actionUsed=true;actor.bonusUsed=true;}
      state.combat.awaitingPlayer = true;
      events.push({ type: "turn", tone: "neutral", text: `Round ${state.combat.round}: ${actor.name}'s turn.` });
      syncCombatBack(state);
      return;
    }
    if (actor.hp > 0) {
      if (actor.kind === "companion") processCompanionTurn(state, actor, rng, events);
      else processEnemyTurn(state, actor, rng, events);
    }
    endActorTurn(state, actor);
    incrementCombatTurn(state);
  }
}

function resolveCombatAction(state, action, rng, events) {
  const result = resolvePlayerCombatAction(state, action, rng, events);
  const status = state.combat?.active ? combatResolutionStatus(state,events) : null;
  if (status) finishCombat(state, status, rng, events);
  syncCombatBack(state);
  return result;
}

function actionTargetOptions(state, targetKind) {
  if (!state.combat?.active || targetKind === "none") return [];
  if (targetKind === "self") {
    const player = combatActor(state, "player");
    return player ? [{ id: player.id, name: player.name, hp: player.hp, maxHp: player.maxHp }] : [];
  }
  const team = targetKind === "enemy" ? "enemy" : "party";
  return state.combat.actors
    .filter((actor) => actor.team === team && (targetKind === "enemy" ? actor.hp > 0 : true))
    .map((actor) => ({ id: actor.id, name: actor.name, hp: actor.hp, maxHp: actor.maxHp, ac: effectiveAc(actor), unconscious: actor.hp <= 0 }));
}

function combatActionView(state) {
  if (!state.combat?.active) return [];
  const actor = currentCombatActor(state);
  if (!actor || actor.id !== "player" || !state.combat.awaitingPlayer) return [];
  if (actor.hp <= 0) {
    const actions = [];
    if (!actor.deathSaves.stable) actions.push({ id: "death-save", name: "Death Saving Throw", cost: "action", targetKind: "self", description: "Roll a d20. Three successes stabilize you; three failures mean death." });
    actions.push({ id: "end-turn", name: "End Turn", cost: "free", targetKind: "none", description: "Pass to companions and enemies." });
    return actions;
  }
  const actions = [];
  if (!actor.actionUsed) {
    actions.push({
      id: "weapon-attack",
      name: actor.attack.name,
      cost: "action",
      targetKind: "enemy",
      targets: actionTargetOptions(state, "enemy"),
      description: `Attack ${formatSigned(actor.attack.attackBonus)} to hit; ${actor.attack.damageFormula} ${actor.attack.damageType} damage.${attacksPerAction(actor)===3?" Three strikes against the selected target; later strikes only if it survives.":attacksPerAction(actor)===2?" Two strikes against the selected target; second only if it survives.":""}`
    });
    actions.push({ id: "defend", name: "Dodge", cost: "action", targetKind: "self", targets: actionTargetOptions(state, "self"), description: "Attacks against you have disadvantage until your next turn." });
  }
  const classDef = CLASSES[state.player.classId];
  for (const definition of P.classActions(state.player)) {
    const costUsed = definition.cost === "bonus" ? actor.bonusUsed : actor.actionUsed;
    const noResource = definition.resource && actorResourceCurrent(actor, definition.resource) <= 0;
    const onceUsed = definition.limit === "oncePerCombat" && state.combat.usedActions[`${actor.id}:${definition.id}`];
    const targetKind = definition.target === "enemyGroup" ? "none" : definition.target || "none";
    actions.push({
      id: definition.id,
      name: definition.name,
      cost: definition.cost,
      targetKind,
      targets: actionTargetOptions(state, targetKind),
      description: definition.description+(definition.resource?` Uses: ${actorResourceCurrent(actor,definition.resource)}.`:""),
      disabled: Boolean(costUsed || noResource || onceUsed),
      disabledReason: costUsed ? `${titleCase(definition.cost)} already used.` : noResource ? "No resource uses remain." : onceUsed ? "Already used this combat." : ""
    });
  }
  for (const entry of state.player.inventory) {
    const item = ITEMS[entry.itemId];
    if (!item?.usable?.contexts?.includes("combat")) continue;
    const cost = item.usable.cost || "action";
    const costUsed = cost === "bonus" ? actor.bonusUsed : actor.actionUsed;
    const targetKind = item.usable.target || "self";
    const validEnemy = item.usable.effect !== "holyWater" || livingActors(state, "enemy").some((enemy) => enemy.tags?.includes("undead"));
    actions.push({
      id: `item:${item.id}`,
      name: `Use ${item.name}`,
      cost,
      targetKind,
      targets: actionTargetOptions(state, targetKind),
      description: `${item.purpose} Remaining: ${entry.charges ?? entry.quantity}.`,
      disabled: Boolean(costUsed || !validEnemy),
      disabledReason: costUsed ? `${titleCase(cost)} already used.` : !validEnemy ? "No valid undead target." : ""
    });
  }

  if(state.combat.objective){const plan=objectivePlan(state);actions.push({id:'objective',name:state.combat.objective.label,cost:'action',targetKind:'none',targets:[],description:plan.description+` Success ${Math.round(plan.successProbability*100)}%.`,disabled:actor.actionUsed,disabledReason:actor.actionUsed?'Action already used.':''});}
  for(const [kind,name,targetKind]of [['focus','Order: Focus fire','enemy'],['protect','Order: Protect ally','ally'],['cover','Order: Cover objective','none']]){
    if(kind==='cover'&&!state.combat.objective)continue;
    actions.push({id:`order:${kind}`,name,cost:'free',targetKind,targets:actionTargetOptions(state,targetKind),description:'One free order per round. Persists until changed; companions keep independent turns.',disabled:state.combat.orderRound===state.combat.round,disabledReason:'An order was already issued this round.'});
  }
  if(state.player.level>=7)for(const member of state.party.filter(m=>state.world.personal[m.id]?.rewarded)){
    const targetKind=member.id==='maren'?'ally':'enemy';const disabled=actor.bonusUsed||state.combat.comboUsed||actorResourceCurrent(actor,'technique')<1||combatActor(state,`companion:${member.id}`)?.hp<=0;
    actions.push({id:`combo:${member.id}`,name:`Combine: ${member.name.split(' ')[0]}`,cost:'bonus',targetKind,targets:actionTargetOptions(state,targetKind),description:member.id==='maren'?'Heal 2d6 + level and cure poison. One Technique; one combination per encounter.':member.id==='orin'?'Orin attacks immediately with advantage; the party gains +2 AC for one round. One Technique; one combination per encounter.':'Nessa attacks immediately with advantage and exposes the target. One Technique; one combination per encounter.',disabled,disabledReason:'Requires a conscious companion, a bonus action, one Technique, and an unused encounter combination.'});
  }
  if(state.combat.objective&&['saboteur','lorekeeper'].includes(P.ensure(state.player).specialization))actions.push({id:'spec-objective',name:'Advancement: Unravel objective',cost:'action',targetKind:'none',targets:[],description:'Two objective progress without rolling; one Advancement use.',disabled:actor.actionUsed||actorResourceCurrent(actor,'advancement')<1});
  actions.push({id:'retreat',name:'Retreat to town',cost:'free',targetKind:'none',targets:[],description:ENCOUNTERS[state.combat.encounterId].practice?'End practice and restore the full pre-practice state.':'Withdraw and return to safety. Rescue costs 25% of current gold; XP and equipment are preserved. Retry after preparation.'});
  actions.push({ id: "end-turn", name: "End Turn", cost: "free", targetKind: "none", description: "Resolve all companion and enemy turns until your next initiative." });

  for(const action of actions){
    const def=P.classActions(state.player).find(d=>d.id===action.id);
    const weapon=action.id==='weapon-attack'||['weaponControl','precisionBurst'].includes(def?.kind);
    const spell=['spellAttack','snare'].includes(def?.kind);
    const saving=def?.kind==='saveDamage';
    if(!weapon&&!spell&&!saving)continue;
    for(const target of action.targets||[]){
      const foe=combatActor(state,target.id);if(!foe||foe.team!=='enemy')continue;
      let chance=0;
      if(saving){const dc=spellSaveDc(actor,def.ability);const bonus=actorAbilityBonus(foe,def.saveAbility,true);chance=1-successProbability(dc,bonus);target.preview=`${def.saveAbility.toUpperCase()} save DC ${dc} · ${Math.round(chance*100)}% damage chance`;}
      else{
        const bonus=weapon?actor.attack.attackBonus:spellAttackBonus(actor,def.ability||'int',state);
        const mode=attackAdvantageState(actor,foe);if(def?.kind==='precisionBurst'||state.combat.rallyReady)mode.advantage=true;
        const face=(n)=>n===20?1:n===1?0:n+bonus>=target.ac?1:hasCondition(actor,'inspired')?Math.max(0,Math.min(6,7-(target.ac-n-bonus)))/6:0;
        if(mode.advantage!==mode.disadvantage){for(let x=1;x<=20;x++)for(let y=1;y<=20;y++)chance+=face(mode.advantage?Math.max(x,y):Math.min(x,y))/400;}else for(let x=1;x<=20;x++)chance+=face(x)/20;
        target.preview=`${Math.round(chance*100)}% hit chance per strike · attack ${formatSigned(bonus)} vs AC ${target.ac}`;
      }
      target.probability=Math.round(chance*100);target.detail=target.preview;
    }
  }
  return actions;
}

function combatView(state) {
  if (!state.combat?.active) return null;
  const current = currentCombatActor(state);
  return {
    active: true,
    name: state.combat.name,
    round: state.combat.round,
    currentActorId: current?.id,
    currentActorName: current?.name,
    objective: state.combat.objective ? {...state.combat.objective,check:objectivePlan(state)} : null,
    order:state.combat.order||null,
    awaitingPlayer: state.combat.awaitingPlayer,
    actors: state.combat.actors.map((actor) => ({
      id: actor.id,
      name: actor.name,
      team: actor.team,
      kind: actor.kind,
      hp: actor.hp,
      temporaryHp:actor.temporaryHp||0,
      maxHp: actor.maxHp,
      ac: effectiveAc(actor),
      initiative: actor.initiative,
      conditions: actor.conditions,
      current: actor.id === current?.id,
      unconscious: actor.hp <= 0
    })),
    actions: combatActionView(state),
    economy: current?.id === "player" ? { actionUsed: current.actionUsed, bonusUsed: current.bonusUsed } : null
  };
}

Object.assign(module.exports, { currentCombatActor, combatView, startCombat, normalizeCombat, condition, savingThrow, resolveCombatAction, objectivePlan });
