import { describe, expect, it } from 'vitest';
import {
  createLoginCode,
  createSessionToken,
  getLoginCodeExpiresAt,
  hashAuthSecret,
  hasLoginCodeAttemptsRemaining,
  isLoginCodeExpired,
  LOGIN_CODE_ATTEMPT_LIMIT,
  LOGIN_CODE_LENGTH,
  LOGIN_CODE_RESEND_COOLDOWN_MS,
  LOGIN_CODE_TTL_MS,
  normalizeAuthEmail,
} from './cloud-auth';

describe('Goyo Cloud auth helpers', () => {
  it('normalizes valid email addresses', () => {
    expect(normalizeAuthEmail(' Writer@Example.COM ')).toBe('writer@example.com');
  });

  it('rejects invalid email addresses', () => {
    expect(normalizeAuthEmail('not-an-email')).toBeNull();
    expect(normalizeAuthEmail('writer@example')).toBeNull();
    expect(normalizeAuthEmail(null)).toBeNull();
  });

  it('creates six-digit login codes', () => {
    expect(createLoginCode()).toMatch(/^\d{6}$/);
    expect(createLoginCode()).toHaveLength(LOGIN_CODE_LENGTH);
  });

  it('creates opaque desktop session tokens', () => {
    expect(createSessionToken()).toMatch(/^goyo_[A-Za-z0-9_-]{43}$/);
  });

  it('hashes auth secrets without returning raw values', async () => {
    const firstHash = await hashAuthSecret('server-secret', '123456');
    const secondHash = await hashAuthSecret('server-secret', '123456');
    const differentHash = await hashAuthSecret('other-secret', '123456');

    expect(firstHash).toBe(secondHash);
    expect(firstHash).not.toBe(differentHash);
    expect(firstHash).not.toContain('123456');
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('computes login code expiry from creation time', () => {
    const createdAt = new Date('2026-06-14T17:20:00.000Z');
    const expiresAt = getLoginCodeExpiresAt(createdAt);

    expect(expiresAt).toBe(new Date(createdAt.getTime() + LOGIN_CODE_TTL_MS).toISOString());
    expect(isLoginCodeExpired(expiresAt, new Date('2026-06-14T17:29:59.999Z'))).toBe(false);
    expect(isLoginCodeExpired(expiresAt, new Date('2026-06-14T17:30:00.000Z'))).toBe(true);
  });

  it('limits login code attempts', () => {
    expect(hasLoginCodeAttemptsRemaining(LOGIN_CODE_ATTEMPT_LIMIT - 1)).toBe(true);
    expect(hasLoginCodeAttemptsRemaining(LOGIN_CODE_ATTEMPT_LIMIT)).toBe(false);
  });

  it('defines a resend cooldown policy', () => {
    expect(LOGIN_CODE_RESEND_COOLDOWN_MS).toBe(60_000);
  });
});
