import { describe, expect, it } from 'vitest';
import { handleCloudAuthRequest } from './cloud-auth-routes';
import { createAuthTestEnv, type MockEmailSender } from './cloud-auth-test-helpers';

const AUTH_SECRET = 'test-auth-secret';

describe('Goyo Cloud auth endpoints', () => {
  it('rejects start with an invalid email address', () => expectInvalidEmailRejected());

  it('sends a login code for a valid email and returns ok', () => expectValidEmailSendsCode());

  it('returns 503 when auth is not configured', () => expectAuthNotConfigured503());

  it('enforces resend cooldown when a recent code exists', () => expectResendCooldownEnforced());

  it('creates a new user and returns a desktop bearer token on valid verification', () =>
    expectDesktopVerificationCreatesUser());

  it('returns a null token and sets a cookie for web session verification', () =>
    expectWebVerificationSetsCookie());

  it('rejects verification with an invalid code', () => expectInvalidCodeRejected());

  it('rejects verification after code expires', () => expectExpiredCodeRejected());

  it('returns a user for a valid desktop session via /auth/me', () => expectMeReturnsUser());

  it('rejects /auth/me without a valid session', () => expectMeRejectsUnauthenticated());

  it('revokes a session on logout', () => expectLogoutRevokesSession());

  it('allows signup and sign-in with the same email across two verification rounds', () =>
    expectRepeatSignInWorks());

  it('normalizes the email case on start and verify', () => expectEmailNormalization());
});

async function expectInvalidEmailRejected() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const response = await handleCloudAuthRequest(
    jsonRequest({ email: 'not-an-email' }),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );
  expect(response?.status).toBe(400);
}

async function expectValidEmailSendsCode() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const response = await handleCloudAuthRequest(
    jsonRequest({ email: 'writer@example.com' }),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );
  expect(response?.status).toBe(200);
  await expect(response?.json()).resolves.toEqual({ ok: true });
  const sender = env.EMAIL as unknown as MockEmailSender;
  expect(sender.sent).toHaveLength(1);
  expect(sender.sent[0].email).toBe('writer@example.com');
  expect(sender.sent[0].code).toMatch(/^\d{6}$/);
}

async function expectAuthNotConfigured503() {
  const env = createAuthTestEnv({ authSecret: undefined, hasEmailSender: false });
  const response = await handleCloudAuthRequest(
    jsonRequest({ email: 'writer@example.com' }),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );
  expect(response?.status).toBe(503);
}

async function expectResendCooldownEnforced() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const sender = env.EMAIL as unknown as MockEmailSender;
  await handleCloudAuthRequest(
    jsonRequest({ email: 'writer@example.com' }),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );
  const secondResponse = await handleCloudAuthRequest(
    jsonRequest({ email: 'writer@example.com' }),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );
  expect(secondResponse?.status).toBe(200);
  await expect(secondResponse?.json()).resolves.toEqual({ ok: true });
  expect(sender.sent).toHaveLength(1);
}

async function expectDesktopVerificationCreatesUser() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const code = await startAndGetCode(env, 'writer@example.com');
  const response = await handleCloudAuthRequest(
    jsonRequest({ code, email: 'writer@example.com', sessionKind: 'desktop' }),
    env,
    new URL('https://api.example.com/v1/auth/verify'),
  );
  expect(response?.status).toBe(200);
  const body = (await response?.json()) as Record<string, unknown>;
  expect(body.ok).toBe(true);
  expect(body.token).toEqual(expect.any(String));
  expect(body.user).toEqual({ email: 'writer@example.com', id: expect.any(String) });
}

async function expectWebVerificationSetsCookie() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const code = await startAndGetCode(env, 'web@example.com');
  const response = await handleCloudAuthRequest(
    jsonRequest({ code, email: 'web@example.com', sessionKind: 'web' }),
    env,
    new URL('https://api.example.com/v1/auth/verify'),
  );
  expect(response?.status).toBe(200);
  const body = (await response?.json()) as Record<string, unknown>;
  expect(body.token).toBeNull();
  const setCookie = response?.headers.get('set-cookie');
  expect(setCookie).toContain('goyo_session=');
  expect(setCookie).toContain('HttpOnly');
}

async function expectInvalidCodeRejected() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  await startAndGetCode(env, 'writer@example.com');
  const response = await handleCloudAuthRequest(
    jsonRequest({ code: '111111', email: 'writer@example.com', sessionKind: 'desktop' }),
    env,
    new URL('https://api.example.com/v1/auth/verify'),
  );
  expect(response?.status).toBe(401);
}

async function expectExpiredCodeRejected() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const code = await startAndGetCode(env, 'writer@example.com');
  expireAllCodes(env);
  const response = await handleCloudAuthRequest(
    jsonRequest({ code, email: 'writer@example.com', sessionKind: 'desktop' }),
    env,
    new URL('https://api.example.com/v1/auth/verify'),
  );
  expect(response?.status).toBe(401);
}

async function expectMeReturnsUser() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const token = await signIn(env, 'writer@example.com');
  const meResponse = await handleCloudAuthRequest(
    new Request('https://api.example.com/v1/auth/me', {
      headers: { authorization: `Bearer ${token}` },
    }),
    env,
    new URL('https://api.example.com/v1/auth/me'),
  );
  expect(meResponse?.status).toBe(200);
  await expect(meResponse?.json()).resolves.toMatchObject({
    ok: true,
    user: { email: 'writer@example.com', id: expect.any(String) },
  });
}

async function expectMeRejectsUnauthenticated() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const response = await handleCloudAuthRequest(
    new Request('https://api.example.com/v1/auth/me'),
    env,
    new URL('https://api.example.com/v1/auth/me'),
  );
  expect(response?.status).toBe(401);
}

async function expectLogoutRevokesSession() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  const token = await signIn(env, 'writer@example.com');
  const logoutResponse = await handleCloudAuthRequest(
    new Request('https://api.example.com/v1/auth/logout', {
      headers: { authorization: `Bearer ${token}` },
      method: 'POST',
    }),
    env,
    new URL('https://api.example.com/v1/auth/logout'),
  );
  expect(logoutResponse?.status).toBe(200);
  await expect(logoutResponse?.json()).resolves.toEqual({ ok: true });
  const meResponse = await handleCloudAuthRequest(
    new Request('https://api.example.com/v1/auth/me', {
      headers: { authorization: `Bearer ${token}` },
    }),
    env,
    new URL('https://api.example.com/v1/auth/me'),
  );
  expect(meResponse?.status).toBe(401);
}

async function expectRepeatSignInWorks() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  await signIn(env, 'writer@example.com');
  expireAllCodes(env);
  const code = await startAndGetCode(env, 'writer@example.com');
  const response = await handleCloudAuthRequest(
    jsonRequest({ code, email: 'writer@example.com', sessionKind: 'desktop' }),
    env,
    new URL('https://api.example.com/v1/auth/verify'),
  );
  expect(response?.status).toBe(200);
  const body = (await response?.json()) as Record<string, unknown>;
  expect(body.user.id).toBeTypeOf('string');
}

async function expectEmailNormalization() {
  const env = createAuthTestEnv({ authSecret: AUTH_SECRET });
  await handleCloudAuthRequest(
    jsonRequest({ email: '  Writer@EXAMPLE.com  ' }),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );
  const sender = env.EMAIL as unknown as MockEmailSender;
  expect(sender.sent[0].email).toBe('writer@example.com');
  const code = sender.sent[0].code;
  const response = await handleCloudAuthRequest(
    jsonRequest({ code, email: 'Writer@Example.Com', sessionKind: 'desktop' }),
    env,
    new URL('https://api.example.com/v1/auth/verify'),
  );
  expect(response?.status).toBe(200);
  const body = (await response?.json()) as Record<string, unknown>;
  expect(body.user.email).toBe('writer@example.com');
}

async function startAndGetCode(env: ReturnType<typeof createAuthTestEnv>, email: string) {
  const sender = env.EMAIL as unknown as MockEmailSender;
  await handleCloudAuthRequest(
    jsonRequest({ email }),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );
  return sender.sent[sender.sent.length - 1].code;
}

async function signIn(env: ReturnType<typeof createAuthTestEnv>, email: string) {
  const code = await startAndGetCode(env, email);
  const response = await handleCloudAuthRequest(
    jsonRequest({ code, email, sessionKind: 'desktop' }),
    env,
    new URL('https://api.example.com/v1/auth/verify'),
  );
  const body = (await response?.json()) as Record<string, unknown>;
  return body.token as string;
}

function expireAllCodes(env: ReturnType<typeof createAuthTestEnv>) {
  const loginCodes = (env.DB as unknown as { loginCodes: Map<string, { expires_at: string }> })
    .loginCodes;
  for (const entry of loginCodes.values()) {
    entry.expires_at = new Date(0).toISOString();
  }
}

function jsonRequest(body: unknown) {
  return new Request('https://api.example.com', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
}
