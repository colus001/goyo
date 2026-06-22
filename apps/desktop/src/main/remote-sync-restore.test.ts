import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  SyncQueueItem,
} from '@writer/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesktopLocalStore } from './document-metadata-store';
import { pushPendingDocumentUpdates, restoreCloudFromLocal } from './remote-sync';

describe('remote workspace repair', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('pushes document metadata during normal sync', async () => {
    const requestedEndpoints = stubSuccessfulRemoteSync();

    const result = await pushPendingDocumentUpdates(createPushStore(), createConnection());

    expect(result).toEqual({ pushedUpdateCount: 1, skippedUpdateCount: 0 });
    expect(requestedEndpoints).toContain('PUT /v1/documents/doc_1');
  });
});

describe('remote cloud restore', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restores cloud from local records regardless of completed sync queue entries', async () => {
    const requestedEndpoints = stubSuccessfulRemoteSync();
    const progressEvents: Array<{ completed: number; phase: string; total: number }> = [];

    const result = await restoreCloudFromLocal(
      createRestoreStore(),
      createConnection(),
      (progress) => progressEvents.push(progress),
    );

    expect(result).toEqual({
      booksPushed: 1,
      chaptersPushed: 1,
      documentsPushed: 1,
      snapshotsPushed: 1,
      syncClientsRegistered: 2,
      updatesPushed: 1,
    });
    expect(requestedEndpoints).toEqual([
      'PUT /v1/books/book_1',
      'PUT /v1/chapters/chapter_1',
      'PUT /v1/documents/doc_1',
      'PUT /v1/sync/clients/client_desktop',
      'PUT /v1/sync/clients/client_1',
      'POST /v1/documents/doc_1/updates',
      'POST /v1/documents/doc_1/snapshots',
    ]);
    expect(progressEvents.map((event) => event.phase)).toEqual([
      'books',
      'chapters',
      'documents',
      'sync-clients',
      'sync-clients',
      'document-updates',
      'document-snapshots',
    ]);
    expect(progressEvents.at(-1)).toEqual({
      completed: 6,
      current: 1,
      phase: 'document-snapshots',
      total: 7,
    });
  });
});

function stubSuccessfulRemoteSync(): string[] {
  const requestedEndpoints: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown, init?: RequestInit) => {
      requestedEndpoints.push(`${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`);
      return Response.json({ ok: true });
    }),
  );

  return requestedEndpoints;
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

function createRestoreStore(): DesktopLocalStore {
  return {
    listAllBooks: () => [createBook()],
    listAllChapters: () => [createChapter()],
    listAllDocuments: () => [createDocument()],
    listAllDocumentSnapshots: () => [createSnapshot('snapshot_a')],
    listAllDocumentUpdates: () => [createUpdate('update_a')],
    listAllSyncItems: () => [
      createQueueItem('sync_completed_update_a', 'document-update', 'update_a'),
      createQueueItem('sync_completed_snapshot_a', 'document-snapshot', 'snapshot_a'),
    ],
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
    createdAt: '2026-06-12T10:00:00.000Z',
    documentId: 'doc_1',
    id,
    kind,
    lastAttemptAt: '2026-06-12T10:10:00.000Z',
    recordId,
  };
}
