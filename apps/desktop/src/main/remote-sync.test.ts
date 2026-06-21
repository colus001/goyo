import type { DocumentSnapshotRecord, DocumentUpdateRecord, SyncQueueItem } from '@writer/core';
import { describe, expect, it } from 'vitest';
import type { DesktopLocalStore } from './document-metadata-store';
import { ensureLocalRecordsQueuedForRemoteSync } from './remote-sync';

describe('remote sync queue backfill', () => {
  it('queues local updates and snapshots that were created before remote sync was enabled', () => {
    const enqueuedItems: SyncQueueItem[] = [];
    const store = createBackfillStore({
      enqueuedItems,
      existingQueueItems: [
        createQueueItem('sync_existing_update_a', 'document-update', 'update_a'),
      ],
      snapshots: [createSnapshot('snapshot_a')],
      updates: [createUpdate('update_a'), createUpdate('update_b')],
    });

    expect(ensureLocalRecordsQueuedForRemoteSync(store)).toBe(2);
    expect(enqueuedItems).toEqual([
      createQueueItem('sync_recovered_document-update_update_b', 'document-update', 'update_b'),
      createQueueItem(
        'sync_recovered_document-snapshot_snapshot_a',
        'document-snapshot',
        'snapshot_a',
      ),
    ]);
  });

  it('does not requeue records that already have completed sync queue entries', () => {
    const enqueuedItems: SyncQueueItem[] = [];
    const store = createBackfillStore({
      enqueuedItems,
      existingQueueItems: [
        createQueueItem('sync_completed_update_a', 'document-update', 'update_a'),
        createQueueItem('sync_completed_snapshot_a', 'document-snapshot', 'snapshot_a'),
      ],
      snapshots: [createSnapshot('snapshot_a')],
      updates: [createUpdate('update_a')],
    });

    expect(ensureLocalRecordsQueuedForRemoteSync(store)).toBe(0);
    expect(enqueuedItems).toEqual([]);
  });
});

function createBackfillStore({
  enqueuedItems,
  existingQueueItems,
  snapshots,
  updates,
}: {
  enqueuedItems: SyncQueueItem[];
  existingQueueItems: SyncQueueItem[];
  snapshots: DocumentSnapshotRecord[];
  updates: DocumentUpdateRecord[];
}): DesktopLocalStore {
  return {
    enqueueSyncItem: (item: SyncQueueItem) => enqueuedItems.push(item),
    listAllDocumentSnapshots: () => snapshots,
    listAllDocumentUpdates: () => updates,
    listAllSyncItems: () => existingQueueItems,
  } as unknown as DesktopLocalStore;
}

function createUpdate(id: string): DocumentUpdateRecord {
  return {
    clientId: 'client_1',
    createdAt: id === 'update_a' ? '2026-06-12T10:00:00.000Z' : '2026-06-12T10:01:00.000Z',
    documentId: 'doc_1',
    id,
    update: new Uint8Array([1]),
  };
}

function createSnapshot(id: string): DocumentSnapshotRecord {
  return {
    createdAt: '2026-06-12T10:02:00.000Z',
    documentId: 'doc_1',
    id,
    lastUpdateId: 'update_b',
    snapshot: new Uint8Array([2]),
  };
}

function createQueueItem(id: string, kind: SyncQueueItem['kind'], recordId: string): SyncQueueItem {
  return {
    attempts: 0,
    createdAt:
      kind === 'document-snapshot' ? '2026-06-12T10:02:00.000Z' : createUpdate(recordId).createdAt,
    documentId: 'doc_1',
    id,
    kind,
    lastAttemptAt: null,
    recordId,
  };
}
