import { describe, expect, it } from 'vitest';
import { createSyncQueueItem, sortSyncQueueItemsForProcessing } from './sync';

describe('sync queue records', () => {
  it('creates a pending sync queue item for a local record', () => {
    expect(
      createSyncQueueItem({
        createdAt: '2026-06-12T10:00:00.000Z',
        documentId: 'doc_1',
        id: 'sync_1',
        kind: 'document-update',
        recordId: 'update_1',
      }),
    ).toEqual({
      attempts: 0,
      createdAt: '2026-06-12T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'sync_1',
      kind: 'document-update',
      lastAttemptAt: null,
      recordId: 'update_1',
    });
  });

  it('sorts pending queue items by creation time and id', () => {
    const first = createSyncQueueItem({
      createdAt: '2026-06-12T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'sync_a',
      kind: 'document-update',
      recordId: 'update_1',
    });
    const second = createSyncQueueItem({
      createdAt: '2026-06-12T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'sync_b',
      kind: 'document-update',
      recordId: 'update_2',
    });
    const third = createSyncQueueItem({
      createdAt: '2026-06-12T10:01:00.000Z',
      documentId: 'doc_1',
      id: 'sync_0',
      kind: 'document-snapshot',
      recordId: 'snapshot_1',
    });

    expect(sortSyncQueueItemsForProcessing([third, second, first])).toEqual([first, second, third]);
  });
});
