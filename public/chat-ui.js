/* Chat foundation UI: campaign data works offline; the model stays on the local server. */
(function () {
  'use strict';
  const offline=Boolean(window.BriarwatchOffline);
  const panel=createElement('section','chat-foundation');panel.id='chatFoundation';
  panel.append(createElement('h3','','Chat with the guide'));
  const mode=createElement('select');mode.id='chatMode';mode.setAttribute('aria-label','Chat message type');
  for(const [id,label]of [['action','Attempt an action'],['dialogue','Speak in character'],['question','Ask a question'],['instructions','Campaign instructions (replace)']]){const o=createElement('option','',label);o.value=id;mode.append(o);}
  const label=createElement('label','','Message type ');label.append(mode);panel.append(label);
  panel.append(createElement('p','muted','Campaign instructions tell the AI game master what tone and style you like. They never change the rules. You always see the odds and confirm before anything you type is rolled.'));
  const memory=createElement('details');const summary=createElement('summary','','Saved campaign instructions');memory.append(summary);
  const saved=createElement('p');saved.id='campaignInstructions';memory.append(saved);
  const edit=createElement('button','btn btn-secondary btn-small','Edit instructions');edit.type='button';edit.addEventListener('click',()=>{mode.value='instructions';dom.actionInput.value=view?.chat?.instructions||'';dom.actionInput.focus();});memory.append(edit);panel.append(memory);
  const tools=createElement('div','chat-controls');
  function button(text,fn){const b=createElement('button','btn btn-secondary btn-small',text);b.type='button';b.addEventListener('click',fn);return b;}
  tools.append(button('Start courier scenario',()=>send('/scenario')),button('Pause courier scenario',()=>send('/pause')),button('Start Lantern Road',()=>send('/journey')),button('Pause Lantern Road',()=>send('/pause')),button('Explain rules',()=>send('/rules')));panel.append(tools);
  const facts=createElement('div');facts.id='chatScenario';panel.append(facts);
  const road=createElement('div');road.id='roadScenario';panel.append(road);
  const journal=createElement('details','story-journal');journal.id='storyJournal';
  const journalTitle=createElement('summary','','Campaign journal');journal.append(journalTitle);
  journal.append(createElement('p','muted','What you have learned, who you know and what you have promised. Rumours are marked until you confirm them.'));
  const journalRecords=createElement('div');journalRecords.id='journalRecords';journal.append(journalRecords);
  const noteLabel=createElement('label','','Your note (up to 400 characters)');
  const noteInput=createElement('textarea');noteInput.id='journalNoteInput';noteInput.maxLength=400;noteInput.rows=2;noteInput.setAttribute('aria-label','Journal player note');noteLabel.append(noteInput);journal.append(noteLabel);
  journal.append(button('Save player note',async()=>{const value=noteInput.value.trim();if(!value)return;await send('/note '+value);if(view?.journal?.notes?.some(n=>n.text===value))noteInput.value='';}));
  journal.append(button('Recap our adventure',()=>send('/journal')));
  panel.append(journal);
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
  dom.actionInput.placeholder='What do you do?';

  async function send(text,extra={}){
    if(!state||busy)return;
    showActionFeedback();setBusy(true, "model");const started=Date.now();cancel.classList.toggle('is-hidden',offline);
    const update=()=>{const waited=Math.floor((Date.now()-started)/1000);status.textContent=waited<2?'':`The game master is thinking · ${waited}s${waited>=20?'. A local model can take several minutes; nothing is retried or charged twice.':''}`;};update();
    const timer=setInterval(update,1000);
    try{
      const attempted=view?.chat?.pending?.label||'';lastRoll=null;
      const request={mode:mode.value,text,requestId:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2),...extra};
      const {payload}=await api('/api/chat',{method:'POST',body:JSON.stringify({state,request})});
      ingestPayload(payload);
      // Keep the dice result of an improvised attempt on screen beside the story.
      if(extra.confirm&&payload.result?.kind==='improvise')lastRoll={intent:attempted,success:Boolean(payload.result.success),roll:(payload.events||[]).find(e=>e.type==='roll')?.roll||null,turn:payload.state?.turnCount};
      status.textContent=payload.result?.ok===false?'Message not applied. Your mechanical progress is unchanged.':'';
      const routing=payload.result?.responseType;
      if(routing?.adjusted)status.textContent=`Kept in ${routing.effective} mode; the model labelled this ${routing.returned}. Read-only: no action was performed. This does not verify the answer's facts.`;
      if(payload.result?.ok===false&&!extra.confirm&&!dom.actionInput.value)dom.actionInput.value=text;
    }catch(e){status.textContent=e.message;showActionFeedback(e.message);if(!extra.confirm&&!dom.actionInput.value)dom.actionInput.value=text;toast(e.message,'warning');}
    finally{clearInterval(timer);cancel.classList.add('is-hidden');setBusy(false);render();}
  }
  // Story director: an optional wish in the message box becomes the hint.
  function adventure(){const hint=dom.actionInput.value.trim();dom.actionInput.value='';return send(('/adventure '+hint).trim());}
  // 3rd job trial: written by Claude for your branch when the AI is on, otherwise the written trial.
  function trial(){return send('/trial');}
  // One card for an improvised attempt: the odds, what is at stake and the roll button together.
  let lastRoll=null;
  function rollCard(p){
    const head=createElement('div','roll-card-head');head.append(createElement('strong','',p.intent));
    pending.append(head);
    if(p.check){
      const odds=createElement('span','roll-card-odds',p.check.chance+'%');odds.dataset.odds=p.check.chance>=65?'good':p.check.chance>=40?'even':'poor';
      odds.setAttribute('aria-label',`${p.check.chance}% chance to succeed`);head.append(odds);
      const meter=createElement('div','roll-card-meter'),fill=createElement('span');fill.style.width=Math.max(2,Math.min(100,p.check.chance))+'%';fill.dataset.odds=odds.dataset.odds;meter.append(fill);meter.setAttribute('aria-hidden','true');
      const bonus=(p.check.bonus>=0?'+':'')+p.check.bonus;
      pending.append(meter,createElement('p','muted roll-card-check',`${p.check.actor} rolls ${p.check.name} ${bonus} and needs ${p.check.dc} or more${p.check.mode==='normal'?'':' · rolling with '+p.check.mode}.`));
    }else pending.append(createElement('p','muted roll-card-check','No roll needed. This simply works.'));
    const stakes=createElement('div','roll-card-stakes');
    const side=(kind,title,text,extra)=>{const box=createElement('div','roll-card-side');box.dataset.kind=kind;box.append(createElement('span','roll-card-label',title),createElement('p','',text));if(extra)box.append(createElement('p','muted',extra));stakes.append(box);};
    const plain=value=>value&&value!=='nothing beyond the story'?value:'';
    side('win',p.check?'If it works':'What happens',p.success,plain(p.reward)&&'You gain '+p.reward+'.');
    if(p.check)side('lose','If it fails',p.failure,plain(p.risk)&&'You risk '+p.risk+'.');
    pending.append(stakes);
    for(const note of p.notes||[])pending.append(createElement('p','muted',note));
    const actions=createElement('div','roll-card-actions'),go=button(p.check?'Roll the dice':'Yes, do it',()=>send('',{confirm:true}));go.classList.remove('btn-secondary');go.classList.add('btn-primary');
    actions.append(go,button('No, cancel',()=>send('',{cancel:true})));
    pending.append(actions,createElement('p','muted','No roll or resource change has happened yet.'));
  }
  function render(){
    if(!state||!view)return;
    const c=view.chat||{};saved.textContent=c.instructions||'No campaign preferences saved yet.';
    const j=view.journal||{};clear(journalRecords);
    if(j.current)journalRecords.append(createElement('p','',`Current: ${j.current.scene}. ${j.current.objective}`));
    const headings={leads:'Unresolved leads',promises:'Promises',rumors:'Rumors and reports',relationships:'Relationships',facts:'Verified facts',completed:'Completed adventures',notes:'Your notes'};
    let total=0;
    for(const [group,title]of Object.entries(headings)){
      const entries=j[group]||[];total+=entries.length;
      const block=createElement('section','journal-section');block.dataset.journalGroup=group;
      block.append(createElement('h4','',title));
      if(!entries.length)block.append(createElement('p','muted','Nothing yet.'));
      for(const entry of entries){
        const row=createElement('div','journal-record');row.dataset.journalId=entry.id;
        row.append(createElement('strong','',`${entry.title||entry.id} [${entry.status}${entry.value!==undefined?', '+entry.value:''}]`),createElement('p','',entry.text));
        if(entry.source)row.append(createElement('small','muted',entry.source));
        if(group==='notes')row.append(button('Remove '+entry.id,()=>send('/forget-note '+entry.id)));
        block.append(row);
      }
      journalRecords.append(block);
    }
    journalTitle.textContent=`Campaign journal · ${total} records`;

    clear(transcript);for(const entry of (c.history||[]).slice(-8)){const row=createElement('p','chat-'+entry.role);row.append(createElement('strong','',entry.role==='player'?'You: ':entry.role==='rules'?'':'Game master: '),document.createTextNode(entry.text));transcript.append(row);}
    clear(road);
    const journey=c.road;
    if(journey){road.append(createElement('h4','',journey.title),createElement('p','',journey.phase==='complete'?'Delivery completed — reward recorded once':(journey.active?'Active: ':'Paused: ')+journey.phase));
      for(const line of journey.facts||[])road.append(createElement('p','muted',line));
      for(const option of journey.options||[])road.append(button(option.label,()=>send('road:'+option.id,{mode:'action'})),createElement('p','muted',option.description));
    }
    for(const b of tools.querySelectorAll('button')){if(b.textContent==='Start Lantern Road')b.disabled=busy||!c.roadAvailable||journey?.phase==='complete';if(b.textContent==='Pause Lantern Road')b.disabled=busy||!journey?.active;}
    clear(pending);
    pending.classList.toggle('roll-card',Boolean(c.pending&&c.pendingPreview));pending.classList.remove('roll-result');
    if(!c.pending&&lastRoll&&lastRoll.turn===state?.turnCount){pending.classList.add('roll-result');pending.dataset.outcome=lastRoll.success?'success':'failure';
      pending.append(createElement('strong','',lastRoll.success?'Success':'It did not work'),createElement('span','',lastRoll.roll?` · you rolled ${lastRoll.roll.total} and needed ${lastRoll.roll.dc}`:' · no roll was needed'),createElement('p','muted',lastRoll.intent||''));}
    if(c.pending&&c.pendingPreview)rollCard(c.pendingPreview);
    else if(c.pending){pending.append(createElement('strong','','Do this? '+c.pending.label),createElement('p','muted','No roll or resource change has happened yet.'),button('Yes, do it',()=>send('',{confirm:true})),button('No, cancel',()=>send('',{cancel:true})));}
    clear(facts);if(c.courier){facts.append(createElement('strong','',c.courier.resolved?'Courier helped — reward recorded once':c.courier.active?'Courier scenario active':'Courier scenario paused'));for(const line of c.courier.facts||[])facts.append(createElement('p','muted',line));
      for(const option of c.courierOptions||[]){const b=button(option.label,()=>send(option.label,{mode:'action'}));b.title=option.description;facts.append(b,createElement('p','muted',option.description));}
      if(c.courier.active&&!c.courierAvailable)facts.append(createElement('p','muted','Return to Briarwatch outside combat to continue this side story, or pause it.'));}
  }
  window.BriarwatchChat={send,render,adventure,trial};

  const ai=createElement('details','chat-ai-settings');ai.id='localAISettings';ai.append(createElement('summary','','AI settings'));
  if(offline){ai.append(createElement('p','muted','This downloadable browser edition makes no model requests. Instructions, saves, exact approaches and the courier scenario work offline. Use the Node server edition to connect the Claude API or a local model.'));panel.append(ai);return;}
  ai.append(createElement('p','muted','With the AI game master on, you can type anything you want to try and Claude narrates the story. The game still rolls the dice and keeps track of items, gold and experience.'));
  let target=ai;
  function field(name,id,type='text'){const box=createElement('label','chat-field',name);const input=createElement('input');input.id=id;input.type=type;box.append(input);target.append(box);return input;}
  function select(name,id,entries){const box=createElement('label','chat-field',name),s=createElement('select');s.id=id;for(const [value,title]of entries){const o=createElement('option','',title);o.value=value;s.append(o);}box.append(s);target.append(box);return s;}
  const enabled=field('Turn on the AI game master','localAIEnabled','checkbox');
  const provider=select('Provider','aiProvider',[['claude','Claude API (recommended)'],['local','Local model server']]);
  const narration=field('Let the AI narrate story scenes','aiNarration','checkbox');
  const claudeBox=createElement('div','chat-provider');claudeBox.id='claudeSettings';ai.append(claudeBox);target=claudeBox;
  const claudeModel=select('Claude model','claudeModel',[['claude-opus-5-5','Claude Opus 5.5 · best storytelling'],['claude-sonnet-5-5','Claude Sonnet 5.5 · faster, cheaper'],['claude-haiku-5-5','Claude Haiku 5.5 · fastest, cheapest']]);
  const effort=select('Thinking effort','claudeEffort',[['low','Low · quickest replies'],['medium','Medium'],['high','High · slowest, most careful']]);
  const keyPanel=createElement('div','gm-key');keyPanel.id='claudeKeyPanel';claudeBox.append(keyPanel);
  const localBox=createElement('div','chat-provider');localBox.id='localModelSettings';ai.append(localBox);target=localBox;
  const base=field('Local API address','localAIBase');base.value='http://127.0.0.1:1234/v1';
  const model=field('Exact model ID','localAIModel');const dl=createElement('datalist');dl.id='installedLocalModels';model.setAttribute('list',dl.id);localBox.append(dl);
  const profile=select('Workload profile','localAIProfile',[['compact','Compact · 7B-class starting point'],['balanced','Balanced · 12B-class starting point'],['expanded','Expanded · 27B-class starting point']]);
  const format=select('Response format','localAIFormat',[['plain-json','Plain JSON · broad compatibility'],['json-schema','JSON Schema · only when supported by the server/model']]);
  const roles=select('Prompt template','localAIRoles',[['system-user','System + user messages'],['single-user','Single user message · alternate templates']]);
  const budget=field('Context character budget (not tokens)','localAIContext','number');budget.min=4000;budget.max=32000;budget.value=8000;
  const tokens=field('Maximum reply tokens','localAITokens','number');tokens.min=64;tokens.max=768;tokens.value=160;
  const uncapped=field('Uncapped requested output (compatible local servers only)','localAIUncapped','checkbox');
  uncapped.addEventListener('change',()=>{tokens.disabled=uncapped.checked;tokens.dataset.disabled=String(uncapped.checked);});
  localBox.append(createElement('p','muted','Uncapped sends max_tokens=-1. It does not remove the wait limit or the response-size guard.'));
  target=ai;
  const timeout=field('Wait limit per request, in seconds','localAITimeout','number');timeout.min=3;timeout.max=600;timeout.value=600;
  const info=createElement('p','muted');info.id='aiSettingsStatus';ai.append(info);
  const showProvider=()=>{claudeBox.hidden=provider.value!=='claude';localBox.hidden=provider.value!=='local';};
  provider.addEventListener('change',showProvider);
  profile.addEventListener('change',()=>{const p={compact:[8000,160],balanced:[14000,240],expanded:[22000,320]}[profile.value];budget.value=p[0];tokens.value=p[1];});
  const value=()=>{const common={enabled:enabled.checked,provider:provider.value,narration:narration.checked,claudeModel:claudeModel.value,effort:effort.value,baseUrl:base.value.trim(),model:model.value.trim(),profile:profile.value,format:format.value,roles:roles.value,timeoutMs:Number(timeout.value)*1000};
    return provider.value==='local'?{...common,contextChars:Number(budget.value),replyTokens:uncapped.checked?-1:Number(tokens.value)}:common;};
  localBox.append(button('List installed models',async()=>{if(busy)return;setBusy(true);try{const {payload}=await api('/api/ai/models',{method:'POST',body:JSON.stringify({config:{...value(),enabled:false}})});clear(dl);for(const id of payload.models){const o=createElement('option');o.value=id;dl.append(o);}info.textContent=`Found ${payload.models.length} model identifiers. Select one in the model field.`;}catch(e){info.textContent=e.message;}finally{setBusy(false);}}));
  ai.append(button('Save AI settings',async()=>{if(busy)return;setBusy(true);try{await api('/api/ai/settings',{method:'POST',body:JSON.stringify({config:value()})});info.textContent='Settings saved. Go to Adventure and type what you want to do.';}catch(e){info.textContent=e.message;}finally{setBusy(false);}}));
  panel.append(ai);showProvider();
  const load=()=>api('/api/ai/settings').then(({payload})=>{const c=payload.config;enabled.checked=c.enabled;provider.value=c.provider;narration.checked=c.narration;claudeModel.value=c.claudeModel;effort.value=c.effort;
    base.value=c.baseUrl;model.value=c.model;profile.value=c.profile;format.value=c.format;roles.value=c.roles;
    if(c.provider==='local'){budget.value=c.contextChars;uncapped.checked=c.replyTokens===-1;tokens.value=uncapped.checked?{compact:160,balanced:240,expanded:320}[c.profile]:c.replyTokens;}
    tokens.disabled=uncapped.checked;tokens.dataset.disabled=String(uncapped.checked);timeout.value=c.timeoutMs/1000;showProvider();}).catch(e=>{info.textContent=e.message;});
  load();
  // The key box turns the AI game master on by itself; show that in this form.
  document.addEventListener('briarwatch:ai-saved',load);
})();
