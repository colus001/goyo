import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  RecoveryPoint,
  SyncQueueItem,
} from '@writer/core';
import type { AppSettings } from '../shared/app-settings';
import type { AppUiState } from '../shared/app-ui-state';

type RestoreCloudProgressPhase =
  | 'books'
  | 'chapters'
  | 'documents'
  | 'sync-clients'
  | 'document-updates'
  | 'document-snapshots';

interface RestoreCloudProgress {
  completed: number;
  current: number;
  phase: RestoreCloudProgressPhase;
  total: number;
}

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
      syncCredentials: {
        hasToken: () => Promise<boolean>;
        saveToken: (token: string) => Promise<void>;
      };
      syncClient: {
        getId: () => Promise<string>;
      };
      goyoCloud: {
        authStart: (email: string) => Promise<{ ok: boolean; error?: string }>;
        authStartBrowser: () => Promise<{ ok: boolean }>;
        authVerify: (input: {
          email: string;
          code: string;
        }) => Promise<{ ok: boolean; error?: string; user?: { email: string; id: string } }>;
        getStatus: () => Promise<{
          account: { email: string; id: string } | null;
          error?: string;
          hasSession: boolean;
          status: 'expired' | 'signed-in' | 'signed-out' | 'unable-to-connect';
        }>;
        getConfig: () => Promise<{
          apiUrl: string;
          deepLinkProtocolCommand: { args: string[]; executable: string } | null;
          deepLinkProtocolRegistered: boolean;
          deepLinkProtocolScheme: string;
          userDataPath: string;
          webUrl: string;
        } | null>;
        logout: () => Promise<{ ok: boolean }>;
        onDeepLinkToken: (
          callback: (data: { email: string | null; userId: string | null }) => void,
        ) => () => void;
        openAccount: () => Promise<{ ok: boolean }>;
      };
      backup: {
        exportLocalData: () => Promise<{
          exported: boolean;
          filePath: string | null;
        }>;
      };
      dev: {
        isDevelopment: () => Promise<boolean>;
        resetLocalData: () => Promise<void>;
      };
      version: {
        getVersion: () => Promise<string>;
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
        listArchived: () => Promise<DocumentMetadata[]>;
        restoreArchived: (documentId: string, restoredAt: string) => Promise<void>;
        saveMetadata: (document: DocumentMetadata) => Promise<void>;
      };
      documentUpdates: {
        append: (update: DocumentUpdateRecord) => Promise<void>;
        list: (documentId: string) => Promise<DocumentUpdateRecord[]>;
        listAfter: (documentId: string, updateId: string) => Promise<DocumentUpdateRecord[]>;
      };
      documentSnapshots: {
        get: (snapshotId: string) => Promise<DocumentSnapshotRecord | null>;
        getLatest: (documentId: string) => Promise<DocumentSnapshotRecord | null>;
        list: (documentId: string) => Promise<DocumentSnapshotRecord[]>;
        save: (snapshot: DocumentSnapshotRecord) => Promise<void>;
      };
      documentExport: {
        save: (input: {
          content: string;
          format: 'html' | 'markdown' | 'text';
          title: string;
        }) => Promise<{
          exported: boolean;
          filePath: string | null;
        }>;
      };
      recoveryPoints: {
        get: (recoveryPointId: string) => Promise<RecoveryPoint | null>;
        list: (documentId: string) => Promise<RecoveryPoint[]>;
        save: (point: RecoveryPoint) => Promise<void>;
      };
      syncQueue: {
        enqueue: (item: SyncQueueItem) => Promise<void>;
        listPending: () => Promise<SyncQueueItem[]>;
        markCompleted: (syncItemId: string, completedAt: string) => Promise<void>;
      };
      sync: {
        getStatusSummary: () => Promise<{
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
        }>;
        run: () => Promise<{
          snapshotPull: { pulledSnapshotCount: number; skippedDocumentCount: number };
          snapshotPush: { pushedSnapshotCount: number; skippedSnapshotCount: number };
          updatePull: { pulledUpdateCount: number; skippedDocumentCount: number };
          updatePush: { pushedUpdateCount: number; skippedUpdateCount: number };
        }>;
        retryNow: () => Promise<{
          snapshotPull: { pulledSnapshotCount: number; skippedDocumentCount: number };
          snapshotPush: { pushedSnapshotCount: number; skippedSnapshotCount: number };
          updatePull: { pulledUpdateCount: number; skippedDocumentCount: number };
          updatePush: { pushedUpdateCount: number; skippedUpdateCount: number };
        }>;
        restoreCloudFromLocal: () => Promise<{
          booksPushed: number;
          chaptersPushed: number;
          documentsPushed: number;
          snapshotsPushed: number;
          syncClientsRegistered: number;
          updatesPushed: number;
        }>;
        onRestoreCloudProgress: (callback: (progress: RestoreCloudProgress) => void) => () => void;
        testConnection: () => Promise<{ ok: boolean }>;
      };
      updater: {
        checkForUpdates: () => Promise<void>;
        downloadUpdate: () => Promise<void>;
        getStatus: () => Promise<{
          status: string;
          updateVersion: string | null;
          downloadProgress: number;
          lastError: string | null;
        }>;
        onStatusChange: (
          callback: (state: {
            status: string;
            updateVersion: string | null;
            downloadProgress: number;
            lastError: string | null;
          }) => void,
        ) => () => void;
        quitAndInstall: () => Promise<void>;
      };
      platform: string;
    };
  }
}
