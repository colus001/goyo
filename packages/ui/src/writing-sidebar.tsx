import { APP_NAME } from '@writer/shared';
import { ChevronUp, Menu } from 'lucide-react';
import type { KeyboardEvent, ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { SyncStatusIcon } from './sync-status-icon';
import { ChapterTree } from './writing-chapter-tree';
import type { WritingShellProps } from './writing-shell';

interface WritingSidebarProps extends Omit<WritingShellProps, 'children'> {
  isCollapsed: boolean;
  onToggle: () => void;
}

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
  onMoveChapter,
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
            onMoveChapter={onMoveChapter}
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
            if (isComposing(event)) {
              return;
            }

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

function isComposing(event: KeyboardEvent<HTMLInputElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}
