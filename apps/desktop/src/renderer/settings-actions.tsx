import type { ReactElement } from 'react';

export function SettingsHeader({
  hasChanges,
  onCancel,
  onSave,
}: {
  hasChanges: boolean;
  onCancel: () => void;
  onSave: () => void;
}): ReactElement {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <p className="mb-2 font-medium text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.16em]">
          Preferences
        </p>
        <h1
          className="font-semibold text-[var(--goyo-text)] text-[1.8rem] leading-tight tracking-[-0.055em]"
          id="settings-title"
        >
          Writing preferences
        </h1>
      </div>
      <div className="flex gap-2">
        <button
          className="rounded-full bg-[var(--goyo-accent-soft)] px-4 py-2 font-medium text-[var(--goyo-text)] outline-none transition hover:brightness-95"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="rounded-full bg-[var(--goyo-accent)] px-4 py-2 font-medium text-white outline-none transition hover:bg-[var(--goyo-accent-hover)] disabled:opacity-45"
          disabled={!hasChanges}
          onClick={onSave}
          type="button"
        >
          Save
        </button>
      </div>
    </div>
  );
}

export function DiscardSettingsDialog({
  onCancel,
  onDiscard,
}: {
  onCancel: () => void;
  onDiscard: () => void;
}): ReactElement {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 px-6">
      <div
        aria-labelledby="discard-settings-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] p-6 shadow-[0_24px_80px_rgba(31,29,25,0.24)]"
        role="dialog"
      >
        <p className="mb-2 font-medium text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.16em]">
          Unsaved changes
        </p>
        <h2
          className="font-semibold text-[var(--goyo-text)] text-[1.45rem] leading-tight tracking-[-0.045em]"
          id="discard-settings-title"
        >
          Discard settings changes?
        </h2>
        <p className="mt-3 text-[var(--goyo-text-muted)] leading-relaxed">
          Your settings changes have not been saved. You can keep editing or discard them.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-full bg-[var(--goyo-accent-soft)] px-4 py-2 font-medium text-[var(--goyo-text)] outline-none transition hover:brightness-95"
            onClick={onCancel}
            type="button"
          >
            Keep editing
          </button>
          <button
            className="rounded-full bg-[var(--goyo-danger)] px-4 py-2 font-medium text-white outline-none transition hover:brightness-95"
            onClick={onDiscard}
            type="button"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
