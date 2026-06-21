'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useState } from 'react';
import { authStart } from '@/lib/api';

function Panel({ children }: { children: ReactNode }) {
  return <div className="goyo-cloud-panel p-6 sm:p-8">{children}</div>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-[var(--goyo-text-muted)] text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const onStart = () => {
    if (!email) return;
    setIsSending(true);
    setStatus(null);
    void authStart(email).then((result) => {
      setIsSending(false);
      if (result.ok || isLocalDev) {
        router.push(`/verify?${createVerifyParams(email, searchParams).toString()}`);
        return;
      }
      setStatus(result.error ?? 'Could not send login code.');
    });
  };

  return (
    <div className="goyo-reveal">
      <header className="mb-10 max-w-4xl">
        <p className="goyo-cloud-kicker">Sign in or create an account</p>
        <h1 className="goyo-cloud-headline mt-5 text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
          One email. One code. No password.
        </h1>
        <p className="mt-5 max-w-2xl text-[1.02rem] leading-7 text-[var(--goyo-text-muted)]">
          Goyo Cloud keeps account access quiet and low-friction, matching the desktop writing
          experience instead of adding dashboard noise.
        </p>
      </header>
      <Panel>
        <p className="goyo-cloud-kicker">Open signup</p>
        <h2 className="goyo-prose mt-4 max-w-2xl font-semibold text-4xl leading-tight tracking-[-0.045em] text-[var(--goyo-text)]">
          Enter your email. If you are new we will create your Goyo Cloud account after
          verification.
        </h2>
        {isLocalDev ? (
          <p className="mt-4 rounded-2xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)] px-4 py-3 text-[var(--goyo-text-muted)] text-sm">
            Local dev: use code <span className="font-mono">000000</span> on the next screen.
          </p>
        ) : null}
        <form
          className="mt-6 max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            onStart();
          }}
        >
          <label className="block">
            <span className="text-[var(--goyo-text-muted)] text-sm">Email address</span>
            <input
              className="goyo-cloud-input mt-2 px-4 py-3"
              onChange={(event) => setEmail(event.target.value.trim())}
              placeholder="writer@example.com"
              type="email"
              value={email}
            />
          </label>
          <button
            className="goyo-cloud-button mt-4 w-full px-5 py-3"
            disabled={isSending || !email}
            type="submit"
          >
            {isSending ? 'Sending…' : 'Send sign-in code'}
          </button>
        </form>
        {status ? <p className="mt-4 text-[var(--goyo-danger)] text-sm">{status}</p> : null}
      </Panel>
    </div>
  );
}

function createVerifyParams(email: string, searchParams: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  params.set('email', email);
  const source = searchParams.get('source');
  const clientId = searchParams.get('clientId');
  const returnTo = searchParams.get('returnTo');
  if (source) params.set('source', source);
  if (clientId) params.set('clientId', clientId);
  if (returnTo) params.set('returnTo', returnTo);
  return params;
}
