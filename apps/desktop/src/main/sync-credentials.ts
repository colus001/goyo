import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { safeStorage } from 'electron';

const SYNC_TOKEN_FILE_NAME = 'sync-token.dat';

export interface SyncCredentialsStore {
  getToken(): string | null;
  saveToken(token: string): void;
}

export function createSyncCredentialsStore(userDataPath: string): SyncCredentialsStore {
  const tokenPath = join(userDataPath, SYNC_TOKEN_FILE_NAME);

  return {
    getToken() {
      if (!existsSync(tokenPath) || !safeStorage.isEncryptionAvailable()) {
        return null;
      }

      try {
        return safeStorage.decryptString(readFileSync(tokenPath));
      } catch {
        return null;
      }
    },
    saveToken(token) {
      if (token.trim().length === 0) {
        rmSync(tokenPath, { force: true });
        return;
      }

      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Secure credential storage is not available on this device.');
      }

      mkdirSync(dirname(tokenPath), { recursive: true });
      writeFileSync(tokenPath, safeStorage.encryptString(token.trim()));
    },
  };
}
