import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  RecoveryPoint,
  SyncQueueItem,
} from '@writer/core';
import { contextBridge, type IpcRendererEvent, ipcRenderer } from 'electron';
import type { AppSettings } from '../shared/app-settings';
import type { AppUiState } from '../shared/app-ui-state';

const desktopApi = {
  appUiState: {
    get: () => ipcRenderer.invoke('appUiState:get') as Promise<AppUiState | null>,
    save: (state: AppUiState) => ipcRenderer.invoke('appUiState:save', state) as Promise<void>,
  },
  appSettings: {
    get: () => ipcRenderer.invoke('appSettings:get') as Promise<AppSettings>,
    save: (settings: AppSettings) =>
      ipcRenderer.invoke('appSettings:save', settings) as Promise<void>,
  },
  syncCredentials: {
    hasToken: () => ipcRenderer.invoke('syncCredentials:hasToken') as Promise<boolean>,
    saveToken: (token: string) =>
      ipcRenderer.invoke('syncCredentials:saveToken', token) as Promise<void>,
  },
  syncClient: {
    getId: () => ipcRenderer.invoke('syncClient:getId') as Promise<string>,
  },
  goyoCloud: {
    authStart: (email: string) =>
      ipcRenderer.invoke('goyoCloud:authStart', email) as Promise<{
        ok: boolean;
        error?: string;
      }>,
    authStartBrowser: () =>
      ipcRenderer.invoke('goyoCloud:authStartBrowser') as Promise<{ ok: boolean }>,
    authVerify: (input: { email: string; code: string }) =>
      ipcRenderer.invoke('goyoCloud:authVerify', input) as Promise<{
        ok: boolean;
        error?: string;
        user?: { email: string; id: string };
      }>,
    getStatus: () =>
      ipcRenderer.invoke('goyoCloud:getStatus') as Promise<{
        account: { email: string; id: string } | null;
        error?: string;
        hasSession: boolean;
        status: 'expired' | 'signed-in' | 'signed-out' | 'unable-to-connect';
      }>,
    getConfig: () =>
      ipcRenderer.invoke('goyoCloud:getConfig') as Promise<{
        apiUrl: string;
        deepLinkProtocolCommand: { args: string[]; executable: string } | null;
        deepLinkProtocolRegistered: boolean;
        deepLinkProtocolScheme: string;
        userDataPath: string;
        webUrl: string;
      } | null>,
    logout: () => ipcRenderer.invoke('goyoCloud:logout') as Promise<{ ok: boolean }>,
    onDeepLinkToken: (
      callback: (data: { email: string | null; userId: string | null }) => void,
    ) => {
      const listener = (
        _event: IpcRendererEvent,
        data: { email: string | null; userId: string | null },
      ) => {
        callback(data);
      };
      ipcRenderer.on('goyoCloud:deepLinkToken', listener);
      return () => {
        ipcRenderer.removeListener('goyoCloud:deepLinkToken', listener);
      };
    },
    openAccount: () => ipcRenderer.invoke('goyoCloud:openAccount') as Promise<{ ok: boolean }>,
  },
  backup: {
    exportLocalData: () =>
      ipcRenderer.invoke('backup:exportLocalData') as Promise<{
        exported: boolean;
        filePath: string | null;
      }>,
  },
  dev: {
    isDevelopment: () => ipcRenderer.invoke('dev:isDevelopment') as Promise<boolean>,
    resetLocalData: () => ipcRenderer.invoke('dev:resetLocalData') as Promise<void>,
  },
  version: {
    getVersion: () => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  },
  books: {
    list: () => ipcRenderer.invoke('books:list') as Promise<BookMetadata[]>,
    saveMetadata: (book: BookMetadata) =>
      ipcRenderer.invoke('books:saveMetadata', book) as Promise<void>,
  },
  chapters: {
    list: () => ipcRenderer.invoke('chapters:list') as Promise<ChapterMetadata[]>,
    saveMetadata: (chapter: ChapterMetadata) =>
      ipcRenderer.invoke('chapters:saveMetadata', chapter) as Promise<void>,
  },
  documents: {
    list: () => ipcRenderer.invoke('documents:list') as Promise<DocumentMetadata[]>,
    listArchived: () => ipcRenderer.invoke('documents:listArchived') as Promise<DocumentMetadata[]>,
    restoreArchived: (documentId: string, restoredAt: string) =>
      ipcRenderer.invoke('documents:restoreArchived', documentId, restoredAt) as Promise<void>,
    saveMetadata: (document: DocumentMetadata) =>
      ipcRenderer.invoke('documents:saveMetadata', document) as Promise<void>,
  },
  documentUpdates: {
    append: (update: DocumentUpdateRecord) =>
      ipcRenderer.invoke('documentUpdates:append', update) as Promise<void>,
    list: (documentId: string) =>
      ipcRenderer.invoke('documentUpdates:list', documentId) as Promise<DocumentUpdateRecord[]>,
    listAfter: (documentId: string, updateId: string) =>
      ipcRenderer.invoke('documentUpdates:listAfter', documentId, updateId) as Promise<
        DocumentUpdateRecord[]
      >,
  },
  documentSnapshots: {
    get: (snapshotId: string) =>
      ipcRenderer.invoke(
        'documentSnapshots:get',
        snapshotId,
      ) as Promise<DocumentSnapshotRecord | null>,
    getLatest: (documentId: string) =>
      ipcRenderer.invoke(
        'documentSnapshots:getLatest',
        documentId,
      ) as Promise<DocumentSnapshotRecord | null>,
    save: (snapshot: DocumentSnapshotRecord) =>
      ipcRenderer.invoke('documentSnapshots:save', snapshot) as Promise<void>,
    list: (documentId: string) =>
      ipcRenderer.invoke('documentSnapshots:list', documentId) as Promise<DocumentSnapshotRecord[]>,
  },
  documentExport: {
    save: (input: { content: string; format: 'html' | 'markdown' | 'text'; title: string }) =>
      ipcRenderer.invoke('documentExport:save', input) as Promise<{
        exported: boolean;
        filePath: string | null;
      }>,
  },
  recoveryPoints: {
    get: (recoveryPointId: string) =>
      ipcRenderer.invoke('recoveryPoints:get', recoveryPointId) as Promise<RecoveryPoint | null>,
    list: (documentId: string) =>
      ipcRenderer.invoke('recoveryPoints:list', documentId) as Promise<RecoveryPoint[]>,
    save: (point: RecoveryPoint) =>
      ipcRenderer.invoke('recoveryPoints:save', point) as Promise<void>,
  },
  syncQueue: {
    enqueue: (item: SyncQueueItem) =>
      ipcRenderer.invoke('syncQueue:enqueue', item) as Promise<void>,
    listPending: () => ipcRenderer.invoke('syncQueue:listPending') as Promise<SyncQueueItem[]>,
    markCompleted: (syncItemId: string, completedAt: string) =>
      ipcRenderer.invoke('syncQueue:markCompleted', syncItemId, completedAt) as Promise<void>,
  },
  sync: {
    getStatusSummary: () =>
      ipcRenderer.invoke('sync:getStatusSummary') as Promise<{
        failedItemCount: number;
        needsAttention: boolean;
        oldestFailedAt: string | null;
        pendingItemCount: number;
        recentFailures: Array<{
          attempts: number;
          documentId: string;
          id: string;
          kind: string;
          lastAttemptAt: string | null;
          lastEndpoint: string | null;
          lastError: string | null;
          lastHttpStatus: number | null;
          recordId: string;
        }>;
      }>,
    run: () =>
      ipcRenderer.invoke('sync:run') as Promise<{
        snapshotPull: { pulledSnapshotCount: number; skippedDocumentCount: number };
        snapshotPush: { pushedSnapshotCount: number; skippedSnapshotCount: number };
        updatePull: { pulledUpdateCount: number; skippedDocumentCount: number };
        updatePush: { pushedUpdateCount: number; skippedUpdateCount: number };
      }>,
    retryNow: () =>
      ipcRenderer.invoke('sync:retryNow') as Promise<{
        snapshotPull: { pulledSnapshotCount: number; skippedDocumentCount: number };
        snapshotPush: { pushedSnapshotCount: number; skippedSnapshotCount: number };
        updatePull: { pulledUpdateCount: number; skippedDocumentCount: number };
        updatePush: { pushedUpdateCount: number; skippedUpdateCount: number };
      }>,
    restoreCloudFromLocal: () =>
      ipcRenderer.invoke('sync:restoreCloudFromLocal') as Promise<{
        booksPushed: number;
        chaptersPushed: number;
        documentsPushed: number;
        snapshotsPushed: number;
        syncClientsRegistered: number;
        updatesPushed: number;
      }>,
    onRestoreCloudProgress: (
      callback: (progress: {
        completed: number;
        current: number;
        phase:
          | 'books'
          | 'chapters'
          | 'documents'
          | 'sync-clients'
          | 'document-updates'
          | 'document-snapshots';
        total: number;
      }) => void,
    ) => {
      const listener = (
        _event: IpcRendererEvent,
        progress: {
          completed: number;
          current: number;
          phase:
            | 'books'
            | 'chapters'
            | 'documents'
            | 'sync-clients'
            | 'document-updates'
            | 'document-snapshots';
          total: number;
        },
      ) => {
        callback(progress);
      };
      ipcRenderer.on('sync:restoreCloudProgress', listener);
      return () => {
        ipcRenderer.removeListener('sync:restoreCloudProgress', listener);
      };
    },
    testConnection: () => ipcRenderer.invoke('sync:testConnection') as Promise<{ ok: boolean }>,
  },
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates') as Promise<void>,
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate') as Promise<void>,
    getStatus: () =>
      ipcRenderer.invoke('updater:getStatus') as Promise<{
        status: string;
        updateVersion: string | null;
        downloadProgress: number;
        lastError: string | null;
      }>,
    quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall') as Promise<void>,
    onStatusChange: (
      callback: (state: {
        status: string;
        updateVersion: string | null;
        downloadProgress: number;
        lastError: string | null;
      }) => void,
    ) => {
      const listener = (
        _event: IpcRendererEvent,
        state: {
          status: string;
          updateVersion: string | null;
          downloadProgress: number;
          lastError: string | null;
        },
      ) => {
        callback(state);
      };
      ipcRenderer.on('updater:statusChange', listener);
      return () => {
        ipcRenderer.removeListener('updater:statusChange', listener);
      };
    },
  },
  platform: process.platform,
} as const;

contextBridge.exposeInMainWorld('writerDesktop', desktopApi);

export type WriterDesktopApi = typeof desktopApi;

declare global {
  interface Window {
    writerDesktop: WriterDesktopApi;
  }
}
