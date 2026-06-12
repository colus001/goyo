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
  return Response.json({ error: message, ok: false }, { status });
}

export function getStorageErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Storage operation failed.';
}
