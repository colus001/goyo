import { Buffer } from 'node:buffer';
import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  SyncQueueItem,
} from '@writer/core';
import { createYjsCrdtAdapter, transactYjsTextUpdate } from '@writer/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesktopLocalStore } from './document-metadata-store';
import { pushPendingDocumentUpdates, restoreCloudFromLocal } from './remote-sync';

describe('remote workspace repair', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pushes document metadata during normal sync', async () => {
    const { requestedEndpoints } = stubSuccessfulRemoteSync();

    const result = await pushPendingDocumentUpdates(createPushStore(), createConnection());

    expect(result).toEqual({ pushedUpdateCount: 1, skippedUpdateCount: 0 });
    expect(requestedEndpoints).toContain('PUT /v1/documents/doc_1');
  });
});

describe('remote cloud restore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(
    'reconciles many local updates as one full-state update per document',
    expectFullReconciliation,
  );
});

async function expectFullReconciliation() {
  const { postedUpdateBodies, requestedEndpoints } = stubSuccessfulRemoteSync();
  const progressEvents: Array<{ completed: number; phase: string; total: number }> = [];
  const completedItems: string[] = [];
  const result = await restoreCloudFromLocal(
    createRestoreStore(completedItems),
    createConnection(),
    (progress) => progressEvents.push(progress),
  );

  expect(result).toEqual({
    booksPushed: 1,
    chaptersPushed: 1,
    documentsPushed: 1,
    snapshotsPushed: 1,
    syncClientsRegistered: 1,
    updatesPushed: 1,
  });
  expect(requestedEndpoints).toEqual([
    'PUT /v1/sync/clients/client_desktop',
    'GET /v1/documents/doc_1/updates',
    'GET /v1/documents/doc_1/snapshots/latest',
    'PUT /v1/books/book_1',
    'PUT /v1/chapters/chapter_1',
    'PUT /v1/documents/doc_1',
    'POST /v1/documents/doc_1/updates',
    'POST /v1/documents/doc_1/snapshots',
  ]);
  expect(completedItems).toEqual(
    expect.arrayContaining([
      'sync_update_a',
      'sync_update_b',
      'sync_snapshot_a',
      expect.stringMatching(/^sync_full_update_/),
      expect.stringMatching(/^sync_full_snapshot_/),
    ]),
  );
  expectReconciledText(postedUpdateBodies[0].updateBase64, 'Hello world');
  expect(progressEvents.map((event) => event.phase)).toEqual([
    'books',
    'chapters',
    'documents',
    'sync-clients',
    'document-updates',
    'document-snapshots',
  ]);
  expect(progressEvents.at(-1)).toEqual({
    completed: 5,
    current: 1,
    phase: 'document-snapshots',
    total: 6,
  });
}

function expectReconciledText(updateBase64: string, expectedText: string) {
  const adapter = createYjsCrdtAdapter();
  const document = adapter.createDocument('doc_1');
  adapter.applyUpdate(document, new Uint8Array(Buffer.from(updateBase64, 'base64')));
  expect(document.document.getText('content').toString()).toBe(expectedText);
}

function stubSuccessfulRemoteSync() {
  const postedUpdateBodies: Array<{ updateBase64: string }> = [];
  const requestedEndpoints: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown, init?: RequestInit) => {
      requestedEndpoints.push(`${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`);

      if (init?.method === 'GET' && String(input).endsWith('/updates')) {
        return Response.json({ documentId: 'doc_1', updates: [] });
      }

      if (init?.method === 'GET' && String(input).endsWith('/snapshots/latest')) {
        return Response.json({ documentId: 'doc_1', snapshot: null });
      }

      if (init?.method === 'POST' && String(input).endsWith('/updates')) {
        postedUpdateBodies.push(JSON.parse(String(init.body)) as { updateBase64: string });
      }

      return Response.json({ ok: true });
    }),
  );

  return { postedUpdateBodies, requestedEndpoints };
}

function createConnection() {
  return {
    clientId: 'client_desktop',
    enabled: true,
    serverUrl: 'https://sync.example.com',
    token: 'token_1',
  };
}

function createPushStore(): DesktopLocalStore {
  const update = createUpdate('update_a');
  const queueItem = createQueueItem('sync_update_a', 'document-update', update.id);

  return {
    listAllBooks: () => [],
    listAllChapters: () => [],
    listAllDocuments: () => [createDocument()],
    listAllDocumentSnapshots: () => [],
    listAllDocumentUpdates: () => [update],
    listAllSyncItems: () => [queueItem],
    listDocumentUpdates: () => [update],
    listPendingSyncItems: () => [queueItem],
    markSyncItemCompleted: () => undefined,
  } as unknown as DesktopLocalStore;
}

function createRestoreStore(completedItems: string[]): DesktopLocalStore {
  const updates = createUpdates();
  const pendingItems = [
    createQueueItem('sync_update_a', 'document-update', 'update_a'),
    createQueueItem('sync_update_b', 'document-update', 'update_b'),
    createQueueItem('sync_snapshot_a', 'document-snapshot', 'snapshot_a'),
  ];

  return {
    appendDocumentUpdate: () => undefined,
    enqueueSyncItem: () => undefined,
    getLatestDocumentSnapshot: () => createSnapshot('snapshot_a'),
    listAllBooks: () => [createBook()],
    listAllChapters: () => [createChapter()],
    listAllDocuments: () => [createDocument()],
    listAllDocumentSnapshots: () => [createSnapshot('snapshot_a')],
    listAllDocumentUpdates: () => updates,
    listAllSyncItems: () => pendingItems,
    listDocumentUpdates: () => updates,
    listDocumentUpdatesAfter: () => [updates[1]],
    listDocuments: () => [createDocument()],
    listPendingSyncItems: () => pendingItems,
    markSyncItemsCompleted: (syncItemIds: string[]) => completedItems.push(...syncItemIds),
    saveDocumentSnapshot: () => undefined,
  } as unknown as DesktopLocalStore;
}

function createBook(): BookMetadata {
  return {
    accentColor: '#aabbcc',
    archivedAt: null,
    createdAt: '2026-06-12T08:00:00.000Z',
    id: 'book_1',
    title: 'Book',
    updatedAt: '2026-06-12T08:30:00.000Z',
  };
}

function createChapter(): ChapterMetadata {
  return {
    archivedAt: null,
    bookId: 'book_1',
    createdAt: '2026-06-12T08:30:00.000Z',
    id: 'chapter_1',
    order: 0,
    title: 'Chapter',
    updatedAt: '2026-06-12T09:00:00.000Z',
  };
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
    createdAt: '2026-06-12T10:00:00.000Z',
    documentId: 'doc_1',
    id,
    update: new Uint8Array([1]),
  };
}

function createUpdates(): DocumentUpdateRecord[] {
  const adapter = createYjsCrdtAdapter();
  const document = adapter.createDocument('doc_1');
  const first = transactYjsTextUpdate(document, (text) => text.insert(0, 'Hello'));
  const second = transactYjsTextUpdate(document, (text) => text.insert(5, ' world'));

  return [
    { ...createUpdate('update_a'), update: first },
    { ...createUpdate('update_b'), createdAt: '2026-06-12T10:01:00.000Z', update: second },
  ];
}

function createSnapshot(id: string): DocumentSnapshotRecord {
  const adapter = createYjsCrdtAdapter();

  return {
    createdAt: '2026-06-12T10:02:00.000Z',
    documentId: 'doc_1',
    id,
    lastUpdateId: null,
    snapshot: adapter.encodeSnapshot(adapter.createDocument('doc_1')),
  };
}

function createQueueItem(id: string, kind: SyncQueueItem['kind'], recordId: string): SyncQueueItem {
  return {
    attempts: 0,
    createdAt: '2026-06-12T10:00:00.000Z',
    documentId: 'doc_1',
    id,
    kind,
    lastAttemptAt: '2026-06-12T10:10:00.000Z',
    recordId,
  };
}
