// Only the packaged Windows application contacts the public release feed.
// No renderer IPC, credentials, database migration or storage changes are needed.
function startWindowsUpdates({ app, window, dialog, updater, translate, platform = process.platform, logger = console }) {
  if (platform !== 'win32' || !app.isPackaged) return false;
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = false;
  updater.allowPrerelease = false;
  updater.allowDowngrade = false;
  let prompted = false;
  let failed = false;
  const alive = () => !window.isDestroyed();
  updater.on('error', () => {
    failed = true;
    // Offline startup must never prevent normal app use or expose raw network errors.
    logger.warn('CleanFlow: update unavailable; continuing normally.');
  });
  updater.on('update-downloaded', async info => {
    if (prompted || failed || !alive()) return;
    prompted = true;
    try {
      const language = await window.webContents.executeJavaScript("localStorage.getItem('cleanflow-language') === 'en' ? 'en' : 'pl'");
      if (!alive()) return;
      const t = key => translate(language, key, { version: info.version });
      const { response } = await dialog.showMessageBox(window, {
        type: 'info', title: t('updates.title'), message: t('updates.ready'),
        detail: t('updates.detail'), buttons: [t('updates.install'), t('updates.later')],
        defaultId: 1, cancelId: 1, noLink: true
      });
      // Never install on close, dismissal, download failure or without explicit approval.
      if (response === 0 && alive() && !failed) updater.quitAndInstall(false, true);
    } catch {
      logger.warn('CleanFlow: update postponed.');
    }
  });
  try {
    Promise.resolve(updater.checkForUpdates()).catch(() => {
      logger.warn('CleanFlow: update check unavailable; continuing normally.');
    });
  } catch {
    logger.warn('CleanFlow: update check unavailable; continuing normally.');
  }
  return true;
}
module.exports = { startWindowsUpdates };
