import type { DocumentId } from '@writer/shared';
import type { DocumentSnapshotRecord } from './local-store';
import type { DocumentUpdateRecord, SyncQueueItem } from './sync';

export type RecoveryPointKind = 'automatic-checkpoint' | 'manual-restore-point' | 'remote-snapshot';

export interface RecoveryPoint {
  id: string;
  documentId: DocumentId;
  snapshotId: string;
  kind: RecoveryPointKind;
  label: string;
  createdAt: string;
  updateCountAtCreation: number;
}

export interface CreateRecoveryPointInput {
  createdAt: string;
  documentId: DocumentId;
  id: string;
  kind: RecoveryPointKind;
  label: string;
  snapshotId: string;
  updateCountAtCreation: number;
}

export interface RecoveryPolicy {
  minimumUpdateCountSinceLastCheckpoint: number;
  minimumMinutesSinceLastCheckpoint: number;
}

export interface AutomaticCheckpointInput {
  lastRecoveryPointAt: string | null;
  now: string;
  updateCountSinceLastCheckpoint: number;
}

export interface CompactionPolicyInput {
  latestSnapshot: DocumentSnapshotRecord | null;
  pendingSyncItems: SyncQueueItem[];
  updates: DocumentUpdateRecord[];
}

export const DEFAULT_RECOVERY_POLICY: RecoveryPolicy = {
  minimumMinutesSinceLastCheckpoint: 10,
  minimumUpdateCountSinceLastCheckpoint: 50,
};

export function createRecoveryPoint(input: CreateRecoveryPointInput): RecoveryPoint {
  return {
    createdAt: input.createdAt,
    documentId: input.documentId,
    id: input.id,
    kind: input.kind,
    label: input.label,
    snapshotId: input.snapshotId,
    updateCountAtCreation: input.updateCountAtCreation,
  };
}

export function shouldCreateAutomaticCheckpoint(
  input: AutomaticCheckpointInput,
  policy: RecoveryPolicy = DEFAULT_RECOVERY_POLICY,
): boolean {
  if (input.updateCountSinceLastCheckpoint >= policy.minimumUpdateCountSinceLastCheckpoint) {
    return true;
  }

  if (!input.lastRecoveryPointAt) {
    return input.updateCountSinceLastCheckpoint > 0;
  }

  return (
    minutesBetween(input.lastRecoveryPointAt, input.now) >= policy.minimumMinutesSinceLastCheckpoint
  );
}

export function sortRecoveryPoints(points: RecoveryPoint[]): RecoveryPoint[] {
  return [...points].sort((first, second) => {
    const createdAtOrder = second.createdAt.localeCompare(first.createdAt);

    if (createdAtOrder !== 0) {
      return createdAtOrder;
    }

    return second.id.localeCompare(first.id);
  });
}

export function selectRecoveryPointsForRetention(
  points: RecoveryPoint[],
  maximumAutomaticCheckpoints: number,
): RecoveryPoint[] {
  const retainedAutomaticCheckpoints = new Set(
    sortRecoveryPoints(points)
      .filter((point) => point.kind === 'automatic-checkpoint')
      .slice(0, maximumAutomaticCheckpoints)
      .map((point) => point.id),
  );

  return sortRecoveryPoints(
    points.filter(
      (point) =>
        point.kind !== 'automatic-checkpoint' || retainedAutomaticCheckpoints.has(point.id),
    ),
  );
}

export function selectCompactableDocumentUpdates({
  latestSnapshot,
  pendingSyncItems,
  updates,
}: CompactionPolicyInput): DocumentUpdateRecord[] {
  if (!latestSnapshot?.lastUpdateId) {
    return [];
  }

  const pendingUpdateIds = new Set(
    pendingSyncItems.filter((item) => item.kind === 'document-update').map((item) => item.recordId),
  );
  const compactableUpdates: DocumentUpdateRecord[] = [];

  for (const update of updates) {
    if (pendingUpdateIds.has(update.id)) {
      continue;
    }

    compactableUpdates.push(update);

    if (update.id === latestSnapshot.lastUpdateId) {
      break;
    }
  }

  return compactableUpdates;
}

function minutesBetween(start: string, end: string): number {
  return (Date.parse(end) - Date.parse(start)) / 60_000;
}

export interface LegacyRecoveryPolicy {
  shouldCreateRecoveryPoint(input: {
    documentId: DocumentId;
    lastRecoveryPointAt: string | null;
    now: string;
    unsyncedUpdateCount: number;
  }): boolean;
}
