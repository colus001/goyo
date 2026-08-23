import { describe, expect, it } from 'vitest';
import {
  completePendingBodySave,
  flushPendingBodySaves,
  type PendingBodySave,
  queuePendingBodySave,
} from './pending-body-save';

describe('pending body saves', () => {
  it('keeps pending text scoped to each document', () => {
    const documentA = createPendingSave('document-a', 'Text for A', 1);
    const documentB = createPendingSave('document-b', 'Text for B', 2);

    expect(queuePendingBodySave(queuePendingBodySave([], documentA), documentB)).toEqual([
      documentA,
      documentB,
    ]);
  });

  it('replaces only the pending text for the edited document', () => {
    const documentA = createPendingSave('document-a', 'Older A', 1);
    const documentB = createPendingSave('document-b', 'Text for B', 2);
    const newerDocumentA = createPendingSave('document-a', 'Newer A', 3);

    expect(queuePendingBodySave([documentA, documentB], newerDocumentA)).toEqual([
      newerDocumentA,
      documentB,
    ]);
  });

  it('does not clear newer text when an older save finishes', () => {
    const olderSave = createPendingSave('document-a', 'Older A', 1);
    const newerSave = createPendingSave('document-a', 'Newer A', 2);

    expect(completePendingBodySave([newerSave], olderSave)).toEqual([newerSave]);
    expect(completePendingBodySave([newerSave], newerSave)).toEqual([]);
  });
});

describe('pending body save flush', () => {
  it('flushes every revision queued for a document before navigation', async () => {
    let pendingSaves = [createPendingSave('document-a', 'First A', 1)];
    const persistedTexts: string[] = [];

    const didFlush = await flushPendingBodySaves(
      'document-a',
      () => pendingSaves,
      async (pendingSave) => {
        persistedTexts.push(pendingSave.text);
        pendingSaves = completePendingBodySave(pendingSaves, pendingSave);

        if (pendingSave.revision === 1) {
          pendingSaves = queuePendingBodySave(
            pendingSaves,
            createPendingSave('document-a', 'Second A', 2),
          );
        }
      },
    );

    expect(didFlush).toBe(true);
    expect(persistedTexts).toEqual(['First A', 'Second A']);
  });

  it('blocks navigation when a pending save fails', async () => {
    const pendingSave = createPendingSave('document-a', 'Text for A', 1);

    const didFlush = await flushPendingBodySaves(
      'document-a',
      () => [pendingSave],
      async () => {
        throw new Error('SQLite write failed');
      },
    );

    expect(didFlush).toBe(false);
  });
});

function createPendingSave(documentId: string, text: string, revision: number): PendingBodySave {
  return { documentId, revision, text };
}
