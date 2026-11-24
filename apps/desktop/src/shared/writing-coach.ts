export const COACH_CONTEXT_LIMIT = 8_000;
export const COACH_QUESTION_LIMIT = 8_000;

export const COACH_PROVIDER_NAMES = {
  chatgpt: 'ChatGPT',
  openrouter: 'OpenRouter',
  'opencode-go': 'OpenCode Go',
  custom: 'Direct API',
  'amazon-bedrock': 'Amazon Bedrock',
  'google-vertex': 'Google Vertex AI',
  azure: 'Azure OpenAI',
} as const;

export type CoachProviderId = keyof typeof COACH_PROVIDER_NAMES;
export type CoachOAuthProviderId = 'chatgpt' | 'openrouter';
export type CoachCloudConnection = {
  modelIds: string[];
} & (
  | { providerID: 'amazon-bedrock'; region: string; profile: string }
  | { providerID: 'google-vertex'; project: string; location: string }
  | { providerID: 'azure'; resource: string }
);
export type CoachDirectProtocol =
  | 'chat-completions'
  | 'responses'
  | 'messages'
  | 'generate-content';

export type CoachKeyConnection =
  | { providerID: 'opencode-go'; token: string }
  | {
      providerID: 'custom';
      token: string;
      label: string;
      endpoint: string;
      protocol: CoachDirectProtocol;
      modelIds: string[];
    };

export interface CoachProviderPreset {
  id: string;
  label: string;
  endpoint: string;
  protocol: CoachDirectProtocol;
}

export interface CoachProviderAccount {
  id: string;
  providerID: CoachProviderId;
  label: string;
  signedIn: boolean;
}

export interface CoachModelRef {
  id: string;
  providerID: CoachProviderId;
  accountId: string;
}

export interface CoachModel extends CoachModelRef {
  name: string;
}

export interface CoachAttachment {
  id: string;
  title: string;
}

export interface CoachTurn {
  id: string;
  question: string;
  answer: string;
  attachments: CoachAttachment[];
}

export interface CoachSession {
  id: string;
  title: string;
  context: string;
  turns: CoachTurn[];
}

export interface CoachSendInput {
  bookId: string;
  sessionId: string;
  question: string;
  model: CoachModelRef;
  document: { id: string; text: string };
}

export type CoachResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface WritingCoachApi {
  listModels(accountId: string): Promise<CoachResult<CoachModel[]>>;
  listAccounts(): Promise<CoachResult<CoachProviderAccount[]>>;
  connectProvider(
    providerID: CoachOAuthProviderId,
    accountId?: string,
  ): Promise<CoachResult<CoachProviderAccount>>;
  connectKey(input: CoachKeyConnection): Promise<CoachResult<CoachProviderAccount>>;
  connectCloud(input: CoachCloudConnection): Promise<CoachResult<CoachProviderAccount>>;
  listProviderPresets(): Promise<CoachResult<CoachProviderPreset[]>>;
  cancelConnect(): Promise<void>;
  disconnectProvider(accountId: string): Promise<CoachResult<{ revocationConfirmed: boolean }>>;
  openUsage(providerID: CoachProviderId): Promise<void>;
  listSessions(bookId: string): Promise<CoachSession[]>;
  createSession(bookId: string): Promise<CoachSession>;
  saveContext(bookId: string, sessionId: string, context: string): Promise<void>;
  send(input: CoachSendInput): Promise<CoachResult<CoachTurn>>;
}
