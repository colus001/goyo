import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LEGACY_SYNC_TOKEN_FILE_NAME = 'sync-token.dat';
const SYNC_TOKEN_FILE_NAME = 'sync-token.json';

export interface SyncCredentialsStore {
  getToken(): string | null;
  saveToken(token: string): void;
}

export function createSyncCredentialsStore(userDataPath: string): SyncCredentialsStore {
  const tokenPath = join(userDataPath, SYNC_TOKEN_FILE_NAME);
  const legacyTokenPath = join(userDataPath, LEGACY_SYNC_TOKEN_FILE_NAME);

  return {
    getToken() {
      try {
        if (!existsSync(tokenPath)) return null;
        const raw = JSON.parse(readFileSync(tokenPath, 'utf8')) as { token?: unknown };
        return typeof raw.token === 'string' && raw.token.trim().length > 0 ? raw.token : null;
      } catch {
        return null;
      }
    },
    saveToken(token) {
      if (token.trim().length === 0) {
        rmSync(tokenPath, { force: true });
        rmSync(legacyTokenPath, { force: true });
        return;
      }

      mkdirSync(dirname(tokenPath), { recursive: true });
      writeFileSync(tokenPath, JSON.stringify({ token: token.trim() }), 'utf8');
      rmSync(legacyTokenPath, { force: true });
    },
  };
}
