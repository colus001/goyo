import { BookOpen, FilePlus2, PenLine, Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import type { WritingShellProps } from './writing-shell';

const BOOK_ACCENT_COLORS = ['#a6534b', '#b68243', '#6f7f5f', '#4f6f64', '#52697f', '#6b5876'];

type BookItem = NonNullable<WritingShellProps['books']>[number];
export type BookMenuState = { bookId: string; x: number; y: number } | null;

export function WritingBookList({
  activeBookId,
  bookMenu,
  books,
  onCloseMenu,
  onCreateBook,
  onDeleteBook,
  onOpenMenu,
  onSelectBook,
  onStartQuickDraft,
  onUpdateBookAccentColor,
}: {
  activeBookId?: string;
  bookMenu: BookMenuState;
  books: BookItem[];
  onCloseMenu: () => void;
  onCreateBook?: () => void;
  onDeleteBook?: (bookId: string) => void;
  onOpenMenu: (bookId: string, position: { x: number; y: number }) => void;
  onSelectBook?: (bookId: string) => void;
  onStartQuickDraft?: () => void;
  onUpdateBookAccentColor?: (bookId: string, accentColor: string) => void;
}): ReactElement {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <p className="font-semibold text-[var(--goyo-text-faint)] text-[0.68rem] uppercase tracking-[0.14em]">
          Books
        </p>
        <div className="flex items-center gap-1">
          <SidebarIconButton label="New book" onClick={onCreateBook}>
            <FilePlus2 aria-hidden="true" size={14} />
          </SidebarIconButton>
          <SidebarIconButton label="Quick draft" onClick={onStartQuickDraft}>
            <PenLine aria-hidden="true" size={14} />
          </SidebarIconButton>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {books.map((book) => (
          <BookRow
            book={book}
            isActive={book.id === activeBookId}
            key={book.id}
            menuPosition={bookMenu?.bookId === book.id ? { x: bookMenu.x, y: bookMenu.y } : null}
            onCloseMenu={onCloseMenu}
            onDeleteBook={onDeleteBook}
            onOpenMenu={(position) => onOpenMenu(book.id, position)}
            onSelectBook={onSelectBook}
            onUpdateBookAccentColor={onUpdateBookAccentColor}
          />
        ))}
        {books.length === 0 ? (
          <p className="rounded-lg bg-[var(--goyo-paper)]/55 px-3 py-2 text-[var(--goyo-text-muted)] text-xs">
            Create a book or start a quick draft.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function BookRow({
  book,
  isActive,
  menuPosition,
  onCloseMenu,
  onDeleteBook,
  onOpenMenu,
  onSelectBook,
  onUpdateBookAccentColor,
}: {
  book: BookItem;
  isActive: boolean;
  menuPosition: { x: number; y: number } | null;
  onCloseMenu: () => void;
  onDeleteBook?: (bookId: string) => void;
  onOpenMenu: (position: { x: number; y: number }) => void;
  onSelectBook?: (bookId: string) => void;
  onUpdateBookAccentColor?: (bookId: string, accentColor: string) => void;
}): ReactElement {
  return (
    <div className="relative">
      <button
        className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left outline-none transition hover:bg-[var(--goyo-accent-soft)] ${
          isActive
            ? 'bg-[var(--goyo-accent-soft)] text-[var(--goyo-text)]'
            : 'text-[var(--goyo-text-muted)]'
        }`}
        onClick={() => {
          onCloseMenu();
          onSelectBook?.(book.id);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          if (!book.isSystem) {
            onOpenMenu({ x: event.clientX, y: event.clientY });
          }
        }}
        type="button"
      >
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: book.accentColor }}
        />
        <span className="min-w-0 flex-1 truncate font-medium text-sm tracking-[-0.025em]">
          {book.title}
        </span>
        {book.isSystem ? (
          <BookOpen aria-hidden="true" className="shrink-0 opacity-45" size={14} />
        ) : null}
      </button>
      {menuPosition && !book.isSystem ? (
        <BookContextMenu
          accentColor={book.accentColor}
          onClose={onCloseMenu}
          onDelete={() => onDeleteBook?.(book.id)}
          onUpdateAccentColor={(accentColor) => onUpdateBookAccentColor?.(book.id, accentColor)}
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
      onPointerDown={(event) => event.stopPropagation()}
      role="menu"
      style={{ left: x, top: y }}
    >
      <div className="px-3 pt-2 pb-2">
        <p className="mb-2 font-medium text-[var(--goyo-text-faint)] text-[0.68rem] uppercase tracking-[0.14em]">
          Accent
        </p>
        <div className="flex gap-1.5">
          {BOOK_ACCENT_COLORS.map((color) => (
            <button
              aria-label={`Set cover color ${color}`}
              className="size-5 cursor-pointer rounded-full border border-black/10 outline-none transition hover:scale-110"
              key={color}
              onClick={() => {
                onUpdateAccentColor(color);
                onClose();
              }}
              style={{ backgroundColor: color }}
              type="button"
            />
          ))}
          <input
            aria-label="Choose custom accent color"
            className="size-5 cursor-pointer rounded-full border border-[var(--goyo-border-strong)] bg-transparent p-0"
            onChange={(event) => {
              onUpdateAccentColor(event.target.value.toUpperCase());
              onClose();
            }}
            type="color"
            value={accentColor}
          />
        </div>
      </div>
      <div className="my-1 h-px bg-[var(--goyo-border)]" />
      <button
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[var(--goyo-danger)] text-sm hover:bg-[var(--goyo-accent-soft)]"
        onClick={() => {
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

function SidebarIconButton({
  children,
  label,
  onClick,
}: {
  children: ReactElement;
  label: string;
  onClick?: () => void;
}): ReactElement {
  return (
    <button
      aria-label={label}
      className="grid size-7 cursor-pointer place-items-center rounded-md text-[var(--goyo-text-faint)] outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)] disabled:cursor-default disabled:opacity-35"
      disabled={!onClick}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
