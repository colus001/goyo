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
  sessionKind: 'desktop' | 'web';
}

export interface AuthVerifyResponse {
  account: AuthAccountStatus;
  ok: true;
  token: string | null;
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
