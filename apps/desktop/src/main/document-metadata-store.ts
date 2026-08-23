// biome-ignore lint/nursery/noExcessiveLinesPerFile: This module owns the current SQLite schema and migrations until the store is split by concern.
import { Buffer } from 'node:buffer';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type {
  BookMetadata,
  ChapterMetadata,
  DocumentKind,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  LocalDocumentStore,
  RecoveryPoint,
  SyncQueueItem,
} from '@writer/core';
import { DEFAULT_BOOK_ACCENT_COLOR } from '@writer/core';
import Database from 'better-sqlite3';
import type { AppSettings } from '../shared/app-settings';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from '../shared/app-settings';
import type { AppUiState } from '../shared/app-ui-state';
import { DEFAULT_APP_UI_STATE_ID } from '../shared/app-ui-state';

const DEFAULT_BOOK_ID = 'book_default';

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
  chapter_id: string | null;
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

interface DocumentSnapshotRow {
  id: string;
  document_id: string;
  last_update_id: string | null;
  snapshot_blob: Buffer;
  created_at: string;
}

interface RecoveryPointRow {
  id: string;
  document_id: string;
  snapshot_id: string;
  kind: RecoveryPoint['kind'];
  label: string;
  created_at: string;
  update_count_at_creation: number;
}

interface SyncQueueRow {
  id: string;
  document_id: string;
  kind: SyncQueueItem['kind'];
  record_id: string;
  created_at: string;
  attempts: number;
  last_attempt_at: string | null;
  last_endpoint: string | null;
  last_error: string | null;
  last_http_status: number | null;
}

interface SyncFailureDetails {
  lastEndpoint: string | null;
  lastError: string | null;
  lastHttpStatus: number | null;
}

interface SyncFailureQueueItem extends SyncQueueItem, SyncFailureDetails {}

interface AppUiStateRow {
  state_json: string;
}

interface AppSettingsRow {
  value: string;
}

interface SerializedDocumentUpdateRecord extends Omit<DocumentUpdateRecord, 'update'> {
  update: ArrayBuffer | ArrayLike<number> | Uint8Array;
}

interface SerializedDocumentSnapshotRecord extends Omit<DocumentSnapshotRecord, 'snapshot'> {
  snapshot: ArrayBuffer | ArrayLike<number> | Uint8Array;
}

export interface DesktopLocalStore extends LocalDocumentStore {
  appendDocumentUpdate(update: SerializedDocumentUpdateRecord): void;
  close(): void;
  enqueueSyncItem(item: SyncQueueItem): void;
  getAppSettings(): AppSettings;
  getAppUiState(): AppUiState | null;
  getDocumentSnapshot(snapshotId: string): DocumentSnapshotRecord | null;
  getDocumentMetadata(documentId: string): DocumentMetadata | null;
  getLatestDocumentSnapshot(documentId: string): DocumentSnapshotRecord | null;
  getRecoveryPoint(recoveryPointId: string): RecoveryPoint | null;
  listAllBooks(): BookMetadata[];
  listAllChapters(): ChapterMetadata[];
  listAllDocuments(): DocumentMetadata[];
  listAllDocumentSnapshots(): DocumentSnapshotRecord[];
  listAllDocumentUpdates(): DocumentUpdateRecord[];
  listAllRecoveryPoints(): RecoveryPoint[];
  listAllSyncItems(): SyncQueueItem[];
  listBooks(): BookMetadata[];
  listChapters(): ChapterMetadata[];
  listArchivedDocuments(): DocumentMetadata[];
  listArchivedDocumentMetadata(): DocumentMetadata[];
  listDocuments(): DocumentMetadata[];
  listDocumentMetadata(): DocumentMetadata[];
  listDocumentSnapshots(documentId: string): DocumentSnapshotRecord[];
  listDocumentUpdates(documentId: string): DocumentUpdateRecord[];
  listDocumentUpdatesAfter(documentId: string, updateId: string): DocumentUpdateRecord[];
  listPendingSyncItems(): SyncQueueItem[];
  listRecentFailedSyncItems(limit: number): SyncFailureQueueItem[];
  listRecoveryPoints(documentId: string): RecoveryPoint[];
  markSyncItemAttempted(
    syncItemId: string,
    attemptedAt: string,
    failure?: SyncFailureDetails,
  ): void;
  markSyncItemCompleted(syncItemId: string, completedAt: string): void;
  markSyncItemsCompleted(syncItemIds: string[], completedAt: string): void;
  saveBook(book: BookMetadata): void;
  saveChapter(chapter: ChapterMetadata): void;
  saveDocument(document: DocumentMetadata): void;
  saveDocumentMetadata(document: DocumentMetadata): void;
  saveDocumentSnapshot(snapshot: SerializedDocumentSnapshotRecord): void;
  saveRecoveryPoint(point: RecoveryPoint): void;
  restoreArchivedDocument(documentId: string, restoredAt: string): void;
  restoreArchivedDocumentMetadata(documentId: string, restoredAt: string): void;
  saveAppUiState(state: AppUiState): void;
  saveAppSettings(settings: AppSettings): void;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: Schema setup and prepared statements need to stay in one SQLite initialization scope.
export function createDesktopLocalStore(userDataPath: string): DesktopLocalStore {
  const databasePath = join(userDataPath, 'goyo.sqlite');

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

    CREATE TABLE IF NOT EXISTS document_snapshots (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      last_update_id TEXT,
      snapshot_blob BLOB NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS document_snapshots_latest_idx
      ON document_snapshots(document_id, created_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS document_recovery_points (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      snapshot_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL,
      update_count_at_creation INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY(snapshot_id) REFERENCES document_snapshots(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS document_recovery_points_document_created_idx
      ON document_recovery_points(document_id, created_at DESC, id DESC);

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      record_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      completed_at TEXT,
      FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS sync_queue_pending_idx
      ON sync_queue(completed_at, created_at, id);

    CREATE TABLE IF NOT EXISTS app_ui_state (
      id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  ensureDocumentColumn(database, 'book_id', `TEXT NOT NULL DEFAULT '${DEFAULT_BOOK_ID}'`);
  ensureDocumentColumn(database, 'chapter_id', 'TEXT');
  ensureNullableDocumentChapterId(database);
  ensureDocumentColumn(database, 'kind', "TEXT NOT NULL DEFAULT 'episode'");
  ensureDocumentColumn(database, 'sort_order', 'INTEGER NOT NULL DEFAULT 0');
  ensureSnapshotColumn(database, 'last_update_id', 'TEXT');
  ensureSyncQueueColumn(database, 'last_error', 'TEXT');
  ensureSyncQueueColumn(database, 'last_http_status', 'INTEGER');
  ensureSyncQueueColumn(database, 'last_endpoint', 'TEXT');
  ensureBookColumn(
    database,
    'accent_color',
    `TEXT NOT NULL DEFAULT '${DEFAULT_BOOK_ACCENT_COLOR}'`,
  );
  ensureDocumentListIndexes(database);

  const listBooksStatement = database.prepare(`
    SELECT id, title, accent_color, created_at, updated_at, archived_at
    FROM books
    WHERE archived_at IS NULL
    ORDER BY updated_at DESC, title ASC;
  `);
  const listAllBooksStatement = database.prepare(`
    SELECT id, title, accent_color, created_at, updated_at, archived_at
    FROM books
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
  const listAllChaptersStatement = database.prepare(`
    SELECT id, book_id, title, sort_order, created_at, updated_at, archived_at
    FROM chapters
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
  const listAllDocumentsStatement = database.prepare(`
    SELECT id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
    FROM documents
    ORDER BY book_id ASC, chapter_id ASC, sort_order ASC, created_at ASC;
  `);
  const listArchivedDocumentsStatement = database.prepare(`
    SELECT id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
    FROM documents
    WHERE archived_at IS NOT NULL
    ORDER BY archived_at DESC, updated_at DESC, title ASC;
  `);
  const getDocumentStatement = database.prepare(`
    SELECT id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
    FROM documents
    WHERE id = ?;
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
  const restoreArchivedDocumentStatement = database.prepare(`
    UPDATE documents
    SET archived_at = NULL,
      updated_at = @restoredAt
    WHERE id = @documentId;
  `);
  const listDocumentUpdatesStatement = database.prepare(`
    SELECT id, document_id, client_id, update_blob, created_at
    FROM document_updates
    WHERE document_id = ?
    ORDER BY created_at ASC, id ASC;
  `);
  const listAllDocumentUpdatesStatement = database.prepare(`
    SELECT id, document_id, client_id, update_blob, created_at
    FROM document_updates
    ORDER BY document_id ASC, created_at ASC, id ASC;
  `);
  const listDocumentUpdatesAfterStatement = database.prepare(`
    WITH checkpoint AS (
      SELECT created_at, id
      FROM document_updates
      WHERE document_id = @documentId AND id = @updateId
    )
    SELECT updates.id, updates.document_id, updates.client_id, updates.update_blob, updates.created_at
    FROM document_updates updates
    LEFT JOIN checkpoint ON TRUE
    WHERE updates.document_id = @documentId
      AND (
        checkpoint.id IS NULL
        OR updates.created_at > checkpoint.created_at
        OR (updates.created_at = checkpoint.created_at AND updates.id > checkpoint.id)
      )
    ORDER BY updates.created_at ASC, updates.id ASC;
  `);
  const appendDocumentUpdateStatement = database.prepare(`
    INSERT OR IGNORE INTO document_updates (id, document_id, client_id, update_blob, created_at)
    VALUES (@id, @documentId, @clientId, @update, @createdAt);
  `);
  const saveDocumentSnapshotStatement = database.prepare(`
    INSERT INTO document_snapshots (
      id, document_id, last_update_id, snapshot_blob, created_at
    )
    VALUES (@id, @documentId, @lastUpdateId, @snapshot, @createdAt)
    ON CONFLICT(id) DO UPDATE SET
      document_id = excluded.document_id,
      last_update_id = excluded.last_update_id,
      snapshot_blob = excluded.snapshot_blob,
      created_at = excluded.created_at;
  `);
  const getLatestDocumentSnapshotStatement = database.prepare(`
    SELECT id, document_id, last_update_id, snapshot_blob, created_at
    FROM document_snapshots
    WHERE document_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  `);
  const listDocumentSnapshotsStatement = database.prepare(`
    SELECT id, document_id, last_update_id, snapshot_blob, created_at
    FROM document_snapshots
    WHERE document_id = ?
    ORDER BY created_at DESC, id DESC;
  `);
  const listAllDocumentSnapshotsStatement = database.prepare(`
    SELECT id, document_id, last_update_id, snapshot_blob, created_at
    FROM document_snapshots
    ORDER BY document_id ASC, created_at DESC, id DESC;
  `);
  const getDocumentSnapshotStatement = database.prepare(`
    SELECT id, document_id, last_update_id, snapshot_blob, created_at
    FROM document_snapshots
    WHERE id = ?;
  `);
  const saveRecoveryPointStatement = database.prepare(`
    INSERT OR IGNORE INTO document_recovery_points (
      id, document_id, snapshot_id, kind, label, created_at, update_count_at_creation
    )
    VALUES (
      @id, @documentId, @snapshotId, @kind, @label, @createdAt, @updateCountAtCreation
    );
  `);
  const listRecoveryPointsStatement = database.prepare(`
    SELECT id, document_id, snapshot_id, kind, label, created_at, update_count_at_creation
    FROM document_recovery_points
    WHERE document_id = ?
    ORDER BY created_at DESC, id DESC;
  `);
  const listAllRecoveryPointsStatement = database.prepare(`
    SELECT id, document_id, snapshot_id, kind, label, created_at, update_count_at_creation
    FROM document_recovery_points
    ORDER BY document_id ASC, created_at DESC, id DESC;
  `);
  const getRecoveryPointStatement = database.prepare(`
    SELECT id, document_id, snapshot_id, kind, label, created_at, update_count_at_creation
    FROM document_recovery_points
    WHERE id = ?;
  `);
  const enqueueSyncItemStatement = database.prepare(`
    INSERT OR IGNORE INTO sync_queue (
      id, document_id, kind, record_id, created_at, attempts, last_attempt_at, completed_at
    )
    VALUES (@id, @documentId, @kind, @recordId, @createdAt, @attempts, @lastAttemptAt, NULL);
  `);
  const listPendingSyncItemsStatement = database.prepare(`
    SELECT id, document_id, kind, record_id, created_at, attempts, last_attempt_at
    FROM sync_queue
    WHERE completed_at IS NULL
    ORDER BY created_at ASC, id ASC;
  `);
  const listAllSyncItemsStatement = database.prepare(`
    SELECT id, document_id, kind, record_id, created_at, attempts, last_attempt_at
      FROM sync_queue
      ORDER BY created_at ASC, id ASC;
  `);
  const listRecentFailedSyncItemsStatement = database.prepare(`
    SELECT id, document_id, kind, record_id, created_at, attempts, last_attempt_at,
      last_error, last_http_status, last_endpoint
    FROM sync_queue
    WHERE completed_at IS NULL AND attempts >= 3
    ORDER BY last_attempt_at DESC, created_at DESC, id DESC
    LIMIT @limit;
  `);
  const markSyncItemCompletedStatement = database.prepare(`
    UPDATE sync_queue
    SET completed_at = @completedAt
    WHERE id = @syncItemId;
  `);
  const markSyncItemsCompletedTransaction = database.transaction(
    (syncItemIds: string[], completedAt: string) => {
      for (const syncItemId of syncItemIds) {
        markSyncItemCompletedStatement.run({ completedAt, syncItemId });
      }
    },
  );
  const markSyncItemAttemptedStatement = database.prepare(`
    UPDATE sync_queue
    SET attempts = attempts + 1,
      last_attempt_at = @attemptedAt,
      last_error = COALESCE(@lastError, last_error),
      last_http_status = COALESCE(@lastHttpStatus, last_http_status),
      last_endpoint = COALESCE(@lastEndpoint, last_endpoint)
    WHERE id = @syncItemId;
  `);
  const getAppUiStateStatement = database.prepare(`
    SELECT state_json
    FROM app_ui_state
    WHERE id = ?;
  `);
  const saveAppUiStateStatement = database.prepare(`
    INSERT INTO app_ui_state (id, state_json, updated_at)
    VALUES (@id, @stateJson, @updatedAt)
    ON CONFLICT(id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = excluded.updated_at;
  `);
  const getAppSettingsStatement = database.prepare(`
    SELECT value
    FROM app_settings
    WHERE key = 'app';
  `);
  const saveAppSettingsStatement = database.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('app', @value, @updatedAt)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at;
  `);
  return {
    appendDocumentUpdate(update) {
      appendDocumentUpdateStatement.run({
        ...update,
        update: toUpdateBuffer(update.update),
      });
    },
    close() {
      database.close();
    },
    enqueueSyncItem(item) {
      enqueueSyncItemStatement.run(item);
    },
    getAppSettings() {
      const row = getAppSettingsStatement.get();

      return row ? rowToAppSettings(row) : DEFAULT_APP_SETTINGS;
    },
    getAppUiState() {
      const row = getAppUiStateStatement.get(DEFAULT_APP_UI_STATE_ID);

      return row ? rowToAppUiState(row) : null;
    },
    getDocumentSnapshot(snapshotId) {
      const row = getDocumentSnapshotStatement.get(snapshotId);

      return row ? rowToDocumentSnapshotRecord(row) : null;
    },
    getDocumentMetadata(documentId) {
      const row = getDocumentStatement.get(documentId);

      return row ? rowToDocumentMetadata(row) : null;
    },
    getLatestDocumentSnapshot(documentId) {
      const row = getLatestDocumentSnapshotStatement.get(documentId);

      return row ? rowToDocumentSnapshotRecord(row) : null;
    },
    getRecoveryPoint(recoveryPointId) {
      const row = getRecoveryPointStatement.get(recoveryPointId);

      return row ? rowToRecoveryPoint(row) : null;
    },
    listAllBooks() {
      return listAllBooksStatement.all().map(rowToBookMetadata);
    },
    listAllChapters() {
      return listAllChaptersStatement.all().map(rowToChapterMetadata);
    },
    listAllDocuments() {
      return listAllDocumentsStatement.all().map(rowToDocumentMetadata);
    },
    listAllDocumentSnapshots() {
      return listAllDocumentSnapshotsStatement.all().map(rowToDocumentSnapshotRecord);
    },
    listAllDocumentUpdates() {
      return listAllDocumentUpdatesStatement.all().map(rowToDocumentUpdateRecord);
    },
    listAllRecoveryPoints() {
      return listAllRecoveryPointsStatement.all().map(rowToRecoveryPoint);
    },
    listAllSyncItems() {
      return listAllSyncItemsStatement.all().map(rowToSyncQueueItem);
    },
    listArchivedDocuments() {
      return listArchivedDocumentsStatement.all().map(rowToDocumentMetadata);
    },
    listArchivedDocumentMetadata() {
      return listArchivedDocumentsStatement.all().map(rowToDocumentMetadata);
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
    listDocumentMetadata() {
      return listDocumentsStatement.all().map(rowToDocumentMetadata);
    },
    listDocumentSnapshots(documentId) {
      return listDocumentSnapshotsStatement.all(documentId).map(rowToDocumentSnapshotRecord);
    },
    listDocumentUpdates(documentId) {
      return listDocumentUpdatesStatement.all(documentId).map(rowToDocumentUpdateRecord);
    },
    listDocumentUpdatesAfter(documentId, updateId) {
      return listDocumentUpdatesAfterStatement
        .all({ documentId, updateId })
        .map(rowToDocumentUpdateRecord);
    },
    listPendingSyncItems() {
      return listPendingSyncItemsStatement.all().map(rowToSyncQueueItem);
    },
    listRecentFailedSyncItems(limit) {
      return listRecentFailedSyncItemsStatement.all({ limit }).map(rowToSyncFailureQueueItem);
    },
    listRecoveryPoints(documentId) {
      return listRecoveryPointsStatement.all(documentId).map(rowToRecoveryPoint);
    },
    markSyncItemAttempted(syncItemId, attemptedAt, failure) {
      markSyncItemAttemptedStatement.run({
        attemptedAt,
        lastEndpoint: failure?.lastEndpoint ?? null,
        lastError: failure?.lastError ?? null,
        lastHttpStatus: failure?.lastHttpStatus ?? null,
        syncItemId,
      });
    },
    markSyncItemCompleted(syncItemId, completedAt) {
      markSyncItemCompletedStatement.run({ completedAt, syncItemId });
    },
    markSyncItemsCompleted(syncItemIds, completedAt) {
      markSyncItemsCompletedTransaction(syncItemIds, completedAt);
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
    saveDocumentMetadata(document) {
      saveDocumentStatement.run(document);
    },
    saveDocumentSnapshot(snapshot) {
      saveDocumentSnapshotStatement.run({
        ...snapshot,
        snapshot: toUpdateBuffer(snapshot.snapshot),
      });
    },
    saveRecoveryPoint(point) {
      saveRecoveryPointStatement.run(point);
    },
    restoreArchivedDocument(documentId, restoredAt) {
      restoreArchivedDocumentStatement.run({ documentId, restoredAt });
    },
    restoreArchivedDocumentMetadata(documentId, restoredAt) {
      restoreArchivedDocumentStatement.run({ documentId, restoredAt });
    },
    saveAppUiState(state) {
      saveAppUiStateStatement.run({
        id: DEFAULT_APP_UI_STATE_ID,
        stateJson: JSON.stringify(state),
        updatedAt: state.updatedAt,
      });
    },
    saveAppSettings(settings) {
      saveAppSettingsStatement.run({
        updatedAt: new Date().toISOString(),
        value: JSON.stringify(settings),
      });
    },
  };
}

function rowToAppSettings(row: unknown): AppSettings {
  let settings: Partial<AppSettings>;

  try {
    settings = JSON.parse((row as AppSettingsRow).value) as Partial<AppSettings>;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }

  return normalizeAppSettings(settings);
}

function rowToAppUiState(row: unknown): AppUiState | null {
  let state: Partial<AppUiState>;

  try {
    state = JSON.parse((row as AppUiStateRow).state_json) as Partial<AppUiState>;
  } catch {
    return null;
  }

  if (state.lastScreen !== 'book' && state.lastScreen !== 'library') {
    return null;
  }

  return {
    activeBookId: typeof state.activeBookId === 'string' ? state.activeBookId : null,
    activeChapterId: typeof state.activeChapterId === 'string' ? state.activeChapterId : null,
    activeDocumentId: typeof state.activeDocumentId === 'string' ? state.activeDocumentId : null,
    expandedChapterIds: Array.isArray(state.expandedChapterIds)
      ? state.expandedChapterIds.filter((id): id is string => typeof id === 'string')
      : [],
    isSidebarCollapsed: state.isSidebarCollapsed === true,
    lastScreen: state.lastScreen,
    updatedAt: typeof state.updatedAt === 'string' ? state.updatedAt : new Date().toISOString(),
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

function ensureNullableDocumentChapterId(database: Database.Database) {
  const columns = database.pragma('table_info(documents)') as Array<{
    name: string;
    notnull: number;
  }>;
  const chapterColumn = columns.find(({ name }) => name === 'chapter_id');

  if (!chapterColumn || chapterColumn.notnull === 0) {
    return;
  }

  database.exec(`
    PRAGMA foreign_keys = OFF;
    CREATE TABLE documents_migration (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT,
      book_id TEXT NOT NULL DEFAULT '${DEFAULT_BOOK_ID}',
      chapter_id TEXT,
      kind TEXT NOT NULL DEFAULT 'episode',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    INSERT INTO documents_migration (
      id, title, created_at, updated_at, archived_at, book_id, chapter_id, kind, sort_order
    )
    SELECT id, title, created_at, updated_at, archived_at, book_id, chapter_id, kind, sort_order
    FROM documents;
    DROP TABLE documents;
    ALTER TABLE documents_migration RENAME TO documents;
    PRAGMA foreign_keys = ON;
  `);
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

function ensureDocumentListIndexes(database: Database.Database) {
  database.exec(`
    CREATE INDEX IF NOT EXISTS documents_active_list_idx
      ON documents(archived_at, book_id, chapter_id, sort_order, created_at, id);

    CREATE INDEX IF NOT EXISTS documents_archived_list_idx
      ON documents(archived_at DESC, updated_at DESC, title ASC, id);
  `);
}

function ensureSnapshotColumn(
  database: Database.Database,
  columnName: string,
  columnDefinition: string,
) {
  const columns = database.pragma('table_info(document_snapshots)') as Array<{ name: string }>;

  if (columns.some(({ name }) => name === columnName)) {
    return;
  }

  database.exec(`ALTER TABLE document_snapshots ADD COLUMN ${columnName} ${columnDefinition};`);
}

function ensureSyncQueueColumn(
  database: Database.Database,
  columnName: string,
  columnDefinition: string,
) {
  const columns = database.pragma('table_info(sync_queue)') as Array<{ name: string }>;

  if (columns.some(({ name }) => name === columnName)) {
    return;
  }

  database.exec(`ALTER TABLE sync_queue ADD COLUMN ${columnName} ${columnDefinition};`);
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

function rowToDocumentSnapshotRecord(row: unknown): DocumentSnapshotRecord {
  const snapshot = row as DocumentSnapshotRow;

  return {
    createdAt: snapshot.created_at,
    documentId: snapshot.document_id,
    id: snapshot.id,
    lastUpdateId: snapshot.last_update_id,
    snapshot: new Uint8Array(snapshot.snapshot_blob),
  };
}

function rowToRecoveryPoint(row: unknown): RecoveryPoint {
  const point = row as RecoveryPointRow;

  return {
    createdAt: point.created_at,
    documentId: point.document_id,
    id: point.id,
    kind: normalizeRecoveryPointKind(point.kind),
    label: point.label,
    snapshotId: point.snapshot_id,
    updateCountAtCreation: point.update_count_at_creation,
  };
}

function normalizeRecoveryPointKind(kind: string): RecoveryPoint['kind'] {
  if (kind === 'manual-restore-point' || kind === 'remote-snapshot') {
    return kind;
  }

  return 'automatic-checkpoint';
}

function rowToSyncQueueItem(row: unknown): SyncQueueItem {
  const item = row as SyncQueueRow;

  return {
    attempts: item.attempts,
    createdAt: item.created_at,
    documentId: item.document_id,
    id: item.id,
    kind: item.kind,
    lastAttemptAt: item.last_attempt_at,
    recordId: item.record_id,
  };
}

function rowToSyncFailureQueueItem(row: unknown): SyncFailureQueueItem {
  const item = row as SyncQueueRow;

  return {
    ...rowToSyncQueueItem(row),
    lastEndpoint: item.last_endpoint,
    lastError: item.last_error,
    lastHttpStatus: item.last_http_status,
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
