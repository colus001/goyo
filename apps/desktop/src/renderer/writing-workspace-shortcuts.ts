import { type DocumentMetadata, QUICK_DRAFTS_BOOK_ID } from '@writer/core';
import type { WritingEditorRef } from '@writer/editor';
import { type RefObject, useEffect } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';

export function useWorkspaceKeyboardShortcuts(
  workspace: WritingWorkspaceState,
  activeDocument: DocumentMetadata | undefined,
  editorRef: RefObject<WritingEditorRef | null>,
  onCreateChapter?: () => void,
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = getWorkspaceShortcutAction(event, activeDocument);

      if (!action) {
        return;
      }

      event.preventDefault();
      runWorkspaceShortcut(action, workspace, editorRef, onCreateChapter);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDocument, editorRef, onCreateChapter, workspace]);
}

type WorkspaceShortcutAction =
  | 'create-chapter'
  | 'create-episode'
  | 'focus-editor'
  | 'toggle-sidebar';

function getWorkspaceShortcutAction(
  event: KeyboardEvent,
  activeDocument: DocumentMetadata | undefined,
): WorkspaceShortcutAction | null {
  if (event.isComposing || !(event.metaKey || event.ctrlKey)) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === '\\') {
    return 'toggle-sidebar';
  }

  if (event.shiftKey && key === 'e') {
    return 'create-episode';
  }

  if (event.shiftKey && key === 'c') {
    return 'create-chapter';
  }

  if (!event.shiftKey && key === 'l' && activeDocument) {
    return 'focus-editor';
  }

  return null;
}

function runWorkspaceShortcut(
  action: WorkspaceShortcutAction,
  workspace: WritingWorkspaceState,
  editorRef: RefObject<WritingEditorRef | null>,
  onCreateChapter?: () => void,
) {
  if (action === 'toggle-sidebar') {
    workspace.setSidebarCollapsed(!workspace.isSidebarCollapsed);
    return;
  }

  if (action === 'create-episode') {
    workspace.createDocument(
      workspace.activeBook?.id === QUICK_DRAFTS_BOOK_ID ? 'draft' : 'episode',
    );
    return;
  }

  if (action === 'create-chapter') {
    if (workspace.activeBook?.id === QUICK_DRAFTS_BOOK_ID) {
      return;
    }

    onCreateChapter?.();
    return;
  }

  editorRef.current?.focus();
}
