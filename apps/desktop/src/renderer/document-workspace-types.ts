import type {
  BookMetadata,
  ChapterMetadata,
  DocumentKind,
  DocumentMetadata,
  DocumentSession,
} from '@writer/core';
import type { AppSettings } from '../shared/app-settings';

export type SaveStatus =
  | 'Loading local documents'
  | 'Saved locally'
  | 'Saving locally'
  | 'Save failed';
export type SyncStatus =
  | 'Offline'
  | 'Sync idle'
  | 'Sync needs attention'
  | 'Sync pending'
  | 'Synced'
  | 'Syncing';
export type WorkspaceScreen = 'book' | 'library' | 'loading' | 'settings';
export type DocumentSnapshotMap = Record<string, Uint8Array | undefined>;
export type DocumentUpdateMap = Record<string, Uint8Array[]>;

export interface WritingWorkspaceState {
  activeBook: BookMetadata | null;
  activeChapter: ChapterMetadata | null;
  activeDocument: DocumentMetadata | null;
  appSettings: AppSettings;
  createBook: () => void;
  createBookWithDetails: (title: string, accentColor: string) => void;
  createChapter: (title?: string) => void;
  createDocument: (kind: DocumentKind) => void;
  createDocumentInChapter: (chapterId: string, kind: DocumentKind) => void;
  createEpisodeAfter: (chapterId: string | null, previousDocumentId: string | null) => void;
  createManualRestorePoint: (snapshot: Uint8Array | null) => void;
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
  restoreRecoveryPointAsCopy: (recoveryPointId: string) => void;
  restoreDeletedDocument: (document: DocumentMetadata) => void;
  saveStatus: SaveStatus;
  screen: WorkspaceScreen;
  closeSettings: () => void;
  selectBook: (bookId: string) => void;
  selectChapter: (chapterId: string) => void;
  setExpandedChapterIds: (chapterIds: string[]) => void;
  setSidebarCollapsed: (isCollapsed: boolean) => void;
  session: DocumentSession | null;
  showLibrary: () => void;
  showSettings: () => void;
  startQuickDraft: () => void;
  syncStatus: SyncStatus;
  updateAppSettings: (settings: AppSettings) => void;
  updateBookAccentColor: (bookId: string, accentColor: string) => void;
}
