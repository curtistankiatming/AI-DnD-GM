'use strict';
const path=require('node:path'),fs=require('node:fs');const ROOT=path.resolve(__dirname,'..');
const E=require(ROOT+'/src/engine'),Chat=require(ROOT+'/src/chat-runtime'),P=require(ROOT+'/src/model-profiles'),R=require(ROOT+'/src/rules'),{chooseAction}=require(ROOT+'/tests/player-policy');
const stats={},failures=[];let states=0;
for(const id of ['fighter','wizard','rogue','cleric','ranger','bard']){
 let s=E.createNewGame({classId:id}),memory={},rng=R.createSeededRng(301);
 for(let i=0;i<900;i++){
  const view=E.buildView(s),act=chooseAction(view,memory,'prepared');if(!act)break;if(act.error)throw new Error(act.error);
  if(view.combat?.active){states++;for(const profile of Object.keys(P.PROFILES)){
   const key=profile;stats[key]||={requests:0,maxChars:0,descriptionsOmitted:0,blocked:0};const row=stats[key];row.requests++;
   try{const txt=Chat.context(s,P.normalize({profile}),'Who are our current opponents and how many class abilities remain?','question');row.maxChars=Math.max(row.maxChars,txt.length+Chat.SYSTEM.length);if(JSON.parse(txt).combat.detailNote)row.descriptionsOmitted++;}
   catch(e){row.blocked++;failures.push({classId:id,profile,scene:s.story.nodeId,level:s.player.level,error:e.message});}
  }}
  const out=E.resolveAction(s,act,rng);if(!out.result.ok)throw new Error(out.result.error);s=out.state;
 }
 if(s.player.level!==10||!s.world.completed.aftermath)throw new Error('Incomplete scripted campaign');
}
if(process.env.CONTEXT_SWEEP_OUTPUT)fs.writeFileSync(process.env.CONTEXT_SWEEP_OUTPUT,JSON.stringify({states,stats,failures,realModelCalls:0},null,2));console.log(JSON.stringify({states,stats,failed:failures.length},null,2));if(failures.length)process.exitCode=1;
