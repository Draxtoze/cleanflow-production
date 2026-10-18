import { BACKUP_VERSION, validateBackup } from './business.js';
import { APP_VERSION, SCHEMA_VERSION, validatePreferences } from './preferences.js';
export function createBackup(data,exportedAt=new Date().toISOString()) {
 const backup={app:'CleanFlow',version:BACKUP_VERSION,appVersion:APP_VERSION,schemaVersion:SCHEMA_VERSION,exportedAt,data:structuredClone(data)};
 validateBackup(backup);
 return backup;
}
export async function readBackup(value) {
 if(value?.automatic?.manager==='CleanFlow-daily-v1'&&value.backup){
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value.backup)));
  if(Array.from(new Uint8Array(hash),byte=>byte.toString(16).padStart(2,'0')).join('')!==value.automatic.checksum)throw Error('backups.invalid');
  value=value.backup;
 }
 validateBackup(value);
 const preferences=value.data.settings.find(item=>item.id==='preferences');
 if(preferences)validatePreferences(preferences);
 return structuredClone(value.data);
}
