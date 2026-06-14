import {
  addChapterToSession,
  addDocumentToSession,
  type BookMetadata,
  type ChapterMetadata,
  createBookMetadata,
  createChapterMetadata,
  createDocumentSessionFromBooksChaptersAndDocuments,
  createDocumentUpdateRecord,
  createQuickDraftsBook,
  createQuickDraftsInboxChapter,
  type DocumentKind,
  type DocumentMetadata,
  type DocumentSession,
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
  reorderDocument,
  selectActiveBook,
  selectActiveChapter,
  selectActiveDocument,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { getNextChapterOrder, getNextDocumentOrder } from './document-workspace-ordering';
import {
  createSnapshotForDocumentUpdate,
  createUntitledDocument,
  persistBookMetadata,
  persistChapterMetadata,
  persistDocumentMetadata,
  persistDocumentUpdate,
} from './document-workspace-persistence';

export {
  renameBook,
  renameChapterTitle,
  renameDocumentTitle,
  updateBookAccentColor,
} from './document-workspace-rename-actions';

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
        return createDocumentSessionFromBooksChaptersAndDocuments([book], [], []);
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
  let nextChapter: ChapterMetadata | null = null;
  let nextDocument: DocumentMetadata | null = null;

  setSession((session) => {
    const now = new Date().toISOString();
    const book =
      session?.books.find((candidate) => candidate.id === QUICK_DRAFTS_BOOK_ID) ??
      createQuickDraftsBook(now);
    const chapter =
      session?.chapters.find((candidate) => candidate.id === QUICK_DRAFTS_INBOX_CHAPTER_ID) ??
      createQuickDraftsInboxChapter(now);
    const documents = session?.documents ?? [];
    const nextOrder = getNextDocumentOrder(book.id, chapter.id, documents, 'draft');
    const document = createUntitledDocument(book.id, chapter.id, nextOrder, 'draft');
    nextBook = book;
    nextChapter = chapter;
    nextDocument = document;

    if (!session) {
      return createDocumentSessionFromBooksChaptersAndDocuments([book], [chapter], [document]);
    }

    const books = session.books.some((candidate) => candidate.id === book.id)
      ? session.books
      : [...session.books, book];

    const chapters = session.chapters.some((candidate) => candidate.id === chapter.id)
      ? session.chapters
      : [...session.chapters, chapter];

    return addDocumentToSession(
      { ...session, activeBookId: book.id, activeChapterId: chapter.id, books, chapters },
      document,
    );
  });

  if (nextBook && nextChapter && nextDocument) {
    const book = nextBook;
    const chapter = nextChapter;
    const document = nextDocument;

    void persistBookMetadata(book, setSaveStatus).then(() =>
      persistChapterMetadata(chapter, setSaveStatus).then(() =>
        persistDocumentMetadata(document, setSaveStatus),
      ),
    );
  }
  setScreen('book');
}

export function createChapter(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
  title?: string,
) {
  let chapter: ChapterMetadata | null = null;

  setSession((session) => {
    if (!session) {
      return session;
    }

    if (session.activeBookId === QUICK_DRAFTS_BOOK_ID) {
      return session;
    }

    chapter = createChapterMetadata({
      bookId: session.activeBookId,
      id: `chapter_${globalThis.crypto.randomUUID()}`,
      now: new Date().toISOString(),
      order: getNextChapterOrder(session.activeBookId, session.chapters),
      title,
    });

    return addChapterToSession(session, chapter);
  });

  if (chapter) {
    void persistChapterMetadata(chapter, setSaveStatus);
  }
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
      session.activeChapterId,
      getNextDocumentOrder(session.activeBookId, session.activeChapterId, session.documents, kind),
      kind,
    );
    return addDocumentToSession(session, document);
  });

  if (document) {
    void persistDocumentMetadata(document, setSaveStatus);
  }
}

export function createDocumentInChapter(
  chapterId: string,
  kind: DocumentKind,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  let document: DocumentMetadata | null = null;

  setSession((session) => {
    if (!session) {
      return session;
    }

    const chapter = session.chapters.find((candidate) => candidate.id === chapterId);

    if (!chapter) {
      return session;
    }

    document = createUntitledDocument(
      chapter.bookId,
      chapter.id,
      getNextDocumentOrder(chapter.bookId, chapter.id, session.documents, kind),
      kind,
    );

    return addDocumentToSession(selectActiveChapter(session, chapter.id), document);
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

export function selectChapter(
  chapterId: string,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
) {
  setSession((session) => (session ? selectActiveChapter(session, chapterId) : session));
}

export function recordDocumentUpdate(
  documentId: string | undefined,
  clientId: string | null,
  update: Uint8Array,
  setSaveStatus: (saveStatus: SaveStatus) => void,
  snapshot?: Uint8Array,
) {
  if (!documentId || !clientId) {
    setSaveStatus('Save failed');
    return;
  }

  const documentUpdate = createDocumentUpdateRecord({
    clientId,
    createdAt: new Date().toISOString(),
    documentId,
    id: `update_${globalThis.crypto.randomUUID()}`,
    update,
  });

  void persistDocumentUpdate(
    documentUpdate,
    setSaveStatus,
    snapshot ? createSnapshotForDocumentUpdate(documentUpdate, snapshot) : undefined,
  );
}
