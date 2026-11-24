import { createHash, randomBytes } from 'node:crypto';
import { createServer, type ServerResponse } from 'node:http';

const HOST = '127.0.0.1';
const PATH = '/auth/callback';

export class CoachError extends Error {}

export function createPkce() {
  const verifier = randomToken();
  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
    state: randomToken(),
    nonce: randomToken(),
  };
}

export async function authorizeInBrowser({
  state,
  signal,
  buildUrl,
  openExternal,
}: {
  state: string;
  signal: AbortSignal;
  buildUrl: (callback: string) => URL;
  openExternal: (url: string) => Promise<void>;
}) {
  signal.throwIfAborted();
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOST, resolve);
  });
  try {
    signal.throwIfAborted();
    const address = server.address();
    if (!address || typeof address === 'string') throw new CoachError('Could not start sign-in.');
    const callback = `http://${HOST}:${address.port}${PATH}`;
    const browserUrl = buildUrl(callback).toString();
    const result = waitForCallback(server, callback, state, signal);
    // A valid callback proves the browser opened; don't wait on the OS launch promise afterward.
    const launch = Promise.resolve()
      .then(() => {
        signal.throwIfAborted();
        return openExternal(browserUrl);
      })
      .then(() => result);
    const params = await Promise.race([result, launch]);
    return { callback, params };
  } finally {
    server.close();
    server.closeAllConnections();
  }
}

function waitForCallback(
  server: ReturnType<typeof createServer>,
  callback: string,
  state: string,
  signal: AbortSignal,
) {
  const expected = new URL(callback);
  return new Promise<URLSearchParams>((resolve, reject) => {
    const abort = () => reject(new CoachError('Sign-in was cancelled or timed out.'));
    signal.addEventListener('abort', abort, { once: true });
    server.once('close', () => signal.removeEventListener('abort', abort));
    if (signal.aborted) abort();
    server.on('request', (request, response) => {
      let url: URL;
      try {
        url = new URL(request.url ?? '/', expected.origin);
      } catch {
        return respond(response, 400, 'Invalid sign-in response.');
      }
      if (
        request.method !== 'GET' ||
        request.headers.host !== expected.host ||
        url.origin !== expected.origin ||
        url.pathname !== expected.pathname
      )
        return respond(response, 404, 'Not found.');
      if (url.searchParams.get('state') !== state) {
        return respond(response, 400, 'Sign-in could not be confirmed. Return to Goyo.');
      }
      if (url.searchParams.has('error') || !url.searchParams.get('code')) {
        respond(response, 400, 'Sign-in did not complete. Return to Goyo.');
        reject(new CoachError('The provider did not authorize access.'));
        return;
      }
      respond(response, 200, 'Authorization received. Return to Goyo to check the connection.');
      resolve(url.searchParams);
    });
  });
}

function respond(response: ServerResponse, status: number, message: string) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'",
  });
  response.end(message);
}

function randomToken() {
  return randomBytes(32).toString('base64url');
}
