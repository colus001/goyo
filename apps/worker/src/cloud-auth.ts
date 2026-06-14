export const LOGIN_CODE_ATTEMPT_LIMIT = 5;
export const LOGIN_CODE_LENGTH = 6;
export const LOGIN_CODE_RESEND_COOLDOWN_MS = 60 * 1000;
export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;

const SESSION_TOKEN_BYTE_LENGTH = 32;

export function normalizeAuthEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const email = value.trim().toLowerCase();

  if (!isValidAuthEmail(email)) {
    return null;
  }

  return email;
}

export function createLoginCode(): string {
  const randomValue = new Uint32Array(1);
  crypto.getRandomValues(randomValue);

  return String(randomValue[0] % 1_000_000).padStart(LOGIN_CODE_LENGTH, '0');
}

export function createSessionToken(): string {
  return `goyo_${encodeBase64Url(randomBytes(SESSION_TOKEN_BYTE_LENGTH))}`;
}

export async function hashAuthSecret(secret: string, value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${secret}\0${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);

  return encodeHex(new Uint8Array(digest));
}

export function getLoginCodeExpiresAt(createdAt: Date): string {
  return new Date(createdAt.getTime() + LOGIN_CODE_TTL_MS).toISOString();
}

export function isLoginCodeExpired(expiresAt: string, now: Date): boolean {
  return Date.parse(expiresAt) <= now.getTime();
}

export function hasLoginCodeAttemptsRemaining(attemptCount: number): boolean {
  return attemptCount < LOGIN_CODE_ATTEMPT_LIMIT;
}

function isValidAuthEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
