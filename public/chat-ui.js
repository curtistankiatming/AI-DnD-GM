/* Chat foundation UI: campaign data works offline; the model stays on the local server. */
(function () {
  'use strict';
  const offline=Boolean(window.BriarwatchOffline);
  const panel=createElement('section','chat-foundation');panel.id='chatFoundation';
  panel.append(createElement('h3','','Chat with the guide'));
  const mode=createElement('select');mode.id='chatMode';mode.setAttribute('aria-label','Chat message type');
  for(const [id,label]of [['action','Attempt an action'],['dialogue','Speak in character'],['question','Ask a question'],['instructions','Campaign instructions (replace)']]){const o=createElement('option','',label);o.value=id;mode.append(o);}
  const label=createElement('label','','Message type ');label.append(mode);panel.append(label);
  panel.append(createElement('p','muted','Instructions guide the style of future AI replies, not rules. AI-interpreted actions require confirmation. The optional ferry scenario is the first bounded chat scenario, not an unlimited generated world.'));
  const memory=createElement('details');const summary=createElement('summary','','Saved campaign instructions');memory.append(summary);
  const saved=createElement('p');saved.id='campaignInstructions';memory.append(saved);
  const edit=createElement('button','btn btn-secondary btn-small','Edit instructions');edit.type='button';edit.addEventListener('click',()=>{mode.value='instructions';dom.actionInput.value=view?.chat?.instructions||'';dom.actionInput.focus();});memory.append(edit);panel.append(memory);
  const tools=createElement('div','chat-controls');
  function button(text,fn){const b=createElement('button','btn btn-secondary btn-small',text);b.type='button';b.addEventListener('click',fn);return b;}
  tools.append(button('Start courier scenario',()=>send('/scenario')),button('Pause courier scenario',()=>send('/pause')),button('Explain rules',()=>send('/rules')));panel.append(tools);
  const facts=createElement('div');facts.id='chatScenario';panel.append(facts);
  const pending=createElement('div');pending.id='chatPending';panel.append(pending);
  const transcript=createElement('div','chat-transcript');transcript.id='chatTranscript';transcript.setAttribute('aria-live','polite');panel.append(transcript);
  const status=createElement('p','muted');status.id='chatStatus';panel.append(status);
  const cancel=button('Cancel model wait',async()=>{try{await api('/api/ai/cancel',{method:'POST',body:'{}'});}catch(e){toast(e.message,'warning');}});
  cancel.dataset.keepEnabled='true';cancel.classList.add('is-hidden');panel.append(cancel);
  dom.actionForm.before(panel);
  // Chat is the primary interaction, not buried beneath town services.
  const chatShell=dom.actionForm.closest('.freeform-panel');
  document.getElementById('worldPanel').before(chatShell);
  dom.actionInput.maxLength=2000;
  dom.actionInput.placeholder='Describe an action, speak to someone, or set campaign instructions. Choose the message type above.';

  async function send(text,extra={}){
    if(!state||busy)return;
    setBusy(true);const started=Date.now();cancel.classList.toggle('is-hidden',offline);
    const update=()=>{status.textContent=`Working on this message · ${Math.floor((Date.now()-started)/1000)}s elapsed. Local model requests may wait up to 10 minutes each. No automatic retries or paid fallback.`;};update();
    const timer=setInterval(update,1000);
    try{
      const request={mode:mode.value,text,requestId:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2),...extra};
      const {payload}=await api('/api/chat',{method:'POST',body:JSON.stringify({state,request})});
      ingestPayload(payload);status.textContent=payload.result?.ok===false?'Message not applied. Your mechanical progress is unchanged.':'Ready. Model prose is presentation; the mechanics feed and confirmed results determine game state.';
      if(payload.result?.ok===false&&!extra.confirm)dom.actionInput.value=text;
    }catch(e){status.textContent=e.message;if(!extra.confirm)dom.actionInput.value=text;toast(e.message,'warning');}
    finally{clearInterval(timer);cancel.classList.add('is-hidden');setBusy(false);render();}
  }
  function render(){
    if(!state||!view)return;
    const c=view.chat||{};saved.textContent=c.instructions||'No campaign preferences saved yet.';
    clear(transcript);for(const entry of (c.history||[]).slice(-8)){const row=createElement('p','chat-'+entry.role);row.append(createElement('strong','',entry.role==='player'?'You: ':entry.role==='rules'?'Confirmed: ':'Guide: '),document.createTextNode(entry.text));transcript.append(row);}
    clear(pending);
    if(c.pending){pending.append(createElement('strong','','Confirm only this action: '+c.pending.label),createElement('p','muted','No roll or resource change has happened yet.'),button('Confirm chat action',()=>send('',{confirm:true})),button('Cancel proposal',()=>send('',{cancel:true})));}
    clear(facts);if(c.courier){facts.append(createElement('strong','',c.courier.resolved?'Courier helped — reward recorded once':c.courier.active?'Courier scenario active':'Courier scenario paused'));for(const line of c.courier.facts||[])facts.append(createElement('p','muted',line));
      for(const option of c.courierOptions||[]){const b=button(option.label,()=>send(option.label,{mode:'action'}));b.title=option.description;facts.append(b,createElement('p','muted',option.description));}
      if(c.courier.active&&!c.courierAvailable)facts.append(createElement('p','muted','Return to Briarwatch outside combat to continue this side story, or pause it.'));}
  }
  window.BriarwatchChat={send,render};

  const ai=createElement('details','chat-ai-settings');ai.id='localAISettings';ai.append(createElement('summary','','Local AI settings for chat'));
  if(offline){ai.append(createElement('p','muted','This downloadable browser edition makes no model requests. Instructions, saves, exact approaches and the courier scenario work offline. Use the local Node server edition to connect Bionic or another compatible local model.'));panel.append(ai);return;}
  const note=createElement('p','muted','Select an installed model explicitly. Profiles tune request size, not the model itself. No cloud endpoint, automatic download, model switching or performance guarantee.');ai.append(note);
  function field(name,id,type='text'){const box=createElement('label','chat-field',name);const input=createElement('input');input.id=id;input.type=type;box.append(input);ai.append(box);return input;}
  const enabled=field('Enable local AI','localAIEnabled','checkbox');
  const base=field('Local API address','localAIBase');base.value='http://127.0.0.1:1234/v1';
  const model=field('Exact model ID','localAIModel');const dl=createElement('datalist');dl.id='installedLocalModels';model.setAttribute('list',dl.id);ai.append(dl);
  function select(name,id,entries){const box=createElement('label','chat-field',name),s=createElement('select');s.id=id;for(const [value,title]of entries){const o=createElement('option','',title);o.value=value;s.append(o);}box.append(s);ai.append(box);return s;}
  const profile=select('Workload profile','localAIProfile',[['compact','Compact · 7B-class starting point'],['balanced','Balanced · 12B-class starting point'],['expanded','Expanded · 27B-class starting point']]);
  const format=select('Response format','localAIFormat',[['plain-json','Plain JSON · broad compatibility'],['json-schema','JSON Schema · only when supported by the server/model']]);
  const roles=select('Prompt template','localAIRoles',[['system-user','System + user messages'],['single-user','Single user message · alternate templates']]);
  const budget=field('Context character budget (not tokens)','localAIContext','number');budget.min=4000;budget.max=32000;budget.value=8000;
  const tokens=field('Maximum reply tokens','localAITokens','number');tokens.min=64;tokens.max=768;tokens.value=160;
  const timeout=field('Wait limit per request, in seconds','localAITimeout','number');timeout.min=3;timeout.max=600;timeout.value=600;
  const info=createElement('p','muted');info.id='aiSettingsStatus';ai.append(info);
  profile.addEventListener('change',()=>{const p={compact:[8000,160],balanced:[14000,240],expanded:[22000,320]}[profile.value];budget.value=p[0];tokens.value=p[1];});
  const value=()=>({enabled:enabled.checked,baseUrl:base.value.trim(),model:model.value.trim(),profile:profile.value,format:format.value,roles:roles.value,contextChars:Number(budget.value),replyTokens:Number(tokens.value),timeoutMs:Number(timeout.value)*1000});
  ai.append(button('List installed models',async()=>{if(busy)return;setBusy(true);try{const {payload}=await api('/api/ai/models',{method:'POST',body:JSON.stringify({config:{...value(),enabled:false}})});clear(dl);for(const id of payload.models){const o=createElement('option');o.value=id;dl.append(o);}info.textContent=`Found ${payload.models.length} model identifiers. Select one in the model field; none was selected or loaded automatically.`;}catch(e){info.textContent=e.message;}finally{setBusy(false);}}));
  ai.append(button('Save AI settings',async()=>{if(busy)return;setBusy(true);try{await api('/api/ai/settings',{method:'POST',body:JSON.stringify({config:value()})});info.textContent='Settings saved on this computer. This is not a successful model test; send a message to test the selected model. No model was downloaded or switched automatically.';}catch(e){info.textContent=e.message;}finally{setBusy(false);}}));
  panel.append(ai);
  api('/api/ai/settings').then(({payload})=>{const c=payload.config;enabled.checked=c.enabled;base.value=c.baseUrl;model.value=c.model;profile.value=c.profile;format.value=c.format;roles.value=c.roles;budget.value=c.contextChars;tokens.value=c.replyTokens;timeout.value=c.timeoutMs/1000;}).catch(e=>{info.textContent=e.message;});
})();
