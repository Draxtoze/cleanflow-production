import {APP_VERSION,SCHEMA_VERSION,THEMES,TEXT_SIZES,VIEWS,preferencesFrom,validatePreferences,applyAppearance} from './preferences.js';
import {createBackup} from './backup.js';
import {addDays,localDate,weekDays,monthEnd,reportStatus,staffSummary,weeklyStaffReport,monthlyCategoryReport,formatPLN} from './business.js';
import {employeePeriod} from './operations.js';
import {createEmployeePeriodPdf,createWeeklyStaffPdf,createOwnerMonthlyPdf,createCategoryBookingsPdf,createCategoryZip,downloadBlob} from './reports.js';

export function createV2({state,store,app,tr,esc,render,toast,reportLabels,openPdfPreview,openCleaningSettings,isDemo}) {
 const text=(key,values)=>tr(`v2.${key}`,values);
 const label=(key)=>esc(text(key));
 let runtime={demo:isDemo,backups:false,updates:false},backupState=null,backupError=false,backupBusy=false,saveQueue=Promise.resolve();
 const prefs=()=>preferencesFrom(state.data,state.language);
 const filters={staff:{query:'',status:'all'},apartments:{query:'',status:'all',owner:'all',category:'all'}};
 const money=value=>formatPLN(value,state.language);
 const swatches={ocean:'#08756b',forest:'#386332',night:'#253b51',indigo:'#514696',amber:'#a87c23',plum:'#824767'};
 async function invoke(method,...args){const response=await window.cleanflowDesktop[method](...args);if(!response.ok)throw Error(text('backupError'));return response.value;}
 async function updatePreferences(change) {
  const next=validatePreferences({...prefs(),...change});const index=state.data.settings.findIndex(item=>item.id==='preferences');
  if(index<0)state.data.settings.push(next);else state.data.settings[index]=next;
  state.language=next.language;localStorage.setItem('cleanflow-language',next.language);applyAppearance(next);
  const task=saveQueue.then(()=>store.put('settings',next));saveQueue=task.catch(()=>{});
  try{await task;render();}catch{toast(text('saveError'),'warning');throw Error(text('saveError'));}
 }
 function dialog(title,body,footer='') {
  const previous=document.activeElement,root=document.createElement('div');root.className='modal-backdrop v2-backdrop';
  root.innerHTML=`<section class="modal v2-dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button type="button" class="icon" data-v2-close aria-label="${label('close')}">×</button></header><div class="modal-body">${body}</div>${footer?`<footer>${footer}</footer>`:''}</section>`;
  let closing=false;
  const close=async()=>{if(closing||root.dataset.busy==='true')return;closing=true;await saveQueue;root.remove();previous?.isConnected&&previous.focus();};
  root.querySelector('[data-v2-close]').onclick=close;root.addEventListener('click',event=>{if(event.target===root)close();});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}if(event.key==='Tab'){const items=[...root.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,a[href]')].filter(item=>item.getClientRects().length);const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
  document.body.append(root);root.querySelector('input,select,button')?.focus();
  return {root,close};
 }
 function backupMarkup(){
  if(!runtime.backups)return `<p>${label('backupUnavailable')}</p>${isDemo?`<p>${label('demoWebBackups')}</p><p>${label('demoRetentionPreview')}</p>`:''}`;
  const status=backupError?'backupError':!prefs().autoBackupEnabled?'backupDisabled':backupState?.createdToday?'backedUp':'backupPending';
  return `<div class="settings-status" role="status"><strong>${label(status)}</strong><div class="backup-meta"><span>${label('lastBackup')}: ${backupState?.lastSuccess?esc(new Intl.DateTimeFormat(state.language==='pl'?'pl-PL':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(backupState.lastSuccess))):label('never')}</span><span>${esc(text('backupCount',{count:backupState?.count??0}))}</span></div></div>${isDemo?`<p>${label('demoRetentionPreview')}</p>`:''}`;
 }
 async function refreshBackup(){if(runtime.backups){try{backupState=await invoke('backupStatus');}catch{backupError=true;}}}
 async function runBackup({manual=false}={}) {
  if(!runtime.backups||backupBusy||(!manual&&!prefs().autoBackupEnabled))return;
  backupBusy=true;try{await saveQueue;backupState=await invoke('createBackup',createBackup(await store.data()));backupError=false;if(manual)toast(text('backupSaved'));}catch{backupError=true;if(manual)toast(text('backupError'),'warning');}finally{backupBusy=false;document.querySelectorAll('[data-v2-backup-status]').forEach(holder=>holder.innerHTML=backupMarkup());}
 }
 function updateCopy(){return runtime.updates?text({checking:'updateChecking',current:'updateCurrent',downloading:'updateDownloading',ready:'updateReady',error:'updateError'}[runtime.updateState]||'updateChecking'):text('updateUnavailable');}
 async function settings(){
  if(window.cleanflowDesktop)try{runtime={...runtime,...await invoke('info')};}catch{}
  await refreshBackup();const p=prefs();
  const view=dialog(text('settings'),`
   <section class="settings-section"><h3>${label('appearance')}</h3><label>${label('textSize')}</label><div class="size-choices">${TEXT_SIZES.map(size=>`<button class="secondary" data-size="${size}" aria-pressed="${p.textSize===size}">${label(size)}</button>`).join('')}</div><label>${label('theme')}</label><div class="theme-choices">${THEMES.map(theme=>`<button class="secondary" data-theme-choice="${theme}" aria-pressed="${p.theme===theme}"><span class="theme-dot" style="--swatch:${swatches[theme]}"></span>${label(theme)}</button>`).join('')}</div></section>
   <section class="settings-section"><h3>${label('autoBackups')}</h3><label class="check-inline"><input type="checkbox" data-backup-enabled ${p.autoBackupEnabled?'checked':''} ${runtime.backups?'':'disabled'}/> ${label('dailyEnabled')}</label><label>${label('retention')}<input type="number" data-retention min="1" max="365" step="1" value="${p.autoBackupRetention}" ${runtime.backups?'':'disabled'}/><small>${label('retentionHelp')}</small></label><p class="form-error" data-settings-error role="alert"></p><div data-v2-backup-status>${backupMarkup()}</div><div class="toolbar"><button data-backup-now ${runtime.backups?'':'disabled'}>${label('backupNow')}</button><button class="secondary" data-backup-folder ${runtime.backups?'':'disabled'}>${label('openBackupFolder')}</button></div><button class="secondary" data-manual-link>${label('manualBackups')}</button></section>
   <section class="settings-section"><h3>${label('updates')}</h3><p>${esc(updateCopy())}</p><p>${label('updatePolicy')}</p></section>
   <section class="settings-section"><h3>${esc(tr('ops.settings'))}</h3><button class="secondary" data-dog-settings>${esc(tr('ops.defaultDog'))}</button></section><button class="secondary" data-about-link>${label('about')} · ${APP_VERSION}</button>`);
  const error=view.root.querySelector('[data-settings-error]');
  const save=async change=>{try{await updatePreferences(change);error.textContent='';for(const b of view.root.querySelectorAll('[data-size]'))b.setAttribute('aria-pressed',String(prefs().textSize===b.dataset.size));for(const b of view.root.querySelectorAll('[data-theme-choice]'))b.setAttribute('aria-pressed',String(prefs().theme===b.dataset.themeChoice));}catch{error.textContent=text('saveError');}};
  view.root.querySelectorAll('[data-size]').forEach(button=>button.onclick=()=>save({textSize:button.dataset.size}));
  view.root.querySelectorAll('[data-theme-choice]').forEach(button=>button.onclick=()=>save({theme:button.dataset.themeChoice}));
  view.root.querySelector('[data-backup-enabled]').onchange=async event=>{await save({autoBackupEnabled:event.target.checked});if(event.target.checked)await runBackup();view.root.querySelector('[data-v2-backup-status]').innerHTML=backupMarkup();};
  view.root.querySelector('[data-retention]').onchange=event=>{const input=event.target,n=Number(input.value);if(!input.value||!Number.isInteger(n)||n<1||n>365){input.setAttribute('aria-invalid','true');error.textContent=text('invalidRetention');return;}input.removeAttribute('aria-invalid');save({autoBackupRetention:n});};
  view.root.querySelector('[data-backup-now]').onclick=async event=>{event.target.disabled=true;await runBackup({manual:true});event.target.disabled=false;};
  view.root.querySelector('[data-backup-folder]').onclick=()=>invoke('openBackupFolder').catch(()=>toast(text('backupError'),'warning'));
  view.root.querySelector('[data-manual-link]').onclick=async()=>{await view.close();state.page='backup';render();};
  view.root.querySelector('[data-about-link]').onclick=async()=>{await view.close();state.page='about';render();};
  view.root.querySelector('[data-dog-settings]').onclick=async()=>{await view.close();openCleaningSettings();};
 }
 function reportCatalog(){return `<div class="page-heading"><div><h1>${esc(tr('reports.title'))}</h1><p>${label('reportIntro')}</p></div></div><div class="report-catalog">${[['employee','▤'],['weekly','▦'],['owner','⌂'],['category','▥']].map(([kind,icon])=>`<article class="report-card"><span class="report-icon" aria-hidden="true">${icon}</span><h2>${label(`${kind}Title`)}</h2><p>${label(`${kind}Copy`)}</p><button data-configure-report="${kind}">${label('configure')} <span aria-hidden="true">→</span></button></article>`).join('')}</div>`;}
 function configureReport(kind){
  const today=localDate(new Date()),week=weekDays(today),month=today.slice(0,7);const data=state.data;
  const options=(items)=>`<option value="">${label('choose')}</option>${items.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}`;
  const check=(name,key)=>`<label class="check-inline"><input type="checkbox" name="${name}"/> ${esc(tr(key))}</label>`;
  let fields='';
  if(kind==='employee')fields=`<label>${esc(tr('ops.employee'))}<select name="employee">${options(data.staff)}</select></label><div class="form-grid"><label>${esc(tr('ops.start'))}<input name="start" type="date" value="${week[0]}" required/></label><label>${esc(tr('ops.end'))}<input name="end" type="date" value="${week[6]}" required/></label></div><button type="button" class="secondary" data-this-period>${esc(tr('reports.thisWeek'))}</button>${check('money','ops.includeMoney')}`;
  if(kind==='weekly')fields=`<label>${esc(tr('reports.week'))}<input name="week" type="date" value="${week[0]}" required/></label><div class="toolbar"><button type="button" class="secondary" data-week-step="-7">${esc(tr('reports.previousWeek'))}</button><button type="button" class="secondary" data-this-period>${esc(tr('reports.thisWeek'))}</button><button type="button" class="secondary" data-week-step="7">${esc(tr('reports.nextWeek'))}</button></div>`;
  if(kind==='owner')fields=`<label>${label('owner')}<select name="owner">${options(data.owners)}</select></label><label>${esc(tr('reports.month'))}<input name="month" type="month" value="${month}" required/></label>${check('charges','ops.includeCharges')}`;
  if(kind==='category')fields=`<label>${esc(tr('reports.month'))}<input name="month" type="month" value="${month}" required/></label><label>${label('category')}<select name="category"><option value="all">${esc(tr('reports.allCategories'))}</option>${data.categories.map(item=>`<option value="${esc(item.id)}">${esc(item.name)}</option>`).join('')}${data.apartments.some(item=>!item.categoryId)?`<option value="">${esc(tr('reports.uncategorized'))}</option>`:''}</select></label>`;
  const view=dialog(text(`${kind}Title`),`<form class="report-config">${fields}<div class="report-summary" aria-live="polite"></div><p class="form-error" role="alert"></p></form>`,`<button class="secondary" data-config-cancel>${label('cancel')}</button><button data-generate-preview disabled>${label('generatePreview')}</button>`);
  const form=view.root.querySelector('form'),summary=form.querySelector('.report-summary'),error=form.querySelector('.form-error'),generate=view.root.querySelector('[data-generate-preview]');let model;
  function calculate(){
   let start,end,copy='',empty=false,valid=true;
   try {
    if(kind==='employee'){start=form.elements.start.value;end=addDays(form.elements.end.value,1);if(!form.elements.employee.value)throw Error(text('chooseEmployee'));if(!start||!form.elements.end.value||start>=end)throw Error(text('dateInvalid'));model=employeePeriod(state.data,form.elements.employee.value,start,form.elements.end.value);copy=tr('ops.count',{count:model.rows.length});empty=!model.rows.length;}
    if(kind==='weekly'){if(!form.elements.week.value)throw Error(text('dateInvalid'));start=weekDays(form.elements.week.value)[0];end=addDays(start,7);model=weeklyStaffReport(state.data,start);copy=text('weeklySummary',{cleanings:model.totals.plannedCount+model.totals.confirmedCount,staff:model.sections.length});empty=!model.sections.some(item=>item.rows.length||item.payments.length);}
    if(kind==='owner'){if(!form.elements.month.value)throw Error(text('dateInvalid'));start=form.elements.month.value+'-01';end=monthEnd(start);const owner=form.elements.owner.value;if(!owner)throw Error(tr('ops.chooseOwner'));const apartments=state.data.apartments.filter(item=>item.ownerId===owner),ids=new Set(apartments.map(item=>item.id)),stays=state.data.reservations.filter(item=>ids.has(item.apartmentId)&&item.checkIn<end&&item.checkOut>start),cleanings=state.data.assignments.filter(item=>item.date>=start&&item.date<end).flatMap(item=>item.apartments.filter(item=>ids.has(item.apartmentId)));copy=text('ownerSummary',{apartments:apartments.length,stays:stays.length,cleanings:cleanings.length});empty=!stays.length&&!cleanings.length;}
    if(kind==='category'){if(!form.elements.month.value)throw Error(text('dateInvalid'));start=form.elements.month.value+'-01';end=monthEnd(start);const chosen=form.elements.category.value;const apartments=state.data.apartments.filter(item=>chosen==='all'||(item.categoryId||'')===chosen),ids=new Set(apartments.map(item=>item.id)),stays=state.data.reservations.filter(item=>ids.has(item.apartmentId)&&item.checkIn<end&&item.checkOut>start);copy=text('categorySummary',{apartments:apartments.length,stays:stays.length});empty=!stays.length;}
    summary.innerHTML=`<span class="pill">${esc(tr('reports.'+reportStatus(start,end)))}</span><p>${esc(copy)}</p>${empty?`<p class="report-empty-notice">${label('reportEmpty')}</p>`:''}`;
    error.textContent='';valid=!empty;
   }catch(e){valid=false;summary.innerHTML='';error.textContent=e.message;}
   generate.disabled=!valid;
   return {start,end,valid};
  }
  form.addEventListener('submit',event=>event.preventDefault());form.addEventListener('input',calculate);form.addEventListener('change',calculate);
  form.querySelector('[data-this-period]')?.addEventListener('click',()=>{if(kind==='employee'){form.elements.start.value=week[0];form.elements.end.value=week[6];}else form.elements.week.value=week[0];calculate();});
  form.querySelectorAll('[data-week-step]').forEach(button=>button.onclick=()=>{form.elements.week.value=addDays(form.elements.week.value||week[0],Number(button.dataset.weekStep));calculate();});
  view.root.querySelector('[data-config-cancel]').onclick=view.close;
  generate.onclick=async()=>{
   const {start,valid}=calculate();if(!valid)return;generate.disabled=true;generate.textContent=tr('reports.generating');view.root.dataset.busy='true';
   try{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const base={data:structuredClone(state.data),language:state.language,labels:reportLabels()};let report;
    if(kind==='employee')report=await createEmployeePeriodPdf({...base,staffId:form.elements.employee.value,start,end:form.elements.end.value,includeMoney:form.elements.money.checked});
    if(kind==='weekly')report=await createWeeklyStaffPdf({...base,weekStart:start});
    if(kind==='owner')report=await createOwnerMonthlyPdf({...base,ownerId:form.elements.owner.value,monthStart:start,includeCharges:form.elements.charges.checked});
    if(kind==='category'){
     if(form.elements.category.value==='all'){
      const groups=[...base.data.categories];if(base.data.apartments.some(item=>!item.categoryId))groups.push({id:'',name:tr('reports.uncategorized')});
      const reports=[];for(const group of groups){const contents=monthlyCategoryReport(base.data,start,group.id);if(!contents.reservations.length)continue;reports.push(await createCategoryBookingsPdf({...base,monthStart:start,categoryId:group.id}));}
      batchPreview(reports);return;
     }
     report=await createCategoryBookingsPdf({...base,monthStart:start,categoryId:form.elements.category.value});
    }
    await openPdfPreview(report);
   }catch{error.textContent=tr('reports.error');}finally{view.root.dataset.busy='false';generate.textContent=text('generatePreview');generate.disabled=false;}
  };calculate();
 }
 function batchPreview(reports){const view=dialog(tr('reports.categoryMonthly'),`<p>${label('batchReady')}</p><div class="report-config">${reports.map((report,index)=>`<button class="secondary" data-batch-pdf="${index}" data-user-text>${esc(report.fileName)}</button>`).join('')}</div>`,`<button data-batch-zip>${esc(tr('reports.downloadAll'))}</button>`);view.root.querySelectorAll('[data-batch-pdf]').forEach(button=>button.onclick=()=>openPdfPreview(reports[Number(button.dataset.batchPdf)]));view.root.querySelector('[data-batch-zip]').onclick=async event=>{event.target.disabled=true;try{const zip=await createCategoryZip(reports,tr('reports.categoryMonthly'));downloadBlob(zip.blob,zip.fileName);}finally{event.target.disabled=false;}};}
 function about(){return `<div class="page-heading"><div><p class="eyebrow">CleanFlow</p><h1>${label('about')}</h1><p>${esc(tr('ops.version',{version:runtime.packaged?runtime.version:APP_VERSION}))}</p></div></div><div class="about-grid"><article class="card"><h2>${label('storage')}</h2><p>${label('storageCopy')}</p><p>${label('schema')}: ${SCHEMA_VERSION} · IndexedDB</p></article><article class="card"><h2>${label('autoBackups')}</h2>${backupMarkup()}<p>${label('backupCopy')}</p><button class="secondary" data-open-settings>${label('settings')}</button></article><article class="card"><h2>${label('updates')}</h2><p>${esc(updateCopy())}</p><p>${label('updatePolicy')}</p></article><article class="card"><h2>${label('releaseNotes')}</h2><p>${label('reviewBuild')}</p><p>${label('reportIntro')}</p><a class="release-link" href="https://github.com/Draxtoze/cleanflow-production/releases" target="_blank" rel="noopener">GitHub Releases ↗</a></article></div>`;}
 function onRender(){
  applyAppearance(prefs());const saveState=app.querySelector('.save-state');if(saveState&&!app.querySelector('aside [data-open-settings]')){const row=document.createElement('div');row.className='save-settings';saveState.replaceWith(row);row.append(saveState);row.insertAdjacentHTML('beforeend',`<button class="settings-gear" data-open-settings title="${label('settings')}" aria-label="${label('settings')}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m9 3-1 3-3 1-2 4 2 2v4l4 2 3-1 3 1 4-2v-4l2-2-2-4-3-1-1-3z"/><circle cx="12" cy="11" r="3"/></svg></button>`);}
  if(!['staff','apartments'].includes(state.page))return;const isStaff=state.page==='staff',key=isStaff?'staffView':'apartmentView',mode=prefs()[key],f=filters[state.page];
  const oldSearch=app.querySelector('[data-apartment-search]');if(oldSearch){oldSearch.hidden=true;oldSearch.closest('label')?.setAttribute('hidden','');}
  const toolbar=document.createElement('div');toolbar.className='view-toolbar';toolbar.innerHTML=`<div class="filters"><label>${label(isStaff?'searchStaff':'name')}<input type="search" data-v2-search value="${esc(f.query)}"/></label><label>${label('status')}<select data-v2-filter="status">${['all','active','archived'].map(value=>`<option value="${value}" ${f.status===value?'selected':''}>${label(value)}</option>`).join('')}</select></label>${isStaff?'':`<label>${label('owner')}<select data-v2-filter="owner"><option value="all">${label('all')}</option>${state.data.owners.map(item=>`<option value="${esc(item.id)}" ${f.owner===item.id?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label><label>${label('category')}<select data-v2-filter="category"><option value="all">${label('all')}</option>${state.data.categories.map(item=>`<option value="${esc(item.id)}" ${f.category===item.id?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label>`}</div><div class="view-modes" role="group" aria-label="${label('view')}">${VIEWS.map((view,index)=>`<button class="secondary" data-view-mode="${view}" data-view-key="${key}" title="${label(view)}" aria-label="${label(view)}" aria-pressed="${mode===view}"><span aria-hidden="true">${['☷','▦','≡'][index]}</span> ${label(view)}</button>`).join('')}</div>`;
  app.querySelector('.page-heading').after(toolbar);app.querySelectorAll('.cards').forEach(list=>list.dataset.view=mode);
  const cards=[...app.querySelectorAll(isStaff?'[data-staff-card]':'[data-apartment-card]')];
  cards.forEach(card=>{const item=isStaff?state.data.staff.find(item=>item.id===card.dataset.staffId):state.data.apartments.find(item=>item.id===card.querySelector('[data-edit-apartment]')?.dataset.editApartment);if(!item)return;card.dataset.v2Id=item.id;const values=isStaff?(()=>{const s=staffSummary(item.id,state.data.assignments,state.data.payments);return [['expected',money(s.expectedGrosz)],['balance',money(s.dueGrosz)],['paid',money(s.paidGrosz)]];})():[['category',state.data.categories.find(cat=>cat.id===item.categoryId)?.name||tr('reports.uncategorized')],['owner',state.data.owners.find(owner=>owner.id===item.ownerId)?.name||tr('ops.unassigned')],['price',money(item.priceGrosz)]];card.querySelector('.card-actions').insertAdjacentHTML('beforebegin',`<div class="v2-detail-fields">${values.map(([key,value])=>`<span><small>${label(key)}</small><strong data-user-text>${esc(value)}</strong></span>`).join('')}</div>`);});
  function filter(){let count=0;cards.forEach(card=>{const item=state.data[state.page].find(item=>item.id===card.dataset.v2Id);if(!item)return;const searchable=[item.name,item.phone,item.reference,item.notes,state.data.owners.find(owner=>owner.id===item.ownerId)?.name,state.data.categories.find(cat=>cat.id===item.categoryId)?.name].filter(Boolean).join(' ').toLocaleLowerCase();const show=searchable.includes(f.query.toLocaleLowerCase())&&(f.status==='all'||(item.active!==false)===(f.status==='active'))&&(isStaff||(f.owner==='all'||item.ownerId===f.owner)&&(f.category==='all'||item.categoryId===f.category));card.hidden=!show;if(show)count++;});app.querySelectorAll('[data-category-section]').forEach(section=>section.hidden=!section.querySelector('[data-apartment-card]:not([hidden])'));let empty=app.querySelector('[data-v2-empty]');if(!empty){empty=document.createElement('p');empty.dataset.v2Empty='';empty.className='view-empty muted';app.querySelector('main').append(empty);}empty.textContent=text('noMatches');empty.hidden=count>0;app.querySelector('.search-empty')?.setAttribute('hidden','');}
  toolbar.querySelector('[data-v2-search]').oninput=event=>{f.query=event.target.value;filter();};toolbar.querySelectorAll('[data-v2-filter]').forEach(input=>input.onchange=()=>{f[input.dataset.v2Filter]=input.value;filter();});filter();
 }
 document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.disabled)return;if(button.matches('[data-open-settings]'))settings();if(button.dataset.configureReport)configureReport(button.dataset.configureReport);if(button.dataset.viewMode)updatePreferences({[button.dataset.viewKey]:button.dataset.viewMode}).catch(()=>{});});
 async function start(){if(window.cleanflowDesktop)try{runtime={...runtime,...await invoke('info')};if(runtime.demo&&runtime.backups)backupState=await invoke('seedDemoBackups',createBackup(await store.data()));}catch{backupError=true;}await refreshBackup();await runBackup();}
 return {onRender,settings,reportCatalog,about,updatePreferences,start,runBackup,prefs,restore:()=>{state.language=prefs().language;localStorage.setItem('cleanflow-language',state.language);applyAppearance(prefs());}};
}
