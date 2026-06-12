import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  SyncQueueItem,
} from '@writer/core';
import { contextBridge, ipcRenderer } from 'electron';

const desktopApi = {
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
    getLatest: (documentId: string) =>
      ipcRenderer.invoke(
        'documentSnapshots:getLatest',
        documentId,
      ) as Promise<DocumentSnapshotRecord | null>,
    save: (snapshot: DocumentSnapshotRecord) =>
      ipcRenderer.invoke('documentSnapshots:save', snapshot) as Promise<void>,
  },
  syncQueue: {
    enqueue: (item: SyncQueueItem) =>
      ipcRenderer.invoke('syncQueue:enqueue', item) as Promise<void>,
    listPending: () => ipcRenderer.invoke('syncQueue:listPending') as Promise<SyncQueueItem[]>,
    markCompleted: (syncItemId: string, completedAt: string) =>
      ipcRenderer.invoke('syncQueue:markCompleted', syncItemId, completedAt) as Promise<void>,
  },
  sync: {
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
