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
  beginDocumentBodyLoad,
  canEditDocumentBody,
  completeDocumentBodyLoad,
  type DocumentBodyStates,
  failDocumentBodyLoad,
  getDocumentBodyText,
  updateDocumentBodyText,
} from './document-body-state';
import { loadDocumentBodyFromCrdt } from './mobile-document-body-crdt';
import {
  createAndPersistBook,
  createAndPersistChapter,
  createAndPersistEpisode,
  createAndPersistQuickDraft,
  renameAndPersistActiveDocument,
  saveAndPersistDocumentBody,
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
  const [documentBodyStates, setDocumentBodyStates] = useState<DocumentBodyStates>({});
  const [clientId, setClientId] = useState<string | null>(null);
  const [pendingBodySaves, setPendingBodySaves] = useState<PendingBodySave[]>([]);
  const pendingBodySavesRef = useRef<PendingBodySave[]>([]);
  const pendingBodyRevisionRef = useRef(0);
  const [session, setSession] = useState<MobileWorkspaceState['session']>(null);
  const [screen, setScreen] = useState<MobileWorkspaceScreen>('home');
  const [settingsReturnScreen, setSettingsReturnScreen] =
    useState<MobileWorkspaceState['settingsReturnScreen']>('home');
  const [status, setStatus] = useState<MobileWorkspaceStatus>('Loading local library');
  const [syncRevision, setSyncRevision] = useState(0);
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);

  useLoadMobileWorkspace(store, setStore, setSession, setScreen, setStatus, setHasLoadedWorkspace);
  useLoadMobileClientId(store, setClientId, setStatus);
  useLoadActiveDocumentBody(
    store,
    session?.activeDocumentId ?? null,
    syncRevision,
    setDocumentBodyStates,
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
    pendingBodySave: pendingBodySaves.length > 0,
    setSession,
    setStatus,
    setSyncRevision,
    store,
  });
  usePersistMobileUiState({ hasLoadedWorkspace, screen, session, store });

  const activeDocumentId = session?.activeDocumentId ?? null;
  const activeDocumentBody = getDocumentBodyText(documentBodyStates, activeDocumentId);

  return {
    activeDocumentBody,
    clientId,
    createBook: () => void createAndPersistBook(store, session, setSession, setScreen, setStatus),
    createChapter: () => void createAndPersistChapter(store, session, setSession, setStatus),
    createEpisode: (chapterId) =>
      void createAndPersistEpisode(store, session, chapterId, setSession, setScreen, setStatus),
    flushActiveDocumentBody: () =>
      activeDocumentId ? flushPendingBodySave(activeDocumentId) : Promise.resolve(true),
    goBackToBook: () => setScreen(screen === 'settings' ? settingsReturnScreen : 'book'),
    isActiveDocumentBodyEditable: canEditDocumentBody(documentBodyStates, activeDocumentId),
    isLoading: status === 'Loading local library',
    openBook: (bookId) => {
      setScreen('book');
      setSession((current) => (current ? selectActiveBook(current, bookId) : current));
    },
    openDocument: (documentId) => {
      setSession((current) => (current ? selectActiveDocument(current, documentId) : current));
      setScreen('editor');
    },
    openSettings: () => {
      setSettingsReturnScreen(screen === 'settings' ? 'home' : screen);
      setScreen('settings');
    },
    pendingBodySave: pendingBodySaves.length > 0,
    saveActiveDocumentBody: (text) => {
      const documentId = activeDocumentId;

      if (!documentId || !canEditDocumentBody(documentBodyStates, documentId)) {
        return;
      }

      pendingBodyRevisionRef.current += 1;
      setDocumentBodyStates((states) => updateDocumentBodyText(states, documentId, text));
      const nextPendingSaves = queuePendingBodySave(pendingBodySavesRef.current, {
        documentId,
        revision: pendingBodyRevisionRef.current,
        text,
      });
      pendingBodySavesRef.current = nextPendingSaves;
      setPendingBodySaves(nextPendingSaves);
    },
    renameActiveDocumentTitle: (title) =>
      void renameAndPersistActiveDocument(store, session, title, setSession, setStatus),
    screen,
    showHome: () => setScreen('home'),
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
  pendingBodySave,
  setSession,
  setStatus,
  setSyncRevision,
  store,
}: {
  authToken: string | null;
  clientId: string | null;
  pendingBodySave: boolean;
  setSession: Dispatch<SetStateAction<MobileWorkspaceState['session']>>;
  setStatus: (status: MobileWorkspaceStatus) => void;
  setSyncRevision: (update: (revision: number) => number) => void;
  store: MobileLocalStore | null;
}) {
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (!store || !clientId || !authToken || pendingBodySave) {
      return;
    }

    let isCancelled = false;

    async function sync() {
      if (isSyncingRef.current || !store || !clientId || !authToken) {
        return;
      }

      isSyncingRef.current = true;
      setStatus('Syncing');

      try {
        await syncMobileWorkspace({ clientId, store, token: authToken });
        await reloadMobileSession(store, setSession);

        if (!isCancelled) {
          setSyncRevision((revision) => revision + 1);
          setStatus('Synced');
        }
      } catch {
        if (!isCancelled) {
          setStatus('Sync pending');
        }
      } finally {
        isSyncingRef.current = false;
      }
    }

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
  }, [authToken, clientId, pendingBodySave, setSession, setStatus, setSyncRevision, store]);
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

      const savePromise = saveAndPersistDocumentBody(
        store,
        clientId,
        pendingSave.documentId,
        pendingSave.text,
        setStatus,
      )
        .then(() => {
          const nextPendingSaves = completePendingBodySave(
            pendingBodySavesRef.current,
            pendingSave,
          );
          pendingBodySavesRef.current = nextPendingSaves;
          setPendingBodySaves(nextPendingSaves);
        })
        .finally(() => {
          inFlightSavesRef.current.delete(pendingSave.revision);
        });

      inFlightSavesRef.current.set(pendingSave.revision, savePromise);
      return savePromise;
    },
    [clientId, pendingBodySavesRef, setPendingBodySaves, setStatus, store],
  );

  useEffect(() => {
    const pendingSave = pendingBodySaves[0];

    if (!pendingSave) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      void persistPendingSave(pendingSave).catch(() => {
        // Keep the document-scoped save in memory so a later retry cannot lose the text.
      });
    }, 700);

    return () => globalThis.clearTimeout(timeoutId);
  }, [pendingBodySaves, persistPendingSave]);

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
  setDocumentBodyStates: Dispatch<SetStateAction<DocumentBodyStates>>,
  setStatus: (status: MobileWorkspaceStatus) => void,
) {
  useEffect(() => {
    void syncRevision;

    if (!store || !documentId) {
      return;
    }

    const currentStore = store;
    const currentDocumentId = documentId;
    let isCancelled = false;
    setDocumentBodyStates((states) => beginDocumentBodyLoad(states, currentDocumentId));

    async function loadBody() {
      const body = await loadDocumentBodyFromCrdt(currentStore, currentDocumentId);

      if (!isCancelled) {
        setDocumentBodyStates((states) =>
          completeDocumentBodyLoad(states, currentDocumentId, body),
        );
      }
    }

    void loadBody().catch(() => {
      if (!isCancelled) {
        setDocumentBodyStates((states) => failDocumentBodyLoad(states, currentDocumentId));
        setStatus('Save failed');
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [documentId, setDocumentBodyStates, setStatus, store, syncRevision]);
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
