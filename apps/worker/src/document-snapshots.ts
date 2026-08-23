import type { SyncAuthContext } from './auth';
import type { EnvWithDocumentsDatabase } from './document-updates';
import { documentBelongsToOwner } from './document-updates';
import { decodeBase64, encodeBase64, jsonError, readJsonBody, storageErrorResponse } from './http';

interface CreateDocumentSnapshotRequestBody {
  createdAt?: unknown;
  id?: unknown;
  lastUpdateId?: unknown;
  snapshotBase64?: unknown;
}

interface DocumentSnapshotRow {
  id: string;
  last_update_id: string | null;
  snapshot_blob: ArrayBuffer;
  created_at: string;
}

export async function createDocumentSnapshot(
  request: Request,
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  documentId: string,
) {
  const body = await readJsonBody<CreateDocumentSnapshotRequestBody>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const validation = validateCreateDocumentSnapshotBody(body.value);

  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  try {
    const documentExists = await documentBelongsToOwner(env, auth, documentId);

    if (!documentExists) {
      return jsonError('Document metadata must exist before snapshots can be uploaded.', 409);
    }

    const snapshot = decodeBase64(validation.value.snapshotBase64);
    const result = await env.DB.prepare(`
      INSERT OR IGNORE INTO document_snapshots (
        id, owner_id, document_id, last_update_id, snapshot_blob, created_at, received_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `)
      .bind(
        validation.value.id,
        auth.ownerId,
        documentId,
        validation.value.lastUpdateId,
        snapshot,
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
    return storageErrorResponse(error);
  }
}

export async function getLatestDocumentSnapshot(
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  documentId: string,
) {
  const snapshot = await env.DB.prepare(`
    SELECT id, last_update_id, snapshot_blob, created_at
    FROM document_snapshots
    WHERE owner_id = ? AND document_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  `)
    .bind(auth.ownerId, documentId)
    .first<DocumentSnapshotRow>();

  return Response.json({
    documentId,
    snapshot: snapshot
      ? {
          createdAt: snapshot.created_at,
          id: snapshot.id,
          lastUpdateId: snapshot.last_update_id,
          snapshotBase64: encodeBase64(snapshot.snapshot_blob),
        }
      : null,
  });
}

export function matchDocumentSnapshotsRoute(pathname: string): { documentId: string } | null {
  const match = /^\/v1\/documents\/([^/]+)\/snapshots$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { documentId: decodeURIComponent(match[1]) };
}

export function matchLatestDocumentSnapshotRoute(pathname: string): { documentId: string } | null {
  const match = /^\/v1\/documents\/([^/]+)\/snapshots\/latest$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { documentId: decodeURIComponent(match[1]) };
}

function validateCreateDocumentSnapshotBody(body: CreateDocumentSnapshotRequestBody):
  | {
      ok: true;
      value: { createdAt: string; id: string; lastUpdateId: string | null; snapshotBase64: string };
    }
  | { ok: false; message: string } {
  if (typeof body.id !== 'string' || body.id.length === 0) {
    return { ok: false, message: '`id` is required.' };
  }

  if (typeof body.createdAt !== 'string' || Number.isNaN(Date.parse(body.createdAt))) {
    return { ok: false, message: '`createdAt` must be an ISO timestamp.' };
  }

  if (body.lastUpdateId !== null && typeof body.lastUpdateId !== 'string') {
    return { ok: false, message: '`lastUpdateId` must be a string or null.' };
  }

  if (typeof body.snapshotBase64 !== 'string' || body.snapshotBase64.length === 0) {
    return { ok: false, message: '`snapshotBase64` is required.' };
  }

  return {
    ok: true,
    value: {
      createdAt: body.createdAt,
      id: body.id,
      lastUpdateId: body.lastUpdateId,
      snapshotBase64: body.snapshotBase64,
    },
  };
}
