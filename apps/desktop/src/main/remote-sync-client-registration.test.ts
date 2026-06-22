import type { DocumentMetadata, DocumentUpdateRecord, SyncQueueItem } from '@writer/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesktopLocalStore } from './document-metadata-store';
import { pushPendingDocumentUpdates } from './remote-sync';

describe('remote document update author client registration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('registers the update author client before uploading an old queued update', async () => {
    const completedItems: Array<{ completedAt: string; syncItemId: string }> = [];
    const fetchMock = stubSuccessfulPushFetch();

    const result = await pushPendingDocumentUpdates(createPushStore({ completedItems }), {
      clientId: 'client_desktop',
      enabled: true,
      serverUrl: 'https://sync.example.com',
      token: 'token_1',
    });

    expect(result).toEqual({ pushedUpdateCount: 1, skippedUpdateCount: 0 });
    expect(completedItems).toEqual([expect.objectContaining({ syncItemId: 'sync_update_a' })]);
    expect(fetchMock.mock.calls.map(([input]) => String(input))).toEqual([
      'https://sync.example.com/v1/sync/clients/client_desktop',
      'https://sync.example.com/v1/documents/doc_1',
      'https://sync.example.com/v1/sync/clients/client_1',
      'https://sync.example.com/v1/documents/doc_1/updates',
    ]);
  });
});

function stubSuccessfulPushFetch() {
  const fetchMock = vi.fn(async (input: unknown, init?: RequestInit) => {
    const url = String(input);

    if (init?.method === 'PUT' && url.includes('/v1/sync/clients/')) {
      return Response.json({ ok: true });
    }

    if (init?.method === 'PUT' && url.endsWith('/v1/documents/doc_1')) {
      return Response.json({ ok: true });
    }

    if (init?.method === 'POST' && url.endsWith('/v1/documents/doc_1/updates')) {
      return Response.json({ ok: true }, { status: 201 });
    }

    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

function createPushStore({
  completedItems,
}: {
  completedItems: Array<{ completedAt: string; syncItemId: string }>;
}): DesktopLocalStore {
  const update = createUpdate();
  const queueItem = createQueueItem(update.id);

  return {
    listAllBooks: () => [],
    listAllChapters: () => [],
    listAllDocuments: () => [createDocument()],
    listAllDocumentSnapshots: () => [],
    listAllDocumentUpdates: () => [update],
    listAllSyncItems: () => [queueItem],
    listDocumentUpdates: () => [update],
    listPendingSyncItems: () => [queueItem],
    markSyncItemCompleted: (syncItemId: string, completedAt: string) => {
      completedItems.push({ completedAt, syncItemId });
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

function createUpdate(): DocumentUpdateRecord {
  return {
    clientId: 'client_1',
    createdAt: '2026-06-12T10:00:00.000Z',
    documentId: 'doc_1',
    id: 'update_a',
    update: new Uint8Array([1]),
  };
}

function createQueueItem(recordId: string): SyncQueueItem {
  return {
    attempts: 0,
    createdAt: '2026-06-12T10:00:00.000Z',
    documentId: 'doc_1',
    id: 'sync_update_a',
    kind: 'document-update',
    lastAttemptAt: null,
    recordId,
  };
}
