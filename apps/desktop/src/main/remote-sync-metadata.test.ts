import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentUpdateRecord,
  SyncQueueItem,
} from '@writer/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesktopLocalStore } from './document-metadata-store';
import { pushPendingDocumentUpdates } from './remote-sync';

describe('remote workspace metadata push', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pushes book and chapter metadata before document metadata', async () => {
    const requests: Array<{ body: unknown; method: string | undefined; url: string }> = [];
    vi.stubGlobal('fetch', vi.fn(createFetchRecorder(requests)));

    const result = await pushPendingDocumentUpdates(createPushStore(), {
      clientId: 'client_desktop',
      enabled: true,
      serverUrl: 'https://sync.example.com',
      token: 'token_1',
    });

    expect(result).toEqual({ pushedUpdateCount: 1, skippedUpdateCount: 0 });
    expect(
      requests
        .filter((request) => request.method === 'PUT')
        .map((request) => new URL(request.url).pathname),
    ).toEqual([
      '/v1/sync/clients/client_desktop',
      '/v1/books/book_1',
      '/v1/chapters/chapter_1',
      '/v1/sync/clients/client_desktop',
      '/v1/documents/doc_1',
      '/v1/sync/clients/client_1',
    ]);
    expect(
      requests.find((request) => request.url.endsWith('/v1/books/book_1'))?.body,
    ).toMatchObject({ title: 'Book' });
    expect(
      requests.find((request) => request.url.endsWith('/v1/chapters/chapter_1'))?.body,
    ).toMatchObject({ bookId: 'book_1', title: 'Chapter' });
  });
});

function createFetchRecorder(
  requests: Array<{ body: unknown; method: string | undefined; url: string }>,
) {
  return async (input: unknown, init?: RequestInit) => {
    requests.push({
      body: init?.body ? JSON.parse(String(init.body)) : null,
      method: init?.method,
      url: String(input),
    });

    return Response.json({ ok: true });
  };
}

function createPushStore(): DesktopLocalStore {
  const update = createUpdate();
  const queueItem = createQueueItem(update.id);

  return {
    listAllBooks: () => [createBook()],
    listAllChapters: () => [createChapter()],
    listAllDocuments: () => [createDocument()],
    listAllDocumentSnapshots: () => [],
    listAllDocumentUpdates: () => [update],
    listAllSyncItems: () => [queueItem],
    listDocumentUpdates: () => [update],
    listPendingSyncItems: () => [queueItem],
    markSyncItemAttempted: () => undefined,
    markSyncItemCompleted: () => undefined,
  } as unknown as DesktopLocalStore;
}

function createBook(): BookMetadata {
  return {
    accentColor: '#a6534b',
    archivedAt: null,
    createdAt: '2026-06-12T08:00:00.000Z',
    id: 'book_1',
    title: 'Book',
    updatedAt: '2026-06-12T10:00:00.000Z',
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
    updatedAt: '2026-06-12T10:00:00.000Z',
  };
}

function createDocument(): DocumentMetadata {
  return {
    archivedAt: null,
    bookId: 'book_1',
    chapterId: 'chapter_1',
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
