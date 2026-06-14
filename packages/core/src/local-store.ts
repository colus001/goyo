import type { DocumentId } from '@writer/shared';
import type { DocumentMetadata } from './documents';
import type { RecoveryPoint } from './recovery';
import type { DocumentUpdateRecord, SyncQueueItem } from './sync';

type MaybePromise<T> = Promise<T> | T;

export interface DocumentSnapshotRecord {
  id: string;
  documentId: DocumentId;
  lastUpdateId: string | null;
  snapshot: Uint8Array;
  createdAt: string;
}

export interface CreateDocumentSnapshotRecordInput {
  createdAt: string;
  documentId: DocumentId;
  id: string;
  lastUpdateId: string | null;
  snapshot: Uint8Array;
}

export function createDocumentSnapshotRecord(
  input: CreateDocumentSnapshotRecordInput,
): DocumentSnapshotRecord {
  return {
    createdAt: input.createdAt,
    documentId: input.documentId,
    id: input.id,
    lastUpdateId: input.lastUpdateId,
    snapshot: input.snapshot,
  };
}

export interface LocalDocumentStore {
  getDocumentMetadata(documentId: DocumentId): MaybePromise<DocumentMetadata | null>;
  listArchivedDocumentMetadata(): MaybePromise<DocumentMetadata[]>;
  listDocumentMetadata(): MaybePromise<DocumentMetadata[]>;
  listRecoveryPoints(documentId: DocumentId): MaybePromise<RecoveryPoint[]>;
  saveDocumentMetadata(document: DocumentMetadata): MaybePromise<void>;
  saveRecoveryPoint(point: RecoveryPoint): MaybePromise<void>;
  restoreArchivedDocumentMetadata(documentId: DocumentId, restoredAt: string): MaybePromise<void>;
  appendDocumentUpdate(update: DocumentUpdateRecord): MaybePromise<void>;
  listDocumentUpdates(documentId: DocumentId): MaybePromise<DocumentUpdateRecord[]>;
  saveDocumentSnapshot(snapshot: DocumentSnapshotRecord): MaybePromise<void>;
  getLatestDocumentSnapshot(documentId: DocumentId): MaybePromise<DocumentSnapshotRecord | null>;
  enqueueSyncItem(item: SyncQueueItem): MaybePromise<void>;
  listPendingSyncItems(): MaybePromise<SyncQueueItem[]>;
  markSyncItemCompleted(syncItemId: string, completedAt: string): MaybePromise<void>;
}
