import type { DocumentId, SyncClientId } from '@writer/shared';

export interface DocumentUpdateRecord {
  id: string;
  documentId: DocumentId;
  clientId: SyncClientId;
  update: Uint8Array;
  createdAt: string;
}

export type SyncQueueItemKind = 'document-update' | 'document-snapshot' | 'document-metadata';

export interface SyncQueueItem {
  id: string;
  documentId: DocumentId;
  kind: SyncQueueItemKind;
  recordId: string;
  createdAt: string;
  attempts: number;
  lastAttemptAt: string | null;
}

export interface CreateSyncQueueItemInput {
  createdAt: string;
  documentId: DocumentId;
  id: string;
  kind: SyncQueueItemKind;
  recordId: string;
}

export function createSyncQueueItem(input: CreateSyncQueueItemInput): SyncQueueItem {
  return {
    attempts: 0,
    createdAt: input.createdAt,
    documentId: input.documentId,
    id: input.id,
    kind: input.kind,
    lastAttemptAt: null,
    recordId: input.recordId,
  };
}

export function sortSyncQueueItemsForProcessing(items: SyncQueueItem[]): SyncQueueItem[] {
  return [...items].sort((first, second) => {
    const createdAtOrder = first.createdAt.localeCompare(second.createdAt);

    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    return first.id.localeCompare(second.id);
  });
}

export interface SyncState {
  clientId: SyncClientId;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  pendingItemCount: number;
}
