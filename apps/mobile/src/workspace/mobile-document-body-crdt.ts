import {
  createDocumentSnapshotRecord,
  createDocumentUpdateRecord,
  createSyncQueueItem,
  createYjsCrdtAdapter,
  type DocumentSnapshotRecord,
  type DocumentUpdateRecord,
} from '@writer/core';
import * as Y from 'yjs';
import type { MobileLocalStore } from '../storage/mobile-local-store';

const SNAPSHOT_EVERY_UPDATE_COUNT = 10;
const LEGACY_YJS_TEXT_NAME = 'content';

export async function loadDocumentBodyFromCrdt(
  store: MobileLocalStore,
  documentId: string,
): Promise<string> {
  const { document } = await restoreYjsDocument(store, documentId);
  const fragmentText = yjsFragmentToPlainText(document.document.getXmlFragment(documentId));

  if (fragmentText.length > 0) {
    return fragmentText;
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

  replaceYjsFragmentText(fragment, text);

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
  const updates = snapshot?.lastUpdateId
    ? await store.listDocumentUpdatesAfter(documentId, snapshot.lastUpdateId)
    : await store.listDocumentUpdates(documentId);

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

function replaceYjsFragmentText(fragment: Y.XmlFragment, text: string): void {
  if (fragment.length > 0) {
    fragment.delete(0, fragment.length);
  }

  const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trimEnd());
  const nodes = paragraphs.map((paragraph) => createYjsParagraph(paragraph));

  if (nodes.length > 0) {
    fragment.insert(0, nodes);
  }
}

function createYjsParagraph(text: string): Y.XmlElement {
  const paragraph = new Y.XmlElement('paragraph');
  const paragraphText = new Y.XmlText();

  if (text.length > 0) {
    paragraphText.insert(0, text);
  }

  paragraph.insert(0, [paragraphText]);

  return paragraph;
}

function yjsFragmentToPlainText(fragment: Y.XmlFragment): string {
  return decodeHtmlEntities(
    fragment
      .toString()
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|paragraph|heading|h[1-6]|li|blockquote|pre)>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  );
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
