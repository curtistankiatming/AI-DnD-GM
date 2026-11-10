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
    api:async()=>({response:{ok:true},payload:{state:{player:{name:'New'}},view:{}}}),startCampaign(){},refreshSaves(){},showSetupForm(){},closeTargetDialog(){},clear:n=>n.children=[],createElement:(tag,cls,text)=>({tag,cls,text}),showActionFeedback:m=>ctx.feedback=m};
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
test('every chat function another screen calls is still exported after chat-ui.js finishes loading',()=>{
  // Regression: a second window.BriarwatchChat assignment dropped `adventure`, so the
  // "Ask the GM for a new adventure" button threw and did nothing.
  const dir=path.join(__dirname,'../public'),chat=fs.readFileSync(path.join(dir,'chat-ui.js'),'utf8');
  const exportsList=[...chat.matchAll(/window\.BriarwatchChat=\{([^}]*)\}/g)];assert.ok(exportsList.length,'chat-ui.js exports BriarwatchChat');
  const exported=exportsList.at(-1)[1].split(',').map(k=>k.split(':')[0].trim());
  const used=new Set();
  for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.js')))
    for(const m of fs.readFileSync(path.join(dir,file),'utf8').matchAll(/BriarwatchChat\??\.(\w+)/g))used.add(m[1]);
  assert.ok(used.has('adventure'),'the expedition board calls adventure()');
  for(const name of used)assert.ok(exported.includes(name),`BriarwatchChat.${name} is used but not exported`);
});
test('first-steps.js ships in both the served page and the offline build',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),build=fs.readFileSync(path.join(__dirname,'../scripts/build-public.js'),'utf8');
  assert.match(html,/<script src="\/first-steps\.js"><\/script>/);
  assert.equal(build.split("'public/first-steps.js'").length-1,2,'listed as a build input and bundled');
  assert.match(build,/replace\('<script src="\/first-steps\.js"><\/script>', ''\)/);
});
test('step C scripts ship in both the served page and the offline build',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),build=fs.readFileSync(path.join(__dirname,'../scripts/build-public.js'),'utf8');
  for(const name of ['gm-setup.js','whats-next.js']){
    assert.ok(html.includes(`<script src="/${name}"></script>`),name+' is loaded by the page');
    assert.equal(build.split(`'public/${name}'`).length-1,2,name+' is a build input and is bundled');
    assert.ok(build.includes(`replace('<script src="/${name}"></script>', '')`),name+' tag is removed from the single file');
  }
  // The key box must exist before the script that fills it, and the wish box needs the chat export.
  assert.ok(html.indexOf('/chat-ui.js')<html.indexOf('/gm-setup.js')&&html.indexOf('/gm-setup.js')<html.indexOf('/first-steps.js'));
});
test('combat-board.js ships in both the served page and the offline build, after the scripts it wraps',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),build=fs.readFileSync(path.join(__dirname,'../scripts/build-public.js'),'utf8');
  assert.ok(html.includes('<script src="/combat-board.js"></script>'));
  assert.equal(build.split("'public/combat-board.js'").length-1,2,'listed as a build input and bundled');
  assert.ok(build.includes(`replace('<script src="/combat-board.js"></script>', '')`));
  assert.ok(html.indexOf('/management-ui.js')<html.indexOf('/combat-board.js'));
  assert.ok(build.indexOf("read('public/management-ui.js')")<build.indexOf("read('public/combat-board.js')"));
});
test('sheets.js ships in both the served page and the offline build, after the scripts it wraps',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),build=fs.readFileSync(path.join(__dirname,'../scripts/build-public.js'),'utf8');
  assert.ok(html.includes('<script src="/sheets.js"></script>'));
  assert.equal(build.split("'public/sheets.js'").length-1,2,'listed as a build input and bundled');
  assert.ok(build.includes(`replace('<script src="/sheets.js"></script>', '')`));
  assert.ok(html.indexOf('/combat-board.js')<html.indexOf('/sheets.js'));
  assert.ok(build.indexOf("read('public/combat-board.js')")<build.indexOf("read('public/sheets.js')"));
});
test('quick start keeps name, class and Begin outside the optional Customise section',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  const start=html.indexOf('<details id="setupCustomise"'),end=html.indexOf('</details>',start);
  assert.ok(start>0&&end>start);
  const inside=html.slice(start,end);
  for(const id of ['setupBackground','setupDifficulty','abilityBuilder','useClassPresetBtn'])assert.ok(inside.includes(`id="${id}"`),id+' is optional');
  for(const id of ['setupName','classCards','startCampaignBtn','gmChoice','surpriseNameBtn'])assert.ok(html.includes(`id="${id}"`)&&!inside.includes(`id="${id}"`),id+' is always visible');
  assert.doesNotMatch(html.slice(start,start+60),/\sopen/,'Customise starts closed');
});
test('the title page comes first and the hero form follows New adventure',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'),css=fs.readFileSync(path.join(__dirname,'../public/adventure.css'),'utf8');
  assert.match(html,/<section class="setup-card title-mode"/,'a fresh page opens on the title');
  const title=html.indexOf('id="setupTitle"'),resume=html.indexOf('id="resumePanel"'),form=html.indexOf('class="setup-layout"');
  assert.ok(title>0&&title<resume&&resume<form,'title, then continue or new, then the form');
  const panel=html.slice(resume,form);
  for(const id of ['continueBtn','titleNewBtn','homeSaves'])assert.ok(panel.includes(`id="${id}"`),id+' is on the title page');
  assert.match(css,/\.setup-card\.title-mode \.setup-layout[^{]*\{ display:none; \}/);
  assert.match(css,/\.setup-card:not\(\.title-mode\) #titleNewBtn \{ display:none; \}/);
  // Every way into the form leaves title mode, including the in-game button and a failed start.
  assert.equal(source.split('showSetupForm()').length-1,4,'defined once and called from New adventure, New campaign and the load error');
});
test('AI tuning controls sit under Advanced settings, which opens itself for a local model',()=>{
  const chat=fs.readFileSync(path.join(__dirname,'../public/chat-ui.js'),'utf8');
  const line=chat.split('\n').find(l=>l.includes('advClaude.append('))+chat.split('\n').find(l=>l.includes('advLocal.append('))+chat.split('\n').find(l=>l.includes('adv.append(advClaude'));
  for(const name of ['claudeModel','effort','profile','format','roles','budget','tokens','uncapped','timeout'])assert.ok(line.includes(name+'.closest('),name+' is advanced');
  for(const name of ['enabled','provider','narration','base','model'])assert.ok(!line.includes(name+'.closest('),name+' stays in view');
  assert.match(chat,/if\(local\)adv\.open=true/);
});
