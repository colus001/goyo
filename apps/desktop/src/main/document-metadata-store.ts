import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DocumentMetadata } from '@writer/core'
import Database from 'better-sqlite3'

interface DocumentMetadataRow {
  id: string
  title: string
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface DocumentMetadataStore {
  listDocuments(): DocumentMetadata[]
  saveDocument(document: DocumentMetadata): void
}

export function createDocumentMetadataStore(userDataPath: string): DocumentMetadataStore {
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

  return {
    listDocuments() {
      return listDocumentsStatement.all().map(rowToDocumentMetadata)
    },
    saveDocument(document) {
      saveDocumentStatement.run(document)
    },
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
