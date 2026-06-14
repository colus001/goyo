import { getBearerOrCookieToken } from './cloud-auth-cookie';
import type { EnvWithCloudAuth } from './cloud-auth-env';
import { getSessionByTokenHash, hashRequestToken } from './cloud-auth-storage';
import { jsonError } from './http';

export type SyncAuthContext =
  | { authMode: 'self-host-token'; ownerId: 'self' }
  | { authMode: 'goyo-cloud-session'; ownerId: string; userId: string };

export interface EnvWithSyncAuth extends EnvWithCloudAuth {
  GOYO_SYNC_TOKEN?: string;
}

export async function authorizeSyncRequest(
  request: Request,
  env: EnvWithSyncAuth,
): Promise<{ ok: true; context: SyncAuthContext } | { ok: false; response: Response }> {
  const header = request.headers.get('authorization');

  if (env.GOYO_SYNC_TOKEN && header === `Bearer ${env.GOYO_SYNC_TOKEN}`) {
    return { context: { authMode: 'self-host-token', ownerId: 'self' }, ok: true };
  }

  const token = getBearerOrCookieToken(request);

  if (!token) {
    return { ok: false, response: jsonError('Unauthorized.', 401) };
  }

  const tokenHash = await hashRequestToken(env, token);

  if (!tokenHash) {
    return { ok: false, response: jsonError('Sync server auth is not configured.', 503) };
  }

  const session = await getSessionByTokenHash(env, tokenHash);

  if (!session) {
    return { ok: false, response: jsonError('Unauthorized.', 401) };
  }

  return {
    context: {
      authMode: 'goyo-cloud-session',
      ownerId: session.user_id,
      userId: session.user_id,
    },
    ok: true,
  };
}
