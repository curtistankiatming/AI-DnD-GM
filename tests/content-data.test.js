'use strict';
// Authored content lives in src/data/*.json. These checks catch broken
// references (a typo in a node id, skill or item) before anyone plays them.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
require('../src/engine'); // Loads every module that installs content.
const C=require('../src/content');
const X=require('../src/expansion');

const problems=[];let checked=0;
function walk(value,where){
  if(Array.isArray(value))return value.forEach((v,i)=>walk(v,`${where}[${i}]`));
  if(!value||typeof value!=='object')return;
  for(const [k,v]of Object.entries(value)){
    const at=`${where}.${k}`;
    if(['nextNode','victoryNode','defeatNode','startNode','combat','skill','alternateSkills','alt','item','itemId','tools','clues','cluesAll','cluesAny'].includes(k))checked++;
    if(['nextNode','victoryNode','defeatNode','startNode'].includes(k)&&typeof v==='string'&&!C.STORY_NODES[v])problems.push(`${at}: unknown story node ${v}`);
    if(k==='combat'&&typeof v==='string'&&!C.ENCOUNTERS[v])problems.push(`${at}: unknown encounter ${v}`);
    if(['skill'].includes(k)&&typeof v==='string'&&v&&!C.SKILLS[v])problems.push(`${at}: unknown skill ${v}`);
    if(['alternateSkills','alt'].includes(k)&&Array.isArray(v))for(const s of v)if(!C.SKILLS[s])problems.push(`${at}: unknown skill ${s}`);
    if(['item','itemId'].includes(k)&&typeof v==='string'&&!C.ITEMS[v])problems.push(`${at}: unknown item ${v}`);
    if(k==='tools'&&Array.isArray(v))for(const t of v)if(!C.ITEMS[t])problems.push(`${at}: unknown item ${t}`);
    if(['clues','cluesAll','cluesAny'].includes(k)&&Array.isArray(v))for(const id of v)if(!C.CLUES[id])problems.push(`${at}: unknown clue ${id}`);
    walk(v,at);
  }
}

test('every data file is valid JSON with content',()=>{
  const dir=path.join(__dirname,'../src/data');
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json'));
  assert.ok(files.length>=18);
  for(const f of files){const data=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));assert.ok(Object.keys(data).length,`${f} is empty`);}
});

test('story, encounter, quest and shop references all resolve',()=>{
  walk(C.STORY_NODES,'STORY_NODES');walk(C.ENCOUNTERS,'ENCOUNTERS');walk(C.CAMPAIGN,'CAMPAIGN');
  walk(X.QUESTS,'QUESTS');walk(X.RECIPES,'RECIPES');
  for(const [id,e]of Object.entries(C.ENCOUNTERS))for(const enemy of e.enemies||[])if(!C.ENEMIES[enemy])problems.push(`ENCOUNTERS.${id}: unknown enemy ${enemy}`);
  for(const t of Object.values(X.TOWNS))for(const item of t.stock||[])if(!C.ITEMS[item])problems.push(`TOWNS.${t.id}: unknown item ${item}`);
  for(const m of Object.values(X.MERCHANTS))for(const item of m.stock||[])if(!C.ITEMS[item])problems.push(`MERCHANTS.${m.id}: unknown item ${item}`);
  for(const q of Object.values(X.QUESTS)){
    if(q.unlock!=='bell'&&!X.QUESTS[q.unlock])problems.push(`QUESTS.${q.id}: unknown unlock ${q.unlock}`);
    for(const town of [q.town,q.nextTown].filter(Boolean))if(!X.TOWNS[town])problems.push(`QUESTS.${q.id}: unknown town ${town}`);
  }
  for(const p of Object.values(X.PERSONAL))if(p.quest!=='bell'&&!X.QUESTS[p.quest])problems.push(`PERSONAL: unknown quest ${p.quest}`);
  assert.deepEqual(problems,[]);
  assert.ok(checked>300,`only ${checked} references were checked`);
});
