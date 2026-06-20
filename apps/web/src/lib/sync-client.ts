const WEB_SYNC_CLIENT_STORAGE_KEY = 'goyo.webSyncClientId';

export function getOrCreateWebSyncClientId(): string {
  const existingClientId = window.localStorage.getItem(WEB_SYNC_CLIENT_STORAGE_KEY);

  if (existingClientId) {
    return existingClientId;
  }

  const clientId = `client_web_${crypto.randomUUID()}`;
  window.localStorage.setItem(WEB_SYNC_CLIENT_STORAGE_KEY, clientId);
  return clientId;
}
