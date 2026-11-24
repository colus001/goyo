import type { DocumentMetadata } from '@writer/core';
import {
  fetchRemoteBooks,
  fetchRemoteChapters,
  fetchRemoteDocuments,
  isRemoteSyncConnectionReady,
  type RemoteSyncConnection,
} from '@writer/shared';
import type { DesktopLocalStore } from './document-metadata-store';

export async function pullRemoteWorkspaceMetadata(
  store: DesktopLocalStore,
  connection: RemoteSyncConnection,
): Promise<void> {
  if (!isRemoteSyncConnectionReady(connection)) return;

  const [{ books }, { chapters }, { documents }] = await Promise.all([
    fetchRemoteBooks(connection),
    fetchRemoteChapters(connection),
    fetchRemoteDocuments(connection),
  ]);

  saveNewerMetadata(books, store.listAllBooks(), store.saveBook);
  saveNewerMetadata(chapters, store.listAllChapters(), store.saveChapter);
  saveNewerMetadata(
    documents.filter(isKnownDocumentKind),
    store.listAllDocuments(),
    store.saveDocument,
  );
}

function saveNewerMetadata<T extends { id: string; updatedAt: string }>(
  remote: T[],
  local: T[],
  save: (metadata: T) => void,
): void {
  const localById = new Map(local.map((item) => [item.id, item]));
  for (const item of remote) {
    const existing = localById.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) {
      save(item);
    }
  }
}

function isKnownDocumentKind(
  document: Omit<DocumentMetadata, 'kind'> & { kind: string },
): document is DocumentMetadata {
  return document.kind === 'episode' || document.kind === 'draft' || document.kind === 'note';
}
