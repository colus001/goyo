import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { safeStorage } from 'electron';

const GOYO_CLOUD_SESSION_FILE_NAME = 'goyo-cloud-session.dat';

interface GoyoCloudSessionStore {
  getSessionToken(): string | null;
  saveSessionToken(token: string): void;
}

interface GoyoCloudAccount {
  email: string;
  id: string;
}

export interface GoyoCloudSessionStoreWithAccount extends GoyoCloudSessionStore {
  getAccount(): GoyoCloudAccount | null;
  saveAccount(account: GoyoCloudAccount): void;
}

export function createGoyoCloudSessionStore(
  userDataPath: string,
): GoyoCloudSessionStoreWithAccount {
  const tokenPath = join(userDataPath, GOYO_CLOUD_SESSION_FILE_NAME);
  const accountPath = join(userDataPath, 'goyo-cloud-account.json');

  return {
    getSessionToken() {
      if (!existsSync(tokenPath) || !safeStorage.isEncryptionAvailable()) {
        return null;
      }

      try {
        return safeStorage.decryptString(readFileSync(tokenPath));
      } catch {
        return null;
      }
    },
    saveSessionToken(token) {
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
    getAccount() {
      try {
        if (!existsSync(accountPath)) return null;
        const raw = readFileSync(accountPath, 'utf8');
        const account = JSON.parse(raw) as GoyoCloudAccount;
        return account.email && account.id ? account : null;
      } catch {
        return null;
      }
    },
    saveAccount(account) {
      mkdirSync(dirname(accountPath), { recursive: true });
      writeFileSync(accountPath, JSON.stringify(account), 'utf8');
    },
  };
}
