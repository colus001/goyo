import type { SyncAuthContext } from './auth';
import type { EnvWithDocumentsDatabase } from './document-updates';
import { getStorageErrorMessage, jsonError, readJsonBody } from './http';

interface UpsertBookMetadataRequestBody {
  accentColor?: unknown;
  archivedAt?: unknown;
  createdAt?: unknown;
  title?: unknown;
  updatedAt?: unknown;
}

interface BookMetadataRow {
  accent_color: string;
  archived_at: string | null;
  created_at: string;
  id: string;
  title: string;
  updated_at: string;
}

interface ValidBookMetadataBody {
  accentColor: string;
  archivedAt: string | null;
  createdAt: string;
  title: string;
  updatedAt: string;
}

export async function upsertBookMetadata(
  request: Request,
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  bookId: string,
) {
  const body = await readJsonBody<UpsertBookMetadataRequestBody>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const validation = validateBookMetadataBody(body.value);

  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO books (owner_id, id, title, accent_color, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, id) DO UPDATE SET
        title = excluded.title,
        accent_color = excluded.accent_color,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at;
    `)
      .bind(
        auth.ownerId,
        bookId,
        validation.value.title,
        validation.value.accentColor,
        validation.value.createdAt,
        validation.value.updatedAt,
        validation.value.archivedAt,
      )
      .run();

    return Response.json({ bookId, ok: true });
  } catch (error) {
    return jsonError(getStorageErrorMessage(error), 409);
  }
}

export async function getBookMetadata(
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  bookId: string,
) {
  const book = await env.DB.prepare(`
    SELECT id, title, accent_color, created_at, updated_at, archived_at
    FROM books
    WHERE owner_id = ? AND id = ?;
  `)
    .bind(auth.ownerId, bookId)
    .first<BookMetadataRow>();

  if (!book) {
    return jsonError('Book not found.', 404);
  }

  return Response.json({ book: rowToBookMetadata(book) });
}

export async function listBooks(env: EnvWithDocumentsDatabase, auth: SyncAuthContext) {
  const rows = await env.DB.prepare(`
    SELECT id, title, accent_color, created_at, updated_at, archived_at
    FROM books
    WHERE owner_id = ? AND archived_at IS NULL
    ORDER BY updated_at DESC, title ASC;
  `)
    .bind(auth.ownerId)
    .all<BookMetadataRow>();

  return Response.json({ books: rows.results.map(rowToBookMetadata), ok: true });
}

export function matchBookMetadataRoute(pathname: string): { bookId: string } | null {
  const match = /^\/v1\/books\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { bookId: decodeURIComponent(match[1]) };
}

function validateBookMetadataBody(
  body: UpsertBookMetadataRequestBody,
): { ok: true; value: ValidBookMetadataBody } | { ok: false; message: string } {
  if (typeof body.title !== 'string') {
    return { ok: false, message: '`title` is required.' };
  }

  if (typeof body.accentColor !== 'string' || body.accentColor.length === 0) {
    return { ok: false, message: '`accentColor` is required.' };
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
      accentColor: body.accentColor,
      archivedAt: body.archivedAt,
      createdAt: body.createdAt,
      title: body.title,
      updatedAt: body.updatedAt,
    },
  };
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function rowToBookMetadata(book: BookMetadataRow) {
  return {
    accentColor: book.accent_color,
    archivedAt: book.archived_at,
    createdAt: book.created_at,
    id: book.id,
    title: book.title,
    updatedAt: book.updated_at,
  };
}
