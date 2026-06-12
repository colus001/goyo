import type { DocumentMetadata, DocumentUpdateRecord } from '@writer/core';
import type { DesktopLocalStore } from './document-metadata-store';

const WRITER_API_BASE_URL = 'https://writer-api.seokjun.kim';

interface PushPendingUpdatesResult {
  pushedUpdateCount: number;
  skippedUpdateCount: number;
}

export async function pushPendingDocumentUpdates(
  store: DesktopLocalStore,
): Promise<PushPendingUpdatesResult> {
  const pendingItems = store
    .listPendingSyncItems()
    .filter((item) => item.kind === 'document-update');
  const documentsById = new Map(store.listDocuments().map((document) => [document.id, document]));
  let pushedUpdateCount = 0;
  let skippedUpdateCount = 0;

  for (const item of pendingItems) {
    const document = documentsById.get(item.documentId);
    const update = store
      .listDocumentUpdates(item.documentId)
      .find((candidate) => candidate.id === item.recordId);

    if (!document || !update) {
      skippedUpdateCount += 1;
      continue;
    }

    await pushDocumentMetadata(document);
    await pushDocumentUpdate(update);
    store.markSyncItemCompleted(item.id, new Date().toISOString());
    pushedUpdateCount += 1;
  }

  return { pushedUpdateCount, skippedUpdateCount };
}

async function pushDocumentMetadata(document: DocumentMetadata) {
  await fetchJson(`${WRITER_API_BASE_URL}/v1/documents/${encodeURIComponent(document.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      archivedAt: document.archivedAt,
      bookId: document.bookId,
      chapterId: document.chapterId,
      createdAt: document.createdAt,
      kind: document.kind,
      order: document.order,
      title: document.title,
      updatedAt: document.updatedAt,
    }),
  });
}

async function pushDocumentUpdate(update: DocumentUpdateRecord) {
  await fetchJson(
    `${WRITER_API_BASE_URL}/v1/documents/${encodeURIComponent(update.documentId)}/updates`,
    {
      method: 'POST',
      body: JSON.stringify({
        clientId: update.clientId,
        createdAt: update.createdAt,
        id: update.id,
        updateBase64: Buffer.from(update.update).toString('base64'),
      }),
    },
  );
}

async function fetchJson(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Remote sync request failed with ${response.status}.`);
  }
}
