const {chromium}=require(process.env.CLEANFLOW_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const canonical=data=>Object.fromEntries(Object.entries(data).map(([key,value])=>[key,[...value].sort((a,b)=>a.id.localeCompare(b.id))]));
(async()=>{
 const {exhaustiveFixture}=await import(pathToFileURL(path.resolve('tests/v2-fixture.mjs')).href);
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:5190/?demo=1');await page.locator('nav').waitFor();await page.locator('[data-language=en]').click();
 // First independent complete browser-store round-trip, including all unknown nested fields.
 for(const seed of ['A','B']){
  const fixture=exhaustiveFixture(seed);
  await page.evaluate(async data=>{const {Store}=await import('./js/store.js');await (await new Store().open({demo:true})).replace(data);},fixture);await page.reload();
  await page.locator('[data-page=backup]').click();const downloadEvent=page.waitForEvent('download');await page.locator('[data-export]').click();const download=await downloadEvent;const content=require('node:fs').readFileSync(await download.path(),'utf8'),backup=JSON.parse(content);assert.deepEqual(canonical(backup.data),canonical(fixture));
  const clean=await browser.newContext({acceptDownloads:true}),restored=await clean.newPage();await restored.goto('http://127.0.0.1:5190/');await restored.locator('nav').waitFor();await restored.locator('[data-page=backup]').click();await restored.locator('#import-file').setInputFiles({name:'synthetic-backup.json',mimeType:'application/json',buffer:Buffer.from(content)});await restored.locator('[data-import]').click();await restored.locator('.modal [data-submit]').click();await restored.locator('.modal').waitFor({state:'detached'});
  const actual=await restored.evaluate(async()=>{const {Store}=await import('./js/store.js');return (await new Store().open()).data();});assert.deepEqual(canonical(actual),canonical(fixture));
  assert.equal(await restored.locator('html').getAttribute('data-theme'),fixture.settings[0].theme);assert.equal(await restored.locator('html').getAttribute('data-text-size'),'large');
  for(const name of ['planning','staff','apartments','owners','bookings','reports','balances','about']){await restored.locator(`[data-page=${name}]`).click();assert.equal(await restored.locator('main').isVisible(),true);}
  await restored.locator('[data-page=balances]').click();assert.ok((await restored.locator('main').innerText()).includes('105.39'));await clean.close();
 }
 // Reset only this synthetic demo profile, then verify all appearance/view modes.
 await page.evaluate(async()=>{const {Store}=await import('./js/store.js');const {demoData}=await import('./js/demo.js');await (await new Store().open({demo:true})).replace(demoData());});await page.reload();await page.locator('[data-language=en]').click();
 await page.locator('aside [data-open-settings]').click();
 for(const theme of ['ocean','forest','night','indigo','amber','plum']){await page.locator(`[data-theme-choice=${theme}]`).click();await page.waitForTimeout(220);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);assert.equal(await page.locator(`[data-theme-choice=${theme}]`).getAttribute('aria-pressed'),'true');}
 await page.locator('[data-size=large]').click();await page.waitForTimeout(100);assert.equal(await page.locator('html').getAttribute('data-text-size'),'large');await page.keyboard.press('Escape');await page.reload();assert.equal(await page.locator('html').getAttribute('data-theme'),'plum');
 for(const name of ['staff','apartments']){await page.locator(`[data-page=${name}]`).click();for(const mode of ['details','compact','cards']){await page.locator(`[data-view-mode=${mode}]`).click();await page.waitForTimeout(100);assert.ok(await page.locator(`.cards[data-view=${mode}]`).count()>0);await page.locator('[data-v2-search]').fill(name==='staff'?'Anna':'Old Town');assert.ok(await page.locator(name==='staff'?'[data-staff-card]:not([hidden])':'[data-apartment-card]:not([hidden])').count()>0);await page.locator('[data-v2-search]').fill('');}}
 await page.locator('[data-page=reports]').click();assert.equal(await page.locator('.report-card').count(),4);assert.equal(await page.locator('main select').count(),0);
 for(const language of ['en','pl']){
  await page.locator(`[data-language=${language}]`).click();
  for(const kind of ['employee','weekly','owner','category']){
   await page.locator(`[data-configure-report=${kind}]`).click();const dialog=page.locator('.v2-dialog');
   if(kind==='employee'){assert.equal(await dialog.locator('[name=money]').isChecked(),false);await dialog.locator('[name=employee]').selectOption('staff-0');}
   if(kind==='owner'){assert.equal(await dialog.locator('[name=charges]').isChecked(),false);await dialog.locator('[name=owner]').selectOption('owner-a');}
   if(kind==='category')await dialog.locator('[name=category]').selectOption('central');
   assert.equal(await dialog.locator('[data-generate-preview]').isDisabled(),false);await dialog.locator('[data-generate-preview]').click();await page.locator('.report-preview iframe').waitFor({timeout:60000});assert.ok((await page.locator('.report-preview iframe').getAttribute('src')).startsWith('blob:'));
   const download=page.waitForEvent('download');await page.locator('.report-preview [data-download]').click();assert.ok((await download).suggestedFilename().endsWith('.pdf'));await page.locator('.report-preview [data-close]').click();await dialog.locator('[data-v2-close]').click();
  }
 }
 for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:1000});for(const name of ['reports','staff','apartments','bookings']){await page.locator(`[data-page=${name}]`).click();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${name} overflow at ${width}`);}}
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-language=en]').click();await page.locator('[data-page=reports]').click();await page.screenshot({path:'tests/v2-reports.png',fullPage:true});await page.locator('aside [data-open-settings]').click();await page.waitForTimeout(250);await page.screenshot({path:'tests/v2-settings.png'});
 assert.deepEqual(errors,[]);console.log('V2 browser: two complete UI backup restores, page/balance checks, six themes, text persistence, all views, four PDFs EN/PL, downloads, responsive and reduced motion: passed.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
