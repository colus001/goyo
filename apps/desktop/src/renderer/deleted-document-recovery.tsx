import type { DocumentMetadata } from '@writer/core';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';

export function DeletedDocumentRecovery({
  workspace,
}: {
  workspace: WritingWorkspaceState;
}): ReactElement {
  const [archivedDocuments, setArchivedDocuments] = useState<DocumentMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reloadArchivedDocuments = () => {
    setIsLoading(true);
    void window.writerDesktop.documents
      .listArchived()
      .then(setArchivedDocuments)
      .finally(() => setIsLoading(false));
  };

  useEffect(reloadArchivedDocuments, []);

  return (
    <div className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/45 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-[var(--goyo-text)]">Deleted documents</p>
          <p className="mt-1 text-[var(--goyo-text-muted)] text-sm leading-relaxed">
            Restore a soft-deleted document. If its original book or chapter is gone, Goyo restores
            a safe copy into Quick Drafts.
          </p>
        </div>
        <button
          className="rounded-full border border-[var(--goyo-border)] px-3 py-1.5 text-[var(--goyo-text-muted)] text-sm hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
          onClick={reloadArchivedDocuments}
          type="button"
        >
          Refresh
        </button>
      </div>
      <div className="mt-4 grid gap-2">
        {isLoading ? (
          <p className="text-[var(--goyo-text-muted)] text-sm">Loading deleted documents...</p>
        ) : null}
        {!isLoading && archivedDocuments.length === 0 ? (
          <p className="text-[var(--goyo-text-muted)] text-sm">No deleted documents.</p>
        ) : null}
        {archivedDocuments.map((document) => (
          <DeletedDocumentRow
            document={document}
            key={document.id}
            onRestore={() => {
              workspace.restoreDeletedDocument(document);
              setArchivedDocuments((current) =>
                current.filter((candidate) => candidate.id !== document.id),
              );
            }}
            restoreMode={getRestoreModeLabel(document, workspace)}
          />
        ))}
      </div>
    </div>
  );
}

function DeletedDocumentRow({
  document,
  onRestore,
  restoreMode,
}: {
  document: DocumentMetadata;
  onRestore: () => void;
  restoreMode: string;
}): ReactElement {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)] p-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-[var(--goyo-text)]">
          {document.title || `Untitled ${document.kind}`}
        </p>
        <p className="mt-1 text-[var(--goyo-text-muted)] text-xs">
          {restoreMode} · deleted {formatArchivedDate(document.archivedAt)}
        </p>
      </div>
      <button
        className="shrink-0 rounded-full bg-[var(--goyo-accent)] px-3 py-1.5 font-medium text-sm text-white hover:bg-[var(--goyo-accent-hover)]"
        onClick={onRestore}
        type="button"
      >
        Restore
      </button>
    </div>
  );
}

function getRestoreModeLabel(document: DocumentMetadata, workspace: WritingWorkspaceState): string {
  const session = workspace.session;
  const hasBook = session?.books.some((book) => book.id === document.bookId) ?? false;
  const hasChapter =
    !document.chapterId ||
    (session?.chapters.some((chapter) => chapter.id === document.chapterId) ?? false);

  return hasBook && hasChapter ? 'Original location' : 'Copy to Quick Drafts';
}

function formatArchivedDate(archivedAt: string | null): string {
  if (!archivedAt) {
    return 'unknown date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(archivedAt));
}
