export interface AppUiState {
  activeBookId: string | null;
  activeChapterId: string | null;
  activeDocumentId: string | null;
  expandedChapterIds: string[];
  isSidebarCollapsed: boolean;
  lastScreen: 'book' | 'library';
  updatedAt: string;
}

export const DEFAULT_APP_UI_STATE_ID = 'default';
