import { APP_NAME } from '@writer/shared';
import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';

export interface WritingShellProps {
  activeDocumentId?: string;
  bookTitle?: string;
  children?: ReactNode;
  documents?: Array<{
    id: string;
    kind?: 'chapter' | 'note' | 'draft';
    title: string;
    updatedAt: string;
  }>;
  onCreateDocument?: () => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onSelectDocument?: (documentId: string) => void;
  status?: string;
}

export function WritingShell({
  activeDocumentId,
  bookTitle = 'Untitled book',
  children,
  documents = [],
  onCreateDocument,
  onMoveDocument,
  onSelectDocument,
  status = 'Local session',
}: WritingShellProps): ReactElement {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <main
      className={`grid h-screen overflow-hidden bg-[#f7f7f5] font-sans text-[#252525] ${
        isSidebarCollapsed
          ? 'grid-cols-[3.25rem_minmax(0,1fr)]'
          : 'grid-cols-[18.75rem_minmax(0,1fr)]'
      }`}
    >
      <WritingSidebar
        activeDocumentId={activeDocumentId}
        bookTitle={bookTitle}
        documents={documents}
        isCollapsed={isSidebarCollapsed}
        onCreateDocument={onCreateDocument}
        onMoveDocument={onMoveDocument}
        onSelectDocument={onSelectDocument}
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

interface WritingSidebarProps extends Omit<WritingShellProps, 'children'> {
  isCollapsed: boolean;
  onToggle: () => void;
}

function WritingSidebar({
  activeDocumentId,
  bookTitle = 'Untitled book',
  documents = [],
  isCollapsed,
  onCreateDocument,
  onMoveDocument,
  onSelectDocument,
  onToggle,
  status = 'Local session',
}: WritingSidebarProps): ReactElement {
  return (
    <aside
      className="flex h-screen min-h-0 flex-col border-[#deded9] border-r bg-[#fbfbfa]"
      aria-label="Documents"
    >
      <header
        className={`flex h-15 items-center gap-2 border-[#ededeb] border-b ${
          isCollapsed ? 'justify-center px-2' : 'px-5'
        }`}
      >
        <button
          aria-label={isCollapsed ? 'Show manuscript list' : 'Hide manuscript list'}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-[#777771] transition hover:bg-[#f0f0ed] hover:text-[#30302d] focus:outline-none focus:ring-2 focus:ring-[#d65a53]/25"
          onClick={onToggle}
          type="button"
        >
          {isCollapsed ? '›' : '‹'}
        </button>
        {!isCollapsed ? (
          <SidebarHeader bookTitle={bookTitle} onCreateDocument={onCreateDocument} />
        ) : null}
      </header>

      {!isCollapsed ? (
        <SidebarDocuments
          activeDocumentId={activeDocumentId}
          documents={documents}
          onMoveDocument={onMoveDocument}
          onSelectDocument={onSelectDocument}
          status={status}
        />
      ) : null}
    </aside>
  );
}

function SidebarHeader({
  bookTitle,
  onCreateDocument,
}: Pick<WritingShellProps, 'bookTitle' | 'onCreateDocument'>): ReactElement {
  return (
    <>
      <h1 className="min-w-0 flex-1 truncate font-semibold text-[1.35rem] tracking-[-0.03em]">
        {bookTitle || APP_NAME}
      </h1>
      <button
        aria-label="New chapter"
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-[#30302d] font-medium text-[#fbfbfa] text-xl leading-none transition hover:bg-[#111110] focus:outline-none focus:ring-2 focus:ring-[#d65a53]/35"
        onClick={onCreateDocument}
        type="button"
      >
        +
      </button>
    </>
  );
}

function SidebarDocuments({
  activeDocumentId,
  documents,
  onSelectDocument,
  onMoveDocument,
  status,
}: Required<Pick<WritingShellProps, 'documents' | 'status'>> &
  Pick<
    WritingShellProps,
    'activeDocumentId' | 'onMoveDocument' | 'onSelectDocument'
  >): ReactElement {
  return (
    <>
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4" aria-label="Local documents">
        <p className="px-2 pt-4 pb-2 font-semibold text-[#989891] text-[0.68rem] uppercase tracking-[0.14em]">
          Chapters
        </p>
        <DocumentSection
          activeDocumentId={activeDocumentId}
          documents={documents.filter((document) => (document.kind ?? 'chapter') === 'chapter')}
          onMoveDocument={onMoveDocument}
          onSelectDocument={onSelectDocument}
        />
        <DocumentSection
          activeDocumentId={activeDocumentId}
          documents={documents.filter((document) => document.kind === 'note')}
          label="Notes"
          onMoveDocument={onMoveDocument}
          onSelectDocument={onSelectDocument}
        />
        <DocumentSection
          activeDocumentId={activeDocumentId}
          documents={documents.filter((document) => document.kind === 'draft')}
          label="Drafts"
          onMoveDocument={onMoveDocument}
          onSelectDocument={onSelectDocument}
        />
      </nav>

      <footer className="flex items-center gap-2 border-[#ededeb] border-t px-5 py-3">
        <SyncStatusIcon status={status} />
      </footer>
    </>
  );
}

interface DocumentSectionProps {
  activeDocumentId?: string;
  documents: NonNullable<WritingShellProps['documents']>;
  label?: string;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onSelectDocument?: (documentId: string) => void;
}

function DocumentSection({
  activeDocumentId,
  documents,
  label,
  onMoveDocument,
  onSelectDocument,
}: DocumentSectionProps): ReactElement | null {
  if (documents.length === 0) {
    return null;
  }

  return (
    <div className={label ? 'mt-5' : 'space-y-1'}>
      {label ? (
        <p className="px-2 pb-2 font-semibold text-[#989891] text-[0.68rem] uppercase tracking-[0.14em]">
          {label}
        </p>
      ) : null}
      <div className="space-y-1">
        {documents.map((document) => {
          const isActive = document.id === activeDocumentId;

          return (
            <div
              className={`group relative flex items-center gap-2 rounded-lg transition ${
                isActive ? 'bg-[#f0f0ed]' : 'hover:bg-[#f4f4f1]'
              }`}
              key={document.id}
            >
              {isActive ? (
                <span className="absolute top-2.5 bottom-2.5 left-0 w-1 rounded-full bg-[#d65a53]" />
              ) : null}
              <button
                className="min-w-0 flex-1 cursor-pointer px-3 py-2.5 text-left focus:outline-none focus-visible:bg-[#ecece8]"
                onClick={() => onSelectDocument?.(document.id)}
                type="button"
              >
                <p className="truncate font-semibold text-[#292927] text-[0.95rem] tracking-[-0.01em]">
                  {document.title || 'Untitled draft'}
                </p>
                <p className="mt-1 text-[#a0a09a] text-xs">
                  {formatDocumentDate(document.updatedAt)}
                </p>
              </button>
              <div className="mr-2 flex opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                <button
                  aria-label={`Move ${document.title} up`}
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-[#8d8d86] hover:bg-[#e7e7e2]"
                  onClick={() => onMoveDocument?.(document.id, 'up')}
                  type="button"
                >
                  ↑
                </button>
                <button
                  aria-label={`Move ${document.title} down`}
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-[#8d8d86] hover:bg-[#e7e7e2]"
                  onClick={() => onMoveDocument?.(document.id, 'down')}
                  type="button"
                >
                  ↓
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SyncStatusIcon({ status }: { status: string }): ReactElement {
  const normalizedStatus = status.toLowerCase();
  const className = normalizedStatus.includes('failed')
    ? 'bg-[#d65a53]'
    : normalizedStatus.includes('saving') || normalizedStatus.includes('loading')
      ? 'animate-pulse bg-[#a6a69f]'
      : 'bg-[#8e9b82]';

  return (
    <span
      className="flex items-center gap-2 text-[#8d8d86] text-xs"
      aria-label={status}
      role="status"
    >
      <span className={`size-2 rounded-full ${className}`} aria-hidden="true" />
    </span>
  );
}

function formatDocumentDate(updatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(updatedAt));
}
