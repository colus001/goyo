import type { DocumentSession } from '@writer/core';
import type { AppUiState } from '../shared/app-ui-state';
import type { WorkspaceScreen } from './document-workspace-types';

export function createAppUiState({
  expandedChapterIds,
  isSidebarCollapsed,
  screen,
  session,
}: {
  expandedChapterIds: string[];
  isSidebarCollapsed: boolean;
  screen: WorkspaceScreen;
  session: DocumentSession | null;
}): AppUiState {
  return {
    activeBookId: session?.activeBookId ?? null,
    activeChapterId: session?.activeChapterId ?? null,
    activeDocumentId: session?.activeDocumentId ?? null,
    expandedChapterIds,
    isSidebarCollapsed,
    lastScreen: screen === 'book' ? 'book' : 'library',
    updatedAt: new Date().toISOString(),
  };
}

export function saveAppUiState(state: AppUiState) {
  void window.writerDesktop.appUiState.save(state).catch(() => {
    // UI state is best-effort; document content persistence is separate.
  });
}
