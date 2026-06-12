import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  SyncQueueItem,
} from '@writer/core';
import type { AppSettings } from '../shared/app-settings';
import type { AppUiState } from '../shared/app-ui-state';

declare global {
  interface Window {
    writerDesktop: {
      appUiState: {
        get: () => Promise<AppUiState | null>;
        save: (state: AppUiState) => Promise<void>;
      };
      appSettings: {
        get: () => Promise<AppSettings>;
        save: (settings: AppSettings) => Promise<void>;
      };
      books: {
        list: () => Promise<BookMetadata[]>;
        saveMetadata: (book: BookMetadata) => Promise<void>;
      };
      chapters: {
        list: () => Promise<ChapterMetadata[]>;
        saveMetadata: (chapter: ChapterMetadata) => Promise<void>;
      };
      documents: {
        list: () => Promise<DocumentMetadata[]>;
        saveMetadata: (document: DocumentMetadata) => Promise<void>;
      };
      documentUpdates: {
        append: (update: DocumentUpdateRecord) => Promise<void>;
        list: (documentId: string) => Promise<DocumentUpdateRecord[]>;
        listAfter: (documentId: string, updateId: string) => Promise<DocumentUpdateRecord[]>;
      };
      documentSnapshots: {
        getLatest: (documentId: string) => Promise<DocumentSnapshotRecord | null>;
        save: (snapshot: DocumentSnapshotRecord) => Promise<void>;
      };
      syncQueue: {
        enqueue: (item: SyncQueueItem) => Promise<void>;
        listPending: () => Promise<SyncQueueItem[]>;
        markCompleted: (syncItemId: string, completedAt: string) => Promise<void>;
      };
      sync: {
        pullRemoteUpdates: () => Promise<{
          pulledUpdateCount: number;
          skippedDocumentCount: number;
        }>;
        pullRemoteSnapshots: () => Promise<{
          pulledSnapshotCount: number;
          skippedDocumentCount: number;
        }>;
        pushPendingSnapshots: () => Promise<{
          pushedSnapshotCount: number;
          skippedSnapshotCount: number;
        }>;
        pushPendingUpdates: () => Promise<{
          pushedUpdateCount: number;
          skippedUpdateCount: number;
        }>;
      };
      platform: string;
    };
  }
}
