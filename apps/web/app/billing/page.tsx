import type { ReactElement, ReactNode } from 'react';

function Panel({ children }: { children: ReactNode }) {
  return <div className="goyo-cloud-panel p-6 sm:p-8">{children}</div>;
}

export default function BillingPage(): ReactElement {
  return (
    <div className="goyo-reveal">
      <header className="mb-10 max-w-4xl">
        <p className="goyo-cloud-kicker">Billing</p>
        <h1 className="goyo-cloud-headline mt-5 text-balance text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
          Payment is intentionally parked.
        </h1>
      </header>
      <Panel>
        <p className="max-w-2xl text-[var(--goyo-text-muted)] leading-7">
          This route reserves the account surface for future payment work. Sync availability stays
          unrestricted during the Goyo Cloud auth milestone so hosted login and multi-device sync
          can be tested without plan gates.
        </p>
      </Panel>
    </div>
  );
}
