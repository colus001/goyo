import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { safeStorage } from 'electron';
import type {
  CoachCloudConnection,
  CoachDirectProtocol,
  CoachProviderAccount,
} from '../shared/writing-coach';
import { CoachError } from './writing-coach-oauth';

export interface ChatGptTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresAt: number;
  scopes: string[];
}

export type CoachAccountRecord =
  | (Omit<CoachProviderAccount, 'signedIn' | 'providerID'> & {
      providerID: 'chatgpt';
      clientId: string;
      subject: string;
      email?: string;
      tokens: ChatGptTokens | null;
    })
  | (Omit<CoachProviderAccount, 'signedIn' | 'providerID'> & {
      providerID: 'openrouter' | 'opencode-go';
      token: string;
    })
  | (Omit<CoachProviderAccount, 'signedIn' | 'providerID'> & {
      providerID: 'custom';
      token: string;
      endpoint: string;
      protocol: CoachDirectProtocol;
      modelIds: string[];
    })
  | (CoachCloudConnection & { id: string; label: string });

export interface CoachCredentialStore {
  list(): CoachAccountRecord[];
  save(account: CoachAccountRecord): void;
  remove(id: string): void;
  hostId(): string;
  requireEncryption(): void;
}

export function createCoachCredentialStore(directory: string): CoachCredentialStore {
  const file = join(directory, 'coach-credentials.bin');
  const hostFile = join(directory, 'coach-host-id');
  function requireEncryption() {
    if (
      !safeStorage.isEncryptionAvailable() ||
      (process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text')
    )
      throw new CoachError('Enable your operating system’s secure storage before connecting AI.');
  }
  function list(): CoachAccountRecord[] {
    const encrypted = readIfExists(file);
    if (!encrypted) return [];
    requireEncryption();
    return JSON.parse(safeStorage.decryptString(encrypted)) as CoachAccountRecord[];
  }
  function write(accounts: CoachAccountRecord[]) {
    requireEncryption();
    atomicWrite(file, safeStorage.encryptString(JSON.stringify(accounts)));
  }
  return {
    list,
    save(account) {
      const current = list();
      write([...current.filter(({ id }) => id !== account.id), account]);
    },
    remove(id) {
      write(list().filter((account) => account.id !== id));
    },
    hostId() {
      const existing = readIfExists(hostFile)?.toString('utf8');
      if (existing) return existing;
      const created = `urn:uuid:${randomUUID()}`;
      atomicWrite(hostFile, created);
      return created;
    },
    requireEncryption,
  };
}

function readIfExists(path: string) {
  try {
    return readFileSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return null;
  }
}

function atomicWrite(path: string, data: Buffer | string) {
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, data, { flag: 'wx', mode: 0o600 });
    renameSync(temp, path);
  } finally {
    rmSync(temp, { force: true });
  }
}
