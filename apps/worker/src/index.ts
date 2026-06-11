import { APP_NAME } from '@writer/shared';

export default {
  fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: `${APP_NAME} sync api` });
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler;
