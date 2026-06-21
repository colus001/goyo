import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const LEGACY_GOYO_CLOUD_SESSION_FILE_NAME = 'goyo-cloud-session.dat';
const GOYO_CLOUD_SESSION_FILE_NAME = 'goyo-cloud-session.json';

interface GoyoCloudSessionStore {
  getSessionToken(): string | null;
  saveSessionToken(token: string): void;
}

interface GoyoCloudAccount {
  email: string;
  id: string;
}

export interface GoyoCloudSessionStoreWithAccount extends GoyoCloudSessionStore {
  clearAccount(): void;
  getAccount(): GoyoCloudAccount | null;
  saveAccount(account: GoyoCloudAccount): void;
}

export function createGoyoCloudSessionStore(
  userDataPath: string,
): GoyoCloudSessionStoreWithAccount {
  const tokenPath = join(userDataPath, GOYO_CLOUD_SESSION_FILE_NAME);
  const legacyTokenPath = join(userDataPath, LEGACY_GOYO_CLOUD_SESSION_FILE_NAME);
  const accountPath = join(userDataPath, 'goyo-cloud-account.json');

  return {
    getSessionToken() {
      try {
        if (!existsSync(tokenPath)) return null;
        const raw = JSON.parse(readFileSync(tokenPath, 'utf8')) as { token?: unknown };
        return typeof raw.token === 'string' && raw.token.trim().length > 0 ? raw.token : null;
      } catch {
        return null;
      }
    },
    saveSessionToken(token) {
      if (token.trim().length === 0) {
        rmSync(tokenPath, { force: true });
        rmSync(legacyTokenPath, { force: true });
        return;
      }

      mkdirSync(dirname(tokenPath), { recursive: true });
      writeFileSync(tokenPath, JSON.stringify({ token: token.trim() }), 'utf8');
      rmSync(legacyTokenPath, { force: true });
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
    clearAccount() {
      rmSync(accountPath, { force: true });
    },
  };
}
