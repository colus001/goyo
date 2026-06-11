import type { BookId, DocumentId } from '@writer/shared';
import { type BookMetadata, createBookMetadata } from './books';
import {
  type CreateDocumentMetadataInput,
  createDocumentMetadata,
  type DocumentMetadata,
  type RenameDocumentInput,
  renameDocument,
} from './documents';

export interface DocumentSession {
  activeBookId: BookId;
  activeDocumentId: DocumentId | null;
  books: BookMetadata[];
  documents: DocumentMetadata[];
}

export type ReorderDocumentDirection = 'down' | 'up';

export function createDocumentSession(input: CreateDocumentMetadataInput): DocumentSession {
  const document = createDocumentMetadata(input);
  const book = createBookMetadata({ id: document.bookId, now: input.now });

  return {
    activeBookId: document.bookId,
    activeDocumentId: document.id,
    books: [book],
    documents: [document],
  };
}

export function createDocumentSessionFromDocuments(documents: DocumentMetadata[]): DocumentSession {
  return createDocumentSessionFromBooksAndDocuments([], documents);
}

export function createDocumentSessionFromBooksAndDocuments(
  books: BookMetadata[],
  documents: DocumentMetadata[],
): DocumentSession {
  const sortedDocuments = sortDocuments(documents);
  const activeDocument = sortedDocuments[0];

  if (!activeDocument && books.length === 0) {
    throw new Error('Document session needs at least one book or document');
  }

  const activeBook =
    books.find(({ id }) => id === activeDocument?.bookId) ??
    books[0] ??
    createBookMetadata({
      id: activeDocument?.bookId ?? 'book_default',
      now: activeDocument?.createdAt ?? new Date().toISOString(),
    });

  return {
    activeBookId: activeBook.id,
    activeDocumentId: activeDocument?.id ?? null,
    books: books.some(({ id }) => id === activeBook.id) ? books : [activeBook, ...books],
    documents: sortedDocuments,
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
    activeDocumentId: document.id,
    documents: sortDocuments([...session.documents, document]),
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
    activeDocumentId: documentId,
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

  return {
    ...session,
    activeBookId: bookId,
    activeDocumentId: activeDocument?.id ?? null,
  };
}

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
    (candidate) => candidate.bookId === document.bookId && candidate.kind === document.kind,
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

export function getActiveBook(session: DocumentSession): BookMetadata {
  const book = session.books.find((book) => book.id === session.activeBookId);

  if (!book) {
    throw new Error(`Active book not found: ${session.activeBookId}`);
  }

  return book;
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

function sortDocuments(documents: DocumentMetadata[]): DocumentMetadata[] {
  return [...documents].sort((first, second) => {
    if (first.bookId !== second.bookId) {
      return first.bookId.localeCompare(second.bookId);
    }

    if (first.order !== second.order) {
      return first.order - second.order;
    }

    return first.createdAt.localeCompare(second.createdAt);
  });
}
