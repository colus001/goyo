import type { SyncAuthContext } from './auth';
import type { EnvWithDocumentsDatabase } from './document-updates';
import { getStorageErrorMessage, jsonError, readJsonBody } from './http';

interface RegisterSyncClientRequestBody {
  lastSeenAt?: unknown;
  name?: unknown;
  platform?: unknown;
}

interface ValidRegisterSyncClientBody {
  lastSeenAt: string;
  name: string | null;
  platform: string | null;
}

export async function registerSyncClient(
  request: Request,
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  clientId: string,
) {
  const body = await readJsonBody<RegisterSyncClientRequestBody>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const validation = validateRegisterSyncClientBody(body.value);

  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO sync_clients (id, owner_id, name, platform, created_at, registered_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_id = excluded.owner_id,
        name = excluded.name,
        platform = excluded.platform,
        last_seen_at = excluded.last_seen_at
      WHERE sync_clients.owner_id = excluded.owner_id;
    `)
      .bind(
        clientId,
        auth.ownerId,
        validation.value.name,
        validation.value.platform,
        validation.value.lastSeenAt,
        validation.value.lastSeenAt,
        validation.value.lastSeenAt,
      )
      .run();

    return Response.json({ clientId, ok: true, ownerId: auth.ownerId });
  } catch (error) {
    return jsonError(getStorageErrorMessage(error), 409);
  }
}

export async function requireRegisteredSyncClient(
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  clientId: string,
) {
  const client = await env.DB.prepare(`
    SELECT id
    FROM sync_clients
    WHERE id = ? AND owner_id = ?;
  `)
    .bind(clientId, auth.ownerId)
    .first<{ id: string }>();

  return !!client;
}

export function matchSyncClientRoute(pathname: string): { clientId: string } | null {
  const match = /^\/v1\/sync\/clients\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { clientId: decodeURIComponent(match[1]) };
}

function validateRegisterSyncClientBody(
  body: RegisterSyncClientRequestBody,
): { ok: true; value: ValidRegisterSyncClientBody } | { ok: false; message: string } {
  if (typeof body.lastSeenAt !== 'string' || Number.isNaN(Date.parse(body.lastSeenAt))) {
    return { ok: false, message: '`lastSeenAt` must be an ISO timestamp.' };
  }

  if (body.name !== undefined && body.name !== null && typeof body.name !== 'string') {
    return { ok: false, message: '`name` must be a string or null.' };
  }

  if (body.platform !== undefined && body.platform !== null && typeof body.platform !== 'string') {
    return { ok: false, message: '`platform` must be a string or null.' };
  }

  return {
    ok: true,
    value: {
      lastSeenAt: body.lastSeenAt,
      name: body.name ?? null,
      platform: body.platform ?? null,
    },
  };
}
