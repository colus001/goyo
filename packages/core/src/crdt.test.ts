import { describe, expect, it } from 'vitest';
import {
  areYjsDocumentsEqual,
  createYjsCrdtAdapter,
  getYjsText,
  transactYjsTextUpdate,
  type YjsCrdtDocument,
} from './yjs-crdt';

const adapter = createYjsCrdtAdapter();

describe('CRDT adapter', () => {
  it('replays local updates into the same document state', () => {
    const source = adapter.createDocument('doc_1');
    const updates = [
      insertText(source, 'Hello'),
      insertText(source, ' world'),
      insertText(source, '.'),
    ];
    const replayed = replay('doc_1', updates);

    expect(textContent(replayed)).toBe('Hello world.');
    expect(areYjsDocumentsEqual(replayed, source)).toBe(true);
  });

  it('keeps document state stable when an update is applied more than once', () => {
    const source = adapter.createDocument('doc_1');
    const update = insertText(source, 'Duplicate safe');
    const replayed = replay('doc_1', [update, update]);

    expect(textContent(replayed)).toBe('Duplicate safe');
    expect(areYjsDocumentsEqual(replayed, source)).toBe(true);
  });

  it('converges when dependent updates arrive out of order', () => {
    const source = adapter.createDocument('doc_1');
    const first = insertText(source, 'A');
    const second = insertText(source, 'B');
    const third = insertText(source, 'C');
    const replayed = replay('doc_1', [third, first, second]);

    expect(textContent(replayed)).toBe('ABC');
    expect(areYjsDocumentsEqual(replayed, source)).toBe(true);
  });
});

describe('CRDT adapter snapshots and state vectors', () => {
  it('restores from a snapshot plus later updates', () => {
    const source = adapter.createDocument('doc_1');
    insertText(source, 'Snapshot');
    const snapshot = adapter.encodeSnapshot(source);
    const laterUpdate = insertText(source, ' replay');
    const restored = replay('doc_1', [snapshot, laterUpdate]);

    expect(textContent(restored)).toBe('Snapshot replay');
    expect(areYjsDocumentsEqual(restored, source)).toBe(true);
  });

  it('generates only updates missing from a state vector', () => {
    const source = adapter.createDocument('doc_1');
    const first = insertText(source, 'Known');
    const receiver = replay('doc_1', [first]);
    const receiverState = adapter.encodeStateVector(receiver);

    insertText(source, ' plus missing');
    adapter.applyUpdate(receiver, adapter.encodeUpdateSinceStateVector(source, receiverState));

    expect(textContent(receiver)).toBe('Known plus missing');
    expect(areYjsDocumentsEqual(receiver, source)).toBe(true);
  });
});

describe('CRDT adapter client convergence', () => {
  it('converges after two clients edit the same document concurrently', () => {
    const firstClient = adapter.createDocument('doc_1');
    const secondClient = adapter.createDocument('doc_1');
    const firstUpdate = insertText(firstClient, 'A');
    const secondUpdate = insertText(secondClient, 'B');

    adapter.applyUpdate(firstClient, secondUpdate);
    adapter.applyUpdate(secondClient, firstUpdate);

    expect(textContent(firstClient)).toBe(textContent(secondClient));
    expect(areYjsDocumentsEqual(firstClient, secondClient)).toBe(true);
  });

  it('converges after offline edits reconnect and exchange updates', () => {
    const onlineClient = adapter.createDocument('doc_1');
    const offlineClient = adapter.cloneDocument(onlineClient);
    const onlineUpdates = [insertText(onlineClient, 'Online'), insertText(onlineClient, ' edits')];
    const offlineUpdates = [
      insertText(offlineClient, 'Offline'),
      insertText(offlineClient, ' edits'),
    ];

    for (const update of offlineUpdates) {
      adapter.applyUpdate(onlineClient, update);
    }
    for (const update of onlineUpdates) {
      adapter.applyUpdate(offlineClient, update);
    }

    expect(textContent(onlineClient)).toBe(textContent(offlineClient));
    expect(areYjsDocumentsEqual(onlineClient, offlineClient)).toBe(true);
  });
});

function replay(documentId: string, updates: Uint8Array[]): YjsCrdtDocument {
  const document = adapter.createDocument(documentId);

  for (const update of updates) {
    adapter.applyUpdate(document, update);
  }

  return document;
}

function insertText(document: YjsCrdtDocument, value: string): Uint8Array {
  return transactYjsTextUpdate(document, (text) => {
    text.insert(text.length, value);
  });
}

function textContent(document: YjsCrdtDocument): string {
  return getYjsText(document, 'content').toString();
}
