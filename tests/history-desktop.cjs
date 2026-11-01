const {_electron}=require(process.env.CLEANFLOW_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
(async()=>{
 const root=path.resolve(__dirname,'..'),profile=await fs.mkdtemp(path.join(os.tmpdir(),'cf-history-native-'));
 const launch=()=>_electron.launch({executablePath:path.join(root,'node_modules','electron','dist','electron.exe'),args:[root,'--demo',`--user-data-dir=${profile}`]});let app=await launch();
 try{
  let page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('nav').waitFor();assert.equal((await page.evaluate(()=>window.cleanflowDesktop.info())).value.demo,true);
  await page.locator('[data-page=staff]').click();await page.locator('[data-edit-staff="staff-0"]').click();const original=await page.locator('.modal [name=name]').inputValue();await page.locator('.modal [name=name]').fill('Synthetic desktop history');await page.locator('.modal [data-submit]').click();await page.locator('.modal').waitFor({state:'detached'});
  await page.locator('[data-page=history]').click();assert.equal(await page.locator('.history-event').count(),1);await page.locator('[data-history-details]').click();await page.locator('.modal [data-submit]').click();await page.locator('.modal [data-submit]').click();await page.locator('.modal').waitFor({state:'detached'});assert.equal(await page.locator('.history-event').count(),2);
  let data=await page.evaluate(async()=>{const {Store}=await import('./js/store.js');return (await new Store().open({demo:true})).data();});assert.equal(data.staff.find(x=>x.id==='staff-0').name,original);assert.equal(data.settings.filter(x=>x.history?.action==='undo').length,1);assert.deepEqual(errors,[]);await app.close();
  app=await launch();page=await app.firstWindow();await page.locator('nav').waitFor();await page.locator('[data-page=history]').click();assert.equal(await page.locator('.history-event').count(),2);assert.ok((await page.locator('.app-version').innerText()).includes('2.1.1'));
  data=await page.evaluate(async()=>{const {Store}=await import('./js/store.js');const {createBackup,readBackup}=await import('./js/backup.js');const data=await (await new Store().open({demo:true})).data();return readBackup(JSON.parse(JSON.stringify(createBackup(data))));});assert.equal(data.settings.filter(x=>x.history).length,2);
  console.log('Native Windows demo: edit, confirmed undo, restored values, durable journal after restart and complete backup round-trip: passed.');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exit(1);});
