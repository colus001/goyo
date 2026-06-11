import {
  type BookMetadata,
  type ChapterMetadata,
  createDocumentMetadata,
  type DocumentKind,
  type DocumentMetadata,
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
) {
  setSaveStatus('Saving locally');

  try {
    await window.writerDesktop.documentUpdates.append(update);
    setSaveStatus('Saved locally');
  } catch {
    setSaveStatus('Save failed');
  }
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
