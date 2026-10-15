const { _electron } = require(process.env.CLEANFLOW_PLAYWRIGHT || 'playwright');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
(async () => {
 const root = path.resolve(__dirname, '..');
 const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-updates-'));
 const electron = await _electron.launch({executablePath:path.join(root,'dist','win-unpacked','CleanFlow.exe'),args:[`--user-data-dir=${profile}`]});
 try {
  const page = await electron.firstWindow();
  await page.locator('nav [data-page=staff]').click();
  assert.equal(await page.locator('[data-staff-card]').count(),0);
  await page.evaluate(()=>localStorage.setItem('cleanflow-language','pl'));
  // Requiring the same installed module inspects the updater initialized by the launcher.
  const state = await electron.evaluate(async ({app,dialog}) => {
   const req = process.mainModule.require('node:module').createRequire(app.getAppPath()+'/package.json');
   const u = req('electron-updater').autoUpdater;
   const config = req('node:fs').readFileSync(req('node:path').join(process.resourcesPath,'app-update.yml'),'utf8');
   const listeners = u.listenerCount('update-downloaded');
   let captured;
   const original=dialog.showMessageBox;
   dialog.showMessageBox=async (_window,options)=>{captured=options;return {response:1};};
   // Exercise the real launcher's downloaded-event wiring without installing anything.
   try {u.emit('update-downloaded',{version:'1.5.2'});for(let i=0;i<100&&!captured;i++)await new Promise(resolve=>setTimeout(resolve,20));}
   finally {dialog.showMessageBox=original;}
   return {version:app.getVersion(),autoDownload:u.autoDownload,autoInstall:u.autoInstallOnAppQuit,config,listeners,captured};
  });
  assert.equal(state.version,'1.5.1');assert.equal(state.autoDownload,true);assert.equal(state.autoInstall,false);
  assert.match(state.config,/provider: github/);assert.match(state.config,/repo: cleanflow-production/);
  assert.ok(state.listeners>0);assert.equal(state.captured.buttons[0],'Zainstaluj i uruchom ponownie');
  assert.match(state.captured.message,/1\.5\.2/);
  assert.equal(await page.evaluate(()=>location.origin),'cleanflow://app');
  console.log('Packaged Windows updater: initialized, public feed, approval-only installation, Polish prompt, blank data: passed.');
 } finally {await electron.close();}
})().catch(error=>{console.error(error);process.exit(1);});
