const AUTH_COOKIE_NAME = 'goyo_session';

export function getBearerOrCookieToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim() || null;
  }

  return getCookieValue(request.headers.get('cookie'), AUTH_COOKIE_NAME);
}

export function createAuthCookie(token: string): string {
  return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearAuthCookie(): string {
  return `${AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const [cookieName, ...valueParts] = part.trim().split('=');

    if (cookieName === name) {
      return valueParts.join('=') || null;
    }
  }

  return null;
}
