import type { CrdtAdapter, CrdtDocument, CrdtStateVector, CrdtUpdate } from './crdt';
import { sortDocumentUpdatesForReplay } from './document-updates';
import type { DocumentSnapshotRecord } from './local-store';
import type { DocumentUpdateRecord, SyncQueueItem } from './sync';
import { sortSyncQueueItemsForProcessing } from './sync';

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

function applyDocumentUpdates<TDocument extends CrdtDocument>(
  adapter: CrdtAdapter<TDocument>,
  document: TDocument,
  updates: DocumentUpdateRecord[],
) {
  for (const update of sortDocumentUpdatesForReplay(updates)) {
    adapter.applyUpdate(document, update.update);
  }
}
