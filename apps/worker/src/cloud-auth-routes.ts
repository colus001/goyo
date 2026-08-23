// biome-ignore lint/nursery/noExcessiveLinesPerFile: Auth endpoint handlers are intentionally kept together around one route group.
import type {
  AuthDesktopHandoffRequest,
  AuthDesktopHandoffResponse,
  AuthMeResponse,
  AuthStartRequest,
  AuthStartResponse,
  AuthUser,
  AuthVerifyRequest,
  AuthVerifyResponse,
} from '@writer/shared';
import {
  createLoginCode,
  createSessionToken,
  getLoginCodeExpiresAt,
  hashAuthSecret,
  hasLoginCodeAttemptsRemaining,
  isLoginCodeExpired,
  normalizeAuthEmail,
} from './cloud-auth';
import { getDefaultAccountStatus } from './cloud-auth-account';
import { clearAuthCookie, createAuthCookie, getBearerOrCookieToken } from './cloud-auth-cookie';
import { getLocalDevLoginCode } from './cloud-auth-dev';
import { sendLoginCodeEmail } from './cloud-auth-email';
import { type EnvWithCloudAuth, getCloudAuthSecret, getLocalDevAuthSecret } from './cloud-auth-env';
import {
  consumeLoginCode,
  createSession,
  ensureDefaultEntitlement,
  getLatestLoginCode,
  getLoginCodeHashValue,
  getOrCreateUser,
  getSessionByTokenHash,
  hashRequestToken,
  incrementLoginCodeAttempts,
  insertLoginCode,
  isWithinResendCooldown,
  revokeSessionByTokenHash,
  type SessionUserRow,
  touchSessionByTokenHash,
  type UserRow,
} from './cloud-auth-storage';
import { jsonError, readJsonBody, storageErrorResponse } from './http';

export type { EnvWithCloudAuth } from './cloud-auth-env';

export async function handleCloudAuthRequest(
  request: Request,
  env: EnvWithCloudAuth,
  url: URL,
): Promise<Response | null> {
  try {
    if (url.pathname === '/v1/auth/start' && request.method === 'POST') {
      return await startCloudAuth(request, env);
    }

    if (url.pathname === '/v1/auth/verify' && request.method === 'POST') {
      return await verifyCloudAuth(request, env);
    }

    if (url.pathname === '/v1/auth/me' && request.method === 'GET') {
      return await getCloudAuthMe(request, env);
    }

    if (url.pathname === '/v1/auth/desktop-handoff' && request.method === 'POST') {
      return await createDesktopHandoff(request, env);
    }

    if (url.pathname === '/v1/auth/logout' && request.method === 'POST') {
      return await logoutCloudAuth(request, env);
    }

    return null;
  } catch (error) {
    return storageErrorResponse(error, 500);
  }
}

async function startCloudAuth(request: Request, env: EnvWithCloudAuth): Promise<Response> {
  const body = await readJsonBody<AuthStartRequest>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  const email = normalizeAuthEmail(body.value.email);

  if (!email) {
    return jsonError('Email address is invalid.', 400);
  }

  const devLoginCode = getLocalDevLoginCode(env);
  const authSecret = devLoginCode ? getLocalDevAuthSecret() : getCloudAuthSecret(env);

  if (!authSecret || (!env.EMAIL && !devLoginCode)) {
    return jsonError('Goyo Cloud auth is not configured.', 503);
  }

  const now = new Date();
  const recentCode = await getLatestLoginCode(env, email);

  if (recentCode && isWithinResendCooldown(recentCode.created_at, now)) {
    return Response.json({ ok: true } satisfies AuthStartResponse);
  }

  const code = devLoginCode ?? createLoginCode();
  const codeHash = await hashAuthSecret(authSecret, getLoginCodeHashValue(email, code));

  await insertLoginCode(env, {
    codeHash,
    createdAt: now.toISOString(),
    email,
    expiresAt: getLoginCodeExpiresAt(now),
  });

  if (!devLoginCode) {
    await sendLoginCodeEmail(env, email, code);
  }

  return Response.json({ ok: true } satisfies AuthStartResponse);
}

async function verifyCloudAuth(request: Request, env: EnvWithCloudAuth): Promise<Response> {
  const verification = await readAndValidateVerification(request, env);

  if (!verification.ok) {
    return verification.response;
  }

  const session = await createVerifiedSessionResponse(env, verification.value);

  if (!session.ok) {
    return session.response;
  }

  return createVerifiedAuthResponse(verification.value.sessionKind, session.value);
}

type VerifiedSession = Awaited<ReturnType<typeof createVerifiedSession>>;

async function createVerifiedSessionResponse(
  env: EnvWithCloudAuth,
  input: ValidAuthVerifyRequest,
): Promise<{ ok: true; value: VerifiedSession } | { ok: false; response: Response }> {
  try {
    return { ok: true, value: await createVerifiedSession(env, input) };
  } catch (error) {
    return { ok: false, response: storageErrorResponse(error) };
  }
}

function createVerifiedAuthResponse(
  sessionKind: ValidAuthVerifyRequest['sessionKind'],
  session: VerifiedSession,
) {
  const response = Response.json(session.responseBody);

  if (sessionKind === 'web') {
    response.headers.append('set-cookie', createAuthCookie(session.token));
  }

  return response;
}

async function getCloudAuthMe(request: Request, env: EnvWithCloudAuth): Promise<Response> {
  const session = await getSessionFromRequest(request, env);

  if (!session) {
    return jsonError('Unauthorized.', 401);
  }

  const token = getBearerOrCookieToken(request);
  const tokenHash = token ? await hashRequestToken(env, token) : null;

  if (tokenHash) {
    await touchSessionByTokenHash(env, tokenHash, new Date().toISOString());
  }

  return Response.json({
    account: getDefaultAccountStatus(),
    ok: true,
    user: { email: session.email, id: session.user_id },
  } satisfies AuthMeResponse);
}

async function logoutCloudAuth(request: Request, env: EnvWithCloudAuth): Promise<Response> {
  const token = getBearerOrCookieToken(request);
  const tokenHash = token ? await hashRequestToken(env, token) : null;

  if (tokenHash) {
    await revokeSessionByTokenHash(env, tokenHash, new Date().toISOString());
  }

  const response = Response.json({ ok: true });
  response.headers.append('set-cookie', clearAuthCookie());
  return response;
}

async function createDesktopHandoff(request: Request, env: EnvWithCloudAuth): Promise<Response> {
  const session = await getSessionFromRequest(request, env);

  if (!session) {
    return jsonError('Unauthorized.', 401);
  }

  const body = await readJsonBody<AuthDesktopHandoffRequest>(request);

  if (!body.ok) {
    return jsonError('Request body must be valid JSON.', 400);
  }

  if (body.value.clientId !== undefined && typeof body.value.clientId !== 'string') {
    return jsonError('Client id must be a string when provided.', 400);
  }

  const now = new Date().toISOString();
  const token = createSessionToken();
  const sessionSecret = getCloudAuthSecret(env);
  const tokenHash = await hashAuthSecret(sessionSecret ?? '', token);

  await createSession(env, {
    clientId: body.value.clientId ?? null,
    now,
    sessionKind: 'desktop',
    tokenHash,
    userId: session.user_id,
  });
  await ensureDefaultEntitlement(env, session.user_id, now);

  return Response.json({
    account: getDefaultAccountStatus(),
    ok: true,
    token,
    user: { email: session.email, id: session.user_id },
  } satisfies AuthDesktopHandoffResponse);
}

async function getSessionFromRequest(
  request: Request,
  env: EnvWithCloudAuth,
): Promise<SessionUserRow | null> {
  const token = getBearerOrCookieToken(request);
  const tokenHash = token ? await hashRequestToken(env, token) : null;

  return tokenHash ? getSessionByTokenHash(env, tokenHash) : null;
}

async function readAndValidateVerification(
  request: Request,
  env: EnvWithCloudAuth,
): Promise<{ ok: true; value: ValidAuthVerifyRequest } | { ok: false; response: Response }> {
  const body = await readJsonBody<AuthVerifyRequest>(request);

  if (!body.ok) {
    return { ok: false, response: jsonError('Request body must be valid JSON.', 400) };
  }

  const validation = validateAuthVerifyRequest(body.value);

  if (!validation.ok) {
    return { ok: false, response: jsonError(validation.message, 400) };
  }

  const devLoginCode = getLocalDevLoginCode(env);

  if (devLoginCode && validation.code === devLoginCode) {
    return { ok: true, value: { ...validation, loginCodeId: null } };
  }

  const authSecret = devLoginCode ? getLocalDevAuthSecret() : getCloudAuthSecret(env);

  if (!authSecret) {
    return { ok: false, response: jsonError('Goyo Cloud auth is not configured.', 503) };
  }

  const loginCode = await getLatestLoginCode(env, validation.email);

  if (!loginCode || isLoginCodeExpired(loginCode.expires_at, new Date())) {
    return { ok: false, response: jsonError('Login code is invalid or expired.', 401) };
  }

  if (!hasLoginCodeAttemptsRemaining(loginCode.attempt_count)) {
    return { ok: false, response: jsonError('Login code attempt limit reached.', 429) };
  }

  const codeHash = await hashAuthSecret(
    authSecret,
    getLoginCodeHashValue(validation.email, validation.code),
  );

  if (codeHash !== loginCode.code_hash) {
    await incrementLoginCodeAttempts(env, loginCode.id);
    return { ok: false, response: jsonError('Login code is invalid or expired.', 401) };
  }

  return { ok: true, value: { ...validation, loginCodeId: loginCode.id } };
}

async function createVerifiedSession(env: EnvWithCloudAuth, input: ValidAuthVerifyRequest) {
  const now = new Date().toISOString();
  if (input.loginCodeId) {
    await consumeLoginCode(env, input.loginCodeId, now);
  }
  const user = await getOrCreateUser(env, input.email, now);
  const token = createSessionToken();
  const sessionSecret = input.loginCodeId ? getCloudAuthSecret(env) : getLocalDevAuthSecret();
  const tokenHash = await hashAuthSecret(sessionSecret ?? '', token);

  await createSession(env, {
    clientId: input.clientId,
    now,
    sessionKind: input.sessionKind,
    tokenHash,
    userId: user.id,
  });
  await ensureDefaultEntitlement(env, user.id, now);

  return {
    responseBody: {
      account: getDefaultAccountStatus(),
      ok: true,
      token: input.sessionKind === 'web' ? null : token,
      user: rowToAuthUser(user),
    } satisfies AuthVerifyResponse,
    token,
  };
}

interface ValidAuthVerifyRequest {
  clientId: string | null;
  code: string;
  email: string;
  loginCodeId: string | null;
  ok: true;
  sessionKind: 'desktop' | 'mobile' | 'web';
}

function validateAuthVerifyRequest(
  body: AuthVerifyRequest,
): Omit<ValidAuthVerifyRequest, 'loginCodeId'> | { message: string; ok: false } {
  const email = normalizeAuthEmail(body.email);

  if (!email) {
    return { message: 'Email address is invalid.', ok: false };
  }

  if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
    return { message: 'Login code must be six digits.', ok: false };
  }

  if (
    body.sessionKind !== 'desktop' &&
    body.sessionKind !== 'mobile' &&
    body.sessionKind !== 'web'
  ) {
    return { message: 'Session kind must be desktop, mobile, or web.', ok: false };
  }

  if (body.clientId !== undefined && typeof body.clientId !== 'string') {
    return { message: 'Client id must be a string when provided.', ok: false };
  }

  return {
    clientId: body.clientId ?? null,
    code: body.code,
    email,
    ok: true,
    sessionKind: body.sessionKind,
  };
}

function rowToAuthUser(user: UserRow): AuthUser {
  return { email: user.email, id: user.id };
}
