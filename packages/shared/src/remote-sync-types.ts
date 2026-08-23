export interface RemoteSyncConnection {
  clientId: string;
  enabled: boolean;
  serverUrl: string;
  token: string | null;
}

export interface RemoteSyncClientInfo {
  lastSeenAt: string;
  name: string;
  platform: string;
}

export interface RemoteBookMetadata {
  accentColor: string;
  archivedAt: string | null;
  createdAt: string;
  id: string;
  title: string;
  updatedAt: string;
}

export interface RemoteChapterMetadata {
  archivedAt: string | null;
  bookId: string;
  createdAt: string;
  id: string;
  order: number;
  title: string;
  updatedAt: string;
}

export interface RemoteDocumentMetadata {
  archivedAt: string | null;
  bookId: string;
  chapterId: string | null;
  createdAt: string;
  id: string;
  kind: string;
  order: number;
  title: string;
  updatedAt: string;
}

export interface RemoteDocumentUpdateRecord {
  clientId: string;
  createdAt: string;
  documentId: string;
  id: string;
  update: Uint8Array;
}

export interface RemoteDocumentSnapshotRecord {
  createdAt: string;
  documentId: string;
  id: string;
  lastUpdateId: string | null;
  snapshot: Uint8Array;
}

export interface RemoteDocumentUpdatesResponse {
  documentId: string;
  updates: Array<{
    clientId: string;
    createdAt: string;
    id: string;
    updateBase64: string;
  }>;
}

export interface RemoteLatestDocumentSnapshotResponse {
  documentId: string;
  snapshot: {
    createdAt: string;
    id: string;
    lastUpdateId: string | null;
    snapshotBase64: string;
  } | null;
}

export interface RemoteBooksResponse {
  books: RemoteBookMetadata[];
  ok: boolean;
}

export interface RemoteChaptersResponse {
  chapters: RemoteChapterMetadata[];
  ok: boolean;
}

export interface RemoteDocumentsResponse {
  documents: RemoteDocumentMetadata[];
  ok: boolean;
}
