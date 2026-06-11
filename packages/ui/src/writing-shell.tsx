import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { WritingSidebar } from './writing-sidebar';

export interface WritingShellProps {
  activeChapterId?: string;
  activeDocumentId?: string;
  bookAccentColor?: string;
  bookTitle?: string;
  chapters?: Array<{
    id: string;
    isSystem?: boolean;
    title: string;
    updatedAt: string;
  }>;
  children?: ReactNode;
  documents?: Array<{
    chapterId: string;
    id: string;
    kind?: 'draft' | 'episode' | 'note';
    title: string;
    updatedAt: string;
  }>;
  onCreateChapter?: (title?: string) => void;
  onCreateDocument?: (kind: 'draft' | 'episode' | 'note') => void;
  onCreateDocumentInChapter?: (chapterId: string, kind: 'draft' | 'episode' | 'note') => void;
  onCreateEpisodeAfter?: (chapterId: string, previousDocumentId: string | null) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onRenameBook?: (title: string) => void;
  onRenameChapter?: (title: string) => void;
  onSelectChapter?: (chapterId: string) => void;
  onSelectDocument?: (documentId: string) => void;
  onShowLibrary?: () => void;
  status?: string;
}

export function WritingShell({
  activeChapterId,
  activeDocumentId,
  bookAccentColor,
  bookTitle = 'Untitled book',
  chapters = [],
  children,
  documents = [],
  onCreateChapter,
  onCreateDocument,
  onCreateDocumentInChapter,
  onCreateEpisodeAfter,
  onDeleteChapter,
  onDeleteDocument,
  onMoveDocument,
  onRenameBook,
  onRenameChapter,
  onSelectChapter,
  onSelectDocument,
  onShowLibrary,
  status = 'Local session',
}: WritingShellProps): ReactElement {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <main
      className={`grid h-screen overflow-hidden bg-[#f7f7f5] font-sans text-[#252525] transition-[grid-template-columns] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSidebarCollapsed ? 'grid-cols-[3rem_minmax(0,1fr)]' : 'grid-cols-[17rem_minmax(0,1fr)]'
      }`}
    >
      <WritingSidebar
        activeChapterId={activeChapterId}
        activeDocumentId={activeDocumentId}
        bookAccentColor={bookAccentColor}
        bookTitle={bookTitle}
        chapters={chapters}
        documents={documents}
        isCollapsed={isSidebarCollapsed}
        onCreateChapter={onCreateChapter}
        onCreateDocument={onCreateDocument}
        onCreateDocumentInChapter={onCreateDocumentInChapter}
        onCreateEpisodeAfter={onCreateEpisodeAfter}
        onDeleteChapter={onDeleteChapter}
        onDeleteDocument={onDeleteDocument}
        onMoveDocument={onMoveDocument}
        onRenameBook={onRenameBook}
        onRenameChapter={onRenameChapter}
        onSelectChapter={onSelectChapter}
        onSelectDocument={onSelectDocument}
        onShowLibrary={onShowLibrary}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
        status={status}
      />

      <section
        className="h-screen min-h-0 overflow-y-auto bg-[#f7f7f5]"
        aria-label="Writing surface"
      >
        {children ?? (
          <article className="mx-auto min-h-screen w-full max-w-[60rem] cursor-text bg-[#ffffff] px-18 py-16">
            <p className="mb-4 font-medium text-[#999991] text-xs uppercase tracking-[0.13em]">
              No draft selected
            </p>
            <h2 className="mt-0 mb-6 font-semibold text-[2.75rem] tracking-[-0.045em]">
              Untitled draft
            </h2>
            <p className="max-w-[42rem] text-[#4d4d49] text-xl leading-[1.75]">
              Choose a draft from the manuscript list or create a new section to begin writing.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
