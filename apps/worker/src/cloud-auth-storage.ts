import { hashAuthSecret, LOGIN_CODE_RESEND_COOLDOWN_MS } from './cloud-auth';
import { type EnvWithCloudAuth, getCloudAuthSecret } from './cloud-auth-env';

export interface LoginCodeRow {
  attempt_count: number;
  code_hash: string;
  created_at: string;
  expires_at: string;
  id: string;
}

export interface SessionUserRow {
  email: string;
  user_id: string;
}

export interface UserRow {
  created_at: string;
  email: string;
  id: string;
}

export async function getLatestLoginCode(env: EnvWithCloudAuth, email: string) {
  return env.DB.prepare(`
    SELECT id, code_hash, created_at, expires_at, attempt_count
    FROM login_codes
    WHERE email = ? AND consumed_at IS NULL
    ORDER BY created_at DESC, id DESC
    LIMIT 1;
  `)
    .bind(email)
    .first<LoginCodeRow>();
}

export async function insertLoginCode(
  env: EnvWithCloudAuth,
  input: { codeHash: string; createdAt: string; email: string; expiresAt: string },
) {
  await env.DB.prepare(`
    INSERT INTO login_codes (id, email, code_hash, created_at, expires_at, attempt_count)
    VALUES (?, ?, ?, ?, ?, 0);
  `)
    .bind(
      `login_code_${crypto.randomUUID()}`,
      input.email,
      input.codeHash,
      input.createdAt,
      input.expiresAt,
    )
    .run();
}

export async function incrementLoginCodeAttempts(env: EnvWithCloudAuth, loginCodeId: string) {
  await env.DB.prepare(`
    UPDATE login_codes
    SET attempt_count = attempt_count + 1
    WHERE id = ?;
  `)
    .bind(loginCodeId)
    .run();
}

export async function consumeLoginCode(
  env: EnvWithCloudAuth,
  loginCodeId: string,
  consumedAt: string,
) {
  await env.DB.prepare(`
    UPDATE login_codes
    SET consumed_at = ?
    WHERE id = ?;
  `)
    .bind(consumedAt, loginCodeId)
    .run();
}

export async function getOrCreateUser(env: EnvWithCloudAuth, email: string, now: string) {
  const existingUser = await getUserByEmail(env, email);

  if (existingUser) {
    await touchUser(env, existingUser.id, now);
    return existingUser;
  }

  const user: UserRow = { created_at: now, email, id: `user_${crypto.randomUUID()}` };

  await env.DB.prepare(`
    INSERT INTO users (id, email, created_at, last_seen_at)
    VALUES (?, ?, ?, ?);
  `)
    .bind(user.id, user.email, user.created_at, now)
    .run();

  return user;
}

export async function createSession(
  env: EnvWithCloudAuth,
  input: {
    clientId: string | null;
    now: string;
    sessionKind: 'desktop' | 'web';
    tokenHash: string;
    userId: string;
  },
) {
  await env.DB.prepare(`
    INSERT INTO auth_sessions (
      id, user_id, token_hash, client_id, session_kind, created_at, last_seen_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `)
    .bind(
      `session_${crypto.randomUUID()}`,
      input.userId,
      input.tokenHash,
      input.clientId,
      input.sessionKind,
      input.now,
      input.now,
    )
    .run();
}

export async function ensureDefaultEntitlement(env: EnvWithCloudAuth, userId: string, now: string) {
  await env.DB.prepare(`
    INSERT OR IGNORE INTO account_entitlements (
      user_id, sync_enabled, billing_status, created_at, updated_at
    )
    VALUES (?, 1, 'deferred', ?, ?);
  `)
    .bind(userId, now, now)
    .run();
}

export async function getSessionByTokenHash(env: EnvWithCloudAuth, tokenHash: string) {
  return env.DB.prepare(`
    SELECT auth_sessions.user_id, users.email
    FROM auth_sessions
    INNER JOIN users ON users.id = auth_sessions.user_id
    WHERE auth_sessions.token_hash = ? AND auth_sessions.revoked_at IS NULL;
  `)
    .bind(tokenHash)
    .first<SessionUserRow>();
}

export async function revokeSessionByTokenHash(
  env: EnvWithCloudAuth,
  tokenHash: string,
  revokedAt: string,
) {
  await env.DB.prepare(`
    UPDATE auth_sessions
    SET revoked_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL;
  `)
    .bind(revokedAt, tokenHash)
    .run();
}

export async function touchSessionByTokenHash(
  env: EnvWithCloudAuth,
  tokenHash: string,
  lastSeenAt: string,
) {
  await env.DB.prepare(`
    UPDATE auth_sessions
    SET last_seen_at = ?
    WHERE token_hash = ? AND revoked_at IS NULL;
  `)
    .bind(lastSeenAt, tokenHash)
    .run();
}

export function isWithinResendCooldown(createdAt: string, now: Date): boolean {
  return now.getTime() - Date.parse(createdAt) < LOGIN_CODE_RESEND_COOLDOWN_MS;
}

export function getLoginCodeHashValue(email: string, code: string): string {
  return `${email}\0${code}`;
}

export async function hashRequestToken(env: EnvWithCloudAuth, token: string) {
  const secret = getCloudAuthSecret(env);
  return secret ? hashAuthSecret(secret, token) : null;
}

async function getUserByEmail(env: EnvWithCloudAuth, email: string) {
  return env.DB.prepare(`
    SELECT id, email, created_at
    FROM users
    WHERE email = ?;
  `)
    .bind(email)
    .first<UserRow>();
}

async function touchUser(env: EnvWithCloudAuth, userId: string, lastSeenAt: string) {
  await env.DB.prepare(`
    UPDATE users
    SET last_seen_at = ?
    WHERE id = ?;
  `)
    .bind(lastSeenAt, userId)
    .run();
}
