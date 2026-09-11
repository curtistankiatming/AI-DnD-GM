'use strict';
const M=require('./chat-memory');
const S=require('./road-state');
const R=require('./rules');
const TITLE='Lantern Road: A Promise in the Rain';
const NODES={
  wagon:{id:'lantern-road-wagon',title:'A Wheel in the Mud',location:'Briarwatch east gate',objective:'Get Tamsin’s medicine wagon moving. Decide whether to carry her sealed letter.',opening:'Tamsin Reed kneels beside a broken wagon wheel. Medicine for the old mill infirmary is packed under a tarpaulin. She can lend a repair tool, hire a wheelwright for 8 gold, or wait for the civic crew. A sealed letter rests in her hand. The delivery is urgent, but taking the slower route never blocks the adventure.'},
  crossing:{id:'lantern-road-crossing',title:'The Flooded Mill Crossing',location:'Lantern Brook',objective:'Find a safe crossing for the medicine. Earlier repairs and Tamsin’s trust affect your options.',opening:'Lantern Brook has risen over the stepping stones. A narrow ferry strains against its mooring; upstream posts could anchor a rope. Tamsin keeps the medicine above the water. You can study the current, rig a crossing with your own rope, negotiate passage, or wait for a public raft.'},
  infirmary:{id:'lantern-road-infirmary',title:'The Infirmary Door',location:'Old mill infirmary',objective:'Deliver the medicine and settle your promise. Medical help is optional.',opening:'Sister Iona opens the mill door. Dry benches and patients wait inside. The medicine has arrived at the infirmary; you must still hand it over. If you accepted Tamsin’s letter, its seal and your promise now matter. You may help sort the supplies before reporting the delivery.'}
};
function register(nodes){for(const n of Object.values(NODES))nodes[n.id]={...n,act:TITLE,sideStory:true,safeRest:false,choices:[]};}
function current(state){return M.ensure(state).road;}
function home(state){return !state.combat?.active&&['briarwatch-square','town-briarwatch'].includes(state.story.nodeId);}
function present(state){const r=current(state);return Boolean(r?.active&&!state.combat?.active&&NODES[r.phase]?.id===state.story.nodeId);}
function readyHelper(state,id){const p=state.party.find(x=>x.id===id);return Boolean(p&&p.hp>0&&!p.conditions.some(c=>c.id==='stunned'||c.id==='unconscious'));}
function facts(state){
  const r=current(state);if(!r)return [];
  const out=[];
  if(r.rumorHeard)out.push(r.axleKnown?'Verified: the axle failed through old wood-rot. The roadside bandit rumor is disproved for this wagon.':'Unverified rumor: a bystander blamed bandits for the damaged wagon. No evidence establishes that claim.');
  else if(r.axleKnown)out.push('Verified: old wood-rot, not a blade cut, caused this axle failure.');
  if(r.wagon!=='blocked')out.push(`The wagon is mobile (${r.wagon}).`);
  if(r.riverKnown)out.push('Verified: upstream posts are sound and the quiet eddy offers a safer rope route.');
  if(r.crossing!=='blocked')out.push(`Medicine crossed by ${r.crossing}.`);
  if(r.promise!=='none')out.push(`Sealed-letter promise: ${r.promise}.`);
  if(r.quality!=='pending')out.push(`Delivery completed: ${r.quality}.`);
  out.push(`Tamsin’s trust: ${r.trust}. Delay: ${r.delay} (3 or more means a delayed delivery).`);
  return out;
}
function options(state,api){
  const r=current(state);if(!r)return [];
  if(r.phase==='complete')return home(state)&&r.trust>0&&!r.cacheClaimed?[{id:'cache',label:'Collect Tamsin’s promised medicinal herbs',description:'One-time follow-up: receive one Medicinal Herbs bundle. No gold or XP is charged.'}]:[];
  if(!present(state)||r.rewardClaimed)return [];
  const o=[];
  const add=d=>{if(!r.attempted.includes(d.id))o.push(d);};
  if(r.phase==='wagon'){
    add({id:'rumor',label:'Ask Tamsin what people say happened',detail:'Hear the roadside rumor. Dialogue supplies a lead, not proof; no roll or cost.'});
      if(r.promise==='none'){
        add({id:'promise',label:'Promise to deliver Tamsin’s letter unopened',detail:'Accept a recorded promise and gain 1 trust. Breaking the seal later breaks the promise. No automatic payment.'});
        add({id:'decline',label:'Decline the sealed-letter request',detail:'No obligation or trust penalty. The medicine delivery remains available.'});
      }
    if(r.wagon==='blocked'){
      add({id:'inspect',label:'Inspect the broken axle',detail:'Investigation DC 10. Success identifies the cause and lowers repair DC by 2; failure costs one delay but leaves repair and civic help available.',skill:'investigation',dc:10});
      add({id:'repair',label:'Repair the wagon in exchange for help at the crossing',detail:`One repair attempt, using Tamsin’s loaned tools. ${readyHelper(state,'orin')?'Orin can brace the axle; DC reduced by 1. ':''}Success earns 1 trust and makes departure available; failure adds one delay. No gold is spent.`,skill:'athletics',dc:12-(r.axleKnown?2:0)-(readyHelper(state,'orin')?1:0)});
      if(state.player.gold>=8)add({id:'pay-repair',label:'Pay a wheelwright 8 gold',detail:'Guaranteed repair, exactly 8 gold. No trust gain; choose this instead of taking a skill risk.',gold:8});
      add({id:'crew-repair',label:'Wait for the civic repair crew',detail:'Guaranteed repair, free. Adds 2 delay. No repeating rolls and no money required.'});
    }else add({id:'depart',label:'Depart with the repaired medicine wagon',detail:'Travel to the crossing. No additional roll, charge or XP for this transition.'});
  }
  if(r.phase==='crossing'){
    add({id:'scout',label:'Study the current and upstream posts',detail:'Survival DC 10. Success lowers the rope-crossing DC by 2. Failure adds one delay; other routes remain available.',skill:'survival',dc:10});
    if(api.hasItem(state,'silk-rope'))add({id:'rope',label:'Rig a medicine crossing with your rope',detail:'Uses your owned rope as a reusable tool; it is not consumed. Failure costs up to 2 HP and one delay. The public raft remains available.',skill:'athletics',dc:12-(r.riverKnown?2:0),tools:['silk-rope']});
    add({id:'ferry',label:'Negotiate ferry passage for the medicine',detail:`Persuasion DC ${13-Math.max(0,r.trust)}: prior trust lowers difficulty. Success crosses free; failure adds one delay.`,skill:'persuasion',dc:13-Math.max(0,r.trust)});
    add({id:'raft',label:'Wait for the public relief raft',detail:'Guaranteed safe crossing, free. Adds 2 delay. The medicine is not lost.'});
  }
  if(r.phase==='infirmary'){
    if(r.promise==='active')add({id:'open-parcel',label:'Open the entrusted letter before delivery',detail:'Explicitly breaks your promise. Lose 2 Tamsin trust. Reading the letter is not permission to invent a secret reward.'});
    add({id:'care',label:'Help Iona sort and prepare the medicine',detail:`Medicine DC ${readyHelper(state,'maren')?9:11}. ${readyHelper(state,'maren')?'Maren’s expertise lowers DC by 2. ':''}Success earns 1 trust; failure adds one delay. Delivering remains available.`,skill:'medicine',dc:readyHelper(state,'maren')?9:11});
    add({id:'deliver',label:'Deliver the medicine and report to Iona',detail:'Complete once: 120 objective XP. Payment is 25 gold, or 15 if delay reached 3. An intact accepted letter keeps the promise and adds 1 trust. Return to Briarwatch.'});
  }
  return o.map(d=>{const plan=d.skill?api.checkPlan(state,{check:{skill:d.skill,dc:d.dc,tools:d.tools}}):null;
    return {...d,plan,description:(d.detail||d.description)+(plan?` Roll d20 ${R.formatSigned(plan.bonus)} vs DC ${plan.dc}${plan.advantage?' with advantage':''}${plan.disadvantage?' with disadvantage':''}.`:'')};});
}
function note(state,line,events){const r=current(state);r.history.push(line);r.history=r.history.slice(-24);events.push({type:'story',text:line});}
function apply(state,id,rng,events,api){
  let r=current(state);
  if(id==='start'){
    if(!home(state))return {ok:false,error:'Start or resume Lantern Road in Briarwatch, outside combat.'};
    if(r?.phase==='complete')return {ok:false,error:'Lantern Road is already completed; use the promised-supplies follow-up if available.'};
    if(!r){r=S.normalize({active:true,returnNode:state.story.nodeId,trust:state.story.flags.courierHelped?1:0});M.ensure(state).road=r;}
    r.active=true;M.ensure(state).pending=null;
    if(M.ensure(state).courier)state.chat.courier.active=false;
    api.enterNode(state,NODES[r.phase].id,events);
    const line=NODES[r.phase].opening+(state.story.flags.courierHelped&&r.history.length===0?' Tamsin has heard you helped the ferry courier and starts with 1 trust.':'');
    if(!r.history.length)note(state,line,events);
    return {ok:true,kind:'chat',outcomeText:line};
  }
  if(id==='pause'){
    if(!r||!r.active)return {ok:false,error:'No active Lantern Road journey to pause.'};
    if(state.combat?.active)return {ok:false,error:'Resolve initiative before pausing this journey.'};
    r.active=false;M.ensure(state).pending=null;api.enterNode(state,r.returnNode,events);
    return {ok:true,kind:'chat',outcomeText:'Lantern Road paused. Repairs, promises and delays are retained. Resume in Briarwatch; pausing cannot reroll an attempted check.'};
  }
  const choice=options(state,api).find(o=>o.id===id);
  if(!choice)return {ok:false,error:'That Lantern Road approach is unavailable or already attempted. Nothing was spent.'};
  if(id==='cache'){
    r.cacheClaimed=true;api.addItem(state,'herb-bundle',1,events);
    const line='Tamsin recognizes your help and gives the one promised bundle of Medicinal Herbs. This follow-up cannot be collected twice.';note(state,line,events);
    return {ok:true,kind:'chat',outcomeText:line};
  }
  r.attempted.push(id);let success=true;
  if(choice.plan){
    const p=choice.plan,roll=R.rollD20(rng,p);success=roll.natural+p.bonus>=p.dc;
    if(p.usesInspiration){state.player.inspiration=Math.max(0,state.player.inspiration-1);state.player.inspirationPrepared=false;}
    if(p.usesCloak)p.actor.used.cloakReady=false;
    events.push({type:'roll',text:`${choice.label}: ${roll.rolls.join('/')} ${R.formatSigned(p.bonus)} = ${roll.natural+p.bonus} vs DC ${p.dc}: ${success?'success':'setback'}.`});
    if(!success)r.delay=Math.min(8,r.delay+1);
  }
  let line='';
  if(id==='rumor'){r.rumorHeard=true;line=r.axleKnown?'Tamsin repeats a bandit rumor, but your inspection already established wood-rot. Do not accuse someone on that rumor.':'Tamsin says a bystander blamed bandits. She did not witness sabotage; this is an unverified lead, not established guilt.';}
  if(id==='inspect'){r.axleKnown=success;line=success?'The axle is rotten inside, with no fresh blade cut. Neglected maintenance caused this failure, disproving the bandit rumor for this wagon.':'Mud hides the fracture. You have not established the cause. One delay is added; repair or civic help remains possible.';}
  if(id==='promise'){r.promise='active';r.trust=Math.min(3,r.trust+1);line='You promise to deliver Tamsin’s sealed letter to Iona unopened. Tamsin gains 1 trust. The promise is active, not already fulfilled.';}
  if(id==='decline'){r.promise='declined';line='You decline responsibility for the sealed letter. Tamsin keeps it; you can still help the medicine wagon.';}
  if(id==='repair'){if(success){r.wagon='repaired';r.trust=Math.min(3,r.trust+1);line='The wheel holds. Tamsin accepts the repair in exchange for supporting your passage at the crossing: 1 trust gained, no gold spent.';}else line='The replacement pin bends. One delay is added; no gold is spent. Hire a wheelwright or wait for the civic crew instead of repeating the roll.';}
  if(id==='pay-repair'){state.player.gold-=8;r.wagon='hired';line='The wheelwright completes the repair for exactly 8 gold. The wagon can now depart.';events.push({type:'world',text:'Wheelwright paid: 8 gold.'});}
  if(id==='crew-repair'){r.wagon='crew';r.delay=Math.min(8,r.delay+2);line='The civic crew repairs the wheel without payment. Waiting adds 2 delay; the wagon can depart.';}
  if(id==='depart'){r.phase='crossing';api.enterNode(state,NODES.crossing.id,events);line=NODES.crossing.opening;}
  if(id==='scout'){r.riverKnown=success;line=success?'You find sound upstream posts and a quiet eddy. This verified route lowers the rope-crossing difficulty by 2.':'The current is harder to read than expected. One delay is added; the public raft remains safe.';}
  if(id==='rope'||id==='ferry'||id==='raft'){
    if(id==='raft'){r.delay=Math.min(8,r.delay+2);success=true;}
    if(success){r.crossing=id;r.phase='infirmary';api.enterNode(state,NODES.infirmary.id,events);line=`The medicine crosses by ${id}${id==='raft'?', after 2 additional delay':''}. Nothing is lost. ${NODES.infirmary.opening}`;}
    else if(id==='rope'){const loss=Math.min(2,Math.max(0,state.player.hp-1));state.player.hp-=loss;line=`The first anchoring attempt slips. You lose ${loss} HP and add one delay; the rope remains yours. Negotiate passage or wait for the public raft.`;}
    else line='The ferryman refuses the proposed passage. One delay is added. The public relief raft is free and remains available.';
  }
  if(id==='open-parcel'){r.promise='broken';r.trust=Math.max(-2,r.trust-2);line='You break the seal against your promise. The letter requests ordinary supplies; it grants no secret reward. Tamsin loses 2 trust, and the broken promise will be reported.';}
  if(id==='care'){r.care=success?'aided':'setback';if(success)r.trust=Math.min(3,r.trust+1);line=success?'You help Iona prepare the medicine safely. Tamsin gains 1 trust; the delivery still needs to be reported.':'Iona corrects the labels herself. One delay is added, but no patient is harmed and the delivery remains possible.';}
  if(id==='deliver'){
    if(r.promise==='active'){r.promise='kept';r.trust=Math.min(3,r.trust+1);}
    r.quality=r.delay>=3?'delayed':'timely';r.phase='complete';r.active=false;r.rewardClaimed=true;
    const gold=r.quality==='timely'?25:15;state.player.gold+=gold;api.awardXp(state,120,events,TITLE);
    state.world.reputation.trade=Math.min(20,state.world.reputation.trade+(r.trust>0?1:0));
    state.story.flags.lanternRoadDelivered=true;
    api.enterNode(state,r.returnNode,events);
    line=`Iona accepts the ${r.quality} medicine delivery. You earn 120 XP and ${gold} gold once. Letter promise: ${r.promise}. Tamsin’s trust: ${r.trust}.${r.trust>0?' Trade reputation rises by 1; Tamsin offers one bundle of herbs on your return.':' No trust-based supply gift is available.'} You return to Briarwatch.`;
    events.push({type:'reward',text:`Lantern Road completed once: 120 XP and ${gold} gold.`});
  }
  M.ensure(state).pending=null;note(state,line,events);
  return {ok:true,kind:'chat',outcomeText:line};
}
function infer(text,state,api){
  // A deliberately small offline grammar. Ambiguity never silently chooses a route.
  if(!present(state))return null;
  const input=String(text).toLowerCase();
  if(/\b(and|then|while)\b/.test(input))return {clarify:'Describe one step first. A distraction, repair and departure are separate actions.'};
  if(/\b(not|never|don’t|don't|cannot|can’t|can't)\b/.test(input)||/^(can|could|should|would|what|how)\b/.test(input)||input.endsWith('?'))return {clarify:'Is this a question, or an action you want to attempt? Choose a visible approach or use Question mode. Nothing has happened yet.'};
  const matches=[];const offered=options(state,api);
  const rules={repair:/\b(repair|fix|mend)\b.*\b(wagon|wheel|axle)\b/,inspect:/\b(inspect|examine|investigate)\b.*\b(axle|wheel|wagon)\b/,promise:/\b(promise|agree)\b.*\b(letter|sealed|unopened)\b/,rope:/\b(rope)\b.*\b(cross|anchor|rig|medicine)\b|\b(rig|cross|anchor)\b.*\brope\b/,ferry:/\b(negotiate|persuade|bargain)\b.*\b(ferry|ferryman|passage)\b/,deliver:/\b(deliver|hand over)\b.*\b(medicine|supplies)\b/,scout:/\b(study|inspect|scout)\b.*\b(current|river|posts)\b/};
  for(const [id,re]of Object.entries(rules))if(re.test(input)&&offered.some(o=>o.id===id))matches.push(id);
  if(matches.length===1)return {optionId:'road:'+matches[0]};
  if(matches.length>1)return {clarify:'That could mean more than one approach. Choose the single step you want to confirm.'};
  return null;
}
function answer(state,text){
  const r=current(state);if(!r)return null;
  const q=String(text).toLowerCase();
  if(/promise|letter|trust|bandit|rumor|axle|happen|remember/.test(q))return facts(state).join(' ');
  if(present(state))return `${NODES[r.phase].objective} ${r.delay} delay accumulated; 3 or more means reduced delivery payment, not a blocked quest. All visible approaches show their actual costs before confirmation.`;
  return r.phase==='complete'?`Lantern Road is complete. ${facts(state).join(' ')}`:null;
}
function view(state,api){const r=current(state);return r?{...r,title:TITLE,facts:facts(state),present:present(state),options:options(state,api).map(({id,label,description})=>({id,label,description}))}:null;}
module.exports={TITLE,NODES,register,home,present,facts,options,apply,infer,answer,view};
