import type { ReactElement } from 'react';
import { ChapterDeleteDialog } from './chapter-delete-dialog';
import { NewChapterModal } from './new-chapter-modal';
import type { WritingShellProps } from './writing-shell';

type ChapterItem = NonNullable<WritingShellProps['chapters']>[number];

export function ChapterTreeDialogs({
  chapterPendingDelete,
  chapterPendingRename,
  isNewChapterModalOpen,
  onCloseNewChapterModal,
  onCreateChapter,
  onDeleteChapter,
  onRenameChapter,
  onSetChapterPendingDelete,
  onSetChapterPendingRename,
}: {
  chapterPendingDelete: ChapterItem | null;
  chapterPendingRename: ChapterItem | null;
  isNewChapterModalOpen: boolean;
  onCloseNewChapterModal: () => void;
  onCreateChapter?: (title?: string) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onRenameChapter?: (chapterId: string, title: string) => void;
  onSetChapterPendingDelete: (chapter: ChapterItem | null) => void;
  onSetChapterPendingRename: (chapter: ChapterItem | null) => void;
}): ReactElement {
  return (
    <>
      {chapterPendingDelete ? (
        <ChapterDeleteDialog
          chapter={chapterPendingDelete}
          onCancel={() => onSetChapterPendingDelete(null)}
          onConfirm={() => {
            onDeleteChapter?.(chapterPendingDelete.id);
            onSetChapterPendingDelete(null);
          }}
        />
      ) : null}
      {chapterPendingRename ? (
        <NewChapterModal
          actionLabel="Rename chapter"
          heading="Rename chapter"
          initialTitle={chapterPendingRename.title}
          onClose={() => onSetChapterPendingRename(null)}
          onCreate={(title) => {
            onRenameChapter?.(chapterPendingRename.id, title);
            onSetChapterPendingRename(null);
          }}
        />
      ) : null}
      {isNewChapterModalOpen ? (
        <NewChapterModal
          onClose={onCloseNewChapterModal}
          onCreate={(title) => {
            onCreateChapter?.(title);
            onCloseNewChapterModal();
          }}
        />
      ) : null}
    </>
  );
}
