import { useEffect, useState } from 'react';

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'no-update'
  | 'error';

interface UpdateState {
  status: UpdateStatus;
  updateVersion: string | null;
  downloadProgress: number;
  lastError: string | null;
}

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({
    status: 'idle',
    updateVersion: null,
    downloadProgress: 0,
    lastError: null,
  });

  useEffect(() => {
    const unsubscribe = window.writerDesktop.updater.onStatusChange((next) => {
      setState(next as UpdateState);
    });

    void window.writerDesktop.updater.getStatus().then((initial) => {
      setState(initial as UpdateState);
    });

    return unsubscribe;
  }, []);

  if (state.status === 'idle' || state.status === 'no-update') {
    return null;
  }

  if (state.status === 'downloading') {
    return (
      <div className="border-[var(--goyo-border)] border-b bg-[var(--goyo-accent-soft)] px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="animate-pulse text-[var(--goyo-text-muted)] text-xs">
            Downloading update{state.updateVersion ? ` (v${state.updateVersion})` : ''}…
          </span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--goyo-border)]">
            <div
              className="h-full rounded-full bg-[var(--goyo-accent)] transition-[width] duration-300 ease-linear"
              style={{ width: `${Math.round(state.downloadProgress)}%` }}
            />
          </div>
          <span className="text-[var(--goyo-text-faint)] tabular-nums text-xs">
            {Math.round(state.downloadProgress)}%
          </span>
        </div>
      </div>
    );
  }

  if (state.status === 'downloaded') {
    return (
      <div className="border-[var(--goyo-border)] border-b bg-[var(--goyo-accent-soft)] px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <span className="text-[var(--goyo-text)] text-xs">
            Goyo{state.updateVersion ? ` v${state.updateVersion}` : ''} is ready. Restart to
            install.
          </span>
          <button
            className="rounded-lg bg-[var(--goyo-accent)] px-3 py-1 font-medium text-white text-xs transition hover:opacity-90"
            onClick={() => window.writerDesktop.updater.quitAndInstall()}
            type="button"
          >
            Restart
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="border-[var(--goyo-border)] border-b bg-[var(--theme-bg-warning, #fef3c7)] px-4 py-2">
        <button
          className="mx-auto flex max-w-3xl items-center gap-2 text-[var(--goyo-text-muted)] text-xs transition hover:text-[var(--goyo-text)]"
          onClick={() => window.writerDesktop.updater.checkForUpdates()}
          type="button"
        >
          <span>Update check failed. Click to retry.</span>
        </button>
      </div>
    );
  }

  if (state.status === 'checking') {
    return (
      <div className="border-[var(--goyo-border)] border-b bg-[var(--goyo-paper)] px-4 py-2">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <span className="animate-pulse text-[var(--goyo-text-faint)] text-xs">
            Checking for updates…
          </span>
        </div>
      </div>
    );
  }

  return null;
}
