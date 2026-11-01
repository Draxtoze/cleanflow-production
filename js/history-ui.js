import {historyEntries,prepareUndo} from './history.js';
import {createBackup} from './backup.js';
import {formatPLN,localDate} from './business.js';
export function createHistoryUI({state,store,tr,esc,modal,toast,render,onRestored}){
 const t=(key,values)=>tr('history.'+key,values),label=key=>esc(t(key)),filters={query:'',type:'all',action:'all',from:'',through:'',limit:40};
 const types=['staff','apartments','categories','owners','assignments','payments','reservations','checkoutStates','settings'];
 const actions=['create','update','delete','archive','reactivate','confirm','order','undo','import'];
 const actionLabel=action=>t(action==='undo'?'undoAction':action);
 function entity(change){const record=change.after||change.before;return record?.name||record?.apartmentName||[state.data.staff.find(x=>x.id===record?.staffId)?.name,record?.date||record?.checkIn].filter(Boolean).join(' · ')||(change.store==='settings'&&change.id==='preferences'?tr('v2.appearance'):change.store==='settings'&&change.id==='dogBonus'?t('dogBonus'):t(change.store));}
 function field(key){const value=t(key);return value==='history.'+key?t('other'):value;}
 function value(key,v){
  if(v===null||v===undefined||v==='')return '—';
  if(typeof v==='boolean')return t(v?'yes':'no');
  if(typeof v==='number')return key.endsWith('Grosz')?formatPLN(v,state.language):String(key==='sortOrder'?v+1:v);
  const ref={staffId:'staff',apartmentId:'apartments',categoryId:'categories',ownerId:'owners'}[key];if(ref)return state.data[ref].find(x=>x.id===v)?.name||historyEntries(state.data).flatMap(e=>e.changes).filter(c=>c.store===ref&&c.id===v).map(c=>(c.after||c.before)?.name).find(Boolean)||t('unknown');
  if(Array.isArray(v))return v.map(item=>typeof item==='object'?Object.entries(item).filter(([k])=>k!=='id').map(([k,x])=>`${field(k)}: ${value(k,x)}`).join(' · '):String(item)).join('\n')||'—';
  if(typeof v==='object')return Object.entries(v).filter(([k])=>k!=='id').map(([k,x])=>`${field(k)}: ${value(k,x)}`).join('\n');
  if(key==='status'&&['planned','confirmed','ignored','paid','cashToCollect'].includes(v))return t(v);
  if(['theme','textSize','staffView','apartmentView'].includes(key))return tr('v2.'+v);
  if(key==='language')return v==='pl'?'Polski':'English';
  if(/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v)){const date=new Date(v.length===10?v+'T12:00:00':v);if(Number.isFinite(+date))return new Intl.DateTimeFormat(state.language==='pl'?'pl-PL':'en-GB',v.length===10?{dateStyle:'medium'}:{dateStyle:'medium',timeStyle:'short'}).format(date);}
  return String(v);
 }
 function detailBody(entry){
  if(entry.action==='import')return `<p>${label('importNotice')}</p><table class="history-diff"><thead><tr><th>${label('type')}</th><th>${label('before')}</th><th>${label('after')}</th></tr></thead><tbody>${(entry.summary||[]).map(s=>`<tr><th>${label(s.store)}</th><td>${esc(s.before)}</td><td>${esc(s.after)}</td></tr>`).join('')}</tbody></table>`;
  return entry.changes.map(c=>{const keys=[...new Set([...Object.keys(c.before||{}),...Object.keys(c.after||{})])].filter(key=>key!=='id'&&JSON.stringify(c.before?.[key])!==JSON.stringify(c.after?.[key]));return `<section><h3 data-user-text>${esc(entity(c))}</h3><p class="muted">${label(c.store)}</p><div class="history-diff-scroll"><table class="history-diff"><thead><tr><th>${label('field')}</th><th>${label('before')}</th><th>${label('after')}</th></tr></thead><tbody>${keys.map(key=>`<tr><th>${esc(field(key))}</th><td data-user-text>${esc(value(key,c.before?.[key]))}</td><td data-user-text>${esc(value(key,c.after?.[key]))}</td></tr>`).join('')}</tbody></table></div></section>`;}).join('');
 }
 function eligibility(entry){try{prepareUndo(state.data,entry.id,candidate=>createBackup(candidate));return '';}catch(e){return e.message.startsWith('history.')?e.message.slice(8):'error';}}
 function showDetails(id){const entry=historyEntries(state.data).find(e=>e.id===id);if(!entry)return;const blocked=eligibility(entry),body=detailBody(entry);const root=modal(t('title'),`<form>${body}${blocked?`<p class="history-notice">${label(blocked)}</p>`:''}<p class="form-error" role="alert"></p></form>`,async()=>{}, {submit:t('undo')});root.classList.add('history-backdrop');root.querySelector('header [data-close]').focus();root.querySelector('footer [data-close]').textContent=t('close');if(blocked){root.querySelector('[data-submit]').remove();return;}
  root.querySelector('[data-submit]').onclick=()=>{root.remove();const confirmation=modal(t('undoTitle'),`<form><p>${label('undoCopy')}</p>${body}<p class="form-error" role="alert"></p></form>`,async()=>{try{await store.undoHistory(id);await onRestored();toast(t('success'));render();}catch(e){throw Error(e.message.startsWith('history.')?tr(e.message):t('error'));}}, {danger:true,submit:t('undoConfirm')});confirmation.classList.add('history-backdrop');confirmation.querySelector('header [data-close]').focus();};
 }
 function page(){const select=(key,list,translate)=>`<label>${label(key==='type'?'type':'action')}<select data-history-filter="${key}"><option value="all">${label('all')}</option>${list.map(x=>`<option value="${x}" ${filters[key]===x?'selected':''}>${esc(translate(x))}</option>`).join('')}</select></label>`;return `<div class="page-heading"><div><h1>${label('title')}</h1><p>${label('intro')}</p></div></div><div class="history-notice"><p>${label('notice')}</p><small>${label('privacy')}</small></div><div class="history-filters"><label>${label('search')}<input type="search" data-history-filter="query" value="${esc(filters.query)}"/></label>${select('type',types,t)}${select('action',actions,actionLabel)}<label>${label('from')}<input type="date" data-history-filter="from" value="${esc(filters.from)}"/></label><label>${label('through')}<input type="date" data-history-filter="through" value="${esc(filters.through)}"/></label></div><div data-history-results aria-live="polite"></div>`;}
 function fill(){const holder=document.querySelector('[data-history-results]');if(!holder)return;if(filters.from&&filters.through&&filters.through<filters.from){holder.innerHTML=`<p class="form-error">${label('dates')}</p>`;return;}
  const all=historyEntries(state.data),items=all.filter(e=>(filters.type==='all'||e.changes.some(c=>c.store===filters.type))&&(filters.action==='all'||e.action===filters.action)&&(!filters.from||localDate(new Date(e.at))>=filters.from)&&(!filters.through||localDate(new Date(e.at))<=filters.through)&&JSON.stringify([actionLabel(e.action),e.changes.map(c=>[entity(c),c.before,c.after])]).toLocaleLowerCase().includes(filters.query.toLocaleLowerCase()));
  holder.innerHTML=`<p class="muted">${esc(t('count',{count:items.length}))}</p>${items.length?`<div class="history-list">${items.slice(0,filters.limit).map(e=>`<article class="card history-event"><div><time datetime="${esc(e.at)}">${esc(value('createdAt',e.at))}</time><h2>${esc(actionLabel(e.action))}</h2><p data-user-text>${esc(e.changes.length===1?entity(e.changes[0]):e.changes.length?t('multiple',{count:e.changes.length}):t('import'))}</p>${all.some(x=>x.undoOf===e.id)?`<span class="pill">${label('undone')}</span>`:''}</div><button class="secondary" data-history-details="${esc(e.id)}">${label('details')}</button></article>`).join('')}</div>${items.length>filters.limit?`<button class="secondary" data-history-more>${label('more')}</button>`:''}`:`<div class="empty"><p>${label(all.length?'noMatches':'empty')}</p></div>`}`;
  holder.querySelectorAll('[data-history-details]').forEach(b=>b.onclick=()=>showDetails(b.dataset.historyDetails));holder.querySelector('[data-history-more]')?.addEventListener('click',()=>{filters.limit+=40;fill();});
 }
 function bind(){document.querySelectorAll('[data-history-filter]').forEach(input=>input.addEventListener(input.type==='search'?'input':'change',()=>{filters[input.dataset.historyFilter]=input.value;filters.limit=40;fill();}));fill();}
 return {page,bind};
}
