/* Batch 3 display projections. Read only; no engine imports, inference or save writes. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BriarwatchManagementView=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const SLOTS=[['mainHand','Main hand'],['offHand','Off hand'],['armor','Armor'],['accessory','Accessory']];
 function members(v){return [...(v.player?[{...v.player,equipment:Object.fromEntries((v.equipment||[]).map(s=>[s.slot,s.item?.id||null]))}]:[]),...(v.party||[])];}
 function slots(v,id){const a=members(v).find(a=>a.id===id);return a?SLOTS.map(([slot,label])=>({slot,label,item:(v.inventory||[]).find(i=>i.id===a.equipment?.[slot])||null})):[];}
 function owners(v,id){return members(v).flatMap(a=>SLOTS.filter(([slot])=>a.equipment?.[slot]===id).map(([slot,label])=>({actorId:a.id,name:a.name,slot,label})));}
 function category(i){if(['weapon','armor','shield','focus','accessory'].includes(i.category))return 'equipment';const map={consumable:'consumables',tool:'tools',material:'materials',quest:'quest'};return Object.hasOwn(map,i.category)?map[i.category]:'other';}
 function filter(v,query='',group='all',spare=false){const q=String(query).trim().toLowerCase();return (v.inventory||[]).filter(i=>(group==='all'||category(i)===group)&&(!spare||i.available>0)&&[i.name,i.purpose,i.description,...owners(v,i.id).map(a=>a.name)].join(' ').toLowerCase().includes(q));}
 function usage(i){if(i.canEquip||category(i)==='equipment')return 'Equipment · inspect comparisons before choosing an owner.';if(i.category==='quest')return 'Quest object · used by the relevant story approach.';if(i.category==='material')return 'Material · used by listed crafting or barter recipes.';if(i.canUseStory)return `Usable item · select Use and a valid target.${i.charges!==undefined?' '+i.charges+' uses in the open kit.':''}`;if(i.category==='tool')return 'Passive tool · supports explicitly listed approaches; no Use click needed.';return 'Context-dependent item · read its purpose; no free-form effect is promised.';}
 function comparison(c){return [['Armor Class','acBefore','acAfter'],['Weapon hit bonus','attackBefore','attackAfter'],['Weapon damage','damageBefore','damageAfter'],['Spell attack bonus','spellAttackBefore','spellAttackAfter'],['Spell DC bonus','spellDcBefore','spellDcAfter']].map(([label,b,a])=>({label,before:c[b]??null,after:c[a]??null,change:Number.isFinite(c[a])&&Number.isFinite(c[b])?c[a]-c[b]:null}));}
 function readiness(v){const r=[];for(const a of members(v)){r.push(`${a.name}: HP ${a.hp}/${a.maxHp}${a.hp<=0?' · unconscious':''}${a.conditions?.length?' · '+a.conditions.map(c=>c.name||c.id).join(', '):''}.`);}
  for(const x of Object.values(v.player?.resources||{}))r.push(`${x.name}: ${x.current}/${x.max}${x.refresh?' · '+x.refresh+' rest refresh':''}.`);
  const n=v.progression?.pending?.length||0;if(n)r.push(`${n} development choice${n===1?'':'s'} awaiting selection.`);
  if(v.progression?.specializationOptions?.length)r.push('Your permanent first advancement is ready to choose.');
  for(const p of v.world?.preparation||[])for(const warning of p.warnings||[])r.push(`${v.world.quests?.find(q=>q.id===p.questId)?.name||'Known expedition'}: ${warning}`);
  return r;
 }
 function actionGroup(id){if(['weapon-attack','defend'].includes(id))return 'attacks';if(id.startsWith('item:'))return 'items';if(id.startsWith('order:')||id.startsWith('combo:'))return 'party';if(['objective','spec-objective'].includes(id))return 'objectives';if(['end-turn','retreat','death-save'].includes(id))return 'turn';return 'abilities';}
 function contribution(member,events=[]){const name=String(member.name||'');if(!name)return null;
  for(const e of [...events].reverse()){
   if(!['party','roll','heal','damage','feature'].includes(e.type)||typeof e.text!=='string')continue;
   const start=e.text.startsWith(name+' ')?e.text.slice(name.length+1):'';
   if(/^(attacks|uses|covers|supplies|grants)\b/.test(start)||e.text.includes(name+"'s "))return e.text;
  }return null;
 }
 return {members,slots,owners,category,filter,usage,comparison,readiness,actionGroup,contribution};
});
