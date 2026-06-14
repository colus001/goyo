import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { AppSettings } from '../shared/app-settings';
import type { WritingWorkspaceState } from './document-workspace-types';
import { DiscardSettingsDialog, SettingsHeader } from './settings-actions';
import { ResetLocalDataDialog } from './settings-development';
import { SettingsSections } from './settings-sections';
import { getThemeStyle } from './theme-style';
import { WindowDragRegion } from './window-drag-region';

type AppearanceTab = 'custom' | 'themes';

export function SettingsScreen({
  settings,
  onClose,
  onSaveSettings,
  workspace,
}: {
  settings: AppSettings;
  onClose: () => void;
  onSaveSettings: (settings: AppSettings) => void;
  workspace: WritingWorkspaceState;
}): ReactElement {
  const state = useSettingsScreenState(settings, onClose, onSaveSettings, workspace);

  return <SettingsLayout {...state} />;
}

function useSettingsScreenState(
  settings: AppSettings,
  onClose: () => void,
  onSaveSettings: (settings: AppSettings) => void,
  workspace: WritingWorkspaceState,
) {
  const [appearanceTab, setAppearanceTab] = useState<AppearanceTab>('themes');
  const [draftSettings, setDraftSettings] = useState(settings);
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResettingLocalData, setIsResettingLocalData] = useState(false);
  const hasChanges = JSON.stringify(draftSettings) !== JSON.stringify(settings);

  const requestClose = useCallback(() => {
    if (hasChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    onClose();
  }, [hasChanges, onClose]);

  useEffect(() => setDraftSettings(settings), [settings]);
  useDevelopmentFlag(setIsDevelopment);
  useSettingsEscape({
    isDiscardConfirmOpen,
    isResetConfirmOpen,
    onCloseDiscardConfirm: () => setIsDiscardConfirmOpen(false),
    onCloseResetConfirm: () => setIsResetConfirmOpen(false),
    requestClose,
  });

  return {
    appearanceTab,
    draftSettings,
    hasChanges,
    isDevelopment,
    isDiscardConfirmOpen,
    isResetConfirmOpen,
    isResettingLocalData,
    onCancel: requestClose,
    onChangeAppearanceTab: setAppearanceTab,
    onChangeSettings: setDraftSettings,
    onClose,
    onCloseDiscardConfirm: () => setIsDiscardConfirmOpen(false),
    onCloseResetConfirm: () => setIsResetConfirmOpen(false),
    onRequestResetLocalData: () => setIsResetConfirmOpen(true),
    onResetLocalData: () => {
      setIsResettingLocalData(true);
      void window.writerDesktop.dev.resetLocalData().catch(() => setIsResettingLocalData(false));
    },
    onSave: () => {
      onSaveSettings(draftSettings);
      onClose();
    },
    workspace,
  };
}

function SettingsLayout({
  appearanceTab,
  draftSettings,
  hasChanges,
  isDevelopment,
  isDiscardConfirmOpen,
  isResetConfirmOpen,
  isResettingLocalData,
  onCancel,
  onChangeAppearanceTab,
  onChangeSettings,
  onClose,
  onCloseDiscardConfirm,
  onCloseResetConfirm,
  onRequestResetLocalData,
  onResetLocalData,
  onSave,
  workspace,
}: ReturnType<typeof useSettingsScreenState>): ReactElement {
  return (
    <main
      className="h-screen overflow-y-auto bg-[var(--goyo-app)] px-8 py-9 text-[var(--goyo-text)]"
      style={getThemeStyle(draftSettings)}
    >
      <WindowDragRegion />
      <div className="mx-auto grid max-w-[72rem] gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <SettingsNavigation isDevelopment={isDevelopment} />
        <div className="min-w-0 rounded-3xl border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] p-6 shadow-[0_18px_60px_rgba(31,29,25,0.14)]">
          <SettingsHeader hasChanges={hasChanges} onCancel={onCancel} onSave={onSave} />
          <SettingsSections
            appearanceTab={appearanceTab}
            isDevelopment={isDevelopment}
            isResettingLocalData={isResettingLocalData}
            onChangeAppearanceTab={onChangeAppearanceTab}
            onChangeSettings={onChangeSettings}
            onRequestResetLocalData={onRequestResetLocalData}
            settings={draftSettings}
            workspace={workspace}
          />
        </div>
      </div>
      {isDiscardConfirmOpen ? (
        <DiscardSettingsDialog onCancel={onCloseDiscardConfirm} onDiscard={onClose} />
      ) : null}
      {isResetConfirmOpen ? (
        <ResetLocalDataDialog
          isResetting={isResettingLocalData}
          onCancel={onCloseResetConfirm}
          onReset={onResetLocalData}
        />
      ) : null}
    </main>
  );
}

function SettingsNavigation({ isDevelopment }: { isDevelopment: boolean }): ReactElement {
  return (
    <aside className="lg:sticky lg:top-9 lg:self-start" aria-label="Settings sections">
      <p className="mb-4 font-medium text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.18em]">
        Settings
      </p>
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        <SettingsNavItem label="Writing" />
        <SettingsNavItem label="Appearance" />
        <SettingsNavItem label="Sync & Account" />
        <SettingsNavItem label="Recovery" />
        {isDevelopment ? <SettingsNavItem label="Development" /> : null}
        <SettingsNavItem label="About" />
      </nav>
    </aside>
  );
}

function SettingsNavItem({ label }: { label: string }): ReactElement {
  return (
    <a
      className="block shrink-0 rounded-full px-3 py-2 font-medium text-[var(--goyo-text-muted)] text-sm outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)] lg:rounded-lg"
      href={`#${getSettingsSectionId(label)}`}
    >
      {label}
    </a>
  );
}

function useDevelopmentFlag(setIsDevelopment: (isDevelopment: boolean) => void) {
  useEffect(() => {
    let isCancelled = false;

    void window.writerDesktop.dev.isDevelopment().then((nextIsDevelopment) => {
      if (!isCancelled) {
        setIsDevelopment(nextIsDevelopment);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [setIsDevelopment]);
}

function useSettingsEscape({
  isDiscardConfirmOpen,
  isResetConfirmOpen,
  onCloseDiscardConfirm,
  onCloseResetConfirm,
  requestClose,
}: {
  isDiscardConfirmOpen: boolean;
  isResetConfirmOpen: boolean;
  onCloseDiscardConfirm: () => void;
  onCloseResetConfirm: () => void;
  requestClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (isResetConfirmOpen) {
        onCloseResetConfirm();
        return;
      }

      if (isDiscardConfirmOpen) {
        onCloseDiscardConfirm();
        return;
      }

      requestClose();
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [
    isDiscardConfirmOpen,
    isResetConfirmOpen,
    onCloseDiscardConfirm,
    onCloseResetConfirm,
    requestClose,
  ]);
}

function getSettingsSectionId(title: string): string {
  return `settings-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
}
