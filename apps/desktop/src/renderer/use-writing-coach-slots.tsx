import type { WritingEditorRef } from '@writer/editor';
import { MessagesSquare } from 'lucide-react';
import { type RefObject, useRef, useState } from 'react';
import type { WritingWorkspaceState } from './document-workspace-types';
import { WritingCoachPanel } from './writing-coach-panel';
import { loadDocumentExportContent } from './writing-workspace-export-actions';

export function useWritingCoachSlots(
  workspace: WritingWorkspaceState,
  editor: RefObject<WritingEditorRef | null>,
  onOpenSettings: () => void,
) {
  const [coachBook, setCoachBook] = useState<{ id: string; open: boolean }>();
  const button = useRef<HTMLButtonElement>(null);
  const bookId = workspace.activeBook?.id;
  if (!bookId) return {};
  const open = coachBook?.id === bookId && coachBook.open;
  const document = workspace.activeDocument;

  return {
    companionControl: (
      <button
        aria-expanded={open}
        aria-label="Writing coach"
        className="grid size-8 place-items-center rounded-lg text-[var(--goyo-text-muted)] hover:bg-[var(--goyo-accent-soft)] aria-expanded:bg-[var(--goyo-accent-soft)] [-webkit-app-region:no-drag]"
        onClick={() => setCoachBook({ id: bookId, open: !open })}
        ref={button}
        title="Writing coach"
        type="button"
      >
        <MessagesSquare aria-hidden="true" size={17} />
      </button>
    ),
    companionPanel: coachBook?.id === bookId && (
      <WritingCoachPanel
        bookId={bookId}
        key={bookId}
        manuscript={
          document?.bookId === bookId && !document.archivedAt
            ? {
                id: document.id,
                title: document.title || `Untitled ${document.kind}`,
                readText: () =>
                  editor.current?.getPlainText() ??
                  loadDocumentExportContent(document.id).then(({ plainText }) => plainText),
              }
            : null
        }
        onClose={() => {
          setCoachBook({ id: bookId, open: false });
          button.current?.focus();
        }}
        open={open}
        onOpenSettings={onOpenSettings}
      />
    ),
  };
}
