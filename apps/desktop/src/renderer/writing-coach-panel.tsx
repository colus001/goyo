import { useEffect, useRef, useState } from 'react';
import {
  COACH_CONTEXT_LIMIT,
  type CoachAttachment,
  type CoachSession,
} from '../shared/writing-coach';
import { AppButton } from './app-button';
import { WritingCoachComposer } from './writing-coach-composer';
import { WritingCoachHeader } from './writing-coach-header';
import { WritingCoachModelPicker } from './writing-coach-model-picker';
import { useCoachModels } from './writing-coach-models';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Keeps the conversation and send state in one workspace panel.
export function WritingCoachPanel({
  bookId,
  manuscript,
  open,
  onClose,
  onOpenSettings,
}: {
  bookId: string;
  manuscript: (CoachAttachment & { readText: () => string | Promise<string> }) | null;
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const api = window.writerDesktop.writingCoach;
  const [sessions, setSessions] = useState<CoachSession[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [context, setContext] = useState('');
  const [notesOpen, setNotesOpen] = useState(false);
  const [composerKey, setComposerKey] = useState(0);
  const modelState = useCoachModels(open);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selectedModel = modelState.selected;
  const session = sessions.find(({ id }) => id === sessionId);

  useEffect(() => {
    let active = true;
    void api.listSessions(bookId).then(
      (items) => {
        if (!active) return;
        setSessions(items);
        setSessionId(items[0]?.id ?? '');
        setContext(items[0]?.context ?? '');
        setSessionReady(true);
      },
      () => {
        if (!active) return;
        setError('Could not load conversations.');
      },
    );
    return () => {
      active = false;
    };
  }, [api, bookId]);

  async function changeSession(id?: string) {
    if (busy || (id && id === session?.id)) return;
    setBusy(true);
    setError('');
    try {
      if (context !== (session?.context ?? '')) await persistNotes();
      const next = sessions.find((item) => item.id === id);
      setSessionId(next?.id ?? '');
      setContext(next?.context ?? '');
      setNotesOpen(false);
      setComposerKey((current) => current + 1);
    } catch {
      setError('Could not open the conversation.');
    } finally {
      setBusy(false);
    }
  }

  async function ensureSession() {
    if (session) return session;
    const created = await api.createSession(bookId);
    setSessions((items) => [created, ...items]);
    setSessionId(created.id);
    return created;
  }

  async function persistNotes() {
    await saveContext(await ensureSession());
  }

  async function saveNotes() {
    setBusy(true);
    setError('');
    try {
      await persistNotes();
    } catch {
      setError('Could not save book notes.');
    } finally {
      setBusy(false);
    }
  }

  async function saveContext(current: CoachSession) {
    await api.saveContext(bookId, current.id, context);
    setSessions((items) =>
      items.map((item) => (item.id === current.id ? { ...item, context } : item)),
    );
  }

  async function send(question: string) {
    if (!sessionReady || !selectedModel || !manuscript || busy) return false;
    setError('');
    setBusy(true);
    try {
      const document = { id: manuscript.id, text: await manuscript.readText() };
      const current = await ensureSession();
      if (context !== current.context) await saveContext(current);
      const result = await api.send({
        bookId,
        sessionId: current.id,
        question,
        document,
        model: {
          id: selectedModel.id,
          providerID: selectedModel.providerID,
          accountId: selectedModel.accountId,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      setSessions((items) =>
        items.map((item) =>
          item.id === current.id
            ? {
                ...item,
                title: item.turns.length
                  ? item.title
                  : question.replaceAll(/\s+/g, ' ').slice(0, 48),
                turns: [...item.turns, result.data],
              }
            : item,
        ),
      );
      return true;
    } catch {
      setError('Could not send the question. Your draft is unchanged.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-[min(22rem,55%)] shrink-0" hidden={!open}>
      <aside
        aria-label="Writing coach"
        className="flex h-full min-h-0 flex-col border-[var(--goyo-border)] border-l bg-[var(--goyo-app)]"
      >
        <WritingCoachHeader
          disabled={busy || !sessionReady}
          notesOpen={notesOpen}
          onClose={onClose}
          onSelect={(id) => void changeSession(id)}
          onToggleNotes={() => setNotesOpen((value) => !value)}
          session={session}
          sessions={sessions}
        />
        {notesOpen && (
          <div className="border-[var(--goyo-border)] border-b px-4 py-3">
            <p className="text-[var(--goyo-text-muted)] text-xs">Book notes · This conversation</p>
            <textarea
              aria-label="Book notes for this conversation"
              className="mt-2 block w-full resize-y rounded border border-[var(--goyo-border)] bg-[var(--goyo-paper)] px-2 py-1.5 text-sm"
              maxLength={COACH_CONTEXT_LIMIT}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Genre, themes, characters, or what to pay attention to."
              readOnly={busy}
              rows={3}
              value={context}
            />
            <AppButton
              className="mt-1"
              disabled={busy || context === (session?.context ?? '')}
              onClick={() => void saveNotes()}
              size="sm"
              variant="ghost"
            >
              Save notes
            </AppButton>
          </div>
        )}
        <ConversationTurns session={session} />
        {error && (
          <p className="px-4 pb-2 text-[var(--goyo-danger)] text-xs" role="alert">
            {error}
          </p>
        )}
        <div className="px-3 pb-3">
          <WritingCoachComposer
            busy={busy}
            canSend={sessionReady && Boolean(selectedModel) && !modelState.loading}
            key={composerKey}
            manuscript={manuscript}
            modelControl={
              <WritingCoachModelPicker
                disabled={busy}
                onOpenSettings={onOpenSettings}
                state={modelState}
              />
            }
            onSend={send}
          />
        </div>
      </aside>
    </div>
  );
}

function ConversationTurns({ session }: { session?: CoachSession }) {
  const log = useRef<HTMLDivElement>(null);
  const lastTurnId = session?.turns.at(-1)?.id;
  useEffect(() => {
    if (lastTurnId && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lastTurnId]);

  return (
    <div
      aria-label="Conversation messages"
      aria-live="polite"
      className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4"
      ref={log}
      role="log"
    >
      {!session?.turns.length && (
        <div className="px-1 pt-3">
          <p className="font-medium text-sm">A second pair of eyes</p>
          <p className="mt-1 max-w-56 text-[var(--goyo-text-muted)] text-sm leading-relaxed">
            Ask how your current draft reads.
          </p>
        </div>
      )}
      {session?.turns.map(({ id, question, answer, attachments }) => (
        <article className="space-y-2 text-sm leading-relaxed" key={id}>
          <div className="rounded-lg bg-[var(--goyo-accent-soft)] px-3 py-2">
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{question}</p>
            {attachments.length > 0 && (
              <p className="mt-1 text-[var(--goyo-text-muted)] text-xs [overflow-wrap:anywhere]">
                {attachments.map(({ title }) => title).join(' · ')}
              </p>
            )}
          </div>
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{answer}</p>
        </article>
      ))}
    </div>
  );
}
