import {
  type ChapterMetadata,
  type DocumentMetadata,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
} from '@writer/core';
import { WritingEditor, type WritingEditorRef } from '@writer/editor';
import { WritingShell } from '@writer/ui';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';

const EMPTY_DOCUMENT_UPDATES: Uint8Array[] = [];

interface WordCountState {
  documentId?: string;
  wordCount: number;
}

export function WritingWorkspaceScreen({ workspace }: { workspace: WritingWorkspaceState }) {
  const activeDocument = workspace.activeDocument as DocumentMetadata | undefined;
  const [wordCountState, setWordCountState] = useState<WordCountState>({ wordCount: 0 });
  const wordCount =
    activeDocument && wordCountState.documentId === activeDocument.id
      ? wordCountState.wordCount
      : 0;

  return (
    <WritingShell
      activeChapterId={workspace.session?.activeChapterId ?? undefined}
      activeDocumentId={workspace.session?.activeDocumentId ?? undefined}
      breadcrumbSegments={
        activeDocument ? getEpisodeBreadcrumbSegments(workspace, activeDocument) : undefined
      }
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
      expandedChapterIds={workspace.expandedChapterIds}
      isSidebarCollapsed={workspace.isSidebarCollapsed}
      onCreateChapter={workspace.createChapter}
      onCreateDocument={workspace.createDocument}
      onCreateDocumentInChapter={workspace.createDocumentInChapter}
      onCreateEpisodeAfter={workspace.createEpisodeAfter}
      onDeleteChapter={workspace.deleteChapter}
      onDeleteDocument={workspace.deleteDocument}
      onExpandedChapterIdsChange={workspace.setExpandedChapterIds}
      onMoveChapter={workspace.moveChapter}
      onMoveDocument={workspace.moveDocument}
      onRenameBook={workspace.renameBook}
      onRenameChapter={workspace.renameChapterTitle}
      onSelectChapter={workspace.selectChapter}
      onSelectDocument={workspace.openDocument}
      onSidebarCollapsedChange={workspace.setSidebarCollapsed}
      onShowLibrary={workspace.showLibrary}
      status={formatWorkspaceStatus(workspace)}
      wordCountLabel={
        activeDocument ? `${wordCount} ${wordCount === 1 ? 'word' : 'words'}` : undefined
      }
    >
      <WritingWorkspaceContent
        activeDocument={activeDocument}
        onWordCountStateChange={setWordCountState}
        workspace={workspace}
      />
    </WritingShell>
  );
}

function WritingWorkspaceContent({
  activeDocument,
  onWordCountStateChange,
  workspace,
}: {
  activeDocument?: DocumentMetadata;
  onWordCountStateChange: (state: WordCountState) => void;
  workspace: WritingWorkspaceState;
}) {
  if (activeDocument) {
    return (
      <EpisodeSurface
        onWordCountChange={(wordCount) =>
          onWordCountStateChange({ documentId: activeDocument.id, wordCount })
        }
        workspace={workspace}
      />
    );
  }

  if (workspace.activeChapter) {
    return <ChapterSurface workspace={workspace} />;
  }

  return <BookEmptyState workspace={workspace} />;
}

function formatWorkspaceStatus(workspace: WritingWorkspaceState) {
  if (workspace.syncStatus === 'Sync idle') {
    return workspace.saveStatus;
  }

  return `${workspace.saveStatus} · ${workspace.syncStatus}`;
}

function BookEmptyState({ workspace }: { workspace: WritingWorkspaceState }) {
  return (
    <article className="mx-auto grid min-h-full w-full max-w-[52rem] place-items-center bg-white px-12 py-16">
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
    <article className="mx-auto grid min-h-full w-full max-w-[52rem] place-items-center bg-white px-12 py-16">
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

function EpisodeSurface({
  onWordCountChange,
  workspace,
}: {
  onWordCountChange: (wordCount: number) => void;
  workspace: WritingWorkspaceState;
}) {
  const activeDocument = workspace.activeDocument as DocumentMetadata;
  const initialSnapshot = workspace.documentSnapshots[activeDocument.id];
  const initialUpdates = workspace.documentUpdates[activeDocument.id] ?? EMPTY_DOCUMENT_UPDATES;
  const editorRef = useRef<WritingEditorRef>(null);
  const hasTitle = activeDocument.title.trim().length > 0;

  return (
    <article className="mx-auto flex min-h-full w-full max-w-[52rem] flex-col bg-white px-12 pt-12 pb-24">
      <header className="mb-9 border-[#ecece8] border-b pb-6">
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
      className="w-full bg-transparent text-center font-semibold text-[#242421] text-[2rem] leading-tight tracking-[-0.04em] outline-none placeholder:text-[#b5b5ae]"
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
      className="w-full bg-transparent font-semibold text-[#242421] text-[2rem] leading-tight tracking-[-0.04em] outline-none placeholder:text-[#b5b5ae]"
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

function getEpisodeBreadcrumbSegments(
  workspace: WritingWorkspaceState,
  document: DocumentMetadata,
): string[] {
  return [
    workspace.activeBook?.title,
    workspace.activeChapter?.title,
    document.title || `Untitled ${document.kind}`,
  ].filter((segment): segment is string => Boolean(segment));
}

function isComposing(event: KeyboardEvent<HTMLInputElement>): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}

function formatDocumentKind(kind: DocumentMetadata['kind']): string {
  return kind[0].toUpperCase() + kind.slice(1);
}
