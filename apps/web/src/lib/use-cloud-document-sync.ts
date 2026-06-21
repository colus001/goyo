// biome-ignore lint/nursery/noExcessiveLinesPerFile: Cloud document loading, polling, and uploads share one state machine.
import type { WritingEditorRef } from '@writer/editor';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  base64ToUint8Array,
  fetchDocumentContent,
  fetchDocuments,
  fetchDocumentUpdates,
  registerSyncClient,
  uploadDocumentSnapshot,
  uploadDocumentUpdate,
} from './api';
import { getOrCreateWebSyncClientId } from './sync-client';
import type { CloudDocument } from './types';

const REMOTE_PULL_INTERVAL_MS = 4000;

export interface CloudDocumentEditorState {
  document: CloudDocument | null;
  error: string | null;
  initialSnapshot?: Uint8Array;
  initialUpdates: Uint8Array[];
  isReady: boolean;
  syncStatus: string;
}

export interface InitialCloudDocumentState {
  document: CloudDocument;
  initialSnapshot?: Uint8Array;
  initialUpdates: Uint8Array[];
  latestUpdateId: string | null;
}

type StateSetter = Dispatch<SetStateAction<CloudDocumentEditorState>>;
type MutableRef<T> = { current: T };

export function useCloudDocumentSync({
  documentId,
  editorRef,
  enabled,
  initialState,
}: {
  documentId: string;
  editorRef: RefObject<WritingEditorRef | null>;
  enabled: boolean;
  initialState?: InitialCloudDocumentState;
}) {
  const [state, setState] = useState<CloudDocumentEditorState>(() =>
    initialState ? getReadyEditorState(initialState) : getInitialEditorState(),
  );
  const clientIdRef = useRef<string | null>(null);
  const latestRemoteUpdateIdRef = useRef<string | null>(initialState?.latestUpdateId ?? null);
  const isPullingRef = useRef(false);

  useCloudDocumentLoader(
    documentId,
    enabled && !initialState,
    clientIdRef,
    latestRemoteUpdateIdRef,
    setState,
  );
  useWebSyncClientRegistration(enabled && Boolean(initialState), clientIdRef, setState);

  const pullRemoteUpdates = useRemoteUpdatePuller({
    documentId,
    editorRef,
    enabled,
    isPullingRef,
    latestRemoteUpdateIdRef,
    setState,
  });

  useRemoteUpdatePolling(enabled, state, pullRemoteUpdates);

  const onDocumentUpdate = useLocalUpdateUpload(documentId, clientIdRef, setState);

  return { ...state, onDocumentUpdate, pullRemoteUpdates };
}

function getInitialEditorState(): CloudDocumentEditorState {
  return {
    document: null,
    error: null,
    initialUpdates: [],
    isReady: false,
    syncStatus: 'Loading document...',
  };
}

function getReadyEditorState(initialState: InitialCloudDocumentState): CloudDocumentEditorState {
  return {
    document: initialState.document,
    error: null,
    initialSnapshot: initialState.initialSnapshot,
    initialUpdates: initialState.initialUpdates,
    isReady: true,
    syncStatus: 'Ready to write in Goyo Cloud.',
  };
}

function useWebSyncClientRegistration(
  enabled: boolean,
  clientIdRef: MutableRef<string | null>,
  setState: StateSetter,
) {
  useEffect(() => {
    if (!enabled) return;

    const clientId = getOrCreateWebSyncClientId();
    clientIdRef.current = clientId;

    let cancelled = false;

    void registerRequiredSyncClient(clientId).catch((error) => {
      if (cancelled) return;
      setState((current) => ({
        ...current,
        syncStatus: error instanceof Error ? error.message : 'Could not register web sync client.',
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [clientIdRef, enabled, setState]);
}

function useCloudDocumentLoader(
  documentId: string,
  enabled: boolean,
  clientIdRef: MutableRef<string | null>,
  latestRemoteUpdateIdRef: MutableRef<string | null>,
  setState: StateSetter,
) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void loadInitialCloudDocument(documentId, clientIdRef).then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        setState((current) => ({
          ...current,
          error: result.error,
          isReady: true,
          syncStatus: 'Unable to load cloud editor.',
        }));
        return;
      }

      latestRemoteUpdateIdRef.current = result.latestUpdateId;
      setState(result.state);
    });

    return () => {
      cancelled = true;
    };
  }, [clientIdRef, documentId, enabled, latestRemoteUpdateIdRef, setState]);
}

type InitialLoadResult =
  | { latestUpdateId: string | null; ok: true; state: CloudDocumentEditorState }
  | { error: string; ok: false };

async function loadInitialCloudDocument(
  documentId: string,
  clientIdRef: MutableRef<string | null>,
): Promise<InitialLoadResult> {
  try {
    const clientId = getOrCreateWebSyncClientId();
    clientIdRef.current = clientId;
    await registerRequiredSyncClient(clientId);

    const [documentsResult, contentResult] = await Promise.all([
      fetchDocuments(),
      fetchDocumentContent(documentId),
    ]);

    if (!documentsResult.ok) throw new Error(documentsResult.error ?? 'Could not load documents.');
    if (!contentResult.ok)
      throw new Error(contentResult.error ?? 'Could not load document content.');

    const updatesResult = await fetchDocumentUpdates(
      documentId,
      contentResult.snapshotLastUpdateId ?? null,
    );

    if (!updatesResult.ok)
      throw new Error(updatesResult.error ?? 'Could not load document updates.');

    const updates = updatesResult.updates ?? [];
    return {
      latestUpdateId: updates.at(-1)?.id ?? contentResult.snapshotLastUpdateId ?? null,
      ok: true,
      state: {
        document: documentsResult.documents?.find((doc) => doc.id === documentId) ?? null,
        error: null,
        initialSnapshot: contentResult.snapshotBase64
          ? base64ToUint8Array(contentResult.snapshotBase64)
          : undefined,
        initialUpdates: updates.map((update) => base64ToUint8Array(update.updateBase64)),
        isReady: true,
        syncStatus: 'Ready to write in Goyo Cloud.',
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not load document.',
      ok: false,
    };
  }
}

async function registerRequiredSyncClient(clientId: string) {
  const registration = await registerSyncClient(clientId);

  if (!registration.ok) {
    throw new Error(registration.error ?? 'Could not register web sync client.');
  }
}

function useRemoteUpdatePuller({
  documentId,
  editorRef,
  enabled,
  isPullingRef,
  latestRemoteUpdateIdRef,
  setState,
}: {
  documentId: string;
  editorRef: RefObject<WritingEditorRef | null>;
  enabled: boolean;
  isPullingRef: MutableRef<boolean>;
  latestRemoteUpdateIdRef: MutableRef<string | null>;
  setState: StateSetter;
}) {
  return useCallback(async () => {
    const editor = editorRef.current;
    if (!enabled || isPullingRef.current || !editor) return;

    isPullingRef.current = true;

    try {
      await pullAndApplyRemoteUpdates(documentId, editor, latestRemoteUpdateIdRef, setState);
    } finally {
      isPullingRef.current = false;
    }
  }, [documentId, editorRef, enabled, isPullingRef, latestRemoteUpdateIdRef, setState]);
}

async function pullAndApplyRemoteUpdates(
  documentId: string,
  editor: WritingEditorRef,
  latestRemoteUpdateIdRef: MutableRef<string | null>,
  setState: StateSetter,
) {
  const result = await fetchDocumentUpdates(documentId, latestRemoteUpdateIdRef.current);

  if (!result.ok) {
    setState((current) => ({
      ...current,
      syncStatus: result.error ?? 'Could not pull remote edits.',
    }));
    return;
  }

  const updates = result.updates ?? [];

  for (const update of updates) {
    editor.applyUpdate(base64ToUint8Array(update.updateBase64));
    latestRemoteUpdateIdRef.current = update.id;
  }

  if (updates.length > 0) {
    setState((current) => ({ ...current, syncStatus: 'Pulled remote edits.' }));
  }
}

function useRemoteUpdatePolling(
  enabled: boolean,
  state: CloudDocumentEditorState,
  pullRemoteUpdates: () => Promise<void>,
) {
  useEffect(() => {
    if (!enabled || !state.isReady || state.error) return;

    const intervalId = window.setInterval(() => {
      void pullRemoteUpdates();
    }, REMOTE_PULL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [enabled, pullRemoteUpdates, state.error, state.isReady]);
}

function useLocalUpdateUpload(
  documentId: string,
  clientIdRef: MutableRef<string | null>,
  setState: StateSetter,
) {
  return useCallback(
    (update: Uint8Array, snapshot?: Uint8Array) => {
      const clientId = clientIdRef.current;

      if (!clientId) {
        setState((current) => ({ ...current, syncStatus: 'Cloud sync is not ready yet.' }));
        return;
      }

      const updateId = `update_web_${crypto.randomUUID()}`;
      setState((current) => ({ ...current, syncStatus: 'Syncing to Goyo Cloud...' }));
      void uploadLocalDocumentUpdate(documentId, clientId, updateId, update, snapshot, setState);
    },
    [clientIdRef, documentId, setState],
  );
}

async function uploadLocalDocumentUpdate(
  documentId: string,
  clientId: string,
  updateId: string,
  update: Uint8Array,
  snapshot: Uint8Array | undefined,
  setState: StateSetter,
) {
  const result = await uploadDocumentUpdate({ clientId, documentId, update, updateId });

  if (!result.ok) {
    setState((current) => ({
      ...current,
      syncStatus: result.error ?? 'Could not sync this edit. Keep this tab open.',
    }));
    return;
  }

  setState((current) => ({ ...current, syncStatus: 'Saved to Goyo Cloud.' }));

  if (snapshot) {
    void uploadDocumentSnapshot({ documentId, lastUpdateId: updateId, snapshot });
  }
}
