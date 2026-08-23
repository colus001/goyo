export async function readJsonBody<T>(
  request: Request,
): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    return { ok: true, value: (await request.json()) as T };
  } catch {
    return { ok: false };
  }
}

export function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function encodeBase64(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function jsonError(message: string, status: number) {
  return withCors(Response.json({ error: message, ok: false }, { status }));
}

export function corsPreflightResponse(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Max-Age': '86400',
    },
    status: 204,
  });
}

export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export function getStorageErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Storage operation failed.';
}

export function storageErrorResponse(error: unknown, fallbackStatus = 409): Response {
  const message = getStorageErrorMessage(error);

  if (/overloaded|queued for too long/i.test(message)) {
    const response = jsonError('Service is temporarily busy. Please try again shortly.', 503);
    response.headers.set('Retry-After', '30');
    return response;
  }

  return jsonError(message, fallbackStatus);
}
