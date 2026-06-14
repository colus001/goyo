import {
  type DocumentSession,
  getActiveBook,
  getActiveChapterOrNull,
  getActiveDocumentOrNull,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { type AppSettings, DEFAULT_APP_SETTINGS } from '../shared/app-settings';
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
import { persistManualRestorePoint } from './document-workspace-persistence';
import {
  restoreDeletedDocument,
  restoreRecoveryPointAsCopy,
} from './document-workspace-recovery-actions';
import type {
  DocumentSnapshotMap,
  DocumentUpdateMap,
  SaveStatus,
  SyncStatus,
  WorkspaceScreen,
  WritingWorkspaceState,
} from './document-workspace-types';
import { useRemoteSync } from './use-remote-sync';
import { useLoadSyncClientId } from './use-sync-client-id';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: This hook assembles the workspace API from local state and action wiring.
export function useWritingWorkspace(): WritingWorkspaceState {
  const [clientId, setClientId] = useState<string | null>(null);
  const [documentSnapshots, setDocumentSnapshots] = useState<DocumentSnapshotMap>({});
  const [documentUpdates, setDocumentUpdates] = useState<DocumentUpdateMap>({});
  const [expandedChapterIds, setExpandedChapterIds] = useState<string[]>([]);
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [settingsReturnScreen, setSettingsReturnScreen] = useState<WorkspaceScreen>('library');
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
    setAppSettings,
    setExpandedChapterIds,
    setHasLoadedWorkspace,
  );
  useLoadSyncClientId(setClientId, setSaveStatus);
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
    appSettings,
    createBook: () => createBook(setSession, setScreen, setSaveStatus),
    createBookWithDetails: (title, accentColor) =>
      createBookWithDetails(title, accentColor, setSession, setScreen, setSaveStatus),
    createChapter: (title) => createChapter(setSession, setSaveStatus, title),
    createDocument: (kind) => createDocument(kind, setSession, setSaveStatus),
    createDocumentInChapter: (chapterId, kind) =>
      createDocumentInChapter(chapterId, kind, setSession, setSaveStatus),
    createEpisodeAfter: (chapterId, previousDocumentId) =>
      createEpisodeAfter(chapterId, previousDocumentId, setSession, setSaveStatus),
    createManualRestorePoint: (snapshot) => {
      if (!activeDocument || !snapshot) {
        setSaveStatus('Save failed');
        return;
      }

      void persistManualRestorePoint(activeDocument.id, snapshot, setSaveStatus);
    },
    deleteBook: (bookId) => archiveBook(bookId, setSession, setSaveStatus),
    deleteChapter: (chapterId) => archiveChapter(chapterId, setSession, setSaveStatus),
    deleteDocument: (documentId) => archiveDocument(documentId, setSession, setSaveStatus),
    documentSnapshots,
    documentUpdates,
    expandedChapterIds,
    isSidebarCollapsed,
    closeSettings: () =>
      setScreen(settingsReturnScreen === 'settings' ? 'library' : settingsReturnScreen),
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
    restoreRecoveryPointAsCopy: (recoveryPointId) =>
      restoreRecoveryPointAsCopy(recoveryPointId, activeDocument, setSession, setSaveStatus),
    restoreDeletedDocument: (document) =>
      restoreDeletedDocument(document, session, setSession, setSaveStatus),
    saveStatus,
    screen,
    selectBook: (bookId) => selectBook(bookId, setSession, setScreen),
    selectChapter: (chapterId) => selectChapter(chapterId, setSession),
    setExpandedChapterIds,
    setSidebarCollapsed,
    session,
    showLibrary: () => setScreen('library'),
    showSettings: () => {
      if (screen === 'settings') {
        return;
      }

      setSettingsReturnScreen(screen === 'loading' ? 'library' : screen);
      setScreen('settings');
    },
    startQuickDraft: () => startQuickDraft(setSession, setScreen, setSaveStatus),
    syncStatus,
    updateAppSettings: (settings) => updateAppSettings(settings, setAppSettings, setSaveStatus),
    updateBookAccentColor: (bookId, accentColor) =>
      updateBookAccentColor(bookId, accentColor, setSession, setSaveStatus),
  };
}

function useLoadWorkspace(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
  setScreen: (screen: WorkspaceScreen) => void,
  setSidebarCollapsed: (isCollapsed: boolean) => void,
  setAppSettings: (settings: AppSettings) => void,
  setExpandedChapterIds: (chapterIds: string[]) => void,
  setHasLoadedWorkspace: (hasLoadedWorkspace: boolean) => void,
) {
  useEffect(() => {
    let isCancelled = false;

    async function loadWorkspace() {
      const [books, chapters, documents, savedState, settings] = await Promise.all([
        window.writerDesktop.books.list(),
        window.writerDesktop.chapters.list(),
        window.writerDesktop.documents.list(),
        window.writerDesktop.appUiState.get(),
        window.writerDesktop.appSettings.get(),
      ]);

      if (isCancelled) {
        return;
      }

      const restoredState = restoreWorkspaceState({
        books,
        chapters,
        documents,
        savedState,
        settings,
      });

      setAppSettings(settings);
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
    setAppSettings,
    setSidebarCollapsed,
  ]);
}

function updateAppSettings(
  settings: AppSettings,
  setAppSettings: (settings: AppSettings) => void,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  setAppSettings(settings);
  setSaveStatus('Saving locally');

  void window.writerDesktop.appSettings
    .save(settings)
    .then(() => setSaveStatus('Saved locally'))
    .catch(() => setSaveStatus('Save failed'));
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
    if (!hasLoadedWorkspace || screen === 'loading' || screen === 'settings') {
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
