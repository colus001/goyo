import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { type BookMenuState, WritingBookList } from './writing-book-list';
import { type FilteredNavigationItems, WritingBookNavigation } from './writing-book-navigation';
import type { WritingShellProps } from './writing-shell';

type SidebarView = 'book' | 'books';

interface WritingSidebarProps extends Omit<WritingShellProps, 'children'> {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function WritingSidebar(props: WritingSidebarProps): ReactElement {
  const [bookMenu, setBookMenu] = useState<BookMenuState>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarView, setSidebarView] = useState<SidebarView>(() =>
    props.activeBookId ? 'book' : 'books',
  );
  useCloseBookMenu(bookMenu, () => setBookMenu(null));
  useEffect(() => {
    if (!props.activeBookId) {
      setSidebarView('books');
    }
  }, [props.activeBookId]);

  return (
    <aside
      className={`flex h-full min-h-0 flex-col overflow-hidden border-[var(--goyo-border)] border-r bg-[var(--goyo-panel)] ${
        props.isCollapsed ? 'pointer-events-none border-r-0' : ''
      }`}
      aria-label="Manuscript navigation"
      aria-hidden={props.isCollapsed}
    >
      {props.isCollapsed ? null : (
        <SidebarContent
          bookMenu={bookMenu}
          onBookMenuChange={setBookMenu}
          onSearchChange={setSearchQuery}
          onViewChange={setSidebarView}
          props={props}
          searchQuery={searchQuery}
          sidebarView={sidebarView}
        />
      )}
    </aside>
  );
}

function SidebarContent({
  bookMenu,
  onBookMenuChange,
  onSearchChange,
  onViewChange,
  props,
  searchQuery,
  sidebarView,
}: {
  bookMenu: BookMenuState;
  onBookMenuChange: (state: BookMenuState) => void;
  onSearchChange: (query: string) => void;
  onViewChange: (view: SidebarView) => void;
  props: WritingSidebarProps;
  searchQuery: string;
  sidebarView: SidebarView;
}): ReactElement {
  const books = props.books ?? [];
  const activeBook = books.find((book) => book.id === props.activeBookId);
  const filteredNavigation = useMemo(
    () => filterNavigationItems(props.chapters ?? [], props.documents ?? [], searchQuery),
    [props.chapters, props.documents, searchQuery],
  );
  const showBookView = () => {
    onSearchChange('');
    onViewChange('book');
  };
  const showBooksView = () => {
    onSearchChange('');
    onViewChange('books');
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <div
        className={`grid h-full min-h-0 w-[200%] grid-cols-2 transition-transform duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          sidebarView === 'book' ? '-translate-x-1/2' : 'translate-x-0'
        }`}
      >
        <div
          aria-hidden={sidebarView !== 'books'}
          className={`min-h-0 min-w-0 ${sidebarView === 'books' ? '' : 'pointer-events-none'}`}
        >
          <BooksPane
            bookMenu={bookMenu}
            books={books}
            onBookMenuChange={onBookMenuChange}
            onShowBookView={showBookView}
            props={props}
          />
        </div>
        <div
          aria-hidden={sidebarView !== 'book'}
          className={`min-h-0 min-w-0 ${sidebarView === 'book' ? '' : 'pointer-events-none'}`}
        >
          <BookPane
            activeBook={activeBook}
            filteredNavigation={filteredNavigation}
            onShowBooksView={showBooksView}
            onSearchChange={onSearchChange}
            props={props}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  );
}

function BooksPane({
  bookMenu,
  books,
  onBookMenuChange,
  onShowBookView,
  props,
}: {
  bookMenu: BookMenuState;
  books: NonNullable<WritingShellProps['books']>;
  onBookMenuChange: (state: BookMenuState) => void;
  onShowBookView: () => void;
  props: WritingSidebarProps;
}): ReactElement {
  return (
    <WritingBookList
      activeBookId={props.activeBookId}
      bookMenu={bookMenu}
      books={books}
      onCloseMenu={() => onBookMenuChange(null)}
      onCreateBook={() => {
        props.onCreateBook?.();
        onShowBookView();
      }}
      onDeleteBook={props.onDeleteBook}
      onOpenMenu={(bookId, position) => onBookMenuChange({ bookId, ...position })}
      onSelectBook={(bookId) => {
        props.onSelectBook?.(bookId);
        onShowBookView();
      }}
      onStartQuickDraft={() => {
        props.onStartQuickDraft?.();
        onShowBookView();
      }}
      onUpdateBookAccentColor={props.onUpdateBookAccentColor}
    />
  );
}

function BookPane({
  activeBook,
  filteredNavigation,
  onSearchChange,
  onShowBooksView,
  props,
  searchQuery,
}: {
  activeBook: NonNullable<WritingShellProps['books']>[number] | undefined;
  filteredNavigation: ReturnType<typeof filterNavigationItems>;
  onSearchChange: (query: string) => void;
  onShowBooksView: () => void;
  props: WritingSidebarProps;
  searchQuery: string;
}): ReactElement {
  return (
    <WritingBookNavigation
      activeBook={activeBook}
      activeChapterId={props.activeChapterId}
      activeDocumentId={props.activeDocumentId}
      expandedChapterIds={props.expandedChapterIds}
      filteredNavigation={filteredNavigation}
      onBack={onShowBooksView}
      onCreateChapter={props.onCreateChapter}
      onCreateEpisodeAfter={props.onCreateEpisodeAfter}
      onDeleteChapter={props.onDeleteChapter}
      onDeleteDocument={props.onDeleteDocument}
      onExpandedChapterIdsChange={props.onExpandedChapterIdsChange}
      onMoveChapter={props.onMoveChapter}
      onMoveDocument={props.onMoveDocument}
      onRenameChapter={props.onRenameChapter}
      onSearchChange={onSearchChange}
      onSelectDocument={props.onSelectDocument}
      searchQuery={searchQuery}
    />
  );
}

function useCloseBookMenu(bookMenu: BookMenuState, onClose: () => void) {
  useEffect(() => {
    if (!bookMenu) {
      return;
    }

    window.addEventListener('pointerdown', onClose);
    window.addEventListener('keydown', onClose);

    return () => {
      window.removeEventListener('pointerdown', onClose);
      window.removeEventListener('keydown', onClose);
    };
  }, [bookMenu, onClose]);
}

function filterNavigationItems(
  chapters: NonNullable<WritingShellProps['chapters']>,
  documents: NonNullable<WritingShellProps['documents']>,
  searchQuery: string,
): FilteredNavigationItems {
  const query = searchQuery.trim().toLowerCase();

  if (query.length === 0) {
    return { chapters, documents };
  }

  const matchingDocuments = documents.filter((document) =>
    document.title.toLowerCase().includes(query),
  );
  const matchingDocumentChapterIds = new Set(
    matchingDocuments.map((document) => document.chapterId).filter(Boolean),
  );
  const matchingChapters = chapters.filter(
    (chapter) =>
      chapter.title.toLowerCase().includes(query) || matchingDocumentChapterIds.has(chapter.id),
  );
  const matchingChapterIds = new Set(matchingChapters.map((chapter) => chapter.id));

  return {
    chapters: matchingChapters,
    documents: documents.filter(
      (document) =>
        document.title.toLowerCase().includes(query) ||
        (document.chapterId !== null && matchingChapterIds.has(document.chapterId)),
    ),
  };
}
