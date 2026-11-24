import { randomUUID } from 'node:crypto';
import type { CoachAccountRecord } from './writing-coach-credentials';
import { authorizeInBrowser, CoachError, createPkce } from './writing-coach-oauth';
import { COACH_INSTRUCTIONS } from './writing-coach-prompt';

const API = 'https://openrouter.ai/api/v1';

export async function connectOpenRouter(
  signal: AbortSignal,
  openExternal: (url: string) => Promise<void>,
): Promise<Extract<CoachAccountRecord, { token: string }>> {
  const pkce = createPkce();
  const { params } = await authorizeInBrowser({
    state: pkce.state,
    signal,
    openExternal,
    buildUrl(callback) {
      const url = new URL('https://openrouter.ai/auth');
      url.search = new URLSearchParams({
        callback_url: callback,
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
        state: pkce.state,
        key_label: 'Goyo',
      }).toString();
      return url;
    },
  });
  const response = await fetch(`${API}/auth/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: params.get('code'),
      code_verifier: pkce.verifier,
      code_challenge_method: 'S256',
    }),
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
  });
  if (!response.ok) throw new CoachError('OpenRouter sign-in could not be completed.');
  const { key } = (await response.json()) as { key?: unknown };
  if (typeof key !== 'string' || !key)
    throw new CoachError('OpenRouter returned an incomplete sign-in.');
  return { id: randomUUID(), providerID: 'openrouter', token: key, label: 'OpenRouter account' };
}

export async function listOpenRouterModels(token: string) {
  const response = await request('/models/user', token);
  const { data } = (await response.json()) as {
    data?: Array<{
      id?: string;
      name?: string;
      architecture?: { input_modalities?: string[]; output_modalities?: string[] };
    }>;
  };
  if (!Array.isArray(data)) throw new CoachError('OpenRouter returned an invalid model list.');
  return data.flatMap(({ id, name, architecture }) =>
    typeof id === 'string' &&
    architecture?.input_modalities?.includes('text') &&
    architecture.output_modalities?.includes('text')
      ? [{ id, name: name || id }]
      : [],
  );
}

export async function generateOpenRouter(token: string, model: string, prompt: string) {
  const response = await request('/chat/completions', token, {
    model,
    messages: [
      { role: 'system', content: COACH_INSTRUCTIONS },
      { role: 'user', content: prompt },
    ],
    stream: false,
  });
  const { choices } = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
  };
  const reply = choices?.[0];
  if (reply?.finish_reason !== 'stop') throw new CoachError('OpenRouter did not finish the reply.');
  return reply.message?.content ?? '';
}

async function request(path: string, token: string, body?: object) {
  const response = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'HTTP-Referer': 'https://goyo.seokjun.kim',
      'X-OpenRouter-Title': 'Goyo',
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(body ? 90_000 : 10_000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new CoachError('Check your OpenRouter account access or reconnect in Settings.');
  }
  if (response.status === 402 || response.status === 429) {
    throw new CoachError('Check your OpenRouter credits or usage limits.');
  }
  if (!response.ok) throw new CoachError('OpenRouter could not complete the request.');
  return response;
}
