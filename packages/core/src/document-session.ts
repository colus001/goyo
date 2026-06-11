import type { BookId, ChapterId, DocumentId } from '@writer/shared';
import { type BookMetadata, createBookMetadata } from './books';
import { type ChapterMetadata, createChapterMetadata, renameChapter } from './chapters';
import {
  ensureChaptersForDocuments,
  sortChapters,
  sortDocuments,
} from './document-session-helpers';
import {
  type CreateDocumentMetadataInput,
  createDocumentMetadata,
  type DocumentMetadata,
  type RenameDocumentInput,
  renameDocument,
} from './documents';

export {
  reorderChapter,
  reorderDocument,
} from './document-session-reorder';
export {
  getActiveBook,
  getActiveDocumentOrNull,
} from './document-session-selectors';

export interface DocumentSession {
  activeBookId: BookId;
  activeChapterId: ChapterId | null;
  activeDocumentId: DocumentId | null;
  books: BookMetadata[];
  chapters: ChapterMetadata[];
  documents: DocumentMetadata[];
}

export function createDocumentSession(input: CreateDocumentMetadataInput): DocumentSession {
  const document = createDocumentMetadata(input);
  const book = createBookMetadata({ id: document.bookId, now: input.now });
  const chapters = document.chapterId
    ? [
        createChapterMetadata({
          bookId: document.bookId,
          id: document.chapterId,
          now: input.now,
        }),
      ]
    : [];

  return {
    activeBookId: document.bookId,
    activeChapterId: document.chapterId,
    activeDocumentId: document.id,
    books: [book],
    chapters,
    documents: [document],
  };
}

export function createDocumentSessionFromDocuments(documents: DocumentMetadata[]): DocumentSession {
  return createDocumentSessionFromBooksChaptersAndDocuments([], [], documents);
}

export function createDocumentSessionFromBooksAndDocuments(
  books: BookMetadata[],
  documents: DocumentMetadata[],
): DocumentSession {
  return createDocumentSessionFromBooksChaptersAndDocuments(books, [], documents);
}

export function createDocumentSessionFromBooksChaptersAndDocuments(
  books: BookMetadata[],
  chapters: ChapterMetadata[],
  documents: DocumentMetadata[],
): DocumentSession {
  const sortedDocuments = sortDocuments(documents);
  const sortedChapters = sortChapters(ensureChaptersForDocuments(chapters, sortedDocuments));
  const activeDocument = sortedDocuments[0];
  const activeChapter = activeDocument
    ? sortedChapters.find((chapter) => chapter.id === activeDocument.chapterId)
    : sortedChapters[0];

  if (!activeDocument && !activeChapter && books.length === 0) {
    throw new Error('Document session needs at least one book, chapter, or document');
  }

  const activeBook =
    books.find(({ id }) => id === activeDocument?.bookId) ??
    books.find(({ id }) => id === activeChapter?.bookId) ??
    books[0] ??
    createBookMetadata({
      id: activeDocument?.bookId ?? activeChapter?.bookId ?? 'book_default',
      now: activeDocument?.createdAt ?? activeChapter?.createdAt ?? new Date().toISOString(),
    });

  return {
    activeBookId: activeBook.id,
    activeChapterId: activeChapter?.id ?? null,
    activeDocumentId: activeDocument?.id ?? null,
    books: books.some(({ id }) => id === activeBook.id) ? books : [activeBook, ...books],
    chapters: sortedChapters,
    documents: sortedDocuments,
  };
}

export function addChapterToSession(
  session: DocumentSession,
  chapter: ChapterMetadata,
): DocumentSession {
  const existingChapter = session.chapters.find(({ id }) => id === chapter.id);

  if (existingChapter) {
    return selectActiveChapter(session, chapter.id);
  }

  return {
    ...session,
    activeBookId: chapter.bookId,
    activeChapterId: chapter.id,
    activeDocumentId: null,
    chapters: sortChapters([...session.chapters, chapter]),
  };
}

export function createDraftInSession(
  session: DocumentSession,
  input: CreateDocumentMetadataInput,
): DocumentSession {
  const document = createDocumentMetadata(input);

  return addDocumentToSession(session, document);
}

export function addDocumentToSession(
  session: DocumentSession,
  document: DocumentMetadata,
): DocumentSession {
  const existingDocument = session.documents.find(({ id }) => id === document.id);

  if (existingDocument) {
    return selectActiveDocument(session, document.id);
  }

  return {
    ...session,
    activeBookId: document.bookId,
    activeChapterId: document.chapterId,
    activeDocumentId: document.id,
    documents: sortDocuments([...session.documents, document]),
  };
}

export function renameActiveChapter(
  session: DocumentSession,
  input: RenameDocumentInput,
): DocumentSession {
  return {
    ...session,
    chapters: session.chapters.map((chapter) => {
      if (chapter.id !== session.activeChapterId) {
        return chapter;
      }

      return renameChapter(chapter, input);
    }),
  };
}

export function renameActiveDocument(
  session: DocumentSession,
  input: RenameDocumentInput,
): DocumentSession {
  return {
    ...session,
    documents: session.documents.map((document) => {
      if (document.id !== session.activeDocumentId) {
        return document;
      }

      return renameDocument(document, input);
    }),
  };
}

export function selectActiveDocument(
  session: DocumentSession,
  documentId: DocumentId,
): DocumentSession {
  if (session.activeDocumentId === documentId) {
    return session;
  }

  const document = session.documents.find((document) => document.id === documentId);

  if (!document) {
    return session;
  }

  return {
    ...session,
    activeBookId: document.bookId,
    activeChapterId: document.chapterId,
    activeDocumentId: documentId,
  };
}

export function selectActiveChapter(
  session: DocumentSession,
  chapterId: ChapterId,
): DocumentSession {
  const chapter = session.chapters.find((candidate) => candidate.id === chapterId);

  if (!chapter) {
    return session;
  }

  return {
    ...session,
    activeBookId: chapter.bookId,
    activeChapterId: chapterId,
    activeDocumentId: null,
  };
}

export function selectActiveBook(session: DocumentSession, bookId: BookId): DocumentSession {
  if (session.activeBookId === bookId) {
    return session;
  }

  const bookExists = session.books.some((book) => book.id === bookId);

  if (!bookExists) {
    return session;
  }

  const activeDocument = sortDocuments(session.documents).find(
    (document) => document.bookId === bookId,
  );
  const activeChapter = activeDocument?.chapterId
    ? sortChapters(session.chapters).find((chapter) => chapter.id === activeDocument.chapterId)
    : sortChapters(session.chapters).find((chapter) => chapter.bookId === bookId);

  return {
    ...session,
    activeBookId: bookId,
    activeChapterId: activeDocument?.chapterId ?? activeChapter?.id ?? null,
    activeDocumentId: activeDocument?.id ?? null,
  };
}
