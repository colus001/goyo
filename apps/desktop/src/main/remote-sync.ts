// biome-ignore lint/nursery/noExcessiveLinesPerFile: Remote sync request, retry, and status helpers are kept together around one API boundary for now.
import {
  createMissingSyncQueueItems,
  createRecoveryPoint,
  type DocumentMetadata,
  type DocumentSnapshotRecord,
  type DocumentUpdateRecord,
} from '@writer/core';
import type { DesktopLocalStore } from './document-metadata-store';
import { isSyncItemReadyForRetry } from './sync-retry';

export interface SyncConnectionSettings {
  clientId: string;
  enabled: boolean;
  serverUrl: string;
  token: string | null;
}

interface PushPendingUpdatesResult {
  pushedUpdateCount: number;
  skippedUpdateCount: number;
}

export interface SyncStatusSummary {
  failedItemCount: number;
  needsAttention: boolean;
  oldestFailedAt: string | null;
  pendingItemCount: number;
}

interface PushOptions {
  forceRetry?: boolean;
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
  connection: SyncConnectionSettings,
  options: PushOptions = {},
): Promise<PushPendingUpdatesResult> {
  const now = new Date();
  const documentsById = new Map(
    store.listAllDocuments().map((document) => [document.id, document]),
  );
  let pushedUpdateCount = 0;
  let skippedUpdateCount = 0;

  if (!isSyncConnectionReady(connection)) {
    const pendingItems = store
      .listPendingSyncItems()
      .filter((item) => item.kind === 'document-update');

    return { pushedUpdateCount, skippedUpdateCount: pendingItems.length };
  }

  ensureLocalRecordsQueuedForRemoteSync(store);
  await registerSyncClient(connection);

  const pendingItems = store
    .listPendingSyncItems()
    .filter((item) => item.kind === 'document-update');

  for (const item of pendingItems) {
    if (!options.forceRetry && !isSyncItemReadyForRetry(item, now)) {
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
      await pushDocumentMetadata(connection, document);
      await pushDocumentUpdate(connection, update);
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
  connection: SyncConnectionSettings,
): Promise<PullRemoteUpdatesResult> {
  let pulledUpdateCount = 0;
  let skippedDocumentCount = 0;

  if (!isSyncConnectionReady(connection)) {
    return { pulledUpdateCount, skippedDocumentCount };
  }

  await registerSyncClient(connection);

  for (const document of store.listDocuments()) {
    try {
      const localUpdateIds = new Set(
        store.listDocumentUpdates(document.id).map((update) => update.id),
      );
      const remoteUpdates = await fetchRemoteDocumentUpdates(connection, document.id, null);

      for (const update of remoteUpdates.updates) {
        if (localUpdateIds.has(update.id)) {
          continue;
        }

        store.appendDocumentUpdate({
          clientId: update.clientId,
          createdAt: update.createdAt,
          documentId: remoteUpdates.documentId,
          id: update.id,
          update: Buffer.from(update.updateBase64, 'base64'),
        });
        localUpdateIds.add(update.id);
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
  connection: SyncConnectionSettings,
  options: PushOptions = {},
): Promise<PushPendingSnapshotsResult> {
  const now = new Date();
  const documentsById = new Map(
    store.listAllDocuments().map((document) => [document.id, document]),
  );
  let pushedSnapshotCount = 0;
  let skippedSnapshotCount = 0;

  if (!isSyncConnectionReady(connection)) {
    const pendingItems = store
      .listPendingSyncItems()
      .filter((item) => item.kind === 'document-snapshot');

    return { pushedSnapshotCount, skippedSnapshotCount: pendingItems.length };
  }

  ensureLocalRecordsQueuedForRemoteSync(store);
  await registerSyncClient(connection);

  const pendingItems = store
    .listPendingSyncItems()
    .filter((item) => item.kind === 'document-snapshot');

  for (const item of pendingItems) {
    if (!options.forceRetry && !isSyncItemReadyForRetry(item, now)) {
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
      await pushDocumentMetadata(connection, document);
      await pushDocumentSnapshot(connection, snapshot);
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
  connection: SyncConnectionSettings,
): Promise<PullRemoteSnapshotsResult> {
  let pulledSnapshotCount = 0;
  let skippedDocumentCount = 0;

  if (!isSyncConnectionReady(connection)) {
    return { pulledSnapshotCount, skippedDocumentCount };
  }

  await registerSyncClient(connection);

  for (const document of store.listDocuments()) {
    try {
      const remoteSnapshot = await fetchLatestRemoteDocumentSnapshot(connection, document.id);

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
      store.saveRecoveryPoint(
        createRecoveryPoint({
          createdAt: remoteSnapshot.snapshot.createdAt,
          documentId: remoteSnapshot.documentId,
          id: `recovery_remote_${remoteSnapshot.snapshot.id}`,
          kind: 'remote-snapshot',
          label: 'Remote snapshot',
          snapshotId: remoteSnapshot.snapshot.id,
          updateCountAtCreation: store.listDocumentUpdates(remoteSnapshot.documentId).length,
        }),
      );
      pulledSnapshotCount += 1;
    } catch {
      skippedDocumentCount += 1;
    }
  }

  return { pulledSnapshotCount, skippedDocumentCount };
}

export async function retryRemoteSyncNow(
  store: DesktopLocalStore,
  connection: SyncConnectionSettings,
) {
  if (isSyncConnectionReady(connection)) {
    ensureLocalRecordsQueuedForRemoteSync(store);
  }

  const updatePush = await pushPendingDocumentUpdates(store, connection, { forceRetry: true });
  const snapshotPush = await pushPendingDocumentSnapshots(store, connection, { forceRetry: true });
  const updatePull = await pullRemoteDocumentUpdates(store, connection);
  const snapshotPull = await pullRemoteDocumentSnapshots(store, connection);

  return { snapshotPull, snapshotPush, updatePull, updatePush };
}

export function getSyncStatusSummary(store: DesktopLocalStore): SyncStatusSummary {
  const pendingItems = store.listPendingSyncItems();
  const failedItems = pendingItems.filter((item) => item.attempts >= 3);
  const oldestFailedAt = failedItems
    .map((item) => item.lastAttemptAt ?? item.createdAt)
    .sort((first, second) => first.localeCompare(second))[0];

  return {
    failedItemCount: failedItems.length,
    needsAttention: failedItems.length > 0,
    oldestFailedAt: oldestFailedAt ?? null,
    pendingItemCount: pendingItems.length,
  };
}

export function ensureLocalRecordsQueuedForRemoteSync(store: DesktopLocalStore): number {
  const missingItems = createMissingSyncQueueItems({
    createQueueItemId: ({ kind, recordId }) => `sync_recovered_${kind}_${recordId}`,
    existingQueueItems: store.listAllSyncItems(),
    snapshots: store.listAllDocumentSnapshots(),
    updates: store.listAllDocumentUpdates(),
  });

  for (const item of missingItems) {
    store.enqueueSyncItem(item);
  }

  return missingItems.length;
}

async function pushDocumentMetadata(
  connection: SyncConnectionSettings,
  document: DocumentMetadata,
) {
  await fetchJson(connection, `/v1/documents/${encodeURIComponent(document.id)}`, {
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

async function pushDocumentUpdate(
  connection: SyncConnectionSettings,
  update: DocumentUpdateRecord,
) {
  await fetchJson(connection, `/v1/documents/${encodeURIComponent(update.documentId)}/updates`, {
    method: 'POST',
    body: JSON.stringify({
      clientId: update.clientId,
      createdAt: update.createdAt,
      id: update.id,
      updateBase64: Buffer.from(update.update).toString('base64'),
    }),
  });
}

async function pushDocumentSnapshot(
  connection: SyncConnectionSettings,
  snapshot: DocumentSnapshotRecord,
) {
  await fetchJson(
    connection,
    `/v1/documents/${encodeURIComponent(snapshot.documentId)}/snapshots`,
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
  connection: SyncConnectionSettings,
  documentId: string,
  afterUpdateId: string | null,
): Promise<RemoteDocumentUpdatesResponse> {
  const url = new URL(
    `${connection.serverUrl}/v1/documents/${encodeURIComponent(documentId)}/updates`,
  );

  if (afterUpdateId) {
    url.searchParams.set('afterUpdateId', afterUpdateId);
  }

  return fetchJson<RemoteDocumentUpdatesResponse>(connection, url, { method: 'GET' });
}

async function fetchLatestRemoteDocumentSnapshot(
  connection: SyncConnectionSettings,
  documentId: string,
): Promise<RemoteLatestDocumentSnapshotResponse> {
  return fetchJson<RemoteLatestDocumentSnapshotResponse>(
    connection,
    `/v1/documents/${encodeURIComponent(documentId)}/snapshots/latest`,
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

export async function testSyncConnection(
  connection: SyncConnectionSettings,
): Promise<{ ok: boolean }> {
  if (!isSyncConnectionReady(connection)) {
    return { ok: false };
  }

  return fetchJson<{ ok: boolean }>(connection, '/v1/sync/status', { method: 'GET' });
}

async function registerSyncClient(connection: SyncConnectionSettings) {
  await fetchJson(connection, `/v1/sync/clients/${encodeURIComponent(connection.clientId)}`, {
    method: 'PUT',
    body: JSON.stringify({
      lastSeenAt: new Date().toISOString(),
      name: 'Goyo Desktop',
      platform: process.platform,
    }),
  });
}

function isSyncConnectionReady(
  connection: SyncConnectionSettings,
): connection is SyncConnectionSettings & {
  token: string;
} {
  return connection.enabled && connection.serverUrl.length > 0 && !!connection.token;
}

async function fetchJson<T = unknown>(
  connection: SyncConnectionSettings,
  pathOrUrl: string | URL,
  init: RequestInit,
): Promise<T> {
  const url = pathOrUrl instanceof URL ? pathOrUrl : `${connection.serverUrl}${pathOrUrl}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${connection.token ?? ''}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Remote sync request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}
