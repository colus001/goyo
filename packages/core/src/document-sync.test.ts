import { describe, expect, it } from 'vitest';
import {
  createDocumentStateVector,
  createMissingDocumentUpdate,
  replayDocumentUpdates,
  restoreDocumentFromSnapshot,
  selectPendingDocumentUpdates,
} from './document-sync';
import { createDocumentUpdateRecord } from './document-updates';
import { createDocumentSnapshotRecord } from './local-store';
import { createSyncQueueItem } from './sync';
import {
  areYjsDocumentsEqual,
  createYjsCrdtAdapter,
  getYjsText,
  transactYjsTextUpdate,
  type YjsCrdtDocument,
} from './yjs-crdt';

const adapter = createYjsCrdtAdapter();

describe('document sync replay', () => {
  it('replays document update records in deterministic order', () => {
    const source = adapter.createDocument('doc_1');
    const first = createUpdateRecord(
      'update_b',
      '2026-06-12T10:00:00.000Z',
      insertText(source, 'A'),
    );
    const second = createUpdateRecord(
      'update_c',
      '2026-06-12T10:00:00.000Z',
      insertText(source, 'B'),
    );
    const third = createUpdateRecord(
      'update_a',
      '2026-06-12T10:01:00.000Z',
      insertText(source, 'C'),
    );

    const replayed = replayDocumentUpdates(adapter, 'doc_1', [third, second, first]);

    expect(textContent(replayed)).toBe('ABC');
    expect(areYjsDocumentsEqual(replayed, source)).toBe(true);
  });

  it('restores from a snapshot record plus later update records', () => {
    const source = adapter.createDocument('doc_1');
    insertText(source, 'Snapshot');
    const snapshot = createDocumentSnapshotRecord({
      createdAt: '2026-06-12T10:01:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_1',
      lastUpdateId: 'update_1',
      snapshot: adapter.encodeSnapshot(source),
    });
    const later = createUpdateRecord(
      'update_2',
      '2026-06-12T10:02:00.000Z',
      insertText(source, ' later'),
    );

    const restored = restoreDocumentFromSnapshot(adapter, snapshot, [later]);

    expect(textContent(restored)).toBe('Snapshot later');
    expect(areYjsDocumentsEqual(restored, source)).toBe(true);
  });
});

describe('document sync state vectors', () => {
  it('creates a state vector from snapshot and update records', () => {
    const source = adapter.createDocument('doc_1');
    insertText(source, 'Known');
    const snapshot = createSnapshot(source);
    const later = createUpdateRecord(
      'update_2',
      '2026-06-12T10:02:00.000Z',
      insertText(source, ' state'),
    );

    const stateVector = createDocumentStateVector(adapter, snapshot, [later]);
    const receiver = adapter.createDocument('doc_1');

    adapter.applyUpdate(receiver, adapter.encodeUpdateSinceStateVector(source, stateVector));

    expect(textContent(receiver)).toBe('');
  });

  it('creates an update missing from another document state vector', () => {
    const source = adapter.createDocument('doc_1');
    const known = createUpdateRecord(
      'update_1',
      '2026-06-12T10:00:00.000Z',
      insertText(source, 'Known'),
    );
    const receiver = replayDocumentUpdates(adapter, 'doc_1', [known]);
    const receiverState = adapter.encodeStateVector(receiver);

    insertText(source, ' missing');
    adapter.applyUpdate(receiver, createMissingDocumentUpdate(adapter, source, receiverState));

    expect(textContent(receiver)).toBe('Known missing');
    expect(areYjsDocumentsEqual(receiver, source)).toBe(true);
  });
});

describe('document sync pending queue selection', () => {
  it('selects unique pending document update records in queue order', () => {
    const updateA = createUpdateRecord('update_a', '2026-06-12T10:00:00.000Z', new Uint8Array([1]));
    const updateB = createUpdateRecord('update_b', '2026-06-12T10:01:00.000Z', new Uint8Array([2]));
    const queue = [
      createQueueItem('sync_b', 'update_b', '2026-06-12T10:01:00.000Z'),
      createQueueItem('sync_a', 'update_a', '2026-06-12T10:00:00.000Z'),
      createQueueItem('sync_duplicate', 'update_a', '2026-06-12T10:02:00.000Z'),
      createSyncQueueItem({
        createdAt: '2026-06-12T10:03:00.000Z',
        documentId: 'doc_1',
        id: 'sync_snapshot',
        kind: 'document-snapshot',
        recordId: 'snapshot_1',
      }),
    ];

    expect(selectPendingDocumentUpdates(queue, [updateB, updateA])).toEqual([updateA, updateB]);
  });
});

function createUpdateRecord(id: string, createdAt: string, update: Uint8Array) {
  return createDocumentUpdateRecord({
    clientId: 'client_1',
    createdAt,
    documentId: 'doc_1',
    id,
    update,
  });
}

function createQueueItem(id: string, recordId: string, createdAt: string) {
  return createSyncQueueItem({
    createdAt,
    documentId: 'doc_1',
    id,
    kind: 'document-update',
    recordId,
  });
}

function createSnapshot(document: YjsCrdtDocument) {
  return createDocumentSnapshotRecord({
    createdAt: '2026-06-12T10:01:00.000Z',
    documentId: 'doc_1',
    id: 'snapshot_1',
    lastUpdateId: 'update_1',
    snapshot: adapter.encodeSnapshot(document),
  });
}

function insertText(document: YjsCrdtDocument, value: string): Uint8Array {
  return transactYjsTextUpdate(document, (text) => {
    text.insert(text.length, value);
  });
}

function textContent(document: YjsCrdtDocument): string {
  return getYjsText(document, 'content').toString();
}
