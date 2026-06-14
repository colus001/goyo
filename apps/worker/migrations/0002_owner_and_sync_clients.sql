-- Migration number: 0002  2026-06-14T16:20:00.000Z

ALTER TABLE documents ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'self';
ALTER TABLE document_updates ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'self';
ALTER TABLE document_snapshots ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'self';
ALTER TABLE sync_clients ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'self';
ALTER TABLE sync_clients ADD COLUMN name TEXT;
ALTER TABLE sync_clients ADD COLUMN platform TEXT;
ALTER TABLE sync_clients ADD COLUMN registered_at TEXT;

UPDATE sync_clients
SET registered_at = created_at
WHERE registered_at IS NULL;

CREATE INDEX IF NOT EXISTS documents_owner_idx
  ON documents(owner_id, id);

CREATE INDEX IF NOT EXISTS document_updates_owner_replay_idx
  ON document_updates(owner_id, document_id, created_at, id);

CREATE INDEX IF NOT EXISTS document_snapshots_owner_latest_idx
  ON document_snapshots(owner_id, document_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS sync_clients_owner_idx
  ON sync_clients(owner_id, id);
