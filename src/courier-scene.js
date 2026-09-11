'use strict';
// A bounded, optional interactive scenario. The model chooses an approach, never
// a DC, reward, item, story flag or dice result. All routes are also playable offline.
const M=require('./chat-memory');
const R=require('./rules');
const TITLE='The Courier at the Ferry';
const OPENING='At Briarwatch’s ferry, a courier is being held over a disputed toll. A ledger lies on the desk, a ferryman watches the quay, and a guard blocks the gangway. You can investigate, negotiate, distract the guard, or find a practical way to help. This is an optional side story; the original campaign remains available.';
function available(state){return !state.combat?.active && ['briarwatch-square','town-briarwatch'].includes(state.story.nodeId);}
function options(state,api){
  const c=M.ensure(state).courier;
  if(!c?.active||c.resolved||!available(state))return [];
  const definitions=[
    {id:'ledger',label:'Inspect the toll ledger',skill:'investigation',dc:10,detail:'Look for a discrepancy. Failure alerts the guard but still reveals that the ferryman saw the dispute.'},
    {id:'ferryman',label:'Ask the ferryman for testimony',skill:'persuasion',dc:10,detail:'Seek a witness, not a free reward. Failure reveals a route to request civic help.'},
    {id:'distract',label:'Distract the guard while the party prepares',skill:'deception',dc:12,detail:'One step only: a distraction does not also release the courier. Failure makes the later rescue harder.'},
    {id:'negotiate',label:'Challenge the toll and ask for the courier’s release',skill:'persuasion',dc:(c.clue?9:c.rapport?11:13),detail:'Evidence or testimony improves the attempt. Failure leaves a civic-help route open.'},
    {id:'rope',label:'Use your rope to help the courier past the blocked gangway',skill:'athletics',dc:12,tools:['silk-rope'],detail:'Requires an owned rope; the guard must already be distracted. Failure costs up to 2 HP, never a life, and leaves civic help available.'},
    {id:'aid',label:'Request civic assistance and wait for a lawful release',detail:'No roll. A slower resolution earns 40 XP and no gold; the courier is still helped.'}
  ];
  return definitions.filter(d=>!c.attempted.includes(d.id) && (d.id!=='rope'||(c.distraction&&api.hasItem(state,'silk-rope'))))
    .map(d=>{const plan=d.skill?api.checkPlan(state,{check:{skill:d.skill,dc:d.dc+(c.setbacks>1?1:0),tools:d.tools}}):null;
      return {...d,plan,description:plan?`${d.detail} ${plan.skillId}: d20 ${R.formatSigned(plan.bonus)} vs DC ${plan.dc}${plan.advantage?' with advantage':''}${plan.disadvantage?' with disadvantage':''}.` : d.detail};});
}
function apply(state,id,rng,events,api){
  const memory=M.ensure(state);
  if(id==='start'){
    if(!available(state))return {ok:false,error:'Start the courier side story in Briarwatch, outside combat.'};
    if(memory.courier?.resolved)return {ok:false,error:'This side story is already resolved. Its reward cannot be collected twice.'};
    if(!memory.courier)memory.courier={active:true,resolved:false,clue:false,rapport:false,distraction:false,setbacks:0,attempted:[],facts:[]};
    else memory.courier.active=true;
    memory.pending=null;events.push({type:'story',text:OPENING});
    return {ok:true,kind:'chat',outcomeText:OPENING};
  }
  if(id==='pause'){
    if(memory.courier)memory.courier.active=false;
    memory.pending=null;return {ok:true,kind:'chat',outcomeText:'Courier side story paused. Its discoveries are retained; use Start courier scenario in Briarwatch to resume.'};
  }
  const choice=options(state,api).find(o=>o.id===id);
  if(!choice)return {ok:false,error:'That courier approach is unavailable or already attempted. Nothing was spent.'};
  const c=memory.courier; c.attempted.push(id);
  let success=true;
  if(choice.plan){
    const p=choice.plan,roll=R.rollD20(rng,p);success=roll.natural+p.bonus>=p.dc;
    if(p.usesInspiration){state.player.inspiration=Math.max(0,state.player.inspiration-1);state.player.inspirationPrepared=false;}
    if(p.usesCloak)state.player.used.cloakReady=false;
    events.push({type:'roll',text:`${choice.label}: ${roll.rolls.join('/')} ${R.formatSigned(p.bonus)} = ${roll.natural+p.bonus} vs DC ${p.dc}: ${success?'success':'setback'}.`});
  }
  let line='';
  if(id==='ledger'){c.clue=success;line=success?'The ledger charges the courier twice for the same crossing. That discrepancy is now established evidence.':'The guard closes the ledger. The ferryman confirms he witnessed the dispute; questioning him or requesting civic help remains possible.';}
  if(id==='ferryman'){c.rapport=success;line=success?'The ferryman agrees to testify that the courier already paid. His testimony strengthens your case.':'The ferryman refuses to confront the guard, but points out the civic office. Help remains available without a bribe.';}
  if(id==='distract'){c.distraction=success;line=success?'The guard turns to your distraction. The party has a brief opening, but the courier has not yet been released.':'The guard notices the ruse and stays by the gangway. The courier remains safe; another approach is needed.';}
  const resolved=id==='aid'||(['negotiate','rope'].includes(id)&&success);
  if(id==='negotiate'&&!success)line='The guard refuses your appeal. The courier remains held; civic assistance will secure a release without repeating this roll.';
  if(id==='rope'&&!success){const before=state.player.hp;state.player.hp=Math.max(1,state.player.hp-2);line=`The rope slips against wet timber. You lose ${before-state.player.hp} HP, but the party prevents a fatal fall. Civic assistance remains available.`;}
  if(!success)c.setbacks++;
  if(resolved){
    c.resolved=true;c.active=false;
    const xp=id==='aid'?40:80,gold=id==='aid'?0:20;
    line=id==='aid'?'A civic official resolves the duplicate toll. The courier leaves safely, after a delay.':'Your plan secures the courier’s release. The ferryman records the disputed toll and the courier thanks the party.';
    state.player.gold+=gold;api.awardXp(state,xp,events,TITLE);
    state.story.flags.courierHelped=true;
    state.world.reputation.trade=Math.min(20,state.world.reputation.trade+1);
    events.push({type:'reward',text:`Courier resolved once: ${xp} XP, ${gold} gold, and +1 trade reputation.`});
  }
  c.facts.push(line);c.facts=c.facts.slice(-12);memory.pending=null;
  events.push({type:'story',text:line});return {ok:true,kind:'chat',outcomeText:line};
}
module.exports={TITLE,OPENING,available,options,apply};
