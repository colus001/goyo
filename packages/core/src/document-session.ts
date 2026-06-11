import type { BookId, DocumentId } from '@writer/shared'
import { type BookMetadata, createBookMetadata } from './books'
import {
  type CreateDocumentMetadataInput,
  createDocumentMetadata,
  type DocumentMetadata,
  type RenameDocumentInput,
  renameDocument,
} from './documents'

export interface DocumentSession {
  activeBookId: BookId
  activeDocumentId: DocumentId
  books: BookMetadata[]
  documents: DocumentMetadata[]
}

export function createDocumentSession(input: CreateDocumentMetadataInput): DocumentSession {
  const document = createDocumentMetadata(input)
  const book = createBookMetadata({ id: document.bookId, now: input.now })

  return {
    activeBookId: document.bookId,
    activeDocumentId: document.id,
    books: [book],
    documents: [document],
  }
}

export function createDocumentSessionFromDocuments(documents: DocumentMetadata[]): DocumentSession {
  return createDocumentSessionFromBooksAndDocuments([], documents)
}

export function createDocumentSessionFromBooksAndDocuments(
  books: BookMetadata[],
  documents: DocumentMetadata[],
): DocumentSession {
  const activeDocument = documents[0]

  if (!activeDocument) {
    throw new Error('Document session needs at least one document')
  }

  const activeBook =
    books.find(({ id }) => id === activeDocument.bookId) ??
    createBookMetadata({
      id: activeDocument.bookId,
      now: activeDocument.createdAt,
    })

  return {
    activeBookId: activeBook.id,
    activeDocumentId: activeDocument.id,
    books: books.some(({ id }) => id === activeBook.id) ? books : [activeBook, ...books],
    documents: sortDocuments(documents),
  }
}

export function createDraftInSession(
  session: DocumentSession,
  input: CreateDocumentMetadataInput,
): DocumentSession {
  const document = createDocumentMetadata(input)

  return addDocumentToSession(session, document)
}

export function addDocumentToSession(
  session: DocumentSession,
  document: DocumentMetadata,
): DocumentSession {
  const existingDocument = session.documents.find(({ id }) => id === document.id)

  if (existingDocument) {
    return selectActiveDocument(session, document.id)
  }

  return {
    ...session,
    activeBookId: document.bookId,
    activeDocumentId: document.id,
    documents: sortDocuments([...session.documents, document]),
  }
}

export function renameActiveDocument(
  session: DocumentSession,
  input: RenameDocumentInput,
): DocumentSession {
  return {
    ...session,
    documents: session.documents.map((document) => {
      if (document.id !== session.activeDocumentId) {
        return document
      }

      return renameDocument(document, input)
    }),
  }
}

export function selectActiveDocument(
  session: DocumentSession,
  documentId: DocumentId,
): DocumentSession {
  if (session.activeDocumentId === documentId) {
    return session
  }

  const document = session.documents.find((document) => document.id === documentId)

  if (!document) {
    return session
  }

  return {
    ...session,
    activeBookId: document.bookId,
    activeDocumentId: documentId,
  }
}

export function getActiveBook(session: DocumentSession): BookMetadata {
  const book = session.books.find((book) => book.id === session.activeBookId)

  if (!book) {
    throw new Error(`Active book not found: ${session.activeBookId}`)
  }

  return book
}

export function getActiveDocument(session: DocumentSession): DocumentMetadata {
  const document = session.documents.find((document) => document.id === session.activeDocumentId)

  if (!document) {
    throw new Error(`Active document not found: ${session.activeDocumentId}`)
  }

  return document
}

function sortDocuments(documents: DocumentMetadata[]): DocumentMetadata[] {
  return [...documents].sort((first, second) => {
    if (first.bookId !== second.bookId) {
      return first.bookId.localeCompare(second.bookId)
    }

    if (first.order !== second.order) {
      return first.order - second.order
    }

    return first.createdAt.localeCompare(second.createdAt)
  })
}
