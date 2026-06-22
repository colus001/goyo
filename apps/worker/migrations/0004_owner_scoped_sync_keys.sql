-- Migration number: 0004  2026-06-22T00:00:00.000Z

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS documents_migration;
DROP TABLE IF EXISTS document_updates_migration;
DROP TABLE IF EXISTS document_snapshots_migration;
DROP TABLE IF EXISTS sync_clients_migration;
DROP TABLE IF EXISTS document_updates_data_migration;
DROP TABLE IF EXISTS document_snapshots_data_migration;
DROP TABLE IF EXISTS sync_clients_data_migration;

CREATE TABLE document_updates_data_migration AS
SELECT owner_id, id, document_id, client_id, update_blob, created_at, received_at
FROM document_updates;

CREATE TABLE document_snapshots_data_migration AS
SELECT owner_id, id, document_id, last_update_id, snapshot_blob, created_at, received_at
FROM document_snapshots;

CREATE TABLE sync_clients_data_migration AS
SELECT owner_id, id, name, platform, created_at, registered_at, last_seen_at
FROM sync_clients;

CREATE TABLE documents_migration (
  owner_id TEXT NOT NULL,
  id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  chapter_id TEXT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  PRIMARY KEY (owner_id, id)
);

INSERT INTO documents_migration (
  owner_id, id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
)
SELECT owner_id, id, book_id, chapter_id, title, kind, sort_order, created_at, updated_at, archived_at
FROM documents;

DROP TABLE document_snapshots;
DROP TABLE document_updates;
DROP TABLE sync_clients;
DROP TABLE documents;

ALTER TABLE documents_migration RENAME TO documents;

CREATE TABLE document_updates (
  owner_id TEXT NOT NULL,
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  update_blob BLOB NOT NULL,
  created_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, id),
  FOREIGN KEY(owner_id, document_id) REFERENCES documents(owner_id, id) ON DELETE CASCADE
);

INSERT INTO document_updates (
  owner_id, id, document_id, client_id, update_blob, created_at, received_at
)
SELECT owner_id, id, document_id, client_id, update_blob, created_at, received_at
FROM document_updates_data_migration;

CREATE TABLE document_snapshots (
  owner_id TEXT NOT NULL,
  id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  last_update_id TEXT,
  snapshot_blob BLOB NOT NULL,
  created_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  PRIMARY KEY (owner_id, id),
  FOREIGN KEY(owner_id, document_id) REFERENCES documents(owner_id, id) ON DELETE CASCADE
);

INSERT INTO document_snapshots (
  owner_id, id, document_id, last_update_id, snapshot_blob, created_at, received_at
)
SELECT owner_id, id, document_id, last_update_id, snapshot_blob, created_at, received_at
FROM document_snapshots_data_migration;

CREATE TABLE sync_clients (
  owner_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT,
  platform TEXT,
  created_at TEXT NOT NULL,
  registered_at TEXT,
  last_seen_at TEXT,
  PRIMARY KEY (owner_id, id)
);

INSERT INTO sync_clients (
  owner_id, id, name, platform, created_at, registered_at, last_seen_at
)
SELECT owner_id, id, name, platform, created_at, registered_at, last_seen_at
FROM sync_clients_data_migration;

DROP TABLE document_updates_data_migration;
DROP TABLE document_snapshots_data_migration;
DROP TABLE sync_clients_data_migration;

CREATE INDEX IF NOT EXISTS documents_owner_idx
  ON documents(owner_id, id);

CREATE INDEX IF NOT EXISTS documents_book_order_idx
  ON documents(owner_id, book_id, chapter_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS document_updates_owner_replay_idx
  ON document_updates(owner_id, document_id, created_at, id);

CREATE INDEX IF NOT EXISTS document_snapshots_owner_latest_idx
  ON document_snapshots(owner_id, document_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS sync_clients_owner_idx
  ON sync_clients(owner_id, id);

PRAGMA foreign_keys = ON;
