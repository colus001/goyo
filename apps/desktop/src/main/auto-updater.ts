import { app, BrowserWindow, ipcMain } from 'electron';
import electronUpdater from 'electron-updater';

const { autoUpdater } = electronUpdater;

const UPDATE_CHECK_DELAY_MS = 10_000;
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'no-update'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  updateVersion: string | null;
  downloadProgress: number;
  lastError: string | null;
}

let updateState: UpdateState = {
  status: 'idle',
  updateVersion: null,
  downloadProgress: 0,
  lastError: null,
};
let shouldInstallAfterDownload = false;

export function registerAutoUpdaterIpc() {
  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      setUpdateState({
        ...updateState,
        status: 'error',
        updateVersion: updateState.updateVersion,
        lastError: getErrorMessage(error),
      });
      sendStatusToRenderer();
    }
  });

  ipcMain.handle('updater:downloadUpdate', async () => {
    if (updateState.status === 'downloading' || updateState.status === 'downloaded') {
      return;
    }

    try {
      shouldInstallAfterDownload = true;
      setUpdateState({
        ...updateState,
        status: 'downloading',
        downloadProgress: 0,
        lastError: null,
      });
      sendStatusToRenderer();
      await autoUpdater.downloadUpdate();
    } catch (error) {
      shouldInstallAfterDownload = false;
      setUpdateState({
        ...updateState,
        status: 'error',
        lastError: getErrorMessage(error),
      });
      sendStatusToRenderer();
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    autoUpdater.quitAndInstall();
  });

  ipcMain.handle('updater:getStatus', (): UpdateState => updateState);
}

export function initAutoUpdater() {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://goyo-api.seokjun.kim/releases',
  });

  registerAutoUpdaterEvents();

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_DELAY_MS);

  setInterval(() => {
    void autoUpdater.checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_INTERVAL_MS);
}

function registerAutoUpdaterEvents() {
  autoUpdater.on('checking-for-update', () => {
    setUpdateState({
      status: 'checking',
      updateVersion: null,
      downloadProgress: 0,
      lastError: null,
    });
    sendStatusToRenderer();
  });

  autoUpdater.on('update-available', onUpdateAvailable);

  autoUpdater.on('update-not-available', () => {
    setUpdateState({
      status: 'no-update',
      updateVersion: null,
      downloadProgress: 0,
      lastError: null,
    });
    sendStatusToRenderer();
  });

  autoUpdater.on('download-progress', onDownloadProgress);

  autoUpdater.on('update-downloaded', (info) => {
    setUpdateState({
      status: 'downloaded',
      updateVersion: info.version,
      downloadProgress: 100,
      lastError: null,
    });
    sendStatusToRenderer();

    if (shouldInstallAfterDownload) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on('error', (error) => {
    shouldInstallAfterDownload = false;
    setUpdateState({
      ...updateState,
      status: 'error',
      lastError: error.message,
    });
    sendStatusToRenderer();
  });
}

function onUpdateAvailable(info: { version: string }) {
  setUpdateState({
    status: 'available',
    updateVersion: info.version,
    downloadProgress: 0,
    lastError: null,
  });
  sendStatusToRenderer();
}

function onDownloadProgress(progress: { percent: number }) {
  setUpdateState({
    status: 'downloading',
    updateVersion: updateState.updateVersion,
    downloadProgress: progress.percent,
    lastError: null,
  });
  sendStatusToRenderer();
}

function setUpdateState(partial: UpdateState) {
  updateState = partial;
}

function sendStatusToRenderer() {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:statusChange', updateState);
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}
