import { randomUUID } from 'node:crypto';
import type { CoachDirectProtocol, CoachKeyConnection } from '../shared/writing-coach';
import type { CoachAccountRecord } from './writing-coach-credentials';
import { CoachError } from './writing-coach-oauth';
import { COACH_INSTRUCTIONS } from './writing-coach-prompt';
import { requestProviderJson as request } from './writing-coach-provider-http';

type DirectAccount = Extract<CoachAccountRecord, { providerID: 'custom' }>;
const GO_BASE = 'https://opencode.ai/inference/go';
const PROTOCOLS = new Set(['chat-completions', 'responses', 'messages', 'generate-content']);
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

export async function connectKey(input: CoachKeyConnection): Promise<CoachAccountRecord> {
  if (typeof input?.token !== 'string' || input.token.length > 4096) {
    throw new CoachError('Enter a valid API key.');
  }
  const token = input.token.trim();
  if (input.providerID === 'opencode-go') {
    if (!token) throw new CoachError('Enter your OpenCode Go subscriber key.');
    await request(
      `${GO_BASE}/v1/usage`,
      { Authorization: `Bearer ${token}`, 'User-Agent': 'Goyo' },
      'OpenCode Go',
    );
    return {
      providerID: 'opencode-go',
      token,
      id: randomUUID(),
      label: 'OpenCode Go subscription',
    };
  }
  const account = getDirectAccount(input, token);
  if (!account.modelIds.length) {
    const models = await listDirectModels(account);
    if (!models.length)
      throw new CoachError(
        'No models were found. Supply the model IDs manually if discovery is unavailable.',
      );
  }
  return account;
}

function getDirectAccount(
  input: Exclude<CoachKeyConnection, { providerID: 'opencode-go' }>,
  token: string,
): DirectAccount {
  if (
    input.providerID !== 'custom' ||
    !PROTOCOLS.has(input.protocol) ||
    typeof input.label !== 'string' ||
    !input.label.trim() ||
    input.label.length > 80 ||
    typeof input.endpoint !== 'string'
  ) {
    throw new CoachError('Enter a provider name, API protocol, and base URL.');
  }
  const url = URL.parse(input.endpoint.trim());
  if (!url || url.username || url.password || url.search || url.hash) {
    throw new CoachError(
      'Enter an API base URL without credentials, query parameters, or fragments.',
    );
  }
  const local = LOOPBACK.has(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new CoachError('Use HTTPS, or HTTP for a local provider.');
  }
  if (!local && !token) throw new CoachError('Enter an API key for this provider.');
  return {
    providerID: 'custom',
    id: randomUUID(),
    token,
    label: input.label.trim(),
    endpoint: url.href.replace(/\/+$/, ''),
    protocol: input.protocol,
    modelIds: normalizeModelIds(input.modelIds),
  };
}

function normalizeModelIds(modelIds: unknown) {
  if (
    !Array.isArray(modelIds) ||
    modelIds.length > 500 ||
    modelIds.some((item) => typeof item !== 'string' || !item.trim() || item.length > 512)
  ) {
    throw new CoachError('Enter valid model IDs, one per line.');
  }
  return [...new Set((modelIds as string[]).map((id) => id.trim()))];
}

export async function listGoModels(token: string) {
  const body = (await request(
    `${GO_BASE}/v1/models`,
    { Authorization: `Bearer ${token}`, 'User-Agent': 'Goyo' },
    'OpenCode Go',
  )) as {
    data?: Array<{
      id?: string;
      name?: string;
      type?: string;
      modalities?: { input?: string[]; output?: string[] };
    }>;
  };
  if (!Array.isArray(body.data))
    throw new CoachError('OpenCode Go returned an invalid model list.');
  return body.data.flatMap(({ id, name, type, modalities }) =>
    id &&
    type === 'chat' &&
    modalities?.input?.includes('text') &&
    modalities.output?.includes('text')
      ? [{ id, name: name || id }]
      : [],
  );
}

export function generateGo(token: string, model: string, prompt: string, session: string) {
  return complete(
    `${GO_BASE}/openai/v1`,
    'chat-completions',
    model,
    prompt,
    {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Goyo',
      'x-opencode-session': session,
    },
    'OpenCode Go',
  );
}

function directHeaders(account: DirectAccount): Record<string, string> {
  const { protocol, token } = account;
  if (protocol === 'messages')
    return { 'anthropic-version': '2023-06-01', ...(token ? { 'x-api-key': token } : {}) };
  if (protocol === 'generate-content') return token ? { 'x-goog-api-key': token } : {};
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface DirectModelPayload {
  data?: Array<{
    id?: string;
    name?: string;
    display_name?: string;
    type?: string;
    cost?: { text?: { input?: { price?: number }; output?: { price?: number } } };
  }>;
  models?: Array<{ name?: string; displayName?: string; supportedGenerationMethods?: string[] }>;
}

export async function listDirectModels(account: DirectAccount) {
  if (account.modelIds.length) return account.modelIds.map((id) => ({ id, name: id }));
  const body = (await request(
    `${account.endpoint}/models`,
    directHeaders(account),
    'Direct provider',
  )) as DirectModelPayload;
  if (account.protocol === 'generate-content' && Array.isArray(body.models)) {
    return body.models.flatMap(({ name, displayName, supportedGenerationMethods }) =>
      name?.startsWith('models/') && supportedGenerationMethods?.includes('generateContent')
        ? [{ id: name.slice(7), name: displayName || name }]
        : [],
    );
  }
  if (!Array.isArray(body.data))
    throw new CoachError('The provider did not return a compatible model list.');
  const data =
    account.endpoint === 'https://opencode.ai/inference/openai/v1'
      ? body.data.filter(
          ({ type, cost }) =>
            type === 'chat' &&
            ((cost?.text?.input?.price ?? 0) > 0 || (cost?.text?.output?.price ?? 0) > 0),
        )
      : body.data;
  return data.flatMap(({ id, name, display_name }) =>
    id ? [{ id, name: name || display_name || id }] : [],
  );
}

export function generateDirect(account: DirectAccount, model: string, prompt: string) {
  return complete(
    account.endpoint,
    account.protocol,
    model,
    prompt,
    directHeaders(account),
    'Direct provider',
  );
}

async function complete(
  base: string,
  protocol: CoachDirectProtocol,
  model: string,
  prompt: string,
  headers: Record<string, string>,
  provider: string,
) {
  switch (protocol) {
    case 'messages': {
      const reply = (await request(`${base}/messages`, headers, provider, {
        model,
        max_tokens: 4096,
        system: COACH_INSTRUCTIONS,
        messages: [{ role: 'user', content: prompt }],
      })) as { content?: Array<{ type?: string; text?: string }>; stop_reason?: string };
      if (reply.stop_reason === 'max_tokens')
        throw new CoachError(`${provider} did not finish the reply.`);
      return (
        reply.content
          ?.filter(({ type }) => type === 'text')
          .map(({ text }) => text)
          .join('') ?? ''
      );
    }
    case 'responses': {
      const reply = (await request(`${base}/responses`, headers, provider, {
        model,
        instructions: COACH_INSTRUCTIONS,
        input: [{ role: 'user', content: prompt }],
        store: false,
        stream: false,
      })) as {
        status?: string;
        output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
      };
      if (reply.status !== 'completed')
        throw new CoachError(`${provider} did not finish the reply.`);
      return (
        reply.output
          ?.flatMap(({ content }) => content ?? [])
          .filter(({ type }) => type === 'output_text')
          .map(({ text }) => text)
          .join('') ?? ''
      );
    }
    case 'generate-content':
      return completeGemini(base, model, prompt, headers, provider);
    default:
      return completeChat(base, model, prompt, headers, provider);
  }
}

async function completeGemini(
  base: string,
  model: string,
  prompt: string,
  headers: Record<string, string>,
  provider: string,
) {
  const reply = (await request(
    `${base}/models/${encodeURIComponent(model)}:generateContent`,
    headers,
    provider,
    {
      systemInstruction: { parts: [{ text: COACH_INSTRUCTIONS }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    },
  )) as {
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    }>;
  };
  const candidate = reply.candidates?.[0];
  if (candidate?.finishReason !== 'STOP')
    throw new CoachError(`${provider} did not finish the reply.`);
  return (
    candidate.content?.parts
      ?.filter(({ thought }) => !thought)
      .map(({ text }) => text)
      .join('') ?? ''
  );
}

async function completeChat(
  base: string,
  model: string,
  prompt: string,
  headers: Record<string, string>,
  provider: string,
) {
  const reply = (await request(`${base}/chat/completions`, headers, provider, {
    model,
    messages: [
      { role: 'system', content: COACH_INSTRUCTIONS },
      { role: 'user', content: prompt },
    ],
    stream: false,
  })) as { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> };
  const choice = reply.choices?.[0];
  if (choice?.finish_reason !== 'stop')
    throw new CoachError(`${provider} did not finish the reply.`);
  return choice.message?.content ?? '';
}
