import {
  type BookMetadata,
  type ChapterMetadata,
  type DocumentMetadata,
  type DocumentSession,
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
  selectActiveChapter,
  selectActiveDocument,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import {
  persistBookMetadata,
  persistChapterMetadata,
  persistDocumentMetadata,
} from './document-workspace-persistence';
import type { SaveStatus } from './document-workspace-types';

export function archiveBook(
  bookId: string,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  if (bookId === QUICK_DRAFTS_BOOK_ID) {
    return;
  }

  let archivedBook: BookMetadata | null = null;
  let archivedChapters: ChapterMetadata[] = [];
  let archivedDocuments: DocumentMetadata[] = [];

  setSession((session) => {
    if (!session) {
      return session;
    }

    const book = session.books.find((candidate) => candidate.id === bookId);

    if (!book) {
      return session;
    }

    const now = new Date().toISOString();

    archivedBook = { ...book, archivedAt: now, updatedAt: now };
    archivedChapters = session.chapters
      .filter((chapter) => chapter.bookId === bookId)
      .map((chapter) => ({ ...chapter, archivedAt: now, updatedAt: now }));
    archivedDocuments = session.documents
      .filter((document) => document.bookId === bookId)
      .map((document) => ({ ...document, archivedAt: now, updatedAt: now }));

    const remainingBooks = session.books.filter((candidate) => candidate.id !== bookId);
    const nextActiveBookId = remainingBooks[0]?.id ?? session.activeBookId;

    return {
      ...session,
      activeBookId: session.activeBookId === bookId ? nextActiveBookId : session.activeBookId,
      activeChapterId: session.activeBookId === bookId ? null : session.activeChapterId,
      activeDocumentId: session.activeBookId === bookId ? null : session.activeDocumentId,
      books: remainingBooks,
      chapters: session.chapters.filter((chapter) => chapter.bookId !== bookId),
      documents: session.documents.filter((document) => document.bookId !== bookId),
    };
  });

  if (archivedBook) {
    void persistArchivedBook(archivedBook, archivedChapters, archivedDocuments, setSaveStatus);
  }
}

export function archiveChapter(
  chapterId: string,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  if (chapterId === QUICK_DRAFTS_INBOX_CHAPTER_ID) {
    return;
  }

  let archivedChapter: ChapterMetadata | null = null;
  let archivedDocuments: DocumentMetadata[] = [];

  setSession((session) => {
    if (!session) {
      return session;
    }

    const chapter = session.chapters.find((candidate) => candidate.id === chapterId);

    if (!chapter) {
      return session;
    }

    const now = new Date().toISOString();
    archivedChapter = { ...chapter, archivedAt: now, updatedAt: now };
    archivedDocuments = session.documents
      .filter((document) => document.chapterId === chapterId)
      .map((document) => ({ ...document, archivedAt: now, updatedAt: now }));

    const remainingChapters = session.chapters.filter((candidate) => candidate.id !== chapterId);
    const remainingDocuments = session.documents.filter(
      (document) => document.chapterId !== chapterId,
    );
    const nextChapter = remainingChapters.find((candidate) => candidate.bookId === chapter.bookId);

    return {
      ...session,
      activeChapterId:
        session.activeChapterId === chapterId ? (nextChapter?.id ?? null) : session.activeChapterId,
      activeDocumentId: session.activeChapterId === chapterId ? null : session.activeDocumentId,
      chapters: remainingChapters,
      documents: remainingDocuments,
    };
  });

  if (archivedChapter) {
    void persistArchivedChapter(archivedChapter, archivedDocuments, setSaveStatus);
  }
}

export function archiveDocument(
  documentId: string,
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  let archivedDocument: DocumentMetadata | null = null;

  setSession((session) => {
    if (!session) {
      return session;
    }

    const document = session.documents.find((candidate) => candidate.id === documentId);

    if (!document) {
      return session;
    }

    archivedDocument = {
      ...document,
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const remainingDocuments = session.documents.filter((candidate) => candidate.id !== documentId);
    const nextDocument = remainingDocuments.find(
      (candidate) =>
        candidate.bookId === document.bookId && candidate.chapterId === document.chapterId,
    );
    const nextSession = {
      ...session,
      activeDocumentId: session.activeDocumentId === documentId ? null : session.activeDocumentId,
      documents: remainingDocuments,
    };

    if (session.activeDocumentId !== documentId) {
      return nextSession;
    }

    if (nextDocument) {
      return selectActiveDocument(nextSession, nextDocument.id);
    }

    if (document.chapterId) {
      return selectActiveChapter(nextSession, document.chapterId);
    }

    return {
      ...nextSession,
      activeChapterId: null,
    };
  });

  if (archivedDocument) {
    void persistDocumentMetadata(archivedDocument, setSaveStatus);
  }
}

async function persistArchivedBook(
  book: BookMetadata,
  chapters: ChapterMetadata[],
  documents: DocumentMetadata[],
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const didSaveBook = await persistBookMetadata(book, setSaveStatus);

  if (!didSaveBook) {
    return;
  }

  await Promise.all([
    ...chapters.map((chapter) => persistChapterMetadata(chapter, setSaveStatus)),
    ...documents.map((document) => persistDocumentMetadata(document, setSaveStatus)),
  ]);
}

async function persistArchivedChapter(
  chapter: ChapterMetadata,
  documents: DocumentMetadata[],
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  const didSaveChapter = await persistChapterMetadata(chapter, setSaveStatus);

  if (!didSaveChapter) {
    return;
  }

  await Promise.all(documents.map((document) => persistDocumentMetadata(document, setSaveStatus)));
}
