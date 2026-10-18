import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
const {openBackupDirectory}=createRequire(import.meta.url)('../desktop/backup-folder.cjs');
test('backup folder validates the directory and opens a new Windows Explorer window without a shell',async()=>{
 let checked=false,unref=false;const directory='C:\\Test profile with spaces\\automatic-backups';
 const result=await openBackupDirectory({directory,resolveDirectory:value=>{assert.ok(checked);assert.equal(value,directory);return 'C:\\Physical path\\automatic-backups';},platform:'win32',systemRoot:'C:\\Windows',backups:{status:async()=>{checked=true;}},launch:(exe,args,options)=>{
  assert.ok(checked);assert.ok(exe.endsWith('explorer.exe'));assert.deepEqual(args,['/n,','C:\\Physical path\\automatic-backups']);assert.equal(options.shell,false);assert.equal(options.windowsHide,false);
  const child=new EventEmitter();child.unref=()=>{unref=true;};queueMicrotask(()=>child.emit('spawn'));return child;
 }});assert.deepEqual(result,{directory:'C:\\Physical path\\automatic-backups'});assert.ok(unref);
});
test('backup folder reports validation and launch errors instead of claiming success',async()=>{
 await assert.rejects(openBackupDirectory({directory:'test',backups:{status:async()=>{throw Error('unsafe');}}}),/unsafe/);
 await assert.rejects(openBackupDirectory({directory:'test',resolveDirectory:v=>v,platform:'win32',backups:{status:async()=>{}},launch:()=>{const child=new EventEmitter();queueMicrotask(()=>child.emit('error',Error('launch failed')));return child;}}),/launch failed/);
});
