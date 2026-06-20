'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { authVerify } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="text-[#b8b9ac] text-sm">Loading…</div>}>
      <VerifyForm />
    </Suspense>
  );
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: auth verification flow is self-contained
function VerifyForm() {
  const { setUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const isDesktopFlow = searchParams.get('source') === 'desktop';
  const clientId = searchParams.get('clientId');
  const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const isLocalDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  useEffect(() => {
    if (!email) {
      router.replace('/login');
    }
  }, [email, router]);

  const onVerify = () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    setStatus(isDesktopFlow ? 'Verifying and returning to Goyo Desktop…' : null);
    void authVerify({
      clientId: clientId ?? undefined,
      code,
      email,
      sessionKind: isDesktopFlow ? 'desktop' : 'web',
    }).then((result) => {
      setIsVerifying(false);
      if (result.ok) {
        if (isDesktopFlow && result.token && result.user) {
          const params = new URLSearchParams();
          params.set('token', result.token);
          params.set('userId', result.user.id);
          params.set('email', result.user.email);
          setStatus('Verified. Opening Goyo Desktop…');
          window.location.href = `goyo://auth/callback?${params.toString()}`;
          return;
        }
        if (result.user) {
          setUser(result.user);
          router.push(returnTo ?? '/account');
          return;
        }
      }
      setStatus(result.error ?? 'Verification failed.');
    });
  };

  if (!email) return <p className="text-[#b8b9ac]">Redirecting…</p>;

  return (
    <div>
      <header className="mb-10 max-w-4xl">
        <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
          Verification
        </p>
        <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
          {isDesktopFlow
            ? 'Enter the code to finish Desktop sign-in.'
            : 'Enter the code we sent to your email.'}
        </h1>
      </header>
      <Panel>
        <p className="text-[#8f978b] text-sm">
          Code sent to <span className="text-[#f3f0df]">{email}</span>.
          {isDesktopFlow
            ? ' This page will return you to Goyo Desktop after verification.'
            : ' New emails automatically create an account.'}
        </p>
        {isLocalDev ? (
          <p className="mt-3 rounded-2xl border border-[#d9be7f]/20 bg-[#d9be7f]/10 px-4 py-3 text-[#d9be7f] text-sm">
            Local dev code: <span className="font-mono">000000</span>
          </p>
        ) : null}
        <form
          className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            onVerify();
          }}
        >
          <label className="block">
            <span className="text-[#aab5a5] text-sm">Six-digit code</span>
            <input
              className="mt-2 w-full rounded-2xl border border-[#f3f0df]/10 bg-[#0f1210] px-4 py-3 text-[#f3f0df] outline-none placeholder:text-[#687064] focus:ring-4 focus:ring-[#d9be7f]/20"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                const value = event.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
              }}
              placeholder="000000"
              value={code}
            />
          </label>
          <button
            className="rounded-2xl bg-[#d9be7f] px-5 py-3 font-semibold text-[#1b1a15] transition hover:-translate-y-0.5 hover:bg-[#efd594] disabled:opacity-50"
            disabled={isVerifying || code.length !== 6}
            type="submit"
          >
            {isVerifying ? 'Verifying…' : 'Verify code'}
          </button>
        </form>
        {status ? <p className="mt-4 text-[#c98b7a] text-sm">{status}</p> : null}
      </Panel>
    </div>
  );
}

function getSafeReturnTo(value: string | null): string | null {
  if (!value?.startsWith('/') || value.startsWith('//')) return null;
  return value;
}
