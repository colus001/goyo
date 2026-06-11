import {
  addDocumentToSession,
  type BookMetadata,
  createBookMetadata,
  createDocumentMetadata,
  createDocumentSessionFromBooksAndDocuments,
  createDocumentUpdateRecord,
  createQuickDraftsBook,
  type DocumentKind,
  type DocumentMetadata,
  type DocumentSession,
  type DocumentUpdateRecord,
  getActiveDocumentOrNull,
  QUICK_DRAFTS_BOOK_ID,
  renameActiveDocument,
  reorderDocument,
  selectActiveBook,
  selectActiveDocument,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import type { SaveStatus, WorkspaceScreen } from './document-workspace-types';

export function createBook(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setScreen: (screen: WorkspaceScreen) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const book = createBookMetadata({
    id: `book_${globalThis.crypto.randomUUID()}`,
    now: new Date().toISOString(),
    title: 'Untitled book',
  });

  void persistBookMetadata(book, setSaveStatus).then((saved) => {
    if (!saved) {
      return;
    }

    setSession((session) => {
      if (!session) {
        return createDocumentSessionFromBooksAndDocuments([book], []);
      }

      return selectActiveBook({ ...session, books: [...session.books, book] }, book.id);
    });
    setScreen('book');
  });
}

export function startQuickDraft(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setScreen: (screen: WorkspaceScreen) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  let nextBook: BookMetadata | null = null;
  let nextDocument: DocumentMetadata | null = null;

  setSession((session) => {
    const now = new Date().toISOString();
    const book =
      session?.books.find((candidate) => candidate.id === QUICK_DRAFTS_BOOK_ID) ??
      createQuickDraftsBook(now);
    const documents = session?.documents ?? [];
    const nextOrder = getNextDocumentOrder(QUICK_DRAFTS_BOOK_ID, documents, 'draft');
    const document = createUntitledDocument(book.id, nextOrder, 'draft');
    nextBook = book;
    nextDocument = document;

    if (!session) {
      return createDocumentSessionFromBooksAndDocuments([book], [document]);
    }

    const books = session.books.some((candidate) => candidate.id === book.id)
      ? session.books
      : [...session.books, book];

    return addDocumentToSession({ ...session, activeBookId: book.id, books }, document);
  });

  if (nextBook && nextDocument) {
    const book = nextBook;
    const document = nextDocument;

    void persistBookMetadata(book, setSaveStatus).then(() =>
      persistDocumentMetadata(document, setSaveStatus),
    );
  }
  setScreen('book');
}

export function createDocument(
  kind: DocumentKind,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  let document: DocumentMetadata | null = null;

  setSession((session) => {
    if (!session) {
      return session;
    }

    document = createUntitledDocument(
      session.activeBookId,
      getNextDocumentOrder(session.activeBookId, session.documents, kind),
      kind,
    );
    return addDocumentToSession(session, document);
  });

  if (document) {
    void persistDocumentMetadata(document, setSaveStatus);
  }
}

export function moveDocument(
  documentId: string,
  direction: 'down' | 'up',
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  setSession((session) => {
    if (!session) {
      return session;
    }

    const reordered = reorderDocument(session, documentId, direction);

    for (const document of reordered.documents) {
      const previous = session.documents.find((candidate) => candidate.id === document.id);
      if (previous && previous.order !== document.order) {
        void persistDocumentMetadata(document, setSaveStatus);
      }
    }

    return reordered;
  });
}

export function openDocument(
  documentId: string,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
) {
  setSession((session) => {
    if (!session) {
      return session;
    }

    return selectActiveDocument(session, documentId);
  });
}

export function selectBook(
  bookId: string,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setScreen: (screen: WorkspaceScreen) => void,
) {
  setSession((session) => (session ? selectActiveBook(session, bookId) : session));
  setScreen('book');
}

export function recordDocumentUpdate(
  documentId: string | undefined,
  clientId: string,
  update: Uint8Array,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  if (!documentId) {
    return;
  }

  const documentUpdate = createDocumentUpdateRecord({
    clientId,
    createdAt: new Date().toISOString(),
    documentId,
    id: `update_${globalThis.crypto.randomUUID()}`,
    update,
  });

  void persistDocumentUpdate(documentUpdate, setSaveStatus);
}

export function renameDraft(
  session: DocumentSession | null,
  activeDocument: DocumentMetadata | null,
  title: string,
  setSession: (session: DocumentSession) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  if (!session || !activeDocument) {
    return;
  }

  const updatedSession = renameActiveDocument(session, { now: new Date().toISOString(), title });
  const updatedDocument = getActiveDocumentOrNull(updatedSession);

  setSession(updatedSession);

  if (updatedDocument && updatedDocument !== activeDocument) {
    void persistDocumentMetadata(updatedDocument, setSaveStatus);
  }
}

async function persistDocumentMetadata(
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

async function persistBookMetadata(
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

async function persistDocumentUpdate(
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

function createUntitledDocument(
  bookId: string,
  order: number,
  kind: DocumentKind,
): DocumentMetadata {
  return createDocumentMetadata({
    bookId,
    id: `doc_${globalThis.crypto.randomUUID()}`,
    kind,
    now: new Date().toISOString(),
    order,
    title: kind === 'chapter' ? 'Untitled chapter' : 'Untitled draft',
  });
}

function getNextDocumentOrder(
  bookId: string,
  documents: DocumentMetadata[],
  kind: DocumentKind,
): number {
  const orders = documents
    .filter((document) => document.bookId === bookId && document.kind === kind)
    .map((document) => document.order);

  return Math.max(-1, ...orders) + 1;
}
