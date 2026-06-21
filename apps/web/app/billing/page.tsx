import type { ReactElement, ReactNode } from 'react';

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

export default function BillingPage(): ReactElement {
  return (
    <div>
      <header className="mb-10 max-w-4xl">
        <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">Billing</p>
        <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
          Payment is intentionally parked.
        </h1>
      </header>
      <Panel>
        <p className="max-w-2xl text-[#b8b9ac] leading-7">
          This route reserves the account surface for future payment work. Sync availability stays
          unrestricted during the Goyo Cloud auth milestone so hosted login and multi-device sync
          can be tested without plan gates.
        </p>
      </Panel>
    </div>
  );
}
