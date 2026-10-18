const { app, BrowserWindow, protocol, net, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const fs = require('node:fs');
const root=path.resolve(__dirname,'..');
protocol.registerSchemesAsPrivileged([{scheme:'cleanflow',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
// Stable identity and origin preserve this packaged application's data across updates.
app.setName('CleanFlow');
const explicitProfile=app.commandLine.getSwitchValue('user-data-dir');
if(explicitProfile){fs.mkdirSync(path.resolve(explicitProfile),{recursive:true});app.setPath('userData',path.resolve(explicitProfile));}
const demo=process.argv.includes('--demo')&&!app.isPackaged;
if(demo&&!explicitProfile)app.setPath('userData',path.join(app.getPath('appData'),'CleanFlow-development-demo'));
let main;
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(main){if(main.isMinimized())main.restore();main.focus();}});
 app.whenReady().then(async()=>{
  const {validateBackup}=await import(pathToFileURL(path.join(root,'js','business.js')).href);
  const {validatePreferences}=await import(pathToFileURL(path.join(root,'js','preferences.js')).href);
  const validate=backup=>{validateBackup(backup);const prefs=backup.data.settings.find(item=>item.id==='preferences');if(prefs)validatePreferences(prefs);};
  const directory=path.join(app.getPath('userData'),'automatic-backups');
  const {createBackupService}=require('./backups.cjs');
  const backups=createBackupService({directory,validate});
  let demoSeedPromise;
  let updateState='checking';
  const allowed=event=>{if(event.sender!==main?.webContents||!event.senderFrame?.url.startsWith('cleanflow://app/'))throw Error('Invalid sender');};
  const desktopAvailable=process.platform==='win32'&&(app.isPackaged||demo);
  const handle=(channel,action)=>ipcMain.handle(channel,async(event,...args)=>{allowed(event);try{return {ok:true,value:await action(...args)};}catch{return {ok:false,error:'backups.error'};}});
  handle('cleanflow:info',()=>({version:app.getVersion(),schema:4,windows:process.platform==='win32',packaged:app.isPackaged,demo,backups:desktopAvailable,updates:process.platform==='win32'&&app.isPackaged,updateState}));
  handle('cleanflow:backup-status',async()=>{if(demoSeedPromise)await demoSeedPromise;return desktopAvailable?backups.status():null;});
  handle('cleanflow:backup-create',async backup=>{
   if(demoSeedPromise)await demoSeedPromise;
   if(!desktopAvailable)throw Error('Unavailable');
   if(Buffer.byteLength(JSON.stringify(backup),'utf8')>100*1024*1024)throw Error('Too large');
   validate(backup);const prefs=backup.data.settings.find(item=>item.id==='preferences');
   return backups.create(backup,prefs?.autoBackupRetention??31);
  });
  handle('cleanflow:backup-folder',async()=>{if(!desktopAvailable)throw Error('Unavailable');await backups.status();if(await shell.openPath(directory))throw Error('Unavailable');return true;});
  handle('cleanflow:demo-backups',async backup=>{
   if(!demo||!desktopAvailable)throw Error('Unavailable');validate(backup);
   if(!demoSeedPromise)demoSeedPromise=(async()=>{
    if((await backups.list()).length>=31)return backups.status();
    for(let i=31;i>=0;i--){const date=new Date();date.setDate(date.getDate()-i);const synthetic=createBackupService({directory,validate,now:()=>date});await synthetic.create({...backup,exportedAt:date.toISOString()},31);}
    return backups.status();
   })();
   return demoSeedPromise;
  });
  protocol.handle('cleanflow',request=>{
   const url=new URL(request.url);let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
   const file=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
   if(url.hostname!=='app'||!file.startsWith(root+path.sep)||!fs.existsSync(file)||(!demo&&file===path.join(root,'js','demo.js')))return new Response('Not found',{status:404});
   return net.fetch(pathToFileURL(file).href);
  });
  main=new BrowserWindow({width:1400,height:950,minWidth:640,minHeight:500,title:'CleanFlow',icon:path.join(root,'assets','cleanflow-icon.png'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,preload:path.join(__dirname,'preload.cjs')}});
  main.setMenuBarVisibility(false);
  main.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  main.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('cleanflow://app/'))event.preventDefault();});
  main.webContents.once('did-finish-load', async () => {
   if(process.platform !== 'win32' || !app.isPackaged) return;
   try {
    const { t } = await import(pathToFileURL(path.join(root,'js','i18n.js')).href);
    require('./updates.cjs').startWindowsUpdates({app,window:main,dialog,updater:require('electron-updater').autoUpdater,translate:t,onState:state=>{updateState=state;}});
   } catch { console.warn('CleanFlow: updates unavailable; continuing normally.'); }
  });
  main.loadURL(`cleanflow://app/${demo?'?demo=1':''}`);
 });
 app.on('window-all-closed',()=>app.quit());
}
