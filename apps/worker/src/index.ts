import { APP_NAME } from '@writer/shared';

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

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
