import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

interface SyncStatusSummary {
  failedItemCount: number;
  needsAttention: boolean;
  oldestFailedAt: string | null;
  pendingItemCount: number;
}

export function SyncRecoverySettings(): ReactElement {
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncStatusSummary | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);

  const refreshSummary = () => {
    void window.writerDesktop.sync.getStatusSummary().then(setSummary);
  };

  useEffect(refreshSummary, []);

  const retryNow = () => {
    setIsRetrying(true);
    void window.writerDesktop.sync
      .retryNow()
      .then(() => window.writerDesktop.sync.getStatusSummary())
      .then(setSummary)
      .finally(() => setIsRetrying(false));
  };
  const exportBackup = () => {
    setIsExportingBackup(true);
    setBackupStatus(null);
    void window.writerDesktop.backup
      .exportLocalData()
      .then((result) => {
        setBackupStatus(result.exported ? 'Backup exported.' : 'Backup export cancelled.');
      })
      .catch(() => setBackupStatus('Backup export failed.'))
      .finally(() => setIsExportingBackup(false));
  };

  return (
    <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/45 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-[var(--goyo-text)]">Sync recovery</p>
          <p className="mt-1 text-[var(--goyo-text-muted)] text-sm leading-relaxed">
            Local writing stays safe even when remote sync needs attention. Retry remote sync here;
            local checkpoints and restore points remain available in Recovery.
          </p>
        </div>
        <button
          className="rounded-full border border-[var(--goyo-border)] px-3 py-1.5 text-[var(--goyo-text-muted)] text-sm hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
          onClick={refreshSummary}
          type="button"
        >
          Refresh
        </button>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <SyncMetric label="Pending items" value={summary?.pendingItemCount ?? 0} />
        <SyncMetric label="Failed attempts" value={summary?.failedItemCount ?? 0} />
        <SyncMetric label="Status" value={summary?.needsAttention ? 'Needs attention' : 'Ready'} />
      </div>
      {summary?.oldestFailedAt ? (
        <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">
          Oldest failed sync attempt: {formatSyncDate(summary.oldestFailedAt)}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          className="rounded-full bg-[var(--goyo-accent)] px-4 py-2 font-medium text-sm text-white hover:bg-[var(--goyo-accent-hover)] disabled:opacity-45"
          disabled={isRetrying}
          onClick={retryNow}
          type="button"
        >
          {isRetrying ? 'Retrying...' : 'Retry sync now'}
        </button>
        <button
          className="rounded-full border border-[var(--goyo-border)] px-4 py-2 font-medium text-[var(--goyo-text-muted)] text-sm hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)] disabled:opacity-45"
          disabled={isExportingBackup}
          onClick={exportBackup}
          type="button"
        >
          {isExportingBackup ? 'Exporting...' : 'Export local backup'}
        </button>
      </div>
      {backupStatus ? (
        <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">{backupStatus}</p>
      ) : null}
    </div>
  );
}

function SyncMetric({ label, value }: { label: string; value: number | string }): ReactElement {
  return (
    <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)] p-3">
      <p className="font-semibold text-[var(--goyo-text-faint)] text-[0.68rem] uppercase tracking-[0.14em]">
        {label}
      </p>
      <p className="mt-1 font-medium text-[var(--goyo-text)]">{value}</p>
    </div>
  );
}

function formatSyncDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
