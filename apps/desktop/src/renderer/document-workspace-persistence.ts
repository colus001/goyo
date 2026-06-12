import {
  type BookMetadata,
  type ChapterMetadata,
  createDocumentMetadata,
  createDocumentSnapshotRecord,
  createSyncQueueItem,
  type DocumentKind,
  type DocumentMetadata,
  type DocumentSnapshotRecord,
  type DocumentUpdateRecord,
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
      await persistDocumentSnapshot(snapshot);
    }
    setSaveStatus('Saved locally');
  } catch {
    setSaveStatus('Save failed');
  }
}

async function persistDocumentSnapshot(snapshot: DocumentSnapshotRecord) {
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
