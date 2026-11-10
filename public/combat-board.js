/* Step 3: one-screen combat board. Presentation only.
 * The engine still supplies every fighter, action, target and hit chance, and the same
 * {type:'combat', actionId, targetId} actions are sent. This file only lays them out:
 * turn order strip, enemies and party as cards with health bars, compact actions, and
 * the latest result beside the board. Picking a target happens on the cards, not in a pop-up. */
(function(){
 'use strict';
 const A=window.BriarwatchAdventure,byId=id=>document.getElementById(id);
 if(!A||!byId('combatPanel')||!byId('narrationCard')||!byId('adventureScroll'))return;
 const el=(tag,cls,text)=>createElement(tag,cls,text);
 const panel=dom.combatPanel,actionsBox=dom.combatActions,narration=byId('narrationCard'),storyCard=narration.parentElement;
 document.body.classList.add('combat-board-ui');
 const order=el('ol','combat-order');order.id='combatOrder';order.setAttribute('aria-label','Turn order');
 const label=(text,extra)=>{const row=el('div','combat-label');row.append(el('span','side-h',text));if(extra)row.append(extra);return row;};
 const enemies=el('div','fighter-row');enemies.id='combatEnemies';
 const party=el('div','fighter-row');party.id='combatParty';
 const hint=el('span','combat-hint');hint.id='combatHint';hint.setAttribute('role','status');
 const main=el('div','combat-main'),log=el('aside','combat-log'),columns=el('div','combat-columns');
 log.id='combatLog';log.setAttribute('aria-label','What just happened');log.append(el('span','side-h','What just happened'));
 main.append(label('Enemies',hint),enemies,label('Your party'),party,byId('combatObjective'),label('Your turn',dom.turnEconomy),actionsBox);
 columns.append(main,log);dom.initiativeTrack.after(order,columns);
 let armed=null;
 const targeted=a=>Boolean(a&&!a.disabled&&['enemy','ally'].includes(a.targetKind)&&a.targets?.length);
 function armedAction(){
  const actions=view.combat?.actions||[];
  let a=actions.find(x=>x.id===armed&&targeted(x));
  // Nothing picked yet: your weapon is ready, so an enemy can be attacked with one tap.
  if(!a){a=actions.find(x=>x.id==='weapon-attack'&&targeted(x))||null;armed=a?a.id:null;}
  return a;
 }
 function card(actor,action){
  const target=action?.targets?.find(t=>t.id===actor.id&&!t.disabled),down=actor.hp<=0;
  const ratio=actor.maxHp?Math.max(0,Math.min(1,actor.hp/actor.maxHp)):0;
  const c=el(target?'button':'div',`fighter-card ${actor.team==='enemy'?'enemy':'party'}`);
  if(actor.current)c.classList.add('is-current');if(down)c.classList.add('is-down');
  c.dataset.fighterId=actor.id;c.dataset.health=down?'down':ratio<=.5?'hurt':'ok';
  const top=el('span','fighter-line');top.append(el('strong','',actor.name),el('small','',down?'Down':`${actor.hp} / ${actor.maxHp}`));
  const bar=el('span','fighter-bar'),fill=el('span');fill.style.width=Math.round(ratio*100)+'%';bar.append(fill);
  const foot=el('span','fighter-line');foot.append(el('small','',`Armour ${actor.ac}`));
  if(target)foot.append(el('span','fighter-pill',Number.isFinite(target.probability)?`${target.probability}% to hit`:action.name.replace(/^Order: /,'')));
  c.append(top,bar,foot);
  // Short names on the card; the full wording with its expiry is the tooltip.
  const notes=(actor.conditions||[]).map(x=>x.name||conditionLabel(x));if(actor.unconscious&&!down)notes.push('Unconscious');if(actor.temporaryHp>0)notes.push(`+${actor.temporaryHp} temporary`);
  if(notes.length){const n=el('small','fighter-notes',notes.join(' · '));n.title=(actor.conditions||[]).map(x=>conditionLabel(x)).join(' · ');c.append(n);}
  if(target){
   c.type='button';c.dataset.actionId=action.id;c.dataset.targetId=actor.id;c.dataset.did=`${action.name.replace(/^Order: /,'')} · ${actor.name}`;
   c.dataset.disabled='false';c.disabled=busy;
   c.setAttribute('aria-label',`${action.name} on ${actor.name}, ${actor.hp} of ${actor.maxHp} hit points${Number.isFinite(target.probability)?`, ${target.probability}% to hit`:''}`);
   c.addEventListener('click',()=>{if(!busy)void sendAction({type:'combat',actionId:action.id,targetId:actor.id});});
  }
  return c;
 }
 function draw(){
  const combat=view?.combat;if(!combat?.active)return;
  const action=armedAction();
  order.replaceChildren(...combat.actors.map(a=>{
   const t=el('li',`order-token ${a.team==='enemy'?'enemy':'party'}`,a.current?(a.id==='player'?`${a.name} · your turn`:`${a.name} · acting`):a.name);
   if(a.current){t.classList.add('is-current');t.setAttribute('aria-current','true');}if(a.hp<=0)t.classList.add('is-down');return t;}));
  enemies.replaceChildren(...combat.actors.filter(a=>a.team==='enemy').map(a=>card(a,action?.targetKind==='enemy'?action:null)));
  party.replaceChildren(...combat.actors.filter(a=>a.team!=='enemy').map(a=>card(a,action?.targetKind==='ally'?action:null)));
  for(const b of actionsBox.querySelectorAll('button[data-action-id]')){
   const info=combat.actions.find(a=>a.id===b.dataset.actionId),on=Boolean(action&&b.dataset.actionId===action.id);
   b.classList.toggle('is-armed',on);if(targeted(info)&&info.targets.length>1)b.setAttribute('aria-pressed',String(on));else b.removeAttribute('aria-pressed');
  }
  const name=action?.name.replace(/^Order: /,'');
  hint.textContent=!combat.awaitingPlayer?'Other turns are playing out.':action?(action.targetKind==='enemy'?`Tap an enemy to use ${name}.`:`Tap a party member to use ${name}.`):'Choose an action below.';
 }
 // A targeted action with several targets is armed on the board instead of opening the pop-up.
 const baseChoose=chooseCombatAction;
 chooseCombatAction=function(action){
  if(targeted(action)&&action.targets.length>1){armed=action.id;draw();return;}
  return baseChoose(action);
 };
 const baseRender=renderCombat;
 renderCombat=function(){
  baseRender();
  const active=Boolean(view?.combat?.active);
  document.body.classList.toggle('in-combat',active);
  // During a fight the latest result sits beside the board; afterwards it returns to the story.
  if(active&&narration.parentElement!==log)log.append(narration);
  else if(!active&&narration.parentElement!==storyCard)storyCard.append(narration);
  if(!active){armed=null;return;}
  for(const b of actionsBox.querySelectorAll('button[data-action-id]')){
   const strong=b.querySelector('strong'),text=b.querySelector('p');
   if(strong)strong.textContent=strong.textContent.replace(/^Order: /,'');
   if(text)b.title=text.textContent;
  }
  // Orders, End Turn and Retreat form one footer row. Retreat stays the last button.
  const orders=actionsBox.querySelector('[data-combat-group=party]'),turn=actionsBox.querySelector('[data-combat-group=turn]');
  if(orders||turn){const foot=el('div','combat-footer');if(orders){orders.querySelector('h3').textContent='Orders';foot.append(orders);}if(turn)foot.append(turn);actionsBox.append(foot);}
  draw();
 };
 window.BriarwatchCombatBoard={draw,armed:()=>armed};
 if(state&&view)renderGame();
})();
