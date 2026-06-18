import { WritingShell } from '@writer/ui';
import type { ReactElement } from 'react';

const PREVIEW_ACCENT = '#64748b';
const UPDATED_AT = '2026-06-18T00:00:00.000Z';

const BOOKS = [
  {
    id: 'quick-drafts',
    title: 'Quick Drafts',
    accentColor: '#b68243',
    isSystem: true,
    updatedAt: UPDATED_AT,
  },
  {
    id: 'vietnam-book',
    title: 'The Orchard Book',
    accentColor: PREVIEW_ACCENT,
    updatedAt: UPDATED_AT,
  },
  {
    id: 'essay-book',
    title: 'Essays',
    accentColor: '#6f7f5f',
    updatedAt: UPDATED_AT,
  },
];

const QUICK_DRAFT_CHAPTERS = [
  { id: 'inbox', title: 'Inbox', isSystem: true, updatedAt: UPDATED_AT },
];

const ORCHARD_CHAPTERS = [
  { id: 'chapter-1', title: 'Chapter 1', updatedAt: UPDATED_AT },
  { id: 'chapter-2', title: 'Chapter 2', updatedAt: UPDATED_AT },
];

const QUICK_DRAFT_DOCUMENTS = [
  {
    id: 'untitled-draft',
    title: 'Untitled episode',
    chapterId: 'inbox',
    kind: 'draft' as const,
    updatedAt: UPDATED_AT,
  },
];

const ORCHARD_DOCUMENTS = [
  {
    id: 'morning-train',
    title: 'Morning train',
    chapterId: 'chapter-1',
    kind: 'episode' as const,
    updatedAt: UPDATED_AT,
  },
  {
    id: 'orchard-notes',
    title: 'Orchard notes',
    chapterId: null,
    kind: 'note' as const,
    updatedAt: UPDATED_AT,
  },
  {
    id: 'second-arrival',
    title: 'Second arrival',
    chapterId: 'chapter-2',
    kind: 'episode' as const,
    updatedAt: UPDATED_AT,
  },
];

const noop = () => undefined;

const PREVIEW_STATES = [
  createLibraryPreviewState(),
  createDraftPreviewState(),
  createStructurePreviewState(),
  createSyncPreviewState(),
];

export function RealWritingShellPreview({
  className = '',
  previewStep = 2,
}: {
  className?: string;
  previewStep?: number;
}): ReactElement {
  const preview = getPreviewState(previewStep);

  return (
    <div
      className={`landing-writing-shell-preview overflow-hidden rounded-[14px] border border-[var(--goyo-border)] bg-[var(--goyo-app)] shadow-[0_24px_80px_-24px_rgba(31,29,25,0.18),0_8px_24px_-12px_rgba(31,29,25,0.12)] ${className}`}
    >
      <WritingShell
        activeBookId={preview.activeBookId}
        activeChapterId={preview.activeChapterId}
        activeDocumentId={preview.activeDocumentId}
        bookAccentColor={preview.bookAccentColor}
        books={BOOKS}
        bookTitle={preview.bookTitle}
        breadcrumbSegments={preview.breadcrumbSegments}
        chapters={preview.chapters}
        documents={preview.documents}
        expandedChapterIds={preview.expandedChapterIds}
        key={previewStep}
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
        status={preview.status}
        wordCountLabel={preview.wordCountLabel}
      >
        <PreviewWritingSurface
          content={preview.surfaceContent}
          onCreateBook={noop}
          onStartQuickDraft={noop}
        />
      </WritingShell>
    </div>
  );
}

function getPreviewState(previewStep: number) {
  return PREVIEW_STATES[previewStep] ?? PREVIEW_STATES[2];
}

function createLibraryPreviewState() {
  return {
    activeBookId: undefined,
    activeChapterId: undefined,
    activeDocumentId: undefined,
    bookAccentColor: PREVIEW_ACCENT,
    bookTitle: 'Library',
    breadcrumbSegments: ['Library'],
    chapters: [],
    documents: [],
    expandedChapterIds: [],
    surfaceContent: null,
    status: 'Local session',
    wordCountLabel: undefined,
  };
}

function createDraftPreviewState() {
  return {
    activeBookId: 'quick-drafts',
    activeChapterId: 'inbox',
    activeDocumentId: 'untitled-draft',
    bookAccentColor: '#b68243',
    bookTitle: 'Quick Drafts',
    breadcrumbSegments: ['Quick Drafts', 'Inbox', 'Untitled episode'],
    chapters: QUICK_DRAFT_CHAPTERS,
    documents: QUICK_DRAFT_DOCUMENTS,
    expandedChapterIds: ['inbox'],
    surfaceContent: {
      title: 'Untitled episode',
      paragraphs: [
        'A line arrives before the chapter does. I put it here first, while it is still warm enough to follow.',
        'Later, this can become a scene, a note, or nothing at all. For now it only has to stay safe.',
      ],
    },
    status: 'Saved locally',
    wordCountLabel: '42 words',
  };
}

function createStructurePreviewState() {
  return {
    activeBookId: 'vietnam-book',
    activeChapterId: 'chapter-1',
    activeDocumentId: 'morning-train',
    bookAccentColor: PREVIEW_ACCENT,
    bookTitle: 'The Orchard Book',
    breadcrumbSegments: ['The Orchard Book', 'Chapter 1', 'Morning train'],
    chapters: ORCHARD_CHAPTERS,
    documents: ORCHARD_DOCUMENTS,
    expandedChapterIds: ['chapter-1', 'chapter-2'],
    surfaceContent: {
      title: 'Morning train',
      paragraphs: [
        'The train left before the town had fully woken. Beyond the window, the orchards moved in long green bands, each row appearing and vanishing before I could name it.',
        'I kept the notebook open on my knees, not writing yet, only listening for the first sentence that sounded less borrowed than the others.',
      ],
    },
    status: 'Saved locally',
    wordCountLabel: '68 words',
  };
}

function createSyncPreviewState() {
  return {
    ...createStructurePreviewState(),
    status: 'Saved locally · Sync ready',
  };
}

function PreviewWritingSurface({
  content,
  onCreateBook,
  onStartQuickDraft,
}: {
  content: { paragraphs: string[]; title: string } | null;
  onCreateBook: () => void;
  onStartQuickDraft: () => void;
}): ReactElement {
  return (
    <article className="mx-auto min-h-full w-full max-w-[72rem] cursor-text bg-[var(--goyo-paper)] px-18 py-16 max-lg:px-12 max-sm:px-6 max-sm:py-10">
      {content ? (
        <div className="max-w-3xl">
          <h1 className="font-semibold text-[2.05rem] leading-tight tracking-[-0.045em] text-[var(--goyo-text)] [font-family:var(--goyo-writing-font-family)] max-sm:text-[1.65rem]">
            {content.title}
          </h1>
          <div className="mt-8 space-y-6 text-[1.12rem] leading-[1.85] text-[var(--goyo-text-muted)] [font-family:var(--goyo-writing-font-family)] max-sm:text-[1rem]">
            {content.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid min-h-[24rem] place-items-center">
          <div className="max-w-[34rem] text-center [font-family:var(--goyo-ui-font-family)]">
            <p className="mb-3 font-semibold text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.14em]">
              No book selected
            </p>
            <h2 className="font-semibold text-[2rem] tracking-[-0.04em] text-[var(--goyo-text)]">
              Begin from the sidebar
            </h2>
            <p className="mt-4 text-[var(--goyo-text-muted)] leading-relaxed">
              Create a book for a manuscript, or capture an idea in Quick Drafts without choosing a
              project first.
            </p>
            <div className="mt-8 flex justify-center gap-2">
              <button
                className="rounded-full bg-[var(--goyo-accent)] px-4 py-2 text-white"
                onClick={onCreateBook}
                type="button"
              >
                New book
              </button>
              <button
                className="rounded-full px-4 py-2 text-[var(--goyo-text-muted)]"
                onClick={onStartQuickDraft}
                type="button"
              >
                Quick draft
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
