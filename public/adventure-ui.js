/* Story-first workspace. Moves existing controls; authoritative handlers are retained.
 * The narrow render/navigation/dialog adapters below are presentation only.
 * No API payload, model prompt, campaign record or save schema is changed here. */
(function(){
 'use strict';
 const U=window.BriarwatchView;
 const needed=['gameLayout','chatFoundation','chatMode','chatTranscript','storyJournal','localAISettings','tabInventory','tabJournal','tabSaves'];
 if(!U||needed.some(id=>!document.getElementById(id)))return;
 const byId=id=>document.getElementById(id);
 const el=(tag,cls,text)=>createElement(tag,cls,text);
 const button=(text,fn,readOnly=true)=>{const b=el('button','btn btn-secondary',text);b.type='button';if(readOnly)b.dataset.readOnly='true';b.addEventListener('click',fn);return b;};
 document.body.classList.add('story-workspace');
 const main=dom.gameLayout,sourceColumn=main.querySelector('.story-column'),left=main.querySelector('.left-rail'),right=main.querySelector('.right-rail');
 let active='adventure',filter='all',lastSignature='',campaignKey='',follow=true,previousTop=0,lastFocused=null;
 const panes={},tabs={};
 const nav=el('nav','workspace-nav');nav.id='workspaceNav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Game sections');
 for(const [id,label]of [['adventure','Adventure'],['party','Party'],['journal','Journal'],['prepare','Prepare'],['settings','Settings']]){
  const b=button(label,()=>navigate(id));b.id='nav-'+id;b.dataset.section=id;b.setAttribute('role','tab');b.setAttribute('aria-controls','workspace-'+id);
  const pane=el('section','workspace-pane');pane.id='workspace-'+id;pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',b.id);pane.tabIndex=0;
  panes[id]=pane;tabs[id]=b;nav.append(b);
 }
 // Keep destinations attached while moving controls so later ID lookups remain valid.
 main.append(...Object.values(panes));
 const heading=(pane,text,description)=>{pane.append(el('h2','workspace-title',text));if(description)pane.append(el('p','muted',description));};
 heading(panes.party,'Party & pack','Your existing character sheet, companions and equipment. Inspecting an item does not use it.');
 heading(panes.journal,'Campaign journal','Confirmed evidence, uncertain reports, promises and personal notes remain distinct.');
 heading(panes.prepare,'Prepare for the road','Recovery, development, supplies and expeditions. Only currently available services and discovered information are shown.');
 heading(panes.settings,'Saves & settings','Local campaign saves and optional model settings. Changing a screen never enables a model.');
 const storyCard=dom.narrationText.closest('.scene-card');
 const objective=dom.sceneObjective.closest('.objective-box');
 const overview=el('header','adventure-overview');overview.id='adventureOverview';
 const where=el('div','scene-meta-row');where.append(dom.sceneAct,dom.sceneLocation);
 overview.append(where,dom.sceneTitle,objective);
 const partyStrip=button('',()=>navigate('party'));partyStrip.id='partySnapshot';partyStrip.classList.add('party-snapshot');
 overview.append(partyStrip);
 const shortcuts=el('div','adventure-shortcuts');
 shortcuts.append(button('Available approaches',()=>{approaches.open=true;approaches.scrollIntoView({block:'start'});approaches.querySelector('summary').focus();}),button('Preparation & development',()=>navigate('prepare')));
 overview.append(shortcuts);
 const scroll=el('div','adventure-scroll');scroll.id='adventureScroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Story and recent conversation');
 const conversation=byId('chatTranscript');conversation.setAttribute('aria-live','off');conversation.classList.add('adventure-conversation');
 const historyLabel=el('p','history-caption','Recent conversation · older verified records are in Journal');
 storyCard.prepend(historyLabel,conversation);
 storyCard.querySelector('.scene-meta-row')?.remove();
 const latest=byId('narrationCard');latest.setAttribute('aria-label','Latest story response');latest.tabIndex=-1;
 const approaches=el('details','adventure-approaches');approaches.id='adventureApproaches';approaches.open=true;
 const approachTitle=el('summary','','Available approaches');approaches.append(approachTitle,byId('roadScenario'),byId('chatScenario'),dom.choicePanel);
 const mechanics=el('details','adventure-mechanics');mechanics.id='mechanicsDetails';mechanics.append(el('summary','','Dice & confirmed consequences'),dom.eventFeed.closest('section'));
 // A proposal can be long: keep it in the reading flow, not the input's fixed row.
 scroll.append(storyCard,byId('chatPending'),byId('intentPanel'),dom.combatPanel,approaches,mechanics);
 const composer=el('section','adventure-composer');composer.id='adventureComposer';composer.setAttribute('aria-label','Your message');
 const unread=button('New response — jump to latest',()=>{navigate('adventure');jumpToLatest();});unread.id='newReplyBtn';unread.hidden=true;
 const modes=el('div','message-modes');modes.id='messageModes';modes.setAttribute('role','radiogroup');modes.setAttribute('aria-label','Message mode');
 const backing=byId('chatMode');backing.parentElement.classList.add('workspace-sr-only');backing.tabIndex=-1;backing.setAttribute('aria-hidden','true');
 // Replacement instructions have their own editor, not an everyday message mode.
 backing.querySelector('option[value=instructions]')?.remove();
 const modeButtons={};
 function selectMode(id,focus=false){const selected=U.mode(id);backing.value=selected.id;for(const [key,b]of Object.entries(modeButtons)){b.setAttribute('aria-checked',String(key===selected.id));b.tabIndex=key===selected.id?0:-1;}modeHelp.textContent=selected.help;if(focus)modeButtons[selected.id].focus();}
 for(const id of ['action','dialogue','question']){const m=U.mode(id),b=button(m.label,()=>selectMode(id));b.id='mode-'+id;b.setAttribute('role','radio');b.setAttribute('aria-describedby','messageModeHelp');modeButtons[id]=b;modes.append(b);}
 const modeHelp=el('p','mode-help');modeHelp.id='messageModeHelp';
 const settingsLink=button('Campaign instructions',()=>openInstructions(),false);settingsLink.id='editInstructionsBtn';
 const modeRow=el('div','composer-toolbar');modeRow.append(modes,settingsLink);
 composer.append(backing.parentElement,unread,modeRow,modeHelp,dom.actionForm,byId('actionFeedback'),byId('chatStatus'));
 const cancel=byId('chatFoundation').querySelector('button[data-keep-enabled]');if(cancel)composer.append(cancel);
 dom.actionInput.setAttribute('aria-label','Your message');dom.actionInput.setAttribute('aria-describedby','messageModeHelp');
 const foundation=byId('chatFoundation'),memory=byId('campaignInstructions').closest('details'),tools=foundation.querySelector('.chat-controls');
 const oldEdit=memory.querySelector('button');if(oldEdit)oldEdit.remove();
 memory.append(button('Edit campaign instructions',()=>openInstructions(),false));
 const help=el('details','workspace-help');help.id='sideAdventures';help.append(el('summary','','Side adventures & rules'),tools);
 tools.addEventListener('click',event=>{if(event.target.closest('button'))navigate('adventure');},true);
 panes.adventure.append(overview,scroll,composer);
 panes.party.append(left,byId('tabInventory'));left.classList.add('party-sheet');
 panes.prepare.append(byId('progressionPanel'),byId('worldPanel'));
 const journal=byId('storyJournal');journal.open=true;
 const journalFilters=el('div','journal-filters');journalFilters.setAttribute('role','group');journalFilters.setAttribute('aria-label','Journal filter');
 for(const [id,label]of [['all','All'],['leads','Leads'],['evidence','Evidence & rumors'],['promises','Promises'],['people','People'],['notes','Notes'],['completed','Completed']]){const b=button(label,()=>{filter=id;filterJournal();});b.dataset.filter=id;journalFilters.append(b);}
 journal.insertBefore(journalFilters,byId('journalRecords'));
 // The old clues/history join the same destination, retaining their original renderers.
 panes.journal.append(journal,byId('tabJournal'));
 panes.settings.append(byId('tabSaves'),memory,byId('localAISettings'));panes.prepare.append(help);
 const reading=el('label','reading-setting','Reading size '),size=el('select');size.id='readingSize';size.dataset.readOnly='true';
 for(const [id,label]of [['normal','Standard'],['large','Larger'],['larger','Largest']]){const o=el('option','',label);o.value=id;size.append(o);}reading.append(size);panes.settings.append(reading);
 try{size.value=U.readingSize(localStorage.getItem('briarwatch-reading-size'));}catch{}
 function setReading(){document.body.dataset.readingSize=U.readingSize(size.value);try{localStorage.setItem('briarwatch-reading-size',size.value);}catch{}measure();}
 size.addEventListener('change',setReading);
 for(const id of ['tabInventory','tabJournal','tabSaves'])byId(id).classList.remove('is-hidden');
 // Offline testing/backup tools are still available, but no longer precede every story.
 const preview=document.querySelector('.app-shell > .preview-notice');if(preview){const d=el('details','workspace-help');d.id='offlineTools';d.append(el('summary','','Offline backups & sandbox tools'),preview);panes.settings.append(d);}
 const setupPreview=document.querySelector('.setup-card > .preview-notice');if(setupPreview){const d=el('details','workspace-help');d.id='setupOfflineTools';d.append(el('summary','','Offline backups & sandbox tools'),setupPreview);byId('resumePanel').append(d);}
 foundation.remove();sourceColumn.remove();right.remove();
 main.replaceChildren(nav,...Object.values(panes));
 const announcement=el('p','workspace-sr-only');announcement.id='workspaceAnnouncement';announcement.setAttribute('role','status');announcement.setAttribute('aria-live','polite');main.append(announcement);
 const mobileDraft=button('Back to your message',()=>{navigate('adventure');dom.actionInput.focus();});mobileDraft.id='returnToMessage';mobileDraft.classList.add('return-to-message');
 main.append(mobileDraft);
 const skip=el('a','workspace-skip','Skip to adventure');skip.href='#workspace-adventure';skip.addEventListener('click',e=>{e.preventDefault();navigate('adventure');panes.adventure.focus();});document.body.prepend(skip);
 setActiveTab=function(id){navigate(U.section(id));}; // Compatibility for existing callers; original controls were moved, not copied.
 function navigate(id){
  active=U.section(id);
  for(const [key,p]of Object.entries(panes)){p.hidden=key!==active;const b=tabs[key];b.setAttribute('aria-selected',String(key===active));b.tabIndex=key===active?0:-1;}
  mobileDraft.hidden=active==='adventure';
  if(active==='settings'&&!busy)void refreshSaves();
  measure();
 }
 function arrowGroup(event,items,activate){const i=items.indexOf(event.target);if(i<0)return;const n=U.nextIndex(event.key,i,items.length);if(n===null)return;event.preventDefault();activate(items[n]);items[n].focus();}
 nav.addEventListener('keydown',e=>arrowGroup(e,Object.values(tabs),b=>navigate(b.dataset.section)));
 modes.addEventListener('keydown',e=>arrowGroup(e,Object.values(modeButtons),b=>selectMode(b.id.slice(5))));
 backing.addEventListener('change',()=>selectMode(backing.value));
 scroll.addEventListener('scroll',()=>{previousTop=scroll.scrollTop;follow=U.nearEnd(scroll);},{passive:true});
 function jumpToLatest(){latest.scrollIntoView({block:'start',behavior:'instant'});unread.hidden=true;latest.focus({preventScroll:true});}
 function filterJournal(){
  for(const b of journalFilters.children)b.setAttribute('aria-pressed',String(b.dataset.filter===filter));
  for(const group of journal.querySelectorAll('[data-journal-group]'))group.hidden=!U.showGroup(filter,group.dataset.journalGroup);
  byId('tabJournal').hidden=!['all','evidence','completed'].includes(filter);
  byId('clueList').closest('section').hidden=!['all','evidence'].includes(filter);
  byId('historyList').closest('section').hidden=!['all','completed'].includes(filter);
 }
 function measure(){if(active!=='adventure'||main.classList.contains('is-hidden'))return;
  // At narrow widths the overview wraps to several lines. Scroll it with the
  // story rather than forcing an oversized auto row above the message composer.
  // Move the existing node; do not clone controls or create a second objective.
  const compact=window.innerWidth<=760;
  panes.adventure.classList.toggle('adventure-compact',compact);
  if(compact&&overview.parentElement!==scroll)scroll.prepend(overview);
  else if(!compact&&overview.parentElement!==panes.adventure)panes.adventure.prepend(overview);
  const height=Math.max(280,window.innerHeight-panes.adventure.getBoundingClientRect().top-12);
  panes.adventure.style.setProperty('--workspace-height',height+'px');
 }
 function sync(){
  if(!state||!view)return;
  const identity=[state.createdAt,state.campaignId,state.player.name,state.publicTest?.mode||'normal'].join('|');
  if(identity!==campaignKey){campaignKey=identity;lastSignature='';follow=true;previousTop=0;unread.hidden=true;navigate('adventure');}
  partyStrip.textContent=U.partySummary(view);
  const rows=(view.chat?.history||[]).slice(-8),duplicate=U.duplicateLast(rows,dom.narrationText.textContent);
  [...conversation.children].forEach((node,i)=>{node.hidden=i===duplicate;});
  historyLabel.hidden=!rows.length||rows.length===1&&duplicate===0;
  dom.choicePanel.hidden=Boolean(view.chat?.road?.present||view.chat?.courier?.active&&view.chat?.courierAvailable);
  byId('roadScenario').hidden=!view.chat?.road;
  byId('chatScenario').hidden=!view.chat?.courier;
  approaches.hidden=Boolean(view.combat?.active); // All combat controls remain in the separate active initiative panel.
  selectMode(backing.value);filterJournal();measure();
  if(lastFocused&&!lastFocused.isConnected&&document.activeElement===document.body&&!visibleModal()&&!document.querySelector('dialog[open]')){
   const replacement=lastFocused.id?byId(lastFocused.id):null;
   (replacement&&!replacement.disabled&&replacement.getClientRects().length?replacement:panes[active]).focus({preventScroll:true});
  }
  const signature=JSON.stringify([identity,dom.narrationText.textContent,rows,view.chat?.pending]);
  if(signature!==lastSignature){
   const first=!lastSignature;lastSignature=signature;
   if(!first){announcement.textContent='New response available in Adventure.';if(active!=='adventure'||!follow)unread.hidden=false;}
   if(first)scroll.scrollTop=0;
   else if(follow&&active==='adventure'){const box=latest.getBoundingClientRect(),frame=scroll.getBoundingClientRect();if(box.bottom>frame.bottom)scroll.scrollTop+=box.bottom-frame.bottom;if(box.top<frame.top)scroll.scrollTop+=box.top-frame.top;unread.hidden=true;}
   else scroll.scrollTop=previousTop;
  }
 }
 const baseRender=renderGame;
 renderGame=function(){const top=scroll.scrollTop,near=U.nearEnd(scroll);baseRender();previousTop=top;follow=near;sync();};
 // Chat also rerenders at the end of its own awaited operation. Observe only child
 // content, not our hidden/ARIA attributes, so this cannot create a render loop.
 const observer=new MutationObserver(()=>sync());observer.observe(conversation,{childList:true});
 let instructionDialog=null;
 function openInstructions(){
  if(busy||!state||instructionDialog)return;
  const previous=document.activeElement,d=el('dialog','instruction-dialog');instructionDialog=d;d.id='instructionsDialog';d.setAttribute('aria-labelledby','instructionsTitle');
  const title=el('h2','','Campaign instructions');title.id='instructionsTitle';
  const helpText=el('p','muted','These preferences guide future AI replies, not rules or established facts. Saving replaces the existing instructions; a blank value clears them. Your unsent message is kept.');helpText.id='instructionsHelp';
  const input=el('textarea');input.id='instructionsEditor';input.maxLength=2000;input.rows=7;input.value=view.chat?.instructions||'';input.setAttribute('aria-label','Campaign instructions');input.setAttribute('aria-describedby',helpText.id);
  const status=el('p','action-feedback');status.id='instructionsStatus';status.setAttribute('role','status');
  const cancel=button('Cancel',()=>{if(!busy)d.close();});cancel.dataset.keepEnabled='true';
  const save=button('Save instructions',async()=>{
   if(busy)return;const value=input.value.trim();save.disabled=true;
   await sendAction({type:'chat-instructions',text:value});
   if((view?.chat?.instructions||'')===value){d.close();}else{status.textContent='Instructions were not saved. Your editor text is still here.';save.disabled=false;}
  },false);save.id='saveInstructionsBtn';
  const actions=el('div','session-decision-actions');actions.append(cancel,save);d.append(title,helpText,input,status,actions);document.body.append(d);
  d.addEventListener('close',()=>{d.remove();instructionDialog=null;if(previous?.isConnected&&!previous.disabled)previous.focus();},{once:true});
  d.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  d.showModal();input.focus();
 }
 // Existing target chooser and setup overlay were non-native dialogs. Add inert
 // background, focus entry/containment and a return point without changing actions.
 let pseudo=null,pseudoReturn=null,inertBefore=false;
 const setupCard=dom.setupOverlay.querySelector('.setup-card'),shell=document.querySelector('.app-shell');
 function visibleModal(){if(!dom.targetDialog.classList.contains('is-hidden'))return dom.targetDialog;if(!dom.setupOverlay.classList.contains('is-hidden'))return setupCard;return null;}
 function focusables(root){return [...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex="0"]')].filter(n=>n.getClientRects().length&&!n.closest('[hidden]'));}
 function modalSync(){
  const next=visibleModal();if(next===pseudo)return;
  if(pseudo){shell.inert=inertBefore;const restore=pseudoReturn;pseudo=null;pseudoReturn=null;if(!next&&restore?.isConnected&&!restore.disabled)restore.focus({preventScroll:true});}
  if(next){pseudo=next;pseudoReturn=document.activeElement;inertBefore=shell.inert;shell.inert=true;
   const title=next===setupCard?byId('setupTitle'):dom.targetDialogTitle;title.tabIndex=-1;title.focus({preventScroll:true});}
 }
 const modalObserver=new MutationObserver(modalSync);modalObserver.observe(dom.targetDialog,{attributes:true,attributeFilter:['class']});modalObserver.observe(dom.setupOverlay,{attributes:true,attributeFilter:['class']});
 document.addEventListener('keydown',event=>{
  const native=document.querySelector('dialog[open]');const current=native||visibleModal();if(!current)return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();event.stopImmediatePropagation();return;}
  if(native)return;
  if(event.key==='Escape'&&current===setupCard&&state&&!busy){event.preventDefault();event.stopImmediatePropagation();byId('returnToGameBtn').click();return;}
  if(event.key==='Tab'){const items=focusables(current);if(!items.length){event.preventDefault();return;}const first=items[0],last=items.at(-1);if(event.shiftKey&&(!current.contains(document.activeElement)||document.activeElement===first||document.activeElement.tabIndex===-1)){event.preventDefault();last.focus();}else if(!event.shiftKey&&(!current.contains(document.activeElement)||document.activeElement===last||document.activeElement.tabIndex===-1)){event.preventDefault();first.focus();}}
 },true);
 document.addEventListener('focusin',e=>{lastFocused=e.target;});
 window.addEventListener('resize',measure);
 if(window.ResizeObserver){const resize=new ResizeObserver(measure);resize.observe(document.querySelector('.topbar'));resize.observe(nav);}
 window.BriarwatchAdventure={navigate,selectMode,openInstructions,sync,active:()=>active};
 navigate('adventure');selectMode('action');setReading();modalSync();sync();
})();
