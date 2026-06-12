import * as Y from 'yjs';
import type { CrdtAdapter, CrdtDocument, CrdtUpdate } from './crdt';

export interface YjsCrdtDocument extends CrdtDocument {
  readonly document: Y.Doc;
}

export function createYjsCrdtAdapter(): CrdtAdapter<YjsCrdtDocument> {
  return {
    applyUpdate(document, update) {
      Y.applyUpdate(document.document, update);
    },
    cloneDocument(document, documentId = document.id) {
      const clone = createYjsCrdtDocument(documentId);
      Y.applyUpdate(clone.document, Y.encodeStateAsUpdate(document.document));

      return clone;
    },
    createDocument(documentId) {
      return createYjsCrdtDocument(documentId);
    },
    encodeSnapshot(document) {
      return Y.encodeStateAsUpdate(document.document);
    },
    encodeStateVector(document) {
      return Y.encodeStateVector(document.document);
    },
    encodeUpdateSinceStateVector(document, stateVector) {
      return Y.encodeStateAsUpdate(document.document, stateVector);
    },
    mergeUpdates(updates) {
      return Y.mergeUpdates(updates);
    },
  };
}

export function getYjsText(document: YjsCrdtDocument, name: string): Y.Text {
  return document.document.getText(name);
}

export function transactYjsTextUpdate(
  document: YjsCrdtDocument,
  write: (text: Y.Text) => void,
  name = 'content',
): CrdtUpdate {
  const before = Y.encodeStateVector(document.document);
  write(document.document.getText(name));

  return Y.encodeStateAsUpdate(document.document, before);
}

function createYjsCrdtDocument(id: string): YjsCrdtDocument {
  return {
    document: new Y.Doc(),
    id,
  };
}

export function areYjsDocumentsEqual(first: YjsCrdtDocument, second: YjsCrdtDocument): boolean {
  const firstState = Y.encodeStateVector(first.document);
  const secondState = Y.encodeStateVector(second.document);

  return compareBytes(firstState, secondState);
}

function compareBytes(first: Uint8Array, second: Uint8Array): boolean {
  if (first.byteLength !== second.byteLength) {
    return false;
  }

  return first.every((byte, index) => byte === second[index]);
}
