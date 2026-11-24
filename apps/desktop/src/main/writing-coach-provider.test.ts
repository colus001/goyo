import { createHash } from 'node:crypto';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterEach, expect, it, vi } from 'vitest';
import type { CoachAccountRecord } from './writing-coach-credentials';
import { WritingCoachProviders } from './writing-coach-provider';

const nativeFetch = globalThis.fetch;
const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
const clientId = 'oaiapp_goyo_test';
const grantedScopes =
  'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct';

function memoryStore() {
  const records = new Map<string, CoachAccountRecord>();
  return {
    list: () => [...records.values()],
    save: (account: CoachAccountRecord) => void records.set(account.id, account),
    remove: (id: string) => void records.delete(id),
    requireEncryption: () => undefined,
    hostId: () => 'urn:uuid:068dba8c-6d8e-42e0-b4e5-3b261d619856',
  };
}

afterEach(() => vi.unstubAllGlobals());

async function mockChatGptProvider() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  let authorization: URLSearchParams;
  let revoked = false;
  vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.url === `${issuer}/.well-known/jwks.json`) {
      return Response.json({ keys: [{ ...jwk, kid: 'test', alg: 'RS256', use: 'sig' }] });
    }
    if (request.url === `${issuer}/api/accounts/oauth/token`) {
      return mockTokenExchange(request, authorization, privateKey);
    }
    if (request.url === `${issuer}/api/accounts/oauth/revoke`) {
      expect(new URLSearchParams(await request.text()).get('token')).toBe('refresh');
      revoked = true;
      return new Response();
    }
    expect(request.headers.get('authorization')).toBe('Bearer access');
    if (request.url === `${resource}/models`) {
      return Response.json({
        models: [
          { visibility: 'list', slug: 'current-model', display_name: 'Current model' },
          { visibility: 'hidden', slug: 'hidden-model' },
        ],
      });
    }
    expect(request.url).toBe(`${resource}/responses`);
    expect(request.redirect).toBe('error');
    expect(await request.json()).toMatchObject({
      model: 'current-model',
      input: [{ role: 'user', content: 'Sample manuscript' }],
      stream: true,
      store: false,
    });
    return new Response(
      'data: {"type":"response.output_text.delta","delta":"Read the ending again."}\n\n' +
        'data: {"type":"response.completed"}\n\n',
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  });
  return {
    providers: new WritingCoachProviders(memoryStore(), async (target) => {
      const url = new URL(target);
      expect(url.origin).toBe(issuer);
      authorization = url.searchParams;
      await mockChatGptBrowser(authorization);
    }),
    wasRevoked: () => revoked,
  };
}

it('signs in directly to ChatGPT, binds PKCE and identity, then uses the account catalog and plan', async () => {
  const { providers, wasRevoked } = await mockChatGptProvider();
  const account = await providers.connect('chatgpt');
  expect(account).toEqual({
    id: expect.any(String),
    label: 'writer@example.com',
    providerID: 'chatgpt',
    signedIn: true,
  });
  const [model] = await providers.listModels(account.id);
  expect(model).toEqual({
    id: 'current-model',
    name: 'Current model',
    providerID: 'chatgpt',
    accountId: account.id,
  });
  if (!model) throw new Error('Model missing');
  await expect(providers.generate({ ...model, id: 'hidden-model' }, 'Private')).rejects.toThrow(
    'Choose an available model',
  );
  await expect(providers.generate(model, 'Sample manuscript')).resolves.toBe(
    'Read the ending again.',
  );
  await expect(
    providers.generate({ ...model, providerID: 'openrouter' }, 'Private'),
  ).rejects.toThrow('selected account');
  await expect(providers.disconnect(account.id)).resolves.toEqual({ revocationConfirmed: true });
  expect(wasRevoked()).toBe(true);
  await expect(providers.generate(model, 'Private')).rejects.toThrow('Connect this AI account');
  await expect(providers.connect('chatgpt', account.id)).resolves.toEqual(account);
});

async function mockTokenExchange(
  request: Request,
  authorization: URLSearchParams,
  privateKey: Parameters<SignJWT['sign']>[0],
) {
  const form = new URLSearchParams(await request.text());
  expect(form.get('client_id')).toBe(clientId);
  expect(form.get('redirect_uri')).toBe(authorization.get('redirect_uri'));
  expect(form.get('resource')).toBe(resource);
  expect(
    createHash('sha256')
      .update(form.get('code_verifier') ?? '')
      .digest('base64url'),
  ).toBe(authorization.get('code_challenge'));
  const idToken = await new SignJWT({
    nonce: authorization.get('nonce'),
    email: 'writer@example.com',
    email_verified: true,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setIssuer(issuer)
    .setAudience(clientId)
    .setSubject('account-1')
    .setExpirationTime('1h')
    .sign(privateKey);
  return Response.json({
    access_token: 'access',
    refresh_token: 'refresh',
    id_token: idToken,
    expires_in: 3_600,
    token_type: 'Bearer',
    scope: grantedScopes,
  });
}

async function mockChatGptBrowser(authorization: URLSearchParams) {
  const callback = new URL(authorization.get('redirect_uri') ?? '');
  expect(callback.hostname).toBe('127.0.0.1');
  callback.searchParams.set('code', 'test-code');
  callback.searchParams.set('state', 'invalid');
  expect((await nativeFetch(callback)).status).toBe(400);
  callback.searchParams.set('state', authorization.get('state') ?? '');
  if (authorization.get('client_id') === 'dynamic_agent_client') {
    expect(authorization.get('agent_name_hint')).toBe('Goyo');
    callback.searchParams.set('client_id', clientId);
  } else {
    expect(authorization.get('client_id')).toBe(clientId);
    expect(authorization.has('agent_name_hint')).toBe(false);
  }
  expect((await nativeFetch(callback)).status).toBe(200);
}

it('exchanges OpenRouter’s authorization code and uses only the selected account’s text models', async () => {
  const providers = new WritingCoachProviders(memoryStore(), async (target) => {
    const url = new URL(target);
    expect(url.origin).toBe('https://openrouter.ai');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    const callback = new URL(url.searchParams.get('callback_url') ?? '');
    callback.searchParams.set('code', 'router-code');
    callback.searchParams.set('state', url.searchParams.get('state') ?? '');
    expect((await nativeFetch(callback)).status).toBe(200);
  });
  vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.url.endsWith('/auth/keys')) {
      expect(await request.json()).toMatchObject({
        code: 'router-code',
        code_challenge_method: 'S256',
      });
      return Response.json({ key: 'router-token' });
    }
    expect(request.headers.get('authorization')).toBe('Bearer router-token');
    if (request.url.endsWith('/models/user')) {
      return Response.json({
        data: [
          {
            id: 'vendor/text',
            architecture: { input_modalities: ['text'], output_modalities: ['text'] },
          },
          {
            id: 'vendor/image',
            architecture: { input_modalities: ['text'], output_modalities: ['image'] },
          },
        ],
      });
    }
    expect(request.url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(await request.json()).toMatchObject({ model: 'vendor/text' });
    return Response.json({
      choices: [{ finish_reason: 'stop', message: { content: 'Feedback' } }],
    });
  });
  const account = await providers.connect('openrouter');
  const model = {
    id: 'vendor/text',
    name: 'vendor/text',
    providerID: 'openrouter',
    accountId: account.id,
  } as const;
  await expect(providers.listModels(account.id)).resolves.toEqual([model]);
  await expect(providers.generate(model, 'Sample')).resolves.toBe('Feedback');
  await expect(providers.disconnect(account.id)).resolves.toEqual({ revocationConfirmed: false });
});

it('renews a rotating ChatGPT session only once for concurrent model requests', async () => {
  const store = memoryStore();
  store.save({
    id: 'saved-account',
    label: 'Saved account',
    providerID: 'chatgpt',
    clientId,
    subject: 'account-1',
    tokens: {
      accessToken: 'expired',
      refreshToken: 'old-refresh',
      idToken: 'previously-verified',
      expiresAt: 0,
      scopes: grantedScopes.split(' '),
    },
  });
  let refreshes = 0;
  vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.url === `${issuer}/api/accounts/oauth/token`) {
      refreshes++;
      const form = new URLSearchParams(await request.text());
      expect(form.get('grant_type')).toBe('refresh_token');
      expect(form.get('client_id')).toBe(clientId);
      expect(form.get('refresh_token')).toBe('old-refresh');
      return Response.json({
        access_token: 'renewed',
        refresh_token: 'rotated',
        expires_in: 3600,
        token_type: 'Bearer',
      });
    }
    expect(request.headers.get('authorization')).toBe('Bearer renewed');
    return Response.json({ models: [] });
  });
  const providers = new WritingCoachProviders(store, async () => undefined);
  await Promise.all([providers.listModels('saved-account'), providers.listModels('saved-account')]);
  expect(refreshes).toBe(1);
  expect(store.list()[0]).toMatchObject({
    tokens: { refreshToken: 'rotated', accessToken: 'renewed' },
  });
});

it('validates Go entitlement and uses the live text catalog with a stable conversation header', async () => {
  const requests: Request[] = [];
  vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request);
    expect(request.headers.get('authorization')).toBe('Bearer test-go-key');
    expect(request.headers.get('user-agent')).toBe('Goyo');
    if (request.url.endsWith('/v1/usage')) return Response.json({ usage: {} });
    if (request.url.endsWith('/v1/models'))
      return Response.json({
        data: [
          { id: 'dynamic-model', type: 'chat', modalities: { input: ['text'], output: ['text'] } },
          { id: 'image-only', type: 'image', modalities: { input: ['text'], output: ['image'] } },
        ],
      });
    expect(request.url).toBe('https://opencode.ai/inference/go/openai/v1/chat/completions');
    expect(request.headers.get('x-opencode-session')).toBe('conversation-1');
    expect(await request.json()).toMatchObject({ model: 'dynamic-model', stream: false });
    return Response.json({
      choices: [{ finish_reason: 'stop', message: { content: 'Feedback' } }],
    });
  });
  const providers = new WritingCoachProviders(memoryStore(), async () => undefined);
  const account = await providers.connectKey({ providerID: 'opencode-go', token: 'test-go-key' });
  expect(account).not.toHaveProperty('token');
  const models = await providers.listModels(account.id);
  expect(models.map(({ id }) => id)).toEqual(['dynamic-model']);
  const model = models[0];
  if (!model) throw new Error('Model missing');
  await expect(providers.generate(model, 'Sample', 'conversation-1')).resolves.toBe('Feedback');
  await expect(providers.generate(model, 'Follow-up', 'conversation-1')).resolves.toBe('Feedback');
  expect(requests).toHaveLength(4);
});
