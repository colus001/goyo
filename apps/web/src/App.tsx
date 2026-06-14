import type { ReactElement } from 'react';

const routes = {
  account: '/account',
  billing: '/billing',
  login: '/login',
  verify: '/verify',
};

const statusCards = [
  {
    label: 'Account',
    value: 'Email login pending',
    detail: 'Open signup will create accounts after code verification.',
  },
  {
    label: 'Cloud sync',
    value: 'Available',
    detail: 'Usage limits stay disabled while auth and sync are tested.',
  },
  {
    label: 'Billing',
    value: 'Placeholder',
    detail: 'Payment will be added after the account foundation ships.',
  },
];

function App(): ReactElement {
  const pathname = getRoutePathname();

  if (pathname === routes.verify) {
    return <VerifyPage />;
  }

  if (pathname === routes.account) {
    return <AccountPage />;
  }

  if (pathname === routes.billing) {
    return <BillingPage />;
  }

  return <LoginPage />;
}

function LoginPage(): ReactElement {
  return (
    <CloudShell eyebrow="Goyo Cloud" title="Sign in without slowing the writing down.">
      <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <p className="text-[#aab5a5] text-sm uppercase tracking-[0.22em]">Open signup</p>
          <h2 className="mt-4 text-balance font-serif text-4xl leading-tight tracking-[-0.04em] text-[#f3f0df]">
            Email code login for cloud sync and account status.
          </h2>
          <p className="mt-5 text-[#b8b9ac] leading-7">
            This shell is ready for the Worker auth flow. The next slice wires Cloudflare Email
            Service, hosted sessions, and Desktop Goyo Cloud sign-in.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              className="rounded-full bg-[#d9be7f] px-5 py-3 text-center font-semibold text-[#1b1a15] transition hover:-translate-y-0.5 hover:bg-[#efd594]"
              href={routes.verify}
            >
              Continue to code
            </a>
            <a
              className="rounded-full border border-[#d9be7f]/30 px-5 py-3 text-center font-semibold text-[#f3f0df] transition hover:-translate-y-0.5 hover:bg-[#f3f0df]/8"
              href={routes.account}
            >
              View account shell
            </a>
          </div>
        </Panel>
        <LoginFormPreview />
      </section>
    </CloudShell>
  );
}

function VerifyPage(): ReactElement {
  return (
    <CloudShell eyebrow="Verification" title="One code, one quiet connection.">
      <Panel>
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="text-[#aab5a5] text-sm">Six-digit code</span>
            <input
              className="mt-2 w-full rounded-2xl border border-[#f3f0df]/10 bg-[#0f1210] px-4 py-3 text-[#f3f0df] outline-none ring-[#d9be7f]/30 transition placeholder:text-[#687064] focus:ring-4"
              inputMode="numeric"
              placeholder="000000"
            />
          </label>
          <a
            className="rounded-2xl bg-[#d9be7f] px-5 py-3 text-center font-semibold text-[#1b1a15]"
            href={routes.account}
          >
            Verify
          </a>
        </div>
        <p className="mt-5 text-[#8f978b] text-sm">
          Codes will be delivered from Goyo &lt;no-reply@goyo.seokjun.kim&gt; after the Worker auth
          endpoints are implemented.
        </p>
      </Panel>
    </CloudShell>
  );
}

function AccountPage(): ReactElement {
  return (
    <CloudShell eyebrow="Account" title="Cloud status before billing complexity.">
      <div className="grid gap-4 lg:grid-cols-3">
        {statusCards.map((card) => (
          <Panel key={card.label}>
            <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">{card.label}</p>
            <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">
              {card.value}
            </p>
            <p className="mt-4 text-[#b8b9ac] leading-7">{card.detail}</p>
          </Panel>
        ))}
      </div>
    </CloudShell>
  );
}

function BillingPage(): ReactElement {
  return (
    <CloudShell eyebrow="Billing" title="Payment is intentionally parked.">
      <Panel>
        <p className="max-w-2xl text-[#b8b9ac] leading-7">
          This route reserves the account surface for future payment work. Sync availability stays
          unrestricted during the Goyo Cloud auth milestone so hosted login and multi-device sync
          can be tested without plan gates.
        </p>
      </Panel>
    </CloudShell>
  );
}

function LoginFormPreview(): ReactElement {
  return (
    <Panel>
      <div className="rounded-[1.75rem] border border-[#f3f0df]/10 bg-[#101310] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <label className="block">
          <span className="text-[#aab5a5] text-sm">Email address</span>
          <input
            className="mt-2 w-full rounded-2xl border border-[#f3f0df]/10 bg-[#191d19] px-4 py-3 text-[#f3f0df] outline-none placeholder:text-[#687064]"
            placeholder="writer@example.com"
            type="email"
          />
        </label>
        <button
          className="mt-4 w-full rounded-2xl bg-[#d9be7f] px-5 py-3 font-semibold text-[#1b1a15]"
          type="button"
        >
          Send login code
        </button>
      </div>
      <div className="mt-5 grid gap-3 text-[#9fa99b] text-sm">
        <p>Web sessions will use httpOnly cookies.</p>
        <p>Desktop sessions will use separate secure bearer-token storage.</p>
      </div>
    </Panel>
  );
}

function CloudShell({
  children,
  eyebrow,
  title,
}: {
  children: ReactElement;
  eyebrow: string;
  title: string;
}): ReactElement {
  return (
    <main className="min-h-screen overflow-hidden bg-[#151816] px-5 py-6 text-[#eef0e8] sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(217,190,127,0.18),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(126,153,125,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]" />
      <div className="relative mx-auto max-w-6xl">
        <nav className="mb-16 flex items-center justify-between rounded-full border border-[#f3f0df]/10 bg-[#1d221d]/75 px-4 py-3 backdrop-blur">
          <a className="font-semibold text-sm tracking-[0.22em] uppercase" href={routes.login}>
            Goyo Cloud
          </a>
          <div className="flex gap-2 text-sm">
            <a
              className="rounded-full px-3 py-1.5 text-[#b8b9ac] hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
              href={routes.account}
            >
              Account
            </a>
            <a
              className="rounded-full px-3 py-1.5 text-[#b8b9ac] hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
              href={routes.billing}
            >
              Billing
            </a>
          </div>
        </nav>
        <header className="mb-10 max-w-4xl">
          <p className="font-semibold text-[#d9be7f] text-sm uppercase tracking-[0.28em]">
            {eyebrow}
          </p>
          <h1 className="mt-5 text-balance font-serif text-5xl leading-[0.95] tracking-[-0.055em] text-[#f3f0df] sm:text-6xl lg:text-7xl">
            {title}
          </h1>
        </header>
        {children}
      </div>
    </main>
  );
}

function Panel({ children }: { children: ReactElement | ReactElement[] }): ReactElement {
  return (
    <div className="rounded-[2rem] border border-[#f3f0df]/10 bg-[#20251f]/72 p-6 shadow-[0_28px_100px_rgba(0,0,0,0.28)] backdrop-blur">
      {children}
    </div>
  );
}

function getRoutePathname() {
  return window.location.pathname === '/' ? routes.login : window.location.pathname;
}

export default App;
