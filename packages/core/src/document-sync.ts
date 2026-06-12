import type { CrdtAdapter, CrdtDocument, CrdtStateVector, CrdtUpdate } from './crdt';
import { sortDocumentUpdatesForReplay } from './document-updates';
import type { DocumentSnapshotRecord } from './local-store';
import type { DocumentUpdateRecord, SyncQueueItem, SyncQueueItemKind } from './sync';
import { createSyncQueueItem, sortSyncQueueItemsForProcessing } from './sync';

interface CreateMissingSyncQueueItemsInput {
  createQueueItemId: (input: { kind: SyncQueueItemKind; recordId: string }) => string;
  existingQueueItems: SyncQueueItem[];
  snapshots: DocumentSnapshotRecord[];
  updates: DocumentUpdateRecord[];
}

export function replayDocumentUpdates<TDocument extends CrdtDocument>(
  adapter: CrdtAdapter<TDocument>,
  documentId: string,
  updates: DocumentUpdateRecord[],
): TDocument {
  const document = adapter.createDocument(documentId);

  applyDocumentUpdates(adapter, document, updates);

  return document;
}

export function restoreDocumentFromSnapshot<TDocument extends CrdtDocument>(
  adapter: CrdtAdapter<TDocument>,
  snapshot: DocumentSnapshotRecord,
  updatesAfterSnapshot: DocumentUpdateRecord[],
): TDocument {
  const document = adapter.createDocument(snapshot.documentId);
  adapter.applyUpdate(document, snapshot.snapshot);
  applyDocumentUpdates(adapter, document, updatesAfterSnapshot);

  return document;
}

export function createDocumentStateVector<TDocument extends CrdtDocument>(
  adapter: CrdtAdapter<TDocument>,
  snapshot: DocumentSnapshotRecord | null,
  updates: DocumentUpdateRecord[],
  documentId = snapshot?.documentId ?? updates[0]?.documentId,
): CrdtStateVector {
  const document = snapshot
    ? restoreDocumentFromSnapshot(adapter, snapshot, updates)
    : replayDocumentUpdates(adapter, documentId ?? '', updates);

  return adapter.encodeStateVector(document);
}

export function createMissingDocumentUpdate<TDocument extends CrdtDocument>(
  adapter: CrdtAdapter<TDocument>,
  document: TDocument,
  knownStateVector: CrdtStateVector,
): CrdtUpdate {
  return adapter.encodeUpdateSinceStateVector(document, knownStateVector);
}

export function selectPendingDocumentUpdates(
  queueItems: SyncQueueItem[],
  updates: DocumentUpdateRecord[],
): DocumentUpdateRecord[] {
  const updatesById = new Map(updates.map((update) => [update.id, update]));
  const selectedUpdateIds = new Set<string>();
  const selectedUpdates: DocumentUpdateRecord[] = [];

  for (const item of sortSyncQueueItemsForProcessing(queueItems)) {
    if (item.kind !== 'document-update' || selectedUpdateIds.has(item.recordId)) {
      continue;
    }

    const update = updatesById.get(item.recordId);

    if (!update) {
      continue;
    }

    selectedUpdateIds.add(item.recordId);
    selectedUpdates.push(update);
  }

  return selectedUpdates;
}

export function createMissingSyncQueueItems({
  createQueueItemId,
  existingQueueItems,
  snapshots,
  updates,
}: CreateMissingSyncQueueItemsInput): SyncQueueItem[] {
  const queuedRecords = new Set(
    existingQueueItems.map((item) => createQueuedRecordKey(item.kind, item.recordId)),
  );
  const recoveredItems: SyncQueueItem[] = [];

  for (const update of sortDocumentUpdatesForReplay(updates)) {
    const key = createQueuedRecordKey('document-update', update.id);

    if (queuedRecords.has(key)) {
      continue;
    }

    queuedRecords.add(key);
    recoveredItems.push(
      createSyncQueueItem({
        createdAt: update.createdAt,
        documentId: update.documentId,
        id: createQueueItemId({ kind: 'document-update', recordId: update.id }),
        kind: 'document-update',
        recordId: update.id,
      }),
    );
  }

  for (const snapshot of sortDocumentSnapshotsForRecovery(snapshots)) {
    const key = createQueuedRecordKey('document-snapshot', snapshot.id);

    if (queuedRecords.has(key)) {
      continue;
    }

    queuedRecords.add(key);
    recoveredItems.push(
      createSyncQueueItem({
        createdAt: snapshot.createdAt,
        documentId: snapshot.documentId,
        id: createQueueItemId({ kind: 'document-snapshot', recordId: snapshot.id }),
        kind: 'document-snapshot',
        recordId: snapshot.id,
      }),
    );
  }

  return recoveredItems;
}

function applyDocumentUpdates<TDocument extends CrdtDocument>(
  adapter: CrdtAdapter<TDocument>,
  document: TDocument,
  updates: DocumentUpdateRecord[],
) {
  for (const update of sortDocumentUpdatesForReplay(updates)) {
    adapter.applyUpdate(document, update.update);
  }
}

function sortDocumentSnapshotsForRecovery(
  snapshots: DocumentSnapshotRecord[],
): DocumentSnapshotRecord[] {
  return [...snapshots].sort((first, second) => {
    const createdAtOrder = first.createdAt.localeCompare(second.createdAt);

    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    return first.id.localeCompare(second.id);
  });
}

function createQueuedRecordKey(kind: SyncQueueItemKind, recordId: string): string {
  return `${kind}:${recordId}`;
}
