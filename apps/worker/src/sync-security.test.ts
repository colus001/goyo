import { describe, expect, it } from 'vitest';
import type { SyncAuthContext } from './auth';
import { getDocumentMetadata, upsertDocumentMetadata } from './document-metadata';
import { createDocumentUpdate, listDocumentUpdates } from './document-updates';
import { registerSyncClient } from './sync-clients';
import { createTestEnv, jsonRequest } from './sync-test-helpers';

const ownerA: SyncAuthContext = { authMode: 'self-host-token', ownerId: 'owner-a' };
const ownerB: SyncAuthContext = { authMode: 'self-host-token', ownerId: 'owner-b' };

describe('sync storage ownership', () => {
  it('allows registered clients for the same owner to upload and replay document updates', () =>
    expectSameOwnerMultiClientSync());

  it('blocks unregistered clients from uploading updates', () =>
    expectUnregisteredClientUploadBlocked());

  it("does not expose one owner's metadata or updates to another owner", () =>
    expectCrossOwnerAccessBlocked());

  it('allows different owners to use the same local document id independently', () =>
    expectSameDocumentIdAcrossOwners());
});

async function expectSameOwnerMultiClientSync() {
  const env = createTestEnv();

  await putDocument(env, ownerA, 'doc-1');
  await registerClient(env, ownerA, 'client-a');
  await registerClient(env, ownerA, 'client-b');

  const firstCreateResponse = await createUpdate(env, ownerA, 'client-a', 'update-1', 'AQID');
  const secondCreateResponse = await createUpdate(env, ownerA, 'client-b', 'update-2', 'BAUG');
  const listResponse = await listDocumentUpdates(env, ownerA, 'doc-1', null);

  await expect(firstCreateResponse.json()).resolves.toMatchObject({ id: 'update-1', ok: true });
  await expect(secondCreateResponse.json()).resolves.toMatchObject({ id: 'update-2', ok: true });
  expect(firstCreateResponse.status).toBe(201);
  expect(secondCreateResponse.status).toBe(201);
  await expect(listResponse.json()).resolves.toMatchObject({
    documentId: 'doc-1',
    updates: [
      { clientId: 'client-a', id: 'update-1', updateBase64: 'AQID' },
      { clientId: 'client-b', id: 'update-2', updateBase64: 'BAUG' },
    ],
  });
}

async function expectUnregisteredClientUploadBlocked() {
  const env = createTestEnv();

  await putDocument(env, ownerA, 'doc-1');

  const response = await createUpdate(env, ownerA, 'missing-client', 'update-1', 'AQID');

  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toMatchObject({
    error: 'Sync client must be registered before uploading updates.',
  });
}

async function expectCrossOwnerAccessBlocked() {
  const env = createTestEnv();

  await putDocument(env, ownerA, 'doc-1');
  await registerClient(env, ownerA, 'client-a');
  await registerClient(env, ownerB, 'client-b');
  await createUpdate(env, ownerA, 'client-a', 'update-1', 'AQID');

  const metadataResponse = await getDocumentMetadata(env, ownerB, 'doc-1');
  const updatesResponse = await listDocumentUpdates(env, ownerB, 'doc-1', null);
  const crossOwnerUploadResponse = await createUpdate(env, ownerB, 'client-b', 'update-2', 'BAUG');

  expect(metadataResponse.status).toBe(404);
  await expect(updatesResponse.json()).resolves.toMatchObject({
    documentId: 'doc-1',
    updates: [],
  });
  expect(crossOwnerUploadResponse.status).toBe(409);
}

async function expectSameDocumentIdAcrossOwners() {
  const env = createTestEnv();

  await putDocument(env, ownerA, 'doc-1', 'Owner A document');
  await putDocument(env, ownerB, 'doc-1', 'Owner B document');
  await registerClient(env, ownerA, 'client-a');
  await registerClient(env, ownerB, 'client-b');

  const ownerAUpdateResponse = await createUpdate(env, ownerA, 'client-a', 'update-1', 'AQID');
  const ownerBUpdateResponse = await createUpdate(env, ownerB, 'client-b', 'update-1', 'BAUG');
  const ownerAMetadataResponse = await getDocumentMetadata(env, ownerA, 'doc-1');
  const ownerBMetadataResponse = await getDocumentMetadata(env, ownerB, 'doc-1');
  const ownerAUpdatesResponse = await listDocumentUpdates(env, ownerA, 'doc-1', null);
  const ownerBUpdatesResponse = await listDocumentUpdates(env, ownerB, 'doc-1', null);

  expect(ownerAUpdateResponse.status).toBe(201);
  expect(ownerBUpdateResponse.status).toBe(201);
  await expect(ownerAMetadataResponse.json()).resolves.toMatchObject({
    document: { id: 'doc-1', title: 'Owner A document' },
  });
  await expect(ownerBMetadataResponse.json()).resolves.toMatchObject({
    document: { id: 'doc-1', title: 'Owner B document' },
  });
  await expect(ownerAUpdatesResponse.json()).resolves.toMatchObject({
    updates: [{ clientId: 'client-a', id: 'update-1', updateBase64: 'AQID' }],
  });
  await expect(ownerBUpdatesResponse.json()).resolves.toMatchObject({
    updates: [{ clientId: 'client-b', id: 'update-1', updateBase64: 'BAUG' }],
  });
}

async function putDocument(
  env: { DB: D1Database },
  auth: SyncAuthContext,
  documentId: string,
  title = 'Chapterless episode',
) {
  return upsertDocumentMetadata(
    jsonRequest({
      archivedAt: null,
      bookId: 'book-1',
      chapterId: null,
      createdAt: '2026-06-14T12:00:00.000Z',
      kind: 'episode',
      order: 0,
      title,
      updatedAt: '2026-06-14T12:00:00.000Z',
    }),
    env,
    auth,
    documentId,
  );
}

async function registerClient(env: { DB: D1Database }, auth: SyncAuthContext, clientId: string) {
  return registerSyncClient(
    jsonRequest({ lastSeenAt: '2026-06-14T12:00:00.000Z', name: null, platform: null }),
    env,
    auth,
    clientId,
  );
}

async function createUpdate(
  env: { DB: D1Database },
  auth: SyncAuthContext,
  clientId: string,
  updateId: string,
  updateBase64: string,
) {
  return createDocumentUpdate(
    jsonRequest({
      clientId,
      createdAt: updateId === 'update-1' ? '2026-06-14T12:01:00.000Z' : '2026-06-14T12:02:00.000Z',
      id: updateId,
      updateBase64,
    }),
    env,
    auth,
    'doc-1',
  );
}
