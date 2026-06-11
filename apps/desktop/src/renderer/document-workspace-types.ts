import type { BookMetadata, DocumentKind, DocumentMetadata, DocumentSession } from '@writer/core';

export type SaveStatus =
  | 'Loading local documents'
  | 'Saved locally'
  | 'Saving locally'
  | 'Save failed';
export type WorkspaceScreen = 'book' | 'library' | 'loading';
export type DocumentUpdateMap = Record<string, Uint8Array[]>;

export interface WritingWorkspaceState {
  activeBook: BookMetadata | null;
  activeDocument: DocumentMetadata | null;
  createBook: () => void;
  createDocument: (kind: DocumentKind) => void;
  documentUpdates: DocumentUpdateMap;
  moveDocument: (documentId: string, direction: 'down' | 'up') => void;
  openDocument: (documentId: string) => void;
  recordDocumentUpdate: (update: Uint8Array) => void;
  renameDraft: (title: string) => void;
  saveStatus: SaveStatus;
  screen: WorkspaceScreen;
  selectBook: (bookId: string) => void;
  session: DocumentSession | null;
  showLibrary: () => void;
  startQuickDraft: () => void;
}
