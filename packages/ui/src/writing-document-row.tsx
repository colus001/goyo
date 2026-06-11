import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { ContextMenu } from './context-menu';
import type { WritingShellProps } from './writing-shell';

type DocumentItem = NonNullable<WritingShellProps['documents']>[number];
type MenuPosition = { x: number; y: number } | null;

export function DocumentRow({
  document,
  isActive,
  menuPosition,
  onDeleteDocument,
  onCloseMenu,
  onInsertAfter,
  onInsertBefore,
  onOpenMenu,
  onMoveDocument,
  onSelectDocument,
}: {
  document: DocumentItem;
  isActive: boolean;
  menuPosition: MenuPosition;
  onDeleteDocument?: (documentId: string) => void;
  onCloseMenu: () => void;
  onInsertAfter?: () => void;
  onInsertBefore?: () => void;
  onOpenMenu: (position: { x: number; y: number }) => void;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
  onSelectDocument?: (documentId: string) => void;
}): ReactElement {
  return (
    <div
      className={`group/document-row relative rounded-md transition ${isActive ? 'bg-white' : 'hover:bg-[#f5f5f2]'}`}
    >
      <FloatingInsertButton onInsert={onInsertBefore} placement="top" />
      {isActive ? (
        <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-[#d65a53]" />
      ) : null}
      <button
        aria-current={isActive ? 'page' : undefined}
        className="w-full cursor-pointer px-2.5 py-2 pr-14 text-left focus:outline-none focus-visible:bg-[#ecece8]"
        onClick={() => {
          onCloseMenu();
          onSelectDocument?.(document.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onOpenMenu({ x: event.clientX, y: event.clientY });
        }}
        type="button"
      >
        <p className="truncate font-medium text-[#292927] text-[0.9rem] tracking-[-0.005em]">
          {document.title || 'Untitled episode'}
        </p>
      </button>
      <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 transition group-hover/document-row:opacity-100">
        <MoveButton direction="up" document={document} onMoveDocument={onMoveDocument} />
        <MoveButton direction="down" document={document} onMoveDocument={onMoveDocument} />
      </div>
      <FloatingInsertButton onInsert={onInsertAfter} placement="bottom" />
      {menuPosition ? (
        <EpisodeContextMenu
          onClose={onCloseMenu}
          onDelete={() => onDeleteDocument?.(document.id)}
          onMoveDown={() => onMoveDocument?.(document.id, 'down')}
          onMoveUp={() => onMoveDocument?.(document.id, 'up')}
          x={menuPosition.x}
          y={menuPosition.y}
        />
      ) : null}
    </div>
  );
}

function MoveButton({
  direction,
  document,
  onMoveDocument,
}: {
  direction: 'down' | 'up';
  document: DocumentItem;
  onMoveDocument?: (documentId: string, direction: 'down' | 'up') => void;
}): ReactElement {
  return (
    <button
      aria-label={`Move ${document.title || 'Untitled episode'} ${direction}`}
      className="grid size-6 cursor-pointer place-items-center rounded text-[#9b9b94] hover:bg-[#e9e9e4] hover:text-[#55554f] focus:outline-none focus:ring-2 focus:ring-[#d65a53]/20"
      onClick={(event) => {
        event.stopPropagation();
        onMoveDocument?.(document.id, direction);
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

export function FloatingInsertButton({
  onInsert,
  placement,
}: {
  onInsert?: () => void;
  placement: 'bottom' | 'top';
}): ReactElement | null {
  if (!onInsert) {
    return null;
  }

  return (
    <span
      className={`group/insert absolute left-1/2 z-10 size-8 -translate-x-1/2 ${
        placement === 'top' ? '-top-4' : '-bottom-4'
      }`}
    >
      <button
        aria-label="Insert episode here"
        className="absolute top-1/2 left-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-[#d8d8d2] bg-[#fbfbfa] text-[#777771] opacity-0 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition hover:border-[#c7c7bf] hover:bg-white hover:text-[#30302d] hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#d65a53]/20 group-hover/insert:opacity-100 group-focus-within/insert:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          onInsert();
        }}
        type="button"
      >
        <Plus aria-hidden="true" size={15} strokeWidth={2.25} />
      </button>
    </span>
  );
}

function EpisodeContextMenu({
  onClose,
  onDelete,
  onMoveDown,
  onMoveUp,
  x,
  y,
}: {
  onClose: () => void;
  onDelete: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  x: number;
  y: number;
}): ReactElement {
  return (
    <ContextMenu
      groups={[
        [
          { icon: <ArrowUp aria-hidden="true" size={15} />, label: 'Move up', onSelect: onMoveUp },
          {
            icon: <ArrowDown aria-hidden="true" size={15} />,
            label: 'Move down',
            onSelect: onMoveDown,
          },
        ],
        [
          {
            destructive: true,
            icon: <Trash2 aria-hidden="true" size={15} />,
            label: 'Delete',
            onSelect: onDelete,
          },
        ],
      ]}
      onClose={onClose}
      x={x}
      y={y}
    />
  );
}
