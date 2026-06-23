import { useEffect } from 'react';
import type { SyncStatus } from './document-workspace-types';

const REMOTE_SYNC_INTERVAL_MS = 15_000;

export function useRemoteSync(setSyncStatus: (syncStatus: SyncStatus) => void) {
  useEffect(() => {
    let isSyncing = false;

    async function syncDocuments() {
      if (isSyncing) {
        return;
      }

      if (!globalThis.navigator.onLine) {
        setSyncStatus('Offline');
        return;
      }

      isSyncing = true;
      setSyncStatus('Syncing');

      try {
        const updatePush = await window.writerDesktop.sync.pushPendingUpdates();
        const snapshotPush = await window.writerDesktop.sync.pushPendingSnapshots();
        const updatePull = await window.writerDesktop.sync.pullRemoteUpdates();
        const snapshotPull = await window.writerDesktop.sync.pullRemoteSnapshots();
        const summary = await window.writerDesktop.sync.getStatusSummary();

        setSyncStatus(
          getCompletedSyncStatus({ snapshotPull, snapshotPush, summary, updatePull, updatePush }),
        );
      } catch {
        void setPendingOrAttentionStatus(setSyncStatus);
      } finally {
        isSyncing = false;
      }
    }

    function handleOnline() {
      void syncDocuments();
    }

    function handleOffline() {
      setSyncStatus('Offline');
    }

    void syncDocuments();
    const intervalId = globalThis.setInterval(syncDocuments, REMOTE_SYNC_INTERVAL_MS);
    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);

    return () => {
      globalThis.clearInterval(intervalId);
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    };
  }, [setSyncStatus]);
}

function getCompletedSyncStatus({
  snapshotPull,
  snapshotPush,
  summary,
  updatePull,
  updatePush,
}: {
  snapshotPull: { skippedDocumentCount: number };
  snapshotPush: { skippedSnapshotCount: number };
  summary: { needsAttention: boolean; pendingItemCount: number };
  updatePull: { skippedDocumentCount: number };
  updatePush: { skippedUpdateCount: number };
}): SyncStatus {
  if (summary.needsAttention) {
    return 'Sync needs attention';
  }

  const hasPendingSyncWork =
    summary.pendingItemCount > 0 ||
    updatePush.skippedUpdateCount > 0 ||
    snapshotPush.skippedSnapshotCount > 0 ||
    updatePull.skippedDocumentCount > 0 ||
    snapshotPull.skippedDocumentCount > 0;

  return hasPendingSyncWork ? 'Sync pending' : 'Synced';
}

async function setPendingOrAttentionStatus(setSyncStatus: (syncStatus: SyncStatus) => void) {
  if (!globalThis.navigator.onLine) {
    setSyncStatus('Offline');
    return;
  }

  try {
    const summary = await window.writerDesktop.sync.getStatusSummary();
    setSyncStatus(summary.needsAttention ? 'Sync needs attention' : 'Sync pending');
  } catch {
    setSyncStatus('Sync pending');
  }
}
