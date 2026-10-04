'use strict';
// Execute actual UI handlers with a minimal DOM, not a substitute for browser tests.
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const UI=require('../public/ui-session');
const source=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
function fn(name){const m=new RegExp('(?:async )?function '+name+'\\(').exec(source);assert.ok(m,name);const end=source.indexOf('\n}\n',m.index);return source.slice(m.index,end+2);}
function setup(){
  const nodes={};const node=id=>nodes[id]??={id,value:'',textContent:'',disabled:false,dataset:{},children:[],listeners:{},
    classList:{add(){},remove(){},toggle(){},contains:k=>id.endsWith('Tab')&&k==='tab-button'},
    addEventListener(t,cb){this.listeners[t]=cb;},appendChild(n){this.children.push(n);}};
  const ctx={console,Boolean,String,Date,state:{player:{name:'Old'}},view:{scene:{choices:[]},chat:{road:{present:true}}},lastNarration:{text:'Saved story beat.',source:'deterministic'},eventHistory:[],busy:false,busyMode:'',
    dom:new Proxy({},{get:(_t,k)=>node(k)}),document:{body:{classList:{toggle(){}}},listeners:{},addEventListener(t,cb){this.listeners[t]=cb;}},
    window:{BriarwatchSession:UI},$:node,$$:()=>[],setup:{},setBusy(){},pointBuySpent:()=>27,renderSetup(){},renderSetupSummary(){},toast(){},renderGame(){},
    sessionUI:{changed(){},status:()=>({}),quickSave:async()=>{},replace:async loader=>{const p=await loader();ctx.state=p.state;return true;}},
    api:async()=>({response:{ok:true},payload:{state:{player:{name:'New'}},view:{}}}),startCampaign(){},refreshSaves(){},closeTargetDialog(){},clear:n=>n.children=[],createElement:(tag,cls,text)=>({tag,cls,text}),showActionFeedback:m=>ctx.feedback=m};
  vm.createContext(ctx);return {ctx,node};
}
test('new setup preserves active state until replacement succeeds',()=>{const {ctx,node}=setup();const before=ctx.state;vm.runInContext(fn('wireEvents')+'\nwireEvents();',ctx);node('newGameBtn').listeners.click();assert.equal(ctx.state,before);});
test('both Quick Save button and keyboard shortcut use active-session routing',()=>{const {ctx,node}=setup();let saves=0;ctx.sessionUI.quickSave=()=>saves++;
  ctx.localStorage={getItem:()=>{throw Error('Old global destination must not be read');}};
  vm.runInContext(fn('wireEvents')+'\nwireEvents();',ctx);node('saveQuickBtn').listeners.click();ctx.document.listeners.keydown({ctrlKey:true,key:'s',preventDefault(){}});assert.equal(saves,2);
});
test('rejected action stays beside input and does not replace displayed or saved story presentation',()=>{
  const {ctx}=setup();vm.runInContext(fn('ingestPayload')+`\ningestPayload({state:{player:{name:'Old'},lastNarration:'Rejected.'},view,narration:{text:'Rejected.'},result:{ok:false,error:'Not available.'}});`,ctx);
  assert.equal(ctx.lastNarration.text,'Saved story beat.');assert.equal(ctx.state.lastNarration,'Saved story beat.');assert.equal(ctx.feedback,'Not available.');
});
test('narration failure displays canonical resolved consequence separately from technical failure',()=>{
  const {ctx}=setup();vm.runInContext(fn('ingestPayload')+`\ningestPayload({state,view,result:{ok:true,canonical:'Delivery complete.'},narration:{text:'Delivery complete. AI error.',source:'deterministic'}});`,ctx);
  assert.equal(ctx.lastNarration.text,'Delivery complete.');assert.equal(ctx.state.lastNarration,'Delivery complete.');assert.match(ctx.feedback,/already resolved/);
});
test('model wait allows read-only tabs, equipment inspection and drafting but no mutations',()=>{
  const {ctx,node}=setup();const nodes=['inventoryTab','journalTab','inspect','equip','saveQuickBtn','actionInput','actionSubmitBtn','cancel','localAIModel','localAITokens'].map(node);
  node('inspect').dataset.readOnly='true';node('cancel').dataset.keepEnabled='true';node('localAITokens').dataset.disabled='true';ctx.$$=()=>nodes;
  vm.runInContext(fn('setBusy')+'\nsetBusy(true,"model");',ctx);
  for(const id of ['inventoryTab','journalTab','inspect','actionInput','cancel'])assert.equal(node(id).disabled,false,id);
  for(const id of ['equip','saveQuickBtn','actionSubmitBtn','localAIModel','localAITokens'])assert.equal(node(id).disabled,true,id);
  vm.runInContext('setBusy(false);',ctx);assert.equal(node('localAITokens').disabled,true);assert.equal(node('equip').disabled,false);
});
test('busy submit never clears a draft or sends another request',()=>{
  const {ctx,node}=setup();let sent=0;ctx.window.BriarwatchChat={send:()=>sent++};vm.runInContext(fn('wireEvents')+'\nwireEvents();',ctx);ctx.busy=true;node('actionInput').value='My next message';node('actionForm').listeners.submit({preventDefault(){}});assert.equal(sent,0);assert.equal(node('actionInput').value,'My next message');
});
test('non-model busy operations do not admit editing the message box',()=>{const {ctx,node}=setup();ctx.$$=()=>[node('actionInput')];vm.runInContext(fn('setBusy')+'\nsetBusy(true);',ctx);assert.equal(node('actionInput').disabled,true);});
test('real story-choice renderer explains journey approaches instead of nonexistent combat',()=>{const {ctx,node}=setup();vm.runInContext(fn('renderStoryChoices')+'\nrenderStoryChoices();',ctx);assert.match(node('storyChoices').children[0].text,/Lantern Road/);assert.doesNotMatch(node('storyChoices').children[0].text,/combat is active/);});
