import type { BookMetadata } from '@writer/core';
import { Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';

export const LIBRARY_BOOK_ACCENT_COLORS = [
  '#a6534b',
  '#b68243',
  '#6f7f5f',
  '#4f6f64',
  '#52697f',
  '#6b5876',
];

export function BookCard({
  book,
  isQuickDrafts,
  menuPosition,
  onCloseMenu,
  onDeleteBook,
  onOpenMenu,
  onSelectBook,
  onUpdateAccentColor,
}: {
  book: BookMetadata;
  isQuickDrafts: boolean;
  menuPosition: { x: number; y: number } | null;
  onCloseMenu: () => void;
  onDeleteBook: () => void;
  onOpenMenu: (position: { x: number; y: number }) => void;
  onSelectBook: (bookId: string) => void;
  onUpdateAccentColor: (accentColor: string) => void;
}): ReactElement {
  return (
    <div className="relative">
      <button
        className={`group relative min-h-28 w-full overflow-hidden rounded-2xl border px-4 py-4 text-left outline-none transition hover:border-[var(--goyo-border-strong)] hover:bg-[var(--goyo-raised)] ${
          isQuickDrafts
            ? 'border-[var(--goyo-border)] bg-[var(--goyo-panel)]'
            : 'border-[var(--goyo-border)] bg-[var(--goyo-paper)]/62'
        }`}
        onClick={() => {
          onCloseMenu();
          onSelectBook(book.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          if (isQuickDrafts) {
            return;
          }
          onOpenMenu({ x: event.clientX, y: event.clientY });
        }}
        type="button"
      >
        <span className="relative flex min-h-20 flex-col">
          <span className="mb-3 flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{
                backgroundColor: isQuickDrafts ? 'var(--goyo-text-faint)' : book.accentColor,
              }}
              aria-hidden="true"
            />
            <span className="font-medium text-[var(--goyo-text-faint)] text-[0.66rem] uppercase tracking-[0.16em]">
              {isQuickDrafts ? 'System inbox' : 'Book'}
            </span>
          </span>
          {isQuickDrafts ? <span className="sr-only">System inbox</span> : null}
          <span className="block font-semibold text-[var(--goyo-text)] text-[1.05rem] leading-tight tracking-[-0.035em]">
            {book.title}
          </span>
          <span className="mt-auto block pt-4 text-[var(--goyo-text-muted)] text-sm leading-snug">
            {isQuickDrafts ? 'Draft inbox' : `Updated ${formatDocumentDate(book.updatedAt)}`}
          </span>
        </span>
      </button>
      {menuPosition && !isQuickDrafts ? (
        <BookContextMenu
          accentColor={book.accentColor}
          onClose={onCloseMenu}
          onDelete={onDeleteBook}
          onUpdateAccentColor={onUpdateAccentColor}
          x={menuPosition.x}
          y={menuPosition.y}
        />
      ) : null}
    </div>
  );
}

function BookContextMenu({
  accentColor,
  onClose,
  onDelete,
  onUpdateAccentColor,
  x,
  y,
}: {
  accentColor: string;
  onClose: () => void;
  onDelete: () => void;
  onUpdateAccentColor: (accentColor: string) => void;
  x: number;
  y: number;
}): ReactElement {
  return (
    <div
      className="fixed z-50 min-w-40 rounded-lg border border-[var(--goyo-border)] bg-[var(--goyo-raised)] py-1 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      role="menu"
      style={{ left: x, top: y }}
    >
      <div className="px-3 pt-2 pb-2">
        <p className="mb-2 font-medium text-[var(--goyo-text-faint)] text-[0.68rem] uppercase tracking-[0.14em]">
          Accent
        </p>
        <div className="flex gap-1.5">
          {LIBRARY_BOOK_ACCENT_COLORS.map((nextAccentColor) => (
            <button
              aria-label={`Set cover color ${nextAccentColor}`}
              className="size-5 rounded-full border border-black/10 outline-none transition hover:scale-110"
              key={nextAccentColor}
              onClick={(event) => {
                event.stopPropagation();
                onUpdateAccentColor(nextAccentColor);
                onClose();
              }}
              style={{ backgroundColor: nextAccentColor }}
              type="button"
            />
          ))}
          <label className="relative grid size-5 cursor-pointer place-items-center overflow-hidden rounded-full border border-[var(--goyo-border-strong)] bg-[var(--goyo-paper)] outline-none transition hover:scale-110">
            <span
              className="absolute inset-1 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            <input
              aria-label="Choose custom accent color"
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              onChange={(event) => {
                event.stopPropagation();
                onUpdateAccentColor(event.target.value.toUpperCase());
                onClose();
              }}
              type="color"
              value={accentColor}
            />
          </label>
        </div>
      </div>
      <div className="my-1 h-px bg-[var(--goyo-border)]" />
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[var(--goyo-danger)] text-sm hover:bg-[var(--goyo-accent-soft)]"
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

function formatDocumentDate(updatedAt: string): string {
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(updatedAt));
}
