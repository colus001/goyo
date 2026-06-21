import { Buffer } from 'node:buffer';
import type {
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  SyncQueueItem,
} from '@writer/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesktopLocalStore } from './document-metadata-store';
import {
  ensureLocalRecordsQueuedForRemoteSync,
  pullRemoteDocumentUpdates,
  pushPendingDocumentUpdates,
} from './remote-sync';

type FailureAttempt = {
  attemptedAt: string;
  failure?: {
    lastEndpoint: string | null;
    lastError: string | null;
    lastHttpStatus: number | null;
  };
  syncItemId: string;
};

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

describe('remote document update pull', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the full remote update list so older remote edits are not skipped', async () => {
    const appendedUpdates: DocumentUpdateRecord[] = [];
    const fetchMock = stubRemoteUpdateFetch([
      {
        clientId: 'client_web',
        createdAt: '2026-06-12T09:59:00.000Z',
        id: 'update_remote_older_than_local',
        updateBase64: Buffer.from([2]).toString('base64'),
      },
    ]);

    const result = await pullRemoteDocumentUpdates(createPullStore({ appendedUpdates }), {
      clientId: 'client_desktop',
      enabled: true,
      serverUrl: 'https://sync.example.com',
      token: 'token_1',
    });

    expect(result).toEqual({ pulledUpdateCount: 1, skippedDocumentCount: 0 });
    const updateListRequest = fetchMock.mock.calls.find(([, init]) => init?.method === 'GET');
    expect(updateListRequest).toBeDefined();
    expect(String(updateListRequest?.[0])).toBe(
      'https://sync.example.com/v1/documents/doc_1/updates',
    );
    expect(appendedUpdates).toEqual([
      expect.objectContaining({
        clientId: 'client_web',
        documentId: 'doc_1',
        id: 'update_remote_older_than_local',
      }),
    ]);
  });

  it('does not count or append remote updates that already exist locally', async () => {
    const appendedUpdates: DocumentUpdateRecord[] = [];
    stubRemoteUpdateFetch([
      {
        clientId: 'client_desktop',
        createdAt: '2026-06-12T10:00:00.000Z',
        id: 'update_local_newer_than_remote',
        updateBase64: Buffer.from([1]).toString('base64'),
      },
    ]);

    const result = await pullRemoteDocumentUpdates(createPullStore({ appendedUpdates }), {
      clientId: 'client_desktop',
      enabled: true,
      serverUrl: 'https://sync.example.com',
      token: 'token_1',
    });

    expect(result).toEqual({ pulledUpdateCount: 0, skippedDocumentCount: 0 });
    expect(appendedUpdates).toEqual([]);
  });
});

describe('remote document update push diagnostics', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('records HTTP status, endpoint, and server message when a queued update fails', async () => {
    const attempts: FailureAttempt[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: unknown, init?: RequestInit) => {
        const url = String(input);

        if (init?.method === 'PUT' && url.endsWith('/v1/sync/clients/client_desktop')) {
          return Response.json({ ok: true });
        }

        if (init?.method === 'PUT' && url.endsWith('/v1/documents/doc_1')) {
          return Response.json({ error: 'Document metadata rejected.' }, { status: 409 });
        }

        throw new Error(`Unexpected request: ${url}`);
      }),
    );

    const result = await pushPendingDocumentUpdates(createPushStore({ attempts }), {
      clientId: 'client_desktop',
      enabled: true,
      serverUrl: 'https://sync.example.com',
      token: 'token_1',
    });

    expect(result).toEqual({ pushedUpdateCount: 0, skippedUpdateCount: 1 });
    expect(attempts).toEqual([
      expect.objectContaining({
        failure: {
          lastEndpoint: '/v1/documents/doc_1',
          lastError: 'Document metadata rejected.',
          lastHttpStatus: 409,
        },
        syncItemId: 'sync_update_a',
      }),
    ]);
  });
});

function stubRemoteUpdateFetch(
  updates: Array<{ clientId: string; createdAt: string; id: string; updateBase64: string }>,
) {
  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);

    if (init?.method === 'PUT' && url.endsWith('/v1/sync/clients/client_desktop')) {
      return Response.json({ ok: true });
    }

    if (init?.method === 'GET' && url.endsWith('/v1/documents/doc_1/updates')) {
      return Response.json({ documentId: 'doc_1', updates });
    }

    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

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

function createPullStore({
  appendedUpdates,
}: {
  appendedUpdates: DocumentUpdateRecord[];
}): DesktopLocalStore {
  return {
    appendDocumentUpdate: (update: DocumentUpdateRecord) => appendedUpdates.push(update),
    listDocumentUpdates: () => [
      {
        clientId: 'client_desktop',
        createdAt: '2026-06-12T10:00:00.000Z',
        documentId: 'doc_1',
        id: 'update_local_newer_than_remote',
        update: new Uint8Array([1]),
      },
    ],
    listDocuments: () => [createDocument()],
  } as unknown as DesktopLocalStore;
}

function createPushStore({ attempts }: { attempts: FailureAttempt[] }): DesktopLocalStore {
  const update = createUpdate('update_a');
  const queueItem = createQueueItem('sync_update_a', 'document-update', update.id);

  return {
    listAllDocuments: () => [createDocument()],
    listAllDocumentSnapshots: () => [],
    listAllDocumentUpdates: () => [update],
    listAllSyncItems: () => [queueItem],
    listDocumentUpdates: () => [update],
    listPendingSyncItems: () => [queueItem],
    markSyncItemAttempted: (
      syncItemId: string,
      attemptedAt: string,
      failure: FailureAttempt['failure'],
    ) => {
      attempts.push({ attemptedAt, failure, syncItemId });
    },
  } as unknown as DesktopLocalStore;
}

function createDocument(): DocumentMetadata {
  return {
    archivedAt: null,
    bookId: 'book_1',
    chapterId: null,
    createdAt: '2026-06-12T09:00:00.000Z',
    id: 'doc_1',
    kind: 'episode',
    order: 0,
    title: 'Document',
    updatedAt: '2026-06-12T10:00:00.000Z',
  };
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
