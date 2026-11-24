import { useEffect, useRef, useState } from 'react';
import type { CoachOAuthProviderId, CoachProviderAccount } from '../shared/writing-coach';

interface SignInAttempt {
  provider: CoachOAuthProviderId;
  accountId?: string;
}

export function useAiProviderSignIn(
  onConnected: (account: CoachProviderAccount) => void,
  setMessage: (message: string) => void,
) {
  const api = window.writerDesktop.writingCoach;
  const pending = useRef<SignInAttempt | null>(null);
  const [signIn, setSignIn] = useState<SignInAttempt | null>(null);

  useEffect(
    () => () => {
      if (!pending.current) return;
      pending.current = null;
      void api.cancelConnect().catch(() => undefined);
    },
    [api],
  );

  async function connect(provider: CoachOAuthProviderId, accountId?: string) {
    const restart = pending.current !== null;
    const attempt = { provider, accountId };
    pending.current = attempt;
    setSignIn(attempt);
    setMessage('');
    try {
      if (restart) await api.cancelConnect();
      if (pending.current !== attempt) return;
      const result = await api.connectProvider(provider, accountId);
      if (pending.current !== attempt) return;
      if (result.ok) onConnected(result.data);
      else setMessage(result.error);
    } catch {
      if (pending.current === attempt) setMessage('The browser sign-in could not be completed.');
    } finally {
      if (pending.current === attempt) {
        pending.current = null;
        setSignIn(null);
      }
    }
  }

  async function cancel() {
    const attempt = pending.current;
    if (!attempt) return;
    pending.current = null;
    try {
      await api.cancelConnect();
      if (!pending.current) setMessage('Sign-in cancelled. You can try again.');
      setSignIn((current) => (current === attempt ? null : current));
    } catch {
      if (!pending.current) {
        pending.current = attempt;
        setMessage('Could not cancel sign-in. Try restarting it.');
      }
    }
  }

  return { signIn, connect, cancel };
}
