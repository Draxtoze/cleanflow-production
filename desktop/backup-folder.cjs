const path=require('node:path');
const {spawn}=require('node:child_process');
const fs=require('node:fs');

// A new Explorer window avoids an existing/background shell window silently
// consuming openPath's successful request. No renderer-supplied path or shell.
async function openBackupDirectory({directory,backups,platform=process.platform,shell,launch=spawn,resolveDirectory=fs.realpathSync.native,systemRoot=process.env.SystemRoot||'C:\\Windows'}) {
 await backups.status(); // Creates and validates the managed directory first.
 // Windows packaged/virtualized environments may expose a logical AppData path
 // to this process that Explorer cannot resolve. Do not move or copy any data.
 const actualDirectory=resolveDirectory(directory);
 if(platform!=='win32'){
  const error=await shell.openPath(actualDirectory);if(error)throw Error('backups.folderError');
 }else{
  await new Promise((resolve,reject)=>{
   const child=launch(path.join(systemRoot,'explorer.exe'),['/n,',actualDirectory],{shell:false,windowsHide:false,stdio:'ignore'});
   child.once('error',reject);child.once('spawn',()=>{child.unref();resolve();});
  });
 }
 return {directory:actualDirectory};
}
module.exports={openBackupDirectory};
