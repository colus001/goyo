import { join } from 'node:path';
import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  SyncQueueItem,
} from '@writer/core';
import { APP_NAME } from '@writer/shared';
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import type { AppSettings } from '../shared/app-settings';
import type { AppUiState } from '../shared/app-ui-state';
import { createDesktopLocalStore } from './document-metadata-store';
import {
  pullRemoteDocumentSnapshots,
  pullRemoteDocumentUpdates,
  pushPendingDocumentSnapshots,
  pushPendingDocumentUpdates,
} from './remote-sync';

const isDevelopment = !app.isPackaged;

function configureUserDataPath() {
  if (!isDevelopment) {
    return;
  }

  app.setPath('userData', join(app.getPath('appData'), `${APP_NAME} Dev`));
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: IPC registration is kept centralized around one local store instance.
function registerDocumentIpc() {
  const store = createDesktopLocalStore(app.getPath('userData'));

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
  ipcMain.handle('documents:saveMetadata', (_event, document: DocumentMetadata) => {
    try {
      store.saveDocument(document);
    } catch (error) {
      console.error('Failed to save document metadata', getErrorMessage(error));
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
  ipcMain.handle('documentSnapshots:save', (_event, snapshot: DocumentSnapshotRecord) => {
    try {
      store.saveDocumentSnapshot(snapshot);
    } catch (error) {
      console.error('Failed to save document snapshot', getErrorMessage(error));
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
      return await pushPendingDocumentUpdates(store);
    } catch (error) {
      console.error('Failed to push pending document updates', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('sync:pushPendingSnapshots', async () => {
    try {
      return await pushPendingDocumentSnapshots(store);
    } catch (error) {
      console.error('Failed to push pending document snapshots', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('sync:pullRemoteUpdates', async () => {
    try {
      return await pullRemoteDocumentUpdates(store);
    } catch (error) {
      console.error('Failed to pull remote document updates', getErrorMessage(error));
      throw error;
    }
  });
  ipcMain.handle('sync:pullRemoteSnapshots', async () => {
    try {
      return await pullRemoteDocumentSnapshots(store);
    } catch (error) {
      console.error('Failed to pull remote document snapshots', getErrorMessage(error));
      throw error;
    }
  });
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
