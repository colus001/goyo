import { useWritingWorkspace } from './document-session-state';
import { LibraryScreen } from './library-screen';
import { WritingWorkspaceScreen } from './writing-workspace-screen';

export function App() {
  const workspace = useWritingWorkspace();

  if (workspace.screen === 'loading') {
    return <LoadingScreen status={workspace.saveStatus} />;
  }

  if (workspace.screen === 'library') {
    return <LibraryScreen workspace={workspace} />;
  }

  return <WritingWorkspaceScreen workspace={workspace} />;
}

function LoadingScreen({ status }: { status: string }) {
  return (
    <main className="grid h-screen place-items-center bg-[#f7f7f5] text-[#8d8d86] text-sm">
      {status}
    </main>
  );
}
