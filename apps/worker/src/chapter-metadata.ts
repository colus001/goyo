import type { SyncAuthContext } from './auth';
import type { EnvWithDocumentsDatabase } from './document-updates';
import { jsonError, readJsonBody, storageErrorResponse } from './http';

interface UpsertChapterMetadataRequestBody {
  archivedAt?: unknown;
  bookId?: unknown;
  createdAt?: unknown;
  order?: unknown;
  title?: unknown;
  updatedAt?: unknown;
}

interface ChapterMetadataRow {
  archived_at: string | null;
  book_id: string;
  created_at: string;
  id: string;
  sort_order: number;
  title: string;
  updated_at: string;
}

interface ValidChapterMetadataBody {
  archivedAt: string | null;
  bookId: string;
  createdAt: string;
  order: number;
  title: string;
  updatedAt: string;
}

export async function upsertChapterMetadata(
  request: Request,
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  chapterId: string,
) {
  const body = await readJsonBody<UpsertChapterMetadataRequestBody>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const validation = validateChapterMetadataBody(body.value);

  if (!validation.ok) {
    return jsonError(validation.message, 400);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO chapters (
        owner_id, id, book_id, title, sort_order, created_at, updated_at, archived_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_id, id) DO UPDATE SET
        book_id = excluded.book_id,
        title = excluded.title,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at;
    `)
      .bind(
        auth.ownerId,
        chapterId,
        validation.value.bookId,
        validation.value.title,
        validation.value.order,
        validation.value.createdAt,
        validation.value.updatedAt,
        validation.value.archivedAt,
      )
      .run();

    return Response.json({ chapterId, ok: true });
  } catch (error) {
    return storageErrorResponse(error);
  }
}

export async function getChapterMetadata(
  env: EnvWithDocumentsDatabase,
  auth: SyncAuthContext,
  chapterId: string,
) {
  const chapter = await env.DB.prepare(`
    SELECT id, book_id, title, sort_order, created_at, updated_at, archived_at
    FROM chapters
    WHERE owner_id = ? AND id = ?;
  `)
    .bind(auth.ownerId, chapterId)
    .first<ChapterMetadataRow>();

  if (!chapter) {
    return jsonError('Chapter not found.', 404);
  }

  return Response.json({ chapter: rowToChapterMetadata(chapter) });
}

export async function listChapters(env: EnvWithDocumentsDatabase, auth: SyncAuthContext) {
  const rows = await env.DB.prepare(`
    SELECT id, book_id, title, sort_order, created_at, updated_at, archived_at
    FROM chapters
    WHERE owner_id = ? AND archived_at IS NULL
    ORDER BY book_id ASC, sort_order ASC, created_at ASC;
  `)
    .bind(auth.ownerId)
    .all<ChapterMetadataRow>();

  return Response.json({ chapters: rows.results.map(rowToChapterMetadata), ok: true });
}

export function matchChapterMetadataRoute(pathname: string): { chapterId: string } | null {
  const match = /^\/v1\/chapters\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { chapterId: decodeURIComponent(match[1]) };
}

function validateChapterMetadataBody(
  body: UpsertChapterMetadataRequestBody,
): { ok: true; value: ValidChapterMetadataBody } | { ok: false; message: string } {
  if (typeof body.bookId !== 'string' || body.bookId.length === 0) {
    return { ok: false, message: '`bookId` is required.' };
  }

  if (typeof body.title !== 'string') {
    return { ok: false, message: '`title` is required.' };
  }

  if (typeof body.order !== 'number' || !Number.isFinite(body.order)) {
    return { ok: false, message: '`order` must be a finite number.' };
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
      createdAt: body.createdAt,
      order: body.order,
      title: body.title,
      updatedAt: body.updatedAt,
    },
  };
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function rowToChapterMetadata(chapter: ChapterMetadataRow) {
  return {
    archivedAt: chapter.archived_at,
    bookId: chapter.book_id,
    createdAt: chapter.created_at,
    id: chapter.id,
    order: chapter.sort_order,
    title: chapter.title,
    updatedAt: chapter.updated_at,
  };
}
