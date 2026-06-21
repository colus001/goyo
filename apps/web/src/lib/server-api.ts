import { cookies } from 'next/headers';
import type { CloudDocument, CloudUser } from './types';

const AUTH_COOKIE_NAME = 'goyo_session';

const SERVER_API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8787/v1'
    : 'https://goyo-api.seokjun.kim/v1';

interface ApiResult<T> {
  error?: string;
  ok: boolean;
  value?: T;
}

export interface CloudDocumentContent {
  snapshotBase64?: string;
  snapshotId?: string;
  snapshotLastUpdateId?: string | null;
}

export interface CloudDocumentUpdate {
  clientId: string;
  createdAt: string;
  id: string;
  updateBase64: string;
}

export async function serverAuthMe(): Promise<ApiResult<{ user: CloudUser }>> {
  return serverFetchJson<{ user?: CloudUser }, { user: CloudUser }>('/auth/me', (body) => {
    if (!body.user) throw new Error('Not signed in.');
    return { user: body.user };
  });
}

export async function serverFetchDocuments(): Promise<ApiResult<{ documents: CloudDocument[] }>> {
  return serverFetchJson<{ documents?: CloudDocument[] }, { documents: CloudDocument[] }>(
    '/documents',
    (body) => ({
      documents: body.documents ?? [],
    }),
  );
}

export async function serverFetchDocumentMetadata(
  documentId: string,
): Promise<ApiResult<{ document: CloudDocument }>> {
  return serverFetchJson<{ document?: CloudDocument }, { document: CloudDocument }>(
    `/documents/${encodeURIComponent(documentId)}`,
    (body) => {
      if (!body.document) throw new Error('Document not found.');
      return { document: body.document };
    },
  );
}

export async function serverFetchDocumentContent(
  documentId: string,
): Promise<ApiResult<CloudDocumentContent>> {
  return serverFetchJson<
    { snapshot?: { id: string; lastUpdateId: string | null; snapshotBase64: string } | null },
    CloudDocumentContent
  >(`/documents/${encodeURIComponent(documentId)}/snapshots/latest`, (body) => ({
    snapshotBase64: body.snapshot?.snapshotBase64,
    snapshotId: body.snapshot?.id,
    snapshotLastUpdateId: body.snapshot?.lastUpdateId,
  }));
}

export async function serverFetchDocumentUpdates(
  documentId: string,
  afterUpdateId: string | null,
): Promise<ApiResult<{ updates: CloudDocumentUpdate[] }>> {
  const query = afterUpdateId ? `?afterUpdateId=${encodeURIComponent(afterUpdateId)}` : '';
  return serverFetchJson<{ updates?: CloudDocumentUpdate[] }, { updates: CloudDocumentUpdate[] }>(
    `/documents/${encodeURIComponent(documentId)}/updates${query}`,
    (body) => ({ updates: body.updates ?? [] }),
  );
}

async function serverFetchJson<Body, Value = Body>(
  path: string,
  mapBody: (body: Body) => Value,
): Promise<ApiResult<Value>> {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const response = await fetch(`${SERVER_API_BASE}${path}`, {
    cache: 'no-store',
    headers: session ? { cookie: `${AUTH_COOKIE_NAME}=${session}` } : undefined,
  });

  const body = (await response.json().catch(() => ({}))) as Body & { error?: string };

  if (!response.ok) {
    return { error: body.error ?? 'Request failed.', ok: false };
  }

  try {
    return { ok: true, value: mapBody(body) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Request failed.', ok: false };
  }
}
