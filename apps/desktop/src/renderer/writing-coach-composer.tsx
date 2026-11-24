import { ArrowUp, FileText, LoaderCircle } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { COACH_QUESTION_LIMIT, type CoachAttachment } from '../shared/writing-coach';

export function WritingCoachComposer({
  manuscript,
  busy,
  canSend,
  modelControl,
  onSend,
}: {
  manuscript: CoachAttachment | null;
  busy: boolean;
  canSend: boolean;
  modelControl: ReactNode;
  onSend: (question: string) => Promise<boolean>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const manuscriptId = manuscript?.id ?? '';
  const question = drafts[manuscriptId] ?? '';
  const ready = manuscript && canSend && !busy && !!question.trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || !(await onSend(question.trim()))) return;
    setDrafts((current) => ({ ...current, [manuscriptId]: '' }));
  }

  return (
    <form
      className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)] p-2 transition-colors focus-within:border-[var(--goyo-border-strong)]"
      onSubmit={(event) => void submit(event)}
    >
      {manuscript && (
        <div className="flex min-w-0 items-center gap-1.5 px-2 pt-1 text-[var(--goyo-text-muted)] text-xs">
          <FileText aria-hidden="true" className="shrink-0" size={13} />
          <span className="truncate" title={manuscript.title}>
            {manuscript.title}
          </span>
        </div>
      )}
      <QuestionField
        disabled={!manuscript}
        onChange={(value) => setDrafts((current) => ({ ...current, [manuscriptId]: value }))}
        pending={busy}
        value={question}
      />
      <div className="mt-1 flex min-w-0 items-center gap-1">
        {modelControl}
        <SendButton disabled={!ready} pending={busy} />
      </div>
    </form>
  );
}

function QuestionField({
  value,
  pending,
  disabled,
  onChange,
}: {
  value: string;
  pending: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      aria-label="Ask the writing coach about the selected document"
      className="block max-h-44 min-h-9 w-full resize-none overflow-y-auto bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none [field-sizing:content]"
      disabled={disabled}
      maxLength={COACH_QUESTION_LIMIT}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (
          event.key !== 'Enter' ||
          event.shiftKey ||
          event.nativeEvent.isComposing ||
          event.keyCode === 229
        )
          return;
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }}
      placeholder={disabled ? 'Select a document to ask about it…' : 'Ask about this document…'}
      readOnly={pending}
      rows={1}
      value={value}
    />
  );
}

function SendButton({ pending, disabled }: { pending: boolean; disabled: boolean }) {
  return (
    <button
      aria-label={pending ? 'Waiting for a reply' : 'Send message'}
      className="ml-auto grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--goyo-text)] text-[var(--goyo-paper)] transition hover:opacity-80 disabled:opacity-35"
      disabled={disabled}
      title={pending ? 'Waiting for a reply' : 'Send (Enter)'}
      type="submit"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" size={15} />
      ) : (
        <ArrowUp aria-hidden="true" size={17} />
      )}
    </button>
  );
}
