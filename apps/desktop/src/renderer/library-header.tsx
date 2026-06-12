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
    <div className="mb-7 border-[var(--goyo-border)] border-b pb-6">
      <div className="mb-6 flex items-center gap-3">
        <img alt="" className="size-7 rounded-md" src={logoMark} />
        <div>
          <p className="font-semibold text-[var(--goyo-text)] text-sm tracking-[-0.02em]">Goyo</p>
          <p className="text-[var(--goyo-text-faint)] text-[0.68rem] uppercase tracking-[0.18em]">
            Quiet writing
          </p>
        </div>
      </div>
      <div className="max-w-[34rem]">
        <h1 className="font-semibold text-[2rem] leading-none tracking-[-0.06em]">Start writing</h1>
        <p className="mt-3 text-[var(--goyo-text-muted)] leading-relaxed">
          Open a book, collect a quick draft, or begin something new.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--goyo-accent)] px-3.5 py-2 font-medium text-sm text-white outline-none transition hover:bg-[var(--goyo-accent-hover)]"
            onClick={onOpenNewBookModal}
            type="button"
          >
            <FilePlus2 aria-hidden="true" size={15} />
            New book
          </button>
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 font-medium text-[var(--goyo-text-muted)] text-sm outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
            onClick={onStartQuickDraft}
            type="button"
          >
            <PenLine aria-hidden="true" size={15} />
            Quick draft
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="relative" ref={sortControlRef}>
            <button
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 font-medium text-[var(--goyo-text-muted)] text-sm outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
              onClick={() => setIsSortMenuOpen((current) => !current)}
              type="button"
            >
              <ArrowDownWideNarrow aria-hidden="true" size={15} />
              {getSortModeLabel(sortMode)}
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
            aria-label="Settings"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-2 font-medium text-[var(--goyo-text-muted)] text-sm outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)]"
            onClick={onOpenSettings}
            type="button"
          >
            <Settings aria-hidden="true" size={15} />
            Settings
          </button>
        </div>
      </div>
    </div>
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
    <div className="absolute top-10 right-0 z-30 min-w-42 cursor-pointer rounded-lg border border-[var(--goyo-border)] bg-[var(--goyo-raised)] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
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
      className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[var(--goyo-text)] text-sm hover:bg-[var(--goyo-accent-soft)]"
      onClick={onClick}
      type="button"
    >
      <span className="grid size-4 place-items-center text-[var(--goyo-text-faint)]">
        {isSelected ? <Check aria-hidden="true" size={14} /> : null}
      </span>
      {label}
    </button>
  );
}

function getSortModeLabel(sortMode: LibrarySortMode): string {
  return sortMode === 'updated' ? 'Updated' : 'Title';
}
