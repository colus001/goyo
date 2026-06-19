import { RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BlockingUpdateOverlay, UpdatePopover } from './update-notification-modal';

const SKIPPED_UPDATE_VERSION_KEY = 'goyoSkippedUpdateVersion';
const DEV_UPDATE_VERSION = 'local-dev';

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'no-update'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  updateVersion: string | null;
  downloadProgress: number;
  lastError: string | null;
}

export function UpdateNotification({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [devOverlayProgress, setDevOverlayProgress] = useState<number | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [skippedVersion, setSkippedVersion] = useState<string | null>(() =>
    localStorage.getItem(SKIPPED_UPDATE_VERSION_KEY),
  );
  const { isDevelopment, state } = useUpdaterState();

  if (isSidebarCollapsed) {
    return null;
  }

  const displayState = getDisplayState(state, isDevelopment);

  if (!displayState) {
    return null;
  }

  const updateVersion = displayState.updateVersion ?? DEV_UPDATE_VERSION;
  const isSkipped = !isDevelopment && skippedVersion === updateVersion;

  if (isSkipped) {
    return null;
  }

  if (devOverlayProgress !== null) {
    return <DevelopmentBlockingOverlay progress={devOverlayProgress} />;
  }

  if (displayState.status === 'downloading' || displayState.status === 'downloaded') {
    return <BlockingUpdateOverlay progress={displayState.downloadProgress} state={displayState} />;
  }

  return (
    <div className="relative" ref={containerRef}>
      <UpdateTriggerButton
        isOpen={isPopoverOpen}
        onClick={() => setIsPopoverOpen((open) => !open)}
        state={displayState}
      />
      {isPopoverOpen ? (
        <UpdatePopover
          boundaryRef={containerRef}
          isDevelopment={isDevelopment}
          onDevelopmentDownloadStart={() => startDevelopmentDownloadPreview(setDevOverlayProgress)}
          onClose={() => setIsPopoverOpen(false)}
          onSkip={() => skipCurrentVersion(updateVersion, setSkippedVersion, setIsPopoverOpen)}
          state={displayState}
        />
      ) : null}
    </div>
  );
}

function DevelopmentBlockingOverlay({ progress }: { progress: number }) {
  return (
    <BlockingUpdateOverlay
      progress={progress}
      state={{
        downloadProgress: progress,
        lastError: null,
        status: progress >= 100 ? 'downloaded' : 'downloading',
        updateVersion: null,
      }}
    />
  );
}

function startDevelopmentDownloadPreview(setProgress: (progress: number | null) => void) {
  setProgress(8);

  const progressSteps = [28, 52, 76, 100];
  for (const [index, progress] of progressSteps.entries()) {
    window.setTimeout(() => setProgress(progress), 260 * (index + 1));
  }

  window.setTimeout(() => setProgress(null), 1500);
}

function useUpdaterState() {
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [state, setState] = useState<UpdateState>({
    downloadProgress: 0,
    lastError: null,
    status: 'idle',
    updateVersion: null,
  });

  useEffect(() => {
    void window.writerDesktop.dev.isDevelopment().then(setIsDevelopment);
    const unsubscribe = window.writerDesktop.updater.onStatusChange((next) => {
      setState(next as UpdateState);
    });
    void window.writerDesktop.updater
      .getStatus()
      .then((initial) => setState(initial as UpdateState));
    return unsubscribe;
  }, []);

  return { isDevelopment, state };
}

function UpdateTriggerButton({
  isOpen,
  onClick,
  state,
}: {
  isOpen: boolean;
  onClick: () => void;
  state: UpdateState;
}) {
  return (
    <button
      aria-expanded={isOpen}
      aria-label={getUpdateButtonLabel(state)}
      className="relative grid size-8 place-items-center rounded-lg text-[var(--goyo-text-faint)] outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
      onClick={onClick}
      title={getUpdateButtonLabel(state)}
      type="button"
    >
      <RotateCw aria-hidden="true" size={15} strokeWidth={2.1} />
      <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--goyo-accent)]" />
    </button>
  );
}

function skipCurrentVersion(
  updateVersion: string,
  setSkippedVersion: (version: string) => void,
  setIsModalOpen: (isOpen: boolean) => void,
) {
  localStorage.setItem(SKIPPED_UPDATE_VERSION_KEY, updateVersion);
  setSkippedVersion(updateVersion);
  setIsModalOpen(false);
}

function getDisplayState(state: UpdateState, isDevelopment: boolean): UpdateState | null {
  if (isDevelopment && (state.status === 'idle' || state.status === 'no-update')) {
    return {
      downloadProgress: 0,
      lastError: null,
      status: 'available',
      updateVersion: null,
    };
  }

  if (state.status === 'idle' || state.status === 'no-update' || state.status === 'checking') {
    return null;
  }

  return state;
}

function getUpdateButtonLabel(state: UpdateState): string {
  if (state.status === 'downloading') {
    return `Updating ${Math.round(state.downloadProgress)}%`;
  }

  if (state.status === 'downloaded') {
    return 'Restart to update';
  }

  if (state.status === 'error') {
    return 'Update failed';
  }

  return 'Update ready';
}
