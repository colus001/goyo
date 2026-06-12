import { describe, expect, it } from 'vitest';
import { createDocumentSnapshotRecord } from './local-store';

describe('local document store records', () => {
  it('creates a document snapshot record with a stable id', () => {
    const snapshot = new Uint8Array([1, 2, 3]);

    expect(
      createDocumentSnapshotRecord({
        createdAt: '2026-06-12T10:00:00.000Z',
        documentId: 'doc_1',
        id: 'snapshot_1',
        lastUpdateId: 'update_1',
        snapshot,
      }),
    ).toEqual({
      createdAt: '2026-06-12T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_1',
      lastUpdateId: 'update_1',
      snapshot,
    });
  });
});
