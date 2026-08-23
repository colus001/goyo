import { describe, expect, it } from 'vitest';
import { storageErrorResponse } from './http';

describe('storage error responses', () => {
  it('reports transient D1 overloads as retryable service failures', async () => {
    const response = storageErrorResponse(
      new Error('D1_ERROR: D1 DB is overloaded. Requests queued for too long.'),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('30');
    await expect(response.json()).resolves.toEqual({
      error: 'Service is temporarily busy. Please try again shortly.',
      ok: false,
    });
  });

  it('preserves conflict responses for non-transient storage failures', async () => {
    const response = storageErrorResponse(new Error('Foreign key constraint failed.'));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Foreign key constraint failed.',
      ok: false,
    });
  });
});
