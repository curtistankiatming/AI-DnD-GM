"use strict";
// V4 interface: all actions go through the same validated engine endpoint.
const expandedV4Sections=new Set(['services','expedition','merchant']);
let v4LastLevel=0;
function v4Button(label,action,disabled=false,reason=''){
  const b=createElement('button','btn btn-secondary btn-small',label);b.type='button';b.dataset.disabled=String(Boolean(disabled));b.disabled=busy||disabled;
  b.dataset.action=JSON.stringify(action);b.title=reason;
  b.addEventListener('click',()=>{if(!busy&&!disabled)void sendAction(action);});return b;
}
function v4Section(root,id,title,description=''){
  const d=createElement('details','v4-section');d.open=expandedV4Sections.has(id);d.dataset.section=id;
  d.appendChild(createElement('summary','',title));if(description)d.appendChild(createElement('p','muted',description));
  d.addEventListener('toggle',()=>{if(d.open)expandedV4Sections.add(id);else expandedV4Sections.delete(id);});root.appendChild(d);return d;
}
function v4Card(title,description){const c=createElement('article','v4-card');c.append(createElement('h3','',title));if(description)c.append(createElement('p','',description));return c;}
function compareDescription(c){return `${c.name}: replaces ${c.replaces}. AC ${c.acBefore} → ${c.acAfter}; weapon hit ${signed(c.attackBefore)} → ${signed(c.attackAfter)}; damage ${c.damageBefore} → ${c.damageAfter}; focus attack ${signed(c.spellAttackBefore)} → ${signed(c.spellAttackAfter)}, focus DC ${signed(c.spellDcBefore)} → ${signed(c.spellDcAfter)}.${c.clearsOffHand?' Two-handed: removes the shield.':''}${c.blocked?' '+c.blocked:''}`;}
function chooseEquipmentOwner(item){
  openTargetDialog({title:`Equip ${item.name}`,description:`Choose an owner. ${item.purpose} Unassigned copies: ${item.available}.`,targets:(item.comparisons||[]).map(c=>({id:c.actorId,name:c.name,detail:compareDescription(c),disabled:Boolean(c.blocked)||item.available<1})),onChoose:actorId=>sendAction({type:'equip',itemId:item.id,actorId})});
}
function v4Shop(root,stock,market){
  const box=createElement('div','v4-shop');
  for(const item of stock){
    const c=v4Card(item.name,item.purpose);c.appendChild(createElement('span','tag',`${item.price} gold · ${item.stock} in stock`));
    if(item.comparisons.length){const details=createElement('details','comparison');details.appendChild(createElement('summary','','Compare with party equipment'));for(const cmp of item.comparisons)details.appendChild(createElement('p','',compareDescription(cmp)));c.appendChild(details);}
    const controls=createElement('div','v4-controls');controls.append(v4Button('Buy 1',{type:'buy',market,itemId:item.id,quantity:1},item.stock<1||view.player.gold<item.price));
    if(!item.comparisons.length)controls.append(v4Button('Buy 2',{type:'buy',market,itemId:item.id,quantity:2},item.stock<2||view.player.gold<item.price*2));
    c.appendChild(controls);box.appendChild(c);
  }
  root.appendChild(box);
}
function renderExpansion(){
  const w=view.world,p=view.progression,hero=view.player,combat=Boolean(view.combat?.active);
  const xp=$('#xpSummary');clear(xp);
  xp.append(createElement('strong','gold-value',`${hero.gold} gold`),createElement('span','',p.nextXp?`XP ${hero.xp} / ${p.nextXp}`:`Level 10 · ${hero.xp} XP · ${p.bankedXp} banked`));
  const meter=createElement('div','meter xp-meter');const fill=createElement('div','meter-fill');fill.style.width=p.nextXp?`${percentage(hero.xp-p.previousXp,p.nextXp-p.previousXp)}%`:'100%';meter.appendChild(fill);xp.appendChild(meter);
  xp.appendChild(createElement('p','muted',`Next: ${p.nextReward}`));if(hero.temporaryHp)xp.appendChild(createElement('p','tag tag-good',`${hero.temporaryHp} temporary HP`));
  const progression=$('#progressionPanel');clear(progression);const pending=p.pending.length||p.specializationOptions.length;
  progression.classList.toggle('is-hidden',!pending);
  if(pending){progression.append(createElement('p','eyebrow','Character development'),createElement('h2','',combat?'Level rewards — available after combat':'Choose your development'));
    for(const reward of p.pending){const section=v4Card(`Level ${reward.level}`,reward.description);const grid=createElement('div','v4-option-grid');for(const opt of reward.options){const b=v4Button(opt.name,{type:'choose-reward',level:reward.level,optionId:opt.id},combat);b.appendChild(createElement('p','',opt.description));grid.appendChild(b);}section.appendChild(grid);progression.appendChild(section);}
    if(p.specializationOptions.length){const section=v4Card('First advancement — level 10','Your trial is complete. Choose a permanent specialization; its signature ability becomes usable immediately in the post-advancement expedition and practice arena.');for(const spec of p.specializationOptions){const b=v4Button(spec.name,{type:'specialize',specializationId:spec.id},combat);b.appendChild(createElement('p','',spec.description));section.appendChild(b);}progression.appendChild(section);}}
  if(v4LastLevel&&hero.level>v4LastLevel)toast(`Level ${hero.level}: ${p.rewards.find(r=>r.level===hero.level)?.description||'Your party grows stronger.'}`,'good');v4LastLevel=hero.level;
  const intent=$('#intentPanel');clear(intent);intent.classList.toggle('is-hidden',!view.pendingIntent);
  if(view.pendingIntent){intent.append(createElement('h2','','Confirm your intent'),createElement('p','',view.pendingIntent.label),v4Button('Confirm approach',{type:'confirm-intent'},combat),v4Button('Cancel',{type:'cancel-intent'},combat));}
  const objective=$('#combatObjective');clear(objective);objective.classList.toggle('is-hidden',!view.combat?.objective);
  if(view.combat?.objective){const o=view.combat.objective;objective.append(createElement('strong','',`${o.name} — ${o.progress} / ${o.target}`),createElement('p','',o.description),createElement('p','',o.check.description),createElement('p','muted',o.failed?`Deadline missed — complete the objective or defeat the opposition. ${o.failText}`:`If time runs out: ${o.failText}`));}
  for(const member of view.party){const card=[...dom.partyCards.children].find(c=>c.textContent.includes(member.name));if(card){card.appendChild(createElement('p','muted',`Level ${member.level} · ${member.personalStyle?titleCase(member.personalStyle):'Personal quest unresolved'}${member.temporaryHp?` · ${member.temporaryHp} temporary HP`:''}`));}}
  const root=$('#worldPanel');clear(root);
  if(w.town&&!view.scene.id.startsWith('town-'))dom.choicePanel.after(root);else dom.combatPanel.before(root);
  dom.choicePanel.classList.toggle('is-hidden',combat||Boolean(w.town&&!view.scene.choices.length));root.classList.toggle('is-hidden',combat);if(combat)return;
  root.append(createElement('p','eyebrow',`Day ${w.day} · Preparation & roads`),createElement('h2','',w.town?w.town.name:w.merchant?'A trader on the road':'Expedition journal'));
  if(w.canReturn)root.appendChild(v4Button('Return to town',{type:'return-town'}));
  if(w.campaignComplete){const c=v4Card('The region remembers',w.recap);if(!p.trialComplete)c.appendChild(createElement('p','','The level-10 trial is now available from Highpass.'));else if(p.specialization)c.appendChild(createElement('p','',`First advancement: ${titleCase(p.specialization)}. The post-advancement mission is complete. Practice your new ability, finish companion reflections, or start another class. This release ends at level 10; levels 30 and 70 are future expansions.`));root.appendChild(c);}
  if(w.town){
    const services=v4Section(root,'services','Lodging, shrine & guild','Free recovery prevents an empty purse from ending the adventure. Shops restock only after a new expedition is resolved.');
    const grid=createElement('div','v4-option-grid');for(const svc of w.services){const b=v4Button(`${svc.name} · ${svc.cost} gold`,{type:'town-service',serviceId:svc.id},svc.disabled||hero.gold<svc.cost);b.appendChild(createElement('p','',svc.description));grid.appendChild(b);}grid.append(v4Button('Practice encounter · free',{type:'practice'}));if(w.canRecruit)grid.append(v4Button('Recruit Nessa · free',{type:'recruit',companionId:'nessa'}));services.appendChild(grid);
    const expeditions=v4Section(root,'expedition','Expedition board & preparation');
    if(w.activeQuest)expeditions.append(v4Button(w.pendingBattle?'Resume interrupted encounter':'Resume expedition',{type:'resume'}));
    if(!w.bellComplete)expeditions.appendChild(createElement('p','','Finish the bell investigation using the story choices. Report the outcome in Briarwatch to unlock the regional roads.'));
    for(const q of w.quests){const c=v4Card(`${q.name} · Level ${q.level}`,q.brief);c.appendChild(createElement('p','',`Reward: ${q.reward.xp} XP and ${q.reward.gold} gold. Peaceful and combat resolutions grant equal objective XP.`));
      if(q.knownThreat)c.appendChild(createElement('p','briefing',q.knownThreat));else c.appendChild(v4Button('Tavern briefing · 5 gold',{type:'rumor',questId:q.id},hero.gold<5));
      const prep=w.preparation.find(x=>x.questId===q.id);for(const warning of prep?.warnings||[])c.appendChild(createElement('p','prep-warning',warning));
      c.appendChild(v4Button(q.returning?'Continue expedition':'Depart',{type:'depart',questId:q.id},!q.canDepart,`Departure point: ${q.townName}. Level ${q.level} required.`));
      if(!q.canDepart)c.appendChild(createElement('p','muted',`Departure point: ${q.townName}; required level ${q.level}.${q.id==='aftermath'?' Choose your specialization first.':''}`));expeditions.appendChild(c);}
    const towns=createElement('div','v4-controls');for(const t of w.towns)towns.appendChild(v4Button(`Travel: ${t.name}`,{type:'travel-town',townId:t.id},t.current));expeditions.appendChild(towns);
    const shop=v4Section(root,'shop','Outfitter & apothecary — buy supplies and equipment');v4Shop(shop,w.shop,'town');
    const smith=v4Section(root,'smith','Blacksmith & workshop','One meaningful quality upgrade per weapon, armor, shield or focus; no endless upgrade ladder.');
    for(const u of w.upgrades){const c=v4Card(`${u.name} → ${u.newName}`,`${u.owner} · ${u.cost} gold. ${u.purpose}`);c.appendChild(v4Button('Commission upgrade',{type:'upgrade',itemId:u.itemId,actorId:u.actorId},hero.gold<u.cost));smith.appendChild(c);}
    for(const r of w.recipes){const c=v4Card(r.name,`${r.ingredients.map(i=>`${i.quantity} × ${titleCase(i.itemId)}`).join(', ')} + ${r.gold} gold. ${r.description||''}`);c.appendChild(v4Button('Craft',{type:'craft',recipeId:r.id},!r.ready));smith.appendChild(c);}
    const companions=v4Section(root,'personal','Companion stories & equipment');
    for(const q of w.personal){const c=v4Card(q.name,q.prompt);c.appendChild(createElement('p','',q.goal));if(!q.started)c.appendChild(v4Button('Begin conversation',{type:'personal',companionId:q.companionId}));else if(q.canResolve){c.append(v4Button('Watchful · +1 AC',{type:'resolve-personal',companionId:q.companionId,choice:'watchful'}),v4Button('Decisive · +1 attacks and spell DC',{type:'resolve-personal',companionId:q.companionId,choice:'decisive'}));}else c.appendChild(createElement('p','muted',q.rewarded?`Resolved: ${titleCase(q.style)}. ${q.reward}`:'The personal goal remains active.'));
      const member=view.party.find(a=>a.id===q.companionId);for(const [slot,itemId]of Object.entries(member?.equipment||{})){if(!itemId)continue;const name=view.inventory.find(i=>i.id===itemId)?.name||titleCase(itemId);c.appendChild(v4Button(`Unequip ${name}`,{type:'unequip',actorId:q.companionId,slot}));}companions.appendChild(c);}
    const stash=v4Section(root,'storage','Sell & shared storage','Assigned equipment cannot be sold or stored until unequipped. Partially used kits can be stored but not sold.');
    for(const item of w.sellable){const row=createElement('div','v4-stock-row');row.append(createElement('span','',`${item.name} · ${item.loose} spare`),v4Button(`Sell 1 · ${item.sellPrice} gold`,{type:'sell',market:'town',itemId:item.itemId,quantity:1},item.partial),v4Button('Store 1',{type:'store',itemId:item.itemId}));stash.appendChild(row);}
    for(const item of w.storage){const row=createElement('div','v4-stock-row');row.append(createElement('span','',`${item.name} ×${item.quantity}${item.charges!==undefined?` · ${item.charges} charges in open kit`:''}`),v4Button('Retrieve 1',{type:'retrieve',itemId:item.itemId}));stash.appendChild(row);}
    const record=v4Section(root,'record','Reputation, consequences & advancement roadmap');record.appendChild(createElement('p','',Object.entries(w.reputation).map(([id,n])=>`${titleCase(id)}: ${n}`).join(' · ')));
    for(const q of w.completed)record.appendChild(createElement('p','',`${q.name}: ${q.quality} · ${q.xp} XP · ${q.gold} gold.`));for(const a of p.advancements)record.appendChild(createElement('p','',`Level ${a.level} — ${a.name} (${a.status}). ${a.requirement}`));
  }
  if(w.merchant){const m=w.merchant;const section=v4Section(root,'merchant',`${m.name} — ${m.role}`,`${m.personality} ${m.offer}`);section.append(v4Button('Bargain once · Persuasion DC 13',{type:'bargain'},m.bargained));if(m.id==='caravan')section.append(v4Button('Help repair the wagon · 2 HP each, one day',{type:'merchant-favor'},m.favorDone));if(m.id==='relic')section.append(v4Button('Barter: ward fragment + 30 gold → Wayfarer Boots',{type:'barter'},m.bartered||hero.gold<30||!view.inventory.some(i=>i.id==='ward-fragment')));v4Shop(section,m.stock,'merchant');
    const sell=v4Section(section,'merchant-sell','Sell spare equipment');for(const i of w.sellable)sell.appendChild(v4Button(`Sell ${i.name} · ${i.sellPrice} gold`,{type:'sell',market:'merchant',itemId:i.itemId,quantity:1},i.partial));}
  if(!w.town&&!w.merchant&&!w.campaignComplete)root.appendChild(createElement('p','muted','Use the story approaches below. You can return to town between encounters; discoveries, completed checks and merchant stock persist.'));
}
