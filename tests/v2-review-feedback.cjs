const {chromium}=require(process.env.CLEANFLOW_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const luminance=rgb=>{const c=rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5190/?demo=1');await page.locator('nav').waitFor();await page.locator('[data-language=en]').click();
  await page.locator('[data-page=apartments]').click();await page.locator('[data-view-mode=cards]').click();
  const card=page.locator('[data-apartment-card]').first(),owner=await card.locator('.apartment-owner strong').innerText();assert.ok(owner.length>0);
  await card.locator('[data-apartment-details]').click();assert.ok((await page.locator('.detail-list').innerText()).includes(owner));await page.locator('.modal header [data-close]').click();
  await page.locator('[data-view-mode=compact]').click();assert.equal(await card.locator('.apartment-owner').isVisible(),false);assert.equal(await card.locator('.apartment-category').isVisible(),false);assert.equal(await card.locator('[data-apartment-details]').isVisible(),true);
  for(const height of [1000,650]){await page.setViewportSize({width:1440,height});const b=await page.locator('.save-settings').boundingBox();assert.ok(Math.abs(b.y+b.height-(height-25))<2,JSON.stringify(b));}
  await page.setViewportSize({width:1440,height:1000});await page.locator('[data-page=bookings]').click();
  for(const theme of ['ocean','forest','night','indigo','amber','plum']){
   await page.locator('aside [data-open-settings]').click();await page.locator(`[data-theme-choice=${theme}]`).click();await page.waitForTimeout(220);await page.keyboard.press('Escape');
   for(const selector of ['.timeline-label','nav button.selected']){const colors=await page.locator(selector).first().evaluate(el=>{const s=getComputedStyle(el);return [s.color,s.backgroundColor];});const values=colors.map(luminance);const ratio=(Math.max(...values)+.05)/(Math.min(...values)+.05);assert.ok(ratio>=4.5,`${theme} ${selector} contrast ${ratio}`);}
   if(theme==='night')await page.screenshot({path:'test-output/v2-night-feedback.png'});
  }
  await page.setViewportSize({width:390,height:844});const footer=await page.locator('.save-settings').boundingBox();assert.ok(Math.abs(footer.y+footer.height-844)<2);assert.equal(await page.locator('.save-settings .save-state').isVisible(),true);
  assert.deepEqual(errors,[]);console.log('Owner modal/cards, compact essentials, bottom sidebar at desktop/mobile sizes, all 6 theme label/nav contrast: passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
