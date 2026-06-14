import { describe, expect, it } from 'vitest';
import { authorizeSyncRequest } from './auth';
import { hashAuthSecret } from './cloud-auth';
import { handleCloudAuthRequest } from './cloud-auth-routes';
import { createAuthTestEnv } from './cloud-auth-test-helpers';

function jsonRequest(body: unknown) {
  return new Request('https://api.example.com', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
}

async function getHostedToken(env: ReturnType<typeof createAuthTestEnv>, email: string) {
  await handleCloudAuthRequest(
    jsonRequest({ email }),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );
  const token = `goyo_test_${crypto.randomUUID()}`;
  const tokenHash = await hashAuthSecret(env.GOYO_AUTH_SECRET ?? 'test-secret', token);
  const userId = `user_${crypto.randomUUID()}`;
  const db = env.DB as unknown as {
    users: Map<string, unknown>;
    authSessions: Map<string, unknown>;
  };
  db.users.set(userId, { email, id: userId });
  db.authSessions.set(tokenHash, { token_hash: tokenHash, user_id: userId });
  return token;
}

describe('sync request auth', () => {
  it('rejects protected sync requests when auth is not configured', () =>
    expectAuthNotConfigured());

  it('rejects missing or invalid bearer tokens', () => expectMissingTokenRejected());

  it('accepts the configured self-host bearer token', () => expectSelfHostTokenAccepted());

  it('rejects hosted session when no token is provided', () => expectHostedMissingTokenRejected());

  it('accepts a hosted session bearer token and returns user ownerId', () =>
    expectHostedTokenAccepted());

  it('self-host token takes priority over hosted session lookup', () =>
    expectSelfHostPriorityOverHosted());
});

async function expectAuthNotConfigured() {
  const result = await authorizeSyncRequest(
    new Request('https://sync.example.com/v1/sync/status'),
    {},
  );
  expect(result.ok).toBe(false);
  expect(result.ok ? null : result.response.status).toBe(401);
}

async function expectMissingTokenRejected() {
  const env = { GOYO_SYNC_TOKEN: 'secret-token' };
  expect(
    (await authorizeSyncRequest(new Request('https://sync.example.com/v1/sync/status'), env)).ok,
  ).toBe(false);
  expect(
    (
      await authorizeSyncRequest(
        new Request('https://sync.example.com/v1/sync/status', {
          headers: { authorization: 'Bearer wrong-token' },
        }),
        env,
      )
    ).ok,
  ).toBe(false);
}

async function expectSelfHostTokenAccepted() {
  expect(
    await authorizeSyncRequest(
      new Request('https://sync.example.com/v1/sync/status', {
        headers: { authorization: 'Bearer secret-token' },
      }),
      { GOYO_SYNC_TOKEN: 'secret-token' },
    ),
  ).toEqual({ context: { authMode: 'self-host-token', ownerId: 'self' }, ok: true });
}

async function expectHostedMissingTokenRejected() {
  const env = createAuthTestEnv({ authSecret: 'hosted-secret' });
  const result = await authorizeSyncRequest(
    new Request('https://sync.example.com/v1/sync/status'),
    env,
  );
  expect(result.ok).toBe(false);
  expect(result.ok ? null : result.response.status).toBe(401);
}

async function expectHostedTokenAccepted() {
  const env = createAuthTestEnv({ authSecret: 'hosted-secret' });
  const token = await getHostedToken(env, 'writer@example.com');
  const result = await authorizeSyncRequest(
    new Request('https://sync.example.com/v1/sync/status', {
      headers: { authorization: `Bearer ${token}` },
    }),
    env,
  );
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.context.authMode).toBe('goyo-cloud-session');
    expect(result.context.ownerId).toMatch(/^user_/);
    expect(result.context.userId).toBe(result.context.ownerId);
  }
}

async function expectSelfHostPriorityOverHosted() {
  const env = createAuthTestEnv({ authSecret: 'hosted-secret' });
  env.GOYO_SYNC_TOKEN = 'self-host-secret';
  const result = await authorizeSyncRequest(
    new Request('https://sync.example.com/v1/sync/status', {
      headers: { authorization: 'Bearer self-host-secret' },
    }),
    env,
  );
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.context.authMode).toBe('self-host-token');
    expect(result.context.ownerId).toBe('self');
  }
}
