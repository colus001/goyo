import type { MouseEvent, ReactElement } from 'react';
import { useState } from 'react';
import { SidebarEmptySpaceContextMenu } from './sidebar-empty-space-context-menu';
import { BookEpisodeList } from './writing-book-episode-list';
import { ChapterTreeDialogs } from './writing-chapter-dialogs';
import { useExpandedChapters } from './writing-chapter-expansion';
import { ChapterRow, type WritingSidebarContextMenuState } from './writing-chapter-row';
import type { WritingShellProps } from './writing-shell';

type ChapterItem = NonNullable<WritingShellProps['chapters']>[number];
type DocumentItem = NonNullable<WritingShellProps['documents']>[number];
type MenuPosition = { x: number; y: number };
interface ChapterTreeProps {
  activeChapterId?: string;
  activeDocumentId?: string;
  chapters: ChapterItem[];
  documents: DocumentItem[];
  expandedChapterIds?: string[];
  onCreateChapter?: (title?: string) => void;
  onCreateEpisodeAfter?: (chapterId: string | null, previousDocumentId: string | null) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveChapter?: (chapterId: string, direction: 'down' | 'up') => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onRenameChapter?: (chapterId: string, title: string) => void;
  onExpandedChapterIdsChange?: (chapterIds: string[]) => void;
  onSelectDocument?: (documentId: string) => void;
}
export function ChapterTree(props: ChapterTreeProps): ReactElement {
  const [openContextMenu, setOpenContextMenu] = useState<WritingSidebarContextMenuState>(null);
  const [chapterPendingDelete, setChapterPendingDelete] = useState<ChapterItem | null>(null);
  const [chapterPendingRename, setChapterPendingRename] = useState<ChapterItem | null>(null);
  const [emptyContextMenu, setEmptyContextMenu] = useState<MenuPosition | null>(null);
  const [expandedChapterIds, chapterExpansion] = useExpandedChapters(
    props.activeDocumentId,
    props.documents,
    props.expandedChapterIds,
    props.onExpandedChapterIdsChange,
  );
  const [isNewChapterModalOpen, setIsNewChapterModalOpen] = useState(false);
  const bookLevelEpisodes = getBookLevelEpisodes(props.documents);

  return (
    <ChapterTreeBody
      {...props}
      bookLevelEpisodes={bookLevelEpisodes}
      chapterPendingDelete={chapterPendingDelete}
      chapterPendingRename={chapterPendingRename}
      emptyContextMenu={emptyContextMenu}
      expandedChapterIds={expandedChapterIds}
      isNewChapterModalOpen={isNewChapterModalOpen}
      onCloseDocumentMenu={() => setOpenContextMenu(null)}
      onCloseEmptyContextMenu={() => setEmptyContextMenu(null)}
      onCloseNewChapterModal={() => setIsNewChapterModalOpen(false)}
      onCollapseAllChapters={chapterExpansion.collapseAll}
      onOpenChapterMenu={(chapterId, position) =>
        setOpenContextMenu({ chapterId, kind: 'chapter', ...position })
      }
      onOpenDocumentMenu={(documentId, position) =>
        setOpenContextMenu({ documentId, kind: 'document', ...position })
      }
      onOpenEmptyContextMenu={setEmptyContextMenu}
      onOpenAllChapters={() => chapterExpansion.openAll(props.chapters)}
      onOpenNewChapterModal={() => setIsNewChapterModalOpen(true)}
      onSetChapterPendingDelete={setChapterPendingDelete}
      onSetChapterPendingRename={setChapterPendingRename}
      onToggleChapter={chapterExpansion.toggle}
      openContextMenu={openContextMenu}
    />
  );
}
function ChapterTreeBody(props: ChapterTreeBodyProps): ReactElement {
  return (
    <nav
      className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
      aria-label="Book chapters"
      onContextMenu={(event) => {
        const menuPosition = getEmptyContextMenuPosition(event);
        if (menuPosition) {
          props.onOpenEmptyContextMenu(menuPosition);
        }
      }}
    >
      <ChapterTreeItems
        activeChapterId={props.activeChapterId}
        activeDocumentId={props.activeDocumentId}
        bookLevelEpisodes={props.bookLevelEpisodes}
        chapters={props.chapters}
        documents={props.documents}
        expandedChapterIds={props.expandedChapterIds}
        onCloseMenu={props.onCloseDocumentMenu}
        onCreateEpisodeAfter={props.onCreateEpisodeAfter}
        onDeleteChapter={props.onDeleteChapter}
        onDeleteDocument={props.onDeleteDocument}
        onMoveChapter={props.onMoveChapter}
        onMoveDocument={props.onMoveDocument}
        onOpenChapterMenu={props.onOpenChapterMenu}
        onOpenMenu={props.onOpenDocumentMenu}
        onRequestDeleteChapter={props.onSetChapterPendingDelete}
        onRequestRenameChapter={props.onSetChapterPendingRename}
        onSelectDocument={props.onSelectDocument}
        onToggleChapter={props.onToggleChapter}
        openContextMenu={props.openContextMenu}
      />
      <EmptyContextMenuLayer
        bookLevelEpisodes={props.bookLevelEpisodes}
        menu={props.emptyContextMenu}
        onClose={props.onCloseEmptyContextMenu}
        onCollapseAllChapters={props.onCollapseAllChapters}
        onCreateEpisodeAfter={props.onCreateEpisodeAfter}
        onOpenAllChapters={props.onOpenAllChapters}
        onOpenNewChapterModal={props.onCreateChapter ? props.onOpenNewChapterModal : undefined}
      />
      <ChapterTreeDialogs
        chapterPendingDelete={props.chapterPendingDelete}
        chapterPendingRename={props.chapterPendingRename}
        isNewChapterModalOpen={props.isNewChapterModalOpen}
        onCloseNewChapterModal={props.onCloseNewChapterModal}
        onCreateChapter={props.onCreateChapter}
        onDeleteChapter={props.onDeleteChapter}
        onRenameChapter={props.onRenameChapter}
        onSetChapterPendingDelete={props.onSetChapterPendingDelete}
        onSetChapterPendingRename={props.onSetChapterPendingRename}
      />
    </nav>
  );
}

interface ChapterTreeBodyProps extends Omit<ChapterTreeProps, 'expandedChapterIds'> {
  bookLevelEpisodes: DocumentItem[];
  chapterPendingDelete: ChapterItem | null;
  chapterPendingRename: ChapterItem | null;
  emptyContextMenu: MenuPosition | null;
  expandedChapterIds: Set<string>;
  isNewChapterModalOpen: boolean;
  onCloseDocumentMenu: () => void;
  onCloseEmptyContextMenu: () => void;
  onCloseNewChapterModal: () => void;
  onCollapseAllChapters: () => void;
  onOpenChapterMenu: (chapterId: string, position: MenuPosition) => void;
  onOpenDocumentMenu: (documentId: string, position: MenuPosition) => void;
  onOpenEmptyContextMenu: (position: MenuPosition) => void;
  onOpenAllChapters: () => void;
  onOpenNewChapterModal: () => void;
  onSetChapterPendingDelete: (chapter: ChapterItem | null) => void;
  onSetChapterPendingRename: (chapter: ChapterItem | null) => void;
  onToggleChapter: (chapterId: string) => void;
  openContextMenu: WritingSidebarContextMenuState;
}

function getBookLevelEpisodes(documents: DocumentItem[]): DocumentItem[] {
  return documents.filter((document) => document.chapterId === null && document.kind === 'episode');
}

function getEmptyContextMenuPosition(event: MouseEvent): MenuPosition | null {
  if ((event.target as HTMLElement).closest('[data-sidebar-item]')) {
    return null;
  }

  event.preventDefault();
  return { x: event.clientX, y: event.clientY };
}

function EmptyContextMenuLayer({
  bookLevelEpisodes,
  menu,
  onClose,
  onCollapseAllChapters,
  onCreateEpisodeAfter,
  onOpenAllChapters,
  onOpenNewChapterModal,
}: {
  bookLevelEpisodes: DocumentItem[];
  menu: MenuPosition | null;
  onClose: () => void;
  onCollapseAllChapters: () => void;
  onCreateEpisodeAfter?: (chapterId: string | null, previousDocumentId: string | null) => void;
  onOpenAllChapters: () => void;
  onOpenNewChapterModal?: () => void;
}): ReactElement | null {
  if (!menu) {
    return null;
  }

  return (
    <SidebarEmptySpaceContextMenu
      onClose={onClose}
      onCollapseAll={onCollapseAllChapters}
      onNewChapter={onOpenNewChapterModal}
      onNewEpisode={() => onCreateEpisodeAfter?.(null, bookLevelEpisodes.at(-1)?.id ?? null)}
      onOpenAll={onOpenAllChapters}
      x={menu.x}
      y={menu.y}
    />
  );
}

function ChapterTreeItems(props: ChapterTreeItemsProps): ReactElement {
  return (
    <>
      <BookEpisodeList
        activeDocumentId={props.activeDocumentId}
        documents={props.bookLevelEpisodes}
        onCloseMenu={props.onCloseMenu}
        onCreateEpisodeAfter={props.onCreateEpisodeAfter}
        onDeleteDocument={props.onDeleteDocument}
        onMoveDocument={props.onMoveDocument}
        onOpenMenu={props.onOpenMenu}
        onSelectDocument={props.onSelectDocument}
        openContextMenu={props.openContextMenu}
      />
      <ChapterRows
        activeChapterId={props.activeChapterId}
        activeDocumentId={props.activeDocumentId}
        chapters={props.chapters}
        documents={props.documents}
        expandedChapterIds={props.expandedChapterIds}
        onCloseMenu={props.onCloseMenu}
        onCreateEpisodeAfter={props.onCreateEpisodeAfter}
        onDeleteChapter={props.onDeleteChapter}
        onDeleteDocument={props.onDeleteDocument}
        onMoveChapter={props.onMoveChapter}
        onMoveDocument={props.onMoveDocument}
        onOpenChapterMenu={props.onOpenChapterMenu}
        onOpenMenu={props.onOpenMenu}
        onRequestDeleteChapter={props.onRequestDeleteChapter}
        onRequestRenameChapter={props.onRequestRenameChapter}
        onSelectDocument={props.onSelectDocument}
        onToggleChapter={props.onToggleChapter}
        openContextMenu={props.openContextMenu}
      />
    </>
  );
}

interface ChapterTreeItemsProps extends Omit<ChapterRowsProps, 'hasBookLevelEpisodes'> {
  bookLevelEpisodes: DocumentItem[];
}

function ChapterRows(props: ChapterRowsProps): ReactElement {
  return (
    <>
      {props.chapters.map((chapter) => (
        <ChapterRow
          activeDocumentId={props.activeDocumentId}
          chapter={chapter}
          documents={props.documents.filter((document) => document.chapterId === chapter.id)}
          isActive={chapter.id === props.activeChapterId}
          isExpanded={props.expandedChapterIds.has(chapter.id)}
          key={chapter.id}
          onCloseMenu={props.onCloseMenu}
          onCreateEpisodeAfter={props.onCreateEpisodeAfter}
          onDeleteChapter={props.onDeleteChapter}
          onDeleteDocument={props.onDeleteDocument}
          onMoveChapter={props.onMoveChapter}
          onMoveDocument={props.onMoveDocument}
          onOpenChapterMenu={props.onOpenChapterMenu}
          onOpenMenu={props.onOpenMenu}
          onRequestDeleteChapter={props.onRequestDeleteChapter}
          onRequestRenameChapter={props.onRequestRenameChapter}
          onSelectDocument={props.onSelectDocument}
          onToggleChapter={props.onToggleChapter}
          openContextMenu={props.openContextMenu}
        />
      ))}
    </>
  );
}

interface ChapterRowsProps {
  activeChapterId?: string;
  activeDocumentId?: string;
  chapters: ChapterItem[];
  documents: DocumentItem[];
  expandedChapterIds: Set<string>;
  onCloseMenu: () => void;
  onCreateEpisodeAfter?: (chapterId: string | null, previousDocumentId: string | null) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveChapter?: (chapterId: string, direction: 'down' | 'up') => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onOpenChapterMenu: (chapterId: string, position: { x: number; y: number }) => void;
  onOpenMenu: (documentId: string, position: { x: number; y: number }) => void;
  onRequestDeleteChapter: (chapter: ChapterItem) => void;
  onRequestRenameChapter: (chapter: ChapterItem) => void;
  onSelectDocument?: (documentId: string) => void;
  onToggleChapter: (chapterId: string) => void;
  openContextMenu: WritingSidebarContextMenuState;
}
