import {
  type DocumentMetadata,
  type DocumentSession,
  getActiveDocumentOrNull,
  QUICK_DRAFTS_BOOK_ID,
  renameActiveDocument,
  renameBook as renameBookMetadata,
  renameChapter as renameChapterMetadata,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import {
  persistBookMetadata,
  persistChapterMetadata,
  persistDocumentMetadata,
} from './document-workspace-persistence';
import type { SaveStatus } from './document-workspace-types';

export function updateBookAccentColor(
  bookId: string,
  accentColor: string,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  if (bookId === QUICK_DRAFTS_BOOK_ID) {
    return;
  }

  let updatedBook: DocumentSession['books'][number] | null = null;

  setSession((session) => {
    if (!session) {
      return session;
    }

    return {
      ...session,
      books: session.books.map((book) => {
        if (book.id !== bookId || book.accentColor === accentColor) {
          return book;
        }

        updatedBook = { ...book, accentColor, updatedAt: new Date().toISOString() };
        return updatedBook;
      }),
    };
  });

  if (updatedBook) {
    void persistBookMetadata(updatedBook, setSaveStatus);
  }
}

export function renameBook(
  session: DocumentSession | null,
  title: string,
  setSession: (session: DocumentSession) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  if (!session) {
    return;
  }

  const activeBook = session.books.find((book) => book.id === session.activeBookId);

  if (!activeBook) {
    return;
  }

  const updatedBook = renameBookMetadata(activeBook, { now: new Date().toISOString(), title });

  setSession({
    ...session,
    books: session.books.map((book) => (book.id === updatedBook.id ? updatedBook : book)),
  });

  if (updatedBook !== activeBook) {
    void persistBookMetadata(updatedBook, setSaveStatus);
  }
}

export function renameChapterTitle(
  session: DocumentSession | null,
  chapterId: string,
  title: string,
  setSession: (session: DocumentSession) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  if (!session) {
    return;
  }

  const chapter = session.chapters.find((item) => item.id === chapterId);

  if (!chapter) {
    return;
  }

  const updatedChapter = renameChapterMetadata(chapter, { now: new Date().toISOString(), title });

  setSession({
    ...session,
    chapters: session.chapters.map((item) =>
      item.id === updatedChapter.id ? updatedChapter : item,
    ),
  });

  if (updatedChapter !== chapter) {
    void persistChapterMetadata(updatedChapter, setSaveStatus);
  }
}

export function renameDocumentTitle(
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
