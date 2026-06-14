import { type ReactElement, useEffect, useState } from 'react';

interface GoyoCloudAccount {
  email: string;
  id: string;
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: auth state and wiring for one UI surface
export function GoyoCloudAuthSection(): ReactElement {
  const [status, setStatus] = useState<string | null>(null);
  const [account, setAccount] = useState<GoyoCloudAccount | null>(null);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isOpeningBrowser, setIsOpeningBrowser] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void window.writerDesktop.goyoCloud.getStatus().then((result) => {
      setAccount(result.account);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = window.writerDesktop.goyoCloud.onDeepLinkToken(() => {
      void window.writerDesktop.goyoCloud.getStatus().then((result) => {
        if (result.account) {
          setAccount(result.account);
          setStatus('Signed in via browser.');
        }
      });
    });
    return unsubscribe;
  }, []);

  const onSendCode = () => {
    if (!email) return;
    setIsSending(true);
    setStatus(null);
    void window.writerDesktop.goyoCloud.authStart(email).then((result) => {
      setIsSending(false);
      setStatus(
        result.ok
          ? 'Login code sent. Check your email.'
          : (result.error ?? 'Could not send login code.'),
      );
    });
  };

  const onVerify = () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    setStatus(null);
    void window.writerDesktop.goyoCloud.authVerify({ code, email }).then((result) => {
      setIsVerifying(false);
      if (result.ok) {
        setAccount(result.user ?? null);
        setEmail('');
        setCode('');
        setStatus('Signed in to Goyo Cloud.');
        return;
      }
      setStatus(result.error ?? 'Verification failed.');
    });
  };

  const onLogout = () => {
    setIsLoggingOut(true);
    void window.writerDesktop.goyoCloud.logout().then(() => {
      setAccount(null);
      setIsLoggingOut(false);
      setStatus('Signed out of Goyo Cloud.');
    });
  };

  const onStartBrowser = () => {
    setIsOpeningBrowser(true);
    setStatus(null);
    void window.writerDesktop.goyoCloud.authStartBrowser().then((result) => {
      setIsOpeningBrowser(false);
      if (!result.ok) {
        setStatus('Could not open browser for sign-in.');
        return;
      }
      setStatus('Complete sign-in in your browser to return to the app.');
    });
  };

  if (!loaded) return null as unknown as ReactElement;

  if (account) {
    return (
      <SignedInView
        account={account}
        isLoggingOut={isLoggingOut}
        onLogout={onLogout}
        status={status}
      />
    );
  }

  return (
    <SignInView
      code={code}
      email={email}
      isOpeningBrowser={isOpeningBrowser}
      isSending={isSending}
      isVerifying={isVerifying}
      onChangeCode={setCode}
      onChangeEmail={setEmail}
      onSendCode={onSendCode}
      onStartBrowser={onStartBrowser}
      onVerify={onVerify}
      status={status}
    />
  );
}

function SignedInView({
  account,
  isLoggingOut,
  onLogout,
  status,
}: {
  account: GoyoCloudAccount;
  isLoggingOut: boolean;
  onLogout: () => void;
  status: string | null;
}): ReactElement {
  return (
    <div className="mt-4 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4">
      <p className="font-medium text-[var(--goyo-text)]">Goyo Cloud account</p>
      <p className="mt-2 text-[var(--goyo-text)] text-sm">{account.email}</p>
      <p className="mt-1 text-[var(--goyo-text-muted)] text-xs">
        Hosted session active. Sync will use your Goyo Cloud account.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className="rounded-full border border-[var(--goyo-border)] px-3 py-1.5 text-[var(--goyo-text)] text-sm hover:bg-[var(--goyo-accent-soft)]"
          disabled={isLoggingOut}
          onClick={onLogout}
          type="button"
        >
          {isLoggingOut ? 'Signing out…' : 'Sign out'}
        </button>
        <a
          className="rounded-full border border-[var(--goyo-border)] px-3 py-1.5 text-[var(--goyo-text-muted)] text-sm hover:bg-[var(--goyo-accent-soft)]"
          href="https://goyo-cloud.seokjun.kim/account"
          rel="noreferrer"
          target="_blank"
        >
          Manage account
        </a>
      </div>
      {status ? <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">{status}</p> : null}
    </div>
  );
}

function SignInView({
  code,
  email,
  isOpeningBrowser,
  isSending,
  isVerifying,
  onChangeCode,
  onChangeEmail,
  onSendCode,
  onStartBrowser,
  onVerify,
  status,
}: {
  code: string;
  email: string;
  isOpeningBrowser: boolean;
  isSending: boolean;
  isVerifying: boolean;
  onChangeCode: (code: string) => void;
  onChangeEmail: (email: string) => void;
  onSendCode: () => void;
  onStartBrowser: () => void;
  onVerify: () => void;
  status: string | null;
}): ReactElement {
  return (
    <div className="mt-4 rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-paper)]/70 p-4">
      <p className="font-medium text-[var(--goyo-text)]">Sign in or create an account</p>
      <p className="mt-1 text-[var(--goyo-text-muted)] text-xs">
        Enter your email to sign in. If you are new, a Goyo Cloud account will be created
        automatically after verification.
      </p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
        <input
          className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)] px-3 py-2 text-[var(--goyo-text)] text-sm outline-none"
          onChange={(event) => onChangeEmail(event.target.value.trim())}
          placeholder="Email address"
          type="email"
          value={email}
        />
        <button
          className="rounded-xl bg-[var(--goyo-accent)] px-3 py-2 font-medium text-[var(--goyo-accent-text)] text-sm hover:opacity-90 disabled:opacity-50"
          disabled={isSending || !email}
          onClick={onSendCode}
          type="button"
        >
          {isSending ? 'Sending…' : 'Send code'}
        </button>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.6fr)]">
        <input
          className="rounded-xl border border-[var(--goyo-border)] bg-[var(--goyo-raised)] px-3 py-2 text-[var(--goyo-text)] text-sm outline-none"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => {
            const value = event.target.value.replace(/\D/g, '').slice(0, 6);
            onChangeCode(value);
          }}
          placeholder="6-digit code"
          value={code}
        />
        <button
          className="rounded-xl bg-[var(--goyo-accent)] px-3 py-2 font-medium text-[var(--goyo-accent-text)] text-sm hover:opacity-90 disabled:opacity-50"
          disabled={isVerifying || code.length !== 6}
          onClick={onVerify}
          type="button"
        >
          {isVerifying ? 'Verifying…' : 'Verify code'}
        </button>
      </div>
      <div className="mt-4 flex items-center gap-3 text-[var(--goyo-text-muted)] text-xs">
        <div className="flex-1 border-t border-[var(--goyo-border)]" />
        <span>or</span>
        <div className="flex-1 border-t border-[var(--goyo-border)]" />
      </div>
      <div className="mt-3">
        <button
          className="w-full rounded-xl bg-[var(--goyo-raised)] border border-[var(--goyo-border)] px-3 py-2 font-medium text-[var(--goyo-text)] text-sm hover:bg-[var(--goyo-accent-soft)] disabled:opacity-50"
          disabled={isOpeningBrowser}
          onClick={onStartBrowser}
          type="button"
        >
          {isOpeningBrowser ? 'Opening browser…' : 'Sign in with browser'}
        </button>
      </div>
      {status ? <p className="mt-3 text-[var(--goyo-text-muted)] text-xs">{status}</p> : null}
    </div>
  );
}
