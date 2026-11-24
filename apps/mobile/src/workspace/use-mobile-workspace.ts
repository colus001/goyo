// biome-ignore lint/nursery/noExcessiveLinesPerFile: Mobile workspace state, persistence, and sync wiring stay together until screen state is split.
import {
  createDocumentSessionFromBooksChaptersAndDocuments,
  type DocumentSession,
  selectActiveBook,
  selectActiveDocument,
} from '@writer/core';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  type MobileAppUiState,
  type MobileLocalStore,
  openMobileLocalStore,
} from '../storage/mobile-local-store';
import { syncMobileWorkspace } from '../sync/mobile-remote-sync';
import {
  loadMobileEditorContent,
  type MobileEditorContent,
  persistMobileEditorUpdate,
} from './mobile-editor-content';
import { moveAndPersistEpisode } from './mobile-episode-actions';
import {
  createAndPersistBook,
  createAndPersistChapter,
  createAndPersistEpisode,
  createAndPersistQuickDraft,
  renameAndPersistActiveDocument,
} from './mobile-workspace-actions';
import type {
  MobileWorkspaceScreen,
  MobileWorkspaceState,
  MobileWorkspaceStatus,
} from './mobile-workspace-types';
import {
  completePendingBodySave,
  flushPendingBodySaves,
  type PendingBodySave,
  queuePendingBodySave,
} from './pending-body-save';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: This hook owns mobile workspace state wiring and exposes the app API.
export function useMobileWorkspace(authToken: string | null): MobileWorkspaceState {
  const [store, setStore] = useState<MobileLocalStore | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pendingBodySaves, setPendingBodySaves] = useState<PendingBodySave[]>([]);
  const pendingBodySavesRef = useRef<PendingBodySave[]>([]);
  const pendingBodyRevisionRef = useRef(0);
  const editorFlushes = useRef(new Map<string, () => Promise<boolean>>());
  const [session, setSession] = useState<MobileWorkspaceState['session']>(null);
  const [screen, setScreen] = useState<MobileWorkspaceScreen>('home');
  const [settingsReturnScreen, setSettingsReturnScreen] =
    useState<MobileWorkspaceState['settingsReturnScreen']>('home');
  const [status, setStatus] = useState<MobileWorkspaceStatus>('Loading local library');
  const [syncRevision, setSyncRevision] = useState(0);
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);

  useLoadMobileWorkspace(store, setStore, setSession, setScreen, setStatus, setHasLoadedWorkspace);
  useLoadMobileClientId(store, setClientId, setStatus);
  const activeDocumentId = session?.activeDocumentId ?? null;
  const activeDocumentBody = useLoadActiveDocumentBody(
    store,
    screen === 'editor' ? activeDocumentId : null,
    syncRevision,
    setStatus,
  );
  const flushPendingBodySave = usePersistPendingBody({
    clientId,
    pendingBodySaves,
    pendingBodySavesRef,
    setPendingBodySaves,
    setStatus,
    store,
  });
  useMobileAutoSync({
    authToken,
    clientId,
    setSession,
    setStatus,
    setSyncRevision,
    store,
  });
  usePersistMobileUiState({ hasLoadedWorkspace, screen, session, store });

  const registerEditorFlush = useCallback((documentId: string, flush: () => Promise<boolean>) => {
    editorFlushes.current.set(documentId, flush);
    return () => {
      if (editorFlushes.current.get(documentId) === flush) editorFlushes.current.delete(documentId);
    };
  }, []);
  const recordDocumentUpdate = useCallback((documentId: string, updateBase64: string) => {
    pendingBodyRevisionRef.current += 1;
    const next = queuePendingBodySave(pendingBodySavesRef.current, {
      createdAt: new Date().toISOString(),
      documentId,
      id: createLocalId('update'),
      revision: pendingBodyRevisionRef.current,
      updateBase64,
    });
    pendingBodySavesRef.current = next;
    setPendingBodySaves(next);
  }, []);
  const openBook = useCallback((bookId: string) => {
    setScreen('book');
    setSession((current) => (current ? selectActiveBook(current, bookId) : current));
  }, []);
  const openDocument = useCallback((documentId: string) => {
    setSession((current) => (current ? selectActiveDocument(current, documentId) : current));
    setScreen('editor');
  }, []);
  const showHome = useCallback(() => setScreen('home'), []);

  return {
    activeDocumentBody: clientId ? activeDocumentBody : null,
    clientId,
    createBook: () => void createAndPersistBook(store, session, setSession, setScreen, setStatus),
    createChapter: () => void createAndPersistChapter(store, session, setSession, setStatus),
    createEpisode: (chapterId) =>
      createAndPersistEpisode(store, session, chapterId, setSession, setStatus),
    flushActiveDocumentBody: async () => {
      if (!activeDocumentId) return true;
      const flush = editorFlushes.current.get(activeDocumentId);
      if (flush && !(await flush())) {
        setStatus('Save failed');
        return false;
      }
      return flushPendingBodySave(activeDocumentId);
    },
    goBackToBook: () => setScreen(screen === 'settings' ? settingsReturnScreen : 'book'),
    isLoading: status === 'Loading local library',
    moveEpisode: (documentId, chapterId) =>
      moveAndPersistEpisode(store, session, documentId, chapterId, setSession, setStatus),
    openBook,
    openDocument,
    openSettings: () => {
      setSettingsReturnScreen(screen === 'settings' ? 'home' : screen);
      setScreen('settings');
    },
    pendingBodySave: pendingBodySaves.length > 0,
    recordDocumentUpdate,
    registerEditorFlush,
    renameActiveDocumentTitle: (title) =>
      void renameAndPersistActiveDocument(store, session, title, setSession, setStatus),
    screen,
    showHome,
    session,
    settingsReturnScreen,
    startQuickDraft: () =>
      void createAndPersistQuickDraft(store, session, setSession, setScreen, setStatus),
    status,
    syncNow: (token) =>
      void syncNow(store, clientId, token, setSession, setStatus, setSyncRevision),
  };
}

function useMobileAutoSync({
  authToken,
  clientId,
  setSession,
  setStatus,
  setSyncRevision,
  store,
}: {
  authToken: string | null;
  clientId: string | null;
  setSession: Dispatch<SetStateAction<MobileWorkspaceState['session']>>;
  setStatus: (status: MobileWorkspaceStatus) => void;
  setSyncRevision: (update: (revision: number) => number) => void;
  store: MobileLocalStore | null;
}) {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!store || !clientId || !authToken) {
      return;
    }

    let isCancelled = false;

    const sync = async () => {
      if (isSyncingRef.current) {
        return;
      }

      isSyncingRef.current = true;
      setStatus('Syncing');

      try {
        const result = await syncMobileWorkspace({ clientId, store, token: authToken });
        await reloadMobileSession(store, setSession);

        if (!isCancelled) {
          const bodyChanges = result.pulledSnapshots + result.pulledUpdates;
          setSyncRevision((revision) => revision + Math.min(1, bodyChanges));
          setStatus('Synced');
        }
      } catch {
        if (!isCancelled) {
          setStatus('Sync pending');
        }
      } finally {
        isSyncingRef.current = false;
      }
    };

    void sync();
    const intervalId = globalThis.setInterval(sync, 15_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void sync();
      }
    });

    return () => {
      isCancelled = true;
      globalThis.clearInterval(intervalId);
      subscription.remove();
    };
  }, [authToken, clientId, setSession, setStatus, setSyncRevision, store]);
}

async function syncNow(
  store: MobileLocalStore | null,
  clientId: string | null,
  token: string | null,
  setSession: Dispatch<SetStateAction<MobileWorkspaceState['session']>>,
  setStatus: (status: MobileWorkspaceStatus) => void,
  setSyncRevision: (update: (revision: number) => number) => void,
) {
  if (!store || !clientId || !token) {
    setStatus('Sync failed');
    return;
  }

  setStatus('Syncing');

  try {
    await syncMobileWorkspace({ clientId, store, token });
    await reloadMobileSession(store, setSession);
    setSyncRevision((revision) => revision + 1);
    setStatus('Synced');
  } catch {
    setStatus('Sync failed');
  }
}

async function reloadMobileSession(
  store: MobileLocalStore,
  setSession: Dispatch<SetStateAction<MobileWorkspaceState['session']>>,
) {
  const nextSession = await createSessionFromStore(store);

  setSession((currentSession) => preserveActiveSelection(nextSession, currentSession));
}

function preserveActiveSelection(
  nextSession: DocumentSession | null,
  currentSession: DocumentSession | null,
): DocumentSession | null {
  if (!nextSession || !currentSession) {
    return nextSession;
  }

  if (currentSession.activeDocumentId) {
    const selectedDocument = selectActiveDocument(nextSession, currentSession.activeDocumentId);

    if (selectedDocument.activeDocumentId === currentSession.activeDocumentId) {
      return selectedDocument;
    }
  }

  return selectActiveBook(nextSession, currentSession.activeBookId);
}

function restoreSessionSelection(
  nextSession: DocumentSession | null,
  uiState: MobileAppUiState | null,
): DocumentSession | null {
  if (!nextSession || !uiState) {
    return nextSession;
  }

  if (uiState.activeDocumentId) {
    const selectedDocument = selectActiveDocument(nextSession, uiState.activeDocumentId);

    if (selectedDocument.activeDocumentId === uiState.activeDocumentId) {
      return selectedDocument;
    }
  }

  return uiState.activeBookId ? selectActiveBook(nextSession, uiState.activeBookId) : nextSession;
}

function restoreScreen(
  session: DocumentSession | null,
  uiState: MobileAppUiState | null,
): MobileWorkspaceScreen {
  if (!session || !uiState) {
    return 'home';
  }

  if (
    uiState.screen === 'editor' &&
    uiState.activeDocumentId &&
    session.documents.some((document) => document.id === uiState.activeDocumentId)
  ) {
    return 'editor';
  }

  if (
    uiState.screen === 'book' &&
    uiState.activeBookId &&
    session.books.some((book) => book.id === uiState.activeBookId)
  ) {
    return 'book';
  }

  return 'home';
}

function usePersistMobileUiState({
  hasLoadedWorkspace,
  screen,
  session,
  store,
}: {
  hasLoadedWorkspace: boolean;
  screen: MobileWorkspaceScreen;
  session: MobileWorkspaceState['session'];
  store: MobileLocalStore | null;
}) {
  useEffect(() => {
    if (!hasLoadedWorkspace || !store || screen === 'settings') {
      return;
    }

    void store.saveMobileAppUiState({
      activeBookId: session?.activeBookId ?? null,
      activeDocumentId: session?.activeDocumentId ?? null,
      screen,
    });
  }, [hasLoadedWorkspace, screen, session, store]);
}

function useLoadMobileClientId(
  store: MobileLocalStore | null,
  setClientId: (clientId: string) => void,
  setStatus: (status: MobileWorkspaceStatus) => void,
) {
  useEffect(() => {
    if (!store) {
      return;
    }

    const currentStore = store;
    let isCancelled = false;

    async function loadClientId() {
      const savedClientId = await currentStore.getSyncClientId();
      const nextClientId = savedClientId ?? createLocalId('sync_client');

      if (!savedClientId) {
        await currentStore.saveSyncClientId(nextClientId);
      }

      if (!isCancelled) {
        setClientId(nextClientId);
      }
    }

    void loadClientId().catch(() => !isCancelled && setStatus('Save failed'));

    return () => {
      isCancelled = true;
    };
  }, [setClientId, setStatus, store]);
}

function usePersistPendingBody({
  clientId,
  pendingBodySaves,
  pendingBodySavesRef,
  setPendingBodySaves,
  setStatus,
  store,
}: {
  clientId: string | null;
  pendingBodySaves: PendingBodySave[];
  pendingBodySavesRef: { current: PendingBodySave[] };
  setPendingBodySaves: Dispatch<SetStateAction<PendingBodySave[]>>;
  setStatus: (status: MobileWorkspaceStatus) => void;
  store: MobileLocalStore | null;
}) {
  const inFlightSavesRef = useRef(new Map<number, Promise<void>>());

  const persistPendingSave = useCallback(
    (pendingSave: PendingBodySave): Promise<void> => {
      const existingPromise = inFlightSavesRef.current.get(pendingSave.revision);

      if (existingPromise) {
        return existingPromise;
      }

      if (!store || !clientId) {
        return Promise.reject(new Error('Document persistence is not ready'));
      }
      const savePromise = persistMobileEditorUpdate(store, clientId, pendingSave)
        .then(() => {
          const nextPendingSaves = completePendingBodySave(
            pendingBodySavesRef.current,
            pendingSave,
          );
          pendingBodySavesRef.current = nextPendingSaves;
          setPendingBodySaves(nextPendingSaves);
        })
        .catch((error) => {
          setStatus('Save failed');
          throw error;
        })
        .finally(() => {
          inFlightSavesRef.current.delete(pendingSave.revision);
        });

      inFlightSavesRef.current.set(pendingSave.revision, savePromise);
      return savePromise;
    },
    [clientId, pendingBodySavesRef, setPendingBodySaves, setStatus, store],
  );

  const pendingSave = pendingBodySaves[0];
  useEffect(() => {
    if (!pendingSave) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      void persistPendingSave(pendingSave).catch(() => {
        // Keep this incremental update queued for retry.
      });
    }, 500);
    void persistPendingSave(pendingSave).catch(() => {});

    return () => globalThis.clearInterval(timer);
  }, [pendingSave, persistPendingSave]);

  return (documentId: string) =>
    flushPendingBodySaves(documentId, () => pendingBodySavesRef.current, persistPendingSave);
}

function createLocalId(prefix: string): string {
  const randomValue = Math.random().toString(36).slice(2, 10);

  return `${prefix}_${Date.now().toString(36)}_${randomValue}`;
}

function useLoadActiveDocumentBody(
  store: MobileLocalStore | null,
  documentId: string | null,
  syncRevision: number,
  setStatus: (status: MobileWorkspaceStatus) => void,
) {
  const [body, setBody] = useState<MobileEditorContent | null>(null);
  useEffect(() => {
    void syncRevision;

    if (!store || !documentId) {
      return;
    }

    const currentStore = store;
    const currentDocumentId = documentId;
    let isCancelled = false;
    void loadMobileEditorContent(currentStore, currentDocumentId)
      .then((content) => {
        if (!isCancelled) setBody(content);
      })
      .catch(() => {
        if (!isCancelled) setStatus('Save failed');
      });

    return () => {
      isCancelled = true;
    };
  }, [documentId, setStatus, store, syncRevision]);
  return body?.documentId === documentId ? body : null;
}

function useLoadMobileWorkspace(
  store: MobileLocalStore | null,
  setStore: (store: MobileLocalStore) => void,
  setSession: Dispatch<SetStateAction<MobileWorkspaceState['session']>>,
  setScreen: (screen: MobileWorkspaceScreen) => void,
  setStatus: (status: MobileWorkspaceStatus) => void,
  setHasLoadedWorkspace: (hasLoadedWorkspace: boolean) => void,
) {
  useEffect(() => {
    let isCancelled = false;

    async function loadWorkspace() {
      setStatus('Loading local library');
      const nextStore = store ?? (await openMobileLocalStore());
      const uiState = await nextStore.getMobileAppUiState();
      const nextSession = restoreSessionSelection(await createSessionFromStore(nextStore), uiState);
      if (!isCancelled) {
        setStore(nextStore);
        setSession(nextSession);
        setScreen(restoreScreen(nextSession, uiState));
        setHasLoadedWorkspace(true);
        setStatus('Ready');
      }
    }

    void loadWorkspace().catch(() => !isCancelled && setStatus('Save failed'));

    return () => {
      isCancelled = true;
    };
  }, [setHasLoadedWorkspace, setScreen, setSession, setStatus, setStore, store]);
}

async function createSessionFromStore(store: MobileLocalStore): Promise<DocumentSession | null> {
  const [books, chapters, documents] = await Promise.all([
    store.listBooks(),
    store.listChapters(),
    store.listDocuments(),
  ]);

  return books.length === 0 && chapters.length === 0 && documents.length === 0
    ? null
    : createDocumentSessionFromBooksChaptersAndDocuments(books, chapters, documents);
}
