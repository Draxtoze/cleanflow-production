const {_electron}=require(process.env.CLEANFLOW_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
(async()=>{
 const root=path.resolve(__dirname,'..'),profile=await fs.mkdtemp(path.join(os.tmpdir(),'cf-v2-demo-test-'));
 const app=await _electron.launch({executablePath:path.join(root,'node_modules','electron','dist','electron.exe'),args:[root,'--demo',`--user-data-dir=${profile}`]});
 try{
  const page=await app.firstWindow(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.locator('nav').waitFor();
  await page.waitForFunction(async()=>{const r=await window.cleanflowDesktop.backupStatus();return r.ok&&r.value.count===31&&r.value.createdToday;},{timeout:30000});
  assert.equal((await page.evaluate(()=>window.cleanflowDesktop.info())).value.demo,true);
  const databases=await page.evaluate(()=>indexedDB.databases());assert.ok(databases.some(db=>db.name==='cleanflow-development-demo'));assert.equal(databases.some(db=>db.name==='cleanflow-db'),false);
  const before=await page.evaluate(()=>window.cleanflowDesktop.backupStatus());await page.locator('aside [data-open-settings]').click();await page.locator('[data-backup-now]').click();await page.waitForTimeout(100);const after=await page.evaluate(()=>window.cleanflowDesktop.backupStatus());assert.equal(before.value.count,after.value.count);assert.equal(before.value.lastSuccess,after.value.lastSuccess);
  await page.locator('[data-retention]').fill('0');await page.locator('[data-retention]').dispatchEvent('change');assert.equal(await page.locator('[data-retention]').getAttribute('aria-invalid'),'true');await page.locator('[data-retention]').fill('31');await page.locator('[data-retention]').dispatchEvent('change');
  await page.locator('[data-theme-choice=forest]').click();await page.locator('[data-size=large]').click();await page.keyboard.press('Escape');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'forest');
  const files=await fs.readdir(path.join(profile,'automatic-backups'));assert.equal(files.filter(name=>name.endsWith('.json')).length,31);assert.equal(files.some(name=>name.endsWith('.tmp')),false);
  for(const name of files){const data=JSON.parse(await fs.readFile(path.join(profile,'automatic-backups',name),'utf8'));assert.equal(data.automatic.manager,'CleanFlow-daily-v1');assert.equal(data.backup.appVersion,'2.0.0');}
  assert.deepEqual(errors,[]);console.log('Electron demo: separate profile/database, 32 real synthetic days reduced to 31 files, immutable same-day file, settings validation and persistence: passed.');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exit(1);});
