import { ChevronRight, Menu, Plus, Settings } from 'lucide-react';
import type { ReactElement, ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { WritingShellProps } from './writing-shell';

type DocumentItem = NonNullable<WritingShellProps['documents']>[number];

export interface ActiveMoveTarget {
  id: string;
  kind: 'chapter' | 'document';
  title?: string;
}

export function WritingTopBar({
  activeDocument,
  activeMoveTarget,
  bookTitle,
  breadcrumbSegments,
  isSidebarCollapsed,
  onCreateChapter,
  onCreateDocument,
  onOpenSettings,
  onToggleSidebar,
  wordCountLabel,
}: {
  activeDocument?: DocumentItem;
  activeMoveTarget: ActiveMoveTarget | null;
  bookTitle: string;
  breadcrumbSegments?: string[];
  isSidebarCollapsed: boolean;
  onCreateChapter?: (title?: string) => void;
  onCreateDocument?: (kind: 'draft' | 'episode' | 'note') => void;
  onOpenSettings?: () => void;
  onToggleSidebar: () => void;
  wordCountLabel?: string;
}): ReactElement {
  const currentTitle = activeDocument?.title || activeMoveTarget?.title || bookTitle;

  return (
    <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center border-[var(--goyo-border)] border-b bg-[var(--goyo-paper)] py-0 pr-3 pl-22 [-webkit-app-region:drag]">
      <div className="flex min-w-0 items-center gap-1.5">
        <CommandButton
          label={isSidebarCollapsed ? 'Show manuscript list' : 'Hide manuscript list'}
          onClick={onToggleSidebar}
        >
          <Menu aria-hidden="true" size={17} strokeWidth={2.1} />
        </CommandButton>
        <div className="ml-3 min-w-0">
          {breadcrumbSegments && breadcrumbSegments.length > 0 ? (
            <BreadcrumbTrail segments={breadcrumbSegments} />
          ) : (
            <p className="truncate font-semibold text-[var(--goyo-text)] text-[1rem] tracking-[-0.035em]">
              {currentTitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {wordCountLabel ? (
          <p className="mr-2 hidden whitespace-nowrap font-medium text-[var(--goyo-text-faint)] text-[0.68rem] uppercase tracking-[0.13em] sm:block">
            {wordCountLabel}
          </p>
        ) : null}
        <CommandButton label="Settings" onClick={onOpenSettings}>
          <Settings aria-hidden="true" size={16} strokeWidth={2.1} />
        </CommandButton>
        <CreateMenuButton onCreateChapter={onCreateChapter} onCreateDocument={onCreateDocument} />
      </div>
    </header>
  );
}

function BreadcrumbTrail({ segments }: { segments: string[] }): ReactElement {
  return (
    <div className="flex min-w-0 items-center gap-1.5 font-semibold text-[var(--goyo-text-muted)] text-[1rem] tracking-[-0.035em]">
      {segments.map((segment, index) => (
        <span className="contents" key={segment}>
          {index > 0 ? (
            <ChevronRight
              aria-hidden="true"
              className="shrink-0 text-[var(--goyo-border-strong)]"
              size={14}
              strokeWidth={1.8}
            />
          ) : null}
          <span className="min-w-0 truncate last:text-[var(--goyo-text)]">{segment}</span>
        </span>
      ))}
    </div>
  );
}

function CommandButton({
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}): ReactElement {
  return (
    <button
      aria-label={label}
      className="grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--goyo-text-faint)] outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--goyo-text-faint)] [-webkit-app-region:no-drag]"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function CreateMenuButton({
  onCreateChapter,
  onCreateDocument,
}: {
  onCreateChapter?: (title?: string) => void;
  onCreateDocument?: (kind: 'draft' | 'episode' | 'note') => void;
}): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDisabled = !onCreateChapter && !onCreateDocument;

  useCloseCreateMenu(isOpen, containerRef, () => setIsOpen(false));

  return (
    <div className="relative [-webkit-app-region:no-drag]" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Create"
        className="grid size-8 cursor-pointer place-items-center rounded-lg text-[var(--goyo-text-muted)] outline-none transition hover:bg-[var(--goyo-accent-soft)] hover:text-[var(--goyo-text)] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[var(--goyo-text-muted)]"
        disabled={isDisabled}
        onClick={() => setIsOpen((current) => !current)}
        title="Create"
        type="button"
      >
        <Plus aria-hidden="true" size={18} strokeWidth={2.1} />
      </button>
      {isOpen ? (
        <CreateMenu
          onClose={() => setIsOpen(false)}
          onCreateChapter={onCreateChapter}
          onCreateDocument={onCreateDocument}
        />
      ) : null}
    </div>
  );
}

function useCloseCreateMenu(
  isOpen: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  onClose: () => void,
) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

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
  }, [containerRef, isOpen, onClose]);
}

function CreateMenu({
  onClose,
  onCreateChapter,
  onCreateDocument,
}: {
  onClose: () => void;
  onCreateChapter?: (title?: string) => void;
  onCreateDocument?: (kind: 'draft' | 'episode' | 'note') => void;
}): ReactElement {
  return (
    <div
      className="absolute top-9 right-0 z-30 min-w-40 rounded-lg border border-[#deded8] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
      role="menu"
    >
      {onCreateDocument ? (
        <CreateMenuItem
          label="New document"
          onClick={() => {
            onCreateDocument('episode');
            onClose();
          }}
        />
      ) : null}
      {onCreateChapter ? (
        <CreateMenuItem
          label="New chapter"
          onClick={() => {
            onCreateChapter();
            onClose();
          }}
        />
      ) : null}
    </div>
  );
}

function CreateMenuItem({ label, onClick }: { label: string; onClick: () => void }): ReactElement {
  return (
    <button
      className="flex w-full cursor-pointer px-3 py-1.5 text-left text-[#30302d] text-sm outline-none hover:bg-[#f4f4f1] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
      onClick={onClick}
      role="menuitem"
      type="button"
    >
      {label}
    </button>
  );
}
