-- Migration number: 0001 	 2026-06-12T03:29:54.204Z

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  chapter_id TEXT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS documents_book_order_idx
  ON documents(book_id, chapter_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS document_updates (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  update_blob BLOB NOT NULL,
  created_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS document_updates_replay_idx
  ON document_updates(document_id, created_at, id);

CREATE TABLE IF NOT EXISTS document_snapshots (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  last_update_id TEXT,
  snapshot_blob BLOB NOT NULL,
  created_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY(last_update_id) REFERENCES document_updates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS document_snapshots_latest_idx
  ON document_snapshots(document_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS sync_clients (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);
