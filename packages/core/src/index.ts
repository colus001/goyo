export type { BookMetadata, CreateBookMetadataInput, RenameBookInput } from './books';
export {
  createBookMetadata,
  createQuickDraftsBook,
  DEFAULT_BOOK_ACCENT_COLOR,
  QUICK_DRAFTS_ACCENT_COLOR,
  QUICK_DRAFTS_BOOK_ID,
  QUICK_DRAFTS_BOOK_TITLE,
  renameBook,
} from './books';
export type { ChapterMetadata, CreateChapterMetadataInput, RenameChapterInput } from './chapters';
export {
  createChapterMetadata,
  createQuickDraftsInboxChapter,
  QUICK_DRAFTS_INBOX_CHAPTER_ID,
  QUICK_DRAFTS_INBOX_CHAPTER_TITLE,
  renameChapter,
} from './chapters';
export type {
  CrdtAdapter,
  CrdtDocument,
  CrdtSnapshot,
  CrdtStateVector,
  CrdtUpdate,
} from './crdt';
export type { DocumentSession } from './document-session';
export {
  addChapterToSession,
  addDocumentToSession,
  createDocumentSession,
  createDocumentSessionFromBooksAndDocuments,
  createDocumentSessionFromBooksChaptersAndDocuments,
  createDocumentSessionFromDocuments,
  createDraftInSession,
  renameActiveChapter,
  renameActiveDocument,
  selectActiveBook,
  selectActiveChapter,
  selectActiveDocument,
} from './document-session';
export type { ReorderDocumentDirection } from './document-session-reorder';
export { reorderChapter, reorderDocument } from './document-session-reorder';
export {
  getActiveBook,
  getActiveChapter,
  getActiveChapterOrNull,
  getActiveDocument,
  getActiveDocumentOrNull,
} from './document-session-selectors';
export type { CreateDocumentUpdateRecordInput } from './document-updates';
export { createDocumentUpdateRecord, sortDocumentUpdatesForReplay } from './document-updates';
export type {
  CreateDocumentMetadataInput,
  DocumentKind,
  DocumentMetadata,
  RenameDocumentInput,
} from './documents';
export { createDocumentMetadata, renameDocument } from './documents';
export type {
  CreateDocumentSnapshotRecordInput,
  DocumentSnapshotRecord,
  LocalDocumentStore,
} from './local-store';
export { createDocumentSnapshotRecord } from './local-store';
export type { RecoveryPoint, RecoveryPolicy } from './recovery';
export type {
  CreateSyncQueueItemInput,
  DocumentUpdateRecord,
  SyncQueueItem,
  SyncQueueItemKind,
  SyncState,
} from './sync';
export { createSyncQueueItem, sortSyncQueueItemsForProcessing } from './sync';
export type { YjsCrdtDocument } from './yjs-crdt';
export { createYjsCrdtAdapter } from './yjs-crdt';
