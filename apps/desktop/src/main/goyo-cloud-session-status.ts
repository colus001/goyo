export interface GoyoCloudAccount {
  email: string;
  id: string;
}

type GoyoCloudSessionState = 'expired' | 'signed-in' | 'signed-out' | 'unable-to-connect';

export interface GoyoCloudStatusResult {
  account: GoyoCloudAccount | null;
  error?: string;
  hasSession: boolean;
  status: GoyoCloudSessionState;
}

type SessionCheckResult =
  | { ok: true; user: GoyoCloudAccount }
  | { error?: string; ok: false; status: 'expired' | 'unable-to-connect' };

export async function resolveGoyoCloudSessionStatus({
  account,
  checkSession,
  token,
}: {
  account: GoyoCloudAccount | null;
  checkSession: (token: string) => Promise<SessionCheckResult>;
  token: string | null;
}): Promise<GoyoCloudStatusResult> {
  if (!token) {
    return { account: null, hasSession: false, status: 'signed-out' };
  }

  try {
    const result = await checkSession(token);

    if (result.ok) {
      return { account: result.user, hasSession: true, status: 'signed-in' };
    }

    return {
      account,
      error: result.error,
      hasSession: true,
      status: result.status,
    };
  } catch (error) {
    return {
      account,
      error: error instanceof Error ? error.message : 'Could not reach Goyo Cloud.',
      hasSession: true,
      status: 'unable-to-connect',
    };
  }
}
