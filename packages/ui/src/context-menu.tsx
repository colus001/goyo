import type { ReactElement } from 'react';
import { useEffect, useRef } from 'react';

interface ContextMenuItemConfig {
  destructive?: boolean;
  icon?: ReactElement;
  label: string;
  onSelect: () => void;
}

export type ContextMenuGroup = ContextMenuItemConfig[];

export function ContextMenu({
  groups,
  onClose,
  x,
  y,
}: {
  groups: ContextMenuGroup[];
  onClose: () => void;
  x: number;
  y: number;
}): ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }

      onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed z-50 min-w-40 rounded-lg border border-[#deded8] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      onContextMenu={(event) => event.preventDefault()}
      ref={menuRef}
      role="menu"
      style={{ left: x, top: y }}
    >
      {groups.map((group, index) => (
        <ContextMenuGroupView
          group={group}
          isFirst={index === 0}
          key={getGroupKey(group, index)}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

function ContextMenuGroupView({
  group,
  isFirst,
  onClose,
}: {
  group: ContextMenuGroup;
  isFirst: boolean;
  onClose: () => void;
}): ReactElement {
  return (
    <>
      {!isFirst ? <div className="my-1 h-px bg-[#ededeb]" /> : null}
      {group.map((item) => (
        <ContextMenuItem item={item} key={item.label} onClose={onClose} />
      ))}
    </>
  );
}

function ContextMenuItem({
  item,
  onClose,
}: {
  item: ContextMenuItemConfig;
  onClose: () => void;
}): ReactElement {
  return (
    <button
      className={`flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[#f4f4f1] ${
        item.destructive ? 'text-[#b44b43]' : 'text-[#30302d]'
      }`}
      onClick={(event) => {
        event.stopPropagation();
        item.onSelect();
        onClose();
      }}
      role="menuitem"
      type="button"
    >
      <span className="grid size-4 place-items-center text-current">{item.icon}</span>
      {item.label}
    </button>
  );
}

function getGroupKey(group: ContextMenuGroup, index: number): string {
  return `${index}:${group.map((item) => item.label).join('|')}`;
}
