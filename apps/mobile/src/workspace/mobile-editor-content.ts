import {
  createDocumentUpdateRecord,
  createSyncQueueItem,
  createYjsCrdtAdapter,
} from '@writer/core';
import { base64ToBytes, bytesToBase64 } from '@writer/shared';
import type { MobileLocalStore } from '../storage/mobile-local-store';
import type { PendingBodySave } from './pending-body-save';

const adapter = createYjsCrdtAdapter();

export interface MobileEditorContent {
  documentId: string;
  legacyText: string | null;
  stateBase64: string;
}

export async function loadMobileEditorContent(
  store: Pick<
    MobileLocalStore,
    'getDocumentBody' | 'getLatestDocumentSnapshot' | 'listDocumentUpdates'
  >,
  documentId: string,
): Promise<MobileEditorContent> {
  const [snapshot, updates] = await Promise.all([
    store.getLatestDocumentSnapshot(documentId),
    store.listDocumentUpdates(documentId),
  ]);
  const content = adapter.createDocument(documentId);
  if (snapshot) adapter.applyUpdate(content, snapshot.snapshot);
  for (const { update } of updates) adapter.applyUpdate(content, update);

  // Old native-only bodies are shown without writing a second copy into the shared document.
  const legacyText = content.document.getXmlFragment(documentId).length
    ? null
    : content.document.getText('content').toString() || (await store.getDocumentBody(documentId));
  return {
    documentId,
    legacyText: legacyText || null,
    stateBase64: bytesToBase64(adapter.encodeSnapshot(content)),
  };
}

export async function persistMobileEditorUpdate(
  store: Pick<MobileLocalStore, 'saveLocalDocumentUpdate'>,
  clientId: string,
  pending: PendingBodySave,
): Promise<void> {
  const update = createDocumentUpdateRecord({
    clientId,
    createdAt: pending.createdAt,
    documentId: pending.documentId,
    id: pending.id,
    update: base64ToBytes(pending.updateBase64),
  });
  const item = createSyncQueueItem({
    createdAt: update.createdAt,
    documentId: update.documentId,
    id: `sync_${update.id}`,
    kind: 'document-update',
    recordId: update.id,
  });
  await store.saveLocalDocumentUpdate(update, item);
}
