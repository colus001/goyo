import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SYNC_CLIENT_ID_FILE_NAME = 'sync-client-id.txt';

export interface SyncClientIdentityStore {
  getOrCreateClientId(): string;
}

export function createSyncClientIdentityStore(userDataPath: string): SyncClientIdentityStore {
  const clientIdPath = join(userDataPath, SYNC_CLIENT_ID_FILE_NAME);

  return {
    getOrCreateClientId() {
      const existingClientId = readExistingClientId(clientIdPath);

      if (existingClientId) {
        return existingClientId;
      }

      const clientId = `client_${crypto.randomUUID()}`;

      mkdirSync(dirname(clientIdPath), { recursive: true });
      writeFileSync(clientIdPath, clientId, 'utf8');

      return clientId;
    },
  };
}

function readExistingClientId(clientIdPath: string): string | null {
  if (!existsSync(clientIdPath)) {
    return null;
  }

  const clientId = readFileSync(clientIdPath, 'utf8').trim();

  return clientId.length > 0 ? clientId : null;
}
