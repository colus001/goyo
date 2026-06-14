// biome-ignore lint/nursery/noExcessiveLinesPerFile: IPC and native lifecycle are centralized around one Electron app instance until this module is split by concern.
import { rmSync } from 'node:fs';
import { basename, join } from 'node:path';
import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  RecoveryPoint,
  SyncQueueItem,
} from '@writer/core';
import { APP_NAME } from '@writer/shared';
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import type { AppSettings } from '../shared/app-settings';
import type { AppUiState } from '../shared/app-ui-state';
import { exportDocument } from './document-export';
import { createDesktopLocalStore } from './document-metadata-store';
import { cloudAuthLogout, cloudAuthStart, cloudAuthVerify } from './goyo-cloud-auth-client';
import { createGoyoCloudSessionStore } from './goyo-cloud-session';
import { exportLocalBackup } from './local-backup';
import {
  getSyncStatusSummary,
  pullRemoteDocumentSnapshots,
  pullRemoteDocumentUpdates,
  pushPendingDocumentSnapshots,
  pushPendingDocumentUpdates,
  retryRemoteSyncNow,
  type SyncConnectionSettings,
  testSyncConnection,
} from './remote-sync';
import { createSyncClientIdentityStore } from './sync-client-identity';
import { createSyncCredentialsStore } from './sync-credentials';

const isDevelopment = !app.isPackaged;
const GOYO_CLOUD_SYNC_URL = 'https://goyo-api.seokjun.kim';

function configureUserDataPath() {
  if (!isDevelopment) {
    return;
  }

  app.setPath('userData', join(app.getPath('appData'), `${APP_NAME} Dev`));
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: IPC registration is kept centralized around one local store instance.
function registerDocumentIpc() {
  const userDataPath = app.getPath('userData');
  const store = createDesktopLocalStore(userDataPath);
  const syncClientIdentity = createSyncClientIdentityStore(userDataPath);
  const syncCredentials = createSyncCredentialsStore(userDataPath);
  const goyoCloudSession = createGoyoCloudSessionStore(userDataPath);
  const getSyncConnection = (): SyncConnectionSettings => {
    const syncSettings = store.getAppSettings().sync;
    const token =
      syncSettings.provider === 'goyo-cloud'
        ? goyoCloudSession.getSessionToken()
        : syncCredentials.getToken();

    return {
      clientId: syncClientIdentity.getOrCreateClientId(),
      enabled: syncSettings.enabled && syncSettings.provider !== 'local',
      serverUrl:
        syncSettings.provider === 'goyo-cloud' ? GOYO_CLOUD_SYNC_URL : syncSettings.selfHostedUrl,
      token,
    };
  };

  ipcMain.handle('appUiState:get', () => store.getAppUiState());
  ipcMain.handle('appUiState:save', (_event, state: AppUiState) => {
    try {
      store.saveAppUiState(state);
    } catch (error) {
      console.error('Failed to save app UI state', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('appSettings:get', () => store.getAppSettings());
  ipcMain.handle('appSettings:save', (_event, settings: AppSettings) => {
    try {
      store.saveAppSettings(settings);
    } catch (error) {
      console.error('Failed to save app settings', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('syncCredentials:hasToken', () => syncCredentials.getToken() !== null);
  ipcMain.handle('syncCredentials:saveToken', (_event, token: string) => {
    try {
      syncCredentials.saveToken(token);
    } catch (error) {
      console.error('Failed to save sync credentials', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('syncClient:getId', () => syncClientIdentity.getOrCreateClientId());
  ipcMain.handle('goyoCloud:authStart', async (_event, email: string) => {
    try {
      return await cloudAuthStart(email);
    } catch (error) {
      console.error('Failed to start Goyo Cloud auth', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('goyoCloud:authVerify', async (_event, input: { email: string; code: string }) => {
    try {
      const clientId = syncClientIdentity.getOrCreateClientId();
      const result = await cloudAuthVerify({ clientId, code: input.code, email: input.email });

      if (result.ok && result.token) {
        goyoCloudSession.saveSessionToken(result.token);
        if (result.user) goyoCloudSession.saveAccount(result.user);
      }

      return { ok: result.ok, error: result.error, user: result.user };
    } catch (error) {
      console.error('Failed to verify Goyo Cloud auth', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('goyoCloud:getStatus', () => {
    const token = goyoCloudSession.getSessionToken();
    const account = goyoCloudSession.getAccount();

    return { account, hasSession: !!token };
  });
  ipcMain.handle('goyoCloud:logout', async () => {
    try {
      const token = goyoCloudSession.getSessionToken();

      if (token) {
        await cloudAuthLogout(token);
      }
    } catch {
      // logout is best-effort; clear local state regardless
    }

    goyoCloudSession.saveSessionToken('');
    return { ok: true };
  });
  ipcMain.handle('backup:exportLocalData', async () => {
    try {
      return await exportLocalBackup(store);
    } catch (error) {
      console.error('Failed to export local backup', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('documentExport:save', async (_event, input) => {
    try {
      return await exportDocument(input);
    } catch (error) {
      console.error('Failed to export document', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('dev:isDevelopment', () => isDevelopment);
  ipcMain.handle('app:getVersion', () => app.getVersion());
  ipcMain.handle('dev:resetLocalData', () => {
    if (!isDevelopment) {
      throw new Error('Local data reset is only available in development.');
    }

    try {
      resetDevelopmentUserData(store);
    } catch (error) {
      console.error('Failed to reset local development data', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('books:list', () => store.listBooks());
  ipcMain.handle('books:saveMetadata', (_event, book: BookMetadata) => {
    try {
      store.saveBook(book);
    } catch (error) {
      console.error('Failed to save book metadata', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('chapters:list', () => store.listChapters());
  ipcMain.handle('chapters:saveMetadata', (_event, chapter: ChapterMetadata) => {
    try {
      store.saveChapter(chapter);
    } catch (error) {
      console.error('Failed to save chapter metadata', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('documents:list', () => store.listDocuments());
  ipcMain.handle('documents:listArchived', () => store.listArchivedDocuments());
  ipcMain.handle('documents:saveMetadata', (_event, document: DocumentMetadata) => {
    try {
      store.saveDocument(document);
    } catch (error) {
      console.error('Failed to save document metadata', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('documents:restoreArchived', (_event, documentId: string, restoredAt: string) => {
    try {
      store.restoreArchivedDocument(documentId, restoredAt);
    } catch (error) {
      console.error('Failed to restore archived document', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('documentUpdates:list', (_event, documentId: string) =>
    store.listDocumentUpdates(documentId),
  );
  ipcMain.handle('documentUpdates:listAfter', (_event, documentId: string, updateId: string) =>
    store.listDocumentUpdatesAfter(documentId, updateId),
  );
  ipcMain.handle('documentUpdates:append', (_event, update) => {
    try {
      store.appendDocumentUpdate(update);
    } catch (error) {
      console.error('Failed to append document update', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('documentSnapshots:getLatest', (_event, documentId: string) =>
    store.getLatestDocumentSnapshot(documentId),
  );
  ipcMain.handle('documentSnapshots:get', (_event, snapshotId: string) =>
    store.getDocumentSnapshot(snapshotId),
  );
  ipcMain.handle('documentSnapshots:list', (_event, documentId: string) =>
    store.listDocumentSnapshots(documentId),
  );
  ipcMain.handle('documentSnapshots:save', (_event, snapshot: DocumentSnapshotRecord) => {
    try {
      store.saveDocumentSnapshot(snapshot);
    } catch (error) {
      console.error('Failed to save document snapshot', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('recoveryPoints:list', (_event, documentId: string) =>
    store.listRecoveryPoints(documentId),
  );
  ipcMain.handle('recoveryPoints:get', (_event, recoveryPointId: string) =>
    store.getRecoveryPoint(recoveryPointId),
  );
  ipcMain.handle('recoveryPoints:save', (_event, point: RecoveryPoint) => {
    try {
      store.saveRecoveryPoint(point);
    } catch (error) {
      console.error('Failed to save recovery point', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('syncQueue:listPending', () => store.listPendingSyncItems());
  ipcMain.handle('syncQueue:enqueue', (_event, item: SyncQueueItem) => {
    try {
      store.enqueueSyncItem(item);
    } catch (error) {
      console.error('Failed to enqueue sync item', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('syncQueue:markCompleted', (_event, syncItemId: string, completedAt: string) => {
    try {
      store.markSyncItemCompleted(syncItemId, completedAt);
    } catch (error) {
      console.error('Failed to mark sync item completed', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('sync:pushPendingUpdates', async () => {
    try {
      return await pushPendingDocumentUpdates(store, getSyncConnection());
    } catch (error) {
      console.error('Failed to push pending document updates', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('sync:pushPendingSnapshots', async () => {
    try {
      return await pushPendingDocumentSnapshots(store, getSyncConnection());
    } catch (error) {
      console.error('Failed to push pending document snapshots', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('sync:pullRemoteUpdates', async () => {
    try {
      return await pullRemoteDocumentUpdates(store, getSyncConnection());
    } catch (error) {
      console.error('Failed to pull remote document updates', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('sync:pullRemoteSnapshots', async () => {
    try {
      return await pullRemoteDocumentSnapshots(store, getSyncConnection());
    } catch (error) {
      console.error('Failed to pull remote document snapshots', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('sync:getStatusSummary', () => getSyncStatusSummary(store));
  ipcMain.handle('sync:testConnection', async () => {
    try {
      return await testSyncConnection(getSyncConnection());
    } catch {
      return { ok: false };
    }
  });
  ipcMain.handle('sync:retryNow', async () => {
    try {
      return await retryRemoteSyncNow(store, getSyncConnection());
    } catch (error) {
      console.error('Failed to retry remote sync', getErrorMessage(error));
      throw error;
    }
  });
}

function resetDevelopmentUserData(store: ReturnType<typeof createDesktopLocalStore>) {
  const userDataPath = app.getPath('userData');
  const expectedDirectoryName = `${APP_NAME} Dev`;

  if (basename(userDataPath) !== expectedDirectoryName) {
    throw new Error(`Refusing to reset unexpected userData path: ${userDataPath}`);
  }

  store.close();
  rmSync(userDataPath, { force: true, recursive: true });
  app.exit(0);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    icon: join(__dirname, '../../../../assets/logo.png'),
    title: APP_NAME,
    ...(process.platform === 'darwin'
      ? {
          titleBarStyle: 'hiddenInset' as const,
          trafficLightPosition: { x: 16, y: 16 },
        }
      : {}),
    backgroundColor: '#f4efe6',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
    return;
  }

  void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
}

configureUserDataPath();

void app.whenReady().then(() => {
  app.setName(APP_NAME);
  registerDocumentIpc();
  createApplicationMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
