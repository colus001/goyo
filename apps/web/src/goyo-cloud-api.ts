const API_BASE = 'https://goyo-api.seokjun.kim';

export async function authStart(email: string): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/v1/auth/start`, {
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

export async function authVerify(input: {
  clientId?: string;
  code: string;
  email: string;
  sessionKind?: 'desktop' | 'web';
}): Promise<{ ok: boolean; error?: string; token?: string; user?: { id: string; email: string } }> {
  const response = await fetch(`${API_BASE}/v1/auth/verify`, {
    body: JSON.stringify({ ...input, sessionKind: input.sessionKind ?? 'web' }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    token?: string;
    user?: { id: string; email: string };
  };

  if (!response.ok) {
    return { error: body.error ?? 'Verification failed.', ok: false };
  }

  return { ok: true, token: body.token, user: body.user };
}

export async function authMe(): Promise<{
  ok: boolean;
  error?: string;
  user?: { id: string; email: string };
}> {
  const response = await fetch(`${API_BASE}/v1/auth/me`, {
    credentials: 'include',
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    user?: { id: string; email: string };
  };

  if (!response.ok) {
    return { error: body.error ?? 'Not signed in.', ok: false };
  }

  return { ok: true, user: body.user };
}

export async function authLogout(): Promise<{ ok: boolean }> {
  await fetch(`${API_BASE}/v1/auth/logout`, {
    credentials: 'include',
    method: 'POST',
  });

  return { ok: true };
}
