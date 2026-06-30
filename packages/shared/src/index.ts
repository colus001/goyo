export const APP_NAME = 'Goyo';

export type BookId = string;
export type ChapterId = string;
export type DocumentId = string;
export type SyncClientId = string;

export interface AuthUser {
  email: string;
  id: string;
}

export interface AuthAccountStatus {
  billing: {
    status: 'deferred';
  };
  sync: {
    available: boolean;
    enforcement: 'disabled';
  };
}

export interface AuthStartRequest {
  email: string;
}

export interface AuthStartResponse {
  ok: true;
}

export interface AuthVerifyRequest {
  clientId?: SyncClientId;
  code: string;
  email: string;
  sessionKind: 'desktop' | 'mobile' | 'web';
}

export interface AuthVerifyResponse {
  account: AuthAccountStatus;
  ok: true;
  token: string | null;
  user: AuthUser;
}

export interface AuthDesktopHandoffRequest {
  clientId?: SyncClientId;
}

export interface AuthDesktopHandoffResponse {
  account: AuthAccountStatus;
  ok: true;
  token: string;
  user: AuthUser;
}

export interface AuthMeResponse {
  account: AuthAccountStatus;
  ok: true;
  user: AuthUser;
}

export interface AuthLogoutResponse {
  ok: true;
}

export interface AuthErrorResponse {
  error: string;
  ok: false;
}

export type {
  RemoteBookMetadata,
  RemoteBooksResponse,
  RemoteChapterMetadata,
  RemoteChaptersResponse,
  RemoteDocumentMetadata,
  RemoteDocumentSnapshotRecord,
  RemoteDocumentsResponse,
  RemoteDocumentUpdateRecord,
  RemoteDocumentUpdatesResponse,
  RemoteLatestDocumentSnapshotResponse,
  RemoteSyncClientInfo,
  RemoteSyncConnection,
} from './remote-sync-client';
export {
  base64ToBytes,
  fetchJson,
  fetchLatestRemoteDocumentSnapshot,
  fetchRemoteBooks,
  fetchRemoteChapters,
  fetchRemoteDocuments,
  fetchRemoteDocumentUpdates,
  isRemoteSnapshotNewer,
  isRemoteSyncConnectionReady,
  pushRemoteBookMetadata,
  pushRemoteChapterMetadata,
  pushRemoteDocumentMetadata,
  pushRemoteDocumentSnapshot,
  pushRemoteDocumentUpdate,
  RemoteSyncRequestError,
  registerRemoteSyncClient,
  testRemoteSyncConnection,
} from './remote-sync-client';
