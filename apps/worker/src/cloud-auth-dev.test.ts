import { describe, expect, it } from 'vitest';
import { handleCloudAuthRequest } from './cloud-auth-routes';
import { createAuthTestEnv, type MockEmailSender } from './cloud-auth-test-helpers';

describe('Goyo Cloud dev auth', () => {
  it('uses code 000000 in development without email binding or auth secret', () =>
    expectDevelopmentCodeWorksWithoutEmailOrSecret());

  it('does not send email when development code is active', () =>
    expectDevelopmentCodeSkipsEmail());

  it('allows development verification even when start did not create a login code row', () =>
    expectDevelopmentVerifyWithoutStartWorks());

  it('ignores dev login code when APP_ENV is production', () =>
    expectProductionIgnoresDevLoginCode());
});

async function expectDevelopmentCodeWorksWithoutEmailOrSecret() {
  const env = createAuthTestEnv({ appEnv: 'development', hasEmailSender: false });
  const startResponse = await handleCloudAuthRequest(
    jsonRequest('/v1/auth/start', { email: 'dev@example.com' }),
    env,
    new URL('http://localhost:8787/v1/auth/start'),
  );
  expect(startResponse?.status).toBe(200);

  const verifyResponse = await handleCloudAuthRequest(
    jsonRequest('/v1/auth/verify', {
      code: '000000',
      email: 'dev@example.com',
      sessionKind: 'desktop',
    }),
    env,
    new URL('http://localhost:8787/v1/auth/verify'),
  );

  expect(verifyResponse?.status).toBe(200);
  await expect(verifyResponse?.json()).resolves.toMatchObject({
    ok: true,
    token: expect.any(String),
    user: { email: 'dev@example.com', id: expect.any(String) },
  });
}

async function expectDevelopmentCodeSkipsEmail() {
  const env = createAuthTestEnv({ appEnv: 'development', authSecret: 'prod-like-secret' });
  const sender = env.EMAIL as unknown as MockEmailSender;
  const response = await handleCloudAuthRequest(
    jsonRequest('/v1/auth/start', { email: 'dev@example.com' }, 'https://api.example.com'),
    env,
    new URL('https://api.example.com/v1/auth/start'),
  );

  expect(response?.status).toBe(200);
  expect(sender.sent).toHaveLength(0);
}

async function expectDevelopmentVerifyWithoutStartWorks() {
  const env = createAuthTestEnv({ appEnv: 'development', hasEmailSender: false });
  const response = await handleCloudAuthRequest(
    jsonRequest('/v1/auth/verify', {
      code: '000000',
      email: 'dev@example.com',
      sessionKind: 'web',
    }),
    env,
    new URL('http://localhost:8787/v1/auth/verify'),
  );

  expect(response?.status).toBe(200);
  expect(response?.headers.get('set-cookie')).toContain('goyo_session=');
  await expect(response?.json()).resolves.toMatchObject({
    ok: true,
    token: null,
    user: { email: 'dev@example.com', id: expect.any(String) },
  });

  const cookie = response?.headers.get('set-cookie')?.split(';')[0] ?? '';
  const meResponse = await handleCloudAuthRequest(
    new Request('http://localhost:8787/v1/auth/me', { headers: { cookie } }),
    env,
    new URL('http://localhost:8787/v1/auth/me'),
  );
  expect(meResponse?.status).toBe(200);
}

async function expectProductionIgnoresDevLoginCode() {
  const env = createAuthTestEnv({
    appEnv: 'production',
    authDevLoginCode: '000000',
    authSecret: 'prod-like-secret',
  });
  const response = await handleCloudAuthRequest(
    jsonRequest('/v1/auth/verify', {
      code: '000000',
      email: 'dev@example.com',
      sessionKind: 'web',
    }),
    env,
    new URL('https://api.example.com/v1/auth/verify'),
  );

  expect(response?.status).toBe(401);
}

function jsonRequest(pathname: string, body: unknown, origin = 'http://localhost:8787') {
  return new Request(`${origin}${pathname}`, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
}
