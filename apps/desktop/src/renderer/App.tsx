import { useWritingWorkspace } from './document-session-state';
import { LibraryScreen } from './library-screen';
import { SettingsScreen } from './settings-modal';
import { getThemeStyle } from './theme-style';
import { UpdateNotification } from './update-notification';
import { useGlobalSettingsShortcut } from './use-global-settings-shortcut';
import { WritingWorkspaceScreen } from './writing-workspace-screen';

export function App() {
  const workspace = useWritingWorkspace();
  const themeStyle = getThemeStyle(workspace.appSettings);

  useGlobalSettingsShortcut(workspace.showSettings);

  if (workspace.screen === 'loading') {
    return <LoadingScreen status={workspace.saveStatus} themeStyle={themeStyle} />;
  }

  return (
    <div style={themeStyle}>
      <UpdateNotification />
      {workspace.screen === 'settings' ? (
        <SettingsScreen
          onClose={workspace.closeSettings}
          onSaveSettings={workspace.updateAppSettings}
          settings={workspace.appSettings}
          workspace={workspace}
        />
      ) : workspace.screen === 'library' ? (
        <LibraryScreen onOpenSettings={workspace.showSettings} workspace={workspace} />
      ) : (
        <WritingWorkspaceScreen onOpenSettings={workspace.showSettings} workspace={workspace} />
      )}
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
