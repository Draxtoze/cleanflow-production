const { chromium } = require(process.env.CLEANFLOW_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}}),page=await context.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:5178/?demo=1');await page.locator('[data-language=en]').click();
 for(const pageName of ['staff','apartments','owners','bookings','balances','backup','reports']){await page.locator(`[data-page=${pageName}]`).click();await page.waitForTimeout(100);assert.equal(await page.locator('main').count(),1);}
 await page.locator('[data-page=bookings]').click();assert.ok(await page.locator('.timeline-stay').count()>0);assert.ok(await page.locator('.timeline-stay.cash').count()>0);
 await page.screenshot({path:'tests/calendar-development.png',fullPage:false});
 await page.locator('[data-apartment-order]').click();await page.locator('[data-order-move="1"]').first().click();assert.equal(await page.locator('.order-dirty').isVisible(),true);await page.locator('.modal [data-submit]').click();
 await page.locator('[data-page=planning]').click();await page.locator('[data-assignment]:not([data-assignment=new])').first().click();assert.ok(await page.locator('.dog-fields').count()>0);await page.locator('.modal header [data-close]').click();
 await page.locator('[data-page=reports]').click();
 await page.evaluate(()=>{const Original=window.jspdf.jsPDF;window.pdfText=[];window.jspdf.jsPDF=new Proxy(Original,{construct(target,args){const doc=new target(...args);const text=doc.text.bind(doc);doc.text=(value,...rest)=>{window.pdfText.push(String(value));return text(value,...rest);};return doc;}});});
 for(const selector of ['[data-report-preview-week]','[data-report-preview-week]','[data-report-preview-category]','[data-report-preview-category]','[data-ops-pdf=employee-preview]']){await page.locator(selector).click();await page.locator('.report-preview iframe').waitFor({timeout:60000});await page.locator('.report-preview [data-close]').click();}
 await page.evaluate(()=>window.pdfText=[]);await page.locator('[data-ops-pdf=employee-preview]').click();await page.locator('.report-preview iframe').waitFor({timeout:60000});assert.equal(await page.evaluate(()=>window.pdfText.some(text=>/Real balance|Payments|Expected amount|Confirmed amount/.test(text))),false);await page.locator('.report-preview [data-close]').click();
 await page.evaluate(()=>window.pdfText=[]);await page.locator('[data-owner-report]').selectOption('owner-a');await page.locator('[data-ops-pdf=owner-preview]').click();await page.locator('.report-preview iframe').waitFor({timeout:60000});assert.equal(await page.evaluate(()=>window.pdfText.some(text=>/Real balance|Payments|Anna Kowalska|Kasia Zielińska/.test(text))),false);await page.locator('.report-preview [data-close]').click();
 await page.locator('[data-language=pl]').click();assert.ok((await page.locator('aside').innerText()).includes('Właściciele'));assert.ok((await page.locator('aside').innerText()).includes('1.5.0'));
 await page.locator('[data-ops-pdf=employee-preview]').click();await page.locator('.report-preview iframe').waitFor({timeout:60000});await page.locator('.report-preview [data-close]').click();
 assert.deepEqual(errors,[]);console.log('Browser smoke: all pages, timeline, reorder, dog fields, weekly/monthly twice, individual/owner PDF, Polish: passed');await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
