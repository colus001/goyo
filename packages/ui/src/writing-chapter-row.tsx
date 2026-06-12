import { ArrowDown, ArrowUp } from 'lucide-react';
import type { ReactElement } from 'react';
import { ChapterContextMenu } from './chapter-context-menu';
import { DocumentRow, FloatingInsertButton } from './writing-document-row';
import type { WritingShellProps } from './writing-shell';

type ChapterItem = NonNullable<WritingShellProps['chapters']>[number];
type DocumentItem = NonNullable<WritingShellProps['documents']>[number];

export type WritingSidebarContextMenuState =
  | { chapterId: string; kind: 'chapter'; x: number; y: number }
  | { documentId: string; kind: 'document'; x: number; y: number }
  | null;

export function ChapterRow({
  activeDocumentId,
  chapter,
  documents,
  isActive,
  isExpanded,
  onCloseMenu,
  onCreateEpisodeAfter,
  onDeleteChapter,
  onDeleteDocument,
  onMoveChapter,
  onMoveDocument,
  onOpenChapterMenu,
  onOpenMenu,
  onRequestDeleteChapter,
  onRequestRenameChapter,
  onSelectDocument,
  onToggleChapter,
  openContextMenu,
}: {
  activeDocumentId?: string;
  chapter: ChapterItem;
  documents: DocumentItem[];
  isActive: boolean;
  isExpanded: boolean;
  onCloseMenu: () => void;
  onCreateEpisodeAfter?: (chapterId: string | null, previousDocumentId: string | null) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveChapter?: (chapterId: string, direction: 'down' | 'up') => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onOpenChapterMenu: (chapterId: string, position: { x: number; y: number }) => void;
  onOpenMenu: (documentId: string, position: { x: number; y: number }) => void;
  onRequestDeleteChapter: (chapter: ChapterItem) => void;
  onRequestRenameChapter: (chapter: ChapterItem) => void;
  onSelectDocument?: (documentId: string) => void;
  onToggleChapter: (chapterId: string) => void;
  openContextMenu: WritingSidebarContextMenuState;
}): ReactElement {
  return (
    <section className="relative py-1.5" data-sidebar-item>
      <div className="group/chapter-row relative">
        <button
          aria-current={isActive && !activeDocumentId ? 'page' : undefined}
          className={`w-full cursor-pointer rounded-lg border-l-3 px-3 py-2.5 pr-14 text-left outline-none transition ${
            isActive
              ? 'border-transparent bg-[var(--goyo-active-row)] text-[var(--goyo-text)]'
              : 'border-transparent text-[var(--goyo-text-muted)] hover:bg-[var(--goyo-accent-soft)]'
          }`}
          onClick={() => {
            onCloseMenu();
            onToggleChapter(chapter.id);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            if (chapter.isSystem) {
              return;
            }
            onOpenChapterMenu(chapter.id, { x: event.clientX, y: event.clientY });
          }}
          type="button"
        >
          <p className="truncate font-semibold text-[0.98rem] tracking-[-0.018em]">
            {chapter.title}
          </p>
        </button>
        {isExpanded && documents.length === 0 ? (
          <FloatingInsertButton
            onInsert={() => onCreateEpisodeAfter?.(chapter.id, null)}
            placement="bottom"
          />
        ) : null}
        {!chapter.isSystem ? (
          <div className="absolute top-3 right-2 flex gap-0.5 opacity-0 transition group-hover/chapter-row:opacity-100">
            <MoveChapterButton chapter={chapter} direction="up" onMoveChapter={onMoveChapter} />
            <MoveChapterButton chapter={chapter} direction="down" onMoveChapter={onMoveChapter} />
          </div>
        ) : null}
      </div>
      {openContextMenu?.kind === 'chapter' && openContextMenu.chapterId === chapter.id ? (
        <ChapterContextMenu
          onClose={onCloseMenu}
          onDelete={() => {
            if (onDeleteChapter) {
              onRequestDeleteChapter(chapter);
            }
          }}
          onNewEpisode={() => onCreateEpisodeAfter?.(chapter.id, documents.at(-1)?.id ?? null)}
          onRename={() => onRequestRenameChapter(chapter)}
          x={openContextMenu.x}
          y={openContextMenu.y}
        />
      ) : null}
      {isExpanded && documents.length > 0 ? (
        <ChapterEpisodeList
          activeDocumentId={activeDocumentId}
          chapter={chapter}
          documents={documents}
          onCloseMenu={onCloseMenu}
          onCreateEpisodeAfter={onCreateEpisodeAfter}
          onDeleteDocument={onDeleteDocument}
          onMoveDocument={onMoveDocument}
          onOpenMenu={onOpenMenu}
          onSelectDocument={onSelectDocument}
          openContextMenu={openContextMenu}
        />
      ) : null}
    </section>
  );
}

function MoveChapterButton({
  chapter,
  direction,
  onMoveChapter,
}: {
  chapter: ChapterItem;
  direction: 'down' | 'up';
  onMoveChapter?: (chapterId: string, direction: 'down' | 'up') => void;
}): ReactElement {
  return (
    <button
      aria-label={`Move ${chapter.title} ${direction}`}
      className="grid size-6 cursor-pointer place-items-center rounded text-[#9b9b94] outline-none hover:bg-[#e9e9e4] hover:text-[#55554f]"
      onClick={(event) => {
        event.stopPropagation();
        onMoveChapter?.(chapter.id, direction);
      }}
      type="button"
    >
      {direction === 'up' ? (
        <ArrowUp aria-hidden="true" size={15} />
      ) : (
        <ArrowDown aria-hidden="true" size={15} />
      )}
    </button>
  );
}

function ChapterEpisodeList({
  activeDocumentId,
  chapter,
  documents,
  onCloseMenu,
  onCreateEpisodeAfter,
  onDeleteDocument,
  onMoveDocument,
  onOpenMenu,
  onSelectDocument,
  openContextMenu,
}: {
  activeDocumentId?: string;
  chapter: ChapterItem;
  documents: DocumentItem[];
  onCloseMenu: () => void;
  onCreateEpisodeAfter?: (chapterId: string | null, previousDocumentId: string | null) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onOpenMenu: (documentId: string, position: { x: number; y: number }) => void;
  onSelectDocument?: (documentId: string) => void;
  openContextMenu: WritingSidebarContextMenuState;
}): ReactElement {
  return (
    <div className="mt-1 pl-4">
      {documents.map((document, index) => (
        <DocumentRow
          document={document}
          isActive={document.id === activeDocumentId}
          key={document.id}
          menuPosition={
            openContextMenu?.kind === 'document' && openContextMenu.documentId === document.id
              ? { x: openContextMenu.x, y: openContextMenu.y }
              : null
          }
          onCloseMenu={onCloseMenu}
          onInsertAfter={
            index === documents.length - 1
              ? () => onCreateEpisodeAfter?.(chapter.id, document.id)
              : undefined
          }
          onInsertBefore={() =>
            onCreateEpisodeAfter?.(chapter.id, index === 0 ? null : documents[index - 1].id)
          }
          onDeleteDocument={onDeleteDocument}
          onMoveDocument={onMoveDocument}
          onOpenMenu={(position) => onOpenMenu(document.id, position)}
          onSelectDocument={onSelectDocument}
        />
      ))}
    </div>
  );
}
