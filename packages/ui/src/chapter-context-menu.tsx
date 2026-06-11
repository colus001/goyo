import { Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';

export function ChapterContextMenu({
  onClose,
  onDelete,
  x,
  y,
}: {
  onClose: () => void;
  onDelete: () => void;
  x: number;
  y: number;
}): ReactElement {
  return (
    <div
      className="fixed z-50 min-w-34 rounded-lg border border-[#deded8] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      role="menu"
      style={{ left: x, top: y }}
    >
      <button
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[#b44b43] text-sm hover:bg-[#f4f4f1]"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
          onClose();
        }}
        role="menuitem"
        type="button"
      >
        <Trash2 aria-hidden="true" size={15} />
        Delete
      </button>
    </div>
  );
}
