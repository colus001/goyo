// biome-ignore lint/nursery/noExcessiveLinesPerFile: Remote sync request, retry, and status helpers are kept together around one API boundary for now.
import type { DocumentMetadata, DocumentSnapshotRecord, DocumentUpdateRecord } from '@writer/core';
import {
  createDocumentSnapshotRecord,
  createDocumentUpdateRecord,
  createMissingSyncQueueItems,
  createRecoveryPoint,
  createSyncQueueItem,
  createYjsCrdtAdapter,
  replayDocumentUpdates,
  restoreDocumentFromSnapshot,
} from '@writer/core';
import {
  base64ToBytes,
  fetchLatestRemoteDocumentSnapshot,
  fetchRemoteDocumentUpdates,
  isRemoteSnapshotNewer,
  isRemoteSyncConnectionReady,
  pushRemoteBookMetadata,
  pushRemoteChapterMetadata,
  pushRemoteDocumentMetadata,
  pushRemoteDocumentSnapshot,
  pushRemoteDocumentUpdate,
  RemoteSyncRequestError,
  registerRemoteSyncClient,
  testRemoteSyncConnection,
} from '@writer/shared';
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
  recentFailures: SyncFailureSummary[];
}

interface SyncFailureSummary {
  attempts: number;
  documentId: string;
  id: string;
  kind: string;
  lastAttemptAt: string | null;
  lastEndpoint: string | null;
  lastError: string | null;
  lastHttpStatus: number | null;
  recordId: string;
}

interface PushOptions {
  context?: SyncRunContext;
  forceRetry?: boolean;
}

interface PullOptions {
  context?: SyncRunContext;
}

interface SyncRunContext {
  documentMetadataFailures: Map<string, unknown>;
  pushedDocumentIds: Set<string>;
  registeredClientIds: Set<string>;
  workspaceMetadataPushed: boolean;
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

export interface RestoreCloudProgress {
  completed: number;
  current: number;
  phase: RestoreCloudProgressPhase;
  total: number;
}

type RestoreCloudProgressPhase =
  | 'books'
  | 'chapters'
  | 'documents'
  | 'sync-clients'
  | 'document-updates'
  | 'document-snapshots';

export interface RestoreCloudResult {
  booksPushed: number;
  chaptersPushed: number;
  documentsPushed: number;
  snapshotsPushed: number;
  syncClientsRegistered: number;
  updatesPushed: number;
}

interface SyncFailureDetails {
  lastEndpoint: string | null;
  lastError: string | null;
  lastHttpStatus: number | null;
}

interface RestoreCloudContext {
  completed: number;
  onProgress?: (progress: RestoreCloudProgress) => void;
  total: number;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Queue preparation and per-item diagnostics belong to one sync operation.
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

  if (!isRemoteSyncConnectionReady(connection)) {
    const pendingItems = listPendingDocumentUpdateSyncItems(store);

    return { pushedUpdateCount, skippedUpdateCount: pendingItems.length };
  }

  ensureLocalRecordsQueuedForRemoteSync(store);
  const pendingItems = listPendingDocumentUpdateSyncItems(store);
  const context = options.context ?? createSyncRunContext();

  if (pendingItems.length === 0) {
    return { pushedUpdateCount, skippedUpdateCount };
  }

  await pushWorkspaceMetadata(store, connection, context);

  if (!(await registerSyncClientOrMarkPending(store, connection, pendingItems, context))) {
    return { pushedUpdateCount, skippedUpdateCount: pendingItems.length };
  }

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
      await pushDocumentMetadata(connection, document, context);
      await registerSyncClient(connection, update.clientId, context);
      await pushRemoteDocumentUpdate(connection, update);
      store.markSyncItemCompleted(item.id, new Date().toISOString());
      pushedUpdateCount += 1;
    } catch (error) {
      store.markSyncItemAttempted(
        item.id,
        new Date().toISOString(),
        createSyncFailureDetails(error),
      );
      skippedUpdateCount += 1;
    }
  }

  return { pushedUpdateCount, skippedUpdateCount };
}

function listPendingDocumentUpdateSyncItems(store: DesktopLocalStore) {
  return store.listPendingSyncItems().filter((item) => item.kind === 'document-update');
}

export async function pullRemoteDocumentUpdates(
  store: DesktopLocalStore,
  connection: SyncConnectionSettings,
  options: PullOptions = {},
): Promise<PullRemoteUpdatesResult> {
  let pulledUpdateCount = 0;
  let skippedDocumentCount = 0;

  if (!isRemoteSyncConnectionReady(connection)) {
    return { pulledUpdateCount, skippedDocumentCount };
  }

  const context = options.context ?? createSyncRunContext();
  await registerSyncClient(connection, connection.clientId, context);

  for (const document of store.listDocuments()) {
    try {
      const localUpdates = store.listDocumentUpdates(document.id);
      const localUpdateIds = new Set(localUpdates.map((update) => update.id));
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
          update: base64ToBytes(update.updateBase64),
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

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Queue preparation and per-item diagnostics belong to one sync operation.
async function pushPendingDocumentSnapshots(
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

  if (!isRemoteSyncConnectionReady(connection)) {
    const pendingItems = store
      .listPendingSyncItems()
      .filter((item) => item.kind === 'document-snapshot');

    return { pushedSnapshotCount, skippedSnapshotCount: pendingItems.length };
  }

  ensureLocalRecordsQueuedForRemoteSync(store);
  const pendingItems = store
    .listPendingSyncItems()
    .filter((item) => item.kind === 'document-snapshot');
  const context = options.context ?? createSyncRunContext();

  if (pendingItems.length === 0) {
    return { pushedSnapshotCount, skippedSnapshotCount };
  }

  await pushWorkspaceMetadata(store, connection, context);

  if (!(await registerSyncClientOrMarkPending(store, connection, pendingItems, context))) {
    return { pushedSnapshotCount, skippedSnapshotCount: pendingItems.length };
  }

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
      await pushDocumentMetadata(connection, document, context);
      await pushRemoteDocumentSnapshot(connection, snapshot);
      store.markSyncItemCompleted(item.id, new Date().toISOString());
      pushedSnapshotCount += 1;
    } catch (error) {
      store.markSyncItemAttempted(
        item.id,
        new Date().toISOString(),
        createSyncFailureDetails(error),
      );
      skippedSnapshotCount += 1;
    }
  }

  return { pushedSnapshotCount, skippedSnapshotCount };
}

async function pullRemoteDocumentSnapshots(
  store: DesktopLocalStore,
  connection: SyncConnectionSettings,
  options: PullOptions = {},
): Promise<PullRemoteSnapshotsResult> {
  let pulledSnapshotCount = 0;
  let skippedDocumentCount = 0;

  if (!isRemoteSyncConnectionReady(connection)) {
    return { pulledSnapshotCount, skippedDocumentCount };
  }

  const context = options.context ?? createSyncRunContext();
  await registerSyncClient(connection, connection.clientId, context);

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
        snapshot: base64ToBytes(remoteSnapshot.snapshot.snapshotBase64),
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

export async function synchronizeRemoteDocuments(
  store: DesktopLocalStore,
  connection: SyncConnectionSettings,
  options: Pick<PushOptions, 'forceRetry'> = {},
) {
  const context = createSyncRunContext();
  const pushOptions = { ...options, context };
  const pullOptions = { context };
  const updatePush = await pushPendingDocumentUpdates(store, connection, pushOptions);
  const snapshotPush = await pushPendingDocumentSnapshots(store, connection, pushOptions);
  const updatePull = await pullRemoteDocumentUpdates(store, connection, pullOptions);
  const snapshotPull = await pullRemoteDocumentSnapshots(store, connection, pullOptions);

  return { snapshotPull, snapshotPush, updatePull, updatePush };
}

export async function restoreCloudFromLocal(
  store: DesktopLocalStore,
  connection: SyncConnectionSettings,
  onProgress?: (progress: RestoreCloudProgress) => void,
): Promise<RestoreCloudResult> {
  if (!isRemoteSyncConnectionReady(connection)) {
    throw new Error('Remote sync is not configured.');
  }

  const syncContext = createSyncRunContext();
  const updatePull = await pullRemoteDocumentUpdates(store, connection, { context: syncContext });
  const snapshotPull = await pullRemoteDocumentSnapshots(store, connection, {
    context: syncContext,
  });

  if (updatePull.skippedDocumentCount > 0 || snapshotPull.skippedDocumentCount > 0) {
    throw new Error('Could not pull every remote document before full sync. Try again shortly.');
  }

  ensureLocalRecordsQueuedForRemoteSync(store);
  const books = store.listAllBooks();
  const chapters = store.listAllChapters();
  const documents = store.listAllDocuments();
  const reconciliationRecords = documents.map((document) =>
    createFullSyncRecords(store, connection.clientId, document),
  );
  const total =
    books.length + chapters.length + documents.length + 1 + reconciliationRecords.length * 2;
  const context: RestoreCloudContext = { completed: 0, onProgress, total };

  await restoreCloudRecords(context, 'books', books, (book) =>
    pushRemoteBookMetadata(connection, book),
  );
  await restoreCloudRecords(context, 'chapters', chapters, (chapter) =>
    pushRemoteChapterMetadata(connection, chapter),
  );
  await restoreCloudRecords(context, 'documents', documents, (document) =>
    pushRemoteDocumentMetadata(connection, document),
  );
  await restoreCloudRecords(context, 'sync-clients', [connection.clientId], (clientId) =>
    registerSyncClient(connection, clientId, syncContext),
  );
  await reconcileFullSyncRecords(store, connection, context, reconciliationRecords);

  return {
    booksPushed: books.length,
    chaptersPushed: chapters.length,
    documentsPushed: documents.length,
    snapshotsPushed: reconciliationRecords.length,
    syncClientsRegistered: 1,
    updatesPushed: reconciliationRecords.length,
  };
}

interface FullSyncRecords {
  pendingSyncItemIds: string[];
  snapshot: DocumentSnapshotRecord;
  update: DocumentUpdateRecord;
}

function createFullSyncRecords(
  store: DesktopLocalStore,
  clientId: string,
  document: DocumentMetadata,
): FullSyncRecords {
  const adapter = createYjsCrdtAdapter();
  const latestSnapshot = store.getLatestDocumentSnapshot(document.id);
  // Reapplying every Yjs update is idempotent and preserves late updates that predate the snapshot cursor.
  const updates = store.listDocumentUpdates(document.id);
  const crdtDocument = latestSnapshot
    ? restoreDocumentFromSnapshot(adapter, latestSnapshot, updates)
    : replayDocumentUpdates(adapter, document.id, updates);
  const fullState = adapter.encodeSnapshot(crdtDocument);
  const createdAt = new Date().toISOString();
  const updateId = `update_full_${crypto.randomUUID()}`;
  const snapshotId = `snapshot_full_${crypto.randomUUID()}`;

  return {
    pendingSyncItemIds: store
      .listPendingSyncItems()
      .filter((item) => item.documentId === document.id)
      .map((item) => item.id),
    snapshot: createDocumentSnapshotRecord({
      createdAt,
      documentId: document.id,
      id: snapshotId,
      lastUpdateId: null,
      snapshot: fullState,
    }),
    update: createDocumentUpdateRecord({
      clientId,
      createdAt,
      documentId: document.id,
      id: updateId,
      update: fullState,
    }),
  };
}

async function reconcileFullSyncRecords(
  store: DesktopLocalStore,
  connection: SyncConnectionSettings,
  context: RestoreCloudContext,
  records: FullSyncRecords[],
) {
  for (const [index, record] of records.entries()) {
    reportRestoreProgress(context, 'document-updates', index, records.length);
    await pushRemoteDocumentUpdate(connection, record.update);
    context.completed += 1;
    reportRestoreProgress(context, 'document-snapshots', index, records.length);
    await pushRemoteDocumentSnapshot(connection, record.snapshot);
    context.completed += 1;
    recordFullSyncSuccess(store, record);
  }
}

function reportRestoreProgress(
  context: RestoreCloudContext,
  phase: RestoreCloudProgressPhase,
  index: number,
  recordCount: number,
) {
  context.onProgress?.({
    completed: context.completed,
    current: Math.min(index + 1, recordCount),
    phase,
    total: context.total,
  });
}

function recordFullSyncSuccess(store: DesktopLocalStore, records: FullSyncRecords) {
  const completedAt = new Date().toISOString();
  const updateSyncItem = createSyncQueueItem({
    createdAt: records.update.createdAt,
    documentId: records.update.documentId,
    id: `sync_full_update_${records.update.id}`,
    kind: 'document-update',
    recordId: records.update.id,
  });
  const snapshotSyncItem = createSyncQueueItem({
    createdAt: records.snapshot.createdAt,
    documentId: records.snapshot.documentId,
    id: `sync_full_snapshot_${records.snapshot.id}`,
    kind: 'document-snapshot',
    recordId: records.snapshot.id,
  });

  store.appendDocumentUpdate(records.update);
  store.saveDocumentSnapshot(records.snapshot);
  store.enqueueSyncItem(updateSyncItem);
  store.enqueueSyncItem(snapshotSyncItem);
  store.markSyncItemsCompleted(
    [...records.pendingSyncItemIds, updateSyncItem.id, snapshotSyncItem.id],
    completedAt,
  );
}

async function restoreCloudRecords<TRecord>(
  context: RestoreCloudContext,
  phase: RestoreCloudProgressPhase,
  records: TRecord[],
  upload: (record: TRecord) => Promise<void>,
) {
  for (const [index, record] of records.entries()) {
    context.onProgress?.({
      completed: context.completed,
      current: index + 1,
      phase,
      total: context.total,
    });
    await upload(record);
    context.completed += 1;
  }
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
    recentFailures: store.listRecentFailedSyncItems(10),
  };
}

function markSyncItemsAttempted(
  store: DesktopLocalStore,
  items: Array<{ id: string }>,
  failure: SyncFailureDetails,
) {
  const attemptedAt = new Date().toISOString();

  for (const item of items) {
    store.markSyncItemAttempted(item.id, attemptedAt, failure);
  }
}

async function registerSyncClientOrMarkPending(
  store: DesktopLocalStore,
  connection: SyncConnectionSettings,
  items: Array<{ id: string }>,
  context: SyncRunContext,
): Promise<boolean> {
  try {
    await registerSyncClient(connection, connection.clientId, context);
    return true;
  } catch (error) {
    markSyncItemsAttempted(store, items, createSyncFailureDetails(error));
    return false;
  }
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

async function pushWorkspaceMetadata(
  store: DesktopLocalStore,
  connection: SyncConnectionSettings,
  context: SyncRunContext,
) {
  if (context.workspaceMetadataPushed) {
    return;
  }

  const books = store.listAllBooks();
  const chapters = store.listAllChapters();

  if (books.length === 0 && chapters.length === 0) {
    context.workspaceMetadataPushed = true;
    return;
  }

  await registerSyncClient(connection, connection.clientId, context);

  for (const book of books) {
    await pushRemoteBookMetadata(connection, book);
  }

  for (const chapter of chapters) {
    await pushRemoteChapterMetadata(connection, chapter);
  }

  context.workspaceMetadataPushed = true;
}

export async function testSyncConnection(
  connection: SyncConnectionSettings,
): Promise<{ ok: boolean }> {
  return testRemoteSyncConnection(connection);
}

async function registerSyncClient(
  connection: SyncConnectionSettings,
  clientId = connection.clientId,
  context?: SyncRunContext,
) {
  if (context?.registeredClientIds.has(clientId)) {
    return;
  }

  await registerRemoteSyncClient(connection, clientId, {
    lastSeenAt: new Date().toISOString(),
    name: 'Goyo Desktop',
    platform: process.platform,
  });
  context?.registeredClientIds.add(clientId);
}

async function pushDocumentMetadata(
  connection: SyncConnectionSettings,
  document: Parameters<typeof pushRemoteDocumentMetadata>[1],
  context: SyncRunContext,
) {
  if (context.pushedDocumentIds.has(document.id)) {
    return;
  }

  if (context.documentMetadataFailures.has(document.id)) {
    throw context.documentMetadataFailures.get(document.id);
  }

  try {
    await pushRemoteDocumentMetadata(connection, document);
    context.pushedDocumentIds.add(document.id);
  } catch (error) {
    context.documentMetadataFailures.set(document.id, error);
    throw error;
  }
}

function createSyncRunContext(): SyncRunContext {
  return {
    documentMetadataFailures: new Map(),
    pushedDocumentIds: new Set(),
    registeredClientIds: new Set(),
    workspaceMetadataPushed: false,
  };
}

function createSyncFailureDetails(error: unknown): SyncFailureDetails {
  if (error instanceof RemoteSyncRequestError) {
    return {
      lastEndpoint: error.endpoint,
      lastError: error.message,
      lastHttpStatus: error.status,
    };
  }

  return {
    lastEndpoint: null,
    lastError: error instanceof Error ? error.message : 'Unknown sync error',
    lastHttpStatus: null,
  };
}
