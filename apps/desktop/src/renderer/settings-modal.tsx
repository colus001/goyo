import type { ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { APP_FONTS } from '../shared/app-fonts';
import type { AppSettings } from '../shared/app-settings';
import { APP_THEMES, type AppTheme } from '../shared/app-themes';
import { CustomThemeEditor } from './custom-theme-editor';
import { DiscardSettingsDialog, SettingsHeader } from './settings-actions';
import { getThemeStyle } from './theme-style';
import { WindowDragRegion } from './window-drag-region';

type AppearanceTab = 'custom' | 'themes';

export function SettingsScreen({
  settings,
  onClose,
  onSaveSettings,
}: {
  settings: AppSettings;
  onClose: () => void;
  onSaveSettings: (settings: AppSettings) => void;
}): ReactElement {
  const [appearanceTab, setAppearanceTab] = useState<AppearanceTab>('themes');
  const [draftSettings, setDraftSettings] = useState(settings);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);
  const hasChanges = JSON.stringify(draftSettings) !== JSON.stringify(settings);

  const requestClose = useCallback(() => {
    if (hasChanges) {
      setIsDiscardConfirmOpen(true);
      return;
    }

    onClose();
  }, [hasChanges, onClose]);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isDiscardConfirmOpen) {
          setIsDiscardConfirmOpen(false);
          return;
        }

        requestClose();
      }
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isDiscardConfirmOpen, requestClose]);

  return (
    <main
      className="h-screen overflow-y-auto bg-[var(--goyo-app)] px-8 py-9 text-[var(--goyo-text)]"
      style={getThemeStyle(draftSettings)}
    >
      <WindowDragRegion />
      <div className="mx-auto grid max-w-[72rem] gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-9 lg:self-start" aria-label="Settings sections">
          <p className="mb-4 font-medium text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.18em]">
            Settings
          </p>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
            <SettingsNavItem label="Writing" />
            <SettingsNavItem label="Appearance" />
            <SettingsNavItem label="Sync & Account" />
          </nav>
        </aside>

        <div className="min-w-0 rounded-3xl border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] p-6 shadow-[0_18px_60px_rgba(31,29,25,0.14)]">
          <SettingsHeader
            hasChanges={hasChanges}
            onCancel={requestClose}
            onSave={() => {
              onSaveSettings(draftSettings);
              onClose();
            }}
          />

          <SettingsSections
            appearanceTab={appearanceTab}
            onChangeAppearanceTab={setAppearanceTab}
            onChangeSettings={setDraftSettings}
            settings={draftSettings}
          />
        </div>
      </div>
      {isDiscardConfirmOpen ? (
        <DiscardSettingsDialog
          onCancel={() => setIsDiscardConfirmOpen(false)}
          onDiscard={onClose}
        />
      ) : null}
    </main>
  );
}

function SettingsSections({
  appearanceTab,
  onChangeAppearanceTab,
  onChangeSettings,
  settings,
}: {
  appearanceTab: AppearanceTab;
  onChangeAppearanceTab: (tab: AppearanceTab) => void;
  onChangeSettings: (settings: AppSettings) => void;
  settings: AppSettings;
}): ReactElement {
  return (
    <div className="mt-8 space-y-7">
      <SettingsSection title="Writing">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start justify-between gap-6 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4">
            <span>
              <span className="block font-medium text-[var(--goyo-text)]">
                Restore last workspace on launch
              </span>
              <span className="mt-1 block text-[var(--goyo-text-muted)] text-sm leading-relaxed">
                Reopen the last book and document when Goyo starts. Turning this off starts in the
                library without deleting your saved workspace state.
              </span>
            </span>
            <input
              checked={settings.restoreLastWorkspaceOnLaunch}
              className="mt-1 size-4 accent-[var(--goyo-accent)]"
              onChange={(event) =>
                onChangeSettings({
                  ...settings,
                  restoreLastWorkspaceOnLaunch: event.target.checked,
                })
              }
              type="checkbox"
            />
          </label>
          <FontPicker onChangeSettings={onChangeSettings} settings={settings} />
        </div>
      </SettingsSection>

      <SettingsSection title="Appearance">
        <AppearanceSettings
          activeTab={appearanceTab}
          onChangeSettings={onChangeSettings}
          onChangeTab={onChangeAppearanceTab}
          settings={settings}
        />
      </SettingsSection>

      <SettingsSection title="Sync & Account">
        <p className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/45 p-4 text-[var(--goyo-text-muted)] text-sm leading-relaxed">
          Sync and account preferences will appear here once account management is available.
        </p>
      </SettingsSection>
    </div>
  );
}

function FontPicker({
  onChangeSettings,
  settings,
}: {
  onChangeSettings: (settings: AppSettings) => void;
  settings: AppSettings;
}): ReactElement {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <FontPickerCard
        description="Used for the sidebar, menus, settings, and app controls."
        onSelect={(fontId) => onChangeSettings({ ...settings, uiFontId: fontId })}
        selectedFontId={settings.uiFontId}
        title="Interface font"
      />
      <FontPickerCard
        description="Used for document titles and the writing surface."
        onSelect={(fontId) => onChangeSettings({ ...settings, writingFontId: fontId })}
        selectedFontId={settings.writingFontId}
        title="Writing font"
      />
    </div>
  );
}

function FontPickerCard({
  description,
  onSelect,
  selectedFontId,
  title,
}: {
  description: string;
  onSelect: (fontId: (typeof APP_FONTS)[number]['id']) => void;
  selectedFontId: (typeof APP_FONTS)[number]['id'];
  title: string;
}): ReactElement {
  return (
    <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4">
      <p className="font-medium text-[var(--goyo-text)]">{title}</p>
      <p className="mt-1 text-[var(--goyo-text-muted)] text-sm leading-relaxed">{description}</p>
      <div className="mt-3 grid gap-2">
        {APP_FONTS.map((font) => (
          <button
            className={`cursor-pointer rounded-xl border p-3 text-left outline-none transition hover:opacity-95 ${
              selectedFontId === font.id
                ? 'border-[var(--goyo-accent)] bg-[var(--goyo-accent-soft)]'
                : 'border-[var(--goyo-border)] bg-[var(--goyo-raised)]'
            }`}
            key={font.id}
            onClick={() => onSelect(font.id)}
            style={{ fontFamily: font.cssFamily }}
            type="button"
          >
            <span className="block font-semibold text-[var(--goyo-text)] text-sm">{font.name}</span>
            <span className="mt-2 block text-[var(--goyo-text-muted)] text-xs">Aa 한글</span>
          </button>
        ))}
      </div>
    </div>
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

function SettingsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}): ReactElement {
  return (
    <section id={getSettingsSectionId(title)}>
      <h3 className="mb-2 font-semibold text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.15em]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function getSettingsSectionId(title: string): string {
  return `settings-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
}

function AppearanceSettings({
  activeTab,
  onChangeSettings,
  onChangeTab,
  settings,
}: {
  activeTab: AppearanceTab;
  onChangeSettings: (settings: AppSettings) => void;
  onChangeTab: (tab: AppearanceTab) => void;
  settings: AppSettings;
}): ReactElement {
  return (
    <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/45 p-3">
      <div className="mb-3 flex gap-2 border-[var(--goyo-border)] border-b pb-2">
        <AppearanceTabButton
          isSelected={activeTab === 'themes'}
          label="Goyo themes"
          onClick={() => onChangeTab('themes')}
        />
        <AppearanceTabButton
          isSelected={activeTab === 'custom'}
          label="Custom theme"
          onClick={() => onChangeTab('custom')}
        />
      </div>
      {activeTab === 'themes' ? (
        <ThemePicker onChangeSettings={onChangeSettings} settings={settings} />
      ) : (
        <CustomThemeEditor onChangeSettings={onChangeSettings} settings={settings} />
      )}
    </div>
  );
}

function AppearanceTabButton({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      className={`cursor-pointer border-b-2 px-1 pb-2 font-semibold text-sm outline-none transition ${
        isSelected
          ? 'border-[var(--goyo-accent)] text-[var(--goyo-text)]'
          : 'border-transparent text-[var(--goyo-text-muted)] hover:text-[var(--goyo-text)]'
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ThemePicker({
  onChangeSettings,
  settings,
}: {
  onChangeSettings: (settings: AppSettings) => void;
  settings: AppSettings;
}): ReactElement {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {APP_THEMES.map((theme) => (
        <ThemeOption
          isSelected={settings.themeId === theme.id}
          key={theme.id}
          onSelect={() => onChangeSettings({ ...settings, themeId: theme.id })}
          theme={theme}
        />
      ))}
    </div>
  );
}

function ThemeOption({
  isSelected,
  onSelect,
  theme,
}: {
  isSelected: boolean;
  onSelect: () => void;
  theme: AppTheme;
}): ReactElement {
  return (
    <button
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 text-left outline-none transition hover:opacity-95 ${
        isSelected
          ? 'border-[var(--goyo-accent)] bg-[var(--goyo-accent-soft)]'
          : 'border-[var(--goyo-border)] bg-[var(--goyo-paper)]/55'
      }`}
      onClick={onSelect}
      type="button"
    >
      <span>
        <span className="block font-medium text-[var(--goyo-text)] text-sm">{theme.name}</span>
        <span className="mt-2 flex gap-1.5" aria-hidden="true">
          <ThemeDot color={theme.colors.app} />
          <ThemeDot color={theme.colors.panel} />
          <ThemeDot color={theme.colors.accentSoft} />
          <ThemeDot color={theme.colors.accent} />
        </span>
      </span>
      <span className="grid size-5 place-items-center rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)] text-[var(--goyo-accent)] text-xs">
        {isSelected ? '✓' : ''}
      </span>
    </button>
  );
}

function ThemeDot({ color }: { color: string }): ReactElement {
  return (
    <span
      className="size-4 rounded-full border border-black/10"
      style={{ backgroundColor: color }}
    />
  );
}
