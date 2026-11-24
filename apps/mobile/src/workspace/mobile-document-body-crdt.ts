import {
  createDocumentSnapshotRecord,
  createDocumentUpdateRecord,
  createSyncQueueItem,
  createYjsCrdtAdapter,
  type DocumentSnapshotRecord,
  type DocumentUpdateRecord,
} from '@writer/core';
import type { MobileLocalStore } from '../storage/mobile-local-store';
import { readParagraphText, writeParagraphText } from './mobile-paragraphs';

const SNAPSHOT_EVERY_UPDATE_COUNT = 10;
const LEGACY_YJS_TEXT_NAME = 'content';

export async function loadDocumentBodyFromCrdt(
  store: MobileLocalStore,
  documentId: string,
): Promise<string> {
  const { document } = await restoreYjsDocument(store, documentId);
  const fragment = document.document.getXmlFragment(documentId);

  if (fragment.length > 0) {
    return readParagraphText(fragment);
  }

  const legacyText = document.document.getText(LEGACY_YJS_TEXT_NAME).toString();

  if (legacyText.length > 0) {
    return legacyText;
  }

  return store.getDocumentBody(documentId);
}

export async function saveDocumentBodyAsCrdtUpdate(
  store: MobileLocalStore,
  clientId: string,
  documentId: string,
  text: string,
): Promise<void> {
  const { document, latestUpdateId } = await restoreYjsDocument(store, documentId);
  const stateVector = adapter.encodeStateVector(document);
  const fragment = document.document.getXmlFragment(documentId);

  writeParagraphText(fragment, text);

  const updateBytes = adapter.encodeUpdateSinceStateVector(document, stateVector);
  const now = new Date().toISOString();
  const update = createDocumentUpdateRecord({
    clientId,
    createdAt: now,
    documentId,
    id: createLocalId('update'),
    update: updateBytes,
  });

  if (update.update.byteLength === 0) {
    return;
  }

  await store.appendDocumentUpdate(update);
  await store.enqueueSyncItem(createSyncItem(update, 'document-update'));

  if (await shouldCreateSnapshot(store, documentId, latestUpdateId)) {
    const snapshot = createSnapshot(update, adapter.encodeSnapshot(document));
    await store.saveDocumentSnapshot(snapshot);
    await store.enqueueSyncItem(createSyncItem(snapshot, 'document-snapshot'));
  }
}

const adapter = createYjsCrdtAdapter();

async function restoreYjsDocument(store: MobileLocalStore, documentId: string) {
  const document = adapter.createDocument(documentId);
  const snapshot = await store.getLatestDocumentSnapshot(documentId);
  const updates = await store.listDocumentUpdates(documentId);

  if (snapshot) {
    adapter.applyUpdate(document, snapshot.snapshot);
  }

  for (const update of updates) {
    adapter.applyUpdate(document, update.update);
  }

  return { document, latestUpdateId: updates.at(-1)?.id ?? snapshot?.lastUpdateId ?? null };
}

function createSnapshot(
  update: DocumentUpdateRecord,
  snapshotBytes: Uint8Array,
): DocumentSnapshotRecord {
  return createDocumentSnapshotRecord({
    createdAt: new Date().toISOString(),
    documentId: update.documentId,
    id: createLocalId('snapshot'),
    lastUpdateId: update.id,
    snapshot: snapshotBytes,
  });
}

async function shouldCreateSnapshot(
  store: MobileLocalStore,
  documentId: string,
  latestUpdateId: string | null,
): Promise<boolean> {
  const updatesSinceSnapshot = latestUpdateId
    ? await store.listDocumentUpdatesAfter(documentId, latestUpdateId)
    : await store.listDocumentUpdates(documentId);

  return latestUpdateId === null || updatesSinceSnapshot.length >= SNAPSHOT_EVERY_UPDATE_COUNT;
}

function createSyncItem(
  record: DocumentSnapshotRecord | DocumentUpdateRecord,
  kind: 'document-snapshot' | 'document-update',
) {
  return createSyncQueueItem({
    createdAt: record.createdAt,
    documentId: record.documentId,
    id: createLocalId('sync'),
    kind,
    recordId: record.id,
  });
}

function createLocalId(prefix: string): string {
  const randomValue = Math.random().toString(36).slice(2, 10);

  return `${prefix}_${Date.now().toString(36)}_${randomValue}`;
}
