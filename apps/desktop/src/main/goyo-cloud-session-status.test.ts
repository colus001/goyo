import { describe, expect, it } from 'vitest';
import { resolveGoyoCloudSessionStatus } from './goyo-cloud-session-status';

const account = { email: 'writer@example.com', id: 'user_1' };

describe('Goyo Cloud session status', () => {
  it('reports signed-out when no hosted token exists', async () => {
    await expect(
      resolveGoyoCloudSessionStatus({
        account,
        checkSession: async () => ({ ok: true, user: account }),
        token: null,
      }),
    ).resolves.toEqual({ account: null, hasSession: false, status: 'signed-out' });
  });

  it('reports signed-in when the hosted token is valid', async () => {
    await expect(
      resolveGoyoCloudSessionStatus({
        account: null,
        checkSession: async () => ({ ok: true, user: account }),
        token: 'token',
      }),
    ).resolves.toEqual({ account, hasSession: true, status: 'signed-in' });
  });

  it('reports expired while preserving the cached account when auth rejects the token', async () => {
    await expect(
      resolveGoyoCloudSessionStatus({
        account,
        checkSession: async () => ({ error: 'Unauthorized.', ok: false, status: 'expired' }),
        token: 'token',
      }),
    ).resolves.toEqual({
      account,
      error: 'Unauthorized.',
      hasSession: true,
      status: 'expired',
    });
  });

  it('reports unable-to-connect when the auth check cannot reach Goyo Cloud', async () => {
    await expect(
      resolveGoyoCloudSessionStatus({
        account,
        checkSession: async () => {
          throw new Error('Network unavailable.');
        },
        token: 'token',
      }),
    ).resolves.toEqual({
      account,
      error: 'Network unavailable.',
      hasSession: true,
      status: 'unable-to-connect',
    });
  });
});
