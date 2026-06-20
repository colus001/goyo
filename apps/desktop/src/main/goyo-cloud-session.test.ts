import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createGoyoCloudSessionStore } from './goyo-cloud-session';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true });
  }
});

function createTempUserDataPath() {
  const dir = mkdtempSync(join(tmpdir(), 'goyo-cloud-session-test-'));
  tempDirs.push(dir);
  return dir;
}

describe('Goyo Cloud session store', () => {
  it('stores and reads the hosted session token from a local file', () => {
    const userDataPath = createTempUserDataPath();
    const store = createGoyoCloudSessionStore(userDataPath);

    store.saveSessionToken('session-token');

    expect(store.getSessionToken()).toBe('session-token');
    expect(existsSync(join(userDataPath, 'goyo-cloud-session.json'))).toBe(true);
  });

  it('returns null for missing or invalid session token files', () => {
    const userDataPath = createTempUserDataPath();
    const store = createGoyoCloudSessionStore(userDataPath);

    expect(store.getSessionToken()).toBeNull();

    writeFileSync(join(userDataPath, 'goyo-cloud-session.json'), '{not-json', 'utf8');

    expect(store.getSessionToken()).toBeNull();
  });

  it('clears current and legacy token files when the token is empty', () => {
    const userDataPath = createTempUserDataPath();
    const sessionPath = join(userDataPath, 'goyo-cloud-session.json');
    const legacySessionPath = join(userDataPath, 'goyo-cloud-session.dat');
    const store = createGoyoCloudSessionStore(userDataPath);

    store.saveSessionToken('session-token');
    writeFileSync(legacySessionPath, 'legacy-token');

    store.saveSessionToken('');

    expect(existsSync(sessionPath)).toBe(false);
    expect(existsSync(legacySessionPath)).toBe(false);
  });
});
