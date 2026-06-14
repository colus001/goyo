import { describe, expect, it } from 'vitest';
import { authorizeSyncRequest } from './auth';

describe('sync request auth', () => {
  it('rejects protected sync requests when auth is not configured', () => {
    const result = authorizeSyncRequest(new Request('https://sync.example.com/v1/sync/status'), {});

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.response.status).toBe(503);
  });

  it('rejects missing or invalid bearer tokens', () => {
    const env = { GOYO_SYNC_TOKEN: 'secret-token' };

    expect(
      authorizeSyncRequest(new Request('https://sync.example.com/v1/sync/status'), env).ok,
    ).toBe(false);
    expect(
      authorizeSyncRequest(
        new Request('https://sync.example.com/v1/sync/status', {
          headers: { authorization: 'Bearer wrong-token' },
        }),
        env,
      ).ok,
    ).toBe(false);
  });

  it('accepts the configured bearer token', () => {
    expect(
      authorizeSyncRequest(
        new Request('https://sync.example.com/v1/sync/status', {
          headers: { authorization: 'Bearer secret-token' },
        }),
        { GOYO_SYNC_TOKEN: 'secret-token' },
      ),
    ).toEqual({ context: { authMode: 'self-host-token', ownerId: 'self' }, ok: true });
  });
});
