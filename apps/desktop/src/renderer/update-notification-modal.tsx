import { type RefObject, useEffect } from 'react';
import { AppButton } from './app-button';
import type { UpdateState } from './update-notification';

export function BlockingUpdateOverlay({
  progress,
  state,
}: {
  progress: number;
  state: UpdateState;
}) {
  const roundedProgress = Math.round(progress);
  const isDownloaded = state.status === 'downloaded';

  return (
    <div
      aria-labelledby="blocking-update-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/25 px-5 backdrop-blur-[3px]"
      role="dialog"
    >
      <div className="w-full max-w-[21rem] rounded-2xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-5 shadow-[0_24px_80px_rgba(31,29,25,0.2)]">
        <p className="font-semibold text-[var(--goyo-text)] text-sm" id="blocking-update-title">
          {isDownloaded ? 'Installing update' : 'Preparing update'}
        </p>
        <p className="mt-2 text-[var(--goyo-text-muted)] text-xs leading-5">
          {isDownloaded
            ? 'Goyo will restart to finish installing.'
            : 'Please keep Goyo open. Editing is paused until the update finishes.'}
        </p>
        <div className="mt-4">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--goyo-border)]">
            <div
              className="h-full rounded-full bg-[var(--goyo-accent)] transition-[width] duration-300 ease-linear"
              style={{ width: `${isDownloaded ? 100 : roundedProgress}%` }}
            />
          </div>
          <p className="mt-2 text-right text-[var(--goyo-text-faint)] text-xs tabular-nums">
            {isDownloaded ? 'Restarting...' : `${roundedProgress}%`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function UpdatePopover({
  boundaryRef,
  isDevelopment,
  onDevelopmentDownloadStart,
  onClose,
  onSkip,
  state,
}: {
  boundaryRef: RefObject<HTMLDivElement | null>;
  isDevelopment: boolean;
  onDevelopmentDownloadStart: () => void;
  onClose: () => void;
  onSkip: () => void;
  state: UpdateState;
}) {
  const progress = Math.round(state.downloadProgress);
  const copy = getUpdateModalCopy(state);

  useCloseUpdatePopover(boundaryRef, onClose);

  return (
    <div
      aria-labelledby="update-popover-title"
      className="absolute top-[calc(100%+0.5rem)] right-0 z-50 w-[18rem] rounded-2xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-4 shadow-[0_18px_60px_rgba(31,29,25,0.16)]"
      role="dialog"
    >
      <UpdateModalHeader copy={copy} />
      {state.status === 'downloading' ? <UpdateProgress progress={progress} /> : null}
      <UpdateModalActions
        isDevelopment={isDevelopment}
        onDevelopmentDownloadStart={onDevelopmentDownloadStart}
        onClose={onClose}
        onSkip={onSkip}
        state={state}
      />
    </div>
  );
}

function UpdateModalHeader({ copy }: { copy: { description: string; title: string } }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-[var(--goyo-accent)]" />
        <p className="font-semibold text-[var(--goyo-text)] text-sm" id="update-popover-title">
          {copy.title}
        </p>
      </div>
      <p className="mt-2 text-[var(--goyo-text-muted)] text-xs leading-5">{copy.description}</p>
    </div>
  );
}

function UpdateProgress({ progress }: { progress: number }) {
  return (
    <div className="mt-4">
      <div className="h-1 overflow-hidden rounded-full bg-[var(--goyo-border)]">
        <div
          className="h-full rounded-full bg-[var(--goyo-accent)] transition-[width] duration-300 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-right text-[var(--goyo-text-faint)] text-xs tabular-nums">
        {progress}%
      </p>
    </div>
  );
}

function UpdateModalActions({
  isDevelopment,
  onDevelopmentDownloadStart,
  onClose,
  onSkip,
  state,
}: {
  isDevelopment: boolean;
  onDevelopmentDownloadStart: () => void;
  onClose: () => void;
  onSkip: () => void;
  state: UpdateState;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
      <AppButton className="px-2" onClick={onClose} size="sm" variant="ghost">
        Later
      </AppButton>
      {state.status === 'available' ? (
        <AppButton className="px-2" onClick={onSkip} size="sm" variant="ghost">
          Skip
        </AppButton>
      ) : null}
      {state.status === 'available' ? (
        <DownloadUpdateButton
          isDevelopment={isDevelopment}
          onClose={onClose}
          onDevelopmentDownloadStart={onDevelopmentDownloadStart}
        />
      ) : null}
      {state.status === 'downloaded' ? <RestartUpdateButton /> : null}
      {state.status === 'error' ? <RetryUpdateButton /> : null}
    </div>
  );
}

function DownloadUpdateButton({
  isDevelopment,
  onClose,
  onDevelopmentDownloadStart,
}: {
  isDevelopment: boolean;
  onClose: () => void;
  onDevelopmentDownloadStart: () => void;
}) {
  return (
    <AppButton
      className="px-4"
      onClick={() => downloadUpdate(isDevelopment, onClose, onDevelopmentDownloadStart)}
      size="sm"
      variant="primary"
    >
      Download and install
    </AppButton>
  );
}

function RestartUpdateButton() {
  return (
    <AppButton
      className="px-4"
      onClick={() => window.writerDesktop.updater.quitAndInstall()}
      size="sm"
      variant="primary"
    >
      Restart and install
    </AppButton>
  );
}

function RetryUpdateButton() {
  return (
    <AppButton
      className="px-4"
      onClick={() => window.writerDesktop.updater.checkForUpdates()}
      size="sm"
      variant="primary"
    >
      Check again
    </AppButton>
  );
}

function downloadUpdate(
  isDevelopment: boolean,
  onClose: () => void,
  onDevelopmentDownloadStart: () => void,
) {
  if (isDevelopment) {
    onDevelopmentDownloadStart();
    onClose();
    return;
  }

  void window.writerDesktop.updater.downloadUpdate();
}

function useCloseUpdatePopover(boundaryRef: RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!boundaryRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsidePointer);

    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [boundaryRef, onClose]);
}

function getUpdateModalCopy(state: UpdateState): { description: string; title: string } {
  if (state.status === 'downloading') {
    return {
      description: state.updateVersion
        ? `Downloading Goyo v${state.updateVersion}. You can keep writing while this finishes.`
        : 'Downloading the latest Goyo update. You can keep writing while this finishes.',
      title: 'Downloading update',
    };
  }

  if (state.status === 'downloaded') {
    return {
      description: state.updateVersion
        ? `Goyo v${state.updateVersion} has been downloaded. Restart to install it.`
        : 'The update has been downloaded. Restart to install it.',
      title: 'Update ready to install',
    };
  }

  if (state.status === 'error') {
    return {
      description: state.lastError ?? 'Goyo could not finish the update. Try again when ready.',
      title: 'Update failed',
    };
  }

  return {
    description: state.updateVersion
      ? `Version ${state.updateVersion} is ready. Downloading will pause editing until Goyo restarts.`
      : 'A new version is ready. Downloading will pause editing until Goyo restarts.',
    title: 'Update ready',
  };
}
