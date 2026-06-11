import {
  createDocumentSessionFromBooksAndDocuments,
  type DocumentSession,
  getActiveBook,
  getActiveDocumentOrNull,
} from '@writer/core';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import {
  createBook,
  createDocument,
  moveDocument,
  openDocument,
  recordDocumentUpdate,
  renameDraft,
  selectBook,
  startQuickDraft,
} from './document-workspace-actions';
import type {
  DocumentUpdateMap,
  SaveStatus,
  WorkspaceScreen,
  WritingWorkspaceState,
} from './document-workspace-types';

export function useWritingWorkspace(): WritingWorkspaceState {
  const [clientId] = useState(() => `client_${globalThis.crypto.randomUUID()}`);
  const [documentUpdates, setDocumentUpdates] = useState<DocumentUpdateMap>({});
  const [screen, setScreen] = useState<WorkspaceScreen>('loading');
  const [session, setSession] = useState<DocumentSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('Loading local documents');
  const activeDocument = session ? getActiveDocumentOrNull(session) : null;
  const activeBook = session ? getActiveBook(session) : null;

  useLoadDocumentUpdates(activeDocument?.id ?? null, setDocumentUpdates, setSaveStatus);
  useLoadWorkspace(setSession, setSaveStatus, setScreen);

  return {
    activeBook,
    activeDocument,
    createBook: () => createBook(setSession, setScreen, setSaveStatus),
    createDocument: (kind) => createDocument(kind, setSession, setSaveStatus),
    documentUpdates,
    moveDocument: (documentId, direction) =>
      moveDocument(documentId, direction, setSession, setSaveStatus),
    openDocument: (documentId) => openDocument(documentId, setSession),
    recordDocumentUpdate: (update) =>
      recordDocumentUpdate(activeDocument?.id, clientId, update, setSaveStatus),
    renameDraft: (title) => renameDraft(session, activeDocument, title, setSession, setSaveStatus),
    saveStatus,
    screen,
    selectBook: (bookId) => selectBook(bookId, setSession, setScreen),
    session,
    showLibrary: () => setScreen('library'),
    startQuickDraft: () => startQuickDraft(setSession, setScreen, setSaveStatus),
  };
}

function useLoadWorkspace(
  setSession: Dispatch<SetStateAction<DocumentSession | null>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
  setScreen: (screen: WorkspaceScreen) => void,
) {
  useEffect(() => {
    let isCancelled = false;

    async function loadWorkspace() {
      const [books, documents] = await Promise.all([
        window.writerDesktop.books.list(),
        window.writerDesktop.documents.list(),
      ]);

      if (isCancelled) {
        return;
      }

      if (books.length > 0 || documents.length > 0) {
        setSession(createDocumentSessionFromBooksAndDocuments(books, documents));
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

function useLoadDocumentUpdates(
  documentId: string | null,
  setDocumentUpdates: Dispatch<SetStateAction<DocumentUpdateMap>>,
  setSaveStatus: (saveStatus: SaveStatus) => void,
) {
  useEffect(() => {
    if (!documentId) {
      return;
    }

    const loadedDocumentId = documentId;
    let isCancelled = false;

    async function loadDocumentUpdates() {
      const updates = await window.writerDesktop.documentUpdates.list(loadedDocumentId);

      if (!isCancelled) {
        setDocumentUpdates((current) => ({
          ...current,
          [loadedDocumentId]: updates.map(({ update }) => update),
        }));
      }
    }

    void loadDocumentUpdates().catch(() => setSaveStatus('Save failed'));

    return () => {
      isCancelled = true;
    };
  }, [documentId, setDocumentUpdates, setSaveStatus]);
}
