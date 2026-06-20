export interface GoyoCloudDeepLinkCallback {
  email: string | null;
  token: string;
  userId: string | null;
}

export function parseGoyoCloudDeepLinkCallback(url: string): GoyoCloudDeepLinkCallback | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!isAllowedDeepLinkProtocol(parsed.protocol) || !isAuthCallbackPath(parsed)) {
    return null;
  }

  const token = parsed.searchParams.get('token');
  if (!token) return null;

  return {
    email: parsed.searchParams.get('email'),
    token,
    userId: parsed.searchParams.get('userId'),
  };
}

function isAllowedDeepLinkProtocol(protocol: string): boolean {
  return protocol === 'goyo:' || protocol === 'goyo-dev:';
}

function isAuthCallbackPath(url: URL): boolean {
  return (
    (url.hostname === 'auth' && url.pathname === '/callback') ||
    (url.hostname === '' && url.pathname === '/auth/callback')
  );
}
