import type { BookMetadata } from '@writer/core';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';
import { NewBookModal } from './new-book-modal';

export function LibraryOverlays({
  accentColors,
  bookPendingDelete,
  isNewBookModalOpen,
  onCloseNewBookModal,
  onDeleteBook,
  onSetBookPendingDelete,
  onCreateBook,
}: {
  accentColors: string[];
  bookPendingDelete: BookMetadata | null;
  isNewBookModalOpen: boolean;
  onCloseNewBookModal: () => void;
  onDeleteBook: (bookId: string) => void;
  onSetBookPendingDelete: (book: BookMetadata | null) => void;
  onCreateBook: WritingWorkspaceState['createBookWithDetails'];
}): ReactElement {
  return (
    <>
      {bookPendingDelete ? (
        <DeleteBookDialog
          book={bookPendingDelete}
          onCancel={() => onSetBookPendingDelete(null)}
          onConfirm={() => {
            onDeleteBook(bookPendingDelete.id);
            onSetBookPendingDelete(null);
          }}
        />
      ) : null}
      {isNewBookModalOpen ? (
        <NewBookModal
          accentColors={accentColors}
          onClose={onCloseNewBookModal}
          onCreate={onCreateBook}
        />
      ) : null}
    </>
  );
}

function DeleteBookDialog({
  book,
  onCancel,
  onConfirm,
}: {
  book: BookMetadata;
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
        aria-labelledby="delete-book-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-[#ded8ce] bg-[#fffefb] p-6 shadow-[0_24px_80px_rgba(31,29,25,0.24)]"
        role="dialog"
      >
        <p className="mb-2 font-medium text-[#9b514a] text-xs uppercase tracking-[0.16em]">
          Delete book
        </p>
        <h2
          className="font-semibold text-[#25231f] text-[1.55rem] leading-tight tracking-[-0.045em]"
          id="delete-book-title"
        >
          Delete “{book.title}”?
        </h2>
        <p className="mt-3 text-[#746f66] leading-relaxed">
          This removes the book and its chapters from the library. Your local data is archived, not
          permanently erased.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="cursor-pointer rounded-full bg-[#ece9e2] px-4 py-2 font-medium text-[#34312c] outline-none transition hover:bg-[#e3dfd6]"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="cursor-pointer rounded-full bg-[#9b514a] px-4 py-2 font-medium text-white outline-none transition hover:bg-[#82423c]"
            onClick={onConfirm}
            type="button"
          >
            Delete book
          </button>
        </div>
      </div>
    </div>
  );
}
