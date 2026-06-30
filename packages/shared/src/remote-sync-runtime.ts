import type { RemoteSyncConnection } from './remote-sync-types';

export async function fetchJson<T = unknown>(
  connection: RemoteSyncConnection,
  pathOrUrl: string | { toString(): string },
  init: RemoteSyncRequestInit,
): Promise<T> {
  const url = getRequestUrl(connection, pathOrUrl);
  const response = await getGlobalFetch()(url, {
    ...init,
    headers: {
      authorization: `Bearer ${connection.token ?? ''}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new RemoteSyncRequestError({
      endpoint: getSyncEndpoint(url),
      message: await getSyncErrorMessage(response),
      status: response.status,
    });
  }

  return (await response.json()) as T;
}

export class RemoteSyncRequestError extends Error {
  readonly endpoint: string;
  readonly status: number;

  constructor({
    endpoint,
    message,
    status,
  }: { endpoint: string; message: string; status: number }) {
    super(message);
    this.name = 'RemoteSyncRequestError';
    this.endpoint = endpoint;
    this.status = status;
  }
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = getBase64Globals().atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return getBase64Globals().btoa(binary);
}

async function getSyncErrorMessage(response: RemoteSyncResponse): Promise<string> {
  const fallback = `Remote sync request failed with ${response.status}.`;

  try {
    const body = (await response.json()) as { error?: unknown };

    return typeof body.error === 'string' && body.error.length > 0 ? body.error : fallback;
  } catch {
    return fallback;
  }
}

function getSyncEndpoint(url: string): string {
  try {
    const URLCtor = (globalThis as unknown as RemoteSyncGlobal).URL;

    if (!URLCtor) {
      return url;
    }

    const parsedUrl = new URLCtor(url);

    return `${parsedUrl.pathname}${parsedUrl.search}`;
  } catch {
    return url;
  }
}

function getRequestUrl(
  connection: RemoteSyncConnection,
  pathOrUrl: string | { toString(): string },
): string {
  const value = pathOrUrl.toString();

  return value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `${connection.serverUrl}${value}`;
}

function getGlobalFetch(): RemoteSyncFetch {
  return (globalThis as unknown as RemoteSyncGlobal).fetch;
}

function getBase64Globals() {
  return globalThis as unknown as RemoteSyncGlobal & {
    atob(base64: string): string;
    btoa(binary: string): string;
  };
}

interface RemoteSyncRequestInit {
  body?: string;
  headers?: Record<string, string>;
  method: string;
}

interface RemoteSyncResponse {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
}

interface RemoteSyncUrl {
  pathname: string;
  search: string;
}

interface RemoteSyncGlobal {
  URL?: new (input: string) => RemoteSyncUrl;
  atob?: (base64: string) => string;
  btoa?: (binary: string) => string;
  fetch: RemoteSyncFetch;
}

type RemoteSyncFetch = (input: string, init: RemoteSyncRequestInit) => Promise<RemoteSyncResponse>;
