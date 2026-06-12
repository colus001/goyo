import {
  type DocumentSession,
  getActiveBook,
  getActiveChapterOrNull,
  getActiveDocumentOrNull,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { createAppUiState, saveAppUiState } from './app-ui-state-persistence';
import { restoreWorkspaceState } from './app-ui-state-restore';
import {
  createBook,
  createChapter,
  createDocument,
  createDocumentInChapter,
  moveDocument,
  openDocument,
  recordDocumentUpdate,
  renameBook,
  renameChapterTitle,
  renameDocumentTitle,
  selectBook,
  selectChapter,
  startQuickDraft,
  updateBookAccentColor,
} from './document-workspace-actions';
import { createBookWithDetails } from './document-workspace-book-actions';
import { moveChapter } from './document-workspace-chapter-actions';
import { archiveBook, archiveChapter, archiveDocument } from './document-workspace-delete-actions';
import { createEpisodeAfter } from './document-workspace-episode-actions';
import type {
  DocumentSnapshotMap,
  DocumentUpdateMap,
  SaveStatus,
  SyncStatus,
  WorkspaceScreen,
  WritingWorkspaceState,
} from './document-workspace-types';
import { useRemoteSync } from './use-remote-sync';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: This hook assembles the workspace API from local state and action wiring.
export function useWritingWorkspace(): WritingWorkspaceState {
  const [clientId] = useState(() => `client_${globalThis.crypto.randomUUID()}`);
  const [documentSnapshots, setDocumentSnapshots] = useState<DocumentSnapshotMap>({});
  const [documentUpdates, setDocumentUpdates] = useState<DocumentUpdateMap>({});
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [screen, setScreen] = useState<WorkspaceScreen>('loading');
  const [session, setSession] = useState<DocumentSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Loading local documents');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('Sync idle');
  const activeDocument = session ? getActiveDocumentOrNull(session) : null;
  const activeChapter = session ? getActiveChapterOrNull(session) : null;
  const activeBook = session ? getActiveBook(session) : null;

  useLoadDocumentContent(
    activeDocument?.id ?? null,
    setDocumentSnapshots,
    setDocumentUpdates,
    setSaveStatus,
  );
  useLoadWorkspace(
    setSession,
    setSaveStatus,
    setScreen,
    setSidebarCollapsed,
    setExpandedChapterIds,
    setHasLoadedWorkspace,
  );
  useRemoteSync(setSyncStatus);
  usePersistAppUiState({
    expandedChapterIds,
    hasLoadedWorkspace,
    isSidebarCollapsed,
    screen,
    session,
  });

  return {
    activeBook,
    activeChapter,
    activeDocument,
    createBook: () => createBook(setSession, setScreen, setSaveStatus),
    createBookWithDetails: (title, accentColor) =>
      createBookWithDetails(title, accentColor, setSession, setScreen, setSaveStatus),
    createChapter: (title) => createChapter(setSession, setSaveStatus, title),
    createDocument: (kind) => createDocument(kind, setSession, setSaveStatus),
    createDocumentInChapter: (chapterId, kind) =>
      createDocumentInChapter(chapterId, kind, setSession, setSaveStatus),
    createEpisodeAfter: (chapterId, previousDocumentId) =>
      createEpisodeAfter(chapterId, previousDocumentId, setSession, setSaveStatus),
    deleteBook: (bookId) => archiveBook(bookId, setSession, setSaveStatus),
    deleteChapter: (chapterId) => archiveChapter(chapterId, setSession, setSaveStatus),
    deleteDocument: (documentId) => archiveDocument(documentId, setSession, setSaveStatus),
    documentSnapshots,
    documentUpdates,
    expandedChapterIds,
    isSidebarCollapsed,
    moveChapter: (chapterId, direction) =>
      moveChapter(chapterId, direction, setSession, setSaveStatus),
    moveDocument: (documentId, direction) =>
      moveDocument(documentId, direction, setSession, setSaveStatus),
    openDocument: (documentId) => openDocument(documentId, setSession),
    recordDocumentUpdate: (update, snapshot) =>
      recordDocumentUpdate(activeDocument?.id, clientId, update, setSaveStatus, snapshot),
    renameBook: (title) => renameBook(session, title, setSession, setSaveStatus),
    renameChapterTitle: (chapterId, title) =>
      renameChapterTitle(session, chapterId, title, setSession, setSaveStatus),
    renameDocumentTitle: (title) =>
      renameDocumentTitle(session, activeDocument, title, setSession, setSaveStatus),
    saveStatus,
    screen,
    selectBook: (bookId) => selectBook(bookId, setSession, setScreen),
    selectChapter: (chapterId) => selectChapter(chapterId, setSession),
    setExpandedChapterIds,
    setSidebarCollapsed,
    session,
    showLibrary: () => setScreen('library'),
    startQuickDraft: () => startQuickDraft(setSession, setScreen, setSaveStatus),
    syncStatus,
    updateBookAccentColor: (bookId, accentColor) =>
      updateBookAccentColor(bookId, accentColor, setSession, setSaveStatus),
  };
}

function useLoadWorkspace(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
  setScreen: (screen: WorkspaceScreen) => void,
  setSidebarCollapsed: (isCollapsed: boolean) => void,
  setExpandedChapterIds: (chapterIds: string[]) => void,
  setHasLoadedWorkspace: (hasLoadedWorkspace: boolean) => void,
) {
  useEffect(() => {
    let isCancelled = false;

    async function loadWorkspace() {
      const [books, chapters, documents, savedState] = await Promise.all([
        window.writerDesktop.books.list(),
        window.writerDesktop.chapters.list(),
        window.writerDesktop.documents.list(),
        window.writerDesktop.appUiState.get(),
      ]);

      if (isCancelled) {
        return;
      }

      const restoredState = restoreWorkspaceState({ books, chapters, documents, savedState });

      setSession(restoredState.session);
      setSidebarCollapsed(restoredState.isSidebarCollapsed);
      setExpandedChapterIds(restoredState.expandedChapterIds);
      setSaveStatus('Saved locally');
      setScreen(restoredState.screen);
      setHasLoadedWorkspace(true);
    }

    void loadWorkspace().catch(() => setSaveStatus('Save failed'));

    return () => {
      isCancelled = true;
    };
  }, [
    setExpandedChapterIds,
    setHasLoadedWorkspace,
    setSaveStatus,
    setScreen,
    setSession,
    setSidebarCollapsed,
  ]);
}

function usePersistAppUiState({
  expandedChapterIds,
  hasLoadedWorkspace,
  isSidebarCollapsed,
  screen,
  session,
}: {
  expandedChapterIds: string[];
  hasLoadedWorkspace: boolean;
  isSidebarCollapsed: boolean;
  screen: WorkspaceScreen;
  session: DocumentSession | null;
}) {
  useEffect(() => {
    if (!hasLoadedWorkspace || screen === 'loading') {
      return;
    }

    saveAppUiState(createAppUiState({ expandedChapterIds, isSidebarCollapsed, screen, session }));
  }, [expandedChapterIds, hasLoadedWorkspace, isSidebarCollapsed, screen, session]);
}

function useLoadDocumentContent(
  documentId: string | null,
  setDocumentSnapshots: Dispatch<SetStateAction<DocumentSnapshotMap>>,
  setDocumentUpdates: Dispatch<SetStateAction<DocumentUpdateMap>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  useEffect(() => {
    if (!documentId) {
      return;
    }

    const loadedDocumentId = documentId;
    let isCancelled = false;

    async function loadDocumentContent() {
      const snapshot = await window.writerDesktop.documentSnapshots.getLatest(loadedDocumentId);
      const updates = snapshot?.lastUpdateId
        ? await window.writerDesktop.documentUpdates.listAfter(
            loadedDocumentId,
            snapshot.lastUpdateId,
          )
        : await window.writerDesktop.documentUpdates.list(loadedDocumentId);

      if (!isCancelled) {
        setDocumentSnapshots((current) => ({
          ...current,
          [loadedDocumentId]: snapshot?.snapshot,
        }));
        setDocumentUpdates((current) => ({
          ...current,
          [loadedDocumentId]: updates.map(({ update }) => update),
        }));
      }
    }

    void loadDocumentContent().catch(() => setSaveStatus('Save failed'));

    return () => {
      isCancelled = true;
    };
  }, [documentId, setDocumentSnapshots, setDocumentUpdates, setSaveStatus]);
}
