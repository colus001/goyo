import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { WritingSidebar } from './writing-sidebar';
import { type ActiveMoveTarget, WritingTopBar } from './writing-top-bar';

export interface WritingShellProps {
  activeChapterId?: string;
  activeDocumentId?: string;
  activeBookId?: string;
  bookAccentColor?: string;
  bookTitle?: string;
  books?: Array<{
    accentColor: string;
    id: string;
    isSystem?: boolean;
    title: string;
    updatedAt: string;
  }>;
  breadcrumbSegments?: string[];
  chapters?: Array<{
    id: string;
    isSystem?: boolean;
    title: string;
    updatedAt: string;
  }>;
  children?: ReactNode;
  documents?: Array<{
    chapterId: string | null;
    id: string;
    kind?: 'draft' | 'episode' | 'note';
    title: string;
    updatedAt: string;
  }>;
  expandedChapterIds?: string[];
  isSidebarCollapsed?: boolean;
  onCreateChapter?: (title?: string) => void;
  onCreateBook?: () => void;
  onCreateDocument?: (kind: 'draft' | 'episode' | 'note') => void;
  onCreateDocumentInChapter?: (chapterId: string, kind: 'draft' | 'episode' | 'note') => void;
  onCreateEpisodeAfter?: (chapterId: string | null, previousDocumentId: string | null) => void;
  onCreateRestorePoint?: () => void;
  onDeleteChapter?: (chapterId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveChapter?: (chapterId: string, direction: 'down' | 'up') => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onOpenSettings?: () => void;
  onDeleteBook?: (bookId: string) => void;
  onRenameBook?: (title: string) => void;
  onRenameChapter?: (chapterId: string, title: string) => void;
  onSelectDocument?: (documentId: string) => void;
  onSelectBook?: (bookId: string) => void;
  onExpandedChapterIdsChange?: (chapterIds: string[]) => void;
  onShowLibrary?: () => void;
  onSidebarCollapsedChange?: (isCollapsed: boolean) => void;
  onStartQuickDraft?: () => void;
  onUpdateBookAccentColor?: (bookId: string, accentColor: string) => void;
  status?: string;
  wordCountLabel?: string;
}

export function WritingShell(props: WritingShellProps): ReactElement {
  const normalizedProps = normalizeWritingShellProps(props);
  const [localSidebarCollapsed, setLocalSidebarCollapsed] = useState(false);
  const isSidebarCollapsed = normalizedProps.isSidebarCollapsed ?? localSidebarCollapsed;
  const toggleSidebar = () => {
    const nextValue = !isSidebarCollapsed;

    if (normalizedProps.isSidebarCollapsed === undefined) {
      setLocalSidebarCollapsed(nextValue);
    }

    normalizedProps.onSidebarCollapsedChange?.(nextValue);
  };

  return (
    <main className="grid h-screen grid-rows-[3.35rem_minmax(0,1fr)] overflow-hidden bg-[var(--goyo-app)] text-[var(--goyo-text)] [font-family:var(--goyo-ui-font-family)]">
      <WritingTopBar
        activeDocument={getActiveDocument(normalizedProps)}
        activeMoveTarget={getActiveMoveTarget(normalizedProps)}
        bookTitle={normalizedProps.bookTitle}
        breadcrumbSegments={normalizedProps.breadcrumbSegments}
        isSidebarCollapsed={isSidebarCollapsed}
        onCreateChapter={normalizedProps.onCreateChapter}
        onCreateDocument={normalizedProps.onCreateDocument}
        onCreateRestorePoint={normalizedProps.onCreateRestorePoint}
        onOpenSettings={normalizedProps.onOpenSettings}
        onToggleSidebar={toggleSidebar}
        wordCountLabel={normalizedProps.wordCountLabel}
      />
      <WritingShellBody
        {...normalizedProps}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />
    </main>
  );
}

interface NormalizedWritingShellProps extends WritingShellProps {
  bookTitle: string;
  chapters: NonNullable<WritingShellProps['chapters']>;
  documents: NonNullable<WritingShellProps['documents']>;
  status: string;
}

function normalizeWritingShellProps(props: WritingShellProps): NormalizedWritingShellProps {
  return {
    ...props,
    bookTitle: props.bookTitle ?? 'Untitled book',
    books: props.books ?? [],
    chapters: props.chapters ?? [],
    documents: props.documents ?? [],
    status: props.status ?? 'Local session',
  };
}

function getActiveDocument(props: NormalizedWritingShellProps) {
  return props.documents.find((document) => document.id === props.activeDocumentId);
}

function getActiveMoveTarget(props: NormalizedWritingShellProps): ActiveMoveTarget | null {
  const activeDocument = getActiveDocument(props);
  const activeChapter = props.chapters.find((chapter) => chapter.id === props.activeChapterId);

  if (props.activeDocumentId) {
    return { id: props.activeDocumentId, kind: 'document', title: activeDocument?.title };
  }

  if (props.activeChapterId) {
    return { id: props.activeChapterId, kind: 'chapter', title: activeChapter?.title };
  }

  return null;
}

function WritingShellBody({
  activeChapterId,
  activeBookId,
  activeDocumentId,
  bookAccentColor,
  bookTitle,
  books,
  chapters,
  children,
  documents,
  expandedChapterIds,
  isSidebarCollapsed,
  onCreateChapter,
  onCreateBook,
  onCreateDocument,
  onCreateDocumentInChapter,
  onCreateEpisodeAfter,
  onDeleteChapter,
  onDeleteBook,
  onDeleteDocument,
  onExpandedChapterIdsChange,
  onMoveChapter,
  onMoveDocument,
  onRenameBook,
  onRenameChapter,
  onSelectBook,
  onSelectDocument,
  onStartQuickDraft,
  onToggleSidebar,
  onUpdateBookAccentColor,
}: WritingShellBodyProps): ReactElement {
  return (
    <div
      className={`grid min-h-0 transition-[grid-template-columns] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSidebarCollapsed ? 'grid-cols-[0_minmax(0,1fr)]' : 'grid-cols-[17rem_minmax(0,1fr)]'
      }`}
    >
      <WritingSidebar
        activeBookId={activeBookId}
        activeChapterId={activeChapterId}
        activeDocumentId={activeDocumentId}
        bookAccentColor={bookAccentColor}
        bookTitle={bookTitle}
        books={books}
        chapters={chapters}
        documents={documents}
        isCollapsed={isSidebarCollapsed}
        onCreateBook={onCreateBook}
        onCreateChapter={onCreateChapter}
        onCreateDocument={onCreateDocument}
        onCreateDocumentInChapter={onCreateDocumentInChapter}
        onCreateEpisodeAfter={onCreateEpisodeAfter}
        onDeleteBook={onDeleteBook}
        onDeleteChapter={onDeleteChapter}
        onDeleteDocument={onDeleteDocument}
        onMoveChapter={onMoveChapter}
        onMoveDocument={onMoveDocument}
        onRenameBook={onRenameBook}
        onRenameChapter={onRenameChapter}
        onSelectBook={onSelectBook}
        onExpandedChapterIdsChange={onExpandedChapterIdsChange}
        onSelectDocument={onSelectDocument}
        onStartQuickDraft={onStartQuickDraft}
        onToggle={onToggleSidebar}
        onUpdateBookAccentColor={onUpdateBookAccentColor}
        expandedChapterIds={expandedChapterIds}
      />

      <section
        className="h-full min-h-0 overflow-y-auto bg-[var(--goyo-paper)]"
        aria-label="Writing surface"
      >
        {children ?? <EmptyWritingSurface />}
      </section>
    </div>
  );
}

interface WritingShellBodyProps extends Omit<WritingShellProps, 'isSidebarCollapsed' | 'status'> {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

function EmptyWritingSurface(): ReactElement {
  return (
    <article className="mx-auto min-h-full w-full max-w-[60rem] cursor-text bg-[var(--goyo-paper)] px-18 py-16">
      <p className="mb-4 font-medium text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.13em]">
        No draft selected
      </p>
      <h2 className="mt-0 mb-6 font-semibold text-[2.75rem] tracking-[-0.045em]">Untitled draft</h2>
      <p className="max-w-[42rem] text-[var(--goyo-text-muted)] text-xl leading-[1.75]">
        Choose a draft from the manuscript list or create a new section to begin writing.
      </p>
    </article>
  );
}
