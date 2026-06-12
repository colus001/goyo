import type { DocumentMetadata, DocumentSnapshotRecord, DocumentUpdateRecord } from '@writer/core';
import type { DesktopLocalStore } from './document-metadata-store';
import { isSyncItemReadyForRetry } from './sync-retry';

const GOYO_API_BASE_URL = 'https://goyo-api.seokjun.kim';

interface PushPendingUpdatesResult {
  pushedUpdateCount: number;
  skippedUpdateCount: number;
}

interface PullRemoteUpdatesResult {
  pulledUpdateCount: number;
  skippedDocumentCount: number;
}

interface PushPendingSnapshotsResult {
  pushedSnapshotCount: number;
  skippedSnapshotCount: number;
}

interface PullRemoteSnapshotsResult {
  pulledSnapshotCount: number;
  skippedDocumentCount: number;
}

interface RemoteDocumentUpdatesResponse {
  documentId: string;
  updates: Array<{
    clientId: string;
    createdAt: string;
    id: string;
    updateBase64: string;
  }>;
}

interface RemoteLatestDocumentSnapshotResponse {
  documentId: string;
  snapshot: {
    createdAt: string;
    id: string;
    lastUpdateId: string | null;
    snapshotBase64: string;
  } | null;
}

export async function pushPendingDocumentUpdates(
  store: DesktopLocalStore,
): Promise<PushPendingUpdatesResult> {
  const now = new Date();
  const pendingItems = store
    .listPendingSyncItems()
    .filter((item) => item.kind === 'document-update');
  const documentsById = new Map(store.listDocuments().map((document) => [document.id, document]));
  let pushedUpdateCount = 0;
  let skippedUpdateCount = 0;

  for (const item of pendingItems) {
    if (!isSyncItemReadyForRetry(item, now)) {
      skippedUpdateCount += 1;
      continue;
    }

    const document = documentsById.get(item.documentId);
    const update = store
      .listDocumentUpdates(item.documentId)
      .find((candidate) => candidate.id === item.recordId);

    if (!document || !update) {
      skippedUpdateCount += 1;
      continue;
    }

    try {
      await pushDocumentMetadata(document);
      await pushDocumentUpdate(update);
      store.markSyncItemCompleted(item.id, new Date().toISOString());
      pushedUpdateCount += 1;
    } catch {
      store.markSyncItemAttempted(item.id, new Date().toISOString());
      skippedUpdateCount += 1;
    }
  }

  return { pushedUpdateCount, skippedUpdateCount };
}

export async function pullRemoteDocumentUpdates(
  store: DesktopLocalStore,
): Promise<PullRemoteUpdatesResult> {
  let pulledUpdateCount = 0;
  let skippedDocumentCount = 0;

  for (const document of store.listDocuments()) {
    try {
      const updates = store.listDocumentUpdates(document.id);
      const latestUpdate = updates.at(-1);
      const remoteUpdates = await fetchRemoteDocumentUpdates(document.id, latestUpdate?.id ?? null);

      for (const update of remoteUpdates.updates) {
        store.appendDocumentUpdate({
          clientId: update.clientId,
          createdAt: update.createdAt,
          documentId: remoteUpdates.documentId,
          id: update.id,
          update: Buffer.from(update.updateBase64, 'base64'),
        });
        pulledUpdateCount += 1;
      }
    } catch {
      skippedDocumentCount += 1;
    }
  }

  return { pulledUpdateCount, skippedDocumentCount };
}

export async function pushPendingDocumentSnapshots(
  store: DesktopLocalStore,
): Promise<PushPendingSnapshotsResult> {
  const now = new Date();
  const pendingItems = store
    .listPendingSyncItems()
    .filter((item) => item.kind === 'document-snapshot');
  const documentsById = new Map(store.listDocuments().map((document) => [document.id, document]));
  let pushedSnapshotCount = 0;
  let skippedSnapshotCount = 0;

  for (const item of pendingItems) {
    if (!isSyncItemReadyForRetry(item, now)) {
      skippedSnapshotCount += 1;
      continue;
    }

    const document = documentsById.get(item.documentId);
    const snapshot = store.getDocumentSnapshot(item.recordId);

    if (!document || !snapshot) {
      skippedSnapshotCount += 1;
      continue;
    }

    try {
      await pushDocumentMetadata(document);
      await pushDocumentSnapshot(snapshot);
      store.markSyncItemCompleted(item.id, new Date().toISOString());
      pushedSnapshotCount += 1;
    } catch {
      store.markSyncItemAttempted(item.id, new Date().toISOString());
      skippedSnapshotCount += 1;
    }
  }

  return { pushedSnapshotCount, skippedSnapshotCount };
}

export async function pullRemoteDocumentSnapshots(
  store: DesktopLocalStore,
): Promise<PullRemoteSnapshotsResult> {
  let pulledSnapshotCount = 0;
  let skippedDocumentCount = 0;

  for (const document of store.listDocuments()) {
    try {
      const remoteSnapshot = await fetchLatestRemoteDocumentSnapshot(document.id);

      if (!remoteSnapshot.snapshot) {
        continue;
      }

      const localSnapshot = store.getLatestDocumentSnapshot(document.id);

      if (localSnapshot && !isRemoteSnapshotNewer(remoteSnapshot.snapshot, localSnapshot)) {
        continue;
      }

      store.saveDocumentSnapshot({
        createdAt: remoteSnapshot.snapshot.createdAt,
        documentId: remoteSnapshot.documentId,
        id: remoteSnapshot.snapshot.id,
        lastUpdateId: remoteSnapshot.snapshot.lastUpdateId,
        snapshot: Buffer.from(remoteSnapshot.snapshot.snapshotBase64, 'base64'),
      });
      pulledSnapshotCount += 1;
    } catch {
      skippedDocumentCount += 1;
    }
  }

  return { pulledSnapshotCount, skippedDocumentCount };
}

async function pushDocumentMetadata(document: DocumentMetadata) {
  await fetchJson(`${GOYO_API_BASE_URL}/v1/documents/${encodeURIComponent(document.id)}`, {
    method: 'PUT',
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
  });
}

async function pushDocumentUpdate(update: DocumentUpdateRecord) {
  await fetchJson(
    `${GOYO_API_BASE_URL}/v1/documents/${encodeURIComponent(update.documentId)}/updates`,
    {
      method: 'POST',
      body: JSON.stringify({
        clientId: update.clientId,
        createdAt: update.createdAt,
        id: update.id,
        updateBase64: Buffer.from(update.update).toString('base64'),
      }),
    },
  );
}

async function pushDocumentSnapshot(snapshot: DocumentSnapshotRecord) {
  await fetchJson(
    `${GOYO_API_BASE_URL}/v1/documents/${encodeURIComponent(snapshot.documentId)}/snapshots`,
    {
      method: 'POST',
      body: JSON.stringify({
        createdAt: snapshot.createdAt,
        id: snapshot.id,
        lastUpdateId: snapshot.lastUpdateId,
        snapshotBase64: Buffer.from(snapshot.snapshot).toString('base64'),
      }),
    },
  );
}

async function fetchRemoteDocumentUpdates(
  documentId: string,
  afterUpdateId: string | null,
): Promise<RemoteDocumentUpdatesResponse> {
  const url = new URL(
    `${GOYO_API_BASE_URL}/v1/documents/${encodeURIComponent(documentId)}/updates`,
  );

  if (afterUpdateId) {
    url.searchParams.set('afterUpdateId', afterUpdateId);
  }

  return fetchJson<RemoteDocumentUpdatesResponse>(url.toString(), { method: 'GET' });
}

async function fetchLatestRemoteDocumentSnapshot(
  documentId: string,
): Promise<RemoteLatestDocumentSnapshotResponse> {
  return fetchJson<RemoteLatestDocumentSnapshotResponse>(
    `${GOYO_API_BASE_URL}/v1/documents/${encodeURIComponent(documentId)}/snapshots/latest`,
    { method: 'GET' },
  );
}

function isRemoteSnapshotNewer(
  remoteSnapshot: RemoteLatestDocumentSnapshotResponse['snapshot'],
  localSnapshot: DocumentSnapshotRecord,
) {
  if (!remoteSnapshot) {
    return false;
  }

  const createdAtOrder = remoteSnapshot.createdAt.localeCompare(localSnapshot.createdAt);

  if (createdAtOrder !== 0) {
    return createdAtOrder > 0;
  }

  return remoteSnapshot.id > localSnapshot.id;
}

async function fetchJson<T = unknown>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Remote sync request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}
