import type { ChapterId, DocumentId } from '@writer/shared';
import type { DocumentSession } from './document-session';
import { sortChapters, sortDocuments } from './document-session-helpers';

export type ReorderChapterDirection = 'down' | 'up';
export type ReorderDocumentDirection = 'down' | 'up';

export function reorderDocument(
  session: DocumentSession,
  documentId: DocumentId,
  direction: ReorderDocumentDirection,
): DocumentSession {
  const document = session.documents.find((candidate) => candidate.id === documentId);

  if (!document) {
    return session;
  }

  const sectionDocuments = sortDocuments(session.documents).filter(
    (candidate) =>
      candidate.bookId === document.bookId &&
      candidate.chapterId === document.chapterId &&
      candidate.kind === document.kind,
  );
  const currentIndex = sectionDocuments.findIndex((candidate) => candidate.id === documentId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  const targetDocument = sectionDocuments[targetIndex];

  if (!targetDocument) {
    return session;
  }

  return {
    ...session,
    documents: sortDocuments(
      session.documents.map((candidate) => {
        if (candidate.id === document.id) {
          return { ...candidate, order: targetDocument.order };
        }

        if (candidate.id === targetDocument.id) {
          return { ...candidate, order: document.order };
        }

        return candidate;
      }),
    ),
  };
}

export function reorderChapter(
  session: DocumentSession,
  chapterId: ChapterId,
  direction: ReorderChapterDirection,
): DocumentSession {
  const chapter = session.chapters.find((candidate) => candidate.id === chapterId);

  if (!chapter) {
    return session;
  }

  const bookChapters = sortChapters(session.chapters).filter(
    (candidate) => candidate.bookId === chapter.bookId,
  );
  const currentIndex = bookChapters.findIndex((candidate) => candidate.id === chapterId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  const targetChapter = bookChapters[targetIndex];

  if (!targetChapter) {
    return session;
  }

  return {
    ...session,
    chapters: sortChapters(
      session.chapters.map((candidate) => {
        if (candidate.id === chapter.id) {
          return { ...candidate, order: targetChapter.order };
        }

        if (candidate.id === targetChapter.id) {
          return { ...candidate, order: chapter.order };
        }

        return candidate;
      }),
    ),
  };
}
