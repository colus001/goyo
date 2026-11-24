import { randomUUID } from 'node:crypto';
import { ipcMain, shell } from 'electron';
import {
  COACH_CONTEXT_LIMIT,
  COACH_QUESTION_LIMIT,
  type CoachCloudConnection,
  type CoachKeyConnection,
  type CoachOAuthProviderId,
  type CoachProviderId,
  type CoachResult,
  type CoachSendInput,
  type CoachTurn,
} from '../shared/writing-coach';
import type { DesktopLocalStore } from './document-metadata-store';
import { listProviderPresets } from './writing-coach-catalog';
import { createCoachCredentialStore } from './writing-coach-credentials';
import { CoachError } from './writing-coach-oauth';
import { buildCoachPrompt } from './writing-coach-prompt';
import { WritingCoachProviders } from './writing-coach-provider';

export function registerWritingCoachIpc(store: DesktopLocalStore, userDataPath: string) {
  const providers = new WritingCoachProviders(createCoachCredentialStore(userDataPath), (url) =>
    shell.openExternal(url),
  );
  registerProviderIpc(providers);
  const sessions = store.writingCoach;
  const activeSessions = new Set<string>();
  ipcMain.handle('writingCoach:listSessions', (_event, bookId: string) => sessions.list(bookId));
  ipcMain.handle('writingCoach:createSession', (_event, bookId: string) => {
    if (!store.listBooks().some((book) => book.id === bookId)) throw new Error('Book not found.');
    return sessions.create(bookId);
  });
  ipcMain.handle(
    'writingCoach:saveContext',
    (_event, bookId: string, sessionId: string, context: string) => {
      if (typeof context !== 'string' || context.length > COACH_CONTEXT_LIMIT) {
        throw new Error('Book notes are too long.');
      }
      if (!sessions.saveContext(bookId, sessionId, context)) {
        throw new Error('Conversation not found.');
      }
    },
  );
  ipcMain.handle('writingCoach:send', (_event, input: CoachSendInput) =>
    attempt(async () => {
      validateSend(input);
      const session = sessions.get(input.bookId, input.sessionId);
      if (!session) throw new CoachError('Conversation not found.');
      if (activeSessions.has(session.id)) throw new CoachError('A reply is already in progress.');
      activeSessions.add(session.id);
      try {
        const doc = store.getDocumentMetadata(input.document.id);
        if (!doc || doc.archivedAt || doc.bookId !== input.bookId) {
          throw new CoachError('The selected document is no longer in this book.');
        }
        const title = doc.title || `Untitled ${doc.kind}`;
        const question = input.question.trim();
        const prompt = buildCoachPrompt({
          question,
          context: session.context,
          turns: session.turns,
          manuscript: { ...input.document, title },
        });
        const answer = await providers.generate(input.model, prompt, session.id);
        const turn: CoachTurn = {
          id: randomUUID(),
          question,
          answer,
          attachments: [{ id: doc.id, title }],
        };
        if (!sessions.appendTurn(input.bookId, input.sessionId, turn)) {
          throw new CoachError('The conversation is no longer available.');
        }
        return turn;
      } finally {
        activeSessions.delete(session.id);
      }
    }),
  );
}

function registerProviderIpc(providers: WritingCoachProviders) {
  ipcMain.handle('writingCoach:listAccounts', () => attempt(() => providers.listAccounts()));
  ipcMain.handle('writingCoach:listModels', (_event, id: string) =>
    attempt(() => providers.listModels(id)),
  );
  ipcMain.handle(
    'writingCoach:connectProvider',
    (_event, providerID: CoachOAuthProviderId, id?: string) =>
      attempt(() => providers.connect(providerID, id)),
  );
  ipcMain.handle('writingCoach:connectKey', (_event, input: CoachKeyConnection) =>
    attempt(() => providers.connectKey(input)),
  );
  ipcMain.handle('writingCoach:connectCloud', (_event, input: CoachCloudConnection) =>
    attempt(() => providers.connectCloud(input)),
  );
  ipcMain.handle('writingCoach:listProviderPresets', () => attempt(listProviderPresets));
  ipcMain.handle('writingCoach:cancelConnect', () => providers.cancelConnect());
  ipcMain.handle('writingCoach:disconnectProvider', (_event, id: string) =>
    attempt(() => providers.disconnect(id)),
  );
  ipcMain.handle('writingCoach:openUsage', (_event, providerID: CoachProviderId) =>
    providers.openUsage(providerID),
  );
}

function validateSend(input: CoachSendInput) {
  if (
    !input ||
    typeof input.bookId !== 'string' ||
    typeof input.sessionId !== 'string' ||
    typeof input.question !== 'string' ||
    !input.question.trim() ||
    input.question.length > COACH_QUESTION_LIMIT ||
    typeof input.model?.id !== 'string' ||
    typeof input.model.providerID !== 'string' ||
    typeof input.model.accountId !== 'string' ||
    typeof input.document?.id !== 'string' ||
    typeof input.document.text !== 'string'
  ) {
    throw new CoachError('The question or selected document is invalid.');
  }
  if (input.document.text.length > 80_000) {
    throw new CoachError('The selected document is too long to send.');
  }
}

async function attempt<T>(run: () => T | Promise<T>): Promise<CoachResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    // Provider errors may contain the prompt or credentials.
    return {
      ok: false,
      error:
        error instanceof CoachError
          ? error.message
          : 'The request could not be completed. Check the connection and provider usage limits.',
    };
  }
}
