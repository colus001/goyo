import type { BookMetadata, DocumentMetadata } from '@writer/core';
import { WritingEditor } from '@writer/editor';
import { WritingShell } from '@writer/ui';
import { useState } from 'react';
import { useWritingWorkspace } from './document-session-state';
import type { WritingWorkspaceState } from './document-workspace-types';

const EMPTY_DOCUMENT_UPDATES: Uint8Array[] = [];

export function App() {
  const workspace = useWritingWorkspace();

  if (workspace.screen === 'loading') {
    return <LoadingScreen status={workspace.saveStatus} />;
  }

  if (workspace.screen === 'library') {
    return <LibraryScreen workspace={workspace} />;
  }

  return (
    <WritingShell
      activeDocumentId={workspace.session?.activeDocumentId ?? undefined}
      bookTitle={workspace.activeBook?.title}
      documents={(workspace.session?.documents ?? []).filter(
        (document) => document.bookId === workspace.session?.activeBookId,
      )}
      onCreateDocument={() => workspace.createDocument('chapter')}
      onMoveDocument={workspace.moveDocument}
      onSelectDocument={workspace.openDocument}
      status={workspace.saveStatus}
    >
      {workspace.activeDocument ? (
        <DocumentSurface workspace={workspace} />
      ) : (
        <BookEmptyState workspace={workspace} />
      )}
    </WritingShell>
  );
}

function LoadingScreen({ status }: { status: string }) {
  return (
    <main className="grid h-screen place-items-center bg-[#f7f7f5] text-[#8d8d86] text-sm">
      {status}
    </main>
  );
}

function LibraryScreen({ workspace }: { workspace: WritingWorkspaceState }) {
  const books = workspace.session?.books ?? [];

  return (
    <main className="h-screen overflow-y-auto bg-[#f7f7f5] px-10 py-10 text-[#252525]">
      <section className="mx-auto max-w-[56rem]">
        <p className="mb-3 font-semibold text-[#999991] text-xs uppercase tracking-[0.14em]">
          Library
        </p>
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-semibold text-[2.4rem] tracking-[-0.05em]">Choose a book</h1>
            <p className="mt-2 text-[#777771]">
              Open a manuscript, create a book, or start a quick draft.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-full bg-[#30302d] px-4 py-2 text-white"
              onClick={workspace.createBook}
              type="button"
            >
              New book
            </button>
            <button
              className="rounded-full bg-[#ecece8] px-4 py-2"
              onClick={workspace.startQuickDraft}
              type="button"
            >
              Write without book
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {books.map((book) => (
            <BookCard book={book} key={book.id} onSelectBook={workspace.selectBook} />
          ))}
          {books.length === 0 ? (
            <div className="rounded-2xl border border-[#e4e4df] bg-white p-8 text-[#777771]">
              No books yet. Create one or start writing without a book.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function BookCard({
  book,
  onSelectBook,
}: {
  book: BookMetadata;
  onSelectBook: (bookId: string) => void;
}) {
  return (
    <button
      className="rounded-2xl border border-[#e4e4df] bg-white p-5 text-left transition hover:bg-[#fbfbfa] focus:outline-none focus-visible:bg-[#f0f0ed]"
      onClick={() => onSelectBook(book.id)}
      type="button"
    >
      <p className="font-semibold text-xl tracking-[-0.03em]">{book.title}</p>
      <p className="mt-2 text-[#999991] text-sm">Updated {formatDocumentDate(book.updatedAt)}</p>
    </button>
  );
}

function BookEmptyState({ workspace }: { workspace: WritingWorkspaceState }) {
  return (
    <article className="mx-auto grid min-h-screen w-full max-w-[60rem] place-items-center bg-white px-18 py-16">
      <div className="max-w-[34rem] text-center">
        <p className="mb-3 font-semibold text-[#999991] text-xs uppercase tracking-[0.14em]">
          Empty book
        </p>
        <h2 className="font-semibold text-[2rem] tracking-[-0.04em]">Start this manuscript</h2>
        <div className="mt-8 flex justify-center gap-2">
          <button
            className="rounded-full bg-[#30302d] px-4 py-2 text-white"
            onClick={() => workspace.createDocument('chapter')}
            type="button"
          >
            First chapter
          </button>
          <button
            className="rounded-full bg-[#ecece8] px-4 py-2"
            onClick={() => workspace.createDocument('draft')}
            type="button"
          >
            Standalone draft
          </button>
          <button
            className="rounded-full bg-[#ecece8] px-4 py-2"
            onClick={() => workspace.createDocument('note')}
            type="button"
          >
            Note
          </button>
        </div>
      </div>
    </article>
  );
}

function DocumentSurface({ workspace }: { workspace: WritingWorkspaceState }) {
  const activeDocument = workspace.activeDocument as DocumentMetadata;
  const [wordCount, setWordCount] = useState(0);
  const initialUpdates = workspace.documentUpdates[activeDocument.id] ?? EMPTY_DOCUMENT_UPDATES;

  return (
    <article className="mx-auto min-h-screen w-full max-w-[60rem] bg-white px-18 pt-12 pb-24">
      <header className="mb-9 border-[#ecece8] border-b pb-6">
        <div className="mb-4 flex items-center justify-between gap-6 text-[#9a9a93] text-sm">
          <p>{formatDocumentDate(activeDocument.updatedAt)}</p>
          <p className="whitespace-nowrap font-medium text-xs uppercase tracking-[0.13em]">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </p>
        </div>
        <input
          aria-label="Document title"
          className="w-full bg-transparent font-semibold text-[#242421] text-[2rem] leading-tight tracking-[-0.04em] outline-none placeholder:text-[#b5b5ae]"
          onChange={(event) => workspace.renameDraft(event.target.value)}
          placeholder="Untitled draft"
          value={activeDocument.title}
        />
      </header>

      <WritingEditor
        documentId={activeDocument.id}
        initialUpdates={initialUpdates}
        onDocumentUpdate={workspace.recordDocumentUpdate}
        onWordCountChange={setWordCount}
      />
    </article>
  );
}

function formatDocumentDate(updatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(updatedAt));
}
