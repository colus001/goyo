import {
  type ChapterMetadata,
  type DocumentMetadata,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
} from '@writer/core';
import { WritingEditor, type WritingEditorRef } from '@writer/editor';
import { WritingShell } from '@writer/ui';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useWritingWorkspace } from './document-session-state';
import type { WritingWorkspaceState } from './document-workspace-types';
import { LibraryScreen } from './library-screen';

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
      activeChapterId={workspace.session?.activeChapterId ?? undefined}
      activeDocumentId={workspace.session?.activeDocumentId ?? undefined}
      bookAccentColor={workspace.activeBook?.accentColor}
      bookTitle={workspace.activeBook?.title}
      chapters={(workspace.session?.chapters ?? [])
        .filter((chapter) => chapter.bookId === workspace.session?.activeBookId)
        .map((chapter) => ({
          ...chapter,
          isSystem: chapter.id === QUICK_DRAFTS_INBOX_CHAPTER_ID,
        }))}
      documents={(workspace.session?.documents ?? []).filter(
        (document) => document.bookId === workspace.session?.activeBookId,
      )}
      onCreateChapter={workspace.createChapter}
      onCreateDocument={workspace.createDocument}
      onCreateDocumentInChapter={workspace.createDocumentInChapter}
      onCreateEpisodeAfter={workspace.createEpisodeAfter}
      onDeleteChapter={workspace.deleteChapter}
      onDeleteDocument={workspace.deleteDocument}
      onMoveChapter={workspace.moveChapter}
      onMoveDocument={workspace.moveDocument}
      onRenameBook={workspace.renameBook}
      onRenameChapter={workspace.renameChapterTitle}
      onSelectChapter={workspace.selectChapter}
      onSelectDocument={workspace.openDocument}
      onShowLibrary={workspace.showLibrary}
      status={workspace.saveStatus}
    >
      {workspace.activeDocument ? (
        <EpisodeSurface workspace={workspace} />
      ) : workspace.activeChapter ? (
        <ChapterSurface workspace={workspace} />
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

function BookEmptyState({ workspace }: { workspace: WritingWorkspaceState }) {
  return (
    <article className="mx-auto grid min-h-screen w-full max-w-[52rem] place-items-center bg-white px-12 py-16">
      <div className="max-w-[34rem] text-center">
        <p className="mb-3 font-semibold text-[#999991] text-xs uppercase tracking-[0.14em]">
          Empty book
        </p>
        <h2 className="font-semibold text-[2rem] tracking-[-0.04em]">Start this manuscript</h2>
        <div className="mt-8 flex justify-center gap-2">
          <button
            className="rounded-full bg-[#30302d] px-4 py-2 text-white"
            onClick={() => workspace.createDocument('episode')}
            type="button"
          >
            New episode
          </button>
        </div>
      </div>
    </article>
  );
}

function ChapterSurface({ workspace }: { workspace: WritingWorkspaceState }) {
  const chapter = workspace.activeChapter as ChapterMetadata;
  const episodeCount =
    workspace.session?.documents.filter((d) => d.chapterId === chapter.id && d.kind === 'episode')
      .length ?? 0;

  return (
    <article className="mx-auto grid min-h-screen w-full max-w-[52rem] place-items-center bg-white px-12 py-16">
      <div className="max-w-[34rem] text-center">
        <ChapterTitleInput chapter={chapter} onRename={workspace.renameChapterTitle} />
        {episodeCount === 0 ? (
          <p className="mt-4 text-[#777771]">Episodes are the writing units inside a chapter.</p>
        ) : null}
        <button
          className="mt-8 rounded-full bg-[#30302d] px-4 py-2 text-white"
          onClick={() => workspace.createDocument('episode')}
          type="button"
        >
          New episode
        </button>
      </div>
    </article>
  );
}

function EpisodeSurface({ workspace }: { workspace: WritingWorkspaceState }) {
  const activeDocument = workspace.activeDocument as DocumentMetadata;
  const [wordCount, setWordCount] = useState(0);
  const initialSnapshot = workspace.documentSnapshots[activeDocument.id];
  const initialUpdates = workspace.documentUpdates[activeDocument.id] ?? EMPTY_DOCUMENT_UPDATES;
  const editorRef = useRef<WritingEditorRef>(null);
  const hasTitle = activeDocument.title.trim().length > 0;

  return (
    <article className="mx-auto min-h-screen w-full max-w-[52rem] bg-white px-12 pt-12 pb-24">
      <header className="mb-9 border-[#ecece8] border-b pb-6">
        <div className="mb-4 flex items-center justify-between gap-6 text-[#9a9a93] text-sm">
          <p>{formatEpisodeBreadcrumb(workspace, activeDocument)}</p>
          <p className="whitespace-nowrap font-medium text-xs uppercase tracking-[0.13em]">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </p>
        </div>
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
        onWordCountChange={setWordCount}
        ref={editorRef}
      />
    </article>
  );
}

function ChapterTitleInput({
  chapter,
  onRename,
}: {
  chapter: ChapterMetadata;
  onRename: (title: string) => void;
}) {
  const [title, setTitle] = useState(chapter.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(chapter.title);
  }, [chapter.title]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commitTitle = () => {
    if (title.trim().length === 0) {
      setTitle(chapter.title);
      return;
    }

    onRename(title);
  };

  return (
    <input
      aria-label="Chapter title"
      className="w-full bg-transparent text-center font-semibold text-[#242421] text-[2rem] leading-tight tracking-[-0.04em] outline-none placeholder:text-[#b5b5ae] focus:rounded-md focus:bg-[#fbfbfa] focus:ring-2 focus:ring-[#d65a53]/20"
      onBlur={commitTitle}
      onChange={(event) => setTitle(event.target.value)}
      onKeyDown={(event) => {
        if (isComposing(event)) {
          return;
        }

        if (event.key === 'Enter') {
          event.currentTarget.blur();
        }
      }}
      placeholder="Untitled chapter"
      ref={inputRef}
      value={title}
    />
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
      className="w-full bg-transparent font-semibold text-[#242421] text-[2rem] leading-tight tracking-[-0.04em] outline-none placeholder:text-[#b5b5ae] focus:rounded-md focus:bg-[#fbfbfa] focus:ring-2 focus:ring-[#d65a53]/20"
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

function formatEpisodeBreadcrumb(
  workspace: WritingWorkspaceState,
  document: DocumentMetadata,
): string {
  return [
    workspace.activeBook?.title,
    workspace.activeChapter?.title,
    formatDocumentKind(document.kind),
  ]
    .filter(Boolean)
    .join(' / ');
}

function isComposing(event: KeyboardEvent<HTMLInputElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

function formatDocumentKind(kind: DocumentMetadata['kind']): string {
  return kind[0].toUpperCase() + kind.slice(1);
}
