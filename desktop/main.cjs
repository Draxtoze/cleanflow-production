const { app, BrowserWindow, protocol, net } = require('electron');
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
if(demo)app.setPath('userData',path.join(app.getPath('appData'),'CleanFlow-development-demo'));
let main;
if(!app.requestSingleInstanceLock()){app.quit();}else{
 app.on('second-instance',()=>{if(main){if(main.isMinimized())main.restore();main.focus();}});
 app.whenReady().then(()=>{
  protocol.handle('cleanflow',request=>{
   const url=new URL(request.url);let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{return new Response('Bad request',{status:400});}
   const file=path.resolve(root,`.${pathname==='/'?'/index.html':pathname}`);
   if(url.hostname!=='app'||!file.startsWith(root+path.sep)||!fs.existsSync(file)||(!demo&&file===path.join(root,'js','demo.js')))return new Response('Not found',{status:404});
   return net.fetch(pathToFileURL(file).href);
  });
  main=new BrowserWindow({width:1400,height:950,minWidth:640,minHeight:500,title:'CleanFlow',icon:path.join(root,'assets','cleanflow-icon.png'),webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
  main.setMenuBarVisibility(false);
  main.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  main.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('cleanflow://app/'))event.preventDefault();});
  main.loadURL(`cleanflow://app/${demo?'?demo=1':''}`);
 });
 app.on('window-all-closed',()=>app.quit());
}
