import type { DocumentId } from '@writer/shared';
import type { DocumentMetadata } from './documents';
import type { DocumentUpdateRecord, SyncQueueItem } from './sync';

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
  getDocumentMetadata(documentId: DocumentId): Promise<DocumentMetadata | null>;
  listDocumentMetadata(): Promise<DocumentMetadata[]>;
  saveDocumentMetadata(document: DocumentMetadata): Promise<void>;
  appendDocumentUpdate(update: DocumentUpdateRecord): Promise<void>;
  listDocumentUpdates(documentId: DocumentId): Promise<DocumentUpdateRecord[]>;
  saveDocumentSnapshot(snapshot: DocumentSnapshotRecord): Promise<void>;
  getLatestDocumentSnapshot(documentId: DocumentId): Promise<DocumentSnapshotRecord | null>;
  enqueueSyncItem(item: SyncQueueItem): Promise<void>;
  listPendingSyncItems(): Promise<SyncQueueItem[]>;
  markSyncItemCompleted(syncItemId: string, completedAt: string): Promise<void>;
}
