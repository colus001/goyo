import { type BookMetadata, QUICK_DRAFTS_BOOK_ID } from '@writer/core';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';
import { BookCard, LIBRARY_BOOK_ACCENT_COLORS } from './library-book-card';
import { LibraryHeader, type LibrarySortMode } from './library-header';
import { LibraryOnboarding } from './library-onboarding';
import { LibraryOverlays } from './library-overlays';
import { WindowDragRegion } from './window-drag-region';

type ContextMenuState = { bookId: string; x: number; y: number } | null;

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

  useCloseLibraryContextMenu(openContextMenu, () => setOpenContextMenu(null));

  if (books.length === 0) {
    return (
      <EmptyLibraryScreen
        bookPendingDelete={bookPendingDelete}
        isNewBookModalOpen={isNewBookModalOpen}
        onCloseNewBookModal={() => setIsNewBookModalOpen(false)}
        onOpenNewBookModal={() => setIsNewBookModalOpen(true)}
        onSetBookPendingDelete={setBookPendingDelete}
        workspace={workspace}
      />
    );
  }

  return (
    <main className="h-screen overflow-y-auto bg-[var(--goyo-app)] px-6 py-8 text-[var(--goyo-text)] sm:px-10 sm:py-10">
      <WindowDragRegion />
      <section className="mx-auto max-w-[64rem]">
        <LibraryContent
          onCloseContextMenu={() => setOpenContextMenu(null)}
          onDeleteBook={setBookPendingDelete}
          onOpenContextMenu={(bookId, position) => setOpenContextMenu({ bookId, ...position })}
          onOpenNewBookModal={() => setIsNewBookModalOpen(true)}
          onOpenSettings={onOpenSettings}
          onSortModeChange={setSortMode}
          openContextMenu={openContextMenu}
          sortMode={sortMode}
          sortedBooks={sortedBooks}
          workspace={workspace}
        />
      </section>
      <LibraryOverlays
        accentColors={LIBRARY_BOOK_ACCENT_COLORS}
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

function useCloseLibraryContextMenu(openContextMenu: ContextMenuState, onClose: () => void) {
  useEffect(() => {
    if (!openContextMenu) {
      return;
    }

    window.addEventListener('click', onClose);
    window.addEventListener('keydown', onClose);

    return () => {
      window.removeEventListener('click', onClose);
      window.removeEventListener('keydown', onClose);
    };
  }, [onClose, openContextMenu]);
}

function EmptyLibraryScreen({
  bookPendingDelete,
  isNewBookModalOpen,
  onCloseNewBookModal,
  onOpenNewBookModal,
  onSetBookPendingDelete,
  workspace,
}: {
  bookPendingDelete: BookMetadata | null;
  isNewBookModalOpen: boolean;
  onCloseNewBookModal: () => void;
  onOpenNewBookModal: () => void;
  onSetBookPendingDelete: (book: BookMetadata | null) => void;
  workspace: WritingWorkspaceState;
}): ReactElement {
  return (
    <main className="h-screen overflow-hidden bg-[var(--goyo-app)] text-[var(--goyo-text)]">
      <WindowDragRegion />
      <LibraryOnboarding
        onOpenNewBookModal={onOpenNewBookModal}
        onStartQuickDraft={workspace.startQuickDraft}
      />
      <LibraryOverlays
        accentColors={LIBRARY_BOOK_ACCENT_COLORS}
        bookPendingDelete={bookPendingDelete}
        isNewBookModalOpen={isNewBookModalOpen}
        onCloseNewBookModal={onCloseNewBookModal}
        onCreateBook={workspace.createBookWithDetails}
        onDeleteBook={workspace.deleteBook}
        onSetBookPendingDelete={onSetBookPendingDelete}
      />
    </main>
  );
}

function LibraryContent({
  onCloseContextMenu,
  onDeleteBook,
  onOpenContextMenu,
  onOpenNewBookModal,
  onOpenSettings,
  onSortModeChange,
  openContextMenu,
  sortMode,
  sortedBooks,
  workspace,
}: {
  onCloseContextMenu: () => void;
  onDeleteBook: (book: BookMetadata) => void;
  onOpenContextMenu: (bookId: string, position: { x: number; y: number }) => void;
  onOpenNewBookModal: () => void;
  onOpenSettings: () => void;
  onSortModeChange: (sortMode: LibrarySortMode) => void;
  openContextMenu: ContextMenuState;
  sortMode: LibrarySortMode;
  sortedBooks: BookMetadata[];
  workspace: WritingWorkspaceState;
}): ReactElement {
  return (
    <>
      <LibraryHeader
        onOpenNewBookModal={onOpenNewBookModal}
        onOpenSettings={onOpenSettings}
        onStartQuickDraft={workspace.startQuickDraft}
        onSortModeChange={onSortModeChange}
        sortMode={sortMode}
      />
      <LibraryBookList
        books={sortedBooks}
        openContextMenu={openContextMenu}
        onCloseMenu={onCloseContextMenu}
        onDeleteBook={onDeleteBook}
        onOpenMenu={onOpenContextMenu}
        onSelectBook={workspace.selectBook}
        onUpdateAccentColor={workspace.updateBookAccentColor}
      />
    </>
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] items-start gap-3">
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
    </div>
  );
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
