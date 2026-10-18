import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createBackup,readBackup} from '../js/backup.js';
import {validateBackup} from '../js/business.js';
import {defaultPreferences,validatePreferences,THEMES,TEXT_SIZES,VIEWS} from '../js/preferences.js';
import {exhaustiveFixture} from './v2-fixture.mjs';
import {v2English,v2Polish} from '../js/v2-i18n.js';
const {createBackupService}=createRequire(import.meta.url)('../desktop/backups.cjs');
const backup=()=>createBackup(exhaustiveFixture());
test('manual round-trip retains every field, nested snapshot and preference in two independent fixtures',async()=>{
 for(const seed of ['A','B']){const data=exhaustiveFixture(seed),before=structuredClone(data),value=createBackup(data);assert.equal(validateBackup(value),true);assert.deepEqual(await readBackup(JSON.parse(JSON.stringify(value))),before);assert.deepEqual(data,before);}
});
test('daily files are deduplicated, atomic, checksummed and restorable; next local day creates a file',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cf-auto-test-'));let date=new Date(2026,9,19,12);const service=createBackupService({directory,validate:validateBackup,now:()=>date});
 assert.equal((await service.create(backup())).created,true);assert.equal((await service.create(backup())).created,false);assert.equal((await fs.readdir(directory)).length,1);
 const automatic=JSON.parse(await fs.readFile(path.join(directory,(await service.list())[0].name),'utf8'));assert.deepEqual(await readBackup(automatic),exhaustiveFixture());
 automatic.backup.data.staff[0].name='tampered';await assert.rejects(readBackup(automatic));
 date=new Date(2026,9,20,0,5);assert.equal((await service.create(backup())).created,true);assert.equal((await service.status()).count,2);
});
test('32 synthetic days retain exactly 31; manual and foreign files are never deleted',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cf-retention-test-'));const manual=path.join(directory,'manual-backup.json'),foreign=path.join(directory,'CleanFlow-auto-backup-2000-01-01.json');await fs.writeFile(manual,'manual');await fs.writeFile(foreign,JSON.stringify({manual:true}));
 let date;const service=createBackupService({directory,validate:validateBackup,now:()=>date});
 for(let day=1;day<=32;day++){date=new Date(2026,8,day,12);await service.create(backup());}
 const list=await service.list();assert.equal(list.length,31);assert.equal(list.at(-1).day,'2026-09-02');assert.equal(await fs.readFile(manual,'utf8'),'manual');assert.equal(await fs.readFile(foreign,'utf8'),'{"manual":true}');assert.equal((await fs.readdir(directory)).some(name=>name.endsWith('.tmp')),false);
});
test('write/finalization failure leaves no success marker or partial file, next attempt retries safely',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cf-failure-test-')),now=()=>new Date(2026,9,19,12);
 const faulty=createBackupService({directory,validate:validateBackup,now,io:{...fs,link:async()=>{throw Error('simulated failure');}}});
 await assert.rejects(faulty.create(backup()));assert.equal((await faulty.status()).createdToday,false);assert.deepEqual(await fs.readdir(directory),[]);
 const good=createBackupService({directory,validate:validateBackup,now});assert.equal((await good.create(backup())).created,true);
});
test('retention validation, same-day collisions and concurrent calls cannot overwrite data',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'cf-collision-test-')),now=()=>new Date(2026,9,19,12),s=createBackupService({directory,validate:validateBackup,now});
 for(const retention of [0,366,1.5,'31'])await assert.rejects(s.create(backup(),retention));
 await fs.writeFile(path.join(directory,'CleanFlow-auto-backup-2026-10-19.json'),'manual collision');await assert.rejects(s.create(backup()));assert.equal(await fs.readFile(path.join(directory,'CleanFlow-auto-backup-2026-10-19.json'),'utf8'),'manual collision');
 const other=await fs.mkdtemp(path.join(os.tmpdir(),'cf-concurrent-test-')),q=createBackupService({directory:other,validate:validateBackup,now});const results=await Promise.all([q.create(backup()),q.create(backup())]);assert.equal(results.filter(item=>item.created).length,1);
});
test('all appearance/view options validate and new translations have exact English/Polish key parity',()=>{
 for(const theme of THEMES)for(const textSize of TEXT_SIZES)for(const staffView of VIEWS)assert.ok(validatePreferences({...defaultPreferences('en'),theme,textSize,staffView}));
 assert.throws(()=>validatePreferences({...defaultPreferences('en'),autoBackupRetention:0}));assert.deepEqual(Object.keys(v2English),Object.keys(v2Polish));assert.ok(Object.values(v2Polish).every(Boolean));
});
