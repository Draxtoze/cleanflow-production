const {_electron}=require(process.env.CLEANFLOW_PLAYWRIGHT||'playwright');
const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os');
(async()=>{
 const root=path.resolve(__dirname,'..'),electron=await _electron.launch({executablePath:path.join(root,'dist','win-unpacked','CleanFlow.exe'),args:['--user-data-dir='+fs.mkdtempSync(path.join(os.tmpdir(),'cf-pdf-test-'))]});
 try{
  const page=await electron.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('nav [data-page=staff]').click();assert.equal(await page.locator('[data-staff-card]').count(),0);
  await page.evaluate(async()=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('cleanflow-db');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const tx=db.transaction(['staff','apartments','categories','reservations','assignments'],'readwrite');
   tx.objectStore('staff').put({id:'test-s',name:'Windows test',active:true});tx.objectStore('categories').put({id:'test-c',name:'Windows test category'});tx.objectStore('apartments').put({id:'test-a',name:'Windows test apartment',categoryId:'test-c',priceGrosz:10000,active:true});tx.objectStore('reservations').put({id:'test-r',apartmentId:'test-a',checkIn:'2026-10-01',checkOut:'2026-10-08',notes:'Synthetic test'});tx.objectStore('assignments').put({id:'test-j',staffId:'test-s',date:'2026-10-07',status:'confirmed',apartments:[{apartmentId:'test-a',name:'Windows test apartment',priceGrosz:10000}]});await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();});
  await page.reload();await page.locator('[data-page=reports]').click();
  for(const kind of ['weekly','weekly','category','category']){
   await page.locator('[data-configure-report='+kind+']').click();const dialog=page.locator('.v2-dialog');
   if(kind==='weekly')await dialog.locator('[name=week]').fill('2026-10-05');else{await dialog.locator('[name=category]').selectOption('test-c');await dialog.locator('[name=month]').fill('2026-10');}
   await dialog.locator('[data-generate-preview]').click();await page.locator('.report-preview iframe').waitFor({timeout:60000});assert.ok((await page.locator('.report-preview iframe').getAttribute('src')).startsWith('blob:'));await page.locator('.report-preview [data-close]').click();await dialog.locator('[data-v2-close]').click();
  }
  assert.equal(await page.evaluate(()=>location.protocol),'cleanflow:');assert.equal(await page.evaluate(()=>Boolean(window.require)),false);assert.deepEqual(errors,[]);console.log('Packaged Windows PDF smoke: weekly twice, monthly twice, Blob iframe, unchanged origin and isolated data: passed.');
 }finally{await electron.close();}
})().catch(error=>{console.error(error);process.exit(1);});
