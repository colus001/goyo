import { type BookMetadata, QUICK_DRAFTS_BOOK_ID } from '@writer/core';
import { Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';
import { LibraryHeader, type LibrarySortMode } from './library-header';
import { NewBookModal } from './new-book-modal';

type ContextMenuState = { bookId: string; x: number; y: number } | null;

const BOOK_ACCENT_COLORS = ['#a6534b', '#b68243', '#6f7f5f', '#4f6f64', '#52697f', '#6b5876'];

export function LibraryScreen({ workspace }: { workspace: WritingWorkspaceState }): ReactElement {
  const books = workspace.session?.books ?? [];
  const [openContextMenu, setOpenContextMenu] = useState<ContextMenuState>(null);
  const [bookPendingDelete, setBookPendingDelete] = useState<BookMetadata | null>(null);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState(false);
  const [sortMode, setSortMode] = useState<LibrarySortMode>('updated');
  const sortedBooks = sortLibraryBooks(books, sortMode);

  useEffect(() => {
    if (!openContextMenu) {
      return;
    }

    const closeMenu = () => setOpenContextMenu(null);

    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', closeMenu);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', closeMenu);
    };
  }, [openContextMenu]);

  return (
    <main className="h-screen overflow-y-auto bg-[#f8f6f1] px-10 py-10 text-[#252525]">
      <section className="mx-auto max-w-[64rem]">
        <LibraryHeader
          onOpenNewBookModal={() => setIsNewBookModalOpen(true)}
          onStartQuickDraft={workspace.startQuickDraft}
          onSortModeChange={setSortMode}
          sortMode={sortMode}
        />

        <LibraryBookList
          books={sortedBooks}
          openContextMenu={openContextMenu}
          onCloseMenu={() => setOpenContextMenu(null)}
          onDeleteBook={setBookPendingDelete}
          onOpenMenu={(bookId, position) => setOpenContextMenu({ bookId, ...position })}
          onSelectBook={workspace.selectBook}
          onUpdateAccentColor={workspace.updateBookAccentColor}
        />
      </section>
      {bookPendingDelete ? (
        <DeleteBookDialog
          book={bookPendingDelete}
          onCancel={() => setBookPendingDelete(null)}
          onConfirm={() => {
            workspace.deleteBook(bookPendingDelete.id);
            setBookPendingDelete(null);
          }}
        />
      ) : null}
      {isNewBookModalOpen ? (
        <NewBookModal
          accentColors={BOOK_ACCENT_COLORS}
          onClose={() => setIsNewBookModalOpen(false)}
          onCreate={workspace.createBookWithDetails}
        />
      ) : null}
    </main>
  );
}

function LibraryBookList({
  books,
  onCloseMenu,
  onDeleteBook,
  onOpenMenu,
  onSelectBook,
  onUpdateAccentColor,
  openContextMenu,
}: {
  books: BookMetadata[];
  onCloseMenu: () => void;
  onDeleteBook: (book: BookMetadata) => void;
  onOpenMenu: (bookId: string, position: { x: number; y: number }) => void;
  onSelectBook: (bookId: string) => void;
  onUpdateAccentColor: (bookId: string, accentColor: string) => void;
  openContextMenu: ContextMenuState;
}): ReactElement {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] items-start gap-x-7 gap-y-9">
      {books.map((book) => (
        <BookCard
          book={book}
          isQuickDrafts={book.id === QUICK_DRAFTS_BOOK_ID}
          key={book.id}
          menuPosition={
            openContextMenu?.bookId === book.id
              ? { x: openContextMenu.x, y: openContextMenu.y }
              : null
          }
          onCloseMenu={onCloseMenu}
          onDeleteBook={() => onDeleteBook(book)}
          onOpenMenu={(position) => onOpenMenu(book.id, position)}
          onSelectBook={onSelectBook}
          onUpdateAccentColor={(accentColor) => onUpdateAccentColor(book.id, accentColor)}
        />
      ))}
      {books.length === 0 ? (
        <div className="col-span-full rounded-xl border border-[#e4dfd6] bg-white p-8 text-[#777771]">
          No books yet. Create one or start writing without a book.
        </div>
      ) : null}
    </div>
  );
}

function BookCard({
  book,
  isQuickDrafts,
  menuPosition,
  onCloseMenu,
  onDeleteBook,
  onOpenMenu,
  onSelectBook,
  onUpdateAccentColor,
}: {
  book: BookMetadata;
  isQuickDrafts: boolean;
  menuPosition: { x: number; y: number } | null;
  onCloseMenu: () => void;
  onDeleteBook: () => void;
  onOpenMenu: (position: { x: number; y: number }) => void;
  onSelectBook: (bookId: string) => void;
  onUpdateAccentColor: (accentColor: string) => void;
}): ReactElement {
  return (
    <div className="relative">
      <button
        className={`group relative aspect-[3/4] w-full max-w-[13.5rem] cursor-pointer overflow-hidden rounded-r-xl rounded-l-md border text-left shadow-[7px_10px_18px_rgba(72,61,48,0.08)] outline-none transition hover:-translate-y-0.5 hover:shadow-[10px_14px_24px_rgba(72,61,48,0.11)] ${
          isQuickDrafts ? 'border-[#d4d7d0] bg-[#f5f5f0]' : 'border-[#d8d0c3] bg-[#fbf7ee]'
        }`}
        onClick={() => {
          onCloseMenu();
          onSelectBook(book.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          if (isQuickDrafts) {
            return;
          }
          onOpenMenu({ x: event.clientX, y: event.clientY });
        }}
        type="button"
      >
        {isQuickDrafts ? (
          <QuickDraftsCoverMark />
        ) : (
          <BookCoverMark accentColor={book.accentColor} />
        )}
        <span className="relative flex h-full flex-col px-8 pt-8 pb-7">
          <span
            className={`mb-6 h-px w-10 ${isQuickDrafts ? 'bg-[#c7cbc4]' : 'bg-[#d2c7b8]'}`}
            aria-hidden="true"
          />
          {isQuickDrafts ? (
            <span className="mb-2 font-medium text-[#7f877b] text-[0.62rem] uppercase tracking-[0.16em]">
              System inbox
            </span>
          ) : null}
          <span className="block font-semibold text-[#26231e] text-[1.22rem] leading-tight tracking-[-0.04em]">
            {book.title}
          </span>
          <span
            className={`mt-auto block border-t pt-3 text-xs leading-snug ${
              isQuickDrafts ? 'border-[#d4d7d0] text-[#737b70]' : 'border-[#d9cfbf] text-[#867d70]'
            }`}
          >
            {isQuickDrafts ? 'Draft inbox' : `Updated ${formatDocumentDate(book.updatedAt)}`}
          </span>
        </span>
      </button>
      {menuPosition && !isQuickDrafts ? (
        <BookContextMenu
          onClose={onCloseMenu}
          onDelete={onDeleteBook}
          onUpdateAccentColor={onUpdateAccentColor}
          x={menuPosition.x}
          y={menuPosition.y}
        />
      ) : null}
    </div>
  );
}

function BookCoverMark({ accentColor }: { accentColor: string }): ReactElement {
  return (
    <>
      <span
        className="absolute inset-y-0 left-0 w-5"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />
      <span className="absolute inset-y-0 left-5 w-px bg-[#d9cfc0]" aria-hidden="true" />
    </>
  );
}

function QuickDraftsCoverMark(): ReactElement {
  return (
    <>
      <span className="absolute inset-y-0 left-0 w-3 bg-[#d7dbd2]" aria-hidden="true" />
      <span className="absolute top-6 right-5 left-8 h-px bg-[#d9ddd5]" aria-hidden="true" />
      <span className="absolute top-10 right-8 left-8 h-px bg-[#e1e4dc]" aria-hidden="true" />
      <span className="absolute top-14 right-12 left-8 h-px bg-[#e1e4dc]" aria-hidden="true" />
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

function BookContextMenu({
  onClose,
  onDelete,
  onUpdateAccentColor,
  x,
  y,
}: {
  onClose: () => void;
  onDelete: () => void;
  onUpdateAccentColor: (accentColor: string) => void;
  x: number;
  y: number;
}): ReactElement {
  return (
    <div
      className="fixed z-50 min-w-40 rounded-lg border border-[#deded8] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      role="menu"
      style={{ left: x, top: y }}
    >
      <div className="px-3 pt-2 pb-2">
        <p className="mb-2 font-medium text-[#8d887e] text-[0.68rem] uppercase tracking-[0.14em]">
          Cover color
        </p>
        <div className="flex gap-1.5">
          {BOOK_ACCENT_COLORS.map((accentColor) => (
            <button
              aria-label={`Set cover color ${accentColor}`}
              className="size-5 cursor-pointer rounded-full border border-black/10 outline-none transition hover:scale-110"
              key={accentColor}
              onClick={(event) => {
                event.stopPropagation();
                onUpdateAccentColor(accentColor);
                onClose();
              }}
              style={{ backgroundColor: accentColor }}
              type="button"
            />
          ))}
        </div>
      </div>
      <div className="my-1 h-px bg-[#ededeb]" />
      <button
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[#b44b43] text-sm hover:bg-[#f4f4f1]"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
          onClose();
        }}
        role="menuitem"
        type="button"
      >
        <Trash2 aria-hidden="true" size={15} />
        Delete
      </button>
    </div>
  );
}

function formatDocumentDate(updatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(updatedAt));
}

function sortLibraryBooks(books: BookMetadata[], sortMode: LibrarySortMode): BookMetadata[] {
  const quickDraftsBook = books.find((book) => book.id === QUICK_DRAFTS_BOOK_ID);
  const regularBooks = books.filter((book) => book.id !== QUICK_DRAFTS_BOOK_ID);
  const sortedRegularBooks = [...regularBooks].sort((firstBook, secondBook) => {
    if (sortMode === 'title') {
      return firstBook.title.localeCompare(secondBook.title);
    }

    return new Date(secondBook.updatedAt).getTime() - new Date(firstBook.updatedAt).getTime();
  });

  return quickDraftsBook ? [quickDraftsBook, ...sortedRegularBooks] : sortedRegularBooks;
}
