"use strict";
const { ITEMS } = require('./content');
const { abilityModifier, proficiencyBonus, deepClone } = require('./rules');
const P = require('./progression');
const slots=['mainHand','offHand','armor','accessory'];
const finiteInt=(x,f=0)=>Number.isFinite(Number(x))?Math.max(0,Math.floor(Number(x))):f;
function inventory(entries=[]){
  const map=new Map();
  for(const raw of Array.isArray(entries)?entries:[]){
    const id=String(raw?.itemId||raw?.id||'').toLowerCase();const item=ITEMS[id];if(!item)continue;
    const qty=Math.min(9999,finiteInt(raw.quantity??raw.count??1));if(!qty)continue;
    const old=map.get(id)||{itemId:id,total:0};
    if(item.charges){const charges=raw.charges===undefined?item.charges:Math.min(item.charges,finiteInt(raw.charges));old.total+=(qty-1)*item.charges+charges;}
    else old.total+=qty;
    map.set(id,old);
  }
  return [...map.values()].filter(x=>x.total>0).map(x=>{const max=ITEMS[x.itemId].charges;return max?{itemId:x.itemId,quantity:Math.ceil(x.total/max),charges:((x.total-1)%max)+1}:{itemId:x.itemId,quantity:Math.min(9999,x.total)};});
}
function addTo(entries,id,qty=1,charges){
  if(!ITEMS[id]||!Number.isInteger(qty)||qty<1)return false;
  const incoming={itemId:id,quantity:qty};if(charges!==undefined)incoming.charges=charges;
  const merged=inventory([...entries,incoming]);entries.splice(0,entries.length,...merged);return true;
}
function consume(entries,id){
  const item=ITEMS[id],e=entries.find(x=>x.itemId===id);if(!item||!e)return false;
  if(item.charges){e.charges=(e.charges??item.charges)-1;if(e.charges>0)return true;}
  e.quantity-=1;
  if(e.quantity<=0)entries.splice(entries.indexOf(e),1);else if(item.charges)e.charges=item.charges;
  return true;
}
function actors(state){return [state.player,...state.party];}
function actor(state,id='player'){return actors(state).find(x=>x.id===id)||null;}
function allocated(state,id){return actors(state).reduce((n,a)=>n+Object.values(a.equipment||{}).filter(v=>v===id).length,0);}
function available(state,id){return Math.max(0,(state.player.inventory.find(e=>e.itemId===id)?.quantity||0)-allocated(state,id));}
function removeLoose(state,id,qty=1){
  if(!Number.isInteger(qty)||qty<1||available(state,id)<qty)return false;
  const e=state.player.inventory.find(x=>x.itemId===id);e.quantity-=qty;
  if(!e.quantity)state.player.inventory.splice(state.player.inventory.indexOf(e),1);
  return true;
}
function derive(a){
  a.equipment||={mainHand:null,offHand:null,armor:null,accessory:null};
  const armor=ITEMS[a.equipment.armor];const dex=abilityModifier(a.abilities.dex);
  let ac=armor?.armor?armor.armor.base+(armor.armor.dexCap===null?dex:Math.min(dex,armor.armor.dexCap)):10+dex;
  a.skillBonuses={};a.saveBonuses={};a.gearAttackBonus=0;a.gearDamageBonus=0;a.gearSpellAttack=0;a.gearSpellDc=0;
  for(const slot of slots){const item=ITEMS[a.equipment[slot]];if(!item)continue;ac+=item.acBonus||0;a.gearAttackBonus+=item.attackBonus||0;a.gearDamageBonus+=item.damageBonus||0;a.gearSpellAttack+=item.spellAttackBonus||0;a.gearSpellDc+=item.spellDcBonus||0;for(const [key,v] of Object.entries(item.skillBonuses||{}))a.skillBonuses[key]=(a.skillBonuses[key]||0)+v;for(const [key,v]of Object.entries(item.saveBonuses||{}))a.saveBonuses[key]=(a.saveBonuses[key]||0)+v;}
  if(a.kind==='player'){
    const s=P.stats(a);ac+=s.ac;a.gearAttackBonus+=s.attack;a.gearSpellAttack+=s.attack;
    for(const id of ['str','dex','con','int','wis','cha'])a.saveBonuses[id]=(a.saveBonuses[id]||0)+s.save;
    if(P.ensure(a).talents.includes('explorer'))for(const id of ['investigation','survival','perception'])a.skillBonuses[id]=(a.skillBonuses[id]||0)+2;
  }
  if(a.personalStyle==='watchful')ac+=1;
  if(a.personalStyle==='decisive'){a.gearAttackBonus+=1;a.gearSpellAttack+=1;a.gearSpellDc+=1;}
  a.ac=Math.max(1,ac);return a;
}
function weaponProfile(a){
  const item=ITEMS[a.equipment?.mainHand];
  const weapon=item?.weapon||{damage:'1',damageType:'bludgeoning',ability:'str',properties:[]};
  const ability=weapon.ability==='finesse'?(abilityModifier(a.abilities.dex)>=abilityModifier(a.abilities.str)?'dex':'str'):weapon.ability;
  const mod=abilityModifier(a.abilities[ability]);
  const flat=mod+(a.gearDamageBonus||0);
  const attackBonus=proficiencyBonus(a.level)+mod+(a.classId==='fighter'?1:0)+(a.gearAttackBonus||0);
  return {itemId:item?.weapon?item.id:'unarmed',name:item?.weapon?item.name:'Unarmed Strike',ability,attackBonus,bonus:attackBonus,damageFormula:weapon.damage+(flat?`${flat>=0?'+':''}${flat}`:''),damage:weapon.damage+(flat?`${flat>=0?'+':''}${flat}`:''),damageType:weapon.damageType,properties:weapon.properties||[]};
}
function equip(state,id,actorId='player'){
  const a=actor(state,actorId),item=ITEMS[id];if(!a||!item?.slot)return {ok:false,error:'Select an existing party member and an equippable item.'};
  if(a.equipment[item.slot]===id)return {ok:false,error:`${a.name} already has that item equipped.`};
  if(available(state,id)<1)return {ok:false,error:'No unallocated copy is available. Unequip it from the other party member first.'};
  if(item.slot==='offHand'&&ITEMS[a.equipment.mainHand]?.weapon?.properties?.includes('twoHanded'))return {ok:false,error:'A shield cannot be equipped with a two-handed weapon.'};
  if(item.slot==='mainHand'&&item.weapon?.properties?.includes('twoHanded'))a.equipment.offHand=null;
  a.equipment[item.slot]=id;derive(a);return {ok:true,message:`${a.name} equips ${item.name}. AC ${a.ac}; weapon attack +${weaponProfile(a).attackBonus}.`};
}
function unequip(state,slot,actorId='player'){
  const a=actor(state,actorId);if(!a||!slots.includes(slot)||!a.equipment?.[slot])return {ok:false,error:'That slot is empty or invalid.'};
  const name=ITEMS[a.equipment[slot]].name;a.equipment[slot]=null;derive(a);return {ok:true,message:`${a.name} unequips ${name}.`};
}
function comparison(state,id,actorId='player'){
  const a=actor(state,actorId),item=ITEMS[id];if(!a||!item?.slot)return null;
  const preview=deepClone(a);const old=ITEMS[a.equipment[item.slot]];
  preview.equipment[item.slot]=id;const clearsOffHand=item.slot==='mainHand'&&item.weapon?.properties?.includes('twoHanded')&&Boolean(a.equipment.offHand);
  if(clearsOffHand)preview.equipment.offHand=null;
  derive(preview);
  const before=weaponProfile(a),after=weaponProfile(preview);
  return {actorId:a.id,name:a.name,replaces:old?.name||'Empty slot',acBefore:a.ac,acAfter:preview.ac,attackBefore:before.attackBonus,attackAfter:after.attackBonus,damageBefore:before.damageFormula,damageAfter:after.damageFormula,spellAttackBefore:a.gearSpellAttack||0,spellAttackAfter:preview.gearSpellAttack||0,spellDcBefore:a.gearSpellDc||0,spellDcAfter:preview.gearSpellDc||0,clearsOffHand,blocked:item.slot==='offHand'&&ITEMS[a.equipment.mainHand]?.weapon?.properties?.includes('twoHanded')?'Unequip the two-handed weapon first.':null};
}
function normalizeEquipment(state){
  const used={};
  for(const a of actors(state)){
    a.equipment||={mainHand:null,offHand:null,armor:null,accessory:null};
    for(const slot of slots){const id=a.equipment[slot],i=ITEMS[id];const owned=state.player.inventory.find(e=>e.itemId===id)?.quantity||0;if(!i||i.slot!==slot||(used[id]||0)>=owned)a.equipment[slot]=null;else used[id]=(used[id]||0)+1;}
    if(ITEMS[a.equipment.mainHand]?.weapon?.properties?.includes('twoHanded')&&a.equipment.offHand){used[a.equipment.offHand]-=1;a.equipment.offHand=null;}
    derive(a);
  }
}
function initCompanion(state,member){
  if(member.equipment)return;
  const loadout=member.id==='orin'?{mainHand:'war-mace',offHand:'steel-shield',armor:'chain-shirt',accessory:null}:member.id==='maren'?{mainHand:'ash-wand',offHand:'steel-shield',armor:'leather-armor',accessory:null}:{mainHand:'shortbow',offHand:null,armor:'studded-leather',accessory:null};
  member.equipment=loadout;
  for(const id of Object.values(loadout).filter(Boolean))addTo(state.player.inventory,id,1);
  derive(member);
}
module.exports={slots,inventory,addTo,consume,actors,actor,allocated,available,removeLoose,derive,weaponProfile,equip,unequip,comparison,normalizeEquipment,initCompanion};
