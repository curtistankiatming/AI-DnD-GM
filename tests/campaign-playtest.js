"use strict";
const fs=require('node:fs');
const {createNewGame,resolveAction,buildView}=require('../src/engine');
const {createSeededRng}=require('../src/rules');
const {chooseAction}=require('./player-policy');
function run(classId='fighter',difficulty='standard',seed=42,style='prepared',capture=false){
 const rng=createSeededRng(seed),memory={};let state=createNewGame({name:'Rowan',classId,difficulty});
 const result={classId,difficulty,seed,style,steps:0,defeats:0,combats:0,objectiveWins:0,setbacks:0,level:1,xp:0,complete:false,errors:[],levels:[],actions:[]};
 for(let i=0;i<900;i++){
   const view=buildView(state),action=chooseAction(view,memory,style);if(!action){result.complete=Boolean(view.progression.specialization&&view.world.campaignComplete);break;}
   if(action.error){result.errors.push(action.error);break;}
   const oldLevel=state.player.level,oldCombat=Boolean(state.combat?.active);
   let resolved;try{resolved=resolveAction(state,action,rng);}catch(error){result.errors.push(error.stack);break;}
   if(!resolved.result.ok){result.errors.push(`${view.scene.id} ${JSON.stringify(action)}: ${resolved.result.error}`);break;}
   state=resolved.state;result.steps++;
   if(!oldCombat&&state.combat?.active)result.combats++;
   if(state.player.level!==oldLevel)result.levels.push({level:state.player.level,xp:state.player.xp,step:i,node:state.story.nodeId});
   if(capture)result.actions.push({before:{scene:view.scene.id,level:view.player.level,xp:view.player.xp},action,events:resolved.events.map(e=>e.text),after:{scene:state.story.nodeId,level:state.player.level,xp:state.player.xp,gold:state.player.gold}});
 }
 result.defeats=Object.values(state.world.progress).reduce((n,p)=>n+(p.failures||0),0);result.setbacks=state.world.setbacks;result.objectiveWins=Object.values(state.world.completed).filter(q=>q.method==='objective').length;
 result.level=state.player.level;result.xp=state.player.xp;result.specialization=state.player.progression.specialization;result.finalNode=state.story.nodeId;result.complete=Boolean(result.specialization&&state.world.completed.aftermath);result.completed=state.world.completed;
 if(!result.complete&&!result.errors.length)result.errors.push('Step budget exhausted.');
 if(capture)result.finalState=state;return result;
}
if(require.main===module){
 const runs=Math.max(1,Number(process.env.PLAYTEST_RUNS||2));const classes=(process.env.PLAYTEST_CLASSES||'fighter,rogue,wizard,cleric,ranger,bard').split(',');const styles=(process.env.PLAYTEST_STYLES||'prepared,peace,direct').split(',');const difficulties=(process.env.PLAYTEST_DIFFICULTIES||'story,standard,gritty').split(',');const out=[];
 for(const difficulty of difficulties)for(const style of styles)for(const classId of classes)for(let n=0;n<runs;n++){const r=run(classId,difficulty,301+n*7919,style);out.push(r);if(r.errors.length)console.error(classId,difficulty,style,r.errors[0]);}
 const summary={runs:out.length,completed:out.filter(r=>r.complete).length,engineErrors:out.filter(r=>r.errors.length).length,steps:out.reduce((a,r)=>a+r.steps,0),rescues:out.reduce((a,r)=>a+r.defeats,0),setbacks:out.reduce((a,r)=>a+r.setbacks,0)};
 console.log(JSON.stringify(summary,null,2));if(process.env.PLAYTEST_OUTPUT)fs.writeFileSync(process.env.PLAYTEST_OUTPUT,JSON.stringify({summary,runs:out},null,2));if(summary.engineErrors)process.exitCode=1;
}
module.exports={run};
