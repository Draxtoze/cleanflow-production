import {historyRecord,isHistory,sameRecord,prepareUndo} from './history.js';
import {validateBackup,BACKUP_VERSION} from './business.js';
import {validatePlanningWrite} from './planning.js';
const DB_NAME = 'cleanflow-db';
const DB_VERSION = 4;
const STORES = ['staff', 'apartments', 'categories', 'owners', 'assignments', 'payments', 'reservations', 'checkoutStates', 'settings'];
const request = result => new Promise((resolve, reject) => { result.onsuccess = () => resolve(result.result); result.onerror = () => reject(result.error); });
const complete = transaction => new Promise((resolve, reject) => { transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error || new Error('Database transaction was aborted.')); });
const normalized = data => Object.fromEntries(STORES.map(name => [name, Array.isArray(data?.[name]) ? data[name] : []]));

export class Store {
  async open({ demo = false } = {}) {
    const open = indexedDB.open(demo ? 'cleanflow-development-demo' : DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => STORES.forEach(name => { if (!open.result.objectStoreNames.contains(name)) open.result.createObjectStore(name, { keyPath: 'id' }); });
    this.db = await request(open);
    return this;
  }
  async all(store) { return request(this.db.transaction(store).objectStore(store).getAll()); }
  async get(store, key) { return request(this.db.transaction(store).objectStore(store).get(key)); }
  async put(store, value,options) { await this.mutate([{store,id:value.id,value}],options);return value; }
  async delete(store, key,options) { await this.mutate([{store,id:key,value:null}],options); }
  async mutate(operations,{action,record=true}={}) {
    if(operations.some(op=>!STORES.includes(op.store)||typeof op.id!=='string'||(op.store==='settings'&&isHistory({id:op.id}))))throw Error('history.invalid');
    const keys=operations.map(op=>op.store+':'+op.id);if(new Set(keys).size!==keys.length)throw Error('history.invalid');
    const tx=this.db.transaction([...new Set([...operations.map(op=>op.store),'settings'])],'readwrite'),done=complete(tx);let journal;
    try{
      const before=await Promise.all(operations.map(op=>request(tx.objectStore(op.store).get(op.id))));
      if(operations.some((op,i)=>'expected' in op&&!sameRecord(before[i]??null,op.expected)))throw Error('planning.stale');
      if(operations.some(op=>op.store==='assignments')){
        let candidates=await request(tx.objectStore('assignments').getAll());
        for(const op of operations.filter(op=>op.store==='assignments')){candidates=candidates.filter(x=>x.id!==op.id);if(op.value)candidates.push(op.value);}
        for(const op of operations.filter(op=>op.store==='assignments'&&op.value))validatePlanningWrite(op.value,candidates);
      }
      const changes=operations.map((op,i)=>({store:op.store,id:op.id,before:before[i]??null,after:op.value??null})).filter(c=>!sameRecord(c.before,c.after));
      for(const c of changes)c.after===null?tx.objectStore(c.store).delete(c.id):tx.objectStore(c.store).put(c.after);
      if(this.historyEnabled&&record&&changes.length){journal=historyRecord(changes,{action});tx.objectStore('settings').put(journal);}
      await done;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
    if(journal)this.onHistory?.(journal);return journal;
  }
  async undoHistory(eventId){
    const tx=this.db.transaction(STORES,'readwrite'),done=complete(tx);let journal;
    try{
      const values=await Promise.all(STORES.map(key=>request(tx.objectStore(key).getAll()))),data=Object.fromEntries(STORES.map((key,i)=>[key,values[i]]));
      const result=prepareUndo(data,eventId,candidate=>validateBackup({version:BACKUP_VERSION,data:candidate}));
      for(const c of result.changes)c.after===null?tx.objectStore(c.store).delete(c.id):tx.objectStore(c.store).put(c.after);
      journal=historyRecord(result.changes,{action:'undo',undoOf:eventId});tx.objectStore('settings').put(journal);await done;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
    this.onHistory?.(journal);return journal;
  }
  async data() { const tx=this.db.transaction(STORES,'readonly');const done=complete(tx);const values = await Promise.all(STORES.map(name => request(tx.objectStore(name).getAll())));await done;return Object.fromEntries(STORES.map((name, index) => [name, values[index]])); }
  async replace(data,{record=true}={}) {
    const clean=normalized(data),tx=this.db.transaction(STORES,'readwrite'),done=complete(tx);let journal;
    try{
      if(this.historyEnabled&&record){const before=await Promise.all(STORES.map(key=>request(tx.objectStore(key).count())));journal=historyRecord([],{action:'import',summary:STORES.map((store,i)=>({store,before:before[i],after:clean[store].length}))});}
      STORES.forEach(name=>{const target=tx.objectStore(name);target.clear();clean[name].forEach(value=>target.put(value));});
      if(journal)tx.objectStore('settings').put(journal);await done;
    }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
    if(journal)this.onHistory?.(journal);
  }
}
