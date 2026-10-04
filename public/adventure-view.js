/* Pure UI policies. No engine, network, provider or save-state mutations. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.BriarwatchView=factory();
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const MODES={
  action:{id:'action',label:'Act',readOnly:false,help:'Describe one action. An interpreted proposal needs your confirmation before it changes the game.'},
  dialogue:{id:'dialogue',label:'Say',readOnly:true,help:'Speak in character. Dialogue cannot spend resources or execute a proposed action.'},
  question:{id:'question',label:'Ask',readOnly:true,help:'Ask about the world or rules. Questions are read-only; uncertain claims remain uncertain.'}
 };
 const SECTIONS=['adventure','party','journal','prepare','settings'];
 const FILTERS={all:null,leads:['leads'],evidence:['facts','rumors'],promises:['promises'],people:['relationships'],notes:['notes'],completed:['completed']};
 function mode(id){return {...(Object.hasOwn(MODES,id)?MODES[id]:MODES.action)};}
 function section(id){return SECTIONS.includes(id)?id:id==='inventory'?'party':id==='saves'?'settings':'adventure';}
 function nextIndex(key,i,n){return key==='Home'?0:key==='End'?n-1:key==='ArrowRight'?(i+1)%n:key==='ArrowLeft'?(i+n-1)%n:null;}
 function showGroup(filter,group){const set=Object.hasOwn(FILTERS,filter)?FILTERS[filter]:null;return set===null||set.includes(group);}
 function duplicateLast(rows,latest){const i=rows.length-1;return latest&&i>=0&&['guide','rules'].includes(rows[i].role)&&rows[i].text===latest?i:-1;}
 function nearEnd(el){return el.scrollHeight-el.clientHeight-el.scrollTop<72;}
 function readingSize(x){return ['normal','large','larger'].includes(x)?x:'normal';}
 function partySummary(v){return [{...v.player,hero:true},...(v.party||[])].map(a=>`${a.name}${a.hero?' · Level '+a.level:''} · HP ${a.hp}/${a.maxHp}`).join(' | ');}
 return {mode,section,nextIndex,showGroup,duplicateLast,nearEnd,readingSize,partySummary};
});
