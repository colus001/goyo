import { APP_NAME } from '@writer/shared';
import {
  getDocumentMetadata,
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

interface Env {
  DB: D1Database;
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

    const downloadResponse = await handleDownloadRequest(request, url);

    if (downloadResponse) {
      return downloadResponse;
    }

    const metadataRoute = matchDocumentMetadataRoute(url.pathname);

    if (metadataRoute && request.method === 'PUT') {
      return upsertDocumentMetadata(request, env, metadataRoute.documentId);
    }

    if (metadataRoute && request.method === 'GET') {
      return getDocumentMetadata(env, metadataRoute.documentId);
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

    const latestSnapshotRoute = matchLatestDocumentSnapshotRoute(url.pathname);

    if (latestSnapshotRoute && request.method === 'GET') {
      return getLatestDocumentSnapshot(env, latestSnapshotRoute.documentId);
    }

    const snapshotRoute = matchDocumentSnapshotsRoute(url.pathname);

    if (snapshotRoute && request.method === 'POST') {
      return createDocumentSnapshot(request, env, snapshotRoute.documentId);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function handleDownloadRequest(request: Request, url: URL): Promise<Response | null> {
  if (request.method !== 'GET') {
    return null;
  }

  const downloadTarget = matchDownloadRoute(url.pathname);

  return downloadTarget ? redirectToLatestDownload(downloadTarget) : null;
}
