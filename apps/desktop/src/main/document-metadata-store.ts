import { Buffer } from 'node:buffer';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  BookMetadata,
  ChapterMetadata,
  DocumentKind,
  DocumentMetadata,
  DocumentUpdateRecord,
} from '@writer/core';
import { DEFAULT_BOOK_ACCENT_COLOR } from '@writer/core';
import Database from 'better-sqlite3';

const DEFAULT_BOOK_ID = 'book_default';
const DEFAULT_BOOK_TITLE = 'Untitled book';
const DEFAULT_CHAPTER_ID = 'chapter_default';
const DEFAULT_CHAPTER_TITLE = 'Untitled chapter';

interface BookMetadataRow {
  accent_color: string | null;
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface ChapterMetadataRow {
  id: string;
  book_id: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface DocumentMetadataRow {
  id: string;
  book_id: string;
  chapter_id: string;
  title: string;
  kind: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

interface DocumentUpdateRow {
  id: string;
  document_id: string;
  client_id: string;
  update_blob: Buffer;
  created_at: string;
}

interface SerializedDocumentUpdateRecord extends Omit<DocumentUpdateRecord, 'update'> {
  update: ArrayBuffer | ArrayLike<number> | Uint8Array;
}

export interface DesktopLocalStore {
  appendDocumentUpdate(update: SerializedDocumentUpdateRecord): void;
  listBooks(): BookMetadata[];
  listChapters(): ChapterMetadata[];
  listDocuments(): DocumentMetadata[];
  listDocumentUpdates(documentId: string): DocumentUpdateRecord[];
  saveBook(book: BookMetadata): void;
  saveChapter(chapter: ChapterMetadata): void;
  saveDocument(document: DocumentMetadata): void;
}

export function createDesktopLocalStore(userDataPath: string): DesktopLocalStore {
  const databasePath = join(userDataPath, 'writer.sqlite');

  mkdirSync(dirname(databasePath), { recursive: true });

  const database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_updates (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      update_blob BLOB NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS document_updates_document_replay_idx
      ON document_updates(document_id, created_at, id);
  `);

  ensureDocumentColumn(database, 'book_id', `TEXT NOT NULL DEFAULT '${DEFAULT_BOOK_ID}'`);
  ensureDocumentColumn(database, 'chapter_id', `TEXT NOT NULL DEFAULT '${DEFAULT_CHAPTER_ID}'`);
  ensureDocumentColumn(database, 'kind', "TEXT NOT NULL DEFAULT 'episode'");
  ensureDocumentColumn(database, 'sort_order', 'INTEGER NOT NULL DEFAULT 0');
  ensureBookColumn(
    database,
    'accent_color',
    `TEXT NOT NULL DEFAULT '${DEFAULT_BOOK_ACCENT_COLOR}'`,
  );
  ensureDefaultBook(database);
  ensureDefaultChapter(database);

  const listBooksStatement = database.prepare(`
    SELECT id, title, accent_color, created_at, updated_at, archived_at
    FROM books
    WHERE archived_at IS NULL
    ORDER BY updated_at DESC, title ASC;
  `);
  const saveBookStatement = database.prepare(`
    INSERT INTO books (id, title, accent_color, created_at, updated_at, archived_at)
    VALUES (@id, @title, @accentColor, @createdAt, @updatedAt, @archivedAt)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      accent_color = excluded.accent_color,
      updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  `);

  const listChaptersStatement = database.prepare(`
    SELECT id, book_id, title, sort_order, created_at, updated_at, archived_at
    FROM chapters
    WHERE archived_at IS NULL
    ORDER BY book_id ASC, sort_order ASC, created_at ASC;
  `);
  const saveChapterStatement = database.prepare(`
    INSERT INTO chapters (id, book_id, title, sort_order, created_at, updated_at, archived_at)
    VALUES (@id, @bookId, @title, @order, @createdAt, @updatedAt, @archivedAt)
    ON CONFLICT(id) DO UPDATE SET
      book_id = excluded.book_id,
      title = excluded.title,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  `);

  const listDocumentsStatement = database.prepare(`
    SELECT id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
    FROM documents
    WHERE archived_at IS NULL
    ORDER BY book_id ASC, chapter_id ASC, sort_order ASC, created_at ASC;
  `);
  const saveDocumentStatement = database.prepare(`
    INSERT INTO documents (id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at)
    VALUES (@id, @bookId, @chapterId, @title, @kind, @order, @createdAt, @updatedAt, @archivedAt)
    ON CONFLICT(id) DO UPDATE SET
      book_id = excluded.book_id,
      chapter_id = excluded.chapter_id,
      title = excluded.title,
      kind = excluded.kind,
      sort_order = excluded.sort_order,
      updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  `);
  const listDocumentUpdatesStatement = database.prepare(`
    SELECT id, document_id, client_id, update_blob, created_at
    FROM document_updates
    WHERE document_id = ?
    ORDER BY created_at ASC, id ASC;
  `);
  const appendDocumentUpdateStatement = database.prepare(`
    INSERT OR IGNORE INTO document_updates (id, document_id, client_id, update_blob, created_at)
    VALUES (@id, @documentId, @clientId, @update, @createdAt);
  `);

  return {
    appendDocumentUpdate(update) {
      appendDocumentUpdateStatement.run({
        ...update,
        update: toUpdateBuffer(update.update),
      });
    },
    listBooks() {
      return listBooksStatement.all().map(rowToBookMetadata);
    },
    listChapters() {
      return listChaptersStatement.all().map(rowToChapterMetadata);
    },
    listDocuments() {
      return listDocumentsStatement.all().map(rowToDocumentMetadata);
    },
    listDocumentUpdates(documentId) {
      return listDocumentUpdatesStatement.all(documentId).map(rowToDocumentUpdateRecord);
    },
    saveBook(book) {
      saveBookStatement.run(book);
    },
    saveChapter(chapter) {
      saveChapterStatement.run(chapter);
    },
    saveDocument(document) {
      saveDocumentStatement.run(document);
    },
  };
}

function ensureDocumentColumn(
  database: Database.Database,
  columnName: string,
  columnDefinition: string,
) {
  const columns = database.pragma('table_info(documents)') as Array<{ name: string }>;

  if (columns.some(({ name }) => name === columnName)) {
    return;
  }

  database.exec(`ALTER TABLE documents ADD COLUMN ${columnName} ${columnDefinition};`);
}

function ensureBookColumn(
  database: Database.Database,
  columnName: string,
  columnDefinition: string,
) {
  const columns = database.pragma('table_info(books)') as Array<{ name: string }>;

  if (columns.some(({ name }) => name === columnName)) {
    return;
  }

  database.exec(`ALTER TABLE books ADD COLUMN ${columnName} ${columnDefinition};`);
}

function ensureDefaultBook(database: Database.Database) {
  const timestampRow = database
    .prepare('SELECT MIN(created_at) AS created_at FROM documents;')
    .get() as { created_at: string | null } | undefined;
  const now = timestampRow?.created_at ?? new Date().toISOString();

  database
    .prepare(`
      INSERT OR IGNORE INTO books (id, title, accent_color, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, NULL);
    `)
    .run(DEFAULT_BOOK_ID, DEFAULT_BOOK_TITLE, DEFAULT_BOOK_ACCENT_COLOR, now, now);
}

function ensureDefaultChapter(database: Database.Database) {
  const timestampRow = database
    .prepare('SELECT MIN(created_at) AS created_at FROM documents;')
    .get() as { created_at: string | null } | undefined;
  const now = timestampRow?.created_at ?? new Date().toISOString();

  database
    .prepare(`
      INSERT OR IGNORE INTO chapters (id, book_id, title, sort_order, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, 0, ?, ?, NULL);
    `)
    .run(DEFAULT_CHAPTER_ID, DEFAULT_BOOK_ID, DEFAULT_CHAPTER_TITLE, now, now);
}

function toUpdateBuffer(update: SerializedDocumentUpdateRecord['update']): Buffer {
  if (update instanceof Uint8Array) {
    return Buffer.from(update);
  }

  if (update instanceof ArrayBuffer) {
    return Buffer.from(update);
  }

  return Buffer.from(Array.from(update));
}

function rowToDocumentUpdateRecord(row: unknown): DocumentUpdateRecord {
  const update = row as DocumentUpdateRow;

  return {
    clientId: update.client_id,
    createdAt: update.created_at,
    documentId: update.document_id,
    id: update.id,
    update: new Uint8Array(update.update_blob),
  };
}

function rowToDocumentMetadata(row: unknown): DocumentMetadata {
  const document = row as DocumentMetadataRow;

  return {
    archivedAt: document.archived_at,
    bookId: document.book_id,
    chapterId: document.chapter_id,
    createdAt: document.created_at,
    id: document.id,
    kind: normalizeDocumentKind(document.kind),
    order: document.sort_order,
    title: document.title,
    updatedAt: document.updated_at,
  };
}

function rowToChapterMetadata(row: unknown): ChapterMetadata {
  const chapter = row as ChapterMetadataRow;

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

function rowToBookMetadata(row: unknown): BookMetadata {
  const book = row as BookMetadataRow;

  return {
    accentColor: book.accent_color ?? DEFAULT_BOOK_ACCENT_COLOR,
    archivedAt: book.archived_at,
    createdAt: book.created_at,
    id: book.id,
    title: book.title,
    updatedAt: book.updated_at,
  };
}

function normalizeDocumentKind(kind: string): DocumentKind {
  if (kind === 'draft' || kind === 'note') {
    return kind;
  }

  return 'episode';
}
