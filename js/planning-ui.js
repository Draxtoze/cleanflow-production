import {assignmentTotal,id} from './business.js';
export function createPlanningUI({state,store,tr,esc,dateLabel,formatPLN,installDogFields,readCleaningSnapshot,onSaved}){
 const t=(key,values)=>tr('planning.'+key,values),label=key=>esc(t(key));
 function open({job,staff,date,options}){
  const previous=document.activeElement,previousOverflow=document.body.style.overflow,baseline=job?structuredClone(job):null;
  document.body.style.overflow='hidden';
  const root=document.createElement('div');root.className='modal-backdrop planning-backdrop';
  root.innerHTML='<section class="modal planning-panel" role="dialog" aria-modal="true"><header></header><div class="planning-workspace"><div class="planning-scroll" tabindex="0"><form></form></div><aside class="planning-summary" aria-live="polite" aria-atomic="true"></aside></div><footer></footer></section>';
  const panel=root.querySelector('section'),header=panel.querySelector('header'),form=panel.querySelector('form'),footer=panel.querySelector('footer'),summary=panel.querySelector('.planning-summary'),scroll=panel.querySelector('.planning-scroll');
  const drafts=new Map(),newId=id();let stage=job?.status==='confirmed'?'correct':'plan',busy=false,prompt=null;
  const initial=(job?.apartments||[]).map(x=>structuredClone(x));
  drafts.set(stage,{items:initial,notes:job?.notes||'',query:''});
  const errorText=e=>e.message?.startsWith('planning.')?tr(e.message):tr('ops.bonusInvalid')===e.message?e.message:t('invalid');
  function close(){if(busy)return;prompt?.remove();root.remove();document.body.style.overflow=previousOverflow;previous?.isConnected&&previous.focus();}
  function read(){return readDisplayed();}
  function currentOptions(){
   if(stage==='confirm'){
    const source=job?initial:drafts.get('plan').items;
    return source.map(snapshot=>{const option=options.find(x=>x.id===snapshot.apartmentId);return {...option,id:snapshot.apartmentId,name:snapshot.name,snapshot,priceGrosz:snapshot.priceGrosz};});
   }
   return options;
  }
  function grouped(items,selected){
   const groups=[['selection',()=>false],['priorities',x=>x.priority],['checkouts',x=>!x.priority&&x.departure],['other',x=>!x.priority&&!x.departure]];
   return groups.map(([key,test])=>{const own=items.filter(test);return '<section class="planning-group" data-planning-group="'+key+'"><h3>'+label(key)+'</h3>'+own.map(option=>'<div class="check planning-choice '+(option.priority?'priority-choice':'')+'" data-apartment-option data-home="'+key+'" data-order="'+items.indexOf(option)+'" data-search="'+esc((option.name+' '+(option.categoryName||'')).toLocaleLowerCase())+'"><input type="checkbox" name="apartment" id="plan-'+esc(option.id)+'" value="'+esc(option.id)+'" '+(selected.has(option.id)?'checked':'')+'/><label class="planning-choice-main" for="plan-'+esc(option.id)+'"><strong data-user-text>'+esc(option.name)+'</strong><small><span data-user-text>'+esc(option.categoryName||'')+'</span> · '+esc(formatPLN(option.snapshot.priceGrosz))+'</small>'+(option.departure?'<span class="planning-checkout">'+esc(option.departure.checkOut===date?(option.priority?t('priority'):tr('cleaning.checkoutToday')):t(option.priority?'overduePriority':'overdueCheckout',{date:dateLabel(option.departure.checkOut)+' '+option.departure.checkOut.slice(0,4)}))+'</span>':'')+'</label></div>').join('')+'</section>';}).join('');
  }
  function draw(){
   const view=stage==='confirm'?'completeTitle':stage==='correct'?'correct':job?'edit':'create',draft=drafts.get(stage)||{items:[],notes:job?.notes||'',query:''};
   panel.setAttribute('aria-label',t(view));panel.dataset.stage=stage;
   header.innerHTML='<div><h2>'+label(view)+'</h2><p><strong data-user-text>'+esc(staff.name)+'</strong> · '+esc(dateLabel(date))+' '+esc(date.slice(0,4))+' <span class="pill">'+label(stage==='correct'?'confirmed':'planned')+'</span></p></div><button type="button" class="icon" data-planning-close aria-label="'+esc(tr('legacy.close'))+'">×</button>';
   const selected=new Set(draft.items.map(x=>x.apartmentId)),items=currentOptions().map(option=>({...option,snapshot:draft.items.find(x=>x.apartmentId===option.id)||option.snapshot}));
   // Use the exact snapshots displayed by the dog controls, including archived apartments.
   if(stage==='confirm')drafts.set('confirm-options',items);else drafts.set(stage+'-options',items);
   form.innerHTML=(stage==='confirm'?'<p class="planning-guidance success-note">'+label('completeCopy')+'</p>'+(job?'<p class="muted">'+label('originalOnly')+'</p>':''):stage==='correct'?'<p class="warning">'+label('correctCopy')+'</p>':'')+'<label class="search-field"><span>'+esc(tr('legacy.searchApartments'))+'</span><input type="search" data-planning-search placeholder="'+esc(tr('legacy.searchByApartmentNameOrAddress'))+'" value="'+esc(draft.query)+'"/></label>'+(stage==='plan'?'<p class="muted">'+label('suggestionsHelp')+'</p>':'')+grouped(items,selected)+'<p data-planning-no-results hidden>'+label('noResults')+'</p><label>'+esc(tr('ops.notesHelp'))+'<textarea name="cleaningNotes" maxlength="500">'+esc(draft.notes)+'</textarea></label><p class="form-error" role="alert"></p>';
   form.onsubmit=e=>e.preventDefault();installDogFields(root,items);
   for(const row of form.querySelectorAll('[data-apartment-option]'))row.onclick=e=>{if(!e.target.closest('input,label,button,.dog-fields'))row.querySelector('[name=apartment]').click();};
   footer.innerHTML='<button type="button" class="secondary" data-planning-back>'+label(stage==='confirm'?'back':'close')+'</button>'+((stage==='plan'||stage==='correct')&&job?'<button type="button" class="secondary danger-text" data-planning-cancel>'+label(stage==='correct'?'cancelConfirmed':'cancel')+'</button>':'')+'<div class="planning-primary-actions">'+(stage==='plan'?'<button type="button" class="success" data-planning-review>'+label('complete')+'</button>':'')+'<button type="button" data-planning-save>'+label(stage==='confirm'?'confirm':stage==='correct'?'correctSave':'save')+'</button></div>';
   header.querySelector('button').onclick=close;footer.querySelector('[data-planning-back]').onclick=()=>{if(stage==='confirm'){drafts.set('confirm',read());stage='plan';draw();}else close();};
   footer.querySelector('[data-planning-cancel]')?.addEventListener('click',()=>cancelPrompt());
   footer.querySelector('[data-planning-review]')?.addEventListener('click',()=>{
    try{drafts.set('plan',read());if(!job&&!drafts.get('plan').items.length)return;stage='confirm';if(!drafts.has('confirm'))drafts.set('confirm',{items:structuredClone(job?initial:drafts.get('plan').items),notes:job?.notes||drafts.get('plan').notes,query:''});draw();}catch(e){notice(errorText(e));}
   });
   footer.querySelector('[data-planning-save]').onclick=()=>{
    try{const draft=read();if(!draft.items.length){if(stage==='correct')return notice(t('keepConfirmed'));if(job)return cancelPrompt();return close();}if(stage==='correct')return correctPrompt(draft);commit(draft,stage==='confirm'?'confirmed':'planned');}catch(e){notice(errorText(e));}
   };
   form.oninput=refresh;form.onchange=refresh;refresh();scroll.scrollTop=0;header.querySelector('button').focus();
  }
  // readCleaningSnapshot receives the options currently installed in the DOM.
  function readDisplayed(){
   const choices=drafts.get(stage+'-options')||currentOptions();
   return {items:[...form.querySelectorAll('[name=apartment]:checked')].map(input=>readCleaningSnapshot(input,choices)),notes:form.elements.cleaningNotes.value,query:form.querySelector('[data-planning-search]').value};
  }
  function refresh(){
   let draft;try{draft=readDisplayed();}catch(e){notice(errorText(e));footer.querySelector('[data-planning-save]').disabled=true;return;}
   const focused=document.activeElement,position=scroll.scrollTop,rows=[...form.querySelectorAll('[data-apartment-option]')].sort((a,b)=>Number(a.dataset.order)-Number(b.dataset.order));
   for(const group of form.querySelectorAll('[data-planning-group]')){
    const wanted=rows.filter(row=>(row.querySelector('[name=apartment]').checked?'selection':row.dataset.home)===group.dataset.planningGroup);
    wanted.forEach((row,index)=>{const current=group.querySelectorAll('[data-apartment-option]')[index];if(current!==row)group.insertBefore(row,current||null);});
   }
   if(focused?.isConnected&&document.activeElement!==focused)focused.focus({preventScroll:true});scroll.scrollTop=position;
   const query=draft.query.trim().toLocaleLowerCase();let visible=0;
   for(const row of form.querySelectorAll('[data-apartment-option]')){const show=row.querySelector('[name=apartment]').checked||(query?row.dataset.search.includes(query):stage==='confirm'||(stage==='correct'&&initial.some(x=>x.apartmentId===row.querySelector('[name=apartment]').value))||Boolean((drafts.get(stage+'-options')||[]).find(x=>x.id===row.querySelector('[name=apartment]').value)?.departure));row.hidden=!show;visible+=Number(show);}
   for(const group of form.querySelectorAll('[data-planning-group]'))group.hidden=![...group.querySelectorAll('[data-apartment-option]')].some(x=>!x.hidden);
   form.querySelector('[data-planning-no-results]').hidden=visible>0;form.querySelector('[data-planning-no-results]').textContent=t(query?'noResults':'noPending');
   const total=assignmentTotal({apartments:draft.items}),expected=assignmentTotal({apartments:job?initial:drafts.get('plan')?.items||draft.items}),bonus=draft.items.reduce((sum,x)=>sum+(x.dogBonus?x.dogBonusGrosz:0),0);
   const zero=!draft.items.length,actual=stage!=='plan';
   summary.innerHTML='<h3>'+label('selection')+'</h3><strong data-planning-count>'+esc(t(actual?'actualCount':'count',{count:draft.items.length}))+'</strong><ul>'+draft.items.slice(0,3).map(x=>'<li data-user-text>'+esc(x.name)+(x.dogBonus?' 🐾':'')+'</li>').join('')+'</ul>'+(draft.items.length>3?'<small>'+esc(t('more',{count:draft.items.length-3}))+'</small>':'')+'<dl><div><dt>'+label(actual?'actual':'expected')+'</dt><dd data-planning-total>'+esc(formatPLN(total))+'</dd></div><div><dt>'+label('bonus')+'</dt><dd>'+esc(formatPLN(bonus))+'</dd></div>'+(actual?'<div><dt>'+label(stage==='correct'?'balanceDifference':'difference')+'</dt><dd data-planning-difference>'+esc(formatPLN(total-expected))+'</dd></div>':'')+'</dl>'+(zero?'<p class="planning-zero" role="status"><strong>'+label(stage==='confirm'?'noneCleaned':'zero')+'</strong><span>'+label(stage==='correct'?'keepConfirmed':stage==='confirm'?'noneCopy':job?'zeroCopy':'newZero')+'</span></p>':'');
   const button=footer.querySelector('[data-planning-save]');button.disabled=busy||(zero&&(stage==='correct'||!job));button.textContent=t(zero&&job&&stage!=='correct'?(stage==='confirm'?'toCancellation':'cancel'):stage==='confirm'?'confirm':stage==='correct'?'correctSave':'save');button.classList.toggle('danger',zero&&Boolean(job)&&stage!=='correct');
   footer.querySelector('[data-planning-review]')?.toggleAttribute('disabled',zero&&!job);
   const cancel=footer.querySelector('[data-planning-cancel]');if(cancel)cancel.hidden=zero&&stage!=='correct';
  }
  function notice(text){form.querySelector('.form-error').textContent=text;}
  async function commit(draft,status,confirmation){
   if(busy)return;drafts.set(stage,draft);busy=true;root.dataset.busy='true';for(const button of root.querySelectorAll('button'))button.disabled=true;
   try{
    const now=new Date().toISOString(),value={...(job||{}),id:job?.id||newId,staffId:staff.id,date,status,apartments:draft.items,notes:draft.notes.trim(),createdAt:job?.createdAt||now,updatedAt:now,...(status==='confirmed'&&!job?.confirmedAt?{confirmedAt:now}:{})};
    await store.mutate([{store:'assignments',id:value.id,value,expected:baseline}]);
    await onSaved(t(stage==='correct'?'corrected':status==='confirmed'?'completed':'saved'));busy=false;confirmation?.remove();close();
   }catch(e){busy=false;root.dataset.busy='false';confirmation?.remove();prompt=null;draw();notice(errorText(e));}
  }
  function ask(title,body,keep,accept,action){
   if(busy||prompt)return;const trigger=document.activeElement;
   prompt=document.createElement('div');prompt.className='modal-backdrop planning-prompt';
   prompt.innerHTML='<section class="modal" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header><h2>'+esc(title)+'</h2><button class="icon" data-prompt-close aria-label="'+esc(tr('legacy.close'))+'">×</button></header><div class="modal-body">'+body+'<p class="form-error" role="alert"></p></div><footer><button class="secondary" data-prompt-keep>'+esc(keep)+'</button><button class="danger" data-prompt-accept>'+esc(accept)+'</button></footer></section>';
   const dismiss=()=>{if(busy)return;prompt.remove();prompt=null;trigger?.isConnected&&trigger.focus();};
   prompt.querySelector('[data-prompt-keep]').onclick=dismiss;prompt.querySelector('[data-prompt-close]').onclick=dismiss;
   prompt.querySelector('[data-prompt-accept]').onclick=async()=>{if(busy)return;const current=prompt;try{await action(current);}catch(e){current.querySelector('.form-error').textContent=errorText(e);current.querySelectorAll('button').forEach(x=>x.disabled=false);}};
   prompt.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();dismiss();}trap(e,prompt);};document.body.append(prompt);prompt.querySelector('[data-prompt-keep]').focus();
  }
  function cancelPrompt(){
   if(!job)return;const confirmed=job.status==='confirmed';
   ask(t(confirmed?'cancelConfirmedTitle':'cancelTitle'),'<p><strong data-user-text>'+esc(staff.name)+'</strong> · '+esc(dateLabel(date))+' '+esc(date.slice(0,4))+'</p><p>'+esc(t('removedCount',{count:initial.length}))+'</p><p>'+esc(t(confirmed?'removedRealAmount':'removedAmount',{amount:formatPLN(assignmentTotal(job))}))+'</p><p>'+label(confirmed?'cancelConfirmedCopy':'cancelCopy')+'</p>',t(confirmed?'keepCleaning':'keep'),t(confirmed?'cancelConfirmed':'cancelConfirm'),async confirmation=>{
    busy=true;confirmation.querySelectorAll('button').forEach(x=>x.disabled=true);try{await store.mutate([{store:'assignments',id:job.id,value:null,expected:baseline}]);await onSaved(t(confirmed?'confirmedCancelled':'cancelled'));busy=false;confirmation.remove();prompt=null;close();}catch(e){busy=false;throw e;}
   });
  }
  function correctPrompt(draft){
   ask(t('correctTitle'),'<p>'+label('correctCopy')+'</p><p><strong data-user-text>'+esc(staff.name)+'</strong> · '+esc(dateLabel(date))+'</p><p>'+label('actual')+': '+esc(formatPLN(assignmentTotal({apartments:draft.items})))+'</p><p>'+label('balanceDifference')+': '+esc(formatPLN(assignmentTotal({apartments:draft.items})-assignmentTotal(job)))+'</p>',t('back'),t('correctSave'),confirmation=>commit(draft,'confirmed',confirmation));
  }
  function trap(e,target){if(e.key!=='Tab')return;const elements=[...target.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,[tabindex="0"]')].filter(x=>x.getClientRects().length);if(e.shiftKey&&document.activeElement===elements[0]){e.preventDefault();elements.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===elements.at(-1)){e.preventDefault();elements[0]?.focus();}}
  root.onkeydown=e=>{if(prompt)return;if(e.key==='Escape'){e.preventDefault();close();}trap(e,root);};
  document.body.append(root);draw();return root;
 }
 return {open};
}
