import {
  createDocumentSessionFromBooksChaptersAndDocuments,
  type DocumentSession,
  getActiveBook,
  getActiveChapterOrNull,
  getActiveDocumentOrNull,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
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
  WorkspaceScreen,
  WritingWorkspaceState,
} from './document-workspace-types';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: This hook assembles the workspace API from local state and action wiring.
export function useWritingWorkspace(): WritingWorkspaceState {
  const [clientId] = useState(() => `client_${globalThis.crypto.randomUUID()}`);
  const [documentSnapshots, setDocumentSnapshots] = useState<DocumentSnapshotMap>({});
  const [documentUpdates, setDocumentUpdates] = useState<DocumentUpdateMap>({});
  const [screen, setScreen] = useState<WorkspaceScreen>('loading');
  const [session, setSession] = useState<DocumentSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Loading local documents');
  const activeDocument = session ? getActiveDocumentOrNull(session) : null;
  const activeChapter = session ? getActiveChapterOrNull(session) : null;
  const activeBook = session ? getActiveBook(session) : null;

  useLoadDocumentContent(
    activeDocument?.id ?? null,
    setDocumentSnapshots,
    setDocumentUpdates,
    setSaveStatus,
  );
  useLoadWorkspace(setSession, setSaveStatus, setScreen);
  usePushPendingUpdates();

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
    moveChapter: (chapterId, direction) =>
      moveChapter(chapterId, direction, setSession, setSaveStatus),
    moveDocument: (documentId, direction) =>
      moveDocument(documentId, direction, setSession, setSaveStatus),
    openDocument: (documentId) => openDocument(documentId, setSession),
    recordDocumentUpdate: (update, snapshot) =>
      recordDocumentUpdate(activeDocument?.id, clientId, update, setSaveStatus, snapshot),
    renameBook: (title) => renameBook(session, title, setSession, setSaveStatus),
    renameChapterTitle: (title) => renameChapterTitle(session, title, setSession, setSaveStatus),
    renameDocumentTitle: (title) =>
      renameDocumentTitle(session, activeDocument, title, setSession, setSaveStatus),
    saveStatus,
    screen,
    selectBook: (bookId) => selectBook(bookId, setSession, setScreen),
    selectChapter: (chapterId) => selectChapter(chapterId, setSession),
    session,
    showLibrary: () => setScreen('library'),
    startQuickDraft: () => startQuickDraft(setSession, setScreen, setSaveStatus),
    updateBookAccentColor: (bookId, accentColor) =>
      updateBookAccentColor(bookId, accentColor, setSession, setSaveStatus),
  };
}

function usePushPendingUpdates() {
  useEffect(() => {
    void window.writerDesktop.sync.pushPendingUpdates().catch(() => {
      // Local writes remain safe; failed remote sync stays pending for a later retry.
    });
  }, []);
}

function useLoadWorkspace(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
  setScreen: (screen: WorkspaceScreen) => void,
) {
  useEffect(() => {
    let isCancelled = false;

    async function loadWorkspace() {
      const [books, chapters, documents] = await Promise.all([
        window.writerDesktop.books.list(),
        window.writerDesktop.chapters.list(),
        window.writerDesktop.documents.list(),
      ]);

      if (isCancelled) {
        return;
      }

      if (books.length > 0 || chapters.length > 0 || documents.length > 0) {
        setSession(createDocumentSessionFromBooksChaptersAndDocuments(books, chapters, documents));
      }

      setSaveStatus('Saved locally');
      setScreen('library');
    }

    void loadWorkspace().catch(() => setSaveStatus('Save failed'));

    return () => {
      isCancelled = true;
    };
  }, [setSaveStatus, setScreen, setSession]);
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
