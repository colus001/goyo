import type { SyncAuthContext } from './auth';
import {
  decodeBase64,
  encodeBase64,
  getStorageErrorMessage,
  jsonError,
  readJsonBody,
} from './http';
import { requireRegisteredSyncClient } from './sync-clients';

export interface EnvWithDocumentsDatabase {
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

export async function createDocumentUpdate(
  request: Request,
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  documentId: string,
) {
  const body = await readJsonBody<CreateDocumentUpdateRequestBody>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const validation = validateCreateDocumentUpdateBody(body.value);

  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  try {
    const documentExists = await documentBelongsToOwner(env, auth, documentId);

    if (!documentExists) {
      return jsonError('Document metadata must exist before updates can be uploaded.', 409);
    }

    const clientIsRegistered = await requireRegisteredSyncClient(
      env,
      auth,
      validation.value.clientId,
    );

    if (!clientIsRegistered) {
      return jsonError('Sync client must be registered before uploading updates.', 409);
    }

    const update = decodeBase64(validation.value.updateBase64);
    const result = await env.DB.prepare(`
      INSERT OR IGNORE INTO document_updates (
        id, owner_id, document_id, client_id, update_blob, created_at, received_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `)
      .bind(
        validation.value.id,
        auth.ownerId,
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

export async function listDocumentUpdates(
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  documentId: string,
  afterUpdateId: string | null,
) {
  const statement = afterUpdateId
    ? env.DB.prepare(`
        WITH checkpoint AS (
          SELECT created_at, id
          FROM document_updates
          WHERE owner_id = ? AND document_id = ? AND id = ?
        )
        SELECT updates.id, updates.client_id, updates.update_blob, updates.created_at
        FROM document_updates updates
        LEFT JOIN checkpoint ON TRUE
        WHERE updates.owner_id = ? AND updates.document_id = ?
          AND (
            checkpoint.id IS NULL
            OR updates.created_at > checkpoint.created_at
            OR (updates.created_at = checkpoint.created_at AND updates.id > checkpoint.id)
          )
        ORDER BY updates.created_at ASC, updates.id ASC;
      `).bind(auth.ownerId, documentId, afterUpdateId, auth.ownerId, documentId)
    : env.DB.prepare(`
        SELECT id, client_id, update_blob, created_at
        FROM document_updates
        WHERE owner_id = ? AND document_id = ?
        ORDER BY created_at ASC, id ASC;
      `).bind(auth.ownerId, documentId);
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

export async function documentBelongsToOwner(
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  documentId: string,
) {
  const document = await env.DB.prepare(`
    SELECT id
    FROM documents
    WHERE id = ? AND owner_id = ?;
  `)
    .bind(documentId, auth.ownerId)
    .first<{ id: string }>();

  return !!document;
}

export function matchDocumentUpdatesRoute(pathname: string): { documentId: string } | null {
  const match = /^\/v1\/documents\/([^/]+)\/updates$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { documentId: decodeURIComponent(match[1]) };
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
