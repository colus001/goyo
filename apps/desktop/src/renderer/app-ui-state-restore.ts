import {
  type BookMetadata,
  type ChapterMetadata,
  createDocumentSessionFromBooksChaptersAndDocuments,
  type DocumentMetadata,
  type DocumentSession,
  selectActiveBook,
  selectActiveChapter,
  selectActiveDocument,
} from '@writer/core';
import type { AppUiState } from '../shared/app-ui-state';
import type { WorkspaceScreen } from './document-workspace-types';

export interface RestoredWorkspaceState {
  expandedChapterIds: string[];
  isSidebarCollapsed: boolean;
  screen: WorkspaceScreen;
  session: DocumentSession | null;
}

export function restoreWorkspaceState({
  books,
  chapters,
  documents,
  savedState,
}: {
  books: BookMetadata[];
  chapters: ChapterMetadata[];
  documents: DocumentMetadata[];
  savedState: AppUiState | null;
}): RestoredWorkspaceState {
  if (books.length === 0 && chapters.length === 0 && documents.length === 0) {
    return createEmptyRestore(savedState);
  }

  const session = createDocumentSessionFromBooksChaptersAndDocuments(books, chapters, documents);
  const restoredSession = savedState ? restoreSessionSelection(session, savedState) : session;
  const hasSavedActiveBook = savedState
    ? books.some((book) => book.id === savedState.activeBookId)
    : false;

  return {
    expandedChapterIds: selectRestoredExpandedChapterIds(chapters, savedState),
    isSidebarCollapsed: savedState?.isSidebarCollapsed ?? false,
    screen: savedState?.lastScreen === 'book' && hasSavedActiveBook ? 'book' : 'library',
    session: restoredSession,
  };
}

function createEmptyRestore(savedState: AppUiState | null): RestoredWorkspaceState {
  return {
    expandedChapterIds: [],
    isSidebarCollapsed: savedState?.isSidebarCollapsed ?? false,
    screen: 'library',
    session: null,
  };
}

function restoreSessionSelection(
  session: DocumentSession,
  savedState: AppUiState,
): DocumentSession {
  if (
    !savedState.activeBookId ||
    !session.books.some((book) => book.id === savedState.activeBookId)
  ) {
    return session;
  }

  let restoredSession = selectActiveBook(session, savedState.activeBookId);

  if (
    savedState.activeDocumentId &&
    restoredSession.documents.some((document) => document.id === savedState.activeDocumentId)
  ) {
    return selectActiveDocument(restoredSession, savedState.activeDocumentId);
  }

  if (
    savedState.activeChapterId &&
    restoredSession.chapters.some((chapter) => chapter.id === savedState.activeChapterId)
  ) {
    restoredSession = selectActiveChapter(restoredSession, savedState.activeChapterId);
  }

  return restoredSession;
}

function selectRestoredExpandedChapterIds(
  chapters: ChapterMetadata[],
  savedState: AppUiState | null,
): string[] {
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));

  return (savedState?.expandedChapterIds ?? []).filter((chapterId) => chapterIds.has(chapterId));
}
