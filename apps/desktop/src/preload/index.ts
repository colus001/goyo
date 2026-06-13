import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  RecoveryPoint,
  SyncQueueItem,
} from '@writer/core';
import { contextBridge, ipcRenderer } from 'electron';
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
      }>,
    pushPendingUpdates: () =>
      ipcRenderer.invoke('sync:pushPendingUpdates') as Promise<{
        pushedUpdateCount: number;
        skippedUpdateCount: number;
      }>,
    pushPendingSnapshots: () =>
      ipcRenderer.invoke('sync:pushPendingSnapshots') as Promise<{
        pushedSnapshotCount: number;
        skippedSnapshotCount: number;
      }>,
    pullRemoteUpdates: () =>
      ipcRenderer.invoke('sync:pullRemoteUpdates') as Promise<{
        pulledUpdateCount: number;
        skippedDocumentCount: number;
      }>,
    pullRemoteSnapshots: () =>
      ipcRenderer.invoke('sync:pullRemoteSnapshots') as Promise<{
        pulledSnapshotCount: number;
        skippedDocumentCount: number;
      }>,
    retryNow: () =>
      ipcRenderer.invoke('sync:retryNow') as Promise<{
        snapshotPull: { pulledSnapshotCount: number; skippedDocumentCount: number };
        snapshotPush: { pushedSnapshotCount: number; skippedSnapshotCount: number };
        updatePull: { pulledUpdateCount: number; skippedDocumentCount: number };
        updatePush: { pushedUpdateCount: number; skippedUpdateCount: number };
      }>,
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
