import * as Y from 'yjs';

export const REMOTE_UPDATE_ORIGIN = 'remote-sync';

export function applyPersistedContent(
  document: Y.Doc,
  updates: Uint8Array[],
  snapshot?: Uint8Array,
) {
  document.transact(() => {
    if (snapshot) Y.applyUpdate(document, snapshot);
    for (const update of updates) Y.applyUpdate(document, update);
  }, REMOTE_UPDATE_ORIGIN);
}
