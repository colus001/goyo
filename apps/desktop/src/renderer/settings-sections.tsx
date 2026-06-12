import type { ReactElement, ReactNode } from 'react';
import { APP_FONTS } from '../shared/app-fonts';
import type { AppSettings } from '../shared/app-settings';
import { APP_THEMES, type AppTheme } from '../shared/app-themes';
import { CustomThemeEditor } from './custom-theme-editor';
import { DevelopmentSettings } from './settings-development';

type AppearanceTab = 'custom' | 'themes';

export function SettingsSections({
  appearanceTab,
  isDevelopment,
  isResettingLocalData,
  onChangeAppearanceTab,
  onChangeSettings,
  onRequestResetLocalData,
  settings,
}: {
  appearanceTab: AppearanceTab;
  isDevelopment: boolean;
  isResettingLocalData: boolean;
  onChangeAppearanceTab: (tab: AppearanceTab) => void;
  onChangeSettings: (settings: AppSettings) => void;
  onRequestResetLocalData: () => void;
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

      {isDevelopment ? (
        <SettingsSection title="Development">
          <DevelopmentSettings
            isResettingLocalData={isResettingLocalData}
            onRequestResetLocalData={onRequestResetLocalData}
          />
        </SettingsSection>
      ) : null}
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
            className={`rounded-xl border p-3 text-left outline-none transition hover:opacity-95 ${
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
      className={`border-b-2 px-1 pb-2 font-semibold text-sm outline-none transition ${
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
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left outline-none transition hover:opacity-95 ${
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
      {isSelected ? (
        <span className="rounded-full bg-[var(--goyo-accent)] px-2 py-1 font-medium text-[0.68rem] text-white">
          Active
        </span>
      ) : null}
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

function getSettingsSectionId(title: string): string {
  return `settings-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
}
