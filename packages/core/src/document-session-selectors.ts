import type { BookMetadata } from './books';
import type { ChapterMetadata } from './chapters';
import type { DocumentSession } from './document-session';
import type { DocumentMetadata } from './documents';

export function getActiveBook(session: DocumentSession): BookMetadata {
  const book = session.books.find((book) => book.id === session.activeBookId);

  if (!book) {
    throw new Error(`Active book not found: ${session.activeBookId}`);
  }

  return book;
}

export function getActiveChapter(session: DocumentSession): ChapterMetadata {
  const chapter = getActiveChapterOrNull(session);

  if (!chapter) {
    throw new Error(`Active chapter not found: ${session.activeChapterId}`);
  }

  return chapter;
}

export function getActiveChapterOrNull(session: DocumentSession): ChapterMetadata | null {
  if (!session.activeChapterId) {
    return null;
  }

  return session.chapters.find((chapter) => chapter.id === session.activeChapterId) ?? null;
}

export function getActiveDocument(session: DocumentSession): DocumentMetadata {
  const document = getActiveDocumentOrNull(session);

  if (!document) {
    throw new Error(`Active document not found: ${session.activeDocumentId}`);
  }

  return document;
}

export function getActiveDocumentOrNull(session: DocumentSession): DocumentMetadata | null {
  if (!session.activeDocumentId) {
    return null;
  }

  return session.documents.find((document) => document.id === session.activeDocumentId) ?? null;
}
