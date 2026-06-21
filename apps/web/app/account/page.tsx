import { redirect } from 'next/navigation';
import type { ReactElement, ReactNode } from 'react';
import { serverAuthMe } from '@/lib/server-api';

function Panel({ children }: { children: ReactNode }) {
  return <div className="goyo-cloud-panel p-6 sm:p-7">{children}</div>;
}

export default async function AccountPage(): Promise<ReactElement> {
  const auth = await serverAuthMe();

  if (!auth.ok || !auth.value?.user) {
    redirect('/login');
  }

  const { user } = auth.value;

  return (
    <div className="goyo-reveal">
      <header className="mb-10 max-w-4xl">
        <p className="goyo-cloud-kicker">Account</p>
        <h1 className="goyo-cloud-headline mt-5 text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
          Cloud status before billing complexity.
        </h1>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <p className="goyo-cloud-kicker">Account</p>
          <p className="goyo-prose mt-4 break-words font-semibold text-3xl tracking-[-0.04em] text-[var(--goyo-text)]">
            {user.email}
          </p>
          <p className="mt-4 text-[var(--goyo-text-muted)] text-sm leading-6">
            Open signup account. Payment and plan selection will be added later.
          </p>
        </Panel>
        <Panel>
          <p className="goyo-cloud-kicker">Cloud sync</p>
          <p className="goyo-prose mt-4 font-semibold text-3xl tracking-[-0.04em] text-[var(--goyo-text)]">
            Available
          </p>
          <p className="mt-4 text-[var(--goyo-text-muted)] text-sm leading-6">
            Usage limits stay disabled while auth and sync are tested. Sync entitlement enforcement
            is deferred.
          </p>
        </Panel>
        <Panel>
          <p className="goyo-cloud-kicker">Billing</p>
          <p className="goyo-prose mt-4 font-semibold text-3xl tracking-[-0.04em] text-[var(--goyo-text)]">
            Deferred
          </p>
          <p className="mt-4 text-[var(--goyo-text-muted)] text-sm leading-6">
            Payment will be added after the account foundation ships.
          </p>
        </Panel>
      </div>
    </div>
  );
}
