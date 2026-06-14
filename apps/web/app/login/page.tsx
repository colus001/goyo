'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Suspense, useState } from 'react';
import { authStart } from '@/lib/api';

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-[#b8b9ac] text-sm">Loading…</div>}>
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

  const onStart = () => {
    if (!email) return;
    setIsSending(true);
    setStatus(null);
    void authStart(email).then((result) => {
      setIsSending(false);
      if (result.ok) {
        const params = new URLSearchParams();
        params.set('email', email);
        const source = searchParams.get('source');
        const clientId = searchParams.get('clientId');
        if (source) params.set('source', source);
        if (clientId) params.set('clientId', clientId);
        router.push(`/verify?${params.toString()}`);
        return;
      }
      setStatus(result.error ?? 'Could not send login code.');
    });
  };

  return (
    <div>
      <header className="mb-10 max-w-4xl">
        <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
          Sign in or create an account
        </p>
        <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
          One email. One code. No password.
        </h1>
      </header>
      <Panel>
        <p className="text-[#aab5a5] uppercase tracking-[0.22em] text-sm">Open signup</p>
        <h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight tracking-[-0.04em] text-[#f3f0df]">
          Enter your email. If you are new we will create your Goyo Cloud account after
          verification.
        </h2>
        <form
          className="mt-6 max-w-md"
          onSubmit={(event) => {
            event.preventDefault();
            onStart();
          }}
        >
          <label className="block">
            <span className="text-[#aab5a5] text-sm">Email address</span>
            <input
              className="mt-2 w-full rounded-2xl border border-[#f3f0df]/10 bg-[#191d19] px-4 py-3 text-[#f3f0df] outline-none placeholder:text-[#687064] focus:ring-4 focus:ring-[#d9be7f]/20"
              onChange={(event) => setEmail(event.target.value.trim())}
              placeholder="writer@example.com"
              type="email"
              value={email}
            />
          </label>
          <button
            className="mt-4 w-full rounded-2xl bg-[#d9be7f] px-5 py-3 font-semibold text-[#1b1a15] transition hover:-translate-y-0.5 hover:bg-[#efd594] disabled:opacity-50"
            disabled={isSending || !email}
            type="submit"
          >
            {isSending ? 'Sending…' : 'Send sign-in code'}
          </button>
        </form>
        {status ? <p className="mt-4 text-[#c98b7a] text-sm">{status}</p> : null}
      </Panel>
    </div>
  );
}
