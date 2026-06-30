import type { DocumentMetadata, DocumentSnapshotRecord, DocumentUpdateRecord } from '@writer/core';
import {
  base64ToBytes,
  fetchLatestRemoteDocumentSnapshot,
  fetchRemoteBooks,
  fetchRemoteChapters,
  fetchRemoteDocuments,
  fetchRemoteDocumentUpdates,
  isRemoteSnapshotNewer,
  pushRemoteBookMetadata,
  pushRemoteChapterMetadata,
  pushRemoteDocumentMetadata,
  pushRemoteDocumentSnapshot,
  pushRemoteDocumentUpdate,
  registerRemoteSyncClient,
} from '@writer/shared';
import { GOYO_CLOUD_API_URL } from '../config/mobile-cloud-api';
import type { MobileLocalStore } from '../storage/mobile-local-store';

export interface MobileSyncResult {
  pulledBooks: number;
  pulledChapters: number;
  pulledDocuments: number;
  pulledSnapshots: number;
  pulledUpdates: number;
  pushedItems: number;
  skippedItems: number;
}

export async function syncMobileWorkspace({
  clientId,
  store,
  token,
}: {
  clientId: string;
  store: MobileLocalStore;
  token: string;
}): Promise<MobileSyncResult> {
  const connection: MobileSyncConnection = {
    clientId,
    enabled: true,
    serverUrl: GOYO_CLOUD_API_URL,
    token,
  };

  await registerRemoteSyncClient(connection, clientId, {
    lastSeenAt: new Date().toISOString(),
    name: 'Goyo Mobile',
    platform: 'ios',
  });
  const metadataPull = await pullMobileWorkspaceMetadata(store, connection);
  await pushMobileWorkspaceMetadata(store, connection);

  const push = await pushPendingMobileSyncItems(store, connection);
  const pull = await pullMobileDocumentContent(store, connection);

  return {
    pulledBooks: metadataPull.pulledBooks,
    pulledChapters: metadataPull.pulledChapters,
    pulledDocuments: metadataPull.pulledDocuments,
    pulledSnapshots: pull.pulledSnapshots,
    pulledUpdates: pull.pulledUpdates,
    pushedItems: push.pushedItems,
    skippedItems: push.skippedItems,
  };
}

async function pullMobileWorkspaceMetadata(
  store: MobileLocalStore,
  connection: MobileSyncConnection,
) {
  const [localBooks, localChapters, localDocuments] = await Promise.all([
    store.listBooks(),
    store.listChapters(),
    store.listDocuments(),
  ]);
  const localBooksById = new Map(localBooks.map((book) => [book.id, book]));
  const localChaptersById = new Map(localChapters.map((chapter) => [chapter.id, chapter]));
  const localDocumentsById = new Map(localDocuments.map((document) => [document.id, document]));
  const [remoteBooks, remoteChapters, remoteDocuments] = await Promise.all([
    fetchRemoteBooks(connection),
    fetchRemoteChapters(connection),
    fetchRemoteDocuments(connection),
  ]);
  let pulledBooks = 0;
  let pulledChapters = 0;
  let pulledDocuments = 0;

  for (const book of remoteBooks.books) {
    if (shouldSaveRemoteMetadata(book, localBooksById.get(book.id))) {
      await store.saveBook(book);
      pulledBooks += 1;
    }
  }

  for (const chapter of remoteChapters.chapters) {
    if (shouldSaveRemoteMetadata(chapter, localChaptersById.get(chapter.id))) {
      await store.saveChapter(chapter);
      pulledChapters += 1;
    }
  }

  for (const document of remoteDocuments.documents) {
    if (!isDocumentKind(document.kind)) {
      continue;
    }

    if (shouldSaveRemoteMetadata(document, localDocumentsById.get(document.id))) {
      await store.saveDocument({ ...document, kind: document.kind });
      pulledDocuments += 1;
    }
  }

  return { pulledBooks, pulledChapters, pulledDocuments };
}

async function pushMobileWorkspaceMetadata(
  store: MobileLocalStore,
  connection: MobileSyncConnection,
) {
  const [books, chapters, documents] = await Promise.all([
    store.listBooks(),
    store.listChapters(),
    store.listDocuments(),
  ]);

  for (const book of books) {
    await pushRemoteBookMetadata(connection, book);
  }

  for (const chapter of chapters) {
    await pushRemoteChapterMetadata(connection, chapter);
  }

  for (const document of documents) {
    await pushRemoteDocumentMetadata(connection, document);
  }
}

async function pushPendingMobileSyncItems(
  store: MobileLocalStore,
  connection: MobileSyncConnection,
) {
  const pendingItems = await store.listPendingSyncItems();
  let pushedItems = 0;
  let skippedItems = 0;

  for (const item of pendingItems) {
    try {
      if (item.kind === 'document-metadata') {
        skippedItems += 1;
        continue;
      }

      const record = await getPendingSyncRecord(store, item.documentId, item.kind, item.recordId);

      if (!record) {
        skippedItems += 1;
        continue;
      }

      if (item.kind === 'document-update') {
        await pushRemoteDocumentUpdate(connection, record as DocumentUpdateRecord);
      } else {
        await pushRemoteDocumentSnapshot(connection, record as DocumentSnapshotRecord);
      }

      await store.markSyncItemCompleted(item.id, new Date().toISOString());
      pushedItems += 1;
    } catch {
      await store.markSyncItemAttempted(item.id, new Date().toISOString());
      skippedItems += 1;
    }
  }

  return { pushedItems, skippedItems };
}

async function getPendingSyncRecord(
  store: MobileLocalStore,
  documentId: string,
  kind: 'document-snapshot' | 'document-update',
  recordId: string,
) {
  if (kind === 'document-snapshot') {
    return store.getDocumentSnapshot(recordId);
  }

  return (await store.listDocumentUpdates(documentId)).find((update) => update.id === recordId);
}

async function pullMobileDocumentContent(
  store: MobileLocalStore,
  connection: MobileSyncConnection,
) {
  const documents = await store.listDocuments();
  let pulledSnapshots = 0;
  let pulledUpdates = 0;

  for (const document of documents) {
    pulledSnapshots += await pullLatestSnapshot(store, connection, document);
    pulledUpdates += await pullDocumentUpdates(store, connection, document);
  }

  return { pulledSnapshots, pulledUpdates };
}

function shouldSaveRemoteMetadata<TMetadata extends { updatedAt: string }>(
  remote: TMetadata,
  local: TMetadata | undefined,
) {
  return !local || remote.updatedAt.localeCompare(local.updatedAt) > 0;
}

function isDocumentKind(kind: string): kind is DocumentMetadata['kind'] {
  return kind === 'draft' || kind === 'episode' || kind === 'note';
}

async function pullLatestSnapshot(
  store: MobileLocalStore,
  connection: MobileSyncConnection,
  document: DocumentMetadata,
) {
  const remoteSnapshot = await fetchLatestRemoteDocumentSnapshot(connection, document.id);

  if (!remoteSnapshot.snapshot) {
    return 0;
  }

  const localSnapshot = await store.getLatestDocumentSnapshot(document.id);

  if (localSnapshot && !isRemoteSnapshotNewer(remoteSnapshot.snapshot, localSnapshot)) {
    return 0;
  }

  await store.saveDocumentSnapshot({
    createdAt: remoteSnapshot.snapshot.createdAt,
    documentId: remoteSnapshot.documentId,
    id: remoteSnapshot.snapshot.id,
    lastUpdateId: remoteSnapshot.snapshot.lastUpdateId,
    snapshot: base64ToBytes(remoteSnapshot.snapshot.snapshotBase64),
  });

  return 1;
}

async function pullDocumentUpdates(
  store: MobileLocalStore,
  connection: MobileSyncConnection,
  document: DocumentMetadata,
) {
  const localUpdateIds = new Set(
    (await store.listDocumentUpdates(document.id)).map((update) => update.id),
  );
  const remoteUpdates = await fetchRemoteDocumentUpdates(connection, document.id, null);
  let pulledUpdates = 0;

  for (const update of remoteUpdates.updates) {
    if (localUpdateIds.has(update.id)) {
      continue;
    }

    await store.appendDocumentUpdate({
      clientId: update.clientId,
      createdAt: update.createdAt,
      documentId: remoteUpdates.documentId,
      id: update.id,
      update: base64ToBytes(update.updateBase64),
    });
    pulledUpdates += 1;
  }

  return pulledUpdates;
}

interface MobileSyncConnection {
  clientId: string;
  enabled: true;
  serverUrl: string;
  token: string;
}
