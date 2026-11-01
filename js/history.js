// Journal records live in the existing settings store so complete v4 backups
// retain them without changing the application's identity or IndexedDB schema.
import {validatePlanningWrite} from './planning.js';
export const HISTORY_PREFIX='__cleanflow_history__:';
let lastEventTime=0;
export const HISTORY_STORES=['staff','apartments','categories','owners','assignments','payments','reservations','checkoutStates','settings'];
export const isHistory=item=>typeof item?.id==='string'&&item.id.startsWith(HISTORY_PREFIX);
const stable=value=>value===null||typeof value!=='object'?JSON.stringify(value):Array.isArray(value)?`[${value.map(stable).join(',')}]`:`{${Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')}}`;
export const sameRecord=(a,b)=>stable(a??null)===stable(b??null);
export function historyEntries(data){return (data.settings||[]).filter(isHistory).map(item=>item.history).sort((a,b)=>b.at.localeCompare(a.at)||b.id.localeCompare(a.id));}
export function historyRecord(changes,{action,undoOf,summary}={}){
 const id=crypto.randomUUID();
 const timestamp=Math.max(Date.now(),lastEventTime+1);lastEventTime=timestamp;
 const first=changes[0];
 action=action||(first?.before==null?'create':first?.after==null?'delete':first.before.active!==first.after.active?(first.after.active===false?'archive':'reactivate'):first.store==='assignments'&&first.before.status==='planned'&&first.after.status==='confirmed'?'confirm':'update');
 return {id:HISTORY_PREFIX+id,history:{version:1,id,at:new Date(timestamp).toISOString(),action,changes:structuredClone(changes),...(undoOf?{undoOf}:{}),...(summary?{summary}:{})}};
}
export function validateHistory(data){
 for(const record of (data.settings||[]).filter(isHistory)){
  const e=record.history;
  if(!e||e.version!==1||record.id!==HISTORY_PREFIX+e.id||typeof e.id!=='string'||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))||!['create','update','delete','archive','reactivate','confirm','order','undo','import'].includes(e.action)||!Array.isArray(e.changes)||(!e.changes.length&&e.action!=='import'))throw Error('history.invalid');
  if((e.action==='undo'&&typeof e.undoOf!=='string')||(e.undoOf!==undefined&&(e.action!=='undo'||typeof e.undoOf!=='string')))throw Error('history.invalid');
  if(e.action==='import'&&(!Array.isArray(e.summary)||e.summary.some(s=>!HISTORY_STORES.includes(s.store)||!Number.isSafeInteger(s.before)||s.before<0||!Number.isSafeInteger(s.after)||s.after<0)))throw Error('history.invalid');
  const ids=new Set();
  for(const c of e.changes){
   if(!c||!HISTORY_STORES.includes(c.store)||typeof c.id!=='string'||(c.store==='settings'&&c.id.startsWith(HISTORY_PREFIX))||c.before===undefined||c.after===undefined||(!c.before&&!c.after)||ids.has(c.store+':'+c.id))throw Error('history.invalid');
   for(const v of [c.before,c.after])if(v!==null&&(!v||typeof v!=='object'||Array.isArray(v)||v.id!==c.id))throw Error('history.invalid');
   ids.add(c.store+':'+c.id);
  }
 }
 return true;
}
function relationIssues(data){
 const issues=new Set(),has=(store,id)=>data[store]?.some(x=>x.id===id),check=(item,key,store,source)=>{if(item[key]&&!has(store,item[key]))issues.add(`${source}:${item.id}:${key}:${item[key]}`);};
 for(const a of data.apartments||[]){check(a,'ownerId','owners','apartment');check(a,'categoryId','categories','apartment');}
 for(const a of [...data.assignments||[],...data.payments||[]])check(a,'staffId','staff','staff-link');
 for(const a of [...data.reservations||[],...data.checkoutStates||[]])check(a,'apartmentId','apartments','apartment-link');
 const occupied=new Set();
 for(const job of data.assignments||[])for(const apartment of job.apartments||[]){const slot=job.date+':'+apartment.apartmentId;if(occupied.has(slot))issues.add('duplicate-cleaning:'+slot);occupied.add(slot);if(!has('apartments',apartment.apartmentId))issues.add('snapshot:'+job.id+':'+apartment.apartmentId);}
 return issues;
}
export function prepareUndo(data,eventId,validate){
 validateHistory(data);
 const entries=historyEntries(data),entry=entries.find(e=>e.id===eventId);
 if(!entry||['undo','import'].includes(entry.action)||entries.some(e=>e.undoOf===eventId))throw Error('history.unavailable');
 const candidate=structuredClone(data);
 for(const change of entry.changes){
  if(change.store==='assignments'&&change.before!==null&&!change.before.apartments?.length)throw Error('history.conflict');
  const current=candidate[change.store].find(item=>item.id===change.id)||null;
  if(!sameRecord(current,change.after))throw Error('history.changed');
  const index=candidate[change.store].findIndex(item=>item.id===change.id);
  if(change.before===null){if(index>=0)candidate[change.store].splice(index,1);}
  else if(index<0)candidate[change.store].push(structuredClone(change.before));else candidate[change.store][index]=structuredClone(change.before);
 }
 try{
  const baseline=relationIssues(data);if([...relationIssues(candidate)].some(issue=>!baseline.has(issue)))throw Error('dependency');
  for(const change of entry.changes)if(change.store==='assignments'&&change.before)validatePlanningWrite(change.before,candidate.assignments);
  validate(candidate);
 }catch{throw Error('history.conflict');}
 return {entry,changes:entry.changes.map(c=>({store:c.store,id:c.id,before:structuredClone(c.after),after:structuredClone(c.before)}))};
}
