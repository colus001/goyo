import type { AuthErrorResponse, AuthUser } from '@writer/shared';
import { GOYO_CLOUD_API_URL } from '../config/mobile-cloud-api';

export type MobileAuthResult =
  | { ok: true; token: string; user: AuthUser }
  | { error: string; ok: false };

export type MobileAuthMeResult =
  | { ok: true; user: AuthUser }
  | { error: string; ok: false; status: 'expired' | 'unable-to-connect' };

export async function mobileAuthStart(email: string): Promise<{ error?: string; ok: boolean }> {
  const response = await fetch(`${GOYO_CLOUD_API_URL}/v1/auth/start`, {
    body: JSON.stringify({ email }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as Partial<AuthErrorResponse>;
    return { error: body.error ?? 'Could not send login code.', ok: false };
  }

  return { ok: true };
}

export async function mobileAuthVerify(input: {
  clientId: string;
  code: string;
  email: string;
}): Promise<MobileAuthResult> {
  const response = await fetch(`${GOYO_CLOUD_API_URL}/v1/auth/verify`, {
    body: JSON.stringify({ ...input, sessionKind: 'mobile' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    token?: string | null;
    user?: AuthUser;
  };

  if (!response.ok || !body.token || !body.user) {
    return { error: body.error ?? 'Verification failed.', ok: false };
  }

  return { ok: true, token: body.token, user: body.user };
}

export async function mobileAuthMe(token: string): Promise<MobileAuthMeResult> {
  const response = await fetch(`${GOYO_CLOUD_API_URL}/v1/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    user?: AuthUser;
  };

  if (response.status === 401 || response.status === 403) {
    return { error: body.error ?? 'Session expired.', ok: false, status: 'expired' };
  }

  if (!response.ok || !body.user) {
    return {
      error: body.error ?? 'Could not check session.',
      ok: false,
      status: 'unable-to-connect',
    };
  }

  return { ok: true, user: body.user };
}

export async function mobileAuthLogout(token: string): Promise<void> {
  await fetch(`${GOYO_CLOUD_API_URL}/v1/auth/logout`, {
    headers: { authorization: `Bearer ${token}` },
    method: 'POST',
  });
}
