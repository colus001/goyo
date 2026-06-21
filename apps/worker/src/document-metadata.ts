import type { SyncAuthContext } from './auth';
import type { EnvWithDocumentsDatabase } from './document-updates';
import { getStorageErrorMessage, jsonError, readJsonBody } from './http';

type DocumentKind = 'draft' | 'episode' | 'note';

interface UpsertDocumentMetadataRequestBody {
  archivedAt?: unknown;
  bookId?: unknown;
  chapterId?: unknown;
  createdAt?: unknown;
  kind?: unknown;
  order?: unknown;
  title?: unknown;
  updatedAt?: unknown;
}

interface DocumentMetadataRow {
  archived_at: string | null;
  book_id: string;
  chapter_id: string | null;
  created_at: string;
  id: string;
  kind: DocumentKind;
  sort_order: number;
  title: string;
  updated_at: string;
}

interface ValidDocumentMetadataBody {
  archivedAt: string | null;
  bookId: string;
  chapterId: string | null;
  createdAt: string;
  kind: DocumentKind;
  order: number;
  title: string;
  updatedAt: string;
}

export async function upsertDocumentMetadata(
  request: Request,
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  documentId: string,
) {
  const body = await readJsonBody<UpsertDocumentMetadataRequestBody>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const validation = validateDocumentMetadataBody(body.value);

  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO documents (
        id, owner_id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, id) DO UPDATE SET
        book_id = excluded.book_id,
        chapter_id = excluded.chapter_id,
        title = excluded.title,
        kind = excluded.kind,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at;
    `)
      .bind(
        documentId,
        auth.ownerId,
        validation.value.bookId,
        validation.value.chapterId,
        validation.value.title,
        validation.value.kind,
        validation.value.order,
        validation.value.createdAt,
        validation.value.updatedAt,
        validation.value.archivedAt,
      )
      .run();

    return Response.json({ documentId, ok: true });
  } catch (error) {
    return jsonError(getStorageErrorMessage(error), 409);
  }
}

export async function getDocumentMetadata(
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  documentId: string,
) {
  const document = await env.DB.prepare(`
    SELECT id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
    FROM documents
    WHERE id = ? AND owner_id = ?;
  `)
    .bind(documentId, auth.ownerId)
    .first<DocumentMetadataRow>();

  if (!document) {
    return jsonError('Document not found.', 404);
  }

  return Response.json({ document: rowToDocumentMetadata(document) });
}

export function matchDocumentMetadataRoute(pathname: string): { documentId: string } | null {
  const match = /^\/v1\/documents\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { documentId: decodeURIComponent(match[1]) };
}

export async function listDocuments(env: EnvWithDocumentsDatabase, auth: SyncAuthContext) {
  const rows = await env.DB.prepare(`
    SELECT id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
    FROM documents
    WHERE owner_id = ? AND archived_at IS NULL
    ORDER BY updated_at DESC
    LIMIT 100;
  `)
    .bind(auth.ownerId)
    .all<DocumentMetadataRow>();

  return Response.json({
    documents: rows.results.map(rowToDocumentMetadata),
    ok: true,
  });
}

function validateDocumentMetadataBody(
  body: UpsertDocumentMetadataRequestBody,
): { ok: true; value: ValidDocumentMetadataBody } | { ok: false; message: string } {
  if (typeof body.bookId !== 'string' || body.bookId.length === 0) {
    return { ok: false, message: '`bookId` is required.' };
  }

  if (body.chapterId !== null && typeof body.chapterId !== 'string') {
    return { ok: false, message: '`chapterId` must be a string or null.' };
  }

  if (typeof body.title !== 'string') {
    return { ok: false, message: '`title` is required.' };
  }

  if (!isDocumentKind(body.kind)) {
    return { ok: false, message: '`kind` must be draft, episode, or note.' };
  }

  if (typeof body.order !== 'number' || !Number.isInteger(body.order)) {
    return { ok: false, message: '`order` must be an integer.' };
  }

  if (!isIsoTimestamp(body.createdAt)) {
    return { ok: false, message: '`createdAt` must be an ISO timestamp.' };
  }

  if (!isIsoTimestamp(body.updatedAt)) {
    return { ok: false, message: '`updatedAt` must be an ISO timestamp.' };
  }

  if (body.archivedAt !== null && !isIsoTimestamp(body.archivedAt)) {
    return { ok: false, message: '`archivedAt` must be an ISO timestamp or null.' };
  }

  return {
    ok: true,
    value: {
      archivedAt: body.archivedAt,
      bookId: body.bookId,
      chapterId: body.chapterId,
      createdAt: body.createdAt,
      kind: body.kind,
      order: body.order,
      title: body.title,
      updatedAt: body.updatedAt,
    },
  };
}

function isDocumentKind(kind: unknown): kind is DocumentKind {
  return kind === 'draft' || kind === 'episode' || kind === 'note';
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function rowToDocumentMetadata(document: DocumentMetadataRow) {
  return {
    archivedAt: document.archived_at,
    bookId: document.book_id,
    chapterId: document.chapter_id,
    createdAt: document.created_at,
    id: document.id,
    kind: document.kind,
    order: document.sort_order,
    title: document.title,
    updatedAt: document.updated_at,
  };
}
