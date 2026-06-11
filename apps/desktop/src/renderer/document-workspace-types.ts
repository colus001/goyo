import type {
  BookMetadata,
  ChapterMetadata,
  DocumentKind,
  DocumentMetadata,
  DocumentSession,
} from '@writer/core';

export type SaveStatus =
  | 'Loading local documents'
  | 'Saved locally'
  | 'Saving locally'
  | 'Save failed';
export type WorkspaceScreen = 'book' | 'library' | 'loading';
export type DocumentUpdateMap = Record<string, Uint8Array[]>;

export interface WritingWorkspaceState {
  activeBook: BookMetadata | null;
  activeChapter: ChapterMetadata | null;
  activeDocument: DocumentMetadata | null;
  createBook: () => void;
  createChapter: () => void;
  createDocument: (kind: DocumentKind) => void;
  createDocumentInChapter: (chapterId: string, kind: DocumentKind) => void;
  createEpisodeAfter: (chapterId: string, previousDocumentId: string | null) => void;
  deleteBook: (bookId: string) => void;
  deleteChapter: (chapterId: string) => void;
  deleteDocument: (documentId: string) => void;
  documentUpdates: DocumentUpdateMap;
  moveDocument: (documentId: string, direction: 'down' | 'up') => void;
  openDocument: (documentId: string) => void;
  recordDocumentUpdate: (update: Uint8Array) => void;
  renameBook: (title: string) => void;
  renameChapterTitle: (title: string) => void;
  renameDocumentTitle: (title: string) => void;
  saveStatus: SaveStatus;
  screen: WorkspaceScreen;
  selectBook: (bookId: string) => void;
  selectChapter: (chapterId: string) => void;
  session: DocumentSession | null;
  showLibrary: () => void;
  startQuickDraft: () => void;
  updateBookAccentColor: (bookId: string, accentColor: string) => void;
}
