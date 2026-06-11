import { Buffer } from 'node:buffer'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DocumentMetadata, DocumentUpdateRecord } from '@writer/core'
import Database from 'better-sqlite3'

interface DocumentMetadataRow {
  id: string
  title: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

interface DocumentUpdateRow {
  id: string
  document_id: string
  client_id: string
  update_blob: Buffer
  created_at: string
}

export interface DesktopLocalStore {
  appendDocumentUpdate(update: DocumentUpdateRecord): void
  listDocuments(): DocumentMetadata[]
  listDocumentUpdates(documentId: string): DocumentUpdateRecord[]
  saveDocument(document: DocumentMetadata): void
}

export function createDesktopLocalStore(userDataPath: string): DesktopLocalStore {
  const databasePath = join(userDataPath, 'writer.sqlite')

  mkdirSync(dirname(databasePath), { recursive: true })

  const database = new Database(databasePath)
  database.pragma('journal_mode = WAL')
  database.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
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
  `)

  const listDocumentsStatement = database.prepare(`
    SELECT id, title, created_at, updated_at, archived_at
    FROM documents
    WHERE archived_at IS NULL
    ORDER BY updated_at DESC;
  `)
  const saveDocumentStatement = database.prepare(`
    INSERT INTO documents (id, title, created_at, updated_at, archived_at)
    VALUES (@id, @title, @createdAt, @updatedAt, @archivedAt)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      updated_at = excluded.updated_at,
      archived_at = excluded.archived_at;
  `)
  const listDocumentUpdatesStatement = database.prepare(`
    SELECT id, document_id, client_id, update_blob, created_at
    FROM document_updates
    WHERE document_id = ?
    ORDER BY created_at ASC, id ASC;
  `)
  const appendDocumentUpdateStatement = database.prepare(`
    INSERT OR IGNORE INTO document_updates (id, document_id, client_id, update_blob, created_at)
    VALUES (@id, @documentId, @clientId, @update, @createdAt);
  `)

  return {
    appendDocumentUpdate(update) {
      appendDocumentUpdateStatement.run({
        ...update,
        update: Buffer.from(update.update),
      })
    },
    listDocuments() {
      return listDocumentsStatement.all().map(rowToDocumentMetadata)
    },
    listDocumentUpdates(documentId) {
      return listDocumentUpdatesStatement.all(documentId).map(rowToDocumentUpdateRecord)
    },
    saveDocument(document) {
      saveDocumentStatement.run(document)
    },
  }
}

function rowToDocumentUpdateRecord(row: unknown): DocumentUpdateRecord {
  const update = row as DocumentUpdateRow

  return {
    clientId: update.client_id,
    createdAt: update.created_at,
    documentId: update.document_id,
    id: update.id,
    update: new Uint8Array(update.update_blob),
  }
}

function rowToDocumentMetadata(row: unknown): DocumentMetadata {
  const document = row as DocumentMetadataRow

  return {
    archivedAt: document.archived_at,
    createdAt: document.created_at,
    id: document.id,
    title: document.title,
    updatedAt: document.updated_at,
  }
}
