import {
  type DocumentMetadata,
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
} from '@writer/core';
import type { WritingEditorRef } from '@writer/editor';
import { NewChapterModal, WritingShell } from '@writer/ui';
import {
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';
import { UpdateNotification } from './update-notification';
import { BookEmptyState, EpisodeSurface } from './writing-surfaces';
import { exportActiveChapter, exportActiveDocument } from './writing-workspace-export-actions';
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
  const [isNewChapterModalOpen, setIsNewChapterModalOpen] = useState(false);
  const wordCount =
    activeDocument && wordCountState.documentId === activeDocument.id
      ? wordCountState.wordCount
      : 0;
  const chapters = getVisibleChapters(workspace);
  const documents = getVisibleDocuments(workspace);
  const wordCountLabel = activeDocument ? formatWordCountLabel(wordCount) : undefined;
  const canCreateChapter = Boolean(
    workspace.activeBook && workspace.activeBook.id !== QUICK_DRAFTS_BOOK_ID,
  );
  const openNewChapterModal = () => setIsNewChapterModalOpen(true);
  const requestNewChapter = canCreateChapter ? openNewChapterModal : undefined;
  const closeNewChapterModal = () => setIsNewChapterModalOpen(false);
  const shellProps = {
    ...getWritingShellProps(workspace, onOpenSettings, wordCountLabel, requestNewChapter),
    onExportDocument: activeDocument
      ? (format: 'html' | 'markdown' | 'text') =>
          exportActiveDocument(activeDocument, editorRef.current, format)
      : undefined,
    onExportChapter: workspace.activeChapter
      ? (format: 'html' | 'markdown' | 'text') => exportActiveChapter(workspace, format)
      : undefined,
  };

  useWorkspaceKeyboardShortcuts(workspace, activeDocument, editorRef, requestNewChapter);
  useApplyActiveDocumentUpdates(activeDocument?.id ?? null, editorRef);

  return (
    <>
      <WritingShell {...shellProps} chapters={chapters} documents={documents}>
        <WritingWorkspaceContent
          activeDocument={activeDocument}
          editorRef={editorRef}
          onCreateChapter={requestNewChapter}
          onWordCountStateChange={setWordCountState}
          workspace={workspace}
        />
      </WritingShell>
      {isNewChapterModalOpen ? (
        <NewChapterModal
          onClose={closeNewChapterModal}
          onCreate={(title) => {
            workspace.createChapter(title);
            closeNewChapterModal();
          }}
        />
      ) : null}
    </>
  );
}

function useApplyActiveDocumentUpdates(
  documentId: string | null,
  editorRef: RefObject<WritingEditorRef | null>,
) {
  useEffect(() => {
    if (!documentId) {
      return;
    }

    const activeDocumentId = documentId;
    let isCancelled = false;

    async function applyPersistedUpdates() {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const snapshot = await window.writerDesktop.documentSnapshots.getLatest(activeDocumentId);
      const updates = snapshot?.lastUpdateId
        ? await window.writerDesktop.documentUpdates.listAfter(
            activeDocumentId,
            snapshot.lastUpdateId,
          )
        : await window.writerDesktop.documentUpdates.list(activeDocumentId);

      if (isCancelled) {
        return;
      }

      if (snapshot) {
        editor.applyUpdate(snapshot.snapshot);
      }

      for (const update of updates) {
        editor.applyUpdate(update.update);
      }
    }

    void applyPersistedUpdates();
    const intervalId = window.setInterval(applyPersistedUpdates, 4000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [documentId, editorRef]);
}

function getWritingShellProps(
  workspace: WritingWorkspaceState,
  onOpenSettings: () => void,
  wordCountLabel: string | undefined,
  onCreateChapter?: () => void,
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
    onCreateChapter: canCreateChapter ? onCreateChapter : undefined,
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
    updateControl: getTopBarStatusControls(workspace),
    wordCountLabel,
  };
}

function getTopBarStatusControls(workspace: WritingWorkspaceState) {
  const syncLabel = workspace.syncProgressLabel ?? getQuietSyncStatusLabel(workspace.syncStatus);

  return (
    <div className="flex items-center gap-2">
      {syncLabel ? <SyncStatusChip label={syncLabel} /> : null}
      {workspace.isSidebarCollapsed ? null : (
        <UpdateNotification isSidebarCollapsed={workspace.isSidebarCollapsed} />
      )}
    </div>
  );
}

function getQuietSyncStatusLabel(syncStatus: WritingWorkspaceState['syncStatus']) {
  switch (syncStatus) {
    case 'Sync pending':
      return 'Sync pending';
    case 'Sync needs attention':
      return 'Sync needs attention';
    case 'Offline':
      return 'Offline';
    default:
      return null;
  }
}

function SyncStatusChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[var(--goyo-border)] bg-[var(--goyo-raised)] px-2.5 py-1 font-medium text-[var(--goyo-text-faint)] text-[0.66rem] uppercase tracking-[0.11em]">
      {label}
    </span>
  );
}

function WritingWorkspaceContent({
  activeDocument,
  editorRef,
  onCreateChapter,
  onWordCountStateChange,
  workspace,
}: {
  activeDocument?: DocumentMetadata;
  editorRef: RefObject<WritingEditorRef | null>;
  onCreateChapter?: () => void;
  onWordCountStateChange: Dispatch<SetStateAction<WordCountState>>;
  workspace: WritingWorkspaceState;
}) {
  const activeDocumentId = activeDocument?.id;
  const handleWordCountChange = useCallback(
    (wordCount: number) => {
      if (!activeDocumentId) {
        return;
      }

      onWordCountStateChange((current) =>
        current.documentId === activeDocumentId && current.wordCount === wordCount
          ? current
          : { documentId: activeDocumentId, wordCount },
      );
    },
    [activeDocumentId, onWordCountStateChange],
  );

  if (activeDocument) {
    return (
      <EpisodeSurface
        editorRef={editorRef}
        onWordCountChange={handleWordCountChange}
        workspace={workspace}
      />
    );
  }

  return <BookEmptyState onCreateChapter={onCreateChapter} workspace={workspace} />;
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
