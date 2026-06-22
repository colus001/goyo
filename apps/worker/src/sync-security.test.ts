import { describe, expect, it } from 'vitest';
import type { SyncAuthContext } from './auth';
import { getBookMetadata, listBooks, upsertBookMetadata } from './book-metadata';
import { getChapterMetadata, listChapters, upsertChapterMetadata } from './chapter-metadata';
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

  it('accepts fractional document order values used for insertions between rows', () =>
    expectFractionalDocumentOrderAccepted());

  it('stores books and chapters separately for each owner', () =>
    expectBookAndChapterOwnershipScoped());
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

async function expectFractionalDocumentOrderAccepted() {
  const env = createTestEnv();

  const response = await putDocument(env, ownerA, 'doc-fractional-order', 'Inserted episode', 0.5);
  const metadataResponse = await getDocumentMetadata(env, ownerA, 'doc-fractional-order');

  expect(response.status).toBe(200);
  await expect(metadataResponse.json()).resolves.toMatchObject({
    document: { id: 'doc-fractional-order', order: 0.5 },
  });
}

async function expectBookAndChapterOwnershipScoped() {
  const env = createTestEnv();

  await putBook(env, ownerA, 'book-1', 'Owner A book');
  await putBook(env, ownerB, 'book-1', 'Owner B book');
  await putChapter(env, ownerA, 'chapter-1', 'Owner A chapter');
  await putChapter(env, ownerB, 'chapter-1', 'Owner B chapter');

  const ownerABookResponse = await getBookMetadata(env, ownerA, 'book-1');
  const ownerBBookResponse = await getBookMetadata(env, ownerB, 'book-1');
  const ownerAChapterResponse = await getChapterMetadata(env, ownerA, 'chapter-1');
  const ownerBChapterResponse = await getChapterMetadata(env, ownerB, 'chapter-1');
  const ownerABooksResponse = await listBooks(env, ownerA);
  const ownerAChaptersResponse = await listChapters(env, ownerA);

  await expect(ownerABookResponse.json()).resolves.toMatchObject({
    book: { id: 'book-1', title: 'Owner A book' },
  });
  await expect(ownerBBookResponse.json()).resolves.toMatchObject({
    book: { id: 'book-1', title: 'Owner B book' },
  });
  await expect(ownerAChapterResponse.json()).resolves.toMatchObject({
    chapter: { id: 'chapter-1', title: 'Owner A chapter' },
  });
  await expect(ownerBChapterResponse.json()).resolves.toMatchObject({
    chapter: { id: 'chapter-1', title: 'Owner B chapter' },
  });
  await expect(ownerABooksResponse.json()).resolves.toMatchObject({
    books: [{ id: 'book-1', title: 'Owner A book' }],
  });
  await expect(ownerAChaptersResponse.json()).resolves.toMatchObject({
    chapters: [{ id: 'chapter-1', title: 'Owner A chapter' }],
  });
}

async function putBook(
  env: { DB: D1Database },
  auth: SyncAuthContext,
  bookId: string,
  title: string,
) {
  return upsertBookMetadata(
    jsonRequest({
      accentColor: '#a6534b',
      archivedAt: null,
      createdAt: '2026-06-14T12:00:00.000Z',
      title,
      updatedAt: '2026-06-14T12:00:00.000Z',
    }),
    env,
    auth,
    bookId,
  );
}

async function putChapter(
  env: { DB: D1Database },
  auth: SyncAuthContext,
  chapterId: string,
  title: string,
) {
  return upsertChapterMetadata(
    jsonRequest({
      archivedAt: null,
      bookId: 'book-1',
      createdAt: '2026-06-14T12:00:00.000Z',
      order: 0,
      title,
      updatedAt: '2026-06-14T12:00:00.000Z',
    }),
    env,
    auth,
    chapterId,
  );
}

async function putDocument(
  env: { DB: D1Database },
  auth: SyncAuthContext,
  documentId: string,
  title = 'Chapterless episode',
  order = 0,
) {
  return upsertDocumentMetadata(
    jsonRequest({
      archivedAt: null,
      bookId: 'book-1',
      chapterId: null,
      createdAt: '2026-06-14T12:00:00.000Z',
      kind: 'episode',
      order,
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
