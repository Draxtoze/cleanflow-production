import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { t } from '../js/i18n.js';
const { startWindowsUpdates } = createRequire(import.meta.url)('../desktop/updates.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(options = {}) {
 const updater = new EventEmitter(); let checks = 0, installs = 0, prompts = 0, destroyed = false, lastDialog;
 updater.checkForUpdates = () => { checks++; return options.offline ? Promise.reject(Error('offline')) : Promise.resolve(); };
 updater.quitAndInstall = (silent, run) => { assert.equal(silent,false); assert.equal(run,true); installs++; };
 const window = { isDestroyed: () => destroyed, webContents: { executeJavaScript: async () => options.language || 'en' } };
 const enabled = startWindowsUpdates({ app: { isPackaged: options.packaged ?? true }, window,
  platform: options.platform || 'win32', updater, translate:t, logger:{warn(){}},
  dialog: { showMessageBox: async (_window, value) => { prompts++; lastDialog = value; return {response: options.response ?? 1}; } } });
 return {updater,enabled,close:()=>{destroyed=true;},status:()=>({checks,installs,prompts,lastDialog})};
}
test('only packaged Windows checks the release feed', () => {
 for(const options of [{platform:'darwin'},{platform:'linux'},{packaged:false}]) {
  const f=setup(options); assert.equal(f.enabled,false); assert.equal(f.status().checks,0);
 }
 const f=setup();assert.equal(f.status().checks,1);assert.equal(f.updater.autoDownload,true);
 assert.equal(f.updater.autoInstallOnAppQuit,false);assert.equal(f.updater.allowPrerelease,false);assert.equal(f.updater.allowDowngrade,false);
});
test('later never installs, duplicate events never prompt twice', async () => {
 const f=setup();f.updater.emit('update-downloaded',{version:'1.5.2'});await tick();
 f.updater.emit('update-downloaded',{version:'1.5.2'});await tick();
 assert.equal(f.status().prompts,1);assert.equal(f.status().installs,0);
 assert.equal(f.status().lastDialog.cancelId,1);assert.equal(f.status().lastDialog.defaultId,1);
});
test('explicit approval installs and restarts, with localized version', async () => {
 for(const language of ['en','pl']) {
  const f=setup({language,response:0});f.updater.emit('update-downloaded',{version:'1.5.2'});await tick();
  assert.equal(f.status().installs,1);assert.match(f.status().lastDialog.message,/1\.5\.2/);
  assert.equal(f.status().lastDialog.buttons[0],t(language,'updates.install'));
 }
});
test('closed windows and failed downloads cannot install', async () => {
 const f=setup({response:0});f.close();f.updater.emit('update-downloaded',{version:'1.5.2'});await tick();assert.equal(f.status().prompts,0);
 const g=setup({response:0});g.updater.emit('error',Error('download failed'));g.updater.emit('update-downloaded',{version:'1.5.2'});await tick();assert.equal(g.status().installs,0);
});
test('offline startup is non-blocking and shows no error dialog', async () => {
 const f=setup({offline:true});await tick();assert.equal(f.enabled,true);assert.equal(f.status().prompts,0);
});
test('all update copy has English and Polish translations without raw keys', () => {
 for(const language of ['en','pl'])for(const key of ['title','ready','detail','install','later']) {
  assert.notEqual(t(language,`updates.${key}`,{version:'1.5.2'}),`updates.${key}`);
 }
 assert.notEqual(t('en','updates.detail'),t('pl','updates.detail'));
});
