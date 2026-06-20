let goyoCloudApiUrl = 'https://goyo-api.seokjun.kim';

export interface CloudAuthClientResult {
  ok: boolean;
  error?: string;
  token?: string;
  user?: { email: string; id: string };
}

export type CloudAuthMeResult =
  | { ok: true; user: { email: string; id: string } }
  | { error?: string; ok: false; status: 'expired' | 'unable-to-connect' };

export function configureGoyoCloudAuthClient(apiUrl: string): void {
  goyoCloudApiUrl = apiUrl;
}

export async function cloudAuthStart(email: string): Promise<CloudAuthClientResult> {
  const response = await fetch(`${goyoCloudApiUrl}/v1/auth/start`, {
    body: JSON.stringify({ email }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { error: body.error ?? 'Could not send login code.', ok: false };
  }

  return { ok: true };
}

export async function cloudAuthVerify(input: {
  clientId: string;
  code: string;
  email: string;
}): Promise<CloudAuthClientResult> {
  const response = await fetch(`${goyoCloudApiUrl}/v1/auth/verify`, {
    body: JSON.stringify({ ...input, sessionKind: 'desktop' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    token?: string;
    user?: { email: string; id: string };
  };

  if (!response.ok) {
    return { error: body.error ?? 'Verification failed.', ok: false };
  }

  return { ok: true, token: body.token, user: body.user };
}

export async function cloudAuthLogout(token: string): Promise<{ ok: boolean }> {
  await fetch(`${goyoCloudApiUrl}/v1/auth/logout`, {
    headers: { authorization: `Bearer ${token}` },
    method: 'POST',
  });

  return { ok: true };
}

export async function cloudAuthMe(token: string): Promise<CloudAuthMeResult> {
  const response = await fetch(`${goyoCloudApiUrl}/v1/auth/me`, {
    headers: { authorization: `Bearer ${token}` },
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    user?: { email: string; id: string };
  };

  if (response.status === 401 || response.status === 403) {
    return { error: body.error ?? 'Session expired.', ok: false, status: 'expired' };
  }

  if (!response.ok || !body.user) {
    return {
      error: body.error ?? 'Could not check Goyo Cloud session.',
      ok: false,
      status: 'unable-to-connect',
    };
  }

  return { ok: true, user: body.user };
}
