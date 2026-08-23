import {
  type BookMetadata,
  type ChapterMetadata,
  createDocumentMetadata,
  createDocumentSnapshotRecord,
  createRecoveryPoint,
  createSyncQueueItem,
  type DocumentKind,
  type DocumentMetadata,
  type DocumentSnapshotRecord,
  type DocumentUpdateRecord,
  shouldCreateAutomaticCheckpoint,
} from '@writer/core';
import type { SaveStatus } from './document-workspace-types';

export async function persistDocumentMetadata(
  document: DocumentMetadata,
  setSaveStatus: (saveStatus: SaveStatus) => void,
): Promise<boolean> {
  setSaveStatus('Saving locally');

  try {
    await window.writerDesktop.documents.saveMetadata(document);
    setSaveStatus('Saved locally');
    return true;
  } catch {
    setSaveStatus('Save failed');
    return false;
  }
}

export async function persistBookMetadata(
  book: BookMetadata,
  setSaveStatus: (saveStatus: SaveStatus) => void,
): Promise<boolean> {
  setSaveStatus('Saving locally');

  try {
    await window.writerDesktop.books.saveMetadata(book);
    setSaveStatus('Saved locally');
    return true;
  } catch {
    setSaveStatus('Save failed');
    return false;
  }
}

export async function persistChapterMetadata(
  chapter: ChapterMetadata,
  setSaveStatus: (saveStatus: SaveStatus) => void,
): Promise<boolean> {
  setSaveStatus('Saving locally');

  try {
    await window.writerDesktop.chapters.saveMetadata(chapter);
    setSaveStatus('Saved locally');
    return true;
  } catch {
    setSaveStatus('Save failed');
    return false;
  }
}

export async function persistDocumentUpdate(
  update: DocumentUpdateRecord,
  setSaveStatus: (saveStatus: SaveStatus) => void,
  snapshot?: DocumentSnapshotRecord,
) {
  setSaveStatus('Saving locally');

  try {
    await window.writerDesktop.documentUpdates.append(update);
    await window.writerDesktop.syncQueue.enqueue(
      createSyncQueueItem({
        createdAt: update.createdAt,
        documentId: update.documentId,
        id: `sync_${globalThis.crypto.randomUUID()}`,
        kind: 'document-update',
        recordId: update.id,
      }),
    );
    if (snapshot) {
      await persistDocumentSnapshot(snapshot, 'automatic-checkpoint');
    }
    setSaveStatus('Saved locally');
  } catch {
    setSaveStatus('Save failed');
  }
}

export async function persistManualRestorePoint(
  documentId: string,
  snapshotBytes: Uint8Array,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  setSaveStatus('Saving locally');

  try {
    const updates = await window.writerDesktop.documentUpdates.list(documentId);
    const latestUpdate = updates.at(-1);
    const snapshot = createDocumentSnapshotRecord({
      createdAt: new Date().toISOString(),
      documentId,
      id: `snapshot_${globalThis.crypto.randomUUID()}`,
      lastUpdateId: latestUpdate?.id ?? null,
      snapshot: snapshotBytes,
    });

    await persistDocumentSnapshot(snapshot, 'manual-restore-point');
    setSaveStatus('Saved locally');
  } catch {
    setSaveStatus('Save failed');
  }
}

export async function persistDocumentSnapshot(
  snapshot: DocumentSnapshotRecord,
  recoveryKind?: 'automatic-checkpoint' | 'manual-restore-point',
) {
  await window.writerDesktop.documentSnapshots.save(snapshot);
  await window.writerDesktop.syncQueue.enqueue(
    createSyncQueueItem({
      createdAt: snapshot.createdAt,
      documentId: snapshot.documentId,
      id: `sync_${globalThis.crypto.randomUUID()}`,
      kind: 'document-snapshot',
      recordId: snapshot.id,
    }),
  );

  if (!recoveryKind) {
    return;
  }

  const updates = await window.writerDesktop.documentUpdates.list(snapshot.documentId);
  const recoveryPoints = await window.writerDesktop.recoveryPoints.list(snapshot.documentId);
  const latestAutomaticCheckpoint = recoveryPoints.find(
    (point) => point.kind === 'automatic-checkpoint',
  );
  const updateCountSinceLastCheckpoint = latestAutomaticCheckpoint
    ? Math.max(0, updates.length - latestAutomaticCheckpoint.updateCountAtCreation)
    : updates.length;
  const shouldSaveRecoveryPoint =
    recoveryKind === 'manual-restore-point' ||
    shouldCreateAutomaticCheckpoint({
      lastRecoveryPointAt: latestAutomaticCheckpoint?.createdAt ?? null,
      now: snapshot.createdAt,
      updateCountSinceLastCheckpoint,
    });

  if (!shouldSaveRecoveryPoint) {
    return;
  }

  await window.writerDesktop.recoveryPoints.save(
    createRecoveryPoint({
      createdAt: snapshot.createdAt,
      documentId: snapshot.documentId,
      id: `recovery_${globalThis.crypto.randomUUID()}`,
      kind: recoveryKind,
      label:
        recoveryKind === 'manual-restore-point' ? 'Manual restore point' : 'Automatic checkpoint',
      snapshotId: snapshot.id,
      updateCountAtCreation: updates.length,
    }),
  );
}

export function createSnapshotForDocumentUpdate(
  update: DocumentUpdateRecord,
  snapshot: Uint8Array,
): DocumentSnapshotRecord {
  return createDocumentSnapshotRecord({
    createdAt: new Date().toISOString(),
    documentId: update.documentId,
    id: `snapshot_${globalThis.crypto.randomUUID()}`,
    lastUpdateId: update.id,
    snapshot,
  });
}

export function createUntitledDocument(
  bookId: string,
  chapterId: string | null,
  order: number,
  kind: DocumentKind,
): DocumentMetadata {
  return createDocumentMetadata({
    bookId,
    chapterId,
    id: `doc_${globalThis.crypto.randomUUID()}`,
    kind,
    now: new Date().toISOString(),
    order,
  });
}
