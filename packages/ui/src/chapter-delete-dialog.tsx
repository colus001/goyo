import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { WritingShellProps } from './writing-shell';

type ChapterItem = NonNullable<WritingShellProps['chapters']>[number];

export function ChapterDeleteDialog({
  chapter,
  onCancel,
  onConfirm,
}: {
  chapter: ChapterItem;
  onCancel: () => void;
  onConfirm: () => void;
}): ReactElement {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#1f1d19]/20 px-6">
      <div
        aria-labelledby="delete-chapter-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[#ded8ce] bg-[#fffefb] p-6 shadow-[0_24px_80px_rgba(31,29,25,0.24)]"
        role="dialog"
      >
        <p className="mb-2 font-medium text-[#9b514a] text-xs uppercase tracking-[0.16em]">
          Delete chapter
        </p>
        <h2
          className="font-semibold text-[#25231f] text-[1.55rem] leading-tight tracking-[-0.045em]"
          id="delete-chapter-title"
        >
          Delete “{chapter.title}”?
        </h2>
        <p className="mt-3 text-[#746f66] leading-relaxed">
          This removes the chapter and its episodes from this book. Your local data is archived, not
          permanently erased.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="cursor-pointer rounded-full bg-[#ece9e2] px-4 py-2 font-medium text-[#34312c] transition hover:bg-[#e3dfd6] focus:outline-none focus:ring-2 focus:ring-[#d65a53]/20"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="cursor-pointer rounded-full bg-[#9b514a] px-4 py-2 font-medium text-white transition hover:bg-[#82423c] focus:outline-none focus:ring-2 focus:ring-[#d65a53]/25"
            onClick={onConfirm}
            type="button"
          >
            Delete chapter
          </button>
        </div>
      </div>
    </div>
  );
}
