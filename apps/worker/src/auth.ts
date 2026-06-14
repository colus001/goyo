import { jsonError } from './http';

export interface EnvWithSyncAuth {
  GOYO_SYNC_TOKEN?: string;
}

export function authorizeSyncRequest(
  request: Request,
  env: EnvWithSyncAuth,
): { ok: true } | { ok: false; response: Response } {
  if (!env.GOYO_SYNC_TOKEN) {
    return { ok: false, response: jsonError('Sync server auth is not configured.', 503) };
  }

  const header = request.headers.get('authorization');
  const expectedHeader = `Bearer ${env.GOYO_SYNC_TOKEN}`;

  if (header !== expectedHeader) {
    return { ok: false, response: jsonError('Unauthorized.', 401) };
  }

  return { ok: true };
}
