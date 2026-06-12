import {
  type DocumentMetadata,
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
} from '@writer/core';
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

export function WritingWorkspaceScreen({
  onOpenSettings,
  workspace,
}: {
  onOpenSettings: () => void;
  workspace: WritingWorkspaceState;
}) {
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
  const shellProps = getWritingShellProps(workspace, onOpenSettings, wordCountLabel);

  useWorkspaceKeyboardShortcuts(workspace, activeDocument, editorRef);

  return (
    <WritingShell {...shellProps} chapters={chapters} documents={documents}>
      <WritingWorkspaceContent
        activeDocument={activeDocument}
        editorRef={editorRef}
        onWordCountStateChange={setWordCountState}
        workspace={workspace}
      />
    </WritingShell>
  );
}

function getWritingShellProps(
  workspace: WritingWorkspaceState,
  onOpenSettings: () => void,
  wordCountLabel: string | undefined,
) {
  const activeDocument = workspace.activeDocument as DocumentMetadata | undefined;
  const hasActiveBook = Boolean(workspace.activeBook);
  const isQuickDraftsBook = workspace.activeBook?.id === QUICK_DRAFTS_BOOK_ID;
  const canCreateChapter = hasActiveBook && !isQuickDraftsBook;
  const createDocument = isQuickDraftsBook
    ? () => workspace.createDocument('draft')
    : workspace.createDocument;

  return {
    activeBookId: workspace.session?.activeBookId ?? undefined,
    activeChapterId: workspace.session?.activeChapterId ?? undefined,
    activeDocumentId: workspace.session?.activeDocumentId ?? undefined,
    bookAccentColor: workspace.activeBook?.accentColor,
    bookTitle: workspace.activeBook?.title,
    books: getVisibleBooks(workspace),
    breadcrumbSegments: activeDocument
      ? getEpisodeBreadcrumbSegments(workspace, activeDocument)
      : undefined,
    expandedChapterIds: workspace.expandedChapterIds,
    isSidebarCollapsed: workspace.isSidebarCollapsed,
    onCreateBook: workspace.createBook,
    onCreateChapter: canCreateChapter ? workspace.createChapter : undefined,
    onCreateDocument: hasActiveBook ? createDocument : undefined,
    onCreateDocumentInChapter: hasActiveBook ? workspace.createDocumentInChapter : undefined,
    onCreateEpisodeAfter: hasActiveBook ? workspace.createEpisodeAfter : undefined,
    onDeleteBook: workspace.deleteBook,
    onDeleteChapter: workspace.deleteChapter,
    onDeleteDocument: workspace.deleteDocument,
    onExpandedChapterIdsChange: workspace.setExpandedChapterIds,
    onMoveChapter: workspace.moveChapter,
    onMoveDocument: workspace.moveDocument,
    onOpenSettings,
    onRenameBook: workspace.renameBook,
    onRenameChapter: workspace.renameChapterTitle,
    onSelectBook: workspace.selectBook,
    onSelectDocument: workspace.openDocument,
    onSidebarCollapsedChange: workspace.setSidebarCollapsed,
    onStartQuickDraft: workspace.startQuickDraft,
    onUpdateBookAccentColor: workspace.updateBookAccentColor,
    status: formatWorkspaceStatus(workspace),
    wordCountLabel,
  };
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

function getVisibleBooks(workspace: WritingWorkspaceState) {
  return (workspace.session?.books ?? []).map((book) => ({
    ...book,
    isSystem: book.id === QUICK_DRAFTS_BOOK_ID,
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
