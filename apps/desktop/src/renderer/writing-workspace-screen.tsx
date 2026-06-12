import { type DocumentMetadata, QUICK_DRAFTS_INBOX_CHAPTER_ID } from '@writer/core';
import type { WritingEditorRef } from '@writer/editor';
import { WritingShell } from '@writer/ui';
import { type RefObject, useRef, useState } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';
import { BookEmptyState, EpisodeSurface } from './writing-surfaces';
import { useWorkspaceKeyboardShortcuts } from './writing-workspace-shortcuts';

interface WordCountState {
  documentId?: string;
  wordCount: number;
}

export function WritingWorkspaceScreen({ workspace }: { workspace: WritingWorkspaceState }) {
  const activeDocument = workspace.activeDocument as DocumentMetadata | undefined;
  const editorRef = useRef<WritingEditorRef>(null);
  const [wordCountState, setWordCountState] = useState<WordCountState>({ wordCount: 0 });
  const wordCount =
    activeDocument && wordCountState.documentId === activeDocument.id
      ? wordCountState.wordCount
      : 0;
  const chapters = getVisibleChapters(workspace);
  const documents = getVisibleDocuments(workspace);
  const wordCountLabel = activeDocument ? formatWordCountLabel(wordCount) : undefined;

  useWorkspaceKeyboardShortcuts(workspace, activeDocument, editorRef);

  return (
    <WritingShell
      activeChapterId={workspace.session?.activeChapterId ?? undefined}
      activeDocumentId={workspace.session?.activeDocumentId ?? undefined}
      breadcrumbSegments={
        activeDocument ? getEpisodeBreadcrumbSegments(workspace, activeDocument) : undefined
      }
      bookAccentColor={workspace.activeBook?.accentColor}
      bookTitle={workspace.activeBook?.title}
      chapters={chapters}
      documents={documents}
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
      onSelectDocument={workspace.openDocument}
      onSidebarCollapsedChange={workspace.setSidebarCollapsed}
      onShowLibrary={workspace.showLibrary}
      status={formatWorkspaceStatus(workspace)}
      wordCountLabel={wordCountLabel}
    >
      <WritingWorkspaceContent
        activeDocument={activeDocument}
        editorRef={editorRef}
        onWordCountStateChange={setWordCountState}
        workspace={workspace}
      />
    </WritingShell>
  );
}

function WritingWorkspaceContent({
  activeDocument,
  editorRef,
  onWordCountStateChange,
  workspace,
}: {
  activeDocument?: DocumentMetadata;
  editorRef: RefObject<WritingEditorRef | null>;
  onWordCountStateChange: (state: WordCountState) => void;
  workspace: WritingWorkspaceState;
}) {
  if (activeDocument) {
    return (
      <EpisodeSurface
        editorRef={editorRef}
        onWordCountChange={(wordCount) =>
          onWordCountStateChange({ documentId: activeDocument.id, wordCount })
        }
        workspace={workspace}
      />
    );
  }

  return <BookEmptyState workspace={workspace} />;
}

function formatWorkspaceStatus(workspace: WritingWorkspaceState) {
  if (workspace.syncStatus === 'Sync idle') {
    return workspace.saveStatus;
  }

  return `${workspace.saveStatus} · ${workspace.syncStatus}`;
}

function getVisibleChapters(workspace: WritingWorkspaceState) {
  return (workspace.session?.chapters ?? [])
    .filter((chapter) => chapter.bookId === workspace.session?.activeBookId)
    .map((chapter) => ({
      ...chapter,
      isSystem: chapter.id === QUICK_DRAFTS_INBOX_CHAPTER_ID,
    }));
}

function getVisibleDocuments(workspace: WritingWorkspaceState) {
  return (workspace.session?.documents ?? []).filter(
    (document) => document.bookId === workspace.session?.activeBookId,
  );
}

function formatWordCountLabel(wordCount: number): string {
  return `${wordCount} ${wordCount === 1 ? 'word' : 'words'}`;
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
