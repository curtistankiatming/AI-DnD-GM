'use strict';
// Isolated execution of the actual UI wrapper, not a browser or natural campaign.
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../public/management-ui.js'),'utf8');
const start=source.indexOf(' const baseSend=sendAction;'),end=source.indexOf(' const oldRender=renderGame;');
assert.ok(start>=0&&end>start,'review the UI specialization seam before changing this test');
function fixture(){let resolve;const calls=[],dialogs=[];const decision=new Promise(r=>resolve=r);
 const c={state:{player:{name:'A'}},busy:false,specializing:false,
 view:{combat:null,progression:{specializationOptions:[{id:'guardian',name:'Guardian',description:'Protect the party.'}]}},
 sendAction:async action=>{calls.push(action);return 'committed';},
 askSessionDecision:async options=>{dialogs.push(options);return decision;}};
 vm.createContext(c);vm.runInContext(source.slice(start,end),c);
 return {c,calls,dialogs,resolve};
}
test('permanent choice preview is explicit and cancellation does not send an action',async()=>{
 const f=fixture(),pending=f.c.sendAction({type:'specialize',specializationId:'guardian'});
 assert.equal(f.calls.length,0);assert.equal(f.dialogs[0].title,'Confirm permanent advancement');
 assert.match(f.dialogs[0].message,/Guardian/);assert.match(f.dialogs[0].message,/Protect the party/);assert.match(f.dialogs[0].message,/permanent/);
 assert.equal(f.dialogs[0].choices[0][0],'cancel');f.resolve('cancel');await pending;
 assert.equal(f.calls.length,0);assert.equal(f.c.specializing,false);
});
test('confirmed choice delegates exactly the original action once',async()=>{
 const f=fixture(),action={type:'specialize',specializationId:'guardian'},pending=f.c.sendAction(action);
 f.resolve('confirm');assert.equal(await pending,'committed');assert.equal(f.calls.length,1);assert.equal(f.calls[0],action);
});
test('repeated selection while the modal is open cannot queue more choices',async()=>{
 const f=fixture(),action={type:'specialize',specializationId:'guardian'},pending=f.c.sendAction(action);
 await f.c.sendAction(action);assert.equal(f.dialogs.length,1);f.resolve('confirm');await pending;assert.equal(f.calls.length,1);
});
for(const change of ['busy','state','option'])test('stale confirmation is ignored after '+change+' changes',async()=>{
 const f=fixture(),pending=f.c.sendAction({type:'specialize',specializationId:'guardian'});
 if(change==='busy')f.c.busy=true;else if(change==='state')f.c.state={player:{name:'B'}};else f.c.view.progression.specializationOptions=[];
 f.resolve('confirm');await pending;assert.equal(f.calls.length,0);assert.equal(f.c.specializing,false);
});
for(const gate of ['busy','combat'])test(gate+' blocks opening permanent selection',async()=>{
 const f=fixture();if(gate==='busy')f.c.busy=true;else f.c.view.combat={active:true};
 await f.c.sendAction({type:'specialize',specializationId:'guardian'});assert.equal(f.dialogs.length,0);assert.equal(f.calls.length,0);
});
test('unavailable specialization still goes to the original authoritative rejection',async()=>{
 const f=fixture(),a={type:'specialize',specializationId:'missing'};await f.c.sendAction(a);assert.equal(f.dialogs.length,0);assert.equal(f.calls[0],a);
});
test('unrelated game actions retain their original route',async()=>{
 const f=fixture(),a={type:'combat',actionId:'end-turn'};await f.c.sendAction(a);assert.equal(f.calls[0],a);assert.equal(f.dialogs.length,0);
});
