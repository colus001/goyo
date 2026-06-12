import { ChevronLeft, Search } from 'lucide-react';
import type { MouseEvent, ReactElement } from 'react';
import { useState } from 'react';
import { SidebarEmptySpaceContextMenu } from './sidebar-empty-space-context-menu';
import { ChapterTree } from './writing-chapter-tree';
import type { WritingShellProps } from './writing-shell';

export interface FilteredNavigationItems {
  chapters: NonNullable<WritingShellProps['chapters']>;
  documents: NonNullable<WritingShellProps['documents']>;
}

export function WritingBookNavigation({
  activeBook,
  activeChapterId,
  activeDocumentId,
  expandedChapterIds,
  filteredNavigation,
  onBack,
  onCreateChapter,
  onCreateDocument,
  onCreateEpisodeAfter,
  onDeleteChapter,
  onDeleteDocument,
  onExpandedChapterIdsChange,
  onMoveChapter,
  onMoveDocument,
  onRenameChapter,
  onSearchChange,
  onSelectDocument,
  searchQuery,
}: {
  activeBook: NonNullable<WritingShellProps['books']>[number] | undefined;
  activeChapterId?: string;
  activeDocumentId?: string;
  expandedChapterIds?: string[];
  filteredNavigation: FilteredNavigationItems;
  onBack: () => void;
  onCreateChapter?: (title?: string) => void;
  onCreateDocument?: (kind: 'draft' | 'episode' | 'note') => void;
  onCreateEpisodeAfter?: (chapterId: string | null, previousDocumentId: string | null) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onExpandedChapterIdsChange?: (chapterIds: string[]) => void;
  onMoveChapter?: (chapterId: string, direction: 'down' | 'up') => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onRenameChapter?: (chapterId: string, title: string) => void;
  onSearchChange: (query: string) => void;
  onSelectDocument?: (documentId: string) => void;
  searchQuery: string;
}): ReactElement {
  const [headerContextMenu, setHeaderContextMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <BookNavigationHeader
        activeBook={activeBook}
        onBack={onBack}
        onOpenContextMenu={setHeaderContextMenu}
        onSearchChange={onSearchChange}
        searchQuery={searchQuery}
      />
      {activeBook ? (
        <ChapterTree
          activeChapterId={activeChapterId}
          activeDocumentId={activeDocumentId}
          chapters={filteredNavigation.chapters}
          documents={filteredNavigation.documents}
          expandedChapterIds={expandedChapterIds}
          onCreateChapter={onCreateChapter}
          onCreateEpisodeAfter={onCreateEpisodeAfter}
          onDeleteChapter={onDeleteChapter}
          onDeleteDocument={onDeleteDocument}
          onExpandedChapterIdsChange={onExpandedChapterIdsChange}
          onMoveChapter={onMoveChapter}
          onMoveDocument={onMoveDocument}
          onRenameChapter={onRenameChapter}
          onSelectDocument={onSelectDocument}
        />
      ) : null}
      {headerContextMenu ? (
        <SidebarEmptySpaceContextMenu
          onClose={() => setHeaderContextMenu(null)}
          onNewChapter={onCreateChapter ? () => onCreateChapter() : undefined}
          onNewEpisode={onCreateDocument ? () => onCreateDocument('episode') : undefined}
          x={headerContextMenu.x}
          y={headerContextMenu.y}
        />
      ) : null}
    </div>
  );
}

function BookNavigationHeader({
  activeBook,
  onBack,
  onOpenContextMenu,
  onSearchChange,
  searchQuery,
}: {
  activeBook: NonNullable<WritingShellProps['books']>[number] | undefined;
  onBack: () => void;
  onOpenContextMenu: (position: { x: number; y: number }) => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
}): ReactElement {
  return (
    <section
      aria-label="Book navigation"
      className="shrink-0 border-[var(--goyo-border)] border-b bg-[var(--goyo-panel)] px-3 py-3"
      onContextMenu={(event) => {
        const menuPosition = getHeaderContextMenuPosition(event);

        if (menuPosition) {
          onOpenContextMenu(menuPosition);
        }
      }}
    >
      <button
        className="mb-3 inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 font-medium text-[var(--goyo-text-muted)] text-sm outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
        onClick={onBack}
        type="button"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        Books
      </button>
      <div className="mb-3 flex items-center gap-2 px-1">
        <span
          aria-hidden="true"
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: activeBook?.accentColor ?? 'var(--goyo-text-faint)' }}
        />
        <h2 className="min-w-0 truncate font-semibold text-[var(--goyo-text)] text-base tracking-[-0.035em]">
          {activeBook?.title ?? 'Choose a book'}
        </h2>
      </div>
      {activeBook ? (
        <label className="flex h-9 items-center gap-2 rounded-lg border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 px-2.5 text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.14em]">
          <Search aria-hidden="true" size={15} strokeWidth={2.1} />
          <input
            className="min-w-0 flex-1 bg-transparent text-[var(--goyo-text-muted)] outline-none placeholder:text-[var(--goyo-text-faint)]"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search"
            type="search"
            value={searchQuery}
          />
        </label>
      ) : null}
    </section>
  );
}

function getHeaderContextMenuPosition(event: MouseEvent): { x: number; y: number } | null {
  if ((event.target as HTMLElement).closest('button,input,label')) {
    return null;
  }

  event.preventDefault();
  return { x: event.clientX, y: event.clientY };
}
