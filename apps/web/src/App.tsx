import { type ReactElement, useEffect, useState } from 'react';
import { authLogout, authMe, authStart, authVerify } from './goyo-cloud-api';

interface CloudUser {
  email: string;
  id: string;
}

type Page = 'account' | 'billing' | 'login' | 'verify';

interface AuthState {
  email: string;
  page: Page;
  status: string | null;
  user: CloudUser | null;
}

export default function App(): ReactElement {
  const [state, setState] = useState<AuthState>({
    email: '',
    page: getInitialPage(),
    status: null,
    user: null,
  });

  useEffect(() => {
    if (state.user) return;
    void authMe().then((result) => {
      if (result.ok && result.user) {
        setState((prev) => ({ ...prev, page: 'account', user: result.user ?? null }));
      }
    });
  }, [state.user]);

  const onRouteChange = (page: Page) => setState((prev) => ({ ...prev, page, status: null }));
  const onStart = (email: string) => {
    setState((prev) => ({ ...prev, status: 'Sending code…' }));
    void authStart(email).then((result) => {
      if (result.ok) {
        setState((prev) => ({ ...prev, email, page: 'verify', status: null }));
        return;
      }
      setState((prev) => ({ ...prev, status: result.error ?? null }));
    });
  };
  const onVerify = (code: string) => {
    setState((prev) => ({ ...prev, status: 'Verifying…' }));
    void authVerify({ code, email: state.email }).then((result) => {
      if (result.ok && result.user) {
        setState((prev) => ({ ...prev, page: 'account', status: null, user: result.user ?? null }));
        return;
      }
      setState((prev) => ({ ...prev, status: result.error ?? null }));
    });
  };
  const onLogout = () => {
    void authLogout().then(() =>
      setState((prev) => ({ ...prev, email: '', page: 'login', user: null })),
    );
  };

  return renderPage(state, onRouteChange, onStart, onVerify, onLogout);
}

function renderPage(
  state: AuthState,
  onRouteChange: (page: Page) => void,
  onStart: (email: string) => void,
  onVerify: (code: string) => void,
  onLogout: () => void,
): ReactElement {
  if (state.page === 'account') {
    return <AccountPage onLogout={onLogout} onRouteChange={onRouteChange} user={state.user} />;
  }
  if (state.page === 'billing') {
    return <BillingPage onRouteChange={onRouteChange} />;
  }
  if (state.page === 'verify') {
    return (
      <VerifyPage
        email={state.email}
        onRouteChange={onRouteChange}
        onVerify={onVerify}
        status={state.status}
      />
    );
  }
  return <LoginPage onRouteChange={onRouteChange} onStart={onStart} status={state.status} />;
}

function statusMessage(status: string | null): ReactElement {
  if (!status) return <></>;
  return <p className="mt-4 text-[#c98b7a] text-sm">{status}</p>;
}

function LoginPage({
  onRouteChange,
  onStart,
  status,
}: {
  onRouteChange: (page: Page) => void;
  onStart: (email: string) => void;
  status: string | null;
}): ReactElement {
  const [email, setEmail] = useState('');

  return (
    <CloudShell
      eyebrow="Sign in or create an account"
      onRouteChange={onRouteChange}
      title="One email. One code. No password."
    >
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
            if (email) onStart(email);
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
            className="mt-4 w-full rounded-2xl bg-[#d9be7f] px-5 py-3 font-semibold text-[#1b1a15] transition hover:-translate-y-0.5 hover:bg-[#efd594]"
            disabled={!email}
            type="submit"
          >
            Send sign-in code
          </button>
        </form>
        {statusMessage(status)}
      </Panel>
    </CloudShell>
  );
}

function VerifyPage({
  email,
  onRouteChange,
  onVerify,
  status,
}: {
  email: string;
  onRouteChange: (page: Page) => void;
  onVerify: (code: string) => void;
  status: string | null;
}): ReactElement {
  const [code, setCode] = useState('');

  return (
    <CloudShell
      eyebrow="Verification"
      onRouteChange={onRouteChange}
      title="Enter the code we sent to your email."
    >
      <Panel>
        <p className="text-[#8f978b] text-sm">
          Code sent to <span className="text-[#f3f0df]">{email}</span>. New emails automatically
          create an account.
        </p>
        <form
          className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (code) onVerify(code);
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
            disabled={code.length !== 6}
            type="submit"
          >
            Verify code
          </button>
        </form>
        {statusMessage(status)}
      </Panel>
    </CloudShell>
  );
}

function signOutBlock(hasUser: boolean, onLogout: () => void): ReactElement {
  if (!hasUser) return <></>;

  return (
    <div className="mt-6">
      <button
        className="rounded-full border border-[#f3f0df]/20 px-6 py-2.5 font-semibold text-[#f3f0df] text-sm transition hover:bg-[#d86b53]/20 hover:border-[#d86b53]/40"
        onClick={onLogout}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}

function AccountPage({
  onLogout,
  onRouteChange,
  user,
}: {
  onLogout: () => void;
  onRouteChange: (page: Page) => void;
  user: CloudUser | null;
}): ReactElement {
  const hasUser = !!user;

  return (
    <CloudShell
      eyebrow="Account"
      onRouteChange={onRouteChange}
      title="Cloud status before billing complexity."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel>
          <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">Account</p>
          <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">
            {hasUser ? user.email : 'Signed out'}
          </p>
          <p className="mt-4 text-[#b8b9ac] text-sm">
            {hasUser
              ? 'Open signup account. Payment and plan selection will be added later.'
              : 'Sign in with your email to see account status.'}
          </p>
        </Panel>
        <Panel>
          <p className="text-[#9fa99b] text-sm uppercase tracking-[0.18em]">Cloud sync</p>
          <p className="mt-4 font-serif text-3xl tracking-[-0.04em] text-[#f3f0df]">
            {hasUser ? 'Available' : 'Unauthenticated'}
          </p>
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
      {signOutBlock(hasUser, onLogout)}
    </CloudShell>
  );
}

function BillingPage({ onRouteChange }: { onRouteChange: (page: Page) => void }): ReactElement {
  return (
    <CloudShell
      eyebrow="Billing"
      onRouteChange={onRouteChange}
      title="Payment is intentionally parked."
    >
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

function CloudShell({
  children,
  eyebrow,
  onRouteChange,
  title,
}: {
  children: ReactElement | ReactElement[];
  eyebrow: string;
  onRouteChange: (page: Page) => void;
  title: string;
}): ReactElement {
  return (
    <main className="min-h-screen overflow-hidden bg-[#151816] px-5 py-6 text-[#eef0e8] sm:px-8 lg:px-12">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(217,190,127,0.18),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(126,153,125,0.16),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_42%)]" />
      <div className="relative mx-auto max-w-6xl">
        <nav className="mb-16 flex items-center justify-between rounded-full border border-[#f3f0df]/10 bg-[#1d221d]/75 px-4 py-3 backdrop-blur">
          <button
            className="font-semibold text-sm tracking-[0.22em] uppercase"
            onClick={() => onRouteChange('login')}
            type="button"
          >
            Goyo Cloud
          </button>
          <div className="flex gap-2 text-sm">
            <button
              className="rounded-full px-3 py-1.5 text-[#b8b9ac] hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
              onClick={() => onRouteChange('account')}
              type="button"
            >
              Account
            </button>
            <button
              className="rounded-full px-3 py-1.5 text-[#b8b9ac] hover:bg-[#f3f0df]/8 hover:text-[#f3f0df]"
              onClick={() => onRouteChange('billing')}
              type="button"
            >
              Billing
            </button>
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

function getInitialPage(): Page {
  const pathname = window.location.pathname;

  if (pathname === '/verify') return 'verify';
  if (pathname === '/account') return 'account';
  if (pathname === '/billing') return 'billing';

  return 'login';
}
