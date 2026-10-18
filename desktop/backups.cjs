const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const ownedName=/^CleanFlow-auto-backup-(\d{4}-\d{2}-\d{2})\.json$/;
const digest=backup=>crypto.createHash('sha256').update(JSON.stringify(backup)).digest('hex');
const dayOf=date=>{const d=new Date(date);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function createBackupService({directory,validate,now=()=>new Date(),io=fs}) {
 let queue=Promise.resolve();
 const safeDirectory=async()=>{await io.mkdir(directory,{recursive:true});const stat=await io.lstat(directory);if(!stat.isDirectory()||stat.isSymbolicLink())throw Error('backups.unsafe');};
 async function readManaged(name) {
  const match=ownedName.exec(name);if(!match)return null;
  try {
   const target=path.join(directory,name),stat=await io.lstat(target);if(!stat.isFile()||stat.isSymbolicLink())return null;
   const value=JSON.parse(await io.readFile(target,'utf8'));
   if(value.automatic?.manager!=='CleanFlow-daily-v1'||value.automatic.day!==match[1]||value.automatic.checksum!==digest(value.backup))return null;
   validate(value.backup);
   return {name,day:match[1],createdAt:value.automatic.createdAt,backup:value.backup};
  }catch{return null;}
 }
 async function list(){await safeDirectory();const items=await Promise.all((await io.readdir(directory)).map(readManaged));return items.filter(Boolean).sort((a,b)=>b.day.localeCompare(a.day));}
 async function prune(retention){for(const old of (await list()).slice(retention)){if(await readManaged(old.name))await io.unlink(path.join(directory,old.name));}}
 async function status(){const files=await list();return {today:dayOf(now()),lastSuccess:files[0]?.createdAt||null,count:files.length,createdToday:files.some(item=>item.day===dayOf(now()))};}
 async function create(backup,retention=31) {
  const task=async()=>{
   if(!Number.isInteger(retention)||retention<1||retention>365)throw Error('backups.retentionInvalid');
   validate(backup);await safeDirectory();const day=dayOf(now()),name=`CleanFlow-auto-backup-${day}.json`,target=path.join(directory,name);
   // Existing valid daily files are immutable. Unknown/corrupt files are not overwritten.
   if(await readManaged(name)){await prune(retention);return {...await status(),created:false};}
   const envelope={automatic:{manager:'CleanFlow-daily-v1',day,createdAt:new Date(now()).toISOString(),checksum:digest(backup)},backup};
   const temp=path.join(directory,`.pending-${crypto.randomUUID()}.tmp`);
   try {
    const handle=await io.open(temp,'wx',0o600);
    try {await handle.writeFile(JSON.stringify(envelope,null,2),'utf8');await handle.sync();}finally{await handle.close();}
    const check=JSON.parse(await io.readFile(temp,'utf8'));validate(check.backup);
    if(check.automatic.checksum!==digest(check.backup))throw Error('backups.invalid');
    // Atomic, exclusive finalization: unlike rename, link never overwrites a collision.
    await io.link(temp,target);
   } finally {await io.unlink(temp).catch(()=>{});}
   await prune(retention);
   return {...await status(),created:true};
  };
  const result=queue.then(task);queue=result.catch(()=>{});return result;
 }
 return {create,status,list,directory};
}
module.exports={createBackupService,dayOf};
