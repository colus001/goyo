import { ArrowDownWideNarrow, Check, FilePlus2, PenLine, Settings } from 'lucide-react';
import type { ReactElement, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import logoMark from './logo.svg';

export type LibrarySortMode = 'title' | 'updated';

export function LibraryHeader({
  onOpenNewBookModal,
  onOpenSettings,
  onSortModeChange,
  onStartQuickDraft,
  sortMode,
}: {
  onOpenNewBookModal: () => void;
  onOpenSettings: () => void;
  onSortModeChange: (sortMode: LibrarySortMode) => void;
  onStartQuickDraft: () => void;
  sortMode: LibrarySortMode;
}): ReactElement {
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortControlRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="mb-3 flex items-center gap-2.5">
        <img
          alt=""
          className="size-7 rounded-md shadow-[0_5px_12px_rgba(53,92,125,0.18)]"
          src={logoMark}
        />
        <p className="font-semibold text-[var(--goyo-text-faint)] text-xs uppercase tracking-[0.18em]">
          Goyo
        </p>
      </div>
      <div className="mb-10 flex items-end justify-between gap-8 border-[var(--goyo-border-strong)] border-b pb-7">
        <div>
          <h1 className="font-semibold text-[2.55rem] leading-none tracking-[-0.06em]">
            Choose a book
          </h1>
          <p className="mt-3 max-w-[31rem] text-[var(--goyo-text-muted)]">
            Open a manuscript, create a book, or start a quick draft.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            aria-label="Settings"
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--goyo-accent-soft)] px-4 py-2 font-medium text-[var(--goyo-text-muted)] outline-none transition hover:brightness-95"
            onClick={onOpenSettings}
            type="button"
          >
            <Settings aria-hidden="true" size={16} />
            Settings
          </button>
          <div className="relative" ref={sortControlRef}>
            <button
              className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--goyo-accent-soft)] px-4 py-2 font-medium text-[var(--goyo-text-muted)] outline-none transition hover:brightness-95"
              onClick={() => setIsSortMenuOpen((current) => !current)}
              type="button"
            >
              <ArrowDownWideNarrow aria-hidden="true" size={16} />
              Sort: {getSortModeLabel(sortMode)}
            </button>
            {isSortMenuOpen ? (
              <SortMenu
                containerRef={sortControlRef}
                onClose={() => setIsSortMenuOpen(false)}
                onChange={(nextSortMode) => {
                  onSortModeChange(nextSortMode);
                  setIsSortMenuOpen(false);
                }}
                selectedSortMode={sortMode}
              />
            ) : null}
          </div>
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--goyo-accent)] px-4 py-2 font-medium text-white shadow-sm outline-none transition hover:bg-[var(--goyo-accent-hover)]"
            onClick={onOpenNewBookModal}
            type="button"
          >
            <FilePlus2 aria-hidden="true" size={16} />
            New book
          </button>
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--goyo-accent-soft)] px-4 py-2 font-medium text-[var(--goyo-text)] outline-none transition hover:brightness-95"
            onClick={onStartQuickDraft}
            type="button"
          >
            <PenLine aria-hidden="true" size={16} />
            Write without book
          </button>
        </div>
      </div>
    </>
  );
}

function SortMenu({
  containerRef,
  onClose,
  onChange,
  selectedSortMode,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onChange: (sortMode: LibrarySortMode) => void;
  selectedSortMode: LibrarySortMode;
}): ReactElement {
  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
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
  }, [containerRef, onClose]);

  return (
    <div className="absolute top-11 right-0 z-30 min-w-42 cursor-pointer rounded-lg border border-[#deded8] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
      <SortMenuItem
        isSelected={selectedSortMode === 'updated'}
        label="Updated first"
        onClick={() => onChange('updated')}
      />
      <SortMenuItem
        isSelected={selectedSortMode === 'title'}
        label="Title A-Z"
        onClick={() => onChange('title')}
      />
    </div>
  );
}

function SortMenuItem({
  isSelected,
  label,
  onClick,
}: {
  isSelected: boolean;
  label: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[#30302d] text-sm hover:bg-[#f4f4f1]"
      onClick={onClick}
      type="button"
    >
      <span className="grid size-4 place-items-center text-[#8d887e]">
        {isSelected ? <Check aria-hidden="true" size={14} /> : null}
      </span>
      {label}
    </button>
  );
}

function getSortModeLabel(sortMode: LibrarySortMode): string {
  return sortMode === 'updated' ? 'Updated' : 'Title';
}
