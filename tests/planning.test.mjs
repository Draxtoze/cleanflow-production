import test from 'node:test';
import assert from 'node:assert/strict';
import {planningFixture} from './planning-fixture.mjs';
import {validatePlanningWrite,pendingCheckout} from '../js/planning.js';
import {assignmentTotal,staffSummary,validateBackup} from '../js/business.js';
import {createBackup,readBackup} from '../js/backup.js';
import {historyRecord,prepareUndo} from '../js/history.js';
import {planningEnglish,planningPolish} from '../js/planning-i18n.js';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const {createBackupService}=createRequire(import.meta.url)('../desktop/backups.cjs');
test('cancellation removes expected base and dog bonus, preserves real amounts/payments and round-trips history',async()=>{
 const data=planningFixture();data.assignments.push({id:'anna-done',staffId:'anna',date:'2026-10-30',status:'confirmed',apartments:[{apartmentId:'apt-2',name:'Earlier confirmed cleaning',priceGrosz:5000}]});
 const before=structuredClone(data),job=data.assignments[0],summary=staffSummary('anna',data.assignments,data.payments);assert.equal(summary.confirmedGrosz,5000);assert.equal(summary.dueGrosz,2000);
 assert.equal(assignmentTotal(job),20000);data.assignments=data.assignments.filter(x=>x.id!==job.id);const record=historyRecord([{store:'assignments',id:job.id,before:job,after:null}]);data.settings.push(record);
 const after=staffSummary('anna',data.assignments,data.payments);assert.equal(summary.expectedGrosz,20000);assert.equal(after.expectedGrosz,0);assert.equal(after.dueGrosz,summary.dueGrosz);assert.deepEqual(data.payments,before.payments);
 for(const value of [before,data])assert.deepEqual(await readBackup(JSON.parse(JSON.stringify(createBackup(value)))),value);
 assert.deepEqual(prepareUndo(data,record.history.id,createBackup).changes[0].after,job);
 const other={...job,id:'reassigned',staffId:'marek'};data.assignments.push(other);assert.throws(()=>prepareUndo(data,record.history.id,createBackup),/conflict/);
});
test('write guard rejects empty cleanings, duplicate apartments, employee/date collisions and invalid snapshots',()=>{
 const data=planningFixture(),job=data.assignments[0];assert.equal(validatePlanningWrite(job,data.assignments),job);
 assert.throws(()=>validatePlanningWrite({...job,apartments:[]},[]),/emptyInvalid/);
 assert.throws(()=>validatePlanningWrite({...job,apartments:[job.apartments[0],job.apartments[0]]},[]),/conflict/);
 assert.throws(()=>validatePlanningWrite({...job,id:'second'},data.assignments),/conflict/);
 assert.throws(()=>validatePlanningWrite({...job,apartments:[{...job.apartments[0],dogBonusGrosz:-1}]},[]),/invalid/);
});
test('undo never restores a historical empty cleaning',()=>{
 const data=planningFixture(),empty={...data.assignments[0],apartments:[]};data.assignments=data.assignments.filter(x=>x.id!==empty.id);const record=historyRecord([{store:'assignments',id:empty.id,before:empty,after:null}]);data.settings.push(record);assert.throws(()=>prepareUndo(data,record.history.id,createBackup),/conflict/);
});
test('real daily file after cancellation restores the deletion and its undo snapshots unchanged',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'cf-planning-auto-'));try{const data=planningFixture(),job=data.assignments.shift();data.settings.push(historyRecord([{store:'assignments',id:job.id,before:job,after:null}]));const service=createBackupService({directory,validate:validateBackup,now:()=>new Date(2026,10,2,12)});
 await service.create(createBackup(data),31);const file=path.join(directory,(await service.list())[0].name),restored=await readBackup(JSON.parse(await readFile(file,'utf8')));assert.deepEqual(restored,data);assert.equal(restored.assignments.some(x=>x.id==='plan'),false);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('planning dictionaries are complete English/Polish pairs',()=>{assert.deepEqual(Object.keys(planningEnglish).sort(),Object.keys(planningPolish).sort());assert.ok(Object.values(planningPolish).every(x=>x&&typeof x==='string'));});
test('pending checkouts include overdue priorities, ignore future stays and resolve only after actual cleaning',()=>{
 const data=planningFixture(),apartmentId='apt-2',date='2026-11-01';
 assert.equal(pendingCheckout(data,apartmentId,date),null);
 data.reservations.push({id:'old',apartmentId,checkIn:'2026-10-25',checkOut:'2026-10-29'},{id:'next',apartmentId,checkIn:'2026-10-29',checkOut:'2026-11-03'});
 assert.equal(pendingCheckout(data,apartmentId,date).departure.id,'old');assert.equal(pendingCheckout(data,apartmentId,date).priority,true);
 data.assignments.push({id:'early',staffId:'anna',date:'2026-10-28',status:'confirmed',apartments:[{apartmentId}]});
 assert.ok(pendingCheckout(data,apartmentId,date));
 data.assignments.push({id:'later',staffId:'anna',date:'2026-10-30',status:'planned',apartments:[{apartmentId}]});
 assert.ok(pendingCheckout(data,apartmentId,date));
 data.assignments.at(-1).status='confirmed';assert.equal(pendingCheckout(data,apartmentId,date),null);
 data.assignments.at(-1).date='2026-11-02';assert.ok(pendingCheckout(data,apartmentId,date));
 data.checkoutStates.push({id:'ignore',apartmentId,date:'2026-10-29',status:'ignored'});assert.equal(pendingCheckout(data,apartmentId,date),null);
 data.checkoutStates=[];data.reservations.push({id:'latest',apartmentId,checkIn:'2026-10-30',checkOut:date});
 assert.equal(pendingCheckout(data,apartmentId,date).departure.id,'latest');
});
