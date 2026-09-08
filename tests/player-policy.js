"use strict";
// Decision policy consumes ONLY the public view shown by the interface.
// No XP grants, state edits, hidden content lookups or forced rolls.
function chooseAction(v,m={},style='prepared'){
  m.steps=(m.steps||0)+1;
  const hero=v.player,w=v.world,p=v.progression;
  const done=(type,extra={})=>({type,...extra});
  const available=id=>v.combat?.actions.find(a=>a.id===id&&!a.disabled);
  if(v.combat){
    if(hero.hp<=0)return done('combat',{actionId:available('death-save')?'death-save':'end-turn'});
    const allies=[...v.combat.actors].filter(a=>a.team==='party');
    const lowest=allies.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
    const enemies=v.combat.actors.filter(a=>a.team==='enemy'&&a.hp>0).sort((a,b)=>a.hp-b.hp),target=enemies[0];
    if(style==='passive')return done('combat',{actionId:'end-turn'});
    if(!v.combat.order&&available(v.combat.objective?'order:cover':'order:focus'))return done('combat',{actionId:v.combat.objective?'order:cover':'order:focus',targetId:target?.id});
    if(!v.combat.economy.bonusUsed){
      const spec=v.combat.actions.find(a=>a.id.startsWith('spec:')&&a.cost==='bonus'&&!a.disabled);
      if(spec)return done('combat',{actionId:spec.id,targetId:spec.targetKind==='ally'?lowest.id:spec.targetKind==='enemy'?target?.id:undefined});
      if(hero.hp/hero.maxHp<0.55&&available('second-wind'))return done('combat',{actionId:'second-wind',targetId:'player'});
      if(lowest.hp/lowest.maxHp<0.6&&available('healing-word'))return done('combat',{actionId:'healing-word',targetId:lowest.id});
      if(lowest.hp/lowest.maxHp<0.6&&available('sanctuary'))return done('combat',{actionId:'sanctuary',targetId:lowest.id});
      if(lowest.hp/lowest.maxHp<0.6&&available('combo:maren'))return done('combat',{actionId:'combo:maren',targetId:lowest.id});
      if(available('combo:orin')&&target)return done('combat',{actionId:'combo:orin',targetId:target.id});
      if(available('intercept'))return done('combat',{actionId:'intercept',targetId:lowest.id});
      if(!v.combat.objective){
        if(available('cunning-hide'))return done('combat',{actionId:'cunning-hide'});
        if(available('hunters-mark')&&target&&!m[`mark:${v.combat.name}:${target.id}`]){m[`mark:${v.combat.name}:${target.id}`]=true;return done('combat',{actionId:'hunters-mark',targetId:target.id});}
      }
    }
    if(!v.combat.economy.actionUsed){
      if(lowest.hp/lowest.maxHp<0.24){for(const id of ['item:greater-healing','item:healing-potion'])if(available(id))return done('combat',{actionId:id,targetId:lowest.id});}
      if(available('spec-objective'))return done('combat',{actionId:'spec-objective'});
      const spec=v.combat.actions.find(a=>a.id.startsWith('spec:')&&a.cost==='action'&&!a.disabled);
      if(spec)return done('combat',{actionId:spec.id,targetId:spec.targetKind==='ally'?lowest.id:spec.targetKind==='enemy'?target?.id:undefined});
      if(style!=='direct'&&available('objective'))return done('combat',{actionId:'objective'});
      const priorities=hero.className==='Wizard'?['arcane-snare','magic-missile','fire-bolt']:hero.className==='Cleric'?['guiding-bolt','sacred-flame']:hero.className==='Bard'?['vicious-mockery']:hero.className==='Rogue'?['dirty-trick','weapon-attack']:hero.className==='Ranger'?['pinning-shot','weapon-attack']:['weapon-attack'];
      for(const id of priorities){if(!available(id))continue;if(id==='arcane-snare'&&m[`snare:${v.combat.name}:${target?.id}`])continue;
        if(id==='arcane-snare')m[`snare:${v.combat.name}:${target?.id}`]=true;
        return done('combat',{actionId:id,targetId:target?.id});}
      return done('combat',{actionId:'weapon-attack',targetId:target?.id});
    }
    return done('combat',{actionId:'end-turn'});
  }
  if(v.scene.defeat)return done('story-choice',{choiceId:'recover'});
  if(p.pending.length){const r=p.pending[0];let opt=r.options[0];
    if(r.level===3)opt=r.options.find(x=>x.id==='resilient')||opt;
    if(r.level===4)opt=r.options.find(x=>x.id==='ability:con')||opt;
    if(r.level===5)opt=r.options.find(x=>x.id==='economy')||opt;
    if(r.level===6)opt=r.options.find(x=>x.id==='skill:athletics')||opt;
    if(r.level===8)opt=r.options.find(x=>x.id==='bulwark')||opt;
    return done('choose-reward',{level:r.level,optionId:opt.id});}
  if(p.specializationOptions.length)return done('specialize',{specializationId:p.specializationOptions[0].id});
  if(p.specialization&&w.campaignComplete)return null;
  if(w.town){
    if([hero,...v.party].some(a=>a.hp<a.maxHp)||Object.values(hero.resources).some(r=>r.current<r.max))return done('town-service',{serviceId:'civic-rest'});
    const treatment=w.services.find(s=>s.id==='treatment'&&!s.disabled);if(treatment&&hero.gold>=treatment.cost)return done('town-service',{serviceId:'treatment'});
    if(w.canRecruit)return done('recruit',{companionId:'nessa'});
    for(const q of w.personal){if(!q.started)return done('personal',{companionId:q.companionId});if(q.canResolve)return done('resolve-personal',{companionId:q.companionId,choice:'watchful'});}
    if(style!=='direct'){
      // Only buy capabilities explicitly exposed in shop comparisons and briefings.
      const needs=hero.className==='Wizard'||hero.className==='Cleric'||hero.className==='Bard'?['ward-staff','sentinel-charm']:['dueling-blade','sentinel-charm'];
      for(const id of needs){const offer=w.shop.find(i=>i.id===id&&i.stock>0);const owned=v.inventory.find(i=>i.id===id||i.id===id+'-fine');if(offer&&!owned&&hero.gold>offer.price+45)return done('buy',{market:'town',itemId:id,quantity:1});
        if(owned&&owned.available>0&&!owned.equippedSlots.length)return done('equip',{itemId:owned.id});}
      if(hero.gold>95){const potion=v.inventory.find(i=>i.id==='greater-healing');const offer=w.shop.find(i=>i.id==='greater-healing'&&i.stock>0);if(offer&&(potion?.quantity||0)<2)return done('buy',{market:'town',itemId:'greater-healing',quantity:1});}
      const upgrade=w.upgrades.find(u=>u.actorId==='player'&&hero.gold>=u.cost+65&&!m[`upgrade:${u.itemId}`]);if(upgrade){m[`upgrade:${upgrade.itemId}`]=true;return done('upgrade',{itemId:upgrade.itemId,actorId:'player'});}
    }
    if(w.pendingBattle||w.activeQuest&&w.activeQuest!=='bell')return done('resume');
    const q=w.quests.find(q=>q.available);
    if(q){if(w.town.id!==q.town)return done('travel-town',{townId:q.town});
      if(style!=='direct'&&!q.briefed&&hero.gold>=5)return done('rumor',{questId:q.id});
      if(q.knownThreat&&style!=='direct'){
        const tools=['climbing-kit','storm-grounder','antitoxin'];for(const id of tools){const offer=w.shop.find(i=>i.id===id&&i.stock>0);const mentioned=(id==='climbing-kit'&&/climb|rope|crossing/i.test(q.knownThreat))||(id==='storm-grounder'&&/storm|ground/i.test(q.knownThreat))||(id==='antitoxin'&&/poison/i.test(q.knownThreat));if(offer&&mentioned&&!v.inventory.some(i=>i.id===id)&&hero.gold>offer.price+15)return done('buy',{market:'town',itemId:id,quantity:1});}
      }
      return done('depart',{questId:q.id});
    }
    if(w.activeQuest==='bell')return done('resume');
  }
  // Prioritize investigation and assistance based on visible choices; no hidden outcomes.
  const choices=v.scene.choices.filter(c=>!c.locked&&!c.completed);
  const has=id=>choices.some(c=>c.id===id);
  let id=null;
  if(v.scene.id.startsWith('q-')){
    const phase=v.scene.id.split('-').at(-1);
    if(phase==='start')id=style!=='direct'&&has('investigate')?'investigate':'advance';
    if(phase==='approach')id=style==='direct'?'direct':'careful';
    if(phase==='crisis')id=style==='peace'&&has('resolve')?'resolve':style==='direct'?'confront':'objective';
    if(phase==='after')id=choices[0]?.id;
  }else{
    const byScene={
      'briarwatch-square':style==='direct'?['leave-village']:['inspect-rope','question-reeve','visit-tovin','leave-village'],
      'tovin-infirmary':['calm-tovin','return-square'],
      'forest-edge':style==='direct'?['main-road']:['pilgrim-path','follow-whisper','main-road'],
      'old-shrine':['read-altar','open-reliquary','enter-underroad'],
      'shrine-clearing':['read-altar','open-reliquary','enter-underroad'],
      'road-aftermath':['follow-map'],
      'roadside-aftermath':['follow-map'],
      'underroad':['rope-crossing','read-current'],
      'root-gate':['speak-true-name','use-cult-seal','break-gate'],
      'hollow-court':style==='direct'?['challenge-guards']:['eavesdrop-court','challenge-guards'],
      'vault-antechamber':['maren-rite','nessa-key','orin-chain','player-plan'],
      'bell-vault':['expose-sable','turn-binding-key','name-the-spirit','attack-final'],
      'ending':['report-bell']
    };
    const priorities=byScene[v.scene.id]||[];
    for(const candidate of priorities){if(!has(candidate))continue;if(candidate==='visit-tovin'&&m.visitedTovin)continue;id=candidate;break;}
    if(id==='visit-tovin')m.visitedTovin=true;
  }
  if(!id&&choices.length)id=choices[0].id;
  if(!id)return {error:`No playable action at ${v.scene.id}; level ${hero.level}, XP ${hero.xp}.`};
  if(!w.town&&v.scene.canShortRest&&[hero,...v.party].some(a=>a.hp<a.maxHp*0.7))return done('short-rest');
  return done('story-choice',{choiceId:id});
}
if(typeof module!=='undefined')module.exports={chooseAction};
else window.V4PlayerPolicy={chooseAction};
