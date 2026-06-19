import type { ReactElement } from 'react';
import { AppButton } from './app-button';

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
        <AppButton onClick={onCancel} variant="secondary">
          Cancel
        </AppButton>
        <AppButton disabled={!hasChanges} onClick={onSave} variant="primary">
          Save
        </AppButton>
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
          <AppButton onClick={onCancel} variant="secondary">
            Keep editing
          </AppButton>
          <AppButton onClick={onDiscard} variant="danger">
            Discard
          </AppButton>
        </div>
      </div>
    </div>
  );
}
