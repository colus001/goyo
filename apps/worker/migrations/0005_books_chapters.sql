-- Migration number: 0005  2026-06-22T00:00:00.000Z

CREATE TABLE IF NOT EXISTS books (
  owner_id TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  PRIMARY KEY (owner_id, id)
);

CREATE INDEX IF NOT EXISTS books_owner_updated_idx
  ON books(owner_id, updated_at DESC, title ASC);

CREATE TABLE IF NOT EXISTS chapters (
  owner_id TEXT NOT NULL,
  id TEXT NOT NULL,
  book_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  PRIMARY KEY (owner_id, id),
  FOREIGN KEY(owner_id, book_id) REFERENCES books(owner_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS chapters_owner_book_order_idx
  ON chapters(owner_id, book_id, sort_order, created_at);
