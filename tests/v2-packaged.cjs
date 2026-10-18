const {_electron}=require(process.env.CLEANFLOW_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
(async()=>{
 const root=path.resolve(__dirname,'..'),profile=await fs.mkdtemp(path.join(os.tmpdir(),'cf-v2-package-'));
 const launch=()=>_electron.launch({executablePath:path.join(root,'dist','win-unpacked','CleanFlow.exe'),args:[`--user-data-dir=${profile}`]});
 let app=await launch();let initial;
 try{
  let page=await app.firstWindow();await page.locator('nav').waitFor();await page.waitForFunction(async()=>{const r=await window.cleanflowDesktop.backupStatus();return r.ok&&r.value.createdToday;});
  const info=(await page.evaluate(()=>window.cleanflowDesktop.info())).value;assert.equal(info.version,'2.0.0');assert.equal(info.schema,4);assert.equal(info.demo,false);assert.equal(info.backups,true);assert.equal(info.updates,true);
  await page.locator('nav [data-page=staff]').click();assert.equal(await page.locator('[data-staff-card]').count(),0);assert.equal(await page.evaluate(()=>typeof window.require),'undefined');assert.equal(await page.evaluate(()=>location.origin),'cleanflow://app');
  const files=await fs.readdir(path.join(profile,'automatic-backups'));assert.equal(files.length,1);initial=await fs.readFile(path.join(profile,'automatic-backups',files[0]),'utf8');assert.equal(JSON.parse(initial).backup.data.staff.length,0);
  assert.equal((await page.evaluate(()=>window.cleanflowDesktop.seedDemoBackups({}))).ok,false);
  await page.locator('aside [data-open-settings]').click();await page.locator('[data-theme-choice=indigo]').click();await page.locator('[data-size=large]').click();await page.keyboard.press('Escape');await app.close();
  app=await launch();page=await app.firstWindow();await page.locator('nav').waitFor();await page.waitForFunction(async()=>{const r=await window.cleanflowDesktop.backupStatus();return r.ok&&r.value.createdToday;});assert.equal(await page.locator('html').getAttribute('data-theme'),'indigo');assert.equal(await page.locator('html').getAttribute('data-text-size'),'large');
  const again=await fs.readdir(path.join(profile,'automatic-backups'));assert.equal(again.length,1);assert.equal(await fs.readFile(path.join(profile,'automatic-backups',again[0]),'utf8'),initial);
  console.log('Production Windows package: blank data, schema/origin unchanged, automatic file created once, same-day restart immutable, appearance persisted, demo API denied, renderer Node disabled: passed.');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exit(1);});
