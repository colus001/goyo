import { bytesToBase64, fetchJson } from './remote-sync-runtime';
import type {
  RemoteBookMetadata,
  RemoteBooksResponse,
  RemoteChapterMetadata,
  RemoteChaptersResponse,
  RemoteDocumentMetadata,
  RemoteDocumentSnapshotRecord,
  RemoteDocumentsResponse,
  RemoteDocumentUpdateRecord,
  RemoteDocumentUpdatesResponse,
  RemoteLatestDocumentSnapshotResponse,
  RemoteSyncClientInfo,
  RemoteSyncConnection,
} from './remote-sync-types';

export { base64ToBytes, fetchJson, RemoteSyncRequestError } from './remote-sync-runtime';

export type {
  RemoteBookMetadata,
  RemoteBooksResponse,
  RemoteChapterMetadata,
  RemoteChaptersResponse,
  RemoteDocumentMetadata,
  RemoteDocumentSnapshotRecord,
  RemoteDocumentsResponse,
  RemoteDocumentUpdateRecord,
  RemoteDocumentUpdatesResponse,
  RemoteLatestDocumentSnapshotResponse,
  RemoteSyncClientInfo,
  RemoteSyncConnection,
} from './remote-sync-types';

export async function pushRemoteDocumentMetadata(
  connection: RemoteSyncConnection,
  document: RemoteDocumentMetadata,
): Promise<void> {
  await fetchJson(connection, `/v1/documents/${encodeURIComponent(document.id)}`, {
    body: JSON.stringify({
      archivedAt: document.archivedAt,
      bookId: document.bookId,
      chapterId: document.chapterId,
      createdAt: document.createdAt,
      kind: document.kind,
      order: document.order,
      title: document.title,
      updatedAt: document.updatedAt,
    }),
    method: 'PUT',
  });
}

export async function pushRemoteBookMetadata(
  connection: RemoteSyncConnection,
  book: RemoteBookMetadata,
): Promise<void> {
  await fetchJson(connection, `/v1/books/${encodeURIComponent(book.id)}`, {
    body: JSON.stringify({
      accentColor: book.accentColor,
      archivedAt: book.archivedAt,
      createdAt: book.createdAt,
      title: book.title,
      updatedAt: book.updatedAt,
    }),
    method: 'PUT',
  });
}

export async function pushRemoteChapterMetadata(
  connection: RemoteSyncConnection,
  chapter: RemoteChapterMetadata,
): Promise<void> {
  await fetchJson(connection, `/v1/chapters/${encodeURIComponent(chapter.id)}`, {
    body: JSON.stringify({
      archivedAt: chapter.archivedAt,
      bookId: chapter.bookId,
      createdAt: chapter.createdAt,
      order: chapter.order,
      title: chapter.title,
      updatedAt: chapter.updatedAt,
    }),
    method: 'PUT',
  });
}

export async function pushRemoteDocumentUpdate(
  connection: RemoteSyncConnection,
  update: RemoteDocumentUpdateRecord,
): Promise<void> {
  await fetchJson(connection, `/v1/documents/${encodeURIComponent(update.documentId)}/updates`, {
    body: JSON.stringify({
      clientId: update.clientId,
      createdAt: update.createdAt,
      id: update.id,
      updateBase64: bytesToBase64(update.update),
    }),
    method: 'POST',
  });
}

export async function pushRemoteDocumentSnapshot(
  connection: RemoteSyncConnection,
  snapshot: RemoteDocumentSnapshotRecord,
): Promise<void> {
  await fetchJson(
    connection,
    `/v1/documents/${encodeURIComponent(snapshot.documentId)}/snapshots`,
    {
      body: JSON.stringify({
        createdAt: snapshot.createdAt,
        id: snapshot.id,
        lastUpdateId: snapshot.lastUpdateId,
        snapshotBase64: bytesToBase64(snapshot.snapshot),
      }),
      method: 'POST',
    },
  );
}

export async function fetchRemoteBooks(
  connection: RemoteSyncConnection,
): Promise<RemoteBooksResponse> {
  return fetchJson<RemoteBooksResponse>(connection, '/v1/books', { method: 'GET' });
}

export async function fetchRemoteChapters(
  connection: RemoteSyncConnection,
): Promise<RemoteChaptersResponse> {
  return fetchJson<RemoteChaptersResponse>(connection, '/v1/chapters', { method: 'GET' });
}

export async function fetchRemoteDocuments(
  connection: RemoteSyncConnection,
): Promise<RemoteDocumentsResponse> {
  return fetchJson<RemoteDocumentsResponse>(connection, '/v1/documents', { method: 'GET' });
}

export async function fetchRemoteDocumentUpdates(
  connection: RemoteSyncConnection,
  documentId: string,
  afterUpdateId: string | null,
): Promise<RemoteDocumentUpdatesResponse> {
  const query = afterUpdateId ? `?afterUpdateId=${encodeURIComponent(afterUpdateId)}` : '';
  const url = `${connection.serverUrl}/v1/documents/${encodeURIComponent(documentId)}/updates${query}`;

  return fetchJson<RemoteDocumentUpdatesResponse>(connection, url, { method: 'GET' });
}

export async function fetchLatestRemoteDocumentSnapshot(
  connection: RemoteSyncConnection,
  documentId: string,
): Promise<RemoteLatestDocumentSnapshotResponse> {
  return fetchJson<RemoteLatestDocumentSnapshotResponse>(
    connection,
    `/v1/documents/${encodeURIComponent(documentId)}/snapshots/latest`,
    { method: 'GET' },
  );
}

export async function testRemoteSyncConnection(
  connection: RemoteSyncConnection,
): Promise<{ ok: boolean }> {
  if (!isRemoteSyncConnectionReady(connection)) {
    return { ok: false };
  }

  return fetchJson<{ ok: boolean }>(connection, '/v1/sync/status', { method: 'GET' });
}

export async function registerRemoteSyncClient(
  connection: RemoteSyncConnection,
  clientId: string,
  client: RemoteSyncClientInfo,
): Promise<void> {
  await fetchJson(connection, `/v1/sync/clients/${encodeURIComponent(clientId)}`, {
    body: JSON.stringify(client),
    method: 'PUT',
  });
}

export function isRemoteSyncConnectionReady(
  connection: RemoteSyncConnection,
): connection is RemoteSyncConnection & { token: string } {
  return connection.enabled && connection.serverUrl.length > 0 && !!connection.token;
}

export function isRemoteSnapshotNewer(
  remoteSnapshot: RemoteLatestDocumentSnapshotResponse['snapshot'],
  localSnapshot: { createdAt: string; id: string },
): boolean {
  if (!remoteSnapshot) {
    return false;
  }

  const createdAtOrder = remoteSnapshot.createdAt.localeCompare(localSnapshot.createdAt);

  if (createdAtOrder !== 0) {
    return createdAtOrder > 0;
  }

  return remoteSnapshot.id > localSnapshot.id;
}
