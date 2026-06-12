import { type BookMetadata, QUICK_DRAFTS_BOOK_ID } from '@writer/core';
import { Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';
import { LibraryHeader, type LibrarySortMode } from './library-header';
import { LibraryOverlays } from './library-overlays';

type ContextMenuState = { bookId: string; x: number; y: number } | null;

const BOOK_ACCENT_COLORS = ['#a6534b', '#b68243', '#6f7f5f', '#4f6f64', '#52697f', '#6b5876'];

export function LibraryScreen({
  onOpenSettings,
  workspace,
}: {
  onOpenSettings: () => void;
  workspace: WritingWorkspaceState;
}): ReactElement {
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
    <main className="h-screen overflow-y-auto bg-[var(--goyo-app)] px-10 py-10 text-[var(--goyo-text)]">
      <section className="mx-auto max-w-[64rem]">
        <LibraryHeader
          onOpenNewBookModal={() => setIsNewBookModalOpen(true)}
          onOpenSettings={onOpenSettings}
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
      <LibraryOverlays
        accentColors={BOOK_ACCENT_COLORS}
        bookPendingDelete={bookPendingDelete}
        isNewBookModalOpen={isNewBookModalOpen}
        onCloseNewBookModal={() => setIsNewBookModalOpen(false)}
        onCreateBook={workspace.createBookWithDetails}
        onDeleteBook={workspace.deleteBook}
        onSetBookPendingDelete={setBookPendingDelete}
      />
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
        <div className="col-span-full rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-8 text-[var(--goyo-text-muted)]">
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
          isQuickDrafts
            ? 'border-[var(--goyo-border-strong)] bg-[var(--goyo-panel)]'
            : 'border-[var(--goyo-border-strong)] bg-[var(--goyo-raised)]'
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
            className={`mb-6 h-px w-10 ${
              isQuickDrafts ? 'bg-[var(--goyo-border-strong)]' : 'bg-[var(--goyo-border)]'
            }`}
            aria-hidden="true"
          />
          {isQuickDrafts ? (
            <span className="mb-2 font-medium text-[var(--goyo-text-faint)] text-[0.62rem] uppercase tracking-[0.16em]">
              System inbox
            </span>
          ) : null}
          <span className="block font-semibold text-[var(--goyo-text)] text-[1.22rem] leading-tight tracking-[-0.04em]">
            {book.title}
          </span>
          <span
            className={`mt-auto block border-t pt-3 text-xs leading-snug ${
              isQuickDrafts
                ? 'border-[var(--goyo-border-strong)] text-[var(--goyo-text-muted)]'
                : 'border-[var(--goyo-border)] text-[var(--goyo-text-faint)]'
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
      <span className="absolute inset-y-0 left-5 w-px bg-[var(--goyo-border)]" aria-hidden="true" />
    </>
  );
}

function QuickDraftsCoverMark(): ReactElement {
  return (
    <>
      <span
        className="absolute inset-y-0 left-0 w-3 bg-[var(--goyo-accent-soft)]"
        aria-hidden="true"
      />
      <span
        className="absolute top-6 right-5 left-8 h-px bg-[var(--goyo-border)]"
        aria-hidden="true"
      />
      <span
        className="absolute top-10 right-8 left-8 h-px bg-[var(--goyo-border)]"
        aria-hidden="true"
      />
      <span
        className="absolute top-14 right-12 left-8 h-px bg-[var(--goyo-border)]"
        aria-hidden="true"
      />
    </>
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
