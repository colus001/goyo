import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSyncCredentialsStore } from './sync-credentials';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

function createTempUserDataPath() {
  const dir = mkdtempSync(join(tmpdir(), 'sync-credentials-test-'));
  tempDirs.push(dir);
  return dir;
}

describe('sync credentials store', () => {
  it('stores and reads the sync token from a local file', () => {
    const userDataPath = createTempUserDataPath();
    const store = createSyncCredentialsStore(userDataPath);

    store.saveToken('sync-token');

    expect(store.getToken()).toBe('sync-token');
    expect(existsSync(join(userDataPath, 'sync-token.json'))).toBe(true);
  });

  it('returns null for missing or invalid token files', () => {
    const userDataPath = createTempUserDataPath();
    const store = createSyncCredentialsStore(userDataPath);

    expect(store.getToken()).toBeNull();

    writeFileSync(join(userDataPath, 'sync-token.json'), '{not-json', 'utf8');

    expect(store.getToken()).toBeNull();
  });

  it('clears current and legacy token files when the token is empty', () => {
    const userDataPath = createTempUserDataPath();
    const tokenPath = join(userDataPath, 'sync-token.json');
    const legacyTokenPath = join(userDataPath, 'sync-token.dat');
    const store = createSyncCredentialsStore(userDataPath);

    store.saveToken('sync-token');
    writeFileSync(legacyTokenPath, 'legacy-token');

    store.saveToken('');

    expect(existsSync(tokenPath)).toBe(false);
    expect(existsSync(legacyTokenPath)).toBe(false);
  });
});
