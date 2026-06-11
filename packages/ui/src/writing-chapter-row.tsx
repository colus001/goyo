import { Plus } from 'lucide-react';
import type { ReactElement } from 'react';
import { ChapterContextMenu } from './chapter-context-menu';
import { DocumentRow } from './writing-document-row';
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
  onCloseMenu,
  onCreateEpisodeAfter,
  onDeleteChapter,
  onDeleteDocument,
  onMoveDocument,
  onOpenChapterMenu,
  onOpenMenu,
  onRequestDeleteChapter,
  onSelectChapter,
  onSelectDocument,
  openContextMenu,
}: {
  activeDocumentId?: string;
  chapter: ChapterItem;
  documents: DocumentItem[];
  isActive: boolean;
  onCloseMenu: () => void;
  onCreateEpisodeAfter?: (chapterId: string, previousDocumentId: string | null) => void;
  onDeleteChapter?: (chapterId: string) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onOpenChapterMenu: (chapterId: string, position: { x: number; y: number }) => void;
  onOpenMenu: (documentId: string, position: { x: number; y: number }) => void;
  onRequestDeleteChapter: (chapter: ChapterItem) => void;
  onSelectChapter?: (chapterId: string) => void;
  onSelectDocument?: (documentId: string) => void;
  openContextMenu: WritingSidebarContextMenuState;
}): ReactElement {
  return (
    <section className="py-1.5">
      <button
        aria-current={isActive && !activeDocumentId ? 'page' : undefined}
        className={`w-full cursor-pointer rounded-lg border-l-3 px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d65a53]/25 ${
          isActive
            ? 'border-transparent bg-[#f0eee9] text-[#252522]'
            : 'border-transparent text-[#6f6f68] hover:bg-[#f5f3ee]'
        }`}
        onClick={() => {
          onCloseMenu();
          onSelectChapter?.(chapter.id);
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
        <p className="truncate font-semibold text-[0.98rem] tracking-[-0.018em]">{chapter.title}</p>
        <p className="mt-0.5 text-[#9b958b] text-xs">
          {documents.length} {documents.length === 1 ? 'episode' : 'episodes'}
        </p>
      </button>
      {openContextMenu?.kind === 'chapter' && openContextMenu.chapterId === chapter.id ? (
        <ChapterContextMenu
          onClose={onCloseMenu}
          onDelete={() => {
            if (onDeleteChapter) {
              onRequestDeleteChapter(chapter);
            }
          }}
          x={openContextMenu.x}
          y={openContextMenu.y}
        />
      ) : null}
      {isActive ? (
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
  onCreateEpisodeAfter?: (chapterId: string, previousDocumentId: string | null) => void;
  onDeleteDocument?: (documentId: string) => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onOpenMenu: (documentId: string, position: { x: number; y: number }) => void;
  onSelectDocument?: (documentId: string) => void;
  openContextMenu: WritingSidebarContextMenuState;
}): ReactElement {
  return (
    <div className="group/empty mt-1 pl-4">
      {documents.length === 0 ? (
        <button
          aria-label="Add first episode"
          className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[#9b958b] text-sm opacity-0 transition hover:bg-[#f0eee8] hover:text-[#30302d] hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#d65a53]/20 group-hover/empty:opacity-100"
          onClick={() => onCreateEpisodeAfter?.(chapter.id, null)}
          type="button"
        >
          <Plus aria-hidden="true" size={15} />
          New episode
        </button>
      ) : (
        documents.map((document, index) => (
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
        ))
      )}
    </div>
  );
}
