import type {
  CoachCloudConnection,
  CoachKeyConnection,
  CoachModelRef,
  CoachOAuthProviderId,
  CoachProviderAccount,
  CoachProviderId,
} from '../shared/writing-coach';
import {
  connectChatGpt,
  generateChatGpt,
  listChatGptModels,
  refreshChatGpt,
  revokeChatGpt,
} from './writing-coach-chatgpt';
import { configureCloudAccount, generateCloudReply } from './writing-coach-cloud';
import type { CoachAccountRecord, CoachCredentialStore } from './writing-coach-credentials';
import {
  connectKey,
  generateDirect,
  generateGo,
  listDirectModels,
  listGoModels,
} from './writing-coach-direct';
import { CoachError } from './writing-coach-oauth';
import {
  connectOpenRouter,
  generateOpenRouter,
  listOpenRouterModels,
} from './writing-coach-openrouter';

const USAGE = {
  chatgpt: 'https://chatgpt.com/settings/usage',
  openrouter: 'https://openrouter.ai/keys',
  'opencode-go': 'https://opencode.ai/console/go',
  custom: undefined,
  'amazon-bedrock': undefined,
  'google-vertex': undefined,
  azure: undefined,
} as const;

export class WritingCoachProviders {
  #connection?: AbortController;
  #disconnecting = new Set<string>();
  #refreshing = new Map<string, Promise<string>>();
  #listedModels = new Map<string, Set<string>>();

  constructor(
    private readonly store: CoachCredentialStore,
    private readonly openExternal: (url: string) => Promise<void>,
  ) {}

  #getAccount(id: string) {
    if (this.#disconnecting.has(id)) throw new CoachError('This account is signing out.');
    return this.store.list().find((account) => account.id === id);
  }

  #chatGptRegistration(providerID: CoachProviderId, id?: string) {
    if (!id) return undefined;
    const account = this.#getAccount(id);
    if (providerID === 'chatgpt' && account?.providerID === 'chatgpt') return account;
    throw new CoachError('Select an existing ChatGPT account or connect a new account.');
  }

  async connect(providerID: CoachOAuthProviderId, id?: string) {
    if (providerID !== 'chatgpt' && providerID !== 'openrouter')
      throw new CoachError('Unknown AI provider.');
    if (this.#connection) throw new CoachError('A browser sign-in is already in progress.');
    this.store.requireEncryption();
    const account = this.#chatGptRegistration(providerID, id);
    const abort = new AbortController();
    this.#connection = abort;
    const signal = AbortSignal.any([abort.signal, AbortSignal.timeout(5 * 60_000)]);
    try {
      const next =
        providerID === 'chatgpt'
          ? await connectChatGpt(this.store.hostId(), account, signal, this.openExternal)
          : await connectOpenRouter(signal, this.openExternal);
      signal.throwIfAborted();
      this.store.save(next);
      this.#listedModels.delete(next.id);
      return publicAccount(next);
    } catch (error) {
      if (signal.aborted) throw new CoachError('Sign-in was cancelled or timed out.');
      throw error;
    } finally {
      if (this.#connection === abort) this.#connection = undefined;
    }
  }

  async connectKey(input: CoachKeyConnection) {
    this.store.requireEncryption();
    const account = await connectKey(input);
    this.store.save(account);
    return publicAccount(account);
  }

  connectCloud(input: CoachCloudConnection) {
    this.store.requireEncryption();
    const account = configureCloudAccount(input);
    this.store.save(account);
    return publicAccount(account);
  }

  async #accessToken(account: CoachAccountRecord) {
    if (account.providerID !== 'chatgpt') return 'token' in account ? account.token : '';
    const previous = account.tokens;
    if (!previous) throw new CoachError('Reconnect this ChatGPT account in Settings.');
    if (previous.expiresAt - Date.now() > 60_000) return previous.accessToken;
    const existing = this.#refreshing.get(account.id);
    if (existing) return existing;

    const pending = refreshChatGpt(account, previous).then((tokens) => {
      const current = this.store.list().find(({ id }) => id === account.id);
      if (current?.providerID !== 'chatgpt' || !current.tokens) {
        throw new CoachError('This account is no longer connected.');
      }
      if (previous.refreshToken !== current.tokens.refreshToken) return current.tokens.accessToken;
      this.store.save({ ...current, tokens });
      return tokens.accessToken;
    });
    this.#refreshing.set(account.id, pending);
    try {
      return await pending;
    } finally {
      this.#refreshing.delete(account.id);
    }
  }

  async disconnect(id: string) {
    if (this.#connection)
      throw new CoachError('Finish or cancel browser sign-in before signing out.');
    const account = this.#getAccount(id);
    if (!account) throw new CoachError('Account not found.');
    this.#disconnecting.add(id);
    this.#listedModels.delete(id);
    try {
      await this.#refreshing.get(id)?.catch(() => undefined);
      if (account.providerID !== 'chatgpt') {
        this.store.remove(id);
        return { revocationConfirmed: false };
      }
      const current = this.store.list().find((item) => item.id === id);
      const revocationConfirmed =
        current?.providerID === 'chatgpt' && (await revokeChatGpt(current).catch(() => false));
      this.store.save({ ...account, tokens: null });
      return { revocationConfirmed };
    } finally {
      this.#disconnecting.delete(id);
    }
  }

  #requireAccount(id: string) {
    const account = this.#getAccount(id);
    if (!account || !publicAccount(account).signedIn) {
      throw new CoachError('Connect this AI account in Settings before using it.');
    }
    return account;
  }

  cancelConnect() {
    const attempt = this.#connection;
    this.#connection = undefined;
    attempt?.abort();
  }
  listAccounts() {
    return this.store.list().map(publicAccount);
  }
  openUsage(providerID: CoachProviderId) {
    const url = Object.hasOwn(USAGE, providerID) ? USAGE[providerID] : undefined;
    if (url) return this.openExternal(url);
  }
  async listModels(accountId: string) {
    const account = this.#requireAccount(accountId);
    const token = await this.#accessToken(account);
    const models = await listProviderModels(account, token);
    this.#requireAccount(accountId);
    this.#listedModels.set(accountId, new Set(models.map(({ id }) => id)));
    return models.map((model) => ({ ...model, providerID: account.providerID, accountId }));
  }
  async generate(model: CoachModelRef, prompt: string, sessionId = '') {
    const account = this.#requireAccount(model.accountId);
    if (account.providerID !== model.providerID) {
      throw new CoachError('Choose a model for the selected account.');
    }
    if (!this.#listedModels.get(model.accountId)?.has(model.id)) {
      throw new CoachError('Choose an available model for this account before sending.');
    }
    const token = await this.#accessToken(account);
    this.#requireAccount(account.id);
    const answer = (
      await generateProviderReply(account, token, model.id, prompt, sessionId)
    ).trim();
    if (!answer) throw new CoachError('The model returned an empty reply.');
    return answer;
  }
}

function listProviderModels(account: CoachAccountRecord, token: string) {
  switch (account.providerID) {
    case 'chatgpt':
      return listChatGptModels(token);
    case 'openrouter':
      return listOpenRouterModels(token);
    case 'opencode-go':
      return listGoModels(token);
    case 'custom':
      return listDirectModels(account);
    case 'amazon-bedrock':
    case 'google-vertex':
    case 'azure':
      return account.modelIds.map((id) => ({ id, name: id }));
  }
}

function generateProviderReply(
  account: CoachAccountRecord,
  token: string,
  model: string,
  prompt: string,
  sessionId: string,
) {
  switch (account.providerID) {
    case 'chatgpt':
      return generateChatGpt(token, model, prompt);
    case 'openrouter':
      return generateOpenRouter(token, model, prompt);
    case 'opencode-go':
      if (!sessionId) throw new CoachError('OpenCode Go needs a conversation before sending.');
      return generateGo(token, model, prompt, sessionId);
    case 'custom':
      return generateDirect(account, model, prompt);
    case 'amazon-bedrock':
    case 'google-vertex':
    case 'azure':
      return generateCloudReply(account, model, prompt);
  }
}

function publicAccount({
  id,
  label,
  providerID,
  ...credentials
}: CoachAccountRecord): CoachProviderAccount {
  return { id, label, providerID, signedIn: 'tokens' in credentials ? !!credentials.tokens : true };
}
