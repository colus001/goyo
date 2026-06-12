import { useWritingWorkspace } from './document-session-state';
import { SettingsScreen } from './settings-modal';
import { getThemeStyle } from './theme-style';
import { useGlobalSettingsShortcut } from './use-global-settings-shortcut';
import { WritingWorkspaceScreen } from './writing-workspace-screen';

export function App() {
  const workspace = useWritingWorkspace();
  const themeStyle = getThemeStyle(workspace.appSettings);

  useGlobalSettingsShortcut(workspace.showSettings);

  if (workspace.screen === 'loading') {
    return <LoadingScreen status={workspace.saveStatus} themeStyle={themeStyle} />;
  }

  if (workspace.screen === 'settings') {
    return (
      <div style={themeStyle}>
        <SettingsScreen
          onClose={workspace.closeSettings}
          onSaveSettings={workspace.updateAppSettings}
          settings={workspace.appSettings}
        />
      </div>
    );
  }

  return (
    <div style={themeStyle}>
      <WritingWorkspaceScreen onOpenSettings={workspace.showSettings} workspace={workspace} />
    </div>
  );
}

function LoadingScreen({
  status,
  themeStyle,
}: {
  status: string;
  themeStyle: ReturnType<typeof getThemeStyle>;
}) {
  return (
    <main
      className="grid h-screen place-items-center bg-[var(--goyo-app)] text-[var(--goyo-text-faint)] text-sm"
      style={themeStyle}
    >
      {status}
    </main>
  );
}
