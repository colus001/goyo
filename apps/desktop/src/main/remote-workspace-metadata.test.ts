import type { DocumentMetadata, DocumentUpdateRecord } from '@writer/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesktopLocalStore } from './document-metadata-store';
import { synchronizeRemoteDocuments } from './remote-sync';

const earlier = '2026-11-24T01:00:00.000Z';
const later = '2026-11-24T02:00:00.000Z';
const firstEpisode: DocumentMetadata = {
  archivedAt: null,
  bookId: 'book',
  chapterId: null,
  createdAt: earlier,
  id: 'existing',
  kind: 'episode',
  order: 0,
  title: 'Existing episode',
  updatedAt: earlier,
};

describe('desktop cloud workspace sync', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('imports a mobile-created episode before pulling its body and updates the chapter of an existing episode', async () => {
    const moved = { ...firstEpisode, chapterId: 'chapter', updatedAt: later };
    const created = { ...moved, id: 'mobile-new', order: 1, title: 'Mobile episode' };
    const newerLocal = { ...firstEpisode, id: 'local', title: 'Local edits', updatedAt: later };
    const { store, documents, updates } = createStore([firstEpisode, newerLocal]);
    mockCloud([moved, created, { ...firstEpisode, id: newerLocal.id }]);

    const result = await synchronizeRemoteDocuments(store, {
      clientId: 'desktop',
      enabled: true,
      serverUrl: 'https://sync.example.com',
      token: 'token',
    });

    expect(documents.get(created.id)).toEqual(created);
    expect(documents.get(moved.id)).toEqual(moved);
    expect(documents.get(newerLocal.id)).toEqual(newerLocal);
    expect(updates).toMatchObject([{ clientId: 'mobile', documentId: created.id }]);
    expect(result.updatePull.pulledUpdateCount).toBe(1);
  });
});

function createStore(initial: DocumentMetadata[]) {
  const documents = new Map(initial.map((item) => [item.id, item]));
  const updates: DocumentUpdateRecord[] = [];
  const listDocuments = () => [...documents.values()];
  const store = {
    appendDocumentUpdate: (update: DocumentUpdateRecord) => updates.push(update),
    listAllBooks: () => [],
    listAllChapters: () => [],
    listAllDocuments: listDocuments,
    listAllDocumentSnapshots: () => [],
    listAllDocumentUpdates: () => updates,
    listAllSyncItems: () => [],
    listDocumentUpdates: (documentId: string) =>
      updates.filter((update) => update.documentId === documentId),
    listDocuments,
    listPendingSyncItems: () => [],
    saveBook: vi.fn(),
    saveChapter: vi.fn(),
    saveDocument: (document: DocumentMetadata) => documents.set(document.id, document),
  } as unknown as DesktopLocalStore;
  return { documents, store, updates };
}

function mockCloud(documents: DocumentMetadata[]) {
  vi.stubGlobal('fetch', async (input: string) => {
    const path = new URL(input).pathname;
    if (path === '/v1/books') return Response.json({ books: [] });
    if (path === '/v1/chapters') return Response.json({ chapters: [] });
    if (path === '/v1/documents') return Response.json({ documents });
    if (path.endsWith('/updates')) {
      const documentId = path.split('/')[3];
      return Response.json({
        documentId,
        updates:
          documentId === 'mobile-new'
            ? [{ clientId: 'mobile', createdAt: later, id: 'update', updateBase64: 'AA==' }]
            : [],
      });
    }
    return Response.json({ ok: true, snapshot: null });
  });
}
