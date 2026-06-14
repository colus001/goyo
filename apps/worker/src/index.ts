import { APP_NAME } from '@writer/shared';
import { authorizeSyncRequest, type EnvWithSyncAuth, type SyncAuthContext } from './auth';
import { handleCloudAuthRequest } from './cloud-auth-routes';
import {
  getDocumentMetadata,
  listDocuments,
  matchDocumentMetadataRoute,
  upsertDocumentMetadata,
} from './document-metadata';
import {
  createDocumentSnapshot,
  getLatestDocumentSnapshot,
  matchDocumentSnapshotsRoute,
  matchLatestDocumentSnapshotRoute,
} from './document-snapshots';
import {
  createDocumentUpdate,
  listDocumentUpdates,
  matchDocumentUpdatesRoute,
} from './document-updates';
import { matchDownloadRoute, redirectToLatestDownload } from './downloads';
import { corsPreflightResponse, withCors } from './http';
import { matchSyncClientRoute, registerSyncClient } from './sync-clients';

interface Env extends EnvWithSyncAuth {
  DB: D1Database;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsPreflightResponse();
    }

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return withCors(Response.json({ ok: true, service: `${APP_NAME} sync api` }));
    }

    if (url.pathname === '/health/db') {
      const result = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();

      return withCors(
        Response.json({
          ok: result?.ok === 1,
          service: `${APP_NAME} sync api`,
          storage: 'd1',
        }),
      );
    }

    const downloadResponse = await handleDownloadRequest(request, url);

    if (downloadResponse) {
      return withCors(downloadResponse);
    }

    const authResponse = await handleCloudAuthRequest(request, env, url);

    if (authResponse) {
      return withCors(authResponse);
    }

    const syncResponse = await handleSyncApiRequest(request, env, url);

    if (syncResponse) {
      return withCors(syncResponse);
    }

    return withCors(new Response('Not found', { status: 404 }));
  },
} satisfies ExportedHandler<Env>;

async function handleSyncApiRequest(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response | null> {
  if (!url.pathname.startsWith('/v1/')) {
    return null;
  }

  const auth = await authorizeSyncRequest(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  if (url.pathname === '/v1/sync/status' && request.method === 'GET') {
    return Response.json({ auth: auth.context.authMode, ok: true, storage: 'd1' });
  }

  if (url.pathname === '/v1/documents' && request.method === 'GET') {
    return listDocuments(env, auth.context);
  }

  const syncClientRoute = matchSyncClientRoute(url.pathname);

  if (syncClientRoute && request.method === 'PUT') {
    return registerSyncClient(request, env, auth.context, syncClientRoute.clientId);
  }

  return (
    (await handleDocumentMetadataRequest(request, env, auth.context, url)) ??
    (await handleDocumentUpdateRequest(request, env, auth.context, url)) ??
    (await handleDocumentSnapshotRequest(request, env, auth.context, url))
  );
}

async function handleDocumentMetadataRequest(
  request: Request,
  env: Env,
  auth: SyncAuthContext,
  url: URL,
): Promise<Response | null> {
  const metadataRoute = matchDocumentMetadataRoute(url.pathname);

  if (metadataRoute && request.method === 'PUT') {
    return upsertDocumentMetadata(request, env, auth, metadataRoute.documentId);
  }

  if (metadataRoute && request.method === 'GET') {
    return getDocumentMetadata(env, auth, metadataRoute.documentId);
  }

  return null;
}

async function handleDocumentUpdateRequest(
  request: Request,
  env: Env,
  auth: SyncAuthContext,
  url: URL,
): Promise<Response | null> {
  const updateRoute = matchDocumentUpdatesRoute(url.pathname);

  if (updateRoute && request.method === 'POST') {
    return createDocumentUpdate(request, env, auth, updateRoute.documentId);
  }

  if (updateRoute && request.method === 'GET') {
    return listDocumentUpdates(
      env,
      auth,
      updateRoute.documentId,
      url.searchParams.get('afterUpdateId'),
    );
  }

  return null;
}

async function handleDocumentSnapshotRequest(
  request: Request,
  env: Env,
  auth: SyncAuthContext,
  url: URL,
): Promise<Response | null> {
  const latestSnapshotRoute = matchLatestDocumentSnapshotRoute(url.pathname);

  if (latestSnapshotRoute && request.method === 'GET') {
    return getLatestDocumentSnapshot(env, auth, latestSnapshotRoute.documentId);
  }

  const snapshotRoute = matchDocumentSnapshotsRoute(url.pathname);

  if (snapshotRoute && request.method === 'POST') {
    return createDocumentSnapshot(request, env, auth, snapshotRoute.documentId);
  }

  return null;
}

async function handleDownloadRequest(request: Request, url: URL): Promise<Response | null> {
  if (request.method !== 'GET') {
    return null;
  }

  const downloadTarget = matchDownloadRoute(url.pathname);

  return downloadTarget ? redirectToLatestDownload(downloadTarget) : null;
}
