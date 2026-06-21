'use client';

import { WritingEditor, type WritingEditorRef } from '@writer/editor';
import type { ReactElement, RefObject } from 'react';
import { useMemo, useRef, useState } from 'react';
import { base64ToUint8Array } from '@/lib/api';
import type { CloudDocument } from '@/lib/types';
import type { InitialCloudDocumentState } from '@/lib/use-cloud-document-sync';
import { useCloudDocumentSync } from '@/lib/use-cloud-document-sync';

interface CloudDocumentEditorProps {
  document: CloudDocument;
  documentId: string;
  initialSnapshotBase64?: string;
  initialUpdateBase64Values: string[];
  latestUpdateId: string | null;
}

export function CloudDocumentEditor({
  document,
  documentId,
  initialSnapshotBase64,
  initialUpdateBase64Values,
  latestUpdateId,
}: CloudDocumentEditorProps): ReactElement {
  const editorRef = useRef<WritingEditorRef>(null);
  const [wordCount, setWordCount] = useState(0);
  const initialState: InitialCloudDocumentState = useMemo(
    () => ({
      document,
      initialSnapshot: initialSnapshotBase64
        ? base64ToUint8Array(initialSnapshotBase64)
        : undefined,
      initialUpdates: initialUpdateBase64Values.map(base64ToUint8Array),
      latestUpdateId,
    }),
    [document, initialSnapshotBase64, initialUpdateBase64Values, latestUpdateId],
  );
  const cloudDocument = useCloudDocumentSync({
    documentId,
    editorRef,
    enabled: true,
    initialState,
  });

  return (
    <section aria-label="Cloud document editor">
      <CloudWritingSurface
        cloudDocument={cloudDocument}
        documentId={documentId}
        editorRef={editorRef}
        onWordCountChange={setWordCount}
        wordCount={wordCount}
      />
    </section>
  );
}

function CloudWritingSurface({
  cloudDocument,
  documentId,
  editorRef,
  onWordCountChange,
  wordCount,
}: {
  cloudDocument: ReturnType<typeof useCloudDocumentSync>;
  documentId: string;
  editorRef: RefObject<WritingEditorRef | null>;
  onWordCountChange: (wordCount: number) => void;
  wordCount: number;
}): ReactElement {
  const title = cloudDocument.document?.title || 'Untitled episode';

  if (cloudDocument.error) {
    return <CloudMessageSurface label={cloudDocument.error} />;
  }

  return (
    <article className="goyo-episode-surface mx-auto flex min-h-[38rem] w-full flex-col rounded-[2rem] bg-[var(--goyo-paper)] shadow-[0_28px_100px_rgba(0,0,0,0.24)] [font-family:var(--goyo-writing-font-family)]">
      <div className="goyo-manuscript-column mb-10 flex w-full flex-wrap items-center gap-3 text-[var(--goyo-text-faint)] text-xs">
        <span>{formatWordCountLabel(wordCount)}</span>
        <span aria-hidden="true">/</span>
        <span className="truncate">{cloudDocument.syncStatus}</span>
        <button
          className="rounded-full px-2 py-1 text-[var(--goyo-text-muted)] transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
          onClick={() => void cloudDocument.pullRemoteUpdates()}
          type="button"
        >
          Pull remote edits
        </button>
      </div>
      <header className="goyo-manuscript-column mb-14 w-full">
        <h2 className="goyo-document-title m-0 w-full font-bold text-[var(--goyo-text)] leading-tight tracking-[-0.055em] [font-family:var(--goyo-writing-font-family)]">
          {title}
        </h2>
      </header>

      <WritingEditor
        documentId={documentId}
        focusOnMount
        initialSnapshot={cloudDocument.initialSnapshot}
        initialUpdates={cloudDocument.initialUpdates}
        onDocumentUpdate={cloudDocument.onDocumentUpdate}
        onWordCountChange={onWordCountChange}
        ref={editorRef}
      />
    </article>
  );
}

function CloudMessageSurface({ label }: { label: string }): ReactElement {
  return (
    <article className="mx-auto flex min-h-full w-full max-w-[52rem] items-center justify-center bg-[var(--goyo-paper)] px-12 py-16">
      <p className="text-[var(--goyo-text-muted)] text-sm">{label}</p>
    </article>
  );
}

function formatWordCountLabel(wordCount: number): string {
  return `${wordCount} ${wordCount === 1 ? 'word' : 'words'}`;
}
