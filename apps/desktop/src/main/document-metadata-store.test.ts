import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDocumentMetadata } from '@writer/core';
import { afterEach, describe, expect, it } from 'vitest';
import { createDesktopLocalStore } from './document-metadata-store';

const temporaryStorePaths: string[] = [];
const canRunNativeSqliteTests = canCreateDesktopLocalStore();

afterEach(() => {
  for (const path of temporaryStorePaths.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

describe.skipIf(!canRunNativeSqliteTests)('desktop local metadata store initialization', () => {
  it('starts without creating placeholder books or chapters', () => {
    const store = createTestStore();

    expect(store.listBooks()).toEqual([]);
    expect(store.listChapters()).toEqual([]);
    expect(store.listDocuments()).toEqual([]);
  });
});

describe.skipIf(!canRunNativeSqliteTests)('desktop local document snapshot store', () => {
  it('round trips the latest document snapshot as a Uint8Array', () => {
    const store = createTestStore();
    store.saveDocument(createTestDocument('doc_1'));

    store.saveDocumentSnapshot({
      createdAt: '2026-06-12T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_1',
      lastUpdateId: 'update_1',
      snapshot: new Uint8Array([1, 2, 3]),
    });
    store.saveDocumentSnapshot({
      createdAt: '2026-06-12T10:01:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_2',
      lastUpdateId: 'update_2',
      snapshot: new Uint8Array([4, 5, 6]),
    });

    const snapshot = store.getLatestDocumentSnapshot('doc_1');

    expect(snapshot).toEqual({
      createdAt: '2026-06-12T10:01:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_2',
      lastUpdateId: 'update_2',
      snapshot: new Uint8Array([4, 5, 6]),
    });
    expect(snapshot?.snapshot).toBeInstanceOf(Uint8Array);
  });

  it('ignores duplicate snapshot ids', () => {
    const store = createTestStore();
    store.saveDocument(createTestDocument('doc_1'));

    store.saveDocumentSnapshot({
      createdAt: '2026-06-12T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_1',
      lastUpdateId: 'update_1',
      snapshot: new Uint8Array([1]),
    });
    store.saveDocumentSnapshot({
      createdAt: '2026-06-12T10:01:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_1',
      lastUpdateId: 'update_2',
      snapshot: new Uint8Array([2]),
    });

    expect(store.getLatestDocumentSnapshot('doc_1')).toEqual({
      createdAt: '2026-06-12T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_1',
      lastUpdateId: 'update_1',
      snapshot: new Uint8Array([1]),
    });
  });
});

describe.skipIf(!canRunNativeSqliteTests)('desktop local sync queue store', () => {
  it('stores pending sync queue items until they are completed', () => {
    const store = createTestStore();
    store.saveDocument(createTestDocument('doc_1'));

    store.enqueueSyncItem({
      attempts: 0,
      createdAt: '2026-06-12T10:01:00.000Z',
      documentId: 'doc_1',
      id: 'sync_b',
      kind: 'document-update',
      lastAttemptAt: null,
      recordId: 'update_2',
    });
    store.enqueueSyncItem({
      attempts: 0,
      createdAt: '2026-06-12T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'sync_a',
      kind: 'document-update',
      lastAttemptAt: null,
      recordId: 'update_1',
    });

    expect(store.listPendingSyncItems()).toEqual([
      createExpectedSyncItem('sync_a', 'update_1', '2026-06-12T10:00:00.000Z'),
      createExpectedSyncItem('sync_b', 'update_2', '2026-06-12T10:01:00.000Z'),
    ]);

    store.markSyncItemCompleted('sync_a', '2026-06-12T10:02:00.000Z');

    expect(store.listPendingSyncItems()).toEqual([
      createExpectedSyncItem('sync_b', 'update_2', '2026-06-12T10:01:00.000Z'),
    ]);
  });
});

function canCreateDesktopLocalStore(): boolean {
  const path = mkdtempSync(join(tmpdir(), 'writer-store-'));

  try {
    createDesktopLocalStore(path).close();
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('NODE_MODULE_VERSION')) {
      return false;
    }

    throw error;
  } finally {
    rmSync(path, { force: true, recursive: true });
  }
}

function createTestStore() {
  const path = mkdtempSync(join(tmpdir(), 'writer-store-'));
  temporaryStorePaths.push(path);

  return createDesktopLocalStore(path);
}

function createExpectedSyncItem(id: string, recordId: string, createdAt: string) {
  return {
    attempts: 0,
    createdAt,
    documentId: 'doc_1',
    id,
    kind: 'document-update',
    lastAttemptAt: null,
    recordId,
  };
}

function createTestDocument(id: string) {
  return createDocumentMetadata({
    bookId: 'book_1',
    chapterId: 'chapter_1',
    id,
    kind: 'episode',
    now: '2026-06-12T10:00:00.000Z',
    order: 0,
  });
}
