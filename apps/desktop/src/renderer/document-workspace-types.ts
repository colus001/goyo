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
export type SyncStatus = 'Offline' | 'Sync idle' | 'Sync pending' | 'Synced' | 'Syncing';
export type WorkspaceScreen = 'book' | 'library' | 'loading';
export type DocumentSnapshotMap = Record<string, Uint8Array | undefined>;
export type DocumentUpdateMap = Record<string, Uint8Array[]>;

export interface WritingWorkspaceState {
  activeBook: BookMetadata | null;
  activeChapter: ChapterMetadata | null;
  activeDocument: DocumentMetadata | null;
  createBook: () => void;
  createBookWithDetails: (title: string, accentColor: string) => void;
  createChapter: (title?: string) => void;
  createDocument: (kind: DocumentKind) => void;
  createDocumentInChapter: (chapterId: string, kind: DocumentKind) => void;
  createEpisodeAfter: (chapterId: string | null, previousDocumentId: string | null) => void;
  deleteBook: (bookId: string) => void;
  deleteChapter: (chapterId: string) => void;
  deleteDocument: (documentId: string) => void;
  documentSnapshots: DocumentSnapshotMap;
  documentUpdates: DocumentUpdateMap;
  expandedChapterIds: string[];
  isSidebarCollapsed: boolean;
  moveChapter: (chapterId: string, direction: 'down' | 'up') => void;
  moveDocument: (documentId: string, direction: 'down' | 'up') => void;
  openDocument: (documentId: string) => void;
  recordDocumentUpdate: (update: Uint8Array, snapshot?: Uint8Array) => void;
  renameBook: (title: string) => void;
  renameChapterTitle: (chapterId: string, title: string) => void;
  renameDocumentTitle: (title: string) => void;
  saveStatus: SaveStatus;
  screen: WorkspaceScreen;
  selectBook: (bookId: string) => void;
  selectChapter: (chapterId: string) => void;
  setExpandedChapterIds: (chapterIds: string[]) => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  session: DocumentSession | null;
  showLibrary: () => void;
  startQuickDraft: () => void;
  syncStatus: SyncStatus;
  updateBookAccentColor: (bookId: string, accentColor: string) => void;
}
