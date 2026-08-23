import type {
  BookMetadata,
  ChapterMetadata,
  DocumentMetadata,
  DocumentSnapshotRecord,
  DocumentUpdateRecord,
  SyncQueueItem,
} from '@writer/core';

export interface BookRow {
  accent_color: string;
  archived_at: string | null;
  created_at: string;
  id: string;
  title: string;
  updated_at: string;
}

export interface ChapterRow {
  archived_at: string | null;
  book_id: string;
  created_at: string;
  id: string;
  sort_order: number;
  title: string;
  updated_at: string;
}

export interface DocumentRow {
  archived_at: string | null;
  book_id: string;
  chapter_id: string | null;
  created_at: string;
  id: string;
  kind: DocumentMetadata['kind'];
  sort_order: number;
  title: string;
  updated_at: string;
}

export interface DocumentBodyRow {
  text: string;
}

export interface DocumentUpdateRow {
  client_id: string;
  created_at: string;
  document_id: string;
  id: string;
  update_blob: Uint8Array;
}

export interface DocumentSnapshotRow {
  created_at: string;
  document_id: string;
  id: string;
  last_update_id: string | null;
  snapshot_blob: Uint8Array;
}

export interface SyncQueueRow {
  attempts: number;
  created_at: string;
  document_id: string;
  id: string;
  kind: SyncQueueItem['kind'];
  last_attempt_at: string | null;
  record_id: string;
}

export function bookFromRow(row: BookRow): BookMetadata {
  return {
    accentColor: row.accent_color,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    id: row.id,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export function chapterFromRow(row: ChapterRow): ChapterMetadata {
  return {
    archivedAt: row.archived_at,
    bookId: row.book_id,
    createdAt: row.created_at,
    id: row.id,
    order: row.sort_order,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export function documentFromRow(row: DocumentRow): DocumentMetadata {
  return {
    archivedAt: row.archived_at,
    bookId: row.book_id,
    chapterId: row.chapter_id,
    createdAt: row.created_at,
    id: row.id,
    kind: row.kind,
    order: row.sort_order,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export function documentUpdateFromRow(row: DocumentUpdateRow): DocumentUpdateRecord {
  return {
    clientId: row.client_id,
    createdAt: row.created_at,
    documentId: row.document_id,
    id: row.id,
    update: row.update_blob,
  };
}

export function documentSnapshotFromRow(row: DocumentSnapshotRow): DocumentSnapshotRecord {
  return {
    createdAt: row.created_at,
    documentId: row.document_id,
    id: row.id,
    lastUpdateId: row.last_update_id,
    snapshot: row.snapshot_blob,
  };
}

export function syncQueueItemFromRow(row: SyncQueueRow): SyncQueueItem {
  return {
    attempts: row.attempts,
    createdAt: row.created_at,
    documentId: row.document_id,
    id: row.id,
    kind: row.kind,
    lastAttemptAt: row.last_attempt_at,
    recordId: row.record_id,
  };
}
