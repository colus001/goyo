import type { ReactElement } from 'react';
import { ChapterDeleteDialog } from './chapter-delete-dialog';
import { NewChapterModal } from './new-chapter-modal';
import type { WritingShellProps } from './writing-shell';

type ChapterItem = NonNullable<WritingShellProps['chapters']>[number];

export function ChapterTreeDialogs({
  chapterPendingDelete,
  isNewChapterModalOpen,
  onCloseNewChapterModal,
  onCreateChapter,
  onDeleteChapter,
  onSetChapterPendingDelete,
}: {
  chapterPendingDelete: ChapterItem | null;
  isNewChapterModalOpen: boolean;
  onCloseNewChapterModal: () => void;
  onCreateChapter?: (title?: string) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onSetChapterPendingDelete: (chapter: ChapterItem | null) => void;
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
