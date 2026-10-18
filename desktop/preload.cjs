const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('cleanflowDesktop',{
 info:()=>ipcRenderer.invoke('cleanflow:info'),
 backupStatus:()=>ipcRenderer.invoke('cleanflow:backup-status'),
 createBackup:backup=>ipcRenderer.invoke('cleanflow:backup-create',backup),
 openBackupFolder:()=>ipcRenderer.invoke('cleanflow:backup-folder'),
 seedDemoBackups:backup=>ipcRenderer.invoke('cleanflow:demo-backups',backup)
});
