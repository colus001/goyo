import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createSyncClientIdentityStore } from './sync-client-identity';

const temporaryPaths: string[] = [];

afterEach(() => {
  for (const path of temporaryPaths.splice(0)) {
    rmSync(path, { force: true, recursive: true });
  }
});

describe('sync client identity store', () => {
  it('keeps a stable sync client id across store instances', () => {
    const path = createTemporaryPath();
    const firstStore = createSyncClientIdentityStore(path);
    const secondStore = createSyncClientIdentityStore(path);
    const clientId = firstStore.getOrCreateClientId();

    expect(clientId).toMatch(/^client_/);
    expect(secondStore.getOrCreateClientId()).toBe(clientId);
  });
});

function createTemporaryPath() {
  const path = mkdtempSync(join(tmpdir(), 'writer-sync-client-'));
  temporaryPaths.push(path);
  return path;
}
