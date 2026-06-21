import { redirect } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { serverAuthMe } from '@/lib/server-api';

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

export default async function AccountPage(): Promise<ReactElement> {
  const auth = await serverAuthMe();

  if (!auth.ok || !auth.value?.user) {
    redirect('/login');
  }

  const { user } = auth.value;

  return (
    <div>
      <header className="mb-10 max-w-4xl">
        <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">Account</p>
        <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
          Cloud status before billing complexity.
        </h1>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">Account</p>
          <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">{user.email}</p>
          <p className="mt-4 text-[#b8b9ac] text-sm">
            Open signup account. Payment and plan selection will be added later.
          </p>
        </Panel>
        <Panel>
          <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">Cloud sync</p>
          <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">Available</p>
          <p className="mt-4 text-[#b8b9ac] text-sm">
            Usage limits stay disabled while auth and sync are tested. Sync entitlement enforcement
            is deferred.
          </p>
        </Panel>
        <Panel>
          <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">Billing</p>
          <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">Deferred</p>
          <p className="mt-4 text-[#b8b9ac] text-sm">
            Payment will be added after the account foundation ships.
          </p>
        </Panel>
      </div>
    </div>
  );
}
