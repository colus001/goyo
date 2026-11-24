import type { DocumentSession } from '@writer/core';

export type MobileWorkspaceStatus =
  | 'Loading local library'
  | 'Ready'
  | 'Save failed'
  | 'Saving'
  | 'Sync pending'
  | 'Sync failed'
  | 'Syncing'
  | 'Synced';
export type MobileWorkspaceScreen = 'book' | 'editor' | 'home' | 'settings';

export interface MobileWorkspaceState {
  activeDocumentBody: string;
  clientId: string | null;
  createBook(): void;
  createChapter(): void;
  createEpisode(chapterId: string | null): Promise<string | null>;
  flushActiveDocumentBody(): Promise<boolean>;
  goBackToBook(): void;
  isActiveDocumentBodyEditable: boolean;
  isLoading: boolean;
  moveEpisode(documentId: string, chapterId: string | null): Promise<boolean>;
  openBook(bookId: string): void;
  openDocument(documentId: string): void;
  openSettings(): void;
  pendingBodySave: boolean;
  saveActiveDocumentBody(text: string): void;
  settingsReturnScreen: Exclude<MobileWorkspaceScreen, 'settings'>;
  renameActiveDocumentTitle(title: string): void;
  screen: MobileWorkspaceScreen;
  showHome(): void;
  session: DocumentSession | null;
  startQuickDraft(): void;
  status: MobileWorkspaceStatus;
  syncNow(token: string | null): void;
}
