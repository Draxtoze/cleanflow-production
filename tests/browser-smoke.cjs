const { chromium } = require(process.env.CLEANFLOW_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}}),page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5190/?demo=1');await page.locator('[data-language=en]').click();
 for(const pageName of ['staff','apartments','owners','bookings','balances','backup','reports']){await page.locator(`[data-page=${pageName}]`).click();await page.waitForTimeout(100);assert.equal(await page.locator('main').count(),1);}
 await page.locator('[data-page=bookings]').click();assert.ok(await page.locator('.timeline-stay').count()>0);assert.ok(await page.locator('.timeline-stay.cash').count()>0);
 await page.screenshot({path:'tests/calendar-development.png',fullPage:false});
 await page.locator('[data-apartment-order]').click();await page.locator('[data-order-move="1"]').first().click();assert.equal(await page.locator('.order-dirty').isVisible(),true);await page.locator('.modal [data-submit]').click();
 await page.locator('[data-page=planning]').click();await page.locator('[data-assignment]:not([data-assignment=new])').first().click();assert.ok(await page.locator('.dog-fields').count()>0);await page.locator('.modal header [data-close]').click();
 await page.locator('[data-page=reports]').click();
 await page.evaluate(()=>{const Original=window.jspdf.jsPDF;window.pdfText=[];window.jspdf.jsPDF=new Proxy(Original,{construct(target,args){const doc=new target(...args);const text=doc.text.bind(doc);doc.text=(value,...rest)=>{window.pdfText.push(String(value));return text(value,...rest);};return doc;}});});
 async function preview(kind){await page.locator('[data-configure-report='+kind+']').click();const dialog=page.locator('.v2-dialog');if(kind==='employee')await dialog.locator('[name=employee]').selectOption('staff-0');if(kind==='owner')await dialog.locator('[name=owner]').selectOption('owner-a');if(kind==='category')await dialog.locator('[name=category]').selectOption('central');await dialog.locator('[data-generate-preview]').click();await page.locator('.report-preview iframe').waitFor({timeout:60000});}
 async function close(){await page.locator('.report-preview [data-close]').click();await page.locator('.v2-dialog [data-v2-close]').click();}
 for(const kind of ['weekly','weekly','category','category','employee']){await preview(kind);await close();}
 await page.evaluate(()=>window.pdfText=[]);await preview('employee');assert.equal(await page.evaluate(()=>window.pdfText.some(text=>/Real balance|Payments|Expected amount|Confirmed amount/.test(text))),false);await close();
 await page.evaluate(()=>window.pdfText=[]);await preview('owner');assert.equal(await page.evaluate(()=>window.pdfText.some(text=>/Real balance|Payments|Anna Kowalska|Kasia Zielińska/.test(text))),false);await close();
 await page.locator('[data-language=pl]').click();assert.ok((await page.locator('aside').innerText()).includes('Właściciele'));assert.ok((await page.locator('aside').innerText()).includes('2.0.0'));
 await preview('employee');await close();
 assert.deepEqual(errors,[]);console.log('Browser smoke: all pages, timeline, reorder, dog fields, weekly/monthly twice, individual/owner PDF, Polish: passed');await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
