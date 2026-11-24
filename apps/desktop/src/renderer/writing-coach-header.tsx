import { History, NotebookPen, Plus, X } from 'lucide-react';
import { useId } from 'react';
import type { CoachSession } from '../shared/writing-coach';
import { useCoachPopover } from './use-coach-popover';

const ICON_BUTTON =
  'grid size-8 shrink-0 place-items-center rounded-md text-[var(--goyo-text-muted)] transition hover:bg-[var(--goyo-accent-soft)] aria-expanded:bg-[var(--goyo-accent-soft)] disabled:opacity-40';

export function WritingCoachHeader({
  session,
  sessions,
  disabled,
  notesOpen,
  onToggleNotes,
  onSelect,
  onClose,
}: {
  session?: CoachSession;
  sessions: CoachSession[];
  disabled: boolean;
  notesOpen: boolean;
  onToggleNotes: () => void;
  onSelect: (id?: string) => void;
  onClose: () => void;
}) {
  return (
    <header className="flex items-center gap-1 border-[var(--goyo-border)] border-b px-3 py-2">
      <h2 className="mr-auto truncate pl-1 font-semibold text-sm">Writing coach</h2>
      <HistoryPicker
        disabled={disabled}
        onSelect={onSelect}
        session={session}
        sessions={sessions}
      />
      <button
        aria-expanded={notesOpen}
        aria-label="Conversation notes"
        className={ICON_BUTTON}
        disabled={disabled}
        onClick={onToggleNotes}
        title="Conversation notes"
        type="button"
      >
        <NotebookPen aria-hidden="true" size={15} />
      </button>
      <button
        aria-label="Close writing coach"
        className={ICON_BUTTON}
        onClick={onClose}
        title="Close writing coach"
        type="button"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </header>
  );
}

function HistoryPicker({
  session,
  sessions,
  disabled,
  onSelect,
}: {
  session?: CoachSession;
  sessions: CoachSession[];
  disabled: boolean;
  onSelect: (id?: string) => void;
}) {
  const popover = useCoachPopover();
  const id = useId();
  function choose(nextId?: string) {
    popover.setOpen(false);
    onSelect(nextId);
    popover.trigger.current?.focus();
  }
  return (
    <div className="relative" ref={popover.container}>
      <button
        aria-controls={popover.open ? id : undefined}
        aria-expanded={popover.open}
        aria-label="Conversations"
        className={ICON_BUTTON}
        disabled={disabled}
        onClick={() => popover.setOpen(!popover.open)}
        ref={popover.trigger}
        title="Conversations"
        type="button"
      >
        <History aria-hidden="true" size={16} />
      </button>
      {popover.open && (
        <fieldset
          aria-label="Conversation history"
          className="absolute top-full right-0 z-20 mt-1 w-45 rounded-lg border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-1 text-xs shadow-md"
          id={id}
        >
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left font-medium hover:bg-[var(--goyo-accent-soft)]"
            onClick={() => choose()}
            type="button"
          >
            <Plus aria-hidden="true" size={14} /> New conversation
          </button>
          {sessions.length > 0 && (
            <ul className="mt-1 max-h-48 overflow-y-auto border-[var(--goyo-border)] border-t pt-1">
              {sessions.map(({ id: itemId, title }) => (
                <li key={itemId}>
                  <button
                    aria-current={session?.id === itemId ? 'true' : undefined}
                    className="block w-full truncate rounded px-2 py-1.5 text-left hover:bg-[var(--goyo-accent-soft)] aria-current:bg-[var(--goyo-accent-soft)]"
                    onClick={() => choose(itemId)}
                    title={title}
                    type="button"
                  >
                    {title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}
    </div>
  );
}
