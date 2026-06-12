import { ChevronUp, Menu } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
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
  breadcrumb,
  isSidebarCollapsed,
  onCreateChapter,
  onCreateDocument,
  onShowLibrary,
  onToggleSidebar,
  wordCountLabel,
}: {
  activeDocument?: DocumentItem;
  activeMoveTarget: ActiveMoveTarget | null;
  bookTitle: string;
  breadcrumb?: string;
  isSidebarCollapsed: boolean;
  onCreateChapter?: (title?: string) => void;
  onCreateDocument?: (kind: 'draft' | 'episode' | 'note') => void;
  onShowLibrary?: () => void;
  onToggleSidebar: () => void;
  wordCountLabel?: string;
}): ReactElement {
  const currentTitle = activeDocument?.title || activeMoveTarget?.title || bookTitle;

  return (
    <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center border-[#deded9] border-b bg-[#fbfbfa] py-0 pr-3 pl-[7.25rem] [-webkit-app-region:drag]">
      <div className="flex min-w-0 items-center gap-1.5">
        <CommandButton
          label={isSidebarCollapsed ? 'Show manuscript list' : 'Hide manuscript list'}
          onClick={onToggleSidebar}
        >
          <Menu aria-hidden="true" size={17} strokeWidth={2.1} />
        </CommandButton>
        <CommandButton label="Library" onClick={onShowLibrary}>
          <ChevronUp aria-hidden="true" size={17} strokeWidth={2.1} />
        </CommandButton>
        <div className="ml-2 min-w-0 border-[#e7e3dc] border-l pl-3">
          <p className="truncate font-medium text-[#57534d] text-sm tracking-[-0.01em]">
            {currentTitle}
          </p>
          {breadcrumb ? (
            <p className="truncate text-[#9a958d] text-[0.7rem] tracking-[0.01em]">{breadcrumb}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {wordCountLabel ? (
          <p className="mr-2 hidden whitespace-nowrap font-medium text-[#9a958d] text-[0.68rem] uppercase tracking-[0.13em] sm:block">
            {wordCountLabel}
          </p>
        ) : null}
        <TextCommandButton
          disabled={!onCreateChapter}
          label="New chapter"
          onClick={() => onCreateChapter?.()}
        >
          New chapter
        </TextCommandButton>
        <TextCommandButton
          disabled={!onCreateDocument}
          label="New episode"
          onClick={() => onCreateDocument?.('episode')}
        >
          New episode
        </TextCommandButton>
      </div>
    </header>
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
      className="grid size-8 cursor-pointer place-items-center rounded-lg text-[#817d75] outline-none transition hover:bg-[#f1eee8] hover:text-[#302e29] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#817d75] [-webkit-app-region:no-drag]"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function TextCommandButton({
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
      className="h-8 cursor-pointer rounded-lg px-3 font-medium text-[#6b665f] text-sm outline-none transition hover:bg-[#f1eee8] hover:text-[#302e29] disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-[#6b665f] [-webkit-app-region:no-drag]"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
