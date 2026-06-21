const API_BASE = '/api/v1';

export async function authStart(email: string): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/auth/start`, {
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
  sessionKind?: string;
}): Promise<{ ok: boolean; error?: string; token?: string; user?: { id: string; email: string } }> {
  const response = await fetch(`${API_BASE}/auth/verify`, {
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
  const response = await fetch(`${API_BASE}/auth/me`);

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
  await fetch(`${API_BASE}/auth/logout`, { method: 'POST' });
  return { ok: true };
}

export async function createDesktopHandoffSession(input: {
  clientId?: string;
}): Promise<{ ok: boolean; error?: string; token?: string; user?: { id: string; email: string } }> {
  const response = await fetch(`${API_BASE}/auth/desktop-handoff`, {
    body: JSON.stringify({ clientId: input.clientId }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    token?: string;
    user?: { id: string; email: string };
  };

  if (!response.ok) {
    return { error: body.error ?? 'Could not connect Goyo Desktop.', ok: false };
  }

  return { ok: true, token: body.token, user: body.user };
}

export async function fetchDocuments(): Promise<{
  documents?: import('./types').CloudDocument[];
  error?: string;
  ok: boolean;
}> {
  const response = await fetch(`${API_BASE}/documents`);

  const body = (await response.json().catch(() => ({}))) as {
    documents?: import('./types').CloudDocument[];
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
  snapshotId?: string;
  snapshotLastUpdateId?: string | null;
  error?: string;
  ok: boolean;
}> {
  const response = await fetch(
    `${API_BASE}/documents/${encodeURIComponent(documentId)}/snapshots/latest`,
  );

  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    snapshot?: { id: string; lastUpdateId: string | null; snapshotBase64: string } | null;
  };

  if (!response.ok) {
    return { error: body.error ?? 'Could not load document content.', ok: false };
  }

  return {
    ok: true,
    snapshotBase64: body.snapshot?.snapshotBase64,
    snapshotId: body.snapshot?.id,
    snapshotLastUpdateId: body.snapshot?.lastUpdateId,
  };
}

export async function registerSyncClient(
  clientId: string,
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/sync/clients/${encodeURIComponent(clientId)}`, {
    body: JSON.stringify({
      lastSeenAt: new Date().toISOString(),
      name: 'Goyo Cloud Web',
      platform: 'web',
    }),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { error: body.error ?? 'Could not register web sync client.', ok: false };
  }

  return { ok: true };
}

export async function fetchDocumentUpdates(
  documentId: string,
  afterUpdateId: string | null,
): Promise<{
  error?: string;
  ok: boolean;
  updates?: Array<{ clientId: string; createdAt: string; id: string; updateBase64: string }>;
}> {
  const query = afterUpdateId ? `?afterUpdateId=${encodeURIComponent(afterUpdateId)}` : '';
  const response = await fetch(
    `${API_BASE}/documents/${encodeURIComponent(documentId)}/updates${query}`,
  );
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    updates?: Array<{ clientId: string; createdAt: string; id: string; updateBase64: string }>;
  };

  if (!response.ok) {
    return { error: body.error ?? 'Could not load document updates.', ok: false };
  }

  return { ok: true, updates: body.updates ?? [] };
}

export async function uploadDocumentUpdate({
  clientId,
  documentId,
  update,
  updateId,
}: {
  clientId: string;
  documentId: string;
  update: Uint8Array;
  updateId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/documents/${encodeURIComponent(documentId)}/updates`, {
    body: JSON.stringify({
      clientId,
      createdAt: new Date().toISOString(),
      id: updateId,
      updateBase64: uint8ArrayToBase64(update),
    }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { error: body.error ?? 'Could not save document update.', ok: false };
  }

  return { ok: true };
}

export async function uploadDocumentSnapshot({
  documentId,
  lastUpdateId,
  snapshot,
}: {
  documentId: string;
  lastUpdateId: string | null;
  snapshot: Uint8Array;
}): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(
    `${API_BASE}/documents/${encodeURIComponent(documentId)}/snapshots`,
    {
      body: JSON.stringify({
        createdAt: new Date().toISOString(),
        id: `snapshot_web_${crypto.randomUUID()}`,
        lastUpdateId,
        snapshotBase64: uint8ArrayToBase64(snapshot),
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { error: body.error ?? 'Could not save document snapshot.', ok: false };
  }

  return { ok: true };
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
