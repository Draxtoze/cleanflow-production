const {chromium}=require(process.env.CLEANFLOW_PLAYWRIGHT||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const {planningFixture}=await import(pathToFileURL(path.resolve('tests/planning-fixture.mjs')).href),browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5193/');await page.locator('nav').waitFor();
 const results=await page.evaluate(async fixture=>{
  const {Store}=await import('./js/store.js'),s=await new Store().open();await s.replace(fixture,{record:false});s.historyEnabled=true;
  const original=await s.get('assignments','plan'),put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(value.id?.startsWith('__cleanflow_history__:'))throw new DOMException('Synthetic history failure','QuotaExceededError');return put.call(this,value,...args);};
  let failed=false;try{await s.mutate([{store:'assignments',id:'plan',value:null,expected:original}]);}catch{failed=true;}finally{IDBObjectStore.prototype.put=put;}
  const atomic=JSON.stringify(await s.get('assignments','plan'))===JSON.stringify(original),historyAfterFailure=(await s.all('settings')).filter(x=>x.history).length;
  await s.mutate([{store:'assignments',id:'plan',value:{...original,status:'confirmed'},expected:original}]);let stale='';try{await s.mutate([{store:'assignments',id:'plan',value:null,expected:original}]);}catch(e){stale=e.message;}
  await s.replace(fixture,{record:false});const other=await new Store().open();other.historyEnabled=true;
  const base={date:'2026-11-02',status:'planned',apartments:[{apartmentId:'apt-2',name:'Other apartment',priceGrosz:12000}]};
  const writes=await Promise.allSettled([s.put('assignments',{...base,id:'race-a',staffId:'anna'}),other.put('assignments',{...base,id:'race-b',staffId:'marek'})]);
  const raced=await s.data();return {failed,atomic,historyAfterFailure,stale,raceSuccesses:writes.filter(x=>x.status==='fulfilled').length,raceFailures:writes.filter(x=>x.status==='rejected').map(x=>x.reason.message),raceRecords:raced.assignments.filter(x=>x.date==='2026-11-02').length,raceEvents:raced.settings.filter(x=>x.history).length};
 },planningFixture());assert.deepEqual(results,{failed:true,atomic:true,historyAfterFailure:0,stale:'planning.stale',raceSuccesses:1,raceFailures:['planning.conflict'],raceRecords:1,raceEvents:1});
 console.log('Planning atomic transaction: journal-failure cancellation rolls back, stale cancellation cannot delete a confirmed task, concurrent apartment assignment has one winner and one journal event: passed.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
