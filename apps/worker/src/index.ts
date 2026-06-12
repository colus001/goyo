import { APP_NAME } from '@writer/shared';

interface Env {
  DB: D1Database;
}

interface CreateDocumentUpdateRequestBody {
  clientId?: unknown;
  createdAt?: unknown;
  id?: unknown;
  updateBase64?: unknown;
}

interface DocumentUpdateRow {
  id: string;
  client_id: string;
  update_blob: ArrayBuffer;
  created_at: string;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: `${APP_NAME} sync api` });
    }

    if (url.pathname === '/health/db') {
      const result = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();

      return Response.json({
        ok: result?.ok === 1,
        service: `${APP_NAME} sync api`,
        storage: 'd1',
      });
    }

    const updateRoute = matchDocumentUpdatesRoute(url.pathname);

    if (updateRoute && request.method === 'POST') {
      return createDocumentUpdate(request, env, updateRoute.documentId);
    }

    if (updateRoute && request.method === 'GET') {
      return listDocumentUpdates(
        env,
        updateRoute.documentId,
        url.searchParams.get('afterUpdateId'),
      );
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function createDocumentUpdate(request: Request, env: Env, documentId: string) {
  const body = await readJsonBody<CreateDocumentUpdateRequestBody>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const validation = validateCreateDocumentUpdateBody(body.value);

  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  try {
    const update = decodeBase64(validation.value.updateBase64);
    const result = await env.DB.prepare(`
      INSERT OR IGNORE INTO document_updates (
        id, document_id, client_id, update_blob, created_at, received_at
      )
      VALUES (?, ?, ?, ?, ?, ?);
    `)
      .bind(
        validation.value.id,
        documentId,
        validation.value.clientId,
        update,
        validation.value.createdAt,
        new Date().toISOString(),
      )
      .run();

    return Response.json(
      {
        documentId,
        duplicate: result.meta.changes === 0,
        id: validation.value.id,
        ok: true,
      },
      { status: result.meta.changes === 0 ? 200 : 201 },
    );
  } catch (error) {
    return jsonError(getStorageErrorMessage(error), 409);
  }
}

async function listDocumentUpdates(env: Env, documentId: string, afterUpdateId: string | null) {
  const statement = afterUpdateId
    ? env.DB.prepare(`
        WITH checkpoint AS (
          SELECT created_at, id
          FROM document_updates
          WHERE document_id = ? AND id = ?
        )
        SELECT updates.id, updates.client_id, updates.update_blob, updates.created_at
        FROM document_updates updates
        LEFT JOIN checkpoint ON TRUE
        WHERE updates.document_id = ?
          AND (
            checkpoint.id IS NULL
            OR updates.created_at > checkpoint.created_at
            OR (updates.created_at = checkpoint.created_at AND updates.id > checkpoint.id)
          )
        ORDER BY updates.created_at ASC, updates.id ASC;
      `).bind(documentId, afterUpdateId, documentId)
    : env.DB.prepare(`
        SELECT id, client_id, update_blob, created_at
        FROM document_updates
        WHERE document_id = ?
        ORDER BY created_at ASC, id ASC;
      `).bind(documentId);
  const { results } = await statement.all<DocumentUpdateRow>();

  return Response.json({
    documentId,
    updates: results.map((update) => ({
      clientId: update.client_id,
      createdAt: update.created_at,
      id: update.id,
      updateBase64: encodeBase64(update.update_blob),
    })),
  });
}

function matchDocumentUpdatesRoute(pathname: string): { documentId: string } | null {
  const match = /^\/v1\/documents\/([^/]+)\/updates$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { documentId: decodeURIComponent(match[1]) };
}

async function readJsonBody<T>(request: Request): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: (await request.json()) as T };
  } catch {
    return { ok: false };
  }
}

function validateCreateDocumentUpdateBody(
  body: CreateDocumentUpdateRequestBody,
):
  | { ok: true; value: { clientId: string; createdAt: string; id: string; updateBase64: string } }
  | { ok: false; message: string } {
  if (typeof body.id !== 'string' || body.id.length === 0) {
    return { ok: false, message: '`id` is required.' };
  }

  if (typeof body.clientId !== 'string' || body.clientId.length === 0) {
    return { ok: false, message: '`clientId` is required.' };
  }

  if (typeof body.createdAt !== 'string' || Number.isNaN(Date.parse(body.createdAt))) {
    return { ok: false, message: '`createdAt` must be an ISO timestamp.' };
  }

  if (typeof body.updateBase64 !== 'string' || body.updateBase64.length === 0) {
    return { ok: false, message: '`updateBase64` is required.' };
  }

  return {
    ok: true,
    value: {
      clientId: body.clientId,
      createdAt: body.createdAt,
      id: body.id,
      updateBase64: body.updateBase64,
    },
  };
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message, ok: false }, { status });
}

function getStorageErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Storage operation failed.';
}
