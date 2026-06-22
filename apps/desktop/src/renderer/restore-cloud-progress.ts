import { useEffect } from 'react';

type RestoreCloudPhase =
  | 'books'
  | 'chapters'
  | 'documents'
  | 'sync-clients'
  | 'document-updates'
  | 'document-snapshots';

export function useRestoreCloudProgress(setSyncProgressLabel: (label: string | null) => void) {
  useEffect(() => {
    let clearTimer: ReturnType<typeof window.setTimeout> | undefined;

    const unsubscribe = window.writerDesktop.sync.onRestoreCloudProgress((progress) => {
      const phaseLabel = getRestoreCloudPhaseLabel(progress.phase);
      const completed = Math.min(progress.total, progress.completed + 1);
      setSyncProgressLabel(`Restoring Cloud: ${phaseLabel} ${completed}/${progress.total}`);

      if (clearTimer) {
        window.clearTimeout(clearTimer);
      }

      clearTimer = window.setTimeout(() => setSyncProgressLabel(null), 4000);
    });

    return () => {
      if (clearTimer) {
        window.clearTimeout(clearTimer);
      }

      unsubscribe();
    };
  }, [setSyncProgressLabel]);
}

function getRestoreCloudPhaseLabel(phase: RestoreCloudPhase) {
  switch (phase) {
    case 'books':
      return 'books';
    case 'chapters':
      return 'chapters';
    case 'documents':
      return 'documents';
    case 'sync-clients':
      return 'clients';
    case 'document-updates':
      return 'updates';
    case 'document-snapshots':
      return 'snapshots';
  }
}
