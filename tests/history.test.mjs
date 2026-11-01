import test from 'node:test';
import assert from 'node:assert/strict';
import {historyRecord,historyEntries,prepareUndo,validateHistory,HISTORY_PREFIX} from '../js/history.js';
import {createBackup,readBackup} from '../js/backup.js';
import {staffSummary} from '../js/business.js';
import {exhaustiveFixture} from './v2-fixture.mjs';
import {historyEnglish,historyPolish} from '../js/history-i18n.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {validateBackup} from '../js/business.js';
const {createBackupService}=createRequire(import.meta.url)('../desktop/backups.cjs');
const verify=data=>createBackup(data);
function apply(data,changes){const result=structuredClone(data);for(const c of changes){result[c.store]=result[c.store].filter(item=>item.id!==c.id);if(c.after)result[c.store].push(structuredClone(c.after));}return result;}
test('full manual backup preserves history before/after snapshots and unknown fields exactly',async()=>{
 const data=exhaustiveFixture(),before=structuredClone(data.staff[0]),after={...before,notes:'Updated note 🐾'};
 const record=historyRecord([{store:'staff',id:before.id,before,after}]);data.staff[0]=after;data.settings.push(record);
 assert.deepEqual(await readBackup(JSON.parse(JSON.stringify(createBackup(data)))),data);assert.equal(historyEntries(data).length,1);
 const undo=prepareUndo(data,record.history.id,verify);assert.deepEqual(undo.changes[0].after,before);assert.deepEqual(data.staff[0],after);
});
test('newer record changes block undo; unrelated changes are kept; reversal cannot be repeated',()=>{
 const data=exhaustiveFixture(),before=structuredClone(data.staff[0]),after={...before,name:'Edited'};data.staff[0]=after;
 const record=historyRecord([{store:'staff',id:before.id,before,after}]);data.settings.push(record);
 data.staff[1].notes='Unrelated later change';const result=prepareUndo(data,record.history.id,verify);const restored=apply(data,result.changes);assert.equal(restored.staff.find(x=>x.id===data.staff[1].id).notes,'Unrelated later change');
 data.staff[0].name='Edited again';assert.throws(()=>prepareUndo(data,record.history.id,verify),/history.changed/);data.staff[0]=after;
 data.settings.push(historyRecord(result.changes,{action:'undo',undoOf:record.history.id}));assert.throws(()=>prepareUndo(data,record.history.id,verify),/history.unavailable/);
});
test('undo cannot delete a newly created apartment while a reservation depends on it',()=>{
 const data=exhaustiveFixture(),apartment=data.apartments[0];const record=historyRecord([{store:'apartments',id:apartment.id,before:null,after:structuredClone(apartment)}]);data.settings.push(record);
 assert.throws(()=>prepareUndo(data,record.history.id,verify),/history.conflict/);
});
test('undoing a deleted booking is rejected if newer dates overlap',()=>{
 const data=exhaustiveFixture(),booking=structuredClone(data.reservations[0]);data.reservations=[{...booking,id:'new-reservation'}];const record=historyRecord([{store:'reservations',id:booking.id,before:booking,after:null}]);data.settings.push(record);
 assert.throws(()=>prepareUndo(data,record.history.id,verify),/history.conflict/);
});
test('confirmation reversal recalculates real balance without altering payments or expected snapshots',()=>{
 const data=exhaustiveFixture(),before=structuredClone(data.assignments[1]),after={...before,status:'confirmed'};data.assignments[1]=after;const record=historyRecord([{store:'assignments',id:after.id,before,after}]);data.settings.push(record);
 const initial=staffSummary('a-s',data.assignments,data.payments),restored=apply(data,prepareUndo(data,record.history.id,verify).changes),final=staffSummary('a-s',restored.assignments,restored.payments);
 assert.equal(initial.dueGrosz-final.dueGrosz,9999);assert.equal(final.expectedGrosz,9999);assert.deepEqual(restored.payments,data.payments);
});
test('grouped owner deletion/reassignment restores both owner and apartment atomically as a candidate',()=>{
 const data=exhaustiveFixture(),owner=structuredClone(data.owners[0]),before=structuredClone(data.apartments[0]),after={...before,ownerId:''};data.owners=[];data.apartments[0]=after;
 const record=historyRecord([{store:'apartments',id:after.id,before,after},{store:'owners',id:owner.id,before:owner,after:null}],{action:'delete'});data.settings.push(record);
 const candidate=apply(data,prepareUndo(data,record.history.id,verify).changes);verify(candidate);assert.equal(candidate.apartments[0].ownerId,owner.id);assert.deepEqual(candidate.owners,[owner]);
});
test('invalid nested journal records are rejected on backup import; import events are not reversible',()=>{
 const data=exhaustiveFixture(),record=historyRecord([{store:'staff',id:'a-s',before:null,after:structuredClone(data.staff[0])}]);data.settings.push(record);record.history.changes[0].store='unknown';assert.throws(()=>createBackup(data),/history.invalid/);
 record.history.changes[0].store='settings';record.history.changes[0].id=HISTORY_PREFIX+'nested';assert.throws(()=>validateHistory(data),/history.invalid/);
 data.settings=data.settings.filter(x=>x!==record);const imported=historyRecord([],{action:'import',summary:[]});data.settings.push(imported);assert.throws(()=>prepareUndo(data,imported.history.id,verify),/history.unavailable/);
});
test('journal dictionaries have complete matching English and Polish keys',()=>{assert.deepEqual(Object.keys(historyEnglish),Object.keys(historyPolish));assert.ok(Object.values(historyPolish).every(Boolean));});
test('a real automatic backup restores the complete history alongside business data',async()=>{
 const data=exhaustiveFixture(),before=structuredClone(data.staff[0]),after={...before,notes:'Automatic backup history'};data.staff[0]=after;data.settings.push(historyRecord([{store:'staff',id:before.id,before,after}]));
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cf-history-backup-')),service=createBackupService({directory,validate:validateBackup});await service.create(createBackup(data));const saved=JSON.parse(await fs.readFile(path.join(directory,(await service.list())[0].name),'utf8'));assert.deepEqual(await readBackup(saved),data);
});
