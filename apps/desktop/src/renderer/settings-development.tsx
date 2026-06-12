import type { ReactElement } from 'react';

export function DevelopmentSettings({
  isResettingLocalData,
  onRequestResetLocalData,
}: {
  isResettingLocalData: boolean;
  onRequestResetLocalData: () => void;
}): ReactElement {
  return (
    <div className="rounded-xl border border-[var(--goyo-danger)]/35 bg-[var(--goyo-paper)]/55 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-[var(--goyo-text)]">Reset local development data</p>
          <p className="mt-1 max-w-xl text-[var(--goyo-text-muted)] text-sm leading-relaxed">
            Delete the entire development user data folder, including books, drafts, settings, saved
            UI state, local sync data, and future local cache files.
          </p>
        </div>
        <button
          className="shrink-0 rounded-full bg-[var(--goyo-danger)] px-4 py-2 font-medium text-sm text-white outline-none transition hover:brightness-95 disabled:opacity-60"
          disabled={isResettingLocalData}
          onClick={onRequestResetLocalData}
          type="button"
        >
          {isResettingLocalData ? 'Resetting...' : 'Reset local data'}
        </button>
      </div>
    </div>
  );
}

export function ResetLocalDataDialog({
  isResetting,
  onCancel,
  onReset,
}: {
  isResetting: boolean;
  onCancel: () => void;
  onReset: () => void;
}): ReactElement {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 px-6">
      <div
        aria-labelledby="reset-local-data-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] p-6 shadow-[0_24px_80px_rgba(31,29,25,0.24)]"
        role="dialog"
      >
        <p className="mb-2 font-medium text-[var(--goyo-danger)] text-xs uppercase tracking-[0.16em]">
          Development reset
        </p>
        <h2
          className="font-semibold text-[var(--goyo-text)] text-[1.45rem] leading-tight tracking-[-0.045em]"
          id="reset-local-data-title"
        >
          Delete all local dev data?
        </h2>
        <p className="mt-3 text-[var(--goyo-text-muted)] leading-relaxed">
          This deletes the development user data folder and quits Goyo. Start it again to test the
          first-run onboarding state. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-full bg-[var(--goyo-accent-soft)] px-4 py-2 font-medium text-[var(--goyo-text)] outline-none transition hover:brightness-95 disabled:opacity-60"
            disabled={isResetting}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-[var(--goyo-danger)] px-4 py-2 font-medium text-white outline-none transition hover:brightness-95 disabled:opacity-60"
            disabled={isResetting}
            onClick={onReset}
            type="button"
          >
            {isResetting ? 'Resetting...' : 'Reset and quit'}
          </button>
        </div>
      </div>
    </div>
  );
}
