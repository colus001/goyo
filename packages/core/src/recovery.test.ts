import { describe, expect, it } from 'vitest';
import { createDocumentUpdateRecord } from './document-updates';
import { createDocumentSnapshotRecord } from './local-store';
import {
  createRecoveryPoint,
  selectCompactableDocumentUpdates,
  selectRecoveryPointsForRetention,
  shouldCreateAutomaticCheckpoint,
  sortRecoveryPoints,
} from './recovery';
import { createSyncQueueItem } from './sync';

describe('recovery point creation', () => {
  it('creates snapshot-backed recovery point metadata', () => {
    expect(
      createRecoveryPoint({
        createdAt: '2026-06-13T10:00:00.000Z',
        documentId: 'doc_1',
        id: 'recovery_1',
        kind: 'manual-restore-point',
        label: 'Before rewrite',
        snapshotId: 'snapshot_1',
        updateCountAtCreation: 12,
      }),
    ).toEqual({
      createdAt: '2026-06-13T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'recovery_1',
      kind: 'manual-restore-point',
      label: 'Before rewrite',
      snapshotId: 'snapshot_1',
      updateCountAtCreation: 12,
    });
  });
});

describe('automatic recovery checkpoints', () => {
  it('creates the first checkpoint after an edit', () => {
    expect(
      shouldCreateAutomaticCheckpoint({
        lastRecoveryPointAt: null,
        now: '2026-06-13T10:00:00.000Z',
        updateCountSinceLastCheckpoint: 1,
      }),
    ).toBe(true);
  });

  it('waits when the last checkpoint is recent and update count is low', () => {
    expect(
      shouldCreateAutomaticCheckpoint({
        lastRecoveryPointAt: '2026-06-13T09:55:00.000Z',
        now: '2026-06-13T10:00:00.000Z',
        updateCountSinceLastCheckpoint: 12,
      }),
    ).toBe(false);
  });

  it('creates a checkpoint after enough updates', () => {
    expect(
      shouldCreateAutomaticCheckpoint({
        lastRecoveryPointAt: '2026-06-13T09:59:00.000Z',
        now: '2026-06-13T10:00:00.000Z',
        updateCountSinceLastCheckpoint: 50,
      }),
    ).toBe(true);
  });

  it('creates a checkpoint after enough time', () => {
    expect(
      shouldCreateAutomaticCheckpoint({
        lastRecoveryPointAt: '2026-06-13T09:49:00.000Z',
        now: '2026-06-13T10:00:00.000Z',
        updateCountSinceLastCheckpoint: 2,
      }),
    ).toBe(true);
  });
});

describe('recovery point retention', () => {
  it('sorts newest recovery points first with deterministic id ordering', () => {
    expect(
      sortRecoveryPoints([
        point('recovery_a', '2026-06-13T10:00:00.000Z'),
        point('recovery_b', '2026-06-13T10:00:00.000Z'),
      ]).map(({ id }) => id),
    ).toEqual(['recovery_b', 'recovery_a']);
  });

  it('retains all manual points and only the newest automatic checkpoints', () => {
    const retained = selectRecoveryPointsForRetention(
      [
        point('automatic_old', '2026-06-13T08:00:00.000Z', 'automatic-checkpoint'),
        point('manual_old', '2026-06-13T08:30:00.000Z', 'manual-restore-point'),
        point('automatic_mid', '2026-06-13T09:00:00.000Z', 'automatic-checkpoint'),
        point('automatic_new', '2026-06-13T10:00:00.000Z', 'automatic-checkpoint'),
      ],
      2,
    );

    expect(retained.map(({ id }) => id)).toEqual(['automatic_new', 'automatic_mid', 'manual_old']);
  });
});

describe('update log compaction candidates', () => {
  it('selects updates covered by the latest snapshot', () => {
    const updates = [update('update_1'), update('update_2'), update('update_3')];
    const snapshot = createDocumentSnapshotRecord({
      createdAt: '2026-06-13T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_1',
      lastUpdateId: 'update_2',
      snapshot: new Uint8Array([1]),
    });

    expect(
      selectCompactableDocumentUpdates({
        latestSnapshot: snapshot,
        pendingSyncItems: [],
        updates,
      }).map(({ id }) => id),
    ).toEqual(['update_1', 'update_2']);
  });

  it('does not compact pending local updates', () => {
    const updates = [update('update_1'), update('update_2')];
    const snapshot = createDocumentSnapshotRecord({
      createdAt: '2026-06-13T10:00:00.000Z',
      documentId: 'doc_1',
      id: 'snapshot_1',
      lastUpdateId: 'update_2',
      snapshot: new Uint8Array([1]),
    });

    expect(
      selectCompactableDocumentUpdates({
        latestSnapshot: snapshot,
        pendingSyncItems: [
          createSyncQueueItem({
            createdAt: '2026-06-13T10:00:00.000Z',
            documentId: 'doc_1',
            id: 'sync_update_1',
            kind: 'document-update',
            recordId: 'update_1',
          }),
        ],
        updates,
      }).map(({ id }) => id),
    ).toEqual(['update_2']);
  });

  it('does not compact documents without a snapshot checkpoint', () => {
    expect(
      selectCompactableDocumentUpdates({
        latestSnapshot: null,
        pendingSyncItems: [],
        updates: [update('update_1')],
      }),
    ).toEqual([]);
  });
});

function point(
  id: string,
  createdAt: string,
  kind: 'automatic-checkpoint' | 'manual-restore-point' = 'automatic-checkpoint',
) {
  return createRecoveryPoint({
    createdAt,
    documentId: 'doc_1',
    id,
    kind,
    label: id,
    snapshotId: `snapshot_${id}`,
    updateCountAtCreation: 1,
  });
}

function update(id: string) {
  return createDocumentUpdateRecord({
    clientId: 'client_1',
    createdAt: `2026-06-13T10:00:00.000Z`,
    documentId: 'doc_1',
    id,
    update: new Uint8Array([1]),
  });
}
