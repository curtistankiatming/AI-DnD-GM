/* Batch 3: project public state into management controls. No new game rules. */
(function(){
 'use strict';
 const M=window.BriarwatchManagementView,A=window.BriarwatchAdventure;
 if(!M||!A)return;
 const $id=id=>document.getElementById(id),el=(tag,cls,text)=>createElement(tag,cls,text);
 const button=(text,fn,readOnly=true)=>{const b=el('button','btn btn-secondary btn-small',text);b.type='button';b.dataset.readOnly=String(readOnly);b.addEventListener('click',fn);return b;};
 document.body.classList.add('management-workspace');
 let actorId='player',identity='',prepareFilter='all',specializing=false;
 const gearLabel=el('label','management-field','Equipment owner '),actorSelect=el('select');actorSelect.id='equipmentOwner';actorSelect.dataset.readOnly='true';gearLabel.append(actorSelect);dom.equipmentSlots.before(gearLabel);
 const gearStatus=el('p','muted');gearStatus.id='equipmentOwnerStatus';gearLabel.after(gearStatus);
 actorSelect.addEventListener('change',()=>{actorId=actorSelect.value;renderEquipment();});
 const filterBox=el('div','inventory-filter-bar');filterBox.id='inventoryFilters';
 function field(label,id,type){const l=el('label','management-field',label),n=el(type==='select'?'select':'input');if(type!=='select')n.type=type;n.id=id;n.dataset.readOnly='true';l.append(n);filterBox.append(l);return n;}
 const search=field('Search pack','inventorySearch','search');search.maxLength=160;
 const group=field('Category','inventoryCategory','select');
 for(const [id,name]of [['all','All items'],['equipment','Equipment'],['consumables','Consumables'],['tools','Tools'],['materials','Materials'],['quest','Quest objects'],['other','Other']]){const o=el('option','',name);o.value=id;group.append(o);}
 const spare=field('Spare copies only','inventorySpare','checkbox');
 const count=el('p','muted');count.id='inventoryFilterCount';count.setAttribute('role','status');
 const reset=button('Reset filters',()=>{search.value='';group.value='all';spare.checked=false;applyFilter();});reset.id='inventoryFilterReset';filterBox.append(reset,count);dom.inventoryCards.before(filterBox);
 for(const n of [search,group,spare])n.addEventListener(n===search?'input':'change',applyFilter);
 function applyFilter(){if(!view)return;const ids=new Set(M.filter(view,search.value,group.value,spare.checked).map(i=>i.id));for(const card of dom.inventoryCards.children)card.hidden=!ids.has(card.dataset.inventoryId);count.textContent=`${ids.size} of ${view.inventory.length} item types shown.${ids.size?'':' No matching items. Reset filters to see the full pack.'}`;}
 function table(c){const t=el('table','gear-comparison');t.append(el('caption','',`${c.name}: ${c.replaces} → selected item`));const head=el('thead'),row=el('tr');for(const title of ['Statistic','Now','With item','Change']){const h=el('th','',title);h.scope='col';row.append(h);}head.append(row);t.append(head);const body=el('tbody');
  for(const r of M.comparison(c)){const tr=el('tr'),h=el('th','',r.label);h.scope='row';tr.append(h);for(const value of [r.before,r.after,r.change===null?'—':r.change>0?'+'+r.change:String(r.change)])tr.append(el('td','',value===null?'Not supplied':String(value)));body.append(tr);}t.append(body);return t;
 }
 function compare(item){const previous=document.activeElement,d=el('dialog','management-dialog');d.id='equipmentComparisonDialog';const title=el('h2','',item.name);title.id='equipmentComparisonTitle';d.setAttribute('aria-labelledby',title.id);d.append(title,el('p','',item.purpose),el('p','muted','Read-only comparison. Damage formulas are shown as supplied, not ranked by a guessed average.'));
  const picker=el('select');picker.id='comparisonOwner';picker.dataset.readOnly='true';picker.setAttribute('aria-label','Compare for party member');for(const c of item.comparisons){const o=el('option','',c.name);o.value=c.actorId;picker.append(o);}picker.value=item.comparisons.some(c=>c.actorId===actorId)?actorId:item.comparisons[0]?.actorId;
  const content=el('div');const draw=()=>{clear(content);const c=item.comparisons.find(c=>c.actorId===picker.value);if(!c)return;content.append(table(c));if(c.clearsOffHand)content.append(el('p','tag tag-warning','Two-handed: removes the off-hand item.'));if(c.blocked)content.append(el('p','tag tag-warning',c.blocked));content.append(el('p','muted',`${item.available} spare copies. Assigned copies are not duplicated or automatically transferred.`));};picker.addEventListener('change',draw);d.append(picker,content);
  const close=button('Close comparison',()=>d.close());close.dataset.keepEnabled='true';close.autofocus=true;d.append(close);d.addEventListener('close',()=>{d.remove();if(previous?.isConnected&&!previous.disabled)previous.focus();},{once:true});document.body.append(d);draw();d.showModal();close.focus();
 }
 renderEquipment=function(){
  if(!view)return;const members=M.members(view);if(!members.some(a=>a.id===actorId))actorId='player';
  const key=members.map(a=>a.id+':'+a.name).join('|');if(actorSelect.dataset.members!==key){clear(actorSelect);for(const a of members){const o=el('option','',a.name);o.value=a.id;actorSelect.append(o);}actorSelect.dataset.members=key;}actorSelect.value=actorId;
  const actor=members.find(a=>a.id===actorId);gearStatus.textContent=`${actor?.name||'Party member'} · HP ${actor?.hp}/${actor?.maxHp} · AC ${actor?.ac}. Equipment changes are unavailable during combat or a model wait.`;
  clear(dom.equipmentSlots);for(const slot of M.slots(view,actorId)){const card=el('div','equipment-slot');card.dataset.owner=actorId;card.dataset.slot=slot.slot;card.append(el('span','muted',slot.label),el('strong','',slot.item?.name||'Empty'));
   if(slot.item){card.append(el('p','',slot.item.purpose));const id=actorId,b=button('Unequip',()=>{if(!busy&&!view.combat?.active)void sendAction({type:'unequip',actorId:id,slot:slot.slot});},false);b.dataset.disabled=String(Boolean(view.combat?.active));b.disabled=busy||Boolean(view.combat?.active);card.append(b);}dom.equipmentSlots.append(card);
  }
 };
 const baseInventory=renderInventory;
 renderInventory=function(){baseInventory();const sorted=[...view.inventory].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));[...dom.inventoryCards.children].forEach((card,i)=>{const item=sorted[i];if(!item)return;card.dataset.inventoryId=item.id;card.append(el('p','item-usage',M.usage(item)));const owners=M.owners(view,item.id);card.append(el('p','item-owners',owners.length?'Owned by: '+owners.map(a=>`${a.name} (${a.label})`).join('; '):'No equipped owner.'));
   if(item.comparisons?.length){const b=button('Compare stats',()=>compare(item));b.dataset.compareItem=item.id;card.querySelector('.inventory-actions').append(b);}
  });applyFilter();
 };
 const chooseOwner=chooseEquipmentOwner;
 chooseEquipmentOwner=function(item){chooseOwner(item);for(const b of dom.targetOptions.querySelectorAll('[data-target-id]')){const c=item.comparisons.find(c=>c.actorId===b.dataset.targetId);if(!c)continue;b.querySelector('p')?.remove();b.append(table(c));if(c.clearsOffHand)b.append(el('p','tag tag-warning','Two-handed: removes the off-hand item.'));if(c.blocked)b.append(el('p','tag tag-warning',c.blocked));if(item.available<1)b.append(el('p','muted','No spare copy. Unequip its current owner first.'));}};
 const readiness=el('section','management-card');readiness.id='readinessPanel';const readinessTitle=el('h2','','Before you depart'),readyBody=el('div');readiness.append(readinessTitle,el('p','muted','Last confirmed state, not a win probability. Preparation is optional; this does not reveal undiscovered threats.'),readyBody);$id('workspace-prepare').prepend(readiness);
 const progress=el('details','management-card');progress.id='developmentOverview';progress.append(el('summary','','Your development — earned, next and pending'));const progressBody=el('div');progress.append(progressBody);readiness.after(progress);
 const serviceNav=el('div','management-tabs');serviceNav.id='preparationCategories';serviceNav.setAttribute('role','group');serviceNav.setAttribute('aria-label','Preparation category');
 for(const [id,name]of [['all','All services'],['services','Rest'],['shop','Supplies'],['smith','Smith'],['personal','Companions'],['expedition','Expeditions'],['storage','Storage']]){const b=button(name,()=>{prepareFilter=id;filterPrepare();});b.dataset.prepareCategory=id;serviceNav.append(b);}progress.after(serviceNav);
 function filterPrepare(){for(const b of serviceNav.children)b.setAttribute('aria-pressed',String(b.dataset.prepareCategory===prepareFilter));for(const d of $id('worldPanel').querySelectorAll(':scope > details[data-section]'))d.hidden=prepareFilter!=='all'&&d.dataset.section!==prepareFilter;}
 function managementSync(){if(!state||!view)return;const key=JSON.stringify([state.createdAt,state.player.name,state.publicTest?.mode]);if(key!==identity){identity=key;actorId='player';search.value='';group.value='all';spare.checked=false;prepareFilter='all';renderEquipment();applyFilter();}
  // The older expansion renderer repositions this node in Adventure each render.
  // Keep its original handlers, but restore Batch2's single Prepare destination.
  serviceNav.after($id('worldPanel'));filterPrepare();
  clear(readyBody);for(const line of M.readiness(view))readyBody.append(el('p','readiness-line',line));
  clear(progressBody);progressBody.append(el('p','',`Level ${view.player.level} · ${view.player.xp} XP. Next: ${view.progression.nextReward}`));
  if(view.progression.pending.length||view.progression.specializationOptions.length)progressBody.append(button('Review pending choices',()=>{$id('progressionPanel').scrollIntoView({block:'start'});}));
  for(const reward of view.progression.rewards){const row=el('p','');row.append(el('strong','',`Level ${reward.level} · ${reward.reached?'Reached':'Ahead'}: `),document.createTextNode(reward.description));progressBody.append(row);}
  const abilities=el('details');abilities.append(el('summary','','Your current abilities — use combat controls during initiative'));for(const a of view.progression.techniques||[])abilities.append(el('p','',`${a.name}: ${a.description}`));progressBody.append(abilities,el('p','muted','Level-30 and level-70 advancements are future plans, not available rewards.'));
  for(const [i,member]of view.party.entries()){const card=dom.partyCards.children[i];if(!card)continue;card.querySelector('.companion-contribution')?.remove();const text=M.contribution(member,eventHistory);card.append(el('p','companion-contribution',text?'Recent confirmed contribution: '+text:'No attributable contribution in the current mechanics feed. This is not a claim that the companion did nothing.'));}
 }
 const combatRender=renderCombat;
 renderCombat=function(){combatRender();if(!view.combat?.active)return;const buttons=[...dom.combatActions.querySelectorAll('button[data-action-id]')];if(!buttons.length)return;const groups={};for(const [id,title]of [['turn','Turn & recovery'],['objectives','Encounter objective'],['attacks','Attacks & defense'],['abilities','Class abilities'],['items','Items'],['party','Party orders & combinations']]){const s=el('section','combat-group');s.dataset.combatGroup=id;s.append(el('h3','',title));groups[id]=s;}
  for(const b of buttons){const g=M.actionGroup(b.dataset.actionId);groups[g].append(b);}clear(dom.combatActions);for(const s of Object.values(groups))if(s.children.length>1)dom.combatActions.append(s);
 };
 const baseSend=sendAction;
 sendAction=async function(action){if(action?.type!=='specialize')return baseSend(action);if(specializing||busy||view.combat?.active)return;const option=view.progression.specializationOptions.find(s=>s.id===action.specializationId);if(!option)return baseSend(action);
  specializing=true;const before=state;try{const choice=await askSessionDecision({title:'Confirm permanent advancement',message:`${option.name}\n\n${option.description}\n\nThis choice is permanent for this save. Cancel keeps all choices available.`,choices:[['cancel','Keep deciding'],['confirm','Choose '+option.name]]});if(choice==='confirm'&&!busy&&state===before&&view.progression.specializationOptions.some(s=>s.id===action.specializationId))return await baseSend(action);}finally{specializing=false;}
 };
 const oldRender=renderGame;renderGame=function(){oldRender();managementSync();A.sync();};
 dom.clearEventsBtn?.addEventListener('click',managementSync);
 window.BriarwatchManagement={refresh:managementSync};if(state&&view){renderInventory();managementSync();}
})();
