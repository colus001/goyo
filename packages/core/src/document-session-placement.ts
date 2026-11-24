import type { ChapterId, DocumentId } from '@writer/shared';
import { QUICK_DRAFTS_BOOK_ID } from './books';
import type { DocumentSession } from './document-session';
import { sortDocuments } from './document-session-helpers';

export function moveEpisodeToChapter(
  session: DocumentSession,
  documentId: DocumentId,
  chapterId: ChapterId | null,
  now: string,
): DocumentSession {
  const document = session.documents.find(({ id }) => id === documentId);
  if (
    document?.kind !== 'episode' ||
    document.archivedAt ||
    document.bookId === QUICK_DRAFTS_BOOK_ID ||
    document.chapterId === chapterId
  ) {
    return session;
  }

  if (
    chapterId !== null &&
    !session.chapters.some(
      (chapter) =>
        chapter.id === chapterId && chapter.bookId === document.bookId && !chapter.archivedAt,
    )
  ) {
    return session;
  }

  const orders = session.documents
    .filter(
      (item) => item.bookId === document.bookId && item.chapterId === chapterId && !item.archivedAt,
    )
    .map((item) => item.order);
  const moved = { ...document, chapterId, order: Math.max(-1, ...orders) + 1, updatedAt: now };

  return {
    ...session,
    activeChapterId: session.activeDocumentId === documentId ? chapterId : session.activeChapterId,
    documents: sortDocuments(
      session.documents.map((item) => (item.id === documentId ? moved : item)),
    ),
  };
}
