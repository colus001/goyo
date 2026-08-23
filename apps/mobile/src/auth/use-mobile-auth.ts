import type { AuthUser } from '@writer/shared';
import { useEffect, useState } from 'react';
import {
  mobileAuthLogout,
  mobileAuthMe,
  mobileAuthStart,
  mobileAuthVerify,
} from './mobile-auth-client';
import {
  clearMobileAuthSession,
  getMobileAuthSession,
  saveMobileAuthSession,
} from './mobile-auth-session';

type MobileAuthStatus = 'attention' | 'loading' | 'signed-in' | 'signed-out';

export interface MobileAuthState {
  error: string | null;
  isBusy: boolean;
  logout(): void;
  sendCode(email: string): Promise<boolean>;
  status: MobileAuthStatus;
  token: string | null;
  user: AuthUser | null;
  verifyCode(input: { clientId: string | null; code: string; email: string }): Promise<boolean>;
}

export function useMobileAuth(): MobileAuthState {
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<MobileAuthStatus>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useRestoreMobileAuthSession(setError, setStatus, setToken, setUser);

  return {
    error,
    isBusy,
    logout: () => void logout(token, setError, setIsBusy, setStatus, setToken, setUser),
    sendCode: (email) => sendCode(email, setError, setIsBusy),
    status,
    token,
    user,
    verifyCode: (input) => verifyCode(input, setError, setIsBusy, setStatus, setToken, setUser),
  };
}

function useRestoreMobileAuthSession(
  setError: (error: string | null) => void,
  setStatus: (status: MobileAuthStatus) => void,
  setToken: (token: string | null) => void,
  setUser: (user: AuthUser | null) => void,
) {
  useEffect(() => {
    let isCancelled = false;

    async function restore() {
      const session = await getMobileAuthSession();

      if (!session) {
        setStatus('signed-out');
        return;
      }

      const result = await mobileAuthMe(session.token);

      if (isCancelled) {
        return;
      }

      if (result.ok) {
        setToken(session.token);
        setUser(result.user);
        setStatus('signed-in');
        return;
      }

      if (result.status === 'expired') {
        await clearMobileAuthSession();
        setToken(null);
        setUser(null);
        setStatus('signed-out');
        return;
      }

      setError(result.error);
      setToken(session.token);
      setUser(session.user);
      setStatus('attention');
    }

    void restore().catch(() => !isCancelled && setStatus('signed-out'));

    return () => {
      isCancelled = true;
    };
  }, [setError, setStatus, setToken, setUser]);
}

async function sendCode(
  email: string,
  setError: (error: string | null) => void,
  setIsBusy: (isBusy: boolean) => void,
): Promise<boolean> {
  setIsBusy(true);
  setError(null);
  const result = await mobileAuthStart(email.trim());
  setIsBusy(false);
  setError(result.ok ? null : (result.error ?? 'Could not send login code.'));

  return result.ok;
}

async function verifyCode(
  input: { clientId: string | null; code: string; email: string },
  setError: (error: string | null) => void,
  setIsBusy: (isBusy: boolean) => void,
  setStatus: (status: MobileAuthStatus) => void,
  setToken: (token: string | null) => void,
  setUser: (user: AuthUser | null) => void,
): Promise<boolean> {
  if (!input.clientId) {
    setError('Local sync identity is not ready yet.');
    return false;
  }

  setIsBusy(true);
  setError(null);
  const result = await mobileAuthVerify({
    clientId: input.clientId,
    code: input.code.trim(),
    email: input.email.trim(),
  });
  setIsBusy(false);

  if (!result.ok) {
    setError(result.error);
    return false;
  }

  await saveMobileAuthSession({ token: result.token, user: result.user });
  setToken(result.token);
  setUser(result.user);
  setStatus('signed-in');
  return true;
}

async function logout(
  token: string | null,
  setError: (error: string | null) => void,
  setIsBusy: (isBusy: boolean) => void,
  setStatus: (status: MobileAuthStatus) => void,
  setToken: (token: string | null) => void,
  setUser: (user: AuthUser | null) => void,
) {
  setIsBusy(true);
  setError(null);

  if (token) {
    await mobileAuthLogout(token).catch(() => undefined);
  }

  await clearMobileAuthSession();
  setToken(null);
  setUser(null);
  setStatus('signed-out');
  setIsBusy(false);
}
