// biome-ignore lint/nursery/noExcessiveLinesPerFile: SQLite schema and row operations stay together while the mobile store is still small.
import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  SyncQueueItem,
} from '@writer/core';
import * as SQLite from 'expo-sqlite';
import {
  type BookRow,
  bookFromRow,
  type ChapterRow,
  chapterFromRow,
  type DocumentBodyRow,
  type DocumentRow,
  type DocumentSnapshotRow,
  type DocumentUpdateRow,
  documentFromRow,
  documentSnapshotFromRow,
  documentUpdateFromRow,
  type SyncQueueRow,
  syncQueueItemFromRow,
} from './mobile-local-store-rows';

type MobileDatabase = SQLite.SQLiteDatabase;

export interface MobileAppUiState {
  activeBookId: string | null;
  activeDocumentId: string | null;
  screen: 'book' | 'editor' | 'home';
}

export interface MobileLocalStore {
  appendDocumentUpdate(update: DocumentUpdateRecord): Promise<void>;
  enqueueSyncItem(item: SyncQueueItem): Promise<void>;
  getDocumentBody(documentId: string): Promise<string>;
  getDocumentSnapshot(snapshotId: string): Promise<DocumentSnapshotRecord | null>;
  getLatestDocumentSnapshot(documentId: string): Promise<DocumentSnapshotRecord | null>;
  getMobileAppUiState(): Promise<MobileAppUiState | null>;
  getSyncClientId(): Promise<string | null>;
  listBooks(): Promise<BookMetadata[]>;
  listChapters(): Promise<ChapterMetadata[]>;
  listDocuments(): Promise<DocumentMetadata[]>;
  listDocumentUpdates(documentId: string): Promise<DocumentUpdateRecord[]>;
  listDocumentUpdatesAfter(documentId: string, updateId: string): Promise<DocumentUpdateRecord[]>;
  listPendingSyncItems(): Promise<SyncQueueItem[]>;
  markSyncItemAttempted(itemId: string, attemptedAt: string): Promise<void>;
  markSyncItemCompleted(itemId: string, completedAt: string): Promise<void>;
  saveBook(book: BookMetadata): Promise<void>;
  saveChapter(chapter: ChapterMetadata): Promise<void>;
  saveDocumentBody(documentId: string, text: string, updatedAt: string): Promise<void>;
  saveDocumentSnapshot(snapshot: DocumentSnapshotRecord): Promise<void>;
  saveMobileAppUiState(state: MobileAppUiState): Promise<void>;
  saveSyncClientId(clientId: string): Promise<void>;
  saveDocument(document: DocumentMetadata): Promise<void>;
}

export async function openMobileLocalStore(): Promise<MobileLocalStore> {
  const database = await SQLite.openDatabaseAsync('goyo.sqlite');
  await migrate(database);

  return createMobileLocalStore(database);
}

async function migrate(database: MobileDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      accent_color TEXT NOT NULL,
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
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter_id TEXT,
      title TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'episode',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS document_bodies (
      document_id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_updates (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      update_blob BLOB NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS document_updates_document_replay_idx
      ON document_updates(document_id, created_at, id);

    CREATE TABLE IF NOT EXISTS document_snapshots (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      last_update_id TEXT,
      snapshot_blob BLOB NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS document_snapshots_latest_idx
      ON document_snapshots(document_id, created_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      record_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS sync_queue_pending_idx
      ON sync_queue(completed_at, created_at, id);

    CREATE TABLE IF NOT EXISTS sync_client_identity (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mobile_app_ui_state (
      id TEXT PRIMARY KEY,
      screen TEXT NOT NULL,
      active_book_id TEXT,
      active_document_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS chapters_book_order_idx
      ON chapters(book_id, sort_order, created_at, id);

    CREATE INDEX IF NOT EXISTS documents_book_chapter_order_idx
      ON documents(book_id, chapter_id, sort_order, created_at, id);
  `);
}

function createMobileLocalStore(database: MobileDatabase): MobileLocalStore {
  return {
    appendDocumentUpdate: (update) => appendDocumentUpdate(database, update),
    enqueueSyncItem: (item) => enqueueSyncItem(database, item),
    getDocumentBody: (documentId) => getDocumentBody(database, documentId),
    getDocumentSnapshot: (snapshotId) => getDocumentSnapshot(database, snapshotId),
    getLatestDocumentSnapshot: (documentId) => getLatestDocumentSnapshot(database, documentId),
    getMobileAppUiState: () => getMobileAppUiState(database),
    getSyncClientId: () => getSyncClientId(database),
    listBooks: () => listBooks(database),
    listChapters: () => listChapters(database),
    listDocumentUpdates: (documentId) => listDocumentUpdates(database, documentId),
    listDocumentUpdatesAfter: (documentId, updateId) =>
      listDocumentUpdatesAfter(database, documentId, updateId),
    listDocuments: () => listDocuments(database),
    listPendingSyncItems: () => listPendingSyncItems(database),
    markSyncItemAttempted: (itemId, attemptedAt) =>
      markSyncItemAttempted(database, itemId, attemptedAt),
    markSyncItemCompleted: (itemId, completedAt) =>
      markSyncItemCompleted(database, itemId, completedAt),
    saveBook: (book) => saveBook(database, book),
    saveChapter: (chapter) => saveChapter(database, chapter),
    saveDocument: (document) => saveDocument(database, document),
    saveDocumentBody: (documentId, text, updatedAt) =>
      saveDocumentBody(database, documentId, text, updatedAt),
    saveDocumentSnapshot: (snapshot) => saveDocumentSnapshot(database, snapshot),
    saveMobileAppUiState: (state) => saveMobileAppUiState(database, state),
    saveSyncClientId: (clientId) => saveSyncClientId(database, clientId),
  };
}

async function getMobileAppUiState(database: MobileDatabase): Promise<MobileAppUiState | null> {
  const row = await database.getFirstAsync<{
    active_book_id: string | null;
    active_document_id: string | null;
    screen: string;
  }>(`
    SELECT screen, active_book_id, active_document_id
    FROM mobile_app_ui_state
    WHERE id = 'default'
    LIMIT 1;
  `);

  if (!row || !isRestorableScreen(row.screen)) {
    return null;
  }

  return {
    activeBookId: row.active_book_id,
    activeDocumentId: row.active_document_id,
    screen: row.screen,
  };
}

async function saveMobileAppUiState(
  database: MobileDatabase,
  state: MobileAppUiState,
): Promise<void> {
  await database.runAsync(
    `
      INSERT INTO mobile_app_ui_state
        (id, screen, active_book_id, active_document_id, updated_at)
      VALUES ('default', ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        screen = excluded.screen,
        active_book_id = excluded.active_book_id,
        active_document_id = excluded.active_document_id,
        updated_at = excluded.updated_at;
    `,
    state.screen,
    state.activeBookId,
    state.activeDocumentId,
    new Date().toISOString(),
  );
}

function isRestorableScreen(screen: string): screen is MobileAppUiState['screen'] {
  return screen === 'book' || screen === 'editor' || screen === 'home';
}

async function getSyncClientId(database: MobileDatabase): Promise<string | null> {
  const row = await database.getFirstAsync<{ client_id: string }>(`
    SELECT client_id
    FROM sync_client_identity
    WHERE id = 'default'
    LIMIT 1;
  `);

  return row?.client_id ?? null;
}

async function saveSyncClientId(database: MobileDatabase, clientId: string): Promise<void> {
  await database.runAsync(
    `
      INSERT INTO sync_client_identity (id, client_id, created_at)
      VALUES ('default', ?, ?)
      ON CONFLICT(id) DO UPDATE SET client_id = excluded.client_id;
    `,
    clientId,
    new Date().toISOString(),
  );
}

async function saveBook(database: MobileDatabase, book: BookMetadata): Promise<void> {
  await database.runAsync(
    `
      INSERT INTO books (id, title, accent_color, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        accent_color = excluded.accent_color,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at;
    `,
    book.id,
    book.title,
    book.accentColor,
    book.createdAt,
    book.updatedAt,
    book.archivedAt,
  );
}

async function saveChapter(database: MobileDatabase, chapter: ChapterMetadata): Promise<void> {
  await database.runAsync(
    `
      INSERT INTO chapters (id, book_id, title, sort_order, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        book_id = excluded.book_id,
        title = excluded.title,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at;
    `,
    chapter.id,
    chapter.bookId,
    chapter.title,
    chapter.order,
    chapter.createdAt,
    chapter.updatedAt,
    chapter.archivedAt,
  );
}

async function saveDocument(database: MobileDatabase, document: DocumentMetadata): Promise<void> {
  await database.runAsync(
    `
      INSERT INTO documents (id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        book_id = excluded.book_id,
        chapter_id = excluded.chapter_id,
        title = excluded.title,
        kind = excluded.kind,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at;
    `,
    document.id,
    document.bookId,
    document.chapterId,
    document.title,
    document.kind,
    document.order,
    document.createdAt,
    document.updatedAt,
    document.archivedAt,
  );
}

async function saveDocumentBody(
  database: MobileDatabase,
  documentId: string,
  text: string,
  updatedAt: string,
): Promise<void> {
  await database.runAsync(
    `
      INSERT INTO document_bodies (document_id, text, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(document_id) DO UPDATE SET
        text = excluded.text,
        updated_at = excluded.updated_at;
    `,
    documentId,
    text,
    updatedAt,
  );
}

async function appendDocumentUpdate(
  database: MobileDatabase,
  update: DocumentUpdateRecord,
): Promise<void> {
  await database.runAsync(
    `
      INSERT OR IGNORE INTO document_updates (id, document_id, client_id, update_blob, created_at)
      VALUES (?, ?, ?, ?, ?);
    `,
    update.id,
    update.documentId,
    update.clientId,
    update.update,
    update.createdAt,
  );
}

async function enqueueSyncItem(database: MobileDatabase, item: SyncQueueItem): Promise<void> {
  await database.runAsync(
    `
      INSERT OR IGNORE INTO sync_queue
        (id, document_id, kind, record_id, created_at, attempts, last_attempt_at)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    item.id,
    item.documentId,
    item.kind,
    item.recordId,
    item.createdAt,
    item.attempts,
    item.lastAttemptAt,
  );
}

async function listPendingSyncItems(database: MobileDatabase): Promise<SyncQueueItem[]> {
  const rows = await database.getAllAsync<SyncQueueRow>(`
    SELECT id, document_id, kind, record_id, created_at, attempts, last_attempt_at
    FROM sync_queue
    WHERE completed_at IS NULL
    ORDER BY created_at ASC, id ASC;
  `);

  return rows.map(syncQueueItemFromRow);
}

async function markSyncItemCompleted(
  database: MobileDatabase,
  itemId: string,
  completedAt: string,
): Promise<void> {
  await database.runAsync(
    `
      UPDATE sync_queue
      SET completed_at = ?
      WHERE id = ?;
    `,
    completedAt,
    itemId,
  );
}

async function markSyncItemAttempted(
  database: MobileDatabase,
  itemId: string,
  attemptedAt: string,
): Promise<void> {
  await database.runAsync(
    `
      UPDATE sync_queue
      SET attempts = attempts + 1,
        last_attempt_at = ?
      WHERE id = ?;
    `,
    attemptedAt,
    itemId,
  );
}

async function getDocumentBody(database: MobileDatabase, documentId: string): Promise<string> {
  const row = await database.getFirstAsync<DocumentBodyRow>(
    `
      SELECT text
      FROM document_bodies
      WHERE document_id = ?;
    `,
    documentId,
  );

  return row?.text ?? '';
}

async function listBooks(database: MobileDatabase): Promise<BookMetadata[]> {
  const rows = await database.getAllAsync<BookRow>(`
    SELECT id, title, accent_color, created_at, updated_at, archived_at
    FROM books
    WHERE archived_at IS NULL
    ORDER BY updated_at DESC, title ASC;
  `);

  return rows.map(bookFromRow);
}

async function listChapters(database: MobileDatabase): Promise<ChapterMetadata[]> {
  const rows = await database.getAllAsync<ChapterRow>(`
    SELECT id, book_id, title, sort_order, created_at, updated_at, archived_at
    FROM chapters
    WHERE archived_at IS NULL
    ORDER BY book_id ASC, sort_order ASC, created_at ASC;
  `);

  return rows.map(chapterFromRow);
}

async function listDocuments(database: MobileDatabase): Promise<DocumentMetadata[]> {
  const rows = await database.getAllAsync<DocumentRow>(`
    SELECT id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
    FROM documents
    WHERE archived_at IS NULL
    ORDER BY book_id ASC, chapter_id ASC, sort_order ASC, created_at ASC;
  `);

  return rows.map(documentFromRow);
}

async function listDocumentUpdates(
  database: MobileDatabase,
  documentId: string,
): Promise<DocumentUpdateRecord[]> {
  const rows = await database.getAllAsync<DocumentUpdateRow>(
    `
      SELECT id, document_id, client_id, update_blob, created_at
      FROM document_updates
      WHERE document_id = ?
      ORDER BY created_at ASC, id ASC;
    `,
    documentId,
  );

  return rows.map(documentUpdateFromRow);
}

async function listDocumentUpdatesAfter(
  database: MobileDatabase,
  documentId: string,
  updateId: string,
): Promise<DocumentUpdateRecord[]> {
  const updates = await listDocumentUpdates(database, documentId);
  const updateIndex = updates.findIndex((update) => update.id === updateId);

  return updateIndex === -1 ? updates : updates.slice(updateIndex + 1);
}

async function getLatestDocumentSnapshot(
  database: MobileDatabase,
  documentId: string,
): Promise<DocumentSnapshotRecord | null> {
  const row = await database.getFirstAsync<DocumentSnapshotRow>(
    `
      SELECT id, document_id, last_update_id, snapshot_blob, created_at
      FROM document_snapshots
      WHERE document_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1;
    `,
    documentId,
  );

  return row ? documentSnapshotFromRow(row) : null;
}

async function getDocumentSnapshot(
  database: MobileDatabase,
  snapshotId: string,
): Promise<DocumentSnapshotRecord | null> {
  const row = await database.getFirstAsync<DocumentSnapshotRow>(
    `
      SELECT id, document_id, last_update_id, snapshot_blob, created_at
      FROM document_snapshots
      WHERE id = ?
      LIMIT 1;
    `,
    snapshotId,
  );

  return row ? documentSnapshotFromRow(row) : null;
}

async function saveDocumentSnapshot(
  database: MobileDatabase,
  snapshot: DocumentSnapshotRecord,
): Promise<void> {
  await database.runAsync(
    `
      INSERT INTO document_snapshots (id, document_id, last_update_id, snapshot_blob, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        last_update_id = excluded.last_update_id,
        snapshot_blob = excluded.snapshot_blob,
        created_at = excluded.created_at;
    `,
    snapshot.id,
    snapshot.documentId,
    snapshot.lastUpdateId,
    snapshot.snapshot,
    snapshot.createdAt,
  );
}
