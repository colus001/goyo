'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { authMe, createDesktopHandoffSession } from '@/lib/api';

function Panel({ children }: { children: ReactNode }) {
  return <div className="goyo-cloud-panel p-6 sm:p-8">{children}</div>;
}

export default function DesktopSignInPage(): ReactElement {
  return (
    <Suspense
      fallback={
        <div className="text-[var(--goyo-text-muted)] text-sm">Preparing Desktop sign-in…</div>
      }
    >
      <DesktopSignIn />
    </Suspense>
  );
}

function DesktopSignIn(): ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId') ?? undefined;
  const callbackScheme = getCallbackScheme(searchParams.get('callbackScheme'));
  const [status, setStatus] = useState('Checking your Goyo Cloud session…');

  useEffect(() => {
    let cancelled = false;

    async function runHandoff() {
      const me = await authMe();

      if (cancelled) return;

      if (!me.ok) {
        router.replace(
          `/login?returnTo=${encodeURIComponent(createReturnToPath(clientId, callbackScheme))}`,
        );
        return;
      }

      setStatus('You are signed in. Connecting Goyo Desktop…');
      const handoff = await createDesktopHandoffSession({ clientId });

      if (cancelled) return;

      if (!handoff.ok || !handoff.token || !handoff.user) {
        setStatus(handoff.error ?? 'Could not connect Goyo Desktop.');
        return;
      }

      const params = new URLSearchParams();
      params.set('token', handoff.token);
      params.set('userId', handoff.user.id);
      params.set('email', handoff.user.email);
      setStatus('Opening Goyo Desktop…');
      window.location.href = `${callbackScheme}://auth/callback?${params.toString()}`;
    }

    void runHandoff().catch(() => {
      if (!cancelled) setStatus('Could not connect Goyo Desktop.');
    });

    return () => {
      cancelled = true;
    };
  }, [callbackScheme, clientId, router]);

  return (
    <div className="goyo-reveal">
      <header className="mb-10 max-w-4xl">
        <p className="goyo-cloud-kicker">Desktop handoff</p>
        <h1 className="goyo-cloud-headline mt-5 text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
          Connecting Goyo Desktop.
        </h1>
      </header>
      <Panel>
        <p className="text-[var(--goyo-text-muted)] text-sm">{status}</p>
        <p className="mt-4 text-[var(--goyo-text-faint)] text-xs">
          If you are not signed in on the web, you will be asked to sign in first.
        </p>
      </Panel>
    </div>
  );
}

function getCallbackScheme(value: string | null): 'goyo' | 'goyo-dev' {
  return value === 'goyo-dev' ? 'goyo-dev' : 'goyo';
}

function createReturnToPath(
  clientId: string | undefined,
  callbackScheme: 'goyo' | 'goyo-dev',
): string {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  params.set('callbackScheme', callbackScheme);
  const query = params.toString();
  return `/desktop-sign-in${query ? `?${query}` : ''}`;
}
