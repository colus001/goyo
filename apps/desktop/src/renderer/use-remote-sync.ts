import { useEffect } from 'react';
import type { SyncStatus } from './document-workspace-types';

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

        setSyncStatus(
          getCompletedSyncStatus({ snapshotPull, snapshotPush, updatePull, updatePush }),
        );
      } catch {
        setSyncStatus(globalThis.navigator.onLine ? 'Sync pending' : 'Offline');
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
    globalThis.addEventListener('online', handleOnline);
    globalThis.addEventListener('offline', handleOffline);

    return () => {
      globalThis.removeEventListener('online', handleOnline);
      globalThis.removeEventListener('offline', handleOffline);
    };
  }, [setSyncStatus]);
}

function getCompletedSyncStatus({
  snapshotPull,
  snapshotPush,
  updatePull,
  updatePush,
}: {
  snapshotPull: { skippedDocumentCount: number };
  snapshotPush: { skippedSnapshotCount: number };
  updatePull: { skippedDocumentCount: number };
  updatePush: { skippedUpdateCount: number };
}): SyncStatus {
  const hasPendingSyncWork =
    updatePush.skippedUpdateCount > 0 ||
    snapshotPush.skippedSnapshotCount > 0 ||
    updatePull.skippedDocumentCount > 0 ||
    snapshotPull.skippedDocumentCount > 0;

  return hasPendingSyncWork ? 'Sync pending' : 'Synced';
}
