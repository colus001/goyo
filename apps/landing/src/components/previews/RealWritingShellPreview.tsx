import { WritingShell } from '@writer/ui';
import type { ReactElement } from 'react';

const PREVIEW_ACCENT = '#64748b';
const UPDATED_AT = '2026-06-18T00:00:00.000Z';

const BOOKS = [
  {
    id: 'vietnam-book',
    title: 'The Orchard Book',
    accentColor: PREVIEW_ACCENT,
    updatedAt: UPDATED_AT,
  },
];

const CHAPTERS = [{ id: 'chapter-1', title: 'Chapter 1', updatedAt: UPDATED_AT }];

const DOCUMENTS = [
  {
    id: 'morning-train',
    title: 'Morning train',
    chapterId: 'chapter-1',
    kind: 'episode' as const,
    updatedAt: UPDATED_AT,
  },
];

const noop = () => undefined;

export function RealWritingShellPreview({ className = '' }: { className?: string }): ReactElement {
  return (
    <div
      className={`landing-writing-shell-preview overflow-hidden rounded-[14px] border border-[var(--goyo-border)] bg-[var(--goyo-app)] shadow-[0_24px_80px_-24px_rgba(31,29,25,0.18),0_8px_24px_-12px_rgba(31,29,25,0.12)] ${className}`}
    >
      <WritingShell
        activeBookId="vietnam-book"
        activeChapterId="chapter-1"
        activeDocumentId="morning-train"
        bookAccentColor={PREVIEW_ACCENT}
        books={BOOKS}
        bookTitle="The Orchard Book"
        breadcrumbSegments={['The Orchard Book', 'Chapter 1', 'Morning train']}
        chapters={CHAPTERS}
        documents={DOCUMENTS}
        expandedChapterIds={['chapter-1']}
        onCreateBook={noop}
        onCreateChapter={noop}
        onCreateDocument={noop}
        onCreateDocumentInChapter={noop}
        onCreateEpisodeAfter={noop}
        onDeleteBook={noop}
        onDeleteChapter={noop}
        onDeleteDocument={noop}
        onExpandedChapterIdsChange={noop}
        onMoveChapter={noop}
        onMoveDocument={noop}
        onOpenSettings={noop}
        onRenameBook={noop}
        onRenameChapter={noop}
        onSelectBook={noop}
        onSelectDocument={noop}
        onSidebarCollapsedChange={noop}
        onStartQuickDraft={noop}
        onUpdateBookAccentColor={noop}
        status="Saved locally"
      >
        <PreviewWritingSurface />
      </WritingShell>
    </div>
  );
}

function PreviewWritingSurface(): ReactElement {
  return (
    <article className="mx-auto min-h-full w-full max-w-[72rem] cursor-text bg-[var(--goyo-paper)] px-18 py-16 [font-family:var(--goyo-ui-font-family)] max-lg:px-12 max-sm:px-6 max-sm:py-10" />
  );
}
