import { randomUUID } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import OpenAI from 'openai';
import type { ChatGptTokens, CoachAccountRecord } from './writing-coach-credentials';
import { authorizeInBrowser, CoachError, createPkce } from './writing-coach-oauth';
import { COACH_INSTRUCTIONS } from './writing-coach-prompt';

type ChatGptAccount = Extract<CoachAccountRecord, { providerID: 'chatgpt' }>;
const ISSUER = 'https://auth.openai.com';
const RESOURCE = 'https://api.openai.com/v1';
const DYNAMIC_CLIENT = 'dynamic_agent_client';
const SCOPES = 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';
const JWKS = createRemoteJWKSet(new URL('/.well-known/jwks.json', ISSUER));

export async function connectChatGpt(
  hostId: string,
  account: ChatGptAccount | undefined,
  signal: AbortSignal,
  openExternal: (url: string) => Promise<void>,
): Promise<ChatGptAccount> {
  const pkce = createPkce();
  const { callback, params } = await authorizeInBrowser({
    state: pkce.state,
    signal,
    openExternal,
    buildUrl(redirect) {
      const url = new URL('/api/accounts/authorize', ISSUER);
      url.search = new URLSearchParams({
        client_id: account?.clientId ?? DYNAMIC_CLIENT,
        ext_agent_host_id: hostId,
        redirect_uri: redirect,
        response_type: 'code',
        scope: SCOPES,
        resource: RESOURCE,
        state: pkce.state,
        nonce: pkce.nonce,
        code_challenge: pkce.challenge,
        code_challenge_method: 'S256',
      }).toString();
      if (!account) url.searchParams.set('agent_name_hint', 'Goyo');
      if (account?.tokens) url.searchParams.set('id_token_hint', account.tokens.idToken);
      if (account?.email) url.searchParams.set('login_hint', account.email);
      return url;
    },
  });
  const issuedId = params.get('client_id');
  const clientId = account?.clientId ?? issuedId;
  if (!clientId || clientId === DYNAMIC_CLIENT || (issuedId && issuedId !== clientId)) {
    throw new CoachError('ChatGPT did not return the expected app registration.');
  }
  const tokens = await exchange(
    {
      grant_type: 'authorization_code',
      client_id: clientId,
      code: params.get('code') ?? '',
      code_verifier: pkce.verifier,
      redirect_uri: callback,
    },
    signal,
  );
  const verified = await verifyIdentity(tokens.idToken, clientId, pkce.nonce, account);
  signal.throwIfAborted();
  return {
    providerID: 'chatgpt',
    id: account?.id ?? randomUUID(),
    clientId,
    ...verified,
    tokens,
  };
}

async function verifyIdentity(
  idToken: string,
  clientId: string,
  nonce: string,
  account?: ChatGptAccount,
) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ISSUER,
    audience: clientId,
    requiredClaims: ['exp', 'sub', 'nonce'],
  });
  if (
    !payload.sub ||
    payload.nonce !== nonce ||
    (account && payload.sub !== account.subject) ||
    (((Array.isArray(payload.aud) && payload.aud.length > 1) || payload.azp !== undefined) &&
      payload.azp !== clientId)
  )
    throw new CoachError('Could not verify the selected ChatGPT account.');
  const email =
    typeof payload.email === 'string' && payload.email_verified === true
      ? payload.email
      : undefined;
  return {
    subject: payload.sub,
    email,
    label: email ?? (typeof payload.name === 'string' ? payload.name : 'ChatGPT account'),
  };
}

export async function refreshChatGpt(account: ChatGptAccount, previous: ChatGptTokens) {
  return exchange(
    {
      grant_type: 'refresh_token',
      client_id: account.clientId,
      refresh_token: previous.refreshToken,
    },
    undefined,
    previous,
  );
}

async function exchange(
  fields: Record<string, string>,
  signal?: AbortSignal,
  previous?: ChatGptTokens,
): Promise<ChatGptTokens> {
  const timeout = AbortSignal.timeout(12_000);
  const response = await fetch(`${ISSUER}/api/accounts/oauth/token`, {
    method: 'POST',
    body: new URLSearchParams({ ...fields, resource: RESOURCE }),
    redirect: 'error',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!response.ok)
    throw new CoachError(
      'ChatGPT sign-in could not be renewed or completed. Reconnect in Settings.',
    );
  const body = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
  const scopes = body.scope?.split(/\s+/) ?? previous?.scopes ?? [];
  if (!['chatgpt.tokens.use.direct', 'resource.invoke'].every((scope) => scopes.includes(scope)))
    throw new CoachError('Allow Goyo to use your ChatGPT plan when reconnecting.');
  const idToken = previous?.idToken ?? body.id_token;
  if (
    body.token_type?.toLowerCase() !== 'bearer' ||
    !body.access_token ||
    !body.refresh_token ||
    !idToken ||
    typeof body.expires_in !== 'number' ||
    !Number.isFinite(body.expires_in) ||
    body.expires_in <= 0
  )
    throw new CoachError('ChatGPT returned an incomplete sign-in.');
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    idToken,
    scopes,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
}

export async function revokeChatGpt(account: ChatGptAccount) {
  if (!account.tokens) return true;
  const response = await fetch(`${ISSUER}/api/accounts/oauth/revoke`, {
    method: 'POST',
    body: new URLSearchParams({
      token: account.tokens.refreshToken,
      token_type_hint: 'refresh_token',
      client_id: account.clientId,
    }),
    redirect: 'error',
    signal: AbortSignal.timeout(8_000),
  });
  return response.ok;
}

export async function listChatGptModels(token: string) {
  const response = await fetch(`${RESOURCE}/models`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
    redirect: 'error',
  });
  if (!response.ok) throw chatGptRequestError(response.status);
  const { models } = (await response.json()) as {
    models?: Array<{ visibility?: string; slug?: string; display_name?: string }>;
  };
  if (!Array.isArray(models)) throw new CoachError('ChatGPT returned an invalid model list.');
  return models.flatMap(({ visibility, slug, display_name }) =>
    visibility === 'list' && typeof slug === 'string'
      ? [{ id: slug, name: display_name || slug }]
      : [],
  );
}

export async function generateChatGpt(token: string, model: string, prompt: string) {
  const client = new OpenAI({
    apiKey: token,
    baseURL: RESOURCE,
    maxRetries: 0,
    timeout: 90_000,
    fetch: (input, init) => fetch(input, { ...init, redirect: 'error' }),
  });
  let answer = '';
  try {
    const stream = await client.responses.create(
      {
        model,
        instructions: COACH_INSTRUCTIONS,
        input: [{ role: 'user', content: prompt }],
        store: false,
        stream: true,
      },
      { signal: AbortSignal.timeout(90_000) },
    );
    for await (const event of stream) {
      switch (event.type) {
        case 'response.output_text.delta':
        case 'response.refusal.delta':
          answer += event.delta;
          break;
        case 'response.completed':
          return answer;
        case 'response.failed':
          throw chatGptRequestError(undefined, event.response.error?.code);
        case 'error':
          throw chatGptRequestError(undefined, event.code);
        case 'response.incomplete':
          throw new CoachError('ChatGPT did not finish the reply.');
      }
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) throw chatGptRequestError(error.status, error.code);
    throw error;
  }
  throw new CoachError('The ChatGPT reply was interrupted.');
}

function chatGptRequestError(status?: number, code?: string | null) {
  if (status === 429 || code === 'subscription_sharing_usage_limit_exceeded') {
    return new CoachError('ChatGPT plan limit reached. Check Manage usage for your account.');
  }
  if (status === 401 || status === 403 || code === 'subscription_sharing_usage_unavailable') {
    return new CoachError(
      'ChatGPT plan usage is unavailable. Check your plan or reconnect in Settings.',
    );
  }
  return new CoachError('ChatGPT could not complete the request.');
}
