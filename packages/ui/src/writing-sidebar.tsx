import { APP_NAME } from '@writer/shared';
import { ChevronUp, Menu } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { ChapterDeleteDialog } from './chapter-delete-dialog';
import { NewChapterModal } from './new-chapter-modal';
import { SyncStatusIcon } from './sync-status-icon';
import { ChapterRow, type WritingSidebarContextMenuState } from './writing-chapter-row';
import type { WritingShellProps } from './writing-shell';

interface WritingSidebarProps extends Omit<WritingShellProps, 'children'> {
  isCollapsed: boolean;
  onToggle: () => void;
}

type ChapterItem = NonNullable<WritingShellProps['chapters']>[number];
type DocumentItem = NonNullable<WritingShellProps['documents']>[number];

export function WritingSidebar({
  activeChapterId,
  activeDocumentId,
  bookAccentColor,
  bookTitle = 'Untitled book',
  chapters = [],
  documents = [],
  isCollapsed,
  onCreateChapter,
  onCreateEpisodeAfter,
  onDeleteChapter,
  onDeleteDocument,
  onMoveDocument,
  onRenameBook,
  onSelectChapter,
  onSelectDocument,
  onShowLibrary,
  onToggle,
  status = 'Local session',
}: WritingSidebarProps): ReactElement {
  return (
    <aside
      className="flex h-screen min-h-0 flex-col overflow-hidden border-[#deded9] border-r bg-[#fbfbfa]"
      aria-label="Manuscript navigation"
    >
      <header
        className={`border-[#e4e0d8] border-b bg-[#fbfaf7] ${isCollapsed ? 'px-2 py-3' : 'px-3 pt-3 pb-4'}`}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center justify-between gap-2.5">
              <button
                aria-label="Hide manuscript list"
                className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-[#78756d] transition hover:bg-white/80 hover:text-[#2f2d29] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d65a53]/25"
                onClick={onToggle}
                type="button"
              >
                <Menu aria-hidden="true" size={18} strokeWidth={2.1} />
              </button>
              <button
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 font-medium text-[#77736a] text-sm transition hover:bg-[#f0eee8] hover:text-[#302e29] focus:outline-none focus:ring-2 focus:ring-[#d65a53]/20"
                onClick={onShowLibrary}
                type="button"
              >
                <ChevronUp aria-hidden="true" size={16} strokeWidth={2.1} />
                Library
              </button>
            </div>
            <BookTitleBlock
              className="ml-2"
              bookAccentColor={bookAccentColor}
              bookTitle={bookTitle}
              chapterCount={chapters.length}
              onRenameBook={onRenameBook}
            />
          </>
        ) : (
          <button
            aria-label="Show manuscript list"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-[#78756d] transition hover:bg-white/80 hover:text-[#2f2d29] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d65a53]/25"
            onClick={onToggle}
            type="button"
          >
            <Menu aria-hidden="true" size={18} strokeWidth={2.1} />
          </button>
        )}
      </header>

      {!isCollapsed ? (
        <>
          <ChapterTree
            activeChapterId={activeChapterId}
            activeDocumentId={activeDocumentId}
            chapters={chapters}
            documents={documents}
            onCreateChapter={onCreateChapter}
            onCreateEpisodeAfter={onCreateEpisodeAfter}
            onDeleteChapter={onDeleteChapter}
            onDeleteDocument={onDeleteDocument}
            onMoveDocument={onMoveDocument}
            onSelectChapter={onSelectChapter}
            onSelectDocument={onSelectDocument}
          />
          <footer className="flex items-center justify-between border-[#ededeb] border-t px-5 py-3">
            <span className="text-[#9b9b94] text-xs">Local</span>
            <SyncStatusIcon status={status} />
          </footer>
        </>
      ) : null}
    </aside>
  );
}

function BookTitleBlock({
  className,
  bookAccentColor,
  bookTitle,
  chapterCount,
  onRenameBook,
}: {
  className?: string;
  bookAccentColor?: string;
  bookTitle: string;
  chapterCount: number;
  onRenameBook?: (title: string) => void;
}): ReactElement {
  const [draftTitle, setDraftTitle] = useState(bookTitle);

  useEffect(() => {
    setDraftTitle(bookTitle);
  }, [bookTitle]);

  const commitTitle = () => {
    if (draftTitle.trim().length === 0) {
      setDraftTitle(bookTitle);
      return;
    }

    onRenameBook?.(draftTitle);
  };

  return (
    <div className={`mt-2.5 ${className ?? ''}`}>
      <div
        className="border-l-[2.5px] py-1 pl-2.5"
        style={{ borderColor: bookAccentColor ?? '#a6534b' }}
      >
        <input
          aria-label="Book title"
          className="block w-full rounded-md bg-transparent px-0 font-semibold text-[#25231f] text-[1.16rem] leading-tight tracking-[-0.04em] outline-none transition placeholder:text-[#b8b1a5] focus:bg-white/80 focus:px-2 focus:py-1 focus:ring-2 focus:ring-[#d65a53]/18"
          onBlur={commitTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
          placeholder={APP_NAME}
          value={draftTitle}
        />
        <p className="mt-2 font-medium text-[#8d887e] text-xs">
          {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
        </p>
      </div>
    </div>
  );
}

function ChapterTree({
  activeChapterId,
  activeDocumentId,
  chapters,
  documents,
  onCreateChapter,
  onCreateEpisodeAfter,
  onDeleteChapter,
  onDeleteDocument,
  onMoveDocument,
  onSelectChapter,
  onSelectDocument,
}: {
  activeChapterId?: string;
  activeDocumentId?: string;
  chapters: ChapterItem[];
  documents: DocumentItem[];
  onCreateChapter?: (title?: string) => void;
  onCreateEpisodeAfter?: (chapterId: string, previousDocumentId: string | null) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onSelectChapter?: (chapterId: string) => void;
  onSelectDocument?: (documentId: string) => void;
}): ReactElement {
  const [openContextMenu, setOpenContextMenu] = useState<WritingSidebarContextMenuState>(null);
  const [chapterPendingDelete, setChapterPendingDelete] = useState<ChapterItem | null>(null);
  const [isNewChapterModalOpen, setIsNewChapterModalOpen] = useState(false);

  return (
    <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-3" aria-label="Book chapters">
      {chapters.map((chapter) => (
        <ChapterRow
          activeDocumentId={activeDocumentId}
          chapter={chapter}
          documents={documents.filter((document) => document.chapterId === chapter.id)}
          isActive={chapter.id === activeChapterId}
          key={chapter.id}
          onCloseMenu={() => setOpenContextMenu(null)}
          onCreateEpisodeAfter={onCreateEpisodeAfter}
          onDeleteChapter={onDeleteChapter}
          onDeleteDocument={onDeleteDocument}
          onOpenChapterMenu={(chapterId, position) =>
            setOpenContextMenu({ chapterId, kind: 'chapter', ...position })
          }
          onOpenMenu={(documentId, position) =>
            setOpenContextMenu({ documentId, kind: 'document', ...position })
          }
          onRequestDeleteChapter={setChapterPendingDelete}
          onMoveDocument={onMoveDocument}
          onSelectChapter={onSelectChapter}
          onSelectDocument={onSelectDocument}
          openContextMenu={openContextMenu}
        />
      ))}
      {chapters.length === 0 ? (
        <p className="px-2 pt-5 text-[#8d8d86] text-sm">Create a chapter to start this book.</p>
      ) : null}
      <button
        className="mt-3 w-full cursor-pointer rounded-md px-2.5 py-2 text-left font-medium text-[#6f6f68] text-sm transition hover:bg-[#f0eee8] focus:outline-none focus:ring-2 focus:ring-[#d65a53]/25"
        onClick={() => setIsNewChapterModalOpen(true)}
        type="button"
      >
        + Chapter
      </button>
      {chapterPendingDelete ? (
        <ChapterDeleteDialog
          chapter={chapterPendingDelete}
          onCancel={() => setChapterPendingDelete(null)}
          onConfirm={() => {
            onDeleteChapter?.(chapterPendingDelete.id);
            setChapterPendingDelete(null);
          }}
        />
      ) : null}
      {isNewChapterModalOpen ? (
        <NewChapterModal
          onClose={() => setIsNewChapterModalOpen(false)}
          onCreate={(title) => {
            onCreateChapter?.(title);
            setIsNewChapterModalOpen(false);
          }}
        />
      ) : null}
    </nav>
  );
}
