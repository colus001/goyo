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

export interface CloudDocument {
  archivedAt: string | null;
  bookId: string;
  chapterId: string | null;
  createdAt: string;
  id: string;
  kind: string;
  order: number;
  title: string;
  updatedAt: string;
}

export async function fetchDocuments(): Promise<{
  documents?: CloudDocument[];
  error?: string;
  ok: boolean;
}> {
  const response = await fetch(`${API_BASE}/v1/documents`, {
    credentials: 'include',
  });

  const body = (await response.json().catch(() => ({}))) as {
    documents?: CloudDocument[];
    error?: string;
    ok?: boolean;
  };

  if (!response.ok) {
    return { error: body.error ?? 'Could not load documents.', ok: false };
  }

  return { documents: body.documents ?? [], ok: true };
}

export async function fetchDocumentContent(documentId: string): Promise<{
  snapshotBase64?: string;
  error?: string;
  ok: boolean;
}> {
  const response = await fetch(
    `${API_BASE}/v1/documents/${encodeURIComponent(documentId)}/snapshots/latest`,
    { credentials: 'include' },
  );

  const body = (await response.json().catch(() => ({}))) as {
    documentId?: string;
    error?: string;
    ok?: boolean;
    snapshot?: { snapshotBase64: string } | null;
  };

  if (!response.ok) {
    return { error: body.error ?? 'Could not load document content.', ok: false };
  }

  return { ok: true, snapshotBase64: body.snapshot?.snapshotBase64 };
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
