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
  createdAt: string;
  attempts: number;
  lastAttemptAt: string | null;
}

export interface SyncState {
  clientId: SyncClientId;
  lastPulledAt: string | null;
  lastPushedAt: string | null;
  pendingItemCount: number;
}
