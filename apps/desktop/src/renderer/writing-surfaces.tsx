import type { DocumentMetadata } from '@writer/core';
import { WritingEditor, type WritingEditorRef } from '@writer/editor';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';

const EMPTY_DOCUMENT_UPDATES: Uint8Array[] = [];

export function BookEmptyState({
  onCreateChapter,
  workspace,
}: {
  onCreateChapter?: () => void;
  workspace: WritingWorkspaceState;
}) {
  if (!workspace.activeBook) {
    return (
      <article className="mx-auto grid min-h-full w-full max-w-[52rem] place-items-center bg-[var(--goyo-paper)] px-12 py-16">
        <div className="max-w-[34rem] text-center">
          <p className="mb-3 font-semibold text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.14em]">
            No book selected
          </p>
          <h2 className="font-semibold text-[2rem] tracking-[-0.04em]">Begin from the sidebar</h2>
          <p className="mt-4 text-[var(--goyo-text-muted)] leading-relaxed">
            Create a book for a manuscript, or capture an idea in Quick Drafts without choosing a
            project first.
          </p>
          <div className="mt-8 flex justify-center gap-2">
            <button
              className="rounded-full bg-[var(--goyo-accent)] px-4 py-2 text-white hover:bg-[var(--goyo-accent-hover)]"
              onClick={workspace.createBook}
              type="button"
            >
              New book
            </button>
            <button
              className="rounded-full px-4 py-2 text-[var(--goyo-text-muted)] hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
              onClick={workspace.startQuickDraft}
              type="button"
            >
              Quick draft
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="mx-auto grid min-h-full w-full max-w-[52rem] place-items-center bg-[var(--goyo-paper)] px-12 py-16">
      <div className="max-w-[34rem] text-center">
        <p className="mb-3 font-semibold text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.14em]">
          Empty book
        </p>
        <h2 className="font-semibold text-[2rem] tracking-[-0.04em]">Start this book</h2>
        <p className="mt-4 text-[var(--goyo-text-muted)] leading-relaxed">
          Create a chapter for a longer manuscript, or start with a standalone document.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          {onCreateChapter ? (
            <button
              className="rounded-full bg-[var(--goyo-accent)] px-4 py-2 text-white hover:bg-[var(--goyo-accent-hover)]"
              onClick={onCreateChapter}
              type="button"
            >
              New chapter
            </button>
          ) : null}
          <button
            className="rounded-full px-4 py-2 text-[var(--goyo-text-muted)] hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
            onClick={() => workspace.createDocument('episode')}
            type="button"
          >
            New document
          </button>
        </div>
      </div>
    </article>
  );
}

export function EpisodeSurface({
  editorRef,
  onWordCountChange,
  workspace,
}: {
  editorRef: RefObject<WritingEditorRef | null>;
  onWordCountChange: (wordCount: number) => void;
  workspace: WritingWorkspaceState;
}) {
  const activeDocument = workspace.activeDocument as DocumentMetadata;
  const initialSnapshot = workspace.documentSnapshots[activeDocument.id];
  const initialUpdates = workspace.documentUpdates[activeDocument.id] ?? EMPTY_DOCUMENT_UPDATES;
  const hasTitle = activeDocument.title.trim().length > 0;

  return (
    <article className="mx-auto flex min-h-full w-full max-w-[52rem] flex-col bg-[var(--goyo-paper)] px-12 pt-12 pb-24 [font-family:var(--goyo-writing-font-family)]">
      <header className="mb-9 border-[var(--goyo-border)] border-b pb-6">
        <DocumentTitleInput
          autoFocus={!hasTitle}
          document={activeDocument}
          onRename={workspace.renameDocumentTitle}
          onSubmit={() => editorRef.current?.focus()}
        />
      </header>

      <WritingEditor
        documentId={activeDocument.id}
        focusOnMount={hasTitle}
        key={activeDocument.id}
        initialSnapshot={initialSnapshot}
        initialUpdates={initialUpdates}
        onDocumentUpdate={workspace.recordDocumentUpdate}
        onWordCountChange={onWordCountChange}
        ref={editorRef}
      />
    </article>
  );
}

function DocumentTitleInput({
  autoFocus = true,
  document,
  onRename,
  onSubmit,
}: {
  autoFocus?: boolean;
  document: DocumentMetadata;
  onRename: (title: string) => void;
  onSubmit?: () => void;
}) {
  const [title, setTitle] = useState(document.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const documentId = document.id;

  useEffect(() => {
    setTitle(document.title);
  }, [document.title]);

  useEffect(() => {
    if (autoFocus && documentId) {
      inputRef.current?.focus();
    }
  }, [autoFocus, documentId]);

  const commitTitle = () => {
    if (title.trim().length === 0) {
      setTitle(document.title);
      return;
    }

    onRename(title);
  };

  return (
    <input
      aria-label={`${formatDocumentKind(document.kind)} title`}
      className="w-full bg-transparent font-semibold text-[var(--goyo-text)] text-[2rem] leading-tight tracking-[-0.04em] outline-none placeholder:text-[var(--goyo-text-faint)] [font-family:var(--goyo-writing-font-family)]"
      onBlur={commitTitle}
      onChange={(event) => setTitle(event.target.value)}
      onKeyDown={(event) => {
        if (isComposing(event)) {
          return;
        }

        if (event.key === 'Enter') {
          event.currentTarget.blur();
          onSubmit?.();
        }
      }}
      placeholder={`Untitled ${document.kind}`}
      ref={inputRef}
      value={title}
    />
  );
}

function isComposing(event: ReactKeyboardEvent<HTMLInputElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

function formatDocumentKind(kind: DocumentMetadata['kind']): string {
  return kind[0].toUpperCase() + kind.slice(1);
}
